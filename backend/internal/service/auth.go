package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/yumikokawaii/akashic/internal/model"
	"github.com/yumikokawaii/akashic/internal/repository"
	"golang.org/x/crypto/bcrypt"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

var ErrEmailTaken    = errors.New("email already registered")
var ErrInvalidCreds  = errors.New("invalid email or password")
var ErrPasswordLogin = errors.New("account uses Google login")

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

	gid := info.Sub
	user := &model.User{
		GoogleID:  &gid,
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

// ── Password auth ──────────────────────────────────────────────────────────────

type RegisterInput struct {
	Email    string `json:"email"    binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	Name     string `json:"name"     binding:"required"`
}

func (s *AuthService) Register(input RegisterInput) (*model.User, string, error) {
	if _, err := s.userRepo.FindByEmail(input.Email); err == nil {
		return nil, "", ErrEmailTaken
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, "", err
	}
	user := &model.User{
		Email:        input.Email,
		Name:         input.Name,
		PasswordHash: string(hash),
	}
	if err := s.userRepo.Save(user); err != nil {
		return nil, "", err
	}
	token, err := s.IssueJWT(user)
	return user, token, err
}

type LoginInput struct {
	Email    string `json:"email"    binding:"required"`
	Password string `json:"password" binding:"required"`
}

func (s *AuthService) Login(input LoginInput) (*model.User, string, error) {
	user, err := s.userRepo.FindByEmail(input.Email)
	if err != nil {
		return nil, "", ErrInvalidCreds
	}
	if user.PasswordHash == "" {
		return nil, "", ErrPasswordLogin
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)); err != nil {
		return nil, "", ErrInvalidCreds
	}
	token, err := s.IssueJWT(user)
	return user, token, err
}

// ── JWT ────────────────────────────────────────────────────────────────────────

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
