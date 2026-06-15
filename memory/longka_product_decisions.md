> **迁移自 Codex 记忆** `~/.codex/memories/longka_product_decisions.md` (2026-06-16)。规则类反模式,逐字保留。
> 注意:文中 `E:\Codexi-native` 现为 `D:\AInativei-native`;122 端口以 CLAUDE.md 为准(3760)。

# Longka Product Decisions

Purpose: store confirmed product decisions that must guide future Longka AI Native work. This is L3-style environment and product knowledge.

## Active Decisions

### AI Native is a content production factory, not a prompt demo

Longka AI Native must help operators create publishable content from real source material, reusable assets, and visible workflow steps. The core flow is:

```text
industry + goal + platform + keywords
-> real collection / import
-> content asset library
-> topic candidates
-> selected source/topic
-> title choices
-> selected title
-> source-bound draft
-> quality diagnosis and improvement
-> web confirmation
-> images/cards/video task only after confirmation
```

### Topic channels must be selectable

Do not force one unstable channel. The operator should be able to choose from channels such as:

- X historical assets
- X real-time collection
- Xiaohongshu material
- manual import
- RSS/newsletter/web pages later

If a channel is unstable, label it and offer alternatives.

### Static SOP diagrams are not enough

The UI must drive action. A useful SOP means the user can click, fill, choose, confirm, and move to the next step. Static explanations alone do not count as implemented workflow.

### Content assets are strategic assets

Collected posts, comments, titles, structures, customer questions, and source links must be stored for reuse. They are not just temporary material for one rewrite.

### Xiaohongshu collection cannot be silently faked

If collection fails, show the failure and fallback options. Never generate fake posts or fake metrics and present them as real collection.

### Copy quality comes before image and video

Do not generate image cards or video tasks until the web UI confirms the final copy/script. Title changes must regenerate body content, not only swap the title.

### Customer-facing UI must use Longka language

Do not expose internal skill names such as DBS, cheat-on-content, Humanizer, or model names to customers. Use product language such as Longka radar, Longka copy check, content asset library, and AI content team.

## Content Asset Library Source Of Truth

Confirmed product rule: Longka AI Native content assets are not ordinary page state. On the 122 team/testing server, PostgreSQL is the formal content sample and future training-corpus base.

Collection tools such as MediaCrawlerPro, XCrawl, RSS, webpage scrapers, WeChat/Toutiao collectors, and manual import are ingestion entrances. They must normalize into the unified content asset layer so the Today Workbench, topic selection, title library, customer question bank, platform fingerprint scoring, and future Qwen 3B training/export all consume the same traceable source.

SQLite is for later customer portable packages. Local JSON is only lightweight state/backup, not the training corpus source of truth.

## Collection Engineering Is A Global Module

Confirmed product rule: collection is not a patch for one step in Today Workbench. It is a global Longka content infrastructure layer.

The stable flow is:

```text
source account / keyword / URL / RSS
-> collection batch
-> current batch result only
-> quality screening
-> manual confirmation
-> deconstruction card
-> content asset library / counterexample library / future training corpus
-> Today Workbench and production tools consume confirmed assets
```

Today Workbench should not directly turn raw crawler output into copy topics. X, Xiaohongshu, RSS, webpage, WeChat, Toutiao, and future collectors should share the same batch, confirmation, deconstruction, and asset persistence model.

## Generated Asset Storage Rule

Confirmed product rule: source-code development can happen locally, but final generated results must not live on the local C drive.

For Longka images, Xiaohongshu cards, covers, video renders, publishing packages, and customer-demo outputs:

- C drive generated folders are temporary cache only.
- E drive project directories are acceptable for local project backups and development artifacts.
- 122 and 43 server asset directories are the correct locations for team/demo/runtime outputs.
- Every generated visual/video package should have a traceable asset folder with manifest, copy, layout plan, prompts, images/renders, and export metadata.
- Before large generation or rendering tasks, the assistant must state the output directory and environment.

## Motif Asset Operations And Multi-Platform Reuse

Confirmed product rule: Longka content assets should be organized around a platform-neutral "motif" rather than a single finished Xiaohongshu draft.

The operator workflow is:

```text
monitor sources / benchmark accounts / bookmarks / RSS / web
-> select a promising source topic as a motif
-> choose any first target platform
-> produce platform-specific content
-> save it under the motif as one platform version
-> reuse the same motif for another platform
-> record publish/review data
-> feed the learning back into assets and future creation
```

Platform switching must preserve the motif but change the platform expression:

- Xiaohongshu becomes image-post copy and card set.
- WeChat becomes long article structure with semantic image insertion.
- Video platforms become script, shot plan, cover direction, and asset suggestions.
- Moments becomes concise social copy with lighter visual use.

Do not force Xiaohongshu first. Do not copy one platform draft into another platform. Do not create disconnected pages as the only workflow entry. Content asset cards must show clear next actions: continue creation, switch platform, review performance, or reuse assets.

Spec source:
- `E:\Codex\ai-native\docs\specs\2026-06-07-motif-asset-operations-spec.md`

## Motif Compound Rewriting Beats Originality KPI

Confirmed product rule: Longka should not optimize for "how many original pieces were generated today". The stronger content-system KPI is whether a high-value motif can be repeatedly rewritten, localized, published, reviewed, and recycled across platforms.

Absorbed external operator lesson:

```text
Do not treat originality as the main KPI.
The valuable loop is compound rewriting:
one high-signal motif
-> platform-specific rewrite
-> asset archive
-> performance review
-> recycle the best-performing angle into the next long-form or next motif.
```

Longka product translation:

- Source material is raw material.
- Motif is the reusable strategic asset.
- Platform versions are delivery forms.
- Publishing/review data decides whether the motif deserves another rewrite cycle.

Default reuse rhythm:

```text
0-24h: turn selected motif into Xiaohongshu image post or another chosen first platform version
24-48h: turn the same motif into short-video script or WeChat/Moments version
48-72h: archive motif with topic tags, content type, source evidence, structure pattern, platform versions, and asset links
7d: enter performance data, identify the best version, and recycle it into a new long-form, image post, or script
```

Terminology rule:

- Customer UI should use plain terms such as `主题标签`, `内容类型`, `使用结构`, `适合平台`, `复用版本`, and `复盘结果`.
- Do not expose jargon such as `hashtag` or internal template codes unless the UI is for advanced operators.

Implementation rule:

When a user saves a finished platform draft as a content asset, the system should make the next reuse action visible:

- continue with Xiaohongshu image post
- convert to WeChat long article
- convert to Moments copy
- convert to short-video script
- record publish data
- recycle best-performing version
