package handler

import (
	"github.com/gin-gonic/gin"
)

type Handlers struct {
	Bank     *BankHandler
	Category *CategoryHandler
	Question *QuestionHandler
	Test     *TestHandler
	Attempt  *AttemptHandler
}

func NewRouter(h Handlers) *gin.Engine {
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())

	v1 := r.Group("/api/v1")

	// Banks
	banks := v1.Group("/banks")
	{
		banks.GET("", h.Bank.List)
		banks.POST("", h.Bank.Create)
		banks.GET("/:id", h.Bank.Get)
		banks.PUT("/:id", h.Bank.Update)
		banks.PUT("/:id/default-config", h.Bank.UpdateDefaultConfig)
		banks.DELETE("/:id", h.Bank.Delete)

		// Categories scoped to bank
		banks.GET("/:bankId/categories", h.Category.List)
		banks.POST("/:bankId/categories", h.Category.Create)
		banks.PUT("/:bankId/categories/:id", h.Category.Update)
		banks.DELETE("/:bankId/categories/:id", h.Category.Delete)

		// Questions scoped to bank
		banks.GET("/:bankId/questions", h.Question.List)
		banks.POST("/:bankId/questions", h.Question.Create)
		banks.GET("/:bankId/questions/:id", h.Question.Get)
		banks.PUT("/:bankId/questions/:id", h.Question.Update)
		banks.DELETE("/:bankId/questions/:id", h.Question.Delete)

		// Tests scoped to bank
		banks.GET("/:bankId/tests", h.Test.List)
		banks.POST("/:bankId/tests/generate", h.Test.Generate)
		banks.GET("/:bankId/tests/:id", h.Test.Get)
		banks.DELETE("/:bankId/tests/:id", h.Test.Delete)

		// Start an attempt (scoped to bank to validate test ownership)
		banks.POST("/:bankId/attempts", h.Attempt.Start)
	}

	// Attempts (get + submit don't need bank context)
	attempts := v1.Group("/attempts")
	{
		attempts.GET("/:id", h.Attempt.Get)
		attempts.PUT("/:id/submit", h.Attempt.Submit)
	}

	return r
}
