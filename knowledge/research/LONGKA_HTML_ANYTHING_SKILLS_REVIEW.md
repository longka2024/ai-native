# Longka 对 html-anything skills 的吸收评估

来源仓库：

```text
E:\Codex\html-anything
https://github.com/nexu-io/html-anything
```

## 核心判断

`html-anything` 对 Longka 最大的价值不是“又多了一个 HTML 工具”，而是它把 AI 产物从 Markdown/聊天回复推进到了可交付形态：

```text
输入材料
-> 选择交付形态 skill
-> AI 生成单文件 HTML
-> 预览
-> 导出 HTML / PNG / 微信公众号可粘贴内容 / 小红书图卡 / Deck / 视频分镜
```

这正好补上 Longka 当前最缺的一层：**最后给客户、投资人、团队、社媒平台看的成品外壳**。

Longka 以前更强的是：

- 需求洞察
- 行业工作流
- AI 生图
- 报告生成
- 私域/平台数据采集
- Codex/skills 基建

`html-anything` 能补的是：

- 好看的交付页面
- 投资人材料
- 小红书图文
- 公众号长文
- 行业报告
- 运营看板
- 视频分镜
- 产品原型
- 可下载 PNG/HTML

## 值得吸收的原则

### 1. Markdown 只是草稿，HTML 才是人看的成品

这个判断非常重要。

我们之前沉淀了很多 Markdown 文档，但发给投资人、客户、同事时，Markdown 的感知价值不够。后续 Longka 应该形成：

```text
内部沉淀：Markdown
外部交付：HTML / PNG / PDF / Deck / Video
```

### 2. Skills 是交付形态，不只是能力说明

`html-anything` 的 skill 不是“怎么调用某个 API”，而是“生成一种可交付成果”。

这比普通工具型 skill 更适合商业化。

Longka 后续也应该把 skill 分成两层：

```text
能力型 skill：采集、分析、生成、诊断、部署
交付型 skill：投资人页、行业报告、小红书卡片、宣传视频、客户报告
```

### 3. 每个 skill 都要有硬约束

它的 skill 普遍强调：

- 真实数据，不要 lorem ipsum
- CJK 字体优先
- 8px 网格
- 对比度
- 固定画布比例
- 可导出
- 有 example.html

这对我们很关键。我们不能只写“生成一个漂亮页面”，而要把版式、尺寸、导出、用途、禁忌全部写死。

## 75 个 skills 的 Longka 吸收分类

### A. 投资人和商业化表达

优先吸收：

- `deck-pitch`
- `deck-swiss-international`
- `deck-guizang-editorial`
- `doc-kami-parchment`
- `article-magazine`
- `magazine-poster`

可用于：

- 投资人 24 小时推进记录 HTML 化
- Longka AI Native 行业工作台融资 Deck
- 项目进展月报
- 产品愿景 One-pager
- 行业洞察长文

建议 Longka 新增交付型 skill：

```text
longka-investor-brief-html
longka-ai-native-pitch-deck
longka-24h-worklog-magazine
```

### B. 色彩报告和形象设计项目交付

优先吸收：

- `card-xiaohongshu`
- `deck-xhs-post`
- `deck-xhs-pastel`
- `poster-hero`
- `social-carousel`
- `mockup-device-3d`
- `mobile-app`
- `web-proto-soft`

可用于：

- 把客户报告图变成小红书图卡
- 把“素颜照到形象报告”的对比做成宣传长图
- 把 11 张报告变成手机端可保存的 HTML 画册
- 把小程序页面包装成高质感设备 Mockup
- 给小妹一键生成朋友圈/小红书素材

建议 Longka 新增交付型 skill：

```text
longka-color-case-xhs-card
longka-color-report-mobile-album
longka-before-after-poster
longka-case-promotion-carousel
```

### C. 行业工作台原型与 SaaS 产品展示

优先吸收：

- `dashboard`
- `live-dashboard`
- `social-media-dashboard`
- `flowai-team-dashboard`
- `prototype-web`
- `saas-landing`
- `web-proto-editorial`
- `web-proto-brutalist`
- `web-proto-soft`

可用于：

- 形象设计行业工作台原型
- 律师/家装/旅游行业工作台样板
- AI 助理 U 盘宣传页
- Longka 云端工作台落地页
- 不同行业模板的展示页

建议 Longka 新增交付型 skill：

```text
longka-industry-workbench-prototype
longka-ai-assistant-usb-landing
longka-vertical-saas-demo
```

### D. 内容获客与社媒生产

优先吸收：

- `card-xiaohongshu`
- `social-carousel`
- `social-media-matrix`
- `social-media-dashboard`
- `social-x-post-card`
- `poster-hero`
- `magazine-poster`

可用于：

- 爆款拆解结果可视化
- 小红书选题卡
- 内容矩阵看板
- 今日发布计划
- 评论区需求洞察图
- 复盘报告

建议 Longka 新增交付型 skill：

```text
longka-xhs-viral-replica-card
longka-content-opportunity-dashboard
longka-comment-demand-map
longka-daily-publish-plan
```

### E. 视频生产和 Remotion/Hyperframes 衔接

优先吸收：

- `video-hyperframes`
- `frame-glitch-title`
- `vfx-text-cursor`
- `frame-logo-outro`
- `frame-light-leak-cinema`
- `frame-liquid-bg-hero`
- `frame-data-chart-nyt`
- `mockup-device-3d`

可用于：

- 宣传视频片头
- 强节奏关键词闪现
- 产品视频分镜
- 报告案例对比视频
- 品牌 Logo 片尾
- 数据增长动效帧

建议 Longka 新增交付型 skill：

```text
longka-promo-video-storyboard-html
longka-pop-opener-frame
longka-case-before-after-video-frames
longka-logo-outro-frame
```

### F. 内部运营和团队协作

优先吸收：

- `meeting-notes`
- `weekly-update`
- `team-okrs`
- `pm-spec`
- `eng-runbook`
- `kanban-board`
- `data-report`

可用于：

- 每日开发流水账
- 项目周报
- 投资人更新
- PRD
- 运维手册
- Bug 复盘
- 数据报告

建议 Longka 新增交付型 skill：

```text
longka-dev-worklog-html
longka-investor-weekly-update
longka-product-prd-html
longka-ops-runbook-html
```

## 最适合马上落地的 6 个成品形态

### 1. 投资人 24 小时推进记录 HTML

输入：

```text
LONGKA_24H_FULL_CHAT_RECORD_2026-05-16.md
LONGKA_24H_INVESTOR_WORKLOG_2026-05-16.md
```

输出：

```text
一份有目录、时间线、关键节点、高亮引用、商业判断的 HTML 页面
```

适合 skill：

```text
doc-kami-parchment
article-magazine
deck-pitch
```

### 2. Longka AI Native Pitch Deck

输入：

```text
Longka 目标、AI Native 定义、行业工作台、色彩项目样板、商业化路径
```

输出：

```text
10-12 页融资/合作 Deck
```

适合 skill：

```text
deck-pitch
deck-swiss-international
deck-guizang-editorial
```

### 3. 形象设计行业工作台原型

输入：

```text
形象设计顾问一天真实任务
订单、照片、报告、客户跟进、案例宣传、复盘
```

输出：

```text
可演示 Web 原型
```

适合 skill：

```text
dashboard
prototype-web
web-proto-soft
```

### 4. 色彩案例小红书图卡

输入：

```text
客户原图、报告成品图、色彩结论、妆容/发型/穿搭建议
```

输出：

```text
3:4 小红书图卡 / 多页轮播
```

适合 skill：

```text
card-xiaohongshu
deck-xhs-post
social-carousel
poster-hero
```

### 5. 宣传视频分镜 HTML

输入：

```text
前后对比图、卖点、关键词、视频节奏、CTA
```

输出：

```text
6-10 个 1920x1080 视频帧，可交给 Remotion/Hyperframes
```

适合 skill：

```text
video-hyperframes
vfx-text-cursor
frame-glitch-title
frame-logo-outro
```

### 6. 行业 AI 助理 U 盘产品页

输入：

```text
U 盘产品定位、行业模板、交付流程、安全授权、价格方案
```

输出：

```text
高质感产品落地页 + 对外介绍长图
```

适合 skill：

```text
saas-landing
poster-hero
mockup-device-3d
pricing-page
```

## Longka 应该如何吸收，而不是照搬

不要直接把 75 个 skill 全塞进我们的工作台。

正确做法：

```text
html-anything 原始 skill
-> 选择适合 Longka 的交付形态
-> 改成 Longka 场景模板
-> 绑定真实输入数据
-> 输出可发布/可展示的 HTML/PNG/Deck/Video Frames
```

例如：

```text
card-xiaohongshu
-> longka-color-case-xhs-card
-> 输入客户案例和报告图
-> 输出小红书案例图卡
```

```text
deck-pitch
-> longka-ai-native-pitch-deck
-> 输入 Longka 商业逻辑
-> 输出投资人 Deck
```

```text
video-hyperframes
-> longka-case-before-after-video-frames
-> 输入原图、成品图、卖点文案
-> 输出视频分镜帧
```

## 下一步建议

### 第一优先级

先做 3 个 Longka 专属交付 skill：

```text
longka-investor-brief-html
longka-color-case-xhs-card
longka-promo-video-storyboard-html
```

它们分别覆盖：

- 投资人沟通
- 色彩项目获客
- 视频宣传生产

### 第二优先级

把 `longka-video-workbench-prototype` 改成真正的行业任务工作台后，用 `dashboard` / `prototype-web` / `web-proto-soft` 的结构重新包装。

### 第三优先级

把这些交付型 skill 接入 Longka Harness：

```text
采集/分析型 skill 负责拿内容和判断
交付型 skill 负责把结果变成可看的成品
发布型 skill 负责发到公众号、小红书、朋友圈、视频号
```

最终形成：

```text
数据输入
-> AI 分析
-> 行业任务
-> 成品交付
-> 发布/成交
-> 复盘
```

这才是 Longka AI Native 工作系统完整闭环。
