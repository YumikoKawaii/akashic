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

func (h *AttemptHandler) Start(c *gin.Context) {
	bankID, ok2 := parseID(c, "bankId")
	if !ok2 {
		return
	}
	testID, ok2 := parseID(c, "id")
	if !ok2 {
		return
	}
	attempt, err := h.svc.Start(bankID, testID)
	if err != nil {
		handleError(c, err)
		return
	}
	created(c, attempt)
}

func (h *AttemptHandler) ListByTest(c *gin.Context) {
	bankID, ok2 := parseID(c, "bankId")
	if !ok2 {
		return
	}
	testID, ok2 := parseID(c, "id")
	if !ok2 {
		return
	}
	attempts, err := h.svc.ListByTest(bankID, testID)
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, attempts)
}

func (h *AttemptHandler) Get(c *gin.Context) {
	id, ok2 := parseID(c, "id")
	if !ok2 {
		return
	}
	attempt, err := h.svc.GetByID(id)
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, attempt)
}

func (h *AttemptHandler) Submit(c *gin.Context) {
	id, ok2 := parseID(c, "id")
	if !ok2 {
		return
	}
	var input service.SubmitAttemptInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	attempt, err := h.svc.Submit(id, input)
	if err != nil {
		handleError(c, err)
		return
	}
	ok(c, attempt)
}
