# Longka AI Native Conversation Essence Index

Updated: 2026-05-28

This repository is the durable home for Longka AI Native thinking, code, and technical-base decisions.

It should preserve the useful essence of the conversation, not raw chat noise.

## Core Product Thesis

Longka AI Native is a small-business AI operating system:

```text
boss context
-> market/private-domain signal
-> human decision
-> AI employee task
-> content / sales / report / video deliverable
-> review
-> feedback
-> reusable workflow asset
```

The product should not ask bosses to learn AI prompts. It should turn familiar business actions into visible workflows:

- What should I look at today?
- Which customer or topic matters?
- What should I post?
- Who should I follow up?
- Which task should an AI employee do?
- What result did it produce?

## Major Decisions Captured

### 1. AI Native is a system, not a pile of tools

The product must have visible work surfaces:

- command center
- daily radar
- AI employees
- task board
- deliverable library
- review and feedback loop

Tools and skills are backend capability, not the product language.

### 2. U-disk edition remains valuable

The U-disk is not lower-level than SaaS. It gives ritual, ownership, local-first privacy, and offline packaging. It can be sold as a business operating kit:

```text
U-disk shell
+ local data
+ plugins
+ AI employees
+ workflows
+ training material
```

### 3. The immediate commercial proof path is vertical workflow products

The color/image report project and Xiaomei video workbench are proof points:

- They force real delivery quality.
- They create case material.
- They expose order, payment, report, image, video, and social-sharing problems.
- They teach how to package AI capability into a sellable workflow.

### 4. Private-domain intelligence must be local-first

The WeChat direction should be framed as:

```text
私域经营雷达 / 群聊商机分析中台
```

Not:

```text
微信破解 / 自动化操控 / 聊天记录窃取
```

Useful signals:

- explicit demand
- hidden pain
- buying intent
- high-signal people
- links and tools
- topic clusters
- follow-up promises
- content ideas

### 5. DB-first is safer than frequent wx-cli

The reviewed `wechat-assistant` + `wechat-radar` path is:

```text
local key extraction
-> decrypted DB mirror
-> WAL patch
-> collector.db
-> structured extractors
-> dashboard
```

This is materially safer than frequent live wx-cli calls, but not zero-risk.

Longka rules:

- legacy wx-cli mode is research-only
- no account write actions
- raw data stays local
- non-local LLM egress needs explicit consent
- summaries/tasks are user-approved before entering the product workflow

### 6. Self-evolution is part of the moat

Waza-style governance was added so Longka does not become a random pile of open-source projects.

Every new tool must pass:

```text
intake
-> classify
-> trial
-> distill
-> promote
-> prune
-> verify
```

### 7. Design quality is a technical base

The user repeatedly rejected ugly, cramped, generic UI. Therefore design is not decoration.

The design layer includes:

- open-design
- html-anything
- taste-skill
- GSAP

Every customer-facing page needs a taste gate.

## High-Value Local Documents

- `AI_NATIVE_BASE_CONTEXT.md`
- `PROJECT_CONTEXT_INDEX.md`
- `docs/strategy/*.md`
- `knowledge/playbooks/*`
- `knowledge/business/*`
- `knowledge/research/*`
- `memory/*`
- `apps/command-center-prototype/*`
- `external/wechat-radar/*`
- `external/wechat-assistant/*`

## Not Included By Default

The following should not be committed:

- raw full chat records
- real WeChat databases
- decrypted WeChat output
- `all_keys.json`
- `.env.local`
- API keys
- logs containing private data
- packaged runtime bundles
- `node_modules`
- customer images or generated private reports unless explicitly sanitized

## Product Language

Use business-facing names:

- AI employee
- daily operating radar
- private-domain business radar
- content factory
- revenue workflow
- task approval
- deliverable library
- workflow plugin

Avoid customer-facing language like:

- crawler
- decrypt
- wx-cli
- raw chat parser
- prompt chain
- agent stack

