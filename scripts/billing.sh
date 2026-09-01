#!/usr/bin/env bash
set -euo pipefail

required_variables=(
  BILLING_DB_HOST
  BILLING_DB_PORT
  BILLING_DB_NAME
  BILLING_DB_USER
  BILLING_DB_PASSWORD
  RABBITMQ_HOST
  RABBITMQ_PORT
  RABBITMQ_MANAGEMENT_PORT
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
apt-get install -y postgresql rabbitmq-server
systemctl enable --now postgresql rabbitmq-server

if runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${BILLING_DB_USER}'" | grep -q 1; then
  runuser -u postgres -- psql -c "ALTER ROLE ${BILLING_DB_USER} WITH LOGIN PASSWORD '${BILLING_DB_PASSWORD}'"
else
  runuser -u postgres -- psql -c "CREATE ROLE ${BILLING_DB_USER} WITH LOGIN PASSWORD '${BILLING_DB_PASSWORD}'"
fi

if ! runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_database WHERE datname='${BILLING_DB_NAME}'" | grep -q 1; then
  runuser -u postgres -- createdb --owner="${BILLING_DB_USER}" "${BILLING_DB_NAME}"
fi

if rabbitmqctl list_users --silent | awk '{print $1}' | grep -Fxq "${RABBITMQ_USER}"; then
  rabbitmqctl change_password "${RABBITMQ_USER}" "${RABBITMQ_PASSWORD}"
else
  rabbitmqctl add_user "${RABBITMQ_USER}" "${RABBITMQ_PASSWORD}"
fi
rabbitmqctl set_permissions -p / "${RABBITMQ_USER}" '.*' '.*' '.*'
rabbitmqctl set_user_tags "${RABBITMQ_USER}" management
rabbitmq-plugins enable rabbitmq_management

install -d -m 0755 /opt/crud-master/srcs/billing-app
rsync -a --delete --exclude node_modules /vagrant/service/ /opt/crud-master/srcs/billing-app/

cat > /opt/crud-master/.env <<EOF
BILLING_DB_HOST=${BILLING_DB_HOST}
BILLING_DB_PORT=${BILLING_DB_PORT}
BILLING_DB_NAME=${BILLING_DB_NAME}
BILLING_DB_USER=${BILLING_DB_USER}
BILLING_DB_PASSWORD=${BILLING_DB_PASSWORD}
RABBITMQ_HOST=${RABBITMQ_HOST}
RABBITMQ_PORT=${RABBITMQ_PORT}
RABBITMQ_USER=${RABBITMQ_USER}
RABBITMQ_PASSWORD=${RABBITMQ_PASSWORD}
RABBITMQ_QUEUE=${RABBITMQ_QUEUE}
EOF
chmod 0600 /opt/crud-master/.env

cd /opt/crud-master/srcs/billing-app
npm ci --omit=dev

pm2 delete billing_app >/dev/null 2>&1 || true
pm2 start server.js --name billing_app --time
pm2 save --force

sleep 2
if [ "$(pm2 pid billing_app)" = '0' ]; then
  pm2 logs billing_app --lines 50 --nostream
  exit 1
fi
