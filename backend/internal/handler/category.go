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
	categories, err := h.svc.ListByBank(c.Param("bankId"))
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, categories)
}

func (h *CategoryHandler) Create(c *gin.Context) {
	var input service.CreateCategoryInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	category, err := h.svc.Create(c.Param("bankId"), input)
	if err != nil {
		handleError(c, err)
		return
	}
	created(c, category)
}

func (h *CategoryHandler) Update(c *gin.Context) {
	var input service.UpdateCategoryInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	category, err := h.svc.Update(c.Param("bankId"), c.Param("id"), input)
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, category)
}

func (h *CategoryHandler) Delete(c *gin.Context) {
	if err := h.svc.Delete(c.Param("bankId"), c.Param("id")); err != nil {
		handleError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
