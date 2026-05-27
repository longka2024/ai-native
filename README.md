# Longka AI Native

Longka AI Native is a research and productization workspace for building a small-business AI operating system.

The current focus is not a single chatbot. It is a layered business workflow base:

```text
market signal
-> evidence card
-> human decision
-> workflow design
-> AI employee execution
-> business deliverable
-> publishing / sales / delivery
-> feedback and iteration
```

## Repository Layout

- `AI_NATIVE_BASE_CONTEXT.md`: main context and architecture entry point.
- `LONGKA_AI_NATIVE_ASSET_MAP.md`: durable map of preserved assets, product lines, technical bases, and boundaries.
- `PROJECT_CONTEXT_INDEX.md`: workspace index.
- `CONVERSATION_ESSENCE_INDEX.md`: distilled discussion essence and major decisions.
- `REPOSITORY_BOUNDARY.md`: what belongs in the repo and what must stay out.
- `docs/strategy`: technical base decisions and research notes.
- `knowledge`: playbooks, business architecture, research notes, and selected work logs.
- `memory`: stable durable memory files promoted into repo context.
- `products`: vertical product proof points and product-specific planning.
- `apps/command-center-prototype`: visible AI Native command-center prototype.
- `external/wechat-radar`: local-first private-domain intelligence dashboard reference, with Longka safety patches.
- `external/wechat-assistant`: local WeChat database extraction and structured analysis reference.

## Current Technical Base Themes

- Self-evolution governance: Waza-style intake, classify, trial, distill, promote, prune, verify.
- Design quality: taste-skill, open-design, html-anything, GSAP.
- Private-domain intelligence: DB-first local analysis, business radar dashboard, no account-control automation.
- Content and video production: Remotion, HyperFrames, KIE/MiniMax, Xiaomei workbench direction.
- Agent orchestration: visible employee/task surface first, backend orchestration later.

## Safety Rules

This repo must not contain real customer data, WeChat databases, keys, decrypted chat records, API keys, or runtime logs.

Important defaults:

- Prefer DB-first local reading over live wx-cli operations.
- Keep legacy wx-cli mode research-only.
- Do not automate sending messages, adding friends, Moments, likes, comments, or profile changes.
- Non-local LLM analysis of chat samples requires explicit consent and an environment gate.
- Raw private data should stay local; only approved summaries/tasks should enter the product workflow.

## Start The Prototype

```powershell
node apps/command-center-prototype/server.mjs
```

Open:

```text
http://localhost:3760
```

## Notes

Some upstream source files contain mojibake from their original encoding history. New Longka documentation should be written as UTF-8.
