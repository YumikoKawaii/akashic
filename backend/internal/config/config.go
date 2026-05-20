package config

import (
	"fmt"
	"os"
)

type Config struct {
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSchema   string
	DBSSLMode  string
	ServerPort string
	StaticDir  string

	RedisHost string
	RedisPort string

	GoogleClientID     string
	GoogleClientSecret string
	GoogleCallbackURL  string
	JWTSecret          string
	FrontendURL        string

}

func Load() *Config {
	return &Config{
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "akashic"),
		DBPassword: getEnv("DB_PASSWORD", "akashic"),
		DBName:     getEnv("DB_NAME", "postgres"),
		DBSchema:   getEnv("DB_SCHEMA", "akashic"),
		DBSSLMode:  getEnv("DB_SSLMODE", "disable"),
		ServerPort: getEnv("SERVER_PORT", "8080"),
		StaticDir:  getEnv("STATIC_DIR", "./static"),

		RedisHost: getEnv("REDIS_HOST", "localhost"),
		RedisPort: getEnv("REDIS_PORT", "6379"),

		GoogleClientID:     getEnv("GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
		GoogleCallbackURL:  getEnv("GOOGLE_CALLBACK_URL", "http://localhost:8080/api/v1/auth/google/callback"),
		JWTSecret:          getEnv("JWT_SECRET", "change-me-in-production"),
		FrontendURL:        getEnv("FRONTEND_URL", "http://localhost:5173"),

	}
}

func (c *Config) DSN() string {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		c.DBHost, c.DBPort, c.DBUser, c.DBPassword, c.DBName, c.DBSSLMode,
	)
	if c.DBSchema != "" {
		dsn += " search_path=" + c.DBSchema
	}
	return dsn
}

func (c *Config) MigrateURL() string {
	url := fmt.Sprintf(
		"postgresql://%s:%s@%s:%s/%s?sslmode=%s",
		c.DBUser, c.DBPassword, c.DBHost, c.DBPort, c.DBName, c.DBSSLMode,
	)
	if c.DBSchema != "" {
		url += "&search_path=" + c.DBSchema
	}
	return url
}

func getEnv(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}
