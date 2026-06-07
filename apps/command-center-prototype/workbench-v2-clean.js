const state = {
  route: "today",
  step: 1,
  publishTarget: "xhs",
  sourceChannel: "same-platform",
  industry: "AI 与自媒体",
  businessLine: "AI 内容创作",
  goal: "获客和建立专业感",
  keywords: "AI自媒体, 内容资产库, Agent工作流",
  topics: [],
  selectedTopicId: "",
  titleChoices: [],
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
  xhsCardManifest: null,
  finalWorks: [],
  archiveMessage: "",
  editingMetricsWorkId: "",
  logs: [],
  assets: null,
  assetStatus: "未读取",
  lastXRunIds: [],
  useLatestXRunOnly: false,
  isCollectingX: false,
};

const publishTargets = [
  { id: "xhs", title: "小红书图文", platform: "xiaohongshu", desc: "封面、标题、短正文、收藏点、标签" },
  { id: "douyin", title: "抖音短视频", platform: "douyin", desc: "3 秒钩子、口播、镜头、字幕、节奏" },
  { id: "video-account", title: "视频号短视频", platform: "video", desc: "信任感、口播、案例、转化动作" },
  { id: "wechat-article", title: "公众号长文", platform: "wechat", desc: "标题、开头、论证、案例、方法论" },
  { id: "moments", title: "朋友圈文案", platform: "moments", desc: "自然表达、信任建立、私聊引导" },
  { id: "topic-only", title: "只整理选题", platform: "asset", desc: "只把素材整理成可复用选题，暂不写成品" },
];

const sourceChannels = [
  { id: "same-platform", title: "同平台对标素材", desc: "默认选择。在哪个平台发，就优先读哪个平台的爆款素材。" },
  { id: "xhs", title: "小红书素材", desc: "适合学习小红书标题、封面、评论痛点、收藏结构。" },
  { id: "x-history", title: "历史资产", desc: "先复用之前采集的真实素材，找出今天能写的选题。" },
  { id: "x-live", title: "X 账号资产", desc: "只读取 X/推特来源，适合提炼观点、洞察和方法论。" },
  { id: "all-assets", title: "全库选题复用", desc: "一鱼多吃：从资产库里找好选题，再改写到目标平台。" },
  { id: "manual", title: "手动导入", desc: "粘贴你看到的好内容，整理成可写选题。" },
];

const visualStyles = [
  {
    id: "xiaohei-metaphor",
    title: "小黑漫画隐喻",
    desc: "适合观点型、避坑型、方法论内容。用角色和场景讲明白，不做大字报。",
    route: "43 小黑真出图",
    assetLabel: "小黑手绘漫画 / 观点隐喻",
  },
  {
    id: "juju-organizing",
    title: "卷卷整理插画",
    desc: "适合把复杂方法、复盘、教程整理成白底纸面手绘现场，适合小红书方法卡和公众号正文图。",
    route: "juju-content-illustrations",
    assetLabel: "卷卷整理研究所 / 内容插画",
  },
  {
    id: "xhs-knowledge-card",
    title: "小红书知识卡",
    desc: "适合清单、步骤、对比和收藏型内容。文字少、层级清楚、适合手机看。",
    route: "HTML 卡片 / PNG 导出",
    assetLabel: "小红书知识卡 / 信息图",
  },
  {
    id: "guizang-editorial",
    title: "归藏杂志风",
    desc: "适合方法论、行业洞察、投资人展示。更像高级 Deck，不适合生活口吻内容。",
    route: "open-design / guizang deck",
    assetLabel: "归藏编辑风 / 杂志 Deck",
  },
];

function currentVisualStyle() {
  return visualStyles.find((item) => item.id === state.visualStyle) || visualStyles[0];
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

function persistWorkbenchSnapshot() {
  try {
    const snapshot = {
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
    localStorage.setItem(WORKBENCH_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch (error) {
    console.warn("Longka snapshot save failed", error);
  }
}

function restoreWorkbenchSnapshot() {
  try {
    const raw = localStorage.getItem(WORKBENCH_SNAPSHOT_KEY);
    if (!raw) return false;
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
    state.logs = [`已恢复上次工作进度：${new Date(snapshot.savedAt || Date.now()).toLocaleString()}`, ...(state.logs || [])].slice(0, 10);
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

function rememberCopyVersion(copy, label = "初稿") {
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

function currentCopySnapshot(label = "当前版本") {
  const copy = activeCopyText();
  if (!copy) return null;
  const current = state.copyVersions.find((item) => item.id === state.currentCopyVersionId);
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

function extractBodyLinesForCards(copy = "") {
  return normalizeCopyText(copy)
    .split(/\n+/)
    .map((line) => line.replace(/^(标题|正文|配图建议|标签)[:：]\s*/u, "").trim())
    .filter((line) => line && !/^#/.test(line))
    .slice(0, 12);
}

function buildXhsCardPlanFromConfirmedCopy() {
  const copy = confirmedCopyText();
  const topic = selectedTopic() || {};
  const lines = extractBodyLinesForCards(copy);
  const title = state.selectedTitle || topic.theme || topic.title || "AI 内容创作为什么总是没流量";
  const pain = lines.find((line) => /没流量|AI|内容|素材|选题|爆款|不会写|卡住/.test(line)) || topic.pain || "很多人不是不会用 AI，而是没有自己的内容资产库。";
  const method = lines.find((line) => /先|再|系统|资产|拆解|复用|标准|流程/.test(line)) || "先沉淀素材，再拆解爆点，最后让 AI 按你的资产重写。";
  const checklist = [
    "先收集真实高质量素材",
    "拆标题、开头、结构和用户痛点",
    "把可复用部分存进资产库",
    "写作时先匹配资产，再生成内容",
  ];
  const action = lines.find((line) => /私信|评论|收藏|下一步|评估|咨询|试/.test(line)) || "先拿一个主题跑通：素材 -> 文案 -> 图文，再逐步沉淀自己的内容系统。";
  return [
    { type: "cover", role: "封面", title, text: "别再只让 AI 凭空写爆款，先把内容资产库搭起来。" },
    { type: "pain", role: "问题卡", title: "为什么 AI 写文案没流量", text: pain },
    { type: "method", role: "方法卡", title: "真正该做的是这套系统", text: method },
    { type: "checklist", role: "清单卡", title: "每天按这 4 步跑", text: checklist.join("\n") },
    { type: "action", role: "行动卡", title: "今天先做一个最小闭环", text: action },
  ];
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
  const pain = lines.find((line) => /没流量|AI|内容|素材|选题|爆款|卡住|不好用|写不出/.test(line)) || topic.pain || "很多人不是不会用 AI，而是没有自己的内容资产库，所以每次写作都像从零开始。";
  const action = lines.find((line) => /私信|评论|收藏|下一步|评估|咨询|测试|行动/.test(line)) || "先拿一个主题跑通：素材 -> 文案 -> 图文，再逐步沉淀自己的内容系统。";
  const sourceName = topic.source || topic.platform || currentSource()?.title || "内容资产库";
  const bodyLead = lines[0] || pain;
  return [
    {
      type: "cover",
      role: "封面",
      title,
      text: "别再让 AI 凭空写爆款，先把素材、拆解和复用串成一套系统。",
      visualStyle: visual.id,
      carouselJob: "第 1 张：负责让人停下来",
      visualBrief: visual.id === "xiaohei-metaphor"
        ? "小黑站在一堆散落 prompt 和素材卡前，旁边是一台正在整理内容资产的机器。画面只保留必要短标题，不写过程提示。"
        : "杂志感封面。大标题压住屏幕，中间用“素材库/拆解卡/标题库/成稿”四个层级做视觉钩子。",
      readerTakeaway: "这不是普通 AI 写作教程，而是一套能持续投喂的内容系统。",
      imagePrompt: "3:4 Xiaohongshu cover, editorial magazine style, Chinese typography, AI content asset system, layered archive cards, premium but warm, no fake UI text except provided title."
    },
    {
      type: "pain",
      role: "问题页",
      title: "为什么你用 AI 写，还是没流量",
      text: pain,
      visualStyle: visual.id,
      carouselJob: "第 2 张：放大用户痛点",
      visualBrief: visual.id === "xiaohei-metaphor"
        ? "小黑拿着一张写满标题的纸，却面对空空的资料柜。重点表达“不是工具问题，是没有积累”。"
        : "左侧是零散 prompt、标题和草稿堆在一起，右侧是空的内容资产库，形成强反差。",
      readerTakeaway: "问题不是工具差，而是没有长期积累和可复用标准。",
      imagePrompt: "3:4 Rednote infographic, contrast layout, messy AI prompts versus organized empty content library, readable Chinese labels, clean editorial look."
    },
    {
      type: "assets",
      role: "资产页",
      title: "真正有用的是这 4 个库",
      text: ["爆款素材库", "标题公式库", "用户问题库", "结构拆解库"].join("\n"),
      visualStyle: visual.id,
      carouselJob: "第 3 张：给出系统框架",
      visualBrief: visual.id === "xiaohei-metaphor"
        ? "小黑把四个抽屉贴上标签：素材、标题、问题、结构。画面像整理工作台，不要大段文字。"
        : "四宫格资产地图，每一格有一个清晰用途，不堆废话。",
      readerTakeaway: "爆款不是临时套模板，而是调用已经沉淀好的资产。",
      imagePrompt: "3:4 Xiaohongshu knowledge card, four quadrant asset map, title formula library, user question library, content structure library, viral sample library, Chinese, high clarity."
    },
    {
      type: "flow",
      role: "流程页",
      title: "每天按这条线跑",
      text: ["采集好内容", "拆标题和开头", "沉淀到资产库", "再生成成稿"].join("\n"),
      visualStyle: visual.id,
      carouselJob: "第 4 张：让用户知道怎么做",
      visualBrief: visual.id === "xiaohei-metaphor"
        ? "小黑沿着一条传送带完成采集、拆解、入库、创作四步。每步用小图标表达，不写长句。"
        : "竖向流程线，四个节点有明确动词，让普通用户知道下一步点什么。",
      readerTakeaway: "用户每天只需要按流程执行，而不是重新想一遍怎么做。",
      imagePrompt: "3:4 Rednote workflow card, vertical pipeline, collect, deconstruct, archive, create, strong hierarchy, premium Chinese infographic."
    },
    {
      type: "action",
      role: "行动页",
      title: "今天先跑通一个最小闭环",
      text: action || bodyLead,
      visualStyle: visual.id,
      carouselJob: "第 5 张：收束到收藏和行动",
      visualBrief: visual.id === "xiaohei-metaphor"
        ? `小黑把一张完成的图文卡放进“内容资产库”盒子，旁边留出下一平台复用的空位。只表达完成闭环，不写“第几张/负责人”等过程语。`
        : `行动清单页。底部保留“从 ${sourceName} 开始”的来源感，避免像空泛鸡汤。`,
      readerTakeaway: "看完以后知道今天先做什么，而不是只收藏不行动。",
      imagePrompt: "3:4 Xiaohongshu final CTA card, checklist, content workflow, warm professional style, action oriented, Chinese typography."
    }
  ];
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
    ${renderXhsGeneratedGallery()}
    <details class="xhs-carousel-plan" ${hasRealImages ? "" : "open"}>
      <summary>${zh("&#26597;&#30475; 5 &#39029;&#20986;&#22270; brief")}</summary>
      ${cards.map((card, index) => `<div><span>P${index + 1}</span><strong>${escapeHtml(card.role)}</strong><em>${escapeHtml(card.carouselJob || card.visualBrief || "brief")}</em></div>`).join("")}
    </details>
    ${currentVisualManifest() ? `<div class="status-strip success">${zh("&#24050;&#29983;&#25104;")}: ${escapeHtml(currentVisualManifest().count || cards.length)} ${zh("&#24352;")} / ${escapeHtml(currentVisualManifest().jobId || currentVisualManifest().outputDir || "")}</div>` : ""}
    ${state.xhsCardExportMessage ? `<div class="status-strip ${state.xhsCardExportStatus === "error" ? "warn" : ""}">${escapeHtml(state.xhsCardExportMessage)}</div>` : ""}
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
  if (state.xhsCardExportStatus === "loading" && state.xhsCardOperation === "xiaohei") {
    const done = Number(state.xhsCardProgress?.done || files.length || 0);
    const total = Number(state.xhsCardProgress?.total || 5);
    return `<div class="xhs-generated-empty loading">
      <b>43 正在生成小黑漫画图</b>
      <span>正在逐张生成：${done}/${total}。已生成的图片会先保留，避免 5 张一起请求超时后全丢。</span>
      ${files.length ? `<div class="xhs-generated-grid partial">
        ${files.map((file, index) => {
          const raw = String(file);
          const src = /^https?:\/\//.test(raw) ? raw : `./${raw.replace(/^\/+/, "")}`;
          return `<a href="${escapeHtml(src)}" target="_blank" rel="noreferrer">
            <img src="${escapeHtml(src)}" alt="小黑漫画图 ${index + 1}" loading="lazy" />
            <span>P${index + 1}</span>
          </a>`;
        }).join("")}
      </div>` : ""}
    </div>`;
  }
  if (state.xhsCardExportStatus === "loading") {
    return `<div class="xhs-generated-empty loading">
      <b>正在导出拆页方案</b>
      <span>这一步只是导出网页 brief PNG，用来检查每页承载，不是最终小黑漫画图。</span>
    </div>`;
  }
  if (!files.length) {
    return `<div class="xhs-generated-empty">
      <b>还没有生成小黑图</b>
      <span>确认当前文案后，点击“生成 5 张小黑漫画图”，这里会直接显示 43 返回的真实图片。</span>
      <button class="secondary" type="button" data-restore-latest-xiaohei>查询当前主题已生成图片</button>
    </div>`;
  }
  return `<div class="xhs-generated-gallery">
    <div class="xhs-generated-head">
      <b>${isXiaohei ? "43 小黑真出图结果" : "拆页方案导出结果"}</b>
      <span>${isXiaohei ? "这些图片来自 43 出图服务，可点击打开原图检查。" : "这些只是网页方案 PNG，不是小黑漫画成品。"}</span>
    </div>
    <div class="xhs-generated-grid">
      ${files.map((file, index) => {
        const raw = String(file);
        const src = /^https?:\/\//.test(raw) ? raw : `./${raw.replace(/^\/+/, "")}`;
        return `<a href="${escapeHtml(src)}" target="_blank" rel="noreferrer">
          <img src="${escapeHtml(src)}" alt="${isXiaohei ? "小黑漫画图" : "小红书拆页图"} ${index + 1}" loading="lazy" />
          <span>P${index + 1}</span>
        </a>`;
      }).join("")}
    </div>
  </div>`;
}

function renderXhsCarouselCard(card, index) {
  const page = String(index + 1).padStart(2, "0");
  const role = escapeHtml(card.role || "内容页");
  const job = escapeHtml(card.carouselJob || "");
  const title = escapeHtml(card.title || "");
  const text = escapeHtml(card.text || "");
  const takeaway = escapeHtml(card.readerTakeaway || "");
  const brief = escapeHtml(card.visualBrief || "");
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
          <section><b>缺的系统</b><span>素材</span><span>拆解</span><span>复用</span></section>
        </div>
        <p>${text}</p>
      </article></div>`;
  }
  if (index === 2) {
    return `<div class="xhs-card-wrap">${ops}<article class="xhs-preview-card xhs-recipe-matrix ${escapeHtml(card.type)}">
        <h3>${title}</h3>
        <div class="xhs-asset-matrix">
          ${(items.length ? items : ["爆款素材库", "标题公式库", "用户问题库", "结构拆解库"]).slice(0, 4).map((item, itemIndex) => `<div><em>0${itemIndex + 1}</em><strong>${escapeHtml(item)}</strong><span>${["看什么值得写", "标题不再乱编", "知道用户在问啥", "复用爆款结构"][itemIndex] || "沉淀资产"}</span></div>`).join("")}
        </div>
      </article></div>`;
  }
  if (index === 3) {
    return `<div class="xhs-card-wrap">${ops}<article class="xhs-preview-card xhs-recipe-flow ${escapeHtml(card.type)}">
        <h3>${title}</h3>
        <div class="xhs-flow-line">
          ${(items.length ? items : ["采集好内容", "拆标题和开头", "沉淀到资产库", "再生成成稿"]).slice(0, 4).map((item, itemIndex) => `<div><em>${itemIndex + 1}</em><strong>${escapeHtml(item)}</strong></div>`).join("")}
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
  state.xhsCardExportMessage = "正在导出拆页方案 PNG。注意：这不是小黑漫画真出图。";
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
    state.xhsCardExportMessage = `导出失败：${error.message}。网页卡片预览仍可用于演示，但不能冒充已出图。`;
    state.xhsCardManifest = null;
  }
  renderToday();
}

async function generateXiaoheiCards() {
  if (!state.copyConfirmed) return;
  const cards = ensureXhsCardPlan();
  if (!cards.length) return;
  const visual = currentVisualStyle();
  if (state.xhsCardManifest && !manifestMatchesCurrentVisual()) state.xhsCardManifest = null;
  state.xhsCardJobBase = buildCurrentXiaoheiJobId();
  state.xhsCardExportStatus = "loading";
  state.xhsCardOperation = "xiaohei";
  state.xhsCardProgress = { done: 0, total: cards.length };
  state.xhsCardAsyncJobId = state.xhsCardJobBase;
  state.xhsCardExportMessage = "43 已启动后台出图任务，页面会自动轮询结果。";
  state.xhsCardManifest = {
    renderer: "43-gpt-image-2-xiaohei-async",
    count: 0,
    files: [],
    publicFiles: [],
    jobIds: [],
    style: "xiaohei-handdrawn",
    visualStyleId: visual.id,
  };
  renderToday();
  try {
    const res = await fetch(apiPath("/api/xhs-cards/generate-xiaohei/start"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: state.selectedTitle || selectedTopic()?.theme || selectedTopic()?.title || "",
        body: confirmedCopyText(),
        topicId: selectedTopic()?.id || `xhs-xiaohei-${Date.now()}`,
        jobId: state.xhsCardAsyncJobId,
        style: visual.id,
        visualStyle: visual.id,
        visualStyleTitle: visual.title,
        platform: visualPlatformForCurrentTarget(),
        targetPlatform: visualPlatformForCurrentTarget(),
        cards: cards.map((card, index) => ({
          page: index + 1,
          role: card.role,
          title: card.title,
          text: card.text,
          visualBrief: card.visualBrief,
          readerTakeaway: card.readerTakeaway,
          carouselJob: card.carouselJob,
        })),
      }),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok || !result.ok) throw new Error(result.message || result.error || `HTTP ${res.status}`);
    state.xhsCardAsyncJobId = result.jobId || state.xhsCardAsyncJobId;
    if (result.manifest) applyRemoteVisualManifest(result.manifest);
    await pollXiaoheiCards({ jobId: state.xhsCardAsyncJobId, total: cards.length });
  } catch (error) {
    state.xhsCardExportStatus = "error";
    state.xhsCardOperation = "xiaohei";
    state.xhsCardProgress = null;
    const count = state.xhsCardManifest?.count || 0;
    state.xhsCardExportMessage = `43 小黑出图中断：${error.message}。已生成 ${count} 张会保留显示，未生成的不冒充成品。`;
    if (!count) state.xhsCardManifest = null;
  }
  renderToday();
}

async function pollXiaoheiCards({ jobId, total }) {
  for (let round = 0; round < 90; round += 1) {
    const res = await fetch(apiPath(`/api/xhs-cards/generate-xiaohei/status?jobId=${encodeURIComponent(jobId)}&total=${encodeURIComponent(total)}`));
    const result = await res.json().catch(() => ({}));
    if (!res.ok || !result.ok) throw new Error(result.message || result.error || `HTTP ${res.status}`);
    if (result.manifest) applyRemoteVisualManifest(result.manifest);
    const count = state.xhsCardManifest?.count || 0;
    state.xhsCardProgress = { done: count, total };
    state.xhsCardExportMessage = `43 后台出图中：已完成 ${count}/${total} 张。你可以停留等待，也可以稍后再点继续查询。`;
    if (["done", "partial", "error"].includes(result.status) && count >= total) {
      state.xhsCardExportStatus = "done";
      state.xhsCardProgress = null;
      state.xhsCardExportMessage = `43 已生成 ${count} 张小黑漫画图，下面可以逐张打开检查。`;
      renderToday();
      return;
    }
    if (["partial", "error"].includes(result.status) && count > 0) {
      state.xhsCardExportStatus = "error";
      state.xhsCardProgress = null;
      state.xhsCardExportMessage = `43 当前已生成 ${count}/${total} 张。未完成页可再次点击继续补齐。`;
      renderToday();
      return;
    }
    renderToday();
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  state.xhsCardExportStatus = "error";
  state.xhsCardProgress = null;
  state.xhsCardExportMessage = `轮询等待超时，但后台任务 ${jobId} 可能仍在继续。请稍后再次点击查询/补齐。`;
}

async function restoreLatestXiaoheiCards() {
  const jobId = state.xhsCardAsyncJobId || state.xhsCardJobBase || buildCurrentXiaoheiJobId();
  state.xhsCardExportStatus = "loading";
  state.xhsCardOperation = "xiaohei";
  state.xhsCardAsyncJobId = jobId;
  state.xhsCardJobBase = jobId;
  state.xhsCardExportMessage = `正在从 43 恢复当前主题的小黑图：${jobId}`;
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
      ? `已恢复当前主题 ${count}/5 张小黑图。`
      : "当前主题还没有生成过小黑图，请点击生成 5 张小黑漫画图。";
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
  persistWorkbenchSnapshot();
}

function renderHeroStatus() {
  const topic = selectedTopic();
  $("#heroStatus").innerHTML = `
    <div class="status-row"><b>发布目标</b><span>${escapeHtml(currentTarget().title)}</span></div>
    <div class="status-row"><b>素材来源</b><span>${escapeHtml(currentSource().title)}</span></div>
    <div class="status-row"><b>候选选题</b><span>${state.topics.length} 个</span></div>
    <div class="status-row"><b>文案状态</b><span>${state.copyConfirmed ? "已确认，可制作" : state.draft ? "待确认" : "未生成"}</span></div>
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
  return `<section class="work-card">
    ${cardHead(state.sourceChannel === "x-live" ? "第 4 步：先把今天可写的素材找出来" : "第 4 步：读取真实素材并生成选题", state.sourceChannel === "x-live" ? "你只需要二选一：抓一批新帖子，或者直接用以前保存过的素材。系统会筛出候选选题，然后自动进入第 5 步。" : "如果当前来源没有匹配素材，系统会明确提示，不会跨业务线乱推荐。")}
    ${state.sourceChannel === "x-live" ? renderXCollectControls() : ""}
    <div class="console">
      <div class="console-head"><b>${escapeHtml(sourceTitleForTarget())} 工作窗口</b><span>${escapeHtml(state.assetStatus)}</span></div>
      <div class="progress"><i id="progressBar" style="width:${progress}"></i></div>
      <pre class="console-log" id="consoleLog">${escapeHtml(state.logs.join("\n") || (state.sourceChannel === "x-live" ? "你现在只要选一个动作：\n1. 采集新素材：抓 X 推主最新帖子，系统筛选后进入第 5 步。\n2. 使用历史素材：不重新抓取，直接从保存过的素材里推荐选题。" : "点击按钮后，这里会显示读取、筛选和生成候选选题的进度。"))}</pre>
    </div>
    <div class="actions">
      <button class="ghost" data-step-target="3">返回来源选择</button>
      ${state.sourceChannel === "x-live" ? "" : `<button class="primary" data-read-materials>读取素材并生成选题</button>`}
      <button class="secondary" data-demo-materials>用本地预览样本演示流程</button>
      <button class="secondary" data-route-target="assets">查看内容资产库</button>
    </div>
  </section>`;
}

function renderXCollectControls() {
  return `<div class="x-source-actions">
    <article class="action-tile primary-tile">
      <div>
        <span class="eyebrow">实时采集</span>
        <h3>采集新素材</h3>
        <p>适合你换了对标账号，想抓当下新帖。点这里后，系统会在当前工作台里采集、筛选，并把结果变成第 5 步可选题。</p>
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
        <p>适合你不想重新采集，直接用以前保存过的 X 素材，找今天能写的选题。</p>
      </div>
      <button class="primary" data-read-materials>使用历史素材生成选题</button>
      <span class="muted-text">不会重新采集。成功后直接进入第 5 步。</span>
    </article>
  </div>`;
}

function renderTopicStep() {
  return `<section class="work-card">
    ${cardHead("第 5 步：选择一个今天要写的选题", "这里展示的是系统从真实素材里筛出来的可写方向。选一个后，下一步生成平台标题。")}
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
  if (!state.titleChoices.length && state.selectedTopicId) state.titleChoices = buildTitleChoices(selectedTopic());
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
      <span>已把小黑图按语义插入正文：痛点、框架、流程、行动段落。点击图片可打开原图。</span>
    </div>
    <article class="wechat-article-preview">
      ${blocks.map((block, index) => `${renderArticleBlock(block)}${slots[index] ? renderArticleImageSlot(slots[index]) : ""}`).join("")}
    </article>
  </div>`;
}

function stripDraftTitleLabels(copy = "") {
  return String(copy || "")
    .replace(/^标题：.*\n+/m, "")
    .replace(/^正文：\n?/m, "")
    .replace(/\n+配图建议：[\s\S]*$/m, "")
    .replace(/\n+标签：[\s\S]*$/m, "")
    .trim();
}

function splitArticleBlocks(copy = "") {
  const lines = String(copy || "").split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const blocks = [];
  let current = [];
  for (const line of lines) {
    if (/^#{1,3}\s+|^第?[一二三四五六七八九十]+[、.．]|^##\s*/.test(line) && current.length) {
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
  if (/^第?[一二三四五六七八九十]+[、.．]/.test(block)) return `<h2>${safe}</h2>`;
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
  return `<section class="work-card">
    ${cardHead("Longka 文案体检", "正文生成后才评分。评分说依据，再给优化方向。")}
    <div class="draft-box">
      <div class="draft-text"><h3>优化后版本</h3><pre>${escapeHtml(state.improvedDraft || state.draft || "暂无文案")}</pre></div>
      <div class="check-panel">
        <h3>体检结果</h3>
        ${checks.map((item) => `<div class="check-row ${item.warn ? "warn" : ""}"><b>${item.score}</b><p><strong>${escapeHtml(item.name)}</strong><br>${escapeHtml(item.reason)}</p></div>`).join("")}
      </div>
    </div>
    ${renderCopyVersionList()}
    <div class="actions">
      <button class="ghost" data-step-target="7">返回正文</button>
      <button class="secondary" data-improve-again>继续优化一次</button>
      <button class="primary" data-step-target="9">下一步：网页确认文案</button>
    </div>
  </section>`;
}

function renderConfirmStep() {
  return `<section class="work-card">
    ${cardHead("确认文案", "只有网页端点击确认后，才允许生成卡片图、视频脚本、任务包或导出。")}
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
  const primaryLabel = visual.id === "xiaohei-metaphor" ? "生成 5 张小黑漫画图" : "生成 5 张当前风格图";
  const loadingLabel = visual.id === "xiaohei-metaphor" ? "43 正在生成..." : "正在生成...";
  return `<section class="work-card">
    ${cardHead("小红书图文成稿", "确认文案后，生成 5 张小红书轮播配图，并在本页直接回显结果。")}
    ${renderCleanXhsCardPreview()}
    <div class="production-grid">
      <article class="production-card ${locked ? "locked" : ""}">
        <b>${escapeHtml(visual.title)}</b>
        <span>按当前确认文案和视觉风格生成 5 张小红书轮播图，并在本页回显真实图片或导出结果。</span>
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
        <b>${isWechat ? "公众号图文排版" : isVideo ? "视频脚本/分镜" : "平台文案"}</b>
        <span>${isWechat ? "长文会自动匹配可复用小黑图的插入位置。" : isVideo ? "脚本要重新拆成钩子、口播、镜头和字幕。" : "按当前平台重新表达，不沿用原平台结构。"}</span>
      </article>
      <article class="production-card ${locked ? "locked" : ""}">
        <b>可复用图片</b>
        <span>${images.length ? `${images.length} 张，可按语义复用或后续重做。` : "当前母题没有可复用图片，可只输出文字或后续补图。"}</span>
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
      ${lines.map((line, index) => `<article class="asset-item"><b>${index === 0 ? "标题/钩子" : `段落 ${index}`}</b><span>${escapeHtml(line)}</span></article>`).join("")}
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
        ${files.length ? files.map((url, index) => `<p><strong>P${index + 1}</strong><br><a class="source-link" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">打开第 ${index + 1} 张图</a></p>`).join("") : `<p>当前平台以文字/脚本交付为主，图片可后续补充或从母题复用。</p>`}
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
  const canSave = ready && (state.publishTarget !== "xhs" || files.length > 0);
  return `<section class="work-card">
    ${cardHead("保存为母题资产", "不是只收藏成品，而是把这次内容沉淀成可复盘、可拆解、可切换平台再生产的母题资产。")}
    ${state.archiveMessage ? `<div class="status-strip success">${escapeHtml(state.archiveMessage)}</div>` : ""}
    <div class="production-grid">
      <article class="production-card"><b>1. 平台成稿</b><span>${escapeHtml(currentTarget().title)} · ${files.length || reusableImages.length} 张可用图 / ${confirmedCopyText().length} 字正文 / 可回看交付链接。</span></article>
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

function buildFinalWorkAsset() {
  const files = Array.isArray(currentVisualManifest()?.publicFiles) ? currentVisualManifest().publicFiles : [];
  const reusableImages = getReusableImagesForCurrentTopic();
  const topic = selectedTopic();
  const target = currentTarget();
  const body = confirmedCopyText();
  const visual = currentVisualStyle();
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
  };
}

function archiveFinalWork() {
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
  const withoutCurrent = state.finalWorks.filter((item) => item.id !== asset.id);
  state.finalWorks = [asset, ...withoutCurrent].slice(0, 30);
  persistWorkbenchSnapshot();
  state.archiveMessage = `已保存：${asset.platform} 版本已进入母题资产库，可继续切换到其他平台复用。`;
  renderToday();
}

function buildPlatformReusePlan(platformId) {
  const common = [
    "小红书：改成 5 张图文轮播，首屏必须有强钩子和明确收藏价值。",
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
      use: "高级杂志/Deck 感，适合方法论、行业洞察、投资人展示。",
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
  if (styleId === "xiaohei-metaphor") return "调用 43 小黑真出图，生成 5 张带场景隐喻的漫画图。适合当前演示闭环。";
  if (styleId === "juju-organizing") return "按卷卷整理研究所风格，把当前文案变成白底纸面手绘方法图；适合方法论、小红书知识卡和公众号正文插图。";
  if (styleId === "guizang-editorial") return "按归藏杂志风拆成高级图文卡，适合给投资人看方法论和系统感。当前先导出拆页方案，后续接真图服务。";
  return "按宝玉小红书知识卡拆页，适合清单、步骤和收藏型内容。当前先导出拆页方案，后续接真图服务。";
}

function primaryVisualActionLabel(styleId) {
  if (styleId === "xiaohei-metaphor") return "生成 5 张小黑漫画图";
  if (styleId === "juju-organizing") return "生成 5 张卷卷整理图";
  if (styleId === "guizang-editorial") return "生成 5 张归藏杂志图";
  return "生成 5 张宝玉知识卡";
}

function zh(entity) {
  const box = document.createElement("textarea");
  box.innerHTML = entity;
  return box.value;
}

function recommendVisualRouteClean() {
  const topic = selectedTopic() || {};
  const text = `${state.selectedTitle || ""}\n${confirmedCopyText() || state.draft || ""}\n${topic.theme || ""}\n${topic.pain || ""}`;
  if (/流程|步骤|系统|资产库|方法|框架|拆解|复盘|教程|清单/.test(text)) {
    return { id: "juju-organizing", reason: zh("&#36825;&#31687;&#20869;&#23481;&#22312;&#35762;&#26041;&#27861;&#21644;&#31995;&#32479;&#65292;&#38656;&#35201;&#25226;&#22797;&#26434;&#27969;&#31243;&#25972;&#29702;&#25104;&#19968;&#20010;&#33021;&#36827;&#20837;&#30340;&#29616;&#22330;&#65307;&#21367;&#21367;&#27604;&#21333;&#32431;&#28459;&#30011;&#26356;&#36866;&#21512;&#25215;&#36733;&#27493;&#39588;&#21644;&#36164;&#20135;&#20851;&#31995;&#12290;") };
  }
  if (/避坑|焦虑|卡住|误区|为什么|别|不要|问题|失败/.test(text)) {
    return { id: "xiaohei-metaphor", reason: zh("&#36825;&#31687;&#20869;&#23481;&#26377;&#26126;&#26174;&#30171;&#28857;&#21644;&#24773;&#32490;&#24352;&#21147;&#65292;&#36866;&#21512;&#29992;&#23567;&#40657;&#20154;&#29289;&#22330;&#26223;&#20570;&#38544;&#21947;&#65292;&#35753;&#35835;&#32773;&#20808;&#34987;&#30011;&#38754;&#25235;&#20303;&#12290;") };
  }
  if (/行业|趋势|洞察|商业|投资人|方法论|战略|中台/.test(text)) {
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
  if (styleId === "xiaohei-metaphor") return zh("&#29983;&#25104; 5 &#24352;&#23567;&#40657;&#28459;&#30011;&#22270;");
  if (styleId === "juju-organizing") return zh("&#29983;&#25104; 5 &#24352;&#21367;&#21367;&#25972;&#29702;&#22270;");
  if (styleId === "guizang-editorial") return zh("&#29983;&#25104; 5 &#24352;&#24402;&#34255;&#26434;&#24535;&#22270;");
  return zh("&#29983;&#25104; 5 &#24352;&#23453;&#29577;&#30693;&#35782;&#21345;");
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
  return `<div class="visual-route-grid">${routes.map((item) => `<button type="button" class="visual-route-card ${item.id === state.visualStyle ? "active" : ""}" data-visual-style="${escapeHtml(item.id)}" ${locked ? "disabled" : ""}><b>${escapeHtml(item.name)}</b><span>${escapeHtml(item.use)}</span><em>${item.id === recommendedId ? "recommended · " : ""}${escapeHtml(item.base)}</em></button>`).join("")}</div>`;
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
  byId("workArea")?.querySelector("[data-demo-materials]")?.addEventListener("click", () => readDemoMaterials());
  $$("#workArea [data-topic-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedTopicId = button.dataset.topicId;
      clearAfter(5);
      state.titleChoices = buildTitleChoices(selectedTopic());
      setStep(6);
    });
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
    if (!snapshot?.copy) return;
    state.draftRevision += 1;
    state.pendingRevision = {
      currentDraft: snapshot,
      qualityFeedback: state.draftReview || runLongkaReview(snapshot.copy),
      instruction: "Rewrite the current copy into a complete new version. Do not append suggestions only.",
    };
    clearCopyConfirmation();
    state.draft = "";
    state.improvedDraft = "";
    state.draftStatus = "idle";
    state.draftError = "";
    state.draftMeta = null;
    state.draftReview = null;
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
    const version = state.copyVersions.find((item) => item.id === state.currentCopyVersionId) || rememberCopyVersion(activeCopyText(), "确认版本");
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

async function readMaterials() {
  state.logs = [];
  state.assetStatus = "正在读取";
  log("读取任务信息");
  log(`发布目标：${currentTarget().title}`);
  log(`素材来源：${sourceTitleForTarget()}`);
  log(`关键词：${state.keywords}`);
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
    const topics = buildTopicsFromLiveXSamples(batchSamples);
    state.assets = result;
    state.topics = topics.slice(0, 10);
    state.selectedTopicId = "";
    state.titleChoices = [];
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
          angle: "这条选题直接来自本轮 X 采集结果，优先学习它的观点、问题意识和结构，不照搬原文。",
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
  const sentence = text.split(/[。！？!?；;\n]/).find((line) => /难|痛|卡|问题|为什么|怎么|如何|不懂|没效果|踩坑|焦虑|失败|浪费/.test(line));
  if (sentence) return sentence.slice(0, 96);
  if (/AI|Agent|内容|自媒体|写作|爆款|素材/.test(text)) {
    return "用户想用 AI 做内容和自媒体，但缺少可复用素材、判断标准和稳定流程。";
  }
  return "这条素材有可复用观点，需要结合目标平台重新找到用户痛点。";
}

function buildLiveXReason(sample = {}, heat = 0) {
  const parts = [];
  const metrics = sample.metrics || {};
  if (heat >= 50) parts.push("互动信号较强");
  if (Number(metrics.bookmarks || metrics.saves || 0) > 0) parts.push("有收藏价值");
  if (Number(metrics.replies || metrics.comments || 0) > 0) parts.push("有讨论信号");
  if (cleanSourceText(sample.body || "").length >= 120) parts.push("正文信息量足够");
  return parts.length
    ? `入选依据：${parts.join("，")}。`
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
    if (state.sourceChannel === "x-live" && state.useLatestXRunOnly && state.lastXRunIds.length) {
      params.set("runIds", state.lastXRunIds.join(","));
    }
    const res = await fetch(apiPath(`/api/content-assets/unified?${params.toString()}`));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    state.assetStatus = "已读取统一内容资产库";
    log(`统一内容资产库：读取 ${result.totalSourceSamples || 0} 条，匹配 ${result.matchedCount || 0} 条。`);
    return {
      contentSamples: Array.isArray(result.assets) ? result.assets : [],
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
    };
  } catch (error) {
    console.warn("loadFullAssetState failed", error);
    return {
      contentSamples: [],
      rawMaterials: [],
      candidates: [],
      assets: [],
    };
  }
}

function sourceTitleForTarget() {
  if (state.sourceChannel !== "same-platform") return currentSource().title;
  const map = {
    xhs: "小红书同平台素材",
    douyin: "抖音同平台素材",
    "video-account": "视频号同平台素材",
    "wechat-article": "公众号/长文同平台素材",
    moments: "朋友圈/私域素材",
    "topic-only": "全库选题资产",
  };
  return map[state.publishTarget] || currentSource().title;
}

function platformWanted() {
  if (state.sourceChannel === "same-platform") return currentTarget().platform;
  if (state.sourceChannel === "xhs") return "xiaohongshu";
  if (state.sourceChannel === "x-history") return "all";
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
  const text = `${topic.theme} ${topic.sourceInsight?.angle || ""}`.toLowerCase();
  if (/同质化|模板|规范|打击/.test(text)) return "ai-content-template-risk";
  if (/拆文|爆款|关键|提示词/.test(text)) return "viral-deconstruction-missing-layer";
  if (/社群|同频|连接/.test(text)) return "community-filtering";
  if (/素材|清洗|去重|资产/.test(text)) return "content-asset-cleaning";
  return cleanSourceText(topic.theme || topic.title || "").slice(0, 28);
}

function shouldKeepScoredSample(item, keywords) {
  if (!keywords.length) return state.sourceChannel === "all-assets";
  if (item.score > 0) return true;
  return false;
}

function judgeMotherTopicEligibility(sample = {}) {
  const text = cleanSourceText(`${sample.title} ${sample.body}`);
  const metrics = sample.metrics || {};
  const heat = Number(metrics.likes || 0)
    + Number(metrics.bookmarks || metrics.saves || metrics.collects || 0) * 1.2
    + Number(metrics.replies || metrics.comments || 0) * 2
    + Number(metrics.retweets || metrics.shares || 0) * 2
    + Number(metrics.quotes || 0) * 1.5;
  const reasons = [];
  if (text.length >= 70) reasons.push("内容信息量够，能拆出观点或方法");
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
  const heat = Number(metrics.likes || metrics.like || metrics.赞 || 0)
    + Number(metrics.saves || metrics.collects || metrics.藏 || 0) * 1.2
    + Number(metrics.comments || metrics.评 || 0) * 2;
  return keywordScore + Math.min(heat / 500, 20);
}

function expandKeywordParts(keyword) {
  const value = String(keyword || "").toLowerCase().replace(/[，,、]/g, " ");
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
  return `做${state.businessLine}的人，最怕不是不会用工具，而是看不出什么内容值得拆、怎么改才不像模板。`;
}

function extractSourceInsight(sample = {}) {
  const title = cleanSourceText(sample.title || "");
  const body = cleanSourceText(sample.body || "");
  const text = `${title}\n${body}`;
  if (/套路|模板|同质化|规范|打击/.test(text)) {
    return {
      theme: "AI 自媒体内容别再套模板，平台已经开始打同质化",
      pain: "很多人用 AI 写得更快了，但内容越来越像模板，担心没流量甚至被平台判低质。",
      angle: "从平台新规和同质化风险切入，讲普通人如何把 AI 内容写得更像自己的经验。",
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
    state.titleChoices = buildTitleChoices(topic, state.titleAssets);
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
    return titleChoice(title, `${group.name}：参考「${example.title || "标题资产"}」，${proof}`);
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
  return `${core}不是照搬爆款，而是先建资产`;
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
  const caseSignal = extractCaseTitleSignal(text);
  if (caseSignal) return caseSignal;
  const clauses = text
    .split(/[。！？!?；;\n\r]+/)
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
  const contrast = text.match(/不是([^，。！？;；]{2,24})[，,]?\s*而是([^，。！？;；]{2,32})/);
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
  const money = clean.match(/(?:收益|收入|变现|利润|流量|阅读|播放|涨粉)[^，。！？]{0,12}?(\d+(?:\.\d+)?\s*[万千百]?\+?)/);
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
    return titleChoice(title, `公式：${formula.name}｜替换：${formula.slots.join(" / ")}｜绑定当前选题`);
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
      { name: "X 之后，Y 怎么重理解", pattern: "after-rethink", slots: ["选题", "影响对象"] },
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
      misread: `别小看${main}，真正香的是${third}`,
      behind: `${main}背后，藏着一套${third}`,
      "why-impact": `为什么${main}能跑出${third}`,
      "three-points": `看懂${main}，先抓这 3 个点`,
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
    .replace(/[，。！？；：、,.!?;:]+$/g, "")
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
  if (!topic) return [];
  const seed = buildTitleSeed(topic);
  const assetChoices = buildAssetBackedTitleChoices(topic, titleAssets);
  const topicChoices = buildTopicDrivenTitleChoices(topic);
  if (state.publishTarget === "wechat-article") {
    return dedupeTitleChoices([
      ...topicChoices,
      ...assetChoices,
      titleChoice(`为什么${seed.problem}，不是换工具就能解决的？`, "认知冲突型：适合长文展开问题本质。"),
      titleChoice(`${seed.asset}这件事，我建议内容创作者早点补上`, "行动建议型：适合公众号方法论。"),
      titleChoice(`从${seed.scene}到稳定发文，中间差的是一套素材系统`, "路径拆解型：适合讲完整框架。"),
      titleChoice(`${seed.audience}最容易忽略的内容资产问题`, "人群代入型：降低阅读门槛。"),
      titleChoice(`写不出内容时，先别急着问 AI`, "反常识型：制造继续阅读理由。"),
      titleChoice(`我重新理解了${seed.core}：它不是资料夹`, "观点升级型：适合沉淀方法论。"),
    ]);
  }
  if (state.publishTarget === "douyin" || state.publishTarget === "video-account") {
    return dedupeTitleChoices([
      ...topicChoices,
      ...assetChoices,
      titleChoice(`你不是缺选题，是缺${seed.asset}`, "短视频钩子：一句话打断旧认知。"),
      titleChoice(`${seed.scene}？先做这 3 个动作`, "清单型：适合口播脚本。"),
      titleChoice(`别再让 AI 直接写了，先把素材喂对`, "避坑型：适合前 3 秒停留。"),
      titleChoice(`${seed.audience}每天发什么？答案不在工具里`, "痛点型：适合引发共鸣。"),
      titleChoice(`内容越写越像 AI，多半少了这一步`, "反差型：适合短视频开场。"),
      titleChoice(`一分钟讲清楚${seed.core}怎么用`, "效率型：适合教程口播。"),
    ]);
  }
  const pool = xhsTitlePoolForSeed(seed);
  return dedupeTitleChoices([
    ...topicChoices,
    ...assetChoices,
    ...pool.map((item) => titleChoice(item.title, item.reason)),
  ]);
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
  const pools = {
    asset: [
      { title: `内容资产库怎么搭？先存这 5 类素材`, reason: "资产库专属：直接给可收藏动作。" },
      { title: `每天不知道发什么，多半不是缺灵感`, reason: "痛点反转：击中选题焦虑。" },
      { title: `我现在写内容，先翻素材库再问 AI`, reason: "流程展示：把方法变成场景。" },
      { title: `别把爆款只存在收藏夹里`, reason: "认知提醒：从收藏转向复用。" },
      { title: `内容越做越稳的人，都在偷偷存素材`, reason: "好奇缺口：强调长期积累。" },
    ],
    agent: [
      { title: `Agent 总跑偏？先检查任务拆法`, reason: "问题诊断：贴合 Agent 源头。" },
      { title: `想搭 Agent，别一上来就堆工具`, reason: "避坑型：阻止错误动作。" },
      { title: `你的 Agent 缺的可能不是模型`, reason: "认知冲突：从模型转向流程。" },
      { title: `Agent 工作流卡壳，通常卡在这一步`, reason: "悬念型：制造点击理由。" },
      { title: `普通人搭 Agent，先做这个小闭环`, reason: "行动型：降低门槛。" },
    ],
    humanize: [
      { title: `AI 味太重？先别急着润色`, reason: "去 AI 味专属：反常识切入。" },
      { title: `文案像 AI，不是因为词不够口语`, reason: "认知冲突：避免表层改词。" },
      { title: `写得太完整，反而更像 AI`, reason: "人味诊断：抓住具体症状。" },
      { title: `去 AI 味，我最先删这几类句子`, reason: "清单型：适合收藏。" },
      { title: `别再让 AI 写得像说明书了`, reason: "痛点型：画面感强。" },
    ],
    longform: [
      { title: `公众号长文写不动，先别怪选题`, reason: "长文专属：从写作阻力切入。" },
      { title: `写了 3 年长文，我越来越少硬憋`, reason: "经验复盘：适合真实经历类。" },
      { title: `长文真正难的，不是开头`, reason: "反差型：引出结构问题。" },
      { title: `小红书和公众号，不能用同一套写法`, reason: "平台差异：适合一鱼多吃。" },
      { title: `长文素材不够时，别直接开写`, reason: "避坑型：回到素材积累。" },
    ],
    general: [
      { title: `${seed.problem}？先看这一步`, reason: "通用避坑：保底但绑定问题。" },
      { title: `${seed.audience}最容易忽略的内容动作`, reason: "人群代入：降低门槛。" },
      { title: `${seed.core}不是照搬爆款`, reason: "观点型：适合二创解释。" },
      { title: `为什么你做${seed.core}总是没结果？`, reason: "问题型：引出诊断。" },
      { title: `想做好${seed.core}，先存这张清单`, reason: "收藏型：适合图文。" },
    ],
  };
  return pools[seed.sourceType] || pools.general;
}

function titleChoice(title, reason) {
  return { title: clampTitle(title), reason };
}

function clampTitle(title = "") {
  const clean = String(title || "").replace(/\s+/g, " ").trim();
  return clean.length > 32 ? `${clean.slice(0, 31)}…` : clean;
}

function dedupeTitleChoices(items = []) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const key = item.title.replace(/[，。！？?！、\s]/g, "");
    if (!item.title || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result.slice(0, 5);
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
      "朋友圈文案不是文章，不要标题、不要标签、不要配图建议、不要“正文：”。",
      "只输出一条真人朋友圈动态，控制在 120-260 字。",
      "语气像运营者随手发圈：有最近发生的场景、有一句判断、有一点经验，不要教程腔。",
      "可以分 3-5 个短段，中间允许空行；不要编号清单，不要一二三步骤。",
      "结尾轻一点，可以是“有需要我把方法发你”这种私聊入口，不要硬广。"
    ].join("\n");
  }
  if (state.publishTarget === "wechat-article") {
    return [
      "公众号长文不是小红书短正文，不要标签，不要配图建议列表。",
      "需要有标题、开头问题、正文小标题、论证、案例/场景、方法和结尾。",
      "结构可以用 Markdown 标题，但正文要像一篇完整文章，不要写成轮播卡片说明。",
      "允许 900-1800 字，重点是观点展开和信任感，不要每段都短促喊口号。"
    ].join("\n");
  }
  if (state.publishTarget === "douyin" || state.publishTarget === "video-account") {
    return [
      "短视频脚本不是图文正文，不要标签，不要配图建议，不要公众号式长段落。",
      "必须按：封面标题、3秒钩子、口播正文、分镜/画面、字幕关键词、结尾互动来写。",
      "口播要短句，适合真人说出来；每段控制在 1-3 句。",
      "视频号更偏信任和解释，抖音更偏钩子和节奏。"
    ].join("\n");
  }
  return [
    "小红书图文要有标题、正文、配图建议和标签。",
    "正文要口语、有场景、有收藏价值，适合图文笔记，不要写成公众号长文。",
    "配图建议必须对应轮播页，不要写泛泛的装饰图。"
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
    parts.push("", "配图建议：", ...imagePlan.map((item, index) => `${index + 1}. ${typeof item === "string" ? item : item.title || item.copy || JSON.stringify(item)}`));
  }
  if (tags.length) parts.push("", `标签：${tags.map((tag) => String(tag).replace(/^#/, "#")).join(" ")}`);
  return parts.filter((item) => item !== undefined && item !== null).join("\n");
}

function formatWechatSopDraft({ title = "", body = "", draft = {} } = {}) {
  const clean = stripPlatformNoise(body || draft.article?.body || draft.article || "");
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
  return `标题：${state.selectedTitle}

正文：
很多人现在用 AI 做内容，最大的问题不是不会生成，而是越写越像同一套模板。

${angleLine}

我这次参考的源头素材是：
《${sourceTitle || topic.theme}》

它真正值得拆的不是原句，而是背后的提醒：
${topic.pain}

如果你也在做 AI 内容创作，先别急着堆工具，可以先看 3 个地方：

1. 你的内容是不是只有“方法步骤”，但没有自己的经历和判断
2. 你是不是只学了爆款标题，却没拆出用户为什么会停下来
3. 你是不是每篇都很完整，但读起来没有真实场景和人的味道

很多人拆爆款，只拆到标题、开头、结构这一层。

但真正该拆的是：
这篇内容解决了谁的焦虑？
它让读者收藏的理由是什么？
它有没有给一个低门槛的下一步？

所以 AI 内容不是不能用模板，而是不能只剩模板。

你可以先从一篇对标内容开始，拆出选题、用户问题和行动入口，再改成自己的表达。

配图建议：
${buildDeliveryPlan().map((item, index) => `${index + 1}. ${item}`).join("\n")}

标签：#${state.businessLine.replace(/\s+/g, "")} #${state.industry.replace(/\s+/g, "")} #内容避坑 #判断标准 #经验分享`;
}

function buildVideoDraft(topic) {
  return `标题：${state.selectedTitle}

0-3 秒｜钩子
你以为“${topic.theme}”难在工具，其实很多人第一步就错了。

3-8 秒｜代入
很多人看到别人有效，就急着照着做，但很少先问：这个方法适不适合我现在的情况？

8-35 秒｜主体
先看三个判断：
第一，问题是突然出现，还是长期累积。
第二，你之前试过的方法，是不是只看结果，没看前提。
第三，你现在需要的是马上行动，还是先做一次基础判断。

35-48 秒｜源头问题
这条选题来自一个真实素材：${topic.title}
它值得参考的地方不是原文表达，而是背后的用户问题：${topic.pain}

48-60 秒｜行动
所以别急着照搬。先把自己的情况判断清楚，再决定下一步怎么做。

分镜提示：
1. 开头大字：先别急着照搬
2. 中段字幕卡：3 个判断问题
3. 画面：源头素材 / 评论问题打码截图
4. 结尾：先判断，再行动`;
}

function buildArticleDraft(topic) {
  return `# ${state.selectedTitle}

## 这个选题为什么值得写
在“${state.industry}”里，很多内容失败不是因为没有观点，而是没有把真实问题拆清楚。

这次源头素材暴露的问题是：${topic.pain}

## 一、不要先套方法，先判断场景
同一个方法放在不同人身上，效果可能完全不同。内容创作也是一样，不能只学标题和句式，要先看它解决了什么问题。

## 二、拆源头素材的三个信号
1. 标题为什么能让人停下来
2. 正文提供了什么判断标准
3. 评论区或用户问题说明了什么需求

## 三、改造成自己的内容资产
我们要复制的是结构和洞察，不是原文表达。围绕“${state.businessLine}”，更适合的写法是：先讲误区，再给判断框架，最后给低门槛行动入口。

## 四、一鱼多吃
这个选题后续可以继续改成小红书图文、短视频脚本和朋友圈文案。`;
}

function buildMomentsDraft(topic) {
  const pain = topic.pain || "很多内容不是没价值，就是换个平台以后还沿用同一套写法。";
  return `最近越来越觉得，内容不能偷懒直接搬。

比如同一个选题，小红书可以写得像干货清单，但发朋友圈就不一样。朋友圈里大家看的不是“步骤”，而是你最近真的发现了什么、踩过什么坑。

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

function scoreDraft() {
  const text = state.improvedDraft || state.draft || "";
  const review = state.draftReview || runLongkaReview(text);
  if (review) {
    const gate = review.gate || {};
    const dbs = review.dbs || {};
    const ai = review.ai || {};
    const rows = [
      { name: "开头留存", ok: gate.checks?.answers_question !== false, good: "开头围绕当前主问题，没有泛泛铺垫。", bad: "开头还没有咬住当前标题对应的主问题。" },
      { name: "源头绑定", ok: Boolean(state.selectedTopicId), good: "正文绑定了选中的素材和标题。", bad: "缺少源头素材绑定，容易写成通用稿。" },
      { name: "具体感", ok: gate.checks?.not_encyclopedia !== false, good: "不是百科式堆知识，保留了判断路径。", bad: "表达太像百科说明，需要改成具体判断场景。" },
      { name: "人味表达", ok: ai.ok !== false, good: "没有明显模板腔。", bad: (ai.fixes || ["句式太顺、太完整，需要打散并加入真实口语节奏。"])[0] },
      { name: "行动入口", ok: gate.checks?.has_action !== false, good: "结尾有低压力下一步。", bad: "结尾缺少可执行动作。" },
      { name: "合规边界", ok: gate.checks?.no_fake_story !== false, good: "没有虚构身份、绝对承诺或高风险表达。", bad: "有虚构经历或承诺感，需要删掉。" },
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
    { score: text.length > 350 ? 84 : 68, name: "完整度", reason: text.length > 350 ? "已有正文、配图或行动入口。" : "正文偏短，难以完成平台内容交付。", warn: text.length <= 350 },
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
    "开头删掉解释腔，直接回答标题里的主问题。",
    "保留一个真实场景，不要每段都写成完整道理。",
    "把结尾改成低压力动作：收藏、对照、留言或评估。",
  ];
  return rewriteDraftByEditorialRules(text, fixes, again);
}

function rewriteDraftByEditorialRules(text = "", fixes = [], again = false) {
  const clean = stripEditorialNotes(text);
  const title = extractDraftField(clean, "标题") || state.selectedTitle || selectedTopic()?.theme || "这件事别急着照搬";
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
  const imagePlan = extractDraftField(clean, "配图建议");
  const rewrittenTitle = rewriteTitleWithSuspense(title);
  const rewrittenBody = rewriteBodyWithFocus(body, fixes, again);
  const parts = [
    `标题：${rewrittenTitle}`,
    "",
    "正文：",
    rewrittenBody,
  ];
  if (imagePlan) parts.push("", "配图建议：", compactImagePlan(imagePlan));
  if (tags) parts.push("", `标签：${compactTags(tags)}`);
  return parts.join("\n");
}

function stripEditorialNotes(text = "") {
  return String(text || "")
    .replace(/\n+Longka 文案体检修改方向：[\s\S]*$/g, "")
    .replace(/\n+第二轮体检修改方向：[\s\S]*$/g, "")
    .replace(/\n+第\d+轮体检修改方向：[\s\S]*$/g, "")
    .replace(/\n+优化补充：[\s\S]*$/g, "")
    .trim();
}

function extractDraftField(text = "", label = "") {
  const pattern = new RegExp(`${label}[：:]\\s*([\\s\\S]*?)(?=\\n\\s*(标题|正文|标签|配图建议|Longka|第二轮|第\\d+轮|优化补充)[：:]|$)`);
  const match = String(text || "").match(pattern);
  return match ? match[1].trim() : "";
}

function rewriteTitleWithSuspense(title = "") {
  const clean = String(title || "").replace(/\s+/g, " ").trim();
  if (!clean) return state.selectedTitle || "这件事别急着照搬";
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
  if (again) return `我会把问题再收窄一点：${base.replace(/[。！？!?.]$/, "")}。`;
  return `${base.replace(/[。！？!?.]$/, "")}。`;
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
  return `如果你也卡在“${topic.slice(0, 24)}”这类问题上，先别急着照搬别人的方案。把你现在最卡的一句话写下来，再决定下一步怎么改。`;
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
  return ["封面：停留标题", "第 2 张：为什么别急着照搬", "第 3 张：3 个自查问题", "第 4 张：源头痛点", "第 5 张：行动入口"];
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
    target.innerHTML = `
      <div class="asset-summary">
        <b>已沉淀 ${titles.length} 条标题资产</b>
        <span>${escapeHtml(result.filterMiss ? "当前关键词还没沉淀标题，先展示全库高分标题；需要继续采集本方向爆款标题。" : "标题不是一股脑堆在一起。先按公式/心理触发分组，再结合平台、行业和互动数据筛选。")}</span>
      </div>
      ${groups.length ? groups.map(renderTitleAssetGroup).join("") : `<article class="empty-state"><b>还没有标题资产</b><span>先采集真实帖子，标题会自动沉淀到这里。</span></article>`}`;
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
    ? "当前方向还缺标题资产，下面先展示全库高分标题作为参考。"
    : "当前方向已有可复用标题资产，可以直接支援第 6 步标题改写。";
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
          <span>同一个话题要覆盖认知冲突、损失规避、数字清单、案例经验等不同触发器。</span>
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
  if (/别|先|警告|避坑|不要/.test(title)) return "损失提醒型";
  if (/\d|几|第/.test(title)) return "数字清单型";
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
      <span>赞${escapeHtml(metrics.likes || 0)}</span>
      <span>藏${escapeHtml(metrics.saves || 0)}</span>
      <span>评${escapeHtml(metrics.comments || 0)}</span>
    </div>
    <p><strong>公式：</strong>${escapeHtml(item.formula || "待拆解")}</p>
    ${item.url ? `<a class="source-link" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">打开来源</a>` : ""}
  </article>`;
}

async function renderAssets() {
  const target = $("#assetBoard");
  if (!target) return;
  target.innerHTML = `<article class="empty-state"><b>正在读取母题资产库</b><span>正在从 122 内容资产库读取真实素材、成稿作品和可复用母题。</span></article>`;
  let db;
  let topics = [];
  let sampleCount = 0;
  try {
    db = await loadFullAssetState();
    const oldSource = state.sourceChannel;
    state.sourceChannel = "all-assets";
    topics = buildTopicsFromDb(db).slice(0, 9);
    state.sourceChannel = oldSource;
    sampleCount = Array.isArray(db.contentSamples) ? db.contentSamples.length : 0;
  } catch (error) {
    target.innerHTML = `<article class="empty-state"><b>母题资产库读取失败</b><span>${escapeHtml(error.message)}</span></article>`;
    return;
  }
  const finalWorksHtml = state.finalWorks.length
    ? `<div class="title-group-head"><b>已完成作品</b><span>${state.finalWorks.length} 个可复用成稿</span></div><div class="asset-grid">${state.finalWorks.map(renderFinalWorkAsset).join("")}</div>`
    : `<article class="empty-state"><b>还没有保存过成稿作品</b><span>从今日工作台完成第 10 步出图后，在第 12 步保存，这里会出现可复盘、可继续转平台的作品卡。</span></article>`;
  const topicCards = topics.map((item) => `<article class="asset-item"><b>${escapeHtml(item.theme)}</b><span>${escapeHtml(item.reason)}</span><p><strong>适合复用：</strong>小红书图文、公众号长文、朋友圈、短视频脚本</p>${item.url ? `<a class="source-link" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">打开来源</a>` : ""}</article>`).join("") || `<article class="empty-state"><b>暂无源素材</b><span>先读取历史资产、采集 X 账号，或导入素材。</span></article>`;
  target.innerHTML = `
    <section class="asset-lane">
      <div class="asset-summary asset-command">
        <b>母题资产库不是收藏夹</b>
        <span>它把采集来的真实素材变成可复利复写的母题，再沉淀小红书、公众号、朋友圈、短视频脚本、图文资产和发布复盘。</span>
      </div>
      <div class="asset-kpi-grid">
        <article><b>${sampleCount}</b><span>源素材样本</span></article>
        <article><b>${topics.length}</b><span>可用母题候选</span></article>
        <article><b>${state.finalWorks.length}</b><span>已完成平台版本</span></article>
        <article><b>7天</b><span>发布后复盘节奏</span></article>
      </div>
      <div class="asset-grid">
        <article class="asset-item"><b>采集基座</b><span>MediaCrawlerPro / XCrawl / RSS / 手动导入负责拿真实素材，不用假数据填页面。</span></article>
        <article class="asset-item"><b>内容拆解基座</b><span>DBS、标题库、结构库把素材拆成用户痛点、标题公式、结构和复用角度。</span></article>
        <article class="asset-item"><b>视觉生产基座</b><span>小黑、归藏、宝玉、Open Design 负责把确认文案做成小红书图文、公众号配图或演示稿。</span></article>
        <article class="asset-item"><b>复盘训练基座</b><span>发布后补阅读、点赞、收藏、评论，判断母题是正例、反例，还是值得二次改写。</span></article>
      </div>
      ${finalWorksHtml}
    </section>
    <section class="asset-lane">
      <div class="title-group-head"><b>源素材 / 母题候选</b><span>用于继续找选题和一鱼多吃。先选母题，再按平台重新写。</span></div>
      <div class="asset-grid">${topicCards}</div>
    </section>`;
}
function renderFinalWorkAsset(item) {
  const images = Array.isArray(item.images) ? item.images : [];
  const metrics = item.publishMetrics || {};
  const views = Number(metrics.views || 0);
  const likes = Number(metrics.likes || 0);
  const saves = Number(metrics.saves || 0);
  const comments = Number(metrics.comments || 0);
  const shares = Number(metrics.shares || 0);
  const saveRate = views ? `${((saves / views) * 100).toFixed(1)}%` : "待补";
  const engageRate = views ? `${(((likes + saves + comments + shares) / views) * 100).toFixed(1)}%` : "待补";
  const isEditing = state.editingMetricsWorkId === item.id;
  const platformId = item.platformId || inferPlatformIdFromTitle(item.platform);
  const availableTargets = publishTargets.filter((target) => target.id !== "topic-only" && target.id !== platformId);
  return `<article class="asset-item final-work-asset">
    <b>${escapeHtml(item.title)}</b>
    <span>${escapeHtml(item.platform)} 版本 · ${escapeHtml(images.length || 0)} 张可用图 · ${new Date(item.createdAt).toLocaleString()}</span>
    <p><strong>复用母题：</strong>${escapeHtml(item.topic || "未记录")}</p>
    <p><strong>拆解资产：</strong>${escapeHtml(item.extractedAssets?.structure || "")}</p>
    <div class="asset-usage-panel">
      <b>下一步怎么用</b>
      <ol>
        <li><strong>继续生产：</strong>点下面的平台按钮，把同一个母题改成另一个平台版本。</li>
        <li><strong>发布复盘：</strong>发出去后补阅读、点赞、收藏、评论，判断这个母题值不值得继续做。</li>
        <li><strong>沉淀资产：</strong>把标题、开头、结构和配图策略继续拆进标题库/结构库/图文风格库。</li>
        <li><strong>训练语料：</strong>表现好的归为正例，表现差的归为反例，后续进入平台指纹库。</li>
      </ol>
    </div>
    <div class="metric-row">
      <span>成稿作品</span><span>复用母题</span><span>待补发布数据</span>
    </div>
    <div class="asset-review-panel">
      <b>发布复盘数据</b>
      <em>数据来源：第一版由运营发布后，从小红书/公众号/视频号后台手动填写；后续接发布回流后自动更新。</em>
      <div class="asset-review-grid">
        <span>阅读/播放 <strong>${views || "待补"}</strong></span>
        <span>点赞 <strong>${likes || "待补"}</strong></span>
        <span>收藏 <strong>${saves || "待补"}</strong></span>
        <span>评论 <strong>${comments || "待补"}</strong></span>
        <span>转发 <strong>${shares || "待补"}</strong></span>
        <span>收藏率 <strong>${saveRate}</strong></span>
        <span>互动率 <strong>${engageRate}</strong></span>
      </div>
      ${isEditing ? renderPublishMetricsForm(item) : `<p>${escapeHtml(buildReviewConclusion(item))}</p>`}
    </div>
    <div class="xhs-generated-grid asset-image-grid">
      ${images.slice(0, 5).map((url, index) => `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer" title="打开 P${index + 1} 原图">
        <img src="${escapeHtml(url)}" alt="成稿图 P${index + 1}" loading="lazy" />
        <span>P${index + 1}</span>
      </a>`).join("")}
    </div>
    <div class="asset-reuse-panel">
      <b>选择下一个平台版本</b>
      <span>当前已有 ${escapeHtml(item.platform)} 版本。下面会保留母题，但按目标平台重新写标题、结构、正文和图片策略。</span>
      <div class="asset-action-row">
        ${availableTargets.map((target) => `<button class="secondary" type="button" data-reuse-work="${escapeHtml(item.id)}" data-reuse-target="${escapeHtml(target.id)}">改成${escapeHtml(target.title)}</button>`).join("")}
      </div>
    </div>
    <div class="asset-action-row">
      <button class="secondary" type="button" data-edit-metrics="${escapeHtml(item.id)}">${isEditing ? "收起数据表" : "补发布数据"}</button>
      <button class="secondary" type="button" data-deconstruct-work="${escapeHtml(item.id)}">拆成标题/结构资产</button>
    </div>
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

function renderPublishMetricsForm(item) {
  const metrics = item.publishMetrics || {};
  return `<div class="publish-metrics-form" data-metrics-form="${escapeHtml(item.id)}">
    <label>阅读/播放<input type="number" min="0" data-metric-field="views" value="${escapeHtml(metrics.views || "")}"></label>
    <label>点赞<input type="number" min="0" data-metric-field="likes" value="${escapeHtml(metrics.likes || "")}"></label>
    <label>收藏<input type="number" min="0" data-metric-field="saves" value="${escapeHtml(metrics.saves || "")}"></label>
    <label>评论<input type="number" min="0" data-metric-field="comments" value="${escapeHtml(metrics.comments || "")}"></label>
    <label>转发<input type="number" min="0" data-metric-field="shares" value="${escapeHtml(metrics.shares || "")}"></label>
    <label>复盘结论<input type="text" data-metric-field="note" value="${escapeHtml(metrics.note || "")}" placeholder="比如：收藏高，适合继续做清单型"></label>
    <button class="primary" type="button" data-save-metrics="${escapeHtml(item.id)}">保存复盘数据</button>
  </div>`;
}

function buildReviewConclusion(item) {
  const metrics = item.publishMetrics || {};
  const views = Number(metrics.views || 0);
  if (!views) return "还没补数据。发布后从平台后台把阅读、点赞、收藏、评论填进来，系统才能判断这个母题是正例、反例，还是值得二次改写。";
  const saves = Number(metrics.saves || 0);
  const comments = Number(metrics.comments || 0);
  const saveRate = saves / Math.max(views, 1);
  if (metrics.note) return metrics.note;
  if (saveRate >= 0.03) return "收藏率不错：这类母题适合继续拆成清单、教程或长文。";
  if (comments >= 10) return "评论信号不错：优先回收评论里的用户问题，补进客户问题库。";
  return "数据一般：保留为反例，后续对比标题、开头和图片首屏问题。";
}

function toggleMetricsEditor(id) {
  state.editingMetricsWorkId = state.editingMetricsWorkId === id ? "" : id;
  renderAssetPage("assets");
}

function savePublishMetrics(id) {
  const form = byId("assetBoard")?.querySelector(`[data-metrics-form="${CSS.escape(id)}"]`);
  if (!form) return;
  const metrics = {};
  form.querySelectorAll("[data-metric-field]").forEach((input) => {
    const key = input.dataset.metricField;
    metrics[key] = input.type === "number" ? Number(input.value || 0) : input.value.trim();
  });
  state.finalWorks = state.finalWorks.map((item) => item.id === id ? {
    ...item,
    publishMetrics: metrics,
    reviewedAt: new Date().toISOString(),
  } : item);
  state.editingMetricsWorkId = "";
  persistWorkbenchSnapshot();
  renderAssetPage("assets");
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
  state.titleChoices = buildTitleChoices(reuseTopic, []);
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
  state.archiveMessage = `已把「${work.title}」作为母题切到 ${currentTarget().title}。请先选新标题，再按该平台重写正文和配图策略。`;
  setRoute("today");
  setStep(6);
}

function deconstructFinalWork(id) {
  const work = state.finalWorks.find((item) => item.id === id);
  if (!work) return;
  state.archiveMessage = `已拆解：标题「${work.extractedAssets?.title || work.title}」、结构「${work.extractedAssets?.structure || "未记录"}」、图文风格「${work.extractedAssets?.visualStyle || "未记录"}」。后续会正式写入标题库/结构库。`;
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
    contentSamples: [
      {
        id: "demo-x-1",
        title: "普通人做 AI 自媒体，真正卡住的不是工具，而是不知道每天发什么",
        content: "很多 AI 工具把功能做得很多，但普通用户更需要一个每天能执行的内容流程。",
        platform: "x",
        sourceTool: "demo",
        keyword: "AI自媒体 内容资产库 Agent工作流",
        metrics: { likes: 328, saves: 91, comments: 28 },
        collectionStatus: "demo",
      },
    ],
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
  const editMetrics = event.target.closest("[data-edit-metrics]");
  if (editMetrics) {
    toggleMetricsEditor(editMetrics.dataset.editMetrics);
    return;
  }
  const saveMetrics = event.target.closest("[data-save-metrics]");
  if (saveMetrics) {
    savePublishMetrics(saveMetrics.dataset.saveMetrics);
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

restoreWorkbenchSnapshot();
renderToday();
