package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/yumikokawaii/akashic/internal/service"
)

type TestHandler struct {
	svc     *service.TestService
	bankSvc *service.BankService
}

func NewTestHandler(svc *service.TestService, bankSvc *service.BankService) *TestHandler {
	return &TestHandler{svc: svc, bankSvc: bankSvc}
}

func (h *TestHandler) List(c *gin.Context) {
	bankID, ok2 := parseID(c, "bankId")
	if !ok2 {
		return
	}
	tests, err := h.svc.ListByBank(bankID)
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, tests)
}

func (h *TestHandler) Get(c *gin.Context) {
	bankID, ok2 := parseID(c, "bankId")
	if !ok2 {
		return
	}
	id, ok2 := parseID(c, "id")
	if !ok2 {
		return
	}
	test, err := h.svc.GetByID(bankID, id)
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, test)
}

func (h *TestHandler) Generate(c *gin.Context) {
	bankID, ok2 := parseID(c, "bankId")
	if !ok2 {
		return
	}
	var input service.GenerateTestInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	test, err := h.svc.Generate(bankID, input)
	if err != nil {
		handleError(c, err)
		return
	}
	created(c, test)
}

func (h *TestHandler) Delete(c *gin.Context) {
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

func (h *TestHandler) Restore(c *gin.Context) {
	bankID, ok2 := parseID(c, "bankId")
	if !ok2 {
		return
	}
	id, ok2 := parseID(c, "id")
	if !ok2 {
		return
	}
	test, err := h.svc.Restore(bankID, id)
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, test)
}
