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
    ready: ["今日经营建议", "选题中心", "生产任务入库"],
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
  operatorWorkType: "xhs-article",
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
const outcomeTitle = document.querySelector("#outcomeTitle");
const outcomeSummary = document.querySelector("#outcomeSummary");
const outcomeDigest = document.querySelector("#outcomeDigest");
const outcomeGrid = document.querySelector("#outcomeGrid");
const quickTaskGrid = document.querySelector("#quickTaskGrid");
const runButton = document.querySelector("#runPipeline");
const rerunButton = document.querySelector("#rerunPipeline");
const exportButton = document.querySelector("#exportButton");
const importFile = document.querySelector("#importFile");
const operatorHome = ensureOperatorHome();

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
document.querySelector("#buildOutcome").addEventListener("click", buildOutcomePack);

document.addEventListener("click", async (event) => {
  const copyButton = event.target.closest("[data-copy-target]");
  if (copyButton) {
    copyTextFrom(copyButton.dataset.copyTarget);
    return;
  }
  const scrollButton = event.target.closest("[data-scroll]");
  if (scrollButton) {
    scrollToId(scrollButton.dataset.scroll);
    return;
  }
  const workTypeButton = event.target.closest("[data-work-type]");
  if (workTypeButton) {
    state.operatorWorkType = workTypeButton.dataset.workType;
    renderOperatorHomeV2();
    return;
  }
  const workflowStepButton = event.target.closest("[data-workflow-step]");
  if (workflowStepButton) {
    state.step = workflowStepButton.dataset.workflowStep;
    renderOperatorHomeV2();
    return;
  }
  const action = event.target.closest("[data-action]");
  if (!action) return;
  const id = action.dataset.id;
  if (action.dataset.action === "library") await addTopic(id);
  if (action.dataset.action === "task") await createProductionTask(id);
  if (action.dataset.action === "asset") await createProductionTask(id);
  if (action.dataset.action === "employee") await runEmployeeAction(action.dataset.employeeId, action.dataset.employeeAction);
  if (action.dataset.action === "select-project") await selectProject(action.dataset.projectId);
  if (action.dataset.action === "workflow") await createWorkflowAction(action.dataset.actionKey);
  if (action.dataset.action === "execute-task") {
    const result = await executeTask(id);
    showToast(result.asset ? "已生成下一轮发布包" : "任务已处理");
  }
  if (action.dataset.action === "export-cards") {
    action.disabled = true;
    action.textContent = "正在导出卡片...";
    const result = await exportXhsCards(id);
    showToast(`已导出 ${result.manifest?.count || 0} 张小红书卡片`);
  }
  if (action.dataset.action === "export-video-package") {
    action.disabled = true;
    action.textContent = "正在交接视频任务...";
    await exportVideoPackage(id);
    showToast("已交接给小妹视频工作台");
  }
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

async function exportXhsCards(assetId) {
  return postJson("/api/assets/export-xhs-cards", { assetId });
}

async function exportVideoPackage(assetId) {
  return postJson("/api/assets/export-video-package", { assetId });
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
  setBusy(true, "正在运行内容生产线");
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

async function executeTask(taskId) {
  return postJson("/api/tasks/execute", { taskId });
}

async function buildOutcomePack() {
  const candidates = state.candidates || [];
  if (!candidates.length) {
    await runPipeline();
  }
  const latest = state.candidates?.length ? state.candidates : candidates;
  for (const item of latest.slice(0, 3)) await createProductionTask(item.id);
  await loadState();
  scrollToId("outcomes");
  showToast("今日成果包已生成");
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
  renderOperatorHomeV2();
  renderDashboardMetrics();
  renderQuickTasks();
  renderProjects();
  renderEmployees();
  renderOutcomes();
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

function renderDashboardMetrics() {
  const pairs = [
    ["#metricSignals", state.rawMaterials?.length || 0],
    ["#metricCandidates", state.candidates?.length || 0],
    ["#metricTasks", state.tasks?.length || 0],
    ["#metricAssets", state.assets?.length || 0],
  ];
  for (const [selector, value] of pairs) {
    const node = document.querySelector(selector);
    if (node) node.textContent = value;
  }
}

function ensureOperatorHome() {
  const workspace = document.querySelector(".workspace");
  if (!workspace) return null;
  let node = document.querySelector("#operatorHome");
  if (!node) {
    node = document.createElement("section");
    node.id = "operatorHome";
    node.className = "operator-home";
    workspace.prepend(node);
  }
  return node;
}

function renderOperatorHome() {
  if (!operatorHome) return;
  const asset = pickOperatorAsset();
  const structured = asset.structured || {};
  const cards = asset.exportedCards;
  const videoExport = asset.exportedVideoPackage;
  const finalVideo = "E:\\Codex\\my-video\\out\\standard\\final\\color-miniapp-flow.mp4";
  const coverFile = "E:\\Codex\\my-video\\out\\standard\\covers\\color-miniapp-flow.jpg";
  const title = structured.selectedTitle || asset.title || "先运行内容生产线";
  const body = Array.isArray(structured.bodyDraft) ? structured.bodyDraft.join("\n") : asset.copy || "";
  const bodyId = "operatorDraftCopy";
  const cardsReady = Boolean(cards?.count);
  const videoReady = Boolean(videoExport?.jobDir);
  const firstCard = cards?.files?.[0] || "";
  const progressText = [asset.id, cardsReady, videoReady].filter(Boolean).length;

  operatorHome.innerHTML = `
    <div class="operator-hero">
      <div>
        <p class="eyebrow">CONTENT WORKBENCH</p>
        <h1>小红书内容生产台</h1>
        <p class="operator-subtitle">给小妹用的第一版：按顺序完成选题、图文、视频。不要看技术细节，先把今天能发的内容做出来。</p>
      </div>
      <button class="primary" data-scroll="contentWorkflow">开始生产内容</button>
    </div>

    <div class="operator-main-grid">
      <article class="operator-focus-card">
        <span>第 1 步：确认今天要发什么</span>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(structured.hook || "先生成一套选题包，这里会显示今天最值得推进的内容角度。")}</p>
        <div class="operator-actions">
          <button class="primary" data-action="export-cards" data-id="${escapeAttr(asset.id || "")}" ${asset.id ? "" : "disabled"}>${cardsReady ? "重新生成图文" : "生成小红书图文"}</button>
          <button class="ghost" data-action="export-video-package" data-id="${escapeAttr(asset.id || "")}" ${asset.id && structured.videoPackage ? "" : "disabled"}>${videoReady ? "重新生成视频任务" : "生成视频任务"}</button>
        </div>
      </article>

      <article class="operator-next-card">
        <span>完成进度 ${progressText}/3</span>
        <ol>
          <li class="${asset.id ? "done" : ""}">选出一个高价值选题</li>
          <li class="${cardsReady ? "done" : ""}">导出小红书图文卡片</li>
          <li class="${videoReady ? "done" : ""}">交给小妹工作台做视频</li>
        </ol>
      </article>
    </div>

    <div class="operator-deliverables">
      <article>
        <b>小红书图文</b>
        <p>${cardsReady ? `已生成 ${cards.count} 张 PNG 卡片。` : "等待导出图文卡片。"}</p>
        ${cardsReady ? `<button class="mini" data-scroll="assets">查看图文包</button>` : `<button class="mini" data-action="export-cards" data-id="${escapeAttr(asset.id || "")}" ${asset.id ? "" : "disabled"}>生成图文</button>`}
      </article>
      <article>
        <b>宣传短视频</b>
        <p>${videoReady ? "视频任务已交给小妹工作台。" : "等待交接视频任务。"}</p>
        ${videoReady ? `<button class="mini" data-scroll="assets">查看视频任务</button>` : `<button class="mini" data-action="export-video-package" data-id="${escapeAttr(asset.id || "")}" ${asset.id && structured.videoPackage ? "" : "disabled"}>生成视频任务</button>`}
      </article>
      <article>
        <b>视频封面</b>
        <p>成片发布时搭配这张封面。</p>
        <button class="mini" data-scroll="assets">查看封面位置</button>
      </article>
    </div>

    <details class="operator-draft">
      <summary>查看发布文案</summary>
      <button class="mini" data-copy-target="${bodyId}">复制文案</button>
      <textarea id="${bodyId}" readonly>${escapeHtml(body)}</textarea>
    </details>

    <details class="operator-tech">
      <summary>技术详情和文件位置</summary>
      <div>
        <p><b>图文卡片：</b>${escapeHtml(firstCard || "尚未导出")}</p>
        <p><b>最终视频：</b>${escapeHtml(finalVideo)}</p>
        <p><b>视频封面：</b>${escapeHtml(coverFile)}</p>
      </div>
    </details>
  `;
}

function pickOperatorAsset() {
  const assets = state.assets || [];
  return assets.find((item) => item.exportedCards && item.exportedVideoPackage)
    || assets.find((item) => item.exportedCards || item.exportedVideoPackage)
    || assets.find((item) => item.structured?.videoPackage)
    || assets[0]
    || {};
}

function renderOperatorHomeV2() {
  if (!operatorHome) return;
  const asset = pickOperatorAsset();
  const structured = asset.structured || {};
  const cards = asset.exportedCards;
  const videoExport = asset.exportedVideoPackage;
  const activeWork = getOperatorWorkTypes().find((item) => item.id === state.operatorWorkType) || getOperatorWorkTypes()[0];
  const cardsReady = Boolean(cards?.count);
  const videoReady = Boolean(videoExport?.jobDir);
  const assetReady = Boolean(asset.id);
  const steps = getOperatorWorkflowSteps({ cardsReady, videoReady, assetReady });
  const activeStep = steps.find((item) => item.key === state.step) || steps[0];
  const topicTitle = structured.selectedTitle || asset.title || "先采集素材，系统会给出候选选题";
  const body = Array.isArray(structured.bodyDraft) ? structured.bodyDraft.join("\n") : asset.copy || "";
  const bodyId = "operatorDraftCopy";

  operatorHome.innerHTML = `
    <div class="pro-home">
      <section class="pro-hero">
        <div class="pro-hero-copy">
          <span class="pro-kicker">AI NATIVE CONTENT OS</span>
          <h1>先选今天要干的活，再让系统跑完整内容流程。</h1>
          <p>顾客打开页面，第一眼只需要回答一个问题：今天要做图文、视频、朋友圈，还是长文？选完以后，系统才进入采集、筛选、分析、改造和生产。</p>
        </div>
        <div class="pro-hero-action">
          <button class="primary pro-primary" data-scroll="contentWorkflow">开始采集选题</button>
          <small>当前已采集 ${state.rawMaterials?.length || 0} 条素材，生成 ${state.candidates?.length || 0} 个候选。</small>
        </div>
      </section>

      <section class="pro-work-picker">
        <div class="pro-section-head">
          <span>今天要完成什么工作？</span>
          <small>先选任务类型，再进入 7 步流程。</small>
        </div>
        <div class="pro-work-grid">
          ${getOperatorWorkTypes().map((item) => `
            <button class="pro-work-card ${item.id === activeWork.id ? "active" : ""}" data-work-type="${escapeAttr(item.id)}">
              <i>${escapeHtml(item.tag)}</i>
              <b>${escapeHtml(item.title)}</b>
              <small>${escapeHtml(item.desc)}</small>
            </button>
          `).join("")}
        </div>
      </section>

      <section class="pro-current">
        <article class="pro-current-main">
          <span>当前任务</span>
          <h2>${escapeHtml(activeWork.title)}</h2>
          <p>${escapeHtml(activeWork.plan)}</p>
          <div class="pro-current-actions">
            <button class="primary" data-scroll="contentWorkflow">去做第 1 步：采集</button>
            <button class="ghost" data-scroll="assets">查看已生成结果</button>
          </div>
        </article>
        <article class="pro-topic">
          <span>当前推荐选题</span>
          <h3>${escapeHtml(topicTitle)}</h3>
          <p>${escapeHtml(structured.hook || "采集完成后，这里会显示候选选题、推荐理由、评论痛点和数据表现。")}</p>
        </article>
      </section>

      <section class="pro-flow">
        <div class="pro-section-head">
          <span>7 步内容生产流程</span>
          <small>小红书、抖音、视频号、朋友圈、公众号都走这套底层流程。</small>
        </div>
        <div class="pro-flow-grid">
          ${steps.map((step) => `
            <button class="pro-flow-step ${step.done ? "done" : ""} ${step.key === activeStep.key ? "active" : ""}" data-workflow-step="${escapeAttr(step.key)}">
              <em>${escapeHtml(step.no)}</em>
              <b>${escapeHtml(step.title)}</b>
              <small>${escapeHtml(step.desc)}</small>
            </button>
          `).join("")}
        </div>
      </section>

      <section class="pro-step-detail">
        ${renderOperatorStepDetail(activeWork, activeStep, { asset, structured, cardsReady, videoReady })}
      </section>

      <section class="pro-output">
        <div class="pro-section-head">
          <span>当前产物</span>
          <small>这里才放用户拿得走的东西，技术路径默认折叠。</small>
        </div>
        <div class="pro-output-grid">
          <article>
            <b>图文卡片</b>
            <p>${cardsReady ? `已生成 ${cards.count} 张 PNG。` : "还没有导出图文卡片。"}</p>
            <button class="mini" data-action="export-cards" data-id="${escapeAttr(asset.id || "")}" ${asset.id ? "" : "disabled"}>${cardsReady ? "重新生成" : "生成图文"}</button>
          </article>
          <article>
            <b>视频任务</b>
            <p>${videoReady ? "已交给小妹视频工作台。" : "还没有生成视频任务。"}</p>
            <button class="mini" data-action="export-video-package" data-id="${escapeAttr(asset.id || "")}" ${asset.id && structured.videoPackage ? "" : "disabled"}>${videoReady ? "重新交接" : "生成视频任务"}</button>
          </article>
          <article>
            <b>发布文案</b>
            <p>${body ? "正文草稿已生成，可以复制后人工微调。" : "等待生成正文。"}</p>
            <button class="mini" data-copy-target="${bodyId}" ${body ? "" : "disabled"}>复制文案</button>
          </article>
        </div>
      </section>

      <details class="operator-draft">
        <summary>查看发布文案</summary>
        <textarea id="${bodyId}" readonly>${escapeHtml(body)}</textarea>
      </details>

      <details class="operator-tech">
        <summary>技术详情和文件位置</summary>
        <div>
          <p><b>图文卡片：</b>${escapeHtml(cards?.files?.[0] || "尚未导出")}</p>
          <p><b>最终视频：</b>E:\\Codex\\my-video\\out\\standard\\final\\color-miniapp-flow.mp4</p>
          <p><b>视频封面：</b>E:\\Codex\\my-video\\out\\standard\\covers\\color-miniapp-flow.jpg</p>
        </div>
      </details>
    </div>
  `;
}

function getOperatorWorkTypes() {
  return [
    { id: "xhs-article", tag: "图文", title: "小红书图文", desc: "做搜索、收藏、评论承接。", plan: "先采集行业里的高表现图文，再拆标题、封面、正文结构和评论痛点，最后生成图文卡片与正文草稿。" },
    { id: "short-video", tag: "视频", title: "抖音 / 视频号 / 小红书视频", desc: "做演示、种草、案例传播。", plan: "先找同类短视频的爆点，再拆 3 秒开头、镜头结构、口播和 CTA，最后交给视频工作台生成成片任务。" },
    { id: "moments", tag: "私域", title: "朋友圈种草", desc: "做信任、案例、转化。", plan: "把公开平台选题改造成朋友圈能发的话术，重点展示过程、反馈和可参与的小工具，而不是硬广告。" },
    { id: "longform", tag: "长文", title: "公众号 / 长文", desc: "做方法论、案例复盘。", plan: "把多个短内容选题沉淀成长文结构，用来解释原理、流程、案例和常见问题。" },
  ];
}

function getOperatorWorkflowSteps({ cardsReady, videoReady, assetReady }) {
  return [
    { no: "01", key: "sources", title: "采集", desc: "行业、平台、关键词、账号。", done: (state.rawMaterials || []).length > 0 },
    { no: "02", key: "screening", title: "筛选", desc: "数据表现和评论质量。", done: (state.candidates || []).length > 0 },
    { no: "03", key: "judge", title: "分析", desc: "标题、开头、结构、痛点。", done: assetReady },
    { no: "04", key: "transform", title: "改造", desc: "迁移到自己的业务。", done: assetReady },
    { no: "05", key: "copy", title: "成文", desc: "正文、脚本、配文。", done: assetReady },
    { no: "06", key: "package", title: "配套", desc: "卡片、封面、视频包。", done: cardsReady || videoReady },
    { no: "07", key: "review", title: "复盘", desc: "数据回流下一轮。", done: false },
  ];
}

function renderOperatorStepDetail(activeWork, step, context) {
  const detailMap = {
    sources: ["先告诉系统：今天要抓什么素材？", `当前任务是「${activeWork.title}」。输入行业、关键词、平台或对标账号，系统会抓取今天值得参考的内容。`, [["去填写采集条件", "contentWorkflow", true], [`已采集 ${state.rawMaterials?.length || 0} 条素材`, "contentWorkflow", false]]],
    screening: ["系统给出候选选题，你来挑。", "筛选不是随便列标题，而是比较数据表现、评论痛点、收藏理由和是否适合你的业务。", [[`查看 ${state.candidates?.length || 0} 个候选`, "contentWorkflow", true], ["进入选题库", "library", false]]],
    judge: ["分析这个选题为什么值得做。", "拆标题公式、黄金开头、用户情绪、评论区真实问题和转化入口。分析通过后，才进入改造。", [["查看分析结果", "contentWorkflow", true]]],
    transform: ["把别人的爆款，改造成你的业务内容。", "不搬运，不照抄。把爆款里的情绪、结构和痛点迁移到你的产品、案例和小工具上。", [["查看改造后的发布包", "assets", true]]],
    copy: ["生成可以人工微调的正文和脚本。", `当前已有 ${state.assets?.length || 0} 份内容资产。文案必须能复制、能修改、能直接交给小妹继续做视频。`, [["查看文案", "assets", true]]],
    package: ["把文字变成可交付素材包。", "这里产出图文卡片、视频任务、封面、配文和文件包。小妹只需要拿这些去发布或继续制作。", []],
    review: ["发布后把数据拿回来，下一轮才会更准。", "记录点赞、收藏、评论、私信、成交和用户追问，让系统知道什么内容真的有效。", [["查看复盘区", "assets", true]]],
  };
  const [title, body, actions] = detailMap[step.key] || detailMap.sources;
  return `
    <article class="pro-step-card">
      <div>
        <span>当前步骤：${escapeHtml(step.no)} ${escapeHtml(step.title)}</span>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(body)}</p>
      </div>
      <div class="pro-step-actions">
        ${actions.map(([label, scroll, primary]) => `<button class="${primary ? "primary" : "ghost"}" data-scroll="${escapeAttr(scroll)}">${escapeHtml(label)}</button>`).join("")}
        ${step.key === "package" ? `
          <button class="primary" data-action="export-cards" data-id="${escapeAttr(context.asset.id || "")}" ${context.asset.id ? "" : "disabled"}>${context.cardsReady ? "重新生成图文" : "生成图文"}</button>
          <button class="ghost" data-action="export-video-package" data-id="${escapeAttr(context.asset.id || "")}" ${context.asset.id && context.structured.videoPackage ? "" : "disabled"}>${context.videoReady ? "重新生成视频任务" : "生成视频任务"}</button>
        ` : ""}
      </div>
    </article>
  `;
}

function renderQuickTasks() {
  if (!quickTaskGrid) return;
  const tasks = [
    {
      tag: "今日内容",
      title: "生成今天内容包",
      desc: "根据客户问题库和项目上下文，生成 3 个可执行内容任务和草稿。",
      button: "交给内容员工",
      run: "build-outcome",
    },
    {
      tag: "客户问题",
      title: "把问题变成选题",
      desc: "把测试反馈、评论区、群聊摘要里的问题整理成可发布选题。",
      button: "运行选题中心",
      run: "pipeline",
    },
    {
      tag: "短视频",
      title: "送小妹视频工作台",
      desc: "把今日主推选题改成短视频脚本、封面方向和素材要求。",
      button: "生成视频任务",
      run: "video-task",
    },
    {
      tag: "朋友圈",
      title: "生成发圈配文",
      desc: "把试看图、完整报告和用户炫耀心理改成朋友圈种草文案。",
      button: "生成草稿",
      run: "copy-task",
    },
    {
      tag: "复盘",
      title: "检查交付风险",
      desc: "围绕订单丢失、付款后看不到、图片不像本人做风险清单。",
      button: "生成复盘任务",
      run: "review-task",
    },
    {
      tag: "高级模式",
      title: "接入一个技术基座",
      desc: "把 open-design、md2wechat、Remotion 或私域雷达接成可调用能力。",
      button: "生成接入任务",
      run: "tool-task",
    },
  ];

  quickTaskGrid.innerHTML = tasks.map((item) => `
    <article class="quick-task-card">
      <span>${escapeHtml(item.tag)}</span>
      <b>${escapeHtml(item.title)}</b>
      <p>${escapeHtml(item.desc)}</p>
      <button class="mini" data-quick-run="${escapeAttr(item.run)}">${escapeHtml(item.button)}</button>
    </article>
  `).join("");

  quickTaskGrid.querySelectorAll("[data-quick-run]").forEach((button) => {
    button.addEventListener("click", () => runQuickTask(button.dataset.quickRun));
  });
}

async function runQuickTask(kind) {
  if (kind === "pipeline") {
    await runPipeline();
    return;
  }
  if (kind === "build-outcome") {
    await buildOutcomePack();
    return;
  }
  if (kind === "video-task") {
    await ensureCandidatesThenTask("男士");
    showToast("已生成视频任务，去生产任务查看");
    scrollToId("production");
    return;
  }
  if (kind === "copy-task") {
    await ensureCandidatesThenTask("试看");
    showToast("已生成发圈/图文草稿");
    scrollToId("assets");
    return;
  }
  if (kind === "review-task") {
    await createWorkflowAction("feedback-metrics");
    return;
  }
  if (kind === "tool-task") {
    await createWorkflowAction("tool-wiring");
  }
}

async function ensureCandidatesThenTask(keyword) {
  if (!state.candidates?.length) await runPipeline();
  const latest = (await getJson("/api/state")).candidates || [];
  const picked = latest.find((item) => item.title.includes(keyword)) || latest[0];
  if (picked) await createProductionTask(picked.id);
  await loadState();
}

function renderOutcomes() {
  const candidates = state.candidates || [];
  const tasks = state.tasks || [];
  const assets = state.assets || [];
  const top = candidates[0] || topicsFirst() || null;
  const projectName = state.config?.project || "当前项目";
  outcomeTitle.textContent = top ? `今天先推：${top.title}` : "等待生成今日经营成果";
  outcomeSummary.textContent = top
    ? `围绕「${projectName}」，系统已把高表现信号整理成可判断选题、生产任务和可复制发布草稿。`
    : "运行选题中心后，这里会自动整理今天最值得推进的选题、任务和可复制文案。";

  const digest = buildDigestText(top, tasks, assets);
  outcomeDigest.innerHTML = `
    <div>
      <span>老板摘要</span>
      <pre>${escapeHtml(digest)}</pre>
    </div>
  `;

  const cards = [
    {
      label: "1. 今天判断",
      title: top ? top.title : "先运行选题中心",
      body: top ? top.angle : "系统会根据信息池里的表现分、痛点和转化词生成候选选题。",
      meta: top ? [`${top.score} 分`, top.platform, top.formula] : ["未开始"],
      action: "老板只需要判断：这条今天值不值得发。",
    },
    {
      label: "2. 交给谁做",
      title: tasks[0]?.owner || "内容策划员工",
      body: tasks[0]?.next || "生成小红书正文、朋友圈配文和封面文案，再交给小妹视频工作台做视频。",
      meta: tasks.slice(0, 3).map((task) => task.status || "待制作"),
      action: "任务必须有负责人、下一步和验收口径。",
    },
    {
      label: "3. 能否发布",
      title: assets[0]?.title || "等待内容草稿",
      body: assets[0]?.copy || "点击“生成今日成果包”后，会生成可复制的发布草稿。",
      meta: assets.slice(0, 3).map((asset) => asset.type || "内容资产"),
      action: "草稿不是终稿，发布前由人改一遍。",
      copyId: "outcomeAssetCopy",
    },
  ];

  outcomeGrid.innerHTML = cards.map((card, index) => `
    <article class="outcome-card">
      <span>${escapeHtml(card.label)}</span>
      <b>${escapeHtml(card.title)}</b>
      <p>${escapeHtml(card.body)}</p>
      <div class="outcome-meta">
        ${(card.meta.length ? card.meta : ["待生成"]).map((item) => `<em>${escapeHtml(item)}</em>`).join("")}
      </div>
      <small>${escapeHtml(card.action)}</small>
      ${index === 2 ? `<button class="mini" data-copy-target="outcomeAssetCopy">复制发布草稿</button><textarea id="outcomeAssetCopy">${escapeHtml(assets[0]?.copy || "")}</textarea>` : ""}
    </article>
  `).join("");
}

function topicsFirst() {
  return Array.isArray(state.topics) && state.topics.length ? state.topics[0] : null;
}

function buildDigestText(top, tasks, assets) {
  if (!top) {
    return [
      "今日成果：暂未生成",
      "下一步：生成今日内容计划",
      "验收标准：至少得到 3 条候选选题、1 个生产任务、1 份可复制草稿",
    ].join("\n");
  }
  return [
    `今日主推选题：${top.title}`,
    `推荐渠道：${top.platform}`,
    `内容结构：${top.formula}`,
    `判断理由：${top.angle}`,
    `已生成任务：${tasks.slice(0, 3).map((task) => task.title).join(" / ") || "待生成"}`,
    `可复制草稿：${assets.length ? "已生成" : "待生成"}`,
  ].join("\n");
}

function renderActivity() {
  const logs = state.activityLog || [];
  if (!logs.length) {
    activityList.innerHTML = `
      <article class="activity-empty">
        <b>还没有经营日志</b>
        <p>新建项目、运行内容生产线、派发员工和生成任务后，这里会自动记录。</p>
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
        ${state.candidates.length ? state.candidates.map(renderCandidate).join("") : `<article class="candidate-card"><div><b>还没有候选选题</b><p>先扫描精选资料或保存信息池，再点击生成今日内容计划。</p></div></article>`}
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
      <span>${escapeHtml(task.layer ? `${task.layer} / ${task.owner}` : task.owner)}${task.source ? ` · ${escapeHtml(sourceLabel(task.source))}` : ""}${task.priority ? ` · ${escapeHtml(task.priority)}优先级` : ""}</span>
      <b>${escapeHtml(task.title)}</b>
      <p>${escapeHtml(task.next)}</p>
      ${task.acceptance ? `<small>${escapeHtml(task.acceptance)}</small>` : ""}
      ${task.source === "publish-review" && task.status !== "已生成发布包" ? `<button class="mini" data-action="execute-task" data-id="${escapeAttr(task.id)}">生成下一轮发布包</button>` : ""}
      ${task.generatedAssetId ? `<small>已生成发布包：${escapeHtml(task.generatedAssetId)}</small>` : ""}
    </article>
  `).join("");
}

function sourceLabel(value) {
  const map = {
    "publish-review": "发布复盘",
    "content-workflow": "内容生产线",
  };
  return map[value] || value;
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
  assetGrid.innerHTML = state.assets.map((asset, index) => renderAssetCard(asset, index)).join("");
}

function renderAssetCard(asset, index) {
  const structured = asset.structured || {};
  const cards = asset.exportedCards;
  const videoExport = asset.exportedVideoPackage;
  const videoPackage = structured.videoPackage;
  const evidence = structured.closureEvidence;
  const copyId = `asset-copy-${index}`;
  const cardFiles = cards?.files || [];
  const command = videoExport?.generateCommand
    ? `cd E:\\Codex\\my-video\n${videoExport.generateCommand}`
    : "Export video package first.";

  return `
    <article class="asset-card asset-card-wide">
      <div class="asset-head">
        <div>
          <span>${escapeHtml(asset.type || "Marketing asset")}</span>
          <b>${escapeHtml(asset.title || "Untitled package")}</b>
        </div>
        <em>${escapeHtml(formatTime(asset.createdAt))}</em>
      </div>
      <div class="closure-strip">
        <strong>${evidence?.firstVersionDone ? "V1 closure package ready" : "Closure package pending"}</strong>
        <small>${escapeHtml(evidence?.endpoint || "Graphic + video deliverables")}</small>
      </div>
      <div class="asset-delivery-grid">
        <section>
          <h4>1. XHS cards</h4>
          <p>${cards ? `Exported ${cards.count || cardFiles.length} PNG cards, 900x1200.` : "Card script is ready. Export PNG cards."}</p>
          ${cardFiles.length ? `<small>${escapeHtml(cardFiles[0])}</small>` : ""}
          <button class="mini" data-action="export-cards" data-id="${escapeAttr(asset.id)}">${cards ? "Re-export cards" : "Export cards"}</button>
        </section>
        <section>
          <h4>2. Promo video package</h4>
          <p>${videoExport ? "Exported to Xiaomei video workbench." : (videoPackage ? "Video script is ready. Export task package." : "No video package yet.")}</p>
          ${videoExport?.jobDir ? `<small>${escapeHtml(videoExport.jobDir)}</small>` : ""}
          <button class="mini" data-action="export-video-package" data-id="${escapeAttr(asset.id)}" ${videoPackage ? "" : "disabled"}>${videoExport ? "Re-export video package" : "Export video package"}</button>
        </section>
        <section>
          <h4>3. Render command</h4>
          <p>Use Xiaomei workbench to render cover, voiceover, music and MP4.</p>
          <pre class="command-block">${escapeHtml(command)}</pre>
        </section>
      </div>
      <div class="asset-copy-row">
        <button class="mini" data-copy-target="${copyId}">Copy publish draft</button>
        <textarea id="${copyId}" readonly>${escapeHtml(asset.copy || "")}</textarea>
      </div>
    </article>
  `;
}

function scrollToId(id) {
  const target = document.querySelector(`#${id}`);
  if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setBusy(busy, label = "正在运行") {
  runButton.disabled = busy;
  rerunButton.disabled = busy;
  runButton.textContent = busy ? label : "生成今日内容计划";
  rerunButton.textContent = busy ? label : "重新生成候选选题";
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}

async function copyTextFrom(id) {
  const node = document.querySelector(`#${id}`);
  if (!node) {
    showToast("没有可复制内容");
    return;
  }
  const text = "value" in node ? node.value : node.innerText;
  if (!text.trim()) {
    showToast("内容还没生成");
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    showToast("已复制");
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
    showToast("已复制");
  }
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
