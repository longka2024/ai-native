# Open Design HTML Video Upgrade Note

Date: 2026-06-08

## Current Finding

Upstream Open Design has moved toward an HTML Video path that uses HyperFrames / `hyperframes-html` style generation and rendering.

Update after VPN was disabled:

- Side clone succeeded at `E:\Codex\open-design-latest-20260608c`.
- Upstream latest commit observed: `a9f6949 feat(web): move working-dir pill to composer and label default storage (#3818)`.
- Confirmed upstream files:
  - `design-templates/hyperframes/SKILL.md`
  - `design-templates/hyperframes/references/html-in-canvas.md`
  - `design-templates/hyperframes/references/transitions.md`
  - `design-templates/hyperframes/scripts/animation-map.mjs`
  - `prompt-templates/video/hyperframes-*.json`
  - `plugins/_official/video-templates/hyperframes-*`
  - `skills/video-hyperframes`

The local checkout at `E:\Codex\open-design` is older. It currently exposes:

- `skills/motion-frames`
- `skills/sprite-animation`
- handoff language such as "ready for HyperFrames export"

It does not yet expose the newer Open Design `hyperframes-html` dispatch/plugin files locally.

## Local HyperFrames Status

Local HyperFrames skills already exist:

- `C:\Users\longfei\.codex\skills\hyperframes`
- `C:\Users\longfei\.codex\skills\hyperframes-cli`

CLI check:

```text
npx.cmd hyperframes --version -> 0.6.80
```

Doctor check:

```text
Node.js: ok
FFmpeg: ok
FFprobe: ok
Chrome headless shell: ok
Docker: missing
```

Docker is not required for normal local MP4 rendering. It is only needed for reproducible Docker rendering.

## Product Meaning For Longka

This capability can connect existing Longka artifact layers:

```text
confirmed copy / script / motif
-> Open Design or html-anything creates HTML storyboard scenes
-> HyperFrames renders HTML/CSS/GSAP motion to MP4
-> video-use / gstack validates output
-> save asset manifest
```

This is especially useful for:

- Xiaohongshu image posts turned into short animated explainers
- investor/demo motion explainers
- premium opening/title/CTA scenes
- content-factory video variants from the same motif

## Boundary

Do not replace Remotion immediately.

Recommended structure:

- Remotion remains the stable video template engine.
- HyperFrames handles premium HTML motion scenes and explainers.
- Open Design HTML Video becomes the artifact-to-video bridge after local upgrade and test render.

## Why Open Design Was Not Directly Pulled

`E:\Codex\open-design` contains Longka-specific untracked assets:

- `demo-personal-image-report/`
- `design-systems/personal-image-studio/`
- `public/personal-image-report-demo/`
- `skills/personal-image-report/`
- `tools/`
- local run scripts

Direct `git pull` or destructive reset could overwrite or orphan these assets. A safe update requires one of:

1. archive/move Longka-specific additions out of the upstream checkout;
2. create a protected Longka fork/branch;
3. clone upstream to a clean side directory and selectively merge the HTML Video files.

Network attempts on 2026-06-08 before VPN was disabled:

- `git fetch origin`: timed out / blocked.
- side clone: timed out, then direct GitHub returned connection reset after VPN was disabled.
- partial clone directories were cleaned.

Network attempt after VPN was disabled:

- `git clone --depth 1 https://github.com/nexu-io/open-design.git E:\Codex\open-design-latest-20260608c` succeeded.

## Next Technical Step

1. Protect local Longka additions in `E:\Codex\open-design` before any update:
   - archive/move them out,
   - or create a protected Longka branch/fork,
   - or port upstream files from the side clone into the Longka repo intentionally.
2. Inspect upstream HyperFrames files from the side clone and decide the minimal Longka integration surface.
3. Run a minimal HTML storyboard -> MP4 render under an E drive asset path.
4. Update the Longka workbench only after a real render succeeds.
