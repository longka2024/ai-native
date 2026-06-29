# 视频风格档:暗色 SaaS/AI 产品短片 + 打字片头(内化自 video-production-skills)

> 内化自 Pluviobyte/video-production-skills(只取方法+参数,改我们规范/中文/Remotion 引擎)。
> 这是**风格档/形态菜单条目**,不是单独安装的 skill——用我们已有引擎(EffectEngine / HyperFrames)需要时建,免费。归属:视频形态菜单(见 docs/specs/2026-06-30-122-video-engine-spec.md),给 AI 自媒体/工具发布线 + 通用片头。

## 一、形态:暗色 SaaS / AI 产品短片(dark-saas)

**定位**:AI 工具/SaaS/产品能力展示短片(我们 AI 自媒体线)。风格级生成,非逐帧复刻。

**9 条硬风格规则**:①近黑舞台 + 细颗粒/星点 + 底部弱紫光晕(别用蓝灰)②禁持续水平霓虹线背景(会拍平)③大动感白字当叙事拍点(非小标签)④至少一个青→电蓝→品红渐变 CTA,点击触发可见变化⑤hero 主体在最显眼帧要**大**(提示卡/CTA/UI板/徽章环/导出物,绝不小道具)⑥大转场用 speed-blur/拖影/scale rush/白速度擦⑦UI 像"从黑暗召唤"(卡片/徽章/文件夹/模型芯片/导出药丸)⑧禁无故全屏纯色闪⑨永不谎称像素级。

**调色板**:背景近黑(非蓝灰)· 颗粒低透灰白 · 底部深紫光晕(弱)· 正文白 · 次要灰 · CTA 渐变青→电蓝→品红 · 面板炭灰+细灰边。**避**:米色/暖橙/重紫蓝渐变/水平霓虹线。

**8 个场景模块**(选符合产品的,别全用):①Kinetic Promise(黑屏→大白字打字→关键词带横向模糊替换→可选 logo→速度擦)②Prompt Invocation(倾斜提示卡大→打字→CTA 发光→光标点击→火花脉冲转场)③Generated Result(多 UI 卡黑空间漂浮→一张大特色卡穿过→视差→收成单画布)④Local/Platform(应用窗从底升起→标题打字→平台药丸→推近放大)⑤Connect Ecosystem(大圆节点沿弧入→provider 药丸环绕→旋转;节点保持大别缩)⑥Model Ring(徽章环→轨道漂移→中心文字后出→深度换位)⑦Export Burst(标题+导出 CTA→点击→文字拖散→文件夹→药丸迸发 PDF/PPTX/MD/Video/API/Link)⑧Final Claim(大词单独出→第二词宽间距加入→2-4 态变换→定格≥1s。例:Open→Open source→Open source AI→AI workflow engine)。

**时序预设**(精确到秒,可直接排):
- **Sting 8-12s**(3-4 模块):0-2.5 promise / 2.5-5 prompt·CTA / 5-8.5 能力reveal / 8.5-12 final。
- **Standard 30-36s**(6-8 模块·默认):0-5.5 promise+logo / 5.5-9.5 prompt / 9.5-14.5 result / 14.5-17 platform / 17-20.5 ecosystem / 20.5-24.5 model ring / 24.5-30.5 export / 30.5-36 final。
- **Extended 45-60s**:别变成 PPT,物件保持运动变换。

**引擎**:EffectEngine(Remotion)或 HyperFrames。中文配音照我们口径。

## 二、片头:黑底白字打字开场(typing-opener)

**定位**:任意视频的片头/引子(教程/观点/产品)。我们 EffectEngine 已有逐字字幕(Caption),加"打字+click 音效"变体即成。

**视觉**:纯黑 #000-#050505 + 白字 #fff-#f4f4f5;hero 字号 = 画面高 9-15%;干净 sans;字间距正常或微正,别压缩;≤3 个文字态再定格。
**打字动效**:逐字打出 + 仅新字轻 opacity/blur;状态变化用"先清/拖散旧句→再逐字打新句"(别整句淡入)。退出:白速度擦 / 文字拖入黑 / fade / 硬切。
**中文节奏(关键参数)**:默认 **14 字/秒**,密中文 **12 字/秒**,短英文/产品名 14-16;超 16 就缩文案别提速。
**音效规格(关键)**:干脆 key-click(非提示音)· **-24~-18 LUFS**(或独立片头 -18~-12 dB 峰)· 音量/音高微抖防机械 · 首字出现即响 · 定格/转场停 click · 有 BGM 就 duck 在音乐下。
**时序**:Micro 2.4-3.2s / Standard 4.8-5.8s / Slow 6.0-7.5s(每拍秒数见原档)。

## 三、顺手提炼的通用品质规则(不止这俩形态)
**"hero 主体要大、可读;不准把主体缩成小卡片堆边上"** —— 这条是通用视觉品质,可进**视觉质检**(成片软判:主体是否够大够可读)。坏 hero frame:小 UI 卡推到一边 / 扁平网页布局 / 背景比主体抢 / 长静态卡只换字。
