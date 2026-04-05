package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/yumikokawaii/akashic/internal/service"
)

type PassageHandler struct {
	svc *service.PassageService
}

func NewPassageHandler(svc *service.PassageService) *PassageHandler {
	return &PassageHandler{svc: svc}
}

func (h *PassageHandler) List(c *gin.Context) {
	passages, err := h.svc.ListByBank(c.Param("bankId"))
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, passages)
}

func (h *PassageHandler) Get(c *gin.Context) {
	passage, err := h.svc.GetByID(c.Param("bankId"), c.Param("id"))
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, passage)
}

func (h *PassageHandler) Create(c *gin.Context) {
	var input service.CreatePassageInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	passage, err := h.svc.Create(c.Param("bankId"), input)
	if err != nil {
		handleError(c, err)
		return
	}
	created(c, passage)
}

func (h *PassageHandler) Update(c *gin.Context) {
	var input service.UpdatePassageInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	passage, err := h.svc.Update(c.Param("bankId"), c.Param("id"), input)
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, passage)
}

func (h *PassageHandler) Delete(c *gin.Context) {
	if err := h.svc.Delete(c.Param("bankId"), c.Param("id")); err != nil {
		handleError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
