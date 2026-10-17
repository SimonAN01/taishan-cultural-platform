#!/usr/bin/env bash
set -euo pipefail
cd /opt/taishan
if ! id taishan >/dev/null 2>&1; then useradd --system --home-dir /opt/taishan --shell /usr/sbin/nologin taishan; fi
python3 -m venv .venv
.venv/bin/pip install -r requirements.lock.txt
mkdir -p runtime
chown -R taishan:taishan /opt/taishan
chmod 750 runtime
if [ -f .env ]; then chmod 600 .env; fi
if [ -f config/team.env ]; then chmod 600 config/team.env; fi
install -m 644 deployment/taishan.service /etc/systemd/system/taishan.service
install -m 644 deployment/nginx.conf /etc/nginx/conf.d/taishan.conf
nginx -t
systemctl daemon-reload
systemctl enable --now taishan
systemctl reload nginx
ufw allow 80/tcp comment 'Taishan cultural experience'

ufw allow 8037/tcp comment 'Taishan cultural experience dedicated port'
