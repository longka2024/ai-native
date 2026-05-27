# WeChat Radar Intelligence Dashboard Technical Base

Updated: 2026-05-28

User-provided source: `https://github.com/huangserva/wechat-radar.git`

Resolved accessible source during review: `https://github.com/joeseesun/wechat-radar`

## Decision

`wechat-radar` is highly relevant to Longka AI Native, but it must be absorbed as a local-first intelligence dashboard pattern, not as a WeChat account automation product.

It is stronger than a raw chat parser because it turns noisy group history into an operator-facing workbench:

```text
local WeChat history
-> local SQLite intelligence store
-> daily group/message/link/topic/person signals
-> dashboard by date
-> copyable reports / AI follow-up context
```

## Code Review Findings

Local source reviewed at `E:\Codex\wechat-radar` on 2026-05-28.

Important files:

- `lib/config.ts`
- `lib/wx.ts`
- `lib/wechat-db-adapter.ts`
- `lib/assistant-source.ts`
- `lib/dashboard-intelligence.ts`
- `app/api/*`
- `SECURITY.md`
- `PRIVACY.md`

### Default Data Source Is DB-First

`lib/config.ts` defines:

```text
WechatDataSource = 'db' | 'wx'
```

The default is `db`. It only switches to `wx` when:

```text
WECHAT_RADAR_DATA_SOURCE=wx
```

`lib/wx.ts` is a compatibility adapter. Every main method first checks `useDbAdapter()`:

```text
if data source is not wx -> use wechat-db-adapter
else -> call wx CLI
```

So the current primary architecture is:

```text
wechat-assistant decrypted output / collector.db
-> wechat-db-adapter
-> radar local cache
-> dashboard APIs
```

Legacy `wx` mode remains, but it is not the preferred path.

### What The DB Adapter Reads

`lib/wechat-db-adapter.ts` reads:

- `collector.db`
- `decrypted/session/session.db`
- `decrypted/contact/contact.db`
- `decrypted/message/message_*.db`

It provides:

- sessions
- history
- stats
- stats range
- new messages
- members
- search

It prefers collector data, then falls back to raw decrypted DBs when collector misses a chat.

### Assistant Analysis Products

`lib/assistant-source.ts` reads `assistant.db` products:

- todos
- calendar events
- digests
- knowledge items
- trending topics
- trending URLs
- tech highlights

This confirms the two-stage architecture:

```text
wechat-assistant = extraction and AI products
wechat-radar = dashboard and review cockpit
```

### Remaining wx-cli Surface

Some API routes still import `lib/wx.ts`, but because `lib/wx.ts` defaults to DB adapter, this is acceptable if config remains `db`.

Risk only rises if the user sets:

```text
WECHAT_RADAR_DATA_SOURCE=wx
```

Longka should disable or hide legacy `wx` mode in commercial packaging unless explicitly enabled for internal research.

### Longka Safety Patch

Applied locally to `E:\Codex\wechat-radar` on 2026-05-28:

- Added `lib/safety.ts`.
- `lib/wx.ts` now ignores legacy `wx` mode unless `WECHAT_RADAR_ALLOW_LEGACY_WX=1`.
- `/api/setup` now returns safety status, effective data source, local paths, and detected sensitive files.
- `/api/lab/analyze` now blocks non-local LLM analysis of sampled chat content unless `WECHAT_RADAR_ALLOW_LLM_EGRESS=1` and request consent includes `raw_content_egress_accepted=true`.
- `.env.example` documents both safety gates.

This changes the default failure mode:

```text
before: WECHAT_RADAR_DATA_SOURCE=wx could accidentally activate live wx-cli mode
after: wx mode is ignored unless a second explicit environment gate is enabled
```

And:

```text
before: user consent checked provider/model/sample count
after: non-local LLM raw-content egress also needs environment approval and explicit request consent
```

Verification:

- `pnpm exec tsc --noEmit` passed.
- `pnpm test` could not run because the existing test script requires `tsx`, but `tsx` is not listed in `devDependencies`.

## What It Does

The accessible README describes WeChat Radar as a local-first WeChat group intelligence dashboard. It aggregates:

- Daily priority messages.
- Topic radar across groups.
- Link intelligence with deduped articles and tools.
- Group daily reports.
- @me messages.
- High-signal people.
- Local SQLite storage.

It is not just a chat-record list. It is a daily intelligence cockpit.

## Why It Matters To Longka

This is very close to the boss-facing AI Native "经营雷达" surface.

The user does not want to manually search chat history. The useful product should answer:

- What should I read first today?
- Which group is discussing a business opportunity?
- Which links are worth saving?
- Which people repeatedly provide useful signals?
- Which topics are rising across multiple groups?
- Which messages should become tasks, content ideas, sales follow-up, or research notes?

## Screenshot Product Pattern

The user-provided screenshot shows a strong product shape:

```text
left sidebar: source groups / collections / modules
top bar: search, date range, period switch, sync controls
metric row: active groups, total messages, @me, silent groups
today queue: messages, articles, tools, abnormal movements
signal panels: key topics, links, important changes, high-signal people
action layer: copy summary, open detail, create follow-up, create task
```

This is better than a normal admin dashboard because it starts from the operator's daily question:

```text
What should I look at first today?
```

For Longka, this means the first screen of "私域经营雷达" should not be a raw table. It should be:

- Today first.
- Signals before records.
- Evidence drill-down behind every signal.
- Actions beside every signal.
- Local sync state visible but not dominant.

## Fit In Longka Base

Layer: private-domain intelligence dashboard / local-first signal processing / business inbox.

Related bases:

- `wechat-assistant`: deeper assistant pipeline with todo, calendar, digest, trend, Feishu push.
- `wechat-radar`: better visible dashboard pattern for human review.
- `mediacrawler`: public platform comments and content signals.
- `AIMedia`: hotspot -> AI content creation -> publish workflow.
- `Waza`: risk gate and self-evolution mechanism.

## What To Absorb

### 1. Dashboard-first, not parser-first

Longka should not expose "chat database parsing" as the main product.

Expose:

```text
今日经营雷达
-> 优先处理
-> 商机线索
-> 热点话题
-> 链接情报
-> 高信号人物
-> 可生成任务
```

Suggested modules:

- 看板: today's operating queue.
- 话题雷达: repeated pain, demand, and topic clusters.
- 热点信号: unusually rising groups, links, keywords, and people.
- 链接情报: deduped tools, articles, products, and competitor links.
- 承诺追踪: promises, todos, quotes, schedules, and missed follow-ups.
- 人物雷达: customers, channels, experts, KOLs, and high-signal speakers.
- 知识库: reusable pain phrases, cases, offers, objections, and answers.
- 复盘: weekly signal summary, conversion clues, and content opportunities.

### 2. Date-based daily cockpit

The daily view is important because bosses think in "today's work", not in raw tables.

Longka should structure private-domain intelligence around:

- Today.
- Yesterday.
- This week.
- Source group.
- Signal type.
- Follow-up status.

### 3. Signal compression before AI

The repo demonstrates a useful compression pattern:

```text
full chat history
-> priority items / topics / links / daily digest
-> selected context for AI
```

This protects cost, privacy, and context quality.

### 4. Copyable report as bridge

Before full automation, the dashboard can provide reports that users copy into AI or approve into tasks.

Longka should build:

- Copy summary.
- Create task.
- Create content idea.
- Mark follow-up.
- Save to knowledge base.

### 5. Local-first storage

Local SQLite is the right early architecture for sensitive personal/private-domain data.

Longka should adopt:

- local store for raw/private data
- cloud only for user-approved summaries, tasks, and deliverables
- clear data boundary in UI

## Risk Boundary

The accessible README says the project requires macOS, WeChat 4.x, wx-cli, and recommends using a test account or older account rather than a main WeChat account. It also says it is for learning/research/personal non-commercial use.

Longka must keep this boundary:

- Do not sell wx-cli access as a default SaaS feature.
- Do not do sending, adding friends, likes, comments, profile changes, or Moments operations.
- Do not make customers risk their primary WeChat account.
- Do not upload raw chat history to cloud by default.
- Do not hide platform-risk warnings.

More precise conclusion after code review:

- DB-first dashboard reading is the right Longka path.
- Legacy `wx` mode should be treated as research-only.
- The actual high-risk step is upstream key extraction in `wechat-assistant`, not the radar dashboard itself.
- LLM-assisted lab analysis is data egress and needs explicit user confirmation.

## Longka Product Direction

Build a safer "经营雷达" inspired by this:

```text
Data adapters
-> local signal store
-> daily business radar
-> human review
-> AI employee task creation
-> content / follow-up / research / report output
```

The first commercializable surface is not "微信解密工具".

It is:

```text
老板每天打开 Longka
看到今天的商机、话题、客户信号、待跟进事项、可发布内容
点一下生成任务或交给 AI 员工处理
```

## Promotion Rule

Promote the dashboard and signal-compression pattern.

Do not promote platform-risk implementation details into the default commercial product.
