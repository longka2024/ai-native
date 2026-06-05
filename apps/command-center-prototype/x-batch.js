const state = {
  runIds: [],
  collecting: false,
  logs: [],
  batch: null,
  lastCard: null,
  embedded: false,
  flowStep: 1,
};

const $ = (selector) => document.querySelector(selector);

if (new URLSearchParams(location.search).get("embedded") === "1") {
  state.embedded = true;
  document.body.classList.add("embedded");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setFlowStep(step, guideText) {
  state.flowStep = Math.max(1, Math.min(5, step));
  document.querySelectorAll("[data-flow-step]").forEach((button) => {
    const no = Number(button.dataset.flowStep);
    button.classList.toggle("active", no === state.flowStep);
    button.classList.toggle("done", no < state.flowStep);
  });
  if (guideText) {
    $("#operatorGuide").innerHTML = `<b>现在该做什么？</b><span>${escapeHtml(guideText)}</span>`;
  }
}

function setStatus(title, detail) {
  $("#batchStatus").innerHTML = `<b>${escapeHtml(title)}</b><span>${escapeHtml(detail)}</span>`;
}

function log(message) {
  const time = new Date().toLocaleTimeString("zh-CN", { hour12: false });
  state.logs.push(`[${time}] ${message}`);
  $("#logBox").textContent = state.logs.join("\n");
  $("#logBox").scrollTop = $("#logBox").scrollHeight;
}

function resetLogs(message = "等待开始。") {
  state.logs = [];
  $("#logBox").textContent = message;
}

function setProgress(value) {
  $("#progressBar").style.width = `${Math.max(0, Math.min(100, value))}%`;
}

function cleanAccounts(value) {
  return String(value || "")
    .replace(/[，；、]/g, ",")
    .split(/[,\s]+/)
    .map((item) => item.trim().replace(/^@/, ""))
    .filter(Boolean);
}

async function startBatch() {
  if (state.collecting) return;
  const accounts = cleanAccounts($("#accountsInput").value);
  const maxTweets = Math.max(5, Math.min(100, Number($("#maxTweetsInput").value || 30)));
  const pages = Math.max(1, Math.min(5, Number($("#pagesInput").value || 1)));
  if (!accounts.length) {
    setStatus("缺少账号", "请至少输入一个 X 账号");
    setFlowStep(1, "请先输入对标账号。账号可以带 @，也可以一行一个。");
    return;
  }

  state.collecting = true;
  state.batch = null;
  state.lastCard = null;
  state.runIds = [];
  resetLogs();
  renderLists();
  renderCard();
  renderStats(null);
  setProgress(8);
  setStatus("正在采集", `账号 ${accounts.length} 个，每号 ${maxTweets} 条`);
  setFlowStep(2, "正在真实采集。等进度完成后，在第 3 步选择值得入库的帖子。");
  $("#startBatchBtn").disabled = true;
  $("#reloadBatchBtn").disabled = true;
  $("#nextStepCard").hidden = true;
  log(`创建采集批次：${accounts.join(" / ")}`);
  log("正在调用 XCrawl 读取 X 账号最近帖子。这个动作是真实采集，不会填充演示数据。");

  const timers = [
    setTimeout(() => {
      if (!state.collecting) return;
      setProgress(30);
      log("正在等待接口返回。账号越多，等待时间越长。");
    }, 1800),
    setTimeout(() => {
      if (!state.collecting) return;
      setProgress(55);
      log("返回后会按收藏、评论、转发、正文信息量和链接质量筛选。");
    }, 5200),
    setTimeout(() => {
      if (!state.collecting) return;
      setProgress(72);
      log("低质量帖子会进入淘汰样本，并显示大白话原因。");
    }, 9800),
  ];

  try {
    const response = await fetch("/api/collectors/xcrawl/x-user-tweets-batch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accounts, maxTweets, pages, labelType: "radar_seed" }),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.message || result.error || `HTTP ${response.status}`);

    state.runIds = (result.results || []).map((item) => item.run?.id).filter(Boolean);
    log(`采集完成：成功账号 ${result.successCount || 0} 个，原始样本 ${result.totalSampleCount || 0} 条。`);
    log(`本次 runIds：${state.runIds.join(" / ") || "未返回 runId"}`);
    await reloadBatch();
    setProgress(100);
    setStatus("本批次已完成", `runIds ${state.runIds.length} 个，只显示当前批次`);
    setFlowStep(3, "现在看第 3 步。优先从“高价值好帖”里选一条，点“入母题库并拆解”。");
  } catch (error) {
    setProgress(0);
    setStatus("采集失败", error.message);
    setFlowStep(1, "采集失败。你可以换账号重试，或者读取最近一次采集批次继续测试。");
    log(`采集失败：${error.message}`);
  } finally {
    timers.forEach(clearTimeout);
    state.collecting = false;
    $("#startBatchBtn").disabled = false;
    $("#reloadBatchBtn").disabled = state.runIds.length === 0;
  }
}

async function loadLatestBatch() {
  state.collecting = false;
  state.batch = null;
  state.lastCard = null;
  resetLogs();
  setProgress(20);
  setStatus("正在读取最近批次", "不会重新采集，不消耗采集次数");
  setFlowStep(2, "正在读取最近一次 X 批次。读取完成后，在第 3 步人工选择入库。");
  $("#reloadBatchBtn").disabled = true;
  $("#nextStepCard").hidden = true;
  log("开始读取最近一次已完成的 X 采集批次。");

  try {
    const response = await fetch("/api/content-assets/x-latest-batch?limitRuns=3");
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.message || result.error || `HTTP ${response.status}`);
    state.runIds = result.runIds || [];
    state.batch = result;
    setProgress(100);
    renderStats(result);
    renderLists();
    renderCard();
    $("#reloadBatchBtn").disabled = state.runIds.length === 0;
    log(`已读取最近批次：runIds ${state.runIds.join(" / ")}`);
    log(`批次结果：高价值 ${result.buckets?.goodPosts?.length || 0} 条，普通素材 ${result.buckets?.assetOnly?.length || 0} 条，淘汰 ${result.buckets?.rejected?.length || 0} 条。`);
    setStatus("已读取最近批次", `runIds ${state.runIds.length} 个`);
    setFlowStep(3, "现在看第 3 步。优先从“高价值好帖”里选一条，点“入母题库并拆解”。");
  } catch (error) {
    setProgress(0);
    setStatus("读取失败", error.message);
    setFlowStep(1, "没有读到最近批次。你可以输入账号重新采集。");
    log(`读取最近批次失败：${error.message}`);
  }
}

async function reloadBatch() {
  if (!state.runIds.length) {
    log("没有 runIds，无法读取当前批次。");
    return;
  }
  const params = new URLSearchParams({ runIds: state.runIds.join(",") });
  const response = await fetch(`/api/content-assets/x-batch?${params.toString()}`);
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.message || result.error || `HTTP ${response.status}`);
  state.batch = result;
  renderStats(result);
  renderLists();
  const good = result.buckets?.goodPosts?.length || 0;
  const asset = result.buckets?.assetOnly?.length || 0;
  const rejected = result.buckets?.rejected?.length || 0;
  log(`当前批次读取完成：高价值 ${good} 条，普通素材 ${asset} 条，淘汰 ${rejected} 条。`);
}

function renderStats(result) {
  if (!result) {
    $("#statsGrid").innerHTML = "";
    return;
  }
  const accountStats = Object.entries(result.accountStats || {});
  const cards = [
    ["总样本", result.totalSampleCount || 0, "本次 runIds 内的真实样本"],
    ["高价值", result.buckets?.goodPosts?.length || 0, "建议优先拆解"],
    ["普通素材", result.buckets?.assetOnly?.length || 0, "可入素材库备用"],
    ["淘汰样本", result.buckets?.rejected?.length || 0, "保留原因用于调采集标准"],
    ...accountStats.map(([account, stat]) => [account, stat.total, `好帖 ${stat.good} / 普通 ${stat.asset} / 淘汰 ${stat.rejected}`]),
  ];
  $("#statsGrid").innerHTML = cards.map(([title, value, detail]) => `
    <div class="stat"><b>${escapeHtml(title)}：${escapeHtml(value)}</b><span>${escapeHtml(detail)}</span></div>
  `).join("");
}

function renderLists() {
  const buckets = state.batch?.buckets || {};
  renderPostList("#goodList", buckets.goodPosts || [], "good");
  renderPostList("#assetList", buckets.assetOnly || [], "asset");
  renderPostList("#rejectList", buckets.rejected || [], "rejected");
}

function renderPostList(selector, items, tier) {
  const target = $(selector);
  if (!items.length) {
    const label = tier === "good" ? "高价值好帖" : tier === "asset" ? "普通素材" : "淘汰样本";
    target.innerHTML = `<div class="empty-list">当前批次暂无${label}。</div>`;
    return;
  }
  target.innerHTML = items.map((item) => renderPostCard(item, tier)).join("");
}

function renderPostCard(item, tier) {
  const metrics = item.metrics || {};
  const text = item.body || item.title || "";
  const reasons = item.qualityReasons || [];
  const reject = item.rejectReason ? [humanRejectReason(item.rejectReason)] : [];
  return `<article class="post-card ${tier}">
    <div class="meta">
      <span>@${escapeHtml(item.keyword || item.authorId || "unknown")}</span>
      <span>${escapeHtml(item.authorName || "作者待识别")}</span>
      <span>分数 ${escapeHtml(item.contentValueScore || 0)}</span>
    </div>
    <h4>${escapeHtml(item.title || text.slice(0, 80) || "未命名帖子")}</h4>
    <p>${escapeHtml(text.slice(0, 260))}${text.length > 260 ? "..." : ""}</p>
    <div class="metrics">
      <span>赞 ${escapeHtml(metrics.likes ?? 0)}</span>
      <span>藏 ${escapeHtml(metrics.bookmarks ?? 0)}</span>
      <span>评 ${escapeHtml(metrics.replies ?? 0)}</span>
      <span>转 ${escapeHtml(metrics.retweets ?? 0)}</span>
      <span>引 ${escapeHtml(metrics.quotes ?? 0)}</span>
    </div>
    <div class="tags">${[...reasons, ...reject].slice(0, 4).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
    ${item.rejectReason ? `<p class="reject-help">${escapeHtml(rejectActionHint(item.rejectReason))}</p>` : ""}
    ${item.sourceUrl ? `<a class="source-link" href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noreferrer">打开原帖</a>` : ""}
    <div class="card-actions">
      ${tier !== "rejected" ? `<button class="primary" data-confirm="${escapeHtml(item.id)}" data-destination="mother_topic">入母题库并拆解</button>` : ""}
      ${tier !== "rejected" ? `<button class="secondary" data-confirm="${escapeHtml(item.id)}" data-destination="asset_only">入普通素材库</button>` : ""}
      <button class="secondary" data-confirm="${escapeHtml(item.id)}" data-destination="counterexample">入反例库</button>
      <button class="secondary" data-confirm="${escapeHtml(item.id)}" data-destination="discard">丢弃</button>
    </div>
  </article>`;
}

function humanRejectReason(reason) {
  const map = {
    pure_link: "淘汰原因：只有链接，缺少可拆正文",
    retweet: "淘汰原因：转发内容，不适合作为原创母题",
    reply_or_contextless: "淘汰原因：像回复，缺少上下文",
    repost_or_unknown_source: "淘汰原因：原作者识别不清",
    too_short: "淘汰原因：正文太短",
    weak_engagement_signal: "淘汰原因：互动信号弱",
    weak_content_signal: "淘汰原因：观点/方法信号弱",
    low_mother_topic_score: "淘汰原因：母题价值分不够",
  };
  return map[reason] || `淘汰原因：${reason}`;
}

function rejectActionHint(reason) {
  const map = {
    pure_link: "处理建议：如果链接背后是好文章，后续用网页抓取工具抓正文；当前这条先不直接二创。",
    retweet: "处理建议：优先找原作者原帖，避免把转发当成素材源。",
    reply_or_contextless: "处理建议：需要补全上下文后再判断，否则容易写偏。",
    repost_or_unknown_source: "处理建议：先确认原作者和原链接，再决定是否入库。",
    too_short: "处理建议：可以当灵感，不建议直接作为母题。",
    weak_engagement_signal: "处理建议：可入反例库，用来训练什么样的帖子不值得仿写。",
    weak_content_signal: "处理建议：暂不做母题，除非你人工判断它背后有强话题。",
    low_mother_topic_score: "处理建议：先放普通素材或反例库，不进入今日创作主线。",
  };
  return map[reason] || "处理建议：先不进入今日创作主线。";
}

async function confirmAsset(sampleId, destination) {
  setStatus("正在入库", `${sampleId} -> ${destination}`);
  setFlowStep(3, "正在保存你的人工选择。保存完成后会生成拆解卡。");
  log(`人工确认：${sampleId} -> ${destination}`);
  const response = await fetch("/api/content-assets/confirm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sampleId, destination }),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) {
    log(`入库失败：${result.message || result.error || `HTTP ${response.status}`}`);
    setStatus("入库失败", result.message || result.error || `HTTP ${response.status}`);
    setFlowStep(3, "入库失败。可以换一条帖子重试，或先把它放入反例库。");
    return;
  }

  state.lastCard = result.deconstruction;
  if (destination === "discard") {
    log("已丢弃，不生成拆解卡。");
    setStatus("已丢弃", "该样本不会进入创作资产");
    return;
  }

  log("已确认入库，并生成爆文拆解卡。");
  setStatus("已生成拆解卡", result.sample?.title || sampleId);
  $("#useAssetsBtn").disabled = false;
  $("#nextStepCard").hidden = false;
  renderCard();
  setFlowStep(4, "拆解卡已经生成。先检查卡片内容，再点“回今日工作台继续创作”。");
  setTimeout(() => $("#cardPanel")?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
}

function renderCard() {
  const card = state.lastCard;
  if (!card) {
    $("#deconstructionCard").className = "empty-card";
    $("#deconstructionCard").innerHTML = "还没有确认入库的帖子。请先在上方选择一条高价值好帖，点击“入母题库并拆解”。";
    return;
  }
  $("#deconstructionCard").className = "decon-grid";
  $("#deconstructionCard").innerHTML = `
    ${block("来源证据", [
      `作者：${card.source?.authorName || card.source?.authorId || "未知"}`,
      `平台：${card.source?.platform || "x"}`,
      `互动：赞 ${card.source?.metrics?.likes || 0} / 藏 ${card.source?.metrics?.bookmarks || 0} / 评 ${card.source?.metrics?.replies || 0}`,
      `原帖：${card.source?.sourceUrl || "无链接"}`,
    ])}
    ${block("内容分类", [
      `大类：${card.classification?.mainCategory || ""}`,
      `小类：${card.classification?.subCategory || ""}`,
      `适合平台：${(card.classification?.suitablePlatforms || []).join(" / ")}`,
    ])}
    ${block("标题和开头", [
      `标题公式：${card.titleFormula || ""}`,
      `开头机制：${card.openingHook?.mechanism || ""}`,
      `首句：${card.openingHook?.firstLine || ""}`,
    ])}
    ${block("爆点核心", [
      `主张句：${card.core?.claim || ""}`,
      `用户痛点：${card.core?.userPain || ""}`,
      `用户为什么看：${card.core?.whyReaderCares || ""}`,
      `信息增量：${card.core?.informationGain || ""}`,
    ])}
    ${block("结构公式", card.structureFormula || [])}
    ${block("可复用资产", [
      ...(card.reusableAssets?.hooks || []),
      ...(card.reusableAssets?.quoteableLines || []).slice(0, 4),
    ])}
    ${block("二创方向", (card.rewriteDirections || []).map((item) => `${item.format}：${item.angle}`))}
    ${block("风险提醒", card.warnings || [])}
  `;
}

function block(title, lines) {
  const safeLines = (Array.isArray(lines) ? lines : [lines]).filter(Boolean);
  return `<section class="decon-block"><h3>${escapeHtml(title)}</h3><ul>${safeLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul></section>`;
}

function clearBatch() {
  state.runIds = [];
  state.collecting = false;
  state.batch = null;
  state.lastCard = null;
  resetLogs();
  setProgress(0);
  setStatus("等待开始", "选择采新帖或读取最近批次");
  renderStats(null);
  renderLists();
  renderCard();
  $("#reloadBatchBtn").disabled = true;
  $("#useAssetsBtn").disabled = true;
  $("#nextStepCard").hidden = true;
  setFlowStep(1, "如果你只是测试，直接点“读取最近一次 X 采集批次”。如果你换了账号或想抓新内容，再点“开始真实采集”。");
}

function useAssetsInWorkbench() {
  setFlowStep(5, "正在回今日工作台。下一步从已确认 X 资产里找母题。");
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({
      type: "longka-use-confirmed-x-assets",
      runIds: state.runIds,
    }, window.location.origin);
    log("已切回今日工作台：下一步从已入库 X 资产里找话题。");
    return;
  }
  window.location.href = "./workbench-v2.html";
}

document.addEventListener("click", (event) => {
  const confirmButton = event.target.closest("[data-confirm]");
  if (confirmButton) {
    confirmAsset(confirmButton.dataset.confirm, confirmButton.dataset.destination);
  }
});

$("#startBatchBtn").addEventListener("click", startBatch);
$("#loadLatestBtn").addEventListener("click", loadLatestBatch);
$("#reloadBatchBtn").addEventListener("click", () => reloadBatch().catch((error) => log(`读取批次失败：${error.message}`)));
$("#clearBtn").addEventListener("click", clearBatch);
$("#useAssetsBtn").addEventListener("click", useAssetsInWorkbench);
$("#useAssetsInlineBtn").addEventListener("click", useAssetsInWorkbench);
$("#viewCardBtn").addEventListener("click", () => $("#cardPanel")?.scrollIntoView({ behavior: "smooth", block: "start" }));

clearBatch();
if (state.embedded) {
  setTimeout(loadLatestBatch, 250);
}
