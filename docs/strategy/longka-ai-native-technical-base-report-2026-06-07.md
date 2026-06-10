# Longka AI Native Technical Base Report

Date: 2026-06-07

Purpose: audit the technical bases, skills, repos, and frameworks provided for Longka AI Native, then decide how they should be absorbed into the system. This report is not an install list. A provided tool must be researched, classified, and accepted or rejected before it enters the product architecture.

## 1. Core Judgment

Longka AI Native should not become a pile of impressive tools. It should become a content and workflow production system:

```text
real signal
-> source evidence
-> content asset library
-> motif / topic decision
-> platform-specific creation
-> quality check
-> visual / typesetting / video production
-> publishing package
-> performance review
-> training feedback
```

The technical bases should serve this chain. If a tool does not improve one link in the chain, it stays as a candidate or reference.

## 2. Intake Standard For Any New Tool

Every new repo, skill, MCP, plugin, API, or framework must be recorded with:

```text
Name:
Source:
Local path:
Module:
Problem solved:
When to invoke:
Relationship to existing bases:
Status:
Risk / boundary:
Next validation:
```

Status values:

- `integrated`: already used by code or accepted workflow.
- `active`: accepted as a Longka operating rule or required skill.
- `candidate`: promising but not installed/tested/integrated.
- `reference`: useful concept or architecture, not a direct dependency.
- `rejected`: not suitable now.
- `needs-audit`: named but not yet read enough.

## 3. Module Architecture

Canonical Longka module chain:

```text
Spec / Discipline
-> Engineering / Code
-> Collection
-> Content Asset
-> Content Creation
-> Visual Production
-> Typesetting / Deliverable
-> Video Production
-> Publishing / Risk Control
-> QA / Review / Ship
```

Normal users should not see this fragmentation. The product surface should guide them through one coherent workbench.

## 4. Spec / Discipline Layer

### Longka Harness

Status: `active`

Role:
Project-level hard constraint. It governs memory recall, spec alignment, environment selection, output directory, evidence, and post-work memory updates.

Relationship:
Highest priority. Other tools cannot override it.

Use:
Before Longka coding, crawler changes, image/video generation, package building, server deployment, or production-impacting changes.

### Superpowers

Status: `active`

Role:
Spec-first trigger. It prevents vague requests from turning into random code.

Use:
When a workflow feels wrong, a module is new, or acceptance criteria are fuzzy.

### Waza

Source: `https://github.com/tw93/Waza`

Status: `active-reference`

Role:
Engineering habit layer. Waza turns common engineering habits into runnable skills: thinking through requirements, debugging systematically, checking work, reading primary sources, writing clearly, and learning by producing output.

Key insight from source:
Waza is part of tw93's trilogy: Kaku writes code, Waza drills habits, Kami ships documents.

Longka absorption:
Use Waza as behavior governance under the Longka harness:

- think before building
- investigate before patching
- check before claiming done
- read primary sources before technical conclusions
- distill repeated mistakes into rules

Boundary:
Waza does not replace Longka product decisions or customer evidence.

### gstack

Status: `active`

Role:
Project breakdown, browser QA, investigation, design review, review, ship/deploy support.

Use:
122 public-route validation, UI interaction checks, screenshots, console/network checks, responsive tests, and end-to-end workbench verification.

Boundary:
Not a content writing system. It belongs to engineering/QA, not content creation.

## 5. Engineering / Code Layer

### Kaku

Source: `https://github.com/tw93/Kaku`

Status: `reference / needs-audit`

Role:
The code-writing part of the tw93 trilogy. In Longka, it is a conceptual reminder: code execution must be disciplined by Harness/Waza and delivered through Kami where needed.

Next validation:
Read and audit the actual repo before promoting it beyond reference status.

### Codex

Status: `active`

Role:
Primary implementation agent.

Must obey:
UTF-8, minimal code, no unnecessary files, no fake data, no local-only proof for 122 work, no production action without confirmation.

### Context7 / ctx7

Status: `active`

Role:
Current library/framework/SDK/API/CLI/cloud-service documentation lookup.

Use:
Whenever a technical library/API/framework question appears.

## 6. Collection Layer

### MediaCrawlerPro

Status: `candidate / partially integrated`

Role:
Chinese social platform crawler base: Xiaohongshu, Douyin, Kuaishou, Bilibili, Weibo, Zhihu.

Longka use:
Collection base for Chinese platform content, comments, accounts, and sample accumulation.

Boundary:
Not a complete training/content system. Collection results must normalize into PostgreSQL content asset tables.

Risk:
Platform instability, captchas, account/IP risk, incomplete content details.

### XCrawl

Status: `candidate / partially integrated`

Role:
Web/X/public-page collection route using scrape/map/crawl/search skills.

Use:
X accounts, public web pages, RSS/newsletter style sources, competitor pages.

Boundary:
No fake results. API/network failures must surface clearly.

### Bazhuayu / Octoparse

Status: `candidate`

Role:
Commercial RPA fallback when code crawlers are unstable.

Boundary:
Cost, vendor dependency, operational complexity.

### Agent-Reach / web-access

Status: `needs-audit`

Role:
Possible web observation/access layer.

Next validation:
Read source code and test against Longka collection requirements before any integration.

### WeChat Assistant / WeChat Radar / wx-cli / wechat-cli

Status: `reference / high-risk candidate`

Role:
Private-domain intelligence and local WeChat analysis references. Useful patterns include local-first storage, structured extraction, daily radar, group digest, high-signal people, link intelligence, and operator dashboards.

Boundary:
Sensitive local WeChat data and potential platform/account/privacy risks. Keep research-only unless a privacy/security spec exists.

## 7. Content Asset Layer

### PostgreSQL On 122

Status: `active`

Role:
Formal source of truth for team/web content samples and future training corpus.

Rule:
122 uses PostgreSQL. SQLite is only for later portable customer packages.

### Obsidian / Bases / NotebookLM / Feishu

Status: `candidate / workflow reference`

Role:
Personal knowledge workflows, manual asset management, document-grounded Q&A, and operator-friendly table interfaces.

Longka direction:
These should feed or sync with the unified content asset library, not become separate islands.

### dbs-content-system / dbs-deconstruct / dbs-benchmark

Status: `active`

Role:
Content asset deconstruction, concept extraction, structure analysis, benchmark filtering.

Use:
After collection screening, before motif/content creation.

### afa-dtc-skills

Status: `candidate`

Role:
DTC/business/content skill reference.

Next validation:
Map concrete skills into content asset, content creation, or sales workflow modules.

## 8. Content Creation Layer

### dbs / dbs-content / dbs-hook / dbs-xhs-title / dbs-ai-check

Status: `active`

Role:
Chinese content diagnosis, hook/title/content quality, AI-trace checks.

Use:
Title generation, opening retention, structure selection, copy scoring, rewrite guidance.

Boundary:
Do not expose skill names in customer UI. Use Longka product language.

### humanizer-zh

Status: `active`

Role:
Reduce AI flavor and improve natural Chinese expression.

Use:
After a source-bound draft exists, not as a substitute for source-grounded writing.

### content-research-writer

Status: `active`

Role:
Research-to-long-form writing, especially WeChat/long articles.

Use:
When converting a motif into a full article, report, or research-based draft.

## 9. Visual Production Layer

### open-design

Status: `active-reference / partially integrated`

Role:
Major visual/design production base: design systems, artifacts, style selection, anti-slop loop, HTML-first visual surfaces.

Longka use:
Visual workflow design, style direction, artifact preview, future visual workspace.

Boundary:
Do not adopt wholesale without product spec.

Update 2026-06-08:
Upstream Open Design appears to be moving toward an HTML Video / `hyperframes-html` route. The current local `E:\Codex\open-design` checkout is older and only exposes `motion-frames` handoff patterns. Treat Open Design HTML Video as a candidate upgrade until the local checkout is safely updated and a real MP4 render is verified.

### html-anything

Source: `https://github.com/nexu-io/html-anything`

Status: `active-reference`

Role:
HTML-to-card/deck/page production base. Contains Xiaohongshu, Guizang, Kami, deck, social, and document templates.

Use:
Xiaohongshu card sets, social cards, doc pages, investor/customer artifacts, HTML-to-PNG workflows.

### taste-skill

Source: `https://github.com/Leonxlnx/taste-skill.git`

Status: `active`

Role:
Visual taste and frontend quality-control. It improves layout, typography, motion, spacing, and prevents boilerplate-looking AI UIs.

Key source facts:
It includes multiple skills such as `design-taste-frontend`, `gpt-taste`, `redesign-existing-projects`, `high-end-visual-design`, `minimalist-ui`, `industrial-brutalist-ui`, `image-to-code`, `imagegen-frontend-web`, `imagegen-frontend-mobile`, and `brandkit`.

Longka use:
Design gate for workbenches, mini-program pages, share pages, landing pages, image/card outputs, investor/customer demos.

Boundary:
Taste is not business strategy and cannot prove product value.

### impeccable

Source: `https://github.com/pbakaus/impeccable.git`

Status: `candidate`

Role:
Frontend design vocabulary and command framework. It provides design references for typography, color/contrast, spatial design, motion, interaction, responsive design, and UX writing. It also has command flows such as audit, critique, polish, harden, animate, typeset, layout, clarify, adapt, and optimize.

Longka use:
Complement `taste-skill`:

- `taste-skill`: taste/aesthetic self-check.
- `impeccable`: design framework, commandized frontend correction, deterministic anti-pattern checks.

Recommended next step:
Install/test in a controlled project branch or sandbox, then decide whether to promote to `active`.

Boundary:
Do not let it override Longka harness or product specs. It is for visual/frontend quality, not content strategy.

### Xiaohei / Guizang / Baoyu Visual Skills

Status: `active`

Role:
Xiaohei metaphor illustrations, Guizang editorial/social cards, Baoyu Xiaohongshu cards/covers/infographics/article illustrations.

Use:
After final copy is confirmed. No process labels or internal notes should appear in final images.

## 10. Typesetting / Deliverable Layer

### Kami

Source: `https://github.com/tw93/Kami`

Status: `active-reference`

Role:
Deliverable packaging layer: documents, reports, one-pagers, decks, landing pages, polished articles, and business artifacts.

Longka use:
Turn AI employee output into boss/customer/investor-readable artifacts:

- content publishing package
- business opportunity brief
- customer report
- project review
- investor one-pager
- WeChat long article layout

Boundary:
Do not package weak evidence into a beautiful empty report.

### baoyu-format-markdown / baoyu-markdown-to-html / md2wechat / wechat-article-publisher

Status: `active`

Role:
Markdown cleanup, styled HTML conversion, WeChat-compatible layout, WeChat draft/publishing preparation.

Longka use:
WeChat public-account article path:

```text
confirmed motif
-> WeChat long-form draft
-> Markdown structure cleanup
-> semantic image insertion plan
-> styled HTML preview
-> draft/publish only after explicit confirmation
```

## 11. Video Production Layer

### Remotion / FFmpeg / HyperFrames / video-use / ElevenLabs

Status: `active`

Role:
Main video implementation and QA stack.

Use:
Script approval, template selection, title/transition/CTA, TTS/voiceover, rendering, timeline QA, recut, export.

### Open Design HTML Video / hyperframes-html

Status: `candidate upgrade`

Role:
Bridge HTML artifact/storyboard generation with video rendering. The direction is:

```text
confirmed script / motif
-> Open Design or html-anything creates HTML storyboard scenes
-> HyperFrames renders deterministic HTML/CSS/GSAP motion to MP4
-> video-use/gstack verifies output
```

Current local status:
The local `E:\Codex\open-design` checkout does not yet contain the new `hyperframes-html` Open Design model/plugin. Local HyperFrames skills do exist under `C:\Users\longfei\.codex\skills\hyperframes` and `C:\Users\longfei\.codex\skills\hyperframes-cli`.

Boundary:
Do not replace Remotion immediately. Use this first for premium HTML storyboard/video scenes, title cards, motion explainers, and short demo clips after one real MP4 test passes.

### MoneyPrinterTurbo

Source: `https://github.com/harry0703/MoneyPrinterTurbo.git`

Status: `reference`

Role:
Automated short-video pipeline reference: variants, subtitles, rhythm, material preprocessing, visible task progress.

Boundary:
Do not copy the whole generic stock-footage workflow. Longka must preserve source evidence, approved script, visual quality, and domain proof.

### GSAP Skills

Source: `https://github.com/greensock/gsap-skills`

Status: `active`

Role:
Motion interaction for web demos, scroll storytelling, state transitions, product explanation pages.

Boundary:
Motion only when it improves comprehension. Serious documents should stay readable.

## 12. Publishing / Risk-Control Layer

Status: `partly specified / needs deeper design`

Current bases:

- baoyu-post-to-wechat
- wechat-article-publisher
- baoyu-post-to-x
- x-article-publisher
- fingerprint browsers
- residential IP / proxy / soft-router isolation
- browser profile and cookie/session isolation

Longka rule:
Publishing is not a simple button. It must consider account isolation, platform rewriting, duplicate content, warm-up cadence, publish timing, and explicit human confirmation.

## 13. QA / Review / Ship Layer

### gstack + Playwright + taste/impeccable checks

Status: `active / candidate mix`

Role:
Proof before claiming completion.

Acceptance stack:

```text
code syntax check
-> local flow check
-> 122 public route check when relevant
-> API state check
-> browser interaction check
-> console/network check
-> visual/taste review
-> screenshot evidence
-> memory update / commit when appropriate
```

## 14. What Is Missing

### Missing 1: Tool governance UI

The ledger exists as memory, but the product does not yet show:

- which module uses which base
- what is integrated vs candidate
- what still needs audit
- what powers each AI employee

Recommendation:
Create an internal "技术基座总账" view later, not for customers, but for product/team governance.

### Missing 2: Visual gate in product flow

Today Workbench has early visual production, but needs a stronger gate:

```text
copy confirmed
-> choose platform visual format
-> apply visual base
-> run taste/impeccable-style preflight
-> render / generate
-> save asset manifest
```

### Missing 3: Typesetting branch

We need a visible platform branch after copy confirmation:

- Xiaohongshu: card set
- WeChat: long article layout + insertion plan + HTML preview
- Moments: paragraph rhythm
- Video: script + shot/subtitle structure

### Missing 4: Collection adapter governance

Collection should have per-platform adapter profiles:

- target platform
- collection route
- login/session requirement
- quality filter
- anti-captcha/rate limit
- normalized schema
- asset confirmation rule

### Missing 5: Publishing risk architecture

Need a separate publishing/risk spec before building:

- account isolation
- browser profile
- IP/proxy
- publish cadence
- duplicate-content prevention
- manual approval
- feedback capture

## 15. Immediate Recommendations

### P0: Freeze technical-base chaos

Use this report and `longka_technical_base_ledger.md` as the source of truth. New tools must be classified before discussion moves to coding.

### P1: Promote impeccable only after controlled test

`impeccable` is promising, but currently candidate. Test it on one Longka surface:

- Today Workbench step 10 visual workspace, or
- content asset library dashboard, or
- WeChat article preview page.

Acceptance:

- better hierarchy
- fewer cramped controls
- mobile layout works
- no generic AI visual patterns
- no business logic rewrite

### P2: Add a formal visual/typesetting quality gate

Combine:

```text
open-design / html-anything for artifact
-> taste-skill for taste gate
-> impeccable for layout/responsive/interaction gate
-> gstack for browser evidence
```

### P3: Build the WeChat typesetting branch

Use:

```text
content-research-writer
-> baoyu-format-markdown
-> Kami/html-anything doc template
-> baoyu-markdown-to-html or md2wechat
-> optional wechat draft after confirmation
```

### P4: Keep crawler bases separate from production proof

MediaCrawlerPro, XCrawl, Bazhuayu, WeChat local tools, and web scrapers are collection adapters. They must feed the unified PostgreSQL asset library. They are not customer-facing product proof by themselves.

## 16. Final Technical Base Model

```text
Harness = Longka rules and safety
Superpowers = spec alignment
Waza = engineering habits
gstack = QA / investigation / browser proof
Kaku / Codex = code execution

MediaCrawlerPro / XCrawl / RPA / web tools = collection
PostgreSQL / Obsidian / NotebookLM / Feishu = asset and knowledge base
dbs / humanizer / content skills = content production

open-design / html-anything = artifact surfaces
taste-skill = visual taste gate
impeccable = layout/responsive/interaction design gate
Xiaohei / Guizang / Baoyu = visual/card/image styles
Kami / md2wechat / markdown-html = typesetting and deliverables

Remotion / HyperFrames / video-use / MoneyPrinterTurbo reference = video
publishers / fingerprint browser / proxy isolation = publishing risk
gstack / Playwright / review / ship = final proof
```

This is the architecture to keep. Individual tools can be swapped later, but this module separation should not drift.

## Sources

- Local technical ledger: `C:\Users\longfei\.codex\memories\longka_technical_base_ledger.md`
- Longka base context: `E:\Codex\ai-native\AI_NATIVE_BASE_CONTEXT.md`
- Taste Skill: `https://github.com/Leonxlnx/taste-skill.git`
- Impeccable: `https://github.com/pbakaus/impeccable.git`
- Waza: `https://github.com/tw93/Waza`
- Kami: `https://github.com/tw93/Kami`
- GSAP skills: `https://github.com/greensock/gsap-skills`
- MoneyPrinterTurbo: `https://github.com/harry0703/MoneyPrinterTurbo.git`
- html-anything: `https://github.com/nexu-io/html-anything`
