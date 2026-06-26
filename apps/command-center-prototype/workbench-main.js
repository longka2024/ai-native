// workbench-main.js — 路由控制、步骤渲染、事件绑定、初始化
// 依赖: 所有其他模块（最后加载）

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
  const target = Math.max(1, Math.min(12, step));
  if (!canJumpTo(target)) {
    showStepBlockToast(target);
    return;
  }
  state.step = target;
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
    // 选题/标题变了 → 重置知识匹配,步7再重新按新选题拉
    state.knowledgeCards = [];
    state.selectedKnowledgeIds = [];
    state.knowledgeLoaded = false;
    state.knowledgeLoading = false;
  }
  if (step <= 9) {
    clearProductionState();
  }
}

function clearProductionState() {
  state.visualStyle = state.visualStyle || "xiaohei-metaphor";
  state.visualPlay = state.visualPlay || "cover";
  state.visualStyleTouched = false;
  state.xhsCardPlan = [];
  state.xhsCardExportStatus = "idle";
  state.xhsCardExportMessage = "";
  state.xhsCardOperation = "";
  state.xhsCardAsyncJobId = "";
  state.xhsCardJobBase = "";
  state.xhsCardProgress = null;
  state.xhsCardManifest = null;
  // 发布前判断 / 封面 / 视频片段都是“这一篇”的结果，换母题/换文案时必须清掉，
  // 否则会把上一篇的判断结论和封面图带进新图文（曾出现的串档 bug）。
  state.precheckStatus = "idle";
  state.precheckResult = null;
  state.precheckMessage = "";
  state.complianceStatus = "idle";
  state.complianceResult = null;
  state.complianceRewrite = null;
  state.complianceMessage = "";
  state.coverStatus = "idle";
  state.coverImage = "";
  state.magazineCover = ""; state.magazineStatus = "idle"; state.magazineMessage = "";
  state.coverMessage = "";
  state.coverJobId = "";
  state.coverHooks = [];
  state.videoClipStatus = "idle";
  state.videoClipMessage = "";
  state.videoClipMode = "frames";
  state.videoClipJobId = "";
  state.videoClipProgress = null;
  state.videoClipPhase = "";
  state.videoClipManifest = null;
  state.oralVideoStatus = "idle";
  state.oralVideoMessage = "";
  state.oralVideoUrl = "";
  state.videoFormat = ""; // 智能选片选中的形态(空=进视频步时按文案自动推荐)
  state.finalFilmStatus = "idle";
  state.finalFilmMessage = "";
  state.finalFilmUrl = "";
  state.comicStatus = "idle";
  state.comicMessage = "";
  state.comicUrl = "";
  // 注意：videoTier / ttsVoice 是用户偏好，跨主题保留，不在这里重置
  state.optimizeDiff = null;
  state.referenceImages = [];
  state.selectedReferenceImage = "";
}

function changeVisualStyle(styleId) {
  if (!visualStyles.some((item) => item.id === styleId)) return;
  // 记住这个账号(业务线)手动选的风格，作为以后默认，保持品牌一致。
  const lineKey = state.businessLine || state.workspace || "";
  if (lineKey) state.visualStyleByLine = { ...(state.visualStyleByLine || {}), [lineKey]: styleId };
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
  if (state.step === 4) {
    setTimeout(() => loadSignalPanel(state.signalKeywords), 100);
  }
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
  try { bindWorkAreaActions(); }
  catch (e) { console.error("bindWorkAreaActions error:", e); }
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

function renderCorpusSearchPanel() {
  const q = escapeHtml(state.corpusQuery || "");
  const results = Array.isArray(state.corpusResults) ? state.corpusResults : [];
  return `<div class="corpus-search" style="border:1px solid #e6ddd0;border-radius:12px;padding:16px;background:#faf6ef;margin-bottom:14px;">
    <div style="font-size:16px;font-weight:700;color:#3a2c1c;">🔍 搜索素材库</div>
    <div style="color:#7a6a55;font-size:13px;margin:4px 0 10px;">输入关键词搜<b>全部已采集素材</b>，回车或点搜索 → 直接进入<b>双列选题候选</b>,挑一个改写(和小红书选题一样)。</div>
    <div style="display:flex;gap:8px;">
      <input id="corpusQ" value="${q}" placeholder="输入关键词,如:女性成长 / 讨好型人格 / 配得感" style="flex:1;padding:10px 12px;border:1px solid #d8cdba;border-radius:8px;" />
      <button class="primary" data-corpus-search>搜索 → 生成选题</button>
    </div>
    ${state.assetStatus === "正在搜索素材库" ? `<div class="muted-text" style="margin-top:8px;">正在搜索「${q}」…</div>` : ""}
  </div>`;
}

async function doCorpusSearch() {
  const q = (byId("corpusQ")?.value || "").trim();
  state.corpusQuery = q;
  if (!q) return;
  state.assetStatus = "正在搜索素材库";
  state.logs = [`正在搜索素材库：${q}`];
  renderToday();
  try {
    const res = await fetch(apiPath(`/api/content-assets/unified?keywords=${encodeURIComponent(q)}&limit=40`));
    const d = await res.json().catch(() => ({}));
    const assets = Array.isArray(d.assets) ? d.assets : [];
    // 质量过滤:去 PDF乱码 / 登录页 / 导航垃圾 / 广告 / 太短，只留能当选题的真素材
    const isJunk = (a) => {
      const title = String(a.title || "");
      const body = String(a.body || a.content || "");
      const t = `${title} ${body}`;
      if (/%PDF|FlateDecode|endobj|�/.test(t)) return true;                 // PDF/乱码
      if (/登录\s*\/?\s*注册|下载.{0,4}客户端|APP\s*下载|扫码下载|立即下载/.test(t)) return true; // 登录/下载墙
      if (/^\s*\(?无标题/.test(title) && body.replace(/\s/g, "").length < 400) return true;
      if (body.replace(/\s/g, "").length < 200) return true;                      // 正文太短
      const adHits = (t.match(/就选|官网|加微信|咨询热线|扫码购买|限时优惠/g) || []).length;
      if (adHits >= 2) return true;                                               // 明显广告
      return false;
    };
    const clean = assets.filter((a) => !isJunk(a))
      .sort((a, b) => String(b.body || "").length - String(a.body || "").length) // 正文充实优先
      .slice(0, 12);
    if (!clean.length) {
      state.assetStatus = "没搜到合格素材";
      state.logs = [`「${q}」搜到 ${assets.length} 条，但都没通过质量过滤(乱码/登录页/太短)。换个关键词,或先把这条赛道的库做厚。`];
      renderToday();
      return;
    }
    // 干净素材注入 → 走原有 signal-search 流程 → 直接出双列选题候选(同小红书选题)
    state.injectedSamples = clean.map((a) => ({
      title: a.title || "", body: a.body || a.content || "",
      sourceUrl: a.sourceUrl || a.url || a.source_url || "", platform: a.platform || "web",
    }));
    state.signalKeywords = q;
    state.signalUrl = "";
    state.sourceChannel = "signal-search";
    await readMaterials();
  } catch (e) {
    state.assetStatus = "搜索失败";
    state.logs = [`搜索失败：${e.message}`];
    renderToday();
  }
}

function renderSourceStep() {
  const defaultSource = state.sourceChannel === "same-platform" ? sourceTitleForTarget() : currentSource().title;
  return `<section class="work-card">
    ${cardHead("今天从哪里找素材？", "同平台素材用于学习平台表达；跨平台素材用于提炼观点和方法论，再按目标平台重写。")}
    ${renderCorpusSearchPanel()}
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
    ${renderSignalSection()}
    ${state.sourceChannel === "x-live" ? renderXCollectControls() : ""}
    ${state.sourceChannel === "hot30" ? renderHot30Controls() : ""}
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

function renderSignalSection() {
  return `<div class="signal-section">
    <div class="signal-section-head">
      <div class="signal-section-icon">&#9763;</div>
      <div>
        <div class="signal-section-title">热点信号</div>
        <div class="signal-section-desc">输入你的业务关键词，发现当下热门话题，选中一条直接生成选题</div>
      </div>
    </div>
    <div class="signal-search">
      <input id="signalKeywordsInput" class="signal-search-input" value="${escapeHtml(state.signalKeywords)}" placeholder="输入关键词，多个用逗号隔开" />
      <button class="primary" data-apply-signal-keywords>匹配</button>
    </div>
    ${state.signalKeywords ? `<div class="signal-active-bar">当前关键词：<strong>${escapeHtml(state.signalKeywords)}</strong></div>` : ""}
    <div id="signalPanel" class="signal-panel-body">
      <div class="signal-empty">
        <span class="signal-empty-icon">&#9889;</span>
        <div>
          <p>输入关键词，发现当下热门话题</p>
          <p class="muted-text">输入你的业务关键词，系统从 11 个平台热榜中找到匹配话题。</p>
        </div>
      </div>
    </div>
  </div>`;
}

function renderHot30Controls() {
  return `<div class="filter-panel">
    <div class="title-group-head"><b>30天热点筛选</b><span>按样本库近 30 天互动热度排序，可按工作台过滤。</span></div>
    <div class="form-grid compact">
      <label>工作台（可留空看全部）<input id="hot30WorkspaceInput" value="${escapeHtml(state.hot30Workspace || "")}" placeholder="美容 / 私校 / 女性成长 / AI与自媒体" /></label>
    </div>
    <p class="muted-text">热度分 = 互动量（赞/评/藏/转加权）× 时效衰减（10 天半衰期）。留空工作台则全库排序。</p>
  </div>`;
}

// ===== 江湖工具箱导出 → 解析 → 按行业入库语料库 =====
function jianghuKeyword(rec) {
  const sk = String(rec.SearchKeyword || "").trim();
  if (sk) return sk;
  const ge = String(rec.GetExtractType || "").trim(); // 形如 "关键词：AI native"
  const m = ge.match(/关键词\s*[：:]\s*(.+)$/);
  return m ? m[1].trim() : "";
}
function mapJianghuRecord(rec, industry, platform) {
  const num = (v) => Number(v) || 0;
  const likes = num(rec.RealLikeCount);
  return {
    sourceId: String(rec.ArtworkId || "").trim(),
    sourceUrl: String(rec.ArtworkUrl || "").trim(),
    platform,
    sourceType: "local_browser_batch",
    collectorType: "jianghu_toolbox",
    authorName: String(rec.AuthorName || "").trim(),
    authorId: String(rec.AuthorSecUid || rec.AuthorUid || "").trim(),
    title: String(rec.Title || "").trim(),
    body: String(rec.Desc || "").trim(),
    language: "zh",
    keyword: jianghuKeyword(rec),
    workspace: industry,
    labelType: likes >= 1000 ? "hot" : "normal",
    metrics: {
      likes,
      collects: num(rec.CollectCount),
      comments: num(rec.CommentCount),
      shares: num(rec.ShareCount),
      plays: num(rec.PlayCount),
      followers: num(rec.AuthorFollowerCount),
    },
    publishedAt: rec.PublishTime || null,
    rawJson: rec,
  };
}
async function importJianghuFile() {
  const statusEl = byId("jianghuImportStatus");
  const setStatus = (msg, cls = "") => { if (statusEl) statusEl.innerHTML = `<div class="status-strip ${cls}">${escapeHtml(msg)}</div>`; };
  const industry = String(byId("jianghuIndustry")?.value || "").trim();
  const platform = String(byId("jianghuPlatform")?.value || "xiaohongshu").trim();
  const file = byId("jianghuFile")?.files?.[0];
  if (!industry) { setStatus("请先填写这批素材属于哪个行业（如：女性成长 / 私校 / 美容 / AI自媒体），否则没法按行业入库。", "warn"); return; }
  if (!file) { setStatus("请选择江湖工具箱导出的 .txt / .json 文件。", "warn"); return; }
  setStatus("正在读取并解析文件…");
  let records;
  try {
    const text = await file.text();
    records = JSON.parse(text.replace(/^﻿/, ""));
    if (!Array.isArray(records)) throw new Error("内容不是预期的列表格式");
  } catch (e) {
    setStatus(`解析失败：${e.message}。请确认是江湖工具箱「作品列表勾选数据」导出的原文件。`, "warn");
    return;
  }
  const samples = records.map((r) => mapJianghuRecord(r, industry, platform)).filter((s) => s.sourceId && (s.title || s.body));
  if (!samples.length) { setStatus("文件里没有可入库的有效记录（缺笔记 ID 或正文）。", "warn"); return; }
  setStatus(`已解析 ${samples.length} 条，正在按「${industry}」行业入库到素材库…`);
  try {
    const res = await fetch(apiPath("/api/collectors/local-platform/import-batch"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        platform,
        collectorType: "jianghu_toolbox",
        sourceType: "local_browser_batch",
        workspace: industry,
        keyword: samples.find((s) => s.keyword)?.keyword || industry,
        batchName: file.name,
        labelType: "radar_seed",
        samples,
      }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.ok) throw new Error(j.message || j.error || `HTTP ${res.status}`);
    const n = j.totalSampleCount || samples.length;
    setStatus(`✅ 入库成功：${n} 条「${industry}」爆款素材已进语料库（来源可追溯、带互动数据）。现在选这条线就能用它们出选题、二次原创了。`, "success");
    const f = byId("jianghuFile"); if (f) f.value = "";
  } catch (e) {
    setStatus(`入库失败：${e.message}`, "warn");
  }
}

function loadSignalPanel(keywords) {
  const panel = document.getElementById("signalPanel");
  if (!panel) return;
  keywords = (keywords || "").trim();
  if (!keywords) {
    panel.innerHTML = `<div class="signal-empty">
      <span class="signal-empty-icon">&#9889;</span>
      <div>
        <p>输入关键词，发现当下热门话题</p>
        <p class="muted-text">输入你的业务关键词，系统从 11 个平台热榜 + AI 资讯中找到匹配话题。</p>
      </div>
    </div>`;
    return;
  }
  panel.innerHTML = `<div class="signal-loading"><span class="signal-spinner"></span><span>正在匹配热点信号...</span></div>`;
  const trUrl = apiPath(`/api/signals/trendradar-hits?keywords=${encodeURIComponent(keywords)}`);
  const aihotUrl = apiPath(`/api/signals/aihot-items?keywords=${encodeURIComponent(keywords)}`);
  // allSettled：两个源各自独立，一个抖动失败不拖垮另一个，也不把整个面板打白
  Promise.allSettled([
    fetch(trUrl).then((r) => r.json()),
    fetch(aihotUrl).then((r) => r.json()),
  ])
    .then((results) => {
      const trData = results[0].status === "fulfilled" ? results[0].value : { ok: false };
      const aihotData = results[1].status === "fulfilled" ? results[1].value : { ok: false };
      const trFailed = results[0].status === "rejected" || trData.ok === false;
      const aihotFailed = results[1].status === "rejected" || aihotData.ok === false;
      const hasTr = trData.ok && trData.hits?.length;
      const hasAihot = aihotData.ok && aihotData.hits?.length;
      if (!hasTr && !hasAihot) {
        const bothErrored = (results[0].status === "rejected" || trData.ok === false) && (results[1].status === "rejected" || aihotData.ok === false);
        panel.innerHTML = `<div class="signal-empty">
          <span class="signal-empty-icon">${bothErrored ? "&#9888;" : "&#128269;"}</span>
          <div>
            <p>${bothErrored ? "热点信号这次没加载出来" : "暂无匹配热点"}</p>
            <p class="muted-text">${bothErrored
              ? "可能是网络抖了一下，点重试一般就好（服务端是正常的）。"
              : `关键词「<b>${escapeHtml(keywords)}</b>」在热榜和 AI 资讯中均无命中。建议换个更宽的关键词试试。`}</p>
            <button class="secondary" type="button" data-retry-signal>重试</button>
          </div>
        </div>`;
        panel.querySelector("[data-retry-signal]")?.addEventListener("click", () => loadSignalPanel(keywords));
        return;
      }
      // TrendRadar 热榜部分
      let trHtml = "";
      if (hasTr) {
        const byWs = trData.byWorkspace || {};
        const wsList = Object.keys(byWs);
        if (wsList.length) {
          trHtml = wsList.map((ws) => {
            const hits = byWs[ws];
            if (!hits?.length) return "";
            return `<div class="signal-ws-group">
              <div class="signal-ws-label">${escapeHtml(ws)} <span class="signal-count">${hits.length}</span></div>
              <div class="signal-cards">${hits.slice(0, 12).map((h) => signalCardHtml(h)).join("")}
                ${hits.length > 12 ? `<div class="signal-more">+${hits.length - 12} 条</div>` : ""}
              </div>
            </div>`;
          }).join("");
        } else {
          trHtml = `<div class="signal-cards">${trData.hits.slice(0, 20).map((h) => signalCardHtml(h)).join("")}</div>`;
        }
      }
      // AI HOT 资讯部分
      let aihotHtml = "";
      if (hasAihot) {
        // 按 category 分组
        const catMap = {};
        aihotData.hits.forEach((h) => {
          const cat = h.category || "其他";
          if (!catMap[cat]) catMap[cat] = [];
          catMap[cat].push(h);
        });
        const catKeys = Object.keys(catMap);
        aihotHtml = catKeys.map((cat) => {
          const hits = catMap[cat];
          return `<div class="signal-ws-group">
            <div class="signal-ws-label">AI · ${escapeHtml(catLabel(cat))} <span class="signal-count">${hits.length}</span></div>
            <div class="signal-cards">${hits.slice(0, 12).map((h) => signalCardHtml(h)).join("")}
              ${hits.length > 12 ? `<div class="signal-more">+${hits.length - 12} 条</div>` : ""}
            </div>
          </div>`;
        }).join("");
      }
      // 合并渲染
      const totalCount = (trData.hits?.length || 0) + (aihotData.hits?.length || 0);
      const sections = [];
      if (trHtml) sections.push(`<div class="signal-source-block"><div class="signal-source-title">&#127919; 热榜话题</div>${trHtml}</div>`);
      if (aihotHtml) sections.push(`<div class="signal-source-block"><div class="signal-source-title">&#9889; AI 资讯</div>${aihotHtml}</div>`);
      const partialNote = (trFailed && hasAihot) ? "热榜这次没加载出来，先看 AI 资讯；"
        : (aihotFailed && hasTr) ? "AI 资讯这次没加载出来，先看热榜话题；" : "";
      panel.innerHTML = `<div class="signal-result">
        <div class="signal-result-head">
          <span>匹配到 <strong>${totalCount}</strong> 条热点 — 点击"生成选题"自动获取原文</span>
          ${partialNote ? `<button class="secondary" type="button" data-retry-signal style="margin-left:8px;">重试加载全部</button>` : ""}
        </div>
        ${partialNote ? `<div class="status-strip warn" style="margin:6px 0;">${partialNote}点【重试加载全部】再试一次。</div>` : ""}
        ${sections.join("")}
        <div class="signal-footer">数据来源：TrendRadar 11平台热榜 · AI HOT 资讯精选 · ${escapeHtml(trData.dbDate || "")}</div>
      </div>`;
      panel.querySelector("[data-retry-signal]")?.addEventListener("click", () => loadSignalPanel(keywords));
    })
    .catch((err) => {
      panel.innerHTML = `<div class="signal-empty">
        <span class="signal-empty-icon">&#9888;</span>
        <div>
          <p>热点信号这次没加载出来</p>
          <p class="muted-text">${escapeHtml(err.message || "网络抖了一下")} · 点重试一般就好。</p>
          <button class="secondary" type="button" data-retry-signal>重试</button>
        </div>
      </div>`;
      panel.querySelector("[data-retry-signal]")?.addEventListener("click", () => loadSignalPanel(keywords));
    });
}

// AI HOT category slug → 中文标签
function catLabel(slug) {
  const map = { "ai-models": "模型发布/更新", "ai-products": "产品发布/更新", "industry": "行业动态", "paper": "论文研究", "tip": "技巧与观点" };
  return map[slug] || slug;
}

function signalCardHtml(hit) {
  const kws = hit.matchedKeywords || [];
  const firstKw = kws.length > 0 ? kws[0] : "";
  const kwTags = kws.slice(0, 2).map((kw) => `<span class="sc-tag">${escapeHtml(kw)}</span>`).join("");
  const platform = (hit.platform || "").toLowerCase();
  const platClass = (hit.platform || "").replace(/[^a-zA-Z0-9]/g, "-").toLowerCase() || "default";
  const count = hit.totalHits || 1;
  const rankBadge = hit.rank ? `<span class="sc-rank">#${hit.rank}</span>` : "";
  const multiBadge = count > 1 ? `<span class="sc-multi">${count} 平台</span>` : "";
  return `<div class="sc-card">
    <div class="sc-top">
      <span class="sc-platform ${platClass}">${escapeHtml(hit.platform || "未知")}</span>
      ${rankBadge}${multiBadge}
      <span class="sc-kws">${kwTags}</span>
    </div>
    <div class="sc-title">${escapeHtml(hit.title)}</div>
    <div class="sc-actions">
      ${hit.url ? `<a class="sc-link" href="${escapeHtml(hit.url)}" target="_blank" rel="noopener">查看原文 ↗</a>` : `<span></span>`}
      <button class="sc-btn" data-use-signal="${escapeHtml(hit.title)}" data-signal-kw="${escapeHtml(firstKw)}" data-signal-platform="${escapeHtml(hit.platform || "")}" data-signal-rank="${hit.rank || ""}" data-signal-url="${escapeHtml(hit.url || "")}" data-signal-summary="${escapeHtml(String(hit.summary || hit.desc || "").slice(0, 600))}">生成选题</button>
    </div>
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
    ${renderTopicGrid()}
    <div class="actions">
      <button class="ghost" data-step-target="4">返回重新找素材</button>
      <button class="primary" data-step-target="6" ${state.selectedTopicId ? "" : "disabled"}>下一步：生成标题</button>
    </div>
  </section>`;
}

function renderTopicGrid() {
  if (!state.topics.length) {
    return `<div class="empty-state"><b>当前来源没有匹配选题</b><span>请换关键词、切换素材来源，或先采集/导入对应平台素材。</span></div>`;
  }
  const fresh = state.topics.filter((topic) => !isTopicUsed(topic));
  const used = state.topics.filter((topic) => isTopicUsed(topic));
  let html = fresh.length
    ? `<div class="topic-grid">${fresh.map((topic) => renderTopicCard(topic, false)).join("")}</div>`
    : `<div class="empty-state"><b>这批新选题你都写过了</b><span>下面是写过的话题，可以换个角度再写一篇。</span></div>`;
  if (used.length) {
    html += `<div class="used-topics-block"><div class="status-row"><b>已写过</b><span>${used.length} 条（已从新选题里隐藏，避免重复选题）</span></div><div class="topic-grid">${used.map((topic) => renderTopicCard(topic, true)).join("")}</div></div>`;
  }
  return html;
}

function renderTopicCard(topic, isUsed = false) {
  return `<article class="topic-card ${state.selectedTopicId === topic.id ? "active" : ""} ${isUsed ? "used" : ""}">
    <div class="meta"><span>来源：${escapeHtml(topic.platform)}</span><span>${escapeHtml(topic.collectionStatus)}</span><span>目标：${escapeHtml(currentTarget().title)}</span>${isUsed ? `<span class="used-badge">✓ 已用过</span>` : ""}</div>
    <b>${escapeHtml(topic.theme)}</b>
    <p>${escapeHtml(topic.reason)}</p>
    <p><strong>源头标题：</strong>${escapeHtml(topic.title)}</p>
    <p><strong>用户痛点：</strong>${escapeHtml(topic.pain)}</p>
    <p><strong>适合怎么写：</strong>${escapeHtml(topic.reuse)}</p>
    <p><strong>风险：</strong>${escapeHtml(topic.risk)}</p>
    <div class="metric-row">${Object.entries(topic.metrics || {}).map(([key, value]) => `<span>${escapeHtml(key)} ${escapeHtml(value)}</span>`).join("")}</div>
    ${topic.url ? `<a class="source-link" href="${escapeHtml(topic.url)}" target="_blank" rel="noreferrer">打开原始素材</a>` : `<span class="muted-text">暂无原链接</span>`}
    <button class="primary" data-topic-id="${escapeHtml(topic.id)}">${isUsed ? "再写一篇" : "用这个选题继续"}</button>
  </article>`;
}

function renderTitleStep() {
  ensureFreshTitleChoices();
  // P1-1: 同时触发 LLM 标题生成（异步，完成后自动刷新）
  if (state.selectedTopicId) {
    requestAnimationFrame(() => {
      ensureTitleAssetsForCurrentTopic();
      refreshTitleChoicesWithLlm();
    });
  }
  const hasError = state.titleChoices.length === 1 && state.titleChoices[0]?.isError;
  const isLoading = !!state._llmTitleCallKey;
  const assetHint = isLoading
    ? "正在通过 AI 生成标题，请稍候（最长 20 秒）…"
    : hasError
      ? "标题生成失败，请点击下方“刷新标题”重试。"
      : (state.titleChoices.length ? "标题已生成，点击选择后继续。" : "正在通过 AI 生成标题，请稍候…");
  const titleGridHtml = hasError
    ? `<div class="empty-state warn"><b>标题生成超时或失败</b><span>${escapeHtml(state.titleChoices[0].reason)}</span></div>`
    : state.titleChoices.length
      ? state.titleChoices.map((item) => `<button class="title-card ${state.selectedTitle === item.title ? "active" : ""}" data-title-choice="${escapeHtml(item.title)}">
          <b>${escapeHtml(item.title)}</b><span>${escapeHtml(item.reason)}</span>
        </button>`).join("")
      : `<div class="empty-state"><b>正在生成标题…</b><span>AI 正在基于源帖内容生成候选标题，通常需要 3-5 秒。</span></div>`;
  return `<section class="work-card">
    ${cardHead(`生成 ${currentTarget().title} 标题`, "同一个选题，按不同平台调性生成不同标题。选择标题后，正文会跟着重写。")}
    ${String(state.selectedTopicId || "").startsWith("reuse-") ? `<div class="status-strip success">一鱼多吃任务：当前母题来自已完成作品。现在要按 ${escapeHtml(currentTarget().title)} 重新选标题和结构，不沿用原平台正文。</div>` : ""}
    <div class="status-strip">${escapeHtml(assetHint)}</div>
    <div class="title-grid">${titleGridHtml}</div>
    <div class="actions">
      <button class="ghost" data-step-target="5">返回换选题</button>
      <button class="secondary" data-refresh-titles ${isLoading ? "disabled" : ""}>刷新标题</button>
      <button class="primary" data-step-target="7" ${state.selectedTitle ? "" : "disabled"}>下一步：生成平台成品</button>
    </div>
  </section>`;
}

// 第7步「可用知识点」面板:匹配到的知识卡(默认全勾),小妹可取消不对题的 + 按勾选重生成
function renderKnowledgePanel() {
  if (!state.knowledgeLoaded || !Array.isArray(state.knowledgeCards) || !state.knowledgeCards.length) return "";
  const sel = new Set(state.selectedKnowledgeIds || []);
  const GC = { KG: "#e8743b", G4: "#c0392b", G6: "#8e44ad", G7: "#7f8c8d", G8: "#2980b9", G9: "#16a085", G11: "#2c3e50", "通用": "#95a5a6" };
  const cards = state.knowledgeCards.map((c) => {
    const on = sel.has(c.id);
    return `<label style="display:flex;gap:8px;align-items:flex-start;padding:7px 9px;border-radius:8px;cursor:pointer;background:${on ? "#fff" : "#f3f1ec"};border:1px solid ${on ? "#e0c98a" : "#e5e2dc"};margin:4px 0;">
      <input type="checkbox" data-kb-pick="${escapeHtml(c.id)}" ${on ? "checked" : ""} style="width:18px;height:18px;min-height:0;padding:0;margin:2px 0 0;flex:none;border-radius:4px;">
      <span style="display:inline-block;background:${GC[c.grade] || "#999"};color:#fff;font-size:11px;padding:1px 7px;border-radius:10px;flex:none;">${escapeHtml(c.grade || "")}</span>
      <span style="font-size:13px;line-height:1.5;color:#3a3a3a;">${escapeHtml(c.point || "")}</span>
    </label>`;
  }).join("");
  return `<div style="background:#faf8f3;border:1px solid #e8e2d6;border-radius:12px;padding:12px 14px;margin:10px 0;">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:6px;">
      <span style="font-size:14px;color:#6a5a45;">📚 可用知识点 <b>${sel.size}/${state.knowledgeCards.length}</b> 条已勾选 <span style="color:#a89a82;font-size:12px;">(默认全用,不对题的取消即可)</span></span>
      <span style="display:flex;gap:6px;">
        <button class="ghost" data-kb-all style="padding:3px 10px;font-size:12px;">全选</button>
        <button class="ghost" data-kb-none style="padding:3px 10px;font-size:12px;">清空</button>
        <button class="secondary" data-kb-regen style="padding:3px 10px;font-size:12px;">按勾选重新生成</button>
      </span>
    </div>
    <div style="max-height:240px;overflow:auto;">${cards}</div>
  </div>`;
}

function renderDraftStep() {
  // 先按选题拉「可用知识点」(私校等),再生成正文 → 首版即带匹配到的知识,小妹可取消后重生成
  if (state.selectedTitle && !state.knowledgeLoaded && !state.knowledgeLoading) {
    requestAnimationFrame(() => loadKnowledgeForTopic());
  }
  if (!state.draft && state.selectedTitle && state.draftStatus === "idle" && state.knowledgeLoaded) {
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
    ${renderKnowledgePanel()}
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
      <button class="secondary" data-step-target="10" ${state.copyConfirmed ? "" : "disabled"}>下一步：做图文/视频</button>
    </div>
  </section>`;
}

function renderProductionStepLegacyVisualRoutes() {
  const locked = !state.copyConfirmed;
  if (state.publishTarget !== "xhs") return renderNonXhsProductionStep(locked);
  ensureXhsCardPlan();
  const visual = currentVisualStyle();
  const primaryLabel = visual.id === "xiaohei-metaphor" ? "生成小黑漫画图" : "生成当前风格配图";
  const loadingLabel = "正在生成...";
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
  // 预览 + 成本都用"真正会生成的归并分镜"(buildVideoShots，默认5)，不要再按行拆成一堆
  const shots = (typeof buildVideoShots === "function") ? buildVideoShots() : [];
  const lines = shots.length
    ? shots.map((s) => s.scriptText)
    : String(copy || "").split(/\n+/).map((line) => line.trim()).filter(Boolean).slice(0, 5);
  const frameCount = (Array.isArray(currentVisualManifest()?.publicFiles) ? currentVisualManifest().publicFiles : []).filter((u) => /^https?:\/\//.test(String(u))).length;
  const isLoading = state.videoClipStatus === "loading";
  const mode = state.videoClipMode === "script" ? "script" : "frames";
  const locked = !state.copyConfirmed;
  const genLabel = isLoading ? "出片中…" : (mode === "script" ? "按脚本直接出片段" : "按脚本出关键帧 → 生成视频片段");
  return `<div class="article-layout-preview">
    <div style="border:1px solid #e6ddd0;border-radius:10px;padding:14px;background:#faf6ef;margin-bottom:12px;">
      <b style="font-size:15px;">🎬 先生成爆款视频脚本</b>
      <div style="color:#7a6a55;font-size:12px;margin:4px 0 8px;">把确认的文案重构成爆款分镜：黄金3秒钩子 + 口播 + 顶部大字 + 画面建议。生成后下面的分镜会自动用它。</div>
      <button class="primary" ${locked || state.videoScriptStatus === "loading" ? "disabled" : ""} data-gen-video-script>${state.videoScriptStatus === "loading" ? "重构中…" : (state.videoScript ? "重新生成脚本" : "生成爆款视频脚本")}</button>
      ${state.videoScriptMessage ? `<div class="status-strip ${state.videoScriptStatus === "error" ? "warn" : ""}" style="margin-top:8px;">${escapeHtml(state.videoScriptMessage)}</div>` : ""}
    </div>
    <div class="title-group-head"><b>视频脚本预览</b><span>这里检查钩子、口播、分镜和字幕节奏。下面把脚本切成分镜、按每一镜内容出关键帧，再做成视频。</span></div>
    <div class="asset-grid">
      ${lines.map((line, index) => `<article class="asset-item"><b>${index === 0 ? "标题 / 钩子（第 1 镜）" : `第 ${index + 1} 镜`}</b><span>${escapeHtml(line)}</span></article>`).join("")}
    </div>
    <div class="video-clip-panel" style="margin-top:14px;border:1px solid #e6ddd0;border-radius:10px;padding:14px;background:#fff;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
        <b style="font-size:15px;">生成视频片段</b>
        <div class="video-clip-mode" style="display:flex;gap:6px;">
          <button type="button" class="ghost ${mode === "frames" ? "active" : ""}" data-video-clip-mode="frames" ${isLoading ? "disabled" : ""}>关键帧出片（默认·更对版）</button>
          <button type="button" class="ghost ${mode === "script" ? "active" : ""}" data-video-clip-mode="script" ${isLoading ? "disabled" : ""}>纯文生出片</button>
        </div>
      </div>
      <div style="color:#7a6a55;font-size:12px;margin:6px 0 10px;">${mode === "frames"
        ? `把脚本切成分镜，<b>每一镜按它自己的内容出一张关键帧图</b>（贴脚本、套你选的配图风格，有真实参考图就用），再用关键帧做成视频——画面跟脚本对得上。`
        : "不出图，直接按每一镜脚本生成短视频片段（更自由，但画面可控性差、更花时间）。"}</div>
      ${renderVideoTierRow(lines, isLoading)}
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="primary" ${locked || isLoading ? "disabled" : ""} data-generate-video-clips>${escapeHtml(genLabel)}</button>
        <button class="secondary" ${isLoading ? "disabled" : ""} data-restore-video-clips>查询已生成片段</button>
      </div>
      ${state.videoClipMessage ? `<div class="status-strip ${state.videoClipStatus === "error" ? "warn" : ""}" style="margin-top:10px;">${escapeHtml(state.videoClipMessage)}</div>` : ""}
      ${renderVideoClipGallery()}
      ${renderOralVideoBlock(locked)}
    </div>
  </div>`;
}

// 合成口播片：配音 + 字幕 + 拼接成一条可直接发的竖屏成片
function renderOralVideoBlock(locked = false) {
  const loading = state.oralVideoStatus === "loading";
  const url = state.oralVideoUrl ? apiPath(state.oralVideoUrl) : "";
  return `<div class="oral-video-block" style="margin-top:14px;border-top:1px dashed #ece3d4;padding-top:12px;">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
      <b style="font-size:14px;">合成口播片（配音 + 字幕 + 拼接）</b>
      <button class="primary" ${locked || loading ? "disabled" : ""} data-generate-oral-video>${loading ? "合成中…" : "🎬 生成口播片"}</button>
    </div>
    <div style="color:#7a6a55;font-size:12px;margin-top:6px;">把上面出好的视频片段配上中文口播 + 字幕，拼成一条可直接发的竖屏口播片。没出片段也能合成（纯背景 + 配音 + 字幕，但建议先出片段画面更生动）。</div>
    ${state.oralVideoMessage ? `<div class="status-strip ${state.oralVideoStatus === "error" ? "warn" : ""}" style="margin-top:8px;">${escapeHtml(state.oralVideoMessage)}</div>` : ""}
    ${url ? `<div style="margin-top:10px;">
      <video src="${escapeHtml(url)}" controls preload="metadata" playsinline style="max-width:280px;border-radius:10px;display:block;"></video>
      <div style="margin-top:6px;"><a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">下载口播片</a></div>
    </div>` : ""}
  </div>`;
}

// 视频出片档位选择 + 实时成本（大白话，不暴露模型名/服务商）
function renderVideoTierRow(lines = [], isLoading = false) {
  const tierId = state.videoTier || "economy";
  const tier = videoTierById(tierId);
  const shotCount = Math.min(12, Math.max(1, (Array.isArray(lines) ? lines.filter((l) => String(l).trim().length > 6).length : 0) || (Array.isArray(lines) ? lines.length : 1) || 1));
  const cost = estimateVideoCost(tierId, shotCount, tier.defaultSeconds);
  const buttons = VIDEO_TIERS.map((t) => `<button type="button" class="ghost ${t.id === tierId ? "active" : ""}" data-video-tier="${t.id}" ${isLoading ? "disabled" : ""}>${escapeHtml(t.label)}</button>`).join("");
  return `<div class="video-clip-tier" style="border-top:1px dashed #ece3d4;padding-top:10px;margin-bottom:10px;">
    <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
      <span style="color:#7a6a55;font-size:12px;">出片档位：</span>
      ${buttons}
      <span style="color:#9a8a72;font-size:12px;">（${escapeHtml(tier.hint)}）</span>
    </div>
    <div style="color:#7a6a55;font-size:12px;margin-top:8px;">这条预计 <b>${shotCount}</b> 段（每段约 ${tier.defaultSeconds} 秒），共 <b>约 ¥${cost.rmb}</b>（${cost.credits} 点，含关键帧出图）。实际以平台扣点为准。</div>
  </div>`;
}

function renderExportStep() {
  const files = currentDeliveryImages(); // 封面+内页统一清单(封面=②做封面,P1)
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
        ${files.length ? files.map((url, index) => { const label = index === 0 ? "封面" : `P${index + 1}`; return `<p><strong>${label}</strong><br><a class="source-link" href="${escapeHtml(url)}" download="${label}.png" rel="noreferrer">下载${label}</a></p>`; }).join("") : `<p>当前平台以文字或脚本交付为主，图片可后续补充或从母题复用。</p>`}
        ${(() => { const alts = (Array.isArray(state.coverOptions) ? state.coverOptions : []).map((o) => o && o.url).filter((u) => u && u !== state.coverImage); return alts.length ? `<h3 style="margin-top:14px;">封面备选（没选的，可下载/做A/B，没浪费）</h3>${alts.map((url, i) => `<p><strong>备选${i + 1}</strong><br><a class="source-link" href="${escapeHtml(url)}" download="封面备选${i + 1}.png" rel="noreferrer">下载备选${i + 1}</a></p>`).join("")}` : ""; })()}
      </div>
    </div>
    <div class="actions">
      <button class="ghost" data-step-target="10">返回上一步</button>
      <button class="primary" data-finish-work ${ready ? "" : "disabled"}>✅ 完成（存入作品记录）</button>
    </div>
  </section>`;
}

function renderArchiveStep() {
  const innerFiles = Array.isArray(currentVisualManifest()?.publicFiles) ? currentVisualManifest().publicFiles : [];
  const files = currentDeliveryImages(); // 封面+内页统一清单
  const reusableImages = getReusableImagesForCurrentTopic();
  const savedWork = state.finalWorks.find((item) => item.id === currentFinalWorkId());
  const archived = Boolean(savedWork);
  const published = savedWork?.publishRecord?.status === "published";
  const ready = state.copyConfirmed && Boolean(confirmedCopyText());
  const expectedImages = expectedImageCountForCurrentWork();
  const hasCover = !!(state.coverImage && /^https?:\/\//.test(state.coverImage));
  // 小红书图文要完整 = 有封面(②做封面) + 有内页(③生成图文卡)
  const imageComplete = state.publishTarget !== "xhs" || (hasCover && innerFiles.length >= 1);
  const canSave = ready && imageComplete;
  return `<section class="work-card">
    ${cardHead("保存为母题资产", "不是只收藏成品，而是把这次内容沉淀成可复盘、可拆解、可切换平台再生产的母题资产。")}
    ${state.archiveMessage ? `<div class="status-strip success">${escapeHtml(state.archiveMessage)}</div>` : ""}
    ${state.publishTarget === "xhs" && !imageComplete ? `<div class="status-strip warn">小红书图文要完整成稿,需要:${hasCover ? "" : "① 回第10步【②做封面】做一张封面;"}${innerFiles.length >= 1 ? "" : "② 回第10步【③生成内页配图】出内页;"}补齐前不会保存。</div>` : ""}
    <div class="production-grid">
      <article class="production-card"><b>1. 平台成稿</b><span>${escapeHtml(currentTarget().title)} · ${state.publishTarget === "xhs" ? `${files.length}/${expectedImages}` : (files.length || reusableImages.length)} 张可用图 / ${confirmedCopyText().length} 字正文 / 可回看交付链接。</span></article>
      <article class="production-card"><b>2. 母题复用</b><span>${escapeHtml(selectedTopic()?.theme || "本次选题")} 后续可切换成公众号、视频号、抖音、朋友圈或小红书二版。</span></article>
      <article class="production-card"><b>3. 拆解资产</b><span>沉淀标题、结构、开头、配图策略和表现数据，反哺下一次创作。</span></article>
    </div>
    ${archived ? `<div class="status-strip ${published ? "success" : ""}">${published ? `✓ 已登记发布：${escapeHtml(savedWork.publishRecord.platform || currentTarget().title)} · ${escapeHtml(formatShortDate(savedWork.publishRecord.publishedAt))}。发布后的阅读/点赞/收藏数据可在资产库补。` : "已保存到资产库。发出去后点【登记已发布】，不用再进资产库。"}</div>` : ""}
    <div class="actions">
      <button class="ghost" data-step-target="11">返回导出</button>
      <button class="secondary" data-archive-final-work ${canSave ? "" : "disabled"}>${archived ? "已保存到资产库" : "保存本次成稿"}</button>
      <button class="primary" data-register-published ${archived && !published ? "" : "disabled"}>${published ? "✓ 已登记发布" : "登记已发布"}</button>
      <button class="secondary" data-route-target="assets">查看内容资产库</button>
    </div>
  </section>`;
}

async function registerPublishedFromArchive() {
  const id = currentFinalWorkId();
  const work = state.finalWorks.find((item) => item.id === id);
  if (!work) {
    state.archiveMessage = "请先点【保存本次成稿】，再登记已发布。";
    renderToday();
    return;
  }
  const now = new Date().toISOString();
  const recordInput = {
    ...(work.publishRecord || {}),
    status: "published",
    publishedAt: work.publishRecord?.publishedAt || now,
    platform: work.publishRecord?.platform || work.platform || currentTarget().title,
    registeredAt: now,
  };
  const updated = {
    ...work,
    publishRecord: (typeof buildPublishRecordSnapshot === "function") ? buildPublishRecordSnapshot(recordInput) : recordInput,
  };
  try {
    await syncFinalWorkUpdate(updated);
    state.archiveMessage = `已登记为已发布（${updated.publishRecord.platform} · ${formatShortDate(updated.publishRecord.publishedAt)}）。发布后的阅读/点赞/收藏数据，之后在资产库补即可。`;
  } catch (error) {
    state.archiveMessage = `登记已发布失败：${error.message}`;
  }
  renderToday();
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

// 统一的"封面+内页"交付清单:封面=②做封面(state.coverImage)放第一张;内页=③生成图文卡(publicFiles)。
// 保存、导出、作品记录都用它 → 封面有位、内页齐、不重复、不丢图。③已只出内页,不再自带封面。
function currentDeliveryImages() {
  const files = Array.isArray(currentVisualManifest()?.publicFiles) ? currentVisualManifest().publicFiles : [];
  const inner = files.length ? files : getReusableImagesForCurrentTopic();
  const cover = (typeof state.coverImage === "string" && /^https?:\/\//.test(state.coverImage)) ? state.coverImage : "";
  if (!cover) return inner;
  return [cover, ...inner.filter((u) => u !== cover)]; // 封面P1 + 内页;去掉与封面完全相同的
}

function buildFinalWorkAsset() {
  const images = currentDeliveryImages();
  // 没选中的另外两张封面 → 存成「封面备选」,不浪费(可下载/换主封面/做A/B)
  const coverAlts = (Array.isArray(state.coverOptions) ? state.coverOptions : [])
    .map((o) => o && o.url).filter((u) => u && /^https?:\/\//.test(u) && u !== state.coverImage);
  const topic = selectedTopic();
  const target = currentTarget();
  const body = cleanPublishBodyForCopy(confirmedCopyText());
  const visual = currentVisualStyle();
  const prediction = buildLongkaPredictionSnapshot({ topic, target, body, images });
  return {
    id: currentFinalWorkId(),
    type: "final-work",
    platform: target.title,
    platformId: target.id,
    title: state.selectedTitle || topic?.theme || "未命名成稿",
    topic: topic?.theme || topic?.title || "",
    sourceUrl: topic?.url || "",
    sourcePlatform: topic?.platform || currentSource().title,
    workspace: state.businessLine || state.workspace || "", // 业务线,获客脚本/真实料按它取
    body,
    images,
    coverAlts, // 备选封面(没选中的那几张,留作 A/B/换封面,不浪费)
    plannedImageCount: expectedImageCountForCurrentWork(),
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
  // 🛡️ 发布前合规硬卡口:保存(=发/交付)前自动扫,high 风险直接拦下,必须先改合规再存。
  try {
    const scan = await fetch(apiPath("/api/compliance/scan"), {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: asset.title, body: asset.body }),
    }).then((r) => r.json());
    if (scan && scan.risk === "high") {
      state.complianceResult = scan; // 把结果亮到合规门卡上,小妹看得见为什么被拦
      state.archiveMessage = `⛔ 合规未过,已拦下:这篇命中导流违规(${(scan.categories || []).map(complianceCatLabel).join("/")}),直接发大概率封号。请回第 9 步点【🛡️合规检查 → 一键改成合规版】改完再保存。`;
      setStep(9);
      renderToday();
      return;
    }
  } catch { /* 扫描失败不阻断,放行,避免误杀 */ }
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
        <button class="primary" ${locked || isLoading ? "disabled" : ""} data-generate-xiaohei-cards>${isLoading && state.xhsCardOperation === "xiaohei" ? "正在生成图片..." : primaryVisualActionLabel(state.visualStyle)}</button>
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
  if (styleId === "xiaohei-metaphor") return "生成带场景隐喻的小黑漫画图。";
  if (styleId === "juju-organizing") return "按卷卷整理研究所风格，把当前文案变成白底纸面手绘方法图；适合方法论、小红书知识卡和公众号正文插图。";
  if (styleId === "guizang-editorial") return "按归藏杂志风拆成高级图文卡，适合方法论和系统感展示。";
  return "按宝玉小红书知识卡拆页，适合清单、步骤和收藏型内容。";
}

function primaryVisualActionLabel(styleId) {
  const count = plannedVisualCardCount();
  const prefix = count ? `生成 ${count} 张` : "生成";
  if (styleId === "xiaohei-metaphor") return `${prefix}小妹场景图`;
  if (styleId === "juju-organizing") return `${prefix}卷卷整理图`;
  if (styleId === "guizang-editorial") return `${prefix}归藏杂志图`;
  if (styleId === "xhs-knowledge-card") return `${prefix}宝玉知识卡`;
  return `${prefix}${visualRouteNameClean(styleId)}`;
}

function zh(entity) {
  const box = document.createElement("textarea");
  box.innerHTML = entity;
  return box.value;
}

// 内容 → 配图风格 自动推荐(认全 12 种;顺序=从具体到一般,先命中先返回)
function recommendVisualRouteClean() {
  const topic = selectedTopic() || {};
  const t = `${state.selectedTitle || ""}\n${confirmedCopyText() || state.draft || ""}\n${topic.theme || ""}\n${topic.pain || ""}`;
  const ws = state.businessLine || state.workspace || "";
  const has = (re) => re.test(t);
  if (has(/种草|好物|测评|开箱|护肤|美妆|彩妆|成分|包装|商品|平价|必买|链接/) || /美容/.test(ws))
    return { id: "product-commerce", reason: "这篇偏商品/种草,用商品商业视觉(主图+卖点+材质光)比卡通更能带货、更专业。" };
  if (has(/数据|复盘|统计|榜单|增长|对比|步骤|教程|清单|攻略|框架|怎么做|如何|流程|时间表|盘点|几招|几个方法/))
    return { id: "infographic-engine", reason: "这篇是干货/步骤/对比,用信息图把要点结构化——小红书收藏率最高,也补上了干货感。" };
  if (has(/行业|趋势|洞察|商业|投资人|方法论|战略|认知|底层逻辑|思维|格局|职场|专业|表达力|沟通/) || /私校|留学/.test(ws))
    return { id: "poster-cinematic", reason: "这篇偏严肃高端/认知,用高级海报(大标题+主视觉+留白)有质感有分量,别用卡通狗稀释掉。" };
  if (has(/治愈|温柔|陪伴|疗愈|松弛|情感|那天|后来|经历|内心|温暖|慢生活/))
    return { id: "art-illustration", reason: "这篇偏治愈/情感/故事,用艺术插画(水彩/水墨/手绘)更有温度。" };
  if (has(/诗|古风|文化|历史|传统|国风|意境|禅/))
    return { id: "ink-poster", reason: "这篇偏文化/诗意,用水墨意境海报更高级、更应景。" };
  if (has(/观点|态度|金句|真相|别再|劝你|其实|反差|扎心|你要/))
    return { id: "typography-poster", reason: "这篇是强观点/态度,用字体海报让金句本身成为主视觉,够冲。" };
  if (has(/焦虑|卡住|误区|痛点|摆烂|逆袭|改变|为什么|失败/) || /女性/.test(ws))
    return { id: "xiaohei-metaphor", reason: "这篇有痛点情绪,用小妹真实物件场景做隐喻,本账号 IP 一致、有共鸣。" };
  if (has(/整理|系统|资产|梳理/))
    return { id: "juju-organizing", reason: "这篇在整理复杂方法,卷卷整理风把流程变成能进入的纸面现场。" };
  return { id: "xiaohei-metaphor", reason: "按内容默认用本账号 IP 小妹配图,保持账号一致性(也可手动换上面任一风格)。" };
}

function visualRouteNameClean(styleId) {
  const s = (typeof visualStyles !== "undefined" && Array.isArray(visualStyles)) ? visualStyles.find((x) => x.id === styleId) : null;
  if (s) return s.title;
  return currentVisualStyle().title || "visual";
}

function visualProductionCopyClean(styleId) {
  if (styleId === "xiaohei-metaphor") return zh("&#23567;&#40657;&#30495;&#20986;&#22270;&#65292;&#29983;&#25104; 5 &#24352;&#24102;&#22330;&#26223;&#38544;&#21947;&#30340;&#28459;&#30011;&#22270;&#12290;&#36866;&#21512;&#24403;&#21069;&#28436;&#31034;&#38381;&#29615;&#12290;");
  if (styleId === "juju-organizing") return zh("&#25353;&#21367;&#21367;&#25972;&#29702;&#30740;&#31350;&#25152;&#39118;&#26684;&#65292;&#25226;&#24403;&#21069;&#25991;&#26696;&#21464;&#25104;&#30333;&#24213;&#32440;&#38754;&#25163;&#32472;&#26041;&#27861;&#22270;&#65307;&#36866;&#21512;&#26041;&#27861;&#35770;&#12289;&#23567;&#32418;&#20070;&#30693;&#35782;&#21345;&#21644;&#20844;&#20247;&#21495;&#27491;&#25991;&#25554;&#22270;&#12290;");
  if (styleId === "guizang-editorial") return zh("&#25353;&#24402;&#34255;&#26434;&#24535;&#39118;&#25286;&#25104;&#39640;&#32423;&#22270;&#25991;&#21345;&#65292;&#36866;&#21512;&#32473;&#25237;&#36164;&#20154;&#30475;&#26041;&#27861;&#35770;&#21644;&#31995;&#32479;&#24863;&#12290;&#24403;&#21069;&#20808;&#23548;&#20986;&#25286;&#39029;&#26041;&#26696;&#65292;&#21518;&#32493;&#25509;&#30495;&#22270;&#26381;&#21153;&#12290;");
  return zh("&#25353;&#23453;&#29577;&#23567;&#32418;&#20070;&#30693;&#35782;&#21345;&#25286;&#39029;&#65292;&#36866;&#21512;&#28165;&#21333;&#12289;&#27493;&#39588;&#21644;&#25910;&#34255;&#22411;&#20869;&#23481;&#12290;&#24403;&#21069;&#20808;&#23548;&#20986;&#25286;&#39029;&#26041;&#26696;&#65292;&#21518;&#32493;&#25509;&#30495;&#22270;&#26381;&#21153;&#12290;");
}

function primaryVisualActionLabelClean(styleId) {
  const count = plannedVisualCardCount();
  const prefix = count ? `生成 ${count} 张` : "生成";
  if (styleId === "xiaohei-metaphor") return `${prefix}小妹场景图`;
  if (styleId === "juju-organizing") return `${prefix}卷卷整理图`;
  if (styleId === "guizang-editorial") return `${prefix}归藏杂志图`;
  if (styleId === "xhs-knowledge-card") return `${prefix}宝玉知识卡`;
  return `${prefix}${visualRouteNameClean(styleId)}`;
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
  // 注：不再要求图片 URL 里包含风格名——Kie 出图的 URL 不含风格名，靠 manifest.style / file.style 判断即可。
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
    state.xhsCardExportMessage = `已生成 ${count} 张${visualRouteNameClean(state.visualStyle)}，下面可以逐张打开检查。`;
  } else if (count > 0 && state.xhsCardExportStatus === "loading") {
    state.xhsCardProgress = { done: count, total };
    state.xhsCardExportMessage = `正在出图：已完成 ${count}/${total} 张。已生成的图片会先显示。`;
  }
  return true;
}

// 句子级 diff：把文本按句切分，标出「改后」里相对「改前」新增/改写的句子（黄色高亮）
function segmentsForDiff(text) {
  return String(text || "").split(/(?<=[。！？!?\n；;])/).filter((s) => s.length);
}
function diffMarkAfter(beforeText, afterText) {
  const A = segmentsForDiff(beforeText), B = segmentsForDiff(afterText);
  const na = A.length, nb = B.length;
  const key = (s) => s.replace(/\s+/g, "").trim();
  const dp = Array.from({ length: na + 1 }, () => new Array(nb + 1).fill(0));
  for (let i = na - 1; i >= 0; i--) for (let j = nb - 1; j >= 0; j--) {
    dp[i][j] = key(A[i]) === key(B[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  }
  const common = new Array(nb).fill(false);
  let i = 0, j = 0;
  while (i < na && j < nb) {
    if (key(A[i]) === key(B[j])) { common[j] = true; i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
  }
  return B.map((seg, idx) => common[idx] ? escapeHtml(seg) : `<mark class="diff-add">${escapeHtml(seg)}</mark>`).join("");
}
function renderOptimizeDiff() {
  const d = state.optimizeDiff;
  if (!d || !d.after) return "";
  const marked = diffMarkAfter(d.before, d.after);
  return `<div class="optimize-diff" style="margin-top:12px;border:1px solid #e0d3bd;border-radius:10px;overflow:hidden;background:#fff;">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 13px;background:#faf3e6;border-bottom:1px solid #ecdcc2;">
      <b style="color:#5b4a32;">✅ 帮你改好了 · <span style="background:#fff3b0;padding:0 4px;border-radius:3px;">黄色</span>=改动/补上的地方</b>
      <button class="secondary" type="button" data-undo-optimize>撤销，还原改前</button>
    </div>
    <div class="diff-cols" style="display:flex;flex-wrap:wrap;align-items:stretch;">
      <div class="diff-col" style="flex:1 1 340px;min-width:280px;padding:13px;border-right:1px solid #ecdcc2;background:#faf7f1;white-space:pre-wrap;font-size:13px;line-height:1.8;color:#8a7a63;">
        <div style="font-size:12px;font-weight:bold;color:#a18f73;margin-bottom:8px;">改前原文</div>
        ${escapeHtml(d.before)}
      </div>
      <div class="diff-col" style="flex:1 1 340px;min-width:280px;padding:13px;white-space:pre-wrap;font-size:13px;line-height:1.8;color:#2c2418;">
        <div style="font-size:12px;font-weight:bold;color:#5b4a32;margin-bottom:8px;">改后（黄色=改动）</div>
        ${marked}
      </div>
    </div>
  </div>`;
}

// 合规门(发布前):红黄绿风险 + 命中违规点 + 一键改成过来人口吻合规版
function complianceCatLabel(c) {
  return { contact: "联系方式", promise: "承诺夸大", solicit: "招揽口吻", industry: "高危行业" }[c] || c;
}
function renderComplianceGate() {
  const r = state.complianceResult || null;
  const rw = state.complianceRewrite || null;
  let html = "";
  if (state.complianceMessage) html += `<div class="status-strip ${state.complianceStatus === "error" ? "" : "success"}" style="margin-top:8px;">${escapeHtml(state.complianceMessage)}</div>`;
  if (!r) return html;
  const map = { high: ["#b4231f", "#fdecea", "🔴 高风险 · 直接发大概率封号"], medium: ["#b8860b", "#fdf6e3", "🟡 中风险 · 建议改成合规版再发"], low: ["#1a7f37", "#eaf6ed", "🟢 低风险 · 未命中明显导流特征"] };
  const m = map[r.risk] || ["#777", "#f0f0f0", "风险未知"];
  const cats = Array.isArray(r.categories) ? r.categories : [];
  const hitWords = {};
  (r.hits || []).forEach((h) => { (hitWords[h.category] = hitWords[h.category] || []).push(h.term); });
  html += `<div style="margin-top:10px;border:1px solid ${m[0]};border-radius:8px;padding:11px 13px;background:${m[1]};">
    <div style="font-weight:600;color:${m[0]};font-size:14px;">${m[2]}</div>
    <div style="font-size:12px;color:#5a4a32;margin-top:4px;">${escapeHtml(r.advice || "")}</div>
    ${cats.length ? `<div style="margin-top:6px;font-size:13px;">命中:${cats.map((c) => `<span style="display:inline-block;background:#fff;border:1px solid ${m[0]};color:${m[0]};border-radius:6px;padding:1px 7px;margin:2px;">${complianceCatLabel(c)}${hitWords[c] ? "·" + hitWords[c].slice(0, 4).join("/") : ""}</span>`).join("")}</div>` : ""}
    ${(r.risk === "high" || r.risk === "medium") ? `<button class="primary" ${state.complianceStatus === "rewriting" ? "disabled" : ""} data-compliance-rewrite style="margin-top:8px;background:#1a7f37;border-color:#1a7f37;">${state.complianceStatus === "rewriting" ? "改写中…" : "✨ 一键改成合规版(过来人口吻)"}</button>` : ""}
  </div>`;
  if (rw && rw.body) {
    html += `<div style="margin-top:8px;border:1px dashed #1a7f37;border-radius:8px;padding:11px 13px;background:#f6fbf7;">
      <div style="font-size:13px;"><b>合规版标题:</b>${escapeHtml(rw.title || "")}</div>
      <div style="font-size:13px;white-space:pre-wrap;margin-top:4px;max-height:220px;overflow:auto;">${escapeHtml(rw.body || "")}</div>
      ${Array.isArray(rw.changes) && rw.changes.length ? `<div style="font-size:12px;color:#7a6a55;margin-top:6px;"><b>改了什么:</b><ul style="margin:3px 0 0 16px;padding:0;">${rw.changes.slice(0, 5).map((ch) => `<li>${escapeHtml(String(ch.from || "").slice(0, 20))} → ${escapeHtml(String(ch.to || "").slice(0, 20))}</li>`).join("")}</ul></div>` : ""}
      ${rw.residualRisk ? `<div style="font-size:12px;color:#b8860b;margin-top:4px;">⚠️ ${escapeHtml(rw.residualRisk)}</div>` : ""}
      <button class="primary" data-apply-compliance style="margin-top:8px;">用这个合规版替换文案</button>
    </div>`;
  }
  return html;
}

async function runComplianceScan() {
  const title = state.selectedTitle || selectedTopic()?.theme || selectedTopic()?.title || "";
  const body = byId("workArea")?.querySelector("[data-inline-copy]")?.value || confirmedCopyText() || "";
  if (!body) { state.complianceStatus = "error"; state.complianceMessage = "没有文案可检查。"; renderToday(); return; }
  state.complianceStatus = "loading"; state.complianceResult = null; state.complianceRewrite = null; state.complianceMessage = "正在合规检查(导流风险)…"; renderToday();
  try {
    const res = await fetch(apiPath("/api/compliance/scan"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, body }) });
    const d = await res.json();
    state.complianceResult = d; state.complianceStatus = "done"; state.complianceMessage = ""; renderToday();
  } catch (e) { state.complianceStatus = "error"; state.complianceMessage = `合规检查失败:${e.message}`; renderToday(); }
}

async function runComplianceRewrite() {
  const title = state.selectedTitle || selectedTopic()?.theme || "";
  const body = byId("workArea")?.querySelector("[data-inline-copy]")?.value || confirmedCopyText() || "";
  const ws = state.businessLine || state.workspace || "";
  state.complianceStatus = "rewriting"; state.complianceMessage = "正在改成合规版(过来人口吻)…"; renderToday();
  try {
    const res = await fetch(apiPath("/api/skills/run"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ skill: "compliance-rewrite", content: `标题:${title}\n正文:${body}\n业务线:${ws}` }) });
    const d = await res.json();
    state.complianceRewrite = d?.result || {}; state.complianceStatus = "done"; state.complianceMessage = ""; renderToday();
  } catch (e) { state.complianceStatus = "error"; state.complianceMessage = `合规改写失败:${e.message}`; renderToday(); }
}

function applyComplianceRewrite() {
  const rw = state.complianceRewrite;
  if (!rw || !rw.body) return;
  if (rw.title) state.selectedTitle = rw.title;
  state.complianceResult = null; state.complianceRewrite = null;
  saveInlineCopyEdit(rw.body); // 落进文案 + 作废旧判断 + 重渲染
}

function renderPrecheckResults() {
  const r = state.precheckResult || null;
  const labelMap = { HP: "钩子", ER: "痛点共鸣", SV: "收藏价值", IV: "增量价值/存在感", SP: "具体可信", HT: "人味", CV: "转化" };
  const weakest = Array.isArray(r?.weakest) ? r.weakest.map((c) => labelMap[c] || c) : [];
  const fixes = Array.isArray(r?.fixes) ? r.fixes : [];
  const flags = Array.isArray(r?.honest_flags) ? r.honest_flags : [];
  let html = "";
  if (state.precheckMessage) html += `<div class="status-strip ${state.precheckStatus === "error" ? "" : "success"}" style="margin-top:8px;">${escapeHtml(state.precheckMessage)}</div>`;
  const optimizing = state.precheckStatus === "loading";
  if (r) html += `<div style="margin-top:10px;font-size:14px;line-height:1.55;background:#fbfbff;border:1px solid #d8d8ea;border-radius:8px;padding:11px 13px;">
      <div><b>发布前判断：</b>${escapeHtml(r.verdict || "")}</div>
      ${weakest.length ? `<div style="margin-top:6px;font-size:13px;"><b>最该补：</b>${weakest.map((w) => `<span style="display:inline-block;background:#ececf6;border-radius:6px;padding:2px 8px;margin:2px;">${escapeHtml(w)}</span>`).join("")}</div>` : ""}
      ${fixes.length ? `<div style="margin-top:6px;font-size:13px;"><b>具体改哪几句：</b><ol style="margin:4px 0 0 18px;padding:0;">${fixes.map((f) => `<li style="margin:2px 0;">${escapeHtml(f)}</li>`).join("")}</ol></div>` : ""}
      ${flags.length ? `<div style="margin-top:6px;font-size:13px;color:#b4231f;"><b>⚠️ 发之前先改掉：</b>${flags.map((f) => escapeHtml(f)).join("；")}</div>` : ""}
      <div style="margin-top:10px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <button class="primary" ${optimizing ? "disabled" : ""} data-optimize-by-precheck>${optimizing ? "正在帮你改…" : "✨ 帮我按这些改好（直接出能用的版本）"}</button>
        <span style="color:#7a6a55;font-size:12px;">一键改到位：钩子/结构/收藏点/转化/去AI味全自动；真实案例只用你的真实素材，缺的会留一处【】让你补，不替你编。</span>
      </div>
    </div>`;
  return html;
}

function renderPrecheckPanel() {
  const locked = !state.copyConfirmed;
  const loading = state.precheckStatus === "loading";
  const r = state.precheckResult || null;
  const labelMap = { HP: "钩子", ER: "痛点共鸣", SV: "收藏价值", IV: "增量价值/存在感", SP: "具体可信", HT: "人味", CV: "转化" };
  const weakest = Array.isArray(r?.weakest) ? r.weakest.map((c) => labelMap[c] || c) : [];
  const fixes = Array.isArray(r?.fixes) ? r.fixes : [];
  const flags = Array.isArray(r?.honest_flags) ? r.honest_flags : [];
  return `<div class="precheck-panel" style="border:1px solid #d8d8ea;border-radius:10px;padding:14px;margin:12px 0;background:#fbfbff;">
    <b>发布前判断（这篇发出去行不行）</b>
    <div style="color:#6a6a85;font-size:13px;margin:4px 0 8px;">发之前先让系统按这个账号的标准盲判一遍：哪里强、哪里弱、该改哪几句。</div>
    <button class="primary" ${locked || loading ? "disabled" : ""} data-run-precheck>${loading ? "判断中…" : "做发布前判断"}</button>
    ${state.precheckMessage ? `<div class="status-strip ${state.precheckStatus === "error" ? "" : "success"}" style="margin-top:8px;">${escapeHtml(state.precheckMessage)}</div>` : ""}
    ${r ? `
      <div style="margin-top:10px;font-size:14px;line-height:1.5;"><b>总评：</b>${escapeHtml(r.verdict || "")}</div>
      ${weakest.length ? `<div style="margin-top:6px;font-size:13px;"><b>最该补：</b>${weakest.map((w) => `<span style="display:inline-block;background:#ececf6;border-radius:6px;padding:2px 8px;margin:2px;">${escapeHtml(w)}</span>`).join("")}</div>` : ""}
      ${fixes.length ? `<div style="margin-top:6px;font-size:13px;"><b>具体改哪几句：</b><ol style="margin:4px 0 0 18px;padding:0;">${fixes.map((f) => `<li style="margin:2px 0;">${escapeHtml(f)}</li>`).join("")}</ol></div>` : ""}
      ${flags.length ? `<div style="margin-top:6px;font-size:13px;color:#b4231f;"><b>⚠️ 发之前先改掉：</b>${flags.map((f) => escapeHtml(f)).join("；")}</div>` : ""}
    ` : ""}
  </div>`;
}

function renderCoverPanel() {
  const locked = !state.copyConfirmed;
  const loading = state.coverStatus === "loading";
  const hooks = Array.isArray(state.coverHooks) ? state.coverHooks : [];
  const refs = Array.isArray(state.referenceImages) ? state.referenceImages : [];
  const sel = state.selectedReferenceImage || "";
  const refStrip = refs.length ? `<div class="cover-ref-strip" style="margin:8px 0 10px;padding:10px;border:1px dashed #d9c9b0;border-radius:8px;background:#fffdf8;">
      <div style="font-size:12px;color:#7a6a55;margin-bottom:6px;">真实参考图（可选）：从这条新闻里抓到的真实产品图。<b>选一张</b>，封面就照它出，免得画得不对版；<b>不选</b>就按文字自己出。</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        ${refs.map((u) => `<button type="button" data-pick-ref="${escapeHtml(u)}" style="padding:0;border:2px solid ${u === sel ? "#5b4a32" : "transparent"};border-radius:8px;background:none;cursor:pointer;line-height:0;"><img src="${escapeHtml(u)}" alt="参考" style="width:72px;height:72px;object-fit:cover;border-radius:6px;" loading="lazy" /></button>`).join("")}
        <button type="button" class="ghost ${sel ? "" : "active"}" data-pick-ref="" style="${sel ? "" : "background:#5b4a32;color:#fff;border-color:#5b4a32;"}">不用参考图</button>
      </div>
      ${sel ? `<div style="font-size:12px;color:#2e7d32;margin-top:6px;">✓ 已选参考图，封面会按它出（更对版）。</div>` : ""}
    </div>` : "";
  const magAvailable = state.visualPlay === "magazine";
  const coverMode = magAvailable ? (state.coverMode || "xhs") : "xhs";
  const coverModeBtn = (id, label) => `<button type="button" data-cover-mode="${id}" class="${coverMode === id ? "primary" : "secondary"}" style="font-size:13px;padding:6px 14px;">${label}</button>`;
  return `<div class="cover-panel" style="border:1px solid #e6ddd0;border-radius:10px;padding:14px;margin:12px 0;background:#fffdf8;">
    <b>② 做封面（小红书第一闸）</b>
    ${magAvailable ? `<div style="display:flex;gap:8px;margin:8px 0 12px;align-items:center;flex-wrap:wrap;"><span style="font-size:13px;color:#7a6a55;">封面方式(二选一·只出你选的那种·不会双份扣点)：</span>${coverModeBtn("xhs", "🎨 小红书插画封面")}${coverModeBtn("magazine", "📰 杂志海报封面")}</div>` : ""}
    ${coverMode === "xhs" ? `<div>
    <b>小红书封面（独立生成，不用配套图第一页）</b>
    <div style="color:#7a6a55;font-size:13px;margin:4px 0 8px;">从标题+正文提炼钩子，一次出 <b>3 张</b>（同一画风、不同钩子角度）让你挑。封面+标题是点击率第一闸。</div>
    ${refStrip}
    <button class="primary" ${locked || loading ? "disabled" : ""} data-generate-cover>${loading ? "正在生成封面…" : "生成封面"}</button>
    <div style="margin-top:10px;"><label style="display:inline-flex;align-items:center;gap:8px;font-size:13px;color:#7a6a55;cursor:pointer;white-space:nowrap;"><input type="checkbox" data-cover-watermark ${state.coverWatermark ? "checked" : ""} style="width:15px;height:15px;flex:0 0 auto;margin:0;"> 封面盖 <b style="color:#3a2c1c;">longka</b> 暗水印 <span style="color:#9a8a70;">(证明自有设计 · 默认关)</span></label></div>
    ${state.coverMessage ? `<div class="status-strip ${state.coverStatus === "error" ? "" : "success"}" style="margin-top:8px;">${escapeHtml(state.coverMessage)}</div>` : ""}
    ${(Array.isArray(state.coverOptions) && state.coverOptions.length) ? `<div style="margin-top:12px;display:flex;gap:12px;flex-wrap:wrap;">${state.coverOptions.map((o, i) => {
      const picked = state.coverImage && o.url && o.url === state.coverImage;
      const inner = o.url
        ? `<a href="${escapeHtml(o.url)}" target="_blank" rel="noreferrer"><img src="${escapeHtml(o.url)}" alt="封面${i + 1}" style="width:100%;border-radius:6px;display:block;" /></a><button class="${picked ? "primary" : "secondary"}" data-pick-cover="${i}" style="width:100%;margin-top:8px;font-size:12px;padding:6px;">${picked ? "✓ 已选这张" : "用这张"}</button>`
        : (o.status === "error" ? `<div style="height:130px;display:flex;align-items:center;justify-content:center;color:#c0392b;font-size:12px;">这张没出来</div>` : `<div style="height:130px;display:flex;align-items:center;justify-content:center;color:#9a8a70;font-size:12px;">出图中…</div>`);
      return `<div style="width:180px;border:2px solid ${picked ? "#1a7f37" : "#e6ddd0"};border-radius:10px;padding:8px;background:#fff;">
        <div style="font-size:12px;color:#3a2c1c;margin-bottom:6px;min-height:34px;line-height:1.4;">${escapeHtml(String(o.hook || "").slice(0, 26))}</div>
        ${inner}
        ${o.judge && o.judge.ok !== false ? `<div style="margin-top:6px;font-size:11px;line-height:1.5;padding:5px 7px;border-radius:6px;background:${o.judge.pass ? "#eef7ee" : "#fdeeee"};color:${o.judge.pass ? "#1a7f37" : "#c0392b"};">${o.judge.pass ? "✅ 质检通过" : "⚠️ 建议重出"} · ${escapeHtml(o.judge.summary || "")}${o.judge.fix && o.judge.fix !== "无" ? `<br><span style="color:#7a6a55;">改:${escapeHtml(o.judge.fix)}</span>` : ""}</div>` : ""}
      </div>`;
    }).join("")}</div>` : (state.coverImage ? `<div style="margin-top:10px;"><a href="${escapeHtml(state.coverImage)}" target="_blank" rel="noreferrer"><img src="${escapeHtml(state.coverImage)}" alt="封面" style="max-width:300px;border-radius:8px;border:1px solid #e6ddd0;"></a></div>` : "")}
    ${(() => {
      const dc = (Array.isArray(state.coverOptions) ? state.coverOptions : []).map((o) => o && o.url).filter((u) => u && /^https?:\/\//.test(u));
      const list = dc.length ? dc : ((state.coverImage && /^https?:\/\//.test(state.coverImage)) ? [state.coverImage] : []);
      if (!list.length) return "";
      return `<div style="margin-top:12px;padding:10px;border:1px dashed #d8cdb8;border-radius:8px;background:#fbf7ee;">
        <div style="font-size:12px;color:#7a6a55;margin-bottom:6px;">📏 <b>缩略图自检</b> —— 信息流里封面就这么小,<b>标题和主体还看得清 = 合格</b>(80px 缩略图测试)。糊成一团就换钩子/换张:</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-start;">${list.map((u) => `<img src="${escapeHtml(u)}" alt="缩略图" style="width:80px;height:107px;object-fit:cover;border-radius:4px;border:1px solid #e6ddd0;background:#fff;">`).join("")}</div>
      </div>`;
    })()}
    </div>` : ""}
    ${(magAvailable && coverMode === "magazine") ? `<div style="margin-top:6px;">
      <b>📰 杂志海报打法(一键出成品)</b><div style="color:#7a6a55;font-size:13px;margin:4px 0 8px;">不用上面的做封面 —— 直接一键:自动出<b>无字底图</b> + 叠<b>得意黑大标题</b> = 图文一体杂志封面。约 1 分钟(出底图 ≈¥0.03)。</div>
      <button class="primary" ${locked || state.magazineStatus === "loading" ? "disabled" : ""} data-make-magazine>${state.magazineStatus === "loading" ? "出杂志封面中(约1分钟)…" : "📰 出杂志封面"}</button>
      ${state.magazineMessage ? `<div class="status-strip ${state.magazineStatus === "error" ? "" : "success"}" style="margin-top:8px;">${escapeHtml(state.magazineMessage)}</div>` : ""}
      ${state.magazineCover ? `<div style="margin-top:10px;"><a href="${escapeHtml(state.magazineCover)}" target="_blank" rel="noreferrer"><img src="${escapeHtml(state.magazineCover)}" alt="杂志封面成品" style="max-width:300px;border-radius:8px;border:1px solid #1a7f37;"></a><div style="font-size:12px;color:#1a7f37;margin-top:4px;">杂志封面成品(可右键下载)</div>${state.magazineJudge && state.magazineJudge.ok !== false ? `<div style="margin-top:6px;font-size:11px;line-height:1.5;padding:5px 7px;border-radius:6px;display:inline-block;background:${state.magazineJudge.pass ? "#eef7ee" : "#fdeeee"};color:${state.magazineJudge.pass ? "#1a7f37" : "#c0392b"};">${state.magazineJudge.pass ? "✅ 质检通过" : "⚠️ 建议再调"} · ${escapeHtml(state.magazineJudge.summary || "")}${state.magazineJudge.fix && state.magazineJudge.fix !== "无" ? `<br><span style="color:#7a6a55;">改:${escapeHtml(state.magazineJudge.fix)}</span>` : ""}</div>` : ""}</div>` : ""}
    </div>` : ""}
  </div>`;
}

async function generateMagazineCover() {
  const title = (state.selectedTitle || (typeof currentTarget === "function" ? (currentTarget() || {}).title : "") || "").trim();
  if (!title) { state.magazineStatus = "error"; state.magazineMessage = "没有标题,先确认文案标题。"; renderToday(); return; }
  const visual = (typeof currentVisualStyle === "function") ? currentVisualStyle() : { id: state.visualStyle };
  const t = (typeof currentTarget === "function") ? (currentTarget() || {}) : {};
  const body = String(t.body || t.copy || t.content || "").slice(0, 240);
  const brief = `Premium magazine cover key visual for the topic「${title}」. ${body}`;
  let prompt = (typeof styleLockedVisualBrief === "function") ? styleLockedVisualBrief({ role: "cover", visualBrief: brief }, visual) : brief;
  prompt += "\nHard rule: this is a CLEAN cover image — NO text, NO Chinese characters, NO baked title; leave generous empty space at the TOP for a headline added later.";
  const ref = (typeof visualStyleContract === "function") ? (visualStyleContract(visual.id).referenceImageUrl || "") : "";
  state.magazineStatus = "loading"; state.magazineMessage = "正在出无字底图 + 叠得意黑大标题(约 1 分钟)…"; renderToday();
  try {
    const res = await fetch(apiPath("/api/visual/magazine-cover"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt, title, subtitle: "", aspect: "3:4", referenceImageUrl: ref, author: "@" + (state.businessLine || "小妹成长说") }) });
    const d = await res.json().catch(() => ({}));
    if (d.ok && d.url) {
      state.magazineCover = apiPath("/" + d.url); state.magazineStatus = "done"; state.magazineJudge = null;
      state.magazineMessage = "杂志封面成品出好了,正在视觉质检…"; renderToday();
      try {
        const abs = /^https?:\/\//.test(state.magazineCover) ? state.magazineCover : (window.location.origin + state.magazineCover);
        const jr = await fetch(apiPath("/api/visual/judge-cover"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ imageUrl: abs, hook: title, topic: title, mode: "cover" }) });
        const jd = await jr.json().catch(() => ({}));
        if (jd && jd.ok) state.magazineJudge = jd;
      } catch {}
      state.magazineMessage = state.magazineJudge ? (state.magazineJudge.pass ? "杂志封面出好了 · 质检通过。" : "杂志封面出好了 · 质检建议再调(见下)。") : "杂志封面成品出好了(图文一体)。";
    }
    else { state.magazineStatus = "error"; state.magazineMessage = d.message || d.error || "出图失败,稍后再试。"; }
  } catch (e) { state.magazineStatus = "error"; state.magazineMessage = `失败:${e.message}`; }
  renderToday();
}

function renderProductionStep() {
  const locked = !state.copyConfirmed;
  ensureXhsCardPlan();
  const topic = selectedTopic();
  const files = Array.isArray(currentVisualManifest()?.publicFiles) ? currentVisualManifest().publicFiles : [];
  const isLoading = state.xhsCardExportStatus === "loading";
  const rec = autoApplyRecommendedVisualStyle();
  const copy = confirmedCopyText();
  // 配图张数按文案内容自动判断（导演按信息密度给 1 / 3 / 5 张），不固定、不硬凑
  const plannedCardCount = plannedVisualCardCount();
  const isWechat = state.publishTarget === "wechat-article";
  const isVideo = state.publishTarget === "douyin" || state.publishTarget === "video-account";
  const isMoments = state.publishTarget === "moments";
  const platformNote = isWechat
    ? zh("&#20844;&#20247;&#21495;&#38656;&#35201;&#22270;&#29255;&#25353;&#35821;&#20041;&#25554;&#20837;&#38271;&#25991;&#27573;&#33853;&#65292;&#19981;&#26159;&#20570;&#22270;&#38598;&#12290;")
    : isVideo
      ? zh("&#35270;&#39057;&#38656;&#35201;&#23553;&#38754;&#21442;&#32771;&#22270;&#12289;&#20998;&#38236;&#27668;&#27675;&#22270;&#21644;&#21475;&#25773;&#33410;&#22863;&#12290;")
      : isMoments
        ? zh("&#26379;&#21451;&#22280;&#20063;&#38656;&#35201;&#37197;&#22270;&#65292;&#20294;&#35201;&#26356;&#33258;&#28982;&#12289;&#26356;&#20687;&#20154;&#30340;&#26085;&#24120;&#34920;&#36798;&#65292;&#19981;&#35201;&#22826;&#20687;&#28023;&#25253;&#12290;")
        : `小红书图文张数按内容自动判断（${plannedCardCount ? `当前约 ${plannedCardCount} 张` : "确认文案后判断"}），每张一个视觉重点，不硬凑多图。`;
  return `<section class="work-card">
    ${cardHead(`${escapeHtml(currentTarget().title)} ${zh("&#21046;&#20316;&#20013;&#24515;")}`, "先看/判断/改好文案，再按顺序：① 选配图风格 → ② 做封面 → ③ 出图。")}
    <div class="status-strip">${zh("&#24403;&#21069;&#27597;&#39064;")}: ${escapeHtml(topic?.theme || "-")} / ${zh("&#30446;&#26631;&#24179;&#21488;")}: ${escapeHtml(currentTarget().title)} / ${zh("&#24403;&#21069;&#35270;&#35273;")}: ${escapeHtml(visualRouteNameClean(state.visualStyle))}</div>
    <div class="current-copy-panel" style="border:1px solid #e6ddd0;border-radius:10px;padding:16px;margin:12px 0;background:#fff;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
        <b style="font-size:16px;">当前文案（${escapeHtml(currentTarget().title)}）</b>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="primary" ${locked || state.precheckStatus === "loading" ? "disabled" : ""} data-run-precheck>${state.precheckStatus === "loading" ? "判断中…" : "做发布前判断"}</button>
          <button class="primary" ${locked || state.complianceStatus === "loading" ? "disabled" : ""} data-run-compliance style="background:#b8860b;border-color:#b8860b;">${state.complianceStatus === "loading" ? "检查中…" : "🛡️ 合规检查"}</button>
          <button class="secondary" ${locked ? "disabled" : ""} data-save-inline-copy>保存修改</button>
        </div>
      </div>
      <div style="color:#7a6a55;font-size:12px;margin:6px 0 8px;">${escapeHtml(platformNote)} · 【发布前判断】看好不好(质量)、【🛡️合规检查】看能不能发(会不会封)。有问题改完点【保存修改】,不用回上一步。</div>
      ${copy ? `<textarea data-inline-copy style="width:100%;box-sizing:border-box;min-height:200px;max-height:420px;background:#faf7f1;border:1px solid #e6ddd0;border-radius:8px;padding:12px;font-size:13px;line-height:1.7;font-family:inherit;resize:vertical;">${escapeHtml(copy)}</textarea>
      ${state.copyEditNote ? `<div style="color:#2e7d32;font-size:12px;margin-top:6px;">${escapeHtml(state.copyEditNote)}</div>` : ""}
      ${renderPrecheckResults()}
      ${renderComplianceGate()}
      ${renderOptimizeDiff()}` : `<div class="status-strip">还没确认文案，请先在上一步确认这版文案。</div>`}
    </div>

    <h3 class="prod-section">① 选配图风格</h3>
    <div class="visual-recommendation"><b>建议：${escapeHtml(visualRouteNameClean(rec.id))}</b><span>${escapeHtml(rec.reason)}</span>${rec.id !== state.visualStyle ? `<button type="button" class="secondary" data-visual-style="${escapeHtml(rec.id)}">换成推荐风格</button>` : `<em>✓ 已用推荐风格</em>`}</div>
    ${renderVisualRoutePickerClean(locked, rec.id)}

    ${(!isWechat && !isVideo && !isMoments) ? `<h3 class="prod-section">② 做封面（小红书第一闸）</h3>${renderCoverPanel()}` : ""}

    <h3 class="prod-section">${(!isWechat && !isVideo && !isMoments) ? "③" : "②"} 生成内页配图（按内容判断张数${plannedCardCount ? ` · 约 ${plannedCardCount} 张` : ""}）</h3>
    <div class="production-grid">
      <article class="production-card ${locked ? "locked" : ""}">
        <b>${escapeHtml(visualRouteNameClean(state.visualStyle))}</b>
        <span>${escapeHtml(visualProductionCopyClean(state.visualStyle))}</span>
        <button class="primary" ${locked || isLoading ? "disabled" : ""} data-generate-xiaohei-cards>${isLoading ? "出图中…" : escapeHtml(primaryVisualActionLabelClean(state.visualStyle))}</button>
        <button class="secondary" ${locked || isLoading ? "disabled" : ""} data-export-xhs-cards>导出当前风格拆页方案</button>
      </article>
    </div>
    ${renderCleanXhsCardPreview()}
    ${isWechat ? renderWechatArticleImageLayout(copy) : ""}
    ${isVideo ? `<h3 class="prod-section">🎯 智能选片（按文案荐形态）</h3>${renderVideoFormatPicker(copy)}${renderSelectedVideoPanel(copy)}` : ""}
    ${files.length ? `<div class="status-strip success">${zh("&#24050;&#29983;&#25104;")} ${files.length} ${zh("&#24352;&#22270;&#29255;&#65292;&#21487;&#20197;&#23548;&#20986;&#25110;&#20445;&#23384;&#20026;&#27597;&#39064;&#36164;&#20135;&#12290;")}</div>` : ""}
    ${(!isMoments && !isVideo) ? `<h3 class="prod-section">🎬 做短视频（即梦分镜，可选）</h3>${renderSeedanceVideoPanel()}` : ""}
    <div class="actions"><button class="ghost" data-step-target="9">返回改文案</button><button class="primary" data-step-target="11" ${state.copyConfirmed ? "" : "disabled"}>下一步：下载成品</button></div>
  </section>`;
}

// 🎯 智能选片:读本篇文案 → 推荐最配的视频形态 + 形态菜单(点选切换下方产线)
function renderVideoFormatPicker(copy = "") {
  const title = state.selectedTitle || selectedTopic()?.theme || selectedTopic()?.title || "";
  const ws = state.businessLine || state.workspace || "";
  const cls = classifyVideoFormats(copy, title, ws);
  if (!state.videoFormat) state.videoFormat = cls.top.id; // 默认选中推荐形态
  const chips = cls.ranked.map((f) => {
    const active = state.videoFormat === f.id;
    const isTop = f.id === cls.top.id;
    return `<button class="vf-chip" data-video-format="${f.id}" style="font-size:12px;padding:6px 12px;border-radius:18px;border:1px solid ${active ? "#1a7f37" : "#e6ddd0"};background:${active ? "#eaf6ed" : "#fffdf8"};color:#3a2c1c;cursor:pointer;display:inline-flex;align-items:center;gap:4px;">
      ${f.emoji} ${escapeHtml(f.name)}${isTop ? ` <span style="font-size:10px;color:#1a7f37;border:1px solid #1a7f37;border-radius:8px;padding:0 5px;">推荐</span>` : ""}${f.ready ? "" : ` <span style="font-size:10px;color:#9a8a70;border:1px solid #ddd;border-radius:8px;padding:0 5px;">建设中</span>`}
    </button>`;
  }).join("");
  const sel = VIDEO_FORMATS.find((f) => f.id === state.videoFormat) || cls.top;
  return `<div style="border:1px solid #e6ddd0;border-radius:10px;padding:14px;margin:8px 0 12px;background:#fbf9f4;">
    <div style="font-size:13px;color:#3a2c1c;margin-bottom:10px;">系统看了这篇文案 → 推荐 <b>${cls.top.emoji} ${escapeHtml(cls.top.name)}</b><span style="color:#7a6a55;">(${escapeHtml(cls.reason)})</span></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">${chips}</div>
    <div style="font-size:12px;color:#7a6a55;background:#fff;border:1px dashed #e6ddd0;border-radius:8px;padding:8px 10px;">${sel.emoji} <b>${escapeHtml(sel.name)}</b> · 适合 ${escapeHtml(sel.good)} · ${escapeHtml(sel.cost)} —— ${escapeHtml(sel.desc)}${sel.ready ? "" : "(此形态建设中,先用上面带「推荐」的形态)"}</div>
  </div>`;
}

// 按选中形态路由到对应产线面板
function renderSelectedVideoPanel(copy = "") {
  const f = state.videoFormat || "ai";
  if (f === "ai" || f === "clay") return renderSeedanceVideoPanel();
  if (f === "oral" || f === "mix") return renderVideoProductionPreview(copy);
  if (f === "comic") return renderComicPanel();
  const meta = VIDEO_FORMATS.find((x) => x.id === f) || {};
  return `<div style="border:1px solid #e6ddd0;border-radius:10px;padding:18px;margin:8px 0 12px;background:#fffdf8;text-align:center;color:#7a6a55;font-size:13px;">
    ${meta.emoji || "🛠️"} <b>${escapeHtml(meta.name || "该形态")}</b> 建设中。<br>它最适合「${escapeHtml(meta.good || "")}」类文案,基座弹药已就位(${f === "comic" ? "baoyu-comic / 信息图 skill" : "remotion 程序化"}),很快接入。<br>现在可先点上面带「推荐」的形态出片。
  </div>`;
}

// 🖼️ 小妹漫画:本篇文案 → xiaomei-scenes 分镜 → 小妹一致出镜分格漫画(后端 spawn comic_gen.py)
function renderComicPanel() {
  const locked = !state.copyConfirmed;
  const loading = state.comicStatus === "loading";
  const url = state.comicUrl ? apiPath(state.comicUrl) : "";
  return `<div style="border:1px solid #e6ddd0;border-radius:10px;padding:14px;margin:8px 0 12px;background:#fffdf8;">
    <div style="color:#7a6a55;font-size:13px;margin-bottom:8px;">把这篇文案变成<b>小妹卡通分格漫画</b>(真实物件 + 物理动作 + 短句,3 秒读懂)。小妹一致出镜,中文字幕后期叠真字体(不乱码)。</div>
    <button class="primary" ${locked || loading ? "disabled" : ""} data-gen-comic style="background:#1a7f37;border-color:#1a7f37;">${loading ? "出漫画中…" : "🖼️ 生成小妹漫画(约 1 元)"}</button>
    ${state.comicMessage ? `<div class="status-strip ${state.comicStatus === "error" ? "" : "success"}" style="margin-top:8px;">${escapeHtml(state.comicMessage)}</div>` : ""}
    ${url ? `<div style="margin-top:10px;"><img src="${escapeHtml(url)}" style="max-width:320px;border-radius:8px;display:block;border:1px solid #eee;"><div style="margin-top:4px;font-size:12px;"><a href="${escapeHtml(url)}" download="小妹漫画.jpg">⬇️ 下载漫画</a></div></div>` : ""}
  </div>`;
}

async function generateXiaomeiComic() {
  if (!state.copyConfirmed) { state.comicStatus = "error"; state.comicMessage = "请先确认本篇文案。"; renderToday(); return; }
  const title = state.selectedTitle || selectedTopic()?.theme || selectedTopic()?.title || "";
  const body = confirmedCopyText() || "";
  if (!body) { state.comicStatus = "error"; state.comicMessage = "没有文案内容。"; renderToday(); return; }
  if (!window.confirm("生成小妹漫画:调用 AI 出图,约 1 元(¥)。确认?")) return;
  const ws = state.businessLine || state.workspace || "";
  const content = `本篇文案:标题《${title}》。\n${body}\n业务线:${ws}\n模式:comic\n画幅:3:4`;
  state.comicStatus = "loading"; state.comicUrl = ""; state.comicMessage = "正在出小妹漫画(分镜 → 出图 → 叠字,约 1-2 分钟,别关页面)…"; renderToday();
  try {
    const jobId = `comic-${Date.now().toString(36)}`;
    const res = await fetch(apiPath("/api/xiaomei-comic/start"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jobId, content }) });
    const sj = await res.json().catch(() => ({}));
    if (!res.ok || !sj.ok) throw new Error(sj.message || sj.error || "启动失败");
    const realId = sj.jobId || jobId;
    for (let i = 0; i < 45; i += 1) {
      await new Promise((rs) => setTimeout(rs, 4000));
      const st = await fetch(apiPath(`/api/xiaomei-comic/status?jobId=${encodeURIComponent(realId)}`)).then((x) => x.json()).catch(() => ({}));
      if (st.status === "done" && st.url) { state.comicStatus = "done"; state.comicUrl = st.url; state.comicMessage = "✅ 小妹漫画出来了,可直接发。"; renderToday(); return; }
      if (st.status === "error") throw new Error(st.error || "出漫画失败");
      state.comicMessage = `出漫画中…(${st.done || 0}/${st.total || 4} 格)`; renderToday();
    }
    state.comicStatus = "error"; state.comicMessage = "超时,请重试。"; renderToday();
  } catch (e) { state.comicStatus = "error"; state.comicMessage = `出漫画失败:${e.message}`; renderToday(); }
}

// 🎬 做短视频:本篇文案 → 即梦可粘贴的多镜头分镜 + 参考图清单(seedance-prompt 技能)
function renderSeedanceVideoPanel() {
  const locked = !state.copyConfirmed;
  const loading = state.seedanceStatus === "loading";
  const r = state.seedanceResult || null;
  return `<div style="border:1px solid #e6ddd0;border-radius:10px;padding:14px;margin:8px 0 12px;background:#fffdf8;">
    <div style="color:#7a6a55;font-size:13px;margin-bottom:8px;">把这篇文案变成一个<b>有故事的短视频分镜</b>(讲故事不说教 + 拟人角色不出真人 + 开头3秒钩子)。可粘进即梦,也可一键出片。文案为先,故事承载道理。</div>
    ${state.videoFormat === "clay" ? `<div style="font-size:12px;color:#b8860b;background:#fdf6e3;border:1px solid #f0e3c0;border-radius:6px;padding:6px 10px;margin-bottom:8px;">🧸 泥人偶定格模式:分镜会按黏土定格动画风格出图(手作感、治愈、反 AI 塑料感)。</div>` : ""}
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
      <label style="font-size:12px;color:#7a6a55;">主角 <select data-seedance-role style="font-size:12px;padding:4px 6px;border:1px solid #ddd;border-radius:6px;"><option value="小妹卡通形象(2D扁平插画,黑色低马尾,珊瑚橘短袖T恤+牛仔短裤,夏季清凉装,非真人脸,本账号IP主角)">小妹(本账号IP·默认)</option><option value="自动">自动(拟人动物)</option><option value="拟人化的猫或狗">拟人猫狗</option></select></label>
      <label style="font-size:12px;color:#7a6a55;">时长 <select data-seedance-dur style="font-size:12px;padding:4px 6px;border:1px solid #ddd;border-radius:6px;"><option value="15">15</option><option value="10">10</option><option value="5">5</option></select> 秒</label>
      <label style="font-size:12px;color:#7a6a55;">画幅 <select data-seedance-aspect style="font-size:12px;padding:4px 6px;border:1px solid #ddd;border-radius:6px;"><option value="9:16">9:16 竖</option><option value="16:9">16:9 横</option></select></label>
      <button class="primary" ${locked || loading ? "disabled" : ""} data-gen-seedance>${loading ? "生成中…" : "🎬 生成故事分镜"}</button>
    </div>
    ${state.seedanceMessage ? `<div class="status-strip ${state.seedanceStatus === "error" ? "" : "success"}" style="margin-top:8px;">${escapeHtml(state.seedanceMessage)}</div>` : ""}
    ${r ? renderSeedanceResult(r) : ""}
  </div>`;
}

function renderSeedanceResult(r) {
  const refs = Array.isArray(r.referenceImages) ? r.referenceImages : [];
  return `<div style="margin-top:10px;">
    ${r.hook3s ? `<div style="font-size:13px;margin-bottom:6px;"><b>开头3秒钩子:</b>${escapeHtml(r.hook3s)}</div>` : ""}
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:6px;">
      <button class="secondary" data-copy-seedance style="font-size:12px;padding:4px 10px;">📋 复制分镜(粘进即梦)</button>
      <span style="font-size:12px;color:#9a8a70;">${r.durationSec || 15} 秒 · ${escapeHtml(r.aspect || "9:16")}</span>
    </div>
    <pre style="white-space:pre-wrap;font-size:12px;line-height:1.6;background:#faf7f1;border:1px solid #e6ddd0;border-radius:8px;padding:12px;max-height:340px;overflow:auto;">${escapeHtml(r.storyboardPrompt || "")}</pre>
    ${r.character ? `<div style="font-size:12px;color:#7a6a55;margin-top:6px;"><b>主角:</b>${escapeHtml(r.character)}</div>` : ""}
    ${refs.length ? `<div style="margin-top:8px;font-size:12px;color:#7a6a55;"><b>参考图清单</b>(传进即梦/出片做 @图片 引用,锁角色一致):</div><ol style="font-size:12px;color:#3a2c1c;margin:4px 0;padding-left:18px;line-height:1.6;">${refs.map((x) => `<li><b>${escapeHtml(x.slot || "")}</b>:${escapeHtml(x.desc || "")}</li>`).join("")}</ol>` : ""}
    <div style="margin-top:10px;border-top:1px dashed #e6ddd0;padding-top:10px;">
      <button class="primary" data-gen-film style="font-size:12px;padding:6px 14px;background:#1a7f37;border-color:#1a7f37;" ${state.filmStatus === "loading" ? "disabled" : ""}>${state.filmStatus === "loading" ? "出片中…" : `🎬 一键出视频(Kie · 约 ${Math.ceil((Number(r.durationSec) || 15) * 0.7)} 元)`}</button>
      <span style="font-size:11px;color:#9a8a70;margin-left:8px;">480P最省档,点了会再确认价格。配音+BGM下一步加。</span>
      ${state.filmMessage ? `<div class="status-strip ${state.filmStatus === "error" ? "" : "success"}" style="margin-top:8px;">${escapeHtml(state.filmMessage)}</div>` : ""}
      ${state.filmUrl ? `<div style="margin-top:8px;"><video src="${escapeHtml(state.filmUrl)}" controls style="max-width:240px;border-radius:8px;display:block;"></video><div style="margin-top:4px;font-size:12px;"><a href="${escapeHtml(state.filmUrl)}" download="视频.mp4">⬇️ 下载视频(纯画面)</a></div></div>` : ""}
    </div>
    ${state.filmUrl ? `<div style="margin-top:10px;border-top:1px dashed #e6ddd0;padding-top:10px;">
      <button class="primary" data-gen-final style="font-size:12px;padding:6px 14px;background:#b8860b;border-color:#b8860b;" ${state.finalFilmStatus === "loading" ? "disabled" : ""}>${state.finalFilmStatus === "loading" ? "成品合成中…" : "🎵 加配音+字幕+BGM 出成品"}</button>
      <span style="font-size:11px;color:#9a8a70;margin-left:8px;">读旁白配音、烧字幕、垫治愈背景乐,合成可直接发的成片(免费)。</span>
      ${state.finalFilmMessage ? `<div class="status-strip ${state.finalFilmStatus === "error" ? "" : "success"}" style="margin-top:8px;">${escapeHtml(state.finalFilmMessage)}</div>` : ""}
      ${state.finalFilmUrl ? `<div style="margin-top:8px;"><video src="${escapeHtml(state.finalFilmUrl)}" controls style="max-width:240px;border-radius:8px;display:block;"></video><div style="margin-top:4px;font-size:12px;"><a href="${escapeHtml(state.finalFilmUrl)}" download="成品.mp4">⬇️ 下载成品(配音+字幕+BGM)</a></div></div>` : ""}
    </div>` : ""}
  </div>`;
}

async function generateSeedanceFilm() {
  const r = state.seedanceResult;
  if (!r || !r.storyboardPrompt) { state.filmStatus = "error"; state.filmMessage = "请先生成分镜。"; renderToday(); return; }
  const dur = Math.min(15, Math.max(4, Number(r.durationSec) || 15));
  const yuan = Math.ceil(dur * 0.7);
  if (!window.confirm(`出这条视频:Kie Seedance,${dur}秒,480P,约 ${yuan} 元(¥)。确认出片?`)) return;
  state.filmStatus = "loading"; state.filmUrl = ""; state.filmMessage = "正在用 Kie 出视频(约 1-3 分钟,别关页面)…"; renderToday();
  try {
    const aspect = r.aspect || "9:16";
    const jobId = `sdfilm-${Date.now().toString(36)}`;
    // 主角是小妹 → 传人设参考图,视频里小妹和图文/漫画同一形象
    const isXiaomei = /小妹/.test(state.seedanceRole || "");
    const refUrls = isXiaomei ? ["http://122.51.218.154/ai-native-v2/media/persona/full_flat.jpg"] : [];
    const clip = { page: 1, prompt: r.storyboardPrompt };
    if (refUrls.length) clip.referenceImageUrls = refUrls;
    const res = await fetch(apiPath("/api/video-clip/start"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jobId, aspect, duration: dur, referenceImageUrls: refUrls, clips: [clip] }) });
    const sj = await res.json().catch(() => ({}));
    if (!res.ok || !sj.ok) throw new Error(sj.message || sj.error || "Kie 启动失败");
    const realId = sj.jobId || jobId;
    for (let i = 0; i < 90; i += 1) {
      await new Promise((rs) => setTimeout(rs, 5000));
      const st = await fetch(apiPath(`/api/video-clip/status?jobId=${encodeURIComponent(realId)}`)).then((x) => x.json()).catch(() => ({}));
      const url = (st.manifest?.publicFiles || [])[0] || "";
      if (url) { state.filmStatus = "done"; state.filmUrl = url; state.filmMessage = "✅ 视频出来了(纯画面)。下一步给它加配音+BGM+字幕。觉得行先拿去发。"; renderToday(); return; }
      if (st.status === "error") throw new Error("Kie 出片失败");
      state.filmMessage = `Kie 出片中…(${i + 1}/90,较慢请耐心)`; renderToday();
    }
    state.filmStatus = "done"; state.filmMessage = "出片较久,任务在 Kie 跑,稍后再点一次查询(不重复扣费)。"; renderToday();
  } catch (e) { state.filmStatus = "error"; state.filmMessage = `出片失败:${e.message}`; renderToday(); }
}

// 出成品:已出的纯画面视频 + 旁白配音 + 烧字幕 + 治愈BGM → 可发成片(本地合成,免费)
async function generateFinalFilm() {
  const r = state.seedanceResult || {};
  if (!state.filmUrl) { state.finalFilmStatus = "error"; state.finalFilmMessage = "请先出视频(纯画面)。"; renderToday(); return; }
  const voiceover = String(r.voiceover || confirmedCopyText() || "").trim();
  if (!voiceover) { state.finalFilmStatus = "error"; state.finalFilmMessage = "没有旁白稿(分镜里没生成 voiceover),无法配音。"; renderToday(); return; }
  const dur = Math.min(15, Math.max(4, Number(r.durationSec) || 15));
  state.finalFilmStatus = "loading"; state.finalFilmUrl = ""; state.finalFilmMessage = "正在配音 + 烧字幕 + 垫背景乐,合成成片(约 30-60 秒,别关页面)…"; renderToday();
  try {
    const jobId = `film-${Date.now().toString(36)}`;
    const res = await fetch(apiPath("/api/seedance-film/finalize/start"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jobId, videoUrl: state.filmUrl, voiceover, durationSec: dur }) });
    const sj = await res.json().catch(() => ({}));
    if (!res.ok || !sj.ok) throw new Error(sj.message || sj.error || "合成启动失败");
    const realId = sj.jobId || jobId;
    for (let i = 0; i < 40; i += 1) {
      await new Promise((rs) => setTimeout(rs, 4000));
      const st = await fetch(apiPath(`/api/seedance-film/finalize/status?jobId=${encodeURIComponent(realId)}`)).then((x) => x.json()).catch(() => ({}));
      if (st.status === "done" && st.url) { state.finalFilmStatus = "done"; state.finalFilmUrl = apiPath(st.url); state.finalFilmMessage = "✅ 成品出来了(配音 + 字幕 + 背景乐),可直接发。"; renderToday(); return; }
      if (st.status === "error") throw new Error(st.error || "合成失败");
      state.finalFilmMessage = `合成中…(${i + 1})`; renderToday();
    }
    state.finalFilmStatus = "error"; state.finalFilmMessage = "合成超时,请重试。"; renderToday();
  } catch (e) { state.finalFilmStatus = "error"; state.finalFilmMessage = `合成失败:${e.message}`; renderToday(); }
}

async function generateSeedanceStoryboard() {
  const title = state.selectedTitle || selectedTopic()?.theme || selectedTopic()?.title || "";
  const body = confirmedCopyText() || "";
  if (!body) { state.seedanceStatus = "error"; state.seedanceMessage = "请先确认本篇文案,再生成视频分镜。"; renderToday(); return; }
  const dur = byId("workArea")?.querySelector("[data-seedance-dur]")?.value || "15";
  const aspect = byId("workArea")?.querySelector("[data-seedance-aspect]")?.value || "9:16";
  const role = byId("workArea")?.querySelector("[data-seedance-role]")?.value || "小妹卡通形象";
  state.seedanceRole = role; // 记住主角,出片时小妹要传人设参考图锁一致
  state.seedanceStatus = "loading"; state.seedanceResult = null;
  state.seedanceMessage = "正在把文案变成故事分镜(拟人角色+故事+钩子)…约 20-60 秒";
  renderToday();
  try {
    const clayStyle = state.videoFormat === "clay" ? "\n视觉风格:黏土定格动画(claymation / stop-motion),手工捏制质感、柔和影棚光、微距实拍感,温暖治愈,反 AI 塑料感。" : "";
    const content = `本篇文案:标题《${title}》。\n${body}\n业务线:${state.businessLine || state.workspace || ""}\n主角偏好:${role}(卡通形象,非真人脸)\n时长:${dur}秒\n画幅:${aspect}${clayStyle}`;
    const res = await fetch(apiPath("/api/skills/run"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ skill: "seedance-prompt", content }) });
    const d = await res.json().catch(() => ({}));
    const r = d?.result || {};
    if (r && r.storyboardPrompt) {
      state.seedanceResult = r; state.seedanceStatus = "done";
      state.seedanceMessage = "分镜已生成。复制粘进即梦;按参考图清单出角色/场景图做 @图片 引用,人物就不跳戏。";
    } else { state.seedanceStatus = "error"; state.seedanceMessage = d.message || d.error || "生成失败,稍后再试。"; }
  } catch (e) { state.seedanceStatus = "error"; state.seedanceMessage = `失败:${e.message}`; }
  renderToday();
}

function autoApplyRecommendedVisualStyle() {
  const rec = recommendVisualRouteClean();
  // 每账号(业务线)默认风格优先：账号锁了风格就用它，保持品牌一致，不被单篇内容推荐切走。
  const lineKey = state.businessLine || state.workspace || "";
  const lineStyle = (state.visualStyleByLine || {})[lineKey];
  const pick = (lineStyle && visualStyles.some((s) => s.id === lineStyle)) ? lineStyle : rec.id;
  if (!state.visualStyleTouched && pick && pick !== state.visualStyle && state.xhsCardExportStatus !== "loading") {
    state.visualStyle = pick;
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

// —— 配图方案墙:风格 × 打法 ——
function visualPlayName(id) { return ((typeof VISUAL_PLAYS !== "undefined" ? VISUAL_PLAYS : []).find((p) => p.id === id) || {}).name || id; }
function defaultPlayForStyle(id) {
  if (["infographic-engine", "xhs-knowledge-card", "juju-organizing", "xiaohei-metaphor"].includes(id)) return "carousel";
  if (["svarbova-poster", "typography-poster", "poster-cinematic"].includes(id)) return "magazine";
  return "cover";
}
function styleEmoji(id) {
  return ({ "xiaohei-metaphor": "🧸", "juju-organizing": "🗂️", "guizang-editorial": "📖", "xhs-knowledge-card": "🃏", "poster-cinematic": "🎬", "typography-poster": "🔤", "infographic-engine": "📊", "realistic-photo": "📷", "art-illustration": "🎨", "ink-poster": "🖌️", "product-commerce": "🛍️", "cute-3d-toy": "🧩", "svarbova-poster": "📰" })[id] || "🖼️";
}
function styleGradient(id) {
  let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `linear-gradient(135deg, hsl(${h} 36% 79%), hsl(${(h + 38) % 360} 30% 64%))`;
}
function changeVisualPlay(playId) {
  if (!(typeof VISUAL_PLAYS !== "undefined" && VISUAL_PLAYS.some((p) => p.id === playId))) return;
  state.visualPlay = playId; state.visualPlayTouched = true; renderToday();
}
function renderVisualRoutePickerClean(locked, recommendedId = "") {
  const styles = (typeof visualStyles !== "undefined" && Array.isArray(visualStyles)) ? visualStyles : [];
  const plays = (typeof VISUAL_PLAYS !== "undefined") ? VISUAL_PLAYS : [];
  const curStyle = state.visualStyle, curPlay = state.visualPlay || defaultPlayForStyle(curStyle);
  const sName = (id) => (styles.find((s) => s.id === id) || {}).title || id;
  const prevBg = (id) => `url('${apiPath("/media/persona/style-previews/" + id + ".png")}') center/cover, ${styleGradient(id)}`; // 真预览图 + 渐变兜底(图没好/404 自动回退渐变)
  // 推荐 3 个方案(风格 × 打法)
  const recs = [];
  const add = (s, p, reason) => { if (s && styles.some((x) => x.id === s) && !recs.some((r) => r.s === s)) recs.push({ s, p, reason }); };
  add(recommendedId, defaultPlayForStyle(recommendedId), "最配这篇文案的画风");
  add("svarbova-poster", "magazine", "高级杂志封面感,涨粉力强");
  add("infographic-engine", "carousel", "干货拆成多页,收藏率高");
  add("poster-cinematic", "cover", "冲击力主视觉,适合首图");
  const rec3 = recs.slice(0, 3);
  const css = `<style>
.plan-wall{font-size:14px;}
.plan-wall .pw-sec{font-size:15px;font-weight:800;margin:16px 0 10px;border-left:5px solid #c8761f;padding-left:10px;}
.plan-wall .pw-tip{color:#8a7d68;font-size:13px;margin:-4px 0 12px;}
.plan-wall .rec{display:flex;gap:12px;flex-wrap:wrap;}
.plan-wall .plan-card{flex:1;min-width:200px;text-align:left;background:#fff;border:2px solid #ece3d4;border-radius:14px;overflow:hidden;padding:0;cursor:pointer;content-visibility:auto;contain-intrinsic-size:auto 190px;}
.plan-wall .plan-card.on{border-color:#c8761f;}
.plan-wall .plan-card .pv{height:128px;position:relative;}
.plan-wall .plan-card .pv .play{position:absolute;left:8px;top:8px;background:rgba(0,0,0,.5);color:#fff;font-size:12px;padding:2px 8px;border-radius:12px;}
.plan-wall .plan-card .pv .star{position:absolute;right:8px;top:8px;background:#c8761f;color:#fff;font-size:12px;font-weight:700;padding:2px 8px;border-radius:12px;}
.plan-wall .plan-card .cb{padding:9px 11px;}
.plan-wall .plan-card .cb b{font-size:15px;}
.plan-wall .plan-card .cb .ply{color:#c8761f;font-weight:700;font-size:13px;}
.plan-wall .plan-card .cb p{color:#8a7d68;font-size:12px;margin-top:3px;line-height:1.4;}
.plan-wall .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;}
.plan-wall .g{background:#fff;border:1px solid #ece3d4;border-radius:10px;overflow:hidden;content-visibility:auto;contain-intrinsic-size:auto 140px;}
.plan-wall .g.on{border-color:#c8761f;box-shadow:0 0 0 1px #c8761f;}
.plan-wall .g .gp{width:100%;height:76px;border:0;font-size:30px;cursor:pointer;display:block;}
.plan-wall .g b{display:block;font-size:13px;padding:6px 8px 2px;}
.plan-wall .g .t{display:flex;gap:4px;padding:2px 8px 8px;flex-wrap:wrap;}
.plan-wall .g .tag{font-size:11px;background:#f3ece0;color:#9a8a70;border:0;border-radius:9px;padding:2px 7px;cursor:pointer;}
.plan-wall .g .tag.on{background:#c8761f;color:#fff;}
</style>`;
  const recHtml = rec3.map((r, i) => `<button type="button" class="plan-card ${r.s === curStyle ? "on" : ""}" data-visual-style="${escapeHtml(r.s)}" data-visual-play="${escapeHtml(r.p)}" ${locked ? "disabled" : ""}><div class="pv" style="background:${prevBg(r.s)}"><span class="play">${escapeHtml(styleEmoji(r.s) + " " + visualPlayName(r.p))}</span>${i === 0 ? `<span class="star">✓ 推荐</span>` : ""}</div><div class="cb"><b>${escapeHtml(sName(r.s))}</b> <span class="ply">× ${escapeHtml(visualPlayName(r.p))}</span><p>${escapeHtml(r.reason)}</p></div></button>`).join("");
  const gridHtml = styles.map((item) => `<div class="g ${item.id === curStyle ? "on" : ""}"><button type="button" class="gp" style="background:${prevBg(item.id)}" data-visual-style="${escapeHtml(item.id)}" ${locked ? "disabled" : ""} aria-label="${escapeHtml(item.title)}"></button><b>${escapeHtml(item.title)}${item.id === recommendedId ? " ⭐" : ""}</b><div class="t">${plays.map((p) => `<button type="button" class="tag ${item.id === curStyle && p.id === curPlay ? "on" : ""}" data-visual-style="${escapeHtml(item.id)}" data-visual-play="${escapeHtml(p.id)}" ${locked ? "disabled" : ""}>${escapeHtml(p.name)}</button>`).join("")}</div></div>`).join("");
  return `${css}<div class="plan-wall"><div class="pw-sec">⭐ 为你推荐</div><div class="pw-tip">按这篇文案推荐 3 个方案(风格 × 打法),挑一个直接出;也可下面自由挑。</div><div class="rec">${recHtml}</div><div class="pw-sec">全部风格 · 选画风 + 打法</div><div class="grid">${gridHtml}</div></div>`;
}

function bindWorkAreaActions() {
  try {
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
  byId("workArea")?.querySelector("[data-generate-cover]")?.addEventListener("click", () => generateCoverFromContent());
  byId("workArea")?.querySelector("[data-cover-watermark]")?.addEventListener("change", (e) => { state.coverWatermark = e.target.checked ? "longka" : ""; renderToday(); });
  byId("workArea")?.querySelector("[data-make-magazine]")?.addEventListener("click", () => generateMagazineCover());
  byId("workArea")?.querySelectorAll("[data-cover-mode]")?.forEach((b) => b.addEventListener("click", () => { state.coverMode = b.getAttribute("data-cover-mode"); renderToday(); }));
  byId("workArea")?.querySelector("[data-judge-inner]")?.addEventListener("click", () => judgeInnerCards());
  byId("workArea")?.querySelectorAll("[data-video-format]")?.forEach((b) => b.addEventListener("click", () => {
    state.videoFormat = b.getAttribute("data-video-format"); renderToday();
  }));
  byId("workArea")?.querySelector("[data-gen-comic]")?.addEventListener("click", () => generateXiaomeiComic());
  byId("workArea")?.querySelector("[data-gen-seedance]")?.addEventListener("click", () => generateSeedanceStoryboard());
  byId("workArea")?.querySelector("[data-gen-film]")?.addEventListener("click", () => generateSeedanceFilm());
  byId("workArea")?.querySelector("[data-gen-final]")?.addEventListener("click", () => generateFinalFilm());
  byId("workArea")?.querySelector("[data-copy-seedance]")?.addEventListener("click", () => {
    const t = state.seedanceResult?.storyboardPrompt || "";
    if (t && typeof copyTextToClipboard === "function") copyTextToClipboard(t).then(() => { state.seedanceMessage = "✓ 分镜已复制,去即梦粘贴生成。"; renderToday(); });
  });
  byId("workArea")?.querySelectorAll("[data-pick-ref]").forEach((b) => {
    b.addEventListener("click", () => { state.selectedReferenceImage = b.dataset.pickRef || ""; renderToday(); });
  });
  // 知识点面板:勾选/全选/清空/按勾选重生成
  $$("#workArea [data-kb-pick]").forEach((cb) => cb.addEventListener("change", () => {
    const id = cb.getAttribute("data-kb-pick");
    const set = new Set(state.selectedKnowledgeIds || []);
    if (cb.checked) set.add(id); else set.delete(id);
    state.selectedKnowledgeIds = [...set];
    renderToday();
  }));
  byId("workArea")?.querySelector("[data-kb-all]")?.addEventListener("click", () => {
    state.selectedKnowledgeIds = (state.knowledgeCards || []).map((c) => c.id); renderToday();
  });
  byId("workArea")?.querySelector("[data-kb-none]")?.addEventListener("click", () => {
    state.selectedKnowledgeIds = []; renderToday();
  });
  byId("workArea")?.querySelector("[data-kb-regen]")?.addEventListener("click", () => {
    state.draft = ""; state.draftStatus = "idle"; state.draftError = ""; generateSopDraft();
  });
  byId("workArea")?.querySelectorAll("[data-pick-cover]").forEach((b) => {
    b.addEventListener("click", () => {
      const i = Number(b.dataset.pickCover);
      const o = (Array.isArray(state.coverOptions) ? state.coverOptions : [])[i];
      if (o && o.url) { state.coverImage = o.url; state.coverHook = o.hook || ""; renderToday(); }
    });
  });
  byId("workArea")?.querySelector("[data-run-precheck]")?.addEventListener("click", () => generateContentPrecheck());
  byId("workArea")?.querySelector("[data-run-compliance]")?.addEventListener("click", () => runComplianceScan());
  byId("workArea")?.querySelector("[data-compliance-rewrite]")?.addEventListener("click", () => runComplianceRewrite());
  byId("workArea")?.querySelector("[data-apply-compliance]")?.addEventListener("click", () => applyComplianceRewrite());
  byId("workArea")?.querySelector("[data-optimize-by-precheck]")?.addEventListener("click", () => optimizeByPrecheck());
  byId("workArea")?.querySelector("[data-undo-optimize]")?.addEventListener("click", () => {
    const before = state.optimizeDiff?.before || "";
    state.optimizeDiff = null;
    if (before) saveInlineCopyEdit(before); else renderToday();
  });
  byId("workArea")?.querySelector("[data-save-inline-copy]")?.addEventListener("click", () => {
    const ta = byId("workArea")?.querySelector("[data-inline-copy]");
    if (ta) saveInlineCopyEdit(ta.value);
  });
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
  byId("signalKeywordsInput")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      state.signalKeywords = event.target.value.trim();
      loadSignalPanel(state.signalKeywords);
    }
  });
  byId("workArea")?.querySelector("[data-apply-signal-keywords]")?.addEventListener("click", () => {
    const input = byId("signalKeywordsInput");
    if (!input) return;
    state.signalKeywords = input.value.trim();
    loadSignalPanel(state.signalKeywords);
  });
  // 信号卡片"生成选题"按钮 — 委托绑在常驻 #workArea 上,加守卫防每次渲染重复绑定(否则监听器累积→内存泄漏+点击重复触发)
  const _waSignalDelegate = $("#workArea");
  if (_waSignalDelegate && !_waSignalDelegate.dataset.signalDelegateBound) {
    _waSignalDelegate.dataset.signalDelegateBound = "1";
    _waSignalDelegate.addEventListener("click", async (event) => {
    const btn = event.target.closest("[data-use-signal]");
    if (!btn) return;
    const kw = btn.dataset.useSignal;               // 信号标题（具体话题）
    const wsKw = btn.dataset.signalKw || "";         // 工作台关键词（类别）
    const platform = btn.dataset.signalPlatform || "热榜";
    const rank = btn.dataset.signalRank || "";
    const signalUrl = btn.dataset.signalUrl || "";   // 原文 URL
    if (!kw) return;
    // 保存信号信息到 state
    state.signalKeywords = kw;
    state.signalSearchQuery = kw;
    state.signalKw = wsKw;
    state.signalUrl = signalUrl;
    state.sourceChannel = "signal-search";
    state.logs = [`已选热点信号：${kw}（${platform}${rank ? " #"+rank : ""}）${signalUrl ? "，正在抓取原文..." : "，正在搜索全文..."}`];
    state.assetStatus = signalUrl ? "正在抓取信号原文" : "正在搜索信号全文";
    const input = byId("signalKeywordsInput");
    if (input) input.value = kw;
    renderToday();
    // 走 xcrawl 抓取原文 → 构建选题
    await readMaterials();
    });
  }
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
  byId("workArea")?.querySelector("[data-refresh-titles]")?.addEventListener("click", () => {
    state.titleChoices = [];
    state.titleChoiceKey = "";
    state.titleErrorMessage = "";
    state._llmTitleCallKey = null;
    renderToday();
    requestAnimationFrame(() => triggerLlmTitleGeneration());
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
  byId("workArea")?.querySelector("[data-corpus-search]")?.addEventListener("click", () => doCorpusSearch());
  byId("workArea")?.querySelector("#corpusQ")?.addEventListener("keydown", (e) => { if (e.key === "Enter") doCorpusSearch(); });
  byId("workArea")?.querySelectorAll("[data-visual-style]").forEach((button) => {
    button.addEventListener("click", () => {
      const sid = button.dataset.visualStyle, pid = button.dataset.visualPlay;
      if (pid) { state.visualPlay = pid; state.visualPlayTouched = true; }
      if (sid && sid !== state.visualStyle) changeVisualStyle(sid); // changeVisualStyle 内部已重渲
      else renderToday(); // 同风格只换打法 / 纯打法切换 → 重渲反映选中
    });
  });
  byId("workArea")?.querySelector("[data-generate-xiaohei-cards]")?.addEventListener("click", () => generateXiaoheiCards());
  byId("workArea")?.querySelector("[data-restore-latest-xiaohei]")?.addEventListener("click", () => restoreLatestXiaoheiCards());
  byId("workArea")?.querySelector("[data-generate-video-clips]")?.addEventListener("click", () => generateVideoClips());
  byId("workArea")?.querySelector("[data-restore-video-clips]")?.addEventListener("click", () => restoreLatestVideoClips());
  byId("workArea")?.querySelector("[data-generate-oral-video]")?.addEventListener("click", () => generateOralVideo());
  byId("workArea")?.querySelector("[data-gen-video-script]")?.addEventListener("click", () => loadVideoScript());
  byId("workArea")?.querySelectorAll("[data-video-clip-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.videoClipMode = button.dataset.videoClipMode === "script" ? "script" : "frames";
      renderToday();
    });
  });
  byId("workArea")?.querySelectorAll("[data-video-tier]").forEach((button) => {
    button.addEventListener("click", () => {
      state.videoTier = button.dataset.videoTier || "economy";
      renderToday();
    });
  });
  byId("workArea")?.querySelector("[data-export-xhs-cards]")?.addEventListener("click", () => exportCleanXhsCardPlan());
  byId("workArea")?.querySelector("[data-archive-final-work]")?.addEventListener("click", () => archiveFinalWork());
  byId("workArea")?.querySelector("[data-finish-work]")?.addEventListener("click", async () => {
    await archiveFinalWork();
    // 保存成功(作品已进 finalWorks)→ 直接跳到「作品记录」,小妹能看到已保存
    if (state.finalWorks.some((w) => w.id === currentFinalWorkId())) setRoute("records");
  });
  byId("workArea")?.querySelector("[data-register-published]")?.addEventListener("click", () => registerPublishedFromArchive());
  } catch (e) { console.error("bindWorkAreaActions error:", e); }
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
  if (name === "import-jianghu") importJianghuFile();
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


// ── canJumpTo 带提示（P1-3）──────────────────────────────────────────
function showStepBlockToast(step) {
  const reasons = {
    5: "请先完成第 4 步：读取真实素材后才能生成选题。",
    6: "请先完成第 5 步：选定选题后才能生成标题。",
    7: "请先完成第 6 步：选定标题后才能生成正文。",
    8: "请先完成第 7 步：生成初稿后才能进入体检。",
    9: "请先完成第 8 步：体检通过后才能确认文案。",
    10: "请先完成第 9 步：确认文案后才能进入制作。",
  };
  const msg = reasons[step] || `请先完成第 ${step - 1} 步。`;
  const existing = document.querySelector(".longka-toast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.className = "longka-toast";
  toast.textContent = msg;
  toast.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1a1a2e;color:#fff;padding:10px 20px;border-radius:8px;z-index:9999;font-size:14px;pointer-events:none;opacity:1;transition:opacity 0.3s";
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = "0"; setTimeout(() => toast.remove(), 300); }, 2500);
}

// P0-2: API Key 配置引导弹窗
function showApiKeyModal() {
  const existing = document.querySelector(".longka-api-key-modal");
  if (existing) return;
  const modal = document.createElement("div");
  modal.className = "longka-api-key-modal";
  modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:9999";
  modal.innerHTML = `<div style="background:#fff;border-radius:12px;padding:32px;max-width:460px;width:90%">
    <h3 style="margin:0 0 12px;font-size:18px">⚠️ AI 模型 Key 未配置</h3>
    <p style="margin:0 0 16px;color:#555;font-size:14px;line-height:1.6">
      文案生成需要 AI 模型 API Key。请在服务器的 <code>.env</code> 文件中配置：<br>
      <code>AI_API_KEY=your-api-key</code><br><br>
      配置后重启 server.mjs，再返回这里重试。
    </p>
    <div style="display:flex;gap:12px;justify-content:flex-end">
      <button onclick="this.closest('.longka-api-key-modal').remove()"
        style="padding:8px 20px;border:1px solid #ddd;border-radius:6px;cursor:pointer;background:#fff">关闭</button>
      <button onclick="setRoute('settings');this.closest('.longka-api-key-modal').remove()"
        style="padding:8px 20px;background:#1a1a2e;color:#fff;border:none;border-radius:6px;cursor:pointer">前往设置</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
}

// 小红书 CDP 登录引导弹窗
function showCdpSetupModal() {
  const existing = document.querySelector(".longka-cdp-modal");
  if (existing) return;
  const modal = document.createElement("div");
  modal.className = "longka-cdp-modal";
  modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:9999";
  modal.innerHTML = `<div style="background:#fff;border-radius:12px;padding:32px;max-width:480px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
    <h3 style="margin:0 0 8px;font-size:18px">📱 小红书 CDP 登录</h3>
    <p style="margin:0 0 20px;color:#666;font-size:13px;line-height:1.5">
      搜索小红书内容需要登录态 Cookie。按以下步骤操作：
    </p>
    <ol style="margin:0 0 20px;padding:0 0 0 20px;color:#444;font-size:14px;line-height:1.8">
      <li>点击下方按钮启动 Chrome CDP 浏览器</li>
      <li>在弹出的 Chrome 窗口中打开 <b>xiaohongshu.com</b></li>
      <li>使用<b>扫码</b>或<b>手机号登录</b></li>
      <li>登录成功后，点击"已扫码，读取 Cookie"</li>
    </ol>
    <div id="cdpStatus" style="padding:10px 14px;background:#f5f5f5;border-radius:8px;margin-bottom:16px;font-size:13px;color:#555;min-height:20px">
      等待操作...
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <button id="cdpStartBtn" onclick="handleCdpStart()"
        style="padding:8px 18px;background:#1a1a2e;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px">🚀 启动 CDP 浏览器</button>
      <button id="cdpSyncBtn" onclick="handleCdpSync()"
        style="padding:8px 18px;background:#315d4b;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px">✅ 已扫码，读取 Cookie</button>
      <button onclick="this.closest('.longka-cdp-modal').remove()"
        style="padding:8px 18px;border:1px solid #ddd;border-radius:6px;cursor:pointer;background:#fff;font-size:13px">关闭</button>
    </div>
    <div id="cdpRetryArea" style="display:none;margin-top:16px;padding-top:16px;border-top:1px solid #eee">
      <button id="cdpRetryBtn" onclick="handleCdpRetry()"
        style="padding:8px 18px;background:#315d4b;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px">🔄 Cookie 已就绪，继续信号采集</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
}

// CDP: 启动 Chrome 浏览器
async function handleCdpStart() {
  const btn = byId("cdpStartBtn");
  const status = byId("cdpStatus");
  if (!btn || !status) return;
  btn.disabled = true;
  btn.style.opacity = "0.6";
  status.textContent = "正在启动 Chrome CDP 浏览器...";
  try {
    const res = await fetch(apiPath("/api/cdp/start-xhs-browser"), { method: "POST" });
    const data = await res.json();
    if (data.ok) {
      status.textContent = "✅ Chrome 已弹出。请在该窗口打开 xiaohongshu.com 并扫码登录。";
    } else {
      status.textContent = `❌ 启动失败：${data.message || "未知错误"}`;
      btn.disabled = false;
      btn.style.opacity = "1";
    }
  } catch (err) {
    status.textContent = `❌ 请求失败：${err.message}`;
    btn.disabled = false;
    btn.style.opacity = "1";
  }
}

// CDP: 同步 Cookie
async function handleCdpSync() {
  const btn = byId("cdpSyncBtn");
  const status = byId("cdpStatus");
  const retryArea = byId("cdpRetryArea");
  if (!btn || !status) return;
  btn.disabled = true;
  btn.style.opacity = "0.6";
  status.textContent = "正在读取 CDP Cookie...";
  try {
    const res = await fetch(apiPath("/api/cdp/sync-xhs-cookie"), { method: "POST" });
    const data = await res.json();
    if (data.ok) {
      status.textContent = `✅ Cookie 同步成功！共 ${data.cookieCount} 个 Cookie。`;
      if (retryArea) retryArea.style.display = "block";
    } else {
      status.textContent = `❌ ${data.message || "同步失败"}`;
      btn.disabled = false;
      btn.style.opacity = "1";
    }
  } catch (err) {
    status.textContent = `❌ 请求失败：${err.message}`;
    btn.disabled = false;
    btn.style.opacity = "1";
  }
}

// CDP: Cookie 就绪后重试信号采集
async function handleCdpRetry() {
  const modal = document.querySelector(".longka-cdp-modal");
  if (modal) modal.remove();
  state.assetStatus = "Cookie 已就绪，重新采集信号";
  renderToday();
  await readMaterials();
}

if (!restoreWorkbenchSnapshot()) {
  // 本地快照没了（清缓存/换浏览器/超限）→ 从 122 服务器存档恢复
  serverRestoreSnapshot().then((ok) => { if (ok) { try { renderToday(); } catch (e) { /* noop */ } } });
}
renderToday();
