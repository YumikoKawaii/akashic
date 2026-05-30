package uow

import (
	"context"

	"github.com/yumikokawaii/akashic/internal/repository"
	"gorm.io/gorm"
)

// Store exposes every repository bound to one gorm session — either a
// transaction (the Store passed to Do) or the base connection (UnitOfWork.Store).
type Store struct {
	Banks          repository.BankRepository
	Members        repository.MemberRepository
	Categories     repository.CategoryRepository
	Passages       repository.PassageRepository
	QuestionGroups repository.QuestionGroupRepository
	Questions      repository.QuestionRepository
	Tests          repository.TestRepository
	Attempts       repository.AttemptRepository
	Contributions  repository.ContributionRepository
}

func newStore(db *gorm.DB) *Store {
	return &Store{
		Banks:          repository.NewBankRepo(db),
		Members:        repository.NewMemberRepo(db),
		Categories:     repository.NewCategoryRepo(db),
		Passages:       repository.NewPassageRepo(db),
		QuestionGroups: repository.NewQuestionGroupRepo(db),
		Questions:      repository.NewQuestionRepo(db),
		Tests:          repository.NewTestRepo(db),
		Attempts:       repository.NewAttemptRepo(db),
		Contributions:  repository.NewContributionRepo(db),
	}
}

// UnitOfWork hands out repositories, either directly for single-statement work
// (Store, bound to the base connection) or atomically within a transaction (Do).
type UnitOfWork interface {
	// Store returns repositories bound to the base connection — no transaction.
	// Use for reads and single-table writes that don't need atomicity.
	Store() *Store
	// Do runs fn inside a transaction, committing on nil and rolling back on
	// error or panic. The Store passed to fn is bound to that transaction.
	// Nested Do calls use savepoints. Keep side effects that must not be undone
	// (cache writes, post-commit re-reads) AFTER Do returns nil.
	Do(ctx context.Context, fn func(s *Store) error) error
}

type unitOfWork struct {
	db    *gorm.DB
	store *Store
}

// New returns a UnitOfWork backed by db.
func New(db *gorm.DB) UnitOfWork {
	return &unitOfWork{db: db, store: newStore(db)}
}

func (u *unitOfWork) Store() *Store { return u.store }

func (u *unitOfWork) Do(ctx context.Context, fn func(s *Store) error) error {
	return u.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		return fn(newStore(tx))
	})
}
