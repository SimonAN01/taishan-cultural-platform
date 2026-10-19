# 地图底图断层修复

用户截图为 1016×1352 像素，复现使用 508×676 CSS 像素、DPR 2、地图缩放 113%。

问题来自旧 `map-clean-mobile.webp`：将桌面底图裁成不同区域贴到手机图上，山峰尺寸及位置不一致，留下水平断层。另有旧移动样式把“问山”文字绝对定位到按钮下方，造成控件重叠。

修复将地图改为原生 `picture`，分别加载一整幅手机/桌面底图，移除 CSS `content:url(...)` 切换和旧补丁生成逻辑。原文件保留供历史版本使用，应用不再引用。问山文字随头像在同一按钮内排布；手机按钮收窄以避开红门标签。宽手机初始相机从画面顶部展示，下面的路径可拖动查看。

## 素材

使用内置 `image_gen` 分别编辑 Word 图 03 的桌面与手机原图，去除目标卡、景点浮签、头像、搜索框和缩放条，补回它们遮挡的山景，保持原构图、建筑、登山石阶及水墨色调。没有将桌面区域贴入手机图，也没有透明素材或占位图。

- 手机原始编辑结果：[map-mobile-clean-v2.png](../ui-clarity-20261018/sources/map-mobile-clean-v2.png)，应用素材 [map-art-mobile-v2.webp](../../../public/design-assets/map-art-mobile-v2.webp)。
- 桌面原始编辑结果：[map-desktop-clean-v2.png](../ui-clarity-20261018/sources/map-desktop-clean-v2.png)，应用素材 [map-art-desktop-v2.webp](../../../public/design-assets/map-art-desktop-v2.webp)。

提示要求：只去除网页浮层、标签及头像，连续补全被挡的山景；保留山峰、建筑、红门、石阶、瀑布和松树的位置及比例；手机图仅保留原来那一座主峰，不从桌面图复制另一座山；不得留下文字、按钮、矩形拼接或重复山峰。两幅画由工具分别编辑，最终只转为无损 WebP，未再次拼接。清理区域为生成修复，不是原始高清素材，也不作逐像素相同声明。

运行 `python3 scripts/refine-native-ui-assets.py` 可从留存源图重建。来源和 SHA-256 在 [素材清单](../../../public/design-assets/manifest.json)。

## 验证与发布

- 32 项单元测试、Vite 构建、10 条主要操作回归通过；构建仍有原有 JS 包体积提示。
- [地图专项检查](map-checks.json)：309×767、508×676、532×752、1211×810、1900×900，分别检查 100%、113%、160%；底图为单张新素材，画布不露白，问山文字不越出按钮，搜索定位可用，无横向溢出及脚本错误。
- 已逐张查看整幅底图、用户同尺寸的 113% 截图和手机/桌面画面，重点核对主峰、石阶连续性及右下角控件。

线上入口：[地图修正版](https://118.89.176.236/experience/?ui=20261018-map-v2#map)。前端发布前保留完整备份，逐文件核对哈希后替换入口；数据库和后端服务未修改。最终文件与备份信息见 [release-manifest.json](release-manifest.json)、[deployment.json](deployment.json)，公网核对见 `live-checks.json`。
