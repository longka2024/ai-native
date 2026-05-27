const legacyTasks = [
  { title: "拆解 10 条小红书色彩分析爆款笔记", status: "进行中 / 情报员工", tone: "doing" },
  { title: "生成今日 3 条种草视频脚本", status: "排队 / 文案员工", tone: "wait" },
  { title: "制作试看片发圈分享卡", status: "已完成 / 视觉员工", tone: "done" },
  { title: "汇总客户付款后交付状态", status: "需确认 / 运营员工", tone: "block" },
];

const hotSignals = [
  "小红书评论里反复出现：不知道自己适合什么发型。",
  "朋友圈晒图比单纯卖报告更容易引发询问。",
  "男性用户更关心精神、干净、显年轻，不爱复杂色彩术语。",
  "付费前需要看到本人试看片，才能降低决策成本。",
];

const publishQueue = [
  "18:30 朋友圈：试看片前后对比图 + 轻说明",
  "20:00 小红书：普通人为什么需要先看形象方向",
  "21:30 短视频：上传两张照片如何生成试看",
];

const deliverables = [
  {
    type: "朋友圈配文",
    title: "适合今天直接发的一条",
    body: "很多人不是不好看，而是不知道自己适合什么方向。上传两张清晰照片，先看一张本人形象试看片，再决定要不要做完整报告。",
  },
  {
    type: "短视频脚本",
    title: "30 秒功能演示",
    body: "开头：你有没有买衣服、剪头发总靠感觉？中段：展示上传照片和试看图。结尾：先看本人试看片，满意后再做完整报告。",
  },
  {
    type: "小红书笔记",
    title: "普通人形象判断",
    body: "别一上来就问自己适合什么风格，先把肤色、脸型、发型和穿搭方向拆开看。试看图的价值，是先给你一个可讨论、可调整的起点。",
  },
];

function $(selector) {
  return document.querySelector(selector);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function scrollToId(id) {
  const target = document.querySelector(`#${id}`);
  if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderTasks() {
  $("#taskList").innerHTML = legacyTasks.map((task) => `
    <div class="task">
      <b>${escapeHtml(task.title)}</b>
      <span class="status ${task.tone}">${escapeHtml(task.status)}</span>
    </div>
  `).join("");
}

function renderRadar() {
  $("#hotSignals").innerHTML = hotSignals.map((item) => `
    <div class="signal-item">${escapeHtml(item)}</div>
  `).join("");
  $("#publishQueue").innerHTML = publishQueue.map((item) => `
    <div class="publish-item">${escapeHtml(item)}</div>
  `).join("");
}

function renderDeliverables() {
  $("#deliverableList").innerHTML = deliverables.map((item) => `
    <article class="content-card">
      <span>${escapeHtml(item.type)}</span>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.body)}</p>
      <button class="mini" data-copy="${escapeHtml(item.body)}">复制文案</button>
    </article>
  `).join("");
}

function buildAdvice() {
  const target = $("#goalTarget").value.trim();
  const budget = $("#goalBudget").value.trim();
  const deadline = $("#goalDeadline").value.trim();
  $("#operatorAdvice").innerHTML = `
    <h3>AI 经营官拆解</h3>
    <p>目标：${escapeHtml(target)}</p>
    <p>预算：${escapeHtml(budget)}；周期：${escapeHtml(deadline)}。</p>
    <p>建议先做三件事：做出可传播试看片、每天发布 3 条种草内容、把有互动的人沉淀到订单跟进表。</p>
  `;
  $("#operatorProgress").innerHTML = `
    <div class="task"><b>第一步：内容员工产出 3 条脚本</b><span>已安排</span></div>
    <div class="task"><b>第二步：视觉员工做 6 张发圈图</b><span>等待素材</span></div>
    <div class="task"><b>第三步：运营员工跟进评论和私信</b><span>今日执行</span></div>
  `;
}

function createTask() {
  const type = $("#taskType").value;
  const brief = $("#taskBrief").value.trim();
  const label = {
    content: "内容策划官",
    visual: "视觉设计官",
    video: "视频制作官",
    intel: "市场情报官",
  }[type] || "AI 员工";
  legacyTasks.unshift({ title: brief || "新的经营任务", status: `新任务 / ${label}`, tone: "doing" });
  renderTasks();
  scrollToId("tasks");
}

document.querySelectorAll("[data-scroll]").forEach((button) => {
  button.addEventListener("click", () => scrollToId(button.dataset.scroll));
});

$("#openTaskComposer").addEventListener("click", () => scrollToId("taskComposer"));
$("#startPlan").addEventListener("click", buildAdvice);
$("#showAdvice").addEventListener("click", buildAdvice);
$("#saveGoal").addEventListener("click", buildAdvice);
$("#startOperatorTasks").addEventListener("click", () => {
  buildAdvice();
  scrollToId("tasks");
});
$("#createTask").addEventListener("click", createTask);

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-copy]");
  if (!button) return;
  await navigator.clipboard.writeText(button.dataset.copy);
  button.textContent = "已复制";
  setTimeout(() => { button.textContent = "复制文案"; }, 1200);
});

renderTasks();
renderRadar();
renderDeliverables();
buildAdvice();
