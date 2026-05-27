# Longka Daily Workflow Harness

## AI Native Position

Longka's AI Native position:

```text
Do not add AI tools on top of old workflows.
Rebuild the industry workflow so AI handles collection, analysis, production, delivery, and review.
```

The user-facing product should not feel like a tool shelf. It should feel like a guided workbench for a specific industry role.

## Core Rule

The product must be designed around a worker's fixed daily workflow, not around a list of AI tools.

Users do not start work by reading group summaries, searching articles, or opening data dashboards. They start by doing the job they already need to do today.

For most industry assistant products, the foreground workflow should be:

```text
Plan today's main offer
-> Produce content and materials
-> Prepare publishing assets
-> Follow up comments and private messages
-> Review results and prepare the next cycle
```

## Frontstage vs Backstage

Frontstage is what the worker sees:

- What should I do today?
- What content should I publish?
- Which customer should I follow up?
- What words should I say?
- What result can I deliver now?

Backstage is what the system uses to support decisions:

- WeChat group history
- WeChat official account articles
- Xiaohongshu search and note analysis
- Competitor content
- Historical conversion data
- Previous generated videos, reports, and materials

Backstage intelligence should explain and support the recommendation, but it should not become the first manual task.

## Product Design Implication

Bad structure:

```text
Read group summary
-> Search public articles
-> Analyze competitors
-> Generate content
```

This feels like a tool collection and forces the user to think like an operator.

Better structure:

```text
Today the system recommends this main topic
-> Confirm or adjust
-> Generate content package
-> Publish with checklist
-> Follow up leads
-> Review and feed tomorrow's recommendation
```

This feels like an industry workbench and gives the user a clear path.

## Loop

The stable operating loop is:

```text
Fixed daily work
-> Data collection
-> Analysis
-> Execution support
-> Review
-> Next round of fixed daily work
```

The daily work is fixed. The intelligence layer keeps improving the quality of recommendations behind the scenes.

## Current Prototype

Prototype path:

```text
E:\Codex\longka-video-workbench-prototype
```

Local preview:

```text
http://127.0.0.1:8790
```

The current prototype has been corrected to:

- Use a 5-step fixed daily workflow.
- Move group chat, public account search, Xiaohongshu, and history data into backstage intelligence.
- Show recommendation rationale as support, not as the first task.
- Present "customer result first" as the core product principle.
