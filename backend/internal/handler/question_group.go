package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/yumikokawaii/akashic/internal/repository"
	"github.com/yumikokawaii/akashic/internal/service"
)

type QuestionGroupHandler struct {
	svc *service.QuestionGroupService
}

func NewQuestionGroupHandler(svc *service.QuestionGroupService) *QuestionGroupHandler {
	return &QuestionGroupHandler{svc: svc}
}

func (h *QuestionGroupHandler) List(c *gin.Context) {
	bankID, ok2 := parseID(c, "bankId")
	if !ok2 {
		return
	}
	f := repository.GroupFilter{}
	for _, v := range c.QueryArray("category_id") {
		if id, err := strconv.Atoi(v); err == nil {
			f.CategoryIDs = append(f.CategoryIDs, id)
		}
	}
	if v := c.Query("passage_id"); v != "" {
		if id, err := strconv.Atoi(v); err == nil {
			f.PassageID = &id
		}
	}
	if v := c.Query("type"); v != "" {
		f.Type = v
	}
	if v := c.Query("difficulty"); v != "" {
		f.Difficulty = v
	}

	groups, err := h.svc.List(bankID, f)
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, groups)
}

func (h *QuestionGroupHandler) Get(c *gin.Context) {
	bankID, ok2 := parseID(c, "bankId")
	if !ok2 {
		return
	}
	id, ok2 := parseID(c, "id")
	if !ok2 {
		return
	}
	group, err := h.svc.GetByID(bankID, id)
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, group)
}

func (h *QuestionGroupHandler) Create(c *gin.Context) {
	bankID, ok2 := parseID(c, "bankId")
	if !ok2 {
		return
	}
	var input service.CreateGroupInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	group, err := h.svc.Create(bankID, input)
	if err != nil {
		handleError(c, err)
		return
	}
	created(c, group)
}

func (h *QuestionGroupHandler) Update(c *gin.Context) {
	bankID, ok2 := parseID(c, "bankId")
	if !ok2 {
		return
	}
	id, ok2 := parseID(c, "id")
	if !ok2 {
		return
	}
	var input service.UpdateGroupInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	group, err := h.svc.Update(bankID, id, input)
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, group)
}

func (h *QuestionGroupHandler) Delete(c *gin.Context) {
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

func (h *QuestionGroupHandler) Restore(c *gin.Context) {
	bankID, ok2 := parseID(c, "bankId")
	if !ok2 {
		return
	}
	id, ok2 := parseID(c, "id")
	if !ok2 {
		return
	}
	group, err := h.svc.Restore(bankID, id)
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, group)
}
