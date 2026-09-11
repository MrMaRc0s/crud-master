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

export DEBIAN_FRONTEND=noninteractive
apt-get install -y python3 python3-venv

install -d -m 0755 /opt/crud-master/srcs/api-gateway-app
rsync -a --delete \
  --exclude node_modules \
  --exclude .venv \
  /vagrant/service/ \
  /opt/crud-master/srcs/api-gateway-app/

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

cd /opt/crud-master/srcs/api-gateway-app
python3 -m venv .venv
./.venv/bin/python -m pip install \
  --disable-pip-version-check \
  --requirement requirements.txt

pm2 delete api_gateway >/dev/null 2>&1 || true
pm2 start server.py \
  --name api_gateway \
  --interpreter /opt/crud-master/srcs/api-gateway-app/.venv/bin/python \
  --time
pm2 save --force

curl --fail --silent --show-error \
  --retry 10 --retry-connrefused --retry-delay 2 \
  "http://127.0.0.1:${GATEWAY_PORT}/api/movies" >/dev/null
