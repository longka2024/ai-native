const apiBase = location.protocol === "file:" ? "http://localhost:3760" : "";

const capabilities = [
  {
    name: "Waza / 自我进化机制",
    owner: "技术治理官",
    status: "新接入",
    input: "新仓库、新 skill、故障记录、发布记录、重复踩坑、项目健康信号",
    output: "取舍判断、根因报告、发布检查、健康体检、Longka 自有 SOP 和 skills",
    job: "把外部技术营养消化成自己的基座，淘汰冗余方案，沉淀能复用、能验证、能迭代的 Longka 能力。",
  },
  {
    name: "wechat-assistant / 私域情报",
    owner: "经营情报员工",
    status: "高风险参考",
    input: "授权聊天记录、导出文件、公开评论、群聊摘要、客户沟通素材",
    output: "待办、日程、商机信号、群聊热点、干货摘要、用户偏好画像",
    job: "吸收它的本地采集、增量同步、结构化提取和定时分析架构，但不把微信对抗式解密作为默认商业路径。",
  },
  {
    name: "wechat-radar / 经营雷达",
    owner: "情报看板员工",
    status: "高价值参考",
    input: "群聊消息、链接、@我的消息、高信号人物、公开评论和授权业务素材",
    output: "今日优先看、话题雷达、链接情报、群日报、商机线索、可转任务信号",
    job: "把私域和公开渠道的噪声压缩成老板每天能处理的经营看板，而不是让客户面对原始聊天记录。",
  },
  {
    name: "garden-skills 技能工厂",
    owner: "架构官 / 培训官",
    status: "新接入",
    input: "业务目标、素材、行业知识、历史方法论",
    output: "可复用 Skill、岗位 SOP、任务模板、验收标准",
    job: "把零散技能封装成 AI 员工可以稳定调用的能力模块。",
  },
  {
    name: "open-design / html-anything",
    owner: "设计员工",
    status: "可封装",
    input: "产品说明、风格参考、页面结构",
    output: "网页、海报、交互原型、小程序页面草案",
    job: "把老板的想法变成能看见、能改、能交付的设计稿。",
  },
  {
    name: "taste-skill / 审美治理",
    owner: "设计质检官",
    status: "新接入",
    input: "页面草案、截图、现有前端、小程序页面、工作台界面",
    output: "高级改版建议、按钮层级、留白节奏、移动端适配、空/加载/错误状态",
    job: "把能用但丑、挤、模板感强的页面，改到客户愿意看、愿意点、愿意信任的水平。",
  },
  {
    name: "GSAP Skills / 动效交互",
    owner: "动效员工",
    status: "新接入",
    input: "页面结构、设计稿、任务流、产品故事线",
    output: "滚动叙事页、工作台动效、员工状态流转、强展示落地页",
    job: "把静态页面变成可理解、可演示、可成交的动态产品体验。",
  },
  {
    name: "video-use / Remotion / KIE",
    owner: "视频员工",
    status: "已在小妹工作台验证",
    input: "案例图、脚本文案、模板、背景音乐 key",
    output: "种草视频、演示视频、封面、配乐成片",
    job: "把色彩项目的样片和小程序使用过程做成可发布视频。",
  },
  {
    name: "gpt-image-2 / awesome-gpt-image-2",
    owner: "视觉员工",
    status: "持续优化",
    input: "客户照片、版式参考、男女差异化提示词",
    output: "试看图、完整报告图、社交分享图",
    job: "沉淀高质量图像模板，解决像本人、好看、可传播的问题。",
  },
  {
    name: "Mediacrawler / wx cli / 评论区采集",
    owner: "情报员工",
    status: "谨慎接入",
    input: "公开评论区、合规导出的聊天记录、高价值信息源",
    output: "客户痛点、商机信号、选题来源",
    job: "不和平台风控对抗，优先使用公开数据和客户授权数据。",
  },
  {
    name: "GEOFlow / AI 搜索优化",
    owner: "增长员工",
    status: "待打通",
    input: "品牌关键词、产品页面、竞品问题",
    output: "AI 搜索曝光建议、内容任务、品牌问答资产",
    job: "让客户在 AI 搜索和问答场景里更容易被看见。",
  },
  {
    name: "md2wechat-skill / 公众号排版发布",
    owner: "公众号交付员工",
    status: "新接入",
    input: "Markdown 文章、封面图、主题风格、公众号凭证",
    output: "微信格式 HTML、预览页、公众号草稿、封面图和信息图",
    job: "把内容员工产出的文章确定性排版成公众号可发布稿，支持主题化交付和草稿箱发布。",
  },
];

const workflowLayers = [
  {
    no: "01",
    name: "上下文层",
    owner: "企业大脑",
    status: "已起步",
    summary: "把老板的业务资料、项目目标、客户画像、平台规则和历史判断整理成 AI 能读懂的经营上下文。",
    ready: ["企业 / 项目档案", "高价值资料池", "技术基座清单"],
    next: "补客户画像、禁区规则、历史成交案例和素材库索引，让每个项目有独立上下文。",
    proof: "AI 员工接任务前能自动读取当前项目资料，并引用到产物里。",
    actionKey: "context-profile",
    actionLabel: "建立上下文任务",
  },
  {
    no: "02",
    name: "任务层",
    owner: "调度官",
    status: "正在打通",
    summary: "把老板一句话需求拆成选题、文案、图片、视频、公众号、朋友圈、客服回复和复盘任务。",
    ready: ["今日经营建议", "选题流水线", "生产任务入库"],
    next: "增加任务模板、优先级、预算、截止时间和人工批准节点。",
    proof: "老板批准一个目标后，系统自动生成可执行任务，而不是只给聊天建议。",
    actionKey: "task-template",
    actionLabel: "生成任务模板",
  },
  {
    no: "03",
    name: "执行层",
    owner: "AI 员工",
    status: "可演示",
    summary: "情报、内容、设计、视频、增长等 AI 员工按 SOP 工作，产物进入验收区。",
    ready: ["AI 员工工作台", "岗位 SOP", "员工状态流转"],
    next: "把 open-design、md2wechat、Remotion、小妹视频工作台接成真实可调用工具。",
    proof: "每个员工都有输入、步骤、边界、产物和执行日志。",
    actionKey: "tool-wiring",
    actionLabel: "接入执行工具",
  },
  {
    no: "04",
    name: "反馈层",
    owner: "验收官",
    status: "待加强",
    summary: "每个内容、图片、视频和订单结果都要被检查，失败原因回到规则和模板里。",
    ready: ["经营日志", "人工判断", "选题评分"],
    next: "补图片质量、视频成片、内容发布、点击、留资、付款和复购的反馈指标。",
    proof: "一次失败能定位到素材、提示词、工具、任务拆解或交付链路中的具体原因。",
    actionKey: "feedback-metrics",
    actionLabel: "补反馈指标",
  },
  {
    no: "05",
    name: "治理层",
    owner: "系统管理员",
    status: "基础可用",
    summary: "控制权限、成本、日志、导入导出、失败重试和回滚，避免 AI 员工失控。",
    ready: ["经营数据导出", "备份导入", "活动日志"],
    next: "补按客户隔离、员工权限、调用预算、错误重试、版本记录和发布前检查。",
    proof: "客户数据可迁移、可恢复、可审计，调试期开放，正式期可控。",
    actionKey: "governance-check",
    actionLabel: "生成治理清单",
  },
];

const state = {
  step: "sources",
  company: null,
  currentProjectId: null,
  projects: [],
  config: null,
  workbench: null,
  activityLog: [],
  rawMaterials: [],
  candidates: [],
  topics: [],
  tasks: [],
  assets: [],
};

const stagePanel = document.querySelector("#stagePanel");
const topicLibrary = document.querySelector("#topicLibrary");
const taskList = document.querySelector("#taskList");
const assetGrid = document.querySelector("#assetGrid");
const capabilityGrid = document.querySelector("#capabilityGrid");
const workflowLayerGrid = document.querySelector("#workflowLayerGrid");
const employeeGrid = document.querySelector("#employeeGrid");
const projectList = document.querySelector("#projectList");
const activityList = document.querySelector("#activityList");
const runButton = document.querySelector("#runPipeline");
const rerunButton = document.querySelector("#rerunPipeline");
const exportButton = document.querySelector("#exportButton");
const importFile = document.querySelector("#importFile");

document.querySelectorAll("[data-scroll]").forEach((button) => {
  button.addEventListener("click", () => scrollToId(button.dataset.scroll));
});

document.querySelectorAll(".step").forEach((button) => {
  button.addEventListener("click", () => {
    state.step = button.dataset.step;
    render();
  });
});

runButton.addEventListener("click", runPipeline);
rerunButton.addEventListener("click", runPipeline);
exportButton.addEventListener("click", exportData);
importFile.addEventListener("change", importData);
document.querySelector("#approveToday").addEventListener("click", async () => {
  for (const item of state.candidates.slice(0, 3)) await createProductionTask(item.id);
  await loadState();
  scrollToId("production");
});

document.querySelector("#approveWorkbench").addEventListener("click", approveWorkbench);
document.querySelector("#createProject").addEventListener("click", createProject);

document.addEventListener("click", async (event) => {
  const action = event.target.closest("[data-action]");
  if (!action) return;
  const id = action.dataset.id;
  if (action.dataset.action === "library") await addTopic(id);
  if (action.dataset.action === "task") await createProductionTask(id);
  if (action.dataset.action === "asset") await createProductionTask(id);
  if (action.dataset.action === "employee") await runEmployeeAction(action.dataset.employeeId, action.dataset.employeeAction);
  if (action.dataset.action === "select-project") await selectProject(action.dataset.projectId);
  if (action.dataset.action === "workflow") await createWorkflowAction(action.dataset.actionKey);
  await loadState();
});

loadState().catch(showError);

async function exportData() {
  const res = await fetch(`${apiBase}/api/export`);
  if (!res.ok) throwHttp(res);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ai-native-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast("经营数据已导出");
}

async function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    showToast("备份文件不是合法 JSON");
    event.target.value = "";
    return;
  }
  const ok = window.confirm("导入会覆盖当前演示数据，确定继续？");
  if (!ok) {
    event.target.value = "";
    return;
  }
  await postJson("/api/import", payload);
  event.target.value = "";
  await loadState();
  showToast("备份已导入");
}

async function loadState() {
  const data = await getJson("/api/state");
  Object.assign(state, data);
  render();
}

async function scanClippings() {
  setBusy(true, "正在扫描精选资料");
  try {
    const res = await postJson("/api/sources/clippings/scan", { limit: 40 });
    await loadState();
    showToast(`已扫描精选资料 ${res.count || 0} 条，进入高表现内容池`);
  } finally {
    setBusy(false);
  }
}

async function runPipeline() {
  setBusy(true, "正在运行流水线");
  try {
    await postJson("/api/config", readConfigFromForm());
    const res = await postJson("/api/pipeline/run", {});
    state.candidates = res.candidates || [];
    state.step = "screening";
    await loadState();
    scrollToId("pipeline");
  } finally {
    setBusy(false);
  }
}

async function addTopic(candidateId) {
  await postJson("/api/topics", { candidateId });
}

async function createProductionTask(candidateId) {
  await postJson("/api/production-tasks", { candidateId });
}

async function createWorkflowAction(actionKey) {
  const res = await postJson("/api/workflow-actions", { actionKey });
  showToast(`已生成系统建设任务：${res.task?.title || "待处理任务"}`);
  scrollToId("production");
}

async function approveWorkbench() {
  await postJson("/api/workbench/approve", {});
  await loadState();
  showToast("今日目标已批准，AI 员工可以派发任务");
}

async function runEmployeeAction(employeeId, action) {
  await postJson("/api/workbench/employee-action", { employeeId, action });
}

async function createProject() {
  const name = document.querySelector("#newProjectName").value.trim();
  const audience = document.querySelector("#newProjectAudience").value.trim();
  const goal = document.querySelector("#newProjectGoal").value.trim();
  if (!name) {
    showToast("先填写项目名称");
    return;
  }
  await postJson("/api/projects", { name, audience, goal });
  document.querySelector("#newProjectName").value = "";
  document.querySelector("#newProjectAudience").value = "";
  document.querySelector("#newProjectGoal").value = "";
  await loadState();
  showToast("项目已创建并切换");
}

async function selectProject(projectId) {
  await postJson("/api/projects/select", { projectId });
}

function readConfigFromForm() {
  return {
    project: document.querySelector("#configProject")?.value.trim(),
    audience: document.querySelector("#configAudience")?.value.trim(),
    goal: document.querySelector("#configGoal")?.value.trim(),
  };
}

function render() {
  renderProjects();
  renderEmployees();
  renderActivity();
  renderCapabilities();
  renderWorkflowLayers();
  renderConfig();
  document.querySelectorAll(".step").forEach((button) => {
    button.classList.toggle("active", button.dataset.step === state.step);
  });
  renderStage();
  renderLibrary();
  renderTasks();
  renderAssets();
}

function renderActivity() {
  const logs = state.activityLog || [];
  if (!logs.length) {
    activityList.innerHTML = `
      <article class="activity-empty">
        <b>还没有经营日志</b>
        <p>新建项目、运行流水线、派发员工和生成任务后，这里会自动记录。</p>
      </article>
    `;
    return;
  }
  activityList.innerHTML = logs.slice(0, 12).map((log) => `
    <article class="activity-row">
      <time>${escapeHtml(formatTime(log.at))}</time>
      <div>
        <span>${escapeHtml(log.projectName || "未绑定项目")}</span>
        <b>${escapeHtml(log.action)}</b>
        <p>${escapeHtml(log.detail)}</p>
      </div>
    </article>
  `).join("");
}

function renderProjects() {
  const company = state.company || {};
  document.querySelector("#companyName").textContent = company.name || "未命名企业";
  document.querySelector("#companyMeta").textContent = `${company.stage || "经营中"} / ${company.owner || "老板"}`;
  projectList.innerHTML = (state.projects || []).map((project) => {
    const active = project.id === state.currentProjectId;
    return `
      <article class="project-card ${active ? "active" : ""}">
        <div>
          <span>${escapeHtml(project.status)}</span>
          <b>${escapeHtml(project.name)}</b>
          <p>${escapeHtml(project.audience)}</p>
          <small>${escapeHtml(project.goal)}</small>
        </div>
        <button class="mini" data-action="select-project" data-project-id="${escapeAttr(project.id)}">${active ? "当前项目" : "切换"}</button>
      </article>
    `;
  }).join("");
}

function renderEmployees() {
  const workbench = state.workbench || { approved: false, employees: [] };
  const employees = workbench.employees || [];
  document.querySelector("#workbenchState").textContent = workbench.approved
    ? `已批准 ${formatTime(workbench.approvedAt)}`
    : "等待老板批准";
  document.querySelector("#approveWorkbench").disabled = Boolean(workbench.approved);
  employeeGrid.innerHTML = employees.map((item) => `
    <article class="employee-card">
      <div class="employee-top">
        <b>${escapeHtml(item.role)}</b>
        <span>${escapeHtml(item.status)}</span>
      </div>
      <ol>${item.sop.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>
      <div class="employee-rule">
        <strong>边界</strong>
        <p>${escapeHtml(item.boundary)}</p>
      </div>
      <div class="employee-output">
        <strong>验收产物</strong>
        <p>${escapeHtml(item.deliverable)}</p>
      </div>
      ${item.result ? `<pre class="employee-result">${escapeHtml(item.result)}</pre>` : ""}
      <div class="employee-actions">
        <button class="mini" data-action="employee" data-employee-id="${escapeAttr(item.id)}" data-employee-action="dispatch">派发</button>
        <button class="mini" data-action="employee" data-employee-id="${escapeAttr(item.id)}" data-employee-action="review">送验收</button>
        <button class="mini" data-action="employee" data-employee-id="${escapeAttr(item.id)}" data-employee-action="complete">通过</button>
      </div>
    </article>
  `).join("");
}

function renderCapabilities() {
  capabilityGrid.innerHTML = capabilities.map((item) => `
    <article class="capability-card">
      <div class="capability-head">
        <span>${escapeHtml(item.owner)}</span>
        <em>${escapeHtml(item.status)}</em>
      </div>
      <b>${escapeHtml(item.name)}</b>
      <p>${escapeHtml(item.job)}</p>
      <dl>
        <dt>输入</dt><dd>${escapeHtml(item.input)}</dd>
        <dt>产物</dt><dd>${escapeHtml(item.output)}</dd>
      </dl>
    </article>
  `).join("");
}

function renderWorkflowLayers() {
  if (!workflowLayerGrid) return;
  workflowLayerGrid.innerHTML = workflowLayers.map((layer) => `
    <article class="workflow-layer-card">
      <div class="layer-kicker">
        <span>${escapeHtml(layer.no)}</span>
        <em>${escapeHtml(layer.status)}</em>
      </div>
      <div class="layer-main">
        <b>${escapeHtml(layer.name)}</b>
        <small>${escapeHtml(layer.owner)}</small>
        <p>${escapeHtml(layer.summary)}</p>
      </div>
      <div class="layer-columns">
        <section>
          <strong>现在已有</strong>
          <ul>${layer.ready.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </section>
        <section>
          <strong>下一步补齐</strong>
          <p>${escapeHtml(layer.next)}</p>
        </section>
      </div>
      <div class="layer-proof">
        <strong>验收口径</strong>
        <span>${escapeHtml(layer.proof)}</span>
      </div>
      <button class="mini layer-action" data-action="workflow" data-action-key="${escapeAttr(layer.actionKey)}">${escapeHtml(layer.actionLabel)}</button>
    </article>
  `).join("");
}

function renderConfig() {
  const config = state.config || {};
  const project = document.querySelector("#configProject");
  const audience = document.querySelector("#configAudience");
  const goal = document.querySelector("#configGoal");
  if (project && document.activeElement !== project) project.value = config.project || "";
  if (audience && document.activeElement !== audience) audience.value = config.audience || "";
  if (goal && document.activeElement !== goal) goal.value = config.goal || "";
}

function renderStage() {
  const config = state.config || {};
  if (state.step === "sources") {
    stagePanel.innerHTML = `
      <div class="stage-header">
        <h3>第一步：数据表现雷达</h3>
        <div class="stage-actions">
          <button class="primary" id="scanClippings">扫描 Obsidian 精选文章</button>
          <button class="ghost" id="addMaterial">手动录入信号</button>
        </div>
      </div>
      <div class="source-note">
        <b>当前采集基座</b>
        <p>不是靠关键词乱搜，而是先接入你已经筛过的高价值资料库。关键词只做过滤，真正排序依据是来源质量、保存价值、主题命中、近期热度和可转化痛点。</p>
      </div>
      <div class="performance-list">
        ${state.rawMaterials.slice(0, 12).map(renderSignal).join("")}
      </div>
      <div class="material-box">
        <h4>补充高表现内容</h4>
        <textarea id="materialText" placeholder="把今天看到的评论、文章摘要、客户反馈粘贴到这里。每行一条。"></textarea>
        <button class="primary" id="saveMaterial">保存到信息池</button>
      </div>
    `;
    document.querySelector("#scanClippings").addEventListener("click", scanClippings);
    document.querySelector("#saveMaterial").addEventListener("click", saveMaterial);
    return;
  }

  if (state.step === "keywords") {
    const groups = [
      ["行业词", config.keywords?.industry || []],
      ["痛点词", config.keywords?.pain || []],
      ["项目词", config.keywords?.project || []],
      ["转化词", config.keywords?.conversion || []],
    ];
    stagePanel.innerHTML = `
      <div class="stage-header">
        <h3>第二步：定水源，不是堆关键词</h3>
        <button class="ghost">后续接信息源配置器</button>
      </div>
      <div class="source-note">
        <b>规则</b>
        <p>快水看热点，深水看高手长文和开源项目，慢水看报告和竞品，反水看评论和客户追问。关键词只是筛网，不是选题来源。</p>
      </div>
      <div class="keyword-grid">
        ${groups.map(([name, words]) => `
          <article class="keyword-card">
            <span>${name}</span>
            <ul>${words.map((word) => `<li>${escapeHtml(word)}</li>`).join("")}</ul>
          </article>
        `).join("")}
      </div>
    `;
    return;
  }

  if (state.step === "screening" || state.step === "judge" || state.step === "library") {
    const title = state.step === "screening" ? "第三步：AI 初筛" : state.step === "judge" ? "第四步：人工判断" : "第五步：入库排期";
    stagePanel.innerHTML = `
      <div class="stage-header">
        <h3>${title}</h3>
        <button class="ghost" id="stageRun">重新运行</button>
      </div>
      <div class="candidate-list">
        ${state.candidates.length ? state.candidates.map(renderCandidate).join("") : `<article class="candidate-card"><div><b>还没有候选选题</b><p>先扫描精选资料或保存信息池，再点击运行今日选题流水线。</p></div></article>`}
      </div>
    `;
    document.querySelector("#stageRun").addEventListener("click", runPipeline);
  }
}

async function saveMaterial() {
  const text = document.querySelector("#materialText").value.trim();
  if (!text) return;
  await postJson("/api/materials", { source: "手动录入", text });
  await loadState();
}

function renderCandidate(item) {
  return `
    <article class="candidate-card">
      <div>
        <span>${escapeHtml(item.source)} / ${escapeHtml(item.platform)} / ${escapeHtml(item.formula)}</span>
        <b>${escapeHtml(item.title)}</b>
        <p>${escapeHtml(item.angle)}</p>
        <ul>${(item.material || []).map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>
        <div class="signal-mini-list">
          ${(item.signals || []).map((signal) => `
            <small>${escapeHtml(signal.source)} / 表现分 ${escapeHtml(signal.performanceScore)} / ${escapeHtml(signal.pain)}</small>
          `).join("")}
        </div>
      </div>
      <div class="score">${escapeHtml(item.score)}</div>
      <div class="candidate-actions">
        <button class="mini" data-action="library" data-id="${escapeAttr(item.id)}">入库</button>
        <button class="mini" data-action="task" data-id="${escapeAttr(item.id)}">生成任务</button>
        <button class="mini" data-action="asset" data-id="${escapeAttr(item.id)}">生成内容草稿</button>
        <button class="mini danger">淘汰</button>
      </div>
    </article>
  `;
}

function renderSignal(item) {
  const metrics = item.metrics || {};
  const total = Number(metrics.likes || 0) + Number(metrics.comments || 0) + Number(metrics.saves || 0) + Number(metrics.shares || 0);
  return `
    <article class="signal-row">
      <div>
        <span>${escapeHtml(item.source)} / ${escapeHtml(item.pain || "待分析痛点")}</span>
        <b>${escapeHtml(item.text)}</b>
      </div>
      <div class="metric-grid">
        <em>赞 ${escapeHtml(metrics.likes || 0)}</em>
        <em>评 ${escapeHtml(metrics.comments || 0)}</em>
        <em>藏 ${escapeHtml(metrics.saves || 0)}</em>
        <em>转 ${escapeHtml(metrics.shares || 0)}</em>
        <strong>热度 ${total}</strong>
        <strong>增长 ${escapeHtml(metrics.growth || 0)}%</strong>
      </div>
    </article>
  `;
}

function renderLibrary() {
  if (!state.topics.length) {
    topicLibrary.innerHTML = `<article class="topic-card"><b>还没有入库选题</b><p>从候选选题点击“入库”，会真实写入本地数据文件。</p></article>`;
    return;
  }
  topicLibrary.innerHTML = state.topics.map((item) => `
    <article class="topic-card">
      <span>${escapeHtml(item.status || "待生产")}</span>
      <b>${escapeHtml(item.title)}</b>
      <p>${escapeHtml(item.angle)}</p>
      <div class="topic-meta">
        <em>${escapeHtml(item.platform)}</em>
        <em>${escapeHtml(item.formula)}</em>
        <em>${escapeHtml(item.score)} 分</em>
      </div>
    </article>
  `).join("");
}

function renderTasks() {
  if (!state.tasks.length) {
    taskList.innerHTML = `<article class="task-card"><b>还没有生产任务</b><p>点击候选选题里的“生成任务”，会写入任务记录。</p></article>`;
    return;
  }
  taskList.innerHTML = state.tasks.map((task) => `
    <article class="task-card">
      <span>${escapeHtml(task.layer ? `${task.layer} / ${task.owner}` : task.owner)}</span>
      <b>${escapeHtml(task.title)}</b>
      <p>${escapeHtml(task.next)}</p>
      ${task.acceptance ? `<small>${escapeHtml(task.acceptance)}</small>` : ""}
    </article>
  `).join("");
}

function renderAssets() {
  if (!state.assets.length) {
    assetGrid.innerHTML = `
      <article class="asset-card">
        <span>等待生成</span>
        <b>还没有今日交付内容</b>
        <p>生成任务后，这里会保存小红书、朋友圈或视频脚本草稿。</p>
      </article>
    `;
    return;
  }
  assetGrid.innerHTML = state.assets.map((asset) => `
    <article class="asset-card">
      <span>${escapeHtml(asset.type)}</span>
      <b>${escapeHtml(asset.title)}</b>
      <pre>${escapeHtml(asset.copy)}</pre>
    </article>
  `).join("");
}

function scrollToId(id) {
  const target = document.querySelector(`#${id}`);
  if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setBusy(busy, label = "正在运行") {
  runButton.disabled = busy;
  rerunButton.disabled = busy;
  runButton.textContent = busy ? label : "运行今日选题流水线";
  rerunButton.textContent = busy ? label : "重新生成候选选题";
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}

function showError(error) {
  console.error(error);
  showToast(error.message || "操作失败");
}

async function getJson(path) {
  const res = await fetch(`${apiBase}${path}`);
  if (!res.ok) throwHttp(res);
  return res.json();
}

async function postJson(path, body) {
  const res = await fetch(`${apiBase}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throwHttp(res);
  return res.json();
}

function throwHttp(res) {
  const error = new Error(`HTTP ${res.status}`);
  error.status = res.status;
  throw error;
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

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
