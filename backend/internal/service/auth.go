package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/yumikokawaii/akashic/internal/model"
	"github.com/yumikokawaii/akashic/internal/repository"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

type JWTClaims struct {
	UserID    int    `json:"user_id"`
	Email     string `json:"email"`
	Name      string `json:"name"`
	AvatarURL string `json:"avatar_url"`
	jwt.RegisteredClaims
}

type AuthService struct {
	userRepo    repository.UserRepository
	oauthConfig *oauth2.Config
	jwtSecret   string
}

func NewAuthService(userRepo repository.UserRepository, clientID, clientSecret, callbackURL, jwtSecret string) *AuthService {
	cfg := &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURL:  callbackURL,
		Scopes:       []string{"openid", "email", "profile"},
		Endpoint:     google.Endpoint,
	}
	return &AuthService{userRepo: userRepo, oauthConfig: cfg, jwtSecret: jwtSecret}
}

func (s *AuthService) LoginURL(state string) string {
	return s.oauthConfig.AuthCodeURL(state, oauth2.AccessTypeOnline)
}

type googleUserInfo struct {
	Sub      string `json:"sub"`
	Email    string `json:"email"`
	Name     string `json:"name"`
	Picture  string `json:"picture"`
	Verified bool   `json:"email_verified"`
}

func (s *AuthService) HandleCallback(code string) (*model.User, string, error) {
	token, err := s.oauthConfig.Exchange(context.Background(), code)
	if err != nil {
		return nil, "", fmt.Errorf("code exchange: %w", err)
	}

	client := s.oauthConfig.Client(context.Background(), token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v3/userinfo")
	if err != nil {
		return nil, "", fmt.Errorf("get userinfo: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, "", fmt.Errorf("userinfo status %d: %s", resp.StatusCode, body)
	}

	var info googleUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return nil, "", fmt.Errorf("decode userinfo: %w", err)
	}

	user := &model.User{
		GoogleID:  info.Sub,
		Email:     info.Email,
		Name:      info.Name,
		AvatarURL: info.Picture,
	}
	if err := s.userRepo.Upsert(user); err != nil {
		return nil, "", fmt.Errorf("upsert user: %w", err)
	}

	jwtToken, err := s.IssueJWT(user)
	if err != nil {
		return nil, "", err
	}
	return user, jwtToken, nil
}

func (s *AuthService) IssueJWT(user *model.User) (string, error) {
	claims := JWTClaims{
		UserID:    user.ID,
		Email:     user.Email,
		Name:      user.Name,
		AvatarURL: user.AvatarURL,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(s.jwtSecret))
}

func (s *AuthService) ParseJWT(tokenStr string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &JWTClaims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(s.jwtSecret), nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*JWTClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}
	return claims, nil
}
