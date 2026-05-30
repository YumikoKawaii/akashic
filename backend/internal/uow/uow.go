package uow

import (
	"context"

	"github.com/yumikokawaii/akashic/internal/repository"
	"gorm.io/gorm"
)

// Store exposes every repository bound to one transaction. All repos share the
// same *gorm.DB tx, so writes through them commit or roll back atomically.
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

func newStore(tx *gorm.DB) *Store {
	return &Store{
		Banks:          repository.NewBankRepo(tx),
		Members:        repository.NewMemberRepo(tx),
		Categories:     repository.NewCategoryRepo(tx),
		Passages:       repository.NewPassageRepo(tx),
		QuestionGroups: repository.NewQuestionGroupRepo(tx),
		Questions:      repository.NewQuestionRepo(tx),
		Tests:          repository.NewTestRepo(tx),
		Attempts:       repository.NewAttemptRepo(tx),
		Contributions:  repository.NewContributionRepo(tx),
	}
}

// UnitOfWork runs a unit of work inside a single database transaction.
type UnitOfWork struct {
	db *gorm.DB
}

func New(db *gorm.DB) *UnitOfWork { return &UnitOfWork{db: db} }

// Do runs fn inside a transaction and commits if fn returns nil. If fn returns
// an error the tx is rolled back and the error is returned; if fn panics the tx
// is rolled back and the panic re-raised. Every repository in the Store is bound
// to that tx, so all writes are atomic. Nested Do calls use savepoints.
//
// Keep side effects that must not be undone (cache writes, events) AFTER Do
// returns nil — anything inside the closure is rolled back on failure.
func (u *UnitOfWork) Do(ctx context.Context, fn func(s *Store) error) error {
	return u.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		return fn(newStore(tx))
	})
}
