# Longka AI Native Coding Rules

## Encoding

- All source files, docs, scripts, HTML, CSS, JS, JSON, SQL, Markdown, and config files must be UTF-8.
- Do not write GBK, ANSI, or mojibake text.
- If a file already contains mojibake, do not add more business logic into it. Prefer creating a clean UTF-8 module and wiring it with a small, reviewable entry point.
- Do not convert an entire legacy file unless the task is explicitly a cleanup/refactor task.

## File Strategy

- Do not keep patching very large legacy UI files for new product surfaces.
- New major UI capabilities should live in clean modules, for example:
  - `collector-panel.js`
  - `collector-hub.mjs`
  - future `workbench-v3.*`
- Legacy files may be used as mounting points only when the change is small and easy to verify.

## Design Gate

- Before designing or developing a new function, first discuss and confirm the standard with Longfei.
- Do not start coding a new function from a vague request.
- Before code changes, state:
  - Goal
  - Boundary
  - User-facing workflow
  - Acceptance standard
  - Files likely to change
  - What will not be touched
- Only implement after Longfei confirms the standard, unless the task is a tiny bug fix or explicit maintenance command.
- Do not create many speculative files or unused abstractions.
- If the existing page/code is messy, propose a clean replacement path before editing.
- Write only the code required to satisfy the confirmed function and acceptance standard.
- Do not add extra features, hidden flows, unused UI, speculative integrations, or generic frameworks without confirmation.
- If a nice-to-have appears while coding, record it as a follow-up instead of implementing it.

## Product Safety

- Do not generate fake collected data when real collection fails.
- Every sample must keep source tool, source URL when available, collection status, and failure reason when failed.
- Do not expose internal tool names to customers unless the page is an operator/admin page.

## Verification

Before claiming a change is complete:

- Run syntax checks for changed JS/MJS files.
- Verify API routes with real HTTP calls when backend routes changed.
- Verify page files are served from the target environment when UI files changed.
- Report exact changed files and verification evidence.
