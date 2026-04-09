#!/bin/bash
set -e

ENV_FILE="$HOME/.env.akashic"
CONTAINER="akashic"
PORT=$(grep -E '^SERVER_PORT=' "$ENV_FILE" | cut -d= -f2)
PORT="${PORT:-8080}"

# ── Load image ────────────────────────────────────────────────
echo "Loading image from /tmp/akashic.tar..."
IMAGE=$(docker load -i /tmp/akashic.tar | grep "Loaded image:" | awk '{print $3}')
rm -f /tmp/akashic.tar
echo "Loaded: $IMAGE"

# ── Replace container ─────────────────────────────────────────
echo "Stopping existing container..."
docker stop "$CONTAINER" 2>/dev/null || true
docker rm   "$CONTAINER" 2>/dev/null || true
sleep 2

echo "Starting $IMAGE..."
docker run -d \
  --name "$CONTAINER" \
  --restart unless-stopped \
  -p "$PORT:$PORT" \
  --env-file "$ENV_FILE" \
  "$IMAGE"

# ── Cleanup old images ────────────────────────────────────────
echo "Pruning dangling images..."
docker image prune -f

echo "Done. Container status:"
docker ps --filter "name=$CONTAINER" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
