# Waza Self-Evolution Technical Base

Updated: 2026-05-28

Source: `https://github.com/tw93/Waza.git`

## Decision

Waza is useful for Longka AI Native, but not as another visible customer feature.

Its value is a self-evolution operating system for the technical base:

```text
new tool / skill / feature
-> think before building
-> design the workflow boundary
-> hunt root causes when broken
-> check before release
-> health audit for agent/code drift
-> learn/read/write to distill reusable knowledge
-> promote only stable rules into Longka skills
-> remove redundant or bloated patterns
```

## Installed Skills

Installed globally under `C:\Users\longfei\.agents\skills`:

- `think`
- `design`
- `check`
- `hunt`
- `write`
- `learn`
- `read`
- `health`

Installer security report marked some skills as medium or high risk. Treat Waza as a reviewed workflow reference and controlled local skill set, not as an unrestricted automation authority.

## Role In Longka

Waza belongs to the governance and self-improvement layer.

It should help Longka answer:

- Should this tool enter the technical base?
- Which part is reusable and which part is project-specific?
- Did a bug get fixed at the cause or only at the symptom?
- Is a page, workflow, or release ready for the customer?
- Is the codebase becoming bloated, duplicated, or hard for agents to maintain?
- Which repeated lessons should be promoted into Longka-owned skills?

## What To Absorb

### 1. Decision before implementation

Use the `think` pattern for architecture, product direction, and value judgments.

Longka rule:

- Do not build because a repo looks powerful.
- First classify it as: business capability, technical infrastructure, design layer, research layer, governance layer, or discard.
- Always separate "promote" from "do not promote".

### 2. Diagnose before fixing

Use the `hunt` pattern for recurring bugs and regressions.

Longka rule:

- State one root-cause sentence before editing.
- If the same symptom remains after a fix, stop and re-diagnose.
- For visual or generated-artifact bugs, verify the real output, not only code.

### 3. Check before release

Use the `check` pattern before publishing mini program versions, packaged workbenches, server changes, or customer-facing pages.

Longka rule:

- Check dirty files, changed surface, version, package contents, runtime behavior, and visible result.
- Never report "done" without naming what was verified.

### 4. Health audit against drift

Use the `health` pattern to detect instruction drift, stale memory, missing project context, bloated code, missing verification, and unstable agent behavior.

Longka rule:

- The AI Native base needs a monthly or milestone health audit.
- Audit whether important rules live in tracked docs or only in chat memory.
- Convert repeated mistakes into deterministic checklists, scripts, or Longka-owned skills.

### 5. Learn, read, write loop

Use `read` and `learn` to digest outside repos, articles, and strategies.
Use `write` to turn conclusions into clear product docs, SOPs, and customer-facing copy.

Longka rule:

- External content is raw material.
- Longka docs should contain extracted principles, not copied clutter.

## What Not To Absorb

- Do not copy Waza's private project paths, command habits, or risk assumptions directly.
- Do not let Waza's planning flow slow down small fixes.
- Do not use Waza as a replacement for real business validation.
- Do not promote every installed skill into customer-visible product features.

## Longka Self-Evolution Loop

Every new technical base candidate should pass this loop:

1. **Intake**: identify source, purpose, license, risk, and install state.
2. **Classification**: assign it to one layer of the Longka base.
3. **Trial**: test one real business workflow, not a toy demo.
4. **Distillation**: extract reusable rules, prompts, scripts, or UI patterns.
5. **Promotion**: write only stable principles into Longka docs or skills.
6. **Pruning**: remove duplicate, weak, unsafe, or unused patterns.
7. **Verification**: add a check so the same mistake is caught next time.

## Product Meaning

This is the mechanism that prevents Longka from becoming a pile of random open-source projects.

The goal is to evolve into:

```text
Longka-owned skills
+ Longka-owned SOPs
+ Longka-owned verification rules
+ Longka-owned product workflows
```

That is the real technical moat. External repos provide nutrition; Longka must digest and metabolize them.
