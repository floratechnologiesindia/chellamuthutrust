#!/usr/bin/env bash
set -euo pipefail

REMOTE_USER="${DEPLOY_USER:-proofit}"
REMOTE_HOST="${DEPLOY_HOST:-68.178.174.45}"
REMOTE_DIR="${DEPLOY_DIR:-~/msctrustcrm}"
LOCAL_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "→ Syncing project to ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}"
rsync -az --delete \
  --exclude node_modules \
  --exclude server/node_modules \
  --exclude .git \
  --exclude dist \
  --exclude server/dist \
  --exclude uploads \
  --exclude .env \
  --exclude '*.log' \
  "${LOCAL_DIR}/" "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/"

echo "→ Building and starting containers on server"
ssh "${REMOTE_USER}@${REMOTE_HOST}" bash -s <<'REMOTE'
set -euo pipefail
cd ~/msctrustcrm

if [[ ! -f .env ]]; then
  echo "ERROR: ~/msctrustcrm/.env not found. Copy deploy/.env.prod.example to .env and set secrets first."
  exit 1
fi

docker compose -f docker-compose.prod.yml up -d --build

echo "→ Waiting for API health..."
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:3001/api/health >/dev/null 2>&1 || curl -sf http://127.0.0.1:3001/health >/dev/null 2>&1; then
    echo "API is up"
    break
  fi
  sleep 3
  if [[ "$i" -eq 30 ]]; then
    echo "WARN: API health check timed out — check docker logs msctrustcrm-app"
  fi
done

if ! sudo test -f /etc/nginx/sites-enabled/msctrustcrm; then
  echo "→ Installing nginx site config"
  sudo cp deploy/nginx-msctrustcrm.conf /etc/nginx/sites-available/msctrustcrm
  sudo ln -sf /etc/nginx/sites-available/msctrustcrm /etc/nginx/sites-enabled/msctrustcrm
  sudo nginx -t
  sudo systemctl reload nginx
fi

if ! sudo test -d /etc/letsencrypt/live/api.msctrustcrm.com; then
  echo "→ Requesting TLS certificates (certbot)"
  sudo certbot --nginx \
    -d api.msctrustcrm.com \
    -d app.msctrustcrm.com \
    -d donor.msctrustcrm.com \
    --non-interactive --agree-tos -m admin@msctrust.org || true
  sudo nginx -t && sudo systemctl reload nginx
fi

echo "→ Deployment complete"
docker compose -f docker-compose.prod.yml ps
REMOTE

echo "Done. Portals:"
echo "  https://api.msctrustcrm.com"
echo "  https://app.msctrustcrm.com"
echo "  https://donor.msctrustcrm.com"
