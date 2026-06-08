# AI Native Project Agent Harness

This file is the first operational checklist for AI Native work in `E:\Codex\ai-native`.

## Required Context

Read these before changing code:

- `E:\Codex\ai-native\PROJECT_CONTEXT_INDEX.md`
- `C:\Users\longfei\.codex\memories\longka_visible_workflow.md`
- `C:\Users\longfei\.codex\memories\ai-native-content-production-rules.md`

## Current Product Boundary

- Main prototype: `E:\Codex\ai-native\apps\command-center-prototype`
- Command-center page: `workbench-v2.html`, `workbench-v2.js`, `workbench-v2.css`
- Xiaohongshu card preview/export: `xhs-card-preview.html`, `xhs-card-preview.js`, `styles.css`, `tools/export-xhs-cards.mjs`
- State file: `data/command-center.json`

## Working Rules

1. Start with a visible plan for any multi-step change.
2. Define the acceptance standard before editing.
3. Before designing or developing a new function, discuss the workflow and acceptance standard with Longfei and wait for confirmation.
4. Do not present mock data as real collected data.
5. Keep operator analysis separate from audience-facing copy, cards, and videos.
6. Use installed skills as production rules, not as names in UI.
7. Follow `E:\Codex\ai-native\CODING_RULES.md`. All new files and edits must be UTF-8. Do not add new business logic to mojibake-heavy legacy files when a clean module can hold it.
8. After edits, run syntax checks and, when possible, produce a visible screenshot/export path.
9. Final response must include exact changed files and verification results.

## Merged Skill Stack

For AI Native content work, use one combined operating system:

```text
Longka harness
+ Superpowers
+ MediaCrawler
+ DBS skills
+ cheat-on-content
+ visual/video production tools
```

The responsibilities are fixed:

- **Longka harness** is the gate: read context, define goal and boundary, show sources/rationale/draft, wait for confirmation, then execute and verify.
- **Superpowers** is the development discipline layer: invoke relevant skills before coding, keep a plan for multi-step work, verify before claiming completion, and do not skip review because a task looks small.
- **MediaCrawler** is the evidence source: collect high-performing posts, metrics, URLs, and comments. Do not replace failed real collection with fake samples.
- **Agent-Reach** is the exploration and verification layer: use it to quickly inspect external pages, accounts, repos, videos, and social discussions before deciding whether a source is worth collecting. Do not treat Agent-Reach output as production crawler data unless it is converted into a normalized `content_sample` with source URL, tool name, and collection status.
- **DBS skills** are the content judgment layer: deconstruct customer questions, validate topic value, generate title candidates, check hooks, diagnose content quality, and remove AI-like writing.
- **cheat-on-content** is the calibration layer: onboarding anchors, scoring, blind prediction, post-publish retro, and rubric evolution.
- **Image/card/video tools** are execution layers: only run after the operator confirms the copy or script in the web UI.

Do not maintain parallel scoring systems. DBS observations must feed the Longka scoring rubric; cheat-on-content-style scoring and retro must be the single calibration record.

### cheat-on-content Codex Routing

Codex does not have Claude Code slash-command harness. When Longfei or an operator uses natural language that matches cheat-on-content actions, route by reading the source skill file first, not by memory:

- `初始化 cheat-on-content` / `init cheat-on-content` -> read and execute `external/cheat-on-content/skills/cheat-init/SKILL.md`.
- `打分这篇 ...` / `score this ...` -> read and execute `external/cheat-on-content/skills/cheat-score/SKILL.md`.
- `启动预测 ...` / `start prediction ...` -> read and execute `external/cheat-on-content/skills/cheat-predict/SKILL.md`.
- `拍了 ...` / `shot ...` -> read and execute `external/cheat-on-content/skills/cheat-shoot/SKILL.md`.
- `已发布 ...` / `shipped ...` -> read and execute `external/cheat-on-content/skills/cheat-publish/SKILL.md`.
- `复盘 ...` / `retro ...` -> read and execute `external/cheat-on-content/skills/cheat-retro/SKILL.md`.
- `升级 rubric` / `bump rubric` -> read and execute `external/cheat-on-content/skills/cheat-bump/SKILL.md`.
- `状态` / `status` -> read and execute `external/cheat-on-content/skills/cheat-status/SKILL.md`.

For Longka product UI, keep using customer-facing words such as `发布前判断`, `复盘校准`, and `实际表现档位`. Do not expose `cheat-on-content`, `blind prediction`, or `rubric` as normal customer UI labels.

## Content Factory Loop

The product goal is a practical content creation factory for article/image-text posts and short videos. The loop is:

```text
customer onboarding
-> industry, goal, platform, keywords
-> MediaCrawler quick scan
-> 5-10 anchor samples
-> comment deep dive on high-value posts
-> customer question bank, title bank, topic bank, structure bank
-> topic candidates with score and prediction
-> operator selects one source/topic
-> DBS title candidates and SOP rewrite
-> DBS/AI-tone/content quality check
-> web UI copy confirmation
-> generate image-text cards or Xiaomei video task
-> publish/record result
-> T+3 retro
-> update customer rubric and asset library
```

The system must support two final content forms:

- **Image-text / article**: Xiaohongshu post, Moments copy, WeChat article, card set.
- **Short video**: Douyin, Kuaishou, Video Account, Xiaohongshu video, Xiaomei video task.

## Onboarding And Anchors

First-use onboarding should be short, not a long questionnaire. Use five yes/no decisions:

1. Is the primary goal lead generation or consultation?
2. Is Xiaohongshu the first platform?
3. May the system reference competitor or benchmark viral content?
4. May the system save a local content asset database?
5. Will the operator review post-publish data?

After onboarding, the system must build 5-10 anchor samples. Prefer MediaCrawler real posts from the customer's industry and keywords. If collection fails, show the failure and ask for manual import; do not invent anchors.

## Scoring And Prediction

Every recommended topic must show a score before copy generation. The first V1 scoring dimensions are:

- Source binding: real source, URL, metrics, trace ID.
- Comment problem value: customer questions, doubts, fears, requests.
- Save value: whether users would bookmark it for later.
- Hook/title potential: whether the first screen creates a reason to click.
- Conversion path: whether it can naturally lead to consultation, test, visit, purchase, or private message.
- Risk boundary: claims, compliance, medical/financial promises, plagiarism risk.
- Differentiation: whether it is meaningfully different from recent drafts.

Before web confirmation, each draft must include:

- Why it may work.
- Where it may fail.
- Which source post/comment problem it is bound to.
- What was copied structurally.
- What must not be copied directly.

After publishing, the operator should record likes, saves, comments, shares, private messages, consultations, and customer questions. Retro findings update the customer database and scoring rubric.

## Content Pipeline Standard

The first working loop must be:

1. Choose task and target platform.
2. Collect real platform material.
3. Show source, metrics, comments, and traceable evidence.
4. Let the operator choose a topic.
5. Diagnose and transform the topic.
6. Produce clean platform-specific copy.
7. Produce matching visual assets or video assets.
8. Export files the operator can actually use.

## Visual Card Standard

For Xiaohongshu card sets:

- Target size: `1080x1440`, 3:4.
- Minimum set: cover, pain scene, evidence/judgment, method/process, result/value, action/checklist.
- Each card needs a clear role, strong hierarchy, and an evidence/visual area.
- If using external images, log source URLs in `assets/SOURCES.md` or the export manifest.
- If no real images are available, clearly mark the visual as a designed placeholder and do not pretend it is real evidence.
