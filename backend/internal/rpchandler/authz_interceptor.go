package rpchandler

import (
	"context"
	"errors"

	"connectrpc.com/connect"

	"github.com/yumikokawaii/akashic/gen/akashic/v1/akashicv1connect"
	"github.com/yumikokawaii/akashic/internal/membership"
	"github.com/yumikokawaii/akashic/internal/repository"
	svc "github.com/yumikokawaii/akashic/internal/service"
)

// bankScoped is satisfied by every request message that carries a bank_id (the
// generated getter is GetBankId() int32). The authorization interceptor uses it
// to read the target bank generically, without knowing the concrete type.
type bankScoped interface {
	GetBankId() int32
}

// procedureMinRole maps each bank-scoped procedure to the minimum role its
// caller must hold on the target bank. Procedures absent from this map are not
// bank-scoped (e.g. ListBanks, CreateBank, GetMe) and require only
// authentication — UNLESS their request carries a bank_id, in which case the
// interceptor fails closed (see MembershipAuthorizer.wrap). That guard forces
// every new bank-scoped procedure to opt in here explicitly.
var procedureMinRole = map[string]string{
	// Bank
	akashicv1connect.BankServiceGetBankProcedure:                 membership.RoleViewer,
	akashicv1connect.BankServiceListBankMembersProcedure:         membership.RoleViewer,
	akashicv1connect.BankServiceUpdateBankProcedure:              membership.RoleEditor,
	akashicv1connect.BankServiceUpdateBankDefaultConfigProcedure: membership.RoleEditor,
	akashicv1connect.BankServiceDeleteBankProcedure:              membership.RoleOwner,
	akashicv1connect.BankServiceRestoreBankProcedure:             membership.RoleOwner,
	akashicv1connect.BankServiceAddBankMemberProcedure:           membership.RoleOwner,
	akashicv1connect.BankServiceRemoveBankMemberProcedure:        membership.RoleOwner,
	akashicv1connect.BankServiceUpdateBankMemberRoleProcedure:    membership.RoleOwner,
	akashicv1connect.BankServiceSetBankVisibilityProcedure:       membership.RoleOwner,

	// Categories
	akashicv1connect.CategoryServiceListCategoriesProcedure:  membership.RoleViewer,
	akashicv1connect.CategoryServiceCreateCategoryProcedure:  membership.RoleEditor,
	akashicv1connect.CategoryServiceUpdateCategoryProcedure:  membership.RoleEditor,
	akashicv1connect.CategoryServiceDeleteCategoryProcedure:  membership.RoleEditor,
	akashicv1connect.CategoryServiceRestoreCategoryProcedure: membership.RoleEditor,

	// Questions
	akashicv1connect.QuestionServiceListQuestionsProcedure:   membership.RoleViewer,
	akashicv1connect.QuestionServiceGetQuestionProcedure:     membership.RoleViewer,
	akashicv1connect.QuestionServiceCreateQuestionProcedure:  membership.RoleEditor,
	akashicv1connect.QuestionServiceUpdateQuestionProcedure:  membership.RoleEditor,
	akashicv1connect.QuestionServiceDeleteQuestionProcedure:  membership.RoleEditor,
	akashicv1connect.QuestionServiceRestoreQuestionProcedure: membership.RoleEditor,
	akashicv1connect.QuestionServiceIngestQuestionsProcedure: membership.RoleEditor,

	// Passages
	akashicv1connect.PassageServiceListPassagesProcedure:   membership.RoleViewer,
	akashicv1connect.PassageServiceGetPassageProcedure:     membership.RoleViewer,
	akashicv1connect.PassageServiceCreatePassageProcedure:  membership.RoleEditor,
	akashicv1connect.PassageServiceUpdatePassageProcedure:  membership.RoleEditor,
	akashicv1connect.PassageServiceDeletePassageProcedure:  membership.RoleEditor,
	akashicv1connect.PassageServiceRestorePassageProcedure: membership.RoleEditor,

	// Question groups
	akashicv1connect.QuestionGroupServiceListQuestionGroupsProcedure:   membership.RoleViewer,
	akashicv1connect.QuestionGroupServiceGetQuestionGroupProcedure:     membership.RoleViewer,
	akashicv1connect.QuestionGroupServiceCreateQuestionGroupProcedure:  membership.RoleEditor,
	akashicv1connect.QuestionGroupServiceUpdateQuestionGroupProcedure:  membership.RoleEditor,
	akashicv1connect.QuestionGroupServiceDeleteQuestionGroupProcedure:  membership.RoleEditor,
	akashicv1connect.QuestionGroupServiceRestoreQuestionGroupProcedure: membership.RoleEditor,

	// Tests
	// Tests are bank-wide shared, so generating/listing/taking them is a viewer
	// capability (a public visitor can generate + take any test). Delete/restore
	// is creator-or-editor, enforced in the service via the role from context.
	akashicv1connect.TestServiceListTestsProcedure:    membership.RoleViewer,
	akashicv1connect.TestServiceGetTestProcedure:      membership.RoleViewer,
	akashicv1connect.TestServiceGenerateTestProcedure: membership.RoleViewer,
	akashicv1connect.TestServiceDeleteTestProcedure:   membership.RoleViewer,
	akashicv1connect.TestServiceRestoreTestProcedure:  membership.RoleViewer,

	// Attempts — running a test reads bank content, so viewer suffices.
	akashicv1connect.AttemptServiceListAttemptsByTestProcedure: membership.RoleViewer,
	akashicv1connect.AttemptServiceStartAttemptProcedure:       membership.RoleViewer,
	akashicv1connect.AttemptServiceGetAttemptProcedure:         membership.RoleViewer,
	akashicv1connect.AttemptServiceSubmitAttemptProcedure:      membership.RoleViewer,

	// Contributions — proposing, revising, contributor transitions (resubmit/
	// withdraw/reopen/close) and merging are viewer capabilities (public visitors
	// may contribute). Merge is viewer-floor but creates a question; that is safe
	// because the service gates it on status==approved, which only an editor's
	// review can produce. Reviewing the queue (list/approve/reject/request_changes)
	// is an editor capability. The contribution state machine (which transition is
	// legal from which status) lives in the service's nextStatus.
	akashicv1connect.ContributionServiceSubmitContributionProcedure:     membership.RoleViewer,
	akashicv1connect.ContributionServiceUpdateContributionProcedure:     membership.RoleViewer,
	akashicv1connect.ContributionServiceListMyContributionsProcedure:    membership.RoleViewer,
	akashicv1connect.ContributionServiceTransitionContributionProcedure: membership.RoleViewer,
	akashicv1connect.ContributionServiceMergeContributionProcedure:      membership.RoleViewer,
	akashicv1connect.ContributionServiceListContributionsProcedure:      membership.RoleEditor,
	akashicv1connect.ContributionServiceReviewContributionProcedure:     membership.RoleEditor,
	// Commenting is open to any viewer (the contributor defends their idea; the
	// thread is shared discussion). Service binds the comment to the bank.
	akashicv1connect.ContributionServiceAddContributionCommentProcedure: membership.RoleViewer,
}

var errBankIDRequired = errors.New("request is registered as bank-scoped but carries no bank_id")

// MembershipAuthorizer enforces per-procedure bank-role requirements. It reads
// the caller's role from an in-memory cache, falling back to the database (and
// repopulating the cache) on a miss.
type MembershipAuthorizer struct {
	cache      membership.RoleCache
	visibility membership.VisibilityCache
	members    repository.MemberRepository
}

func NewMembershipAuthorizer(cache membership.RoleCache, visibility membership.VisibilityCache, members repository.MemberRepository) *MembershipAuthorizer {
	return &MembershipAuthorizer{cache: cache, visibility: visibility, members: members}
}

// PermissionInterceptor returns the Connect interceptor that enforces bank-role
// permissions. It must run after the authentication interceptor so the caller's
// claims are already in context. Role lookups hit the in-memory/Redis cache (DB
// only on a miss), keeping per-request latency low.
func (a *MembershipAuthorizer) PermissionInterceptor() connect.UnaryInterceptorFunc {
	return connect.UnaryInterceptorFunc(func(next connect.UnaryFunc) connect.UnaryFunc {
		return connect.UnaryFunc(func(ctx context.Context, req connect.AnyRequest) (connect.AnyResponse, error) {
			ctx, err := a.authorize(ctx, req)
			if err != nil {
				return nil, err
			}
			return next(ctx, req)
		})
	})
}

// authorize enforces the per-procedure role floor and, on success for a
// bank-scoped procedure, returns a context carrying the caller's membership role
// (see withRole) for downstream fine-grained checks.
func (a *MembershipAuthorizer) authorize(ctx context.Context, req connect.AnyRequest) (context.Context, error) {
	scoped, hasBankID := req.Any().(bankScoped)
	minRole, registered := procedureMinRole[req.Spec().Procedure]

	if !registered {
		// Not a registered bank-scoped procedure. Fail closed if the request
		// nonetheless carries a bank_id — a new bank-scoped procedure must be
		// added to procedureMinRole rather than slip through unchecked.
		if hasBankID {
			return ctx, connect.NewError(connect.CodePermissionDenied, svc.ErrForbidden)
		}
		return ctx, nil
	}
	if !hasBankID {
		return ctx, connect.NewError(connect.CodeInternal, errBankIDRequired)
	}

	bankID := int(scoped.GetBankId())
	role, err := a.roleFor(bankID, userIDFromContext(ctx))
	if err != nil {
		return ctx, toConnectError(err)
	}

	// Effective level = membership role, raised to viewer when the bank is
	// public and only a read (viewer) floor is required. Public never grants
	// editor/owner, so public banks stay read-only to non-members.
	level := membership.Level(role)
	if level < membership.Level(minRole) &&
		minRole == membership.RoleViewer &&
		a.visibility.IsPublic(bankID) {
		level = membership.Level(membership.RoleViewer)
	}
	if level < membership.Level(minRole) {
		return ctx, connect.NewError(connect.CodePermissionDenied, svc.ErrForbidden)
	}
	return withRole(ctx, role), nil
}

// roleFor resolves a caller's role on a bank: cache first, then the database on
// a miss, repopulating the cache so subsequent requests stay hot.
func (a *MembershipAuthorizer) roleFor(bankID, userID int) (string, error) {
	if role, ok := a.cache.Get(bankID, userID); ok {
		return role, nil
	}
	role, err := a.members.GetRole(bankID, userID)
	if err != nil {
		return "", err
	}
	if role != "" {
		a.cache.Set(bankID, userID, role)
	}
	return role, nil
}
