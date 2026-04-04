package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/yumikokawaii/akashic/internal/repository"
	"github.com/yumikokawaii/akashic/internal/service"
)

type QuestionHandler struct {
	svc *service.QuestionService
}

func NewQuestionHandler(svc *service.QuestionService) *QuestionHandler {
	return &QuestionHandler{svc: svc}
}

func (h *QuestionHandler) List(c *gin.Context) {
	filter := repository.QuestionFilter{}
	if v := c.Query("category_id"); v != "" {
		filter.CategoryID = &v
	}
	if v := c.Query("difficulty"); v != "" {
		filter.Difficulty = &v
	}
	if v := c.Query("type"); v != "" {
		filter.Type = &v
	}
	if tags := c.QueryArray("tags"); len(tags) > 0 {
		filter.Tags = tags
	}

	questions, err := h.svc.ListByBank(c.Param("bankId"), filter)
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, questions)
}

func (h *QuestionHandler) Get(c *gin.Context) {
	question, err := h.svc.GetByID(c.Param("bankId"), c.Param("id"))
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, question)
}

func (h *QuestionHandler) Create(c *gin.Context) {
	var input service.CreateQuestionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	question, err := h.svc.Create(c.Param("bankId"), input)
	if err != nil {
		handleError(c, err)
		return
	}
	created(c, question)
}

func (h *QuestionHandler) Update(c *gin.Context) {
	var input service.UpdateQuestionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	question, err := h.svc.Update(c.Param("bankId"), c.Param("id"), input)
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, question)
}

func (h *QuestionHandler) Delete(c *gin.Context) {
	if err := h.svc.Delete(c.Param("bankId"), c.Param("id")); err != nil {
		handleError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
