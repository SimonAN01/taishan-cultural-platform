# 索道场景修复与旧导览下线 · 2026-10-18

用户指出索道山体露出插画平面边缘、建筑悬空、比例失衡，并发现根地址仍打开另一套旧版导览，随后明确要求旧导览全部下线。本轮优先解决这些问题，同时完成此前已经开始的历史页阅读和键盘焦点修复。

## 索道画面

- 移除所有作为近景山体、门楼和站房使用的平面裁片，以及没有匹配地形的粗支柱。它们会在行进和旋转时暴露边缘，不能作为完整三维山景使用。
- 山景改成一张连续画境，保持原设计右侧山顶建筑、云海、山谷和暖色晨光的构图关系。建筑画在所属山体上，不再独立悬空。车厢与缆线仍由真实 WebGL 渲染；车厢的悬挂方向和缆线方向一致。
- 行程进度、暂停／继续、键盘前后、手机按钮、视角复位和真实 WebAudio 环境声继续可用。背景位置随视角与行程作小幅调整，没有声称它是实地测绘模型或完整三维山体。
- 页面明确写“三维缆车 × 全景画境 · 艺术化演绎”。未增加逼真的实时定位或真实索道运行的说法。
- 修复暂停后拖动进度仍显示“开始乘坐”的状态文案。手机常用方向和操作按钮至少 44 px 高；矮屏收起非必要说明，避免状态卡遮住车厢。

## 公网旧版导览下线

唯一默认界面为 `/experience/`，根网址统一跳转到此处。80、8037 和 HTTPS 443 的相关规则一致：

| 旧入口 | 新行为 |
| --- | --- |
| `/`、`/?classic=1` | 302 到 `/experience/`，不再保留旧版开关；查询参数保留 |
| `/index.html` | 302 到 `/experience/` |
| `/classic`、`/classic/…` | 302 到 `/experience/` |
| `/app.js`、`/map.js`、`/ui.js`、`/assistant.js`、`/style.css` | 410，不再对外提供旧版页面脚本和样式 |
| `/api/…`、`/assets/photos/…`、`/experience/…` | 保持新版所需的接口、照片和资源 |

新版代码中指回旧导览的入口已移除，资料链接指向新版文化页面。旧前端源码和发布前配置保留为内部历史与回退材料，没有删除用户数据。执行脚本 `publish-entrypoint.py` 会先备份两份 Nginx 配置，修改后运行 `nginx -t` 再 reload；失败会恢复原配置。后端服务和数据库结构不变。

正式下线时间、配置备份见 `entrypoint-deployment.json`，公网 HTTP 与浏览器验收见 `live-checks.json`、`public-checks/`。本记录不把准备好的脚本当成已经完成的发布。

## 其余已完成的修复

历史长卷改为随内容增长的正常排版，扩展阅读可展开，音频和下一段按钮不再覆盖正文。历史条目的 ID 会写入地址，刷新后保留具体段落。索道、天街、山境空间画境在点击操作按钮之后仍能使用方向键；输入框、进度条和带 Ctrl/Alt/Command 的快捷键不被抢占。天街重新打开时清理旧事件，避免一次按键执行多次。

## 本地验收

- `scene-checks/checks.json`：7 种尺寸（320×568、309×767、390×844、508×752、1024×600、1211×810、1900×1080），每种捕获 0%、25%、56%、75%、100% 及左右视角边界，共 49 张场景截图。实际 WebGL，没有替换模型或伪造进度；另验证背景请求真实失败后可重试。
- `controls-checks/checks.json`：5 种尺寸验证暂停／继续、进度定位、真实 WebAudio 开关、地图键盘和按钮、红门单幅背景、天街行走坐标、目录标题与文博切换，以及模型加载失败后重试。
- `reading-checks/checks.json`：4 种尺寸验证历史正文不被裁切、下一段刷新恢复、展开方向面板不遮住目标／搜索／缩放／导航、按钮焦点后的街道和山境快捷键、组合键与重开时无重复事件。使用真实目录，不调用音频服务。
- `regression/interactions.json`：10 组已有浏览器流程通过。32 项单元测试通过，Vite 构建成功，保留既存的大包警告。没有增加运行时依赖。
- `design-coverage/coverage.json`：沿用 Word 30 个设计编号的完整截图检查；AI、ASR、故障、保存提示中的控制响应只证明界面状态，不代表真实提供商输出，也不等于逐像素复刻结论。

## 新背景素材与提示词

使用内置 **image_gen** 编辑原设计资产 `public/design-assets/cableway-desktop.webp`。保留的源图为 [sources/cableway-cloud-valley-v1.png](sources/cableway-cloud-valley-v1.png)，发布资产为 `public/design-assets/cableway-cloud-valley-v1.webp`（1672×941，711,070 字节）；WebP 以 quality=95、method=6 编码，没有缩小源图。它是基于 Word 画风的补绘，不是原始高清稿。

完整提示词：

> Use case: precise-object-edit. Asset type: high-resolution continuous landscape background for the supplied Taishan cable-car UI. Edit target: the supplied reference painting with a large cable car and UI panels. Create a clean landscape-only plate, wide 16:9, ideally 3072x1728 pixels or larger, sharp fine painted detail. Preserve the original Chinese ink-and-color mountain illustration aesthetic, warm sunrise light, distant blue-gray mountain ranges and flowing white cloud sea. Preserve the rocky main summit with its grounded Chinese temple complex on the RIGHT HALF, and preserve a coherent deep cloud-filled valley in the center and left. The summit, temple, trees and paths must all be naturally attached to rock and ground. Remove ALL cable cars, the huge foreground cabin and its suspension hardware, all cable lines and poles, all people/characters, every title/text/Chinese character/stone inscription, every UI panel/control/button/progress dot/icon, and all borders. Fill the removed left cabin area with a natural continuous deep valley and distant mountain layers matching the rest of the painting, rather than a close-up flat cliff wall. Fill removed bottom controls with continuous clouds and mountains. Keep generous open cloud-filled valley in the left-center for a separately rendered 3D cabin. No floating buildings, no cutout objects, no visible vertical or horizontal collage seams, no rectangles, no transparency. This is ONE seamless continuous landscape painting used full-screen behind actual 3D objects, not an interface mockup and not a sheet of separate assets.
