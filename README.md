# 一山千年 · 泰山文化交互体验

本分支融合原仓库的沉浸式画卷前端与已上线验证的泰山文化导览后端。原仓库素材、模型与历史保留；默认主站沿用我们已验证的 1.2.0 版本，融合版本编号为 1.2.1。

- `/`：完整导览，包含地图、16处景点、实景照片、历史、诗词、文博、五章游历、收藏与足迹、文化问答和云端识景。
- `/experience/`：原仓库的分层画卷、景点近景、数字人六个动画及索道三维演绎；问答、资料来源和已收录景点的足迹接入同一后端。两种界面共享同源匿名会话。

复用范围、修复内容和限制见 [融合审查与验收](docs/integration/融合审查与验收.md)。使用和部署文档见 [原导览说明](taishan/README.md)。素材与代码未获得统一开源许可，保持团队私有仓库协作，保留各文件来源；实景照片按各自许可署名。

## 本地运行

需要 Node.js 22+、Python 3.12+。不需要本机训练模型或 GPU。

```sh
npm ci
npm run build
python3 -m venv taishan/.venv
taishan/.venv/bin/pip install -r taishan/requirements.lock.txt
cp taishan/.env.example taishan/.env
```

将实际服务密钥填入 `taishan/.env`，不要提交。启动时加载该文件（它采用 shell 环境变量格式）：

```sh
cd taishan
set -a
source .env
set +a
.venv/bin/uvicorn backend.app:app --host 127.0.0.1 --port 18605
```

访问 `http://127.0.0.1:18605/` 或 `http://127.0.0.1:18605/experience/`。没有模型密钥时问答会明确采用资料检索，云端识景不可用；不会伪装已调用模型。BGE 权重为可选下载，缺少时自动采用文本检索。未提交本机运行数据库或模型缓存。

前端开发可在仓库根目录运行 `npm run dev`，Vite 的 `/api` 代理指向 `127.0.0.1:18605`；联动完整主站请使用上述后端地址。

## 检查

```sh
npm test
npm run build
cd taishan
.venv/bin/python -m unittest discover -s tests -v
```

## 服务器融合部署

现有服务器仍运行 1.2.0，本分支尚未替换公网部署。需要发布时，先在本机 `npm ci && npm run build`，将 `dist/` 上传到 `/opt/taishan/immersive/`，将本分支 `taishan/` 中的代码上传到原应用目录，保留服务器的 `.env`、`runtime/`、`models/`、`.venv/`。在服务器 `.env` 添加：

```sh
IMMERSIVE_FRONTEND_DIR=/opt/taishan/immersive
```

重启现有应用服务后，原 IP 和端口即可访问两个入口。发布前备份代码和 SQLite，检查健康接口与原有应用；不另建数据库，不改变其他网站端口。`dist/` 与 `node_modules/` 不跟踪，避免重复提交，构建产物由源文件生成。

## 图片资产

用户提供的57张画境已用于分层地图、景点近景与“画”入口的完整图集。接入记录见 [图片资产接入记录](docs/integration/图片资产接入记录.md)，每张原文件的校验和及网页用途见 `src/image-assets.json`。原图保留，网页使用保留透明通道的WebP，不把插画当作真实景点照片或训练数据。
