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
      cover: "Xiaohei action: Xiaohei uses a strange clear action to catch the topic, such as twisting, pulling, opening, or jamming an object that represents the current theme. Metaphor must be strange but clear.",
      problem: "Xiaohei action: Xiaohei faces a broken device, breakpoint, or pit that represents the reader pain. Use red only for the problem mark.",
      case: "Xiaohei action: Xiaohei breaks the case into several minimal objects, not a table, not PPT. Use white space and 3-5 short handwritten labels.",
      method: "Xiaohei action: Xiaohei pushes a minimal path or mechanism to show the method steps. Orange can mark the main path.",
      action: "Xiaohei action: Xiaohei completes one small action and lands the next step on an executable object. Keep it deadpan, clean, not cute."
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
    }
  };
  return briefs[styleId] || briefs["xiaohei-metaphor"];
}

function styleLockedVisualBrief(card, visual) {
  const contract = visualStyleContract(visual.id);
  const originalBrief = card.visualBrief || "";
  const jujuGuard = visual.id === "juju-organizing"
    ? "Hard style requirement: Juju must be the visible main actor in this image. Juju is a white bichon dog organizer with black eyes, black nose, floppy ears, short legs, small-dog proportions, and a small scarf or badge. Do not use a human/girl as protagonist. Do not replace Juju with hand-only props. Juju must physically perform the core organizing action."
    : "";
  const xiaoheiGuard = visual.id === "xiaohei-metaphor"
    ? "Hard style requirement: Xiaohei must be the visible main actor in this image. Xiaohei is a small black round stick-figure character with tiny white eyes. Do not use Juju, dog, human protagonist, or generic watercolor illustration."
    : "";
  const allCards = [
    originalBrief,
    `Current style route: ${visual.id}.`,
    `Style route base: ${contract.route}.`,
    `Character contract: ${contract.character}.`,
    `Style lock: ${contract.styleLock}.`,
    jujuGuard,
    xiaoheiGuard,
    `Negative prompt: ${contract.negativePrompt}.`,
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
