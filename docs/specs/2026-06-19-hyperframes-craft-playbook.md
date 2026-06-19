# HyperFrames Craft Playbook（从 heygen 官方 25 个 frame-* 模版提炼）

> 目的:治我们程序化视频的"字太挤 + 动效不够美"。源 = `_ref/open-design/plugins/_official/video-templates/frame-*`(heygen 官方发布,带 HYPERFRAMES-ATTRIBUTIONS)。2026-06-19 用 5 个并行 agent 通读 25 个模版提炼。
> 关键认知:多数模版其实是**纯 CSS @keyframes**(不是 GSAP),"美"靠的是规则+分层+一条缓动曲线,不靠复杂引擎。

## 一、治"字太挤"(排版)

1. **视频字号(不是网页)**:hero 140–220px、正文 20–24px、数据标签 16px+、eyebrow 11–18px。
2. **字重极端对比**:hero 700–900 配 meta 200–400(或超细 220px/weight200 = 高级)。一眼能看出差别。
3. **字距**:大字 `letter-spacing:-0.02~-0.04em`(紧);小号大写 eyebrow `+0.14~0.22em / 4–10px`(宽)。
4. **中文行距 ≥1.05**(拉丁模版用 0.8–0.95,**照抄到中文就挤死** —— 这是我们字挤的头号根因)。正文 `line-height 1.5–2`。
5. **一屏一块密集文字**;`max-width`(300–1280px)+ `white-space:nowrap` 逼出干净两行,别让它乱折。
6. **大边距 + 锚边**:1920 框边距 96–160px;hero 锚左/锚角,**别居中飘**;网格(12列/6列)**大量留空**。
7. **金属渐变字 + 辉光**(大字显"被打光"不发死):`background:linear-gradient(180deg,#fff,#ccc,#888);-webkit-background-clip:text` + `text-shadow:0 0 40–100px rgba(255,255,255,.15–.35)`。
8. **字体**:serif+sans(别双 sans);避开 Inter/Roboto/Noto/Poppins/Outfit/Sora/Syne;可每段换显示字增加变化。

## 二、治"动效不够美"(动效)

1. **一条招牌缓动**贯穿入场:`cubic-bezier(0.16,1,0.3,1)`(CSS)= `expo.out`(GSAP)。出场 `expo.in / power2.in`;弹出 `back.out(1.7)` 或 `cubic-bezier(0.34,1.56,0.64,1)`;俏皮 `elastic.out(1,0.3~0.6)`。**别全用 power2.out / 别用 linear**(除连续平移/旋转/SVG 描线)。
2. **逐行/逐词/逐字 stagger**(最大提升):行/词 150–200ms、字 ~80ms;`translateY(20–40px)+opacity`。
3. **三段式 build→hold→resolve**:错峰入(~0.3s/元素)→ 停 → 最后 ~0.4s 出场(`scale+blur(20–30px)+opacity0`)。首帧延迟 0.1–0.3s。出场比入场快。
4. **线条画出来,别凭空出现**:`transform:scaleX(0→1);transform-origin:left` 或 SVG `stroke-dasharray=L;stroke-dashoffset:L→0`。
5. **数据**:数字 count-up(dummy `{val:0}` tween + onUpdate 改文本);柱子 `scaleY(0→1) transform-origin:bottom` 错峰;折线 `stroke-dashoffset` linear 画 + 圆点沿线跑。
6. **常驻微动**(静止画面不死,入场后再起):`floatY 7s` / `breathe 4s opacity 1↔0.45` / `sine.inOut` yoyo。用**有限次**循环(headless 确定性),别 `repeat:-1`。

## 三、看着"专业"(分层/氛围)—— 单条性价比最高

每场 4–7 层,自下而上:
- 底色渐变 → 色块/blur 大圆/3D 透视地板 → 极淡网格(64px,alpha 0.03–0.06)→ **颗粒 grain**(SVG `feTurbulence baseFrequency 0.85–0.9` 或 steps(1) 抖动 PNG,opacity 0.06–0.15,`mix-blend-mode:overlay`)→ **vignette**(`radial-gradient(transparent 50%, rgba(0,0,0,.6–.95))`,聚焦中心+藏边缘拥挤)→ 内容 → 重点色装饰。
- **液态背景**(不用 WebGL):3–4 个 `filter:blur(70px)` 圆 + `mix-blend-mode:screen`,异步 10–16s `translate+scale` 漂移。
- **乱背景上文字可读**:`mix-blend-mode:difference`(自动反色)或落在纯色面板/scrim 上。
- **一个重点色**贯穿:rule/line/glow/active 态都用它(红/金/蓝),glow 用同色 `rgba(accent,.18–.6)`。
- 招牌点缀:自描 SVG 下划线、`-webkit-text-stroke` 描边字、收尾 `drop-shadow` glow bloom / 一次性 shimmer 扫光。

## 四、多场景(30s promo 怎么拼)

1. **槽位式**:root `index.html` 声明总时长 + 若干 `<div data-composition-src data-start data-duration data-track-index>` 子合成;每个子合成把 paused GSAP timeline 挂 `window.__timelines[id]`。线性 promo 放**同一 track 背靠背**(start = 上一个 start+dur)。
2. **每段用 `tl.to({},{duration:SLOT},0)` 占满槽位长度**。
3. **转场不用 crossfade,用动作盖过硬切**:N 段自己 `blur+scale+opacity0` 退出,N+1 段 whip 扫光冲入(`xPercent -150→250`,0.4–0.5s `power3.in`)+ 音效 whoosh 卡在转场时刻。
4. **复现 motif**(一个 logo 反复出现)把几段串成一个故事。
5. 另一种模型:**transcript 字级时间轴** 驱动覆盖层/字幕,自动对配音(play-mode);A-roll 自己平移/变色给图文腾位。

## 五、节奏参考(各风格招牌缓动)

| 风格 | 入场 ease | 节奏 | 招牌 |
|---|---|---|---|
| Swiss/网格 | power2.inOut 0.2s 机械 | 紧凑对称 | 12列网格+黑/细字重对比,A-roll 移位让位 |
| Vignelli | expo.out/in | 大字全宽滑入 | 巨号黑体数字按6列量化+一条红 rule |
| 极简 build | cubic-bezier(.16,1,.3,1) | 逐字80ms | 超细 220px 单词+生长金色发丝线+breathe |
| Takram 有机 | .16,1,.3,1 + 弹出 .34,1.56,.64,1 | 描线+节点弹出 | 雾面卡+径向节点图自描+floatY |
| Warm grain | back.out(1.7) | 软飘落定 | 奶油色+steps(1) 颗粒闪烁+圆角形 |
| 电影 light-leak | 静态 | — | 暖径向漏光+grain+vignette+划痕 |
| 液态 hero | CSS 漂移 | — | blur 圆 screen 漂移 + difference 字 |
| 数据 NYT | clip-path 擦除 + 描线 | count-up | serif标题+mono轴+单红重点 |
| 产品 30s | expo.out/power3.out/back.out | 8段 build-hold-resolve | 金属字+透视地板+vignette+grain+whip转场+SFX |
| 俏皮 play | elastic.out(1,.3–.6) | 弹跳 | 贴纸卡+Nunito黑+transcript同步 |

## 落地

做我们的程序化片(大字卡/数据片/口播片底版)时,先按本 playbook 定 DESIGN.md(palette+字体+"不要做"),再写 HTML。校验:`npx hyperframes lint/validate`(WCAG)+ `scripts/animation-map.mjs`。口播片(ffmpeg 烧字幕)不走这套但字幕排版也可借第一节。
</content>
