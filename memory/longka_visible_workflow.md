# Longka Visible Workflow Rule

For Longka work, especially multi-step product/coding/debugging tasks, always use a visible checklist workflow.

Required behavior:

1. Start with `update_plan` for any task with more than one step.
2. Keep the plan visible and concrete. Each item must be an action, not a vague intention.
3. Mark one item `in_progress` while working.
4. Update the plan after meaningful progress, especially after file edits, server checks, deployments, packaging, or remote debugging.
5. Send short commentary updates while working so the user can see work is happening.
6. Do not only write strategy text and stop when the user expects execution.
7. If blocked by permissions, sandbox, remote login, missing files, or unclear ownership, report the exact blocker and immediately try the next reasonable route.
8. For Longka's three-part production flow, remember:
   - Local mini program code is uploaded to WeChat review.
   - 122 server handles API, users, orders, payments, admin, and job state.
   - 43 server handles image/report generation and sends generated asset state back to 122.
   - Visual prompt/template assets may live in Codex skills, but production generation must still follow the verified 43 route.
9. When packaging operator tools, prefer a portable zip/folder with launcher `.bat`, README, assets, and clear first-run instructions.
10. Final responses must include what changed, exact paths, verification result, and next required user action if any.

This rule exists because the user strongly prefers the previous visible "Updated Plan / Then implement working..." style and does not want to wait without seeing progress.
