package handler

import (
	"net/http"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"github.com/yumikokawaii/akashic/internal/repository"
	"github.com/yumikokawaii/akashic/internal/service"
)

type QuestionHandler struct {
	svc       *service.QuestionService
	ingestSvc *service.IngestService
}

func NewQuestionHandler(svc *service.QuestionService, ingestSvc *service.IngestService) *QuestionHandler {
	return &QuestionHandler{svc: svc, ingestSvc: ingestSvc}
}

func (h *QuestionHandler) List(c *gin.Context) {
	filter := repository.QuestionFilter{}
	if ids := c.QueryArray("category_id"); len(ids) > 0 {
		filter.CategoryIDs = ids
	}
	if v := c.Query("difficulty"); v != "" {
		filter.Difficulty = &v
	}
	if types := c.QueryArray("type"); len(types) > 0 {
		filter.Types = types
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

func (h *QuestionHandler) Ingest(c *gin.Context) {
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required"})
		return
	}
	defer file.Close()

	ext := filepath.Ext(header.Filename)
	result, err := h.ingestSvc.Ingest(c.Param("bankId"), file, ext)
	if err != nil {
		handleError(c, err)
		return
	}
	if result.Failed > 0 {
		c.JSON(http.StatusUnprocessableEntity, result)
		return
	}
	ok(c, result)
}
