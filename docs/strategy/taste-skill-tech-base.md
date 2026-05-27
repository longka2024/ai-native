# Taste Skill Technical Base

Updated: 2026-05-28

Source: `https://github.com/Leonxlnx/taste-skill.git`

## Decision

`taste-skill` is useful for Longka AI Native, but it is not a business execution layer.

It should be treated as the design taste and frontend quality-control layer. Its job is to stop customer-facing pages from looking generic, cramped, cheap, or obviously AI-generated.

## Installed Skills

Installed under `E:\Codex\.agents\skills`:

- `brandkit`
- `industrial-brutalist-ui`
- `gpt-taste`
- `image-to-code`
- `imagegen-frontend-mobile`
- `imagegen-frontend-web`
- `minimalist-ui`
- `full-output-enforcement`
- `redesign-existing-projects`
- `high-end-visual-design`
- `stitch-design-taste`
- `design-taste-frontend`
- `design-taste-frontend-v1`

## Role In Longka

Taste skills sit between design generation and product release:

```text
business goal
-> page / workbench / mini program draft
-> open-design or html-anything generates structure
-> taste-skill audits and upgrades visual quality
-> GSAP adds motion only when motion improves comprehension
-> release review
```

## What It Solves

- Generic AI page patterns: centered hero, three equal cards, purple-blue gradients, fake glass, weak hierarchy.
- Cramped product UI: crowded buttons, bad spacing, long text wrapping inside buttons, unclear visual priority.
- Weak conversion design: payment buttons not visually differentiated, primary and secondary actions fighting each other.
- Low-end customer perception: flat pages with no typography, no rhythm, no product confidence.
- Redesign discipline: improve existing pages without rewriting business logic.

## What It Does Not Solve

- It does not create business strategy.
- It does not replace task orchestration.
- It does not replace image generation, video generation, payment, order, or database logic.
- It does not guarantee conversion without real customer pain, proof, and offer design.

## Division Of Labor

| Layer | Tool | Role |
| --- | --- | --- |
| Visual direction | `open-design` | Decide visual concept, page structure, product look. |
| Fast page generation | `html-anything` | Turn structured content into usable HTML quickly. |
| Taste review | `taste-skill` | Remove generic AI design, improve hierarchy, spacing, typography, buttons, states. |
| Motion expression | `GSAP skills` | Add scroll storytelling, state transitions, premium interaction. |
| Exportable video | `Remotion / HyperFrames` | Turn product workflow and cases into videos. |

## Recommended Use Cases

1. AI Native command center website.
2. U-disk shell home screen.
3. Mini program "我的", order detail, report detail, payment conversion pages.
4. Xiaomei video workbench UI.
5. Product landing pages for color report, AI employee system, and workflow plugins.
6. Share pages and social referral pages.
7. Investor or customer demos.

## Quality Gate

Before a page is considered shippable, check:

- The primary action is visually obvious and secondary actions do not compete with it.
- Button text does not wrap or collide.
- The page has clear information priority, not just a list of cards.
- Empty, loading, error, and success states exist where users wait or fail.
- The design does not default to AI-purple gradients or three equal feature cards.
- Typography has a real scale and line length control.
- Mobile layout is not a squeezed desktop page.
- Motion uses `transform` and `opacity` first and does not hurt readability.

## Longka Rule

Use `taste-skill` as a design-review gate whenever a page will be seen by customers, investors, operators, or small-business owners.

For internal scripts and pure backend work, do not use it.
