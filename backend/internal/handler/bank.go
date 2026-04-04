package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
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
	banks, err := h.svc.List()
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, banks)
}

func (h *BankHandler) Get(c *gin.Context) {
	bank, err := h.svc.GetByID(c.Param("bankId"))
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
	bank, err := h.svc.Create(input)
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
	bank, err := h.svc.Update(c.Param("bankId"), input)
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
	bank, err := h.svc.UpdateDefaultConfig(c.Param("bankId"), config)
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, bank)
}

func (h *BankHandler) Delete(c *gin.Context) {
	if err := h.svc.Delete(c.Param("bankId")); err != nil {
		handleError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
