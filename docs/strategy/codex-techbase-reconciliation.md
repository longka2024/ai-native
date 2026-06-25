# Codex 技术基座 × 现状 真账（2026-06-17,逐条核运行代码）

## 🔄 2026-06-21 进度更新(在 06-19 基础上)
- **skills-runner 真接 skill 现 10 个**(+`cover-designer` 封面规范库):接进 ②做封面 链路 = `cover-from-content`(真实料痛点钩子·"说什么")→ `cover-designer`(四原型/具象物/无人脸/高CTR版式·"长什么样")→ 风格锁(配图风格一致,封面内页不打架)→ Kie 出图。验证:archetype 按标题类型自动选(痛点提问型),coverPrompt 尊重所选风格。→ **窟窿「封面校准/封面规范」✅ 补上**。
- **窟窿 #4 数据回填+retro ✅**:cheat `retro`/`board` 接进 UI —— 作品记录每条「📊发布后复盘·填发布后数据」+ 独立「数据看板」页(open-design linear-app 风),调 `/api/cheat/blind-predict|retro|board`。
- **窟窿 #6 taste 审美门 🟡进行中**:数据看板按 open-design `design-systems/linear-app/DESIGN.md` 重做(深色 premium)+ 过 taste-skill Quality Gate(唯一缺:Inter 字体未自托管,形似神略欠)。
- **获客脚本 → 口播成品视频 ✅**:`acquisition-video-script`(获客三步框架+营销三把刀+真实料)→ `/api/oral-video/compose`(MiniMax配音+Pexels空镜+烧字幕+ffmpeg拼)→ 成品竖屏 mp4,零实拍。
- **出图持久化 ✅**:finalWork 图原是 Kie 临时链(会过期)→ 保存时 `persistWorkImages` 下载落 122 `media/xhs-works/`,永久可追溯、同源可下载。
- **仍未接真窟窿**:#2 Kami 交付排版、#5 朱雀 AI 检测、#7 人像封面(cover-replicator 人像向)、dbs-content/dbs-hook 扶正。
- **下一步大方向**:关键帧 → AI 图生视频(抖音精品短视频,反PPT;kie-video.mjs 后端已测,待接成流水线)。判据:跑通路径必须产「优质内容」才算成立。

---

## 🎬 视频生产线 · 基座对账 + 融合设计（2026-06-21,深读真代码）

> 用户指令:把 80+ 基座逐个评估,有用功能融进项目,接没接+理由全记这里。本节是"视频簇"。
> 融合原则:**取长补短** —— 各家取它最强的一环,别整仓硬塞;垃圾部分(如自动选材)绕开。

### 融合后的视频线(三层,各归各位)
```
① 画面源:关键帧→AI图生视频(kie-video,精品/原创小黑) + Pexels/Pixabay/Coverr空镜(兜底) + 真实素材/上传
② 合成装配:MoneyPrinterTurbo 引擎(ffmpeg/moviepy,API化) + 配音换 MiniMax(国内) + 字幕/BGM/比例 用它的控件
③ 精修质检:video-use(Claude Code驱动ffmpeg:剪口水/调色/字幕精修/动画叠层/自评)
→ 成品 mp4 落122 → 作品记录/数据看板
```
内容→形态:情绪共鸣/故事(女性成长)=关键帧AI;干货(私校)=关键帧AI+空镜补;走量=Pexels空镜。全部经 MPT 合成、video-use 精修。

### 逐基座对账
| 基座 | 真身(读码确认) | 现状 | 该不该接 / 计划 |
|---|---|---|---|
| **MoneyPrinterTurbo**(`E:\Codex\MoneyPrinterTurbo`,2026-06-18更新) | Python:Streamlit控制台 + **FastAPI**(`app/controllers/v1/video.py`:POST /videos·/subtitle·/audio,/tasks,/bgm) + moviepy/ffmpeg合成引擎(`app/services/video.py` concat+字幕+codec兜底);素材 Pexels/Pixabay/**Coverr**(material.py);控件:字幕样式/位置/淡入淡出、BGM+音量+自定义、自定义音频、片段时长、voice | ❌没接 | **该接(地基)**。取它**合成引擎+控制台+3家素材**,**绕开它的自动脚本→自动选材(用户实测=文不对题电子垃圾)**。计划:122 Docker 服务化(repo自带docker-compose),Node 调 /videos API,喂"我们自己的脚本+画面",配音替成 MiniMax。 |
| **video-use**(`E:\Codex\video-use`,github browser-use/video-use) | **Claude Code 技能**(SKILL.md + helpers/ ffmpeg脚本):丢素材→对话→final.mp4。能力:剪口水词/废镜、自动调色、剪辑点音频淡入淡出、烧字幕(2词大写可定制)、用 HyperFrames/Remotion/Manim 并行子agent生成**动画叠层**、每剪辑点**自渲染自评**、project.md存会话记忆。依赖 ffmpeg + ElevenLabs。 | ❌没接 | **该接(精修层)**。不是skills-runner那种stateless调用,是**agent驱动的ffmpeg剪辑师**。计划:122(有ffmpeg)由 agent/workflow 驱动,当"成片后精修门"。注:动画叠层依赖 HyperFrames(基座已有)。 |
| **kie-video**(关键帧→AI图生视频,seedance-2) | 本项目 `kie-video.mjs`:clip带imageUrl(首帧)+prompt→图生视频;`/api/video-clip/start|status` | 🟡后端已接,样片测试中(`vidsample-bailan` 在跑) | **该接(精品画面源)**。待:验证小黑漫画图生视频糊不糊→不糊则接成工作台流水线。Kie临时URL链式喂(Kie→Kie),绕开"海外抓122图"问题。 |
| **Pexels 空镜口播**(本项目现有) | `/api/oral-video/compose`:MiniMax配音+Pexels空镜+字幕+ffmpeg拼 | ✅已接 | **取长补短保留**:不当精品主力(通用空镜AI味),**并入 MPT 素材层**(Pexels→Pixabay/Coverr 3家),当兜底/补充画面源。 |
| 口播 compose(本项目现有 ffmpeg 拼) | `runOralCompose`/`video-compose.mjs` | ✅已接 | 将被 MPT 引擎**升级替代**(MPT字幕/转场/BGM更全);现有先留着不破坏。 |
| HyperFrames / Remotion / GSAP | 视频/动画基座 | 🟡部分 | video-use 的"动画叠层"会用到 HyperFrames →随 video-use 一起激活。 |
| MiniMax TTS | 国内配音 | ✅已接 | 作为 MPT/video-use 的**配音替代**(替掉它们默认的 edge-tts/ElevenLabs,省钱+国内快)。 |

### Seedance 分镜提示词簇(2026-06-21,自己爬资料)
> 重大认知纠偏:用户指出"单图微动≠视频",真做法=**分镜→每镜5-10s(文生/图生视频,运镜+具体动作)→拼接成片**(即梦/AI短剧玩法)。视频结果也"文案为先"(开头3秒钩子=文案)。
| 基座 | 真身 | 现状 / 计划 |
|---|---|---|
| **seedance2-skill**(github dexhunter,`E:\Codex\seedance2-skill`) | 即梦 Seedance 2.0 提示词语法 skill:@引用一致性(图片N作首帧/人物/场景/运镜/字体)、结构公式([主体]+[场景]+[动作]+[运镜]+[分时段]+[音频]+[风格])、运镜表、分时段(0-3s/3-6s…) | **✅ 已接 skills-runner = `seedance-prompt`**(SKILL.md 部署 122 `~/.claude/skills/seedance-prompt/`),端到端测通:摆烂文案→可粘进即梦的完整分镜(钩子+参考图清单+分时段+对白音色)。= **视频线的大脑**。 |
| **Seedance2-Storyboard-Generator**(github liangdabiao,`E:\Codex\Seedance2-Storyboard-Generator`) | 完整 Claude Code + Skill + Seedance 工作流:写剧本(四幕起承转合)→**素材编号 角色C/场景S/道具P** 一致性→生图(GPT-Image/Seedream/Nano Banana)→分镜(时间轴)→逐集视频延长无缝衔接。带 `seedance-storyboard-generator/SKILL.md` + `docs/structured-prompt.md` 手册 + 名著改编实战范例 | 🟡 **吸收升级**:把"素材编号C/S/P一致性系统 + 四幕剧本 + 引导式分镜流程"并进我们的 seedance-prompt 生成器。 |
| **awesome-seedance**(github ZeroLu,`E:\Codex\awesome-seedance`) | 分题材 best-prompt 公式库(Cinematic/广告/社媒/UGC/动画/**短剧**/VFX),格式 `[00-05s]Shot1…对白Cue` + Resources(API/用法) | 🟡 **当视频版「75公式库」**:按内容类型给 seedance-prompt 喂对应题材的高质量模板(类比 dbs-xhs-title)。 |
| **higgsfield-seedance2-jineng**(github beshuaxian,`E:\Codex\higgsfield-seedance2-jineng`) | **15 个按风格分的 Claude skill**(电影/3D/卡通/漫画转视频/打斗/动漫/商业/营销…),每个含:2秒钩子框架(10-12开场)+时间轴分段+运镜百科(15-20+)+灯光+声音+@引用策略+平台优化(抖音/TikTok/IG/YT)+5条产品级范例 | 🟡 **最强吸收源**:按内容风格路由(女性成长情绪→电影/卡通;获客→商业营销),把对应 skill 的 2秒钩子框架+运镜百科+平台优化 折进/分流到 seedance-prompt。 |
| **moyin-creator 魔因漫创**(github MemeCalculate,`E:\Codex\moyin-creator`) | 生产级 **Electron 桌面App**,五板块 剧本→角色→场景→导演→S级(Seedance),批量产短剧/番剧。TS+Electron+Vite,**AGPL** | 🟡 **UX/工作流参考**(那5板块=我们"做视频"分流该有的结构)。Electron+AGPL→不嵌不搬码。 |
| **ArcReel**(github ArcReel,`E:\Codex\ArcReel`) | 开源 **Web工作区**(React19+FastAPI+**Claude Agent SDK**),小说→短视频,多provider(Gemini/Veo、**Volcengine Ark=即梦/Seedance官方API**、Grok、OpenAI、Vidu),Docker,**AGPL** | 🟡 **架构北极星**(web+agent+多视频API,最像我们要做的)。**关键情报:Volcengine Ark=即梦API→将来可全自动调即梦出片(免手动粘)**。AGPL→参考架构,不搬码。 |
| 即梦约束 | 不收写实真人脸素材(自动拦截);`Cyberbara` 可绕过真人脸上传 | 记录备用;角色一致性默认用 AI 生成形象。 |

### Kie 视频 API 确切事实(2026-06-21 扒官方文档,别再重研究)
- **平台**:kie.ai 一个API接所有模型(比官方便宜~84%)。视频模型:**Seedance 2.0**(`bytedance/seedance-2` + `bytedance/seedance-2-fast`)、Veo 3.1、Kling、Hailuo、Wan、Runway、Sora 等全有。
- **Seedance 2.0 接口**:`POST /api/v1/jobs/createTask`,body `{model:"bytedance/seedance-2", input:{...}}`。input 字段:`prompt`(≤20000字)、**`reference_image_urls`(数组=即梦@图片多引用一致性,角色/场景跨镜不跳戏)**、`first_frame_url`/`last_frame_url`、`reference_video_urls`/`reference_audio_urls`、`generate_audio`、`resolution`(480p/720p/1080p默认720)、`aspect_ratio`、`duration`(4-15s默认5)。→ **即梦多镜一致性玩法 Kie 全支持,能全自动出片+可测。**
- **kie-video.mjs 已补 `reference_image_urls` 支持**(clip.referenceImageUrls / payload.referenceImageUrls)。
- **价格(美元/秒)**:480P $0.0575(带参考)/$0.095(纯文生);720P $0.125/$0.205;1080P $0.31/$0.51。→ **480P·15s ≈ $0.86-1.43(6-10元/条)**,720P≈$1.9-3.1,1080P≈$4.7-7.7。
- **省钱铁律**:① 分镜文本(DeepSeek)≈免费,随便出;② **出视频(Kie贵)必须手动确认+显示预估,绝不自动批量**;③ 默认 480P+不配音+带参考图(便宜档),满意再升720P;④ **最省=出分镜→粘进即梦(用用户自己即梦额度,我们$0)**,Kie全自动是"省事但花钱"的可选项。
- **坑**:视频 job 的 taskId 在内存,**pm2 重启会丢已付费任务句柄** → 待修:taskId 落库。

### 视频线两阶段(由 6 基座综合而定)
- **阶段1(现在建·半自动)**:工作台"做视频"分流 → `seedance-prompt` 生成器(吸收 higgsfield 2秒钩子/运镜百科 + Storyboard 素材编号C/S/P + awesome 题材库)→ 出即梦分镜 + 参考图清单(Kie生图)→ 小妹粘进即梦生成。**借即梦最强引擎,零新API成本。**
- **阶段2(后续·全自动)**:接 Volcengine Ark(即梦官方API,ArcReel 已示范)→ 系统直接出片,免手动粘。

### 接入顺序(地基→上层)
1. **seedance-prompt 生成器接工作台第10步"做视频"分流**(输入本篇文案→出即梦分镜+参考图清单→小妹粘进即梦生成)← 视频线大脑,已接skills-runner,差UI
2. 吸收 Storyboard-Generator 的素材编号(C/S/P)一致性 + awesome-seedance 题材公式库 → 升级生成器质量
3. 角色/场景参考图:用现有 Kie 生图(visual-engine)按 referenceImages 清单出图 → 喂即梦 @引用
4. MPT 服务化当**拼接合成引擎**(若即梦不出整片,用它拼分段)+ Pexels 并入素材层
5. video-use **精修层**后置(122 agent驱动:剪口水/调色/字幕/动画叠层)
6. kie-video(seedance API直生)= 备选自动化路径(即梦无API时)

---

## 🔄 2026-06-19 进度更新(在原 06-17 账基础上)
- **skills-runner 真接 skill 现 7 个**(06-17 时基本只有 humanizer/cover):`cover-from-content`、`humanizer-zh`、`dbs-ai-check`(死标签→已扶正真 runSkill)、`dbs-xhs-title`(已扶正)、`precheck-xhs`(新,小红书7维发布前判断=cheat score 静态内化)、`video-script-restructure`(新,爆款分镜)、`benchmark-deconstruct`(新,对标拆解=激活闲置 dbs 拆解)。
- **窟窿 #1 cheat 闭环:进行中** —— 已用 4 agent 全文吃透,出落地 spec `docs/specs/2026-06-19-cheat-engine-integration-spec.md`(P0-P3)。P0 第一块(对标拆解)✅ 接好跑通;接着 盲打分 + rubric 存 PG + 对标起锚。
- **窟窿 #3 dbs 教练扶正:部分**(ai-check/xhs-title 已扶正;content/hook 仍待)。
- **采集/视频侧新增真接**(06-17 后):43-Firecrawl keyless 海外抓取、Pexels 关键词匹配空镜(口播片自动配真实画面)、MiniMax TTS 口播、视频脚本重构、整片合成。
- **仍未接的真窟窿**:#2 Kami 交付排版、#4 数据回填+retro(=cheat P2)、#5 朱雀、#6 taste 审美门、#7 人像封面;dbs-content/hook 扶正。
- 其余结论(给~80、真窟窿就 backlog 7 条、操作者/参考不进产品)**仍成立**。

---


准绳:`longka_technical_base_ledger.md`(6/7)逐条;现状=grep **运行代码**(`apps/command-center-prototype/*.mjs *.js`,workbench-v2.html 实际加载的那批)。
图例:
- ✅ **真接**(运行代码里真在用)
- 🟡 **假接**(只是 `engine:'xxx'` 字符串标签 / 或只活在已废弃的 `app.js`·`app.backup`,而 workbench-v2.html 不加载它们 → 等于没接)
- ❌ **没接**(运行代码零引用)

> ⚠️ 关键校正:`app.js` / `app.backup*.js` 是**拆分前的老单体,已废弃、不被加载**。命中这些文件 = 没接。之前的软总账把这些误算成"接了"。

## 头条真数字
- ✅ 真接:**约 14**
- 🟡 假接(死标签/废弃文件):**约 12**(看着接了,其实没干活)
- ❌ 没接:**约 50+**
- 给的总量:**~80 基座 / 150+ 子技能**

**残酷但真实:给 ~80,真接 ~14。**

## 逐层真账

### 1 Spec/纪律
| 基座 | 现状 | 证据 |
|---|---|---|
| longka-ai-native-harness | ❌(只在注释/文档,运行无门禁) | workbench-v2.js 注释 |
| Superpowers | ❌ | 0 |
| Waza | 🟡 只在 app.backup | app.backup:5 |
| gstack | ❌ | 0 |
| Matt Pocock skills(12子) | ❌ | 0 |

### 2 工程
Kaku ❌ / Codex(编码agent,非产品)/ Context7 ❌

### 3 采集
| 基座 | 现状 | 证据 |
|---|---|---|
| MediaCrawlerPro | ✅ | collector-hub.mjs:26 + server 多个 endpoint |
| XCrawl | ✅ | collector-hub.mjs:25 + xcrawl/x-user-tweets |
| 八爪鱼/Octoparse | ❌ | 0 |
| Agent-Reach | ❌ | 0 |
| web-access | ❌ | 0 |
| baoyu-url-to-markdown / defuddle / apify | ❌ | 0(正文抓取用自研 fetch-article 代替) |
| wechat-assistant / wechat-radar | 🟡 只在 app.backup | app.backup:13/21 |
| wx-cli / wechat-cli | ❌ | 0 |

### 4 内容资产
| 基座 | 现状 | 证据 |
|---|---|---|
| PostgreSQL(122) | ✅ | collector-hub.mjs:8 + final-works/samples |
| SQLite(客户包) | ✅ | server.mjs:27 |
| Obsidian / Airtable/飞书 | 🟡 仅关键词正则提了一下 | collector-hub.mjs:1224 |
| NotebookLM | ❌ | 0 |
| dbs-content-system | ❌ | 0 |
| dbs-deconstruct | ❌(命中是 "deconstruction" 误报) | collector-hub.mjs:392 |
| dbs-benchmark / afa-dtc / SaaS模板 | ❌ | 0 |

### 5 内容创作
| 基座 | 现状 | 证据 |
|---|---|---|
| humanizer-zh | ✅ 真调(每版去AI味) | skills-runner.mjs:48 + rewrite-engine 调用 |
| dbs-content / dbs-hook / dbs-xhs-title / dbs-ai-check | 🟡 **死标签**(只是 `engine:'xxx'` 字符串,没真 runSkill) | server.mjs:3027/3034/3041/3055 |
| content-research-writer / copywriting / social-content / content-strategy / marketing-psychology / write | ❌ | 0 |

### 6 视觉
| 基座 | 现状 | 证据 |
|---|---|---|
| ian-xiaohei(小黑) | ✅ 方法论内化 | config.js 风格契约 + kie-image.mjs |
| guizang(归藏) | ✅ 方法论内化 | config.js + server.mjs:3048 |
| juju(卷卷) | ✅ 方法论内化 | config.js:5 |
| Kie 出图(今天) | ✅ | kie-image.mjs |
| cover-from-content(今天) | ✅ | skills-runner.mjs:18 |
| baoyu-*(xhs-images/cover/infographic…) | 🟡 仅作 route 标签名 | config.js:44 |
| open-design | 🟡 仅文字建议 | server.mjs:3556 |
| taste-skill / html-anything | 🟡 仅 app.js(废弃) | app.js:45/37 |
| impeccable | ❌ | 0 |

### 7 排版/交付 —— **整层 0**
Kami ❌ / baoyu-format-markdown ❌ / baoyu-markdown-to-html ❌ / baoyu-post-to-wechat ❌ / wechat-article-publisher ❌
→ **公众号长文/报告/一页纸 交付排版 完全没接。**

### 8 视频 —— **整层基本 0**(本阶段不碰)
remotion/video-use/GSAP 仅 app.js 或误报;hyperframes/elevenlabs/xiaomei-promo/MoneyPrinter ❌

### 9 发布/风控
post-to-x / x-article-publisher ❌;"fingerprint" 命中是 `diagnoseAiFingerprints`(AI痕迹,误报);proxy 字段在采集层(🟡)。→ 发布自动化 0。

### 10 QA/Ship —— **整层 0**
Playwright ❌ / webapp-testing ❌ / design-review ❌ / land-and-deploy ❌ / gstack ❌

## 三个汇总

**【✅ 真接 ~14】** MediaCrawlerPro、XCrawl、TrendRadar、AI HOT、fetch-article、hot30、PostgreSQL、SQLite、humanizer-zh、xiaohei、guizang、juju、Kie出图、cover-from-content。

**【🟡 假接·要扶正 ~12】** dbs-content/hook/xhs-title/ai-check(死标签→接成真 runSkill)、baoyu 视觉(标签→若要真用得接)、taste-skill/html-anything/open-design/Waza/wechat-assistant/wechat-radar(困在废弃 app.js)。

**【❌ 没接但"应进产品"= 真 backlog,按价值】**
1. **cheat-on-content 整套**(灵魂:发布前判断+复盘+rubric进化)
2. **Kami**(公众号/报告交付排版,8.8k★,内容产品正缺这层)
3. dbs 教练方法论(content/hook 扶正为真 skill)
4. **数据回填自动化 + retro**
5. 朱雀终检
6. taste-skill(出图/页面审美 QA 门)
7. cover-replicator 人像封面

**【❌ 不该进客户产品(操作者/参考,不算浪费)】** gstack/Waza/Kaku/Matt Pocock/Superpowers(开发层,给我用)、wechat-assistant/radar/wx-cli(私域敏感,research)、Octoparse/Agent-Reach/web-access(采集冷备候选)、SaaS模板/afa-dtc/NotebookLM/Obsidian(参考)、发布风控(暂不托管)。

**【🎬 视频线——现在纳入(2026-06-17 用户:"现在要碰了,不是完全不碰")】** 头号候选 **Pixelle-Video**(阿里 AIDC-AI,22.8k★,主题→文案→AI配图/视频→TTS→BGM→一键合成,ComfyUI/直连API,可免费跑,Apache-2.0),取代旧的 MoneyPrinterTurbo 候选;配合 hyperframes/remotion/GSAP 既有视觉资产。服务 AI 自媒体线 + 短视频赛道。待立视频线 spec。

## tw93 新增候选(2026-06-17 用户给 https://github.com/tw93)
- **Kami**(8.8k★,内容→精美排版交付)→ 应进产品(排版/交付层,见 backlog #2)。
- **Pake**(50k★,网页→桌面App一行打包)→ 候选:将来把客户/小妹工作台打成零技术桌面应用(产品交付)。
- Waza/Kaku → 操作者/开发层,不进客户产品。

## 一句话
**给 ~80,真接 ~14;最该补又最值钱的是 cheat 闭环 + Kami 交付排版 + dbs教练扶正 + 数据回填。** 那 50+ 没接里,一半是操作者/参考本就不进产品,真窟窿就 backlog 那 7 条。
