package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/yumikokawaii/akashic/internal/middleware"
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
	result, err := h.svc.ListByBankPaged(bankID, page, pageSize)
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, result)
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
	input.UserID = middleware.UserID(c)
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
