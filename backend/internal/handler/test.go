package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/yumikokawaii/akashic/internal/service"
)

type TestHandler struct {
	svc *service.TestService
}

func NewTestHandler(svc *service.TestService) *TestHandler {
	return &TestHandler{svc: svc}
}

func (h *TestHandler) List(c *gin.Context) {
	tests, err := h.svc.ListByBank(c.Param("bankId"))
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, tests)
}

func (h *TestHandler) Get(c *gin.Context) {
	test, err := h.svc.GetByID(c.Param("bankId"), c.Param("id"))
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, test)
}

func (h *TestHandler) Generate(c *gin.Context) {
	var input service.GenerateTestInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	test, err := h.svc.Generate(c.Param("bankId"), input)
	if err != nil {
		handleError(c, err)
		return
	}
	created(c, test)
}

func (h *TestHandler) Delete(c *gin.Context) {
	if err := h.svc.Delete(c.Param("bankId"), c.Param("id")); err != nil {
		handleError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
