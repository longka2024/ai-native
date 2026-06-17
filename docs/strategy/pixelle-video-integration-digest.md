# Pixelle-Video 后端化接入消化笔记（2026-06-17 深挖）

源:`external/pixelle-video`(AIDC-AI,22.8k★)。目标:当**后端服务、HTTP API 程序化驱动**接进 Longka 做口播成片,不开 streamlit。配套任务 #11。

## 定性
它**就是个 FastAPI 服务**(`api/app.py`),streamlit web 只是另一个壳,**全部能力纯 HTTP 可调、不依赖 streamlit、不依赖 GPU/ComfyUI**(走直连API或static模板时)。接 Longka 完全可行。

## 关键 API(`uv run python api/app.py --port 8000`,Swagger /docs)
- `POST /api/video/generate/async` → 返回 task_id(异步出片)
- `GET /api/tasks/{id}` → 查状态 pending→running→completed/failed;completed 时 result={video_url,duration,file_size}。**注意:任务纯内存、进程重启全丢、progress 基本为空只能看 status** → Longka 侧自己存 task_id + 兜底重试。
- `GET /api/files/<task>/final.mp4` → 下载成片
- 颗粒端点:`/api/content/narration`(文案分段)、`/api/tts/synthesize`(配音)、`/api/image/generate`、`/api/frame/render`、`/api/resources/templates|bgm`
- 提交体(`api/schemas/video.py`):`text`(主题或固定稿)、`mode`(generate=LLM按主题分镜 / **fixed=把稿逐行拆,口播稿就用这个**)、`frame_template`(必填,定画幅,如 `1080x1920/static_default.html`)、`tts_workflow/voice`、`media_workflow`、`prompt_prefix`、`bgm_path/bgm_volume`、`template_params`、`n_scenes`

## 管线(standard,8 阶段,`pixelle_video/pipelines/standard.py`)
环境→生成文案→定标题→规划配图(**static模板跳过**)→建分镜→**逐帧产出(TTS配音+配图/片段+Playwright渲染HTML帧+合成单段)**→ffmpeg拼接+混BGM→产出。
- 合成靠系统 **ffmpeg**(`ffmpeg-python`),不依赖 ComfyUI。字幕=HTML模板 `{{text}}`,每段时长由该段 TTS 音频驱动,天然对齐。

## Provider 抽象 + Kie 可行性(核心)
- 媒体生成按 workflow 名分流(`services/media.py`):名以 **`api/` 开头→直连API provider(无需ComfyUI)**;否则走 ComfyUI/RunningHub。
- 直连 provider 在 `services/api_services/`,**字符串匹配分发**(`video_client.py`:`if "kling"/"seedance"/"wan" in model`)。schema 支持 openai/dashscope/deepseek/gemini/ark/kling。
- **Seedance = 火山 ARK**(`video_seedance.py`,base_url `ark.cn-beijing.volces.com`,内部就是 createTask→5s轮询)。Kling 同样 createTask→轮询。
- **接 Kie(createTask→recordInfo 轮询)非常可行、难度低**:照抄 video_kling.py 写 `video_kie.py` + video_client 加分支 + schema/config 加 kie provider,约 **8-13h**、新文件外改动<100行。
- **LLM 是 OpenAI 兼容 → 直接指 DeepSeek**(`base_url https://api.deepseek.com`),与 Longka 写作主力对齐。

## TTS:edge-tts 免费本地(`config: comfyui.tts.inference_mode=local`,默认 voice zh-CN-YunjianNeural),无需 key/ComfyUI,已是硬依赖。

## 最小部署(无GPU/无ComfyUI)
Docker 单 api 容器(8000),Dockerfile 已装 **ffmpeg + 中文字体 fonts-noto-cjk + Chromium**。docker-compose 起 api+web,**接 Longka 只起 api**。依赖:FastAPI/uvicorn/comfykit/playwright/ffmpeg-python/moviepy/edge-tts/openai。Python≥3.11。
- 122 注意:新端口(8000)+ nginx 反代;output/ 挂卷持久化;任务内存态要 Longka 兜底。

## 推荐落地路径(对齐四铁律:稳定>花哨/脚本>大模型/能不花钱/国内线)
1. **第一版(最省钱,先跑通端到端):** Pixelle api 容器 + **`static_*` 模板**(零图像/视频API、零ComfyUI)+ DeepSeek文案 + edge-tts免费配音 + ffmpeg。Longka 调 async→轮询→取 mp4。**全程不花媒体API钱**,先证明口播链路通。
2. **第二版(动态画面):** `image_*`/`video_*` 模板 + 直连API provider 出图/片段。要么给 Pixelle 配**原生 ARK(Seedance)/DashScope** key(零代码、开箱即用),要么写 `video_kie.py` 复用 Kie 额度(1天活)。
3. **AI 视频片段(独立短片)**:Longka 直接接 Kie(kie-video.mjs)更轻,或复用 Pixelle 的 video provider。

## 最小调用序列
`POST /api/video/generate/async {text:口播稿, mode:"fixed", frame_template:"1080x1920/static_default.html", bgm_path:"bgm/default.mp3", bgm_volume:0.25}` → 轮询 `/api/tasks/{id}` 到 completed → 取 `result.video_url`(/api/files/...final.mp4)。
