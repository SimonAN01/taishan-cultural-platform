# Windows 11 团队运行

目标环境：Windows 11 **x64**，Chrome 或 Edge。没有 Win11 实机时不能把脚本检查、macOS 的完整运行或依赖 wheel 存在描述成 Win11 实机验收。

## 首次运行

1. 加入私有仓库后，完整克隆或下载并解压项目。不要只下载 `src` 或网页文件。
2. 双击根目录 **`Start-Windows.cmd`**。保持终端窗口打开。
3. 缺少 Node.js、Python 3.12 或 Microsoft C++ 运行库时，入口使用微软 WinGet 安装。Windows 安装授权提示需由用户处理。
4. 首次自动执行 `npm ci`、创建 Python `.venv`、安装后端锁定依赖、加载团队配置、构建网页并启动后端。
5. 终端显示后端就绪与“历史资料 7 条”后，自动打开 `http://127.0.0.1:18605/experience/`。如浏览器未自动出现，复制该地址打开；保持终端运行。

**无需自己填写模型 Key，也不需要安装 Blender、训练模型、下载 BGE/CLIP 权重或使用 GPU 推理。** 网页数字人和索道 GLB 已在仓库。Blender 仅供建模人员编辑源文件；浏览网页不依赖 Blender。

历史、诗词、路线和图片读取项目自带数据；问山使用 Coze，识景使用云端图像服务，朗读使用 Edge TTS。云端服务需要网络、有效权限与额度；浏览器语音识别还需要麦克风授权和浏览器支持。本机 `127.0.0.1` 可使用浏览器的安全上下文能力。

## 检查是否正常

| 页面 | 地址 | 应看到的结果 |
| --- | --- | --- |
| 历史长卷 | `/experience/#history` | 五个时代、事件和来源，切换秦汉可见两条史事 |
| 路线 | `/experience/#routes` | 四线；天外村可选徒步/索道 |
| 问山 | `/experience/#agent` | 真实回答注明 AI 与来源；可停止等待、重试、朗读 |
| AI 识景 | `/experience/#vision` | 上传真实照片，显示候选及理由，人工确认后进入详情 |
| 数字人 | 问山右侧，可收起 | 角色载入后可手动点头/作揖/远望；播放 TTS 时口型随音频变化 |
| 足迹 | `/experience/#trail` | 收藏/访问持久保存，五章答题要求先阅读景点 |

以上地址统一加前缀 `http://127.0.0.1:18605`。岱庙、彩石溪、后石坞的精细 GLB 尚待建模团队交付，当前使用艺术化概念画境，不计作精细场景已经完成。

保持启动窗口运行，再双击 **`Check-Windows.cmd`**，可执行完整 HTTP 验收，包含真实 Coze、三张识景样本/未知图、TTS、朗诵字幕、历史资料、五章进度、收藏与会话隔离。报告写到 `taishan/runtime/windows-acceptance.json`。该检查会调用已配置的云端服务；它验证接口链路，浏览器画面、音频设备、麦克风权限及显卡仍需按上表实机操作。

## 出错时

- **历史长卷“暂时未能展开”**：确认启动终端没有退出；访问 `http://127.0.0.1:18605/api/history` 应返回七条 JSON。历史接口不使用模型 Token。
- **18605 端口被占用**：关闭上一次本项目终端后重试。启动器不会自动结束未知进程。
- **Python/Node 找不到**：安装后关闭旧终端，再次双击入口。若 WinGet 不可用，先安装微软 App Installer，或手动安装官方 Node.js LTS 与 Python 3.12 x64（加入 PATH）。
- **pip/npm 下载失败**：检查公司代理、校园网络及 registry/pypi 可达性。脚本保留错误，不伪装安装成功。
- **旧 `.venv` 来自 macOS/Linux**：虚拟环境不跨操作系统共享；只移走本机生成的 `taishan/.venv` 后重试，不要复制他人的虚拟环境。
- **API 未配置**：仓库 `taishan/config/team.env` 已填值；检查自己旧的 `taishan/.env` 是否用空白配置覆盖。不要将该文件复制进 `public` 或 `src`。
- **三维画面缺失**：Chrome/Edge 启用正常 WebGL/硬件加速，检查模型请求；不支持 WebGL 时有立绘/静态阅读降级。不同显卡与驱动仍需实机复验。
- **没有麦克风/拒绝权限**：文字问答与朗读仍可使用；在浏览器站点权限中允许本机页面使用麦克风后重试。

## 开发与更新

更新代码后重新双击入口，会按依赖锁变化安装需要的依赖并重新构建。开发者也可在已安装 Node/Python 后执行 `npm ci`、`npm run dev`；开发入口会同时启动后端 18605 和前端 4173。

入口不更改系统防火墙、浏览器权限或计算机的 PowerShell 执行策略。`Start-Windows.cmd` 直接读取并运行仓库中的 PowerShell 文本，受组织强制策略约束的设备仍需管理员允许。服务默认只监听 `127.0.0.1`，不自动暴露到局域网或公网。

安装依据：[Microsoft WinGet install](https://learn.microsoft.com/en-us/windows/package-manager/winget/install)、[Node.js 官方下载](https://nodejs.org/en/download)、[Python 官方下载](https://www.python.org/downloads/windows/)。
