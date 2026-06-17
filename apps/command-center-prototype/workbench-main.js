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
  // 发布前判断 / 封面 / 视频片段都是“这一篇”的结果，换母题/换文案时必须清掉，
  // 否则会把上一篇的判断结论和封面图带进新图文（曾出现的串档 bug）。
  state.precheckStatus = "idle";
  state.precheckResult = null;
  state.precheckMessage = "";
  state.coverStatus = "idle";
  state.coverImage = "";
  state.coverMessage = "";
  state.coverJobId = "";
  state.coverHooks = [];
  state.videoClipStatus = "idle";
  state.videoClipMessage = "";
  state.videoClipMode = "frames";
  state.videoClipJobId = "";
  state.videoClipProgress = null;
  state.videoClipManifest = null;
  state.optimizeDiff = null;
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
      <button class="sc-btn" data-use-signal="${escapeHtml(hit.title)}" data-signal-kw="${escapeHtml(firstKw)}" data-signal-platform="${escapeHtml(hit.platform || "")}" data-signal-rank="${hit.rank || ""}" data-signal-url="${escapeHtml(hit.url || "")}">生成选题</button>
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
  const lines = String(copy || "").split(/\n+/).map((line) => line.trim()).filter(Boolean).slice(0, 10);
  const frameCount = (Array.isArray(currentVisualManifest()?.publicFiles) ? currentVisualManifest().publicFiles : []).filter((u) => /^https?:\/\//.test(String(u))).length;
  const isLoading = state.videoClipStatus === "loading";
  const mode = state.videoClipMode === "script" ? "script" : "frames";
  const locked = !state.copyConfirmed;
  const genLabel = isLoading ? "出片中…" : (mode === "script" ? "按脚本生成视频片段" : "让画面动起来（生成视频片段）");
  return `<div class="article-layout-preview">
    <div class="title-group-head"><b>视频脚本预览</b><span>这里检查钩子、口播、分镜和字幕节奏。下面可以把画面做成动态视频片段。</span></div>
    <div class="asset-grid">
      ${lines.map((line, index) => `<article class="asset-item"><b>${index === 0 ? "标题 / 钩子" : `段落 ${index}`}</b><span>${escapeHtml(line)}</span></article>`).join("")}
    </div>
    <div class="video-clip-panel" style="margin-top:14px;border:1px solid #e6ddd0;border-radius:10px;padding:14px;background:#fff;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
        <b style="font-size:15px;">生成视频片段</b>
        <div class="video-clip-mode" style="display:flex;gap:6px;">
          <button type="button" class="ghost ${mode === "frames" ? "active" : ""}" data-video-clip-mode="frames" ${isLoading ? "disabled" : ""}>用已出的画面（默认）</button>
          <button type="button" class="ghost ${mode === "script" ? "active" : ""}" data-video-clip-mode="script" ${isLoading ? "disabled" : ""}>按脚本直接出片</button>
        </div>
      </div>
      <div style="color:#7a6a55;font-size:12px;margin:6px 0 10px;">${mode === "frames"
        ? `把上面【生成图文卡 / 封面】出好的画面做成动起来的短片段（当前可用画面：${frameCount} 张）。没有画面就先在上面出图，或切到“按脚本直接出片”。`
        : "不依赖图片，直接按脚本每段生成一个短视频片段（更自由，但更花时间）。"}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="primary" ${locked || isLoading ? "disabled" : ""} data-generate-video-clips>${escapeHtml(genLabel)}</button>
        <button class="secondary" ${isLoading ? "disabled" : ""} data-restore-video-clips>查询已生成片段</button>
      </div>
      ${state.videoClipMessage ? `<div class="status-strip ${state.videoClipStatus === "error" ? "warn" : ""}" style="margin-top:10px;">${escapeHtml(state.videoClipMessage)}</div>` : ""}
      ${renderVideoClipGallery()}
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
  const savedWork = state.finalWorks.find((item) => item.id === currentFinalWorkId());
  const archived = Boolean(savedWork);
  const published = savedWork?.publishRecord?.status === "published";
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
  const text = `${state.selectedTitle || ""}
${confirmedCopyText() || state.draft || ""}
${topic.theme || ""}
${topic.pain || ""}`;
  if (/流程|步骤|系统|资产|方法|框架|拆解|复盘|教程|清单|整理|梳理/.test(text)) {
    return { id: "juju-organizing", reason: "这篇内容在讲方法和系统，需要把复杂流程整理成一个能进入的现场；卷卷整理比单纯漫画更适合承载步骤和资产关系。" };
  }
  if (/避坑|焦虑|卡住|误区|为什么|不是|别再|问题|失败|痛点|情绪|反差|真相|观点/.test(text)) {
    return { id: "xiaohei-metaphor", reason: "这篇内容有明显痛点和情绪张力，适合用小黑人物场景做隐喻，让读者先被画面抓住。" };
  }
  if (/行业|趋势|洞察|商业|投资人|方法论|战略|中台|底层逻辑/.test(text)) {
    return { id: "guizang-editorial", reason: "这篇内容偏方法论和行业判断，归藏杂志卡更适合呈现高级感和系统感。" };
  }
  return { id: "xhs-knowledge-card", reason: "这篇内容更像可收藏的知识点，宝玉知识卡适合一页一个重点，方便小红书用户收藏。" };
}

function visualRouteNameClean(styleId) {
  if (styleId === "xiaohei-metaphor") return zh("&#23567;&#40657;&#28459;&#30011;&#38544;&#21947;");
  if (styleId === "juju-organizing") return zh("&#21367;&#21367;&#25972;&#29702;&#25554;&#30011;");
  if (styleId === "guizang-editorial") return zh("&#24402;&#34255;&#26434;&#24535;&#21345;");
  if (styleId === "xhs-knowledge-card") return zh("&#23453;&#29577;&#30693;&#35782;&#21345;");
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
  return `<div class="cover-panel" style="border:1px solid #e6ddd0;border-radius:10px;padding:14px;margin:12px 0;background:#fffdf8;">
    <b>小红书封面（独立生成，不用配套图第一页）</b>
    <div style="color:#7a6a55;font-size:13px;margin:4px 0 8px;">从已确认的标题+正文自动提炼诚实钩子，出一张专门封面。封面+标题是点击率第一闸。</div>
    <button class="primary" ${locked || loading ? "disabled" : ""} data-generate-cover>${loading ? "正在生成封面…" : "生成封面"}</button>
    ${state.coverMessage ? `<div class="status-strip ${state.coverStatus === "error" ? "" : "success"}" style="margin-top:8px;">${escapeHtml(state.coverMessage)}</div>` : ""}
    ${hooks.length ? `<div style="margin-top:8px;font-size:13px;"><b>封面钩子候选：</b>${hooks.map((h) => `<span style="display:inline-block;background:#f3ece0;border-radius:6px;padding:2px 8px;margin:2px;">${escapeHtml(h)}</span>`).join("")}</div>` : ""}
    ${state.coverImage ? `<div style="margin-top:10px;"><a href="${escapeHtml(state.coverImage)}" target="_blank" rel="noreferrer"><img src="${escapeHtml(state.coverImage)}" alt="封面" style="max-width:300px;border-radius:8px;border:1px solid #e6ddd0;"></a></div>` : ""}
  </div>`;
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
          <button class="secondary" ${locked ? "disabled" : ""} data-save-inline-copy>保存修改</button>
        </div>
      </div>
      <div style="color:#7a6a55;font-size:12px;margin:6px 0 8px;">${escapeHtml(platformNote)} · 点【做发布前判断】看这篇行不行；有问题就在下面改完点【保存修改】，不用回上一步。觉得行直接往下出图。</div>
      ${copy ? `<textarea data-inline-copy style="width:100%;box-sizing:border-box;min-height:200px;max-height:420px;background:#faf7f1;border:1px solid #e6ddd0;border-radius:8px;padding:12px;font-size:13px;line-height:1.7;font-family:inherit;resize:vertical;">${escapeHtml(copy)}</textarea>
      ${state.copyEditNote ? `<div style="color:#2e7d32;font-size:12px;margin-top:6px;">${escapeHtml(state.copyEditNote)}</div>` : ""}
      ${renderPrecheckResults()}
      ${renderOptimizeDiff()}` : `<div class="status-strip">还没确认文案，请先在上一步确认这版文案。</div>`}
    </div>

    <h3 class="prod-section">① 选配图风格</h3>
    <div class="visual-recommendation"><b>建议：${escapeHtml(visualRouteNameClean(rec.id))}</b><span>${escapeHtml(rec.reason)}</span>${rec.id !== state.visualStyle ? `<button type="button" class="secondary" data-visual-style="${escapeHtml(rec.id)}">换成推荐风格</button>` : `<em>✓ 已用推荐风格</em>`}</div>
    ${renderVisualRoutePickerClean(locked, rec.id)}

    ${(!isWechat && !isVideo && !isMoments) ? `<h3 class="prod-section">② 做封面（小红书第一闸）</h3>${renderCoverPanel()}` : ""}

    <h3 class="prod-section">${(!isWechat && !isVideo && !isMoments) ? "③" : "②"} 生成图文卡（按内容判断张数${plannedCardCount ? ` · 约 ${plannedCardCount} 张` : ""}）</h3>
    <div class="production-grid">
      <article class="production-card ${locked ? "locked" : ""}">
        <b>${escapeHtml(visualRouteNameClean(state.visualStyle))}</b>
        <span>${escapeHtml(visualProductionCopyClean(state.visualStyle))}</span>
        <button class="primary" ${locked || isLoading ? "disabled" : ""} data-generate-xiaohei-cards>${isLoading ? "出图中…" : escapeHtml(primaryVisualActionLabelClean(state.visualStyle))}</button>
        <button class="secondary" ${locked || isLoading ? "disabled" : ""} data-export-xhs-cards>导出当前风格拆页方案</button>
      </article>
      <article class="production-card ${locked ? "locked" : ""}"><b>完成后：一鱼多吃</b><span>图文存为母题资产后，可再切成公众号长文、朋友圈、抖音/视频号脚本。</span><button class="primary" ${locked ? "disabled" : ""} data-step-target="12">保存为母题资产</button></article>
    </div>
    ${renderCleanXhsCardPreview()}
    ${isWechat ? renderWechatArticleImageLayout(copy) : ""}
    ${isVideo ? renderVideoProductionPreview(copy) : ""}
    ${files.length ? `<div class="status-strip success">${zh("&#24050;&#29983;&#25104;")} ${files.length} ${zh("&#24352;&#22270;&#29255;&#65292;&#21487;&#20197;&#23548;&#20986;&#25110;&#20445;&#23384;&#20026;&#27597;&#39064;&#36164;&#20135;&#12290;")}</div>` : ""}
    <div class="actions"><button class="ghost" data-step-target="9">${zh("&#36820;&#22238;&#30830;&#35748;&#25991;&#26696;")}</button><button class="primary" data-step-target="11" ${state.copyConfirmed ? "" : "disabled"}>${zh("&#19979;&#19968;&#27493;&#65306;&#23548;&#20986;&#20132;&#20184;")}</button></div>
  </section>`;
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

function renderVisualRoutePickerClean(locked, recommendedId = "") {
  const routes = [
    { id: "xiaohei-metaphor", name: zh("&#23567;&#40657;&#28459;&#30011;"), use: zh("&#20154;&#29289;&#38544;&#21947;&#12289;&#36991;&#22353;&#12289;&#27969;&#31243;&#12289;&#24773;&#32490;&#22330;&#26223;&#65292;&#36866;&#21512;&#23567;&#32418;&#20070;&#35266;&#28857;&#22270;&#25991;&#12290;"), base: "ian-xiaohei-illustrations" },
    { id: "juju-organizing", name: zh("&#21367;&#21367;&#25972;&#29702;"), use: zh("&#30333;&#24213;&#32440;&#38754;&#25163;&#32472;&#65292;&#25226;&#22797;&#26434;&#20869;&#23481;&#25972;&#29702;&#25104;&#21487;&#36827;&#20837;&#30340;&#29616;&#22330;&#12290;"), base: "juju-content-illustrations" },
    { id: "guizang-editorial", name: zh("&#24402;&#34255;&#26434;&#24535;"), use: zh("&#39640;&#32423;&#26434;&#24535;&#21644; Deck &#24863;&#65292;&#36866;&#21512;&#26041;&#27861;&#35770;&#12289;&#34892;&#19994;&#27934;&#23519;&#12290;"), base: "guizang-social-card / Open Design" },
    { id: "xhs-knowledge-card", name: zh("&#23453;&#29577;&#30693;&#35782;&#21345;"), use: zh("&#28165;&#21333;&#12289;&#27493;&#39588;&#12289;&#23545;&#27604;&#12289;&#25910;&#34255;&#22411;&#20869;&#23481;&#65292;&#19968;&#39029;&#19968;&#20010;&#37325;&#28857;&#12290;"), base: "baoyu-xhs-images / baoyu-infographic" },
  ];
  return `<div class="visual-route-grid">${routes.map((item) => `<button type="button" class="visual-route-card ${item.id === state.visualStyle ? "active" : ""}" data-visual-style="${escapeHtml(item.id)}" ${locked ? "disabled" : ""}><b>${escapeHtml(item.name)}</b><span>${escapeHtml(item.use)}</span>${item.id === recommendedId ? `<em>✓ 推荐</em>` : (item.id === state.visualStyle ? `<em>当前使用</em>` : "")}</button>`).join("")}</div>`;
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
  byId("workArea")?.querySelector("[data-run-precheck]")?.addEventListener("click", () => generateContentPrecheck());
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
  // 信号卡片"生成选题"按钮 — 用 xcrawl 抓取信号原文 URL，构建新鲜选题
  $("#workArea")?.addEventListener("click", async (event) => {
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
  byId("workArea")?.querySelectorAll("[data-visual-style]").forEach((button) => {
    button.addEventListener("click", () => changeVisualStyle(button.dataset.visualStyle));
  });
  byId("workArea")?.querySelector("[data-generate-xiaohei-cards]")?.addEventListener("click", () => generateXiaoheiCards());
  byId("workArea")?.querySelector("[data-restore-latest-xiaohei]")?.addEventListener("click", () => restoreLatestXiaoheiCards());
  byId("workArea")?.querySelector("[data-generate-video-clips]")?.addEventListener("click", () => generateVideoClips());
  byId("workArea")?.querySelector("[data-restore-video-clips]")?.addEventListener("click", () => restoreLatestVideoClips());
  byId("workArea")?.querySelectorAll("[data-video-clip-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.videoClipMode = button.dataset.videoClipMode === "script" ? "script" : "frames";
      renderToday();
    });
  });
  byId("workArea")?.querySelector("[data-export-xhs-cards]")?.addEventListener("click", () => exportCleanXhsCardPlan());
  byId("workArea")?.querySelector("[data-archive-final-work]")?.addEventListener("click", () => archiveFinalWork());
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

restoreWorkbenchSnapshot();
renderToday();
