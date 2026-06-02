const form = document.querySelector("#pipelineForm");
const terminal = document.querySelector("#terminal");
const steps = document.querySelector("#steps");
const summaryCard = document.querySelector("#summaryCard");
const sources = document.querySelector("#sources");
const files = document.querySelector("#files");

const stepDefs = [
  ["采集样本", "读取 MediaCrawler / contentSamples 中的真实平台素材。"],
  ["生成内容包", "从样本里生成小红书正文、朋友圈文案、短视频脚本。"],
  ["沉淀问题库", "把客户反复关心的问题变成私有问题库和答案库。"],
  ["导出配图", "把卡片组导出为 1080x1440 PNG。"],
];

renderSteps();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {
    industry: value("#industry"),
    keyword: value("#keyword"),
    platform: value("#platform"),
    projectId: "web-pipeline-test",
    owner: "客户本人",
  };
  setRunning(true);
  log(`> 开始关键词闭环：${payload.industry} / ${payload.keyword} / ${payload.platform}`);
  try {
    const res = await fetch("/api/keyword-pipeline/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.message || data.error || "生成失败");
    renderResult(data);
    setRunning(false, true);
    log("> 完成：内容包、问题库、答案库、卡片图已生成。");
  } catch (error) {
    setRunning(false, false);
    log(`> 失败：${error.message}`);
  }
});

function renderSteps(status = "idle") {
  steps.innerHTML = stepDefs.map(([title, desc], index) => {
    const cls = status === "done" ? "done" : status === "running" && index === 0 ? "running" : "";
    return `<div class="step-box ${cls}"><b>${index + 1}. ${escapeHtml(title)}</b><span>${escapeHtml(desc)}</span></div>`;
  }).join("");
}

function setRunning(isRunning, done = false) {
  document.querySelector("#runPipeline").disabled = isRunning;
  document.querySelector("#runPipeline").textContent = isRunning ? "正在生成..." : "生成完整内容包";
  renderSteps(isRunning ? "running" : done ? "done" : "idle");
}

function renderResult(data) {
  const content = data.content || {};
  const bank = data.questionBank || {};
  const card = data.cardExport || {};
  summaryCard.innerHTML = `
    <h2>产物结果</h2>
    <p><b>关键词：</b>${escapeHtml(data.keyword)}</p>
    <p><b>内容包 Asset：</b>${escapeHtml(content.assetId || "")}</p>
    <p><b>真实样本：</b>${escapeHtml(content.sampleCount || 0)} 条，素材图 ${escapeHtml(content.imageCount || 0)} 张</p>
    <p><b>问题库：</b>${escapeHtml(bank.questionCount || 0)} 条，答案库 ${escapeHtml(bank.answerCount || 0)} 条</p>
    <p><b>卡片：</b>${escapeHtml(card.count || 0)} 张 1080x1440 PNG</p>
    <pre>${escapeHtml(JSON.stringify({ contentDir: content.outputDir, questionBankDir: bank.outputDir, cardFiles: card.files }, null, 2))}</pre>
  `;
  sources.innerHTML = (content.topSources || card.visualSources || []).slice(0, 8).map((item) => `
    <li><b>${escapeHtml(item.title || item.keyword || "来源")}</b><br />赞 ${escapeHtml(item.metrics?.likes || 0)} / 藏 ${escapeHtml(item.metrics?.saves || item.metrics?.collects || 0)} / 评 ${escapeHtml(item.metrics?.comments || 0)}<br />${escapeHtml(item.url || "")}</li>
  `).join("");
  files.innerHTML = [
    ...(card.files || []).map((file) => [file.split(/[\\/]/).pop(), file]),
    content.outputDir ? ["内容包目录", content.outputDir] : null,
    bank.outputDir ? ["问题库目录", bank.outputDir] : null,
  ].filter(Boolean).map(([label, file]) => `<li><a href="${escapeAttr(toRelativeFile(file))}" target="_blank">${escapeHtml(label)}</a><br />${escapeHtml(file)}</li>`).join("");
}

function toRelativeFile(file) {
  const normalized = String(file || "").replaceAll("\\", "/");
  const marker = "/command-center-prototype/";
  const index = normalized.indexOf(marker);
  return index >= 0 ? `./${normalized.slice(index + marker.length)}` : "#";
}

function log(line) {
  terminal.textContent = `${terminal.textContent}\n${line}`.trim();
}

function value(selector) {
  return document.querySelector(selector)?.value?.trim() || "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
