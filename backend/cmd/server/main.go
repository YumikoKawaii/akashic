package main

import (
	"context"
	"fmt"
	"log"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "github.com/lib/pq"
	"github.com/redis/go-redis/v9"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/yumikokawaii/akashic/internal/config"
	"github.com/yumikokawaii/akashic/internal/handler"
	"github.com/yumikokawaii/akashic/internal/middleware"
	"github.com/yumikokawaii/akashic/internal/repository"
	"github.com/yumikokawaii/akashic/internal/service"
	"github.com/yumikokawaii/akashic/internal/uow"
)

func main() {
	cfg := config.Load()

	if err := runMigrations(cfg); err != nil {
		log.Fatalf("migration failed: %v", err)
	}

	db, err := gorm.Open(postgres.Open(cfg.DSN()), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	rdb := redis.NewClient(&redis.Options{
		Addr: fmt.Sprintf("%s:%s", cfg.RedisHost, cfg.RedisPort),
	})
	if err := rdb.Ping(context.Background()).Err(); err != nil {
		log.Fatalf("failed to connect to redis: %v", err)
	}

	unitOfWork := uow.New(db)

	bankRepo          := repository.NewBankRepo(db)
	categoryRepo      := repository.NewCategoryRepo(db)
	questionRepo      := repository.NewQuestionRepo(db)
	questionGroupRepo := repository.NewQuestionGroupRepo(db)
	passageRepo       := repository.NewPassageRepo(db)
	testRepo          := repository.NewTestRepo(db)
	attemptRepo       := repository.NewAttemptRepo(db)
	userRepo          := repository.NewUserRepo(db)
	memberRepo        := repository.NewMemberRepo(db)

	generateCache   := service.NewGenerateCache(rdb, service.GenerateConfig{UserCooldownAttempts: 3})

	authSvc         := service.NewAuthService(userRepo, cfg.GoogleClientID, cfg.GoogleClientSecret, cfg.GoogleCallbackURL, cfg.JWTSecret)
	bankSvc         := service.NewBankService(bankRepo, memberRepo, userRepo)
	categorySvc     := service.NewCategoryService(categoryRepo, bankRepo)
	passageSvc      := service.NewPassageService(passageRepo, bankRepo, categoryRepo)
	questionGroupSvc := service.NewQuestionGroupService(unitOfWork, questionGroupRepo, bankRepo, categoryRepo)
	questionSvc     := service.NewQuestionService(unitOfWork, questionRepo, bankRepo, categoryRepo)
	testSvc         := service.NewTestService(unitOfWork, testRepo, questionRepo, questionGroupRepo, bankRepo, generateCache)
	attemptSvc      := service.NewAttemptService(attemptRepo, testRepo)
	ingestSvc       := service.NewIngestService(unitOfWork, bankRepo, categoryRepo, questionRepo)

	authMW := middleware.Auth(authSvc)

	handlers := handler.Handlers{
		Auth:          handler.NewAuthHandler(authSvc, cfg.FrontendURL),
		Bank:          handler.NewBankHandler(bankSvc),
		Category:      handler.NewCategoryHandler(categorySvc),
		Passage:       handler.NewPassageHandler(passageSvc),
		QuestionGroup: handler.NewQuestionGroupHandler(questionGroupSvc),
		Question:      handler.NewQuestionHandler(questionSvc, ingestSvc),
		Test:          handler.NewTestHandler(testSvc, bankSvc),
		Attempt:       handler.NewAttemptHandler(attemptSvc),
		AuthMW:        authMW,
		StaticDir:     cfg.StaticDir,
	}

	router := handler.NewRouter(handlers)

	addr := fmt.Sprintf(":%s", cfg.ServerPort)
	log.Printf("server listening on %s", addr)
	if err := router.Run(addr); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}

func runMigrations(cfg *config.Config) error {
	m, err := migrate.New("file://db/migrations", cfg.MigrateURL())
	if err != nil {
		return err
	}
	defer m.Close()

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return err
	}
	log.Println("migrations applied")
	return nil
}
