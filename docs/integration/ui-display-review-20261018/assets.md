# 素材来源与清理要求

源目录：`docs/integration/ui-clarity-20261018/sources/`。所有生成编辑使用内置 image_gen；应用端为无损 WebP，独立人物保留透明通道。并非来自 Figma 或原始高清分层文件。

| Word 图 | 原始编辑结果 | 应用素材 |
| --- | --- | --- |
| 03 地图 | map-desktop-clean-v2.png / map-mobile-clean-v2.png | map-art-desktop-v2.webp / map-art-mobile-v2.webp |
| 05 路线 | routes-background-clean-v2.png | route-landscape-art-v2.webp / route-paper-art-v2.webp |
| 12 回顾 | review-desktop-clean-v2.png / review-mobile-clean-v2.png | review-art-desktop-v2.webp / review-art-mobile-v2.webp |
| 20 学习 | study-desktop-clean-v2.png / study-mobile-clean-v2.png | study-art-desktop-v2.webp / study-art-mobile-v2.webp |
| 27 手札 | handbook-desktop-clean-v2.png / handbook-mobile-clean-v2.png / handbook-girl-v2.png | handbook-art-desktop-v2.webp / handbook-art-mobile-v2.webp / handbook-girl-v2.webp |

完整应用路径为 `public/design-assets/`。人物源图透明背景，应用尺寸 512×768；背景均不透明。图 01 的欢迎页清理与横向延展沿用 [此前记录](../ui-clarity-20261018/README.md)。

## 本次生成编辑的提示要求

共同要求：以所提供 Word 切片为唯一构图参考，清除网页界面文字、卡片、控件及头像浮层，用连续、自然、同风格的原有山景补全遮挡区域。保留山峰、建筑、阶梯、松树、云雾、人物及色彩关系。不要新增标题、标签、边框、重复山峰、水平或矩形拼接、占位区域。手机和桌面分别编辑，不从另一种比例的图上拼贴局部。

- 地图：完整移除目标卡、景点浮签、搜索、缩放条和问山头像；手机只保留原来的一座主峰，补全连续登山道路，避免贴入桌面山顶。
- 路线：去除左侧标题、路线卡、说明区、右侧节点标签和虚线，保留右侧整座山和左侧安静纸色/云雾；应用端仅裁出山景和安静天空，浮签重新绘制。
- 手札：清除标题、说明、上次游历卡、按钮和其他界面元素，补回山景。独立人物编辑保留原人物服饰、背包、读册姿态与轮廓，去除纸底及卡片，输出透明背景。
- 回顾：桌面与手机分别去除标题、固定探索数量、三枚印章、三张记忆卡和底部按钮；保留日出、南天门建筑及物理山石题字，桌面保留左下角人物，补回原来连续山景。
- 学习：桌面清除导航、所有文字/卡片/练习/按钮，保留左侧台阶、寺庙、五岳独尊山石和读书人物；手机清除两大内容卡和所有界面元素，保留顶部山峰、左侧寺庙及安静天空，补回被遮挡山景。

以上是留存的生成约束及用途记录；生成区域不作原始像素一致声明。

## 从原 Word 切片直接裁出的插画

- 路线缩略图 `route-art-0..3.webp`；保留四张原画。
- 图集 `gallery-art-0..4.webp`；只取绘画，不含下方说明。
- 文博 `museum-art-clean-v2.webp` 和 `museum-nav-art-v2.webp`；去除旧工具条及底部旧菜单残字。
- 学习 `study-stone-art-v2.webp`；只取山石插画。
- 回顾 `review-card-art-0..2-v2.webp` 与 `review-stamp-*-v2.webp`；卡片只取插画，印章为原稿装饰，不将印章字形作为动态界面文字。

准确裁剪坐标、源图、尺寸和 SHA-256 均保留在素材清单及重建脚本内。标题字体许可与字符表在 `public/fonts/`；最新版本是 `ma-shan-zheng-ui-v3.ttf`，保留旧版本以支持缓存中的旧页面。
