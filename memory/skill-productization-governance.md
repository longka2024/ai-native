# Skill Productization And Governance

Date: 2026-05-15

User shared a high-value article:

- `F:\Longka Wiki\龙咖Wiki\Clippings\我写了半年skill，直到上周才意识到自己从一开始就搞错了方向.md`

Key insight:

- Skills are not long prompts.
- Skills are runtime architecture modules for agents.
- Professional skills should be treated as deployable, auditable, versioned assets.

Layering model to preserve:

1. Memory: long-term preferences and cross-project lessons.
2. AGENTS.md / CLAUDE.md: short always-loaded project map and defaults.
3. Nested AGENTS.md / path rules: module-specific constraints.
4. Skills: reusable multi-step workflows, branch decisions, validation sequences.
5. Tools / CLI / MCP / scripts: real execution and data access.
6. Hooks: deterministic actions that must happen every time.
7. Subagents: isolated specialist execution/review.
8. Eval / review: feedback loops for continuous improvement.

Important rule:

- After each meaningful task, ask which layer the learned lesson belongs to.
- For `cheat-on-content` in Codex, natural-language triggers must route to the local source skill files. Codex should not rely on Claude Code slash commands or memory-only summaries:
  - init -> `external/cheat-on-content/skills/cheat-init/SKILL.md`
  - score -> `external/cheat-on-content/skills/cheat-score/SKILL.md`
  - predict -> `external/cheat-on-content/skills/cheat-predict/SKILL.md`
  - shoot/publish/retro/bump/status -> the matching `external/cheat-on-content/skills/cheat-*/SKILL.md`
  - Longka UI internalizes these as `发布前判断`, `复盘校准`, and `评分公式升级`; customer-facing UI must not expose internal labels like `cheat-on-content`, `blind prediction`, or `rubric`.

Commercial implication:

- Longka can turn project experience into SOPs, SOPs into internal skills, internal skills into tool-backed skills, and proven skills into sellable digital assets.

Docs updated:

- `E:\Codex\SKILL_PRODUCTIZATION_PLAYBOOK.md`
- `E:\Codex\LONG_TERM_HARNESS.md`
