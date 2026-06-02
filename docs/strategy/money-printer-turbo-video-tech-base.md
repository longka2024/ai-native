# MoneyPrinterTurbo Video Production Technical Base Review

Updated: 2026-05-28

Source: `https://github.com/harry0703/MoneyPrinterTurbo.git`

Local research copy: `E:\Codex\research\MoneyPrinterTurbo`

## Decision

MoneyPrinterTurbo is useful for Longka, but not as a direct replacement for Xiaomei's video workbench.

Its strongest value is not "one-click AI video". The real value is its mature engineering pipeline:

```text
script
-> search terms / local materials
-> voiceover
-> subtitle timeline
-> material preprocessing
-> clip segmentation
-> transitions
-> BGM mixing
-> batch variants
-> task progress
-> final video outputs
```

Longka should absorb the pipeline ideas and selected implementation patterns, while keeping Xiaomei's workbench focused on the personal image/color report business.

## Why It Matters

Xiaomei's current videos feel average because the workflow is still too template-driven:

- one template often equals one fixed visual rhythm
- material selection is not graded strongly enough
- no true batch variant generation and selection loop
- subtitle style and audio mix are not treated as first-class controls
- output quality depends too much on a single render attempt
- videos lack enough hook/proof/CTA variation

MoneyPrinterTurbo addresses these problems through parameters and pipeline control, not through better taste alone.

## Useful Code Areas

### 1. Video pipeline orchestration

File: `app/services/task.py`

Useful pattern:

```text
generate_script
-> generate_terms
-> generate_audio
-> generate_subtitle
-> get_video_materials
-> generate_final_videos
```

Longka absorption:

- Xiaomei workbench should show the same step-state pipeline.
- Every step should have success/failure/progress.
- The user should know exactly whether the problem is copy, voice, subtitle, material, render, cover, or final export.

### 2. Multi-version generation

Files:

- `app/models/schema.py`
- `app/services/task.py`
- `webui/Main.py`

Useful fields:

- `video_count`
- `video_clip_duration`
- `video_concat_mode`
- `video_transition_mode`

Longka absorption:

- Add "一次生成 3 个版本" to Xiaomei workbench.
- Let Xiaomei choose the best one instead of betting on one render.
- Keep the same copy but vary rhythm, clip order, transitions, cover frame, and BGM.

This is the fastest way to improve perceived quality.

### 3. Material preprocessing

File: `app/services/video.py`

Useful patterns:

- reject unreadable material
- reject very low resolution material
- sanitize broken image metadata
- convert still images into short video clips
- apply slow zoom to images

Longka absorption:

- Customer photos and report pages must pass a material gate before rendering.
- Static report images should not just sit still; add controlled zoom/pan/parallax.
- Bad images should be flagged before video generation.

### 4. Clip segmentation and rhythm

File: `app/services/video.py`

Useful patterns:

- split source videos into segments by `max_clip_duration`
- random or sequential concat
- loop clips when material duration is shorter than voiceover
- use FFmpeg concat after preprocessing to reduce memory pressure

Longka absorption:

- Xiaomei templates need rhythm presets:
  - fast hook: 1.2-2.0 seconds per shot
  - explainer: 2.5-4.0 seconds per shot
  - report walkthrough: 3.0-5.0 seconds per shot
  - emotional/share: 2.0-3.0 seconds per shot
- Do not use the same image duration for every video type.

### 5. Transitions

Files:

- `app/models/schema.py`
- `app/services/utils/video_effects.py`

Useful modes:

- none
- fade in
- fade out
- slide in
- slide out
- shuffle

Longka absorption:

- Add restrained transition presets to Xiaomei workbench.
- Do not overuse random transitions for professional image reports.
- Use:
  - fade for premium/report videos
  - slide for process/tutorial videos
  - quick cut for hook videos

### 6. Subtitle controls

Files:

- `app/services/video.py`
- `app/services/subtitle.py`
- `webui/Main.py`

Useful controls:

- subtitle enabled
- font
- position
- custom position
- font size
- font color
- stroke color
- stroke width
- background color

Longka absorption:

- Xiaomei workbench needs branded subtitle presets, not raw free controls:
  - "朋友圈温柔字幕"
  - "小红书强钩子字幕"
  - "专业报告字幕"
  - "白底黑字讲解字幕"
- Each preset should define font size, stroke, background, position, and max line length.

### 7. Audio mixing

File: `app/services/video.py`

Useful patterns:

- independent voice volume
- independent BGM volume
- BGM loop to video duration
- BGM fade out
- audio bitrate fixed at `192k`

Longka absorption:

- Xiaomei workbench should expose simple presets:
  - voice clear / music low
  - balanced
  - music stronger / no voice
- Current "听不到背景音乐" and "旁白太嗲" issues should be solved by presets and voice role selection.

### 8. Local material upload and storage

Files:

- `app/controllers/v1/video.py`
- `app/services/video.py`

Useful pattern:

- restrict material files to a dedicated local directory
- return file names instead of absolute paths
- support images and videos
- preserve local material list across repeated generation

Longka absorption:

- Xiaomei workbench should keep a stable "素材库":
  - customer originals
  - report pages
  - approved sample cases
  - BGM
  - voiceover
  - covers
- It should not lose selected materials after changing copy.

## What Not To Copy

- Do not use generic Pexels/Pixabay footage as the main proof for personal image reports.
- Do not turn Xiaomei workbench into a generic topic-to-video machine.
- Do not rely on random stock clips to solve conversion.
- Do not expose too many technical controls to Xiaomei.
- Do not copy Streamlit UI; Xiaomei needs a simple operator-grade workbench.

## Xiaomei Workbench Upgrade Plan

### Phase 1: Quality levers

Add these controls first:

- video count: 1 / 3 / 5 variants
- shot rhythm: fast / normal / slow
- transition style: none / fade / slide / quick cut
- subtitle preset: strong hook / soft share / professional report
- audio preset: voice clear / balanced / music stronger

### Phase 2: Material intelligence

Add material scoring:

- same customer only
- complete report or preview-only
- face visibility
- image size
- report page type
- duplicate detection
- whether enough material exists for the selected video mode

### Phase 3: Template upgrade

Replace one-template-one-video with storyboards:

- hook storyboard
- single customer story
- multi-case proof
- report walkthrough
- feature-specific advice
- social sharing

Each storyboard should choose different shot duration, subtitle style, transition style, and visual hierarchy.

### Phase 4: Batch selection

After generation, show:

- version A / B / C
- cover preview
- first 3 seconds preview
- voice/BGM status
- used material list
- "选这版发朋友圈"
- "选这版发小红书"

## Final Judgment

MoneyPrinterTurbo can improve Xiaomei's workbench if Longka absorbs its engineering controls:

```text
batch variants
+ clip rhythm
+ transition presets
+ subtitle presets
+ audio mix presets
+ material gate
+ visible task progress
```

But the commercial quality still depends on Longka's own domain material:

```text
real customer photo
+ real report image
+ strong hook
+ clear proof
+ good cover
+ explicit CTA
```

The short-term win is not rewriting Xiaomei workbench in Python/MoviePy.
The short-term win is adding MoneyPrinterTurbo-style quality controls to the existing Remotion/FFmpeg pipeline.
