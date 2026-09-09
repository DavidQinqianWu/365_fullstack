#!/usr/bin/env bash
# Deploy docs/ as a static site behind Coolify's Traefik. Re-runnable.
set -euo pipefail
cd "$(dirname "$0")"
set -a; source .env; set +a

ssh "$DEPLOY_HOST" mkdir -p "$DEPLOY_PATH/html"
rsync -az --delete --exclude .DS_Store docs/ "$DEPLOY_HOST:$DEPLOY_PATH/html/"
rsync -az deploy/nginx.conf "$DEPLOY_HOST:$DEPLOY_PATH/nginx.conf"

ssh "$DEPLOY_HOST" bash -s "$DEPLOY_PATH" "$SITE_DOMAIN" <<'REMOTE'
set -e
P=$1; D=$2
docker inspect sfs-docs >/dev/null 2>&1 && { echo "container exists, files synced"; exit 0; }
docker run -d --name sfs-docs --restart unless-stopped --network coolify \
  -v "$P/html:/usr/share/nginx/html:ro" \
  -v "$P/nginx.conf:/etc/nginx/conf.d/default.conf:ro" \
  -l traefik.enable=true \
  -l traefik.docker.network=coolify \
  -l "traefik.http.routers.sfs.rule=Host(\`$D\`)" \
  -l traefik.http.routers.sfs.entrypoints=https \
  -l traefik.http.routers.sfs.tls=true \
  -l traefik.http.routers.sfs.tls.certresolver=letsencrypt \
  -l "traefik.http.routers.sfs-http.rule=Host(\`$D\`)" \
  -l traefik.http.routers.sfs-http.entrypoints=http \
  -l traefik.http.routers.sfs-http.middlewares=sfs-redirect \
  -l traefik.http.middlewares.sfs-redirect.redirectscheme.scheme=https \
  -l traefik.http.services.sfs.loadbalancer.server.port=80 \
  nginx:alpine
echo "container created"
REMOTE
echo "done: https://$SITE_DOMAIN"
