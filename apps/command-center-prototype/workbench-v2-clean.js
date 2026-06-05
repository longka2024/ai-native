const state = {
  route: "today",
  step: 1,
  publishTarget: "xhs",
  sourceChannel: "same-platform",
  industry: "AI 与自媒体",
  businessLine: "AI 内容创作",
  goal: "获客和建立专业感",
  keywords: "AI自媒体, 内容资产库, Agent工作流",
  topics: [],
  selectedTopicId: "",
  titleChoices: [],
  selectedTitle: "",
  draft: "",
  improvedDraft: "",
  copyConfirmed: false,
  logs: [],
  assets: null,
  assetStatus: "未读取",
  lastXRunIds: [],
  useLatestXRunOnly: false,
  isCollectingX: false,
};

const publishTargets = [
  { id: "xhs", title: "小红书图文", platform: "xiaohongshu", desc: "封面、标题、短正文、收藏点、标签" },
  { id: "douyin", title: "抖音短视频", platform: "douyin", desc: "3 秒钩子、口播、镜头、字幕、节奏" },
  { id: "video-account", title: "视频号短视频", platform: "video", desc: "信任感、口播、案例、转化动作" },
  { id: "wechat-article", title: "公众号长文", platform: "wechat", desc: "标题、开头、论证、案例、方法论" },
  { id: "moments", title: "朋友圈文案", platform: "moments", desc: "自然表达、信任建立、私聊引导" },
  { id: "topic-only", title: "只沉淀母题", platform: "asset", desc: "只把素材拆成母题资产，暂不写成品" },
];

const sourceChannels = [
  { id: "same-platform", title: "同平台对标素材", desc: "默认选择。在哪个平台发，就优先读哪个平台的爆款素材。" },
  { id: "xhs", title: "小红书素材", desc: "适合学习小红书标题、封面、评论痛点、收藏结构。" },
  { id: "x-history", title: "历史资产", desc: "先复用昨天采集的真实素材，拆成母题跑通闭环。" },
  { id: "x-live", title: "X 账号资产", desc: "只读取 X/推特来源，适合提炼观点、洞察和方法论。" },
  { id: "all-assets", title: "全库母题复用", desc: "一鱼多吃：从资产库里找好母题，再改写到目标平台。" },
  { id: "manual", title: "手动导入", desc: "粘贴你看到的好内容，先拆成母题资产。" },
];

const steps = [
  ["发布目标", "发到哪里"],
  ["业务信息", "行业和目标"],
  ["素材来源", "从哪找母题"],
  ["读取素材", "真实来源"],
  ["选择母题", "一鱼多吃"],
  ["标题候选", "按平台改写"],
  ["生成文案", "平台成品"],
  ["体检优化", "改到能发"],
  ["确认文案", "网页确认"],
  ["制作分流", "图文或视频"],
  ["导出交付", "给运营用"],
  ["沉淀资产", "下次复用"],
];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function byId(id) {
  return document.getElementById(id);
}

function currentTarget() {
  return publishTargets.find((item) => item.id === state.publishTarget) || publishTargets[0];
}

function currentSource() {
  return sourceChannels.find((item) => item.id === state.sourceChannel) || sourceChannels[0];
}

function selectedTopic() {
  return state.topics.find((item) => item.id === state.selectedTopicId) || null;
}

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
    "已从内容采集批次返回。",
    "下一步：读取已入库 X 资产，生成今天可用的母题候选。",
  ];
  state.assetStatus = "准备读取已入库 X 资产";
  setRoute("today");
  setStep(4);
});

function setStep(step) {
  state.step = Math.max(1, Math.min(12, step));
  renderToday();
}

function clearAfter(step) {
  if (step <= 4) {
    state.topics = [];
    state.selectedTopicId = "";
  }
  if (step <= 5) {
    state.titleChoices = [];
    state.selectedTitle = "";
  }
  if (step <= 6) {
    state.draft = "";
    state.improvedDraft = "";
    state.copyConfirmed = false;
  }
}

function renderToday() {
  renderHeroStatus();
  renderStepRail();
  renderContext();
  renderWorkArea();
}

function renderHeroStatus() {
  const topic = selectedTopic();
  $("#heroStatus").innerHTML = `
    <div class="status-row"><b>发布目标</b><span>${escapeHtml(currentTarget().title)}</span></div>
    <div class="status-row"><b>素材来源</b><span>${escapeHtml(currentSource().title)}</span></div>
    <div class="status-row"><b>候选母题</b><span>${state.topics.length} 个</span></div>
    <div class="status-row"><b>文案状态</b><span>${state.copyConfirmed ? "已确认，可制作" : state.draft ? "待确认" : "未生成"}</span></div>
    <div class="status-row"><b>已选母题</b><span>${escapeHtml(topic?.theme || topic?.title || "未选择")}</span></div>
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
    <div><b>已选母题</b><span>${escapeHtml(topic?.theme || "未选择")}</span></div>
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
  bindWorkAreaActions();
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
    ${cardHead("你的行业、业务线和目标是什么？", "系统会用这些信息筛选素材、拆母题，并决定写作角度。")}
    <div class="form-grid">
      <label>行业<input id="industryInput" value="${escapeHtml(state.industry)}" /></label>
      <label>业务线 / 主题<input id="businessLineInput" value="${escapeHtml(state.businessLine)}" /></label>
      <label>内容目标<input id="goalInput" value="${escapeHtml(state.goal)}" /></label>
      <label>关键词，多个用逗号隔开<input id="keywordsInput" value="${escapeHtml(state.keywords)}" /></label>
      <label class="wide">补充说明<textarea id="noteInput" rows="4" placeholder="例如：我想把一个 AI 自媒体母题，同时改成小红书、公众号和短视频。"></textarea></label>
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
    ${cardHead("今天从哪里找母题？", "同平台素材用于学习平台爆款表达；跨平台素材用于提炼观点和方法论，再按目标平台重写。")}
    <div class="source-note">
      <b>当前策略：${escapeHtml(defaultSource)}</b>
      <span>素材来源要标清楚，母题可以复用，最终成品必须按 ${escapeHtml(currentTarget().title)} 重写。</span>
    </div>
    <div class="choice-grid">
      ${sourceChannels.map((item) => `<button class="choice-card ${state.sourceChannel === item.id ? "active" : ""}" data-source-channel="${item.id}">
        <b>${escapeHtml(item.title)}</b><span>${escapeHtml(item.desc)}</span>
      </button>`).join("")}
    </div>
    <div class="actions">
      <button class="ghost" data-step-target="2">返回业务信息</button>
      <button class="primary" data-step-target="4">下一步：读取素材</button>
      <button class="secondary" data-route-target="assets">查看内容资产库</button>
    </div>
  </section>`;
}

function renderCollectStep() {
  const progress = state.topics.length ? "100%" : state.logs.length ? "55%" : "0";
  return `<section class="work-card">
    ${cardHead(state.sourceChannel === "x-live" ? "你要先采集新帖，还是用已有资产？" : "读取真实素材并拆成母题", state.sourceChannel === "x-live" ? "这是两个不同动作：采集新帖会调用 XCrawl；读取已有资产只用已经沉淀到库里的内容，不会重新采集。" : "如果当前来源没有匹配素材，系统会明确提示，不会跨业务线乱推荐。")}
    ${state.sourceChannel === "x-live" ? renderXCollectControls() : ""}
    <div class="console">
      <div class="console-head"><b>${escapeHtml(sourceTitleForTarget())} 工作窗口</b><span>${escapeHtml(state.assetStatus)}</span></div>
      <div class="progress"><i id="progressBar" style="width:${progress}"></i></div>
      <pre class="console-log" id="consoleLog">${escapeHtml(state.logs.join("\n") || (state.sourceChannel === "x-live" ? "先在上面二选一：\n1. 采集一批新帖：适合你刚换了 X 账号，想抓当下新内容。\n2. 用已入库资产找话题：适合不想重新采集，直接从之前确认过的资产里找母题。" : "点击按钮后，这里会显示读取、筛选、拆母题和生成候选的进度。"))}</pre>
    </div>
    <div class="actions">
      <button class="ghost" data-step-target="3">返回来源选择</button>
      ${state.sourceChannel === "x-live" ? "" : `<button class="primary" data-read-materials>读取素材并生成母题候选</button>`}
      <button class="secondary" data-demo-materials>用本地预览样本演示流程</button>
      <button class="secondary" data-route-target="assets">查看内容资产库</button>
    </div>
  </section>`;
}

function renderXCollectControls() {
  return `<div class="x-source-actions">
    <article class="action-tile primary-tile">
      <div>
        <span class="eyebrow">实时采集</span>
        <h3>采集一批新的 X 推主帖子</h3>
        <p>适合你换了对标账号，想抓当下新帖。采集完成后会先进入内容采集批次页，人工筛选、确认入库、生成拆解卡。</p>
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
      <button class="primary" data-open-collection-batch>去采集批次页操作</button>
      <span class="muted-text">推荐：先走采集批次页，确认好帖入库后再回今日工作台创作。</span>
    </article>
    <article class="action-tile">
      <div>
        <span class="eyebrow">复用资产</span>
        <h3>从已入库 X 资产里找今天的话题</h3>
        <p>适合你不想重新采集，直接用之前已经确认过、拆解过的帖子资产来找母题。</p>
      </div>
      <button class="primary" data-read-materials>读取已入库资产并生成母题</button>
      <button class="secondary" data-route-target="collection">打开内容采集批次</button>
      <span class="muted-text">后续会只读取“已确认资产”，不再直接拿原始爬虫结果乱生成。</span>
    </article>
  </div>`;
}

function renderTopicStep() {
  return `<section class="work-card">
    ${cardHead("选择一个母题资产", "母题可以一鱼多吃。你现在选择的是核心题材，下一步才按目标平台写标题和成品。")}
    ${state.topics.length ? `<div class="topic-grid">${state.topics.map(renderTopicCard).join("")}</div>` : `<div class="empty-state"><b>当前来源没有匹配母题</b><span>请换关键词、切换素材来源，或先采集/导入对应平台素材。</span></div>`}
    <div class="actions">
      <button class="ghost" data-step-target="4">返回读取素材</button>
      <button class="primary" data-step-target="6" ${state.selectedTopicId ? "" : "disabled"}>下一步：生成平台标题</button>
    </div>
  </section>`;
}

function renderTopicCard(topic) {
  return `<article class="topic-card ${state.selectedTopicId === topic.id ? "active" : ""}">
    <div class="meta"><span>来源：${escapeHtml(topic.platform)}</span><span>${escapeHtml(topic.collectionStatus)}</span><span>目标：${escapeHtml(currentTarget().title)}</span></div>
    <b>${escapeHtml(topic.theme)}</b>
    <p>${escapeHtml(topic.reason)}</p>
    <p><strong>源头标题：</strong>${escapeHtml(topic.title)}</p>
    <p><strong>用户痛点：</strong>${escapeHtml(topic.pain)}</p>
    <p><strong>一鱼多吃：</strong>${escapeHtml(topic.reuse)}</p>
    <p><strong>风险：</strong>${escapeHtml(topic.risk)}</p>
    <div class="metric-row">${Object.entries(topic.metrics || {}).map(([key, value]) => `<span>${escapeHtml(key)} ${escapeHtml(value)}</span>`).join("")}</div>
    ${topic.url ? `<a class="source-link" href="${escapeHtml(topic.url)}" target="_blank" rel="noreferrer">打开原始素材</a>` : `<span class="muted-text">暂无原链接</span>`}
    <button class="primary" data-topic-id="${escapeHtml(topic.id)}">选择这个母题</button>
  </article>`;
}

function renderTitleStep() {
  if (!state.titleChoices.length && state.selectedTopicId) state.titleChoices = buildTitleChoices(selectedTopic());
  return `<section class="work-card">
    ${cardHead(`生成 ${currentTarget().title} 标题`, "同一个母题，按不同平台调性生成不同标题。选择标题后，正文会跟着重写。")}
    <div class="title-grid">
      ${state.titleChoices.map((item) => `<button class="title-card ${state.selectedTitle === item.title ? "active" : ""}" data-title-choice="${escapeHtml(item.title)}">
        <b>${escapeHtml(item.title)}</b><span>${escapeHtml(item.reason)}</span>
      </button>`).join("") || `<div class="empty-state"><b>请先选择母题</b><span>母题确定后才生成平台标题。</span></div>`}
    </div>
    <div class="actions">
      <button class="ghost" data-step-target="5">返回换母题</button>
      <button class="primary" data-step-target="7" ${state.selectedTitle ? "" : "disabled"}>下一步：生成平台成品</button>
    </div>
  </section>`;
}

function renderDraftStep() {
  if (!state.draft && state.selectedTitle) state.draft = buildDraft();
  return `<section class="work-card">
    ${cardHead("生成平台成品", "文案绑定母题、源头素材、目标平台、业务目标和标题。不是只换标题。")}
    <div class="draft-box">
      <div class="draft-text"><pre>${escapeHtml(state.draft || "请先选择标题。")}</pre></div>
      <div class="check-panel">
        <h3>绑定证据</h3>
        ${renderBindingEvidence()}
      </div>
    </div>
    <div class="actions">
      <button class="ghost" data-step-target="6">返回换标题</button>
      <button class="secondary" data-regenerate-draft ${state.selectedTitle ? "" : "disabled"}>按当前标题重写一次</button>
      <button class="primary" data-step-target="8" ${state.draft ? "" : "disabled"}>下一步：文案体检和优化</button>
    </div>
  </section>`;
}

function renderCheckStep() {
  if (!state.improvedDraft && state.draft) state.improvedDraft = improveDraft(state.draft);
  const checks = scoreDraft();
  return `<section class="work-card">
    ${cardHead("Longka 文案体检", "正文生成后才评分。评分说依据，再给优化方向。")}
    <div class="draft-box">
      <div class="draft-text"><h3>优化后版本</h3><pre>${escapeHtml(state.improvedDraft || state.draft || "暂无文案")}</pre></div>
      <div class="check-panel">
        <h3>体检结果</h3>
        ${checks.map((item) => `<div class="check-row ${item.warn ? "warn" : ""}"><b>${item.score}</b><p><strong>${escapeHtml(item.name)}</strong><br>${escapeHtml(item.reason)}</p></div>`).join("")}
      </div>
    </div>
    <div class="actions">
      <button class="ghost" data-step-target="7">返回正文</button>
      <button class="secondary" data-improve-again>继续优化一次</button>
      <button class="primary" data-step-target="9">下一步：网页确认文案</button>
    </div>
  </section>`;
}

function renderConfirmStep() {
  return `<section class="work-card">
    ${cardHead("确认文案", "只有网页端点击确认后，才允许生成卡片图、视频脚本、任务包或导出。")}
    <div class="draft-text"><pre>${escapeHtml(state.improvedDraft || state.draft || "暂无可确认文案")}</pre></div>
    <div class="actions">
      <button class="ghost" data-step-target="8">返回继续优化</button>
      <button class="primary" data-confirm-copy ${state.draft ? "" : "disabled"}>${state.copyConfirmed ? "文案已确认" : "确认这版文案"}</button>
      <button class="secondary" data-step-target="10" ${state.copyConfirmed ? "" : "disabled"}>进入制作分流</button>
    </div>
  </section>`;
}

function renderProductionStep() {
  const locked = !state.copyConfirmed;
  return `<section class="work-card">
    ${cardHead("制作分流", "确认文案前，这里锁住。确认后可按目标平台进入图文、长文或视频任务。")}
    <div class="production-grid">
      <article class="production-card ${locked ? "locked" : ""}">
        <b>${escapeHtml(currentTarget().title)} 交付方案</b>
        <span>${escapeHtml(buildDeliveryPlan().join(" / "))}</span>
        <button class="primary" ${locked ? "disabled" : ""} data-production="delivery">生成交付方案</button>
      </article>
      <article class="production-card ${locked ? "locked" : ""}">
        <b>一鱼多吃复用</b>
        <span>同一个母题后续可继续生成小红书、公众号、朋友圈、短视频版本。</span>
        <button class="primary" ${locked ? "disabled" : ""} data-production="reuse">加入母题资产库</button>
      </article>
    </div>
    <div class="actions">
      <button class="ghost" data-step-target="9">返回确认文案</button>
      <button class="primary" data-step-target="11" ${state.copyConfirmed ? "" : "disabled"}>下一步：导出交付</button>
    </div>
  </section>`;
}

function renderExportStep() {
  return `<section class="work-card">
    ${cardHead("导出交付", "这里给运营人员可复制、可交接、可复盘的结果。")}
    <div class="production-grid">
      <article class="production-card"><b>当前平台</b><span>${escapeHtml(currentTarget().title)}</span></article>
      <article class="production-card"><b>交付清单</b><span>${escapeHtml(buildDeliveryPlan().join(" / "))}</span></article>
    </div>
    <div class="actions">
      <button class="ghost" data-step-target="10">返回制作分流</button>
      <button class="primary" data-step-target="12">下一步：沉淀资产</button>
    </div>
  </section>`;
}

function renderArchiveStep() {
  return `<section class="work-card">
    ${cardHead("沉淀到母题资产库", "本次源头素材、母题、标题、平台版本和体检结果都要回流，后续一鱼多吃。")}
    <div class="production-grid">
      <article class="production-card"><b>母题</b><span>${escapeHtml(selectedTopic()?.theme || "未选择")}</span></article>
      <article class="production-card"><b>下次可复用</b><span>换目标平台后重新生成标题、正文、脚本或长文。</span></article>
    </div>
    <div class="actions">
      <button class="ghost" data-step-target="11">返回导出</button>
      <button class="primary" data-route-target="assets">查看内容资产库</button>
    </div>
  </section>`;
}

function bindWorkAreaActions() {
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
  byId("workArea")?.querySelector("[data-open-collection-batch]")?.addEventListener("click", () => setRoute("collection"));
  byId("workArea")?.querySelector("[data-read-materials]")?.addEventListener("click", () => readMaterials());
  byId("workArea")?.querySelector("[data-demo-materials]")?.addEventListener("click", () => readDemoMaterials());
  $$("#workArea [data-topic-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedTopicId = button.dataset.topicId;
      clearAfter(5);
      state.titleChoices = buildTitleChoices(selectedTopic());
      setStep(6);
    });
  });
  $$("#workArea [data-title-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedTitle = button.dataset.titleChoice;
      state.draft = "";
      state.improvedDraft = "";
      state.copyConfirmed = false;
      setStep(7);
    });
  });
  byId("workArea")?.querySelector("[data-regenerate-draft]")?.addEventListener("click", () => {
    state.draft = buildDraft({ variant: true });
    state.improvedDraft = "";
    state.copyConfirmed = false;
    renderToday();
  });
  byId("workArea")?.querySelector("[data-improve-again]")?.addEventListener("click", () => {
    state.improvedDraft = improveDraft(state.improvedDraft || state.draft, true);
    renderToday();
  });
  byId("workArea")?.querySelector("[data-confirm-copy]")?.addEventListener("click", () => {
    if (!state.draft) return;
    state.copyConfirmed = true;
    setStep(10);
  });
}

function saveBusinessInputs() {
  state.industry = byId("industryInput")?.value.trim() || state.industry;
  state.businessLine = byId("businessLineInput")?.value.trim() || state.businessLine;
  state.goal = byId("goalInput")?.value.trim() || state.goal;
  state.keywords = byId("keywordsInput")?.value.trim() || state.keywords;
}

async function readMaterials() {
  state.logs = [];
  state.assetStatus = "正在读取";
  log("读取任务信息");
  log(`发布目标：${currentTarget().title}`);
  log(`素材来源：${sourceTitleForTarget()}`);
  log(`关键词：${state.keywords}`);
  renderToday();
  await delay(180);

  const db = await loadState();
  const topics = buildTopicsFromDb(db);
  state.assets = db;
  if (!topics.length) {
    state.assetStatus = "无匹配母题";
    log("当前素材来源没有匹配母题。系统不会从其他平台乱拿素材。");
    log("建议：换关键词、切换到全库母题复用，或先采集/导入对应平台素材。");
    state.topics = [];
    renderToday();
    return;
  }
  state.topics = topics.slice(0, 10);
  state.selectedTopicId = "";
  state.titleChoices = [];
  state.assetStatus = `找到 ${state.topics.length} 个母题`;
  log(`找到 ${state.topics.length} 个候选母题。`);
  log("已提取：来源平台、母题、用户痛点、复用方向、风险提醒。");
  renderToday();
  setStep(5);
}

async function collectXAccounts() {
  const accounts = byId("xAccountsInput")?.value.trim() || "";
  const maxTweets = Math.max(5, Math.min(100, Number(byId("xMaxTweetsInput")?.value || 30)));
  const pages = Math.max(1, Math.min(5, Number(byId("xPagesInput")?.value || 1)));
  if (!accounts) {
    state.logs = ["请先输入至少一个 X 推主账号。"];
    state.assetStatus = "缺少 X 账号";
    renderToday();
    return;
  }
  state.logs = [];
  state.assetStatus = "正在采集 X";
  state.isCollectingX = true;
  log("开始采集 X 推主。");
  log(`账号：${accounts.replace(/\n+/g, " / ")}`);
  log(`每号采集：${maxTweets} 条，页数：${pages}`);
  log("好帖标准：优先看收藏、评论、转发，其次看正文信息量和赛道相关性。");
  renderToday();
  scheduleProgressLog("正在调用 XCrawl 读取推主最近帖子，通常需要 10-60 秒。", 1200);
  scheduleProgressLog("采集完成后会先筛掉纯链接、短碎片、弱互动帖子。", 4200);
  scheduleProgressLog("如果账号较多，请等控制台出现采集完成和本轮批次。", 9000);
  try {
    const res = await fetch("/api/collectors/xcrawl/x-user-tweets-batch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accounts, maxTweets, pages, labelType: "radar_seed" }),
    });
    const result = await res.json();
    if (!res.ok || !result.ok) throw new Error(result.message || result.error || `HTTP ${res.status}`);
    state.lastXRunIds = (result.results || []).map((item) => item.run?.id).filter(Boolean);
    state.useLatestXRunOnly = state.lastXRunIds.length > 0;
    log(`采集完成：成功账号 ${result.successCount || 0} 个，原始样本 ${result.totalSampleCount || 0} 条。`);
    if (state.lastXRunIds.length) log(`本轮采集批次：${state.lastXRunIds.join(" / ")}`);
    log(`好帖候选：${result.candidateCount || 0} 条；淘汰：${result.rejectedCount || 0} 条。`);
    if (result.rejectedStats) log(`淘汰原因：${Object.entries(result.rejectedStats).map(([key, value]) => `${key} ${value}`).join(" / ") || "无"}`);
    const batchSamples = balanceXBatchSamples([
      ...(Array.isArray(result.candidates) ? result.candidates : []),
      ...(Array.isArray(result.assetBuckets?.goodPosts) ? result.assetBuckets.goodPosts : []),
    ]);
    const topics = buildTopicsFromDb({ contentSamples: batchSamples });
    state.assets = result;
    state.topics = topics.slice(0, 10);
    state.selectedTopicId = "";
    state.titleChoices = [];
    state.assetStatus = state.topics.length ? `本轮采集生成 ${state.topics.length} 个母题` : "本轮没有合格母题";
    state.isCollectingX = false;
    if (!state.topics.length) {
      log("本轮采集没有通过好帖门禁的母题。请换账号、提高采集条数，或降低筛选标准。");
      renderToday();
      return;
    }
    log(`已基于本轮采集生成 ${state.topics.length} 个候选母题，不读取历史旧数据。`);
    renderToday();
    setStep(5);
  } catch (error) {
    state.assetStatus = "X 采集失败";
    state.isCollectingX = false;
    log(`X 采集失败：${error.message}`);
    renderToday();
  }
}

function balanceXBatchSamples(samples = []) {
  const seen = new Set();
  const unique = samples.filter((sample) => {
    const key = sample.sourceUrl || sample.url || sample.id || sample.title;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const groups = new Map();
  for (const sample of unique) {
    const account = sample.keyword || sample.authorName || "unknown";
    if (!groups.has(account)) groups.set(account, []);
    groups.get(account).push(sample);
  }
  for (const group of groups.values()) {
    group.sort((a, b) => (Number(b.contentValueScore || 0) + Number(b.radarScore || 0) / 1000) - (Number(a.contentValueScore || 0) + Number(a.radarScore || 0) / 1000));
  }
  const balanced = [];
  for (const group of groups.values()) balanced.push(...group.slice(0, 2));
  const used = new Set(balanced.map((sample) => sample.sourceUrl || sample.url || sample.id || sample.title));
  const rest = unique
    .filter((sample) => !used.has(sample.sourceUrl || sample.url || sample.id || sample.title))
    .sort((a, b) => (Number(b.contentValueScore || 0) + Number(b.radarScore || 0) / 1000) - (Number(a.contentValueScore || 0) + Number(a.radarScore || 0) / 1000));
  return [...balanced, ...rest].slice(0, 12);
}

function scheduleProgressLog(message, ms) {
  setTimeout(() => {
    if (!state.isCollectingX) return;
    log(message);
    renderToday();
  }, ms);
}

async function readDemoMaterials() {
  state.logs = [];
  state.assetStatus = "本地预览样本";
  log("使用本地预览样本演示流程。");
  log("注意：这不是真实采集结果，只用于验证页面步骤是否能走通。");
  const db = sampleState();
  state.assets = db;
  state.topics = buildTopicsFromDb(db).slice(0, 10);
  state.selectedTopicId = "";
  state.titleChoices = [];
  state.assetStatus = `预览 ${state.topics.length} 个母题`;
  renderToday();
  setStep(5);
}

async function loadState() {
  try {
    const params = new URLSearchParams({
      keywords: state.keywords,
      limit: "200",
    });
    const wanted = platformWanted();
    if (wanted !== "all") params.set("platform", wanted);
    if (state.sourceChannel === "x-live" && state.useLatestXRunOnly && state.lastXRunIds.length) {
      params.set("runIds", state.lastXRunIds.join(","));
    }
    const res = await fetch(`/api/content-assets/unified?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    state.assetStatus = "已读取统一内容资产库";
    log(`统一内容资产库：读取 ${result.totalSourceSamples || 0} 条，匹配 ${result.matchedCount || 0} 条。`);
    return {
      contentSamples: Array.isArray(result.assets) ? result.assets : [],
      rawMaterials: [],
      candidates: [],
      assets: [],
      unifiedAssets: result,
    };
  } catch (error) {
    state.assetStatus = "本地预览样本";
    log(`读取统一内容资产库失败：${error.message}`);
    return sampleState();
  }
}

function sourceTitleForTarget() {
  if (state.sourceChannel !== "same-platform") return currentSource().title;
  const map = {
    xhs: "小红书同平台素材",
    douyin: "抖音同平台素材",
    "video-account": "视频号同平台素材",
    "wechat-article": "公众号/长文同平台素材",
    moments: "朋友圈/私域素材",
    "topic-only": "全库母题资产",
  };
  return map[state.publishTarget] || currentSource().title;
}

function platformWanted() {
  if (state.sourceChannel === "same-platform") return currentTarget().platform;
  if (state.sourceChannel === "xhs") return "xiaohongshu";
  if (state.sourceChannel === "x-history") return "all";
  if (state.sourceChannel === "x-live") return "x";
  if (state.sourceChannel === "manual") return "manual";
  return "all";
}

function buildTopicsFromDb(db) {
  const keywords = tokenize(state.keywords);
  const rawSamples = [
    ...(Array.isArray(db.contentSamples) ? db.contentSamples : []),
    ...(Array.isArray(db.rawMaterials) ? db.rawMaterials : []),
    ...(Array.isArray(db.candidates) ? db.candidates : []),
    ...(Array.isArray(db.assets) ? db.assets : []),
  ];
  const normalized = rawSamples
    .filter((item) => item && (item.title || item.text || item.content || item.body || item.copy || item.structured))
    .map(normalizeSample)
    .filter(matchesWantedPlatform);
  const scored = normalized
    .map((sample) => ({ sample, score: scoreSample(sample, keywords), eligibility: judgeMotherTopicEligibility(sample) }))
    .filter((item) => shouldKeepScoredSample(item, keywords))
    .filter((item) => item.eligibility.pass)
    .sort((a, b) => b.score - a.score);
  return dedupeMotherTopics(scored.map(({ sample, eligibility }, index) => makeMotherTopic(sample, index, eligibility))).slice(0, 10);
}

function dedupeMotherTopics(topics = []) {
  const seen = new Set();
  const unique = [];
  for (const topic of topics) {
    const key = motherTopicKey(topic);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(topic);
  }
  return unique;
}

function motherTopicKey(topic = {}) {
  const text = `${topic.theme} ${topic.sourceInsight?.angle || ""}`.toLowerCase();
  if (/同质化|模板|规范|打击/.test(text)) return "ai-content-template-risk";
  if (/拆文|爆款|关键|提示词/.test(text)) return "viral-deconstruction-missing-layer";
  if (/社群|同频|连接/.test(text)) return "community-filtering";
  if (/素材|清洗|去重|资产/.test(text)) return "content-asset-cleaning";
  return cleanSourceText(topic.theme || topic.title || "").slice(0, 28);
}

function shouldKeepScoredSample(item, keywords) {
  if (!keywords.length) return state.sourceChannel === "all-assets";
  if (item.score > 0) return true;
  return false;
}

function judgeMotherTopicEligibility(sample = {}) {
  const text = cleanSourceText(`${sample.title} ${sample.body}`);
  const metrics = sample.metrics || {};
  const heat = Number(metrics.likes || 0)
    + Number(metrics.bookmarks || metrics.saves || metrics.collects || 0) * 1.2
    + Number(metrics.replies || metrics.comments || 0) * 2
    + Number(metrics.retweets || metrics.shares || 0) * 2
    + Number(metrics.quotes || 0) * 1.5;
  const reasons = [];
  if (text.length >= 70) reasons.push("内容信息量够，能拆出观点或方法");
  if (heat >= 30) reasons.push("互动数据有信号");
  if (/AI|自媒体|公众号|小红书|爆款|拆文|提示词|素材|同质化|模板|社群|内容/.test(text)) reasons.push("与当前赛道相关");
  if (/怎么|为什么|问题|经验|方法|总结|避坑|拆|复盘|真正|关键|别|不要|发现/.test(text)) reasons.push("有可二创的表达角度");

  const blockers = [];
  if (text.length < 35) blockers.push("正文太短");
  if (/^rt\s*@/i.test(text) || /^转发/.test(text)) blockers.push("疑似转发内容");
  if (/^https?:\/\/\S+$/i.test(text)) blockers.push("纯链接内容");
  if (heat < 8 && text.length < 120) blockers.push("热度和信息量都偏弱");

  return {
    pass: blockers.length === 0 && reasons.length >= 2,
    reasons,
    blockers,
    heat,
  };
}

function tokenize(value) {
  return String(value || "")
    .split(/[,，、\s]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function matchesWantedPlatform(sample) {
  const wanted = platformWanted();
  if (wanted === "all") return true;
  const haystack = `${sample.platform} ${sample.source} ${sample.sourceTool} ${sample.type} ${sample.url}`.toLowerCase();
  if (wanted === "xiaohongshu") return /xiaohongshu|xhs|小红书/.test(haystack);
  if (wanted === "x") return /\b(x|twitter|xcrawl)\b|x\.com|twitter\.com/.test(haystack);
  if (wanted === "douyin") return /douyin|抖音/.test(haystack);
  if (wanted === "wechat") return /wechat|公众号|mp\.weixin/.test(haystack);
  if (wanted === "video") return /video|视频号/.test(haystack);
  if (wanted === "moments") return /moments|朋友圈|私域|manual/.test(haystack);
  if (wanted === "manual") return /manual|手动|import/.test(haystack);
  return true;
}

function scoreSample(sample, keywords) {
  const text = `${sample.title} ${sample.body} ${sample.keyword} ${sample.author || ""}`.toLowerCase();
  const compactText = text.replace(/\s+/g, "");
  const keywordScore = keywords.reduce((sum, keyword) => {
    const compactKeyword = keyword.replace(/\s+/g, "");
    if (text.includes(keyword) || compactText.includes(compactKeyword)) return sum + 14;
    const parts = expandKeywordParts(keyword);
    const matched = parts.filter((part) => text.includes(part) || compactText.includes(part.replace(/\s+/g, ""))).length;
    if (matched >= Math.min(2, parts.length)) return sum + 8 + matched * 2;
    return sum;
  }, 0);
  const metrics = sample.metrics || {};
  const heat = Number(metrics.likes || metrics.like || metrics.赞 || 0)
    + Number(metrics.saves || metrics.collects || metrics.藏 || 0) * 1.2
    + Number(metrics.comments || metrics.评 || 0) * 2;
  return keywordScore + Math.min(heat / 500, 20);
}

function expandKeywordParts(keyword) {
  const value = String(keyword || "").toLowerCase().replace(/[，,、]/g, " ");
  const parts = value.split(/\s+/).filter(Boolean);
  if (/ai/.test(value)) parts.push("ai", "提示词", "自媒体", "内容");
  if (/agent|工作流/.test(value)) parts.push("agent", "工作流", "自动化");
  if (/内容资产|素材库|资产库/.test(value)) parts.push("内容", "素材", "资产", "知识库");
  return [...new Set(parts.filter((part) => part.length >= 2 || part === "ai"))];
}

function normalizeSample(item) {
  const structured = item.structured || {};
  const metrics = item.metrics || {
    likes: item.likes || item.likeCount || item.liked_count || item.heat,
    saves: item.saves || item.collects || item.collected_count,
    comments: item.comments || item.comment_count,
    shares: item.shares || item.share_count,
  };
  return {
    id: item.id || item.sourceSampleId || item.topicId || item.noteId,
    title: item.title || item.text || structured.selectedTitle || structured.keyword || "未命名素材",
    body: item.content || item.body || item.copy || item.desc || structured.body || structured.xhsCopy?.body || "",
    platform: item.platform || item.sourcePlatform || item.type || "内容资产库",
    source: item.source || item.sourceName || "",
    sourceTool: item.sourceTool || item.collector || "",
    type: item.type || "",
    keyword: item.keyword || item.sourceKeyword || structured.keyword || "",
    url: item.url || item.sourceUrl || item.noteUrl || "",
    metrics,
    collectionStatus: item.collectionStatus || item.status || "real",
    reason: item.angle || item.reason || "",
    risk: Array.isArray(item.riskNotes) ? item.riskNotes.join("；") : item.riskNotes,
  };
}

function makeMotherTopic(sample, index, eligibility = judgeMotherTopicEligibility(sample)) {
  const sourceInsight = extractSourceInsight(sample);
  const pain = inferPain(sample, sourceInsight);
  const theme = inferTheme(sample, sourceInsight);
  return {
    id: sample.id || `topic-${index}-${Date.now()}`,
    title: sample.title,
    theme,
    platform: sample.platform || "内容资产库",
    keyword: sample.keyword || state.keywords,
    url: sample.url || "",
    body: sample.body || "",
    sourceInsight,
    metrics: sample.metrics || {},
    reason: sample.reason || `入选理由：${eligibility.reasons.slice(0, 3).join("；")}。`,
    pain,
    reuse: reuseLineForTarget(theme),
    risk: sample.risk || "复制结构和洞察，不照抄标题、正文、案例和承诺。",
    eligibility,
    collectionStatus: sample.collectionStatus || "real",
  };
}

function inferTheme(sample, pain) {
  const insight = extractSourceInsight(sample);
  const title = cleanSourceText(sample.title || "");
  if (title && title.length <= 42 && !looksLikeGenericDiagnosis(title)) return title;
  if (insight.theme) return insight.theme;
  if (title) return title.slice(0, 42);
  return `${state.businessLine}里一个值得反复改写的母题`;
}

function inferPain(sample, sourceInsight = extractSourceInsight(sample)) {
  const text = cleanSourceText(`${sample.title} ${sample.body}`);
  const match = text.match(/[^。！？\n]*(不知道|怎么|为什么|到底|不会|分不清|没效果|没流量|没人看|卡住|走弯路|焦虑)[^。！？\n]*/);
  if (match && !looksLikeGenericDiagnosis(match[0])) return match[0].slice(0, 90);
  if (sourceInsight.pain) return sourceInsight.pain;
  return `做${state.businessLine}的人，最怕不是不会用工具，而是看不出什么内容值得拆、怎么改才不像模板。`;
}

function extractSourceInsight(sample = {}) {
  const title = cleanSourceText(sample.title || "");
  const body = cleanSourceText(sample.body || "");
  const text = `${title}\n${body}`;
  if (/套路|模板|同质化|规范|打击/.test(text)) {
    return {
      theme: "AI 自媒体内容别再套模板，平台已经开始打同质化",
      pain: "很多人用 AI 写得更快了，但内容越来越像模板，担心没流量甚至被平台判低质。",
      angle: "从平台新规和同质化风险切入，讲普通人如何把 AI 内容写得更像自己的经验。",
    };
  }
  if (/拆文|爆款|100篇|关键的一层|提示词/.test(text)) {
    return {
      theme: "拆了很多爆款还不火，可能漏掉了真正该拆的一层",
      pain: "很多人只抄标题和结构，却没有拆出爆款背后的用户问题、情绪和行动理由。",
      angle: "从拆爆款的误区切入，讲如何从素材里提炼母题、痛点和表达节奏。",
    };
  }
  if (/社群|同频|创业者|连接/.test(text)) {
    return {
      theme: "做 AI 自媒体，不只是发内容，还要筛选同频的人",
      pain: "很多人发了很多内容，但没有把内容变成筛选客户、连接同频人的入口。",
      angle: "从社群和同频连接切入，讲内容如何承担获客和筛选用户的功能。",
    };
  }
  if (/素材|清洗|去重|素材功能/.test(text)) {
    return {
      theme: "AI 内容工厂真正卡住的，往往是素材清洗和去重",
      pain: "很多人以为内容生产难在生成，其实难在素材太乱、重复太多、无法稳定复用。",
      angle: "从素材工程切入，讲内容资产库为什么比单次写作更重要。",
    };
  }
  if (title) {
    return {
      theme: title.slice(0, 42),
      pain: `这条素材暴露的问题是：${title.slice(0, 70)}`,
      angle: "从源头素材的真实观点切入，改写成适合目标平台的内容。",
    };
  }
  return { theme: "", pain: "", angle: "" };
}

function cleanSourceText(value = "") {
  return String(value || "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeGenericDiagnosis(value = "") {
  return /用户关心|判断标准|行动入口|更具体/.test(String(value || ""));
}

function reuseLineForTarget(theme) {
  return `母题“${theme}”后续可改成小红书图文、公众号长文、短视频脚本和朋友圈文案。`;
}

function buildTitleChoices(topic) {
  if (!topic) return [];
  const theme = safeThemeForTitle(topic);
  if (state.publishTarget === "wechat-article") {
    return [
      { title: `为什么${theme}，正在成为很多人的内容卡点？`, reason: "公众号长文：问题化开头，适合展开论证。" },
      { title: `${theme}背后，真正值得复盘的不是技巧`, reason: "复盘型：适合案例和方法论。" },
      { title: `我重新理解了${theme}这件事`, reason: "认知升级型：适合长文阅读。" },
      { title: `${theme}：从素材到方法论的完整拆解`, reason: "体系型：适合收藏和转发。" },
      { title: `普通人做${theme}，最容易忽略的第一步`, reason: "人群型：降低阅读门槛。" },
    ];
  }
  if (state.publishTarget === "douyin" || state.publishTarget === "video-account") {
    return [
      { title: `你以为${theme}难在工具，其实第一步就错了`, reason: "短视频钩子：反常识。" },
      { title: `${theme}没结果？先看这 3 个判断`, reason: "清单型：适合口播。" },
      { title: `别急着做${theme}，先听我讲一个坑`, reason: "故事型：适合停留。" },
      { title: `很多人做${theme}，输在没有母题库`, reason: "观点型：适合知识口播。" },
      { title: `一分钟讲清楚${theme}的正确顺序`, reason: "效率型：适合短视频标题。" },
    ];
  }
  return [
    { title: `${theme}别急着做，先看清这一步`, reason: "小红书避坑型：适合收藏。" },
    { title: `${theme}没效果？先排查这 3 个原因`, reason: "小红书清单型：适合图文卡片。" },
    { title: `很多人卡在${theme}，其实第一步就错了`, reason: "痛点型：制造停留。" },
    { title: `我为什么建议你先做一次${theme}自查`, reason: "真人建议型：广告感弱。" },
    { title: `${theme}真正有用的，不是照搬爆款`, reason: "观点型：适合二创解释。" },
  ];
}

function safeThemeForTitle(topic = {}) {
  const sourceTheme = cleanSourceText(topic.theme || topic.title || state.businessLine);
  if (!sourceTheme || looksLikeGenericDiagnosis(sourceTheme)) return state.businessLine;
  return sourceTheme.length > 24 ? sourceTheme.slice(0, 24) : sourceTheme;
}

function buildDraft(options = {}) {
  const topic = selectedTopic();
  if (!topic || !state.selectedTitle) return "";
  if (state.publishTarget === "douyin" || state.publishTarget === "video-account") return buildVideoDraft(topic);
  if (state.publishTarget === "wechat-article") return buildArticleDraft(topic);
  if (state.publishTarget === "moments") return buildMomentsDraft(topic);
  if (state.publishTarget === "topic-only") return buildTopicOnlyDraft(topic);
  return buildXhsDraft(topic, options);
}

function buildXhsDraft(topic, options = {}) {
  const insight = topic.sourceInsight || extractSourceInsight(topic);
  const sourceTitle = cleanSourceText(topic.title || "");
  const angleLine = options.variant
    ? "这次换一个更像真实复盘的角度讲，把问题说透，不写成教程腔。"
    : insight.angle || "这次不照搬原帖，而是把源头观点改成更适合小红书图文的内容。";
  return `标题：${state.selectedTitle}

正文：
很多人现在用 AI 做内容，最大的问题不是不会生成，而是越写越像同一套模板。

${angleLine}

我这次参考的源头素材是：
《${sourceTitle || topic.theme}》

它真正值得拆的不是原句，而是背后的提醒：
${topic.pain}

如果你也在做 AI 内容创作，先别急着堆工具，可以先看 3 个地方：

1. 你的内容是不是只有“方法步骤”，但没有自己的经历和判断
2. 你是不是只学了爆款标题，却没拆出用户为什么会停下来
3. 你是不是每篇都很完整，但读起来没有真实场景和人的味道

很多人拆爆款，只拆到标题、开头、结构这一层。

但真正该拆的是：
这篇内容解决了谁的焦虑？
它让读者收藏的理由是什么？
它有没有给一个低门槛的下一步？

所以 AI 内容不是不能用模板，而是不能只剩模板。

你可以先从一篇对标内容开始，拆出母题、用户问题和行动入口，再改成自己的表达。

配图建议：
${buildDeliveryPlan().map((item, index) => `${index + 1}. ${item}`).join("\n")}

标签：#${state.businessLine.replace(/\s+/g, "")} #${state.industry.replace(/\s+/g, "")} #内容避坑 #判断标准 #经验分享`;
}

function buildVideoDraft(topic) {
  return `标题：${state.selectedTitle}

0-3 秒｜钩子
你以为“${topic.theme}”难在工具，其实很多人第一步就错了。

3-8 秒｜代入
很多人看到别人有效，就急着照着做，但很少先问：这个方法适不适合我现在的情况？

8-35 秒｜主体
先看三个判断：
第一，问题是突然出现，还是长期累积。
第二，你之前试过的方法，是不是只看结果，没看前提。
第三，你现在需要的是马上行动，还是先做一次基础判断。

35-48 秒｜源头问题
这条选题来自一个真实素材：${topic.title}
它值得参考的地方不是原文表达，而是背后的用户问题：${topic.pain}

48-60 秒｜行动
所以别急着照搬。先把自己的情况判断清楚，再决定下一步怎么做。

分镜提示：
1. 开头大字：先别急着照搬
2. 中段字幕卡：3 个判断问题
3. 画面：源头素材 / 评论问题打码截图
4. 结尾：先判断，再行动`;
}

function buildArticleDraft(topic) {
  return `# ${state.selectedTitle}

## 这个母题为什么值得写
在“${state.industry}”里，很多内容失败不是因为没有观点，而是没有把真实问题拆清楚。

这次源头素材暴露的问题是：${topic.pain}

## 一、不要先套方法，先判断场景
同一个方法放在不同人身上，效果可能完全不同。内容创作也是一样，不能只学标题和句式，要先看它解决了什么问题。

## 二、拆源头素材的三个信号
1. 标题为什么能让人停下来
2. 正文提供了什么判断标准
3. 评论区或用户问题说明了什么需求

## 三、改造成自己的内容资产
我们要复制的是结构和洞察，不是原文表达。围绕“${state.businessLine}”，更适合的写法是：先讲误区，再给判断框架，最后给低门槛行动入口。

## 四、一鱼多吃
这个母题后续可以继续改成小红书图文、短视频脚本和朋友圈文案。`;
}

function buildMomentsDraft(topic) {
  return `今天看到一个挺典型的问题：

${topic.pain}

很多人不是没有行动力，而是一开始没有判断标准，所以越试越乱。

我现在更建议先做一件事：别急着照搬别人，先把自己的情况拆清楚。

如果你也在做“${state.businessLine}”，可以先从 3 个问题开始：
1. 现在最卡的是认知、方法，还是执行？
2. 有没有真实案例或数据可以参考？
3. 下一步能不能先做一个低成本测试？

先判断，再行动，通常比一上来就猛冲稳得多。`;
}

function buildTopicOnlyDraft(topic) {
  return `母题：${topic.theme}

源头素材：
${topic.title}

用户痛点：
${topic.pain}

复用方向：
${topic.reuse}

风险边界：
${topic.risk}`;
}

function renderBindingEvidence() {
  const topic = selectedTopic();
  if (!topic) return "<p>还没有选中母题。</p>";
  return `
    <p><strong>母题：</strong>${escapeHtml(topic.theme)}</p>
    <p><strong>源头素材：</strong>${escapeHtml(topic.title)}</p>
    <p><strong>来源平台：</strong>${escapeHtml(topic.platform)}</p>
    <p><strong>目标平台：</strong>${escapeHtml(currentTarget().title)}</p>
    <p><strong>选中标题：</strong>${escapeHtml(state.selectedTitle)}</p>
    <p><strong>风险边界：</strong>${escapeHtml(topic.risk)}</p>
    ${topic.url ? `<p><a class="source-link" href="${escapeHtml(topic.url)}" target="_blank" rel="noreferrer">打开原始素材核对</a></p>` : ""}
  `;
}

function scoreDraft() {
  const text = state.improvedDraft || state.draft || "";
  const hasSource = Boolean(state.selectedTopicId);
  const hasPlatform = text.includes(currentTarget().title) || state.publishTarget !== "topic-only";
  const hasAction = /收藏|私信|留言|下一步|行动|测试|分镜|配图/.test(text);
  const hasRisky = /保证|根治|一定有效|确定收益/.test(text);
  return [
    { score: text.length > 280 ? 86 : 72, name: "完整度", reason: text.length > 280 ? "已有标题、正文和行动入口。" : "内容偏短，需要展开判断标准。", warn: text.length <= 280 },
    { score: hasSource ? 90 : 60, name: "母题绑定", reason: hasSource ? "绑定了第五步选中的母题。" : "缺少选中母题。", warn: !hasSource },
    { score: hasPlatform ? 86 : 68, name: "平台适配", reason: "成品按当前发布目标组织。", warn: !hasPlatform },
    { score: hasAction ? 84 : 68, name: "行动入口", reason: hasAction ? "有下一步动作。" : "需要给读者一个低门槛下一步。", warn: !hasAction },
    { score: hasRisky ? 62 : 86, name: "合规边界", reason: hasRisky ? "存在绝对化表达，需要删除。" : "没有明显绝对承诺。", warn: hasRisky },
  ];
}

function improveDraft(text, again = false) {
  if (!text) return "";
  return text + (again
    ? "\n\n再补一句更像真人的表达：这不是让你变慢，而是先少踩坑。很多问题真正浪费时间的地方，就是一开始方向没看清。"
    : "\n\n优化补充：如果你暂时还不确定自己属于哪种情况，先不要急着照搬别人的方案。先做一个小测试，拿到反馈后再决定下一步。");
}

function buildDeliveryPlan() {
  if (state.publishTarget === "wechat-article") return ["长文标题", "开头问题", "案例展开", "方法论结构", "结尾转化"];
  if (state.publishTarget === "douyin" || state.publishTarget === "video-account") return ["封面标题", "黄金 3 秒", "口播正文", "分镜字幕", "素材需求"];
  if (state.publishTarget === "moments") return ["自然开头", "真实观察", "判断建议", "私聊入口"];
  return ["封面：停留标题", "第 2 张：为什么别急着照搬", "第 3 张：3 个自查问题", "第 4 张：源头痛点", "第 5 张：行动入口"];
}

function renderAssetPage(route) {
  if (route === "assets") renderAssets();
  const map = {
    questions: "客户问题库",
    titles: "标题库",
    structures: "爆款结构库",
    records: "作品记录",
  };
  const idMap = {
    questions: "questionBoard",
    titles: "titleBoard",
    structures: "structureBoard",
    records: "recordBoard",
  };
  if (map[route]) {
    const target = byId(idMap[route]);
    if (target) target.innerHTML = sampleAssetItems(map[route]);
  }
}

async function renderAssets() {
  const db = state.assets || await loadState();
  const oldSource = state.sourceChannel;
  state.sourceChannel = "all-assets";
  const topics = buildTopicsFromDb(db).slice(0, 9);
  state.sourceChannel = oldSource;
  $("#assetBoard").innerHTML = `<div class="asset-grid">${topics.map((item) => `<article class="asset-item">
    <b>${escapeHtml(item.theme)}</b>
    <span>${escapeHtml(item.reason)}</span>
    ${item.url ? `<a class="source-link" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">打开来源</a>` : ""}
  </article>`).join("") || `<article class="empty-state"><b>暂无资产</b><span>先读取或导入素材。</span></article>`}</div>`;
}

function sampleAssetItems(label) {
  return `<div class="asset-grid">
    <article class="asset-item"><b>${label}</b><span>这里展示长期沉淀的数据，不打断今日工作流。</span></article>
    <article class="asset-item"><b>下一步</b><span>从今日工作台完成内容后，自动回流到这里。</span></article>
  </div>`;
}

function sampleState() {
  return {
    contentSamples: [
      {
        id: "demo-x-1",
        title: "普通人做 AI 自媒体，真正卡住的不是工具，而是不知道每天发什么",
        content: "很多 AI 工具把功能做得很多，但普通用户更需要一个每天能执行的内容流程。",
        platform: "x",
        sourceTool: "demo",
        keyword: "AI自媒体 内容资产库 Agent工作流",
        metrics: { likes: 328, saves: 91, comments: 28 },
        collectionStatus: "demo",
      },
    ],
  };
}

function log(line) {
  state.logs.push(line);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
});

renderToday();
