package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/yumikokawaii/akashic/internal/service"
)

const (
	CtxUserID    = "user_id"
	CtxUserEmail = "user_email"
	CtxUserName  = "user_name"
	CtxAvatarURL = "user_avatar_url"
)

func Auth(authSvc *service.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenStr, err := c.Cookie("auth_token")
		if err != nil || tokenStr == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			c.Abort()
			return
		}
		claims, err := authSvc.ParseJWT(tokenStr)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			c.Abort()
			return
		}
		c.Set(CtxUserID, claims.UserID)
		c.Set(CtxUserEmail, claims.Email)
		c.Set(CtxUserName, claims.Name)
		c.Set(CtxAvatarURL, claims.AvatarURL)
		c.Next()
	}
}

func UserID(c *gin.Context) string {
	id, _ := c.Get(CtxUserID)
	s, _ := id.(string)
	return s
}
