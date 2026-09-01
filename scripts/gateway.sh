#!/usr/bin/env bash
set -euo pipefail

required_variables=(
  GATEWAY_PORT
  INVENTORY_API_URL
  RABBITMQ_HOST
  RABBITMQ_PORT
  RABBITMQ_USER
  RABBITMQ_PASSWORD
  RABBITMQ_QUEUE
)

for variable in "${required_variables[@]}"; do
  if [ -z "${!variable:-}" ]; then
    echo "Missing required environment variable: ${variable}" >&2
    exit 1
  fi
done

install -d -m 0755 /opt/crud-master/srcs/api-gateway
rsync -a --delete --exclude node_modules /vagrant/service/ /opt/crud-master/srcs/api-gateway/

cat > /opt/crud-master/.env <<EOF
GATEWAY_PORT=${GATEWAY_PORT}
INVENTORY_API_URL=${INVENTORY_API_URL}
RABBITMQ_HOST=${RABBITMQ_HOST}
RABBITMQ_PORT=${RABBITMQ_PORT}
RABBITMQ_USER=${RABBITMQ_USER}
RABBITMQ_PASSWORD=${RABBITMQ_PASSWORD}
RABBITMQ_QUEUE=${RABBITMQ_QUEUE}
EOF
chmod 0600 /opt/crud-master/.env

cd /opt/crud-master/srcs/api-gateway
npm ci --omit=dev

pm2 delete api_gateway >/dev/null 2>&1 || true
pm2 start server.js --name api_gateway --time
pm2 save --force

curl --fail --silent --show-error \
  --retry 10 --retry-connrefused --retry-delay 2 \
  "http://127.0.0.1:${GATEWAY_PORT}/api/movies" >/dev/null
