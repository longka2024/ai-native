# Longka AI Native Asset Map

This file is the durable map for the AI Native repository. It records what has been preserved, why it matters, and where future work should continue.

## Core Thesis

Longka AI Native is not a generic chatbot product. The intended product is a small-business AI operating system:

- The boss keeps decision authority.
- AI employees execute standardized work.
- Every useful business action is converted into an SOP.
- The system keeps business context, customer context, workflow context, and delivery history.
- Technical bases are accumulated as reusable assets, not one-off demos.

The practical direction is:

```text
high-value signal source
-> structured insight
-> human decision
-> SOP / workflow
-> AI employee execution
-> content, sales, service, delivery, or management output
-> feedback
-> improved workflow
```

## Product Lines Preserved

### AI Native Command Center

Path: `apps/command-center-prototype`

Purpose:

- Visible command-center prototype for the AI employee / boss operating system idea.
- Shows the direction of "boss opens a dashboard, selects work, assigns AI employees, sees outputs."
- Should evolve from static demo into real workflow surface.

### Personal Image Report / Color Project

Path: `products/personal-image-report`

Purpose:

- Current cashflow and market-validation product.
- Tests the full loop of mini program, payment, report generation, admin review, social sharing, and repeat purchase.
- Important because it teaches image generation, payment flow, customer UX, and viral sharing.

Preserved growth assets:

- Social propagation plan.
- Share copy bank.
- Share asset spec.
- 14-day growth experiment.
- Growth tracking table.

### Xiaomei Video Workbench

Path: `products/video-workbench`

Purpose:

- Operator-facing video production workbench for Xiaomei.
- Converts project assets into short-video scripts, covers, voiceover, music, and finished video.
- Should become a reusable video-production employee in the larger AI Native system.

### Private-Domain Intelligence

Paths:

- `external/wechat-radar`
- `external/wechat-assistant`
- `knowledge/business/LONGKA_PRIVATE_DOMAIN_INTELLIGENCE.md`
- `knowledge/research/WECHAT_LOCAL_ANALYSIS_RESEARCH.md`

Purpose:

- Study how to analyze local WeChat/private-domain data without risky live account automation.
- Current preferred direction is DB-first local analysis, not frequent wx-cli interaction.
- Raw data must stay local; repo only keeps code, research, and safety rules.

## Technical Bases Preserved

### Content and Insight Pipeline

Paths:

- `knowledge/playbooks/INTELLIGENCE_PIPELINE_PLAYBOOK.md`
- `knowledge/playbooks/MARKET_RESEARCH_AND_CONTENT_INSIGHT_PLAYBOOK.md`
- `knowledge/research/SOURCE_BASE_SELECTION_GUIDE.md`

Role:

- High-value sources first, keyword search second.
- Separate fast-water signals, slow-water evergreen sources, and internal/private sources.
- Convert source evidence into topics, decisions, scripts, images, and publishing plans.

### Skill Productization

Paths:

- `knowledge/playbooks/SKILL_PRODUCTIZATION_PLAYBOOK.md`
- `knowledge/playbooks/LONGKA_SKILL_MATRIX.md`
- `memory/skill-productization-governance.md`

Role:

- Turn installed skills and open-source projects into Longka-owned reusable capabilities.
- Avoid collecting tools without integration.
- Promote only verified capabilities into the business workflow.

### Self-Evolution Mechanism

Path: `docs/strategy/waza-self-evolution-tech-base.md`

Role:

- Intake new tools.
- Classify their value.
- Trial them against real workflows.
- Distill useful parts.
- Promote verified patterns.
- Prune redundant or unstable designs.

### Design and Frontend Quality

Paths:

- `docs/strategy/taste-skill-tech-base.md`
- `docs/strategy/gsap-skills-tech-base.md`
- `knowledge/playbooks/PRODUCT_RESULT_FIRST_PRINCIPLE.md`

Role:

- Product must be visible, usable, and attractive.
- UI cannot be only a list of tasks.
- Outputs must be easy to read, copy, publish, and verify.

### WeChat / Private-Domain Safety

Paths:

- `external/wechat-radar/lib/safety.ts`
- `external/wechat-radar/SECURITY.md`
- `external/wechat-radar/PRIVACY.md`
- `docs/strategy/wechat-radar-intelligence-dashboard-tech-base.md`
- `docs/strategy/wechat-assistant-private-domain-tech-base.md`

Role:

- Prefer local DB reading and structured extraction.
- Avoid live account-control automation.
- Do not upload raw chat content by default.
- Non-local LLM egress needs explicit opt-in and env gate.

## Business Knowledge Preserved

Path: `knowledge/business`

Includes:

- Boss pain matrix.
- AI employee notes.
- Five revenue-product execution plan.
- U-disk product factory.
- Marketing and sales architecture.
- Revenue workflow practice.
- Private-domain roadmap.
- USB security and licensing.

These files hold the market-side reasoning: what small bosses care about, what they can understand, what they might pay for, and how technical assets become sellable products.

## Discussion Essence Preserved

Paths:

- `CONVERSATION_ESSENCE_INDEX.md`
- `knowledge/logs`
- `memory`

Principle:

- Keep distilled summaries, decisions, style records, and investor work logs.
- Do not commit raw full chat records unless manually sanitized.
- Preserve enough context that a new AI session can continue without repeating old mistakes.

## Exclusion Boundary

Never commit:

- API keys.
- `.env`, `.env.local`, or real config files.
- WeChat databases, decrypted databases, WAL files, `collector.db`.
- Raw full chat records.
- Customer photos, generated private reports, order exports.
- Runtime bundles, packaged ZIPs, `node_modules`, `.next`, logs, build caches.
- Server passwords, payment keys, signing keys, private keys.

## Next Work

1. Keep color project stable and monetizable first.
2. Keep Xiaomei video workbench usable as a real operator tool.
3. Turn AI Native command center into a real visible workflow surface.
4. Continue adding technical bases only when they map to a concrete business workflow.
5. After each major discussion, create a distilled markdown note and commit it here.

