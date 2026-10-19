# 地图可达性、沉浸动效与 Word 界面原生化 · 2026-10-18

来源仅为用户的 `UI设计图.docx`（30 张设计），没有增加 Figma 或字体源稿的假设。此次修复针对手机目标卡过大、部分景点不可达、工具重叠、画面缺乏操作反馈，以及遗留截图式文字／按钮。

## 地图

- 顶部手机目标卡缩为紧凑行；搜索收进手机顶部搜索按钮，方向、缩放与底部导航分区，矮屏也可操作。初始取景由顶部对齐改为主线居中，当前 508×752 窗口的 5 个主线标记均可直接看到和点击。桌面矮屏搜索和缩放条固定间距。
- “看全图”在独立可滚动对话框展示完整山体原比例画作，保留山顶、山脚和两侧群峰，不拉伸、不裁掉全图边缘。
- “景点目录”读取现有目录全部 **19 处**，逐项可打开文化详情。画卷上的有限示意标记与完整资料目录分开处理：只对确有可见标记的条目提供定位，不把旧版地图的坐标套到新的插画上。
- 新增程序定位／缩放过渡、定位标记反馈和缓慢轻雾流动；手动拖动不带延迟。系统减少动效与页面简化动效开关均关闭这些持续动画。
- 目录加载中不显示伪造的缺省景点；慢网会在资料到达后自动补齐，失败提示可重新加载。
- 修复完成前三站后，“前往玉皇顶”却进入回顾页的问题，改为打开玉皇顶资料。

## 原生界面检查

下表记录 30 个设计编号对应的原生组件与检查截图。**这代表状态覆盖和截图式 UI 清理，不等于已经证明所有画面逐像素 1:1。** 手机目标卡和部分阅读布局为解决遮挡、滚动和清晰度进行了排版调整；原始插画细节受 Word 位图分辨率限制。画作、角色和印章仍是位图素材；导航、标题、正文、表单和操作按钮由 HTML／CSS／SVG 渲染。

| 编号 | 设计 | 原生界面／实际行为 | 证据 |
| --- | --- | --- | --- |
| 01 | 卷首欢迎 | 标题、说明与入口为文本／按钮，单独山水插画 | [截图](design-coverage/desktop-01.png) · [手机](design-coverage/mobile-01.png) |
| 02 | 三步游历引导 | 三步卡片、步骤标题、正文、关闭与开始为原生元素；替换整卡截图 | [截图](design-coverage/desktop-02.png) · [手机](design-coverage/mobile-02.png) |
| 03 | 山水地图 | 紧凑目标卡、全图、完整目录、搜索、定位、方向与缩放 | [截图](design-coverage/desktop-03.png) · [手机](design-coverage/mobile-03.png) |
| 04 | 红门近景 | 连续山门背景，观察卡与返回为原生元素 | [截图](design-coverage/desktop-04.png) · [手机](design-coverage/mobile-04.png) |
| 05 | 四条路线 | 四路线标题、描述、切换与出发为原生元素 | [截图](design-coverage/desktop-05.png) · [手机](design-coverage/mobile-05.png) |
| 06 | 岱庙 · 礼序 | 山境阅读点、释读、音频与空间画境共用真实事件 | [截图](design-coverage/desktop-06.png) · [手机](design-coverage/mobile-06.png) |
| 07 | 红门文化详情 | 文化正文、分类、三大看点的文字与图标为原生元素 | [截图](design-coverage/desktop-07.png) · [手机](design-coverage/mobile-07.png) |
| 08 | 山水图集 | 清洁画作缩略图、原生分类、来源和大图操作 | [截图](design-coverage/desktop-08.png) · [手机](design-coverage/mobile-08.png) |
| 09 | 彩石溪 · 石与水 | 景点阅读点、释读、音频与空间画境 | [截图](design-coverage/desktop-09.png) · [手机](design-coverage/mobile-09.png) |
| 10 | 后石坞 · 松与风 | 景点阅读点、释读、音频与空间画境 | [截图](design-coverage/desktop-10.png) · [手机](design-coverage/mobile-10.png) |
| 11 | 云间索道 | 真实 WebGL 缆车与缆线；连续山景绘画；原生行程与按钮 | [截图](design-coverage/desktop-11.png) · [手机](design-coverage/mobile-11.png) |
| 12 | 游历回顾 | 标题、真实记录、印章状态、卡片与入口 | [截图](design-coverage/desktop-12.png) · [手机](design-coverage/mobile-12.png) |
| 13 | 南天门观察与文化卡 | 移除状态整图；原生观察、对话、文化正文、音频与收起 | [截图](design-coverage/desktop-13-unseen.png) · [手机](design-coverage/mobile-13-unseen.png) |
| 14 | 加载、降级与设备权限 | 移除整张反馈界面；原生标题、文案、进度与回调 | [截图](design-coverage/component-14-sunrise-loading.png) |
| 15 | 搜索、详情、空结果与路线 | 原生输入、结果、详情、定位和路线摘要 | [截图](design-coverage/desktop-15-results.png) · [手机](design-coverage/mobile-15-results.png) |
| 16 | 读山目录 | 移除含整套界面的纸面背景；原生目录文字和入口 | [截图](design-coverage/desktop-16.png) · [手机](design-coverage/mobile-16.png) |
| 17 | 历史长卷 | 正文自然增长，下一段可刷新恢复；相关内容与来源为原生元素 | [截图](design-coverage/desktop-17.png) · [手机](design-coverage/mobile-17.png) |
| 18 | 诗词之山 | 移除整页诗词截图；原生诗句、解读、朗读和选项 | [截图](design-coverage/desktop-18.png) · [手机](design-coverage/mobile-18.png) |
| 19 | 石刻文博 | 原生目录、切图、放大、模式页签与讲解 | [截图](design-coverage/desktop-19.png) · [手机](design-coverage/mobile-19.png) |
| 20 | 五章游历 | 原生章节、题目和真实学习流程；示例题有本地说明 | [截图](design-coverage/desktop-20.png) · [手机](design-coverage/mobile-20.png) |
| 21 | 山境三卷目录 | 原生标题、三卷卡片、真实阅读进度 | [截图](design-coverage/desktop-21.png) · [手机](design-coverage/mobile-21.png) |
| 22 | 问山对话 | 原生对话、输入、上下文、历史与数字人面板 | [截图](design-coverage/desktop-22.png) · [手机](design-coverage/mobile-22.png) |
| 23 | 拍照问山 | 移除相机截图；原生取景框、真实视频、快门、相册和翻转 | [截图](design-coverage/desktop-23.png) · [手机](design-coverage/mobile-23.png) |
| 24 | 图片与问题上传 | 移除上传标题截图；真实文件、预览、提问和提交 | [截图](design-coverage/desktop-24.png) · [手机](design-coverage/mobile-24.png) |
| 25 | 语音与问答状态 | 原生聆听、转写确认、思考、回答、朗读与错误状态 | [截图](design-coverage/desktop-25-listening.png) |
| 26 | 识景状态 | 原生等待、分析、候选、无法确认与错误；保留人工确认 | [截图](design-coverage/desktop-26-analyzing.png) · [手机](design-coverage/mobile-26-analyzing.png) |
| 27 | 游历手札 | 原生真实足迹、收藏、印章、学习数据和空态 | [截图](design-coverage/desktop-27.png) · [手机](design-coverage/mobile-27.png) |
| 28 | 更多与设置 | 移除设置标题截图；原生标题、开关、滑条、关闭与其他选项 | [截图](design-coverage/desktop-28.png) · [手机](design-coverage/mobile-28.png) |
| 29 | 收藏保存状态 | 移除保存提示截图；请求驱动状态与原生回调按钮 | [截图](design-coverage/desktop-29-saving.png) · [手机](design-coverage/mobile-29-saving.png) |
| 30 | 大图、失败、骨架与空态 | 移除带控制按钮的大图和错误截图；原生翻页、缩放、重试、骨架和空态 | [截图](design-coverage/desktop-30-viewer.png) · [手机](design-coverage/mobile-30-viewer.png) |

## 验证

- `map-checks/checks.json`：320×568、309×767、390×844、508×752、1024×600、1211×810、1900×1080，工具无相撞；全图原比例；19 项目录完整并逐项打开；完成旅程后正确打开玉皇顶；减少动效实际关闭动画；延迟目录自动补齐，目录失败显示原生重试并实际恢复。
- `design-coverage/coverage.json`：30 编号、99 状态截图，浏览器脚本错误为 0。增加实际可见背景、伪元素和图像资源检查，禁止已识别的整页／卡片 UI 截图继续作为界面渲染。没有将隐蔽的背景截图当成原生文本。
- `functional-checks/interactions.json`：既有 10 组功能流，包括设置、搜索、图库、山境、手札、问山、错误和转场。
- `reading-checks/checks.json`：4 种尺寸，历史阅读、段落恢复与按钮焦点后的键盘操作。
- `edge-checks/edge-checks.json`：5 种尺寸入口与摄像头生命周期。浏览器相机检查使用测试媒体，不代表物理手机权限已实测。
- 32 个单元测试通过，Vite 构建成功；既有主包大小警告仍存在。无新增运行时依赖。
- AI、ASR、保存错误与其他故障场景中的受控响应仅证明状态处理，不证明真实提供商输出。

## 线上

发布信息见 `deployment.json`，逐文件哈希见 `release-manifest.json`，公网验证与浏览器截图见 `live-checks.json`、`public-checks/`。
旧导览入口的正式下线记录见 [前一轮部署记录](../ui-cableway-scene-20261018/README.md)。根地址 `/#map` 已经在真实浏览器验证为 `/experience/#map`，并在此轮发布后再次检查。

索道新背景为前一轮使用内置 image_gen 按 Word 绘画补绘的连续山景，[素材与完整提示词](../ui-cableway-scene-20261018/README.md)。缆车可操作，但山体是艺术画境，未声称完整三维测绘或实时定位。
