include .env.example
-include .env

.PHONY: up down build logs

# Start full stack (builds image if needed)
up:
	docker compose up --build

# Start in detached mode
up-d:
	docker compose up --build -d

# Stop and remove containers
down:
	docker compose down

# Rebuild image without cache
build:
	docker compose build --no-cache

# Tail logs
logs:
	docker compose logs -f app

# Local dev (backend + postgres only, frontend via vite)
dev-db:
	docker compose up postgres -d

dev-backend:
	cd backend && make dev

dev-frontend:
	cd frontend && npm run dev
