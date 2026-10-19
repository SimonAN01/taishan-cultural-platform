#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1 || ! node -e 'process.exit(+process.versions.node.split(".")[0] >= 22 ? 0 : 1)'; then
  echo '请先安装 Node.js 22+ 和 Python 3.12；或使用 Docker Compose 启动。' >&2
  exit 1
fi
if ! node -e 'const fs=require("fs"),crypto=require("crypto"); const hash=crypto.createHash("sha256").update(fs.readFileSync("package-lock.json")).digest("hex"); process.exit(fs.existsSync("node_modules/.taishan-node-lock")&&fs.readFileSync("node_modules/.taishan-node-lock","utf8").trim().toLowerCase()===hash?0:1)'; then
  npm ci
  node -e 'const fs=require("fs"),crypto=require("crypto");fs.writeFileSync("node_modules/.taishan-node-lock",crypto.createHash("sha256").update(fs.readFileSync("package-lock.json")).digest("hex"))'
fi
exec npm start -- --open
