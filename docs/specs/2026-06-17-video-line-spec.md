# 视频线 Spec（Pixelle 后端化接入 + Kie 片段）

- 日期：2026-06-17（用户确认深挖 + 方案后立 spec）
- 类型：开发 spec（新模块：视频线）
- 依据：`docs/strategy/pixelle-video-integration-digest.md`(深挖结论)；用户定调"片段+口播都要、复用 Kie key、不浪费钱测试、深挖不浅用"

## 背景
视频线纳入(2026-06-17 用户:"现在要碰了")。深挖 Pixelle-Video 后确认:它本质是 FastAPI 服务,纯 HTTP 可驱动、不要 GPU/ComfyUI、LLM 可指 DeepSeek、配音用免费 edge-tts、Seedance 原生支持(火山 ARK)、Kie 可作 provider 插入。两类需求:口播成片(Pixelle 编排)+ AI 视频片段(Kie 直出)。

## 1. 名字
视频线（Pixelle 口播成片 + Kie 视频片段）

## 2. 触发词
「视频线」「Pixelle」「口播视频」「视频片段」「出视频」「Seedance」

## 3. 范围（可执行动作，分期）

### A 口播成片（Pixelle 后端化）
- **A1（先做·零媒体花费验证）**:122 部署 Pixelle **api 容器**(docker,只起 api 不起 streamlit,新端口 8000 + nginx 反代);config 配 **DeepSeek(LLM)+ edge-tts 本地配音(inference_mode=local)**;用 **`static_*` 模板**(零图像/视频API、零ComfyUI)。Longka 后端调 `POST /api/video/generate/async`(mode=fixed 传口播稿)→ 轮询 `GET /api/tasks/{id}` → 取 `GET /api/files/<task>/final.mp4`。Longka 侧存 task_id + 兜底重试(Pixelle 任务内存态)。**产出:带配音+字幕+BGM 的口播 MP4。**
- **A2（动态画面)**:换 `image_*`/`video_*` 模板 + 直连 API provider 出图/片段。优先 Seedance(火山 ARK 原生,改 config 即可)或写 `video_kie.py` 复用 Kie 额度(照抄 video_kling.py,约 1 天)。

### B AI 视频片段（Kie 直出，Longka 内）
- 加 `kie-video.mjs`(照搬 `kie-image.mjs` 的 createTask→轮询 recordInfo),用 Kie 的 Seedance 等视频模型,文/图生短片段。制作中心加"生成视频片段"(可从封面图/分镜图 → 动态片段)。

### 贯穿
- 复用 Kie key(env)、DeepSeek、edge-tts;**不要 GPU、不要 ComfyUI**;客户端 UI 全大白话、不暴露 Pixelle/Kie/ARK/Seedance 等内部名。

## 4. 禁止范围
- ❌ 不开 Pixelle streamlit 给客户(只用其 api);不把 Pixelle 界面塞给小妹。
- ❌ 不重造 TTS/ffmpeg 合成轮子(用 Pixelle);改 Pixelle 源码只允许**加 provider 适配器(video_kie.py)**,不乱动其核心管线。
- ❌ 不裸测烧媒体 API 钱:第一版用 static 模板零媒体花费验证链路。
- ❌ MP4 持久化存储依赖火山云 OSS(仍 blocked),深集成前先用本地/临时 URL,不阻塞 A1。
- ❌ 不动图文线既有功能;不动前端模块拆分结构。
- ❌ 客户端不暴露任何服务商/内部名。

## 5. 验收标准
- **A1**:Longka 调 API → static 模板 + DeepSeek + edge-tts → 出一条带配音+字幕+BGM 的口播 MP4,在 Longka 能展示/下载;全程不要 GPU/ComfyUI、不烧媒体 API 钱。
- **A2**:换动态画面模板 + Seedance(ARK 或 Kie)→ 口播成片带 AI 动态画面。
- **B**:Longka 制作中心从一张图/一段提示 → Kie 出一个短视频片段并展示。
- 客户端零黑话(不出现 Pixelle/Kie/ARK)。
- 各阶段独立可验收;A1 先落地。

## 执行优先级
A1（零花钱跑通口播)→ B（Kie 片段,可并行)→ A2（动态画面增强)。

## 进度（滚动更新）

- **B（Kie 片段，Longka 内）= 后端完成**：`apps/command-center-prototype/kie-video.mjs` + `/api/video-clip/start`、`/api/video-clip/status`（镜像 kie-image 的 createTask→轮询 recordInfo）。前端制作中心入口待接（定调：先图生视频、留文生开关）。
- **A2（Kie 接进 Pixelle provider）= 代码完成，待 122 端到端验证**：
  - 图像侧：`image_kie.py` + `IMAGE_MODELS["kie"]=["kie-image"]` + image_client 路由 + config schema/模板 `kie:` 入口。模板选 `api/kie/kie-image` 即走 Kie。
  - 视频侧：`video_kie.py` + `VIDEO_MODELS["kie"]=["kie-video"]` + video_client 路由 + capability 条目 + `_create_video_client` 传 key。模板选 `api/kie/kie-video` 即走 Kie。
  - Kie key：优先 `api_providers.kie.api_key`（config），留空回退 env `KIE_API_KEY`；实际模型 env `KIE_IMAGE_MODEL` / `KIE_VIDEO_MODEL` 控（视频默认 `bytedance/seedance-2-fast`）。
  - **首帧图生视频（已补稳）**：Kie 用 `input.first_frame_url`（URL）。`video_kie.py` 现先把本地图直传 Kie 文件服务 `file-stream-upload`（env `KIE_UPLOAD_URL`/`KIE_UPLOAD_PATH` 可覆盖）换托管 `fileUrl` 再喂首帧；上传失败才退回 base64 data-uri（带告警）；http(s)/data URL 透传；图不存在 raise。122 上配好 key 后图生视频可直接验。
  - **仍待办**：`image_kie.py` 目前仅文生图（忽略 image_paths 参考图），需要参考图一致性时再补。
