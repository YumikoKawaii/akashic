package service

import (
	"context"
	"errors"

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

// isTerminal reports whether a contribution can no longer be acted on.
func isTerminal(status string) bool {
	return status == model.ContributionMerged || status == model.ContributionRejected
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
func (s *ContributionService) Update(bankID, userID, id int, p model.ContributionPayload) (*model.Contribution, error) {
	c, err := s.uow.Store().Contributions.FindByID(id)
	if err != nil {
		return nil, err
	}
	if c.BankID != bankID || c.ContributorID != userID {
		return nil, ErrForbidden
	}
	if isTerminal(c.Status) {
		return nil, ErrBadRequest
	}
	if err := s.validatePayload(bankID, p); err != nil {
		return nil, err
	}
	c.Payload = p
	c.Status = model.ContributionPending
	if err := s.uow.Store().Contributions.Save(c); err != nil {
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

// Withdraw soft-deletes the caller's own non-terminal contribution.
func (s *ContributionService) Withdraw(bankID, userID, id int) error {
	c, err := s.uow.Store().Contributions.FindByID(id)
	if err != nil {
		return err
	}
	if c.BankID != bankID || c.ContributorID != userID {
		return ErrForbidden
	}
	if isTerminal(c.Status) {
		return ErrBadRequest
	}
	return s.uow.Store().Contributions.SoftDelete(id)
}

// List returns the review queue for a bank, optionally filtered by status.
func (s *ContributionService) List(bankID int, status string) ([]model.Contribution, error) {
	if _, err := s.uow.Store().Banks.FindByID(bankID); err != nil {
		return nil, err
	}
	return s.uow.Store().Contributions.FindByBank(bankID, status)
}

// Review appends a review round (editor+). approve → approved (no question is
// created — the contributor merges); reject → rejected; request_changes →
// changes_requested. Touches two tables, so it runs in a Unit of Work.
func (s *ContributionService) Review(ctx context.Context, bankID, reviewerID, id int, decision, note string) (*model.Contribution, error) {
	c, err := s.uow.Store().Contributions.FindByID(id)
	if err != nil {
		return nil, err
	}
	if c.BankID != bankID {
		return nil, ErrForbidden
	}
	if isTerminal(c.Status) {
		return nil, ErrBadRequest
	}

	var newStatus string
	switch decision {
	case model.ReviewApprove:
		newStatus = model.ContributionApproved
	case model.ReviewReject:
		newStatus = model.ContributionRejected
	case model.ReviewRequestChanges:
		newStatus = model.ContributionChangesRequested
	default:
		return nil, ErrBadRequest
	}

	if err := s.uow.Do(ctx, func(tx *uow.Store) error {
		if err := tx.Contributions.AddReview(&model.ContributionReview{
			ContributionID: c.ID,
			ReviewerID:     reviewerID,
			Decision:       decision,
			Note:           note,
		}); err != nil {
			return err
		}
		c.Status = newStatus
		return tx.Contributions.Save(c)
	}); err != nil {
		return nil, err
	}
	return s.uow.Store().Contributions.FindByID(c.ID)
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
	if c.Status != model.ContributionApproved {
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
		c.Status = model.ContributionMerged
		c.QuestionID = &q.ID
		return tx.Contributions.Save(c)
	}); err != nil {
		return nil, err
	}

	s.pool.AddToPool(bankID, toCachedQuestion(q))
	return s.uow.Store().Contributions.FindByID(c.ID)
}
