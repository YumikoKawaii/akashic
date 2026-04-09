#!/bin/bash
set -e

ENV_FILE="$HOME/.env.akashic"
CONTAINER="akashic"
IMAGE="yumikokawaii/akashic"

if [ -z "$1" ]; then
  echo "Usage: ./deploy.sh <tag>"
  echo "  e.g. ./deploy.sh v1.0.0"
  exit 1
fi

TAG="$1"
PORT=$(grep -E '^SERVER_PORT=' "$ENV_FILE" | cut -d= -f2)
PORT="${PORT:-8080}"

# ── Load image ────────────────────────────────────────────────
echo "Loading image from /tmp/akashic.tar..."
docker load -i /tmp/akashic.tar
rm -f /tmp/akashic.tar

# ── Replace container ─────────────────────────────────────────
echo "Stopping existing container..."
docker stop "$CONTAINER" 2>/dev/null || true
docker rm   "$CONTAINER" 2>/dev/null || true
sleep 2

echo "Starting $IMAGE:$TAG..."
docker run -d \
  --name "$CONTAINER" \
  --restart unless-stopped \
  -p "$PORT:$PORT" \
  --env-file "$ENV_FILE" \
  "$IMAGE:$TAG"

# ── Cleanup old images ────────────────────────────────────────
echo "Pruning dangling images..."
docker image prune -f

echo "Done. Container status:"
docker ps --filter "name=$CONTAINER" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
