package service

import (
	"context"
	"errors"
	"strings"

	"github.com/lib/pq"
	"github.com/yumikokawaii/akashic/internal/model"
	"github.com/yumikokawaii/akashic/internal/repository"
	"github.com/yumikokawaii/akashic/internal/uow"
)

type ContributionService struct {
	uow  uow.UnitOfWork
	pool GenerateCache
}

func NewContributionService(u uow.UnitOfWork, pool GenerateCache) *ContributionService {
	return &ContributionService{uow: u, pool: pool}
}

// isActive reports whether a contribution is still in the review cycle.
func isActive(status string) bool {
	return status == model.ContributionPending ||
		status == model.ContributionChangesRequested ||
		status == model.ContributionApproved
}

// nextStatus is the single source of truth for the contribution state machine:
// given the current status and an event, it returns the resulting status and
// whether that transition is allowed. Reviewer events (approve/reject/
// request_changes) and contributor events (revise/resubmit/merge/withdraw/
// reopen/close) are all resolved here; the service layer only enforces *who*
// may invoke each event (interceptor floor + ownership), not the transition.
func nextStatus(current, event string) (string, bool) {
	switch event {
	case model.EventApprove:
		if current == model.ContributionPending || current == model.ContributionChangesRequested {
			return model.ContributionApproved, true
		}
	case model.EventReject:
		if isActive(current) {
			return model.ContributionRejected, true
		}
	case model.EventRequestChanges:
		if isActive(current) {
			return model.ContributionChangesRequested, true
		}
	case model.EventRevise:
		if isActive(current) {
			return model.ContributionPending, true
		}
	case model.EventResubmit:
		if current == model.ContributionChangesRequested {
			return model.ContributionPending, true
		}
	case model.EventMerge:
		if current == model.ContributionApproved {
			return model.ContributionMerged, true
		}
	case model.EventWithdraw:
		if isActive(current) {
			return model.ContributionWithdrawn, true
		}
	case model.EventReopen:
		if current == model.ContributionWithdrawn || current == model.ContributionRejected {
			return model.ContributionPending, true
		}
	case model.EventClose:
		if current != model.ContributionMerged && current != model.ContributionClosed {
			return model.ContributionClosed, true
		}
	}
	return "", false
}

// applyEvent records a pure state-change event and moves the contribution to its
// next status, atomically. requireOwner gates contributor events to the
// contribution's author (reviewer events pass false — any editor, per the floor).
func (s *ContributionService) applyEvent(ctx context.Context, bankID, actorID, id int, event string, requireOwner bool) (*model.Contribution, error) {
	c, err := s.uow.Store().Contributions.FindByID(id)
	if err != nil {
		return nil, err
	}
	if c.BankID != bankID {
		return nil, ErrForbidden
	}
	if requireOwner && c.ContributorID != actorID {
		return nil, ErrForbidden
	}
	ns, ok := nextStatus(c.Status, event)
	if !ok {
		return nil, ErrBadRequest
	}
	if err := s.uow.Do(ctx, func(tx *uow.Store) error {
		if err := tx.Contributions.AddEvent(&model.ContributionEvent{
			ContributionID: c.ID,
			ActorID:        actorID,
			Event:          event,
		}); err != nil {
			return err
		}
		c.Status = ns
		return tx.Contributions.Save(c)
	}); err != nil {
		return nil, err
	}
	return s.uow.Store().Contributions.FindByID(c.ID)
}

// validatePayload checks the proposed question is well-formed and its category
// belongs to the target bank.
func (s *ContributionService) validatePayload(bankID int, p model.ContributionPayload) error {
	if p.Type == "" || p.Difficulty == "" || p.Content == "" || p.CategoryID == 0 {
		return ErrBadRequest
	}
	if p.Type == "mcq" && len(p.Options) == 0 {
		return ErrBadRequest
	}
	cat, err := s.uow.Store().Categories.FindByID(p.CategoryID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return ErrBadRequest
		}
		return err
	}
	if cat.BankID != bankID {
		return ErrForbidden
	}
	return nil
}

// Submit records a new pending contribution proposed by userID.
func (s *ContributionService) Submit(bankID, userID int, p model.ContributionPayload) (*model.Contribution, error) {
	if _, err := s.uow.Store().Banks.FindByID(bankID); err != nil {
		return nil, err
	}
	if err := s.validatePayload(bankID, p); err != nil {
		return nil, err
	}
	c := &model.Contribution{
		BankID:        bankID,
		ContributorID: userID,
		Payload:       p,
		Status:        model.ContributionPending,
	}
	if err := s.uow.Store().Contributions.Create(c); err != nil {
		return nil, err
	}
	return s.uow.Store().Contributions.FindByID(c.ID)
}

// Update lets the contributor revise their own non-terminal contribution. Any
// prior approval is dismissed — the contribution reopens to pending.
func (s *ContributionService) Update(ctx context.Context, bankID, userID, id int, p model.ContributionPayload) (*model.Contribution, error) {
	c, err := s.uow.Store().Contributions.FindByID(id)
	if err != nil {
		return nil, err
	}
	if c.BankID != bankID || c.ContributorID != userID {
		return nil, ErrForbidden
	}
	ns, ok := nextStatus(c.Status, model.EventRevise)
	if !ok {
		return nil, ErrBadRequest
	}
	if err := s.validatePayload(bankID, p); err != nil {
		return nil, err
	}
	if err := s.uow.Do(ctx, func(tx *uow.Store) error {
		c.Payload = p
		c.Status = ns
		if err := tx.Contributions.Save(c); err != nil {
			return err
		}
		return tx.Contributions.AddEvent(&model.ContributionEvent{
			ContributionID: c.ID,
			ActorID:        userID,
			Event:          model.EventRevise,
		})
	}); err != nil {
		return nil, err
	}
	return s.uow.Store().Contributions.FindByID(c.ID)
}

// ListMine returns the caller's own contributions in a bank.
func (s *ContributionService) ListMine(bankID, userID int) ([]model.Contribution, error) {
	if _, err := s.uow.Store().Banks.FindByID(bankID); err != nil {
		return nil, err
	}
	return s.uow.Store().Contributions.FindByBankAndContributor(bankID, userID)
}

// Transition applies a contributor-driven state change (resubmit / withdraw /
// reopen / close) to the caller's own contribution. Validity is decided by the
// state machine; the contribution stays visible (withdraw is a status, not a
// delete).
func (s *ContributionService) Transition(ctx context.Context, bankID, userID, id int, action string) (*model.Contribution, error) {
	switch action {
	case model.EventResubmit, model.EventWithdraw, model.EventReopen, model.EventClose:
	default:
		return nil, ErrBadRequest
	}
	return s.applyEvent(ctx, bankID, userID, id, action, true)
}

// List returns the review queue for a bank, optionally filtered by status.
func (s *ContributionService) List(bankID int, status string) ([]model.Contribution, error) {
	if _, err := s.uow.Store().Banks.FindByID(bankID); err != nil {
		return nil, err
	}
	return s.uow.Store().Contributions.FindByBank(bankID, status)
}

// Review records a reviewer decision (editor+): approve → approved (the
// contributor then merges); reject → rejected; request_changes → changes_requested.
// Reviewer explanations are separate comments.
func (s *ContributionService) Review(ctx context.Context, bankID, reviewerID, id int, decision string) (*model.Contribution, error) {
	switch decision {
	case model.EventApprove, model.EventReject, model.EventRequestChanges:
	default:
		return nil, ErrBadRequest
	}
	return s.applyEvent(ctx, bankID, reviewerID, id, decision, false)
}

// Merge is performed by the contributor on an approved contribution. It creates
// the question in the bank and marks the contribution merged. The approval (an
// editor capability) is what authorizes the content; this just lands it.
func (s *ContributionService) Merge(ctx context.Context, bankID, userID, id int) (*model.Contribution, error) {
	c, err := s.uow.Store().Contributions.FindByID(id)
	if err != nil {
		return nil, err
	}
	if c.BankID != bankID || c.ContributorID != userID {
		return nil, ErrForbidden
	}
	ns, ok := nextStatus(c.Status, model.EventMerge)
	if !ok {
		return nil, ErrBadRequest
	}

	p := c.Payload
	q := &model.Question{
		BankID:     bankID,
		CategoryID: p.CategoryID,
		Type:       p.Type,
		Difficulty: p.Difficulty,
		Tags:       pq.StringArray(p.Tags),
	}

	if err := s.uow.Do(ctx, func(tx *uow.Store) error {
		if err := tx.Questions.Create(q); err != nil {
			return err
		}
		if p.Type == "mcq" {
			if err := tx.Questions.CreateChoice(&model.QMultipleChoice{
				QuestionID: q.ID,
				Content:    p.Content,
				Options:    p.Options,
				Answers:    pq.StringArray(p.Answers),
			}); err != nil {
				return err
			}
		} else {
			if err := tx.Questions.CreateItem(&model.QQuestionItem{
				QuestionID: q.ID,
				Content:    p.Content,
				Answer:     p.Answer,
			}); err != nil {
				return err
			}
		}
		c.Status = ns
		c.QuestionID = &q.ID
		if err := tx.Contributions.Save(c); err != nil {
			return err
		}
		return tx.Contributions.AddEvent(&model.ContributionEvent{
			ContributionID: c.ID,
			ActorID:        userID,
			Event:          model.EventMerge,
		})
	}); err != nil {
		return nil, err
	}

	s.pool.AddToPool(bankID, toCachedQuestion(q))
	return s.uow.Store().Contributions.FindByID(c.ID)
}

// AddComment posts a free-form comment on a contribution. Any viewer with access
// to the bank may comment (the viewer floor is enforced by the interceptor); the
// service only binds the contribution to the bank.
func (s *ContributionService) AddComment(bankID, authorID, id int, body string) (*model.Contribution, error) {
	body = strings.TrimSpace(body)
	if body == "" {
		return nil, ErrBadRequest
	}
	c, err := s.uow.Store().Contributions.FindByID(id)
	if err != nil {
		return nil, err
	}
	if c.BankID != bankID {
		return nil, ErrForbidden
	}
	if err := s.uow.Store().Contributions.AddComment(&model.ContributionComment{
		ContributionID: c.ID,
		AuthorID:       authorID,
		Body:           body,
	}); err != nil {
		return nil, err
	}
	return s.uow.Store().Contributions.FindByID(c.ID)
}
