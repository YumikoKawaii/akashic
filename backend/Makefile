include ../.env.example
-include ../.env

DB_URL=postgresql://$(DB_USER):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/$(DB_NAME)?sslmode=disable

.PHONY: dev build migrate-up migrate-down migrate-force tidy

dev:
	air -c .air.toml

build:
	go build -o bin/server ./cmd/server

migrate-up:
	migrate -path db/migrations -database "$(DB_URL)" up

migrate-down:
	migrate -path db/migrations -database "$(DB_URL)" down 1

migrate-force:
	migrate -path db/migrations -database "$(DB_URL)" force $(version)

tidy:
	go mod tidy
