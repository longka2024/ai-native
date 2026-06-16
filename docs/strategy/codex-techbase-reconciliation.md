# Codex 技术基座 × 现状 真账（2026-06-17,逐条核运行代码）

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
