package uow

import (
	"github.com/yumikokawaii/akashic/internal/repository"
	"gorm.io/gorm"
)

type UnitOfWork struct {
	db *gorm.DB
}

func New(db *gorm.DB) *UnitOfWork { return &UnitOfWork{db: db} }

type Transaction struct {
	tx            *gorm.DB
	Banks         repository.BankRepository
	Members       repository.MemberRepository
	Categories    repository.CategoryRepository
	Passages      repository.PassageRepository
	QuestionGroups repository.QuestionGroupRepository
	Questions     repository.QuestionRepository
	Tests         repository.TestRepository
	Attempts      repository.AttemptRepository
}

func (u *UnitOfWork) Begin() *Transaction {
	tx := u.db.Begin()
	return &Transaction{
		tx:            tx,
		Banks:         repository.NewBankRepo(tx),
		Members:       repository.NewMemberRepo(tx),
		Categories:    repository.NewCategoryRepo(tx),
		Passages:      repository.NewPassageRepo(tx),
		QuestionGroups: repository.NewQuestionGroupRepo(tx),
		Questions:     repository.NewQuestionRepo(tx),
		Tests:         repository.NewTestRepo(tx),
		Attempts:      repository.NewAttemptRepo(tx),
	}
}

func (t *Transaction) Commit() error { return t.tx.Commit().Error }
func (t *Transaction) Rollback()     { t.tx.Rollback() }
