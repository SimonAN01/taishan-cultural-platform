# 一山千年 · 泰山文化交互体验

本分支融合原仓库的沉浸式画卷前端与已上线验证的泰山文化导览后端。原仓库素材、模型与历史保留；当前后端版本为 1.7.1，早期融合与发布记录保留为历史。

- `/`：完整导览，包含地图、19处景点、实景照片、历史、诗词、文博、五章游历、收藏与足迹、文化问答和云端识景。
- `/experience/`：原仓库的分层画卷、景点近景、数字人六个动画及索道三维演绎；问答、资料来源和已收录景点的足迹接入同一后端。两种界面共享同源匿名会话。

复用范围、修复内容和限制见 [融合审查与验收](docs/integration/融合审查与验收.md)。使用和部署文档见 [原导览说明](taishan/README.md)。素材与代码未获得统一开源许可，保持团队私有仓库协作，保留各文件来源；实景照片按各自许可署名。

## 当前系统交付入口

本分支 `codex/taishan-integration` 包含当前 1.7.1 系统的源码与必要运行素材。克隆本分支后按下文安装依赖并构建；`dist/` 可重新生成，无需另行下载网页素材。

| 内容 | 仓库位置 |
| --- | --- |
| 沉浸式前端、地图、文化页面与交互 | `src/`、`public/` |
| API、智能体适配、云端识图与语音 | `taishan/backend/` |
| 景点、历史、诗词、文化场景与来源 | `taishan/data/` |
| 完整导览界面及实景照片 | `taishan/frontend/` |
| 数字人 Blender 源文件与生成脚本 | `character/` |
| 数字人及索道网页模型 | `public/models/` |
| 依赖锁定、环境变量示例与部署配置 | `package-lock.json`、`taishan/requirements.lock.txt`、`taishan/.env.example`、`taishan/deployment/` |
| 测试及发布验证记录 | `tests/`、`taishan/tests/`、`docs/integration/` |

可直接发给建模团队：[建模手交付清单](docs/modeling/建模手交付清单.md)。技术约定见 [场景建模交付规范](docs/modeling/场景建模交付规范.md)，文字接入见 [文字与模型协作说明](docs/content/文字与模型协作说明.md)。

岱庙、彩石溪、后石坞的精细场景 GLB 尚待建模团队交付，当前使用分层空间画境。真实 API 密钥、会话数据库、模型缓存与服务器证书保留在运行环境中，仓库提供不含密钥的配置示例。

配置重点见下文“智能体、AI 识图与语音配置”：Coze 与识图需要分别填写凭证，并通过实际请求确认成功。

## 本地运行

需要 Node.js 22+、Python 3.12+。不需要本机训练模型或 GPU。

```sh
npm ci
npm run build
python3 -m venv taishan/.venv
taishan/.venv/bin/pip install -r taishan/requirements.lock.txt
test -f taishan/.env || cp taishan/.env.example taishan/.env
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

## 智能体、AI 识图与语音配置

以下说明对照本分支的实际代码编写，更新日期为 2026-10-17。**克隆仓库可以得到接入代码、提示词、文化资料和空密钥配置模板，但不会得到真实 API 凭证或 Coze 平台账号内的工作流。**

### 1. 哪些配置已经在 GitHub

| 内容 | 位置／说明 |
| --- | --- |
| 环境变量模板 | [`taishan/.env.example`](taishan/.env.example)；包括服务地址、模型名、空 Token／Key、运行目录说明 |
| Coze 请求体、鉴权及 SSE 解析 | [`taishan/backend/coze_agent.py`](taishan/backend/coze_agent.py) |
| 导游角色提示词、资料检索、引用校验、会话与接口 | [`taishan/backend/app.py`](taishan/backend/app.py)、[`agent_tools.py`](taishan/backend/agent_tools.py)、[`retrieval.py`](taishan/backend/retrieval.py) |
| 本系统的文化资料库 | [`catalog.json`](taishan/data/catalog.json)、[`scenes.json`](taishan/data/scenes.json)，包括景点、诗词、注释、历史、场景讲解与来源 |
| 云端图像请求及候选过滤 | [`taishan/backend/cloud_vision.py`](taishan/backend/cloud_vision.py) |
| 语音与数字人联动 | [`speech.py`](taishan/backend/speech.py)、[`src/voice-pipeline.js`](src/voice-pipeline.js)、[`src/digital-human.js`](src/digital-human.js) |
| 生产进程与 HTTPS 配置样例 | [`taishan/deployment/`](taishan/deployment/)、[`taishan/deploy/https/`](taishan/deploy/https/) |

真实 `taishan/.env`、服务器 `/opt/taishan/.env`、数据库、缓存及证书私钥不进入 Git。不能直接拿示例文件覆盖已有生产 `.env`。

**Coze 平台本身的机器人／项目定义、系统提示词、插件、工作流和平台知识库未包含在此仓库。** 如果继续使用现有部署，只需拥有该部署可用的 Token；如果要在自己的 Coze 账号重新创建相同智能体，需要原创建者提供相应导出或配置说明。当前后端可带入本系统资料调用兼容端点，但不能凭调用地址还原平台上的全部配置。也可按第 4 节切换为直连模型，继续使用仓库内的文化资料。

### 2. 推荐配置：Coze 对话＋云端识图

请求链路：

```text
文字／浏览器语音转写 → 本站 /api/agent/chat → Coze 部署 → 回答与引用
照片 → 本站 /api/vision/recognize → LLM_BASE_URL 指定的图像模型 → 候选与判断依据
回答文本 → 本站 /api/speech/tts → Edge TTS → 浏览器播放 → 数字人口型
```

**Coze Token 和图像模型 Key 是两组独立凭证。** 只填 Coze 配置时，问山可以工作，云端识图仍未配置。`AGENT_PROVIDER` 决定文本生成走哪条链路；`VISION_BACKEND=cloud` 决定识图走云端，图像模型始终读取 `LLM_*`。

在**仓库根目录**首次执行以下命令；若 `taishan/.env` 已存在，保留原文件并直接编辑：

```sh
# 仅在不存在时复制，避免覆盖已有密钥。
test -f taishan/.env || cp taishan/.env.example taishan/.env
chmod 600 taishan/.env
```

使用本地编辑器填写 `taishan/.env`。下面两个凭证占位符必须换成真实值，不能原样使用；地址和模型名是本项目现有接入值，能否继续调用取决于服务权限、余额与部署状态。

```dotenv
AGENT_PROVIDER=coze
COZE_API_URL=https://7szbsmhhq8.coze.site/stream_run
COZE_API_TOKEN='替换为该部署可用的真实 Token'
COZE_PROJECT_ID=

LLM_BASE_URL=https://opencode.ai/zen/go/v1
LLM_MODEL=deepseek-v4.1-flash
LLM_API_KEY='替换为图像模型服务的真实 Key'
VISION_BACKEND=cloud
```

| 变量 | 用途与填写要求 |
| --- | --- |
| `AGENT_PROVIDER` | 仅支持 `coze` 或 `llm`。推荐显式填写，避免旧环境残留影响选择。代码在未指定时，只有 Coze 地址与 Token 均非空才自动选择 `coze`，否则选择 `llm`。 |
| `COZE_API_URL` | 完整的 HTTPS 对话端点，现有部署为 `/stream_run`。不是 `/task/{task_id}` 状态查询地址，也不是 Coze 管理后台页面。 |
| `COZE_API_TOKEN` | 仅填 Token 本体，不加 `Bearer ` 前缀；后端自动添加鉴权头。 |
| `COZE_PROJECT_ID` | 仅在部署要求时填写数字项目 ID；当前适配会转换为整数。现有部署已验证可留空，留空就不发送该字段。 |
| `LLM_BASE_URL` | OpenAI 兼容接口的基地址，不带 `/chat/completions`；后端会追加该路径。不要填成 Coze 地址。 |
| `LLM_MODEL` | 服务提供方接受的精确模型 ID。识图要求模型及网关确实接受 `image_url` 图片输入；仅有文本能力不够。 |
| `LLM_API_KEY` | 图像服务 Key，不加 `Bearer ` 前缀。直连模型文本问答也读取此 Key。 |
| `VISION_BACKEND` | 推荐 `cloud`。`local` 仅用于已另行准备兼容 CLIP ONNX 文件的情况；轻量服务器无需下载这些权重。 |
| `IMMERSIVE_FRONTEND_DIR` | 本地默认是仓库根目录 `dist/`。现有服务器设置为 `/opt/taishan/immersive`。 |
| `DATA_DIR` | 本地默认 `taishan/runtime/`；保存 SQLite 与诗词音频缓存。生产使用 `/opt/taishan/runtime`。 |
| `EMBEDDING_MODEL_DIR` | 可选 BGE 模型目录；缺少权重时使用关键词检索。不是开启 Coze 的必要条件。 |
| `CLIP_MODEL_DIR` | 仅本地 CLIP 识景需要；云端识图不需要。 |

这些变量由后端启动时读取。**本项目没有自动读取 `.env` 的逻辑；修改文件后必须重新加载环境并重启进程。** 不要把密钥写到 `src/`、`public/`、`VITE_*` 或前端请求里。

### 3. 本地启动

先完成上文“本地运行”的依赖安装和 `npm run build`。然后从仓库根目录进入后端目录启动：

```sh
cd taishan
set -a
source .env
set +a
.venv/bin/uvicorn backend.app:app --host 127.0.0.1 --port 18605
```

`.env` 使用 shell 兼容的 `KEY=value` 格式，不在等号两边添加空格；值含空格或特殊字符时加引号。示例中的 `COZE_PROJECT_ID=` 表示空值。若从上一套配置切换，请先停止旧进程，再在干净终端中加载完整配置。

- 问山：`http://127.0.0.1:18605/experience/#agent`
- 识图：`http://127.0.0.1:18605/experience/#vision`
- 健康状态：`http://127.0.0.1:18605/api/health`

需要同时启动后端；单独运行 Vite 只提供前端开发页面，默认通过代理访问 `127.0.0.1:18605`。

### 4. 不使用 Coze 的配置方式

**直连模型文本问答＋云端识图**：把 `AGENT_PROVIDER` 改为 `llm`，保留 `VISION_BACKEND=cloud` 和有效 `LLM_*`。此时文本与图片调用同一个模型配置，模型需兼容代码使用的请求体、图片输入及 JSON 输出。Coze 变量可留空。无需改前端，也无需迁移文化资料。

**只运行资料阅读与检索问答**：设置 `AGENT_PROVIDER=llm`、`LLM_API_KEY=`，并使用非本机地址的 `LLM_BASE_URL`，例如保留模板地址。问山返回有出处的资料摘录，标识为 `local_knowledge`；云端识图返回未配置提示。TTS 仍是独立的联网服务。此模式不代表大模型已接入。

显式配置 `AGENT_PROVIDER=coze` 但只填写 `LLM_API_KEY`，不会自动转用直连模型。Coze 请求失败时，当前逻辑降级为本地资料摘录，**不会自动再调用另一个文本模型**。

### 5. 当前 Coze 适配契约

这是本项目现有部署的调用协议，不保证任意 Coze 产品或其他部署拥有相同协议。对外仍由前端调用本站 `/api/agent/chat`，浏览器不直接请求 Coze。

后端发送 `POST COZE_API_URL`，使用：

```http
Authorization: Bearer <COZE_API_TOKEN>
Accept: text/event-stream
Content-Type: application/json
```

请求体由 [`request_body()`](taishan/backend/coze_agent.py) 生成：

```json
{
  "type": "query",
  "session_id": "taishan-后端生成的会话散列",
  "content": {
    "query": {
      "prompt": [
        {
          "type": "text",
          "content": {
            "text": "导游角色约束、当前景点／诗词／路线背景、本轮文化资料与游客问题"
          }
        }
      ]
    }
  }
}
```

如果 `COZE_PROJECT_ID` 非空，会额外添加整数 `project_id`。无需手动填写 `session_id` 或先查询 `task_id`；系统按浏览器匿名会话及清空版本生成上游会话 ID。

响应必须是 `text/event-stream`。当前解析器读取 `type=answer` 的 `content.answer` 文本片段，并要求成功的 `type=message_end`、`content.message_end.code=0`；错误、中断或没有结束标记都会判为调用失败。若新部署改成普通 JSON、不同字段或异步任务协议，需要修改适配器，不能只换一个 URL 就假定兼容。

本地角色约束要求自然中文、有资料引用、区分历史与传说，不编造实时信息。后端会把资料按 `[1]`、`[2]` 等编号送入 Coze，并核验返回引用；平台侧提示词应允许引用本轮资料，不强制删除引用或只返回固定欢迎语。平台自己的知识库并不是本系统文化资料的唯一来源。

### 6. 配置后逐项自检

以下命令通过**本站后端**验证，不包含上游密钥。命令在仓库根目录执行；如果后端在服务器上，将 `BASE` 换成 HTTPS 站点地址。

```sh
BASE='http://127.0.0.1:18605'
curl --fail-with-body --silent --show-error "$BASE/api/health"
```

推荐模式下应看到：

- `agent_provider: "coze"`、`llm_configured: true`：表示当前文本服务配置非空，尚不能单凭此证明真实请求成功。
- `vision_mode: "cloud_visual"`、`vision_available: true`：表示图像服务的配置条件满足，仍需上传真实照片验证。
- `generation_service.state`、`vision_service.state`：启动后通常为 `configured`，有效调用后为 `verified`，调用失败后可能为 `unavailable`；重启会重置这些内存状态。它们不是完整的持续可用性监控。
- `tts_available: true`：表示已安装 `edge-tts`，并非已经验证语音网络可达。
- `retrieval_mode: "lexical"` 和 `trained_landmark_model: false` 在云端方案中是正常状态，不需要训练才能使用。

测试对话：

```sh
curl --fail-with-body --silent --show-error --max-time 70 \
  -X POST "$BASE/api/agent/chat" \
  -H 'Content-Type: application/json' \
  --data '{"message":"南天门与十八盘有什么关系？","current_spot":"nantian"}'
```

应检查返回的 `mode`、`provider`、`answer`、`citations`、`sources`：

| 返回 | 含义 |
| --- | --- |
| `mode=rag_llm` 且 `provider=coze` | Coze 已返回回答，且通过本轮校验。 |
| `mode=rag_llm` 且 `provider=llm` | 使用直连模型生成，且通过本轮校验。 |
| `mode=local_knowledge` | 本次直接使用资料；可能是未配置生成服务、无资料匹配，或问题属于实时信息限制。结合 `refused` 和回答内容判断。 |
| `mode=local_knowledge_fallback` | 本次生成调用或回答校验失败，已改用资料摘录；HTTP 200 不代表模型调用成功。 |

也可携带 `current_poem`（如 `libai-2`）或 `current_route`（如 `tianwai`）传入阅读背景。ID 来自 `/api/catalog`，不是页面中文名称。

测试识图，必须使用真实照片的路径：

```sh
curl --fail-with-body --silent --show-error --max-time 65 \
  -X POST "$BASE/api/vision/recognize" \
  -F 'file=@/绝对路径/泰山实景.jpg'
```

成功响应可以是 `status=needs_confirmation` 或 `unknown`。候选包含 `spot_id` 和 `reason`，由用户核对后确认；不是返回一个数值就代表识别正确。支持 JPG／PNG／WebP，8 MB 以内、1600 万像素以内。后端缩小图片并重新编码后提交云端；服务本身不保存上传原图，识别记录保存在匿名会话中。岱庙、彩石溪、后石坞目前未启用自动识别。

确认结果需使用同一浏览器／同一 Cookie 会话：

```text
POST /api/vision/predictions/{request_id}/confirm
Content-Type: application/json
{"spot_id":"本次候选中的景点 ID"}
```

命令行分两次调用时，使用 `curl -c cookie.txt` 保存首次响应的 Cookie，再用 `curl -b cookie.txt` 提交确认；Cookie 文件放在本机临时目录。不能确认不在本次候选中的景点。

测试语音，在仓库根目录执行，音频存到已忽略的运行目录：

```sh
mkdir -p taishan/runtime
curl --fail-with-body --silent --show-error --max-time 40 \
  -X POST "$BASE/api/speech/tts" \
  -H 'Content-Type: application/json' \
  --data '{"text":"欢迎走进泰山，我们从南天门开始读山。"}' \
  --output taishan/runtime/tts-check.mp3
```

成功返回 MP3，仍需实际播放确认。固定音色为 `zh-CN-XiaoxiaoNeural`，位于 [`speech.py`](taishan/backend/speech.py)，当前没有 `TTS_VOICE` 环境变量。已锁定的依赖包含 `edge-tts`，无需填写 Coze 或图像模型 Key 来启用 TTS，但服务器需要能访问该语音服务。

### 7. 已有服务器如何修改配置

以下针对现有 `/opt/taishan` 部署。**更新配置无需重建数据库，也无需把密钥提交 GitHub。**

```sh
# 服务器终端：在现有环境文件中编辑对应变量，保留其他配置。
sudoedit /opt/taishan/.env
sudo chmod 600 /opt/taishan/.env
sudo systemctl restart taishan
sudo systemctl is-active taishan
curl --fail-with-body --silent --show-error http://127.0.0.1:18600/api/health
```

[`taishan.service`](taishan/deployment/taishan.service) 使用 `EnvironmentFile=-/opt/taishan/.env`；systemd 不需要手动 `source`，更改文件后重启即可加载。现有服务用户为 `taishan`，运行目录 `/opt/taishan`，Uvicorn 监听 `127.0.0.1:18600`，由 Nginx 转发公网请求。

生产环境保留：

```dotenv
IMMERSIVE_FRONTEND_DIR=/opt/taishan/immersive
DATA_DIR=/opt/taishan/runtime
```

- 前端只访问同源 `/api/`，不要把浏览器改为直连上游模型来绕过后端。
- 麦克风入口使用有效 HTTPS 或本机 localhost，用户点击授权；公网 HTTP 的文字和 TTS 功能不等于麦克风可用。
- 浏览器语音识别使用浏览器自身服务，无额外 STT Key 配置；支持情况、硬件权限和网络需在真实设备验证。
- 数字人根据实际播放音量驱动口型；当前不是音素级唇形模型。
- 若 Nginx 出现 504，对照实际配置检查 `proxy_read_timeout`。Coze 适配器总等待上限 55 秒，应用层前端等待 65 秒，代理等待建议至少 65 秒。仓库较早的 HTTP 模板可能仍为 50 秒；修改应先执行 `nginx -t` 再重载，并在公网复测。

### 8. 常见问题排查

| 现象 | 检查与处理 |
| --- | --- |
| 克隆后问山只给资料摘录 | 检查 `.env` 是否填写、是否 `source`／重启，以及 `AGENT_PROVIDER`。先看响应 `mode`，不要只看 HTTP 200。 |
| 只配置 Coze 后识图报未配置 | 补齐独立的 `LLM_BASE_URL`、`LLM_MODEL`、`LLM_API_KEY`，并设 `VISION_BACKEND=cloud`。 |
| 401／403 或 Token 无效 | 对应服务的 Token／Key、权限或有效期有问题；Key 不带 `Bearer `，不要交换两种凭证。 |
| 文本能回答、图片请求失败 | 核对模型与网关是否支持当前 `image_url`、`response_format` 等请求参数；普通文本模型不能仅通过改名字获得视觉能力。 |
| Coze 一直回退到资料 | 核对 `/stream_run`、部署是否在线、协议是否为本适配器要求的 SSE，以及是否保留资料引用。日志中 `LLM unavailable or citation invalid` 既可能是网络失败，也可能是返回内容未通过校验。 |
| 使用了 `/task/{task_id}` | 这是任务状态查询，不是当前代码发起对话的端点。改回部署对应的对话端点。 |
| `project_id` 错误 | 有要求时填整数 ID；现有部署可留空。不要从 Token、Bot ID 或 URL 猜填项目 ID。 |
| 修改 `.env` 没生效 | 变量在模块导入时读取；重启旧后端，并确认浏览器访问的确实是该进程。Vite 的代理目标固定为本机 18605。 |
| 语音不出声或数字人不开口 | 先测 `/api/speech/tts`，再检查浏览器播放授权与播放器状态。`tts_available=true` 只检查依赖安装，不能证明网络和播放成功。 |
| 公网麦克风不可用 | 使用有效 HTTPS，检查浏览器语音识别支持与站点授权；不在 HTTP 上反复申请。 |
| `retrieval_mode=lexical` | 未安装 BGE 可选权重，系统使用关键词检索，云端生成与识图仍可工作。 |
| `vision_available=true` 但识图 502 | 此字段只说明配置条件满足；继续检查实际模型权限、服务状态和图像输入兼容性。 |
| 429／繁忙 | 同一 IP 有调用频率限制；文本生成和云端识图还共享并发限制，稍后重试。 |
| 本地或服务器连接超时 | 核对出站网络、DNS 和代理设置。`httpx` 默认读取环境代理；检查代理是否影响请求，不要通过关闭 TLS 校验解决。 |

可在本机使用 `journalctl -u taishan -n 80 --no-pager` 检查服务日志；分享日志前去掉凭证与会话内容，不执行 `cat .env`、`env` 或输出完整 Token 来排错。


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

### 核心交互与空间漫游（1.7.0）

沉浸页新增足迹/收藏与五章任务入口、景点独立朗读、三首诗完整逐句释读和真实时间同步音频、诗词/路线问答上下文、原阅读点返回、地图搜索定位和缩放后触控热区。三卷山境可进入空间漫游，支持透视视角、缩放、镜头热点与巡览；精细 GLB 场景待建模师交付。详见 [复审与发布](docs/integration/核心交互复审与空间漫游发布.md) 与 [建模交付规范](docs/modeling/场景建模交付规范.md)。

### 文化导读与流程完善（1.7.1）

19 个景点新增观察与文化阅读线索、7 条历史记录新增导读及上下文提问、3 首诗新增三步阅读定位；导读为 AI 辅助编辑稿，沿用原条目的来源并明确待人工复核。首页可以直接进入五章读山，章节状态会随景点和诗词链接保存。详见 [文字与模型协作说明](docs/content/文字与模型协作说明.md)。
