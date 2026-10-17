# 一山千年 泰山文化体验

> 当前集成分支的 Coze、云端识图、环境变量与自检步骤，请先阅读[根目录 README 的配置指南](../README.md#智能体ai-识图与语音配置)。下文部分部署记录为早期版本；当前私有分支已包含授权共享的后端团队凭证，使用 `./start.sh` 自动加载；本机覆盖、服务器私钥和证书仍不提交。

当前后端版本1.7.1：http://118.89.176.236:8037/ 。实际完成情况与尚未完成事项见`docs/方案落实与功能审查.md`，不能把效果图、模型文件存在或接口可调用当成方案已验收。

## 本地运行

在仓库根目录按根 README 构建前端。进入本目录后安装后端依赖并启动：

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements.lock.txt
./start.sh
```

默认地址为 `http://127.0.0.1:18605/`；沉浸入口为 `/experience/`。启动脚本自动加载 `config/team.env`，团队无需填写密钥或下载本地模型。可选本机 `.env` 会覆盖团队配置，空白模板中的空 Key 也会覆盖已填值。

未配置语言模型时，问答直接返回有出处的文化资料；云端识景由现有模型API提供；未配置服务时返回未就绪状态。只有显式选择VISION_BACKEND=local才使用本地CLIP权重。BGE不可用时降级为文字检索。API不会将这些降级情况显示为模型生成。

## 技术与数据

前端为原生HTML/CSS/JavaScript模块，地图采用图像、SVG线路与交互节点。后端为FastAPI，匿名会话、足迹、文化章节进度、收藏、对话、识景记录保存在SQLite。语言模型只从后端访问，团队默认文本问山使用 Coze，云端识图使用 DeepSeek V4.1 Flash 服务。BGE用于中文资料检索，线上识景使用现有DeepSeek云端图像理解，不加载本地视觉模型；CLIP仅保留可选研究基线。

`data/catalog.json`统一保存景点、路线、交通方式、历史、诗词、文博介绍和资料来源。实景照片署名与许可同样随目录返回。`data/image_library`是独立采集候选库，尚未按训练/验证/测试划分，也没有训练完成的准确率。

主要接口：`GET /api/catalog`、`GET /api/health`、`POST /api/agent/chat`、`GET /api/agent/history`、`POST /api/vision/recognize`、`POST /api/vision/predictions/{id}/confirm`、`GET /api/journey`、`POST /api/journey/visit`、`POST /api/journey/favorite`、`POST /api/story/chapters/{id}/answer`、`DELETE /api/journey`。浏览器访问`/docs`可查看完整OpenAPI说明。

## 验证

```sh
.venv/bin/python -m unittest discover -s tests -v
```

测试使用隔离数据库；识景空白图测试调用真实CLIP权重，模型未安装时明确跳过。部分故障和并发测试使用测试替身，不代表线上模型评测。公网真实模型验收记录在`docs/公网问答验收.json`。

## 当前服务器

本项目位于`/opt/taishan`，专用systemd服务`taishan.service`运行在127.0.0.1:18600，Nginx监听8037和80端口。安装配置位于`deployment/`。更新时保留`.env`、`runtime/`和`models/`，不要覆盖会话数据库。上传前端与后端后验证Nginx配置并重启本项目服务。

```sh
sudo nginx -t
sudo systemctl restart taishan
sudo systemctl reload nginx
```

本次更新前的代码、Nginx配置及一致性数据库备份保存在服务器`/opt/taishan/runtime/before-audit-20261014-161159/`。数据库迁移只新增字段与文化进度表，当前更新未删除已有用户记录。回滚前停服务并保留更新后的数据库，避免丢失新记录；代码回滚通常可以继续使用新增字段后的数据库。

## 图片与角色

15处景点、20张实景照片来自Wikimedia Commons，文件说明、摄影者和许可见`docs/实景照片来源.json`与页面图注。长卷、角色、路线与门阙概念插画依据方案参考重建，包含AI辅助生成；不能当作实景测绘。数字人目前是二维角色图，不是已交付的Blender三维人物。参赛时应说明团队实际策划、实现、修改和AI工具使用情况。

## 1.2.0文化游历

五章主题从红门、经石峪、大观峰、玉皇顶到日观峰，依次理解山路、刻经、碑铭、诗词和遗产保护。每章打开对应景点后可答题；服务器校验章节顺序与答案，正确才保存进度，错误不增加进度。重复正确提交不累加。匿名会话互相隔离，清除记录也会清除章节进度。

诗词现有杜甫《望岳》和李白《游泰山》其一、其二，均含公版原文、原创逐句释读、收藏、朗读与来源。URL保存当前诗词和章节。问答接受`current_poem`、`current_route`，明确提问其他诗词时以用户指定为准。

本次20项自动检查通过，实际浏览器验证与公网模型记录见`docs/1.2.0更新与验收.md`。识景已切换为云端图像理解，未进行专属训练，也未测得独立测试准确率。
