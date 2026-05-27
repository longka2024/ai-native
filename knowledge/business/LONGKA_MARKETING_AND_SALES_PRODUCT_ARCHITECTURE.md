# Longka Marketing And Sales Product Architecture

## Core Positioning

Longka is not a toolbox.

Longka is an AI Native industry workflow product factory driven by:

1. market radar
2. content factory
3. sales conversion assistant
4. reusable industry workflow products

The core loop:

```text
collect market signals
-> decompose winning cases and expert workflows
-> extract repeatable SOP
-> agentize the workflow
-> package industry products
-> use content to validate and promote
-> use customer feedback to improve the system
```

## Two Business Layers: Marketing And Sales

### Ying: AI Content Factory

This is the "marketing" side.

Purpose:

- attract attention
- create trust
- generate traffic
- trigger comments, saves, shares, and inquiries
- solve "what should I post today?"

It is not limited to text or image posts. It must cover the full content production chain:

- Moments posts
- Xiaohongshu posts
- Xiaohongshu image cards
- article/long-form content
- short video scripts
- Remotion videos
- Hyperframes videos
- digital human scripts/videos
- AI-generated images
- multi-platform content packs

Core workflow:

```text
source collection
-> case/viral decomposition
-> topic selection
-> angle selection
-> copy generation
-> image/card generation
-> video script generation
-> video/digital human production
-> publishing pack
-> data review
```

Current priority:

`private-domain-toolkit-xiaomei-final-runtime` belongs to this track.

It must continue. It should not be replaced by the AI Sales Champion direction.

### Xiao: AI Sales Champion Private-Domain Assistant

This is the "sales" side.

Purpose:

- convert incoming leads
- improve follow-up
- extract top salesperson know-how
- build customer memory
- handle objections
- close and retain customers

Core workflow:

```text
chat history
-> converted/unconverted comparison
-> sales script extraction
-> customer profile
-> objection library
-> follow-up recommendation
-> conversion review
```

This comes after there is traffic or private-domain interaction. It is a separate product line, not a replacement for the content factory.

## Relationship Between The Two

The content factory brings people in.

The sales assistant converts people into money.

They should share data over time:

```text
content comments and inquiries
-> customer questions and objections
-> sales knowledge base
-> better content topics
-> better sales replies
```

But they should not be mixed into one MVP too early.

## Three Product Surfaces

### 1. Internal Longka Market Radar

User: Longfei.

Purpose:

- find business opportunities
- collect cases
- watch expert workflows
- evaluate what can become a product

Inputs:

- YouTube
- Xiaohongshu
- WeChat Official Account
- WeChat groups
- X/Twitter
- GitHub
- courses
- newsletters
- comments and reviews

Outputs:

- opportunity cards
- workflow cards
- product ideas
- validation plans

### 2. Longka AI Content Factory

User: Xiaomei, operators, business owners, content teams.

Purpose:

- produce daily content
- produce high-quality images and short videos
- keep content publishing consistent
- make content reflect real business insights

Initial vertical sample:

- personal color / image consulting project

Product requirement:

- one topic should produce multiple forms:
  - Moments post
  - Xiaohongshu post
  - image card
  - short video script
  - Remotion/Hyperframes video
  - digital human script

### 3. Longka AI Sales Champion Assistant

User: sales teams, founders, private-domain operators.

Purpose:

- extract sales champion knowledge
- guide follow-up
- improve conversion
- standardize sales conversation workflow

This is a later product line after content factory and private-domain interaction have enough material.

## Current Execution Priority

### Priority 1: Finish Xiaomei Content Factory Runtime

The current concrete deliverable is:

```text
E:\Codex\packages\private-domain-toolkit-xiaomei-final-runtime.zip
```

It must become a usable AI content factory package:

- local runtime works
- Xiaohongshu collection works
- WeChat source collection is testable
- source pool works
- Moments copy generation works
- Xiaohongshu copy generation works
- image generation works
- video workflow can be integrated
- errors are visible and actionable

### Priority 2: Integrate Video Production

The content factory must include the previous promo video automation stack:

- Remotion
- Hyperframes
- script generation
- asset selection
- video rendering
- short video variants
- later: digital human workflow

Do not keep video production as a separate island.

### Priority 3: Build Feedback Loop

Each generated content item should record:

- source material
- copied structure
- target platform
- intended goal
- publish time
- views
- likes
- saves
- comments
- inquiries
- conversion notes

Without feedback, the content factory cannot improve.

### Priority 4: Build Sales Assistant Later

After content brings inquiries or there are enough private-domain conversations:

- import chat history
- label converted/unconverted
- extract sales champion skills
- build customer profiles
- generate follow-up suggestions

## Product Rule

For customer-facing products, use business language:

- "AI Content Factory"
- "Daily Content Assistant"
- "AI Sales Champion"
- "AI Private-Domain Assistant"
- "Industry Growth Assistant"

Avoid exposing technical language:

- crawler
- toolbox
- agent framework
- knowledge base
- CLI

The customer buys outcomes, not infrastructure.

## Non-Negotiable Development Rules

1. Do not abandon an active deliverable when a new strategic idea appears.
2. Do not confuse marketing content production with sales conversion.
3. Do not build a generic toolbox UI.
4. Do not produce content without source material and structure.
5. Do not treat video as optional; video is part of the content factory.
6. Do not make the user install Python or Node in final delivery.
7. Do not ship hidden failures; every failure must produce a readable log.
8. Do not call the product done until a non-technical user can complete the core task.
9. Frontend must stay simple. Backend may be complex. The user sees results, the system handles orchestration.
10. A real AI Agent must deliver near-immediate ROI through business outcomes, not chatbot-style interaction.

## One-Sentence Architecture

Longka uses market radar to discover demand, AI content factory to create traffic, AI sales assistants to convert traffic, and industry workflow packaging to turn proven workflows into sellable products.
