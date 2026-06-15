# Content Source Adapters

Updated: 2026-05-29

## Purpose

The AI Native command center must not treat any single crawler as the product.

The strategic goal is:

```text
选题定生死，采集为选题服务。
```

The crawler layer is not a data-hoarding layer. It must help Longka decide what to publish today:

- Which topic already has market proof.
- Which comment pain is frequent enough.
- Which emotion can be translated into our product.
- Which sample can become a publishable Longka asset.
- Which topic should be abandoned before wasting production time.

## 2026-06-14 商用定调（黄金组合 + 客户不碰采集）

> 见 `docs/specs/2026-06-14-collection-architecture-pivot-spec.md`。本节为最新有效结论；与下方更早的工具笔记冲突时，**以本节为准**。

- **客户不碰采集**：中小商户只消费"内容工厂"成品，全程不接触 cookie/扩展/F12。采集是平台内部供料，用自有小号池集中采，与客户数解耦。
- **黄金组合**：
  - 发现（免费/零登录）：TrendRadar（4线）+ AI HOT（仅 AI 线）
  - 高危搜索取爆款（人工）：江湖工具箱（健壮）
  - 低危深挖（保号）：MediaCrawlerPro（**退出搜索**，只做详情+评论+创作者主页）
  - 网页正文（免费）：内置 fetch + defuddle → 回退 XCrawl
  - 临时调研：Firecrawl（不入管线）
- **只服务 AI 线的海外工具**：XCrawl（付费）/ AI HOT / last30days；另 3 条国内线（美容 / 私校留学 / 女性成长）不投入海外工具。
- **不集成**：last30days 爬虫、apify、agent-reach；**不托管客户 cookie**；**不做客户发布**（三期走官方授权）。

## MediaCrawlerPro Position

MediaCrawlerPro is infrastructure for topic validation, not a搬运工具.

The front-office product should expose it as a topic center:

```text
输入行业 + 关键词
-> 采集/导入同一关键词下的真实样本
-> 对比正文在讲什么
-> 对比评论区在问什么
-> 判断收藏高在哪里
-> 输出选题参考和内容生产包
```

Acceptance standard:

- The system must never label manual samples as crawled samples.
- The sample card must keep title, body, metrics, comments, source keyword, author, URL, and collection status.
- Analysis should answer why a topic is worth copying, not merely summarize the post.
- High saves usually point to "useful checklist / future need / identity upgrade"; high comments usually point to "unresolved anxiety / price / entry / trust".
- If SQLite has no matching data, the UI must say so and ask the operator to run real collection or manually import samples. It must not create demo samples.

The product needs a source adapter layer:

```text
MediaCrawler / Apify / xcrawl / Agent-Reach / jina-cli / x-tweet-fetcher / xhs-cli / manual import
-> normalized content_sample
-> hot-content analysis
-> copy/video generation
-> publishing package
-> feedback loop
```

This lets us replace tools without rewriting the intelligence, content, video, and review layers.

## Tool Selection Notes From 2026-05-29 X Clipping

Source note: `F:\Longka Wiki\龙咖Wiki\Clippings\Post by @servasyy_ai on X.md`.

The useful idea is not "install every crawler". The useful idea is to pick tools by data source and risk level:

- `MediaCrawler`: strongest candidate for domestic social media collection research. It covers Xiaohongshu, Douyin, Bilibili, Weibo, Kuaishou, Zhihu, and Tieba. For Longka it belongs in the "domestic platform adapter" layer, but still needs risk gating, low-frequency tests, and explicit account-safety boundaries.
- `Agent-Reach`: broad multi-platform reach. Useful as a low-budget exploration and backup adapter, but reverse-engineering stability risk means it should not be the production default.
- `jina-cli`: clean single-page URL-to-Markdown/Text extraction. Best for articles, docs, public pages, and quick source ingestion. Not suitable for logged-in timelines or bulk social monitoring.
- `x-tweet-fetcher`: X/Twitter-focused collection and analysis. Useful for expert account tracking, AI early signals, and overseas trend radar.

Decision rule:

```text
Domestic social platform samples -> MediaCrawler / Apify actor / manual import
X/Twitter expert radar -> x-tweet-fetcher / Agent-Reach / manual import
Public articles and docs -> jina-cli / xcrawl / browser extraction
Low-cost exploration -> Agent-Reach
Production workflow -> prefer official API or managed adapter where available
Blocked or risky platform -> manual import first, then local low-frequency verification
```

Product implication:

- The AI Native work center should expose "source type" and "collection status", not tool names as the main customer concept.
- Customer sees: Xiaohongshu样本、X专家动态、公众号文章、评论区痛点、手动导入。
- System records: `sourceTool`, `collectionStatus`, `failureReason`, `collectedAt`.
- A failed crawler is not a failed workflow; it should ask for screenshot/text/comment import and continue.

## Adapter Priority For Xiaohongshu

### 1. mediacrawler-xhs / apify-xhs

Primary route for P1/P2.

Use for:

- Explosive Xiaohongshu post samples.
- Post title, body, cover, author, tags.
- Engagement metrics.
- Comments when the actor supports it.

Why:

- The X case study shows this is a practical path.
- Apify actors package platform-specific scraping problems behind a service boundary.
- It is easier to evaluate and replace actor-by-actor than to hard-code one local crawler.
- The @servasyy_ai clipping points to MediaCrawler as the most complete domestic social-media collection project. Treat it as a serious adapter candidate, not as the only solution.

### 2. xcrawl-web / jina-cli

Fallback and general web route.

Use for:

- Public accessible pages.
- Dynamic web pages.
- Search result pages.
- Competitor pages.
- Non-XHS public pages related to the same topic.

Why:

- We already registered `xcrawl` MCP.
- It is better as a general data pipe than a platform-specific XHS scraper.
- `jina-cli` is useful when the target is a single public page that needs clean Markdown/Text for LLM processing.

### 3. manual-import

Required fallback, not a temporary hack.

Use when:

- Platform blocks cloud/server scraping.
- Login/cookie is missing.
- The user already has screenshots, copied text, or copied comments.
- The sample is strategically important but technically hard to fetch.

Why:

- The X video shows the agent explicitly asks for screenshots/text when XHS blocks server-side parsing.
- This keeps the workflow moving instead of pretending automation always works.

### 4. Agent-Reach

Exploration and backup only.

Use for:

- Low-cost multi-platform discovery.
- Early tests where stability is acceptable.
- Sources that do not justify a dedicated adapter yet.
- Fast external research before choosing a paid or production collector.
- Verifying whether a URL/account/topic has useful public signal before spending API credits or crawler time.
- Reading public posts, pages, GitHub repos, videos, and social discussions as operator evidence.

Do not use as:

- A high-trust production crawler.
- The only path for daily customer workflows.
- A bulk training corpus collector.
- A silent replacement when MediaCrawlerPro, Bazhuayu, or XCrawl fails.

Operational rule:

```text
Agent-Reach result
-> operator reviews source and usefulness
-> if worth keeping, convert to manual_import or adapter-specific content_sample
-> store sourceTool=agent-reach, collectionStatus=manual|partial, evidenceUrl required
```

Why:

- Agent-Reach is excellent for giving the agent broad internet visibility.
- It is not the best default for long-running commercial collection, because channel stability, cookies, and reverse-engineering risk vary by platform.
- It should reduce blind spots and guide what to collect next, not pollute the training sample database with unverified data.

### 5. xhs-cli

Low-frequency local verification only.

Use for:

- Manual, local, logged-in checks.
- Small sample validation.

Do not use as:

- Primary production crawler.
- High-frequency monitor.
- Account-control automation.

## Normalized Schema

Every adapter must emit this shape:

```json
{
  "id": "",
  "platform": "xiaohongshu",
  "keyword": "色彩分析",
  "title": "",
  "content": "",
  "tags": [],
  "author": "",
  "publishedAt": "",
  "metrics": {
    "likes": 0,
    "collects": 0,
    "comments": 0,
    "shares": 0
  },
  "comments": [
    {
      "text": "",
      "likes": 0,
      "author": "",
      "publishedAt": ""
    }
  ],
  "url": "",
  "cover": "",
  "images": [],
  "sourceTool": "apify-xhs",
  "collectionStatus": "real",
  "failureReason": "",
  "collectedAt": ""
}
```

Allowed `collectionStatus` values:

- `real`: collected by an adapter.
- `manual`: pasted or uploaded by the user.
- `partial`: some fields were collected, but comments or metrics are missing.
- `failed`: adapter failed; use only for logs, not analysis.
- `demo`: seeded sample; must be visibly labeled and never mixed with real samples.

## Failure Contract

An adapter failure must produce:

```json
{
  "ok": false,
  "adapter": "apify-xhs",
  "reason": "xhs_blocked_cloud_ip",
  "message": "小红书阻止云端解析，无法直接抓取这批链接。",
  "fallbacks": [
    "请上传笔记截图",
    "请复制标题、正文、标签和评论区",
    "请换一批公开可访问链接",
    "请使用本地登录态 xhs-cli 低频验证"
  ]
}
```

The command center must never silently replace a failed crawl with seed data.

## Analysis Output

For each high-value sample:

```json
{
  "sampleId": "",
  "titleFormula": "",
  "topicAngle": "",
  "contentStructure": [],
  "firstThreeSecondsHook": "",
  "endingInteraction": "",
  "commentPains": [],
  "coverPattern": "",
  "publishTiming": "",
  "replicationPlan": "",
  "riskNotes": [],
  "score": 0
}
```

## Product Rule

The user-facing employee is not "crawler".

Customer-facing name:

- 爆款侦察兵
- 内容情报员工
- 营销机会雷达

Internal technical names:

- source adapter
- content sample
- sample analysis
- publishing package
