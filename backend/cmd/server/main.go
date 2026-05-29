package main

import (
	"context"
	"fmt"
	"log"
	"net/http"

	"connectrpc.com/connect"
	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "github.com/lib/pq"
	"github.com/redis/go-redis/v9"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/yumikokawaii/akashic/gen/akashic/v1/akashicv1connect"
	"github.com/yumikokawaii/akashic/internal/config"
	"github.com/yumikokawaii/akashic/internal/membership"
	"github.com/yumikokawaii/akashic/internal/repository"
	"github.com/yumikokawaii/akashic/internal/rpchandler"
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

	cacheCfg := service.GenerateConfig{UserCooldownAttempts: 3}
	var generateCache service.GenerateCache
	var roleCache membership.RoleCache
	if err := rdb.Ping(context.Background()).Err(); err != nil {
		log.Printf("redis unavailable (%v) — using in-memory caches", err)
		generateCache = service.NewMemCache(cacheCfg)
		roleCache = membership.NewMemRoleCache()
	} else {
		generateCache = service.NewRedisCache(rdb, cacheCfg)
		roleCache = membership.NewRedisRoleCache(rdb)
	}

	warmupMembershipCache(memberRepo, roleCache)

	authSvc          := service.NewAuthService(userRepo, cfg.GoogleClientID, cfg.GoogleClientSecret, cfg.GoogleCallbackURL, cfg.JWTSecret)
	bankSvc          := service.NewBankService(bankRepo, memberRepo, userRepo, roleCache)
	categorySvc      := service.NewCategoryService(categoryRepo, bankRepo)
	passageSvc       := service.NewPassageService(passageRepo, bankRepo, categoryRepo)
	questionGroupSvc := service.NewQuestionGroupService(unitOfWork, questionGroupRepo, bankRepo, categoryRepo)
	questionSvc      := service.NewQuestionService(unitOfWork, questionRepo, bankRepo, categoryRepo, generateCache)
	testSvc          := service.NewTestService(unitOfWork, testRepo, questionRepo, questionGroupRepo, bankRepo, generateCache)
	attemptSvc       := service.NewAttemptService(attemptRepo, testRepo)
	ingestSvc        := service.NewIngestService(unitOfWork, bankRepo, categoryRepo, questionRepo)

	warmupPoolCache(bankRepo, questionRepo, generateCache)

	// ── Connect interceptors ───────────────────────────────────────────────────
	// Authentication runs first (populates claims); authorization runs next and
	// enforces bank-role requirements using the membership cache.
	authn := rpchandler.NewAuthenticator(authSvc)
	authz := rpchandler.NewMembershipAuthorizer(roleCache, memberRepo)
	interceptor := connect.WithInterceptors(
		authn.AuthnInterceptor(),
		authz.PermissionInterceptor(),
	)

	// ── Connect service handlers ───────────────────────────────────────────────
	mux := http.NewServeMux()

	mux.Handle(akashicv1connect.NewAuthServiceHandler(
		rpchandler.NewAuthServiceHandler(authSvc), interceptor))
	mux.Handle(akashicv1connect.NewBankServiceHandler(
		rpchandler.NewBankServiceHandler(bankSvc), interceptor))
	mux.Handle(akashicv1connect.NewCategoryServiceHandler(
		rpchandler.NewCategoryServiceHandler(categorySvc), interceptor))
	mux.Handle(akashicv1connect.NewPassageServiceHandler(
		rpchandler.NewPassageServiceHandler(passageSvc), interceptor))
	mux.Handle(akashicv1connect.NewQuestionGroupServiceHandler(
		rpchandler.NewQuestionGroupServiceHandler(questionGroupSvc), interceptor))
	mux.Handle(akashicv1connect.NewQuestionServiceHandler(
		rpchandler.NewQuestionServiceHandler(questionSvc, ingestSvc), interceptor))
	mux.Handle(akashicv1connect.NewTestServiceHandler(
		rpchandler.NewTestServiceHandler(testSvc), interceptor))
	mux.Handle(akashicv1connect.NewAttemptServiceHandler(
		rpchandler.NewAttemptServiceHandler(attemptSvc), interceptor))

	// ── Static frontend ────────────────────────────────────────────────────────
	if cfg.StaticDir != "" {
		mux.Handle("/assets/", http.StripPrefix("/assets/", http.FileServer(http.Dir(cfg.StaticDir+"/assets"))))
		mux.Handle("/favicon/", http.StripPrefix("/favicon/", http.FileServer(http.Dir(cfg.StaticDir+"/favicon"))))
		mux.HandleFunc("/favicon.ico", func(w http.ResponseWriter, r *http.Request) {
			http.ServeFile(w, r, cfg.StaticDir+"/favicon/favicon.ico")
		})
		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			http.ServeFile(w, r, cfg.StaticDir+"/index.html")
		})
	}

	addr := fmt.Sprintf(":%s", cfg.ServerPort)
	log.Printf("server listening on %s", addr)
	if err := http.ListenAndServe(addr, h2c.NewHandler(mux, &http2.Server{})); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}

func warmupMembershipCache(memberRepo repository.MemberRepository, cache membership.RoleCache) {
	members, err := memberRepo.FindAll()
	if err != nil {
		log.Printf("membership warmup: failed to load members: %v", err)
		return
	}
	cache.Warm(members)
	log.Printf("membership warmup: loaded %d memberships", len(members))
}

func warmupPoolCache(bankRepo repository.BankRepository, questionRepo repository.QuestionRepository, cache service.GenerateCache) {
	bankIDs, err := bankRepo.FindAllIDs()
	if err != nil {
		log.Printf("pool warmup: failed to list banks: %v", err)
		return
	}
	for _, bankID := range bankIDs {
		metas, err := questionRepo.FindAllMeta(bankID)
		if err != nil {
			log.Printf("pool warmup: bank %d: %v", bankID, err)
			continue
		}
		pool := make([]service.CachedQuestion, 0, len(metas))
		for _, m := range metas {
			if m.GroupID != nil {
				continue
			}
			pool = append(pool, service.CachedQuestion{
				ID:         m.ID,
				Difficulty: m.Difficulty,
				CategoryID: m.CategoryID,
				Type:       m.Type,
				Tags:       []string(m.Tags),
			})
		}
		cache.WarmupPool(bankID, pool)
	}
	log.Printf("pool warmup: loaded %d banks", len(bankIDs))
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
