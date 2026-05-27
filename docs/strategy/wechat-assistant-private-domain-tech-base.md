# WeChat Assistant Private-Domain Technical Base

Updated: 2026-05-28

Source: `https://github.com/huangserva/wechat-assistant.git`

## Decision

`wechat-assistant` is strategically useful, but it must be treated as a high-risk private-domain intelligence reference, not as a default customer-facing feature.

It is valuable because it shows a complete local-first architecture:

```text
WeChat local encrypted DB / WAL
-> local decrypt and incremental sync
-> collector.db
-> structured extractors
-> Hermes cron prompts
-> LLM analysis
-> Feishu push / assistant.db
```

The useful part for Longka is not "control WeChat". The useful part is the workflow pattern:

```text
authorized local data
-> incremental collector
-> structured JSON
-> task-specific prompts
-> business digest / todo / calendar / trend / preference
-> operator review
```

## Code Review Findings

Local source reviewed at `E:\Codex\wechat-assistant` on 2026-05-28.

Important files:

- `scripts/decrypt/find_all_keys_macos.c`
- `scripts/decrypt/decrypt_db.py`
- `scripts/refresh_decrypt.py`
- `scripts/collector.py`
- `scripts/extract_*.py`
- `scripts/db_writer.py`
- `scripts/state_manager.py`

### What "Signature Passed" Actually Means

The C key scanner calls macOS `task_for_pid` to access the running WeChat process.

The code comments state the prerequisites clearly:

- WeChat must be ad-hoc signed or SIP disabled.
- The scanner must run as root with `sudo`.
- WeChat desktop must be running.

So "signature passed" does not mean commercial risk is gone. It means the local machine has allowed the scanner to read process memory and extract SQLCipher keys.

Once this step succeeds, the later daily workflow can mostly avoid repeated `wx` CLI calls:

```text
all_keys.json
-> decrypt_db.py
-> decrypted/session, decrypted/contact, decrypted/message
-> refresh_decrypt.py patches changed WAL frames
-> collector.py reads decrypted DBs
-> collector.db
-> extract_*.py
```

This is safer than frequent wx-cli account interaction, but still not a zero-risk or official WeChat integration.

### Database Reading Path

`decrypt_db.py` decrypts WeChat 4.x SQLCipher databases with:

- AES-256-CBC
- HMAC-SHA512
- page size 4096
- reserve size 80
- per-DB encryption key from `all_keys.json`

`refresh_decrypt.py` is the important daily freshness component:

- It checks DB and WAL mtimes.
- It validates page 1 HMAC to detect stale keys.
- It decrypts only needed prefixes: `message/`, `contact/`, `session/`.
- It patches valid WAL frames into decrypted DB files.
- If the main DB changes, it falls back to full decrypt.

`collector.py` then reads decrypted DBs in read-only SQLite mode and writes normalized rows into `collector.db`.

Key patterns:

- `watched_chats` controls what to sync.
- `sync_state.last_local_id` gives incremental per-chat progress.
- `sender='__self__'` marks the user's own messages based on `self_wxid`.
- `recent-hours` limits daily sync to active sessions.
- Public/service IDs are filtered out.

### Risk Points

- `all_keys.json` is extremely sensitive. If leaked, decrypted data can be recreated.
- `find_all_keys_macos` reads process memory with root privilege.
- HMAC failure means the key may be stale, usually after WeChat restart or database change.
- Raw decrypted DBs and `collector.db` contain private chat content.
- AI prompts may send extracted summaries to an LLM provider.
- Multiple cron tasks writing shared state can race if locking is weak.

## Difference From Frequent wx-cli Mode

Old risky pattern:

```text
agent repeatedly calls wx-cli / daemon
-> live client access
-> more platform-facing behavior
-> higher account-risk surface
```

This repo's preferred pattern:

```text
one-time local key extraction
-> local decrypted DB mirror
-> local incremental collector
-> read-only analysis and summaries
```

Longka conclusion:

- This is materially better than frequent live `wx` operations.
- It should become the internal technical direction for advanced local mode.
- It still needs explicit consent, local-only defaults, key protection, and no account-control behavior.

## What The Repo Does

The README describes six automated cron tasks:

- Todo scan from private chats.
- Calendar scan from agreements and schedules.
- Daily group digest.
- Hourly cross-group trending topic scan.
- Daily technical discussion extraction.
- Preference profile from the user's own messages.

It uses a two-layer design:

- CLI layer: Python scripts decrypt/sync local WeChat data and output structured JSON. No AI API is called here.
- Agent layer: Hermes cron jobs read prompt templates, call the CLI, use an LLM for analysis, push to Feishu, and write assistant state.

## Why It Matters To Longka

This directly supports the AI Native "经营情报员工" idea:

- The boss does not need to manually read hundreds of group messages.
- The system can surface todos, schedules, hot topics, useful content, and customer signals.
- The data remains local in the extraction stage.
- The AI layer only receives selected structured summaries instead of raw full chat databases.

## Risk Boundary

This repo includes a C tool for extracting WeChat database keys from process memory and requires `sudo`.

For Longka, this means:

- Do not sell this as a default customer feature.
- Do not require customers to provide their WeChat account, password, or raw database.
- Do not run memory-key extraction on a customer's machine without explicit local consent and a clear risk explanation.
- Do not build a product promise around bypassing WeChat platform controls.
- Prefer compliant import/export, public comment data, authorized group data, or user-selected local files.

## What To Absorb

### 1. Two-layer architecture

Separate data collection from AI reasoning:

```text
collector layer: local, deterministic, no LLM
reasoning layer: prompt-driven, auditable, replaceable
```

This is useful beyond WeChat. The same pattern applies to:

- Xiaohongshu comments.
- Douyin comments.
- Public posts.
- CRM export files.
- Feishu / DingTalk / enterprise chat exports.
- Customer service logs.

### 2. Incremental scan state

The repo uses scan state so tasks do not repeatedly process the same messages.

Longka should adopt this pattern for every data source:

- last seen message id
- last scan time
- dedupe key
- source confidence
- processing status

### 3. Extractors before prompts

The repo has separate extractors for todo, calendar, digest, trending, tech, and preferences.

Longka should follow this:

- Do not send all raw data to one giant prompt.
- First extract task-specific JSON.
- Then let the AI employee reason over the structured slice.

### 4. Prompt modules

Prompts live separately from scripts.

Longka should use this pattern for AI employees:

- `todo-scan`
- `customer-signal-scan`
- `content-idea-scan`
- `objection-scan`
- `deal-risk-scan`
- `preference-scan`
- `trend-scan`

Changing analysis logic should not require changing collector code.

### 5. Operator delivery

The repo pushes results to Feishu.

Longka should generalize the delivery target:

- AI Native command center inbox.
- Feishu message.
- WeChat file assistant or manual copy package where compliant.
- Daily PDF / Markdown report.
- Mini program admin dashboard.

## What Not To Absorb

- Do not copy the memory-key extraction path as the default commercial route.
- Do not promise "safe WeChat automation" just because the repo works locally.
- Do not make WeChat private chat parsing the only data source for the AI Native system.
- Do not mix raw private data with cloud LLM calls without filtering and consent.

## Fit In Longka Base

Layer: private-domain intelligence / local data ingestion / operator reporting.

Related bases:

- `wx cli` and `wechat-cli`: possible local data access references, high risk.
- `mediacrawler`: public platform data and comments.
- `agent-reach`: internet/platform data access.
- `AIMedia`: hotspot -> AI creation -> publish workflow.
- `Waza`: governance gate for risk classification and promotion.

## Recommended Longka Direction

Build a safer Longka version:

```text
Data source adapters
-> local incremental collector
-> structured event store
-> AI employee prompt modules
-> human-reviewed daily business inbox
-> task creation / content creation / follow-up suggestions
```

For WeChat specifically, keep three modes:

1. **Safe mode**: user imports exported files or selected chat records.
2. **Local advanced mode**: local-only parsing on the user's own machine with explicit risk disclosure.
3. **Do not ship mode**: any account-control, automated sending, login bypass, or platform-fighting behavior.

## Longka Implementation Rules

For the future Longka private-domain radar:

- Default data source should be `db-first`, not live `wx-cli`.
- Keep raw DBs, keys, decrypted files, and collector DB local.
- Add a visible data boundary: "raw data local, approved summaries may enter tasks".
- Add a key freshness check and tell the user when keys are stale.
- Add file-level protection reminders for `all_keys.json`, `collector.db`, `assistant.db`, and decrypted DBs.
- Add one-click local backup and local purge.
- Never add send-message, add-friend, like, comment, Moments, profile-edit, or social write actions.
- Treat LLM/Codex analysis as explicit data egress with user approval.
- Add a second explicit gate for any legacy wx-cli path. A single `DATA_SOURCE=wx` setting is not enough.
- Add a second explicit gate for sending raw or sampled chat content to any non-local LLM.

## Product Meaning

This repo proves that a boss-facing "private-domain intelligence employee" should not start as a chatbot.

It should start as a daily business inbox:

- What should I follow up today?
- Which customer showed buying intent?
- What topics are repeatedly discussed?
- What content can I publish today?
- What schedule or promise did I forget?
- What have I been caring about recently?

That is useful, understandable, and closer to revenue.
