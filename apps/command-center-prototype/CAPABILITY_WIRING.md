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
| Create intel task | calls `/api/tasks` | mediacrawler + agent-reach + GEOFlow |
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

## Implementation Order

1. Store employees, daily rentals, tasks, and deliverables in 122.
2. Replace frontend demo task creation with 122 API calls.
3. Add a worker/orchestrator service that maps task types to skill pipelines.
4. Connect visual tasks to 43 generation and sync results back to 122.
5. Connect content tasks to local/Codex text generation and save deliverables.
6. Connect video tasks to video-use / Remotion pipeline.
7. Add Waza-style self-evolution gate for new technical bases: intake, classify, trial, distill, promote, prune, verify.
8. Add taste-skill review gate for website, U-disk shell, mini program pages, and workbench pages.
9. Add GSAP motion demo task type for product explanation pages and AI employee workflow demonstrations.
10. Add mini program pages using the same task and deliverable API.
11. Package USB version as local shell against the same task model.
