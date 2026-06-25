// config.js — 产品配置：发布平台、信息源、视觉风格
// 依赖: 无

const TITLE_LOGIC_VERSION = "topic-bound-readable-v4";
const VISUAL_PROMPT_VERSION = "visual-v20260610-juju-bichon-lock";

const publishTargets = [
  { id: "xhs", title: "小红书图文", platform: "xiaohongshu", desc: "封面、标题、短正文、收藏点、标签" },
  { id: "douyin", title: "抖音短视频", platform: "douyin", desc: "3 秒钩子、口播、镜头、字幕、节奏" },
  { id: "video-account", title: "视频号短视频", platform: "video", desc: "信任感、口播、案例、转化动作" },
  { id: "wechat-article", title: "公众号长文", platform: "wechat", desc: "标题、开头、论证、案例、方法论" },
  { id: "moments", title: "朋友圈文案", platform: "moments", desc: "自然表达、信任建立、私聊引导" },
  { id: "topic-only", title: "只整理选题", platform: "asset", desc: "只把素材整理成可复用选题，暂不写成品" },
];

const sourceChannels = [
  { id: "same-platform", title: "同平台对标素材", desc: "在哪个平台发，就优先读取哪个平台的高表现素材。" },
  { id: "xhs", title: "小红书素材", desc: "学习小红书标题、封面、评论痛点和收藏结构。" },
  { id: "x-history", title: "历史资产", desc: "复用以前采集过的真实素材，找出今天能写的选题。" },
  { id: "x-live", title: "X 账号资产", desc: "读取 X/推特来源，适合提炼观点、洞察和方法论。" },
  { id: "hot30", title: "30天热点", desc: "读取样本库近 30 天高热度内容（按互动量×时效衰减打分），适合追当下热门方向。" },
  { id: "all-assets", title: "全库选题复用", desc: "从内容资产库里找好选题，再改写到目标平台。" },
  { id: "manual", title: "手动导入", desc: "粘贴你看到的好内容，整理成可写选题。" },
];
const visualStyles = [
  {
    id: "xiaohei-metaphor",
    title: "小妹实物场景",
    desc: "适合观点、避坑、反差和情绪场景。用小妹卡通形象 + 真实物件把观点讲明白。",
    route: "xiaomei-scenes",
    assetLabel: "小妹实物场景图 / 观点隐喻",
  },
  {
    id: "juju-organizing",
    title: "卷卷整理插画",
    desc: "适合把复杂方法、复盘和教程整理成白底纸面手绘现场。",
    route: "juju-content-illustrations",
    assetLabel: "卷卷整理研究所 / 内容插画",
  },
  {
    id: "xhs-knowledge-card",
    title: "宝玉知识卡",
    desc: "适合清单、步骤、对比和收藏型内容。一页一个重点。",
    route: "baoyu-xhs-images / baoyu-infographic",
    assetLabel: "小红书知识卡 / 信息图",
  },
  {
    id: "guizang-editorial",
    title: "归藏杂志风",
    desc: "适合方法论、行业洞察和投资人演示。更像高级 Deck。",
    route: "open-design / guizang deck",
    assetLabel: "归藏编辑风 / 杂志 Deck",
  },
  // 以下来自 awesome-gpt-image-2 提示词库(EvoLink/freestylefly),走 Kie gpt-image-2 出图
  { id: "poster-cinematic", title: "高级海报", desc: "严肃高端话题首选:大标题+一个主视觉+大留白,电影感、有质感。替掉狗。", route: "gpt-image-2 / poster", assetLabel: "高级海报 / 封面" },
  { id: "typography-poster", title: "字体海报", desc: "强观点、金句、态度类。标题文字本身就是主视觉,克制配色。", route: "gpt-image-2 / typography", assetLabel: "概念字体海报" },
  { id: "infographic-engine", title: "信息图", desc: "干货、步骤、教程、对比:结构化图解+短标签+色块箭头,收藏率高。", route: "gpt-image-2 / infographic", assetLabel: "信息图 / 知识图解" },
  { id: "realistic-photo", title: "写实摄影", desc: "人像、商品、生活纪实:真实镜头光线质感,可信、有现场感。", route: "gpt-image-2 / photography", assetLabel: "写实摄影" },
  { id: "art-illustration", title: "艺术插画", desc: "治愈、情感、故事:水彩/水墨/动漫艺术风,温度感强。", route: "gpt-image-2 / illustration", assetLabel: "艺术插画" },
  { id: "ink-poster", title: "水墨意境", desc: "文化、诗意、深度话题:水墨双重曝光+人像剪影+留白,高级。", route: "gpt-image-2 / ink", assetLabel: "水墨意境海报" },
  { id: "product-commerce", title: "商品种草", desc: "美容/好物/电商:商品主图+卖点排版+材质光线,带货向。", route: "gpt-image-2 / product", assetLabel: "商品商业视觉" },
  { id: "cute-3d-toy", title: "3D 潮玩", desc: "萌系、IP、反差可爱:盲盒公仔质感(可按参考图转 3D)。", route: "gpt-image-2 / 3d", assetLabel: "3D 收藏潮玩" },
  { id: "svarbova-poster", title: "极简杂志海报", desc: "高端封面/海报:极简公共空间+几何构图+克制粉调+一抹番茄红+巨型标题(Svarbova风),图文一体、杂志封面感。", route: "gpt-image-2 / poster", assetLabel: "极简杂志海报(Svarbova风)" },
];

// 打法(产出形态)——配图方案 = 风格 × 打法
const VISUAL_PLAYS = [
  { id: "cover", name: "封面主视觉", emoji: "🖼️", desc: "一张冲击力主图,留标题位" },
  { id: "magazine", name: "杂志海报", emoji: "📰", desc: "图 + 巨型标题图文一体" },
  { id: "carousel", name: "轮播图文", emoji: "📑", desc: "多页卡:封面/痛点/案例/方法/行动" },
];

const VISUAL_STYLE_REGISTRY = {
  "poster-cinematic": {
    route: "gpt-image-2 / poster",
    character: "No mascot. A high-end poster: ONE strong hero subject or a symbolic visual metaphor for the topic, with large negative space.",
    styleBrief: "Premium cinematic 3D-render poster with REAL visual impact. Build from 7 elements: (1) ONE monumental sculptural HERO METAPHOR object at center that physically embodies the topic's core idea (e.g. an ascending spiral staircase for growth, an infinity loop for a closed cycle, a giant tree breaking through stone); (2) an ultra-minimal high-end architectural space — tall glass walls / pale marble / shallow reflecting water — cool palette, deep perspective; (3) soft volumetric daylight + shallow depth of field + light atmospheric haze (cinematic); (4) restrained white & pale mint-green palette with EXACTLY ONE small high-saturation accent color as the focal pop; (5) a tiny lone human figure for epic scale; (6) realistic matte-stone / glass / mirror materials (never flat); (7) generous negative space at the top reserved for the headline. Photorealistic 3D render, editorial, dreamlike, premium. 3:4.",
    styleLock: "Impact must come from the 3D hero-metaphor object + cinematic light + scale contrast — NOT from layout. One monumental subject + lots of breathing room + one bold accurate headline in the top negative space. NEVER a flat vector graphic, NEVER a knowledge card, NEVER a moodboard/collage, NEVER a PPT.",
    negativePrompt: "No cartoon mascot, no dog, no flat vector / knowledge-card / clip-art look, no cluttered collage, no PPT/dashboard, no dense paragraph, no childish illustration, no garbled text, no watermark, no multiple competing accent colors.",
    actions: { cover: "ONE monumental 3D hero-metaphor sculpture for the topic in a minimal cinematic space, tiny figure for scale, one accent color, headline space on top.", problem: "A single striking image of the reader's problem/tension.", case: "One emblematic proof image, minimal supporting marks.", method: "A clean visual of the key idea/path, sparse labels.", action: "One focal image landing the next step." },
  },
  "svarbova-poster": {
    route: "gpt-image-2 / poster (Svarbova)",
    character: "No mascot. A few CALM human figures as ORDER SYMBOLS inside a minimal public space (not protagonists) — they only serve composition and metaphor.",
    styleBrief: "Premium editorial poster — minimalist art-photography + magazine-cover feel + integrated image-text. Learn Maria Svarbova's COLOR and COMPOSITION logic (do NOT copy any specific work): calm, restrained, geometric public space. Build the scene from minimal public-space geometry — tiles, steps, doorframes, colonnades, seats, corridors, walls, water reflections — clean, generous negative space, strong order. Few figures, calm, not smiling, not performing. Color: mint green / ice blue / cream white / light wood base, with ONLY a tiny amount of tomato-red / coral as the single visual anchor; overall clean, bright, retro, restrained. Core metaphor = one concrete action or object. 3:4.",
    styleLock: "High-end feel comes from the FOUNDATIONS — space, order, negative space, color — NOT fonts/effects. The GIANT main title (tomato-red or deep teal) is part of the composition (integrated poster); subtitle one size smaller, once only. Calm, geometric, restrained.",
    negativePrompt: "No info bar, no numbering, no data icons, no barcode, no percentages, no side caption column, no decorative English, no stacked magazine small-text; no PPT feel, no cheap-tech feel, no element pile-up; no exaggerated/performing/smiling figures; no extra accent colors (anchor color one spot only); no garbled text, no watermark.",
    actions: { cover: "Minimal public space (tiles/steps/colonnade/water reflection) + a few calm figures as order symbols + one core metaphor action/object + GIANT main title integrated into the composition + one tomato-red anchor.", problem: "A calm geometric public-space image embodying the tension; restrained.", case: "One emblematic ordered scene as proof; minimal.", method: "A clean geometric layout of the key idea; sparse labels.", action: "One focal ordered image landing the next step." },
  },
  "typography-poster": {
    route: "gpt-image-2 / typography",
    character: "No mascot. The headline TEXT itself is the main visual; supporting imagery serves the words.",
    styleBrief: "Conceptual typographic poster: bold expressive headline as the focal structure, restrained palette, clean background, premium type design, the spelling must be exact. 3:4.",
    styleLock: "Headline is the hero; correct Chinese characters; few supporting elements; restrained colors. NOT default text effects, NOT random icons, NOT busy.",
    negativePrompt: "No mascot, no garbled/misspelled text, no random clip-art icons, no rainbow colors, no cluttered layout, no watermark.",
    actions: { cover: "The hook headline as a striking type composition.", problem: "A short tension phrase set as bold type.", case: "A key quote/number set as type.", method: "Step keywords as a typographic system.", action: "The next-step phrase as bold type." },
  },
  "infographic-engine": {
    route: "gpt-image-2 / infographic",
    character: "No mascot. A structured information graphic: 3-5 modules with flow, hierarchy and short labels.",
    styleBrief: "Clean infographic: 3-5 modules, clear information flow and hierarchy, color blocks + arrows + simple icons + generous whitespace, short handwritten-feel labels, highly screenshot-able/collectible. 3:4.",
    styleLock: "Limit to 3-5 modules first, then add detail; short labels only; readable at a glance. NOT long paragraphs crammed in, NOT a wall of tiny text.",
    negativePrompt: "No mascot, no dense paragraphs, no tiny unreadable text, no decorative clutter, no PPT template, no watermark, no garbled text.",
    actions: { cover: "A clean title module + one key visual anchor.", problem: "A before/after or wrong/right comparison block.", case: "A 3-card or quadrant evidence layout.", method: "A numbered step-flow with 3-5 connected nodes.", action: "A short checklist with one highlighted next step." },
  },
  "realistic-photo": {
    route: "gpt-image-2 / photography",
    character: "No mascot. Realistic documentary photography: a believable real subject/scene.",
    styleBrief: "Realistic photography: specified camera angle, lens, light source, texture and background; cinematic documentary feel; subtle believable imperfections for authenticity. 3:4.",
    styleLock: "Real, believable scene; consistent light and perspective; a few natural imperfections. NOT over-smoothed, NOT studio-ad-fake unless intended, NOT cartoon.",
    negativePrompt: "No cartoon/mascot, no over-retouched plastic skin, no extra fingers/limbs, no garbled signage text, no watermark.",
    actions: { cover: "A real, evocative photo of the topic moment.", problem: "A candid photo of the pain/situation.", case: "A real photo standing in for the proof.", method: "A real photo of the step/action being done.", action: "A real photo of the next concrete step." },
  },
  "art-illustration": {
    route: "gpt-image-2 / illustration",
    character: "No mascot required. An art illustration (watercolor / ink / soft anime) carrying mood.",
    styleBrief: "Art illustration: defined composition + subject + palette + brush/texture + mood + finish; warm, emotional, hand-made feel (watercolor, ink wash, or soft anime). 3:4.",
    styleLock: "Composition first, then style; clear focal subject; cohesive palette and mood. NOT style-only with no composition, NOT messy.",
    negativePrompt: "No PPT, no dashboard, no stock clip-art, no garbled text, no overcrowding, no watermark.",
    actions: { cover: "An evocative illustrated scene for the hook.", problem: "An illustrated moment of the feeling/problem.", case: "An illustrated vignette of the example.", method: "An illustrated simple path of the idea.", action: "An illustrated gentle next-step scene." },
  },
  "ink-poster": {
    route: "gpt-image-2 / ink",
    character: "No mascot. Ink-wash double-exposure: a portrait silhouette blended with ink texture and atmosphere.",
    styleBrief: "Ink-wash double-exposure poster: portrait silhouette + ink texture + layered atmosphere + negative space; restrained, refined, poetic, cultural. 3:4.",
    styleLock: "Restrained, high-end, readable; blend silhouette + ink + mood. NOT cheap fantasy collage, NOT scenery pile-up; minimal text.",
    negativePrompt: "No mascot, no cheap fantasy collage, no cluttered scenery, no neon, no garbled text, no watermark.",
    actions: { cover: "An ink-wash silhouette evoking the theme.", problem: "An ink composition of the inner tension.", case: "An ink vignette of the turning point.", method: "An ink flow suggesting the path.", action: "A calm ink closing image." },
  },
  "product-commerce": {
    route: "gpt-image-2 / product",
    character: "No mascot. The product is the hero: clean product shot with selling-point layout.",
    styleBrief: "Product commerce visual: defined product, selling points, material, scene, lighting and layout blocks; distinguish main product, selling-point labels and supporting props. 3:4.",
    styleLock: "Product clearly the focus; clean selling-point labels; believable material/light. NOT irrelevant props drowning the product, NOT messy.",
    negativePrompt: "No mascot, no clutter that hides the product, no garbled packaging text, no fake medical claims, no watermark.",
    actions: { cover: "Hero product shot + one key selling point.", problem: "The need/pain the product solves, shown simply.", case: "Before/after or result of using it.", method: "How to use / key features laid out cleanly.", action: "A clear 'try this' product close-up." },
  },
  "cute-3d-toy": {
    route: "gpt-image-2 / 3d",
    character: "A cute 3D collectible-toy character (blind-box/figure look); if a reference image is given, keep its face & outfit anchors.",
    styleBrief: "Premium 3D collectible toy render: soft rounded forms, big expressive eyes, blind-box aesthetic, specified material, base, packaging and soft studio lighting. 3:4.",
    styleLock: "Adorable, premium toy finish; keep identity anchors if a reference is given; packaging text minimal and accurate. NOT a generic faceless toy.",
    negativePrompt: "No flat 2D, no dense text, no garbled packaging text, no cluttered scene, no watermark.",
    actions: { cover: "The toy character posed for the topic hook.", problem: "The toy character acting out the problem.", case: "The toy character with a simple proof prop.", method: "The toy character showing the step.", action: "The toy character doing the next small action." },
  },
  "xiaohei-metaphor": {
    route: "xiaomei-scenes",
    referenceImageUrl: "http://122.51.218.154/ai-native-v2/media/persona/full_flat.jpg",
    character: "Xiaomei: the SAME recurring 2D flat vector cartoon character — a young East-Asian woman with a black low ponytail and loose front strands, round gentle face, warm soft smile, wearing her signature coral/terracotta short-sleeve T-shirt, denim shorts and white sneakers (summer outfit). Clearly cartoon, NOT a real face. Xiaomei must be the single main actor performing ONE concrete physical action with a real everyday object.",
    styleBrief: "Xiaomei real-object scene illustration: clean white studio background, 2D flat vector style with simple clean lines, ONE real everyday object + Xiaomei's one clear physical action, only a few supporting details, tasteful light color accents, simple and elegant, clear at a glance, not a poster, not a busy collage.",
    styleLock: "3:4 social image. ONE single Xiaomei as the one clear focal point performing one core physical action with one real main object — do NOT scatter multiple Xiaomei or several mini-scenes. Generous white breathing room. About 3-4 short handwritten Chinese labels and only a few supporting props; clean, readable at a glance, never cluttered. Keep Xiaomei's face/hair/outfit consistent with the reference.",
    negativePrompt: "No black stick figure, no Juju dog, no realistic human face / no photo face, no winter coat / no puffer jacket (it is summer), no PPT, no dashboard, no formal flowchart, no children's illustration, no commercial stock illustration, no dense text, no gradient decoration.",
    qa: ["Xiaomei (coral tee girl) is visible", "one concrete physical action with a real object", "white background", "no poster/dashboard/PPT"],
    actions: {
      cover: "Xiaomei performs a clear physical action on a real object representing the current topic.",
      problem: "Xiaomei faces a broken device, gap, trap, or problem mark representing the reader pain.",
      case: "Xiaomei breaks the source case into a few simple real objects instead of a table.",
      method: "Xiaomei lays out a simple path or mechanism with real objects that shows the method steps.",
      action: "Xiaomei completes one small executable action and lands the next step on a real object.",
    },
  },
  "juju-organizing": {
    route: "juju-content-illustrations",
    character: "Juju: a white bichon dog organizer with fluffy white fur, black eyes, black nose, clear eye-nose triangle, floppy ears, short legs, small-dog proportions, and an optional orange scarf or badge.",
    styleBrief: "Original JUJU visual language: white or near-white paper background, light black hand-drawn linework, low-saturation accents, visible paper-world props, generous whitespace. Chinese labels must be integrated into note cards, tabs, arrows, tools, frames, or props.",
    styleLock: "paper practice field + small working props + clear Juju action + low-saturation color shifts. One image = one cognitive action. Juju must physically perform the main action in every card.",
    negativePrompt: "No sheep, no wool ball, no generic plush toy, no pet portrait, no Xiaohei, no black stick figure, no human/girl/student/teacher protagonist, no hand-only protagonist, no slide template, no dashboard, no pasted subtitle, no dense paragraph, no watermark, no big-character poster.",
    qa: ["Juju white bichon is visible", "Juju performs the main action", "no human/girl protagonist", "paper-world props carry labels"],
    actions: {
      cover: "Juju stands in the paper practice field and pins one main note about the current topic.",
      problem: "Juju uses a magnifying glass to inspect a pain-point note.",
      case: "Juju sorts three case cards into who / what worked / result.",
      method: "Juju draws a route map with a pencil and four small stations.",
      action: "Juju stamps a checklist as ready.",
    },
  },
  "xhs-knowledge-card": {
    route: "card-xiaohongshu / baoyu-xhs-images",
    character: "No fixed mascot. Use icons, highlighted keywords, layout blocks, comparisons, flows, checklists, or hand-drawn information objects.",
    styleBrief: "Xiaohongshu high-save knowledge card: concise information, clear hierarchy, ample whitespace, highlighted keywords, useful checklist/comparison/flow when relevant.",
    styleLock: "One card one purpose. Auto-select layout from content: list, comparison, flow, quadrant, mindmap, or checklist. Mobile readability is mandatory.",
    negativePrompt: "No Xiaohei metaphor, no Juju dog protagonist, no Guizang magazine deck, no dense article paragraph, no unreadable tiny text, no meaningless stickers.",
    qa: ["one card one point", "mobile-readable labels", "clear layout type", "not a wall of text"],
    actions: {
      cover: "Sparse hook card with one strong title and one visual anchor.",
      problem: "Comparison or warning card showing before/after, wrong/right, or hidden problem.",
      case: "Dense/list or quadrant card extracting 3-5 reusable source points.",
      method: "Flow/list card turning the method into 3-5 steps.",
      action: "Checklist/ending card giving one practical next step.",
    },
  },
  "guizang-editorial": {
    route: "guizang-social-card-skill / open-design",
    character: "No cartoon mascot. Use editorial layout, evidence blocks, screenshots, titles, pull quotes, marginal notes, data rows, or grids.",
    styleBrief: "Guizang premium editorial social card with a warm ivory/beige paper background and elegant gold + soft olive accents, refined serif Chinese headlines, thin gold line icons, strict grid, strong hierarchy, one sharp visual argument — a high-end magazine / premium-consulting look that stays consistent across a brand account's posts.",
    styleLock: "Expression comes first. Content shape decides layout. Every page needs a clear focal point and visual relation to the selected topic. Do not mix Editorial and Swiss in one set.",
    negativePrompt: "No Xiaohei, no Juju dog, no Baoyu hand-drawn info card, no children's cartoon, no ordinary big-character poster, no random blobs/stickers, no nested cards, no text overflow.",
    qa: ["clear editorial focal point", "premium grid", "no cartoon mascot", "text does not overflow"],
    actions: {
      cover: "Swiss or editorial cover with restrained big title and one evidence/atmosphere block.",
      problem: "Tension page using contrast, marginalia, or separated evidence rows.",
      case: "Feature/evidence page using proof block, ledger row, matrix, or pull quote.",
      method: "Structured method page with numbered statements, KPI tower, h-bar, ledger, or magazine column.",
      action: "Closing takeaway page with refined quote/checklist/issue strip.",
    },
  },
};

// ── 视频出片档位（成本可配）────────────────────────────────────────────
// Hailuo 2.3 图生视频按「次」计费（不是按秒），喂关键帧图(image_url)。后台改价只改这里。
// 客户界面只显示 label / 大白话，不暴露模型名/服务商。
const VIDEO_CREDIT_TO_RMB = 0.036;   // 你的账号：5000 点 = 180 元 → 0.036 元/点
const VIDEO_KEYFRAME_CREDITS = 3;    // 每张关键帧图（出图）扣点
const VIDEO_DEFAULT_CLIP_SECONDS = 6; // Hailuo 单段只支持 6 或 10 秒
// 根源控成本：口播视频按"关键画面"出，不要一句一镜。归并成固定几个分镜（关键帧少→片段少→成本低）。
const VIDEO_TARGET_SHOTS = 5;        // 默认归并成 5 个关键画面（hook/问题/答案/对比/收尾）
const VIDEO_TIERS = [
  {
    id: "economy",
    label: "省钱档 · 标清",
    hint: "出片快、最省，适合走量",
    model: "hailuo/2-3-image-to-video-standard",
    resolution: "768P",
    defaultSeconds: 6,
    clipCreditsBySeconds: { 6: 30, 10: 50 }, // Hailuo 标准 768P 按次价
  },
  {
    id: "premium",
    label: "精品档 · 高清",
    hint: "更清晰，重点视频用",
    model: "hailuo/2-3-image-to-video-pro",
    resolution: "1080P",
    defaultSeconds: 6,
    clipCreditsBySeconds: { 6: 80 }, // Hailuo Pro 1080P 6s 按次价
  },
];
function videoTierById(id) {
  return VIDEO_TIERS.find((t) => t.id === id) || VIDEO_TIERS[0];
}
// 每段视频扣点（按次价表查；找不到精确秒数取最接近档）
function videoClipCredits(tier, seconds) {
  const tbl = (tier && tier.clipCreditsBySeconds) || {};
  const keys = Object.keys(tbl).map(Number).sort((a, b) => a - b);
  if (!keys.length) return 0;
  if (tbl[seconds] != null) return tbl[seconds];
  const nearest = keys.reduce((p, c) => (Math.abs(c - seconds) < Math.abs(p - seconds) ? c : p), keys[0]);
  return tbl[nearest];
}
// 估算一条视频成本：关键帧图 + N 段视频。返回 {credits, rmb}。
function estimateVideoCost(tierId, shotCount, seconds) {
  const tier = videoTierById(tierId);
  const n = Math.max(0, Number(shotCount) || 0);
  const dur = Number(seconds) || tier.defaultSeconds || VIDEO_DEFAULT_CLIP_SECONDS;
  const credits = n * VIDEO_KEYFRAME_CREDITS + n * videoClipCredits(tier, dur);
  return { credits: Math.round(credits), rmb: Math.round(credits * VIDEO_CREDIT_TO_RMB * 10) / 10 };
}

