#!/usr/bin/env bash
set -euo pipefail

required_variables=(
  INVENTORY_PORT
  INVENTORY_DB_HOST
  INVENTORY_DB_PORT
  INVENTORY_DB_NAME
  INVENTORY_DB_USER
  INVENTORY_DB_PASSWORD
)

for variable in "${required_variables[@]}"; do
  if [ -z "${!variable:-}" ]; then
    echo "Missing required environment variable: ${variable}" >&2
    exit 1
  fi
done

export DEBIAN_FRONTEND=noninteractive
apt-get install -y postgresql
systemctl enable --now postgresql

if runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${INVENTORY_DB_USER}'" | grep -q 1; then
  runuser -u postgres -- psql -c "ALTER ROLE ${INVENTORY_DB_USER} WITH LOGIN PASSWORD '${INVENTORY_DB_PASSWORD}'"
else
  runuser -u postgres -- psql -c "CREATE ROLE ${INVENTORY_DB_USER} WITH LOGIN PASSWORD '${INVENTORY_DB_PASSWORD}'"
fi

if ! runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_database WHERE datname='${INVENTORY_DB_NAME}'" | grep -q 1; then
  runuser -u postgres -- createdb --owner="${INVENTORY_DB_USER}" "${INVENTORY_DB_NAME}"
fi

install -d -m 0755 /opt/crud-master/srcs/inventory-app
rsync -a --delete --exclude node_modules /vagrant/service/ /opt/crud-master/srcs/inventory-app/

cat > /opt/crud-master/.env <<EOF
INVENTORY_PORT=${INVENTORY_PORT}
INVENTORY_DB_HOST=${INVENTORY_DB_HOST}
INVENTORY_DB_PORT=${INVENTORY_DB_PORT}
INVENTORY_DB_NAME=${INVENTORY_DB_NAME}
INVENTORY_DB_USER=${INVENTORY_DB_USER}
INVENTORY_DB_PASSWORD=${INVENTORY_DB_PASSWORD}
EOF
chmod 0600 /opt/crud-master/.env

cd /opt/crud-master/srcs/inventory-app
npm ci --omit=dev

pm2 delete inventory_app >/dev/null 2>&1 || true
pm2 start server.js --name inventory_app --time
pm2 save --force

curl --fail --silent --show-error \
  --retry 10 --retry-connrefused --retry-delay 2 \
  "http://127.0.0.1:${INVENTORY_PORT}/api/movies" >/dev/null
