# Word UI 逐图复刻与腾讯云发布记录

> 后续修订：用户反馈清晰度、画布留白与长回答重叠后，已更新为独立文字/矢量控件、连续地图画布与可滚动对话布局。当前验收与发布以 [清晰度和布局修订记录](../ui-clarity-20261018/README.md) 为准；本目录保留上一次发布的历史证据。

设计来源：项目上一级的 `UI设计图.docx`，仅使用用户提供的这一份 Word；内部包含 30 张设计图片。原文件未修改。

线上入口：[腾讯云 HTTPS](https://118.89.176.236/experience/?ui=20261018)，兼容入口为 `http://118.89.176.236:8037/experience/`。这次只发布沉浸式前端，数据库、环境配置和后端服务保持原部署。

## 逐图覆盖

桌面按 1211×810、手机按 309×767 的设计内框匹配。说明图 02、13、14、15、25、26、29、30 中的多个状态拆成可操作的组件，未将整张说明图充当网页。

| Word 图号 | 界面 / 状态 | 浏览器证据 | 入口与交互 |
| --- | --- | --- | --- |
| 01 | 卷首欢迎 | [桌面/状态](screens/desktop-01.webp) · [手机](screens/mobile-01.webp) | [打开](https://118.89.176.236/experience/) 原生导航与对应内容入口可操作。 |
| 02 | 三步游历引导 | [桌面/状态](screens/desktop-02.webp) · [手机](screens/mobile-02.webp) | [打开](https://118.89.176.236/experience/#map) 设置 → 重看游历引导；原图为三步说明，手机纵向排列同一组素材。 |
| 03 | 山水地图 | [桌面/状态](screens/desktop-03.webp) · [手机](screens/mobile-03.webp) | [打开](https://118.89.176.236/experience/#map) 原生导航与对应内容入口可操作。 |
| 04 | 红门近景 | [桌面/状态](screens/desktop-04.webp) · [手机](screens/mobile-04.webp) | [打开](https://118.89.176.236/experience/#map) 地图点击红门；观察、文化详情、返回均可用。 |
| 05 | 四条路线 | [桌面/状态](screens/desktop-05.webp) · [手机](screens/mobile-05.webp) | [打开](https://118.89.176.236/experience/#routes) 原生导航与对应内容入口可操作。 |
| 06 | 岱庙 · 礼序 | [桌面/状态](screens/desktop-06.webp) · [手机](screens/mobile-06.webp) | [打开](https://118.89.176.236/experience/#scene?id=daimiao&mode=reading) 原生导航与对应内容入口可操作。 |
| 07 | 红门文化详情 | [桌面/状态](screens/desktop-07.webp) · [手机](screens/mobile-07.webp) | [打开](https://118.89.176.236/experience/#spot?id=hongmen) 原生导航与对应内容入口可操作。 |
| 08 | 山水图集 | [桌面/状态](screens/desktop-08.webp) · [手机](screens/mobile-08.webp) | [打开](https://118.89.176.236/experience/#gallery) 原生导航与对应内容入口可操作。 |
| 09 | 彩石溪 · 石与水 | [桌面/状态](screens/desktop-09.webp) · [手机](screens/mobile-09.webp) | [打开](https://118.89.176.236/experience/#scene?id=caishixi&mode=reading) 原生导航与对应内容入口可操作。 |
| 10 | 后石坞 · 松与风 | [桌面/状态](screens/desktop-10.webp) · [手机](screens/mobile-10.webp) | [打开](https://118.89.176.236/experience/#scene?id=houshiwu&mode=reading) 原生导航与对应内容入口可操作。 |
| 11 | 云间索道 | [桌面/状态](screens/desktop-11.webp) · [手机](screens/mobile-11.webp) | [打开](https://118.89.176.236/experience/#cableway) 设置 → 显示与页面选项 → 索道穿云画境；可切换实际三维模型。 |
| 12 | 游历回顾 | [桌面/状态](screens/desktop-12.webp) · [手机](screens/mobile-12.webp) | [打开](https://118.89.176.236/experience/#review) 手札 → 回顾这一程；进度来自当前会话。 |
| 13 | 南天门观察与文化卡 | [桌面/状态](screens/desktop-13-unseen.webp) · [手机](screens/mobile-13-unseen.webp) | [打开](https://118.89.176.236/experience/#map) 地图点击南天门 → 观察；支持关闭讲解、继续阅读和收起。 |
| 14 | 加载、降级与设备权限 | [桌面/状态](screens/component-14-sunrise-loading.webp) | [打开](https://118.89.176.236/experience/#map) 通过实际资源加载、声音偏好和设备权限触发；失败样例使用受控响应。 |
| 15 | 搜索、详情、空结果与路线 | [桌面/状态](screens/desktop-15-results.webp) · [手机](screens/mobile-15-results.webp) | [打开](https://118.89.176.236/experience/#map) 原生搜索：结果、空结果、详情、定位；路线页可标出并取消路线。 |
| 16 | 读山目录 | [桌面/状态](screens/desktop-16.webp) · [手机](screens/mobile-16.webp) | [打开](https://118.89.176.236/experience/#read) 原生导航与对应内容入口可操作。 |
| 17 | 历史长卷 | [桌面/状态](screens/desktop-17.webp) · [手机](screens/mobile-17.webp) | [打开](https://118.89.176.236/experience/#history) 原生导航与对应内容入口可操作。 |
| 18 | 诗词之山 | [桌面/状态](screens/desktop-18.webp) · [手机](screens/mobile-18.webp) | [打开](https://118.89.176.236/experience/#poetry) 原生导航与对应内容入口可操作。 |
| 19 | 石刻文博 | [桌面/状态](screens/desktop-19.webp) · [手机](screens/mobile-19.webp) | [打开](https://118.89.176.236/experience/#museum) 原生导航与对应内容入口可操作。 |
| 20 | 五章游历的第三章示例 | [桌面/状态](screens/desktop-20.webp) · [手机](screens/mobile-20.webp) | [打开](https://118.89.176.236/experience/#study) 保留图稿中的第三章本地阅读题；“进入五章学习与进度”接入真实章节核验。 |
| 21 | 山境三卷目录 | [桌面/状态](screens/desktop-21.webp) · [手机](screens/mobile-21.webp) | [打开](https://118.89.176.236/experience/#scenes) 原生导航与对应内容入口可操作。 |
| 22 | 问山对话 | [桌面/状态](screens/desktop-22.webp) · [手机](screens/mobile-22.webp) | [打开](https://118.89.176.236/experience/#agent) 原生导航与对应内容入口可操作。 |
| 23 | 拍照问山 | [桌面/状态](screens/desktop-23.webp) · [手机](screens/mobile-23.webp) | [打开](https://118.89.176.236/experience/#vision) 原生导航与对应内容入口可操作。 |
| 24 | 图片与问题上传 | [桌面/状态](screens/desktop-24.webp) · [手机](screens/mobile-24.webp) | [打开](https://118.89.176.236/experience/#vision) 原生导航与对应内容入口可操作。 |
| 25 | 语音与问答状态 | [桌面/状态](screens/desktop-25-listening.webp) | [打开](https://118.89.176.236/experience/#agent) 聆听、转写确认、思考、回答、讲解播放、错误；转写后可编辑再发送。 |
| 26 | 识景状态 | [桌面/状态](screens/desktop-26-analyzing.webp) · [手机](screens/mobile-26-analyzing.webp) | [打开](https://118.89.176.236/experience/#vision) 待上传、分析、候选、无法确认、失败；选图后才提交云端。 |
| 27 | 游历手札 | [桌面/状态](screens/desktop-27.webp) · [手机](screens/mobile-27.webp) | [打开](https://118.89.176.236/experience/#trail) 真实足迹、收藏、印章、学习数据；空会话与图稿样例数量不同。 |
| 28 | 更多与设置 | [桌面/状态](screens/desktop-28.webp) · [手机](screens/mobile-28.webp) | [打开](https://118.89.176.236/experience/#map) 原生导航与对应内容入口可操作。 |
| 29 | 收藏保存状态 | [桌面/状态](screens/desktop-29-saving.webp) · [手机](screens/mobile-29-saving.webp) | [打开](https://118.89.176.236/experience/#spot?id=hongmen) 保存中 → 成功只由请求成功触发；已收藏和失败均可继续操作。 |
| 30 | 大图、失败、骨架与空态 | [桌面/状态](screens/desktop-30-viewer.webp) · [手机](screens/mobile-30-viewer.webp) | [打开](https://118.89.176.236/experience/#gallery) 大图翻页与缩放、图片失败重试、目录加载骨架、手札空态。 |

全部状态与截图列表见 [coverage.json](coverage.json)。证据图以 WebP 质量 92 归档；像素指标来自压缩前的浏览器 PNG。

## 核对结果与实际数据

- 99 张状态截图覆盖全部 30 个设计图编号，浏览器无未处理脚本错误。
- 32 项单元测试通过，生产构建通过；构建仍有现有主 JS 包大于 500 KB 的体积提示。
- 10 条交互回归通过，包括三步引导、搜索定位、图集、大图、山境、手札、手机问山、设置持久化、失败重试及普通动效转场。
- 320×568、390×844、768×1024、1024×600、1920×1080 五组视口检查无横向溢出。
- 使用浏览器测试摄像头验证了采集、生成图片和停止媒体轨道；关闭页面后摄像头轨道确实结束。关闭日出加载提示后，迟到的图片不会重新弹出。
- 石刻页另外检查了桌面/手机的缩略图切换、缩放和释文模式；读山/山境目录修正了手机切片中原有的 1 像素留白。

[交互检查](interactions.json)、[尺寸与媒体检查](edge-checks.json)、[公网检查](live-checks.json)、[像素比较](comparison-metrics.json) 均有完整结果。

像素比较直接包含文字、控件和真实状态差异，并非“全页面零差异”的证明。欢迎页、第三章示例、拍照初始界面在参考尺寸的主画面像素一致；其他页面的原稿艺术素材、布局、边距经过截图比较。足迹、收藏、阅读进度、朗读时长和 AI 回答由实际数据决定，不能将 Word 中固定的演示次数、计时或回复写成真实结果。新会话没有图稿里预先积累的对话和收藏。可编辑文字与实时回复采用可用楷体/宋体回退，Word 没有提供可独立提取的原始字体文件。

AI、ASR、TTS 测试音频、保存失败、图片失败等检查使用明确的浏览器测试响应；它们验证状态变化与组件，不代表线上模型已输出相同内容。真实手机相机/麦克风授权以及浏览器语音服务仍取决于设备与网络。

## 素材与复现

原始图与每个切片的来源图号、裁剪坐标和 SHA-256 位于 [素材清单](../../../public/design-assets/manifest.json)。运行 `python3 scripts/extract-design-assets.py` 可从 Word 重建切片。重建需要 Pillow。

两张 UI 清除源图用于填补地图和问山中移走原有控件后的背景；它们由原图编辑生成，未重新绘制整幅山景。原始可见区域保留，补丁范围与羽化参数在清单及脚本中列出；控件、文字输入、缩放、搜索和异步状态由原生 DOM 实现。新生成的源图为 `map-erased-source.webp` 与 `guide-erased-source.png`，组合背景为两张地图底图及 `guide-clean.webp`。

执行：

```sh
npm test
npm run build
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node tests/ui-browser.mjs
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node tests/ui-design-coverage.mjs
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node tests/ui-browser-edge.mjs
```

浏览器脚本的 `UI_BASE_URL` 可指定测试站点，`UI_SCREENSHOT_DIR` 可指定证据输出目录；状态组件的模块级检查仅在本地 Vite 测试。

## 发布与回退

生产目录 `/opt/taishan/immersive/`。先上传至 `/home/ubuntu/ui-word-20261018-stage/`，逐文件核对后先同步素材与哈希脚本，最后原子替换 `index.html`。旧版哈希资源保留，避免已打开的旧页面丢失资源。

原前端完整备份：`/opt/taishan/runtime/ui-word-before-20261018-022118`。必要时将该备份同步回沉浸式目录，再恢复其 `index.html`；此次未改动数据库与服务器凭证。

发布文件及每个 SHA-256 见 [release-manifest.json](release-manifest.json)，公网检测结果见 [live-checks.json](live-checks.json)。最终发布 393 个前端文件，全部在服务器逐一核对 SHA-256。HTTPS 及 8037 入口均核对页面构建；不关闭证书校验。桌面与手机的公网页面截图存于 `live/`。
