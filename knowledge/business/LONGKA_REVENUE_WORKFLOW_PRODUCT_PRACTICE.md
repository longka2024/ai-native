# Longka Revenue Workflow Product Practice

## Core Correction

Do not start customer-facing products from "AI content factory".

For paying business owners, the first valuable entry point is revenue workflow:

1. AI Sales Champion
2. AI Private Domain CRM
3. AI Content Factory

Content becomes useful only after the business has extracted real sales language, customer objections, customer profiles, FAQ, and conversion cases.

## Two Product Tracks

### Internal Longka Track

Purpose: discover opportunities and incubate products.

Flow:

1. Collect cases and expert workflows.
2. Identify pain, target users, and willingness to pay.
3. Convert valuable cases into workflow cards.
4. Validate manually with 3-5 real samples.
5. Build agent/workflow product only after validation.

### External Customer Track

Purpose: help business owners improve sales and daily execution.

Flow:

1. Extract sales champion know-how.
2. Build private-domain customer memory.
3. Generate content from real business material.
4. Measure reply, consultation, follow-up, and conversion.

## MVP 1: AI Sales Champion

This is the first customer-facing product to build before a broad content factory.

### Input

- WeChat chat history from top salesperson.
- Converted customer conversations.
- Unconverted customer conversations.
- Product/service descriptions.
- Existing sales scripts if available.

### Processing

1. Compare converted vs unconverted conversations.
2. Extract opening patterns that produce replies.
3. Extract objection categories and winning responses.
4. Extract nurture sequences and timing.
5. Extract closing triggers and closing language.

### Output

- Opening skill.
- Nurture skill.
- Objection-handling skill.
- Closing skill.
- Sales champion playbook.
- Follow-up checklist.

### Validation

Run manually with one real business owner or Xiaomei's sales context.

Success criteria:

- At least 20 real conversations processed.
- At least 10 reusable objection-response pairs extracted.
- Sales user can use generated wording in real chat without heavy rewriting.
- At least one follow-up or conversion metric improves, or user explicitly says it saves time.

## MVP 2: AI Private Domain CRM

Build only after MVP 1 has useful sales language.

### Input

- Daily WeChat chat history.
- Customer names or aliases.
- Product/service catalog.
- Sales stage definitions.

### Processing

1. Identify customer identity and source.
2. Update customer stage.
3. Extract recent interaction topic.
4. Extract objection and buying intent.
5. Generate next follow-up action.

### Output

- Customer table.
- Customer markdown profile.
- Daily follow-up list.
- Personalized reply suggestions.

### Validation

Success criteria:

- Sales user can find "who to follow today" within 3 minutes.
- Customer profile is useful enough to continue a conversation.
- Follow-up suggestions are specific, not generic.

## MVP 3: AI Content Factory

Build after MVP 1 and MVP 2 produce real business material.

### Input

- Sales champion scripts.
- Objection library.
- Customer profiles.
- FAQ.
- Conversion cases.
- Benchmark viral posts.

### Processing

1. Build SKU/service material library.
2. Extract 8 content angles:
   - contrast
   - scenario
   - audience pain
   - founder story
   - price anchor
   - competitor comparison
   - craft/detail
   - viral quote
3. Find benchmark viral structures.
4. Copy structure, not copy text.
5. Generate posts, image prompts, and video scripts.

### Output

- Moments posts.
- Xiaohongshu posts.
- Short video scripts.
- Image prompts.
- FAQ content.

### Validation

Success criteria:

- Content is clearly derived from real customer objections and cases.
- User says it sounds like their business, not generic AI copy.
- Published content creates comments, messages, consultation, or measurable saves.

## Delivery Form

Customer-facing names should use business language:

- AI Sales Champion
- AI Private Domain Assistant
- AI Content Partner
- AI Industry Growth Assistant

Do not sell:

- "toolbox"
- "crawler"
- "agent framework"
- "knowledge base"

The underlying system can be skills, agents, scripts, local runtime, and knowledge files. The customer should experience a business workflow.

## Implementation Order

1. Build a local chat-history importer.
2. Build sales conversation labeling:
   - converted
   - unconverted
   - inquiry
   - objection
   - follow-up
3. Build Sales Champion extraction prompt/schema.
4. Build output page for four sales skills.
5. Build customer profile schema.
6. Build daily follow-up page.
7. Only then connect content generation.

## Non-Negotiable Rules

- Do not start with content volume.
- Do not generate content without real business material.
- Do not treat a crawler as a product.
- Do not call an unvalidated workflow a product.
- Keep private-domain data local by default.
- Every customer-facing feature must answer: how does this help the user reply, follow up, convert, or save time?

## Next Concrete Product

The next concrete product should be:

Longka AI Sales Champion Private-Domain Assistant.

Initial scope:

1. Import WeChat history text.
2. Mark converted/unconverted examples.
3. Extract four sales skills.
4. Generate customer follow-up suggestions.
5. Generate content topics from objections and cases.

This product is closer to revenue than a pure content generator.
