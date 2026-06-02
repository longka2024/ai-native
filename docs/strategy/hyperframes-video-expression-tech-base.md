# HyperFrames Video Expression Technical Base

Updated: 2026-05-28

Local skills:

- `C:\Users\longfei\.codex\skills\hyperframes`
- `C:\Users\longfei\.codex\skills\hyperframes-cli`

## Decision

HyperFrames should be added to the Longka AI Native technical base as a high-end video expression layer.

It should not replace Xiaomei's current Remotion/FFmpeg pipeline.

```text
MoneyPrinterTurbo = video production pipeline reference
Remotion = stable coded video render engine
FFmpeg = packaging, audio mix, concat, cover extraction
HyperFrames = premium HTML/GSAP motion scenes, title cards, overlays, captions, transitions
```

## Role In Longka

HyperFrames belongs to the video presentation and motion-design layer.

It is useful when Xiaomei's workbench needs:

- premium title cards
- strong first-3-second hook scenes
- animated text emphasis
- hand-drawn circles, marker sweeps, burst lines
- product-flow overlays
- audio-reactive highlights
- kinetic typography
- polished transitions
- shareable social-media video templates

## Why It Matters

Xiaomei's current videos are functional but visually average.

The missing part is not only "more templates"; it is:

```text
better opening scene
better rhythm
stronger visual hierarchy
more memorable text motion
more persuasive proof scenes
better designed CTA ending
```

HyperFrames can provide those premium motion scenes while keeping the main business pipeline stable.

## Best Integration Mode

Do not make every Xiaomei video depend on HyperFrames.

Use it as an optional scene generator:

```text
Xiaomei selects video mode
-> Remotion builds the main business video
-> HyperFrames generates optional premium opening / transition / CTA scene
-> FFmpeg stitches final video
```

Recommended first use cases:

1. **Hook opener**
   - 0-3 seconds
   - strong title, moving report image, bold pain point
   - goal: improve click and retention

2. **Report value title card**
   - between scenes
   - "妆容建议 / 发型建议 / 穿搭方向"
   - goal: make report sections feel intentional

3. **Social sharing CTA**
   - ending scene
   - "上传两张照片，先生成试看图"
   - goal: improve action clarity

4. **Audio-reactive proof montage**
   - quick sample display
   - beat-synced image changes
   - goal: make multi-case videos less flat

## What To Absorb From The Skill

### 1. HTML as video source

HyperFrames uses HTML/CSS/GSAP composition files with explicit timing.

Longka can use this to make small, reusable video scenes:

- `hook-opener.html`
- `report-section-title.html`
- `proof-montage.html`
- `cta-ending.html`

### 2. Layout before animation

The skill requires building the final hero frame first, then animating into it.

This is important for Longka because previous Xiaomei screens had:

- cramped buttons
- overlapping text
- weak layout hierarchy
- text wrapping badly

The same discipline should apply to video scenes.

### 3. Visual identity gate

HyperFrames requires a `DESIGN.md` or explicit visual identity before composing.

Longka should create a color-report video identity:

- warm premium background
- red/rose CTA accent
- readable Chinese typography
- soft beauty-report texture
- no generic AI blue/purple gradient

### 4. CLI verification

HyperFrames provides:

- `npx hyperframes lint`
- `npx hyperframes preview`
- `npx hyperframes render`
- `npx hyperframes doctor`

This matches Longka's rule: do not claim a video template is usable before render verification.

## Boundary

Do not use HyperFrames for everything.

Avoid:

- replacing the whole workbench with HyperFrames
- making Xiaomei install Node 22 or extra CLI steps manually
- adding fancy motion when the story is weak
- using it to hide low-quality material
- shipping a package that fails because HyperFrames/Chrome/FFmpeg is missing

HyperFrames should be a premium-scene plugin. The normal render path must still work without it.

## Xiaomei Workbench Plan

### Phase 1: Prototype only

Create one HyperFrames scene:

```text
色彩报告强钩子片头
duration: 3 seconds
input: title, subtitle, one report image, CTA color
output: hook-opener.mp4
```

Then stitch:

```text
hook-opener.mp4 + existing Remotion video = final video
```

### Phase 2: Add 3 premium scene presets

- 强钩子片头
- 报告模块转场
- 发圈/小红书结尾 CTA

### Phase 3: Add workbench switch

In Xiaomei UI:

```text
高级动效片头：关闭 / 温柔高级 / 小红书强钩子 / 专业报告
```

Default should be off or conservative until packaging is verified.

### Phase 4: Package verification

Before shipping any HyperFrames-enabled package:

- run `npx hyperframes doctor`
- run `npx hyperframes lint`
- render one scene
- stitch with existing video
- zip extract test
- confirm MP4 and cover exist

## Final Judgment

HyperFrames should be added.

But it should be used surgically:

```text
MoneyPrinterTurbo gives production discipline.
Remotion gives stable business-video rendering.
HyperFrames gives premium motion scenes that improve click and retention.
```

The best immediate target is not a full rewrite.
It is one excellent 3-second opening scene that makes Xiaomei's videos look less ordinary.
