# WeChat Local Analysis Research

Date: 2026-05-23

## Decision

For the SMB AI-native operating system, WeChat customer intelligence should use a local-authorized data parsing path, not a login bot path.

The product should not ask customers to scan-code bind a WeChat bot, host their account, or automate the WeChat client. That path is operationally fragile and can trigger account risk.

The better product path is:

1. Customer runs a local desktop/U-disk client.
2. Customer authorizes reading their local WeChat data directory.
3. Client extracts or receives the local database key on the user's own machine.
4. Client parses encrypted SQLite data locally.
5. Client stores incremental structured records locally.
6. AI summarizes only business-level outputs: daily report, sales leads, follow-up tasks, risks, customer intent, and content opportunities.

## wx-cli Findings

Repo studied: `https://github.com/jackwener/wx-cli`

Local clone: `E:\Codex\.tmp\wx-cli`

Previous local record shows this was already installed and verified through:

```powershell
npm install -g @jackwener/wx-cli
wx init
wx sessions
```

wx-cli is the stronger engineering base for our product.

Key implementation traits:

- Rust single binary, command name `wx`.
- Reads local WeChat 4.x data from encrypted SQLCipher databases.
- Does not log in, send messages, hook message sending, or operate the WeChat UI.
- `wx init` auto-detects the local WeChat `db_storage` directory and scans the local WeChat process memory for SQLCipher raw keys.
- Windows scanner uses `CreateToolhelp32Snapshot`, `OpenProcess`, `VirtualQueryEx`, and `ReadProcessMemory` against `Weixin.exe`.
- It saves config and keys under `~/.wx-cli/`, including `config.json`, `all_keys.json`, decrypted cache, metadata, logs, pid, and socket files.
- It runs a background daemon and uses decrypted DB caching.
- It tracks DB/WAL mtimes and supports WAL incremental application. This is important because WeChat often appends new messages to WAL rather than rewriting full DB files.
- It returns agent-friendly wrapper output with `meta`, not only raw arrays.
- `meta.status` can be `ok`, `possibly_stale`, `possibly_stale_unknown_shards`, or `windowed`.
- It detects unknown `message_N.db` shards and tells the operator to run `wx init --force` when keys are stale.
- `wx new-messages` stores per-session timestamps in `~/.wx-cli/last_check.json`, so it supports daily incremental intelligence.
- It supports richer business data than the Python tool: sessions, unread, history, search, members, stats, export, favorites, attachments, SNS feed/search/notifications, and official-account article pushes.

Product implication:

wx-cli should be treated as the main reference implementation for the Longka local WeChat intelligence layer. Its daemon, cache, freshness metadata, and stale-shard detection solve exactly the problems a commercial product would face:

- avoid re-decrypting huge DBs on every run
- avoid silent missing messages
- detect when `init --force` is needed
- support incremental daily work
- provide stable group member identity fields for analysis

Risk:

The sensitive operation is still memory scanning during first init or key refresh. This must remain explicit, local, and user-authorized. In a packaged product, present this as "local authorization and data index initialization", not as hidden monitoring.

## huohuoer/wechat-cli Findings

Repo studied: `https://github.com/huohuoer/wechat-cli`

Local clone: `E:\Codex\.tmp\wechat-cli`

wechat-cli is relevant, but it is more suitable as a readable Python reference and experiment tool than as the commercial base.

Key implementation traits:

- It reads local WeChat data, not online WeChat messages.
- It uses SQLCipher-style local database decryption.
- It extracts encryption keys by scanning the WeChat process memory during `wechat-cli init`.
- It stores configuration under `~/.wechat-cli/`.
- It has commands for sessions, history, search, contacts, members, stats, export, favorites, unread, and `new-messages`.
- `new-messages` persists state in `~/.wechat-cli/last_check.json`, then returns only changes since last check.
- Windows support exists through `scanner_windows.py`, which scans `Weixin.exe` process memory.
- The code is read-only for WeChat data. It does not send, modify, or delete messages.

Product implication:

wechat-cli validates the same overall path: local DB + local key + incremental CLI. It is easier to read and can help us understand parsing details quickly.

Risk:

The `init` phase reads process memory to find DB keys. This should be presented as an explicit local authorization action. For a commercial product, we should wrap this with clear consent, local-only wording, and no cloud upload of raw chat data.

## wx-cli vs wechat-cli

| Item | jackwener/wx-cli | huohuoer/wechat-cli |
| --- | --- | --- |
| Language | Rust | Python |
| Install | npm package with platform binary | pip / npm wrapper |
| Main command | `wx` | `wechat-cli` |
| Data path | local WeChat SQLCipher DB | local WeChat SQLCipher DB |
| Login needed | no new login, only existing desktop WeChat running | no new login, only existing desktop WeChat running |
| Key method | process memory scan | process memory scan |
| Windows support | yes, `Weixin.exe` memory scan | yes, `Weixin.exe` memory scan |
| Incremental messages | yes, per-session state | yes, state file |
| Daemon/cache | yes, mtime-aware DB cache and WAL incremental apply | simpler cache/decrypt approach |
| Freshness diagnostics | strong: stale status, unknown shards, session-vs-message timestamps | weaker |
| Attachments/SNS/articles | richer support | less complete |
| Commercial suitability | stronger base | useful reference |

Decision:

Use `wx-cli` as the primary implementation reference and possible dependency. Use `wechat-cli` as a secondary readable reference. Do not use a WeChat login bot path for customer data analysis.

## Hermes Agent Findings

Repo studied: `https://github.com/NousResearch/hermes-agent`

Local clone: `E:\Codex\.tmp\hermes-agent`

Hermes is a general agent runtime and messaging gateway.

Relevant traits:

- Supports CLI plus messaging gateways such as Telegram, Discord, Slack, WhatsApp, Signal, Email, LINE and others.
- It has provider/model configuration, including custom providers and Codex-related runtime paths.
- It is useful as an agent orchestration layer: scheduled tasks, memory, tools, skills, gateway conversations.
- Its WeChat direction is not a built-in compliant customer data parser. The README points to community bridge projects such as HermesClaw.

Product implication:

Hermes may be useful later as an agent runtime or scheduler, but it should not be the foundation for customer WeChat record analysis. For our use case, Hermes is "task orchestration"; wechat-cli-style local parsing is "data acquisition."

## Recommended Architecture

Phase 1: Local WeChat Intelligence MVP

- Build a local parser wrapper around wx-cli concepts.
- First-run wizard:
  - detect WeChat data directory
  - ask user to confirm local-only analysis
  - initialize key/config
  - show latest sessions
- Daily workflow:
  - run incremental scan
  - normalize messages into local SQLite
  - summarize into boss dashboard

Phase 2: AI Boss Daily Report

Outputs:

- today customer intent
- hot leads
- follow-up list
- silent high-value customers
- complaint/risk signals
- group opportunities
- content ideas based on customer questions
- tomorrow's action checklist

Phase 3: Agent Workforce

Agents consume the structured local context:

- sales assistant
- customer service reviewer
- content operator
- private-domain analyst
- boss chief-of-staff

Hermes/OpenClaw/FastClaw can be evaluated here as orchestration/runtime choices, but not as the WeChat collection layer.

## MVP Command Plan

For local Windows validation:

```powershell
wx sessions --json
wx unread --json
wx new-messages --json
wx history "目标群或客户名" -n 100 --json
wx stats "目标群或客户名" --json
```

The product wrapper should read stdout JSON and inspect `meta.status`.

If status is `possibly_stale_unknown_shards`, the product should prompt:

```text
微信产生了新的消息分片，需要重新初始化本机索引。请保持微信打开，然后点击“刷新本机授权索引”。
```

Internally this maps to:

```powershell
wx init --force
```

Do not expose "raw key", "memory scan", or "SQLCipher" in normal customer copy unless in an advanced/security explanation page.

## Product Rule

Never position this as "WeChat monitoring" or "WeChat bot hosting."

Position it as:

"本机微信经营记录分析助手：客户授权后，只在本机读取和分析自己的聊天记录，自动生成经营日报和跟进清单。"
