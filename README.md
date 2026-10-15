# 一山千年 · 泰山文化交互体验

本分支融合原仓库的沉浸式画卷前端与已上线验证的泰山文化导览后端。原仓库素材、模型与历史保留；当前后端版本为 1.6.0，早期融合与发布记录保留为历史。

- `/`：完整导览，包含地图、19处景点、实景照片、历史、诗词、文博、五章游历、收藏与足迹、文化问答和云端识景。
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

2026-10-14已将提交 `6e4a8fa` 发布到服务器，主站与 `/experience/` 均可通过8037端口访问。详见 [服务器发布记录](docs/integration/服务器融合发布记录.md)。后续重新发布时，先在本机 `npm ci && npm run build`，将 `dist/` 上传到 `/opt/taishan/immersive/`，将本分支 `taishan/` 中的代码上传到原应用目录，保留服务器的 `.env`、`runtime/`、`models/`、`.venv/`。在服务器 `.env` 添加：

```sh
IMMERSIVE_FRONTEND_DIR=/opt/taishan/immersive
```

重启现有应用服务后，原 IP 和端口即可访问两个入口。发布前备份代码和 SQLite，检查健康接口与原有应用；不另建数据库，不改变其他网站端口。`dist/` 与 `node_modules/` 不跟踪，避免重复提交，构建产物由源文件生成。

## 图片资产

用户提供的57张画境已用于分层地图、景点近景与“画”入口的完整图集。接入记录见 [图片资产接入记录](docs/integration/图片资产接入记录.md)，每张原文件的校验和及网页用途见 `src/image-assets.json`。原图保留，网页使用保留透明通道的WebP，不把插画当作真实景点照片或训练数据。

### 前端方案 V1.0（2026-10-15）

`/experience/` 已统一接入景点详情、四线比较、历史长卷、诗词朗诵、真实照片识景和问山会话。可直接访问 `#routes`、`#history`、`#poetry`、`#vision`、`#spot?id=nantian`。地图支持缩放与搜索，内容页返回保留地图状态。完整说明与验收证据见 [前端方案实施记录](docs/integration/前端方案实施记录.md)。

### Coze 语音数字人（1.4.0）

推荐入口：<https://118.89.176.236/experience/#agent>。点击“语音提问”授权麦克风；浏览器转写后提交 Coze，回答自动合成晓晓语音并驱动3D口型。可关闭自动朗读、暂停/重播或使用文字提问。识别支持情况取决于浏览器和网络，首次麦克风使用需在真实设备验证。详情见 [Coze语音接入记录](docs/integration/Coze语音数字人接入记录.md)。


### 功能与素材复审（2026-10-15）

已修复路线/朝代/景点阅读状态恢复、问山回退和景点上下文、照片放大与上传恢复、朗读取消边界。57 张用户画境均已接入，19 张主要通过图集使用；完整资料与待完善项见 [功能与素材复审](docs/integration/功能与素材复审-20261015.md) 和 [当前验收清单](taishan/docs/完整开发验收清单.md)。当前语音、可编辑数字人绑定和口型以 1.5.1 系列记录为准，早期文档保留为历史。

### 三卷山境（1.6.0）

岱庙、彩石溪、后石坞已成为独立文化场景，共九个有出处的阅读点。进入 [三卷山境](https://118.89.176.236/experience/#scenes)，可点击热点、放大画境、朗读、保存已读/收藏、追问仙子并返回原阅读点。素材使用、文化来源、测试及备份见 [实施与发布记录](docs/integration/三卷山境实施与发布记录.md)。当前 57 张图中 43 张参与直接交互，14 张仍以图集为主；此数量更新早期复审记录。
