const state = {
  route: "today",
  step: 1,
  publishTarget: "xhs",
  sourceChannel: "same-platform",
  industry: "AI 与自媒体",
  businessLine: "AI 内容创作",
  goal: "获客和建立专业感",
  keywords: "AI自媒体 内容资产库 Agent工作流",
  materialScope: "all",
  materialAuthor: "",
  materialLatestRuns: 3,
  topics: [],
  selectedTopicId: "",
  titleChoices: [],
  titleChoiceKey: "",
  titleAssets: [],
  titleAssetMessage: "",
  titleAssetKey: "",
  titleAssetLoading: false,
  selectedTitle: "",
  draft: "",
  improvedDraft: "",
  copyConfirmed: false,
  draftRevision: 1,
  draftStatus: "idle",
  draftError: "",
  draftMeta: null,
  draftReview: null,
  copyVersions: [],
  currentCopyVersionId: "",
  confirmedCopyVersionId: "",
  pendingRevision: null,
  visualStyle: "xiaohei-metaphor",
  xhsCardPlan: [],
  xhsCardExportStatus: "idle",
  xhsCardExportMessage: "",
  xhsCardOperation: "",
  xhsCardProgress: null,
  xhsCardJobBase: "",
  xhsCardAsyncJobId: "",
  xhsCardStartPayload: null,
  xhsCardManifest: null,
  finalWorks: [],
  archiveMessage: "",
  editingMetricsWorkId: "",
  editingPublishWorkId: "",
  logs: [],
  assets: null,
  assetStatus: "未读取",
  lastXRunIds: [],
  useLatestXRunOnly: false,
  isCollectingX: false,
};

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
    styleBrief: "Ian Xiaohei article illustration: pure white background, minimal black ink linework, lots of whitespace, light red/orange/blue handwritten annotations, witty metaphor, not a poster.",
    styleLock: "3:4 social image. One image explains one core metaphor/action. Main subject occupies 40%-60% of the canvas. At least 35% blank white space. Use at most 5-8 short handwritten Chinese labels.",
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
    styleBrief: "Guizang social card: Editorial Magazine or Swiss International. Refined typography feeling, strict grid, strong hierarchy, paper/ink atmosphere, one sharp visual argument.",
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

const WORKBENCH_SNAPSHOT_KEY = "longka-workbench-v2-snapshot";
const SNAPSHOT_LIST_LIMIT = 24;
const SNAPSHOT_MAX_BYTES = 900000;
let snapshotSaveTimer = null;
let snapshotSavePending = false;
let lastPollRenderSignature = "";

function capList(list, limit = SNAPSHOT_LIST_LIMIT) {
  return Array.isArray(list) ? list.slice(0, limit) : [];
}

function slimVisualManifest(manifest) {
  if (!manifest || typeof manifest !== "object") return null;
  const publicFiles = capList(manifest.publicFiles, 8);
  const files = capList(manifest.files, 8).map((file) => ({
    path: file?.path || file?.file || "",
    publicUrl: file?.publicUrl || file?.url || "",
    style: file?.style || manifest.style || manifest.visualStyleId || "",
    page: file?.page || file?.index || "",
  }));
  return {
    renderer: manifest.renderer || "",
    count: Number(manifest.count || publicFiles.length || files.length || 0),
    publicFiles,
    files,
    jobIds: capList(manifest.jobIds, 8),
    style: manifest.style || manifest.visualStyleId || "",
    visualStyleId: manifest.visualStyleId || manifest.style || "",
    jobId: manifest.jobId || "",
  };
}

function compactSnapshot() {
  return {
    savedAt: new Date().toISOString(),
    route: state.route,
    step: state.step,
    publishTarget: state.publishTarget,
    sourceChannel: state.sourceChannel,
    industry: state.industry,
    businessLine: state.businessLine,
    goal: state.goal,
    keywords: state.keywords,
    materialScope: state.materialScope,
    materialAuthor: state.materialAuthor,
    materialLatestRuns: state.materialLatestRuns,
    topics: capList(state.topics, 40),
    selectedTopicId: state.selectedTopicId,
    titleChoices: capList(state.titleChoices, 20),
    titleAssets: capList(state.titleAssets, 20),
    titleAssetMessage: state.titleAssetMessage,
    titleAssetKey: state.titleAssetKey,
    selectedTitle: state.selectedTitle,
    draft: state.draft,
    improvedDraft: state.improvedDraft,
    copyConfirmed: state.copyConfirmed,
    draftRevision: state.draftRevision,
    draftMeta: state.draftMeta,
    draftReview: state.draftReview,
    copyVersions: capList(state.copyVersions, 12),
    currentCopyVersionId: state.currentCopyVersionId,
    confirmedCopyVersionId: state.confirmedCopyVersionId,
    visualStyle: state.visualStyle,
    xhsCardPlan: capList(state.xhsCardPlan, 8),
    xhsCardExportStatus: state.xhsCardExportStatus === "loading" ? "idle" : state.xhsCardExportStatus,
    xhsCardExportMessage: state.xhsCardExportStatus === "loading" ? "Previous image task restored. Continue or check results." : state.xhsCardExportMessage,
    xhsCardOperation: state.xhsCardOperation,
    xhsCardJobBase: state.xhsCardJobBase,
    xhsCardAsyncJobId: state.xhsCardAsyncJobId,
    xhsCardManifest: slimVisualManifest(state.xhsCardManifest),
    finalWorks: capList(state.finalWorks, 40),
    archiveMessage: state.archiveMessage,
    logs: capList(state.logs, 12),
    assets: state.assets,
    assetStatus: state.assetStatus,
    lastXRunIds: capList(state.lastXRunIds, 12),
    useLatestXRunOnly: state.useLatestXRunOnly,
  };
}

function scheduleWorkbenchSnapshotSave() {
  if (snapshotSavePending) return;
  snapshotSavePending = true;
  const save = () => {
    snapshotSavePending = false;
    snapshotSaveTimer = null;
    persistWorkbenchSnapshot();
  };
  if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
    snapshotSaveTimer = window.requestIdleCallback(save, { timeout: 1500 });
    return;
  }
  snapshotSaveTimer = setTimeout(save, 250);
}

function persistWorkbenchSnapshot() {
  try {
    const legacySnapshot = false && {
      savedAt: new Date().toISOString(),
      route: state.route,
      step: state.step,
      publishTarget: state.publishTarget,
      sourceChannel: state.sourceChannel,
      industry: state.industry,
      businessLine: state.businessLine,
      goal: state.goal,
      keywords: state.keywords,
      topics: state.topics,
      selectedTopicId: state.selectedTopicId,
      titleChoices: state.titleChoices,
      titleAssets: state.titleAssets,
      titleAssetMessage: state.titleAssetMessage,
      titleAssetKey: state.titleAssetKey,
      selectedTitle: state.selectedTitle,
      draft: state.draft,
      improvedDraft: state.improvedDraft,
      copyConfirmed: state.copyConfirmed,
      draftRevision: state.draftRevision,
      draftMeta: state.draftMeta,
      draftReview: state.draftReview,
      copyVersions: state.copyVersions,
      currentCopyVersionId: state.currentCopyVersionId,
      confirmedCopyVersionId: state.confirmedCopyVersionId,
      visualStyle: state.visualStyle,
      xhsCardPlan: state.xhsCardPlan,
      xhsCardExportStatus: state.xhsCardExportStatus === "loading" ? "idle" : state.xhsCardExportStatus,
      xhsCardExportMessage: state.xhsCardExportStatus === "loading" ? "已恢复上次出图任务，可继续生成或查询结果。" : state.xhsCardExportMessage,
      xhsCardOperation: state.xhsCardOperation,
      xhsCardJobBase: state.xhsCardJobBase,
      xhsCardAsyncJobId: state.xhsCardAsyncJobId,
      xhsCardManifest: state.xhsCardManifest,
      finalWorks: state.finalWorks,
      archiveMessage: state.archiveMessage,
      logs: state.logs,
      assets: state.assets,
      assetStatus: state.assetStatus,
      lastXRunIds: state.lastXRunIds,
      useLatestXRunOnly: state.useLatestXRunOnly,
    };
    const snapshot = compactSnapshot();
    localStorage.setItem(WORKBENCH_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch (error) {
    console.warn("Longka snapshot save failed", error);
  }
}

function restoreWorkbenchSnapshot() {
  try {
    const raw = localStorage.getItem(WORKBENCH_SNAPSHOT_KEY);
    if (!raw) return false;
    if (raw.length > SNAPSHOT_MAX_BYTES) {
      localStorage.removeItem(WORKBENCH_SNAPSHOT_KEY);
      console.warn("Longka snapshot discarded because it is too large", raw.length);
      return false;
    }
    const snapshot = JSON.parse(raw);
    if (!snapshot || typeof snapshot !== "object") return false;
    Object.assign(state, snapshot, {
      titleAssetLoading: false,
      draftStatus: "idle",
      draftError: "",
      pendingRevision: null,
      xhsCardProgress: null,
      isCollectingX: false,
    });
    state.step = Math.max(1, Math.min(12, Number(state.step || 1)));
    state.logs = [`宸叉仮澶嶄笂娆″伐浣滆繘搴︼細${new Date(snapshot.savedAt || Date.now()).toLocaleString()}`, ...(state.logs || [])].slice(0, 10);
    return true;
  } catch (error) {
    console.warn("Longka snapshot restore failed", error);
    return false;
  }
}

function simpleHash(value) {
  let hash = 2166136261;
  const text = String(value || "");
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0).toString(36);
}

function currentTarget() {
  return publishTargets.find((item) => item.id === state.publishTarget) || publishTargets[0];
}

function currentSource() {
  return sourceChannels.find((item) => item.id === state.sourceChannel) || sourceChannels[0];
}

function selectedTopic() {
  return state.topics.find((item) => item.id === state.selectedTopicId) || null;
}

function normalizeCopyText(value = "") {
  return String(value || "").replace(/\r\n/g, "\n").trim();
}

function activeCopyText() {
  return normalizeCopyText(state.improvedDraft || state.draft || "");
}

function validCopyVersions() {
  return (state.copyVersions || []).filter((item) => normalizeCopyText(item?.copy || ""));
}

function repairCopyState() {
  state.copyVersions = validCopyVersions();
  if (state.currentCopyVersionId && !state.copyVersions.some((item) => item.id === state.currentCopyVersionId)) {
    state.currentCopyVersionId = "";
  }
  if (state.confirmedCopyVersionId && !state.copyVersions.some((item) => item.id === state.confirmedCopyVersionId)) {
    state.confirmedCopyVersionId = "";
    state.copyConfirmed = false;
  }
  if (!activeCopyText() && state.copyVersions.length) {
    const latest = state.copyVersions[state.copyVersions.length - 1];
    state.draft = latest.copy;
    state.improvedDraft = "";
    state.currentCopyVersionId = latest.id;
    state.draftReview = latest.review || runLongkaReview(latest.copy);
  }
}

function rememberCopyVersion(copy, label = "鍒濈") {
  const text = normalizeCopyText(copy);
  if (!text) return null;
  const last = state.copyVersions[state.copyVersions.length - 1];
  if (last && normalizeCopyText(last.copy) === text && last.title === state.selectedTitle) {
    state.currentCopyVersionId = last.id;
    return last;
  }
  const review = runLongkaReview(text);
  const version = {
    id: `copy-${Date.now()}-${state.copyVersions.length + 1}`,
    round: state.copyVersions.length + 1,
    title: state.selectedTitle,
    copy: text,
    score: review?.score || 0,
    label,
    review,
    createdAt: new Date().toISOString(),
    confirmed: false,
  };
  state.copyVersions = [...state.copyVersions, version].slice(-10);
  state.currentCopyVersionId = version.id;
  return version;
}

function currentCopySnapshot(label = "褰撳墠鐗堟湰") {
  repairCopyState();
  const current = state.copyVersions.find((item) => item.id === state.currentCopyVersionId);
  const copy = activeCopyText() || normalizeCopyText(current?.copy || "");
  if (!copy) return null;
  return {
    id: current?.id || "",
    round: current?.round || state.copyVersions.length,
    title: state.selectedTitle,
    copy,
    score: current?.score || runLongkaReview(copy)?.score || 0,
    label,
  };
}

function clearCopyConfirmation() {
  state.copyConfirmed = false;
  state.confirmedCopyVersionId = "";
  state.copyVersions = state.copyVersions.map((item) => ({ ...item, confirmed: false }));
}

function restoreCopyVersion(id, approve = false) {
  const version = state.copyVersions.find((item) => item.id === id);
  if (!version) return;
  state.selectedTitle = version.title || state.selectedTitle;
  state.draft = version.copy;
  state.improvedDraft = "";
  state.draftReview = version.review || runLongkaReview(version.copy);
  state.currentCopyVersionId = version.id;
  state.draftStatus = "done";
  state.draftError = "";
  if (approve) {
    state.copyConfirmed = true;
    state.confirmedCopyVersionId = version.id;
    state.copyVersions = state.copyVersions.map((item) => ({ ...item, confirmed: item.id === version.id }));
    setStep(10);
    return;
  }
  clearCopyConfirmation();
  renderToday();
}

function renderCopyVersionList() {
  repairCopyState();
  if (!state.copyVersions.length) return "";
  const best = state.copyVersions.reduce((winner, item) => (!winner || item.score > winner.score ? item : winner), null);
  return `<div class="copy-version-list">
    <b>版本记录</b>
    ${state.copyVersions.slice().reverse().map((item) => `<div class="copy-version-item ${item.id === state.currentCopyVersionId ? "active" : ""} ${item.id === state.confirmedCopyVersionId ? "confirmed" : ""}">
      <button type="button" data-copy-version="${escapeHtml(item.id)}">
        <span>第 ${item.round} 版${best?.id === item.id ? " · 当前最佳" : ""}${item.id === state.currentCopyVersionId ? " · 当前查看" : ""}${item.id === state.confirmedCopyVersionId ? " · 已确认" : ""}</span>
        <strong>${item.score}/100</strong>
        <small>${escapeHtml(item.label)}</small>
      </button>
      <div class="copy-version-actions">
        <button class="secondary" type="button" data-copy-restore="${escapeHtml(item.id)}">恢复此版</button>
        <button class="primary" type="button" data-copy-confirm="${escapeHtml(item.id)}">确认此版</button>
      </div>
    </div>`).join("")}
  </div>`;
}
function confirmedCopyText() {
  const confirmed = state.copyVersions.find((item) => item.id === state.confirmedCopyVersionId);
  return normalizeCopyText(confirmed?.copy || activeCopyText());
}

function cleanPublishBodyForCopy(raw = "") {
  const text = normalizeCopyText(raw);
  const lines = text.split(/\n/);
  const cutIndex = lines.findIndex((line) => /^\s*(配图建议|配图|图片建议|图片规划|标签|话题标签|hashtags?)\s*[:：]/iu.test(line));
  const withoutTail = cutIndex >= 0 ? lines.slice(0, cutIndex).join("\n") : text;
  return normalizeCopyText(withoutTail)
    .replace(/(?:^|\n)\s*(配图建议|配图|图片建议|图片规划|标签|话题标签|hashtags?)\s*[:：][\s\S]*$/iu, "")
    .replace(/\n\s*#\S+(?:\s+#\S+)*\s*$/u, "")
    .replace(/^\s*(标题|正文)\s*[:：]\s*/gmu, "")
    .trim();
}

function extractBodyLinesForCards(copy = "") {
  return normalizeCopyText(copy)
    .split(/\n+/)
    .map((line) => line.replace(/^(标题|正文|配图建议|标签)[:：\s]*/u, "").trim())
    .filter((line) => line && !/^#/.test(line))
    .slice(0, 12);
}
function buildXhsCardPlanFromConfirmedCopy() {
  const copy = confirmedCopyText();
  const topic = selectedTopic() || {};
  const visual = currentVisualStyle();
  const lines = extractBodyLinesForCards(copy);
  const title = state.selectedTitle || topic.theme || topic.title || "AI 内容创作为什么总是没流量";
  const director = buildLongkaIllustrationDirectorPlan({ copy, topic, visual, lines, title });
  return buildTopicBoundVisualCards({ copy, topic, visual, lines, title, director });
}
function ensureXhsCardPlan() {
  if (!state.xhsCardPlan.length && state.copyConfirmed) {
    state.xhsCardPlan = buildCleanXhsCardPlanFromConfirmedCopy();
  }
  return state.xhsCardPlan;
}

function buildCleanXhsCardPlanFromConfirmedCopy() {
  const copy = confirmedCopyText();
  const topic = selectedTopic() || {};
  const visual = currentVisualStyle();
  const lines = extractBodyLinesForCards(copy);
  const title = state.selectedTitle || topic.theme || topic.title || "AI 内容创作为什么总是没流量";
  const director = buildLongkaIllustrationDirectorPlan({ copy, topic, visual, lines, title });
  return buildTopicBoundVisualCards({ copy, topic, visual, lines, title, director });
}
function buildTopicBoundVisualCardsLegacy(options = {}) {
  return buildTopicBoundVisualCards(options);
}
function buildLongkaIllustrationDirectorPlan({ copy = "", topic = {}, visual = currentVisualStyle(), lines = [], title = "" } = {}) {
  const signal = extractVisualTopicSignals({ copy, topic, title, lines });
  const platform = visualPlatformForCurrentTarget();
  const style = visual.id;
  const contract = visualStyleContract(style);
  const density = estimateIllustrationDensity({ copy, lines, platform });
  const styleReason = style === "juju-organizing"
    ? "This copy needs a paper-world organizer: turn abstract method/process into enterable scenes."
    : style === "xiaohei-metaphor"
      ? "This copy has tension or opinion: use one weird-but-clear character action to make readers stop."
      : style === "guizang-editorial"
        ? "This copy is closer to insight/report/deck: use editorial hierarchy and evidence layout."
        : "This copy has checklist or tutorial value: turn it into save-worthy knowledge cards.";
  const platformMode = platform === "wechat-article"
    ? "semantic article illustration"
    : platform === "moments"
      ? "single light social image"
      : platform === "douyin-images"
        ? "cover plus image-post storyboard"
        : "xiaohongshu carousel";
  const qa = contract.qa || ["style contract is followed", "content matches topic", "text is readable", "image is publishable"];
  const allSlots = [
    { type: "cover", role: "Stop-scroll cover", placement: platform === "wechat-article" ? "article opening cover" : "P1", job: "make the reader stop and understand the main promise", focus: `${signal.subject} + ${signal.result}` },
    { type: "problem", role: "Problem visual", placement: platform === "wechat-article" ? "after the first pain paragraph" : "P2", job: "externalize the hidden question or pitfall", focus: signal.pain },
    { type: "case", role: "Source deconstruction", placement: platform === "wechat-article" ? "after source/case paragraph" : "P3", job: "show what is worth borrowing from the source", focus: signal.casePoints.join(" / ") },
    { type: "method", role: "Method path", placement: platform === "wechat-article" ? "inside method section" : "P4", job: "turn the idea into an executable path", focus: signal.methodSteps.join(" -> ") },
    { type: "action", role: "Next action", placement: platform === "wechat-article" ? "before the ending CTA" : "P5", job: "tell the operator/reader the next concrete step", focus: signal.action },
  ];
  const slots = allSlots.filter((slot) => density.types.includes(slot.type));
  return { style, styleReason, platformMode, signal, qa, slots, imageCount: slots.length, countReason: density.reason };
}

function estimateIllustrationDensity({ copy = "", lines = [], platform = "xhs" } = {}) {
  if (platform === "moments") return { types: ["cover"], reason: "朋友圈只需要一张轻配图，不做图集。" };
  if (platform === "wechat-article") {
    const rich = lines.length >= 8 || /案例|步骤|方法|流程|对比|复盘|数据|清单/.test(copy);
    return rich
      ? { types: ["cover", "problem", "case", "method", "action"], reason: "公众号长文信息量足够，适合 4-5 张语义插图。" }
      : { types: ["cover", "problem", "action"], reason: "正文信息量一般，只插 3 张关键图，避免硬凑。" };
  }
  const signals = [
    /案例|来源|样本|对标|爆款/.test(copy),
    /步骤|方法|流程|SOP|路径|清单/.test(copy),
    /问题|痛点|坑|误区|为什么/.test(copy),
    /数据|结果|收益|阅读|收藏|评论|增长/.test(copy),
    lines.length >= 7,
  ].filter(Boolean).length;
  if (signals >= 4) return { types: ["cover", "problem", "case", "method", "action"], reason: "当前文案信息密度够，适合 5 张小红书图集。" };
  if (signals >= 2) return { types: ["cover", "problem", "action"], reason: "当前文案只有 2-3 个关键关系，做 3 张更干净。" };
  return { types: ["cover"], reason: "当前文案只适合一张主视觉，硬凑多图会稀释重点。" };
}
function buildTopicBoundVisualCards({ copy = "", topic = {}, visual = currentVisualStyle(), lines = [], title = "", director = null } = {}) {
  const signal = extractVisualTopicSignals({ copy, topic, title, lines });
  const plan = director || buildLongkaIllustrationDirectorPlan({ copy, topic, visual, lines, title });
  const contract = visualStyleContract(visual.id);
  const juju = visual.id === "juju-organizing";
  const actionBriefs = visualCardActionBriefs(visual.id);
  const promptBase = [
    "3:4 social content image.",
    `Topic: ${signal.subject}.`,
    `Result/proof: ${signal.result}.`,
    `Current title: ${title}.`,
    `Visual route: ${contract.route}.`,
    `Character/style: ${contract.character}.`,
    `Style lock: ${contract.styleLock}.`,
    `Style brief: ${contract.styleBrief}.`,
    `Negative prompt: ${contract.negativePrompt}.`,
    "Do not reuse unrelated content asset library, title formula library, user question library, or structure library visuals unless this selected topic is explicitly about those libraries."
  ].join(" ");
  const cardSpecs = {
    cover: { title: title || signal.coverText, text: signal.coverText, extra: `Only express ${signal.subject} and ${signal.result}.`, prompt: `Cover page. Strong focal point: ${signal.subject} + ${signal.result}.` },
    problem: { title: signal.problemTitle, text: signal.pain, extra: `Show the real reader question behind ${signal.result}.`, prompt: `Problem page. Show the question behind ${signal.subject}.` },
    case: { title: signal.caseTitle, text: signal.casePoints.join("\n"), extra: `Break the current case into subject=${signal.subject}, result=${signal.result}, key=${signal.keyPoint}.`, prompt: "Case deconstruction page with three paper cards: who, what worked, result." },
    method: { title: signal.methodTitle, text: signal.methodSteps.join("\n"), extra: `Break the path to ${signal.result} into executable steps.`, prompt: "Method page. Show an executable route, not a generic template." },
    action: { title: signal.actionTitle, text: signal.action, extra: `Give only the next practical step around ${signal.subject}.`, prompt: `Action checklist page, practical next step for ${signal.subject}.` },
  };
  return plan.slots.map((slot) => {
    const spec = cardSpecs[slot.type] || cardSpecs.cover;
    const actionBrief = actionBriefs[slot.type] || "";
    const role = `${slot.placement || ""} ${slot.role || slot.type}`.trim();
    return {
      type: slot.type,
      role,
      title: spec.title,
      text: spec.text,
      visualStyle: visual.id,
      carouselJob: role,
      visualBrief: `${contract.styleBrief} Director placement: ${slot.placement || "current page"}. Reader job: ${slot.job || ""}. Visual focus: ${slot.focus || ""}. ${actionBrief} ${spec.extra}`,
      readerTakeaway: slot.job || signal.takeaway,
      imagePrompt: `${promptBase} Placement: ${slot.placement || ""}. Reader job: ${slot.job || ""}. Visual focus: ${slot.focus || ""}. Title: ${spec.title}. Allowed text only: ${String(spec.title || "").slice(0, 18)}; ${String(spec.text || "").split("\n").slice(0, 3).join("; ").slice(0, 48)}. ${spec.prompt} ${actionBrief} ${juju ? "Juju must look like a white bichon dog, not a sheep or wool ball. Text must be attached to paper objects, never pasted as a giant subtitle." : ""}`,
    };
  });
}
function extractVisualTopicSignals({ copy = "", topic = {}, title = "", lines = [] } = {}) {
  const source = cleanSourceText([title, copy, topic.title, topic.theme, topic.body, topic.content].filter(Boolean).join(" "));
  const metric = source.match(/(\d+(?:\.\d+)?\s*[万千百]?\+?\s*(?:阅读|播放|收藏|点赞|评论|收益|收入|粉丝|转化))/)?.[1] || "";
  const subject = cleanSourceText(topic.theme || topic.title || title).replace(/[，。！？].*$/, "").slice(0, 18) || "这个选题";
  const result = metric || (source.match(/(涨粉|阅读|播放|成交|获客|收益|收入|增长)[^，。！？]{0,16}/)?.[0] || "跑出结果");
  const pain = lines.find((line) => /为什么|不是|关键|忽略|收益|流量|定位|内容|案例|痛点|问题/.test(line)) || `很多人只看到${result}，但没看懂${subject}背后的关键变量。`;
  const action = lines.find((line) => /先|第一步|建议|测试|行动|复盘|观察|评论|私信/.test(line)) || `先拆一个真实${subject}案例：看它服务谁、发什么、怎么把注意力变成${result}。`;
  const keyPoint = /定位/.test(source) ? "账号定位" : /内容/.test(source) ? "持续内容" : /收益|流量|增长/.test(source) ? "结果路径" : "可复用动作";
  return {
    subject,
    result,
    keyPoint,
    coverText: `${subject}为什么能${result}`,
    problemTitle: `为什么${subject}能跑出来`,
    caseTitle: `${subject}案例拆解`,
    methodTitle: `跑通${subject}的动作`,
    actionTitle: "先照着拆一个真实案例",
    pain,
    action,
    takeaway: `这篇讲的是${subject}的真实结果，不是泛泛讲内容资产库。`,
    casePoints: [`对象：${subject}`, `结果：${result}`, `关键：${keyPoint}`],
    methodSteps: ["找准具体人群", "持续发有用内容", "观察结果数据", "复盘可复制动作"],
  };
}
function renderCleanXhsCardPreview() {
  const cards = ensureXhsCardPlan();
  if (!cards.length) return `<div class="empty-state"><b>${zh("&#35831;&#20808;&#30830;&#35748;&#25991;&#26696;")}</b><span>${zh("&#30830;&#35748;&#25991;&#26696;&#21518;&#65292;&#25165;&#20250;&#29983;&#25104;&#21487;&#25191;&#34892;&#30340;&#20986;&#22270; brief&#12290;")}</span></div>`;
  const hasRealImages = Array.isArray(currentVisualManifest()?.publicFiles) && currentVisualManifest().publicFiles.length > 0;
  const visual = currentVisualStyle();
  return `<div class="xhs-card-preview-panel">
    <div class="visual-workspace-head">
      <div>
        <b>${zh("&#24403;&#21069;&#20986;&#22270;&#20869;&#23481;")}</b>
        <span>${zh("&#24050;&#32465;&#23450;")}: ${escapeHtml(state.selectedTitle || selectedTopic()?.theme || "no title")} / ${escapeHtml(visualRouteNameClean(state.visualStyle))}</span>
      </div>
      <em>${escapeHtml(visual.route || visual.id)}</em>
    </div>
    ${hasRealImages ? "" : `<div class="status-strip warn">${zh("&#36825;&#37324;&#20808;&#25226;&#25991;&#26696;&#25286;&#25104; 5 &#39029;&#21487;&#25191;&#34892;&#20986;&#22270; brief&#12290;&#26368;&#32456;&#33021;&#21457;&#24067;&#30340;&#32467;&#26524;&#65292;&#20197; 43 &#36820;&#22238;&#30340;&#30495;&#23454;&#22270;&#29255;&#20026;&#20934;&#12290;")}</div>`}
    ${renderCurrentCopyForImage()}
    ${renderIllustrationDirectorPanel()}
    ${renderXhsGeneratedGallery()}
    <details class="xhs-carousel-plan" ${hasRealImages ? "" : "open"}>
      <summary>${zh("&#26597;&#30475; 5 &#39029;&#20986;&#22270; brief")}</summary>
      ${cards.map((card, index) => `<div><span>P${index + 1}</span><strong>${escapeHtml(card.role)}</strong><em>${escapeHtml(card.carouselJob || card.visualBrief || "brief")}</em></div>`).join("")}
    </details>
    ${currentVisualManifest() ? `<div class="status-strip success">${zh("&#24050;&#29983;&#25104;")}: ${escapeHtml(currentVisualManifest().count || cards.length)} ${zh("&#24352;")} / ${escapeHtml(currentVisualManifest().jobId || currentVisualManifest().outputDir || "")}</div>` : ""}
    ${state.xhsCardExportMessage ? `<div class="status-strip ${state.xhsCardExportStatus === "error" ? "warn" : ""}">${escapeHtml(state.xhsCardExportMessage)}</div>` : ""}
  </div>`;
}

function renderIllustrationDirectorPanel() {
  const copy = confirmedCopyText();
  const topic = selectedTopic() || {};
  const visual = currentVisualStyle();
  const lines = extractBodyLinesForCards(copy);
  const title = state.selectedTitle || topic.theme || topic.title || "";
  const plan = buildLongkaIllustrationDirectorPlan({ copy, topic, visual, lines, title });
  return `<div class="illustration-director">
    <div class="director-head">
      <div>
        <b>Longka 配图导演</b>
        <span>先判断图位和阅读功能，再调用对应风格 skill 出图。图数按内容密度决定，不硬凑。</span>
      </div>
      <em>${escapeHtml(plan.platformMode)} / ${escapeHtml(visualRouteNameClean(plan.style))}</em>
    </div>
    <div class="director-reason"><b>推荐理由</b><span>${escapeHtml(plan.styleReason)} ${escapeHtml(plan.countReason || "")}</span></div>
    <div class="director-slots">
      ${plan.slots.map((slot) => `<article>
        <em>${escapeHtml(slot.placement)}</em>
        <b>${escapeHtml(slot.role)}</b>
        <span>${escapeHtml(slot.job)}</span>
        <small>${escapeHtml(String(slot.focus || "").slice(0, 90))}</small>
      </article>`).join("")}
    </div>
    <div class="director-qa"><b>出图验收</b>${plan.qa.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
  </div>`;
}
function renderVisualStylePicker() {
  return `<div class="visual-style-grid">
    ${visualStyles.map((item) => `<button type="button" class="visual-style-option ${item.id === state.visualStyle ? "active" : ""}" data-visual-style="${escapeHtml(item.id)}">
      <b>${escapeHtml(item.title)}</b>
      <span>${escapeHtml(item.desc)}</span>
      <em>${escapeHtml(item.route)}</em>
    </button>`).join("")}
  </div>`;
}

function renderCurrentCopyForImage() {
  const confirmed = state.copyVersions.find((item) => item.id === state.confirmedCopyVersionId);
  const copy = confirmedCopyText();
  const title = state.selectedTitle || selectedTopic()?.theme || selectedTopic()?.title || "未选择标题";
  const summary = copy.split(/\n+/).map((line) => line.trim()).filter(Boolean).slice(0, 4).join("\n");
  return `<div class="xhs-current-copy">
    <div class="xhs-current-copy-head">
      <b>当前用于出图的文案</b>
      <span>${confirmed ? `已确认版本：第 ${confirmed.round} 版 / ${confirmed.score || "-"} 分` : "已确认当前正文"}</span>
    </div>
    <strong>${escapeHtml(title)}</strong>
    <pre>${escapeHtml(summary || copy || "暂无文案摘要")}</pre>
    <div class="xhs-current-copy-actions">
      <button class="secondary" type="button" data-step-target="7">重新生成文案</button>
      <button class="ghost" type="button" data-step-target="9">查看/更换确认版本</button>
    </div>
  </div>`;
}
function renderXhsGeneratedGallery() {
  const files = Array.isArray(currentVisualManifest()?.publicFiles) ? currentVisualManifest().publicFiles : [];
  const isXiaohei = String(state.xhsCardManifest?.renderer || "").includes("43-gpt-image-2-xiaohei");
  if (files.length) {
    const done = Number(state.xhsCardProgress?.done || files.length || 0);
    const total = Number(state.xhsCardProgress?.total || 5);
    const isLoading = state.xhsCardExportStatus === "loading";
    const styleName = visualRouteNameClean(state.visualStyle);
    return `<div class="xhs-generated-gallery">
      <div class="xhs-generated-head">
        <b>${escapeHtml(styleName)} ${zh("&#30495;&#23454;&#20986;&#22270;&#32467;&#26524;")}</b>
        <span>${isLoading ? `43 ${zh("&#21518;&#21488;&#36824;&#22312;&#29983;&#25104;")}: ${done}/${total}${zh("&#24352;&#12290;&#24050;&#29983;&#25104;&#30340;&#22270;&#29255;&#20808;&#26174;&#31034;&#65292;&#21487;&#28857;&#24320;&#26816;&#26597;&#21407;&#22270;&#12290;")}` : zh("&#22270;&#29255;&#26469;&#33258; 43 &#20986;&#22270;&#26381;&#21153;&#65292;&#21487;&#28857;&#20987;&#25171;&#24320;&#21407;&#22270;&#26816;&#26597;&#12290;")}</span>
      </div>
      <div class="xhs-generated-grid ${isLoading ? "partial" : ""}">
        ${files.map((file, index) => {
          const raw = String(file);
          const src = /^https?:\/\//.test(raw) ? raw : `./${raw.replace(/^\/+/, "")}`;
          return `<a href="${escapeHtml(src)}" target="_blank" rel="noreferrer">
            <img src="${escapeHtml(src)}" alt="${escapeHtml(styleName)} P${index + 1}" loading="lazy" />
            <span>P${index + 1}</span>
          </a>`;
        }).join("")}
      </div>
    </div>`;
  }
  if (state.xhsCardExportStatus === "loading" && state.xhsCardOperation === "xiaohei") {
    const done = Number(state.xhsCardProgress?.done || files.length || 0);
    const total = Number(state.xhsCardProgress?.total || 5);
    return `<div class="xhs-generated-empty loading">
      <b>43 正在生成配图</b>
      <span>正在逐张生成：${done}/${total}。已生成的图片会先保留，避免整批超时后全部丢失。</span>
      ${files.length ? `<div class="xhs-generated-grid partial">
        ${files.map((file, index) => {
          const raw = String(file);
          const src = /^https?:\/\//.test(raw) ? raw : `./${raw.replace(/^\/+/, "")}`;
          return `<a href="${escapeHtml(src)}" target="_blank" rel="noreferrer">
            <img src="${escapeHtml(src)}" alt="配图 ${index + 1}" loading="lazy" />
            <span>P${index + 1}</span>
          </a>`;
        }).join("")}
      </div>` : ""}
    </div>`;
  }
  if (state.xhsCardExportStatus === "loading") {
    return `<div class="xhs-generated-empty loading">
      <b>正在导出拆页方案</b>
      <span>这一步用于检查每页承载的信息，不代表最终出图结果。</span>
    </div>`;
  }
  if (!files.length) {
    return `<div class="xhs-generated-empty">
      <b>还没有生成配图</b>
      <span>确认当前文案后，点击生成配图。这里会直接显示 43 返回的真实图片。</span>
      <button class="secondary" type="button" data-restore-latest-xiaohei>查询当前主题已生成图片</button>
    </div>`;
  }
  return `<div class="xhs-generated-gallery">
    <div class="xhs-generated-head">
      <b>${isXiaohei ? "43 真实出图结果" : "拆页方案导出结果"}</b>
      <span>${isXiaohei ? "这些图片来自 43 出图服务，可点击打开原图检查。" : "这些只是页面方案 PNG，不是最终配图成品。"}</span>
    </div>
    <div class="xhs-generated-grid">
      ${files.map((file, index) => {
        const raw = String(file);
        const src = /^https?:\/\//.test(raw) ? raw : `./${raw.replace(/^\/+/, "")}`;
        return `<a href="${escapeHtml(src)}" target="_blank" rel="noreferrer">
          <img src="${escapeHtml(src)}" alt="${isXiaohei ? "配图" : "拆页图"} ${index + 1}" loading="lazy" />
          <span>P${index + 1}</span>
        </a>`;
      }).join("")}
    </div>
  </div>`;
}

function renderXhsCarouselCard(card, index) {
  const role = escapeHtml(card.role || "内容页");
  const job = escapeHtml(card.carouselJob || "");
  const title = escapeHtml(card.title || "");
  const text = escapeHtml(card.text || "");
  const takeaway = escapeHtml(card.readerTakeaway || "");
  const items = String(card.text || "").split(/\n+/).map((line) => line.trim()).filter(Boolean).slice(0, 6);
  const ops = `<div class="xhs-card-ops"><span>P${index + 1} / ${role}</span><em>${job}</em></div>`;
  if (index === 0) {
    return `<div class="xhs-card-wrap">${ops}<article class="xhs-preview-card xhs-recipe-cover ${escapeHtml(card.type)}">
        <h3>${title}</h3>
        <div class="xhs-cover-scene">
          <div class="xhs-archive-stack"><i></i><i></i><i></i></div>
          <div class="xhs-xiaohei"><b></b><span></span></div>
        </div>
        <p>${text}</p>
      </article></div>`;
  }
  if (index === 1) {
    return `<div class="xhs-card-wrap">${ops}<article class="xhs-preview-card xhs-recipe-contrast ${escapeHtml(card.type)}">
        <h3>${title}</h3>
        <div class="xhs-contrast-board">
          <section><b>只靠工具</b><span>prompt</span><span>模板</span><span>换标题</span></section>
          <section><b>真正系统</b><span>素材</span><span>拆解</span><span>复用</span></section>
        </div>
        <p>${text}</p>
      </article></div>`;
  }
  if (index === 2) {
    return `<div class="xhs-card-wrap">${ops}<article class="xhs-preview-card xhs-recipe-matrix ${escapeHtml(card.type)}">
        <h3>${title}</h3>
        <div class="xhs-asset-matrix">
          ${(items.length ? items : ["爆款素材库", "标题公式库", "用户问题库", "结构拆解库"]).slice(0, 4).map((item, itemIndex) => `<div><em>0${itemIndex + 1}</em><strong>${escapeHtml(item)}</strong><span>${["看什么值得写", "标题不再乱编", "知道用户在问什么", "复用爆款结构"][itemIndex] || "沉淀资产"}</span></div>`).join("")}
        </div>
      </article></div>`;
  }
  if (index === 3) {
    return `<div class="xhs-card-wrap">${ops}<article class="xhs-preview-card xhs-recipe-flow ${escapeHtml(card.type)}">
        <h3>${title}</h3>
        <div class="xhs-flow-line">
          ${(items.length ? items : ["采集合格素材", "拆标题和开头", "沉淀到资产库", "再生成成稿"]).slice(0, 4).map((item, itemIndex) => `<div><em>${itemIndex + 1}</em><strong>${escapeHtml(item)}</strong></div>`).join("")}
        </div>
        <p>${takeaway || text}</p>
      </article></div>`;
  }
  return `<div class="xhs-card-wrap">${ops}<article class="xhs-preview-card xhs-recipe-action ${escapeHtml(card.type)}">
      <h3>${title}</h3>
      <div class="xhs-action-ledger">
        <div><span>今天先做</span><strong>跑通一个主题闭环</strong></div>
        <div><span>不要再做</span><strong>只让 AI 临时发挥</strong></div>
        <div><span>下一步</span><strong>${text}</strong></div>
      </div>
    </article></div>`;
}

async function exportCleanXhsCardPlan() {
  if (!state.copyConfirmed) return;
  const cards = ensureXhsCardPlan();
  if (!cards.length) return;
  const visual = currentVisualStyle();
  state.xhsCardExportStatus = "loading";
  state.xhsCardOperation = "plan";
  state.xhsCardProgress = null;
  state.xhsCardExportMessage = "正在导出拆页方案 PNG。注意：这不是最终真实配图。";
  state.xhsCardManifest = null;
  renderToday();
  try {
    const res = await fetch(apiPath("/api/xhs-cards/export-plan"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: state.selectedTitle,
        body: confirmedCopyText(),
        topicId: selectedTopic()?.id || `day2-xhs-${Date.now()}`,
        cards,
        layoutPlan: cards.map((card, index) => ({
          page: index + 1,
          role: card.role,
          carouselJob: card.carouselJob,
          visualBrief: card.visualBrief,
          readerTakeaway: card.readerTakeaway,
          imagePrompt: card.imagePrompt
        })),
        visualRoute: {
          theme: "AI 自媒体 / 内容资产库",
          style: visual.assetLabel,
          visualStyleId: visual.id,
          note: "Web preview is the stable fallback. Real image/video generation routes to 43-generation when selected."
        }
      })
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok || !result.ok) throw new Error(result.message || result.error || `HTTP ${res.status}`);
    state.xhsCardExportStatus = "done";
    state.xhsCardOperation = "plan";
    state.xhsCardExportMessage = "拆页方案 PNG 已导出，可用于检查每页承载，不作为最终配图。";
    applyRemoteVisualManifest(result.manifest || null);
  } catch (error) {
    state.xhsCardExportStatus = "error";
    state.xhsCardOperation = "plan";
    state.xhsCardExportMessage = `导出失败：${error.message}。网页卡片预览仍可用于演示，但不能冒充已经出图。`;
    state.xhsCardManifest = null;
  }
  renderToday();
}

async function generateXiaoheiCards() {
  if (!state.copyConfirmed) {
    state.xhsCardExportStatus = "error";
    state.xhsCardOperation = "visual";
    state.xhsCardExportMessage = "请先在第 9 步确认文案。确认后，作图按钮才会真正调用 43 出图服务。";
    renderToday();
    return;
  }
  const cards = ensureXhsCardPlan();
  if (!cards.length) {
    state.xhsCardExportStatus = "error";
    state.xhsCardOperation = "visual";
    state.xhsCardExportMessage = "当前文案还没有拆成可出图的 brief，无法启动 43 出图。请先确认文案或重新生成文案。";
    renderToday();
    return;
  }
  const visual = currentVisualStyle();
  const visualContract = visualStyleContract(visual.id);
  if (state.xhsCardManifest && !manifestMatchesCurrentVisual()) state.xhsCardManifest = null;
  state.xhsCardJobBase = buildCurrentXiaoheiJobId();
  state.xhsCardExportStatus = "loading";
  state.xhsCardOperation = "visual";
  state.xhsCardProgress = { done: 0, total: cards.length };
  state.xhsCardAsyncJobId = state.xhsCardJobBase;
  state.xhsCardExportMessage = `43 正在启动${visualRouteNameClean(visual.id)}出图任务，页面会自动轮询结果。`;
  state.xhsCardManifest = {
    renderer: `43-gpt-image-2-${visual.id}-async`,
    count: 0,
    files: [],
    publicFiles: [],
    jobIds: [],
    style: visual.id,
    visualStyleId: visual.id,
  };
  renderToday();
  try {
    const startPayload = {
        title: state.selectedTitle || selectedTopic()?.theme || selectedTopic()?.title || "",
        body: confirmedCopyText(),
        topicId: selectedTopic()?.id || `xhs-xiaohei-${Date.now()}`,
        jobId: state.xhsCardAsyncJobId,
        style: visual.id,
        visualStyle: visual.id,
        visualStyleTitle: visual.title,
        visualRoute: visualContract.route,
        visualCharacter: visualContract.character,
        styleBrief: visualContract.styleBrief,
        styleLock: visualContract.styleLock,
        negativePrompt: visualContract.negativePrompt,
        platform: visualPlatformForCurrentTarget(),
        targetPlatform: visualPlatformForCurrentTarget(),
        cards: cards.map((card, index) => ({
          page: index + 1,
          role: card.role,
          title: card.title,
          text: card.text,
          visualBrief: styleLockedVisualBrief(card, visual),
          readerTakeaway: card.readerTakeaway,
          carouselJob: card.carouselJob,
          imagePrompt: card.imagePrompt,
          visualStyle: card.visualStyle,
        })),
      };
    state.xhsCardStartPayload = startPayload;
    const res = await fetch(apiPath("/api/xhs-cards/generate-xiaohei/start"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(startPayload),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok || !result.ok) throw new Error(result.message || result.error || `HTTP ${res.status}`);
    state.xhsCardAsyncJobId = result.jobId || state.xhsCardAsyncJobId;
    if (result.manifest) applyRemoteVisualManifest(result.manifest);
    await pollXiaoheiCards({ jobId: state.xhsCardAsyncJobId, total: cards.length });
  } catch (error) {
    state.xhsCardExportStatus = "error";
    state.xhsCardOperation = "visual";
    state.xhsCardProgress = null;
    const count = state.xhsCardManifest?.count || 0;
    state.xhsCardExportMessage = `43 ${visualRouteNameClean(visual.id)}出图中断：${error.message}。已生成 ${count} 张会保留显示，未生成的不冒充成品。`;
    if (!count) state.xhsCardManifest = null;
  }
  renderToday();
}

async function pollXiaoheiCards({ jobId, total, repairAttempts = 0 }) {
  lastPollRenderSignature = "";
  for (let round = 0; round < 180; round += 1) {
    const res = await fetch(apiPath(`/api/xhs-cards/generate-xiaohei/status?jobId=${encodeURIComponent(jobId)}&total=${encodeURIComponent(total)}`));
    const result = await res.json().catch(() => ({}));
    if (!res.ok || !result.ok) throw new Error(result.message || result.error || `HTTP ${res.status}`);
    if (result.manifest) applyRemoteVisualManifest(result.manifest);
    const count = state.xhsCardManifest?.count || 0;
    if (count >= total) {
      state.xhsCardExportStatus = "done";
      state.xhsCardProgress = null;
      state.xhsCardExportMessage = `43 已生成 ${count} 张${visualRouteNameClean(state.visualStyle)}，下面可以逐张打开检查。`;
      renderToday();
      return;
    }
    state.xhsCardProgress = { done: count, total };
    state.xhsCardExportMessage = `43 后台出图中：已完成 ${count}/${total} 张。你可以停留等待，也可以稍后继续查询。`;
    const failedPages = Array.isArray(result.failed) ? result.failed.map((item) => Number(item.page || 0)).filter(Boolean) : [];
    if (["partial", "error"].includes(result.status) && count > 0 && count + failedPages.length >= total) {
      if (repairAttempts < 2 && state.xhsCardStartPayload) {
        state.xhsCardExportStatus = "loading";
        state.xhsCardProgress = { done: count, total };
        state.xhsCardExportMessage = `43 当前只完成 ${count}/${total} 张，系统正在自动补齐缺页${failedPages.length ? ` P${failedPages.join("/P")}` : ""}，补齐前不会保存为完成作品。`;
        renderToday();
        const repairRes = await fetch(apiPath("/api/xhs-cards/generate-xiaohei/start"), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...state.xhsCardStartPayload, jobId }),
        });
        const repairResult = await repairRes.json().catch(() => ({}));
        if (!repairRes.ok || !repairResult.ok) throw new Error(repairResult.message || repairResult.error || `HTTP ${repairRes.status}`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return pollXiaoheiCards({ jobId, total, repairAttempts: repairAttempts + 1 });
      }
      state.xhsCardExportStatus = "error";
      state.xhsCardProgress = null;
      state.xhsCardExportMessage = `43 当前已生成 ${count}/${total} 张${failedPages.length ? `，缺 P${failedPages.join("/P")}` : ""}。请再次点击出图按钮补齐缺页，补齐前不能保存为已完成作品。`;
      renderToday();
      return;
    }
    const signature = `${state.xhsCardExportStatus}|${count}|${total}|${result.status || ""}|${state.xhsCardExportMessage}`;
    if (signature !== lastPollRenderSignature) {
      lastPollRenderSignature = signature;
      renderToday();
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  state.xhsCardExportStatus = "error";
  state.xhsCardProgress = null;
  const count = state.xhsCardManifest?.count || 0;
  state.xhsCardExportMessage = `轮询等待超时，当前已看到 ${count}/${total} 张。后台任务 ${jobId} 可能仍在继续，请先点“查询当前主题已生成图片”，仍不满 ${total} 张再点击出图按钮补齐。`;
}

async function restoreLatestXiaoheiCards() {
  const jobId = state.xhsCardAsyncJobId || state.xhsCardJobBase || buildCurrentXiaoheiJobId();
  state.xhsCardExportStatus = "loading";
  state.xhsCardOperation = "xiaohei";
  state.xhsCardAsyncJobId = jobId;
  state.xhsCardJobBase = jobId;
  state.xhsCardExportMessage = `正在从 43 恢复当前主题的图片：${jobId}`;
  renderToday();
  try {
    const res = await fetch(apiPath(`/api/xhs-cards/generate-xiaohei/status?jobId=${encodeURIComponent(jobId)}&total=5`));
    const result = await res.json().catch(() => ({}));
    if (!res.ok || !result.ok) throw new Error(result.message || result.error || `HTTP ${res.status}`);
    applyRemoteVisualManifest(result.manifest || null);
    state.xhsCardAsyncJobId = result.jobId || jobId;
    state.xhsCardJobBase = result.jobId || jobId;
    const count = state.xhsCardManifest?.count || 0;
    state.xhsCardExportStatus = count >= 5 ? "done" : (count > 0 ? "error" : "idle");
    state.xhsCardOperation = "xiaohei";
    state.xhsCardProgress = null;
    state.xhsCardExportMessage = count
      ? `已恢复当前主题 ${count}/5 张配图。`
      : "当前主题还没有生成过配图，请点击生成配图。";
  } catch (error) {
    state.xhsCardExportStatus = "error";
    state.xhsCardProgress = null;
    state.xhsCardManifest = null;
    state.xhsCardExportMessage = `恢复当前主题失败：${error.message}`;
  }
  renderToday();
}

function buildCurrentXiaoheiJobId() {
  const seed = [
    VISUAL_PROMPT_VERSION,
    selectedTopic()?.id || "topic",
    state.confirmedCopyVersionId || state.currentCopyVersionId || "copy",
    state.visualStyle || "visual",
    state.selectedTitle || "title",
    simpleHash(confirmedCopyText() || ""),
  ].join("-");
  return `longka-xhs-${simpleHash(seed)}`;
}

function setRoute(route) {
  state.route = route;
  $$(".route-panel").forEach((panel) => {
    panel.hidden = panel.dataset.panel !== route;
  });
  $$(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.route === route);
  });
  if (route === "today") renderToday();
  if (route !== "today") renderAssetPage(route);
}

window.addEventListener("message", (event) => {
  if (event.origin !== window.location.origin) return;
  if (event.data?.type !== "longka-use-confirmed-x-assets") return;
  state.sourceChannel = "x-live";
  state.lastXRunIds = Array.isArray(event.data.runIds) ? event.data.runIds : [];
  state.useLatestXRunOnly = state.lastXRunIds.length > 0;
  state.logs = [
    "已回到今日工作台。",
    "下一步：读取已保存的 X 素材，生成今天可写的选题。",
  ];
  state.assetStatus = "准备读取历史 X 素材";
  setRoute("today");
  setStep(4);
});

function setStep(step) {
  state.step = Math.max(1, Math.min(12, step));
  renderToday();
}

function clearAfter(step) {
  if (step <= 4) {
    state.topics = [];
    state.selectedTopicId = "";
  }
  if (step <= 5) {
    state.titleChoices = [];
    state.titleChoiceKey = "";
    state.selectedTitle = "";
  }
  if (step <= 6) {
    state.draft = "";
    state.improvedDraft = "";
    state.copyConfirmed = false;
    state.draftRevision = 1;
    state.draftStatus = "idle";
    state.draftError = "";
    state.draftMeta = null;
    state.draftReview = null;
    state.copyVersions = [];
    state.currentCopyVersionId = "";
    state.confirmedCopyVersionId = "";
    state.pendingRevision = null;
  }
  if (step <= 9) {
    clearProductionState();
  }
}

function clearProductionState() {
  state.visualStyle = state.visualStyle || "xiaohei-metaphor";
  state.visualStyleTouched = false;
  state.xhsCardPlan = [];
  state.xhsCardExportStatus = "idle";
  state.xhsCardExportMessage = "";
  state.xhsCardOperation = "";
  state.xhsCardAsyncJobId = "";
  state.xhsCardJobBase = "";
  state.xhsCardProgress = null;
  state.xhsCardManifest = null;
}

function changeVisualStyle(styleId) {
  if (!visualStyles.some((item) => item.id === styleId)) return;
  if (state.visualStyle === styleId) return;
  state.visualStyleTouched = true;
  state.visualStyle = styleId;
  state.xhsCardPlan = [];
  state.xhsCardExportStatus = "idle";
  state.xhsCardExportMessage = "已切换视觉风格。旧图不会复用，请重新生成当前风格的图文结果。";
  state.xhsCardOperation = "";
  state.xhsCardAsyncJobId = "";
  state.xhsCardJobBase = "";
  state.xhsCardProgress = null;
  state.xhsCardManifest = null;
  ensureXhsCardPlan();
  renderToday();
}

function renderToday() {
  renderHeroStatus();
  renderStepRail();
  renderContext();
  renderWorkArea();
  scheduleWorkbenchSnapshotSave();
}

function renderHeroStatus() {
  const topic = selectedTopic();
  const copyStatus = state.copyConfirmed ? "已确认，可制作" : state.draft ? "待确认" : "未生成";
  $("#heroStatus").innerHTML = `
    <div class="status-row"><b>发布目标</b><span>${escapeHtml(currentTarget().title)}</span></div>
    <div class="status-row"><b>素材来源</b><span>${escapeHtml(currentSource().title)}</span></div>
    <div class="status-row"><b>候选选题</b><span>${state.topics.length} 个</span></div>
    <div class="status-row"><b>文案状态</b><span>${copyStatus}</span></div>
    <div class="status-row"><b>已选选题</b><span>${escapeHtml(topic?.theme || topic?.title || "未选择")}</span></div>
  `;
}

function renderStepRail() {
  $("#stepRail").innerHTML = steps.map((item, index) => {
    const no = index + 1;
    const canOpen = no <= state.step || canJumpTo(no);
    return `<button class="step-pill ${no === state.step ? "active" : ""} ${no < state.step ? "done" : ""}" data-step="${no}" ${canOpen ? "" : "disabled"}>
      <em>${String(no).padStart(2, "0")}</em>
      <b>${escapeHtml(item[0])}</b>
      <small>${escapeHtml(item[1])}</small>
    </button>`;
  }).join("");
}

function canJumpTo(step) {
  if (step <= 4) return true;
  if (step === 5) return state.topics.length > 0;
  if (step === 6) return Boolean(state.selectedTopicId);
  if (step === 7) return Boolean(state.selectedTitle);
  if (step <= 9) return Boolean(state.draft);
  return state.copyConfirmed;
}

function renderContext() {
  const topic = selectedTopic();
  $("#contextCard").innerHTML = `
    <div><b>发布目标</b><span>${escapeHtml(currentTarget().title)}</span></div>
    <div><b>行业</b><span>${escapeHtml(state.industry)}</span></div>
    <div><b>业务线</b><span>${escapeHtml(state.businessLine)}</span></div>
    <div><b>目标</b><span>${escapeHtml(state.goal)}</span></div>
    <div><b>关键词</b><span>${escapeHtml(state.keywords)}</span></div>
    <div><b>已选选题</b><span>${escapeHtml(topic?.theme || "未选择")}</span></div>
  `;
}

function renderWorkArea() {
  const renderers = {
    1: renderTargetStep,
    2: renderBusinessStep,
    3: renderSourceStep,
    4: renderCollectStep,
    5: renderTopicStep,
    6: renderTitleStep,
    7: renderDraftStep,
    8: renderCheckStep,
    9: renderConfirmStep,
    10: renderProductionStep,
    11: renderExportStep,
    12: renderArchiveStep,
  };
  $("#workArea").innerHTML = renderers[state.step]();
  bindWorkAreaActions();
}

function cardHead(title, desc) {
  return `<div class="card-head"><div><span class="eyebrow">STEP ${state.step}</span><h2>${escapeHtml(title)}</h2><p>${escapeHtml(desc)}</p></div></div>`;
}

function renderTargetStep() {
  return `<section class="work-card">
    ${cardHead("今天要发到哪里？", "先选发布目标。素材可以一鱼多吃，但成品必须按目标平台重写。")}
    <div class="choice-grid">
      ${publishTargets.map((item) => `<button class="choice-card ${state.publishTarget === item.id ? "active" : ""}" data-publish-target="${item.id}">
        <b>${escapeHtml(item.title)}</b><span>${escapeHtml(item.desc)}</span>
      </button>`).join("")}
    </div>
    <div class="actions"><button class="primary" data-next>下一步：填写业务信息</button></div>
  </section>`;
}

function renderBusinessStep() {
  return `<section class="work-card">
    ${cardHead("你的行业、业务线和目标是什么？", "系统会用这些信息筛选素材、推荐选题，并决定写作角度。")}
    <div class="form-grid">
      <label>行业<input id="industryInput" value="${escapeHtml(state.industry)}" /></label>
      <label>业务线 / 主题<input id="businessLineInput" value="${escapeHtml(state.businessLine)}" /></label>
      <label>内容目标<input id="goalInput" value="${escapeHtml(state.goal)}" /></label>
      <label>关键词，多个用逗号隔开<input id="keywordsInput" value="${escapeHtml(state.keywords)}" /></label>
      <label class="wide">补充说明<textarea id="noteInput" rows="4" placeholder="例如：我想把一个 AI 自媒体选题，同时改成小红书、公众号和短视频。"></textarea></label>
    </div>
    <div class="actions">
      <button class="ghost" data-step-target="1">返回发布目标</button>
      <button class="primary" data-save-business>保存并选择素材来源</button>
    </div>
  </section>`;
}

function renderSourceStep() {
  const defaultSource = state.sourceChannel === "same-platform" ? sourceTitleForTarget() : currentSource().title;
  return `<section class="work-card">
    ${cardHead("今天从哪里找素材？", "同平台素材用于学习平台表达；跨平台素材用于提炼观点和方法论，再按目标平台重写。")}
    <div class="source-note">
      <b>当前策略：${escapeHtml(defaultSource)}</b>
      <span>素材来源要标清楚，选题可以复用，最终成品必须按 ${escapeHtml(currentTarget().title)} 重写。</span>
    </div>
    <div class="choice-grid">
      ${sourceChannels.map((item) => `<button class="choice-card ${state.sourceChannel === item.id ? "active" : ""}" data-source-channel="${item.id}">
        <b>${escapeHtml(item.title)}</b><span>${escapeHtml(item.desc)}</span>
      </button>`).join("")}
    </div>
    <div class="actions">
      <button class="ghost" data-step-target="2">返回业务信息</button>
      <button class="primary" data-step-target="4">下一步：找素材</button>
      <button class="secondary" data-route-target="assets">查看内容资产库</button>
    </div>
  </section>`;
}

function renderCollectStep() {
  const progress = state.topics.length ? "100%" : state.logs.length ? "55%" : "0";
  const headTitle = state.sourceChannel === "x-live" ? "第 4 步：先把今天可写的素材找出来" : "第 4 步：读取真实素材并生成选题";
  const headDesc = state.sourceChannel === "x-live"
    ? "你只需要二选一：抓一批新帖子，或者直接用以前保存过的素材。系统会筛出候选选题，然后自动进入第 5 步。"
    : "如果当前来源没有匹配素材，系统会明确提示，不会跨业务线乱推荐。";
  const emptyLog = state.sourceChannel === "x-live"
    ? "你现在只要选一个动作：\n1. 采集新素材：抓取 X 推主最新帖子，系统筛选后进入第 5 步。\n2. 使用历史素材：不重新抓取，直接从保存过的素材里推荐选题。"
    : "点击按钮后，这里会显示读取、筛选和生成候选选题的进度。";
  return `<section class="work-card">
    ${cardHead(headTitle, headDesc)}
    ${state.sourceChannel === "x-live" ? renderXCollectControls() : ""}
    ${renderMaterialFilterControls()}
    <div class="console">
      <div class="console-head"><b>${escapeHtml(sourceTitleForTarget())} 工作窗口</b><span>${escapeHtml(state.assetStatus)}</span></div>
      <div class="progress"><i id="progressBar" style="width:${progress}"></i></div>
      <pre class="console-log" id="consoleLog">${escapeHtml(state.logs.join("\n") || emptyLog)}</pre>
    </div>
    <div class="actions">
      <button class="ghost" data-step-target="3">返回来源选择</button>
      ${state.sourceChannel === "x-live" ? "" : `<button class="primary" data-read-materials>读取素材并生成选题</button>`}
      <button class="secondary" data-demo-materials>用本地预览样本演示流程</button>
      <button class="secondary" data-route-target="assets">查看内容资产库</button>
    </div>
  </section>`;
}

function renderMaterialFilterControls() {
  if (state.sourceChannel === "x-live") return "";
  const isXhsLike = platformWanted() === "xiaohongshu" || state.sourceChannel === "xhs" || state.sourceChannel === "same-platform";
  if (!isXhsLike && state.sourceChannel !== "all-assets") return "";
  return `<div class="filter-panel">
    <div class="title-group-head"><b>${zh("&#32032;&#26448;&#31579;&#36873;")}</b><span>${zh("&#29992;&#26469;&#38450;&#27490;&#19981;&#21516;&#36187;&#36947;&#12289;&#19981;&#21516;&#25209;&#27425;&#12289;&#19981;&#21516;&#21338;&#20027;&#28151;&#22312;&#19968;&#36215;&#12290;")}</span></div>
    <div class="segmented-control">
      ${[
        ["all", zh("&#20840;&#36187;&#36947;")],
        ["latest", zh("&#26368;&#26032;&#25209;&#27425;")],
        ["author", zh("&#25351;&#23450;&#21338;&#20027;")]
      ].map(([id, label]) => `<button type="button" class="${state.materialScope === id ? "active" : ""}" data-material-scope="${id}">${label}</button>`).join("")}
    </div>
    <div class="form-grid compact">
      <label>${zh("&#25351;&#23450;&#21338;&#20027;")}<input id="materialAuthorInput" value="${escapeHtml(state.materialAuthor || "")}" placeholder="EDinsight&#33521;&#38160;&#25945;&#32946;" /></label>
      <label>${zh("&#26368;&#26032;&#25209;&#27425;&#25968;")}<input id="materialLatestRunsInput" type="number" min="1" max="10" value="${Number(state.materialLatestRuns || 3)}" /></label>
    </div>
    <p class="muted-text">${zh("&#40664;&#35748;&#20840;&#36187;&#36947;&#65307;&#24819;&#21482;&#30475;&#21018;&#23548;&#20837;&#30340;&#36164;&#26009;&#65292;&#36873;&#26368;&#26032;&#25209;&#27425;&#65307;&#24819;&#21482;&#30475;&#26576;&#20010;&#21338;&#20027;&#65292;&#36873;&#25351;&#23450;&#21338;&#20027;&#24182;&#22635;&#21517;&#23383;&#12290;")}</p>
  </div>`;
}

function renderXCollectControls() {
  return `<div class="x-source-actions">
    <article class="action-tile primary-tile">
      <div>
        <span class="eyebrow">实时采集</span>
        <h3>采集新素材</h3>
        <p>适合换了对标账号，想抓当下新帖。点击后系统会在当前工作台采集、筛选，并把结果变成第 5 步可选题。</p>
      </div>
      <label>账号，多个用换行或逗号隔开
        <textarea id="xAccountsInput" rows="4" placeholder="xionghuanwei&#10;snail_9106&#10;Xudong07452910">xionghuanwei
snail_9106
Xudong07452910</textarea>
      </label>
      <div class="form-grid compact">
        <label>每个账号采集条数<input id="xMaxTweetsInput" type="number" min="5" max="100" value="30" /></label>
        <label>采集页数<input id="xPagesInput" type="number" min="1" max="5" value="1" /></label>
      </div>
      <button class="primary" data-collect-x ${state.isCollectingX ? "disabled" : ""}>${state.isCollectingX ? "正在采集，请勿重复点击" : "采集新素材并进入选题"}</button>
      <span class="muted-text">不会跳转页面。成功后直接进入第 5 步。</span>
    </article>
    <article class="action-tile">
      <div>
        <span class="eyebrow">复用资产</span>
        <h3>使用历史素材</h3>
        <p>适合不想重新采集，直接用以前保存过的 X 素材，找今天能写的选题。</p>
      </div>
      <button class="primary" data-read-materials>使用历史素材生成选题</button>
      <span class="muted-text">不会重新采集。成功后直接进入第 5 步。</span>
    </article>
  </div>`;
}

function renderTopicStep() {
  return `<section class="work-card">
    ${cardHead("第 5 步：选择一个今天要写的选题", "这里展示系统从真实素材里筛出来的可写方向。选一个后，下一步生成平台标题。")}
    ${state.topics.length ? `<div class="topic-grid">${state.topics.map(renderTopicCard).join("")}</div>` : `<div class="empty-state"><b>当前来源没有匹配选题</b><span>请换关键词、切换素材来源，或先采集/导入对应平台素材。</span></div>`}
    <div class="actions">
      <button class="ghost" data-step-target="4">返回重新找素材</button>
      <button class="primary" data-step-target="6" ${state.selectedTopicId ? "" : "disabled"}>下一步：生成标题</button>
    </div>
  </section>`;
}

function renderTopicCard(topic) {
  return `<article class="topic-card ${state.selectedTopicId === topic.id ? "active" : ""}">
    <div class="meta"><span>来源：${escapeHtml(topic.platform)}</span><span>${escapeHtml(topic.collectionStatus)}</span><span>目标：${escapeHtml(currentTarget().title)}</span></div>
    <b>${escapeHtml(topic.theme)}</b>
    <p>${escapeHtml(topic.reason)}</p>
    <p><strong>源头标题：</strong>${escapeHtml(topic.title)}</p>
    <p><strong>用户痛点：</strong>${escapeHtml(topic.pain)}</p>
    <p><strong>适合怎么写：</strong>${escapeHtml(topic.reuse)}</p>
    <p><strong>风险：</strong>${escapeHtml(topic.risk)}</p>
    <div class="metric-row">${Object.entries(topic.metrics || {}).map(([key, value]) => `<span>${escapeHtml(key)} ${escapeHtml(value)}</span>`).join("")}</div>
    ${topic.url ? `<a class="source-link" href="${escapeHtml(topic.url)}" target="_blank" rel="noreferrer">打开原始素材</a>` : `<span class="muted-text">暂无原链接</span>`}
    <button class="primary" data-topic-id="${escapeHtml(topic.id)}">用这个选题继续</button>
  </article>`;
}

function renderTitleStep() {
  ensureFreshTitleChoices();
  if (state.selectedTopicId) requestAnimationFrame(() => ensureTitleAssetsForCurrentTopic());
  const assetHint = state.titleAssetLoading
    ? "正在读取标题资产库：优先匹配当前方向的真实高分标题。"
    : state.titleAssetMessage || (state.titleAssets.length ? `已读取 ${state.titleAssets.length} 条标题资产，候选标题会优先参考同类公式。` : "当前先用本地公式兜住流程，标题资产读取完成后会自动刷新。");
  return `<section class="work-card">
    ${cardHead(`生成 ${currentTarget().title} 标题`, "同一个选题，按不同平台调性生成不同标题。选择标题后，正文会跟着重写。")}
    ${String(state.selectedTopicId || "").startsWith("reuse-") ? `<div class="status-strip success">一鱼多吃任务：当前母题来自已完成作品。现在要按 ${escapeHtml(currentTarget().title)} 重新选标题和结构，不沿用原平台正文。</div>` : ""}
    <div class="status-strip">${escapeHtml(assetHint)}</div>
    <div class="title-grid">
      ${state.titleChoices.map((item) => `<button class="title-card ${state.selectedTitle === item.title ? "active" : ""}" data-title-choice="${escapeHtml(item.title)}">
        <b>${escapeHtml(item.title)}</b><span>${escapeHtml(item.reason)}</span>
      </button>`).join("") || `<div class="empty-state"><b>请先选择选题</b><span>选题确定后才生成平台标题。</span></div>`}
    </div>
    <div class="actions">
      <button class="ghost" data-step-target="5">返回换选题</button>
      <button class="primary" data-step-target="7" ${state.selectedTitle ? "" : "disabled"}>下一步：生成平台成品</button>
    </div>
  </section>`;
}

function renderDraftStep() {
  if (!state.draft && state.selectedTitle && state.draftStatus === "idle") {
    requestAnimationFrame(() => generateSopDraft());
  }
  const isLoading = state.draftStatus === "loading";
  const draftText = isLoading
    ? "Longka 内容生产引擎正在按 SOP 写正文...\n\n1. 绑定源头素材和当前标题\n2. 判断用户真实问题\n3. 匹配写作框架\n4. 生成初稿并做人味检查\n5. 输出可进入体检的版本"
    : state.draft || state.draftError || "请先选择标题。";
  return `<section class="work-card">
    ${cardHead("生成平台成品", "正文必须绑定选题、源头素材、目标平台、业务目标和当前标题。这里不再使用本地固定模板。")}
    ${state.draftMeta ? `<div class="status-strip">Longka SOP：${escapeHtml(state.draftMeta.model || "AI")} · ${escapeHtml(state.draftMeta.framework || "内容框架")} · ${escapeHtml(state.draftMeta.route || "平台改写")}</div>` : ""}
    ${state.draftError ? `<div class="status-strip warn">${escapeHtml(state.draftError)}</div>` : ""}
    <div class="draft-box">
      <div class="draft-text"><pre>${escapeHtml(draftText)}</pre></div>
      <div class="check-panel">
        <h3>绑定证据</h3>
        ${renderBindingEvidence()}
      </div>
    </div>
    ${renderWechatArticleImageLayout(draftText)}
    ${renderCopyVersionList()}
    <div class="actions">
      <button class="ghost" data-step-target="6">返回换标题</button>
      <button class="secondary" data-regenerate-draft ${state.selectedTitle && !isLoading ? "" : "disabled"}>按当前标题重写一次</button>
      <span class="muted-text">当前正文：第 ${state.draftRevision} 版</span>
      <button class="primary" data-step-target="8" ${state.draft && !isLoading ? "" : "disabled"}>下一步：文案体检和优化</button>
    </div>
  </section>`;
}

function getReusableImagesForCurrentTopic() {
  const topic = selectedTopic() || {};
  const rawImages = Array.isArray(topic.raw?.images) ? topic.raw.images : [];
  const manifestImages = Array.isArray(currentVisualManifest()?.publicFiles) ? currentVisualManifest().publicFiles : [];
  return rawImages.length ? rawImages : manifestImages;
}

function renderWechatArticleImageLayout(copy = "") {
  if (state.publishTarget !== "wechat-article" || !copy || state.draftStatus === "loading") return "";
  const images = getReusableImagesForCurrentTopic().slice(0, 5);
  if (!images.length) {
    return `<div class="article-layout-preview">
      <div class="title-group-head"><b>公众号图文排版稿</b><span>当前母题没有可复用图片，生成长文后只展示文字版。</span></div>
    </div>`;
  }
  const body = stripDraftTitleLabels(copy);
  const blocks = splitArticleBlocks(body);
  const slots = buildWechatImageSlots(blocks, images);
  return `<div class="article-layout-preview">
    <div class="title-group-head">
      <b>公众号图文排版稿</b>
      <span>已按语义把图片插入正文：痛点、框架、流程、行动段落。点击图片可打开原图。</span>
    </div>
    <article class="wechat-article-preview">
      ${blocks.map((block, index) => `${renderArticleBlock(block)}${slots[index] ? renderArticleImageSlot(slots[index]) : ""}`).join("")}
    </article>
  </div>`;
}

function stripDraftTitleLabels(copy = "") {
  return String(copy || "")
    .replace(/^标题[:：]\s*.*\n+/m, "")
    .replace(/^正文[:：]\s*\n?/m, "")
    .replace(/\n+配图建议[:：][\s\S]*$/m, "")
    .replace(/\n+标签[:：][\s\S]*$/m, "")
    .trim();
}

function splitArticleBlocks(copy = "") {
  const lines = String(copy || "").split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const blocks = [];
  let current = [];
  for (const line of lines) {
    if (/^#{1,3}\s+|^第?[一二三四五六七八九十\d]+[、.：:-]|^##\s*/.test(line) && current.length) {
      blocks.push(current.join("\n"));
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length) blocks.push(current.join("\n"));
  return blocks.slice(0, 12);
}

function buildWechatImageSlots(blocks = [], images = []) {
  const slots = {};
  const rules = [
    { page: 1, after: 0, label: "首屏/封面图", reason: "放在开头后，承担停留和主题识别。" },
    { page: 2, keywords: /问题|痛点|为什么|卡住|焦虑|失败|没流量/, label: "痛点解释图", reason: "插在痛点段后，帮助读者理解问题。" },
    { page: 3, keywords: /框架|系统|资产|结构|方法论|信号/, label: "框架图", reason: "插在方法框架段后，增强收藏价值。" },
    { page: 4, keywords: /步骤|流程|怎么做|路径|执行|每天/, label: "流程图", reason: "插在执行步骤段后，降低理解成本。" },
    { page: 5, after: Math.max(0, blocks.length - 2), label: "行动收束图", reason: "插在结尾行动前，强化下一步。" },
  ];
  for (const rule of rules) {
    const image = images[rule.page - 1];
    if (!image) continue;
    let index = Number.isInteger(rule.after) ? rule.after : blocks.findIndex((block) => rule.keywords?.test(block));
    if (index < 0) index = Math.min(rule.page - 1, Math.max(0, blocks.length - 1));
    while (slots[index]) index = Math.min(blocks.length - 1, index + 1);
    slots[index] = { ...rule, image };
  }
  return slots;
}

function renderArticleBlock(block = "") {
  const safe = escapeHtml(block);
  if (/^#\s+/.test(block)) return `<h1>${safe.replace(/^#\s+/, "")}</h1>`;
  if (/^##\s+/.test(block)) return `<h2>${safe.replace(/^##\s+/, "")}</h2>`;
  if (/^第?[一二三四五六七八九十\d]+[、.：:-]/.test(block)) return `<h2>${safe}</h2>`;
  return `<p>${safe.replace(/\n/g, "<br>")}</p>`;
}

function renderArticleImageSlot(slot) {
  return `<figure class="wechat-image-slot">
    <a href="${escapeHtml(slot.image)}" target="_blank" rel="noreferrer"><img src="${escapeHtml(slot.image)}" alt="${escapeHtml(slot.label)}" loading="lazy" /></a>
    <figcaption>P${slot.page} · ${escapeHtml(slot.label)}：${escapeHtml(slot.reason)}</figcaption>
  </figure>`;
}
function renderCheckStep() {
  const checks = scoreDraft();
  const coach = buildContentCoachReport();
  return `<section class="work-card">
    ${cardHead("Longka 内容教练", "把写作能力变成网页指标：先判断哪里弱，再决定怎么改。")}
    ${state.draftError ? `<div class="status-strip warn">${escapeHtml(state.draftError)}</div>` : ""}
    ${renderContentCoachPanel(coach)}
    <div class="draft-box">
      <div class="draft-text"><h3>${zh("&#24403;&#21069;&#25991;&#26696;")}</h3><pre>${escapeHtml(state.improvedDraft || state.draft || zh("&#26242;&#26080;&#25991;&#26696;"))}</pre></div>
      <div class="check-panel">
        <h3>${zh("&#22522;&#30784;&#38376;&#26816;")}</h3>
        ${checks.map((item) => `<div class="check-row ${item.warn ? "warn" : ""}"><b>${item.score}</b><p><strong>${escapeHtml(item.name)}</strong><br>${escapeHtml(item.reason)}</p></div>`).join("")}
      </div>
    </div>
    ${renderCopyVersionList()}
    <div class="actions">
      <button class="ghost" data-step-target="7">${zh("&#36820;&#22238;&#27491;&#25991;")}</button>
      <button class="secondary" data-improve-again>${zh("&#25353;&#25945;&#32451;&#24314;&#35758;&#20248;&#21270;&#19968;&#29256;")}</button>
      <button class="primary" data-step-target="9">${zh("&#19979;&#19968;&#27493;&#65306;&#30830;&#35748;&#25991;&#26696;")}</button>
    </div>
  </section>`;
}

function renderConfirmStep() {
  return `<section class="work-card">
    ${cardHead("确认文案", "只有在网页端点击确认后，才允许生成卡片图、视频脚本、任务包或导出。")}
    <div class="draft-text"><pre>${escapeHtml(state.improvedDraft || state.draft || "暂无可确认文案")}</pre></div>
    <div class="actions">
      <button class="ghost" data-step-target="8">返回继续优化</button>
      <button class="primary" data-confirm-copy ${state.draft ? "" : "disabled"}>${state.copyConfirmed ? "文案已确认" : "确认这版文案"}</button>
      <button class="secondary" data-step-target="10" ${state.copyConfirmed ? "" : "disabled"}>进入制作分流</button>
    </div>
  </section>`;
}

function renderProductionStepLegacyVisualRoutes() {
  const locked = !state.copyConfirmed;
  if (state.publishTarget !== "xhs") return renderNonXhsProductionStep(locked);
  ensureXhsCardPlan();
  const visual = currentVisualStyle();
  const primaryLabel = visual.id === "xiaohei-metaphor" ? "生成小黑漫画图" : "生成当前风格配图";
  const loadingLabel = "43 正在生成...";
  return `<section class="work-card">
    ${cardHead("小红书图文成稿", "确认文案后，按配图导演建议生成小红书轮播配图，并在本页直接回显结果。")}
    ${renderCleanXhsCardPreview()}
    <div class="production-grid">
      <article class="production-card ${locked ? "locked" : ""}">
        <b>${escapeHtml(visual.title)}</b>
        <span>按当前确认文案和视觉风格生成配图，并在本页回显真实图片或导出结果。</span>
        <button class="primary" ${locked || state.xhsCardExportStatus === "loading" ? "disabled" : ""} data-generate-xiaohei-cards>${state.xhsCardExportStatus === "loading" && state.xhsCardOperation === "xiaohei" ? loadingLabel : primaryLabel}</button>
        <button class="secondary" ${locked || state.xhsCardExportStatus === "loading" ? "disabled" : ""} data-export-xhs-cards>${state.xhsCardExportStatus === "loading" && state.xhsCardOperation === "plan" ? "正在导出方案..." : "仅导出拆页方案"}</button>
      </article>
      <article class="production-card ${locked ? "locked" : ""}">
        <b>一鱼多吃复用</b>
        <span>同一母题后续可继续改成公众号、朋友圈、视频号或短视频脚本。</span>
        <button class="primary" ${locked ? "disabled" : ""} data-production="reuse">保存为可复用选题</button>
      </article>
    </div>
    <div class="actions">
      <button class="ghost" data-step-target="9">返回确认文案</button>
      <button class="primary" data-step-target="11" ${state.copyConfirmed ? "" : "disabled"}>下一步：导出交付</button>
    </div>
  </section>`;
}

function renderNonXhsProductionStep(locked) {
  const copy = confirmedCopyText();
  const images = getReusableImagesForCurrentTopic();
  const isWechat = state.publishTarget === "wechat-article";
  const isVideo = state.publishTarget === "douyin" || state.publishTarget === "video-account";
  return `<section class="work-card">
    ${cardHead(`${currentTarget().title} 成稿`, "当前是跨平台复用任务：保留母题，按目标平台重新组织正文、脚本和配图策略。")}
    <div class="production-grid">
      <article class="production-card ${locked ? "locked" : ""}">
        <b>${isWechat ? "公众号图文排版" : isVideo ? "视频脚本 / 分镜" : "平台文案"}</b>
        <span>${isWechat ? "长文会自动匹配可复用图片的插入位置。" : isVideo ? "脚本要重新拆成钩子、口播、镜头和字幕。" : "按当前平台重新表达，不沿用原平台结构。"}</span>
      </article>
      <article class="production-card ${locked ? "locked" : ""}">
        <b>可复用图片</b>
        <span>${images.length ? `${images.length} 张，可按语义复用或后续重做。` : "当前母题没有可复用图片，可先输出文字或后续补图。"}</span>
      </article>
    </div>
    ${isWechat ? renderWechatArticleImageLayout(copy) : ""}
    ${isVideo ? renderVideoProductionPreview(copy) : ""}
    <div class="actions">
      <button class="ghost" data-step-target="9">返回确认文案</button>
      <button class="primary" data-step-target="11" ${state.copyConfirmed ? "" : "disabled"}>下一步：导出交付</button>
    </div>
  </section>`;
}

function renderVideoProductionPreview(copy = "") {
  const lines = String(copy || "").split(/\n+/).map((line) => line.trim()).filter(Boolean).slice(0, 10);
  return `<div class="article-layout-preview">
    <div class="title-group-head"><b>视频脚本预览</b><span>这里检查钩子、口播、分镜和字幕节奏，后续可接视频生产模块。</span></div>
    <div class="asset-grid">
      ${lines.map((line, index) => `<article class="asset-item"><b>${index === 0 ? "标题 / 钩子" : `段落 ${index}`}</b><span>${escapeHtml(line)}</span></article>`).join("")}
    </div>
  </div>`;
}

function renderExportStep() {
  const files = Array.isArray(currentVisualManifest()?.publicFiles) ? currentVisualManifest().publicFiles : [];
  const ready = state.copyConfirmed && Boolean(confirmedCopyText());
  const copy = confirmedCopyText();
  return `<section class="work-card">
    ${cardHead("导出交付", "这里给运营人员可复制、可交接、可复盘的结果。")}
    ${!ready ? `<div class="status-strip warn">还没有确认成稿。请先返回确认文案。</div>` : `<div class="status-strip success">已生成 ${escapeHtml(currentTarget().title)} 成稿${files.length ? `，并带 ${files.length} 张可复用图片。` : "。"}</div>`}
    <div class="production-grid">
      <article class="production-card"><b>标题</b><span>${escapeHtml(state.selectedTitle || selectedTopic()?.theme || "未选择标题")}</span></article>
      <article class="production-card"><b>交付清单</b><span>${buildDeliveryPlan().join(" / ")}${files.length ? ` / ${files.length} 张图片` : ""}</span></article>
    </div>
    <div class="draft-box">
      <div class="draft-text"><h3>发布正文</h3><pre>${escapeHtml(copy || "暂无确认文案")}</pre></div>
      <div class="check-panel">
        <h3>图片文件</h3>
        ${files.length ? files.map((url, index) => `<p><strong>P${index + 1}</strong><br><a class="source-link" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">打开第 ${index + 1} 张图</a></p>`).join("") : `<p>当前平台以文字或脚本交付为主，图片可后续补充或从母题复用。</p>`}
      </div>
    </div>
    <div class="actions">
      <button class="ghost" data-step-target="10">返回制作分流</button>
      <button class="primary" data-step-target="12" ${ready ? "" : "disabled"}>下一步：沉淀资产</button>
    </div>
  </section>`;
}

function renderArchiveStep() {
  const files = Array.isArray(currentVisualManifest()?.publicFiles) ? currentVisualManifest().publicFiles : [];
  const reusableImages = getReusableImagesForCurrentTopic();
  const archived = state.finalWorks.some((item) => item.id === currentFinalWorkId());
  const ready = state.copyConfirmed && Boolean(confirmedCopyText());
  const expectedImages = expectedImageCountForCurrentWork();
  const imageComplete = state.publishTarget !== "xhs" || files.length >= expectedImages;
  const canSave = ready && imageComplete;
  return `<section class="work-card">
    ${cardHead("保存为母题资产", "不是只收藏成品，而是把这次内容沉淀成可复盘、可拆解、可切换平台再生产的母题资产。")}
    ${state.archiveMessage ? `<div class="status-strip success">${escapeHtml(state.archiveMessage)}</div>` : ""}
    ${state.publishTarget === "xhs" && !imageComplete ? `<div class="status-strip warn">小红书图文需要 ${expectedImages} 张图才算完整成稿。当前只有 ${files.length}/${expectedImages} 张，请回到第 10 步继续补齐，补齐前不会保存为已完成作品。</div>` : ""}
    <div class="production-grid">
      <article class="production-card"><b>1. 平台成稿</b><span>${escapeHtml(currentTarget().title)} · ${state.publishTarget === "xhs" ? `${files.length}/${expectedImages}` : (files.length || reusableImages.length)} 张可用图 / ${confirmedCopyText().length} 字正文 / 可回看交付链接。</span></article>
      <article class="production-card"><b>2. 母题复用</b><span>${escapeHtml(selectedTopic()?.theme || "本次选题")} 后续可切换成公众号、视频号、抖音、朋友圈或小红书二版。</span></article>
      <article class="production-card"><b>3. 拆解资产</b><span>沉淀标题、结构、开头、配图策略和表现数据，反哺下一次创作。</span></article>
    </div>
    <div class="actions">
      <button class="ghost" data-step-target="11">返回导出</button>
      <button class="secondary" data-archive-final-work ${canSave ? "" : "disabled"}>${archived ? "已保存到资产库" : "保存本次成稿"}</button>
      <button class="primary" data-route-target="assets">查看内容资产库</button>
    </div>
  </section>`;
}

function currentFinalWorkId() {
  return [
    selectedTopic()?.id || "topic",
    state.publishTarget || "platform",
    state.confirmedCopyVersionId || state.currentCopyVersionId || "copy",
    state.xhsCardManifest?.jobId || state.xhsCardAsyncJobId || "no-images",
  ].join("__");
}

function expectedImageCountForCurrentWork() {
  if (state.publishTarget !== "xhs") return 0;
  const planned = plannedVisualCardCount();
  return Math.max(1, Math.min(5, planned));
}

function plannedVisualCardCount() {
  const plan = Array.isArray(state.xhsCardPlan) ? state.xhsCardPlan : [];
  if (plan.length) return Math.max(1, Math.min(5, plan.length));
  if (state.copyConfirmed) {
    const nextPlan = ensureXhsCardPlan();
    if (Array.isArray(nextPlan) && nextPlan.length) return Math.max(1, Math.min(5, nextPlan.length));
  }
  return 0;
}

function buildFinalWorkAsset() {
  const files = Array.isArray(currentVisualManifest()?.publicFiles) ? currentVisualManifest().publicFiles : [];
  const reusableImages = getReusableImagesForCurrentTopic();
  const topic = selectedTopic();
  const target = currentTarget();
  const body = cleanPublishBodyForCopy(confirmedCopyText());
  const visual = currentVisualStyle();
  const prediction = buildLongkaPredictionSnapshot({ topic, target, body, images: files.length ? files : reusableImages });
  return {
    id: currentFinalWorkId(),
    type: "final-work",
    platform: target.title,
    platformId: target.id,
    title: state.selectedTitle || topic?.theme || "未命名成稿",
    topic: topic?.theme || topic?.title || "",
    sourceUrl: topic?.url || "",
    sourcePlatform: topic?.platform || currentSource().title,
    body,
    images: files.length ? files : reusableImages,
    visualStyleId: visual.id,
    visualStyle: visual.assetLabel,
    jobId: state.xhsCardManifest?.jobId || state.xhsCardAsyncJobId || "",
    createdAt: new Date().toISOString(),
    reusePlan: buildPlatformReusePlan(target.id),
    extractedAssets: buildPlatformExtractedAssets(target.id, body),
    prediction,
    calibration: buildLongkaCalibrationSnapshot(prediction),
  };
}

function buildLongkaPredictionSnapshot({ topic = {}, target = {}, body = "", images = [] } = {}) {
  const score = activeCopyCheckScore();
  const copyLength = String(body || "").length;
  const sourceBound = Boolean(topic?.url || topic?.sourceUrl || topic?.sourcePostId || topic?.id);
  const hasImages = Array.isArray(images) && images.length > 0;
  const saveValue = /清单|步骤|方法|模板|自查|判断|收藏|复用|系统|避坑|案例|经验/.test(body) ? 18 : 10;
  const hookValue = /为什么|别|不要|不是|而是|其实|真正|普通人|小白|老板|小妹|客户/.test(state.selectedTitle || body) ? 18 : 11;
  const sourceValue = sourceBound ? 16 : 8;
  const visualValue = hasImages ? 14 : (target?.id === "moments" ? 10 : 6);
  const checkValue = Math.max(8, Math.min(18, Math.round((Number(score || 70) / 100) * 18)));
  const lengthValue = copyLength >= 180 && copyLength <= 1400 ? 12 : 7;
  const total = Math.max(0, Math.min(100, sourceValue + saveValue + hookValue + visualValue + checkValue + lengthValue));
  const bucket = total >= 84 ? zh("&#39640;&#28508;&#21147;") : total >= 72 ? zh("&#21487;&#20248;&#20808;&#27979;&#35797;") : total >= 60 ? zh("&#38656;&#35201;&#23567;&#27979;") : zh("&#26242;&#19981;&#24314;&#35758;&#20027;&#25512;");
  const risk = [];
  if (!sourceBound) risk.push(zh("&#28304;&#32032;&#26448;&#36861;&#36394;&#19981;&#36275;"));
  if (!hasImages && target?.id === "xhs") risk.push(zh("&#23567;&#32418;&#20070;&#32570;&#22270;&#29255;"));
  if (copyLength < 120) risk.push(zh("&#27491;&#25991;&#20449;&#24687;&#37327;&#20559;&#23569;"));
  if (!risk.length) risk.push(zh("&#21457;&#24067;&#21069;&#37325;&#28857;&#26816;&#26597;&#26631;&#39064;&#21644;&#39318;&#23631;"));
  return {
    version: "longka-calibration-v1",
    predictedAt: new Date().toISOString(),
    score: total,
    bucket,
    reason: `${zh("&#28304;&#32032;&#26448;")} ${sourceBound ? zh("&#24050;&#32465;&#23450;") : zh("&#20559;&#24369;")} / ${zh("&#25910;&#34255;&#20215;&#20540;")} ${saveValue >= 18 ? zh("&#36739;&#24378;") : zh("&#19968;&#33324;")} / ${zh("&#39318;&#23631;&#38057;&#23376;")} ${hookValue >= 18 ? zh("&#36739;&#24378;") : zh("&#38656;&#35201;&#20877;&#25171;&#30952;")}`,
    factors: [
      { name: zh("&#28304;&#32032;&#26448;&#32465;&#23450;"), score: sourceValue, note: sourceBound ? zh("&#26377;&#27597;&#39064;&#25110;&#26469;&#28304;&#36861;&#36394;") : zh("&#38656;&#34917;&#26469;&#28304;&#38142;&#25509;/trace") },
      { name: zh("&#25910;&#34255;&#20215;&#20540;"), score: saveValue, note: saveValue >= 18 ? zh("&#26377;&#26041;&#27861;/&#28165;&#21333;/&#33258;&#26597;&#20449;&#21495;") : zh("&#38656;&#22686;&#21152;&#21487;&#22797;&#29992;&#26041;&#27861;") },
      { name: zh("&#26631;&#39064;&#38057;&#23376;"), score: hookValue, note: hookValue >= 18 ? zh("&#26377;&#21028;&#26029;/&#21453;&#24046;/&#36991;&#22353;&#20449;&#21495;") : zh("&#26631;&#39064;&#38656;&#37325;&#20889;") },
      { name: zh("&#35270;&#35273;&#23436;&#25104;&#24230;"), score: visualValue, note: hasImages ? `${images.length} ${zh("&#24352;&#22270;&#29255;")}` : zh("&#23578;&#26410;&#32465;&#23450;&#22270;&#29255;") },
      { name: zh("&#25991;&#26696;&#20307;&#26816;"), score: checkValue, note: `${score || 70}/100` },
      { name: zh("&#31687;&#24133;&#36866;&#37197;"), score: lengthValue, note: `${copyLength} ${zh("&#23383;")}` },
    ],
    hypothesis: total >= 72
      ? zh("&#36825;&#26465;&#20808;&#21457;&#19968;&#20010;&#24179;&#21488;&#29256;&#26412;&#65292;24-72h &#20869;&#30475;&#25910;&#34255;&#21644;&#35780;&#35770;&#65292;&#20915;&#23450;&#26159;&#21542;&#19968;&#40060;&#22810;&#21507;&#12290;")
      : zh("&#36825;&#26465;&#19981;&#35201;&#30452;&#25509;&#22823;&#25512;&#65292;&#20808;&#25442;&#26631;&#39064;&#25110;&#34917;&#32032;&#26448;&#21518;&#20877;&#21457;&#12290;"),
    risks: risk,
    blindLocked: true,
  };
}

function activeCopyCheckScore() {
  const confirmed = state.copyVersions.find((item) => item.id === state.confirmedCopyVersionId);
  if (confirmed?.score) return confirmed.score;
  const current = state.copyVersions.find((item) => item.id === state.currentCopyVersionId);
  return current?.score || 72;
}

function buildLongkaCalibrationSnapshot(prediction = {}) {
  return {
    status: "pending",
    predictedScore: prediction.score || 0,
    predictedBucket: prediction.bucket || "",
    predictionLockedAt: prediction.predictedAt || new Date().toISOString(),
    reviewedAt: null,
    actualBucket: "",
    conclusion: "",
    learning: "",
  };
}

function buildPublishRecordSnapshot(input = {}) {
  return {
    status: input.status || "draft",
    platform: input.platform || "",
    url: input.url || "",
    publishedAt: input.publishedAt || "",
    operator: input.operator || "",
    note: input.note || "",
    registeredAt: input.registeredAt || "",
  };
}

function finalWorkStatus(item) {
  const publishRecord = item.publishRecord || {};
  const calibration = item.calibration || {};
  const metrics = item.publishMetrics || {};
  if (calibration.status === "reviewed") {
    if (item.sampleLabel === "positive") return { key: "positive", label: zh("&#24050;&#25104;&#27491;&#20363;"), tone: "good" };
    if (item.sampleLabel === "negative") return { key: "negative", label: zh("&#24050;&#25104;&#21453;&#20363;"), tone: "bad" };
    return { key: "reviewed", label: zh("&#24050;&#22797;&#30424;"), tone: "good" };
  }
  if (publishRecord.status === "published") {
    return isRetroDue(item)
      ? { key: "retro-due", label: zh("&#21040;&#26399;&#24453;&#22797;&#30424;"), tone: "warn" }
      : { key: "published", label: zh("&#24050;&#21457;&#24067;&#24453;&#25968;&#25454;"), tone: "info" };
  }
  if (Number(metrics.views || 0) > 0) return { key: "metrics-only", label: zh("&#24050;&#34917;&#25968;&#25454;"), tone: "info" };
  return { key: "ready", label: zh("&#24453;&#30331;&#35760;&#21457;&#24067;"), tone: "todo" };
}

function isRetroDue(item) {
  const publishRecord = item.publishRecord || {};
  if (!publishRecord.publishedAt) return false;
  const publishedAt = new Date(publishRecord.publishedAt).getTime();
  if (!Number.isFinite(publishedAt)) return false;
  return Date.now() - publishedAt >= 3 * 24 * 60 * 60 * 1000;
}

function buildAssetOpsSummary(finalWorks = []) {
  return finalWorks.reduce((acc, item) => {
    const status = finalWorkStatus(item).key;
    if (status === "ready") acc.ready += 1;
    if (status === "published" || status === "retro-due") acc.pendingRetro += 1;
    if (status === "retro-due") acc.due += 1;
    if (item.sampleLabel === "positive") acc.positive += 1;
    if (item.sampleLabel === "negative") acc.negative += 1;
    return acc;
  }, { ready: 0, pendingRetro: 0, due: 0, positive: 0, negative: 0 });
}

async function archiveFinalWork() {
  const asset = buildFinalWorkAsset();
  if (!asset.body) {
    state.archiveMessage = "还没有确认正文，不能保存为母题资产。";
    renderToday();
    return;
  }
  if (state.publishTarget === "xhs" && !asset.images.length) {
    state.archiveMessage = "小红书图文还没有真实图片，不能保存为可发布图文成稿。";
    renderToday();
    return;
  }
  const expectedImages = expectedImageCountForCurrentWork();
  if (state.publishTarget === "xhs" && asset.images.length < expectedImages) {
    state.archiveMessage = `小红书图文还没完整：当前 ${asset.images.length}/${expectedImages} 张。请先回第 10 步补齐图片，再保存为已完成作品。`;
    renderToday();
    return;
  }
  const withoutCurrent = state.finalWorks.filter((item) => item.id !== asset.id);
  state.finalWorks = [asset, ...withoutCurrent].slice(0, 30);
  state.archiveMessage = `已保存到本机缓存，正在同步到 122 统一作品库：${asset.platform}`;
  persistWorkbenchSnapshot();
  try {
    const res = await fetch(apiPath("/api/final-works"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ work: asset }),
    });
    const result = await res.json();
    if (!res.ok || !result.ok) throw new Error(result.message || result.error || "保存到 122 失败");
    state.finalWorks = [result.work || asset, ...withoutCurrent].slice(0, 30);
    state.archiveMessage = `已保存：${asset.platform} 版本已进入 122 统一作品库，小妹和团队打开内容资产库都能看到。`;
    persistWorkbenchSnapshot();
  } catch (error) {
    state.archiveMessage = `本机已缓存，但同步 122 统一作品库失败：${error.message}`;
  }
  renderToday();
}
function buildPlatformReusePlan(platformId) {
  const common = [
    "小红书：改成图文轮播，首屏必须有强钩子和明确收藏价值。",
    "公众号：扩写成长文，增加论证、案例和方法步骤，图片按语义插入。",
    "视频号/抖音：改成口播脚本、分镜、字幕节奏和封面方向。",
    "朋友圈：压缩成观点、经历、信任背书和私聊入口。",
  ];
  if (platformId === "xhs") return common;
  if (platformId === "wechat-article") return ["公众号长文已完成，后续优先拆出标题、开头、案例和图片插入策略。", ...common.filter((line) => !line.startsWith("公众号"))];
  if (platformId === "douyin" || platformId === "video-account") return ["视频脚本已完成，后续优先复用钩子、分镜和口播节奏。", ...common.filter((line) => !line.includes("视频号"))];
  if (platformId === "moments") return ["朋友圈文案已完成，后续优先复用自然表达、信任铺垫和私聊入口。", ...common.filter((line) => !line.startsWith("朋友圈"))];
  return common;
}

function buildPlatformExtractedAssets(platformId, body = "") {
  const lines = String(body || "").split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const base = {
    title: state.selectedTitle || "",
    hook: lines[0] || state.selectedTitle || "",
  };
  if (platformId === "xhs") {
    const cards = ensureXhsCardPlan();
    const visual = currentVisualStyle();
    return {
      ...base,
      structure: cards.map((card) => card.role).join(" -> "),
      visualStyle: visual.assetLabel,
    };
  }
  if (platformId === "wechat-article") {
    return {
      ...base,
      structure: "标题 -> 开头判断 -> 问题拆解 -> 案例/方法 -> 行动建议",
      visualStyle: "公众号长文配图 / 语义插图",
    };
  }
  if (platformId === "douyin" || platformId === "video-account") {
    return {
      ...base,
      structure: "3 秒钩子 -> 痛点解释 -> 观点展开 -> 行动建议 -> 评论/私信引导",
      visualStyle: "短视频封面 / 分镜参考",
    };
  }
  if (platformId === "moments") {
    return {
      ...base,
      structure: "真实感开头 -> 观点 -> 个人判断 -> 轻 CTA",
      visualStyle: "朋友圈轻配图",
    };
  }
  return {
    ...base,
    structure: "平台成稿结构",
    visualStyle: "按平台复用",
  };
}

function renderProductionStepLegacyCleanRoutes() {
  const locked = !state.copyConfirmed;
  if (state.publishTarget !== "xhs") return renderNonXhsProductionStep(locked);
  ensureXhsCardPlan();
  const visual = currentVisualStyle();
  const topic = selectedTopic();
  const files = Array.isArray(currentVisualManifest()?.publicFiles) ? currentVisualManifest().publicFiles : [];
  const isLoading = state.xhsCardExportStatus === "loading";
  return `<section class="work-card">
    ${cardHead("小红书图文制作", "同一个母题可以选择不同视觉路线：小黑漫画、卷卷整理、归藏杂志卡、宝玉知识卡。先绑定当前文案，再选择风格生产。")}
    <div class="status-strip">当前母题：${escapeHtml(topic?.theme || "未选择")} · 当前文案：${state.copyConfirmed ? "已确认" : "未确认"} · 当前视觉：${escapeHtml(visualRouteName(state.visualStyle))}</div>
    ${renderVisualRoutePicker(locked)}
    ${renderCleanXhsCardPreview()}
    <div class="production-grid">
      <article class="production-card ${locked ? "locked" : ""}">
        <b>${escapeHtml(visualRouteName(state.visualStyle))}</b>
        <span>${escapeHtml(visualProductionCopy(state.visualStyle))}</span>
        <button class="primary" ${locked || isLoading ? "disabled" : ""} data-generate-xiaohei-cards>${isLoading && state.xhsCardOperation === "xiaohei" ? "43 正在生成图片..." : primaryVisualActionLabel(state.visualStyle)}</button>
        <button class="secondary" ${locked || isLoading ? "disabled" : ""} data-export-xhs-cards>${isLoading && state.xhsCardOperation === "plan" ? "正在导出拆页方案..." : "导出当前风格拆页方案"}</button>
      </article>
      <article class="production-card ${locked ? "locked" : ""}">
        <b>一鱼多吃复用</b>
        <span>图文完成后保存为母题资产，再切换成公众号长文、朋友圈文案、抖音/视频号脚本。不是一次性成稿。</span>
        <button class="primary" ${locked ? "disabled" : ""} data-step-target="12">保存为母题资产</button>
      </article>
    </div>
    ${files.length ? `<div class="status-strip success">已绑定当前母题生成 ${files.length} 张图片。可以进入导出交付，或保存为母题资产。</div>` : ""}
    <div class="actions">
      <button class="ghost" data-step-target="9">返回确认文案</button>
      <button class="primary" data-step-target="11" ${state.copyConfirmed ? "" : "disabled"}>下一步：导出交付</button>
    </div>
  </section>`;
}

function visualRouteName(styleId) {
  if (styleId === "xiaohei-metaphor") return "小黑漫画隐喻";
  if (styleId === "juju-organizing") return "卷卷整理插画";
  if (styleId === "guizang-editorial") return "归藏杂志卡";
  if (styleId === "xhs-knowledge-card") return "宝玉知识卡";
  return currentVisualStyle().title || "视觉路线";
}

function renderVisualRoutePicker(locked) {
  const routes = [
    {
      id: "xiaohei-metaphor",
      name: "小黑漫画",
      use: "人物隐喻、避坑、流程、情绪场景，适合小红书观点图文。",
      base: "ian-xiaohei-illustrations",
    },
    {
      id: "juju-organizing",
      name: "卷卷整理",
      use: "白底纸面手绘，把复杂内容整理成可进入的现场，适合方法卡和公众号配图。",
      base: "juju-content-illustrations",
    },
    {
      id: "guizang-editorial",
      name: "归藏杂志",
      use: "高级杂志 / Deck 感，适合方法论、行业洞察、投资人展示。",
      base: "guizang-social-card / Open Design",
    },
    {
      id: "xhs-knowledge-card",
      name: "宝玉知识卡",
      use: "清单、步骤、对比、收藏型内容，一页一个重点。",
      base: "baoyu-xhs-images / baoyu-infographic",
    },
  ];
  return `<div class="visual-route-grid">
    ${routes.map((item) => `<button type="button" class="visual-route-card ${item.id === state.visualStyle ? "active" : ""}" data-visual-style="${escapeHtml(item.id)}" ${locked ? "disabled" : ""}>
      <b>${escapeHtml(item.name)}</b>
      <span>${escapeHtml(item.use)}</span>
      <em>${escapeHtml(item.base)}</em>
    </button>`).join("")}
  </div>`;
}

function visualProductionCopy(styleId) {
  if (styleId === "xiaohei-metaphor") return "调用 43 小黑真实出图，生成带场景隐喻的漫画图。适合当前演示闭环。";
  if (styleId === "juju-organizing") return "按卷卷整理研究所风格，把当前文案变成白底纸面手绘方法图；适合方法论、小红书知识卡和公众号正文插图。";
  if (styleId === "guizang-editorial") return "按归藏杂志风拆成高级图文卡，适合方法论和系统感展示。";
  return "按宝玉小红书知识卡拆页，适合清单、步骤和收藏型内容。";
}

function primaryVisualActionLabel(styleId) {
  const count = plannedVisualCardCount();
  const prefix = count ? `生成 ${count} 张` : "生成";
  if (styleId === "xiaohei-metaphor") return `${prefix}小黑漫画图`;
  if (styleId === "juju-organizing") return `${prefix}卷卷整理图`;
  if (styleId === "guizang-editorial") return `${prefix}归藏杂志图`;
  return `${prefix}宝玉知识卡`;
}

function zh(entity) {
  const box = document.createElement("textarea");
  box.innerHTML = entity;
  return box.value;
}

function recommendVisualRouteClean() {
  const topic = selectedTopic() || {};
  const text = `${state.selectedTitle || ""}\n${confirmedCopyText() || state.draft || ""}\n${topic.theme || ""}\n${topic.pain || ""}`;
  if (/娴佺▼|姝ラ|绯荤粺|璧勪骇搴搢鏂规硶|妗嗘灦|鎷嗚В|澶嶇洏|鏁欑▼|娓呭崟/.test(text)) {
    return { id: "juju-organizing", reason: zh("&#36825;&#31687;&#20869;&#23481;&#22312;&#35762;&#26041;&#27861;&#21644;&#31995;&#32479;&#65292;&#38656;&#35201;&#25226;&#22797;&#26434;&#27969;&#31243;&#25972;&#29702;&#25104;&#19968;&#20010;&#33021;&#36827;&#20837;&#30340;&#29616;&#22330;&#65307;&#21367;&#21367;&#27604;&#21333;&#32431;&#28459;&#30011;&#26356;&#36866;&#21512;&#25215;&#36733;&#27493;&#39588;&#21644;&#36164;&#20135;&#20851;&#31995;&#12290;") };
  }
  if (/閬垮潙|鐒﹁檻|鍗′綇|璇尯|涓轰粈涔坾鍒珅涓嶈|闂|澶辫触/.test(text)) {
    return { id: "xiaohei-metaphor", reason: zh("&#36825;&#31687;&#20869;&#23481;&#26377;&#26126;&#26174;&#30171;&#28857;&#21644;&#24773;&#32490;&#24352;&#21147;&#65292;&#36866;&#21512;&#29992;&#23567;&#40657;&#20154;&#29289;&#22330;&#26223;&#20570;&#38544;&#21947;&#65292;&#35753;&#35835;&#32773;&#20808;&#34987;&#30011;&#38754;&#25235;&#20303;&#12290;") };
  }
  if (/琛屼笟|瓒嬪娍|娲炲療|鍟嗕笟|鎶曡祫浜簗鏂规硶璁簗鎴樼暐|涓彴/.test(text)) {
    return { id: "guizang-editorial", reason: zh("&#36825;&#31687;&#20869;&#23481;&#20559;&#26041;&#27861;&#35770;&#21644;&#34892;&#19994;&#21028;&#26029;&#65292;&#24402;&#34255;&#26434;&#24535;&#21345;&#26356;&#36866;&#21512;&#21576;&#29616;&#39640;&#32423;&#24863;&#21644;&#31995;&#32479;&#24863;&#12290;") };
  }
  return { id: "xhs-knowledge-card", reason: zh("&#36825;&#31687;&#20869;&#23481;&#26356;&#20687;&#21487;&#25910;&#34255;&#30693;&#35782;&#28857;&#65292;&#23453;&#29577;&#30693;&#35782;&#21345;&#36866;&#21512;&#19968;&#39029;&#19968;&#20010;&#37325;&#28857;&#65292;&#26041;&#20415;&#23567;&#32418;&#20070;&#29992;&#25143;&#25910;&#34255;&#12290;") };
}

function visualRouteNameClean(styleId) {
  if (styleId === "xiaohei-metaphor") return zh("&#23567;&#40657;&#28459;&#30011;&#38544;&#21947;");
  if (styleId === "juju-organizing") return zh("&#21367;&#21367;&#25972;&#29702;&#25554;&#30011;");
  if (styleId === "guizang-editorial") return zh("&#24402;&#34255;&#26434;&#24535;&#21345;");
  if (styleId === "xhs-knowledge-card") return zh("&#23453;&#29577;&#30693;&#35782;&#21345;");
  return currentVisualStyle().title || "visual";
}

function visualProductionCopyClean(styleId) {
  if (styleId === "xiaohei-metaphor") return zh("&#35843;&#29992; 43 &#23567;&#40657;&#30495;&#20986;&#22270;&#65292;&#29983;&#25104; 5 &#24352;&#24102;&#22330;&#26223;&#38544;&#21947;&#30340;&#28459;&#30011;&#22270;&#12290;&#36866;&#21512;&#24403;&#21069;&#28436;&#31034;&#38381;&#29615;&#12290;");
  if (styleId === "juju-organizing") return zh("&#25353;&#21367;&#21367;&#25972;&#29702;&#30740;&#31350;&#25152;&#39118;&#26684;&#65292;&#25226;&#24403;&#21069;&#25991;&#26696;&#21464;&#25104;&#30333;&#24213;&#32440;&#38754;&#25163;&#32472;&#26041;&#27861;&#22270;&#65307;&#36866;&#21512;&#26041;&#27861;&#35770;&#12289;&#23567;&#32418;&#20070;&#30693;&#35782;&#21345;&#21644;&#20844;&#20247;&#21495;&#27491;&#25991;&#25554;&#22270;&#12290;");
  if (styleId === "guizang-editorial") return zh("&#25353;&#24402;&#34255;&#26434;&#24535;&#39118;&#25286;&#25104;&#39640;&#32423;&#22270;&#25991;&#21345;&#65292;&#36866;&#21512;&#32473;&#25237;&#36164;&#20154;&#30475;&#26041;&#27861;&#35770;&#21644;&#31995;&#32479;&#24863;&#12290;&#24403;&#21069;&#20808;&#23548;&#20986;&#25286;&#39029;&#26041;&#26696;&#65292;&#21518;&#32493;&#25509;&#30495;&#22270;&#26381;&#21153;&#12290;");
  return zh("&#25353;&#23453;&#29577;&#23567;&#32418;&#20070;&#30693;&#35782;&#21345;&#25286;&#39029;&#65292;&#36866;&#21512;&#28165;&#21333;&#12289;&#27493;&#39588;&#21644;&#25910;&#34255;&#22411;&#20869;&#23481;&#12290;&#24403;&#21069;&#20808;&#23548;&#20986;&#25286;&#39029;&#26041;&#26696;&#65292;&#21518;&#32493;&#25509;&#30495;&#22270;&#26381;&#21153;&#12290;");
}

function primaryVisualActionLabelClean(styleId) {
  const count = plannedVisualCardCount();
  const prefix = count ? `生成 ${count} 张` : "生成";
  if (styleId === "xiaohei-metaphor") return `${prefix}小黑漫画图`;
  if (styleId === "juju-organizing") return `${prefix}卷卷整理图`;
  if (styleId === "guizang-editorial") return `${prefix}归藏杂志图`;
  return `${prefix}宝玉知识卡`;
}

function visualPlatformForCurrentTarget() {
  if (state.publishTarget === "wechat-article") return "wechat-article";
  if (state.publishTarget === "moments") return "moments";
  if (state.publishTarget === "douyin" || state.publishTarget === "video-account") return "douyin-images";
  return "xhs";
}

function manifestMatchesCurrentVisual(manifest = state.xhsCardManifest) {
  if (!manifest) return false;
  const style = String(manifest.style || "");
  if (style && style !== state.visualStyle) return false;
  const files = Array.isArray(manifest.files) ? manifest.files : [];
  if (files.some((file) => String(file.style || "") && String(file.style) !== state.visualStyle)) return false;
  const publicFiles = Array.isArray(manifest.publicFiles) ? manifest.publicFiles : [];
  if (publicFiles.some((url) => !String(url).includes(state.visualStyle))) return false;
  return true;
}

function currentVisualManifest() {
  return manifestMatchesCurrentVisual() ? state.xhsCardManifest : null;
}

function applyRemoteVisualManifest(manifest) {
  if (!manifestMatchesCurrentVisual(manifest)) {
    state.xhsCardManifest = null;
    state.xhsCardExportStatus = "idle";
    state.xhsCardProgress = null;
    state.xhsCardExportMessage = zh("&#24403;&#21069;&#35270;&#35273;&#36335;&#32447;&#24050;&#20999;&#25442;&#65292;&#26087;&#39118;&#26684;&#22270;&#29255;&#19981;&#20877;&#22797;&#29992;&#12290;&#35831;&#37325;&#26032;&#29983;&#25104;&#24403;&#21069;&#39118;&#26684;&#22270;&#12290;");
    return false;
  }
  state.xhsCardManifest = manifest;
  const files = Array.isArray(manifest.publicFiles) ? manifest.publicFiles : [];
  const count = Number(manifest.count || files.length || 0);
  const total = Number(state.xhsCardProgress?.total || manifest.total || Math.max(1, count));
  if (count >= total) {
    state.xhsCardExportStatus = "done";
    state.xhsCardProgress = null;
    state.xhsCardExportMessage = `43 已生成 ${count} 张${visualRouteNameClean(state.visualStyle)}，下面可以逐张打开检查。`;
  } else if (count > 0 && state.xhsCardExportStatus === "loading") {
    state.xhsCardProgress = { done: count, total };
    state.xhsCardExportMessage = `43 后台出图中：已完成 ${count}/${total} 张。已生成的图片会先显示。`;
  }
  return true;
}

function renderProductionStep() {
  const locked = !state.copyConfirmed;
  ensureXhsCardPlan();
  const topic = selectedTopic();
  const files = Array.isArray(currentVisualManifest()?.publicFiles) ? currentVisualManifest().publicFiles : [];
  const isLoading = state.xhsCardExportStatus === "loading";
  const rec = autoApplyRecommendedVisualStyle();
  const copy = confirmedCopyText();
  const isWechat = state.publishTarget === "wechat-article";
  const isVideo = state.publishTarget === "douyin" || state.publishTarget === "video-account";
  const isMoments = state.publishTarget === "moments";
  const platformNote = isWechat
    ? zh("&#20844;&#20247;&#21495;&#38656;&#35201;&#22270;&#29255;&#25353;&#35821;&#20041;&#25554;&#20837;&#38271;&#25991;&#27573;&#33853;&#65292;&#19981;&#26159;&#20570;&#22270;&#38598;&#12290;")
    : isVideo
      ? zh("&#35270;&#39057;&#38656;&#35201;&#23553;&#38754;&#21442;&#32771;&#22270;&#12289;&#20998;&#38236;&#27668;&#27675;&#22270;&#21644;&#21475;&#25773;&#33410;&#22863;&#12290;")
      : isMoments
        ? zh("&#26379;&#21451;&#22280;&#20063;&#38656;&#35201;&#37197;&#22270;&#65292;&#20294;&#35201;&#26356;&#33258;&#28982;&#12289;&#26356;&#20687;&#20154;&#30340;&#26085;&#24120;&#34920;&#36798;&#65292;&#19981;&#35201;&#22826;&#20687;&#28023;&#25253;&#12290;")
        : zh("&#23567;&#32418;&#20070;&#38656;&#35201; 5 &#24352;&#22270;&#25991;&#36718;&#25773;&#65292;&#27599;&#24352;&#19968;&#20010;&#35270;&#35273;&#37325;&#28857;&#12290;");
  return `<section class="work-card">
    ${cardHead(`${escapeHtml(currentTarget().title)} ${zh("&#21046;&#20316;&#20013;&#24515;")}`, zh("&#31532;10&#27493;&#26159;&#24179;&#21488;&#25991;&#26696; + &#20316;&#22270;&#20013;&#24515; + &#24050;&#29983;&#25104;&#22270;&#29255;&#12290;&#23567;&#32418;&#20070;&#12289;&#20844;&#20247;&#21495;&#12289;&#26379;&#21451;&#22280;&#12289;&#25238;&#38899;&#22270;&#25991;&#21495;&#37117;&#35201;&#33021;&#20174;&#36825;&#37324;&#20986;&#22270;&#12290;"))}
    <div class="status-strip">${zh("&#24403;&#21069;&#27597;&#39064;")}: ${escapeHtml(topic?.theme || "-")} / ${zh("&#30446;&#26631;&#24179;&#21488;")}: ${escapeHtml(currentTarget().title)} / ${zh("&#24403;&#21069;&#35270;&#35273;")}: ${escapeHtml(visualRouteNameClean(state.visualStyle))}</div>
    <div class="production-grid">
      <article class="production-card ${locked ? "locked" : ""}"><b>${escapeHtml(currentTarget().title)} ${zh("&#25991;&#26696;")}</b><span>${escapeHtml(platformNote)}</span></article>
      <article class="production-card ${locked ? "locked" : ""}"><b>${zh("&#20316;&#22270;&#20013;&#24515;")}</b><span>${zh("&#36825;&#37324;&#26159;&#23567;&#40657;&#12289;Juju&#12289;&#24402;&#34255;&#12289;&#23453;&#29577;&#30340;&#20837;&#21475;&#12290;&#28857;&#29983;&#25104;&#21518;&#65292;43 &#20250;&#25353;&#24403;&#21069;&#24179;&#21488;&#21644;&#24403;&#21069;&#25991;&#26696;&#30495;&#20986;&#22270;&#12290;")}</span></article>
    </div>
    <div class="visual-recommendation"><b>${zh("&#24314;&#35758;&#37197;&#22270;&#36335;&#32447;")}: ${escapeHtml(visualRouteNameClean(rec.id))}</b><span>${escapeHtml(rec.reason)}</span>${rec.id !== state.visualStyle ? `<button type="button" class="secondary" data-visual-style="${escapeHtml(rec.id)}">${zh("&#20999;&#25442;&#21040;&#25512;&#33616;&#36335;&#32447;")}</button>` : `<em>${zh("&#24050;&#20351;&#29992;&#25512;&#33616;&#36335;&#32447;")}</em>`}</div>
    ${renderVisualRoutePickerClean(locked, rec.id)}
    ${renderCleanXhsCardPreview()}
    <div class="production-grid">
      <article class="production-card ${locked ? "locked" : ""}">
        <b>${escapeHtml(visualRouteNameClean(state.visualStyle))}</b>
        <span>${escapeHtml(visualProductionCopyClean(state.visualStyle))}</span>
        <button class="primary" ${locked || isLoading ? "disabled" : ""} data-generate-xiaohei-cards>${isLoading ? "43 generating..." : escapeHtml(primaryVisualActionLabelClean(state.visualStyle))}</button>
        <button class="secondary" ${locked || isLoading ? "disabled" : ""} data-export-xhs-cards>${zh("&#23548;&#20986;&#24403;&#21069;&#39118;&#26684;&#25286;&#39029;&#26041;&#26696;")}</button>
      </article>
      <article class="production-card ${locked ? "locked" : ""}"><b>${zh("&#19968;&#40060;&#22810;&#21507;&#22797;&#29992;")}</b><span>${zh("&#22270;&#25991;&#23436;&#25104;&#21518;&#20445;&#23384;&#20026;&#27597;&#39064;&#36164;&#20135;&#65292;&#20877;&#20999;&#25442;&#25104;&#20844;&#20247;&#21495;&#38271;&#25991;&#12289;&#26379;&#21451;&#22280;&#25991;&#26696;&#12289;&#25238;&#38899;/&#35270;&#39057;&#21495;&#33050;&#26412;&#12290;")}</span><button class="primary" ${locked ? "disabled" : ""} data-step-target="12">${zh("&#20445;&#23384;&#20026;&#27597;&#39064;&#36164;&#20135;")}</button></article>
    </div>
    ${isWechat ? renderWechatArticleImageLayout(copy) : ""}
    ${isVideo ? renderVideoProductionPreview(copy) : ""}
    ${files.length ? `<div class="status-strip success">${zh("&#24050;&#29983;&#25104;")} ${files.length} ${zh("&#24352;&#22270;&#29255;&#65292;&#21487;&#20197;&#23548;&#20986;&#25110;&#20445;&#23384;&#20026;&#27597;&#39064;&#36164;&#20135;&#12290;")}</div>` : ""}
    <div class="actions"><button class="ghost" data-step-target="9">${zh("&#36820;&#22238;&#30830;&#35748;&#25991;&#26696;")}</button><button class="primary" data-step-target="11" ${state.copyConfirmed ? "" : "disabled"}>${zh("&#19979;&#19968;&#27493;&#65306;&#23548;&#20986;&#20132;&#20184;")}</button></div>
  </section>`;
}

function autoApplyRecommendedVisualStyle() {
  const rec = recommendVisualRouteClean();
  if (!state.visualStyleTouched && rec.id && rec.id !== state.visualStyle && state.xhsCardExportStatus !== "loading") {
    state.visualStyle = rec.id;
    state.xhsCardPlan = [];
    state.xhsCardExportStatus = "idle";
    state.xhsCardExportMessage = zh("&#24050;&#25353;&#24403;&#21069;&#20869;&#23481;&#33258;&#21160;&#20999;&#21040;&#25512;&#33616;&#37197;&#22270;&#36335;&#32447;&#12290;");
    state.xhsCardOperation = "";
    state.xhsCardAsyncJobId = "";
    state.xhsCardJobBase = "";
    state.xhsCardProgress = null;
    state.xhsCardManifest = null;
    ensureXhsCardPlan();
  }
  return rec;
}

function renderVisualRoutePickerClean(locked, recommendedId = "") {
  const routes = [
    { id: "xiaohei-metaphor", name: zh("&#23567;&#40657;&#28459;&#30011;"), use: zh("&#20154;&#29289;&#38544;&#21947;&#12289;&#36991;&#22353;&#12289;&#27969;&#31243;&#12289;&#24773;&#32490;&#22330;&#26223;&#65292;&#36866;&#21512;&#23567;&#32418;&#20070;&#35266;&#28857;&#22270;&#25991;&#12290;"), base: "ian-xiaohei-illustrations" },
    { id: "juju-organizing", name: zh("&#21367;&#21367;&#25972;&#29702;"), use: zh("&#30333;&#24213;&#32440;&#38754;&#25163;&#32472;&#65292;&#25226;&#22797;&#26434;&#20869;&#23481;&#25972;&#29702;&#25104;&#21487;&#36827;&#20837;&#30340;&#29616;&#22330;&#12290;"), base: "juju-content-illustrations" },
    { id: "guizang-editorial", name: zh("&#24402;&#34255;&#26434;&#24535;"), use: zh("&#39640;&#32423;&#26434;&#24535;&#21644; Deck &#24863;&#65292;&#36866;&#21512;&#26041;&#27861;&#35770;&#12289;&#34892;&#19994;&#27934;&#23519;&#12290;"), base: "guizang-social-card / Open Design" },
    { id: "xhs-knowledge-card", name: zh("&#23453;&#29577;&#30693;&#35782;&#21345;"), use: zh("&#28165;&#21333;&#12289;&#27493;&#39588;&#12289;&#23545;&#27604;&#12289;&#25910;&#34255;&#22411;&#20869;&#23481;&#65292;&#19968;&#39029;&#19968;&#20010;&#37325;&#28857;&#12290;"), base: "baoyu-xhs-images / baoyu-infographic" },
  ];
  return `<div class="visual-route-grid">${routes.map((item) => `<button type="button" class="visual-route-card ${item.id === state.visualStyle ? "active" : ""}" data-visual-style="${escapeHtml(item.id)}" ${locked ? "disabled" : ""}><b>${escapeHtml(item.name)}</b><span>${escapeHtml(item.use)}</span><em>${item.id === recommendedId ? "recommended 路 " : ""}${escapeHtml(item.base)}</em></button>`).join("")}</div>`;
}

function bindWorkAreaActions() {
  $$("#workArea [data-next]").forEach((button) => button.addEventListener("click", () => setStep(state.step + 1)));
  $$("#workArea [data-step-target]").forEach((button) => button.addEventListener("click", () => setStep(Number(button.dataset.stepTarget))));
  $$("#workArea [data-route-target]").forEach((button) => button.addEventListener("click", () => setRoute(button.dataset.routeTarget)));
  $$("#workArea [data-publish-target]").forEach((button) => {
    button.addEventListener("click", () => {
      state.publishTarget = button.dataset.publishTarget;
      clearAfter(1);
      renderToday();
    });
  });
  $$("#workArea [data-source-channel]").forEach((button) => {
    button.addEventListener("click", () => {
      state.sourceChannel = button.dataset.sourceChannel;
      clearAfter(3);
      renderToday();
    });
  });
  byId("workArea")?.querySelector("[data-save-business]")?.addEventListener("click", () => {
    saveBusinessInputs();
    clearAfter(2);
    setStep(3);
  });
  byId("workArea")?.querySelector("[data-collect-x]")?.addEventListener("click", () => collectXAccounts());
  byId("workArea")?.querySelector("[data-read-materials]")?.addEventListener("click", () => readMaterials());
  byId("workArea")?.querySelectorAll("[data-material-scope]").forEach((button) => {
    button.addEventListener("click", () => {
      state.materialScope = button.dataset.materialScope || "all";
      saveMaterialFilterInputs();
      renderToday();
    });
  });
  byId("materialAuthorInput")?.addEventListener("input", (event) => {
    state.materialAuthor = event.target.value;
    scheduleWorkbenchSnapshotSave();
  });
  byId("materialLatestRunsInput")?.addEventListener("input", (event) => {
    state.materialLatestRuns = Math.max(1, Math.min(10, Number(event.target.value || 3)));
    scheduleWorkbenchSnapshotSave();
  });
  byId("workArea")?.querySelector("[data-demo-materials]")?.addEventListener("click", () => readDemoMaterials());
  $$("#workArea [data-topic-id]").forEach((button) => {
    button.addEventListener("click", () => selectTopicForCreation(button.dataset.topicId));
  });
  $$("#workArea [data-title-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedTitle = button.dataset.titleChoice;
      state.draft = "";
      state.improvedDraft = "";
      state.copyConfirmed = false;
      state.draftRevision = 1;
      state.draftStatus = "idle";
      state.draftError = "";
      state.draftMeta = null;
      state.draftReview = null;
      setStep(7);
    });
  });
  byId("workArea")?.querySelector("[data-regenerate-draft]")?.addEventListener("click", () => {
    state.draftRevision += 1;
    state.draft = "";
    state.improvedDraft = "";
    clearCopyConfirmation();
    state.draftStatus = "idle";
    state.draftError = "";
    state.draftMeta = null;
    state.draftReview = null;
    state.pendingRevision = null;
    generateSopDraft({ force: true });
  });
  byId("workArea")?.querySelector("[data-improve-again]")?.addEventListener("click", () => {
    const snapshot = currentCopySnapshot("优化前版本");
    if (!snapshot?.copy) {
      state.draftError = zh("&#24403;&#21069;&#27809;&#26377;&#21487;&#20248;&#21270;&#30340;&#27491;&#25991;&#65292;&#24050;&#33258;&#21160;&#22238;&#21040;&#31532; 7 &#27493;&#37325;&#26032;&#29983;&#25104;&#12290;");
      state.step = 7;
      state.draft = "";
      state.improvedDraft = "";
      state.draftStatus = "idle";
      state.draftMeta = null;
      state.draftReview = null;
      generateSopDraft({ force: true });
      return;
    }
    const coach = buildContentCoachReport();
    const baseFeedback = state.draftReview || runLongkaReview(snapshot.copy) || {};
    const coachBrief = (coach.weakest || [])
      .map((item) => `${item.name}: ${item.advice || item.reason}`)
      .filter(Boolean);
    state.draftRevision += 1;
    state.pendingRevision = {
      currentDraft: snapshot,
      qualityFeedback: {
        ...baseFeedback,
        rewriteBrief: [
          ...coachBrief,
          ...(baseFeedback.rewriteBrief || []),
        ].slice(0, 8),
      },
      instruction: `Rewrite the current copy into a complete new version. Do not append suggestions only. Priority fixes: ${coachBrief.join("; ")}`,
    };
    clearCopyConfirmation();
    state.draftStatus = "idle";
    state.draftError = "";
    state.draftMeta = null;
    generateSopDraft({ force: true });
  });
  byId("workArea")?.querySelectorAll("[data-copy-version]").forEach((button) => {
    button.addEventListener("click", () => restoreCopyVersion(button.dataset.copyVersion));
  });
  byId("workArea")?.querySelectorAll("[data-copy-restore]").forEach((button) => {
    button.addEventListener("click", () => restoreCopyVersion(button.dataset.copyRestore));
  });
  byId("workArea")?.querySelectorAll("[data-copy-confirm]").forEach((button) => {
    button.addEventListener("click", () => restoreCopyVersion(button.dataset.copyConfirm, true));
  });
  byId("workArea")?.querySelector("[data-confirm-copy]")?.addEventListener("click", () => {
    if (!state.draft) return;
    const version = state.copyVersions.find((item) => item.id === state.currentCopyVersionId) || rememberCopyVersion(activeCopyText(), "纭鐗堟湰");
    if (version) {
      state.confirmedCopyVersionId = version.id;
      state.copyVersions = state.copyVersions.map((item) => ({ ...item, confirmed: item.id === version.id }));
    }
    state.copyConfirmed = true;
    setStep(10);
  });
  byId("workArea")?.querySelectorAll("[data-visual-style]").forEach((button) => {
    button.addEventListener("click", () => changeVisualStyle(button.dataset.visualStyle));
  });
  byId("workArea")?.querySelector("[data-generate-xiaohei-cards]")?.addEventListener("click", () => generateXiaoheiCards());
  byId("workArea")?.querySelector("[data-restore-latest-xiaohei]")?.addEventListener("click", () => restoreLatestXiaoheiCards());
  byId("workArea")?.querySelector("[data-export-xhs-cards]")?.addEventListener("click", () => exportCleanXhsCardPlan());
  byId("workArea")?.querySelector("[data-archive-final-work]")?.addEventListener("click", () => archiveFinalWork());
}

function saveBusinessInputs() {
  state.industry = byId("industryInput")?.value.trim() || state.industry;
  state.businessLine = byId("businessLineInput")?.value.trim() || state.businessLine;
  state.goal = byId("goalInput")?.value.trim() || state.goal;
  state.keywords = byId("keywordsInput")?.value.trim() || state.keywords;
}

function saveMaterialFilterInputs() {
  const authorInput = byId("materialAuthorInput");
  const latestRunsInput = byId("materialLatestRunsInput");
  if (authorInput) state.materialAuthor = authorInput.value.trim();
  if (latestRunsInput) state.materialLatestRuns = Math.max(1, Math.min(10, Number(latestRunsInput.value || 3)));
}

function materialScopeLabel() {
  if (state.materialScope === "latest") return zh("&#26368;&#26032;&#25209;&#27425;");
  if (state.materialScope === "author") return `${zh("&#25351;&#23450;&#21338;&#20027;")}${state.materialAuthor ? `: ${state.materialAuthor}` : ""}`;
  return zh("&#20840;&#36187;&#36947;");
}

async function readMaterials() {
  saveMaterialFilterInputs();
  state.logs = [];
  if (state.sourceChannel === "x-history" || state.sourceChannel === "x-live") {
    state.useLatestXRunOnly = false;
    state.lastXRunIds = [];
  }
  state.assetStatus = "正在读取";
  log("读取任务信息");
  log(`发布目标：${currentTarget().title}`);
  log(`素材来源：${sourceTitleForTarget()}`);
  log(`鍏抽敭璇嶏細${state.keywords}`);
  renderToday();
  await delay(180);

  const db = await loadState();
  const topics = buildTopicsFromDb(db);
  state.assets = db;
  if (!topics.length) {
    state.assetStatus = "没有匹配选题";
    log("当前素材来源没有匹配选题。系统不会从其他平台乱拿素材。");
    log("建议：换关键词、切换到历史素材，或先采集/导入对应平台素材。");
    state.topics = [];
    renderToday();
    return;
  }
  state.topics = topics.slice(0, 10);
  state.selectedTopicId = "";
  state.titleChoices = [];
  state.titleChoiceKey = "";
  state.assetStatus = `找到 ${state.topics.length} 个选题`;
  log(`找到 ${state.topics.length} 个候选选题。`);
  log("已提取：来源平台、选题方向、用户痛点、写作角度、风险提醒。");
  renderToday();
  setStep(5);
}

async function collectXAccounts() {
  const accounts = byId("xAccountsInput")?.value.trim() || "";
  const maxTweets = Math.max(5, Math.min(100, Number(byId("xMaxTweetsInput")?.value || 30)));
  const pages = Math.max(1, Math.min(5, Number(byId("xPagesInput")?.value || 1)));
  if (!accounts) {
    state.logs = ["请先输入至少一个 X 推主账号。"];
    state.assetStatus = "缺少 X 账号";
    renderToday();
    return;
  }
  state.logs = [];
  state.assetStatus = "正在采集 X";
  state.isCollectingX = true;
  log("开始采集 X 推主。");
  log(`账号：${accounts.replace(/\n+/g, " / ")}`);
  log(`每号采集：${maxTweets} 条，页数：${pages}`);
  log("好帖标准：优先看收藏、评论、转发，其次看正文信息量和赛道相关性。");
  renderToday();
  scheduleProgressLog("正在调用 XCrawl 读取推主最近帖子，通常需要 10-60 秒。", 1200);
  scheduleProgressLog("采集完成后会先筛掉纯链接、短碎片、弱互动帖子。", 4200);
  scheduleProgressLog("如果账号较多，请等控制台出现采集完成和本轮批次。", 9000);
  try {
    const res = await fetch(apiPath("/api/collectors/xcrawl/x-user-tweets-batch"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accounts, maxTweets, pages, labelType: "radar_seed" }),
    });
    const result = await res.json();
    if (!res.ok || !result.ok) throw new Error(result.message || result.error || `HTTP ${res.status}`);
    state.lastXRunIds = (result.results || []).map((item) => item.run?.id).filter(Boolean);
    state.useLatestXRunOnly = state.lastXRunIds.length > 0;
    log(`采集完成：成功账号 ${result.successCount || 0} 个，原始样本 ${result.totalSampleCount || 0} 条。`);
    if (state.lastXRunIds.length) log("本轮采集已保存，后续可继续复用。");
    log(`好帖候选：${result.candidateCount || 0} 条；淘汰：${result.rejectedCount || 0} 条。`);
    if (result.rejectedStats) log(`淘汰原因：${Object.entries(result.rejectedStats).map(([key, value]) => `${key} ${value}`).join(" / ") || "无"}`);
    const batchSamples = balanceXBatchSamples([
      ...(Array.isArray(result.candidates) ? result.candidates : []),
      ...(Array.isArray(result.assetBuckets?.goodPosts) ? result.assetBuckets.goodPosts : []),
    ]);
    const topics = await buildTopicsWithXHistoryBackfill(buildTopicsFromLiveXSamples(batchSamples));
    state.assets = result;
    state.topics = topics.slice(0, 10);
    state.selectedTopicId = "";
    state.titleChoices = [];
    state.titleChoiceKey = "";
    state.assetStatus = state.topics.length ? `本轮采集生成 ${state.topics.length} 个选题` : "本轮没有合格选题";
    state.isCollectingX = false;
    if (!state.topics.length) {
      log("本轮采集没有找到合适选题。请换账号、提高采集条数，或调整关键词。");
      renderToday();
      return;
    }
    log(`已基于本轮采集生成 ${state.topics.length} 个候选选题，不读取历史旧数据。`);
    renderToday();
    setStep(5);
  } catch (error) {
    state.assetStatus = "X 采集失败";
    state.isCollectingX = false;
    log(`X 采集失败：${error.message}`);
    renderToday();
  }
}

function balanceXBatchSamples(samples = []) {
  const seen = new Set();
  const unique = samples.filter((sample) => {
    const key = sample.sourceUrl || sample.url || sample.id || sample.title;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const groups = new Map();
  for (const sample of unique) {
    const account = sample.keyword || sample.authorName || "unknown";
    if (!groups.has(account)) groups.set(account, []);
    groups.get(account).push(sample);
  }
  for (const group of groups.values()) {
    group.sort((a, b) => (Number(b.contentValueScore || 0) + Number(b.radarScore || 0) / 1000) - (Number(a.contentValueScore || 0) + Number(a.radarScore || 0) / 1000));
  }
  const balanced = [];
  for (const group of groups.values()) balanced.push(...group.slice(0, 2));
  const used = new Set(balanced.map((sample) => sample.sourceUrl || sample.url || sample.id || sample.title));
  const rest = unique
    .filter((sample) => !used.has(sample.sourceUrl || sample.url || sample.id || sample.title))
    .sort((a, b) => (Number(b.contentValueScore || 0) + Number(b.radarScore || 0) / 1000) - (Number(a.contentValueScore || 0) + Number(a.radarScore || 0) / 1000));
  return [...balanced, ...rest].slice(0, 12);
}

async function buildTopicsWithXHistoryBackfill(liveTopics = []) {
  const targetCount = 8;
  if (liveTopics.length >= 6) return liveTopics.slice(0, 10);
  const previousUseLatest = state.useLatestXRunOnly;
  try {
    state.useLatestXRunOnly = false;
    const db = await loadState();
    const historyTopics = buildTopicsFromDb(db);
    const seen = new Set(liveTopics.map((topic) => topic.url || topic.id || topic.title).filter(Boolean));
    const merged = [...liveTopics];
    for (const topic of historyTopics) {
      const key = topic.url || topic.id || topic.title;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(topic);
      if (merged.length >= targetCount) break;
    }
    if (merged.length > liveTopics.length) {
      log(`本轮 X 优质候选 ${liveTopics.length} 个，已从历史 X 资产补到 ${merged.length} 个。`);
    }
    return merged.slice(0, 10);
  } catch (error) {
    log(`历史 X 资产补位失败：${error.message}`);
    return liveTopics.slice(0, 10);
  } finally {
    state.useLatestXRunOnly = previousUseLatest;
  }
}

function buildTopicsFromLiveXSamples(samples = []) {
  return samples
    .filter(Boolean)
    .map((item, index) => normalizeSample(item))
    .filter((sample) => cleanSourceText(`${sample.title} ${sample.body}`).length >= 30)
    .map((sample, index) => {
      const title = cleanSourceText(sample.title || sample.body || `X 素材 ${index + 1}`).slice(0, 72);
      const body = cleanSourceText(sample.body || "");
      const metrics = sample.metrics || {};
      const heat = Number(metrics.likes || 0)
        + Number(metrics.saves || metrics.bookmarks || 0) * 2
        + Number(metrics.comments || metrics.replies || 0) * 3
        + Number(metrics.shares || metrics.retweets || 0) * 3
        + Number(metrics.quotes || 0) * 3;
      const pain = inferLiveXTopicPain(title, body);
      return {
        id: sample.id || `live-x-topic-${index}-${Date.now()}`,
        title,
        theme: title,
        platform: "X",
        keyword: sample.keyword || "X 账号素材",
        url: sample.url || "",
        body,
        sourceInsight: {
          theme: title,
          pain,
          angle: "这条选题直接来自本轮 X 采集结果，优先学习它的观点、问题意识和结构，不照抄原文。",
        },
        metrics: {
          likes: metrics.likes || 0,
          saves: metrics.saves || metrics.bookmarks || 0,
          comments: metrics.comments || metrics.replies || 0,
          shares: metrics.shares || metrics.retweets || 0,
          heat,
        },
        reason: buildLiveXReason(sample, heat),
        pain,
        reuse: `可以先改成 ${currentTarget().title}，后续再扩展成公众号、短视频脚本和朋友圈内容。`,
        risk: "只学习观点、结构和用户问题，不复制原帖表达。",
        collectionStatus: "本轮真实采集",
      };
    })
    .sort((a, b) => Number(b.metrics?.heat || 0) - Number(a.metrics?.heat || 0))
    .slice(0, 10);
}

function inferLiveXTopicPain(title = "", body = "") {
  const text = cleanSourceText(`${title} ${body}`);
  const sentence = text.split(/[。！？?!\n]/).find((line) => /难|痛|卡|问题|为什么|怎么|如何|不懂|没效果|踩坑|焦虑|失败|浪费/.test(line));
  if (sentence) return sentence.slice(0, 96);
  if (/AI|Agent|内容|自媒体|写作|爆款|素材/.test(text)) {
    return "用户想用 AI 做内容和自媒体，但缺少可复用素材、判断标准和稳定流程。";
  }
  return "这条素材有可复用观点，需要结合目标平台重新找到用户痛点。";
}

function selectTopicForCreation(topicId = "") {
  const topic = state.topics.find((item) => String(item.id) === String(topicId));
  if (!topic) {
    log(`选题不存在或已过期：${topicId}`);
    return;
  }
  state.selectedTopicId = topic.id;
  clearAfter(5);
  state.titleChoices = buildCleanTitleChoices(topic);
  state.titleChoiceKey = currentTitleChoiceKey(topic);
  state.selectedTitle = "";
  state.draft = "";
  state.improvedDraft = "";
  state.copyConfirmed = false;
  state.copyVersions = [];
  state.currentCopyVersionId = "";
  state.confirmedCopyVersionId = "";
  state.draftReview = null;
  state.draftMeta = null;
  setStep(6);
}

function buildLiveXReason(sample = {}, heat = 0) {
  const parts = [];
  const metrics = sample.metrics || {};
  if (heat >= 50) parts.push("互动信号较强");
  if (Number(metrics.bookmarks || metrics.saves || 0) > 0) parts.push("有收藏价值");
  if (Number(metrics.replies || metrics.comments || 0) > 0) parts.push("有讨论信号");
  if (cleanSourceText(sample.body || "").length >= 120) parts.push("正文信息量足够");
  return parts.length
    ? `入选依据：${parts.join("；")}。`
    : "入选依据：来自本轮真实采集，适合人工判断是否继续创作。";
}

function scheduleProgressLog(message, ms) {
  setTimeout(() => {
    if (!state.isCollectingX) return;
    log(message);
    renderToday();
  }, ms);
}

async function readDemoMaterials() {
  state.logs = [];
  state.assetStatus = "本地预览样本";
  log("使用本地预览样本演示流程。");
  log("注意：这不是真实采集结果，只用于验证页面步骤是否能走通。");
  const db = sampleState();
  state.assets = db;
  state.topics = buildTopicsFromDb(db).slice(0, 10);
  state.selectedTopicId = "";
  state.titleChoices = [];
  state.titleChoiceKey = "";
  state.assetStatus = `预览 ${state.topics.length} 个选题`;
  renderToday();
  setStep(5);
}

async function loadState() {
  try {
    const params = new URLSearchParams({
      keywords: state.keywords,
      limit: "200",
    });
    const wanted = platformWanted();
    if (wanted !== "all") params.set("platform", wanted);
    if (state.sourceChannel === "x-history") {
      params.set("latestRunCount", "5");
      params.set("unusedOnly", "1");
      params.set("creationOnly", "1");
    }
    if (state.sourceChannel === "xhs" || (state.sourceChannel === "same-platform" && wanted === "xiaohongshu")) {
      if (state.materialScope === "latest") params.set("latestRunCount", String(Math.max(1, Math.min(10, Number(state.materialLatestRuns || 3)))));
      else params.set("latestRunCount", "0");
      params.set("unusedOnly", "1");
      params.set("creationOnly", "1");
    }
    if (wanted === "xiaohongshu" && state.materialScope === "author" && state.materialAuthor) {
      const existingKeywords = String(state.keywords || "").trim();
      params.set("keywords", `${existingKeywords} ${state.materialAuthor}`.trim());
      params.set("latestRunCount", "0");
    }
    if (state.sourceChannel === "x-live" && state.useLatestXRunOnly && state.lastXRunIds.length) {
      params.set("runIds", state.lastXRunIds.join(","));
      params.set("unusedOnly", "1");
      params.set("creationOnly", "1");
    }
    const res = await fetch(apiPath(`/api/content-assets/unified?${params.toString()}`));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    state.assetStatus = "已读取统一内容资产库";
    log(`统一内容资产库：读取 ${result.totalSourceSamples || 0} 条，匹配 ${result.matchedCount || 0} 条。`);
    let contentSamples = Array.isArray(result.assets) ? result.assets : [];
    if (wanted === "xiaohongshu" && state.materialScope === "author" && state.materialAuthor) {
      const authorNeedle = String(state.materialAuthor || "").toLowerCase().replace(/\s+/g, "");
      contentSamples = contentSamples.filter((item) => String(item.authorName || item.author || "").toLowerCase().replace(/\s+/g, "").includes(authorNeedle));
      result.assets = contentSamples;
      result.matchedCount = contentSamples.length;
    }
    return {
      contentSamples,
      rawMaterials: [],
      candidates: [],
      assets: [],
      unifiedAssets: result,
    };
  } catch (error) {
    state.assetStatus = "本地预览样本";
    log(`读取统一内容资产库失败：${error.message}`);
    return sampleState();
  }
}

async function loadFullAssetState() {
  try {
    const res = await fetch(apiPath("/api/state"));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const db = await res.json();
    return {
      ...db,
      contentSamples: Array.isArray(db.contentSamples) ? db.contentSamples : [],
      rawMaterials: Array.isArray(db.rawMaterials) ? db.rawMaterials : [],
      candidates: Array.isArray(db.candidates) ? db.candidates : [],
      assets: Array.isArray(db.assets) ? db.assets : [],
      finalWorks: Array.isArray(db.finalWorks) ? db.finalWorks : [],
    };
  } catch (error) {
    console.warn("loadFullAssetState failed", error);
    return {
      contentSamples: [],
      rawMaterials: [],
      candidates: [],
      assets: [],
      finalWorks: [],
    };
  }
}

async function syncLocalFinalWorksToServer(localWorks = [], remoteWorks = []) {
  const remoteIds = new Set(remoteWorks.map((item) => item?.id).filter(Boolean));
  const missing = localWorks.filter((item) => item?.id && item.body && !remoteIds.has(item.id)).slice(0, 30);
  if (!missing.length) return { uploaded: 0, finalWorks: remoteWorks };
  let uploaded = 0;
  for (const work of missing) {
    try {
      const res = await fetch(apiPath("/api/final-works"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ work }),
      });
      const result = await res.json();
      if (res.ok && result.ok) uploaded += 1;
    } catch (error) {
      log(`本机旧作品同步失败：${work.title || work.id} / ${error.message}`);
    }
  }
  try {
    const res = await fetch(apiPath("/api/final-works"));
    const result = await res.json();
    if (res.ok && result.ok && Array.isArray(result.finalWorks)) {
      return { uploaded, finalWorks: result.finalWorks };
    }
  } catch (error) {
    log(`同步后读取 122 作品库失败：${error.message}`);
  }
  return { uploaded, finalWorks: remoteWorks };
}

function sourceTitleForTarget() {
  if (state.sourceChannel !== "same-platform") return currentSource().title;
  const map = {
    xhs: "小红书同平台素材",
    douyin: "抖音同平台素材",
    "video-account": "视频号同平台素材",
    "wechat-article": "公众号长文同平台素材",
    moments: "朋友圈私域素材",
    "topic-only": "全库选题资产",
  };
  return map[state.publishTarget] || currentSource().title;
}

function platformWanted() {
  if (state.sourceChannel === "same-platform") return currentTarget().platform;
  if (state.sourceChannel === "xhs") return "xiaohongshu";
  if (state.sourceChannel === "x-history") return "x";
  if (state.sourceChannel === "x-live") return "x";
  if (state.sourceChannel === "manual") return "manual";
  return "all";
}

function buildTopicsFromDb(db) {
  const keywords = tokenize(state.keywords);
  const rawSamples = [
    ...(Array.isArray(db.contentSamples) ? db.contentSamples : []),
    ...(Array.isArray(db.rawMaterials) ? db.rawMaterials : []),
    ...(Array.isArray(db.candidates) ? db.candidates : []),
    ...(Array.isArray(db.assets) ? db.assets : []),
  ];
  const normalized = rawSamples
    .filter((item) => item && (item.title || item.text || item.content || item.body || item.copy || item.structured))
    .map(normalizeSample)
    .filter(matchesWantedPlatform);
  if (state.sourceChannel === "x-history" || state.sourceChannel === "x-live") {
    const xScored = normalized
      .map((sample) => ({ sample, score: scoreSample(sample, keywords), eligibility: judgeMotherTopicEligibility(sample) }))
      .filter((item) => shouldKeepXSample(item, keywords))
      .sort(sortXHistorySample);
    const balanced = balanceXHistoryScored(xScored);
    return dedupeMotherTopics(balanced.map(({ sample, eligibility }, index) => {
      const topic = makeMotherTopic(sample, index, eligibility);
      if (!eligibility.pass && eligibility.blockers?.length) {
        topic.reason = `真实 X 素材，建议人工判断后再用；风险：${eligibility.blockers.slice(0, 2).join("；")}。`;
      }
      return topic;
    })).slice(0, 10);
  }
  const scored = normalized
    .map((sample) => ({ sample, score: scoreSample(sample, keywords), eligibility: judgeMotherTopicEligibility(sample) }))
    .filter((item) => shouldKeepScoredSample(item, keywords))
    .filter((item) => item.eligibility.pass)
    .sort((a, b) => b.score - a.score);
  return dedupeMotherTopics(scored.map(({ sample, eligibility }, index) => makeMotherTopic(sample, index, eligibility))).slice(0, 10);
}

function dedupeMotherTopics(topics = []) {
  const seen = new Set();
  const unique = [];
  for (const topic of topics) {
    const key = motherTopicKey(topic);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(topic);
  }
  return unique;
}

function motherTopicKey(topic = {}) {
  if (state.sourceChannel === "x-history" || state.sourceChannel === "x-live" || topic.platform === "xiaohongshu") {
    return topic.url || topic.id || cleanSourceText(topic.title || topic.theme || "").slice(0, 80);
  }
  const text = `${topic.theme} ${topic.sourceInsight?.angle || ""}`.toLowerCase();
  if (/同质化|模板|规范|点击/.test(text)) return "ai-content-template-risk";
  if (/拆文|爆款|关键|提示词/.test(text)) return "viral-deconstruction-missing-layer";
  if (/社群|同频|连接/.test(text)) return "community-filtering";
  if (/素材|清洗|去重|资产/.test(text)) return "content-asset-cleaning";
  return cleanSourceText(topic.theme || topic.title || "").slice(0, 28);
}

function shouldKeepScoredSample(item, keywords) {
  if (item.sample.platform === "xiaohongshu" && item.sample.readyForCreation === true) return true;
  if (!keywords.length) return state.sourceChannel === "all-assets";
  if (item.score > 0) return true;
  return false;
}

function shouldKeepXSample(item, keywords) {
  const text = cleanSourceText(`${item.sample.title} ${item.sample.body}`);
  const tier = String(item.sample.assetTier || "");
  const explicitGood = item.sample.keepForCreation === true || tier === "mother_topic_candidate";
  if (text.length < 20) return false;
  if (/^rt\s*@/i.test(text) || /^杞彂/.test(text)) return false;
  if (/^https?:\/\/\S+$/i.test(text)) return false;
  if (explicitGood) return true;
  if (item.sample.rejectReason && item.sample.rejectReason !== "weak_content_signal") return false;
  if (!keywords.length) return (item.sample.contentValueScore || 0) >= 55;
  if (item.score > 0 && (item.sample.contentValueScore || 0) >= 55) return true;
  return item.score > 0 && (item.eligibility.heat || 0) >= 50 && text.length >= 80;
}

function sortXHistorySample(a, b) {
  const bt = Date.parse(b.sample.collectedAt || b.sample.createdAt || 0) || 0;
  const at = Date.parse(a.sample.collectedAt || a.sample.createdAt || 0) || 0;
  return bt - at
    || Number(b.sample.keepForCreation === true) - Number(a.sample.keepForCreation === true)
    || Number(b.sample.contentValueScore || 0) - Number(a.sample.contentValueScore || 0)
    || (b.score + (b.eligibility.heat || 0) / 100) - (a.score + (a.eligibility.heat || 0) / 100);
}

function balanceXHistoryScored(items = []) {
  const good = items.filter((item) => item.sample.keepForCreation === true || item.sample.assetTier === "mother_topic_candidate");
  const backup = items.filter((item) => !(item.sample.keepForCreation === true || item.sample.assetTier === "mother_topic_candidate"));
  const groups = new Map();
  for (const item of good) {
    const account = item.sample.keyword || item.sample.authorName || item.sample.author || item.sample.source || "unknown";
    if (!groups.has(account)) groups.set(account, []);
    groups.get(account).push(item);
  }
  const picked = [];
  for (const group of groups.values()) picked.push(...group.slice(0, 2));
  const used = new Set(picked.map((item) => item.sample.url || item.sample.id || item.sample.title));
  const restGood = good.filter((item) => !used.has(item.sample.url || item.sample.id || item.sample.title));
  const restBackup = backup.filter((item) => !used.has(item.sample.url || item.sample.id || item.sample.title));
  return [...picked, ...restGood, ...restBackup];
}

function judgeMotherTopicEligibility(sample = {}) {
  if (sample.platform === "xiaohongshu" && sample.readyForCreation === true) {
    return {
      pass: true,
      reasons: [sample.qualityLabel || "小红书图文正文完整，适合进入二创"],
      blockers: [],
      heat: Number(sample.metrics?.likes || 0)
        + Number(sample.metrics?.collects || sample.metrics?.saves || 0) * 1.2
        + Number(sample.metrics?.comments || 0) * 2
        + Number(sample.metrics?.shares || 0) * 2,
    };
  }
  const text = cleanSourceText(`${sample.title} ${sample.body}`);
  const metrics = sample.metrics || {};
  const heat = Number(metrics.likes || 0)
    + Number(metrics.bookmarks || metrics.saves || metrics.collects || 0) * 1.2
    + Number(metrics.replies || metrics.comments || 0) * 2
    + Number(metrics.retweets || metrics.shares || 0) * 2
    + Number(metrics.quotes || 0) * 1.5;
  const reasons = [];
  if (text.length >= 70) reasons.push("内容信息量足够，能拆出观点或方法");
  if (heat >= 30) reasons.push("互动数据有信号");
  if (/AI|自媒体|公众号|小红书|爆款|拆文|提示词|素材|同质化|模板|社群|内容/.test(text)) reasons.push("与当前赛道相关");
  if (/怎么|为什么|问题|经验|方法|总结|避坑|拆|复盘|真正|关键|别|不要|发现/.test(text)) reasons.push("有可二创的表达角度");

  const blockers = [];
  if (text.length < 35) blockers.push("正文太短");
  if (/^rt\s*@/i.test(text) || /^转发/.test(text)) blockers.push("疑似转发内容");
  if (/^https?:\/\/\S+$/i.test(text)) blockers.push("纯链接内容");
  if (heat < 8 && text.length < 120) blockers.push("热度和信息量都偏弱");

  return {
    pass: blockers.length === 0 && reasons.length >= 2,
    reasons,
    blockers,
    heat,
  };
}

function tokenize(value) {
  return String(value || "")
    .split(/[,，、\s]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function matchesWantedPlatform(sample) {
  const wanted = platformWanted();
  if (wanted === "all") return true;
  const haystack = `${sample.platform} ${sample.source} ${sample.sourceTool} ${sample.type} ${sample.url}`.toLowerCase();
  if (wanted === "xiaohongshu") return /xiaohongshu|xhs|小红书/.test(haystack);
  if (wanted === "x") return /\b(x|twitter|xcrawl)\b|x\.com|twitter\.com/.test(haystack);
  if (wanted === "douyin") return /douyin|抖音/.test(haystack);
  if (wanted === "wechat") return /wechat|公众号|mp\.weixin/.test(haystack);
  if (wanted === "video") return /video|视频号/.test(haystack);
  if (wanted === "moments") return /moments|朋友圈|私域|manual/.test(haystack);
  if (wanted === "manual") return /manual|手动|import/.test(haystack);
  return true;
}

function scoreSample(sample, keywords) {
  const text = `${sample.title} ${sample.body} ${sample.keyword} ${sample.author || ""}`.toLowerCase();
  const compactText = text.replace(/\s+/g, "");
  const keywordScore = keywords.reduce((sum, keyword) => {
    const compactKeyword = keyword.replace(/\s+/g, "");
    if (text.includes(keyword) || compactText.includes(compactKeyword)) return sum + 14;
    const parts = expandKeywordParts(keyword);
    const matched = parts.filter((part) => text.includes(part) || compactText.includes(part.replace(/\s+/g, ""))).length;
    if (matched >= Math.min(2, parts.length)) return sum + 8 + matched * 2;
    return sum;
  }, 0);
  const metrics = sample.metrics || {};
  const heat = Number(metrics.likes || metrics.like || metrics["赞"] || metrics["点赞"] || 0)
    + Number(metrics.saves || metrics.collects || metrics["藏"] || metrics["收藏"] || 0) * 1.2
    + Number(metrics.comments || metrics["评"] || metrics["评论"] || 0) * 2;
  return keywordScore + Math.min(heat / 500, 20);
}

function expandKeywordParts(keyword) {
  const value = String(keyword || "").toLowerCase().replace(/[，、]/g, " ");
  const parts = value.split(/\s+/).filter(Boolean);
  if (/ai/.test(value)) parts.push("ai", "提示词", "自媒体", "内容");
  if (/agent|工作流/.test(value)) parts.push("agent", "工作流", "自动化");
  if (/内容资产|素材库|资产库/.test(value)) parts.push("内容", "素材", "资产", "知识库");
  return [...new Set(parts.filter((part) => part.length >= 2 || part === "ai"))];
}

function normalizeSample(item) {
  const structured = item.structured || {};
  const metrics = item.metrics || {
    likes: item.likes || item.likeCount || item.liked_count || item.heat,
    saves: item.saves || item.collects || item.collected_count,
    comments: item.comments || item.comment_count,
    shares: item.shares || item.share_count,
  };
  return {
    id: item.id || item.sourceSampleId || item.topicId || item.noteId,
    title: item.title || item.text || structured.selectedTitle || structured.keyword || "未命名素材",
    body: item.content || item.body || item.copy || item.desc || structured.body || structured.xhsCopy?.body || "",
    platform: item.platform || item.sourcePlatform || item.type || "内容资产库",
    source: item.source || item.sourceName || "",
    sourceTool: item.sourceTool || item.collector || "",
    type: item.type || "",
    keyword: item.keyword || item.sourceKeyword || structured.keyword || "",
    url: item.url || item.sourceUrl || item.noteUrl || "",
    keepForCreation: item.keepForCreation,
    assetTier: item.assetTier || item.asset_tier || "",
    rejectReason: item.rejectReason || item.reject_reason || "",
    contentValueScore: Number(item.contentValueScore || item.content_value_score || 0),
    radarScore: Number(item.radarScore || item.radar_score || 0),
    mediaType: item.mediaType || item.media?.type || "",
    qualityTier: item.qualityTier || "",
    qualityLabel: item.qualityLabel || "",
    readyForCreation: item.readyForCreation === true,
    needsTranscript: item.needsTranscript === true,
    bodyCompleteness: item.bodyCompleteness || "",
    qualityReasons: Array.isArray(item.qualityReasons) ? item.qualityReasons : [],
    collectedAt: item.collectedAt || item.collected_at || "",
    createdAt: item.createdAt || item.created_at || "",
    metrics,
    collectionStatus: item.collectionStatus || item.status || "real",
    reason: item.angle || item.reason || "",
    risk: Array.isArray(item.riskNotes) ? item.riskNotes.join("；") : item.riskNotes,
  };
}

function makeMotherTopic(sample, index, eligibility = judgeMotherTopicEligibility(sample)) {
  const sourceInsight = extractSourceInsight(sample);
  const pain = inferPain(sample, sourceInsight);
  const theme = inferTheme(sample, sourceInsight);
  return {
    id: sample.id || `topic-${index}-${Date.now()}`,
    title: sample.title,
    theme,
    platform: sample.platform || "内容资产库",
    keyword: sample.keyword || state.keywords,
    url: sample.url || "",
    body: sample.body || "",
    sourceInsight,
    metrics: sample.metrics || {},
    reason: sample.reason || `入选理由：${eligibility.reasons.slice(0, 3).join("；")}。`,
    pain,
    reuse: reuseLineForTarget(theme),
    risk: sample.risk || "复制结构和洞察，不照抄标题、正文、案例和承诺。",
    eligibility,
    collectionStatus: sample.collectionStatus || "real",
  };
}

function inferTheme(sample, pain) {
  const insight = extractSourceInsight(sample);
  const title = cleanSourceText(sample.title || "");
  if (title && title.length <= 42 && !looksLikeGenericDiagnosis(title)) return title;
  if (insight.theme) return insight.theme;
  if (title) return title.slice(0, 42);
  return `${state.businessLine}里一个值得反复改写的选题`;
}

function inferPain(sample, sourceInsight = extractSourceInsight(sample)) {
  const text = cleanSourceText(`${sample.title} ${sample.body}`);
  const match = text.match(/[^。！？\n]*(不知道|怎么|为什么|到底|不会|分不清|没效果|没流量|没人看|卡住|走弯路|焦虑)[^。！？\n]*/);
  if (match && !looksLikeGenericDiagnosis(match[0])) return match[0].slice(0, 90);
  if (sourceInsight.pain) return sourceInsight.pain;
  return `做 ${state.businessLine} 的人，最怕不是不会用工具，而是看不出什么内容值得拆、怎么改才不像模板。`;
}

function extractSourceInsight(sample = {}) {
  const title = cleanSourceText(sample.title || "");
  const body = cleanSourceText(sample.body || "");
  const text = `${title}\n${body}`;
  if (/套路|模板|同质化|规范|点击/.test(text)) {
    return {
      theme: "AI 自媒体内容别再套模板，平台已经开始打同质化",
      pain: "很多人用 AI 写得更快了，但内容越来越像模板，担心没流量甚至被平台判低质。",
      angle: "从平台规则和同质化风险切入，讲普通人如何把 AI 内容写得更像自己的经验。",
    };
  }
  if (/拆文|爆款|100篇|关键的一层|提示词/.test(text)) {
    return {
      theme: "拆了很多爆款还不火，可能漏掉了真正该拆的一层",
      pain: "很多人只抄标题和结构，却没有拆出爆款背后的用户问题、情绪和行动理由。",
      angle: "从拆爆款的误区切入，讲如何从素材里提炼选题、痛点和表达节奏。",
    };
  }
  if (/社群|同频|创业者|连接/.test(text)) {
    return {
      theme: "做 AI 自媒体，不只是发内容，还要筛选同频的人",
      pain: "很多人发了很多内容，但没有把内容变成筛选客户、连接同频人的入口。",
      angle: "从社群和同频连接切入，讲内容如何承担获客和筛选用户的功能。",
    };
  }
  if (/素材|清洗|去重|素材功能/.test(text)) {
    return {
      theme: "AI 内容工厂真正卡住的，往往是素材清洗和去重",
      pain: "很多人以为内容生产难在生成，其实难在素材太乱、重复太多、无法稳定复用。",
      angle: "从素材工程切入，讲内容资产库为什么比单次写作更重要。",
    };
  }
  if (title) {
    return {
      theme: title.slice(0, 42),
      pain: `这条素材暴露的问题是：${title.slice(0, 70)}`,
      angle: "从源头素材的真实观点切入，改写成适合目标平台的内容。",
    };
  }
  return { theme: "", pain: "", angle: "" };
}

function cleanSourceText(value = "") {
  return String(value || "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeGenericDiagnosis(value = "") {
  return /用户关心|判断标准|行动入口|更具体/.test(String(value || ""));
}

function reuseLineForTarget(theme) {
  return `选题“${theme}”后续可改成小红书图文、公众号长文、短视频脚本和朋友圈文案。`;
}

async function ensureTitleAssetsForCurrentTopic() {
  const topic = selectedTopic();
  if (!topic || state.titleAssetLoading) return;
  const key = [
    state.publishTarget,
    state.keywords,
    topic.id,
    topic.theme || topic.title || "",
  ].join("|");
  if (state.titleAssetKey === key) return;
  state.titleAssetKey = key;
  state.titleAssetLoading = true;
  state.titleAssetMessage = "";
  try {
    const params = new URLSearchParams({
      keywords: [state.keywords, topic.theme, topic.title].filter(Boolean).join(","),
      platform: currentTarget().platform || "",
      limit: "40",
    });
    const res = await fetch(apiPath(`/api/title-assets?${params.toString()}`));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    state.titleAssets = Array.isArray(result.titles) ? result.titles : [];
    state.titleAssetMessage = result.filterMiss
      ? "当前方向标题资产不足：本次先基于当前选题生成临时标题，标题库只做辅助参考。"
      : `当前方向已匹配 ${state.titleAssets.length} 条标题资产，候选标题会参考真实爆款公式，但仍优先绑定当前选题。`;
    state.titleChoiceKey = "";
    ensureFreshTitleChoices(state.titleAssets);
    if (!state.titleChoices.some((item) => item.title === state.selectedTitle)) state.selectedTitle = "";
  } catch (error) {
    state.titleAssets = [];
    state.titleAssetMessage = `标题资产读取失败：${error.message}`;
  } finally {
    state.titleAssetLoading = false;
    if (state.step === 6) renderToday();
  }
}

function buildAssetBackedTitleChoices(topic, assets = []) {
  const seed = buildTitleSeed(topic);
  const usable = assets.filter((item) => item && item.title).slice(0, 18);
  const groups = groupTitleAssets(usable).slice(0, 5);
  return groups.map((group, index) => {
    const example = group.items[0] || usable[index] || {};
    const title = rewriteTitleFromAsset(seed, group.name, example.title || "");
    const metrics = example.metrics || {};
    const proof = metrics.likes || metrics.saves || metrics.comments
      ? `赞${metrics.likes || 0}/藏${metrics.saves || 0}/评${metrics.comments || 0}`
      : "真实标题资产";
    return titleChoice(title, `${group.name}：参考《${example.title || "标题资产"}》，${proof}`);
  });
}

function rewriteTitleFromAsset(seed, formula = "", example = "") {
  const core = seed.core || state.businessLine;
  const problem = seed.problem || `${core}没效果`;
  const scene = seed.scene || `做${core}`;
  const audience = seed.audience || "普通人";
  const mark = `${formula} ${example}`;
  if (/认知|冲突|对比|不是|而是/.test(mark)) return `${core}真正难的，不是工具`;
  if (/损失|避坑|别|警告|不要/.test(mark)) return `别急着做${core}，先看这一步`;
  if (/数字|清单|\d/.test(mark)) return `${audience}做${core}，先存这 5 类素材`;
  if (/结果|承诺|如何|怎么/.test(mark)) return `如何把${scene}变成稳定选题`;
  if (/经验|案例|复盘|我/.test(mark)) return `我做${core}后才明白的一件事`;
  if (/争议|互动|测试|问题/.test(mark)) return `${problem}，到底卡在哪一步？`;
  return `${core}不是照抄爆款，而是先建资产`;
}

function currentTitleChoiceKey(topic = selectedTopic()) {
  if (!topic) return "";
  return [
    TITLE_LOGIC_VERSION,
    state.publishTarget,
    state.keywords,
    topic.id,
    topic.title || "",
    topic.theme || "",
  ].join("|");
}

function ensureFreshTitleChoices(titleAssets = state.titleAssets) {
  const topic = selectedTopic();
  if (!topic) return;
  const key = currentTitleChoiceKey(topic);
  if (state.titleChoiceKey === key && state.titleChoices.length) return;
  state.titleChoiceKey = key;
  state.titleChoices = buildCleanTitleChoices(topic, titleAssets);
  if (!state.titleChoices.some((item) => item.title === state.selectedTitle)) state.selectedTitle = "";
}

function topicTextForTitle(topic = {}) {
  return cleanSourceText([
    topic.theme,
    topic.title,
    topic.body,
    topic.content,
    topic.raw?.title,
    topic.raw?.theme,
    topic.raw?.text,
    topic.raw?.content,
    topic.raw?.description,
  ].filter(Boolean).join(" "));
}

function extractTopicSignals(topic = {}) {
  const text = topicTextForTitle(topic);
  const hasCaseProof = /(?:收益|收入|变现|利润|流量|阅读|播放|涨粉|曝光|点赞|收藏|成交)[^，。！？\d]{0,12}\d|\d+(?:\.\d+)?\s*[万千百kK]?\+?\s*(?:曝光|阅读|播放|点赞|收藏|涨粉|收益|收入|成交|变现)/.test(text);
  const caseSignal = hasCaseProof ? extractCaseTitleSignal(text) : null;
  if (caseSignal) return caseSignal;
  const clauses = text
    .split(/[。！？?!\n\r]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 4)
    .slice(0, 8);
  const keep = [];
  const push = (value) => {
    const word = String(value || "").trim();
    if (word && !keep.includes(word) && keep.length < 8) keep.push(word);
  };
  const tokenPattern = /[A-Za-z][A-Za-z0-9_-]{1,20}|[\u4e00-\u9fa5]{2,12}/g;
  for (const match of text.matchAll(tokenPattern)) {
    const word = match[0];
    if (/^(这个|那个|因为|所以|但是|如果|不是|而是|真正|可以|已经|现在|昨天|今天|一个|一种|很多|时候|内容|选题|素材)$/.test(word)) continue;
    if (/AI|Agent|FDE|自媒体|企业|落地|组织|工作流|岗位|采购|部署|培训|知识库|资产库|小红书|公众号|视频号|朋友圈|模型|爆款|人味|复写|复盘|工具/.test(word)) push(word);
  }
  const contrast = text.match(/不是([^，。！？?；]{2,24})[，；]?\s*而是([^，。！？?；]{2,32})/);
  const cleanKeywords = keep.filter((item) => isGoodTitleSlot(item));
  const sourceTitle = cleanSourceText(topic.title || topic.theme || clauses[0] || "").slice(0, 42);
  const main = cleanTitleSlot(cleanKeywords[0] || sourceTitle || state.businessLine);
  const second = cleanTitleSlot(cleanKeywords.find((item) => item !== main) || inferSurfaceMisread(text) || state.businessLine || "这件事");
  const third = cleanTitleSlot(cleanKeywords.find((item) => item !== main && item !== second) || inferRealValue(text) || "关键变化");
  return {
    text,
    clauses,
    keywords: cleanKeywords,
    main,
    second,
    third,
    sourceTitle,
    contrastA: contrast?.[1]?.trim() || "",
    contrastB: contrast?.[2]?.trim() || "",
  };
}

function extractCaseTitleSignal(text = "") {
  const clean = cleanSourceText(text);
  const money = clean.match(/(?:收益|收入|变现|利润|流量|阅读|播放|涨粉)[^，。！？]{0,12}?(\d+(?:\.\d+)?\s*[万千百kK]?\+?)/);
  const daily = /一天|每日|每天|日更|24h|24小时/.test(clean);
  const account = clean.match(/([^，。！？\s]{0,10}(?:公众号流量主|公众号|小红书账号|账号|视频号|自媒体|项目|副业))/);
  const location = clean.match(/(小地方|县城|本地|三四线|大城市|普通人|新人|新手)/);
  if (!money && !account) return null;
  const main = cleanTitleSlot(account?.[1] || location?.[1] || "这个真实案例").replace(/^.*?(公众号流量主|公众号|小红书账号|账号|视频号|自媒体|项目|副业)$/, "$1");
  const result = cleanTitleSlot(`${daily ? "一天" : ""}${money ? `${money[1]}收益` : "跑出结果"}`);
  const contrastA = cleanTitleSlot(location?.[1] || "大城市流量");
  const contrastB = cleanTitleSlot(result || "稳定收益");
  return {
    text: clean,
    clauses: [clean.slice(0, 80)],
    keywords: [main, result, contrastA, contrastB].filter(Boolean),
    main,
    second: contrastA,
    third: contrastB,
    sourceTitle: clean.slice(0, 42),
    contrastA,
    contrastB,
    mode: "case",
  };
}

function inferSurfaceMisread(text = "") {
  if (/收益|收入|变现|利润/.test(text)) return "大城市流量";
  if (/AI|Agent|工具/.test(text)) return "买工具";
  if (/标题|爆款|流量/.test(text)) return "套公式";
  return state.businessLine || "表面动作";
}

function inferRealValue(text = "") {
  if (/收益|收入|变现|利润/.test(text)) return "真实收益模型";
  if (/案例|数据|实操|复盘/.test(text)) return "真实案例";
  if (/AI|Agent|工具/.test(text)) return "工作流变化";
  if (/内容|素材|资产/.test(text)) return "内容资产";
  return "关键变化";
}

function buildTopicDrivenTitleChoices(topic = {}) {
  const signal = extractTopicSignals(topic);
  if (!signal.text || signal.text.length < 8) return [];
  return dedupeTitleChoices(titleFormulaLibraryForTarget(state.publishTarget).map((formula) => {
    const title = applyTitleFormula(formula, signal);
    return titleChoice(title, `公式：${formula.name} · 替换：${formula.slots.join(" / ")} · 绑定当前选题`);
  }));
}

function titleFormulaLibraryForTarget(target) {
  const common = [
    { name: "不是 A，而是 B", pattern: "contrast", slots: ["选题", "表层认知", "真实变化"] },
    { name: "别把 X 当成 Y", pattern: "misread", slots: ["选题", "误区"] },
    { name: "X 背后真正变的是 Y", pattern: "behind", slots: ["选题", "真实变化"] },
    { name: "为什么 X 会影响 Y", pattern: "why-impact", slots: ["选题", "影响对象"] },
    { name: "普通人看 X，先抓 3 点", pattern: "three-points", slots: ["选题"] },
  ];
  if (target === "moments") {
    return [
      { name: "最近重新理解 X", pattern: "moments-observe", slots: ["选题"] },
      { name: "以前以为是 A，其实是 B", pattern: "moments-contrast", slots: ["表层认知", "真实变化"] },
      { name: "X 让我停下来的点", pattern: "moments-stop", slots: ["选题", "真实变化"] },
      { name: "关于 X，我现在更在意 Y", pattern: "moments-care", slots: ["选题", "真实变化"] },
      { name: "今天看到一个 X 判断", pattern: "moments-note", slots: ["选题"] },
    ];
  }
  if (target === "wechat-article") {
    return [
      common[0],
      { name: "从 X 看懂 Y", pattern: "from-to", slots: ["选题", "真实变化"] },
      { name: "X 背后的真正问题", pattern: "deep-problem", slots: ["选题", "表层认知"] },
      common[3],
      { name: "X 之后，Y 怎么重新理解", pattern: "after-rethink", slots: ["选题", "影响对象"] },
    ];
  }
  if (target === "douyin" || target === "video-account") {
    return [
      common[0],
      { name: "X 不是新概念", pattern: "not-new", slots: ["选题", "真实变化"] },
      common[1],
      common[2],
      common[3],
    ];
  }
  return common;
}

function applyTitleFormula(formula, signal) {
  const main = cleanTitleSlot(signal.main);
  const second = cleanTitleSlot(signal.contrastA || signal.second);
  const third = cleanTitleSlot(signal.contrastB || signal.third);
  const impact = cleanTitleSlot(signal.keywords.find((item) => item !== main && item !== second && item !== third) || signal.second);
  if (signal.mode === "case") {
    const caseMap = {
      contrast: `${main}的重点不是${second}，而是${third}`,
      misread: `别把${main}只看成${second}`,
      behind: `${main}背后，藏着一套${third}`,
      "why-impact": `为什么${main}能跑出${third}`,
      "three-points": `${main}这件事，先拆清 3 个信号`,
      "not-new": `${main}不是偶然，真正关键是${third}`,
    };
    if (caseMap[formula.pattern]) return caseMap[formula.pattern];
  }
  const map = {
    contrast: `${main}的重点不是${second}，而是${third}`,
    misread: `别再把${main}只理解成${second}`,
    behind: `${main}背后，真正变的是${third}`,
    "why-impact": `为什么${main}会影响${impact}`,
    "three-points": `普通人看${main}，先抓住这 3 个变化`,
    "moments-observe": `我最近重新理解了${main}`,
    "moments-contrast": `以前我也以为关键是${second}，后来发现是${third}`,
    "moments-stop": `${main}这事，真正让我停下来的点是${third}`,
    "moments-care": `关于${main}，我现在更在意${third}`,
    "moments-note": `今天看到一个关于${main}的判断，挺值得拆`,
    "from-to": `从${main}看懂${third}：为什么这不是一次普通变化`,
    "deep-problem": `${main}背后的真正问题：${second}只是表层`,
    "after-rethink": `${main}之后，${impact}应该怎么重新理解`,
    "not-new": `${main}不是新概念，真正变的是${third}`,
  };
  return map[formula.pattern] || `${main}真正该看的，不是${second}，而是${third}`;
}

function cleanTitleSlot(value = "") {
  const clean = cleanSourceText(value)
    .replace(/^(关于|这个|那个|一种|一个|很多|真正|关键|当前)/, "")
    .replace(/(可以先改成|后续再扩展成|视频号短视频|抖音短视频|公众号长文|小红书图文|朋友圈文案|短视频脚本|平台成品|发布目标)/g, "")
    .replace(/[，、。！？；：,.!?;:]+$/g, "")
    .trim();
  return clean.length > 18 ? clean.slice(0, 18) : clean || state.businessLine || "这件事";
}

function isGoodTitleSlot(value = "") {
  const clean = cleanTitleSlot(value);
  if (!clean || clean.length < 2) return false;
  if (/视频号短视频|公众号|朋友圈|后续|扩展|当前选题|发布目标|目标平台|生成|标题|正文|平台成品/.test(clean)) return false;
  if (/^[\d\s]+$/.test(clean)) return false;
  return true;
}

function buildTitleChoices(topic, titleAssets = state.titleAssets) {
  return buildCleanTitleChoices(topic, titleAssets);
}

function buildTitleSeed(topic = {}) {
  const sourceText = cleanSourceText([
    topic.theme,
    topic.title,
    topic.pain,
    topic.reason,
    topic.reuse,
    topic.content,
  ].filter(Boolean).join(" "));
  const text = sourceText || state.businessLine;
  const hasAsset = /资产库|素材库|知识库|语料库|内容库/.test(text);
  const hasAgent = /Agent|智能体|工作流|自动化/.test(text);
  const hasAiTaste = /AI味|AI 味|不像人|模板|同质化/.test(text);
  const hasNoTopic = /不知道发什么|选题|话题|素材/.test(text);
  const asset = hasAsset ? "内容资产库" : hasAgent ? "Agent 工作流" : hasAiTaste ? "人味素材库" : "素材库";
  const core = hasAsset ? "内容资产库" : hasAgent ? "Agent 工作流" : state.businessLine;
  const scene = hasNoTopic ? "每天不知道发什么" : hasAiTaste ? "写出来总有 AI 味" : hasAgent ? "Agent 总是跑偏" : `做${state.businessLine}`;
  const problem = hasNoTopic ? "每天不知道发什么" : hasAiTaste ? "文案越来越像 AI" : hasAgent ? "Agent 工作流总卡壳" : `${state.businessLine}没效果`;
  const audience = /普通人|新手|小白/.test(text) ? "普通人" : /公众号|小红书|自媒体/.test(text) ? "自媒体人" : "内容创作者";
  const sourceType = hasAsset ? "asset" : hasAgent ? "agent" : hasAiTaste ? "humanize" : /公众号|长文/.test(text) ? "longform" : "general";
  return { asset, core, scene, problem, audience, sourceType };
}

function xhsTitlePoolForSeed(seed) {
  return [
    { title: `${seed.problem}？先看这一步`, reason: "通用避坑：保底但绑定问题。" },
    { title: `${seed.audience}最容易忽略的内容动作`, reason: "人群代入：降低门槛。" },
    { title: `${seed.core}不是照抄爆款`, reason: "观点型：适合二创解释。" },
    { title: `为什么你做${seed.core}总是没结果？`, reason: "问题型：引出诊断。" },
    { title: `想做好${seed.core}，先存这张清单`, reason: "收藏型：适合图文。" },
  ];
}
function titleChoice(title, reason) {
  return { title: trimTitleForTarget(title, state.publishTarget), reason };
}

function titleMaxLengthForTarget(target = state.publishTarget) {
  if (target === "xhs") return 20;
  if (target === "moments") return 32;
  if (target === "douyin" || target === "video-account") return 30;
  return 60;
}

function titleCharLength(title = "") {
  return Array.from(String(title || "").trim()).length;
}

function normalizeTitleText(value = "") {
  return String(value || "")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/#([^#\s]+)\[.*?\]#/g, "$1")
    .replace(/[#@]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function polishTitleText(title = "") {
  return normalizeTitleText(title)
    .replace(/MVP\u771f\u6b63/g, "MVP \u771f\u6b63")
    .replace(/MVP\u4e4b/g, "MVP \u4e4b")
    .replace(/MVP\u60f3/g, "MVP \u60f3")
    .replace(/AI\u5de5\u5177/g, "AI \u5de5\u5177")
    .replace(/\s+/g, " ")
    .trim();
}

function trimTitleForTarget(title = "", target = state.publishTarget) {
  const clean = polishTitleText(title);
  if (target === "wechat-article") return clean;
  const max = titleMaxLengthForTarget(target);
  const chars = Array.from(clean);
  if (chars.length <= max) return clean;
  return chars.slice(0, max).join("").replace(/[\uFF0C\u3002\uFF01\uFF1F\uFF1B\uFF1A,.!?;:]$/g, "").trim();
}

function clampTitle(title = "") {
  return trimTitleForTarget(title, state.publishTarget);
}

function dedupeTitleChoices(items = []) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    if (!item?.title) continue;
    const key = normalizeTitleText(item.title).replace(/[\uFF0C\u3002\uFF01\uFF1F\uFF1B\uFF1A,.!?;:\s]/g, "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result.slice(0, 5);
}

function buildCleanTitleChoices(topic, titleAssets = state.titleAssets) {
  if (!topic) return [];
  const signal = extractTopicBoundSignal(topic);
  const candidates = [
    ...buildAssetTitleCandidates(signal, titleAssets),
    ...buildPlatformTitleCandidates(signal, state.publishTarget),
  ];
  const ranked = rankTitleChoicesForTarget(candidates, signal, state.publishTarget);
  if (ranked.length >= 5) return ranked.slice(0, 5);
  const seen = new Set(ranked.map((item) => normalizeTitleText(item.title).replace(/[\uFF0C\u3002\uFF01\uFF1F\uFF1B\uFF1A,.!?;:\s]/g, "")));
  for (const item of candidates) {
    const title = trimTitleForTarget(item.title, state.publishTarget);
    const key = normalizeTitleText(title).replace(/[\uFF0C\u3002\uFF01\uFF1F\uFF1B\uFF1A,.!?;:\s]/g, "");
    if (!key || seen.has(key) || !isCompleteTitleForTarget(title, state.publishTarget)) continue;
    seen.add(key);
    ranked.push({ title, reason: item.reason });
    if (ranked.length >= 5) break;
  }
  return ranked.slice(0, 5);
}

function buildAssetTitleCandidates(signal, titleAssets = []) {
  const example = (titleAssets || []).find((item) => normalizeTitleText(item?.title).length >= 6);
  if (!example) return [];
  const title = normalizeTitleText(example.title);
  if (state.publishTarget === "xhs") {
    if (/\d/.test(title)) return [titleChoice(`${signal.shortSubject}\u5148\u770b\u8fd93\u70b9`, `\u53c2\u8003\u6807\u9898\u5e93\u6570\u5b57\u578b\uff1a${title}`)];
    if (/\u522b|\u4e0d\u8981|\u907f\u5751|\u9519|\u5751/.test(title)) return [titleChoice(`${signal.shortSubject}\u522b\u518d\u4e71\u8ddf\u98ce`, `\u53c2\u8003\u6807\u9898\u5e93\u907f\u5751\u578b\uff1a${title}`)];
    return [titleChoice(`${signal.shortSubject}\u8fd9\u6837\u7528\u624d\u6709\u6548`, `\u53c2\u8003\u6807\u9898\u5e93\u65b9\u6cd5\u578b\uff1a${title}`)];
  }
  if (state.publishTarget === "wechat-article") {
    if (/\u4e3a\u4ec0\u4e48|\u4e0d\u662f|\u800c\u662f/.test(title)) return [titleChoice(`${signal.subject}\u771f\u6b63\u96be\u7684\u4e0d\u662f\u5de5\u5177\uff0c\u800c\u662f${signal.action}`, `\u53c2\u8003\u6807\u9898\u5e93\u89c2\u70b9\u578b\uff1a${title}`)];
    if (/\d/.test(title)) return [titleChoice(`${signal.audience}\u505a${signal.subject}\uff0c\u5148\u60f3\u6e05\u695a\u8fd9\u51e0\u4e2a\u95ee\u9898`, `\u53c2\u8003\u6807\u9898\u5e93\u6e05\u5355\u578b\uff1a${title}`)];
    return [titleChoice(`\u4ece${signal.subject}\u5230${signal.result}\uff1a${signal.audience}\u771f\u6b63\u8981\u8865\u7684\u4e00\u8bfe`, `\u53c2\u8003\u6807\u9898\u5e93\u590d\u76d8\u578b\uff1a${title}`)];
  }
  return [titleChoice(`${signal.subject}\u8fd9\u4ef6\u4e8b\uff0c\u522b\u53ea\u770b\u8868\u9762`, `\u53c2\u8003\u6807\u9898\u5e93\uff1a${title}`)];
}

function buildPlatformTitleCandidates(signal, target = state.publishTarget) {
  return buildFormulaTitleCandidates(signal, target);
}

const TITLE_FORMULAS = [
  { id: "counter", style: "\u53cd\u5e38\u8bc6\u578b", tags: ["contrast"], render: (s) => `\u522b\u5148\u8ff7\u4fe1${s.subject}` },
  { id: "pain-root", style: "\u75db\u70b9\u578b", tags: ["pain"], render: (s) => `${s.problem}\u95ee\u9898\u51fa\u5728\u54ea` },
  { id: "subject-pain", style: "\u4e3b\u9898\u75db\u70b9\u578b", tags: ["pain", "subject"], render: (s) => `${s.shortSubject}\u522b\u518d${s.badAction}` },
  { id: "subject-list", style: "\u4e3b\u9898\u6e05\u5355\u578b", tags: ["list", "subject"], render: (s) => `${s.audience}\u5148\u770b${s.number}\u4e2a${s.shortSubject}` },
  { id: "result", style: "\u7ed3\u679c\u578b", tags: ["result"], render: (s) => `${s.shortSubject}\u60f3\u8981${s.result}` },
  { id: "truth", style: "\u771f\u76f8\u578b", tags: ["truth"], render: (s) => `${s.shortSubject}\u522b\u53ea\u770b\u8868\u9762` },
  { id: "compare", style: "\u5bf9\u6bd4\u578b", tags: ["contrast"], render: (s) => `${s.shortSubject}\u6709\u7528\u548c\u6ca1\u7528\u7684\u5dee\u522b` },
  { id: "list", style: "\u6e05\u5355\u578b", tags: ["list"], render: (s) => `${s.audience}\u5148\u770b\u8fd9${s.number}\u4e2a\u4fe1\u53f7` },
  { id: "avoid", style: "\u907f\u5751\u578b", tags: ["loss"], render: (s) => `${s.shortSubject}\u522b\u4e71\u8ddf\u98ce` },
  { id: "action", style: "\u52a8\u4f5c\u578b", tags: ["action"], render: (s) => `${s.problem}\u5148\u62c6\u6e05\u518d\u884c\u52a8` },
  { id: "question", style: "\u95ee\u9898\u578b", tags: ["question"], render: (s) => `${s.audience}\u4e3a\u4ec0\u4e48\u5361\u5728${s.problem}` },
  { id: "stop", style: "\u884c\u52a8\u53f7\u53ec\u578b", tags: ["action"], render: (s) => `\u522b\u518d${s.badAction}\uff0c\u5148${s.action}` },
  { id: "root-cause", style: "\u6839\u56e0\u578b", tags: ["pain", "truth"], render: (s) => `${s.problem}\u7684\u6839\u672c\u539f\u56e0` },
  { id: "before-after", style: "\u8f6c\u53d8\u578b", tags: ["result", "contrast"], render: (s) => `\u4ece${s.problem}\u5230${s.result}` },
  { id: "late-lesson", style: "\u6559\u8bad\u578b", tags: ["loss", "list"], render: (s) => `${s.audience}\u592a\u665a\u77e5\u9053\u7684${s.number}\u4e2a\u6559\u8bad` },
  { id: "worth", style: "\u5224\u65ad\u578b", tags: ["question"], render: (s) => `${s.shortSubject}\u503c\u4e0d\u503c\u5f97\u505a` },
];

function buildFormulaTitleCandidates(signal, target = state.publishTarget) {
  const s = normalizeTitleFormulaSignal(signal);
  const formulas = rankTitleFormulasForSignal(s, target);
  return formulas.map((formula) => titleChoice(renderFormulaTitleForTarget(formula, s, target), `${formula.style}\uff1a${formula.id}`));
}

function renderFormulaTitleForTarget(formula, signal, target = state.publishTarget) {
  const short = formula.render(signal);
  if (target !== "wechat-article") return short;
  const expansions = {
    "pain-root": `${signal.problem}\u95ee\u9898\u51fa\u5728\u54ea\uff1f${signal.audience}\u9700\u8981\u5148\u770b\u61c2\u8fd9\u4e2a\u5224\u65ad`,
    "root-cause": `${signal.problem}\u7684\u6839\u672c\u539f\u56e0\uff0c\u5f80\u5f80\u4e0d\u5728${signal.shortSubject}\u672c\u8eab`,
    truth: `${signal.shortSubject}\u522b\u53ea\u770b\u8868\u9762\uff0c\u771f\u6b63\u5173\u952e\u5728${signal.action}`,
    compare: `${signal.shortSubject}\u6709\u7528\u548c\u6ca1\u7528\u7684\u5dee\u522b\uff0c\u5c31\u5728\u8fd9\u4e2a\u5224\u65ad\u4e0a`,
    list: `${signal.audience}\u5148\u522b\u6025\u7740\u7167\u6284\uff1a${signal.subject}\u7684${signal.number}\u4e2a\u5224\u65ad\u4fe1\u53f7`,
    result: `\u4ece${signal.problem}\u5230${signal.result}\uff1a${signal.subject}\u7684\u5b8c\u6574\u8def\u5f84`,
    stop: `\u522b\u518d${signal.badAction}\uff0c${signal.audience}\u771f\u6b63\u8981\u5148\u505a\u7684\u662f${signal.action}`,
    counter: `${signal.audience}\u522b\u5148\u8ff7\u4fe1${signal.subject}\uff0c\u5148\u60f3\u6e05\u695a\u5b83\u89e3\u51b3\u4ec0\u4e48\u95ee\u9898`,
  };
  return expansions[formula.id] || `${short}\uff1a${signal.audience}\u5e94\u8be5\u5148\u770b\u61c2\u7684\u5224\u65ad`;
}

function normalizeTitleFormulaSignal(signal = {}) {
  const sourceNumber = String(signal.sourceTitle || "").match(/(\d+)\s*(\u4e2a|\u6761|\u70b9|\u4ef6|\u5929|\u5c0f\u65f6)?/);
  return {
    ...signal,
    subject: shortTitlePhrase(signal.subject || signal.sourceTitle || "\u8fd9\u4ef6\u4e8b", 12),
    shortSubject: shortTitlePhrase(signal.shortSubject || signal.subject || "\u8fd9\u4ef6\u4e8b", 8),
    audience: shortTitlePhrase(signal.audience || "\u666e\u901a\u4eba", 8),
    problem: shortTitlePhrase(signal.problem || "\u95ee\u9898\u6ca1\u62c6\u6e05", 10),
    action: shortTitlePhrase(signal.action || "\u5148\u505a\u5224\u65ad", 10),
    result: shortTitlePhrase(signal.result || "\u62ff\u5230\u7ed3\u679c", 8),
    badAction: shortTitlePhrase(signal.badAction || inferBadTitleAction(signal), 8),
    number: sourceNumber?.[1] || "3",
  };
}

function rankTitleFormulasForSignal(signal, target = state.publishTarget) {
  return TITLE_FORMULAS
    .map((formula, index) => ({ formula, score: scoreTitleFormula(formula, signal, target, index) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, target === "wechat-article" ? 12 : 10)
    .map((item) => item.formula);
}

function scoreTitleFormula(formula, signal, target, index) {
  let score = 100 - index;
  const text = signal.text || "";
  if (formula.tags.includes("pain") && /痛|怕|担心|卡|难|没|低质|模板|焦虑|问题/.test(text)) score += 28;
  if (formula.tags.includes("subject") && /AI|工具|Skill|skills|MVP|私校|面试|律师|教育|公众号|小红书/.test(signal.subject + text)) score += 30;
  if (formula.tags.includes("list") && /\d+|清单|方法|步骤|工具|案例|信号/.test(text)) score += 24;
  if (formula.tags.includes("loss") && /别|不要|坑|错|风险|低质|浪费|后果/.test(text)) score += 22;
  if (formula.tags.includes("result") && /结果|提升|增长|收藏|点赞|转发|阅读|省|效率|MVP/.test(text)) score += 20;
  if (formula.tags.includes("contrast") && /不是|而是|对比|差别|误区|反常识|真相/.test(text)) score += 18;
  if (target === "wechat-article" && ["question", "truth", "compare"].includes(formula.id)) score += 12;
  if (target === "xhs" && ["pain-root", "list", "avoid", "action"].includes(formula.id)) score += 12;
  return score;
}

function inferBadTitleAction(signal = {}) {
  const text = [signal.sourceTitle, signal.problem, signal.action, signal.subject, signal.text].filter(Boolean).join(" ");
  if (/背答案|标准答案|表达.*僵|硬背/.test(text)) return "硬背答案";
  if (/模板|同质化|AI味|像模板/.test(text)) return "套模板";
  if (/收藏|清单|工具/.test(text)) return "只收藏清单";
  if (/跟风|热点/.test(text)) return "乱跟风";
  if (/报名|申请|择校/.test(text)) return "盲目报名";
  return "照抄方法";
}
function rankTitleChoicesForTarget(items = [], signal = {}, target = state.publishTarget) {
  const seen = new Set();
  return (items || [])
    .filter(Boolean)
    .map((item) => {
      const title = trimTitleForTarget(item.title, target);
      return { ...item, title, score: scoreTitleChoiceForTarget(title, signal, target) };
    })
    .filter((item) => {
      const key = normalizeTitleText(item.title).replace(/[\uFF0C\u3002\uFF01\uFF1F\uFF1B\uFF1A,.!?;:\s]/g, "");
      if (!key || seen.has(key) || item.score <= 0) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.score - a.score)
    .map(({ score, ...item }) => item);
}

function scoreTitleChoiceForTarget(title = "", signal = {}, target = state.publishTarget) {
  const clean = trimTitleForTarget(title, target);
  const length = titleCharLength(clean);
  if (!isCompleteTitleForTarget(clean, target)) return 0;
  let score = 50;
  const signalWords = [signal.subject, signal.shortSubject, signal.problem, signal.action, signal.result]
    .filter(Boolean)
    .flatMap((item) => String(item).split(/\s+/))
    .filter((word) => word.length >= 2);
  if (signalWords.some((word) => clean.includes(word.slice(0, 4)))) score += 18;
  if (/[0-9\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341]/.test(clean)) score += 6;
  if (/\u6e05\u5355|\u907f\u5751|\u5224\u65ad|\u4fe1\u53f7|\u5173\u952e|\u5de5\u4f5c\u6d41|\u95ee\u9898|\u7ed3\u679c|\u522b\u53ea|\u4e3a\u4ec0\u4e48|\u771f\u6b63/.test(clean)) score += 12;
  if (target === "xhs") {
    if (length >= 14 && length <= 20) score += 18;
    if (length < 10 || length > 20) return 0;
    if (signal.topicType === "ai-tool-list") {
      if (/\u6a21\u677f|\u4f4e\u8d28|\u5199\u5e9f|5\u4e2a|\u522b\u4e71\u88c5|\u8ddf\u98ce/.test(clean)) score += 35;
      if (/\u771f\u80fd\u7701\u4e8b|\u597d\u7528\u4f46|\u5fc5\u88c5/.test(clean)) score += 18;
      if (/\u522b\u5148\u8ff7\u4fe1|\u60f3\u8981\u62ff\u5230\u771f\u5b9e\u53cd\u9988|\u771f\u76f8\u4e0d\u662f\u6e05\u5355/.test(clean)) score -= 24;
    }
  }
  if (target === "wechat-article" && length >= 18 && length <= 48) score += 16;
  if (/\u5f53\u524d|\u6807\u9898|\u751f\u6210|\u5e73\u53f0|\u6210\u54c1|\u7d20\u6750\u5e93|\u70b9\u51fb|\u6b65\u9aa4|\u7b2c\d\u6b65/.test(clean)) score -= 80;
  if (/(\u8fd9\u70b9|\u8fd9\u4e2a|\u56e0\u4e3a|\u5982\u679c|\u800c\u662f|\u4e0d\u662f|\uff0c|\uff1a)$/.test(clean)) score -= 60;
  return score;
}

function isCompleteTitleForTarget(title = "", target = state.publishTarget) {
  const clean = normalizeTitleText(title);
  const length = titleCharLength(clean);
  if (!clean || /\uFFFD/.test(clean)) return false;
  if (/[\uFF0C\u3001\uFF1A\uFF1B,;:]$/.test(clean)) return false;
  if (target === "xhs") return length >= 8 && length <= 20;
  if (target === "moments") return length >= 8 && length <= 36;
  if (target === "douyin" || target === "video-account") return length >= 8 && length <= 34;
  return length >= 12 && length <= 70;
}

function extractTopicBoundSignal(topic = {}) {
  const topicText = normalizeTitleText([
    topic.theme, topic.title, topic.pain, topic.reason, topic.reuse,
    topic.content, topic.body, topic.summary,
    topic.raw?.title, topic.raw?.description, topic.raw?.content, topic.raw?.text,
    topic.raw?.note, topic.raw?.analysis, topic.raw?.pain,
  ].filter(Boolean).join(" "));
  const contextText = normalizeTitleText([state.keywords, state.businessLine].filter(Boolean).join(" "));
  const hasStrongTopicText = topicText.replace(/\s/g, "").length >= 8;
  const text = hasStrongTopicText ? topicText : normalizeTitleText([topicText, contextText].filter(Boolean).join(" "));
  const sentences = text.split(/[，。！？；：,.!?;:\n]/).map((item) => item.trim()).filter((item) => item.length >= 2);
  const sourceTitle = normalizeTitleText(topic.title || topic.theme || sentences[0] || state.businessLine || "当前选题");
  const hasAiToolSignal = /AI|Claude|Codex|DeepSeek|Cursor|Lovable|Replit|Base44|Skill|skills|工具/i.test(topicText);
  const hasCreatorSignal = /内容|创作|自媒体|博主|账号|写作|模板|低质|同质/i.test(topicText);
  const isAiToolList = hasAiToolSignal && hasCreatorSignal;
  const subject = pickTitleSignal(text, [
    [/必装.*(Skill|skills|工具)|速码|Skill|skills|Claude|Codex|DeepSeek|Cursor|Lovable|Replit|Base44|工具/i, isAiToolList ? "AI 内容工具" : "AI 工具"],
    [/模板|同质化|低质|内容创作|自媒体/i, isAiToolList ? "AI 写作工具" : "内容创作"],
    [/AI\s*Native/i, "AI Native 项目"],
    [/MVP|最小可行产品/i, "AI 工具做 MVP"],
    [/Agent|智能体|工作流/i, "Agent 工作流"],
    [/小红书|图文笔记/i, "小红书图文"],
    [/公众号|长文/i, "公众号长文"],
    [/私校|择校|升学|面试/i, "私校教育"],
    [/律师|法律|案件/i, "律师内容账号"],
  ], shortTitlePhrase(sourceTitle, 16) || "当前选题");
  const audience = pickTitleSignal(text, [
    [/自媒体人|自媒体|博主|内容创作者|账号|小红书/i, "内容创作者"],
    [/不会写代码|零代码|不懂代码|普通人/i, "普通人"],
    [/老板|创业者|团队|公司/i, "创业者"],
    [/家长|妈妈|孩子|学生/i, "家长"],
    [/律师|医生|老师|顾问/i, "专业服务者"],
  ], "普通人");
  const problem = pickTitleSignal(text, [
    [/硬背标准答案|背标准答案|硬背|表达很僵|表达逻辑/i, "孩子面试表达很僵"],
    [/内容越来越像模板|像模板|模板化|同质化/i, "内容越来越像模板"],
    [/判低质|低质|没流量|流量/i, "担心被判低质"],
    [/只看清单|只收藏|收藏.*工具|工具清单/i, "只收藏工具清单"],
    [/不会写代码|不懂代码/i, "不会写代码"],
    [/提前下班|提效|省.*小时|效率/i, "把效率真正提起来"],
    [/没结果|不出结果|卡住/i, "做了却没结果"],
    [/不知道.*发什么|选题/i, "不知道写什么"],
  ], shortTitlePhrase(topic.pain || sentences[1] || "没有抓住关键问题", 18));
  const action = pickTitleSignal(text, [
    [/硬背标准答案|背标准答案|表达很僵|表达逻辑/i, "先练表达逻辑"],
    [/模板|同质化|低质|没流量/i, "先把工具放进内容系统"],
    [/必装|清单|Skill|skills|工具/i, "先选对工具和用法"],
    [/工作流|流程|系统/i, "放进工作流"],
    [/MVP|产品|项目/i, "做出一个 MVP"],
    [/拆解|复盘|二创/i, "拆成可复用结构"],
    [/采集|入库|素材库|知识库/i, "沉淀进素材库"],
  ], "先判断要解决的问题");
  const result = pickTitleResult(text);
  return {
    text, sourceTitle,
    subject: shortTitlePhrase(subject, 18),
    shortSubject: shortTitlePhrase(subject, 10),
    audience,
    problem: shortTitlePhrase(problem, 18),
    action: shortTitlePhrase(action, 18),
    result: shortTitlePhrase(result, 12),
    topicType: isAiToolList ? "ai-tool-list" : "general",
  };
}
function pickTitleSignal(text = "", rules = [], fallback = "") {
  for (const [pattern, value] of rules) {
    if (pattern.test(text)) return value;
  }
  return fallback;
}

function pickTitleResult(text = "") {
  const hour = text.match(/(\u63d0\u524d\u4e0b\u73ed|\u7701\u4e0b|\u8282\u7701).{0,6}(\d+)\s*(\u5c0f\u65f6|h)/i);
  if (hour) return `${hour[2]}\u5c0f\u65f6`;
  const metric = text.match(/(\d+(?:\.\d+)?\s*[\u4e07\u5343\u767ekK]?\+?)\s*(\u70b9\u8d5e|\u6536\u85cf|\u8bc4\u8bba|\u8f6c\u53d1|\u9605\u8bfb|\u64ad\u653e)/);
  if (metric) return "\u62ff\u5230\u771f\u5b9e\u53cd\u9988";
  if (/MVP|\u6700\u5c0f\u53ef\u884c\u4ea7\u54c1/i.test(text)) return "\u505a\u51fa MVP";
  return "\u62ff\u5230\u7ed3\u679c";
}

function pickCompactTitleSubject(text = "", fallback = "") {
  const clean = readableCn([text, fallback].filter(Boolean).join(" "));
  const patterns = [
    [/低龄.{0,4}英文写作比赛|英文写作比赛|写作比赛/, "低龄英文写作比赛"],
    [/私校面试|面试/, "私校面试"],
    [/私校申请|申请季|择校/, "私校申请"],
    [/夏校|夏令营/, "夏校申请"],
    [/标化|SSAT|托福|雅思|AP/, "标化备考"],
    [/AI\s*Native|AI原生/, "AI Native项目"],
    [/Agent|工作流/, "Agent工作流"],
    [/内容资产库|素材库|知识库/, "内容资产库"],
    [/小红书|图文/, "小红书图文"],
    [/公众号|长文/, "公众号长文"],
  ];
  for (const [pattern, subject] of patterns) {
    if (pattern.test(clean)) return subject;
  }
  return shortTitlePhrase(fallback || firstReadableSentence(clean), 10);
}

function shortTitlePhrase(value = "", max = 8) {
  const clean = readableCn(value)
    .replace(/^(关于|如果|为什么|怎么|如何)/, "")
    .replace(/[，、。！？；：,.!?;:].*$/, "")
    .trim();
  const chars = Array.from(clean);
  return chars.length > max ? chars.slice(0, max).join("") : clean;
}

function readableCn(value = "") {
  return String(value || "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/#([^#\s]+)\[话题\]#/g, "$1")
    .replace(/[#@]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstReadableSentence(text = "") {
  return readableCn(text).split(/[，、。！？；：,.!?\n]/).map((item) => item.trim()).find((item) => item.length >= 4) || "";
}

function pickSubjectPhrase(value = "") {
  const text = readableCn(value);
  const phrase = firstReadableSentence(text) || text;
  return clampTitlePart(phrase, 18) || "这个选题";
}
function pickAudiencePhrase(text = "") {
  if (/家长|妈妈|爸爸|父母|孩子|娃/.test(text)) return "家长";
  if (/学生|孩子|小孩|初中|高中|申请者/.test(text)) return "学生";
  if (/老师|机构|顾问|招生官/.test(text)) return "教育从业者";
  if (/律师|当事人|客户/.test(text)) return "客户";
  if (/老板|团队|公司|创业者/.test(text)) return "创业者";
  return "普通人";
}

function pickProblemPhrase(text = "", pain = "", subject = "") {
  const source = readableCn(pain) || firstReadableSentence(text);
  if (/面试/.test(text)) return "不知道招生官真正想听什么";
  if (/SSAT|托福|雅思|AP|标化|考试/.test(text)) return "备考卡在关键瓶颈";
  if (/申请|录取|择校|私校/.test(text)) return "申请准备没有抓住重点";
  if (/退费|避雷|踩坑|投诉/.test(text)) return "选机构怕踩坑";
  return clampTitlePart(source || `${subject}没有效果`, 18);
}

function pickActionPhrase(text = "", subject = "") {
  if (/面试/.test(text)) return "先准备高分回答框架";
  if (/SSAT|托福|雅思|AP|标化|考试/.test(text)) return "先拆清提分瓶颈";
  if (/申请|录取|择校|私校/.test(text)) return "先理清申请路径";
  if (/写作|英文写作|作文/.test(text)) return "先搭好写作结构";
  if (/避雷|退费|踩坑/.test(text)) return "先看清风险信号";
  return `先把${clampTitlePart(subject, 10)}拆成步骤`;
}

function pickResultPhrase(text = "") {
  const metric = text.match(/(\d+(?:\.\d+)?\s*[万千百Kk]?\+?)\s*(点赞|收藏|评论|阅读|播放|录取|提分|分)/);
  if (metric) return `${metric[1]}${metric[2]}`;
  if (/高分|提分|满分/.test(text)) return "更容易拿高分";
  if (/录取|offer|上岸/.test(text)) return "提升录取把握";
  if (/避雷|退费|踩坑/.test(text)) return "少花冤枉钱";
  return "更稳地推进";
}

function clampTitlePart(value = "", max = 18) {
  const clean = readableCn(value).replace(/[，、。！？；：,.!?].*$/, "").trim();
  return clean.length > max ? clean.slice(0, max) : clean;
}
function topicBoundTemplatesForTarget(target) {
  if (target === "xhs") {
    return [
      { reason: "小红书痛点型", render: (s) => `${s.shortSubject}别急着报名` },
      { reason: "小红书避坑型", render: (s) => `${s.shortSubject}先看这3点` },
      { reason: "小红书收藏型", render: (s) => `${s.shortSubject}准备清单` },
      { reason: "小红书判断型", render: (s) => `${s.shortSubject}值不值得做` },
      { reason: "小红书方法型", render: (s) => `${s.shortSubject}这样准备更稳` },
    ];
  }
  if (target === "wechat-article") {
    return [
      { reason: "公众号深度型", render: (s) => `为什么${s.subject}真正难的不是信息，而是${s.problem}` },
      { reason: "公众号方法型", render: (s) => `从${s.problem}到${s.result}：${s.subject}的完整路径` },
      { reason: "公众号复盘型", render: (s) => `拆完${s.subject}后，我发现关键在${s.action}` },
      { reason: "公众号系统型", render: (s) => `${s.subject}不能只靠经验，要靠一套判断标准` },
    ];
  }
  if (target === "moments") {
    return [
      { reason: "朋友圈观察型", render: (s) => `最近重新理解了${s.subject}` },
      { reason: "朋友圈提醒型", render: (s) => `${s.subject}这件事，别只看表面` },
      { reason: "朋友圈经验型", render: (s) => `${s.problem}，很多人一开始都会忽略` },
      { reason: "朋友圈行动型", render: (s) => `如果你也在看${s.subject}，先做这一步` },
    ];
  }
  if (target === "douyin" || target === "video-account") {
    return [
      { reason: "短视频钩子型", render: (s) => `别再乱准备${s.subject}了，先看这一点` },
      { reason: "短视频痛点型", render: (s) => `${s.problem}，通常卡在这一步` },
      { reason: "短视频清单型", render: (s) => `${s.audience}看${s.subject}，先抓3个信号` },
      { reason: "短视频结果型", render: (s) => `${s.subject}想要${s.result}，关键不是死记硬背` },
    ];
  }
  return [
    { reason: "通用痛点型", render: (s) => `${s.audience}做${s.subject}，别先死磕工具` },
    { reason: "通用方法型", render: (s) => `${s.subject}想出效果，先把这步做好` },
    { reason: "通用收藏型", render: (s) => `${s.pain}？这套${s.subject}流程建议收藏` },
  ];
}

function buildTopicBoundAssetTitle(signal, assets = []) {
  const matched = (assets || []).find((item) => item?.title && readableCn(item.title).length >= 6);
  if (!matched) return null;
  const example = readableCn(matched.title);
  if (state.publishTarget === "xhs") {
    if (/\d/.test(example)) return titleChoiceForTarget(`${signal.shortSubject}先看3个信号`, `标题库参考：${example}`, "xhs");
    if (/[，、：]/.test(example)) return titleChoiceForTarget(`${signal.shortSubject}怎么判断才稳`, `标题库参考：${example}`, "xhs");
    return titleChoiceForTarget(`${signal.shortSubject}别踩这个坑`, `标题库参考：${example}`, "xhs");
  }
  if (/\d/.test(example)) return titleChoice(`${signal.audience}看${signal.subject}，先记住这3个判断`, `标题库参考：${example}`);
  if (/[，、：]/.test(example)) return titleChoice(`${signal.subject}为什么总卡在${signal.problem}？`, `标题库参考：${example}`);
  return titleChoice(`${signal.subject}想出结果，别忽略${signal.action}`, `标题库参考：${example}`);
}

function dedupeTopicBoundTitleChoices(items = []) {
  const bannedTerms = ["AI自媒体", "内容资产库", "内容创作", "大城市流量", "素材库", "标题库", "工具", "拆分", "平台成品"];
  const seen = new Set();
  const result = [];
  for (const item of items) {
    if (!item) continue;
    const title = clampTitle(readableCn(item.title));
    const key = title.replace(/[，。！？\s]/g, "");
    if (!title || !isCompleteShortTitle(title) || seen.has(key) || bannedTerms.some((term) => title.includes(term))) continue;
    seen.add(key);
    result.push({ title, reason: readableCn(item.reason || "绑定当前选题生成") });
  }
  return result;
}

function extractCleanTitleSignal(topic = {}) {
  const rawTitle = cleanReadableText(topic.title || topic.theme || "");
  const rawBody = cleanReadableText(topic.body || topic.content || topic.summary || topic.reason || "");
  const text = cleanReadableText([rawTitle, rawBody, state.keywords, state.businessLine].filter(Boolean).join(" "));
  const sourceTitle = rawTitle || firstMeaningfulPhrase(text) || state.businessLine || "杩欎釜閫夐";
  return {
    text,
    sourceTitle,
    subject: shortenTitlePart(extractSubject(text, sourceTitle)),
    audience: shortenTitlePart(extractAudience(text)),
    action: shortenTitlePart(extractAction(text)),
    pain: shortenTitlePart(extractPain(text, sourceTitle)),
    result: shortenTitlePart(extractResult(text)),
    platform: currentTarget().title || "小红书图文",
  };
}

function cleanReadableText(value = "") {
  return String(value || "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/#([^#\s]+)\[话题\]#/g, "$1")
    .replace(/[#@]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstMeaningfulPhrase(text = "") {
  return text.split(/[，。！？；：,.!?\n]/).map((item) => item.trim()).find((item) => item.length >= 4) || "";
}

function extractSubject(text = "", fallback = "") {
  const patterns = [
    /(AI做Plog|AI\s*Plog|Plog)/i,
    /(AI做图|AI出图|AI作图|AI生成图片|AI绘图)/i,
    /(AI自媒体|自媒体|内容创作|内容生产线)/i,
    /(Agent工作流|Agent|工作流)/i,
    /(小红书|公众号|视频号|朋友圈)/i,
    /(爆款标题|标题|选题|素材库|内容资产库|知识库)/i,
    /(Claude|DeepSeek|豆包|即梦|WorkBuddy|Skill|Skills)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }
  return fallback;
}
function extractAudience(text = "") {
  if (/女生|姐妹|宝妈|女性/.test(text)) return "想做自媒体的女生";
  if (/新手|小白|0基础|零基础/.test(text)) return "新手";
  if (/博主|账号|自媒体/.test(text)) return "内容创作者";
  if (/老板|团队|公司|企业/.test(text)) return "小团队";
  return "普通人";
}

function extractAction(text = "") {
  if (/素材|资产|知识库|收藏/.test(text)) return "先建可复用素材库";
  if (/Agent|工作流|自动化/.test(text)) return "先拆清任务流程";
  if (/标题|选题|爆款/.test(text)) return "先拆用户问题";
  if (/AI味|不像人|同质化/.test(text)) return "先补真实经验";
  return "先做一次判断";
}

function extractPain(text = "", fallback = "") {
  if (/没方向|不知道.*发|没选题|缺.*素材/.test(text)) return "每天不知道发什么";
  if (/AI味|像AI|同质化|模板/.test(text)) return "写出来太像模板";
  if (/没流量|没人看|不涨粉|没结果/.test(text)) return "发了也没结果";
  if (/卡住|跑偏|不稳定/.test(text)) return "流程总是卡住";
  return shortenTitlePart(fallback || "问题没被拆清楚");
}

function extractResult(text = "") {
  if (/出图|作图|图片|插画/.test(text)) return "配图能直接用";
  if (/发布|发文|日更/.test(text)) return "稳定发出去";
  if (/资产|复用|一鱼多吃/.test(text)) return "后续能复用";
  if (/涨粉|流量|阅读/.test(text)) return "更容易拿反馈";
  return "跑出结果";
}
function shortenTitlePart(value = "") {
  const clean = cleanReadableText(value).replace(/[，。！？；:：,.!?].*$/, "").trim();
  return clean.length > 18 ? clean.slice(0, 18) : clean || "这个方法";
}

function titleTemplatesForTarget(target) {
  if (target === "moments") {
    return [
      { reason: "朋友圈观察型", render: (s) => `我最近重新理解了${s.subject}` },
      { reason: "朋友圈反差型", render: (s) => `以前以为难在${s.subject}，后来发现是${s.action}` },
      { reason: "朋友圈经验型", render: (s) => `${s.pain}这事，真的不能只靠感觉` },
      { reason: "朋友圈提醒型", render: (s) => `如果你也在做${s.subject}，先别急着照抄` },
    ];
  }
  if (target === "wechat-article") {
    return [
      { reason: "公众号深度型", render: (s) => `${s.subject}真正难的不是工具，而是${s.action}` },
      { reason: "公众号问题型", render: (s) => `为什么很多人做${s.subject}，最后都卡在${s.pain}` },
      { reason: "公众号方法型", render: (s) => `从${s.pain}到${s.result}：一套可复用的${s.subject}方法` },
      { reason: "公众号系统型", render: (s) => `${s.subject}不能只靠灵感，要靠一套内容系统` },
    ];
  }
  if (target === "douyin" || target === "video-account") {
    return [
      { reason: "短视频钩子型", render: (s) => `别再乱做${s.subject}了，先看这一步` },
      { reason: "短视频反差型", render: (s) => `${s.subject}没效果，问题通常不是工具` },
      { reason: "短视频清单型", render: (s) => `${s.audience}做${s.subject}，先抓这3个信号` },
      { reason: "短视频避坑型", render: (s) => `${s.pain}，多半是少了这套流程` },
    ];
  }
  return [
    { reason: "小红书痛点型", render: (s) => `${s.audience}做${s.subject}，别先死磕工具` },
    { reason: "小红书方法型", render: (s) => `${s.subject}想出效果，先把这步做好` },
    { reason: "小红书收藏型", render: (s) => `${s.pain}？这套${s.subject}流程建议收藏` },
    { reason: "小红书反差型", render: (s) => `${s.subject}的重点不是技巧，是${s.action}` },
  ];
}

function buildCleanAssetTitleChoice(signal, assets = []) {
  const matched = (assets || []).find((item) => item?.title && cleanReadableText(item.title).length >= 6);
  if (!matched) return null;
  const example = cleanReadableText(matched.title);
  const style = /[，、：？?]/.test(example) ? "问题式" : /\d/.test(example) ? "数字清单式" : "爆款参考式";
  const rendered = style === "数字清单式"
    ? `${signal.audience}做${signal.subject}，先记住这3个动作`
    : style === "问题式"
      ? `为什么你做${signal.subject}总是卡在${signal.pain}`
      : `${signal.subject}想做出效果，别忽略${signal.action}`;
  return titleChoice(rendered, `标题库参考：${style}，已按当前选题重写`);
}

function dedupeCleanTitleChoices(items = []) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const title = clampTitle(cleanReadableText(item.title));
    const key = title.replace(/[，、。！？\s]/g, "");
    if (!title || seen.has(key)) continue;
    if (/大城市流量|跑出结果|当前选题|绑定当前选题|公式/.test(title)) continue;
    seen.add(key);
    result.push({ title, reason: cleanReadableText(item.reason || "绑定当前选题生成") });
  }
  return result;
}

function safeThemeForTitle(topic = {}) {
  const sourceTheme = cleanSourceText(topic.theme || topic.title || state.businessLine);
  if (!sourceTheme || looksLikeGenericDiagnosis(sourceTheme)) return state.businessLine;
  return sourceTheme.length > 24 ? sourceTheme.slice(0, 24) : sourceTheme;
}

async function generateSopDraft() {
  if (!state.selectedTitle || !selectedTopic()) return;
  if (state.draftStatus === "loading") return;
  state.draftStatus = "loading";
  state.draftError = "";
  state.copyConfirmed = false;
  renderToday();
  try {
    const payload = buildSopDraftPayload();
    const res = await fetch(apiPath("/api/content-draft/rewrite"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok || !result.ok || !result.draft) {
      const message = result.message || result.error || `HTTP ${res.status}`;
      throw new Error(`AI SOP 文案生成失败：${message}`);
    }
    const draft = result.draft;
    state.draft = formatSopDraft(draft);
    state.draftMeta = {
      model: result.model || result.retriedFrom || "Longka",
      framework: draft.diagnosis?.copyable || draft.contentStrategy?.framework || "SOP",
      route: draft.contentStrategy?.selectedAngle || currentTarget().title,
    };
    state.draftReview = runLongkaReview(state.draft);
    rememberCopyVersion(state.draft, state.pendingRevision ? `AI 优化第 ${state.draftRevision} 版` : "AI 初稿");
    state.improvedDraft = "";
    state.pendingRevision = null;
    state.draftStatus = "done";
    state.draftError = "";
  } catch (error) {
    state.draftStatus = "error";
    state.draftError = `${error.message}。系统不会把本地模板当成最终稿，请检查文案模型配置后重试。`;
    state.draft = "";
  }
  renderToday();
}

function buildSopDraftPayload() {
  const topic = selectedTopic() || {};
  const source = topic.source || topic.raw || topic;
  const titleChoice = state.titleChoices.find((item) => item.title === state.selectedTitle) || {};
  const sourceContent = topic.content || topic.text || topic.summary || source.content || source.text || "";
  const comments = Array.isArray(topic.comments) ? topic.comments : Array.isArray(source.comments) ? source.comments : [];
  const normalizedTopic = {
    id: topic.id,
    title: topic.title || topic.theme || state.selectedTitle,
    theme: topic.theme,
    pain: topic.pain,
    rewrite: topic.reuse || topic.reason || "",
    risk: topic.risk,
    content: sourceContent,
    comments,
    metrics: topic.metrics || source.metrics || {},
    sources: [{
      title: topic.title,
      url: topic.url,
      platform: topic.platform,
      content: sourceContent,
      comments,
      metrics: topic.metrics || source.metrics || {},
    }],
  };
  return {
    selectedTitle: state.selectedTitle,
    titleChoices: state.titleChoices.map((item) => item.title || item).filter(Boolean),
    selectedFormat: currentTarget().title,
    platform: currentTarget().platform || state.publishTarget,
    publishTarget: state.publishTarget,
    keyword: state.keywords,
    industry: state.industry,
    businessLine: state.businessLine,
    goal: state.goal,
    keywords: state.keywords,
    revision: state.draftRevision,
    titleReason: titleChoice.reason || "",
    topic: normalizedTopic,
    sourcePost: {
      title: topic.title || topic.theme || "",
      summary: topic.pain || topic.reason || "",
      content: sourceContent,
      url: topic.url || "",
      platform: topic.platform || "",
      comments,
      commentQuestions: comments,
      metrics: topic.metrics || source.metrics || {},
    },
    comments,
    commentQuestions: comments,
    currentDraft: state.pendingRevision?.currentDraft ? {
      title: state.pendingRevision.currentDraft.title,
      copy: state.pendingRevision.currentDraft.copy,
      versionId: state.pendingRevision.currentDraft.id,
      round: state.pendingRevision.currentDraft.round,
      score: state.pendingRevision.currentDraft.score,
      label: state.pendingRevision.currentDraft.label,
    } : null,
    qualityFeedback: state.pendingRevision ? {
      score: state.pendingRevision.qualityFeedback?.score || 0,
      level: state.pendingRevision.qualityFeedback?.level || "",
      instructions: [
        state.pendingRevision.instruction,
        ...(state.pendingRevision.qualityFeedback?.rewriteBrief || []),
      ].filter(Boolean).slice(0, 8),
      required: "Rewrite from currentDraft.copy into a complete publishable new version. Do not append advice only.",
    } : null,
    sourceTopic: {
      id: topic.id,
      theme: topic.theme,
      title: topic.title,
      url: topic.url,
      platform: topic.platform,
      pain: topic.pain,
      reason: topic.reason,
      reuse: topic.reuse,
      risk: topic.risk,
      metrics: topic.metrics || source.metrics || {},
      content: sourceContent,
      comments,
    },
    sop: {
      sourceEvidence: "必须从源头素材提炼真实痛点，不复制原文表达。",
      dbsContent: "先判断选题是否值得做，再判断形式、标题、表达效率、认知落差和行动入口。",
      cheatOnContent: "初稿后必须做体检：开头留存、具体感、人味、收藏价值、转化动作。",
      humanizerZh: "删除模板腔、三段式套话、空泛连接词、过度完整的 AI 句式。",
      platformStyle: platformStyleInstruction(),
      noFallbackTemplate: true,
    },
  };
}

function platformStyleInstruction() {
  if (state.publishTarget === "moments") {
    return [
      "朋友圈文案不是文章，不要标题、标签、配图建议，也不要输出“正文：”。",
      "只输出一条像真人随手发的朋友圈动态，控制在 120-260 字。",
      "语气像运营者随手发圈：有最近发生的场景、有一句判断、有一点经验，不要教程腔。",
      "可以分 3-5 个短段，中间允许空行；不要编号清单，不要一二三步骤。",
      "结尾轻一点，可以是私聊入口，不要硬广。"
    ].join("\n");
  }
  if (state.publishTarget === "wechat-article") {
    return [
      "公众号长文不是小红书短正文，不要标签，不要配图建议列表。",
      "需要有标题、开头问题、正文小标题、论证、案例或场景、方法和结尾。",
      "结构可以用 Markdown 标题，但正文要像一篇完整文章，不要写成轮播卡片说明。",
      "允许 900-1800 字，重点是观点展开和信任感，不要每段都短促喊口号。"
    ].join("\n");
  }
  if (state.publishTarget === "douyin" || state.publishTarget === "video-account") {
    return [
      "短视频脚本不是图文正文，不要标签，不要配图建议，不要公众号式长段落。",
      "必须按：封面标题、3秒钩子、口播正文、分镜画面、字幕关键词、结尾互动来写。",
      "口播要短句，适合真人说出来；每段控制在 1-3 句。",
      "视频号更偏信任和解释，抖音更偏钩子和节奏。"
    ].join("\n");
  }
  return [
    "小红书图文要有标题、正文和标签；配图建议只进入系统内部图文计划，不要混进最终正文。",
    "正文要口语、有场景、有收藏价值，适合图文笔记，不要写成公众号长文。",
    "配图计划必须对应轮播页，不要写泛泛的装饰图。"
  ].join("\n");
}

function formatSopDraft(draft = {}) {
  const copy = draft.xhsCopy || {};
  const title = state.selectedTitle || draft.selectedTitle || copy.title;
  const body = copy.body || draft.body || "";
  if (state.publishTarget === "moments") {
    return formatMomentsSopDraft(body || draft.copy || draft.text || "");
  }
  if (state.publishTarget === "wechat-article") {
    return formatWechatSopDraft({ title, body: body || draft.copy || draft.text || "", draft });
  }
  if (state.publishTarget === "douyin" || state.publishTarget === "video-account") {
    return formatVideoSopDraft({ title, body: body || draft.copy || draft.text || "", draft });
  }
  const imagePlan = Array.isArray(copy.imagePlan) ? copy.imagePlan : Array.isArray(draft.imagePlan) ? draft.imagePlan : [];
  const tags = Array.isArray(copy.tags) ? copy.tags : Array.isArray(draft.tags) ? draft.tags : [];
  const parts = [`标题：${title}`, "", "正文：", body.trim()];
  if (imagePlan.length) {
    state.currentImagePlan = imagePlan;
  }
  if (tags.length) parts.push("", `标签：${tags.map((tag) => String(tag).replace(/^#/, "#")).join(" ")}`);
  return parts.filter((item) => item !== undefined && item !== null).join("\n");
}

function formatWechatSopDraft({ title = "", body = "", draft = {} } = {}) {
  const clean = stripPlatformNoise(draft.wechatArticle?.body || body || draft.article?.body || draft.article || "");
  const articleTitle = title || state.selectedTitle || selectedTopic()?.theme || "未命名长文";
  if (/^#\s+/m.test(clean) || /^##\s+/m.test(clean)) {
    return clean.replace(/^标题[：:].*$/gm, "").trim();
  }
  const paragraphs = clean.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (paragraphs.length >= 5 && clean.length > 500) {
    return [`# ${articleTitle}`, "", ...paragraphs].join("\n\n");
  }
  return buildArticleDraft(selectedTopic() || {});
}

function formatVideoSopDraft({ title = "", body = "", draft = {} } = {}) {
  const video = draft.videoScript || {};
  const shotList = Array.isArray(video.shotList) ? video.shotList : [];
  if (video.hook || video.voiceover || shotList.length) {
    const parts = [
      `封面标题：${title || video.title || state.selectedTitle || ""}`,
      "",
      `3秒钩子：${video.hook || ""}`,
      "",
      "口播正文：",
      String(video.voiceover || body || "").trim(),
    ];
    if (shotList.length) {
      parts.push("", "分镜/画面：", ...shotList.map((item, index) => `${index + 1}. ${typeof item === "string" ? item : item.shot || item.copy || JSON.stringify(item)}`));
    }
    if (video.riskNote) parts.push("", `风险提醒：${video.riskNote}`);
    return parts.filter(Boolean).join("\n");
  }
  const clean = stripPlatformNoise(body);
  if (/0-3 秒|3秒|钩子|口播|分镜|字幕/.test(clean)) return clean;
  return buildVideoDraft(selectedTopic() || {});
}

function formatMomentsSopDraft(raw = "") {
  const topic = selectedTopic() || {};
  const clean = String(raw || "")
    .replace(/^标题[：:].*$/gm, "")
    .replace(/^正文[：:]\s*/gm, "")
    .replace(/\n+配图建议[：:][\s\S]*$/m, "")
    .replace(/\n+标签[：:][\s\S]*$/m, "")
    .replace(/^[-*]\s*/gm, "")
    .trim();
  const lines = clean.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const withoutLists = lines.filter((line) => !/^\d+[.、]/.test(line));
  const compact = withoutLists.join("\n\n").trim();
  if (compact && compact.length <= 360) return compact;
  if (compact) return compact.slice(0, 320).replace(/[，。；、][^，。；、]*$/, "。");
  return buildMomentsDraft(topic);
}

function stripPlatformNoise(raw = "") {
  return String(raw || "")
    .replace(/^标题[：:].*$/gm, "")
    .replace(/^正文[：:]\s*/gm, "")
    .replace(/\n+配图建议[：:][\s\S]*$/m, "")
    .replace(/\n+标签[：:][\s\S]*$/m, "")
    .trim();
}

function runLongkaReview(text = "") {
  const base = globalThis.LongkaContentCreationBase;
  if (base?.runEditorialReview) {
    return base.runEditorialReview({
      draft: text,
      brief: {
        selectedTitle: state.selectedTitle,
        targetPlatform: currentTarget().title,
        selectedQuestion: selectedTopic()?.pain || selectedTopic()?.theme,
        cta: state.goal,
      },
      round: state.draftRevision,
    });
  }
  return null;
}

function buildDraft(options = {}) {
  const topic = selectedTopic();
  if (!topic || !state.selectedTitle) return "";
  if (state.publishTarget === "douyin" || state.publishTarget === "video-account") return buildVideoDraft(topic);
  if (state.publishTarget === "wechat-article") return buildArticleDraft(topic);
  if (state.publishTarget === "moments") return buildMomentsDraft(topic);
  if (state.publishTarget === "topic-only") return buildTopicOnlyDraft(topic);
  return buildXhsDraft(topic, options);
}

function buildXhsDraft(topic, options = {}) {
  const insight = topic.sourceInsight || extractSourceInsight(topic);
  const sourceTitle = cleanSourceText(topic.title || "");
  const angleLine = options.variant
    ? "这次换一个更像真实复盘的角度讲，把问题说透，不写成教程腔。"
    : insight.angle || "这次不照搬原帖，而是把源头观点改成更适合小红书图文的内容。";
  const title = state.selectedTitle || topic.theme || sourceTitle || "这个选题值得重新拆一次";
  const pain = cleanReadableText(topic.pain || insight.pain || "很多人只照搬方法，却没有先判断自己是否适合");
  const theme = cleanReadableText(topic.theme || sourceTitle || state.businessLine);
  const tags = compactTags([state.businessLine, state.industry, "内容避坑", "判断标准", "经验分享"]);
  return `标题：${title}

正文：
很多人做「${theme}」的时候，最容易卡住的不是不会找方法，而是太快进入照抄。

${angleLine}

我这次参考的源头素材是：
「${sourceTitle || topic.theme || title}」

它真正值得拆的不是原句，而是背后的提醒：
${pain}

所以这条内容先不急着给答案，先把判断顺序讲清楚。

你可以先看 3 个地方：

1. 这个问题是突然出现，还是长期反复出现
2. 你之前照着别人做的时候，有没有判断前提是否一样
3. 你现在最缺的是马上行动，还是先把边界想清楚

如果这 3 个问题没弄清楚，先别急着套别人的方法。

真正稳的顺序是：先判断情况，再选择方法，再观察反馈。

标签：${tags}`;
}

function buildVideoDraft(topic) {
  const title = state.selectedTitle || topic.theme || "先别急着照抄这个方法";
  const theme = cleanReadableText(topic.theme || topic.title || state.businessLine);
  const pain = cleanReadableText(topic.pain || "很多人只看结果，没有先判断前提是否一样");
  return `封面标题：${title}

0-3 秒：钩子
你以为「${theme}」难在工具，其实很多人第一步就错了。

3-8 秒：代入
看到别人做出结果后，最容易犯的错就是直接照抄，但很少先问：这个方法适不适合我现在的情况？

8-35 秒：主体
先看三个判断：
第一，问题是突然出现，还是长期反复出现？
第二，你之前试过的方法，是不是只看结果，没看前提？
第三，你现在需要的是马上行动，还是先做一次基础判断？

35-48 秒：源头问题
这条选题来自真实素材：${topic.title || theme}
它值得参考的地方不是原文表达，而是背后的用户问题：${pain}

48-60 秒：行动
所以别急着照抄。先把自己的情况判断清楚，再决定下一步怎么做。

分镜提示：
1. 开头大字：先别急着照抄
2. 中段字幕卡：3 个判断问题
3. 画面：源头素材 / 评论问题打码截图
4. 结尾：先判断，再行动`;
}

function buildArticleDraft(topic) {
  const title = state.selectedTitle || topic.theme || "这个选题为什么值得写";
  const pain = cleanReadableText(topic.pain || "很多内容失败不是没有观点，而是没有把真实问题拆清楚");
  return `# ${title}

## 这个选题为什么值得写
在「${state.industry}」里，很多内容失败不是因为没有观点，而是没有把真实问题拆清楚。

这次源头素材暴露的问题是：${pain}

## 一、不要先套方法，先判断场景
同一个方法放在不同人身上，效果可能完全不同。内容创作也是一样，不能只学标题和句式，要先看它解决了什么问题。

## 二、拆源头素材的三个信号
1. 标题为什么能让人停下来？
2. 正文提供了什么判断标准？
3. 评论区或用户问题说明了什么需求？

## 三、改造成自己的内容资产
我们要复用的是结构和洞察，不是原文表达。围绕「${state.businessLine}」，更适合的写法是：先讲误区，再给判断框架，最后给低门槛行动入口。

## 四、一鱼多吃
这个选题后续可以继续改成小红书图文、短视频脚本和朋友圈文案。`;
}

function buildMomentsDraft(topic) {
  const pain = cleanReadableText(topic.pain || "很多内容不是没价值，是换个平台后还沿用同一套写法");
  return `最近越来越觉得，内容不能偷懒直接照抄。

比如同一个选题，小红书可以写得像干货清单，但发朋友圈就不一样。朋友圈里大家看的不是步骤，而是你最近真的发现了什么、踩过什么坑。

我这两天拆到一个点：${pain}

所以现在我会先把核心判断留下，再换成更像自己说话的表达。别一上来就讲方法，先讲你为什么突然有这个感受。

有需要的话，我把这套“一个选题改成不同平台”的小流程发你。`;
}

function buildTopicOnlyDraft(topic) {
  return `选题：${topic.theme}

源头素材：
${topic.title}

用户痛点：
${topic.pain}

复用方向：
${topic.reuse}

风险边界：
${topic.risk}`;
}

function renderBindingEvidence() {
  const topic = selectedTopic();
  if (!topic) return "<p>还没有选中选题。</p>";
  const titleLabel = state.publishTarget === "moments" ? "选中角度" : "选中标题";
  return `
    <p><strong>选题：</strong>${escapeHtml(topic.theme)}</p>
    <p><strong>源头素材：</strong>${escapeHtml(topic.title)}</p>
    <p><strong>来源平台：</strong>${escapeHtml(topic.platform)}</p>
    <p><strong>目标平台：</strong>${escapeHtml(currentTarget().title)}</p>
    <p><strong>${escapeHtml(titleLabel)}：</strong>${escapeHtml(state.selectedTitle)}</p>
    <p><strong>风险边界：</strong>${escapeHtml(topic.risk)}</p>
    ${topic.url ? `<p><a class="source-link" href="${escapeHtml(topic.url)}" target="_blank" rel="noreferrer">打开原始素材核对</a></p>` : ""}
  `;
}


function buildContentCoachReport() {
  const copy = activeCopyText();
  const topic = selectedTopic() || {};
  const title = state.selectedTitle || "";
  const plain = stripPlatformNoise(copy);
  const opening = plain.split(/\n+/).map((line) => line.trim()).filter(Boolean).slice(0, 2).join(" ");
  const platform = state.publishTarget;
  const dimensions = [
    scoreTitleHook(title, topic),
    scoreOpeningRetention(opening, title, topic),
    scoreUserPain(copy, topic),
    scoreSpecificity(copy),
    scoreSaveValue(copy, platform),
    scoreHumanTone(copy),
    scorePlatformFit(copy, platform),
    scoreConversionPath(copy),
  ];
  const total = Math.round(dimensions.reduce((sum, item) => sum + item.score, 0) / Math.max(1, dimensions.length));
  const weakest = dimensions.slice().sort((a, b) => a.score - b.score).slice(0, 3);
  return {
    total,
    level: total >= 86 ? zh("&#21487;&#20197;&#21457;&#65292;&#21482;&#38656;&#24494;&#35843;") : total >= 76 ? zh("&#22522;&#26412;&#33021;&#21457;&#65292;&#24314;&#35758;&#20877;&#20248;&#21270;&#19968;&#29256;") : total >= 66 ? zh("&#26377;&#26694;&#26550;&#65292;&#20294;&#29190;&#28857;&#19981;&#22815;") : zh("&#26242;&#26102;&#19981;&#24314;&#35758;&#21457;"),
    dimensions,
    weakest,
    nextAction: buildCoachNextAction(total, weakest),
  };
}

function scoreTitleHook(title = "", topic = {}) {
  const hasPain = title && topic.pain && textOverlap(title, topic.pain) > 0;
  const hookWords = ["why", "how", "mistake", "secret", "checklist", "AI", "3", "5", "7", "?", "？", "别", "为什么", "原来", "不是", "而是"];
  const hasHook = hookWords.some((word) => String(title || "").includes(word));
  const length = titleCharLength(title);
  const clear = length >= 8 && length <= titleMaxLengthForTarget(state.publishTarget);
  const score = (clear ? 28 : 18) + (hasHook ? 36 : 22) + (hasPain ? 26 : 16);
  return coachDim(zh("&#26631;&#39064;&#38057;&#23376;"), Math.min(92, score), clear && hasHook ? zh("&#26631;&#39064;&#26377;&#25235;&#20154;&#30340;&#21028;&#26029;&#25110;&#24748;&#24565;") : zh("&#26631;&#39064;&#36824;&#20687;&#35828;&#26126;&#25991;&#65292;&#19981;&#22815;&#25235;&#20154;"), clear && hasHook ? "" : zh("&#29992;&#12298;&#24773;&#22659; + &#20914;&#31361;/&#32467;&#26524; + &#21028;&#26029;&#12299;&#37325;&#20889;&#26631;&#39064;"));
}

function scoreOpeningRetention(opening = "", title = "") {
  const answersTitle = title && textOverlap(opening, title) > 0;
  const sceneWords = ["我", "你", "很多人", "刚开始", "卡住", "发现", "今天", "昨天", "测试"];
  const hasScene = sceneWords.some((word) => String(opening || "").includes(word));
  const notEmpty = opening.length >= 25;
  const score = (notEmpty ? 28 : 14) + (answersTitle ? 30 : 18) + (hasScene ? 30 : 18);
  return coachDim(zh("&#24320;&#22836;&#30041;&#23384;"), Math.min(92, score), hasScene ? zh("&#24320;&#22836;&#26377;&#22330;&#26223;&#25110;&#20154;&#30340;&#29366;&#24577;") : zh("&#24320;&#22836;&#36824;&#22312;&#35762;&#36947;&#29702;&#65292;&#32570;&#23569;&#20195;&#20837;&#24863;"), hasScene ? "" : zh("&#20808;&#20889;&#19968;&#20010;&#20855;&#20307;&#22330;&#26223;&#65292;&#20877;&#25243;&#20986;&#21028;&#26029;"));
}

function scoreUserPain(copy = "", topic = {}) {
  const pain = topic.pain || topic.theme || "";
  const bound = pain && textOverlap(copy, pain) > 1;
  const painWords = ["问题", "卡", "难", "不会", "没有", "担心", "焦虑", "为什么", "AI"];
  const hasQuestion = painWords.some((word) => String(copy || "").includes(word));
  const score = (bound ? 42 : 24) + (hasQuestion ? 42 : 26);
  return coachDim(zh("&#29992;&#25143;&#30171;&#28857;"), Math.min(92, score), bound ? zh("&#33021;&#22238;&#21040;&#24403;&#21069;&#27597;&#39064;&#30340;&#26680;&#24515;&#38382;&#39064;") : zh("&#21644;&#27597;&#39064;&#32465;&#23450;&#19981;&#22815;&#65292;&#23481;&#26131;&#36305;&#39064;"), bound ? "" : zh("&#25226;&#21069; 30% &#25913;&#25104;&#29992;&#25143;&#27491;&#22312;&#36935;&#21040;&#30340;&#38382;&#39064;"));
}

function scoreSpecificity(copy = "") {
  const numbers = (copy.match(/\d+|一|二|三|四|五|六|七|八|九|十/g) || []).length;
  const concreteWords = ["案例", "步骤", "清单", "表格", "账号", "数据", "截图", "模板", "方法", "流程"];
  const concrete = concreteWords.some((word) => String(copy || "").includes(word));
  const score = Math.min(92, 42 + Math.min(24, numbers * 4) + (concrete ? 26 : 12));
  return coachDim(zh("&#20855;&#20307;&#24863;"), score, concrete ? zh("&#26377;&#27493;&#39588;&#12289;&#26696;&#20363;&#25110;&#21487;&#35265;&#30340;&#19996;&#35199;") : zh("&#34920;&#36798;&#20559;&#25277;&#35937;&#65292;&#35835;&#32773;&#19981;&#22909;&#31435;&#21051;&#29992;"), concrete ? "" : zh("&#21152;&#20837;&#25968;&#23383;&#12289;&#27493;&#39588;&#12289;&#26696;&#20363;&#25110;&#20855;&#20307;&#22330;&#26223;"));
}

function scoreSaveValue(copy = "", platform = "xhs") {
  const reusableWords = ["清单", "模板", "步骤", "公式", "方法", "SOP", "避坑", "复盘", "收藏", "对照"];
  const hasReusable = reusableWords.some((word) => String(copy || "").includes(word));
  const enough = platform === "moments" ? copy.length >= 80 : copy.length >= 240;
  const score = (hasReusable ? 54 : 30) + (enough ? 32 : 18);
  return coachDim(zh("&#25910;&#34255;&#20215;&#20540;"), Math.min(92, score), hasReusable ? zh("&#26377;&#21487;&#22797;&#29992;&#30340;&#26041;&#27861;&#25110;&#28165;&#21333;") : zh("&#30475;&#23436;&#21487;&#33021;&#26377;&#24863;&#35273;&#65292;&#20294;&#19981;&#22815;&#20540;&#24471;&#25910;&#34255;"), hasReusable ? "" : zh("&#21152;&#19968;&#27573;&#12298;&#20320;&#21487;&#20197;&#30452;&#25509;&#25353;&#36825;&#20960;&#27493;&#20570;&#12299;"));
}

function scoreHumanTone(copy = "") {
  const aiSmellWords = ["综上", "总之", "首先", "其次", "最后", "需要注意的是"];
  const humanWords = ["我", "你", "其实", "说白了", "刚开始", "踩坑", "别急", "真的"];
  const aiSmell = aiSmellWords.some((word) => String(copy || "").includes(word));
  const hasHuman = humanWords.some((word) => String(copy || "").includes(word));
  const score = 50 + (hasHuman ? 28 : 12) - (aiSmell ? 16 : 0);
  return coachDim(zh("&#20154;&#21619;&#34920;&#36798;"), Math.max(48, Math.min(92, score)), hasHuman && !aiSmell ? zh("&#26377;&#33258;&#28982;&#35821;&#27668;&#65292;AI &#21619;&#19981;&#37325;") : zh("&#35821;&#27668;&#36824;&#20687;&#27169;&#26495;&#25991;"), hasHuman && !aiSmell ? "" : zh("&#25226;&#22823;&#36947;&#29702;&#25913;&#25104;&#19968;&#20010;&#20154;&#23545;&#21478;&#19968;&#20010;&#20154;&#35828;&#35805;"));
}

function scorePlatformFit(copy = "", platform = "xhs") {
  let ok = true;
  let advice = "";
  if (platform === "moments") {
    ok = !/(标题[:：]|正文[:：]|配图建议|标签[:：]|#)/.test(copy) && copy.length <= 420;
    advice = zh("&#26379;&#21451;&#22280;&#19981;&#35201;&#20687;&#25991;&#31456;&#65292;&#25913;&#25104;&#33258;&#28982;&#30340;&#21475;&#35821;&#20998;&#20139;");
  } else if (platform === "wechat-article") {
    ok = copy.length >= 700 || /^#|^##/m.test(copy);
    advice = zh("&#20844;&#20247;&#21495;&#38656;&#35201;&#26356;&#23436;&#25972;&#30340;&#35770;&#35777;&#12289;&#23567;&#26631;&#39064;&#21644;&#26696;&#20363;");
  } else if (platform === "douyin" || platform === "video-account") {
    ok = /(开场|镜头|口播|字幕|钩子|0-3|3秒)/.test(copy);
    advice = zh("&#30701;&#35270;&#39057;&#35201;&#26377; 3 &#31186;&#38057;&#23376;&#12289;&#21475;&#25773;&#33410;&#22863;&#21644;&#38236;&#22836;&#20998;&#35299;");
  } else {
    ok = /(标签[:：]|#|收藏|评论|私信)/.test(copy);
    advice = zh("&#23567;&#32418;&#20070;&#35201;&#26377;&#25910;&#34255;&#28857;&#12289;&#20302;&#21387;&#34892;&#21160;&#20837;&#21475;&#21644;&#35805;&#39064;&#26631;&#31614;");
  }
  return coachDim(zh("&#24179;&#21488;&#36866;&#37197;"), ok ? 88 : 62, ok ? zh("&#20889;&#27861;&#22522;&#26412;&#31526;&#21512;&#24403;&#21069;&#24179;&#21488;") : zh("&#36824;&#20687;&#36890;&#29992;&#25991;&#26696;&#65292;&#24179;&#21488;&#20889;&#27861;&#19981;&#22815;"), ok ? "" : advice);
}

function scoreConversionPath(copy = "") {
  const actionWords = ["收藏", "评论", "私信", "对照", "测试", "保存", "下一步", "留言"];
  const hardWords = ["立刻购买", "马上成交", "保证", "包你", "稳赚"];
  const hasSoftAction = actionWords.some((word) => String(copy || "").includes(word));
  const tooHard = hardWords.some((word) => String(copy || "").includes(word));
  const score = 56 + (hasSoftAction ? 28 : 8) - (tooHard ? 18 : 0);
  return coachDim(zh("&#34892;&#21160;&#20837;&#21475;"), Math.max(45, Math.min(92, score)), hasSoftAction ? zh("&#32467;&#23614;&#26377;&#20302;&#21387;&#21160;&#20316;") : zh("&#32467;&#23614;&#27809;&#26377;&#35753;&#35835;&#32773;&#30693;&#36947;&#19979;&#19968;&#27493;&#20570;&#20160;&#20040;"), hasSoftAction ? "" : zh("&#21152;&#19968;&#20010;&#20302;&#21387;&#21160;&#20316;&#65306;&#25910;&#34255;&#12289;&#23545;&#29031;&#12289;&#35780;&#35770;&#25110;&#31169;&#20449;"));
}

function coachDim(name, score, reason, advice = "") {
  return { name, score: Math.round(score), reason, advice, warn: score < 76 };
}

function textOverlap(a = "", b = "") {
  const aText = String(a || "");
  const bText = String(b || "");
  const tokens = bText.match(/[A-Za-z0-9\u4e00-\u9fa5]{2,}/g) || [];
  return tokens.filter((token) => aText.includes(token)).length;
}

function buildCoachNextAction(total, weakest = []) {
  const first = weakest[0]?.name || zh("&#20869;&#23481;");
  if (total >= 86) return zh("&#21487;&#20197;&#36827;&#20837;&#30830;&#35748;&#65292;&#21482;&#38656;&#25163;&#21160;&#26680;&#23545;&#32454;&#33410;");
  if (first === zh("&#26631;&#39064;&#38057;&#23376;")) return zh("&#20808;&#25913;&#26631;&#39064;&#65292;&#26631;&#39064;&#19981;&#36807;&#20851;&#65292;&#21518;&#38754;&#20877;&#22909;&#20063;&#38590;&#29190;");
  if (first === zh("&#24320;&#22836;&#30041;&#23384;")) return zh("&#20808;&#25913;&#24320;&#22836;&#65292;&#29992;&#22330;&#26223;&#25110;&#20914;&#31361;&#25235;&#20303;&#20154;");
  if (first === zh("&#24179;&#21488;&#36866;&#37197;")) return `${zh("&#20808;&#25353;")} ${currentTarget().title} ${zh("&#30340;&#20889;&#27861;&#37325;&#25490;&#19968;&#29256;")}`;
  if (first === zh("&#20154;&#21619;&#34920;&#36798;")) return zh("&#20808;&#21435; AI &#21619;&#65292;&#25913;&#25104;&#26356;&#20687;&#20154;&#35828;&#35805;&#30340;&#29256;&#26412;");
  return `${zh("&#20808;&#20462;")}${first}${zh("&#65292;&#20877;&#36827;&#20837;&#19979;&#19968;&#27493;")}`;
}

function renderContentCoachPanel(coach) {
  return `<div class="content-coach-panel">
    <div class="content-coach-head">
      <div><b>${zh("&#21457;&#24067;&#21069;&#20307;&#26816;")}</b><span>${escapeHtml(coach.level)} - ${escapeHtml(coach.nextAction)}</span></div>
      <strong>${coach.total}</strong>
    </div>
    <div class="coach-dim-grid">
      ${coach.dimensions.map((item) => `<article class="${item.warn ? "warn" : ""}"><b>${escapeHtml(item.name)}</b><strong>${item.score}</strong><span>${escapeHtml(item.reason)}</span>${item.advice ? `<small>${escapeHtml(item.advice)}</small>` : ""}</article>`).join("")}
    </div>
    <div class="coach-action-box">
      <b>${zh("&#26412;&#27425;&#20248;&#20808;&#20462;&#36825;&#20960;&#28857;")}</b>
      <ol>${coach.weakest.map((item) => `<li><strong>${escapeHtml(item.name)}?</strong>${escapeHtml(item.advice || item.reason)}</li>`).join("")}</ol>
    </div>
  </div>`;
}

function scoreDraft() {
  const text = state.improvedDraft || state.draft || "";
  const review = state.draftReview || runLongkaReview(text);
  if (review) {
    const gate = review.gate || {};
    const ai = review.ai || {};
    const rows = [
      { name: "开头留存", ok: gate.checks?.answers_question !== false, good: "开头围绕当前主问题，没有泛泛铺垫。", bad: "开头还没有咬住当前标题对应的主问题。" },
      { name: "源头绑定", ok: Boolean(state.selectedTopicId), good: "正文绑定了选中的素材和标题。", bad: "缺少源头素材绑定，容易写成通用稿。" },
      { name: "具体感", ok: gate.checks?.not_encyclopedia !== false, good: "不是百科式堆知识，保留了判断路径。", bad: "表达太像百科说明，需要改成具体判断场景。" },
      { name: "人味表达", ok: ai.ok !== false, good: "没有明显模板腔。", bad: (ai.fixes || ["句式太顺、太完整，需要打散并加入真实口语节奏。"])[0] },
      { name: "行动入口", ok: gate.checks?.has_action !== false, good: "结尾有低压力下一步。", bad: "结尾缺少可执行动作。" },
      { name: "合规边界", ok: gate.checks?.no_fake_story !== false, good: "没有虚构身份、绝对承诺或高风险表达。", bad: "有虚构经历或承诺感，需要删除。" },
    ];
    return rows.map((item) => ({
      score: item.ok ? 88 : 66,
      name: item.name,
      reason: item.ok ? item.good : item.bad,
      warn: !item.ok,
    }));
  }
  const hasAction = /收藏|私信|留言|下一步|行动|测试|评估|对照|评论/.test(text);
  const hasSource = Boolean(state.selectedTopicId);
  const hasAiSmell = /真正|关键|此外|总之|不是.*而是|首先|其次|最后|希望.*帮助/.test(text);
  const hasRisky = /保证|根治|一定有效|确定收益|100%/.test(text);
  return [
    { score: text.length > 350 ? 84 : 68, name: "完整度", reason: text.length > 350 ? "已有正文和行动入口。" : "正文偏短，难以完成平台内容交付。", warn: text.length <= 350 },
    { score: hasSource ? 88 : 60, name: "源头绑定", reason: hasSource ? "绑定了选中素材。" : "缺少选中素材。", warn: !hasSource },
    { score: hasAiSmell ? 64 : 86, name: "人味表达", reason: hasAiSmell ? "有明显 AI 连接词或模板句式。" : "没有明显模板腔。", warn: hasAiSmell },
    { score: hasAction ? 84 : 66, name: "行动入口", reason: hasAction ? "有下一步动作。" : "需要给读者一个低门槛动作。", warn: !hasAction },
    { score: hasRisky ? 58 : 88, name: "合规边界", reason: hasRisky ? "存在绝对化表达。" : "没有明显绝对承诺。", warn: hasRisky },
  ];
}

function improveDraft(text, again = false) {
  if (!text) return "";
  const review = state.draftReview || runLongkaReview(text);
  const fixes = review?.rewriteBrief?.length ? review.rewriteBrief : [
    "开头删除解释腔，直接回答标题里的主问题。",
    "保留一个真实场景，不要每段都写成完整道理。",
    "把结尾改成低压力动作：收藏、对照、留言或评估。",
  ];
  return rewriteDraftByEditorialRules(text, fixes, again);
}

function rewriteDraftByEditorialRules(text = "", fixes = [], again = false) {
  const clean = stripEditorialNotes(text);
  const title = extractDraftField(clean, "标题") || state.selectedTitle || selectedTopic()?.theme || "这件事别急着照抄";
  const body = extractDraftField(clean, "正文") || clean;
  if (state.publishTarget === "moments") {
    return formatMomentsSopDraft(rewriteBodyWithFocus(body, fixes, again));
  }
  if (state.publishTarget === "wechat-article") {
    return formatWechatSopDraft({ title, body: rewriteBodyWithFocus(body, fixes, again) });
  }
  if (state.publishTarget === "douyin" || state.publishTarget === "video-account") {
    return formatVideoSopDraft({ title, body: rewriteBodyWithFocus(body, fixes, again) });
  }
  const tags = extractDraftField(clean, "标签") || "";
  const rewrittenTitle = rewriteTitleWithSuspense(title);
  const rewrittenBody = rewriteBodyWithFocus(body, fixes, again);
  const parts = [
    `标题：${rewrittenTitle}`,
    "",
    "正文：",
    rewrittenBody,
  ];
  if (tags) parts.push("", `标签：${compactTags(tags)}`);
  return parts.join("\n");
}

function stripEditorialNotes(text = "") {
  return String(text || "")
    .replace(/\n+Longka 文案体检修改方向[:：][\s\S]*$/g, "")
    .replace(/\n+第二轮体检修改方向[:：][\s\S]*$/g, "")
    .replace(/\n+第\d+轮体检修改方向[:：][\s\S]*$/g, "")
    .replace(/\n+优化补充[:：][\s\S]*$/g, "")
    .trim();
}

function extractDraftField(text = "", label = "") {
  const pattern = new RegExp(`${label}[：:]\\s*([\\s\\S]*?)(?=\\n\\s*(标题|正文|标签|配图建议|Longka|第二轮|第\\d+轮|优化补充)[：:]|$)`);
  const match = String(text || "").match(pattern);
  return match ? match[1].trim() : "";
}

function rewriteTitleWithSuspense(title = "") {
  const clean = String(title || "").replace(/\s+/g, " ").trim();
  if (!clean) return state.selectedTitle || "这件事别急着照抄";
  if (/为什么|到底|别急|真正|不是/.test(clean)) return clean;
  if (clean.length > 24) return `${clean.slice(0, 22)}，问题不在工具`;
  return `${clean}，先别急着要答案`;
}

function rewriteBodyWithFocus(body = "", fixes = [], again = false) {
  const selected = selectedTopic() || {};
  const question = cleanSourceText(selected.pain || selected.reason || selected.theme || state.businessLine);
  const raw = stripDraftFieldLabels(body)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^标签[：:]/.test(line))
    .filter((line) => !/^配图建议[：:]/.test(line))
    .filter((line) => !/Longka|体检|修改方向|优化补充/.test(line));
  const lead = buildSharperLead(raw, question, again);
  const points = buildFocusedPoints(raw).slice(0, 3);
  const cta = buildLowPressureCta(question);
  return [
    lead,
    "",
    ...points.flatMap((point, index) => [`${index + 1}. ${point.title}`, point.body, ""]),
    cta,
  ].join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function stripDraftFieldLabels(text = "") {
  return String(text || "")
    .replace(/^正文[：:]\s*/m, "")
    .replace(/^标题[：:].*$/m, "")
    .trim();
}

function buildSharperLead(lines = [], question = "", again = false) {
  const useful = lines.find((line) => line.length >= 12 && !/很多人一开始|其实|所以|总结|首先|其次|最后/.test(line));
  const base = useful || question || "这个问题真正麻烦的地方，不是不会用工具。";
  if (again) return `我会把问题再收窄一点：${base.replace(/[。！？?.]$/, "")}。`;
  return `${base.replace(/[。！？?.]$/, "")}。`;
}

function buildFocusedPoints(lines = []) {
  const clean = lines
    .map((line) => line.replace(/^\d+[.、]\s*/, "").replace(/^[-•]\s*/, "").trim())
    .filter((line) => line.length >= 8)
    .filter((line) => !/标签|配图|Longka|体检|修改方向|优化补充/.test(line));
  if (clean.length >= 3) {
    return clean.slice(0, 3).map((line, index) => ({
      title: index === 0 ? "先把主问题说窄" : index === 1 ? "保留真实判断，不要写成百科" : "给读者一个能马上做的动作",
      body: line.endsWith("。") ? line : `${line}。`,
    }));
  }
  return [
    {
      title: "先判断你卡的是素材，还是表达",
      body: "如果素材本身很薄，继续换标题、换模型都没用。先把能证明这个观点的案例、评论、截图和反例补齐。",
    },
    {
      title: "只抓一个主问题写，不要一篇塞太满",
      body: "小红书图文更怕平均用力。围绕一个判断讲透，比把所有类型都讲一遍更容易让人停下来。",
    },
    {
      title: "结尾给一个低压力动作",
      body: "不要急着卖，也不要硬总结金句。让读者先收藏、对照、留言一个具体问题，后面才有继续转化的空间。",
    },
  ];
}

function buildLowPressureCta(question = "") {
  const topic = question || selectedTopic()?.theme || state.businessLine;
  return `如果你也卡在「${topic.slice(0, 24)}」这类问题上，先别急着照抄别人的方案。把你现在最卡的一句话写下来，再决定下一步怎么改。`;
}

function compactImagePlan(imagePlan = "") {
  return String(imagePlan || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5)
    .join("\n");
}

function compactTags(tags = "") {
  const clean = String(tags || "")
    .replace(/^标签[：:]\s*/, "")
    .replace(/[，,]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8);
  return clean.join(" ");
}
function buildDeliveryPlan() {
  if (state.publishTarget === "wechat-article") return ["长文标题", "开头问题", "案例展开", "方法论结构", "结尾转化"];
  if (state.publishTarget === "douyin" || state.publishTarget === "video-account") return ["封面标题", "黄金 3 秒", "口播正文", "分镜字幕", "素材需求"];
  if (state.publishTarget === "moments") return ["自然开头", "真实观察", "判断建议", "私聊入口"];
  return ["封面：停留标题", "第 2 张：为什么别急着照抄", "第 3 张：3 个自查问题", "第 4 张：源头痛点", "第 5 张：行动入口"];
}

function renderAssetPage(route) {
  if (route === "assets") renderAssets();
  if (route === "titles") {
    renderTitleAssets();
    return;
  }
  const map = {
    questions: "客户问题库",
    titles: "标题库",
    structures: "爆款结构库",
    records: "作品记录",
  };
  const idMap = {
    questions: "questionBoard",
    titles: "titleBoard",
    structures: "structureBoard",
    records: "recordBoard",
  };
  if (map[route]) {
    const target = byId(idMap[route]);
    if (target) target.innerHTML = sampleAssetItems(map[route]);
  }
}

async function renderTitleAssets() {
  const target = byId("titleBoard");
  if (!target) return;
  target.innerHTML = `<div class="empty-state"><b>正在读取标题资产</b><span>从真实采集样本中抽取标题、公式和互动数据。</span></div>`;
  try {
    const params = new URLSearchParams({
      keywords: state.keywords || "",
      limit: "80",
    });
    const res = await fetch(apiPath(`/api/title-assets?${params.toString()}`));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    const titles = Array.isArray(result.titles) ? result.titles : [];
    const groups = groupTitleAssets(titles);
    target.innerHTML = renderTitleAssetWorkbench(result, titles, groups);
    return;
  } catch (error) {
    target.innerHTML = `<div class="empty-state"><b>标题库读取失败</b><span>${escapeHtml(error.message)}</span></div>`;
  }
}

function groupTitleAssets(titles = []) {
  const map = new Map();
  for (const item of titles) {
    const key = item.formula || inferTitleGroupName(item.title) || "待拆解";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return [...map.entries()].map(([name, items]) => ({
    name,
    items: items.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 8),
  })).sort((a, b) => b.items.length - a.items.length);
}

function renderTitleAssetWorkbench(result = {}, titles = [], groups = []) {
  const exactCount = result.filterMiss ? 0 : titles.length;
  const formulaCount = groups.length;
  const top = titles[0] || {};
  const status = result.filterMiss
    ? "当前方向还缺标题资产，下面先展示全库高分标题作为参考；需要继续采集本方向爆款标题。"
    : "当前方向已有可复用标题资产，可以直接支撑第 6 步标题改写。";
  return `
    <div class="asset-summary asset-command">
      <b>标题资产库不是标题列表</b>
      <span>它负责沉淀真实爆款标题、拆出公式、绑定表现数据，并反哺今日工作台第 6 步。</span>
    </div>
    <div class="asset-kpi-grid">
      <article><b>${exactCount}</b><span>当前方向标题</span></article>
      <article><b>${titles.length}</b><span>本次可参考标题</span></article>
      <article><b>${formulaCount}</b><span>已识别公式</span></article>
      <article><b>${escapeHtml(top.score || 0)}</b><span>最高标题分</span></article>
    </div>
    <section class="asset-lane">
      <div class="title-group-head">
        <b>现在该怎么用</b>
        <span>${escapeHtml(status)}</span>
      </div>
      <div class="asset-grid title-asset-grid">
        <article class="asset-item">
          <b>1. 先看当前方向是否有标题资产</b>
          <span>如果这里是 0，说明不是生成器不努力，而是这个方向还没采集足够好标题。</span>
        </article>
        <article class="asset-item">
          <b>2. 再看哪些公式真的有效</b>
          <span>同一话题要覆盖认知冲突、损失规避、数字清单、案例经验等不同触发器。</span>
        </article>
        <article class="asset-item">
          <b>3. 最后回到第 6 步改写标题</b>
          <span>第 6 步会优先调用这里的标题资产；发布后的数据再回流，标题库才会越用越强。</span>
        </article>
      </div>
    </section>
    ${groups.length ? groups.map(renderTitleAssetGroup).join("") : `<article class="empty-state"><b>还没有标题资产</b><span>先采集真实高表现内容，标题会自动进入这里。</span></article>`}
  `;
}

function inferTitleGroupName(title = "") {
  if (/为什么|不是|而是|真正/.test(title)) return "认知冲突型";
  if (/别|警告|避坑|不要/.test(title)) return "损失提醒型";
  if (/\d|第|个|条/.test(title)) return "数字清单型";
  if (/如何|怎么|清单|步骤/.test(title)) return "行动方法型";
  if (/我|亲测|经验|复盘/.test(title)) return "经验复盘型";
  return "待拆解";
}

function renderTitleAssetGroup(group) {
  return `<section class="title-group">
    <div class="title-group-head">
      <b>${escapeHtml(group.name)}</b>
      <span>${group.items.length} 条高分标题</span>
    </div>
    <div class="asset-grid title-asset-grid">${group.items.map(renderTitleAssetCard).join("")}</div>
  </section>`;
}

function renderTitleAssetCard(item) {
  const metrics = item.metrics || {};
  return `<article class="asset-item title-asset">
    <b>${escapeHtml(item.title)}</b>
    <span>${escapeHtml(item.reason || "真实标题资产")}</span>
    <div class="metric-row">
      <span>${escapeHtml(item.platform || "unknown")}</span>
      <span>分 ${escapeHtml(item.score || 0)}</span>
      <span>赞 ${escapeHtml(metrics.likes || 0)}</span>
      <span>藏 ${escapeHtml(metrics.saves || 0)}</span>
      <span>评 ${escapeHtml(metrics.comments || 0)}</span>
    </div>
    <p><strong>公式：</strong>${escapeHtml(item.formula || "待拆解")}</p>
    ${item.url ? `<a class="source-link" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">打开来源</a>` : ""}
  </article>`;
}

async function renderAssets() {
  const target = $("#assetBoard");
  if (!target) return;
  target.innerHTML = `<article class="empty-state"><b>${zh("&#27491;&#22312;&#35835;&#21462;&#20869;&#23481;&#36164;&#20135;&#24211;")}</b><span>${zh("&#27491;&#22312;&#20174; 122 &#32479;&#19968;&#20316;&#21697;&#24211;&#21644;&#32032;&#26448;&#24211;&#35835;&#21462;&#25968;&#25454;&#12290;")}</span></article>`;
  let db;
  let topics = [];
  let sampleCount = 0;
  try {
    db = await loadFullAssetState();
    let remoteWorks = Array.isArray(db.finalWorks) ? db.finalWorks : [];
    const localWorks = Array.isArray(state.finalWorks) ? state.finalWorks : [];
    const syncResult = await syncLocalFinalWorksToServer(localWorks, remoteWorks);
    remoteWorks = syncResult.finalWorks;
    if (syncResult.uploaded) log(`${zh("&#24050;&#25226;&#26412;&#26426;")} ${syncResult.uploaded} ${zh("&#20010;&#26087;&#25104;&#31295;&#21516;&#27493;&#21040; 122 &#32479;&#19968;&#20316;&#21697;&#24211;&#12290;")}`);
    const mergedWorks = new Map();
    [...remoteWorks, ...localWorks].forEach((item) => {
      if (item?.id) mergedWorks.set(item.id, item);
    });
    state.finalWorks = [...mergedWorks.values()].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))).slice(0, 300);
    persistWorkbenchSnapshot();
    const oldSource = state.sourceChannel;
    state.sourceChannel = "all-assets";
    topics = buildTopicsFromDb(db).slice(0, 9);
    state.sourceChannel = oldSource;
    sampleCount = Array.isArray(db.contentSamples) ? db.contentSamples.length : 0;
  } catch (error) {
    target.innerHTML = `<article class="empty-state"><b>${zh("&#20869;&#23481;&#36164;&#20135;&#24211;&#35835;&#21462;&#22833;&#36133;")}</b><span>${escapeHtml(error.message)}</span></article>`;
    return;
  }
  const finalWorksHtml = state.finalWorks.length
    ? `<div class="title-group-head"><b>${zh("&#24050;&#23436;&#25104;&#20316;&#21697;")}</b><span>${state.finalWorks.length} ${zh("&#20010;&#21487;&#22797;&#29992;&#25104;&#31295;")}</span></div><div class="asset-grid">${state.finalWorks.map(renderFinalWorkAsset).join("")}</div>`
    : `<article class="empty-state"><b>${zh("&#36824;&#27809;&#26377;&#20445;&#23384;&#36807;&#25104;&#31295;&#20316;&#21697;")}</b><span>${zh("&#20174;&#20170;&#26085;&#24037;&#20316;&#21488;&#23436;&#25104;&#20986;&#22270;&#21518;&#65292;&#22312;&#31532;12&#27493;&#20445;&#23384;&#65292;&#36825;&#37324;&#20250;&#20986;&#29616;&#21487;&#22797;&#30424;&#12289;&#21487;&#36716;&#24179;&#21488;&#30340;&#20316;&#21697;&#21345;&#12290;")}</span></article>`;
  const opsSummary = buildAssetOpsSummary(state.finalWorks);
  const topicCards = topics.map((item) => `<article class="asset-item"><b>${escapeHtml(item.theme)}</b><span>${escapeHtml(item.reason)}</span><p><strong>${zh("&#36866;&#21512;&#22797;&#29992;&#65306;")}</strong>${zh("&#23567;&#32418;&#20070;&#22270;&#25991;&#12289;&#20844;&#20247;&#21495;&#38271;&#25991;&#12289;&#26379;&#21451;&#22280;&#12289;&#30701;&#35270;&#39057;&#33050;&#26412;")}</p>${item.url ? `<a class="source-link" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${zh("&#25171;&#24320;&#26469;&#28304;")}</a>` : ""}</article>`).join("") || `<article class="empty-state"><b>${zh("&#26242;&#26080;&#28304;&#32032;&#26448;")}</b><span>${zh("&#20808;&#35835;&#21462;&#21382;&#21490;&#36164;&#20135;&#12289;&#37319;&#38598; X &#36134;&#21495;&#65292;&#25110;&#23548;&#20837;&#32032;&#26448;&#12290;")}</span></article>`;
  target.innerHTML = `
    <section class="asset-lane">
      <div class="asset-summary asset-command">
        <b>${zh("&#20869;&#23481;&#36164;&#20135;&#24211;&#19981;&#26159;&#25910;&#34255;&#22841;")}</b>
        <span>${zh("&#23427;&#25226;&#30495;&#23454;&#32032;&#26448;&#21464;&#25104;&#21487;&#22797;&#21033;&#22797;&#20889;&#30340;&#27597;&#39064;&#65292;&#20877;&#27785;&#28096;&#24179;&#21488;&#25104;&#31295;&#12289;&#22270;&#25991;&#36164;&#20135;&#21644;&#21457;&#24067;&#22797;&#30424;&#12290;")}</span>
      </div>
      <div class="asset-kpi-grid">
        <article><b>${sampleCount}</b><span>${zh("&#28304;&#32032;&#26448;&#26679;&#26412;")}</span></article>
        <article><b>${topics.length}</b><span>${zh("&#21487;&#29992;&#27597;&#39064;&#20505;&#36873;")}</span></article>
        <article><b>${state.finalWorks.length}</b><span>${zh("&#24050;&#23436;&#25104;&#24179;&#21488;&#29256;&#26412;")}</span></article>
        <article><b>7d</b><span>${zh("&#21457;&#24067;&#21518;&#22797;&#30424;&#33410;&#28857;")}</span></article>
      </div>
      <div class="asset-ops-board">
        <div class="title-group-head"><b>${zh("&#20170;&#26085;&#20316;&#21697;&#29366;&#24577;")}</b><span>${zh("&#23567;&#22969;&#19981;&#38656;&#35201;&#35760;&#25351;&#20196;&#65292;&#25353;&#29366;&#24577;&#28857;&#19979;&#19968;&#27493;&#12290;")}</span></div>
        <div class="asset-ops-grid">
          <article><b>${opsSummary.ready}</b><span>${zh("&#24453;&#30331;&#35760;&#21457;&#24067;")}</span><small>${zh("&#21457;&#20986;&#21435;&#21518;&#22635;&#24179;&#21488;&#21644;&#38142;&#25509;")}</small></article>
          <article><b>${opsSummary.pendingRetro}</b><span>${zh("&#24453;&#22797;&#30424;&#26657;&#20934;")}</span><small>${zh("T+3 &#34917;&#25968;&#25454;&#65292;&#26657;&#20934;&#21028;&#26029;")}</small></article>
          <article><b>${opsSummary.due}</b><span>${zh("&#21040;&#26399;&#24453;&#22797;&#30424;")}</span><small>${zh("&#20248;&#20808;&#34917;&#25968;&#25454;")}</small></article>
          <article><b>${opsSummary.positive}</b><span>${zh("&#27491;&#20363;&#26679;&#26412;")}</span><small>${zh("&#20540;&#24471;&#19968;&#40060;&#22810;&#21507;")}</small></article>
          <article><b>${opsSummary.negative}</b><span>${zh("&#21453;&#20363;&#26679;&#26412;")}</span><small>${zh("&#29992;&#26469;&#23545;&#29031;&#21644;&#38450;&#27490;&#37325;&#29359;")}</small></article>
        </div>
      </div>
      <div class="asset-grid">
        <article class="asset-item"><b>${zh("&#37319;&#38598;&#22522;&#24231;")}</b><span>MediaCrawlerPro / XCrawl / RSS / ${zh("&#25163;&#21160;&#23548;&#20837;&#36127;&#36131;&#25343;&#30495;&#23454;&#32032;&#26448;&#65292;&#19981;&#29992;&#20551;&#25968;&#25454;&#22635;&#39029;&#38754;&#12290;")}</span></article>
        <article class="asset-item"><b>${zh("&#20869;&#23481;&#25286;&#35299;&#22522;&#24231;")}</b><span>${zh("Longka &#26631;&#39064;&#24211; / &#32467;&#26500;&#24211;&#25226;&#32032;&#26448;&#25286;&#25104;&#29992;&#25143;&#30171;&#28857;&#12289;&#26631;&#39064;&#20844;&#24335;&#12289;&#32467;&#26500;&#21644;&#22797;&#29992;&#35282;&#24230;&#12290;")}</span></article>
        <article class="asset-item"><b>${zh("&#35270;&#35273;&#29983;&#20135;&#22522;&#24231;")}</b><span>${zh("&#23567;&#40657;&#12289;&#24402;&#34255;&#12289;&#23453;&#29577;&#12289;Open Design &#36127;&#36131;&#25226;&#30830;&#35748;&#25991;&#26696;&#20570;&#25104;&#22270;&#25991;&#12289;&#38271;&#25991;&#37197;&#22270;&#25110;&#28436;&#31034;&#31295;&#12290;")}</span></article>
        <article class="asset-item"><b>${zh("&#22797;&#30424;&#35757;&#32451;&#22522;&#24231;")}</b><span>${zh("&#21457;&#24067;&#21518;&#34917;&#38405;&#35835;&#12289;&#28857;&#36190;&#12289;&#25910;&#34255;&#12289;&#35780;&#35770;&#65292;&#21028;&#26029;&#27597;&#39064;&#26159;&#27491;&#20363;&#12289;&#21453;&#20363;&#65292;&#36824;&#26159;&#20540;&#24471;&#20108;&#27425;&#25913;&#20889;&#12290;")}</span></article>
      </div>
      ${finalWorksHtml}
    </section>
    <section class="asset-lane">
      <div class="title-group-head"><b>${zh("&#28304;&#32032;&#26448; / &#27597;&#39064;&#20505;&#36873;")}</b><span>${zh("&#29992;&#20110;&#32487;&#32493;&#25214;&#36873;&#39064;&#21644;&#19968;&#40060;&#22810;&#21507;&#12290;")}</span></div>
      <div class="asset-grid">${topicCards}</div>
    </section>`;
}

function renderFinalWorkAsset(item) {
  const images = Array.isArray(item.images) ? item.images : [];
  const body = cleanPublishBodyForCopy(item.body || "");
  const bodyPreview = body.length > 900 ? body.slice(0, 900) + "\n\n..." : body;
  const metrics = item.publishMetrics || {};
  const views = Number(metrics.views || 0);
  const likes = Number(metrics.likes || 0);
  const saves = Number(metrics.saves || 0);
  const comments = Number(metrics.comments || 0);
  const shares = Number(metrics.shares || 0);
  const pending = zh("&#24453;&#34917;");
  const saveRate = views ? `${((saves / views) * 100).toFixed(1)}%` : pending;
  const engageRate = views ? `${(((likes + saves + comments + shares) / views) * 100).toFixed(1)}%` : pending;
  const isEditing = state.editingMetricsWorkId === item.id;
  const isEditingPublish = state.editingPublishWorkId === item.id;
  const status = finalWorkStatus(item);
  const publishRecord = item.publishRecord || {};
  const platformId = item.platformId || inferPlatformIdFromTitle(item.platform);
  const expectedImages = platformId === "xhs" ? 5 : images.length;
  const imageComplete = platformId !== "xhs" || images.length >= expectedImages;
  const availableTargets = publishTargets.filter((target) => target.id !== "topic-only" && target.id !== platformId);
  const createdAt = item.createdAt ? new Date(item.createdAt).toLocaleString() : zh("&#26410;&#35760;&#24405;&#26102;&#38388;");
  return `<article class="asset-item final-work-asset">
    <header class="final-work-head"><div><b>${escapeHtml(item.title)}</b><span>${escapeHtml(item.platform)} ${zh("&#29256;&#26412;")} / ${body.length} ${zh("&#23383;&#27491;&#25991;")} / ${platformId === "xhs" ? `${images.length}/${expectedImages}` : images.length} ${zh("&#24352;&#22270;&#29255;")} / ${escapeHtml(createdAt)}</span></div><em class="asset-status-pill ${escapeHtml(imageComplete ? status.tone : "warn")}">${escapeHtml(imageComplete ? status.label : "图片未齐")}</em></header>
    ${!imageComplete ? `<div class="status-strip warn">这条小红书图文只保存了 ${images.length}/${expectedImages} 张图片，不是完整可发布成稿。请回今日工作台用同一个 jobId 补齐后再保存覆盖。</div>` : ""}
    <p><strong>${zh("&#22797;&#29992;&#27597;&#39064;&#65306;")}</strong>${escapeHtml(item.topic || zh("&#26410;&#35760;&#24405;"))}</p>
    <p><strong>${zh("&#25286;&#35299;&#36164;&#20135;&#65306;")}</strong>${escapeHtml(item.extractedAssets?.structure || zh("&#24453;&#25286;&#35299;"))}</p>
    <details class="asset-delivery-panel"><summary><b>${zh("&#24179;&#21488;&#21457;&#24067;&#25104;&#31295;")}</b><span>${zh("&#23637;&#24320;&#26597;&#30475;&#27491;&#25991;&#65292;&#25353;&#38062;&#21487;&#30452;&#25509;&#22797;&#21046;&#12290;")}</span></summary><pre>${escapeHtml(bodyPreview || zh("&#36825;&#26465;&#20316;&#21697;&#27809;&#26377;&#20445;&#23384;&#21040;&#27491;&#25991;&#12290;"))}</pre><div class="asset-action-row"><button class="primary" type="button" data-copy-final-body="${escapeHtml(item.id)}">${zh("&#22797;&#21046;&#23436;&#25972;&#25991;&#26696;")}</button><button class="secondary" type="button" data-copy-final-images="${escapeHtml(item.id)}" ${images.length ? "" : "disabled"}>${zh("&#22797;&#21046;&#22270;&#29255;&#38142;&#25509;")}</button></div></details>
    ${images.length ? "" : `<div class="status-strip warn">${zh("&#36825;&#26465;&#20316;&#21697;&#27809;&#26377;&#20445;&#23384;&#22270;&#29255;&#12290;")}</div>`}
    <div class="xhs-generated-grid asset-image-grid">${images.slice(0, 5).map((url, index) => `<div class="asset-image-tile"><a href="${escapeHtml(url)}" target="_blank" rel="noreferrer"><img src="${escapeHtml(url)}" alt="P${index + 1}" loading="lazy" /><span>P${index + 1}</span></a><div class="asset-image-actions"><button class="secondary" type="button" data-copy-image-url="${escapeHtml(url)}">${zh("&#22797;&#21046;&#38142;&#25509;")}</button></div></div>`).join("")}</div>
    <div class="asset-usage-panel"><b>${zh("&#19979;&#19968;&#27493;&#24590;&#20040;&#29992;")}</b><ol><li><strong>${zh("&#32487;&#32493;&#29983;&#20135;&#65306;")}</strong>${zh("&#25226;&#21516;&#19968;&#20010;&#27597;&#39064;&#25913;&#25104;&#21478;&#19968;&#20010;&#24179;&#21488;&#29256;&#26412;&#12290;")}</li><li><strong>${zh("&#21457;&#24067;&#22797;&#30424;&#65306;")}</strong>${zh("&#21457;&#20986;&#21435;&#21518;&#34917;&#25968;&#25454;&#65292;&#21028;&#26029;&#26159;&#21542;&#20540;&#24471;&#32487;&#32493;&#20570;&#12290;")}</li><li><strong>${zh("&#27785;&#28096;&#36164;&#20135;&#65306;")}</strong>${zh("&#25286;&#36827;&#26631;&#39064;&#24211;&#12289;&#32467;&#26500;&#24211;&#21644;&#22270;&#25991;&#39118;&#26684;&#24211;&#12290;")}</li></ol></div>
    ${renderLongkaPredictionPanel(item)}
    <div class="asset-publish-panel"><b>${zh("&#21457;&#24067;&#30331;&#35760;")}</b><em>${publishRecord.status === "published" ? `${zh("&#24050;&#21457;&#24067;&#65306;")}${escapeHtml(publishRecord.platform || item.platform)} ${escapeHtml(formatShortDate(publishRecord.publishedAt))}` : zh("&#20316;&#21697;&#21457;&#20986;&#21435;&#21518;&#65292;&#22312;&#36825;&#37324;&#22635;&#24179;&#21488;&#12289;&#38142;&#25509;&#21644;&#26102;&#38388;&#12290;")}</em>${isEditingPublish ? renderPublishRecordForm(item) : ""}</div>
    <div class="metric-row"><span>${zh("&#25104;&#31295;&#20316;&#21697;")}</span><span>${zh("&#22797;&#29992;&#27597;&#39064;")}</span><span>${zh("&#24453;&#34917;&#21457;&#24067;&#25968;&#25454;")}</span></div>
    <div class="asset-review-panel"><b>${zh("&#21457;&#24067;&#22797;&#30424;&#25968;&#25454;")}</b><em>${zh("&#31532;&#19968;&#29256;&#30001;&#36816;&#33829;&#21457;&#24067;&#21518;&#25163;&#21160;&#22635;&#20889;&#12290;")}</em><div class="asset-review-grid"><span>${zh("&#38405;&#35835;/&#25773;&#25918;")} <strong>${views || pending}</strong></span><span>${zh("&#28857;&#36190;")} <strong>${likes || pending}</strong></span><span>${zh("&#25910;&#34255;")} <strong>${saves || pending}</strong></span><span>${zh("&#35780;&#35770;")} <strong>${comments || pending}</strong></span><span>${zh("&#36716;&#21457;")} <strong>${shares || pending}</strong></span><span>${zh("&#25910;&#34255;&#29575;")} <strong>${saveRate}</strong></span><span>${zh("&#20114;&#21160;&#29575;")} <strong>${engageRate}</strong></span></div>${isEditing ? renderPublishMetricsForm(item) : `<p>${escapeHtml(buildReviewConclusion(item))}</p>`}</div>
    <div class="asset-reuse-panel"><b>${zh("&#36873;&#25321;&#19979;&#19968;&#20010;&#24179;&#21488;&#29256;&#26412;")}</b><span>${zh("&#20445;&#30041;&#21516;&#19968;&#20010;&#27597;&#39064;&#65292;&#20294;&#25353;&#30446;&#26631;&#24179;&#21488;&#37325;&#20889;&#12290;")}</span><div class="asset-action-row">${availableTargets.map((target) => `<button class="secondary" type="button" data-reuse-work="${escapeHtml(item.id)}" data-reuse-target="${escapeHtml(target.id)}">${zh("&#25913;&#25104;")}${escapeHtml(target.title)}</button>`).join("")}</div></div>
    <div class="asset-action-row"><button class="secondary" type="button" data-edit-publish="${escapeHtml(item.id)}">${isEditingPublish ? zh("&#25910;&#36215;&#21457;&#24067;&#34920;") : zh("&#30331;&#35760;&#24050;&#21457;&#24067;")}</button><button class="secondary" type="button" data-edit-metrics="${escapeHtml(item.id)}">${isEditing ? zh("&#25910;&#36215;&#25968;&#25454;&#34920;") : zh("&#34917;&#21457;&#24067;&#25968;&#25454;")}</button><button class="secondary" type="button" data-label-sample="${escapeHtml(item.id)}" data-sample-label="positive">${zh("&#26631;&#25104;&#27491;&#20363;")}</button><button class="secondary" type="button" data-label-sample="${escapeHtml(item.id)}" data-sample-label="negative">${zh("&#26631;&#25104;&#21453;&#20363;")}</button><button class="secondary" type="button" data-deconstruct-work="${escapeHtml(item.id)}">${zh("&#25286;&#25104;&#26631;&#39064;/&#32467;&#26500;&#36164;&#20135;")}</button></div>
  </article>`;
}
function inferPlatformIdFromTitle(title = "") {
  if (/小红书/.test(title)) return "xhs";
  if (/公众号|长文/.test(title)) return "wechat-article";
  if (/抖音/.test(title)) return "douyin";
  if (/视频号/.test(title)) return "video-account";
  if (/朋友圈/.test(title)) return "moments";
  return "";
}

function renderLongkaPredictionPanel(item) {
  const prediction = item.prediction || buildLongkaPredictionSnapshot({ topic: item, target: { id: item.platformId }, body: item.body, images: item.images });
  const calibration = item.calibration || buildLongkaCalibrationSnapshot(prediction);
  const factors = Array.isArray(prediction.factors) ? prediction.factors : [];
  const status = calibration.status === "reviewed" ? zh("&#24050;&#22797;&#30424;") : zh("&#24453;&#22797;&#30424;");
  return `<div class="asset-prediction-panel">
    <div class="asset-prediction-head">
      <div><b>${zh("&#21457;&#24067;&#21069;&#21028;&#26029;")}</b><span>${zh("&#20445;&#23384;&#20316;&#21697;&#26102;&#20889;&#20837;&#65292;&#21457;&#24067;&#21518;&#19981;&#22238;&#25913;&#65292;&#21482;&#36861;&#21152;&#22797;&#30424;&#12290;")}</span></div>
      <strong>${escapeHtml(prediction.score || 0)}</strong>
    </div>
    <div class="asset-review-grid">
      <span>${zh("&#39044;&#27979;&#26723;&#20301;")} <strong>${escapeHtml(prediction.bucket || zh("&#26410;&#35760;&#24405;"))}</strong></span>
      <span>${zh("&#26657;&#20934;&#29366;&#24577;")} <strong>${escapeHtml(status)}</strong></span>
      <span>${zh("&#38145;&#23450;&#26102;&#38388;")} <strong>${escapeHtml(formatShortDate(prediction.predictedAt))}</strong></span>
    </div>
    <p>${escapeHtml(prediction.reason || zh("&#36825;&#26465;&#20316;&#21697;&#32570;&#23569;&#21457;&#24067;&#21069;&#21028;&#26029;&#12290;"))}</p>
    ${factors.length ? `<div class="prediction-factor-list">${factors.map((factor) => `<span><b>${escapeHtml(factor.name)}</b><em>${escapeHtml(factor.score)}</em><small>${escapeHtml(factor.note || "")}</small></span>`).join("")}</div>` : ""}
    <div class="asset-calibration-result"><b>${zh("&#22797;&#30424;&#26657;&#20934;")}</b><span>${escapeHtml(calibration.conclusion || buildCalibrationConclusion(item))}</span></div>
  </div>`;
}

function renderPublishRecordForm(item) {
  const record = item.publishRecord || {};
  return `<div class="publish-record-form" data-publish-form="${escapeHtml(item.id)}">
    <label>${zh("&#21457;&#24067;&#24179;&#21488;")}<input type="text" data-publish-field="platform" value="${escapeHtml(record.platform || item.platform || "")}" placeholder="${zh("&#20363;&#65306;&#23567;&#32418;&#20070;")}"></label>
    <label>${zh("&#21457;&#24067;&#38142;&#25509;")}<input type="url" data-publish-field="url" value="${escapeHtml(record.url || "")}" placeholder="https://"></label>
    <label>${zh("&#21457;&#24067;&#26102;&#38388;")}<input type="datetime-local" data-publish-field="publishedAt" value="${escapeHtml(toDatetimeLocalValue(record.publishedAt))}"></label>
    <label>${zh("&#25805;&#20316;&#20154;")}<input type="text" data-publish-field="operator" value="${escapeHtml(record.operator || "")}" placeholder="${zh("&#20363;&#65306;&#23567;&#22969;")}"></label>
    <label class="wide">${zh("&#21457;&#24067;&#35760;&#24405;")}<input type="text" data-publish-field="note" value="${escapeHtml(record.note || "")}" placeholder="${zh("&#20363;&#65306;&#23553;&#38754;&#29992;&#31532; 1 &#24352;&#65292;&#26631;&#39064;&#26410;&#25913;")}"></label>
    <button class="primary" type="button" data-save-publish="${escapeHtml(item.id)}">${zh("&#20445;&#23384;&#21457;&#24067;&#30331;&#35760;&#24182;&#21516;&#27493;")}</button>
  </div>`;
}

function formatShortDate(value) {
  if (!value) return zh("&#26410;&#35760;&#24405;");
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return String(value).slice(0, 10);
  }
}

function toDatetimeLocalValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function renderPublishMetricsForm(item) {
  const metrics = item.publishMetrics || {};
  const calibration = item.calibration || {};
  return `<div class="publish-metrics-form" data-metrics-form="${escapeHtml(item.id)}">
    <label>${zh("&#38405;&#35835;/&#25773;&#25918;")}<input type="number" min="0" data-metric-field="views" value="${escapeHtml(metrics.views || "")}"></label>
    <label>${zh("&#28857;&#36190;")}<input type="number" min="0" data-metric-field="likes" value="${escapeHtml(metrics.likes || "")}"></label>
    <label>${zh("&#25910;&#34255;")}<input type="number" min="0" data-metric-field="saves" value="${escapeHtml(metrics.saves || "")}"></label>
    <label>${zh("&#35780;&#35770;")}<input type="number" min="0" data-metric-field="comments" value="${escapeHtml(metrics.comments || "")}"></label>
    <label>${zh("&#36716;&#21457;")}<input type="number" min="0" data-metric-field="shares" value="${escapeHtml(metrics.shares || "")}"></label>
    <label>${zh("&#23454;&#38469;&#34920;&#29616;&#26723;&#20301;")}<select data-metric-field="actualBucket">
      ${["", zh("&#36229;&#39044;&#26399;"), zh("&#31526;&#21512;&#39044;&#26399;"), zh("&#19968;&#33324;"), zh("&#20302;&#20110;&#39044;&#26399;")].map((value) => `<option value="${escapeHtml(value)}" ${value === calibration.actualBucket ? "selected" : ""}>${value || zh("&#24453;&#21028;&#26029;")}</option>`).join("")}
    </select></label>
    <label class="wide">${zh("&#22797;&#30424;&#35760;&#24405;")}<input type="text" data-metric-field="note" value="${escapeHtml(metrics.note || "")}" placeholder="${zh("&#20363;&#65306;&#25910;&#34255;&#39640;&#65292;&#35780;&#35770;&#20302;&#65292;&#19979;&#27425;&#22686;&#21152;&#20114;&#21160;&#25552;&#38382;")}"></label>
    <label class="wide">${zh("&#26032;&#23398;&#21040;&#30340;&#19968;&#26465;&#35268;&#24459;")}<input type="text" data-metric-field="learning" value="${escapeHtml(calibration.learning || "")}" placeholder="${zh("&#20363;&#65306;&#36825;&#31867;&#27597;&#39064;&#26356;&#36866;&#21512;&#28165;&#21333;&#22411;&#39318;&#23631;")}"></label>
    <button class="primary" type="button" data-save-metrics="${escapeHtml(item.id)}">${zh("&#20445;&#23384;&#22797;&#30424;&#24182;&#21516;&#27493;")}</button>
  </div>`;
}

function buildReviewConclusion(item) {
  const metrics = item.publishMetrics || {};
  const views = Number(metrics.views || 0);
  if (!views) return zh("&#36824;&#27809;&#26377;&#21457;&#24067;&#25968;&#25454;&#12290;&#21457;&#24067;&#21518;&#34917;&#20837;&#38405;&#35835;&#12289;&#28857;&#36190;&#12289;&#25910;&#34255;&#12289;&#35780;&#35770;&#65292;&#31995;&#32479;&#20250;&#21028;&#26029;&#36825;&#20010;&#27597;&#39064;&#26159;&#21542;&#20540;&#24471;&#32487;&#32493;&#19968;&#40060;&#22810;&#21507;&#12290;");
  const saves = Number(metrics.saves || 0);
  const comments = Number(metrics.comments || 0);
  const saveRate = saves / Math.max(views, 1);
  if (metrics.note) return metrics.note;
  if (saveRate >= 0.03) return zh("&#25910;&#34255;&#29575;&#19981;&#38169;&#65306;&#36825;&#31867;&#27597;&#39064;&#36866;&#21512;&#32487;&#32493;&#25286;&#25104;&#28165;&#21333;&#12289;&#25945;&#31243;&#25110;&#38271;&#25991;&#12290;");
  if (comments >= 10) return zh("&#35780;&#35770;&#20449;&#21495;&#19981;&#38169;&#65306;&#20248;&#20808;&#22238;&#25910;&#35780;&#35770;&#37324;&#30340;&#29992;&#25143;&#38382;&#39064;&#65292;&#34917;&#36827;&#23458;&#25143;&#38382;&#39064;&#24211;&#12290;");
  return zh("&#25968;&#25454;&#19968;&#33324;&#65306;&#20808;&#20445;&#30041;&#20026;&#23545;&#29031;&#26679;&#26412;&#65292;&#21518;&#32493;&#23545;&#27604;&#26631;&#39064;&#12289;&#24320;&#22836;&#21644;&#22270;&#29255;&#39318;&#23631;&#38382;&#39064;&#12290;");
}

function buildCalibrationConclusion(item) {
  const metrics = item.publishMetrics || {};
  const views = Number(metrics.views || 0);
  if (!views) return zh("&#24453;&#21457;&#24067;&#21518;&#22238;&#22635;&#25968;&#25454;&#12290;");
  const likes = Number(metrics.likes || 0);
  const saves = Number(metrics.saves || 0);
  const comments = Number(metrics.comments || 0);
  const shares = Number(metrics.shares || 0);
  const saveRate = saves / Math.max(views, 1);
  const engageRate = (likes + saves + comments + shares) / Math.max(views, 1);
  const predictionScore = Number(item.prediction?.score || item.calibration?.predictedScore || 0);
  const actualStrong = saveRate >= 0.03 || engageRate >= 0.08 || comments >= 10;
  const actualWeak = saveRate < 0.01 && engageRate < 0.025 && comments < 3;
  if (predictionScore >= 75 && actualWeak) return zh("&#21457;&#24067;&#21069;&#21028;&#26029;&#20559;&#20048;&#35266;&#65306;&#19979;&#27425;&#37325;&#28857;&#22797;&#26597;&#26631;&#39064;&#38057;&#23376;&#12289;&#39318;&#23631;&#22270;&#21644;&#35805;&#39064;&#20855;&#20307;&#24230;&#12290;");
  if (predictionScore < 70 && actualStrong) return zh("&#23454;&#38469;&#34920;&#29616;&#22909;&#20110;&#39044;&#21028;&#65306;&#36825;&#31867;&#39064;&#26448;&#35201;&#34917;&#36827;&#27491;&#20363;&#24211;&#65292;&#21518;&#32493;&#21487;&#20197;&#25193;&#23637;&#25104;&#38271;&#25991;&#25110;&#35270;&#39057;&#33050;&#26412;&#12290;");
  if (actualStrong) return zh("&#21028;&#26029;&#22522;&#26412;&#21629;&#20013;&#65306;&#36825;&#20010;&#27597;&#39064;&#26377;&#22797;&#21033;&#20215;&#20540;&#65292;&#21487;&#32487;&#32493;&#20570;&#19968;&#40060;&#22810;&#21507;&#12290;");
  if (actualWeak) return zh("&#23454;&#38469;&#34920;&#29616;&#20559;&#24369;&#65306;&#20808;&#19981;&#25193;&#23637;&#65292;&#25226;&#23427;&#24403;&#20316;&#23545;&#29031;&#26679;&#26412;&#65292;&#22797;&#30424;&#20026;&#20160;&#20040;&#27809;&#26377;&#25171;&#20013;&#12290;");
  return zh("&#34920;&#29616;&#23646;&#20110;&#20013;&#38388;&#26723;&#65306;&#21487;&#20197;&#23567;&#33539;&#22260;&#25913;&#26631;&#39064;&#25110;&#25442;&#22270;&#20877;&#27979;&#19968;&#29256;&#12290;");
}

function toggleMetricsEditor(id) {
  state.editingMetricsWorkId = state.editingMetricsWorkId === id ? "" : id;
  renderAssetPage("assets");
}

function togglePublishEditor(id) {
  state.editingPublishWorkId = state.editingPublishWorkId === id ? "" : id;
  renderAssetPage("assets");
}

async function syncFinalWorkUpdate(updated) {
  state.finalWorks = state.finalWorks.map((item) => item.id === updated.id ? updated : item);
  persistWorkbenchSnapshot();
  const res = await fetch(apiPath("/api/final-works"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ work: updated }),
  });
  const result = await res.json();
  if (!res.ok || !result.ok) throw new Error(result.message || result.error || "sync_failed");
  state.finalWorks = state.finalWorks.map((item) => item.id === updated.id ? (result.work || updated) : item);
  persistWorkbenchSnapshot();
  return result.work || updated;
}

async function savePublishRecord(id) {
  const form = byId("assetBoard")?.querySelector(`[data-publish-form="${CSS.escape(id)}"]`);
  if (!form) return;
  const current = state.finalWorks.find((item) => item.id === id);
  if (!current) return;
  const record = {};
  form.querySelectorAll("[data-publish-field]").forEach((input) => {
    record[input.dataset.publishField] = input.value.trim();
  });
  const publishedAt = record.publishedAt ? new Date(record.publishedAt).toISOString() : new Date().toISOString();
  const updated = {
    ...current,
    publishRecord: buildPublishRecordSnapshot({
      ...current.publishRecord,
      ...record,
      status: "published",
      publishedAt,
      platform: record.platform || current.platform || "",
      registeredAt: new Date().toISOString(),
    }),
  };
  state.editingPublishWorkId = "";
  try {
    await syncFinalWorkUpdate(updated);
  } catch (error) {
    state.archiveMessage = `${zh("&#21457;&#24067;&#30331;&#35760;&#24050;&#20445;&#23384;&#21040;&#24403;&#21069;&#27983;&#35272;&#22120;&#65292;&#20294;&#21516;&#27493;&#21040; 122 &#22833;&#36133;&#65306;")}${error.message}`;
  }
  renderAssetPage("assets");
}

async function savePublishMetrics(id) {
  const form = byId("assetBoard")?.querySelector(`[data-metrics-form="${CSS.escape(id)}"]`);
  if (!form) return;
  const metrics = {};
  const calibrationInput = {};
  form.querySelectorAll("[data-metric-field]").forEach((input) => {
    const key = input.dataset.metricField;
    const value = input.type === "number" ? Number(input.value || 0) : input.value.trim();
    if (key === "actualBucket" || key === "learning") calibrationInput[key] = value;
    else metrics[key] = value;
  });
  const current = state.finalWorks.find((item) => item.id === id);
  if (!current) return;
  const reviewedAt = new Date().toISOString();
  const updated = {
    ...current,
    publishMetrics: metrics,
    reviewedAt,
  };
  updated.calibration = {
    ...buildLongkaCalibrationSnapshot(updated.prediction || {}),
    ...(current.calibration || {}),
    ...calibrationInput,
    status: "reviewed",
    reviewedAt,
    conclusion: buildCalibrationConclusion(updated),
  };
  state.editingMetricsWorkId = "";
  try {
    await syncFinalWorkUpdate(updated);
  } catch (error) {
    state.archiveMessage = `${zh("&#22797;&#30424;&#24050;&#20445;&#23384;&#21040;&#24403;&#21069;&#27983;&#35272;&#22120;&#65292;&#20294;&#21516;&#27493;&#21040; 122 &#22833;&#36133;&#65306;")}${error.message}`;
  }
  renderAssetPage("assets");
}

async function labelFinalWorkSample(id, label) {
  const current = state.finalWorks.find((item) => item.id === id);
  if (!current) return;
  const updated = {
    ...current,
    sampleLabel: label === "negative" ? "negative" : "positive",
    sampleLabeledAt: new Date().toISOString(),
  };
  try {
    await syncFinalWorkUpdate(updated);
  } catch (error) {
    state.archiveMessage = `${zh("&#26679;&#26412;&#26631;&#35760;&#24050;&#20445;&#23384;&#21040;&#24403;&#21069;&#27983;&#35272;&#22120;&#65292;&#20294;&#21516;&#27493;&#21040; 122 &#22833;&#36133;&#65306;")}${error.message}`;
  }
  renderAssetPage("assets");
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand("copy");
  textarea.remove();
  return ok;
}

async function copyFinalWorkBody(id) {
  const work = state.finalWorks.find((item) => item.id === id);
  if (!work?.body) {
    alert("这条作品没有保存正文。");
    return;
  }
  await copyTextToClipboard(`${work.title || ""}\n\n${cleanPublishBodyForCopy(work.body)}`.trim());
  alert("已复制完整文案。");
}

async function copyFinalWorkImages(id) {
  const work = state.finalWorks.find((item) => item.id === id);
  const images = Array.isArray(work?.images) ? work.images : [];
  if (!images.length) {
    alert("这条作品没有保存图片链接。");
    return;
  }
  await copyTextToClipboard(images.map((url, index) => `P${index + 1}: ${url}`).join("\n"));
  alert(`已复制 ${images.length} 张图片链接。`);
}

function reuseFinalWork(id, target) {
  const work = state.finalWorks.find((item) => item.id === id);
  if (!work) return;
  state.publishTarget = target;
  const reuseTopic = {
    id: `reuse-${work.id}-${target}`,
    title: work.title,
    theme: work.topic || work.title,
    platform: work.platform,
    keyword: state.keywords,
    url: work.sourceUrl || "",
    content: [
      `原成稿标题：${work.title}`,
      `原平台：${work.platform}`,
      `母题：${work.topic || work.title}`,
      `原正文：${work.body}`,
      `原结构：${work.extractedAssets?.structure || ""}`,
      `复用要求：按 ${publishTargets.find((item) => item.id === target)?.title || target} 重新生成，保留母题，不沿用原平台正文结构。`,
    ].join("\n"),
    pain: `这个母题已经做过 ${work.platform || "一个平台"} 成稿，现在要改写成 ${publishTargets.find((item) => item.id === target)?.title || target}。`,
    reason: "来自已完成作品资产的一鱼多吃复用。",
    reuse: "必须重新匹配目标平台：标题、结构、正文长度、表达方式和转化动作都要变化。",
    metrics: work.publishMetrics || {},
    raw: work,
  };
  state.topics = [reuseTopic, ...state.topics.filter((item) => item.id !== reuseTopic.id)].slice(0, 10);
  state.selectedTopicId = reuseTopic.id;
  state.titleAssets = [];
  state.titleAssetMessage = "";
  state.titleAssetKey = "";
  state.titleChoices = buildCleanTitleChoices(reuseTopic, []);
  state.titleChoiceKey = currentTitleChoiceKey(reuseTopic);
  state.selectedTitle = "";
  state.draft = "";
  state.improvedDraft = "";
  state.copyConfirmed = false;
  state.copyVersions = [];
  state.currentCopyVersionId = "";
  state.confirmedCopyVersionId = "";
  state.xhsCardManifest = null;
  state.draftMeta = null;
  state.draftReview = null;
  state.archiveMessage = `已把《${work.title}》作为母题切到 ${currentTarget().title}。请先选新标题，再按该平台重写正文和配图策略。`;
  setRoute("today");
  setStep(6);
}

function deconstructFinalWork(id) {
  const work = state.finalWorks.find((item) => item.id === id);
  if (!work) return;
  state.archiveMessage = `已拆解：标题《${work.extractedAssets?.title || work.title}》、结构《${work.extractedAssets?.structure || "未记录"}》、图文风格《${work.extractedAssets?.visualStyle || "未记录"}》。后续会正式写入标题库和结构库。`;
  renderAssetPage("assets");
}

function sampleAssetItems(label) {
  return `<div class="asset-grid">
    <article class="asset-item"><b>${label}</b><span>这里展示长期沉淀的数据，不打断今日工作流。</span></article>
    <article class="asset-item"><b>下一步</b><span>从今日工作台完成内容后，自动回流到这里。</span></article>
  </div>`;
}

function sampleState() {
  return {
    contentSamples: [],
  };
}

function log(line) {
  state.logs.push(line);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

document.addEventListener("click", (event) => {
  const nav = event.target.closest(".nav-item[data-route]");
  if (nav) setRoute(nav.dataset.route);

  const step = event.target.closest(".step-pill[data-step]");
  if (step && !step.disabled) setStep(Number(step.dataset.step));

  const action = event.target.closest("[data-action]");
  if (!action) return;
  const name = action.dataset.action;
  if (name === "load-assets") renderAssets();
  if (name === "save-sources") alert("账号库保存入口已保留，下一步接数据库。");
  if (name === "check-health") alert("采集能力检查入口已保留，下一步接 /api/collectors/health。");
  if (name === "export-state") alert("导出资料库入口已保留。");
  if (name === "import-state") alert("导入资料库入口已保留。");
});

document.addEventListener("click", (event) => {
  const topicButton = event.target.closest("[data-topic-id]");
  if (topicButton) {
    selectTopicForCreation(topicButton.dataset.topicId);
    return;
  }
  const editMetrics = event.target.closest("[data-edit-metrics]");
  if (editMetrics) {
    toggleMetricsEditor(editMetrics.dataset.editMetrics);
    return;
  }
  const editPublish = event.target.closest("[data-edit-publish]");
  if (editPublish) {
    togglePublishEditor(editPublish.dataset.editPublish);
    return;
  }
  const savePublish = event.target.closest("[data-save-publish]");
  if (savePublish) {
    savePublishRecord(savePublish.dataset.savePublish);
    return;
  }
  const saveMetrics = event.target.closest("[data-save-metrics]");
  if (saveMetrics) {
    savePublishMetrics(saveMetrics.dataset.saveMetrics);
    return;
  }
  const labelSample = event.target.closest("[data-label-sample]");
  if (labelSample) {
    labelFinalWorkSample(labelSample.dataset.labelSample, labelSample.dataset.sampleLabel || "positive");
    return;
  }
  const copyBody = event.target.closest("[data-copy-final-body]");
  if (copyBody) {
    copyFinalWorkBody(copyBody.dataset.copyFinalBody);
    return;
  }
  const copyImages = event.target.closest("[data-copy-final-images]");
  if (copyImages) {
    copyFinalWorkImages(copyImages.dataset.copyFinalImages);
    return;
  }
  const copyImageUrl = event.target.closest("[data-copy-image-url]");
  if (copyImageUrl) {
    copyTextToClipboard(copyImageUrl.dataset.copyImageUrl || "");
    alert("已复制图片链接。");
    return;
  }
  const reuse = event.target.closest("[data-reuse-work]");
  if (reuse) {
    reuseFinalWork(reuse.dataset.reuseWork, reuse.dataset.reuseTarget || "wechat-article");
    return;
  }
  const deconstruct = event.target.closest("[data-deconstruct-work]");
  if (deconstruct) {
    deconstructFinalWork(deconstruct.dataset.deconstructWork);
  }
});

// LongkaTitleEngineV2: source-bound title engine.
// Overrides the older title helpers above while keeping the UI entry function.
const LONGKA_TITLE_FORMULAS_V2 = [
  { id: "loss", style: "避坑型", tags: ["pain", "loss"], render: (s) => `${s.shortSubject}别再${s.badAction}` },
  { id: "root", style: "真相型", tags: ["pain", "truth"], render: (s) => `${s.problem}问题出在哪` },
  { id: "list", style: "清单型", tags: ["list"], render: (s) => `${s.audience}先看${s.number}个${s.xhsSubject}` },
  { id: "result", style: "结果型", tags: ["result"], render: (s) => `${s.shortSubject}怎么拿到${s.result}` },
  { id: "contrast", style: "对比型", tags: ["contrast"], render: (s) => `${s.shortSubject}有用和没用的差别` },
  { id: "truth", style: "反常识型", tags: ["truth"], render: (s) => `${s.shortSubject}别只看表面` },
  { id: "action", style: "行动型", tags: ["action"], render: (s) => `${s.problem}先做这一步` },
  { id: "question", style: "痛点型", tags: ["question", "pain"], render: (s) => `${s.audience}为什么卡在${s.problem}` },
  { id: "compare", style: "判断型", tags: ["contrast"], render: (s) => `${s.shortSubject}到底该怎么判断` },
  { id: "lesson", style: "教训型", tags: ["loss", "list"], render: (s) => `${s.audience}太晚知道的${s.number}个教训` },
  { id: "stop", style: "纠偏型", tags: ["action", "loss"], render: (s) => `别再${s.badAction}，先${s.action}` },
  { id: "why", style: "解释型", tags: ["truth"], render: (s) => `为什么${s.shortSubject}总是没效果` },
];

buildCleanTitleChoices = function buildCleanTitleChoicesV2(topic, titleAssets = state.titleAssets) {
  const signal = extractLongkaTitleSignalV2(topic);
  const target = state.publishTarget || "xhs";
  const assetItems = buildLongkaAssetFormulaTitlesV2(signal, titleAssets, target);
  const formulaItems = LONGKA_TITLE_FORMULAS_V2
    .map((formula, index) => ({ formula, score: scoreLongkaTitleFormulaV2(formula, signal, target, index) }))
    .sort((a, b) => b.score - a.score)
    .map((item) => ({
      title: renderLongkaTitleForTargetV2(item.formula, signal, target),
      reason: `${item.formula.style}：根据当前选题原始标题、痛点和内容方向生成`,
    }));
  return rankLongkaTitlesV2([...assetItems, ...formulaItems], signal, target).slice(0, 5);
};

function extractLongkaTitleSignalV2(topic = {}) {
  const rawTitle = cleanLongkaTitleTextV2(topic.title || topic.theme || topic.raw?.title || "");
  const rawText = cleanLongkaTitleTextV2([
    topic.theme, topic.title, topic.pain, topic.reason, topic.reuse, topic.content, topic.body, topic.summary,
    topic.raw?.title, topic.raw?.description, topic.raw?.content, topic.raw?.text, topic.raw?.analysis, topic.raw?.pain,
  ].filter(Boolean).join(" "));
  const text = rawText || cleanLongkaTitleTextV2([state.keywords, state.businessLine].filter(Boolean).join(" "));
  const domain = inferLongkaTitleDomainV2(text);
  const subject = pickLongkaSubjectV2(text, rawTitle, domain);
  return {
    text,
    sourceTitle: rawTitle,
    domain,
    number: extractLongkaSourceNumberV2(rawTitle),
    subject: limitLongkaPhraseV2(subject, 18),
    shortSubject: limitLongkaPhraseV2(subject, 8),
    xhsSubject: compactLongkaXhsSubjectV2(subject),
    audience: limitLongkaPhraseV2(pickLongkaAudienceV2(text, domain), 8),
    problem: limitLongkaPhraseV2(pickLongkaProblemV2(text, domain), 10),
    action: limitLongkaPhraseV2(pickLongkaActionV2(text, domain), 10),
    result: limitLongkaPhraseV2(pickLongkaResultV2(text, domain), 8),
    badAction: limitLongkaPhraseV2(pickLongkaBadActionV2(text, domain), 8),
  };
}

function cleanLongkaTitleTextV2(value = "") {
  return String(value || "")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/#([^#\s]+)\[.*?\]#/g, "$1")
    .replace(/[#@]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferLongkaTitleDomainV2(text = "") {
  if (/私校|面试|择校|升学|孩子|家长|夏校|教育/.test(text)) return "education";
  if (/律师|法律|法条|案件|客户/.test(text)) return "lawyer";
  if (/AI|Cursor|Claude|Codex|DeepSeek|Lovable|Replit|Base44|skills?|工具|MVP|自媒体|内容创作|模板|低质/i.test(text)) return "ai-content";
  if (/公众号|小红书|短视频|朋友圈|图文|账号|爆款|选题/.test(text)) return "content";
  return "general";
}

function extractLongkaSourceNumberV2(text = "") {
  const matched = String(text || "").match(/(\d+)\s*(个|条|点|件|种|步|招)?/);
  if (!matched) return "3";
  return matched[1];
}

function pickLongkaSubjectV2(text = "", title = "", domain = "general") {
  const source = `${title} ${text}`;
  if (domain === "education") {
    if (/私校.*面试|面试.*私校/.test(source)) return "私校面试";
    if (/夏校/.test(source)) return "夏校申请";
    if (/择校|申请/.test(source)) return "私校申请";
    return "私校教育";
  }
  if (domain === "lawyer") return "律师短视频";
  if (/MVP|最小可行产品/i.test(source)) return "AI工具做MVP";
  if (/自媒体|内容创作|创作者|博主/.test(source) && /AI|工具|skills?/i.test(source)) return "AI内容工具";
  if (/Cursor|Lovable|Replit|Base44|工具/.test(source)) return "AI工具";
  if (/公众号/.test(source)) return "公众号内容";
  if (/小红书/.test(source)) return "小红书图文";
  return limitLongkaPhraseV2(title || firstLongkaSentenceV2(source) || "当前选题", 12);
}

function pickLongkaAudienceV2(text = "", domain = "general") {
  if (domain === "education") return "家长";
  if (domain === "lawyer") return "律师";
  if (/自媒体|内容创作|创作者|博主|账号/.test(text)) return "内容创作者";
  if (/不懂代码|普通人|新手|小白/.test(text)) return "普通人";
  if (/创业|老板|团队|公司/.test(text)) return "创业者";
  return "普通人";
}

function pickLongkaProblemV2(text = "", domain = "general") {
  if (domain === "education") return /背|标准答案|表达|僵/.test(text) ? "孩子表达太僵" : "面试准备跑偏";
  if (domain === "lawyer") return /法条|看不懂|太专业/.test(text) ? "用户听不懂" : "内容太专业";
  if (/模板|同质|像模板|AI 味|AI味/.test(text)) return "内容越来越像模板";
  if (/低质|没流量|流量/.test(text)) return "担心被判低质";
  if (/只收藏|清单|工具清单/.test(text)) return "只收藏工具清单";
  if (/不懂代码|不会代码/.test(text)) return "不懂代码";
  if (/效率|下班|提效/.test(text)) return "效率没真正提起来";
  if (/没结果|卡住|做不出来/.test(text)) return "做了却没结果";
  return "关键问题没拆清";
}

function pickLongkaActionV2(text = "", domain = "general") {
  if (domain === "education") return "练表达逻辑";
  if (domain === "lawyer") return "讲解决路径";
  if (/MVP|产品/.test(text)) return "先做MVP";
  if (/工作流|系统|流程/.test(text)) return "放进工作流";
  if (/清单|工具|skills?/i.test(text)) return "选对工具用法";
  if (/拆解|复盘|二创/.test(text)) return "拆成可复用结构";
  return "先判断再行动";
}

function pickLongkaResultV2(text = "", domain = "general") {
  if (domain === "education") return "真实表达";
  if (domain === "lawyer") return "客户信任";
  if (/MVP|产品/.test(text)) return "做出MVP";
  if (/下班|效率|提效/.test(text)) return "提高效率";
  if (/流量|低质|模板/.test(text)) return "内容不写废";
  return "拿到结果";
}

function pickLongkaBadActionV2(text = "", domain = "general") {
  if (domain === "education") return "硬背答案";
  if (domain === "lawyer") return "只讲法条";
  if (/模板|同质|AI 味|AI味/.test(text)) return "套模板";
  if (/只收藏|清单|工具清单/.test(text)) return "只收藏清单";
  if (/跟风|热门/.test(text)) return "乱跟风";
  if (/工具|skills?/i.test(text)) return "乱装工具";
  return "照抄方法";
}

function scoreLongkaTitleFormulaV2(formula, signal, target, index) {
  let score = 100 - index;
  const text = signal.text || "";
  if (formula.tags.includes("pain") && /别|不要|痛点|担心|低质|模板|背|僵|看不懂|没结果|问题/.test(text)) score += 28;
  if (formula.tags.includes("list") && /清单|\d+\s*(个|条|点|件|种|步|招)|工具|skills?|方法/i.test(signal.sourceTitle + text)) score += 22;
  if (formula.tags.includes("loss") && /别|不要|坑|风险|低质|浪费|硬背|只讲|只收藏/.test(text)) score += 20;
  if (formula.tags.includes("result") && /结果|效率|MVP|信任|流量|表达|客户/.test(text)) score += 16;
  if (formula.tags.includes("contrast") && /不是|而是|只|别|对比|真正/.test(text)) score += 14;
  if (target === "xhs" && ["loss", "root", "list", "stop", "action"].includes(formula.id)) score += 10;
  if (target === "wechat-article" && ["root", "truth", "contrast", "question"].includes(formula.id)) score += 18;
  return score;
}

function renderLongkaTitleForTargetV2(formula, signal, target = state.publishTarget) {
  if (target !== "wechat-article") return formula.render(signal);
  const longTitles = {
    loss: `${signal.audience}别再${signal.badAction}：${signal.subject}真正要先解决的是${signal.problem}`,
    root: `${signal.problem}问题出在哪？${signal.audience}做${signal.subject}前要先看懂这个判断`,
    list: `${signal.audience}做${signal.subject}，先想清楚这${signal.number}个关键问题`,
    result: `从${signal.problem}到${signal.result}：${signal.subject}真正有效的做法`,
    contrast: `${signal.subject}有用和没用的差别，往往藏在${signal.action}这一步`,
    truth: `${signal.subject}别只看表面，真正关键的是${signal.action}`,
    action: `${signal.problem}时，${signal.audience}应该先做${signal.action}`,
    question: `${signal.audience}为什么总是卡在${signal.problem}？答案不只在${signal.subject}`,
    compare: `${signal.subject}到底该怎么判断？先看${signal.problem}背后的真实需求`,
    lesson: `${signal.audience}太晚知道的${signal.number}个教训：别让${signal.problem}拖垮结果`,
    stop: `别再${signal.badAction}，${signal.audience}做${signal.subject}要先${signal.action}`,
    why: `为什么${signal.subject}总是没效果？因为你可能忽略了${signal.problem}`,
  };
  return longTitles[formula.id] || formula.render(signal);
}

function buildLongkaAssetFormulaTitlesV2(signal, titleAssets = [], target = "xhs") {
  const sample = (titleAssets || []).find((item) => cleanLongkaTitleTextV2(item?.title).length >= 6);
  if (!sample) return [];
  const title = cleanLongkaTitleTextV2(sample.title);
  if (target === "wechat-article") return [{ title: `${signal.audience}做${signal.subject}，不要只套标题公式，要先抓住${signal.problem}`, reason: `参考标题库结构：${title}` }];
  if (/\d/.test(title)) return [{ title: `${signal.audience}先看${signal.number}个${signal.shortSubject}`, reason: `参考标题库数字型：${title}` }];
  if (/别|不要|避坑|错|坑/.test(title)) return [{ title: `${signal.shortSubject}别再${signal.badAction}`, reason: `参考标题库避坑型：${title}` }];
  return [{ title: `${signal.shortSubject}先解决${signal.problem}`, reason: `参考标题库方法型：${title}` }];
}

function rankLongkaTitlesV2(items = [], signal = {}, target = "xhs") {
  const seen = new Set();
  return items
    .map((item) => ({ ...item, title: trimLongkaTitleForTargetV2(item.title, target) }))
    .map((item) => ({ ...item, score: scoreLongkaTitleChoiceV2(item.title, signal, target) }))
    .filter((item) => {
      const key = item.title.replace(/[，。！？；：,.!?;:\s]/g, "");
      if (!key || seen.has(key) || item.score <= 0) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.score - a.score)
    .map(({ score, ...item }) => item);
}

function scoreLongkaTitleChoiceV2(title = "", signal = {}, target = "xhs") {
  const clean = cleanLongkaTitleTextV2(title);
  const length = Array.from(clean).length;
  if (!clean || /�|閸|鐏|閿|缁|锟/.test(clean)) return 0;
  if (/[，、：；,;:]$/.test(clean)) return 0;
  if (target === "xhs" && (length < 8 || length > 20)) return 0;
  if (target === "wechat-article" && (length < 16 || length > 70)) return 0;
  if (signal.domain === "education" && /AI|工具|模板|低质|Agent|工作流/.test(clean)) return 0;
  if (signal.domain === "lawyer" && /AI|工具|模板|私校|面试/.test(clean)) return 0;
  if (signal.domain === "ai-content" && /私校|面试|孩子|家长|法条|律师/.test(clean)) return 0;
  let score = 50;
  const anchors = [signal.subject, signal.shortSubject, signal.problem, signal.action, signal.result, signal.badAction]
    .filter(Boolean)
    .map((item) => String(item).replace(/\s/g, ""));
  if (anchors.some((word) => clean.replace(/\s/g, "").includes(word.slice(0, Math.min(4, word.length))))) score += 28;
  if (/[0-9一二三四五六七八九十]/.test(clean)) score += 6;
  if (/别|问题|为什么|差别|判断|真正|先|清单|教训|结果/.test(clean)) score += 12;
  if (target === "xhs" && length >= 12 && length <= 20) score += 16;
  if (target === "wechat-article" && length > 20) score += 14;
  if (/当前|标题|生成|平台|点击|步骤|第\d步|素材库|brief/i.test(clean)) return 0;
  return score;
}

function trimLongkaTitleForTargetV2(title = "", target = "xhs") {
  const clean = cleanLongkaTitleTextV2(title);
  if (target === "wechat-article") return clean;
  const max = target === "xhs" ? 20 : target === "moments" ? 32 : 30;
  const chars = Array.from(clean);
  if (chars.length <= max) return clean;
  return chars.slice(0, max).join("").replace(/[，。！？；：,.!?;:]$/g, "").trim();
}

function limitLongkaPhraseV2(value = "", max = 8) {
  const clean = cleanLongkaTitleTextV2(value)
    .replace(/^(关于|如果|为什么|怎么|如何)/, "")
    .replace(/[，、。！？；：,.!?;:].*$/, "")
    .trim();
  const chars = Array.from(clean);
  return chars.length > max ? chars.slice(0, max).join("") : clean;
}

function compactLongkaXhsSubjectV2(value = "") {
  const clean = cleanLongkaTitleTextV2(value).replace(/\s+/g, "");
  if (/AI工具做MVP/i.test(clean)) return "AI工具MVP";
  if (/AI内容工具/i.test(clean)) return "AI内容工具";
  if (/AI工具/i.test(clean)) return "AI工具";
  if (/私校面试/.test(clean)) return "私校面试";
  if (/律师短视频/.test(clean)) return "律师短视频";
  return limitLongkaPhraseV2(clean, 7);
}

function firstLongkaSentenceV2(text = "") {
  return cleanLongkaTitleTextV2(text).split(/[，。！？；：,.!?;:\n]/).find((item) => item.trim().length >= 2) || "";
}

// LongkaTitleEngineV3: block title-asset pollution and growth-number mistakes.
const LONGKA_TITLE_FORMULAS_V3 = [
  { id: "growth-review", style: "复盘型", tags: ["growth", "result"], render: (s) => `${s.result}我做对了什么` },
  { id: "growth-method", style: "方法型", tags: ["growth", "action"], render: (s) => `${s.audience}怎么跑出${s.result}` },
  { id: "growth-truth", style: "真相型", tags: ["growth", "truth"], render: (s) => `${s.shortSubject}别只看涨粉` },
  { id: "growth-list", style: "清单型", tags: ["growth", "list"], render: (s) => `${s.timeWindow}复盘${s.number}个增长动作` },
  { id: "loss", style: "避坑型", tags: ["pain", "loss"], render: (s) => `${s.shortSubject}别再${s.badAction}` },
  { id: "root", style: "真相型", tags: ["pain", "truth"], render: (s) => `${s.problem}问题出在哪` },
  { id: "list", style: "清单型", tags: ["list"], render: (s) => `${s.audience}先看${s.number}个${s.xhsSubject}` },
  { id: "result", style: "结果型", tags: ["result"], render: (s) => `${s.shortSubject}怎么拿到${s.result}` },
  { id: "contrast", style: "对比型", tags: ["contrast"], render: (s) => `${s.shortSubject}有用和没用的差别` },
  { id: "stop", style: "纠偏型", tags: ["action", "loss"], render: (s) => `别再${s.badAction}，先${s.action}` },
  { id: "question", style: "痛点型", tags: ["question", "pain"], render: (s) => `${s.audience}为什么卡在${s.problem}` },
  { id: "why", style: "解释型", tags: ["truth"], render: (s) => `为什么${s.shortSubject}总是没效果` },
];

buildCleanTitleChoices = function buildCleanTitleChoicesV3(topic, titleAssets = state.titleAssets) {
  const signal = extractLongkaTitleSignalV3(topic);
  const target = state.publishTarget || "xhs";
  const formulaItems = LONGKA_TITLE_FORMULAS_V3
    .map((formula, index) => ({ formula, score: scoreLongkaTitleFormulaV3(formula, signal, target, index) }))
    .sort((a, b) => b.score - a.score)
    .map((item) => ({
      title: renderLongkaTitleForTargetV3(item.formula, signal, target),
      reason: `${item.formula.style}：绑定当前选题原始标题、数据和痛点生成`,
    }));
  const domainItems = buildLongkaDomainTitleCandidatesV3(signal, target);
  return rankLongkaTitlesV3([...domainItems, ...formulaItems], signal, target).slice(0, 5);
};

function extractLongkaTitleSignalV3(topic = {}) {
  const rawTitle = cleanLongkaTitleTextV2(topic.title || topic.theme || topic.raw?.title || "");
  const text = cleanLongkaTitleTextV2([
    topic.theme, topic.title, topic.pain, topic.reason, topic.reuse, topic.content, topic.body, topic.summary,
    topic.raw?.title, topic.raw?.description, topic.raw?.content, topic.raw?.text, topic.raw?.analysis, topic.raw?.pain,
  ].filter(Boolean).join(" "));
  const domain = inferLongkaTitleDomainV3(text);
  const subject = pickLongkaSubjectV3(text, rawTitle, domain);
  return {
    text,
    sourceTitle: rawTitle,
    domain,
    number: extractLongkaTitleFormulaNumberV3(rawTitle, text, domain),
    timeWindow: extractLongkaTimeWindowV3(text),
    subject: limitLongkaPhraseV2(subject, 18),
    shortSubject: limitLongkaPhraseV2(subject, 8),
    xhsSubject: compactLongkaXhsSubjectV3(subject, domain),
    audience: limitLongkaPhraseV2(pickLongkaAudienceV3(text, domain), 8),
    problem: limitLongkaPhraseV2(pickLongkaProblemV3(text, domain), 10),
    action: limitLongkaPhraseV2(pickLongkaActionV3(text, domain), 10),
    result: limitLongkaPhraseV2(pickLongkaResultV3(text, domain), 8),
    badAction: limitLongkaPhraseV2(pickLongkaBadActionV3(text, domain), 8),
  };
}

function inferLongkaTitleDomainV3(text = "") {
  if (/从\s*\d+(?:\.\d+)?\s*到\s*\d+(?:\.\d+)?\s*[Kk万千]?|\d+(?:\.\d+)?\s*[Kk]\b|\d+(?:\.\d+)?\s*万\s*(曝光|浏览|播放|阅读)|\d+\s*个月|涨粉|粉丝|曝光|浏览|播放|发布/.test(text)) return "growth";
  if (/私校|面试|择校|升学|孩子|家长|夏校|教育/.test(text)) return "education";
  if (/律师|法律|法条|案件|客户/.test(text)) return "lawyer";
  if (/AI|Cursor|Claude|Codex|DeepSeek|Lovable|Replit|Base44|skills?|工具|MVP|自媒体|内容创作|模板|低质/i.test(text)) return "ai-content";
  return "general";
}

function pickLongkaSubjectV3(text = "", title = "", domain = "general") {
  if (domain === "growth") {
    if (/小红书|图文/.test(text)) return "小红书账号";
    if (/视频|短视频/.test(text)) return "账号增长";
    return "账号增长";
  }
  return pickLongkaSubjectV2(text, title, domain);
}

function pickLongkaAudienceV3(text = "", domain = "general") {
  if (domain === "growth") return /小红书|图文/.test(text) ? "小红书博主" : "内容创作者";
  return pickLongkaAudienceV2(text, domain);
}

function pickLongkaProblemV3(text = "", domain = "general") {
  if (domain === "growth") {
    if (/没有什么方法论|没方法|刚开始/.test(text)) return "起号没方法论";
    if (/发布|曝光|内容/.test(text)) return "内容多但没复盘";
    return "增长路径没拆清";
  }
  return pickLongkaProblemV2(text, domain);
}

function pickLongkaActionV3(text = "", domain = "general") {
  if (domain === "growth") return "复盘增长动作";
  return pickLongkaActionV2(text, domain);
}

function pickLongkaResultV3(text = "", domain = "general") {
  if (domain === "growth") {
    const k = text.match(/(\d+(?:\.\d+)?)\s*K/i);
    if (k) return `${k[1]}K粉丝`;
    const exposure = text.match(/(\d+(?:\.\d+)?)\s*万\s*(曝光|浏览|播放)/);
    if (exposure) return `${exposure[1]}万曝光`;
    return "跑出增长";
  }
  return pickLongkaResultV2(text, domain);
}

function pickLongkaBadActionV3(text = "", domain = "general") {
  if (domain === "growth") return "只看数据";
  return pickLongkaBadActionV2(text, domain);
}

function extractLongkaTitleFormulaNumberV3(title = "", text = "", domain = "general") {
  if (domain === "growth") {
    const month = text.match(/(\d+)\s*个月/);
    if (month) return month[1];
    return "3";
  }
  const source = title || text;
  const matched = String(source || "").match(/(\d+)\s*(个|条|点|件|种|步|招)/);
  if (!matched) return "3";
  const value = Number(matched[1]);
  if (!Number.isFinite(value) || value <= 0 || value > 20) return "3";
  return String(value);
}

function extractLongkaTimeWindowV3(text = "") {
  const month = text.match(/(\d+)\s*个月/);
  if (month) return `${month[1]}个月`;
  const day = text.match(/(\d+)\s*天/);
  if (day) return `${day[1]}天`;
  return "这次";
}

function compactLongkaXhsSubjectV3(subject = "", domain = "general") {
  if (domain === "growth") return "账号增长";
  return compactLongkaXhsSubjectV2(subject);
}

function scoreLongkaTitleFormulaV3(formula, signal, target, index) {
  let score = 100 - index;
  if (signal.domain === "growth") {
    if (formula.tags.includes("growth")) score += 120;
    if (["growth-review", "growth-method", "growth-list"].includes(formula.id)) score += 40;
    if (["loss", "root", "question", "contrast"].includes(formula.id)) score -= 40;
  } else if (formula.tags.includes("growth")) {
    score -= 220;
  }
  score += scoreLongkaTitleFormulaV2(formula, signal, target, index) / 10;
  return score;
}

function renderLongkaTitleForTargetV3(formula, signal, target = state.publishTarget) {
  if (target !== "wechat-article") return formula.render(signal);
  if (signal.domain === "growth") {
    const longTitles = {
      "growth-review": `从 0 到 ${signal.result}：这次账号增长真正做对了什么`,
      "growth-method": `${signal.timeWindow}跑出${signal.result}，不是靠运气，而是靠这几个内容动作`,
      "growth-truth": `${signal.shortSubject}别只看涨粉，真正值得拆的是背后的内容复盘`,
      "growth-list": `${signal.timeWindow}复盘：一个账号从 0 跑出结果的关键动作`,
    };
    return longTitles[formula.id] || `${signal.subject}复盘：从数据里拆出可复制的方法`;
  }
  return renderLongkaTitleForTargetV2(formula, signal, target);
}

function buildLongkaDomainTitleCandidatesV3(signal, target = "xhs") {
  if (signal.domain !== "growth") return [];
  if (target === "wechat-article") {
    return [
      { title: `从 0 到 ${signal.result}：这次账号增长真正做对了什么`, reason: "账号增长复盘型：绑定粉丝增长和时间窗口" },
      { title: `${signal.timeWindow}跑出${signal.result}，不是靠运气，而是靠内容复盘`, reason: "账号增长方法型：绑定持续发布和复盘" },
    ];
  }
  return [
    { title: `从0到${signal.result}复盘`, reason: "账号增长复盘型：绑定从0到结果" },
    { title: `${signal.timeWindow}涨到${signal.result}`, reason: "结果型：绑定时间窗口和粉丝增长" },
    { title: `${signal.result}我做对了什么`, reason: "真相型：绑定增长结果和复盘问题" },
    { title: `${signal.shortSubject}增长复盘`, reason: "复盘型：绑定账号增长主题" },
    { title: `${signal.problem}怎么办`, reason: "痛点型：绑定起号阶段问题" },
  ];
}

function rankLongkaTitlesV3(items = [], signal = {}, target = "xhs") {
  const forbidden = signal.domain === "growth" ? /公众号|关键问题|0个|素材库|标题库|工具|AI/ : /素材库|标题库/;
  return rankLongkaTitlesV2(items, signal, target)
    .filter((item) => !forbidden.test(item.title))
    .filter((item) => !/先先|涨粉/.test(item.title) || signal.domain === "growth")
    .filter((item) => target !== "xhs" || Array.from(item.title).length <= 20);
}

restoreWorkbenchSnapshot();
renderToday();
