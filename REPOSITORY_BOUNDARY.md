# Repository Boundary

This repository stores Longka AI Native research, architecture, code prototypes, and reusable technical-base decisions.

## Include

- architecture docs
- strategy docs
- distilled conversation summaries
- public-safe prototype code
- public-safe external references
- safety patches
- reusable SOPs and playbooks
- memory files that contain stable product rules

## Exclude

- secrets and API keys
- `.env.local`
- customer data
- private chat data
- WeChat DB files
- decrypted database output
- `all_keys.json`
- generated private reports
- logs
- packaged runtimes
- binary dependency bundles
- raw full conversation dumps unless explicitly sanitized

## Rule

If a file helps another engineer understand or rebuild the Longka AI Native direction, include it.

If a file only proves what happened in a private session, contains private data, or can be regenerated, exclude it.
