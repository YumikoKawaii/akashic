package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

type Handlers struct {
	Auth          *AuthHandler
	Bank          *BankHandler
	Category      *CategoryHandler
	Question      *QuestionHandler
	QuestionGroup *QuestionGroupHandler
	Passage       *PassageHandler
	Test          *TestHandler
	Attempt       *AttemptHandler
	AuthMW        gin.HandlerFunc
	StaticDir     string
}

func NewRouter(h Handlers) *gin.Engine {
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())

	// ── Auth routes (no middleware) ────────────────────────────────────────────
	auth := r.Group("/api/v1/auth")
	auth.GET("/google", h.Auth.Login)
	auth.GET("/google/callback", h.Auth.Callback)
	auth.GET("/me", h.AuthMW, h.Auth.Me)
	auth.POST("/logout", h.AuthMW, h.Auth.Logout)

	// ── Protected API routes ───────────────────────────────────────────────────
	v1 := r.Group("/api/v1", h.AuthMW)

	banks := v1.Group("/banks")
	banks.GET("", h.Bank.List)
	banks.POST("", h.Bank.Create)

	bank := v1.Group("/banks/:bankId")
	{
		bank.GET("", h.Bank.Get)
		bank.PUT("", h.Bank.Update)
		bank.PUT("/default-config", h.Bank.UpdateDefaultConfig)
		bank.DELETE("", h.Bank.Delete)
		bank.PUT("/restore", h.Bank.Restore)

		bank.GET("/members", h.Bank.ListMembers)
		bank.POST("/members", h.Bank.AddMember)
		bank.DELETE("/members/:userId", h.Bank.RemoveMember)
		bank.PUT("/members/:userId/role", h.Bank.UpdateMemberRole)

		bank.GET("/categories", h.Category.List)
		bank.POST("/categories", h.Category.Create)
		bank.PUT("/categories/:id", h.Category.Update)
		bank.DELETE("/categories/:id", h.Category.Delete)
		bank.PUT("/categories/:id/restore", h.Category.Restore)

		bank.GET("/passages", h.Passage.List)
		bank.POST("/passages", h.Passage.Create)
		bank.GET("/passages/:id", h.Passage.Get)
		bank.PUT("/passages/:id", h.Passage.Update)
		bank.DELETE("/passages/:id", h.Passage.Delete)
		bank.PUT("/passages/:id/restore", h.Passage.Restore)

		bank.GET("/question-groups", h.QuestionGroup.List)
		bank.POST("/question-groups", h.QuestionGroup.Create)
		bank.GET("/question-groups/:id", h.QuestionGroup.Get)
		bank.PUT("/question-groups/:id", h.QuestionGroup.Update)
		bank.DELETE("/question-groups/:id", h.QuestionGroup.Delete)
		bank.PUT("/question-groups/:id/restore", h.QuestionGroup.Restore)

		bank.GET("/questions", h.Question.List)
		bank.POST("/questions", h.Question.Create)
		bank.POST("/questions/ingest", h.Question.Ingest)
		bank.GET("/questions/:id", h.Question.Get)
		bank.PUT("/questions/:id", h.Question.Update)
		bank.DELETE("/questions/:id", h.Question.Delete)
		bank.PUT("/questions/:id/restore", h.Question.Restore)

		bank.GET("/tests", h.Test.List)
		bank.POST("/tests/generate", h.Test.Generate)
		bank.GET("/tests/:id", h.Test.Get)
		bank.DELETE("/tests/:id", h.Test.Delete)
		bank.PUT("/tests/:id/restore", h.Test.Restore)

		bank.GET("/tests/:id/attempts", h.Attempt.ListByTest)
		bank.POST("/tests/:id/attempts", h.Attempt.Start)
	}

	attempts := v1.Group("/attempts")
	{
		attempts.GET("/:id", h.Attempt.Get)
		attempts.PUT("/:id/submit", h.Attempt.Submit)
	}

	// ── Static frontend ────────────────────────────────────────────────────────
	if h.StaticDir != "" {
		r.Static("/assets", h.StaticDir+"/assets")
		r.Static("/favicon", h.StaticDir+"/favicon")
		r.StaticFile("/favicon.ico", h.StaticDir+"/favicon/favicon.ico")

		r.NoRoute(func(c *gin.Context) {
			if strings.HasPrefix(c.Request.URL.Path, "/api") {
				c.JSON(http.StatusNotFound, gin.H{"error": "endpoint not found"})
				return
			}
			c.File(h.StaticDir + "/index.html")
		})
	}

	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Next()
	})

	return r
}
