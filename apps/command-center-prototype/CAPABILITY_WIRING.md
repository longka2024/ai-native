# AI Native Command Center Capability Wiring

This prototype is the visible shell. The next step is connecting each visible action to real capabilities.

## Frontend Actions

| UI action | Current prototype behavior | Real backend target |
| --- | --- | --- |
| Select employee | toggles card state | create daily employee rental record |
| Start daily plan | calls `/api/daily-plan` and creates tasks | call orchestrator to decompose tasks |
| Create content task | calls `/api/tasks` | content-strategy + copywriting + social-content |
| Create visual task | calls `/api/tasks` | gpt-image-2-style-library + 43 image generation |
| Create video task | calls `/api/tasks` | video-use + remotion-video + tts |
| Create intel task | calls `/api/tasks` | source adapters: Apify first for XHS samples, xcrawl for public/dynamic web pages, manual import as fallback, xhs-cli only for low-frequency local verification |
| Hot signal to task | calls `/api/tasks` from 经营雷达 | AIMedia-style hotspot capture -> content task |
| Design quality review | calls `/api/tasks` | taste-skill audit -> hierarchy, spacing, CTA, mobile states |
| Create motion page | calls `/api/tasks` | open-design/html-anything -> GSAP skills -> interactive demo page |

## AIMedia Ideas Absorbed

Useful AIMedia concepts absorbed into this prototype:

- Hotspot radar: market/platform signals are surfaced before content creation.
- Content task queue: every useful signal can become a production task.
- Publish queue: generated assets need a review/publish state, not just files.
- Operations monitor: logs, task status, and publishing records are part of the product surface.

Not copied directly:

- Django/PySide6 heavy framework.
- Blind automatic multi-platform posting, because platform risk and account safety need controlled rollout.

## Local Prototype API

Run:

```powershell
node E:\Codex\ai-native-command-center-prototype\server.mjs
```

Open:

```text
http://localhost:3760
```

Current API:

- `GET /api/state`
- `POST /api/tasks`
- `POST /api/daily-plan`
- `POST /api/advice`

## System Mapping

- Website / mini program / USB shell: visible customer entry.
- 122 server: users, orders, payment, employee rental, task state, deliverable records.
- 43 server: image/report generation through the verified Codex CLI path.
- Codex skills: planning, prompt template selection, content generation, video generation, analysis.
- Waza: self-evolution governance for intake, decision, diagnosis, release checks, health audits, and distillation into Longka-owned skills.
- wechat-assistant: private-domain intelligence reference for local incremental collection, structured extraction, prompt modules, and operator delivery, but not a default customer-facing WeChat automation path.
- wechat-radar: local-first business intelligence dashboard reference for daily signals, topics, links, group reports, and high-signal people.
- open-design / html-anything: polished report pages, dashboards, share pages, exportable assets.
- taste-skill: design taste governance for customer-facing pages, mini program pages, workbenches, landing pages, and share pages.
- GSAP skills: motion and interaction layer for product demos, storytelling pages, employee task flows, and high-conversion landing pages.
- multica + agency-orchestrator pattern: visible task board plus backend multi-agent decomposition.

## Waza Ideas Absorbed

Source: `https://github.com/tw93/Waza.git`.

Useful concepts absorbed into this prototype:

- `think`: classify and plan before adding another technical base.
- `hunt`: diagnose root cause before patching bugs or regressions.
- `check`: review release readiness before mini program upload, server sync, or packaged delivery.
- `health`: audit instruction drift, stale memory, missing verification, and code bloat.
- `learn/read/write`: turn outside repos and articles into Longka-owned notes, SOPs, and customer-facing explanations.

Strategic role:

- Waza is not a new customer-facing employee.
- It is the internal operating loop that decides what enters Longka, what gets promoted into a Longka-owned skill, and what gets pruned.

## WeChat Assistant Ideas Absorbed

Source: `https://github.com/huangserva/wechat-assistant.git`.

Useful concepts absorbed into this prototype:

- Separate local collector scripts from LLM reasoning prompts.
- Use incremental scan state instead of repeatedly processing the same message history.
- Extract task-specific JSON before calling AI: todo, schedule, digest, trend, technical discussion, preference profile.
- Deliver results as an operator inbox, such as Feishu, AI Native command center, daily report, or admin dashboard.

Risk boundary:

- The repo uses local WeChat database decryption and process-memory key extraction. This is high risk for a commercial customer product.
- Longka should absorb the architecture pattern, not the risky default behavior.
- WeChat data support should be safe import/export first, local advanced mode second, and never account-control automation.
- For local advanced mode, prefer DB-first reading after explicit local setup: decrypted DB + WAL patch + collector.db. Do not make frequent live wx-cli calls the default.

## WeChat Radar Ideas Absorbed

User-provided source: `https://github.com/huangserva/wechat-radar.git`.

Accessible reviewed source: `https://github.com/joeseesun/wechat-radar`.

Useful concepts absorbed into this prototype:

- Build a daily intelligence cockpit instead of exposing raw chat tables.
- Compress full message history into priority messages, topics, links, group reports, @me signals, and high-signal people.
- Use local SQLite or local-first storage for sensitive private-domain data.
- Let users copy, approve, or convert signals into AI employee tasks before deeper automation.

Risk boundary:

- The project depends on wx-cli and local WeChat environment, and the reviewed README recommends cautious test-account use.
- Longka should absorb the dashboard pattern, not the risky default path.
- The product surface should be "经营雷达", not "微信解密工具".
- Code review confirmed the preferred radar path is DB-first, with legacy wx mode gated by `WECHAT_RADAR_DATA_SOURCE=wx`.

## Taste Skill Ideas Absorbed

Source: `https://github.com/Leonxlnx/taste-skill.git`.

Useful concepts absorbed into this prototype:

- Customer-facing pages need a taste gate before release, not just functional completion.
- Primary and secondary actions must have clear visual priority; payment buttons cannot visually fight with preview buttons.
- Workbench pages need state design: empty, loading, success, failure, and next-step guidance.
- Mini program and dashboard UI must avoid cramped cards, wrapped button text, generic AI gradients, and template-like three-card layouts.
- Redesign should preserve working business logic and improve the existing stack instead of rewriting everything.

Strategic role:

- open-design decides the concept.
- html-anything creates fast surfaces.
- taste-skill audits and upgrades visual quality.
- GSAP adds motion where it improves comprehension or conversion.
- The orchestrator and database remain responsible for real task state.

## GSAP Skills Ideas Absorbed

Source: `https://github.com/greensock/gsap-skills`.

Useful GSAP skill concepts absorbed into this prototype:

- `gsap-core`: card entrance, hover feedback, employee status transitions.
- `gsap-timeline`: explain a workflow as a controlled sequence instead of static blocks.
- `gsap-scrolltrigger`: long-form product storytelling pages for AI Native, U-disk edition, and vertical workflow products.
- `gsap-react`: future React/Next.js implementation needs scoped animation and cleanup.
- `gsap-performance`: only animate transform/opacity by default; avoid animation that makes work dashboards hard to scan.

Strategic role:

- open-design decides visual direction.
- html-anything generates fast HTML surfaces.
- GSAP turns those surfaces into understandable dynamic demos.
- Remotion exports final videos.
- Task/orchestrator layer tracks the business workflow behind the visuals.

## Guizang Social Card Skill Ideas Absorbed

Source: `https://github.com/op7418/guizang-social-card-skill.git`.

Installation status:

- 2026-05-29 attempted `git clone` and `git clone --depth 1`; both failed because the GitHub connection was reset.
- 2026-05-29 after VPN was disabled, installed successfully with:

```powershell
npx -y skills add https://github.com/op7418/guizang-social-card-skill.git -g
```

- Local path: `C:\Users\longfei\.agents\skills\guizang-social-card-skill`.
- Package includes `assets/`, `references/`, and `validate-social-deck.mjs`; it should be treated as the real card-design/QA base, not just a visual reference.

Useful concepts to absorb into the content production lines:

- Xiaohongshu image posts should not stop at text. A real publish package needs cover text, card layout, image ratio, and export files.
- The skill is positioned around social cards: Xiaohongshu 3:4 image sets, WeChat Official Account cover pairs, and WeChat Moments share covers.
- It can become the visual asset stage after `拆爆款 -> 写图文`: convert the selected topic into a card group, not only a plain markdown draft.
- The output should be operator-friendly: PNG cards plus copyable caption, not a design prompt that the user still has to interpret.
- The card generator must be paired with a design/taste gate: title hierarchy, line length, mobile legibility, CTA clarity, and no cramped button-like text blocks.

Where it fits:

```text
小红书图文生产线
-> 找选题
-> 拆爆款
-> 写图文
-> 生成小红书卡片组
-> 发前检查
-> 复盘优化
```

Concrete deliverables for this project:

- `小红书图文发布包`: title, caption, hashtags, comment guide, risk notes.
- `小红书卡片组`: 1 cover card + 3-6 content cards + 1 action card.
- `朋友圈分享卡`: one square image plus short share copy.
- `公众号封面`: one 21:9 cover and one 1:1 feed cover when the same topic is expanded into long content.
- 2026-05-29 local V1: `xhs-card-preview.html` previews the card set, and `npm run export:xhs-cards` exports 900x1200 PNG files to `exports/xhs-cards/<assetId>/`.

Integration rule:

- Do not expose "guizang skill" as a customer-facing name.
- Customer-facing UI should say `生成小红书卡片组` or `生成朋友圈分享卡`.
- Technical base can record the actual renderer and skill used for debugging.

## DBSkill Ideas Absorbed

Source: `dontbesilent2025/dbskill`, installed with:

```powershell
npx -y skills add dontbesilent2025/dbskill -g --all
```

Installation status:

- 2026-05-29 installed successfully into `C:\Users\longfei\.agents\skills`.
- 20 skills installed: `dbs`, `dbs-action`, `dbs-agent-migration`, `dbs-ai-check`, `dbs-benchmark`, `dbs-chatroom`, `dbs-chatroom-austrian`, `dbs-content`, `dbs-decision`, `dbs-deconstruct`, `dbs-diagnosis`, `dbs-goal`, `dbs-good-question`, `dbs-hook`, `dbs-learning`, `dbs-report`, `dbs-restore`, `dbs-save`, `dbs-slowisfast`, `dbs-xhs-title`.
- Installer risk note: `dbs-report` and `dbs-restore` were marked High Risk. They must stay behind an internal review gate and should not become customer-facing one-click actions until audited.

How this completes the graphic/text content production base:

```text
真实采集/手动导入
-> dbs-deconstruct 拆爆款
-> dbs-xhs-title 选标题公式
-> dbs-hook 打黄金开头
-> dbs-content 做内容诊断
-> guizang-social-card-skill 做卡片组
-> dbs-ai-check / taste gate 做发前检查
-> dbs-save 保存沉淀
-> dbs-report 复盘报告（内部审核后启用）
```

Customer-facing names:

- `拆爆款` maps to `dbs-deconstruct`.
- `起标题` maps to `dbs-xhs-title`.
- `写开头` maps to `dbs-hook`.
- `内容体检` maps to `dbs-content`.
- `生成小红书卡片组` maps to guizang social card skill after installation.
- `发前检查` maps to `dbs-ai-check` plus Longka platform compliance rules.
- `复盘优化` maps to `dbs-report` only after risk review.

Product rule:

- DBSkill is a method library, not the product name.
- The AI Native workbench should expose production actions, not skill names.
- Every skill output must be tied to a visible deliverable: title alternatives, hook alternatives, content diagnosis, card group, publish package, review checklist, or replay report.

## Implementation Order

0. Add the intelligence source adapter layer before more UI work:
   - `manual-import`: paste URL/text/screenshots/comments when platforms block automated access.
   - `apify-xhs`: preferred P1/P2 route for Xiaohongshu explosive-post samples and comments.
   - `xcrawl-web`: public web, dynamic pages, competitor pages, search result pages.
   - `xhs-cli`: local, low-frequency verification only after login/cookie setup; not the main production crawler.
   - all adapters must emit the same `content_sample` schema.
   - 2026-05-29 local V1 done: `manual-import` now writes `contentSamples`, mirrors samples into `rawMaterials`, and `/api/content-workflow/xhs/run` can generate candidates, tasks, and publish assets from imported Xiaohongshu samples.
1. Store employees, daily rentals, tasks, and deliverables in 122.
2. Replace frontend demo task creation with 122 API calls.
3. Add a worker/orchestrator service that maps task types to skill pipelines.
4. Connect visual tasks to 43 generation and sync results back to 122.
5. Connect content tasks to local/Codex text generation and save deliverables.
6. Connect video tasks to video-use / Remotion pipeline.
7. Add Waza-style self-evolution gate for new technical bases: intake, classify, trial, distill, promote, prune, verify.
8. Add taste-skill review gate for website, U-disk shell, mini program pages, and workbench pages.
9. Add GSAP motion demo task type for product explanation pages and AI employee workflow demonstrations.
10. Add social card generation stage for Xiaohongshu image posts and Moments share cards, using the installed guizang-social-card-skill templates, references, and validation gate.
11. Add mini program pages using the same task and deliverable API.
12. Package USB version as local shell against the same task model.

## Intelligence Source Adapter Standard

The command center must not hard-code a single crawler as "the Xiaohongshu solution". The right product behavior is:

```text
SOP first
-> choose adapter
-> collect or ask for fallback material
-> normalize samples
-> analyze samples
-> generate publishable assets
-> save the SOP and result for reuse
```

Required normalized schema:

```json
{
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
  "comments": [],
  "url": "",
  "cover": "",
  "sourceTool": "apify-xhs | xcrawl-web | xhs-cli | manual-import",
  "collectedAt": ""
}
```

Failure behavior is part of the product:

- If Xiaohongshu blocks server-side scraping, the system must explain the reason and ask for screenshots, copied text, copied comments, or accessible URLs.
- Failed collection must not silently fall back to fake seed data.
- The UI should show which adapter was used and whether the sample is real, imported, or demo.
