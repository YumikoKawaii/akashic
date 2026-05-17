package handler

import (
	"net/http"
	"path/filepath"
	"strconv"

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
	bankID, ok2 := parseID(c, "bankId")
	if !ok2 {
		return
	}
	f := repository.QuestionFilter{}
	for _, v := range c.QueryArray("category_id") {
		if id, err := strconv.Atoi(v); err == nil {
			f.CategoryIDs = append(f.CategoryIDs, id)
		}
	}
	if v := c.Query("difficulty"); v != "" {
		f.Difficulty = v
	}
	if v := c.Query("type"); v != "" {
		f.Type = v
	}
	if tags := c.QueryArray("tag"); len(tags) > 0 {
		f.Tags = tags
	}
	if c.Query("standalone") == "true" {
		f.StandaloneOnly = true
	}

	page, pageSize := 1, 20
	if v := c.Query("page"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			page = n
		}
	}
	if v := c.Query("page_size"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 100 {
			pageSize = n
		}
	}

	result, err := h.svc.ListPaged(bankID, f, page, pageSize)
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, result)
}

func (h *QuestionHandler) Get(c *gin.Context) {
	bankID, ok2 := parseID(c, "bankId")
	if !ok2 {
		return
	}
	id, ok2 := parseID(c, "id")
	if !ok2 {
		return
	}
	question, err := h.svc.GetByID(bankID, id)
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, question)
}

func (h *QuestionHandler) Create(c *gin.Context) {
	bankID, ok2 := parseID(c, "bankId")
	if !ok2 {
		return
	}
	var input service.CreateQuestionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	question, err := h.svc.Create(bankID, input)
	if err != nil {
		handleError(c, err)
		return
	}
	created(c, question)
}

func (h *QuestionHandler) Update(c *gin.Context) {
	bankID, ok2 := parseID(c, "bankId")
	if !ok2 {
		return
	}
	id, ok2 := parseID(c, "id")
	if !ok2 {
		return
	}
	var input service.UpdateQuestionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	question, err := h.svc.Update(bankID, id, input)
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, question)
}

func (h *QuestionHandler) Delete(c *gin.Context) {
	bankID, ok2 := parseID(c, "bankId")
	if !ok2 {
		return
	}
	id, ok2 := parseID(c, "id")
	if !ok2 {
		return
	}
	if err := h.svc.Delete(bankID, id); err != nil {
		handleError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *QuestionHandler) Restore(c *gin.Context) {
	bankID, ok2 := parseID(c, "bankId")
	if !ok2 {
		return
	}
	id, ok2 := parseID(c, "id")
	if !ok2 {
		return
	}
	question, err := h.svc.Restore(bankID, id)
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, question)
}

func (h *QuestionHandler) Ingest(c *gin.Context) {
	bankID, ok2 := parseID(c, "bankId")
	if !ok2 {
		return
	}
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required"})
		return
	}
	defer file.Close()

	ext := filepath.Ext(header.Filename)
	result, err := h.ingestSvc.Ingest(bankID, file, ext)
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
