package handler

import (
	"net/http"
	"strconv"

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
	bankID, ok2 := parseID(c, "bankId")
	if !ok2 {
		return
	}
	bank, err := h.svc.GetByID(bankID, middleware.UserID(c))
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
	bankID, ok2 := parseID(c, "bankId")
	if !ok2 {
		return
	}
	var input service.UpdateBankInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	bank, err := h.svc.Update(bankID, middleware.UserID(c), input)
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, bank)
}

func (h *BankHandler) UpdateDefaultConfig(c *gin.Context) {
	bankID, ok2 := parseID(c, "bankId")
	if !ok2 {
		return
	}
	var config model.TestConfig
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	bank, err := h.svc.UpdateDefaultConfig(bankID, middleware.UserID(c), config)
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, bank)
}

func (h *BankHandler) Delete(c *gin.Context) {
	bankID, ok2 := parseID(c, "bankId")
	if !ok2 {
		return
	}
	if err := h.svc.Delete(bankID, middleware.UserID(c)); err != nil {
		handleError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *BankHandler) Restore(c *gin.Context) {
	bankID, ok2 := parseID(c, "bankId")
	if !ok2 {
		return
	}
	bank, err := h.svc.Restore(bankID, middleware.UserID(c))
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, bank)
}

// ── Members ────────────────────────────────────────────────────────────────────

func (h *BankHandler) ListMembers(c *gin.Context) {
	bankID, ok2 := parseID(c, "bankId")
	if !ok2 {
		return
	}
	members, err := h.svc.ListMembers(bankID, middleware.UserID(c))
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, members)
}

func (h *BankHandler) AddMember(c *gin.Context) {
	bankID, ok2 := parseID(c, "bankId")
	if !ok2 {
		return
	}
	var input service.ShareInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	member, err := h.svc.AddMember(bankID, middleware.UserID(c), input)
	if err != nil {
		handleError(c, err)
		return
	}
	created(c, member)
}

func (h *BankHandler) RemoveMember(c *gin.Context) {
	bankID, ok2 := parseID(c, "bankId")
	if !ok2 {
		return
	}
	targetID, err2 := strconv.Atoi(c.Param("userId"))
	if err2 != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid userId"})
		return
	}
	if err := h.svc.RemoveMember(bankID, middleware.UserID(c), targetID); err != nil {
		handleError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *BankHandler) UpdateMemberRole(c *gin.Context) {
	bankID, ok2 := parseID(c, "bankId")
	if !ok2 {
		return
	}
	targetID, err2 := strconv.Atoi(c.Param("userId"))
	if err2 != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid userId"})
		return
	}
	var body struct {
		Role string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	member, err := h.svc.UpdateMemberRole(bankID, middleware.UserID(c), targetID, body.Role)
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, member)
}
