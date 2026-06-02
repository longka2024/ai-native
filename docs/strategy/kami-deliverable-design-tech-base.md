# Kami Deliverable Design Technical Base

Updated: 2026-05-28

Source: `https://github.com/tw93/Kami.git`

Related source: `https://github.com/tw93/Waza.git`

## Decision

Kami should enter the Longka AI Native technical base as the deliverable design and packaging layer.

It is not a replacement for Waza.

```text
Waza = work method / agent SOP / self-evolution governance
Kami = deliverable expression / documents / decks / landing pages / polished reports
```

Waza helps the AI employee do work correctly.
Kami helps the AI employee ship work in a form that bosses, customers, investors, and operators can understand, forward, and pay for.

## Role In Longka

Kami belongs to the final deliverable expression layer.

It should help Longka turn agent outputs into:

- customer-facing reports
- proposal documents
- mini product pages
- investor or partner decks
- project review notes
- internal operating manuals
- printable or shareable PDFs
- polished article, case, and landing-page layouts

This matters because small-business customers do not buy raw model output. They buy visible business results.

## Where It Fits

Longka workflow:

```text
market signal
-> evidence card
-> human decision
-> workflow design
-> agent execution
-> business deliverable
-> Kami packaging
-> publishing / sales / delivery
-> feedback and iteration
```

In product terms:

- Market Radar finds the signal.
- Waza governs whether the workflow is worth promoting.
- Agents execute the SOP.
- Kami packages the output into a polished, reusable deliverable.

## What To Absorb

### 1. Deliverable-first thinking

Every AI employee task should end with an explicit deliverable:

- "老板日报" instead of raw search notes.
- "客户跟进卡" instead of scattered chat summaries.
- "小红书发布包" instead of unformatted copy.
- "行业机会简报" instead of a long dump of links.
- "色彩报告推广视频脚本 + 封面 + 成片说明" instead of a plain prompt result.

### 2. Reusable document styles

Kami is useful for establishing Longka-owned templates:

- report template
- proposal template
- case-study template
- operation SOP template
- investor one-pager
- customer onboarding guide
- mini-program product explanation page

### 3. Boss-readable output

Deliverables should be readable by non-technical owners:

- clear title
- clear business conclusion
- evidence section
- recommended next action
- responsible AI employee or human owner
- deadline or cadence
- export/share path

### 4. Productized packaging

For Longka's U-disk, web, and mini-program editions, Kami can define the output surface:

- "今日商机报告"
- "本周内容计划"
- "客户问题雷达"
- "竞品拆解报告"
- "视频生产任务单"
- "成交复盘报告"

These are easier to sell than "agent generated text".

## What Not To Absorb

- Do not turn Kami into another decorative frontend framework.
- Do not prioritize visual polish over business clarity.
- Do not package weak evidence into a beautiful but empty report.
- Do not let document templates hide missing workflow validation.
- Do not copy third-party visual style blindly; distill it into Longka-owned templates.

## Integration With Existing Base

- `Waza`: decides, checks, audits, and distills the workflow.
- `Kami`: packages the finished result into a polished deliverable.
- `taste-skill`: quality gate for whether the deliverable looks high-end enough.
- `open-design` / `html-anything`: can generate visible surfaces that Kami-style deliverables use.
- `GSAP`: can add explanatory motion to public pages, but not to serious documents unless useful.
- `md2wechat-skill`: can publish Kami-packaged article content to WeChat-style output.

## Longka Product Meaning

Kami strengthens the commercial surface of Longka AI Native:

```text
AI employee does the work
-> Longka workflow verifies it
-> Kami packages it
-> customer sees a finished business artifact
```

That is important for selling to bosses. The product should not feel like "chat with an AI".
It should feel like "I hired an AI employee and received a finished report / plan / page / video package."
