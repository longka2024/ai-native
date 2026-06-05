const state = {
  runIds: [],
  collecting: false,
  logs: [],
  progress: 0,
  batch: null,
  lastCard: null,
};

const $ = (selector) => document.querySelector(selector);

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

function setProgress(value) {
  state.progress = Math.max(0, Math.min(100, value));
  $("#progressBar").style.width = `${state.progress}%`;
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
    log("没有账号，采集未开始。");
    return;
  }

  state.collecting = true;
  state.batch = null;
  state.lastCard = null;
  state.runIds = [];
  state.logs = [];
  renderLists();
  renderCard();
  renderStats(null);
  setProgress(8);
  setStatus("正在采集", `账号 ${accounts.length} 个，每号 ${maxTweets} 条`);
  $("#startBatchBtn").disabled = true;
  $("#reloadBatchBtn").disabled = true;
  log(`创建采集批次：${accounts.join(" / ")}`);
  log("正在调用 XCrawl 读取 X 账号最近帖子。这个动作是真实采集，不会填充演示数据。");

  const timers = [
    setTimeout(() => {
      if (!state.collecting) return;
      setProgress(26);
      log("正在等待接口返回。采集时间和账号数量、X 页面响应有关。");
    }, 1800),
    setTimeout(() => {
      if (!state.collecting) return;
      setProgress(48);
      log("返回后会按收藏、评论、转发、正文信息量和链接质量筛选。");
    }, 5200),
    setTimeout(() => {
      if (!state.collecting) return;
      setProgress(66);
      log("如果出现低质量帖子，系统会放到淘汰样本并显示原因。");
    }, 9800),
  ];

  try {
    const response = await fetch("/api/collectors/xcrawl/x-user-tweets-batch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        accounts,
        maxTweets,
        pages,
        labelType: "radar_seed",
      }),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.message || result.error || `HTTP ${response.status}`);

    state.runIds = (result.results || []).map((item) => item.run?.id).filter(Boolean);
    setProgress(78);
    log(`采集完成：成功账号 ${result.successCount || 0} 个，原始样本 ${result.totalSampleCount || 0} 条。`);
    log(`本次 runIds：${state.runIds.join(" / ") || "未返回 runId"}`);
    log("开始按本次 runIds 重新读取数据库，确保页面不混历史素材。");
    await reloadBatch();
    setProgress(100);
    setStatus("本批次已完成", `runIds ${state.runIds.length} 个，只显示当前批次`);
  } catch (error) {
    setStatus("采集失败", error.message);
    log(`采集失败：${error.message}`);
  } finally {
    timers.forEach(clearTimeout);
    state.collecting = false;
    $("#startBatchBtn").disabled = false;
    $("#reloadBatchBtn").disabled = state.runIds.length === 0;
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

async function loadLatestBatch() {
  state.collecting = false;
  state.batch = null;
  state.lastCard = null;
  state.logs = [];
  setProgress(20);
  setStatus("正在读取最近批次", "不会重新采集，不消耗采集次数");
  $("#reloadBatchBtn").disabled = true;
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
  } catch (error) {
    setProgress(0);
    setStatus("读取失败", error.message);
    log(`读取最近批次失败：${error.message}`);
  }
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
    target.innerHTML = `<div class="empty-list">当前批次暂无${tier === "good" ? "高价值好帖" : tier === "asset" ? "普通素材" : "淘汰样本"}。</div>`;
    return;
  }
  target.innerHTML = items.map((item) => renderPostCard(item, tier)).join("");
}

function renderPostCard(item, tier) {
  const metrics = item.metrics || {};
  const text = item.body || item.title || "";
  const reasons = item.qualityReasons || [];
  const reject = item.rejectReason ? [`淘汰原因：${item.rejectReason}`] : [];
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
    ${item.sourceUrl ? `<a class="source-link" href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noreferrer">打开原帖</a>` : ""}
    <div class="card-actions">
      ${tier !== "rejected" ? `<button class="primary" data-confirm="${escapeHtml(item.id)}" data-destination="mother_topic">入母题库并拆解</button>` : ""}
      ${tier !== "rejected" ? `<button class="secondary" data-confirm="${escapeHtml(item.id)}" data-destination="asset_only">入普通素材库</button>` : ""}
      <button class="secondary" data-confirm="${escapeHtml(item.id)}" data-destination="counterexample">入反例库</button>
      <button class="secondary" data-confirm="${escapeHtml(item.id)}" data-destination="discard">丢弃</button>
    </div>
  </article>`;
}

async function confirmAsset(sampleId, destination) {
  setStatus("正在入库", `${sampleId} -> ${destination}`);
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
    return;
  }
  state.lastCard = result.deconstruction;
  if (destination === "discard") {
    log("已丢弃，不生成拆解卡。");
    setStatus("已丢弃", "该样本不会进入创作资产");
  } else {
    log("已确认入库，并生成爆文拆解卡。");
    setStatus("已生成拆解卡", result.sample?.title || sampleId);
  }
  renderCard();
}

function renderCard() {
  const card = state.lastCard;
  if (!card) {
    $("#deconstructionCard").className = "empty-card";
    $("#deconstructionCard").innerHTML = "还没有确认入库的帖子。";
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
  state.logs = [];
  state.batch = null;
  state.lastCard = null;
  setProgress(0);
  setStatus("未开始", "输入 X 账号后开始采集");
  $("#logBox").textContent = "等待开始采集。";
  $("#reloadBatchBtn").disabled = true;
  renderStats(null);
  renderLists();
  renderCard();
}

document.addEventListener("click", (event) => {
  const confirmButton = event.target.closest("[data-confirm]");
  if (confirmButton) {
    confirmAsset(confirmButton.dataset.confirm, confirmButton.dataset.destination);
    return;
  }
});

$("#startBatchBtn").addEventListener("click", startBatch);
$("#loadLatestBtn").addEventListener("click", loadLatestBatch);
$("#reloadBatchBtn").addEventListener("click", () => reloadBatch().catch((error) => log(`读取批次失败：${error.message}`)));
$("#clearBtn").addEventListener("click", clearBatch);

clearBatch();
