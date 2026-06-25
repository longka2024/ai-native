// utils.js — 公用工具函数
// 依赖: config.js (currentVisualStyle uses visualStyles + state)

function currentVisualStyle() {
  return visualStyles.find((item) => item.id === state.visualStyle) || visualStyles[0];
}

function visualStyleContract(styleId) {
  return VISUAL_STYLE_REGISTRY[styleId] || VISUAL_STYLE_REGISTRY["xiaohei-metaphor"];
}
function visualCardActionBriefs(styleId) {
  if (VISUAL_STYLE_REGISTRY[styleId]?.actions) return VISUAL_STYLE_REGISTRY[styleId].actions;
  const briefs = {
    "juju-organizing": {
      cover: "Juju action: Juju stands in the paper practice field and pins one main note about the current topic. Cognitive action: enter the topic quickly. Parallel world: method desk. Metaphor props: main note card, tape, one arrow, two small paper tabs.",
      problem: "Juju action: Juju uses a magnifying glass to inspect a pain-point note. Cognitive action: see the hidden reader problem. Parallel world: problem detective desk. Metaphor props: magnifying glass, question note, warning tab.",
      case: "Juju action: Juju sorts three case cards into who / what worked / result. Cognitive action: deconstruct the source case. Parallel world: small archive table. Metaphor props: three paper cards, clips, thin dividers.",
      method: "Juju action: Juju draws a four-step route with a pencil. Cognitive action: convert the idea into an executable path. Parallel world: route map notebook. Metaphor props: dotted path, four small stations, pencil, arrows.",
      action: "Juju action: Juju stamps a checklist as ready. Cognitive action: know the next practical step. Parallel world: tiny execution counter. Metaphor props: checklist, stamp, small envelope, done mark."
    },
    "xiaohei-metaphor": {
      cover: "Xiaomei action: Xiaomei performs one clear physical action on a real object that represents the current theme, such as twisting, pulling, opening, or holding it. Keep it concrete and clear.",
      problem: "Xiaomei action: Xiaomei faces a broken device, breakpoint, or pit that represents the reader pain. Use red only for the problem mark.",
      case: "Xiaomei action: Xiaomei breaks the case into several minimal real objects, not a table, not PPT. Use white space and 3-4 short handwritten labels.",
      method: "Xiaomei action: Xiaomei lays out a minimal path or mechanism with real objects to show the method steps. Orange can mark the main path.",
      action: "Xiaomei action: Xiaomei completes one small action and lands the next step on a real everyday object. Keep it warm, clean, relatable."
    },
    "xhs-knowledge-card": {
      cover: "Layout: sparse hook card with one strong title, one highlighted keyword, and a simple visual anchor. Use hand-drawn infographic style.",
      problem: "Layout: comparison or warning card. Show before/after, wrong/right, or hidden problem with concise labels.",
      case: "Layout: dense/list or quadrant card. Extract 3-5 reusable points from the selected source, not generic libraries.",
      method: "Layout: flow/list card. Turn the method into 3-5 steps with highlighted verbs and clean sections.",
      action: "Layout: checklist/ending card. Give one practical next step and a clean CTA-like ending without internal process notes."
    },
    "guizang-editorial": {
      cover: "Layout stance: Swiss or Editorial cover. Big but restrained title, strong hierarchy, one evidence/atmosphere block, no cartoon character.",
      problem: "Layout stance: tension page. Use two-column contrast, marginalia, or hairline-separated evidence rows to show the problem.",
      case: "Layout stance: feature/evidence page. Use a large proof block, ledger row, matrix, or pull quote tied to this source.",
      method: "Layout stance: structured method page. Use numbered statements, KPI tower, h-bar, ledger, or magazine column; no rounded SaaS cards.",
      action: "Layout stance: closing takeaway page. Use a refined quote/checklist/issue strip; footer must not collide with content."
    },
    // 通用回落:新增的海报/信息图/写实/插画等风格用它(不强加吉祥物动作),按版面角色描述
    "_generic": {
      cover: "Cover page: one strong focal visual for the topic + the exact hook headline; generous negative space.",
      problem: "Problem page: one clear image of the reader's pain/tension; minimal supporting marks.",
      case: "Case page: one emblematic proof image or 3-block evidence layout; no table dump.",
      method: "Method page: a clean visual of the path/steps (3-5 nodes or modules), short labels only.",
      action: "Action page: one focal image landing a single concrete next step."
    }
  };
  // 角色类风格(小妹/卷卷/3D潮玩)有自己的动作库;其它版面类风格走通用回落,不被强塞吉祥物
  return briefs[styleId] || briefs["_generic"];
}

function styleLockedVisualBrief(card, visual) {
  const contract = visualStyleContract(visual.id);
  const originalBrief = card.visualBrief || "";
  const jujuGuard = visual.id === "juju-organizing"
    ? "Hard style requirement: Juju must be the visible main actor in this image. Juju is a white bichon dog organizer with black eyes, black nose, floppy ears, short legs, small-dog proportions, and a small scarf or badge. Do not use a human/girl as protagonist. Do not replace Juju with hand-only props. Juju must physically perform the core organizing action."
    : "";
  const xiaoheiGuard = visual.id === "xiaohei-metaphor"
    ? "Hard style requirement: Xiaomei must be the visible main actor — the SAME 2D flat cartoon girl as the reference (black low ponytail, round gentle face, coral short-sleeve T-shirt + denim shorts, white sneakers, summer outfit, clearly cartoon not a real face). Keep her consistent with the reference image. Do not use a black stick figure, Juju dog, realistic human face, or winter coat."
    : "";
  // 系列一致性母版(借鉴 xhs-visual-director 的 series master lock;对图文卡与视频关键帧都安全:只锁竖版+跨页一致令牌+文字安全区,不硬定卡片尺寸)
  const seriesLock = "Series consistency lock: portrait orientation only (no square, no landscape, no crop). Keep identical color tokens, typography system, line weight, icon/marker style, card radius and safe margins across ALL pages/frames in this set — only the main subject and the information structure change on this one. Keep text-safe zones clean and high contrast; use an even grid with generous spacing; the title must sit on a clear, high-contrast area and never be covered by decoration.";
  const allCards = [
    originalBrief,
    `Current style route: ${visual.id}.`,
    `Style route base: ${contract.route}.`,
    `Character contract: ${contract.character}.`,
    `Style lock: ${contract.styleLock}.`,
    seriesLock,
    jujuGuard,
    xiaoheiGuard,
    "Fact fidelity (hard rule): any number, amount, date, percentage, name or fact rendered in the image must match the source copy EXACTLY — do not alter, round, scale, or invent numbers (e.g. never turn 500亿 into 50亿); do not add clickbait words like 震惊/必看/震撼/吓人 unless they literally appear in the copy.",
    `Negative prompt: ${contract.negativePrompt}`,
    "Consistency negatives: no square, no landscape, no inconsistent margins, no random layout shift between pages, no per-page template change, no PPT bullet-list look, no garbled or warped text, no tiny unreadable text, no decoration covering the title.",
  ].filter(Boolean).join("\n");
  return allCards;
}

const steps = [
  ["发布目标", "发到哪里"],
  ["业务信息", "行业和目标"],
  ["素材来源", "从哪找素材"],
  ["找素材", "采集或复用"],
  ["选择选题", "今天写哪条"],
  ["标题候选", "按平台改写"],
  ["生成文案", "平台成品"],
  ["体检优化", "改到能发"],
  ["确认文案", "网页确认"],
  ["制作分流", "图文或视频"],
  ["导出交付", "给运营用"],
  ["沉淀资产", "下次复用"],
];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function apiPath(path) {
  const clean = String(path || "").startsWith("/") ? String(path || "") : `/${path}`;
  if (window.location.pathname.startsWith("/ai-native-v2/")) return `/ai-native-v2${clean}`;
  return clean;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function byId(id) {
  return document.getElementById(id);
}


function zh(entity) {
  const box = document.createElement("textarea");
  box.innerHTML = entity;
  return box.value;
}

function log(line) {
  state.logs.push(line);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
