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
    title: "小黑漫画隐喻",
    desc: "适合观点、避坑、反差和情绪场景。用小黑的动作把观点讲明白。",
    route: "ian-xiaohei-illustrations",
    assetLabel: "小黑手绘漫画 / 观点隐喻",
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
];

const VISUAL_STYLE_REGISTRY = {
  "xiaohei-metaphor": {
    route: "ian-xiaohei-illustrations",
    character: "Xiaohei: a small black round stick-figure character with tiny white eyes. Xiaohei must be the main actor and must perform one concrete strange-but-clear metaphor action.",
    styleBrief: "Ian Xiaohei article illustration: clean white background, black ink linework with tasteful light red/orange/blue color accents, ONE clear witty metaphor scene with only a few supporting details that reinforce it, simple and elegant, clear at a glance, not a poster, not a busy collage.",
    styleLock: "3:4 social image. One single clear core metaphor/action; a single Xiaohei is the one clear focal point — do NOT scatter multiple Xiaohei or several mini-scenes. Generous breathing room. About 4-6 short handwritten Chinese labels and only a few supporting props; clean, on-theme, readable at a glance, never cluttered.",
    negativePrompt: "No Juju dog, no human protagonist, no PPT, no dashboard, no formal flowchart, no cute children's illustration, no commercial stock illustration, no dense text, no gradient decoration.",
    qa: ["Xiaohei is visible", "one concrete metaphor action", "white background", "no poster/dashboard/PPT"],
    actions: {
      cover: "Xiaohei performs a strange-but-clear action on an object representing the current topic.",
      problem: "Xiaohei faces a broken device, gap, trap, or problem mark representing the reader pain.",
      case: "Xiaohei breaks the source case into a few simple objects instead of a table.",
      method: "Xiaohei pushes a simple path or mechanism that shows the method steps.",
      action: "Xiaohei completes one small executable action and lands the next step on an object.",
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

