> **迁移自 Codex 记忆** `~/.codex/memories/longka_failure_policies.md` (2026-06-16)。规则类反模式,逐字保留。
> 注意:文中 `E:\Codexi-native` 现为 `D:\AInativei-native`;122 端口以 CLAUDE.md 为准(3760)。

# Longka Failure Policies

Purpose: store repeated failure lessons as explicit anti-patterns. This file must be recalled before Longka work so the same mistakes are not repeated.

## Anti-Patterns

### Do not code before the spec is concrete

When the user says a feature feels wrong, first turn the fuzzy complaint into a concrete spec:

- user role
- job to be done
- visible steps
- data required
- success evidence
- what must not happen

Only then edit code.

### Do not patch a broken flow indefinitely

If repeated small patches make a page confusing, stop and refactor the flow around a stable model instead of adding more UI fragments.

### Do not use fixed copy templates for content generation

Content generation must bind to:

- selected source post
- source body and metrics
- comment/customer question signals
- selected title
- user industry and goal
- selected platform format

Changing the title or source must change the angle, structure, examples, CTA, and supporting points when appropriate.

### Do not hard-code content, title, or visual card plans

Hard-coded topic examples such as `content asset library`, `title formula library`, or any single industry/demo story must not be embedded as the default path for titles, copy, or image briefs.

For Longka content and visual production:

- First extract signals from the selected source/topic/current confirmed copy: subject, result/proof, audience, pain, contrast, key point, action.
- Then select a formula/style/layout from a configurable rule set.
- Then render the title/copy/card brief by filling the extracted signals.
- If a fallback is needed, it must be generic and visibly marked as low-confidence, not a specific unrelated template.
- Visual card plans must be data-driven. A different selected topic must produce different card roles, titles, text, briefs, and image prompts.

If code starts repeating a concrete sample topic inside generation functions, stop and move it into a config/rule layer or replace it with extracted variables.

### Do not present fake crawler output as real

If CDP/API/RPA collection does not move the browser, cannot open source URLs, or returns unrelated repeated text, treat it as failed collection. Do not fill the page with fabricated seed data.

### Do not hide long-running work

Crawler, copywriting, scoring, image generation, video rendering, packaging, and deployment must show progress, current action, counts, and failure state. A static zero or silent wait breaks user trust.

### Do not package before local isolated verification

Before handing Xiaomei or another operator a package, run the packaged folder from a clean local directory and verify it matches the current local UI and can reach the intended workflow.

### Do not let internal workflow labels leak into final content

Audience-facing output must not include analysis labels, source diagnostics, model notes, or operator instructions.

### Do not ignore encoding

All newly created Longka project files must be UTF-8. If a file shows mojibake, fix or replace the affected text immediately instead of spreading corrupted strings.

### Do not continue feature work after mojibake appears

This is a hard Longka failure lesson from the AI Native workbench cleanup.

If Chinese source, UI copy, prompts, or docs show mojibake such as `鍐`, `灏`, `锛`, `鐢`, `绱`, or replacement characters:

- Stop feature work immediately.
- Treat it as a release blocker, not a cosmetic issue.
- Do not add new UI, prompts, crawler logic, image logic, or platform flows on top of corrupted text.
- First repair or replace the corrupted block with clean UTF-8 text.
- Avoid ambiguous PowerShell bulk writes for Chinese source. Prefer `apply_patch` or a verified UTF-8 no-BOM write path.
- Do not introduce UTF-8 BOM unless the downstream tool explicitly requires it.
- Before deploying AI Native web work, run syntax checks and a mojibake scan.
- Deploy to 122 only after the scan is acceptable.
- Acceptance evidence must come from the 122 public route, not local 127.

Required minimum gate for `workbench-v2-clean.js` and similar Longka web files:

```text
node --check <file>
rg -n "鍐|灏|锛|鐢|绱|璧勴|�" <file>
sync to 122
restart runtime if needed
verify http://122.51.218.154/ai-native-v2/workbench-v2.html
```

Root lesson: normal old code does not randomly become unreadable Chinese. When mojibake exists in files we edited, assume the workflow caused or spread encoding damage until proven otherwise.

### Do not use localhost as proof for 122 work

When the user is asking for team testing or the 122 web version, local `127.0.0.1` verification is not acceptance evidence. For AI Native web work on 122:

- Deploy/sync to `122.51.218.154`.
- Use the Nginx route `http://122.51.218.154/ai-native-v2/workbench-v2.html`.
- Remember that `/ai-native-v2/` proxies to `127.0.0.1:3761` on 122.
- Verify the public 80-port route, not just local server output.
- Compare local and remote SHA256 hashes for synced files.
- Verify both HTML/static assets and `/ai-native-v2/api/state`.
- If file data and API data disagree, do not claim sync is complete.

### Do not start local web-service debugging for AI Native Web unless explicitly authorized

This is stricter than "localhost is not proof." The repeated failure is that the assistant keeps defaulting to local ports and local Playwright even after the user asked for 122.

For AI Native Web / Today Workbench / Content Asset Library / team-visible 122 pages:

- Default execution environment is `122-web`.
- Local work is limited to file editing, static checks, syntax checks, diff checks, and encoding/mojibake scans.
- Do not start local web servers.
- Do not inspect local ports.
- Do not run local Playwright or browser-flow validation.
- Do not spend time debugging local service startup.
- Only use local browser/server validation if Longfei explicitly says: `先本地跑`, `先本地验证`, or equivalent.

Required verification sequence:

```text
local static/syntax check only
-> upload/sync to 122
-> restart PM2/static runtime when needed
-> verify public URL http://122.51.218.154/ai-native-v2/workbench-v2.html
-> verify /ai-native-v2/api/state or relevant public API
-> report 122 evidence only
```

If tempted to start `localhost`, stop and switch to 122.

### Do not store final generated assets on C drive

The local C drive is not a Longka asset repository and has limited disk space. For Longka image, video, card, cover, publishing package, and customer-demo outputs:

- Local source-code development on this machine is allowed.
- C drive tool defaults such as `C:\Users\longfei\.codex\generated_images\...` are temporary caches only.
- Final or semi-final generated assets must be saved under an E drive project asset directory or a server asset directory.
- If a tool can only generate to C drive by default, immediately copy/move the useful output into the approved E drive/project/server asset structure and do not treat the C drive path as the deliverable.
- Before generating large images, videos, batches, or render outputs, state the planned output directory.
- Never let image/video generation silently fill C drive.

### Do not assume file sync means runtime sync

After syncing files to 122 or any server, confirm:

- PM2 process restarted or static file serving refreshed.
- The served HTML references the intended files.
- The API returns the expected data counts.
- The team-facing URL is the one being tested.

If the data file contains assets but `/api/state` returns fewer records, inspect runtime process, route prefix, working directory, and state loading before reporting success.

### Do not split the content asset library into temporary page caches

For AI Native content assets, do not let data drift across `/api/state`, collector-only tables, local JSON, page-side merge code, and package SQLite without a clear source of truth.

The 122 web version must treat PostgreSQL content sample tables as the formal content asset / training corpus base. UI pages should read a server-side unified content asset API, not stitch collector data in the browser.

If collected data exists in a collector table but the Today Workbench cannot use it, fix the server-side asset bridge/schema, not the page with temporary fallback data.

### Do not expose architecture separation as UX separation

It is correct to separate collection engineering, asset confirmation, deconstruction, and creation as backend/product modules. It is wrong to make customers feel those modules are disconnected tools.

For operator-facing Longka workflows:

- Keep the customer in one coherent workbench whenever possible.
- Use side navigation, internal routes, panels, or drawers for modules.
- Make the customer path continuous: collect/read history -> screen -> confirm -> deconstruct -> use in creation.
- Do not create a standalone page as the only entry unless the user explicitly asks for a separate tool.

### Do not rely on memory for user-provided technical bases

When the user asks about a Longka module or previously provided tool, do not answer from vague recall.

Before summarizing tools, choosing an implementation route, or saying something is missing:

- Read `longka_technical_base_ledger.md`.
- Read the relevant section of `longka_module_capability_map.md`.
- Search local docs/memories for the named tool if the user mentions one.
- If the tool exists but is not registered, add it to the ledger before continuing.

This prevents repeating the failure where `Kami` and `gstack` were known in project docs but omitted from the immediate module summary.

### Do not treat user-provided repos as casual references

When the user provides a high-quality repo, framework, skill, MCP, or tool, it must be handled as a potential Longka technical base, not as a link to glance at.

Required handling:

- Search whether it already exists in local docs, skills, repos, or memory.
- Read enough primary source or local strategy notes to understand its role.
- Classify it into the technical base ledger.
- Mark status: installed, local repo, researched, candidate, integrated, rejected.
- State whether it replaces, complements, or conflicts with existing bases.
- If not immediately used, record the reason and future trigger.

Do not wait for the user to remind the same repo later.
