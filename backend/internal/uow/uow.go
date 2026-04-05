package uow

import (
	"github.com/yumikokawaii/akashic/internal/repository"
	"gorm.io/gorm"
)

// UnitOfWork opens transactions and vends typed repositories.
// Use it for operations that touch multiple tables.
// Single-table operations use repositories directly without UoW.
type UnitOfWork struct {
	db *gorm.DB
}

func New(db *gorm.DB) *UnitOfWork {
	return &UnitOfWork{db: db}
}

// Transaction holds an active DB transaction and pre-wired repositories.
type Transaction struct {
	tx         *gorm.DB
	Banks      repository.BankRepository
	Categories repository.CategoryRepository
	Questions  repository.QuestionRepository
	Passages   repository.PassageRepository
	Tests      repository.TestRepository
	Attempts   repository.AttemptRepository
}

// Begin opens a new transaction. Always defer Rollback after calling Begin.
// Rollback is a no-op after Commit succeeds.
func (u *UnitOfWork) Begin() *Transaction {
	tx := u.db.Begin()
	return &Transaction{
		tx:         tx,
		Banks:      repository.NewBankRepo(tx),
		Categories: repository.NewCategoryRepo(tx),
		Questions:  repository.NewQuestionRepo(tx),
		Passages:   repository.NewPassageRepo(tx),
		Tests:      repository.NewTestRepo(tx),
		Attempts:   repository.NewAttemptRepo(tx),
	}
}

func (t *Transaction) Commit() error {
	return t.tx.Commit().Error
}

func (t *Transaction) Rollback() {
	t.tx.Rollback()
}
