// state-manager.js — 全局状态对象 + 快照持久化
// 依赖: 无 (必须第一个加载)

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
  hot30Workspace: "",
  signalKeywords: "",
  signalSearchQuery: "",
  signalKw: "",
  signalUrl: "",
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
  videoClipStatus: "idle",
  videoClipMessage: "",
  videoClipMode: "frames",
  videoClipJobId: "",
  videoClipProgress: null,
  videoClipManifest: null,
  optimizeDiff: null,
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
    usedTopics: state.usedTopics || {},
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
    visualStyleByLine: state.visualStyleByLine || {},
    xhsCardPlan: capList(state.xhsCardPlan, 8),
    xhsCardExportStatus: state.xhsCardExportStatus === "loading" ? "idle" : state.xhsCardExportStatus,
    xhsCardExportMessage: state.xhsCardExportStatus === "loading" ? "Previous image task restored. Continue or check results." : state.xhsCardExportMessage,
    xhsCardOperation: state.xhsCardOperation,
    xhsCardJobBase: state.xhsCardJobBase,
    xhsCardAsyncJobId: state.xhsCardAsyncJobId,
    xhsCardManifest: slimVisualManifest(state.xhsCardManifest),
    videoClipStatus: state.videoClipStatus === "loading" ? "idle" : state.videoClipStatus,
    videoClipMessage: state.videoClipStatus === "loading" ? "Previous video task restored. Continue or check results." : state.videoClipMessage,
    videoClipMode: state.videoClipMode,
    videoClipJobId: state.videoClipJobId,
    videoClipManifest: state.videoClipManifest,
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
      videoClipStatus: state.videoClipStatus === "loading" ? "idle" : state.videoClipStatus,
      videoClipMessage: state.videoClipStatus === "loading" ? "已恢复上次视频任务，可继续生成或查询结果。" : state.videoClipMessage,
      videoClipMode: state.videoClipMode,
      videoClipJobId: state.videoClipJobId,
      videoClipManifest: state.videoClipManifest,
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

