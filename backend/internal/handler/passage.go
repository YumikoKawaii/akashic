package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/yumikokawaii/akashic/internal/repository"
	"github.com/yumikokawaii/akashic/internal/service"
)

type PassageHandler struct {
	svc *service.PassageService
}

func NewPassageHandler(svc *service.PassageService) *PassageHandler {
	return &PassageHandler{svc: svc}
}

func (h *PassageHandler) List(c *gin.Context) {
	bankID, ok2 := parseID(c, "bankId")
	if !ok2 {
		return
	}
	f := repository.PassageFilter{}
	if v := c.Query("category_id"); v != "" {
		if id, err := strconv.Atoi(v); err == nil {
			f.CategoryID = &id
		}
	}
	if v := c.Query("difficulty"); v != "" {
		f.Difficulty = v
	}
	page, pageSize := 1, 10
	if v := c.Query("page"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			page = n
		}
	}
	if v := c.Query("page_size"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 50 {
			pageSize = n
		}
	}

	// all=true is used by GenerateTab to populate the passage selector
	if c.Query("all") == "true" {
		passages, err := h.svc.List(bankID, f)
		if err != nil {
			handleError(c, err)
			return
		}
		ok(c, passages)
		return
	}

	result, err := h.svc.ListPaged(bankID, f, page, pageSize)
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, result)
}

func (h *PassageHandler) Get(c *gin.Context) {
	bankID, ok2 := parseID(c, "bankId")
	if !ok2 {
		return
	}
	id, ok2 := parseID(c, "id")
	if !ok2 {
		return
	}
	passage, err := h.svc.GetByID(bankID, id)
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, passage)
}

func (h *PassageHandler) Create(c *gin.Context) {
	bankID, ok2 := parseID(c, "bankId")
	if !ok2 {
		return
	}
	var input service.CreatePassageInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	passage, err := h.svc.Create(bankID, input)
	if err != nil {
		handleError(c, err)
		return
	}
	created(c, passage)
}

func (h *PassageHandler) Update(c *gin.Context) {
	bankID, ok2 := parseID(c, "bankId")
	if !ok2 {
		return
	}
	id, ok2 := parseID(c, "id")
	if !ok2 {
		return
	}
	var input service.UpdatePassageInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	passage, err := h.svc.Update(bankID, id, input)
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, passage)
}

func (h *PassageHandler) Delete(c *gin.Context) {
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

func (h *PassageHandler) Restore(c *gin.Context) {
	bankID, ok2 := parseID(c, "bankId")
	if !ok2 {
		return
	}
	id, ok2 := parseID(c, "id")
	if !ok2 {
		return
	}
	passage, err := h.svc.Restore(bankID, id)
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, passage)
}
