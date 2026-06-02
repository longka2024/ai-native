const contentApiBase = location.protocol === "file:" ? "http://localhost:3760" : "";

const contentState = {
  db: null,
  workflow: null,
};

const contentEls = {
  metrics: document.querySelector("#metricBar"),
  samples: document.querySelector("#sampleList"),
  candidates: document.querySelector("#candidateList"),
  assets: document.querySelector("#assetList"),
  importForm: document.querySelector("#importForm"),
  sampleText: document.querySelector("#sampleText"),
  importMediaCrawler: document.querySelector("#importMediaCrawler"),
  collectXhs: document.querySelector("#collectXhs"),
  crawlerStatus: document.querySelector("#crawlerStatus"),
  topicIndustry: document.querySelector("#topicIndustry"),
  topicKeywords: document.querySelector("#topicKeywords"),
  runXhs: document.querySelector("#runXhs"),
  runPipeline: document.querySelector("#runContentWorkflow"),
};

const contentWorkflowMounted = Boolean(
  contentEls.metrics &&
  contentEls.samples &&
  contentEls.candidates &&
  contentEls.assets
);

if (contentWorkflowMounted) {
  contentEls.importForm?.addEventListener("submit", importManualSamples);
  contentEls.importMediaCrawler?.addEventListener("click", importMediaCrawlerSamples);
  contentEls.collectXhs?.addEventListener("click", collectXhsTopicSamples);
  contentEls.runXhs?.addEventListener("click", runXhsWorkflow);
  contentEls.runPipeline?.addEventListener("click", runXhsWorkflow);

  document.addEventListener("click", handleContentWorkflowClick);
  loadContentState().catch(showContentError);
}

async function handleContentWorkflowClick(event) {
  const copy = event.target.closest("[data-copy]");
  if (copy) {
    const target = document.querySelector(copy.dataset.copy);
    await copyText(target?.innerText || target?.value || "");
    toast("已复制发布包");
    return;
  }

  const action = event.target.closest("[data-content-action]");
  if (!action) return;
  const id = action.dataset.id;
  if (action.dataset.contentAction === "topic") {
    await postContentJson("/api/topics", { candidateId: id });
    toast("已进入选题库");
  }
  if (action.dataset.contentAction === "task") {
    await postContentJson("/api/production-tasks", { candidateId: id });
    toast("已生成生产任务");
  }
  if (action.dataset.contentAction === "comments") {
    setCrawlerStatus("正在补抓这条笔记的评论区，用来验证真实痛点。");
    const result = await postContentJson("/api/sources/mediacrawler/xhs-comments", { url: action.dataset.url || "" });
    setCrawlerStatus(result.message || "评论补抓完成");
    toast("评论补抓完成");
  }
  if (action.dataset.contentAction === "save-review") {
    const card = action.closest("[data-asset-id]");
    const payload = collectReviewPayload(card);
    await postContentJson("/api/publish-records", payload);
    toast("发布复盘已保存，数据已回流到选题素材池");
  }
  if (action.dataset.contentAction === "export-cards") {
    const result = await postContentJson("/api/assets/export-xhs-cards", { assetId: id });
    toast(`已导出 ${result.manifest?.count || 0} 张 PNG`);
  }
  await loadContentState();
}

async function loadContentState() {
  contentState.db = await getContentJson("/api/state");
  renderContentWorkflow();
}

async function importManualSamples(event) {
  event.preventDefault();
  const text = contentEls.sampleText.value.trim();
  if (!text) {
    toast("先粘贴小红书样本、评论或竞品内容");
    return;
  }
  const samples = parseManualSamples(text);
  if (!samples.length) {
    toast("没有识别到有效样本");
    return;
  }
  const result = await postContentJson("/api/sources/content-samples/import", { samples });
  contentEls.sampleText.value = "";
  toast(`已导入 ${result.count} 条样本`);
  await loadContentState();
}

async function runXhsWorkflow() {
  setContentBusy(true, "正在分析样本");
  try {
    contentState.workflow = await postContentJson("/api/content-workflow/xhs/run", {});
    await loadContentState();
    toast("小红书内容生产流程已生成");
  } finally {
    setContentBusy(false);
  }
}

async function importMediaCrawlerSamples() {
  setCrawlerStatus("正在读取 MediaCrawlerPro SQLite，不会生成假数据。");
  contentEls.importMediaCrawler.disabled = true;
  try {
    const result = await postContentJson("/api/sources/mediacrawler/import-sqlite", {
      limit: 50,
      industry: contentEls.topicIndustry?.value || "",
      keywords: contentEls.topicKeywords?.value || "",
    });
    if (result.count > 0) {
      setCrawlerStatus(`已导入 ${result.count} 条真实采集样本：${result.dbPath}`);
      toast(`MediaCrawlerPro 导入 ${result.count} 条`);
      await loadContentState();
    } else {
      setCrawlerStatus(result.message || "没有可导入的真实采集数据。");
      toast("没有 MediaCrawlerPro 真实采集数据");
    }
  } finally {
    contentEls.importMediaCrawler.disabled = false;
  }
}

async function collectXhsTopicSamples() {
  setCrawlerStatus("正在通过 CDP 同步登录态，并运行 MediaCrawlerPro 真实采集。");
  const button = contentEls.collectXhs;
  if (button) button.disabled = true;
  try {
    const result = await postContentJson("/api/sources/mediacrawler/xhs-collect", {
      industry: contentEls.topicIndustry?.value || "",
      keywords: contentEls.topicKeywords?.value || "",
    });
    setCrawlerStatus(result.message || `已完成采集闭环，导入 ${result.importedCount || 0} 条样本。`);
    toast("真实采集闭环完成");
    await loadContentState();
  } catch (error) {
    setCrawlerStatus(error.message || "真实采集失败，请查看服务和登录态。");
    toast("采集未完成");
  } finally {
    if (button) button.disabled = false;
  }
}

function parseManualSamples(text) {
  return text.split(/\n\s*---+\s*\n/).map((block) => {
    const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return null;
    const title = cleanPrefix(lines.find((line) => /^标题[:：]/.test(line)) || lines[0] || "");
    const content = cleanPrefix(lines.find((line) => /^正文[:：]/.test(line)) || lines.filter((line) => !/^评论[:：]|^赞|^收藏|^藏|^评|^转|^-/.test(line)).slice(1, 6).join("\n"));
    const commentLines = lines.filter((line) => /^评论[:：]/.test(line) || /^-/.test(line)).map(cleanPrefix);
    const metricsLine = lines.find((line) => /赞|藏|收藏|评|评论|转|分享|like|comment|collect|share/i.test(line)) || "";
    return {
      platform: "xiaohongshu",
      sourceTool: "manual-import",
      collectionStatus: "manual",
      title,
      content,
      comments: commentLines,
      metrics: parseMetrics(metricsLine),
    };
  }).filter((sample) => sample && (sample.title || sample.content || sample.comments.length));
}

function cleanPrefix(line) {
  return String(line || "")
    .replace(/^标题[:：]\s*/, "")
    .replace(/^正文[:：]\s*/, "")
    .replace(/^评论[:：]\s*/, "")
    .replace(/^-\s*/, "")
    .trim();
}

function parseMetrics(line) {
  const pick = (patterns) => {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) return Number(match[1]);
    }
    return 0;
  };
  return {
    likes: pick([/赞[:：]?\s*(\d+)/, /like[s]?[:：]?\s*(\d+)/i]),
    saves: pick([/藏[:：]?\s*(\d+)/, /收藏[:：]?\s*(\d+)/, /collect[s]?[:：]?\s*(\d+)/i]),
    comments: pick([/评[:：]?\s*(\d+)/, /评论[:：]?\s*(\d+)/, /comment[s]?[:：]?\s*(\d+)/i]),
    shares: pick([/转[:：]?\s*(\d+)/, /分享[:：]?\s*(\d+)/, /share[s]?[:：]?\s*(\d+)/i]),
    growth: pick([/增长[:：]?\s*(\d+)/]),
  };
}

function renderContentWorkflow() {
  const db = contentState.db || {};
  const samples = db.contentSamples || [];
  const candidates = db.candidates || [];
  const assets = db.assets || [];
  const productionTasks = db.tasks || [];

  contentEls.metrics.innerHTML = [
    ["素材样本", samples.length, "真实采集和手动导入分开标记"],
    ["可选方向", candidates.length, "按表现、相关度和复刻价值筛选"],
    ["图文发布包", assets.length, "标题、正文、封面、发前检查"],
    ["待执行任务", productionTasks.length, "进入 AI 员工或小妹工作台"],
  ].map(renderMetric).join("");

  contentEls.samples.innerHTML = samples.length
    ? samples.slice(0, 8).map(renderSample).join("")
    : emptyCard("还没有选题素材", "先采集或粘贴 5-20 条小红书爆款笔记、评论或竞品内容。没有真实来源就不要生成发布包。");

  contentEls.candidates.innerHTML = candidates.length
    ? candidates.slice(0, 10).map(renderCandidate).join("")
    : emptyCard("等待生成可选方向", "加入素材后点击“拆解并生成图文包”，系统会拆标题公式、痛点、内容角度和执行动作。");

  contentEls.assets.innerHTML = assets.length
    ? assets.slice(0, 6).map(renderAsset).join("")
    : emptyCard("等待生成图文发布包", "发布包必须包含标题、正文结构、封面文案、评论区引导和发布前检查。");
}

function renderMetric([label, value, desc]) {
  return `<article class="metric-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><p>${escapeHtml(desc)}</p></article>`;
}

function renderSample(item) {
  const m = item.metrics || {};
  const comments = Array.isArray(item.comments) ? item.comments : [];
  const judgement = item.sourceJudgement || {};
  return `
    <article class="work-card">
      <div class="card-head">
        <span>${escapeHtml(item.platform)} / ${escapeHtml(item.sourceTool)}</span>
        <em>${escapeHtml(statusText(item.collectionStatus))}</em>
      </div>
      <b>${escapeHtml(item.title || "未命名样本")}</b>
      <p>${escapeHtml(item.content || comments[0] || "暂无正文")}</p>
      ${judgement.layer ? `<div class="source-judgement"><strong>${escapeHtml(judgement.layer)} · ${escapeHtml(judgement.score || 0)}分</strong><small>${escapeHtml((judgement.evidence || []).join(" / "))}</small>${(judgement.risks || []).length ? `<small class="risk">${escapeHtml(judgement.risks.join("；"))}</small>` : ""}</div>` : ""}
      ${comments.length ? `<div class="comment-pains">${comments.slice(0, 3).map((line) => `<small>${escapeHtml(line)}</small>`).join("")}</div>` : ""}
      <div class="chips">
        <i>赞 ${m.likes || 0}</i><i>藏 ${m.saves || m.collects || 0}</i><i>评 ${m.comments || 0}</i><i>转 ${m.shares || 0}</i>
      </div>
      ${item.url ? `<div class="content-actions"><button class="mini" data-content-action="comments" data-url="${escapeAttr(item.url)}">补抓评论</button></div>` : ""}
    </article>
  `;
}

function renderCandidate(item) {
  const validation = item.topicValidation || {};
  const judgement = item.sourceJudgement || {};
  return `
    <article class="work-card candidate">
      <div class="card-head">
        <span>${escapeHtml(item.optionGroup || item.formula)}</span>
        <em>${escapeHtml(item.score)} 分</em>
      </div>
      <b>${escapeHtml(item.title)}</b>
      <p>${escapeHtml(item.angle)}</p>
      ${validation.label ? `<div class="source-judgement"><strong>${escapeHtml(validation.label)} · ${escapeHtml(validation.score)}分</strong><small>${escapeHtml(judgement.layer || "")} / ${escapeHtml(validation.reason || "")}</small><small>${escapeHtml(validation.conversion || "")}</small></div>` : ""}
      <ol>${(item.material || []).slice(0, 3).map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ol>
      <div class="content-actions">
        <button class="mini" data-content-action="topic" data-id="${escapeAttr(item.id)}">入选题库</button>
        <button class="mini" data-content-action="task" data-id="${escapeAttr(item.id)}">生成任务</button>
      </div>
    </article>
  `;
}

function renderAsset(item, index) {
  const id = `assetCopy${index}`;
  const data = item.structured || {};
  const hasStructured = data && Object.keys(data).length > 0;
  const records = ((contentState.db || {}).publishRecords || []).filter((record) => record.assetId === item.id);
  return `
    <article class="work-card asset" data-asset-id="${escapeAttr(item.id)}">
      <div class="card-head">
        <span>${escapeHtml(item.type)}</span>
        <div class="asset-actions">
          ${hasStructured ? `<a class="mini link-mini" href="./xhs-card-preview.html?asset=${escapeAttr(item.id)}" target="_blank" rel="noreferrer">预览卡片组</a>` : ""}
          ${hasStructured ? `<button class="mini" data-content-action="export-cards" data-id="${escapeAttr(item.id)}">导出PNG</button>` : ""}
          <button class="mini" data-copy="#${id}">复制</button>
        </div>
      </div>
      <b>${escapeHtml(item.title)}</b>
      ${item.exportedCards ? renderExportedCards(item.exportedCards) : ""}
      ${hasStructured ? renderStructuredAsset(data) : ""}
      ${renderPublishReview(item, records)}
      <pre id="${id}">${escapeHtml(item.copy)}</pre>
    </article>
  `;
}

function renderExportedCardsLegacy(manifest) {
  return `
    <div class="exported-cards">
      <strong>已导出 ${escapeHtml(manifest.count || 0)} 张 PNG</strong>
      <small>${escapeHtml((manifest.files || [])[0] || "")}</small>
    </div>
  `;
}

function renderExportedCards(manifest) {
  return `
    <div class="exported-cards">
      <strong>卡片组已导出：${escapeHtml(manifest.count || 0)} 张 PNG</strong>
      <small>${escapeHtml(manifest.stage || "生成小红书卡片组")} · ${escapeHtml(manifest.qa?.ratio || "3:4")} · ${escapeHtml(manifest.qa?.expectedSize || "900x1200")}</small>
      <small>渲染器：${escapeHtml(manifest.renderer || "local-card-renderer")}</small>
      <small>${escapeHtml((manifest.files || [])[0] || "")}</small>
    </div>
  `;
}

function renderPublishReview(item, records) {
  const latest = records[0];
  return `
    <details class="publish-review" ${latest ? "open" : ""}>
      <summary>发布后复盘 ${records.length ? `· 已记录 ${records.length} 次` : ""}</summary>
      ${latest ? renderLatestReview(latest) : ""}
      <div class="review-grid">
        <label>平台<input data-review-field="platform" value="小红书" /></label>
        <label>发布链接<input data-review-field="url" placeholder="粘贴笔记链接，可留空" /></label>
        <label>点赞<input data-review-field="likes" type="number" min="0" value="0" /></label>
        <label>收藏<input data-review-field="saves" type="number" min="0" value="0" /></label>
        <label>评论<input data-review-field="comments" type="number" min="0" value="0" /></label>
        <label>转发<input data-review-field="shares" type="number" min="0" value="0" /></label>
        <label>私信<input data-review-field="messages" type="number" min="0" value="0" /></label>
        <label>付款<input data-review-field="orders" type="number" min="0" value="0" /></label>
        <label class="wide">评论/私信高频问题<textarea data-review-field="commentHighlights" placeholder="一行一个用户问题"></textarea></label>
        <label class="wide">人工复盘结论<textarea data-review-field="review" placeholder="这条为什么有效/无效？下次怎么改？"></textarea></label>
      </div>
      <button class="primary full" data-content-action="save-review" data-id="${escapeAttr(item.id)}">保存发布复盘并回流</button>
    </details>
  `;
}

function renderLatestReview(record) {
  const m = record.metrics || {};
  const judgement = record.judgement || {};
  return `
    <div class="latest-review">
      <strong>${escapeHtml(judgement.label || "已记录")} · ${escapeHtml(judgement.score || 0)}分</strong>
      <small>赞${escapeHtml(m.likes || 0)} / 藏${escapeHtml(m.saves || 0)} / 评${escapeHtml(m.comments || 0)} / 私信${escapeHtml(m.messages || 0)} / 付款${escapeHtml(m.orders || 0)}</small>
      <small>${escapeHtml(judgement.reason || "")}</small>
      <small>${escapeHtml(judgement.next || "")}</small>
    </div>
  `;
}

function collectReviewPayload(card) {
  const payload = { assetId: card?.dataset.assetId || "" };
  card?.querySelectorAll("[data-review-field]").forEach((field) => {
    payload[field.dataset.reviewField] = field.value;
  });
  return payload;
}

function renderStructuredAsset(data) {
  return `
    <div class="publish-pack">
      ${renderPublishSection("标题候选", (data.titleOptions || []).map((item) => `${item.text}｜${item.formula}`))}
      ${data.coverText ? `<div class="publish-section strong-section"><span>封面字</span><strong>${escapeHtml(data.coverText)}</strong></div>` : ""}
      ${renderPublishSection("正文草稿", data.bodyDraft || [])}
      ${renderCardPlan(data.cardPlan || [])}
      ${renderVideoPackage(data.videoPackage)}
      ${renderPublishSection("朋友圈配文", data.momentsCopy || [])}
      ${renderPublishSection("评论引导", data.commentGuide || [])}
      ${renderPublishSection("发前检查", data.publishChecklist || [])}
      ${renderSkillPipeline(data.skillPipeline || [])}
      ${data.closureEvidence ? renderClosureEvidence(data.closureEvidence) : ""}
      ${data.sourceSummary ? renderSourceSummary(data.sourceSummary) : ""}
    </div>
  `;
}

function renderVideoPackage(video) {
  if (!video) return "";
  return `
    <div class="publish-section video-package">
      <span>宣传短视频包</span>
      <strong>${escapeHtml(video.title || "宣传短视频")}</strong>
      <p>${escapeHtml(video.coverText || "")} · ${escapeHtml(video.duration || "")}</p>
      ${renderPublishSection("视频脚本", video.script || [])}
      ${renderPublishSection("分镜素材", video.shotList || [])}
      ${renderPublishSection("验收标准", video.acceptance || [])}
      <small>小妹工作台：${escapeHtml(video.xiaomeiWorkbench?.target || "")}</small>
      <small>${escapeHtml(video.xiaomeiWorkbench?.nextAction || "")}</small>
    </div>
  `;
}

function renderSkillPipeline(nodes) {
  if (!Array.isArray(nodes) || !nodes.length) return "";
  return `
    <div class="publish-section skill-pipeline">
      <span>内容生产闭环节点</span>
      <div class="skill-node-grid">
        ${nodes.map((node) => `
          <div class="skill-node">
            <em>${escapeHtml(node.status || "待处理")}</em>
            <strong>${escapeHtml(node.name || "")}</strong>
            <small>${escapeHtml(node.engine || "")}</small>
            <p>${escapeHtml(node.output || "")}</p>
            <small>验收：${escapeHtml(node.acceptance || "")}</small>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderClosureEvidence(evidence) {
  const items = [
    ["选题", evidence.candidateReady],
    ["标题", evidence.titleReady],
    ["开头", evidence.hookReady],
    ["发布包", evidence.publishPackReady],
    ["卡片组", evidence.cardPlanReady],
    ["发前检查", evidence.reviewReady],
  ];
  items.splice(5, 0, ["视频包", evidence.videoReady]);
  return `
    <div class="publish-section closure-evidence">
      <span>闭环证据</span>
      <div class="closure-evidence-row">
        ${items.map(([label, ok]) => `<b class="${ok ? "ok" : "todo"}">${escapeHtml(label)}${ok ? "已完成" : "待补"}</b>`).join("")}
      </div>
      <small>${escapeHtml(evidence.nextLoop || "")}</small>
    </div>
  `;
}

function renderPublishSection(title, lines) {
  const list = Array.isArray(lines) ? lines.filter(Boolean) : [];
  if (!list.length) return "";
  return `
    <div class="publish-section">
      <span>${escapeHtml(title)}</span>
      <ul>${list.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>
    </div>
  `;
}

function renderCardPlan(cards) {
  if (!Array.isArray(cards) || !cards.length) return "";
  return `
    <div class="publish-section card-plan">
      <span>小红书卡片组</span>
      <div class="card-plan-grid">
        ${cards.map((card) => `
          <div>
            <em>P${escapeHtml(card.page)} ${escapeHtml(card.role)}</em>
            <strong>${escapeHtml(card.title)}</strong>
            <small>${escapeHtml(card.copy)}</small>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderSourceSummary(summary) {
  return `
    <div class="publish-section source-summary">
      <span>来源判断</span>
      <p>${escapeHtml(summary.layer)} · ${escapeHtml(summary.validation)}（${escapeHtml(summary.validationScore)}分）</p>
      <small>收藏动机：${escapeHtml(summary.saveMotive)}</small>
      <small>传播动机：${escapeHtml(summary.socialMotive)}</small>
      <small>转化入口：${escapeHtml(summary.conversion)}</small>
    </div>
  `;
}

function emptyCard(title, desc) {
  return `<article class="work-card empty"><b>${escapeHtml(title)}</b><p>${escapeHtml(desc)}</p></article>`;
}

function statusText(value) {
  const map = {
    real: "爬虫采集",
    manual: "手动导入",
    partial: "部分采集",
    failed: "采集失败",
    demo: "演示样本",
  };
  return map[value] || value || "未知";
}

function setContentBusy(busy, text) {
  [contentEls.runXhs, contentEls.runPipeline].filter(Boolean).forEach((button) => {
    button.disabled = busy;
    button.textContent = busy ? text : button.dataset.label;
  });
}

function setCrawlerStatus(message) {
  if (contentEls.crawlerStatus) contentEls.crawlerStatus.textContent = message;
}

async function getContentJson(path) {
  const res = await fetch(`${contentApiBase}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function postContentJson(path, body) {
  const res = await fetch(`${contentApiBase}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) throw new Error(data.message || data.error || `HTTP ${res.status}`);
  return data;
}

async function copyText(text) {
  if (!text.trim()) return;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function toast(message) {
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  document.body.appendChild(node);
  setTimeout(() => node.remove(), 2200);
}

function showContentError(error) {
  console.error(error);
  toast(error.message || "内容工作流操作失败");
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("\n", "&#10;");
}
