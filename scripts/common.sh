#!/usr/bin/env bash
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y ca-certificates curl rsync

if ! node --version 2>/dev/null | grep -q '^v24\.'; then
  curl -fsSL https://deb.nodesource.com/setup_24.x -o /tmp/nodesource_setup.sh
  bash /tmp/nodesource_setup.sh
  apt-get install -y nodejs
fi

if ! command -v pm2 >/dev/null || [ "$(pm2 --version)" != '6.0.14' ]; then
  npm install --global pm2@6.0.14
fi

pm2 startup systemd -u root --hp /root >/dev/null
