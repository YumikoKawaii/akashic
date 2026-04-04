package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

type Handlers struct {
	Bank      *BankHandler
	Category  *CategoryHandler
	Question  *QuestionHandler
	Test      *TestHandler
	Attempt   *AttemptHandler
	StaticDir string
}

func NewRouter(h Handlers) *gin.Engine {
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())

	// ── API routes ────────────────────────────────────────────
	v1 := r.Group("/api/v1")

	banks := v1.Group("/banks")
	{
		banks.GET("", h.Bank.List)
		banks.POST("", h.Bank.Create)
		banks.GET("/:id", h.Bank.Get)
		banks.PUT("/:id", h.Bank.Update)
		banks.PUT("/:id/default-config", h.Bank.UpdateDefaultConfig)
		banks.DELETE("/:id", h.Bank.Delete)

		banks.GET("/:bankId/categories", h.Category.List)
		banks.POST("/:bankId/categories", h.Category.Create)
		banks.PUT("/:bankId/categories/:id", h.Category.Update)
		banks.DELETE("/:bankId/categories/:id", h.Category.Delete)

		banks.GET("/:bankId/questions", h.Question.List)
		banks.POST("/:bankId/questions", h.Question.Create)
		banks.GET("/:bankId/questions/:id", h.Question.Get)
		banks.PUT("/:bankId/questions/:id", h.Question.Update)
		banks.DELETE("/:bankId/questions/:id", h.Question.Delete)

		banks.GET("/:bankId/tests", h.Test.List)
		banks.POST("/:bankId/tests/generate", h.Test.Generate)
		banks.GET("/:bankId/tests/:id", h.Test.Get)
		banks.DELETE("/:bankId/tests/:id", h.Test.Delete)

		banks.POST("/:bankId/attempts", h.Attempt.Start)
	}

	attempts := v1.Group("/attempts")
	{
		attempts.GET("/:id", h.Attempt.Get)
		attempts.PUT("/:id/submit", h.Attempt.Submit)
	}

	// ── Static frontend ───────────────────────────────────────
	if h.StaticDir != "" {
		r.Static("/assets", h.StaticDir+"/assets")
		r.StaticFile("/favicon.ico", h.StaticDir+"/favicon.ico")

		// SPA fallback: serve index.html for all non-API routes
		r.NoRoute(func(c *gin.Context) {
			if strings.HasPrefix(c.Request.URL.Path, "/api") {
				c.JSON(http.StatusNotFound, gin.H{"error": "endpoint not found"})
				return
			}
			c.File(h.StaticDir + "/index.html")
		})
	}

	return r
}
