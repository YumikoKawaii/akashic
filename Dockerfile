# ── Stage 1: Build frontend ───────────────────────────────────
FROM node:20-alpine AS frontend
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci --silent
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Build backend ────────────────────────────────────
FROM golang:1.23-alpine AS backend
WORKDIR /app
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
RUN go build -o server ./cmd/server

# ── Stage 3: Final image ──────────────────────────────────────
FROM alpine:3.19
RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

COPY --from=backend /app/server       ./server
COPY --from=backend /app/db           ./db
COPY --from=frontend /frontend/dist   ./static

EXPOSE 8080

CMD ["./server"]
