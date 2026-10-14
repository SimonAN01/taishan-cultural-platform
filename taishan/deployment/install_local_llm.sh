#!/usr/bin/env bash
set -euo pipefail
cd /opt/taishan
mkdir -p vendor/llama
# Official release archive supplied by the deployer. No arbitrary install script.
tar -xzf /home/ubuntu/llama-b11609-bin-ubuntu-x64.tar.gz -C vendor/llama --strip-components=1
chown -R taishan:taishan vendor models
install -m 644 deployment/taishan-llm.service /etc/systemd/system/taishan-llm.service
systemctl daemon-reload
systemctl enable --now taishan-llm
