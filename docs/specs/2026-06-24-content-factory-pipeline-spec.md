# Spec — 内容工厂自驱动管线(素材 → 自动匹配 → 质检出片)2026-06-24

## 名字
内容工厂自驱动管线(Content Factory Pipeline)

## 触发词
- "按内容工厂管线"
- "素材自动匹配"
- "档库 + 匹配器"
- "别再给单客户手搓"

## 为什么(背景)
现状:做 mizan 视频时,是"一单一手搓"——手写一份 DESIGN.md、手配每个 beat 的镜头、手调每处效果。这是**工具思维**,违反产品化北极星([[2026-06-16-productization-principle]]:能力沉后端、客户零技术拿结果、数据复利=护城河)。

用户要的是**系统**:素材一进来,系统自己**梳理→存→优化**;再根据内容**自动匹配**该用什么模板/配图/效果/配色;审美与质量是**沉淀进系统的规则与质量门**,不是每次现喊 skill 现搓。同一批素材换内容/换档,自动出不同观感的片,30 条各不同。

对应技术基座 10 层([[2026-06-21-tech-base-ledger-standing-rule]]):素材资产层(4)→ 内容创作层(5)→ 视觉层(6)→ 视频层(8)→ QA层(10)。

## 与现有视频生产线的区别(边界,别重复造)
现有视频线(命令中心 app 内):`video-format-router.js`(文案→形态:AI剧情/泥偶/口播/混剪/漫画/数据)+ `video-compose.mjs`(ffmpeg **简单拼接口播**:片段+音轨+烧字幕 concat,明确"不做 Ken Burns")+ `kie-video.mjs`(Kie AI 生成片段)。服务 4 条内容线(美容/留学/女性/AI)小妹日常,**内容从选题/文案来**。

本管线**本质不同**:
| 维度 | 现有视频线 | 本内容工厂管线 |
|---|---|---|
| 输入 | 平台选题/文案先行 | **客户真实素材(实拍)先行** |
| 引擎 | ffmpeg 简单拼接 / Kie 生成 | **Remotion 高级效果模板引擎**(转场/景深/大数字/灰透字幕) |
| 场景 | 4 条内容线日常运营 | **急单代剪 / 混剪工厂 / 代运营打样**(mizan 型) |
| 产能 | 一条一条配 | 同批素材**批量出几十条各不同** |

关系:本线 = router 里「混剪 B-roll」形态的**高级升级专线**,但**独立成体系**(素材资产层+档库+匹配器),**不改、不替换现有 video-compose 口播线 / format-router / kie-video**。后续若要接入,只在 router 给「混剪 B-roll」加一个"高级混剪(Remotion)"出口,不动现有口播链路。

## 已有种子(阶段0,不重做)
- **效果模板引擎**:`video-remotion/src/engine/rules.ts`(文案节拍×镜头特色→效果决策)+ `EffectEngine.tsx`(数据驱动渲染)+ `factory.mjs`(bundle 一次循环出 N 条)。
- **配音档**:IndexTTS2 本机免费,`engine/voices.ts`(voice_04男/01男/03女/08女轮换),编排器 `G:\index-tts_v2.5\build_mizan.py`(文案→逐beat配音→精确时间轴)。
- **素材打标种子**:GLM-5V 给素材打过标(`C:\tmp\inventory.json` 65 条:场景/品类/desc)。
- **质量门清单**([[three-quality-gates-mandatory]]):文字=dbs-ai-check+humanizer-zh;视觉=open-design+taste-skill/design-taste-frontend;视频=video-use+gstack。
- **mizan 视觉定稿**:`video-studio/mizan-line/DESIGN.md`(暖金 #F2B33D + 未念灰透字幕 + 细边浮起数字/标题 + 开场点睛 + 分区)= 风格档库的**第一张档**。

## 范围(分阶段;本 spec 先做阶段1+2,跑通 mizan 再放量)

### 阶段1 — 素材资产层(自动梳理/存/优化)
- 客户素材目录进来 → 脚本自动:① **梳理**:GLM-5V 逐条打标(场景/品类/运镜/情绪/可用质量分),② **存**:结构化写入资产库(本地 SQLite 起步,可同步 122 PG),③ **优化**:自动归一化(竖屏 1080×1920 裁切 / 抽优质段 / 剔抖剔糊)。
- 产出:`assets.db`(每条:path/scene/category/motion/quality/normalized_clip)+ 归一化后的 clip 库。

### 阶段2 — 风格档库 + 内容→档匹配器
- **风格档库**:把"档"做成可枚举数据(暂:数据硬核/快剪带感/慢剪高级 × 配色档),mizan 暖金为第一张。每档 = {转场偏好, 景深参数, 配色 hex, 字幕样式, 字号}。
- **匹配器**:输入(行业 + 文案节拍序列 + 目标平台)→ 输出(选哪张风格档 + 每个 beat 配哪条资产 clip〔语义匹配:念五金调五金〕+ 配哪个配音档)。匹配规则即 `rules.ts` 的扩展。
- 产出:`matcher.mjs`,吃 {industry, script, platform} 吐 EffectEngine 的完整 Script JSON(含 clips/voice/style/cap)。

### 阶段2.5 — 关键词洞察层 / SEO 选词器(本期先手工跑通方法,再沉淀成工具)
"搜关键词→摸搜索热度→定选词→70/30 写文案"这套方法本身要产品化(别每次手搓)。
- 输入:行业 + 目标地区列表 → ① MediaCrawlerPro/TrendRadar 采词热度(数笔记/赞,退出保号)② 按热度×意图×竞争排序选词 ③ 每词生成 70/30 文案大纲(70%真实进货路子+坑,30%mizan;地名织进标题/钩子/海外仓/收尾)+ 平台标题/标签。
- 产出:`tools/seo_keyword_miner`(本期先用网络搜+人工跑通,验证有效再脚本化)→ 吐"地区×搜索词"文案节拍喂下游匹配器。
- 详:`docs/strategy/mizan-seo-keyword-strategy.md`。

### 阶段3(本 spec 不做,列入 backlog)
质量门自动闭环:出片前文案过 dbs-ai-check/humanizer、帧过 taste-skill/GLM-5V、成片过 video-use/gstack;不过门自动回炉重选档/料。

## 禁止范围
- ❌ 不一次全做(阶段3 质量门闭环、客户开通 UI 都不在本期)。
- ❌ 不在客户端暴露内部名(43/Kie/cheat/档名/skill 名一律不出现,守 [[用户偏好]])。
- ❌ 不重构已认可的前端模块拆分结构(CLAUDE.md 纪律)。
- ❌ 不烧钱出片验证市场([[2026-06-21-stop-churning-ai-videos]]:渲染/配音本机免费可放量,但 Kie/数字人等付费动作仍要 [[2026-06-22-paid-action-consent]])。
- ❌ 不手搓第二个客户的 DESIGN.md——新客户走"匹配器选档",缺档才补档库。
- ❌ **不改、不替换现有视频线**(video-compose.mjs 口播 / video-format-router.js / kie-video.mjs)——本线独立成体系,只在需要时给 router「混剪 B-roll」加高级出口。

## 怎么做(实现 · 阶段1+2)
1. `tools/asset_ingest.py`:扫客户素材目录 → GLM-5V 打标 → ffmpeg 归一化 → 写 `assets.db`。复用现有 GLM-5V 调用(vision-judge 同 key)。
2. `video-remotion/src/engine/styles-library.ts`:风格档库(数据化,mizan 暖金 = 第一条;rules.ts 的 STYLES 并入)。
3. `video-remotion/matcher.mjs`:{industry, script(beats 文案+kind), platform} → 查 assets.db 语义配 clip + 选档 + 选配音 → 吐 Script JSON。
4. 串起来:`asset_ingest` → `matcher` → `build_mizan.py`(配音+时间轴) → `factory.mjs`(批量渲染)。
5. 跑通验证:用 mizan 现有素材 + 3 份不同文案,匹配器自动出 3 条不同观感片(零手搓)。

## 验收标准
- [ ] 把 mizan 素材目录丢给 `asset_ingest.py`,`assets.db` 自动生成,每条有场景/品类/质量分 + 归一化 clip。
- [ ] `matcher.mjs` 喂一份新文案(只给 beats 文字+节拍 + industry),自动吐出可直接渲染的 Script JSON(clips 语义匹配、选了档、选了配音),**无人工配镜头**。
- [ ] 用匹配器跑 3 份不同 mizan 文案 → 出 3 条片,画面各对应文案、风格档可切换出不同观感,**全程零手搓 DESIGN/无手配 beat**。
- [ ] 配音/渲染全本机免费,无付费动作。
- [ ] mizan 暖金定稿视觉作为第一张档可被匹配器调用复现。

## 已拍板
- **素材资产库 = A 本地 SQLite**(`assets.db`,单机先跑通;阶段3 再考虑同步 122 PG)。用户 2026-06-24 确认。
