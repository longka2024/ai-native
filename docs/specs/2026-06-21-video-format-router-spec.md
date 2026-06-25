# Spec — 视频形态智能选片(文案 → 推荐视频类型)2026-06-21

## 1. 为什么(背景)
投资人看了单一 AI 剧情视频仍判"电子垃圾/没特点"。根因不是制作质量,是**单一形态套所有文案 = 千篇一律 AI 味**。
用户定调:**"打通什么文案就推荐什么类型的视频"** —— 不全是 AI 生成,还有混剪、口播、漫画、泥人偶等。
本质是"文案为先 + 人性化分流":系统读懂文案 → 推荐最配的形态 → 小妹挑了进对应产线。

## 2. 做什么(范围)
第 10 步(视频平台)生产区顶部加一层 **「智能选片」**:
- **推荐路由(脚本规则,免费即时,符合"脚本>大模型")**:读文案类型/情绪/意图 → 给每种形态打分 → 推荐 1-2 种(标"推荐"+理由)。
- **统一分流入口**:列出全部形态(emoji/适合/成本/样例),小妹点选 → 下方只显示该形态的生产面板(不再全堆叠)。

## 3. 形态菜单 ↔ 文案类型 ↔ 技术基座弹药
| 形态 | 适合文案 | 用什么做 | v1 状态 |
|---|---|---|---|
| 🎬 AI 剧情 | 情绪/故事/痛点/逆袭 | seedance-prompt + Kie(已通) | ✅ |
| 🧸 泥人偶定格 | 治愈/反差萌/慢生活 | seedance 换 claymation 风格词(同引擎) | ✅ |
| 🎙️ 口播 | 观点/态度/带教/认知 | oral 线(composeOralVideo)+ 卡通形象 | ✅ |
| 🎞️ 混剪 B-roll | 盘点/种草/清单/对比 | broll-pexels.mjs(空镜+配音+字幕) | ✅ |
| 🖼️ 漫画/信息图 | 知识/干货/步骤/教程 | baoyu-comic/infographic/ian-xiaohei(skills) | 🟡 建设中 |
| 📊 数据视频 | 数据/复盘/榜单 | remotion(基座有) | 🟡 建设中 |

## 4. 怎么做(实现)
- 新文件 `video-format-router.js`:`VIDEO_FORMATS` 元数据 + `classifyVideoFormats(copy,title,workspace)` → `{ranked, top, signal, reason}`。规则关键词打分,workspace 加权。未 ready 的形态若得分最高,推荐回落到最高分的 ready 形态。
- `workbench-main.js`:`state.videoFormat`;`renderVideoFormatPicker()`(推荐+chips)+ `renderSelectedVideoPanel()`(按 videoFormat 路由到 seedance/oral/建设中);第 10 步 isVideo 分支改成"选片器 + 选中面板";clay 时给 seedance 注入泥偶风格词;绑定 chip 点击。
- `workbench-v2.html`:引入 router 文件 + bump workbench-main 版本。
- **纯前端,不动后端、不重启**(分类/路由/clay 风格注入都在前端;三条产线复用已有端点)。

## 5. 验收
- 进入视频平台第 10 步 → 顶部出现「智能选片」,系统按文案推荐一种形态(带理由)。
- 点不同 chip → 下方切换对应产线面板(AI剧情/泥人偶→分镜出片;口播/混剪→口播片合成;漫画/数据→建设中说明)。
- 选泥人偶 → seedance 分镜出黏土定格风。
- 不破坏现有 xhs/公众号 的"可选做短视频"。
