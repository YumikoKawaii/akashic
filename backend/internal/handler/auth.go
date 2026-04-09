package handler

import (
	"crypto/rand"
	"encoding/base64"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/yumikokawaii/akashic/internal/middleware"
	"github.com/yumikokawaii/akashic/internal/service"
)

type AuthHandler struct {
	svc         *service.AuthService
	frontendURL string
}

func NewAuthHandler(svc *service.AuthService, frontendURL string) *AuthHandler {
	return &AuthHandler{svc: svc, frontendURL: frontendURL}
}

func (h *AuthHandler) Login(c *gin.Context) {
	state := randomState()
	c.SetCookie("oauth_state", state, 600, "/", "", false, true)
	c.Redirect(http.StatusTemporaryRedirect, h.svc.LoginURL(state))
}

func (h *AuthHandler) Callback(c *gin.Context) {
	storedState, _ := c.Cookie("oauth_state")
	if storedState == "" || c.Query("state") != storedState {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid state"})
		return
	}
	c.SetCookie("oauth_state", "", -1, "/", "", false, true)

	code := c.Query("code")
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing code"})
		return
	}

	_, jwtToken, err := h.svc.HandleCallback(code)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	maxAge := int((7 * 24 * time.Hour).Seconds())
	c.SetCookie("auth_token", jwtToken, maxAge, "/", "", false, true)
	c.Redirect(http.StatusTemporaryRedirect, h.frontendURL)
}

func (h *AuthHandler) Me(c *gin.Context) {
	ok(c, gin.H{
		"id":         middleware.UserID(c),
		"email":      c.GetString(middleware.CtxUserEmail),
		"name":       c.GetString(middleware.CtxUserName),
		"avatar_url": c.GetString(middleware.CtxAvatarURL),
	})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	c.SetCookie("auth_token", "", -1, "/", "", false, true)
	c.Status(http.StatusNoContent)
}

func randomState() string {
	b := make([]byte, 16)
	rand.Read(b)
	return base64.URLEncoding.EncodeToString(b)
}
