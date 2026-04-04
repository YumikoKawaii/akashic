package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/yumikokawaii/akashic/internal/service"
)

type AttemptHandler struct {
	svc *service.AttemptService
}

func NewAttemptHandler(svc *service.AttemptService) *AttemptHandler {
	return &AttemptHandler{svc: svc}
}

// Start requires bankId in the path to validate the test belongs to that bank.
func (h *AttemptHandler) Start(c *gin.Context) {
	var input service.StartAttemptInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	attempt, err := h.svc.Start(c.Param("bankId"), input)
	if err != nil {
		handleError(c, err)
		return
	}
	created(c, attempt)
}

func (h *AttemptHandler) Get(c *gin.Context) {
	attempt, err := h.svc.GetByID(c.Param("id"))
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, attempt)
}

func (h *AttemptHandler) Submit(c *gin.Context) {
	var input service.SubmitAttemptInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	attempt, err := h.svc.Submit(c.Param("id"), input)
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, attempt)
}
