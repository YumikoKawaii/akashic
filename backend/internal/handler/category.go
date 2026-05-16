package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/yumikokawaii/akashic/internal/service"
)

type CategoryHandler struct {
	svc *service.CategoryService
}

func NewCategoryHandler(svc *service.CategoryService) *CategoryHandler {
	return &CategoryHandler{svc: svc}
}

func (h *CategoryHandler) List(c *gin.Context) {
	bankID, ok2 := parseID(c, "bankId")
	if !ok2 {
		return
	}
	categories, err := h.svc.List(bankID)
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, categories)
}

func (h *CategoryHandler) Create(c *gin.Context) {
	bankID, ok2 := parseID(c, "bankId")
	if !ok2 {
		return
	}
	var input service.CreateCategoryInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	category, err := h.svc.Create(bankID, input)
	if err != nil {
		handleError(c, err)
		return
	}
	created(c, category)
}

func (h *CategoryHandler) Update(c *gin.Context) {
	bankID, ok2 := parseID(c, "bankId")
	if !ok2 {
		return
	}
	id, ok2 := parseID(c, "id")
	if !ok2 {
		return
	}
	var input service.UpdateCategoryInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	category, err := h.svc.Update(bankID, id, input)
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, category)
}

func (h *CategoryHandler) Delete(c *gin.Context) {
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

func (h *CategoryHandler) Restore(c *gin.Context) {
	bankID, ok2 := parseID(c, "bankId")
	if !ok2 {
		return
	}
	id, ok2 := parseID(c, "id")
	if !ok2 {
		return
	}
	category, err := h.svc.Restore(bankID, id)
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, category)
}
