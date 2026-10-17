#!/usr/bin/env bash
set +x
set -euo pipefail
cd "$(dirname "$0")"
# Team defaults are backend-only. Preserve local and production overrides.
set -a
if [[ -f config/team.env ]]; then source config/team.env; fi
if [[ -f .env ]]; then source .env; fi
set +a
if [[ ! -x .venv/bin/python ]]; then
  echo '请先在仓库根目录安装后端依赖：python3 -m venv taishan/.venv && taishan/.venv/bin/pip install -r taishan/requirements.lock.txt' >&2
  exit 1
fi
if [[ $# -eq 0 ]]; then set -- --host 127.0.0.1 --port 18605; fi
exec .venv/bin/python -m uvicorn backend.app:app "$@"
