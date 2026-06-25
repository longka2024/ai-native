# Spec — HTML 模板帧渲染内化(替 ffmpeg 字幕 + 小红书图文卡库) 2026-06-22

## 1. 背景与问题(为什么做)
- 做口播视频的**字幕 / 大字标题 / 字体特效**,一直用 ffmpeg + ASS 硬抠:出过行首逗号 bug、逐字高亮难做、版式丑("像坨屎")。ASS 表达力远不如 HTML/CSS。
- 深读 Pixelle-Video 发现它的核心价值正是 **HTMLFrameGenerator(Playwright 渲染 HTML→PNG 帧)+ 25 个设计好的 HTML/CSS 模板**(image_psychology_card 9/10、image_satirical_cartoon 9.5/10 带 JS 自适应字号、healing/excerpt/life_insights…)。这本该早用,却被我漏了。
- 结论:**用 HTML/CSS 模板渲染帧** 替掉 ffmpeg 字幕,既治口播模版的病,又白得一套小红书图文卡版式库。

## 2. 方案(怎么做)—— 内化进我们 Node 栈,不拖 Pixelle 的 python
- **真金 = 模板(HTML/CSS)**,引擎我们用 **Node + puppeteer/playwright-core 自己写**(渲染器 ~200 行)。**不起 python 微服务、不引 Pixelle 依赖**(绕开 122 无 pip)。
- 占位符机制照搬:`{{title}} {{text}} {{image}} {{param:type=默认}}`,JS 注入变量 → headless chromium 截图 → PNG。画幅由模板目录名(1080x1920)定。
- 字体:Google Fonts CDN(确认 122 可访问;不行则本地装,站酷快乐体已装)。
- **两类产出**:
  1. **口播视频字幕帧**:每句一帧(或逐字高亮帧序列)→ overlay/拼接进视频(替 ASS)。
  2. **小红书图文卡**:对接现有 12 风格配图体系,作为"版式层"(图 = Kie 出图,版式/文字 = HTML 模板)。

## 3. 范围
- **做**:抽 2-3 个最优模板(psychology_card / satirical_cartoon / healing)+ Node 渲染器 + 占位符替换;先替口播模版字幕(含逐字高亮路径);再接小红书图文卡。
- **不做**:不引入 Pixelle 的 FastAPI/python/comfykit;不动已认可的前端模块拆分;视觉分析那套(用 Claude 视觉自建)。

## 4. 确定性 / 成本(对齐北极星)
- HTML 模板渲染 = **纯本地、确定性、零按次费**(只耗 chromium 渲染,无云 API)。完全符合"脚本>抽卡、能不花钱不花钱"。
- 代价:渲染 ~1-2s/帧(慢于 ffmpeg)。静态卡/标题帧无所谓;逐字高亮帧序列较重,按需启用。

## 5. 验收
- 给一段口播视频 + 文案 → 用 HTML 模板渲染出"白字橙边、中下位置、逐字高亮、无行首逗号"的字幕帧,质量对标 VectCut 案例,**全程零云费**。
- 小红书图文卡:选一个 HTML 模板 + 一张 Kie 图 + 文案 → 出成品卡,版式明显优于纯出图。

## 6. 风险
- 122 无 pip:故引擎走 Node(npm 装 puppeteer/playwright-core),不依赖 python。
- 字体:CDN 不通则本地装(已有站酷快乐体 + Noto CJK)。
- 性能:批量渲染用浏览器实例复用 + 异步并发。
