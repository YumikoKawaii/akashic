package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/yumikokawaii/akashic/internal/middleware"
	"github.com/yumikokawaii/akashic/internal/model"
	"github.com/yumikokawaii/akashic/internal/service"
)

type BankHandler struct {
	svc *service.BankService
}

func NewBankHandler(svc *service.BankService) *BankHandler {
	return &BankHandler{svc: svc}
}

func (h *BankHandler) List(c *gin.Context) {
	banks, err := h.svc.List(middleware.UserID(c))
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, banks)
}

func (h *BankHandler) Get(c *gin.Context) {
	bank, err := h.svc.GetByID(c.Param("bankId"), middleware.UserID(c))
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, bank)
}

func (h *BankHandler) Create(c *gin.Context) {
	var input service.CreateBankInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	bank, err := h.svc.Create(input, middleware.UserID(c))
	if err != nil {
		handleError(c, err)
		return
	}
	created(c, bank)
}

func (h *BankHandler) Update(c *gin.Context) {
	var input service.UpdateBankInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	bank, err := h.svc.Update(c.Param("bankId"), middleware.UserID(c), input)
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, bank)
}

func (h *BankHandler) UpdateDefaultConfig(c *gin.Context) {
	var config model.TestConfig
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	bank, err := h.svc.UpdateDefaultConfig(c.Param("bankId"), middleware.UserID(c), config)
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, bank)
}

func (h *BankHandler) Delete(c *gin.Context) {
	if err := h.svc.DeleteBank(c.Param("bankId"), middleware.UserID(c)); err != nil {
		handleError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// ── Share endpoints ────────────────────────────────────────────────────────────

func (h *BankHandler) ListMembers(c *gin.Context) {
	members, err := h.svc.ListMembers(c.Param("bankId"), middleware.UserID(c))
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, members)
}

func (h *BankHandler) AddMember(c *gin.Context) {
	var input service.ShareInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	member, err := h.svc.AddMember(c.Param("bankId"), middleware.UserID(c), input)
	if err != nil {
		handleError(c, err)
		return
	}
	created(c, member)
}

func (h *BankHandler) RemoveMember(c *gin.Context) {
	if err := h.svc.RemoveMember(c.Param("bankId"), middleware.UserID(c), c.Param("userId")); err != nil {
		handleError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
