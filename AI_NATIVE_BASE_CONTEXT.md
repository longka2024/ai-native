# Longka AI Native Base Context

Updated: 2026-05-20

This is the first file to read when resuming Longka AI Native base-system work.

## Core Thesis

Longka is not a toolbox and not a single app.

Longka is an AI Native industry workflow product factory:

```text
market signal
-> evidence card
-> human decision
-> workflow design
-> agent execution
-> business deliverable
-> publishing / sales / delivery
-> feedback and iteration
```

The founder or operator remains the decision maker. AI should collect evidence, draft options, execute repeatable work, and expose uncertainty. It should not pretend to decide business direction without evidence.

## Current Architecture

The base system has four connected surfaces:

1. Market Radar
   - User: Longfei.
   - Purpose: discover opportunities, collect pain evidence, decompose expert workflows, and decide what is worth building.

2. Revenue Workflow
   - User: business owners and sales operators.
   - Purpose: extract sales champion know-how, objections, customer profiles, follow-up actions, and conversion material.

3. Content Factory
   - User: Xiaomei, operators, content teams, small business owners.
   - Purpose: turn real business material into Moments posts, Xiaohongshu posts, image cards, articles, short videos, covers, and publishing packs.

4. Industry Workflow Products
   - User: vertical-industry customers.
   - Purpose: package proven workflows into sellable products, such as personal image/color report, private-domain sales assistant, and video production workbench.

## Technical Base Additions

### Waza / Self-Evolution Governance Layer

Source: `https://github.com/tw93/Waza.git`

Role in Longka:

- Belongs to the governance and self-improvement layer, not the customer-visible feature layer.
- Provides a workflow for deciding, debugging, checking, auditing, learning, and distilling.
- Helps prevent the technical base from becoming a pile of random open-source projects.
- Converts repeated mistakes into Longka-owned skills, SOPs, checklists, and verification rules.

Boundary:

- Use Waza as a controlled workflow reference and installed skill set.
- Do not let it replace business validation or customer evidence.
- Do not promote project-specific commands, local paths, or private context into Longka-owned rules.
- Installer reported medium/high risk on some skills, so treat third-party skills as supply-chain artifacts.

Reference note:

- `E:\Codex\docs\strategy\waza-self-evolution-tech-base.md`

### Kami / Deliverable Design And Packaging Layer

Source: `https://github.com/tw93/Kami.git`

Relationship to Waza:

- `Waza` governs how AI employees think, execute, check, and evolve.
- `Kami` governs how finished work is packaged into boss-readable documents, decks, reports, pages, and shareable business artifacts.

Role in Longka:

- Belongs to the final deliverable expression layer, not the raw execution layer.
- Turns agent output into customer-facing reports, proposal documents, project reviews, content packs, investor one-pagers, onboarding guides, and polished PDFs/pages.
- Helps Longka sell "finished business artifacts" rather than "AI generated text".
- Strengthens the U-disk, web, and mini-program editions because every AI employee can end work with a clear deliverable.

Boundary:

- Do not use Kami to make weak evidence look polished.
- Do not let visual packaging replace workflow validation.
- Distill its document and page patterns into Longka-owned templates.

Reference note:

- `E:\Codex\ai-native\docs\strategy\kami-deliverable-design-tech-base.md`

### WeChat Assistant / Private-Domain Intelligence Reference

Source: `https://github.com/huangserva/wechat-assistant.git`

Role in Longka:

- Belongs to the private-domain intelligence and local data ingestion layer.
- Useful as an architecture reference for local incremental collection, structured extraction, prompt modules, cron analysis, and operator delivery.
- Supports the "经营情报员工" concept: todos, schedules, group digest, trending topics, technical discussion, and user preference profiling.

Boundary:

- High risk: the repo includes process-memory WeChat key extraction and requires `sudo`.
- "Signature passed" means macOS permits local process-memory key extraction; it is a technical precondition, not a zero-risk commercial safety guarantee.
- After key extraction, the better path is DB-first local reading: decrypted DB + WAL patch + `collector.db` + structured extractors.
- Do not make this the default customer-facing path.
- Do not build the AI Native system around fighting WeChat platform controls.
- Prefer safe import/export, user-selected local files, public comments, and authorized data sources.

Reference note:

- `E:\Codex\docs\strategy\wechat-assistant-private-domain-tech-base.md`

### WeChat Radar / Local-First Business Intelligence Dashboard

User-provided source: `https://github.com/huangserva/wechat-radar.git`

Resolved accessible source during review: `https://github.com/joeseesun/wechat-radar`

Role in Longka:

- Belongs to the private-domain intelligence dashboard and business inbox layer.
- Strong reference for "经营雷达": daily priority messages, topic radar, link intelligence, group daily reports, @me messages, high-signal people, and local SQLite storage.
- The important pattern is dashboard-first signal compression, not raw chat parsing.

Boundary:

- The accessible README positions it as learning/research/personal non-commercial use and depends on macOS, WeChat 4.x, wx-cli, and local setup.
- Code review confirmed `wechat-radar` is DB-first by default and only uses legacy `wx` mode when `WECHAT_RADAR_DATA_SOURCE=wx`.
- Do not sell wx-cli access or WeChat decryption as the default commercial path.
- Keep legacy `wx` mode research-only; prefer `wechat-assistant` decrypted output and `collector.db`.
- Local Longka safety patch adds `WECHAT_RADAR_ALLOW_LEGACY_WX=1` as a second gate before legacy wx mode can run.
- Local Longka safety patch adds `WECHAT_RADAR_ALLOW_LLM_EGRESS=1` plus request consent before non-local LLM receives sampled chat content.
- Do not do account-control behavior such as sending, adding friends, likes, comments, or profile changes.
- Use local-first storage and user-approved summaries/tasks.

Reference note:

- `E:\Codex\docs\strategy\wechat-radar-intelligence-dashboard-tech-base.md`

### Taste Skill / Design Taste Governance Layer

Source: `https://github.com/Leonxlnx/taste-skill.git`

Role in Longka:

- Belongs to the design quality and frontend review layer, not the business execution layer.
- Works after `open-design` / `html-anything` draft a page and before customer-facing release.
- Prevents generic AI design patterns: cramped buttons, weak hierarchy, purple-blue AI gradients, three-card templates, unreadable button text, and low-end dashboard pages.
- Useful for AI Native website, U-disk shell, mini program user center, order/report pages, Xiaomei video workbench, and product landing pages.

Boundary:

- Do not use it as business strategy.
- Do not let "high-end visual" rules override product clarity for serious business dashboards.
- It is a quality gate: layout, hierarchy, typography, button states, mobile fit, empty/loading/error states.

Reference note:

- `E:\Codex\docs\strategy\taste-skill-tech-base.md`

### GSAP Skills / Motion Interaction Layer

Source: `https://github.com/greensock/gsap-skills`

Role in Longka:

- Belongs to the presentation and interaction layer, not the business execution layer.
- Works with `open-design` and `html-anything` to turn static pages into dynamic product demos.
- Helps explain complex AI Native workflows visually: market signal -> evidence -> human approval -> AI employee execution -> deliverable -> feedback.
- Useful for website edition, U-disk shell home screen, investor demos, product landing pages, and future task-board animations.

Boundary:

- Do not add decorative animation to serious dashboards unless it improves comprehension.
- Prefer `transform` and `opacity`; avoid layout-shifting animation.
- React usage must use scoped animation and cleanup.

Reference note:

- `E:\Codex\docs\strategy\gsap-skills-tech-base.md`

### MoneyPrinterTurbo / Short-Video Production Pipeline Reference

Source: `https://github.com/harry0703/MoneyPrinterTurbo.git`

Role in Longka:

- Belongs to the video production pipeline layer.
- Useful for improving Xiaomei's video workbench through batch variants, clip rhythm controls, transition presets, subtitle presets, audio mix presets, material preprocessing, and visible task progress.
- It should inform the existing Remotion/FFmpeg workflow rather than replace it wholesale.

Boundary:

- Do not make generic stock-footage generation the core proof for personal image reports.
- Do not copy the Streamlit UI.
- Do not expose too many technical controls to Xiaomei.
- Keep Longka's domain proof: real customer photo, real report image, strong hook, good cover, and clear CTA.

Reference note:

- `E:\Codex\ai-native\docs\strategy\money-printer-turbo-video-tech-base.md`

### HyperFrames / Premium Video Expression Layer

Local skills:

- `C:\Users\longfei\.codex\skills\hyperframes`
- `C:\Users\longfei\.codex\skills\hyperframes-cli`

Role in Longka:

- Belongs to the video presentation and motion-design layer.
- Useful for premium title cards, strong first-3-second hooks, animated text emphasis, product-flow overlays, audio-reactive highlights, kinetic typography, polished transitions, and CTA endings.
- Best used as an optional premium-scene generator around the existing Remotion/FFmpeg workbench.

Boundary:

- Do not replace Xiaomei's whole workbench with HyperFrames.
- Do not make normal video generation depend on it.
- Do not ask Xiaomei to run HyperFrames manually.
- Use it first for one excellent 3-second opener, then report section cards and CTA endings.

Reference note:

- `E:\Codex\ai-native\docs\strategy\hyperframes-video-expression-tech-base.md`

## Non-Negotiable Product Principles

- Do not start from "AI can do this"; start from repeated pain evidence.
- Do not treat crawlers, prompts, agents, or CLIs as customer-facing products.
- Customer-facing language must describe business outcomes.
- Frontend should be simple; orchestration can be complex behind the scenes.
- Human decision points must be explicit: approve pain, approve direction, approve copy, approve assets, approve final output.
- Every workflow needs evidence, output, review, and reuse.
- Do not generate content without real business material when the goal is conversion.
- Keep private-domain data local by default unless the user explicitly chooses otherwise.

## Active Business Tracks

### 1. Personal Image / Color Report

Purpose: a real vertical project and commercial proof point.

Important context:

- Repo: `E:\Codex\personal-image-report-product`
- Public demo: `https://belocalchina.com/personal-image-report-demo/`
- Server: `ubuntu@43.135.149.55:/home/ubuntu/personal-image-report-demo`
- Durable memory: `C:\Users\longfei\.codex\memories\personal-image-report-production-rules.md`
- Status file: `E:\Codex\PERSONAL_IMAGE_REPORT_PROJECT_STATUS.md`

Current role in the base system:

- Demonstrates report delivery.
- Supplies real case material for content/video workflows.
- Exposes asset governance problems: authorized sample images, customer finished images, watermarks, image clarity, and Mini Program packaging limits.

### 2. Video Production Workbench

Purpose: standardize the painful manual video-production loop into an operator-friendly workbench.

Important context:

- Main project: `E:\Codex\my-video`
- Recent plans:
  - `E:\Codex\my-video\docs\plans\2026-05-19-video-production-workbench-design.md`
  - `E:\Codex\my-video\docs\plans\2026-05-19-video-production-workbench.md`
- Template catalog: `E:\Codex\my-video\video-workbench\catalog.json`
- Strategy source: `E:\Codex\LONGKA_VIDEO_WORKFLOW_ASSISTANT_PRD.md`

Current role in the base system:

- A content-factory production surface.
- Must solve: script approval, template choice, asset matching, cover generation, music selection, render, final QA, and daily repeatability for Xiaomei.
- It is not the whole base system.

### 3. Private Domain / Sales / Moments

Purpose: convert real customer language and chat evidence into revenue workflows.

Important context:

- `E:\Codex\LONGKA_REVENUE_WORKFLOW_PRODUCT_PRACTICE.md`
- `E:\Codex\LONGKA_MARKETING_AND_SALES_PRODUCT_ARCHITECTURE.md`
- `E:\Codex\LONGKA_PRIVATE_DOMAIN_INTELLIGENCE.md`

Current role in the base system:

- Sales champion extraction comes before broad content volume for paying business owners.
- Content factory and sales assistant should share data later, but not be mixed too early.

## Canonical Source Files

Read these before making broad architecture claims:

- `E:\Codex\PROJECT_CONTEXT_INDEX.md`
- `E:\Codex\AGENT_HARNESS.md`
- `E:\Codex\AI_NATIVE_STARTUP_PLAYBOOK.md`
- `E:\Codex\LONGKA_AI_NATIVE_COMPANY_PLAYBOOK.md`
- `E:\Codex\LONGKA_MARKETING_AND_SALES_PRODUCT_ARCHITECTURE.md`
- `E:\Codex\LONGKA_REVENUE_WORKFLOW_PRODUCT_PRACTICE.md`
- `E:\Codex\LONGKA_VIDEO_WORKFLOW_ASSISTANT_PRD.md`
- `E:\Codex\PERSONAL_IMAGE_REPORT_PROJECT_STATUS.md`
- `E:\Codex\docs\strategy\decision-log.md`
- `E:\Codex\docs\strategy\product-evolution-timeline.md`

Durable memory files:

- `C:\Users\longfei\.codex\memories\ai-native-startup-playbook.md`
- `C:\Users\longfei\.codex\memories\longka-marketing-sales-architecture.md`
- `C:\Users\longfei\.codex\memories\longka-revenue-workflow-product-practice.md`
- `C:\Users\longfei\.codex\memories\personal-image-report-production-rules.md`
- `C:\Users\longfei\.codex\memories\skill-productization-governance.md`

## Resume Protocol

At the start of a future session about Longka base-system evolution:

1. Read this file.
2. Read `docs/strategy/decision-log.md`.
3. Read the current vertical project file only if the task targets that vertical.
4. Do not summarize from the current chat window alone.
5. If history is incomplete, say which source files were read and which period is still uncertain.

## 2026-05-28 Content Output Base Update

New strategy docs:

- `E:\Codex\ai-native\docs\strategy\content-output-base-architecture.md`
- `E:\Codex\ai-native\docs\strategy\video-use-video-qa-recut-tech-base.md`
- `E:\Codex\ai-native\docs\strategy\video-rhythm-rules.md`
- `E:\Codex\ai-native\docs\strategy\content-source-adapters.md`

Important video-production rule:

- Remotion remains the stable main template layer.
- HyperFrames is the premium opener/title/transition/CTA layer.
- FFmpeg is the concat/mix/export layer.
- video-use is the QA, timeline analysis, recut, and second-pass optimization layer.
- MoneyPrinterTurbo is an engineering reference for batch variants, subtitles, rhythm, material gates, and progress visibility.

Xiaomei video rhythm correction:

- The previous first 3 seconds felt too short, while middle transitions felt too long.
- New Remotion rhythm: scene 1 is 0-9s, scene 2 is 8-17s, scene 3 is 16-25s, scene 4 is 24-35s.
- Transition fade is about 10 frames, not long drifting mid-video transitions.
- HyperFrames color-report opener is 4s, with the first 2.5s building the main visual and the final second holding CTA.

## 2026-05-29 Intelligence Adapter Correction

After reviewing the X video case about a Xiaohongshu explosive-post replication agent, do not hard-code `xhs-cli` as the main crawler.

Correct source priority:

- `apify-xhs`: primary route for XHS hot post samples and comments in P1/P2.
- `xcrawl-web`: public/dynamic web, competitor pages, search result pages.
- `manual-import`: required fallback when platforms block server-side access; screenshots/copied text/comments still enter the same analysis flow.
- `xhs-cli`: low-frequency local verification after login/cookie setup, not the production crawler.

All collection tools must emit a normalized `content_sample` schema before analysis. Failed collection must show a reason and fallback options, never silently fall back to fake seed data.
