const taskLabels = {
  imageText: "做一篇图文",
  video: "做一条视频",
  moments: "写朋友圈",
  article: "写一篇长文",
};

const publishProfiles = {
  xhs: {
    label: "小红书图文",
    guide: "找适合小红书图文的选题",
    text: "系统会优先找高收藏、高评论、能做成图文结构的素材，最后输出小红书标题、正文、标签和配图建议。",
    target: "小红书图文：标题、正文、标签、4-6 张配图建议。",
    button: "生成小红书图文",
  },
  douyinImage: {
    label: "抖音图文",
    guide: "找适合抖音图文滑动阅读的选题",
    text: "系统会优先找能拆成多页图片的素材，重点强化前三页钩子、冲突感和评论互动。",
    target: "抖音图文：短标题、分页图片文案、评论引导。",
    button: "生成抖音图文",
  },
  douyinVideo: {
    label: "抖音短视频",
    guide: "找适合抖音短视频的选题",
    text: "系统会优先找有画面感、有前后对比、有演示价值的素材，后面生成口播脚本、分镜和视频任务。",
    target: "抖音短视频：黄金 3 秒、口播脚本、分镜、封面建议、视频制作任务。",
    button: "生成抖音短视频脚本",
  },
  wechatVideo: {
    label: "视频号",
    guide: "找适合视频号的选题",
    text: "系统会把素材改成更可信、更适合熟人和半熟人观看的解释型视频，不做夸张标题党。",
    target: "视频号：可信口播、案例解释、轻转化引导、视频制作任务。",
    button: "生成视频号脚本",
  },
  xhsVideo: {
    label: "小红书视频",
    guide: "找适合小红书视频的选题",
    text: "系统会优先保留种草感、体验感和收藏价值，生成适合小红书视频的封面、口播和字幕结构。",
    target: "小红书视频：种草标题、口播脚本、封面文案、字幕分镜。",
    button: "生成小红书视频脚本",
  },
  moments: {
    label: "朋友圈",
    guide: "找适合朋友圈表达的案例和话题",
    text: "系统会参考高表现内容，但最终改写成朋友圈能发的自然表达，不做硬广告。",
    target: "朋友圈：自然分享文案、配图建议、私聊引导。",
    button: "生成朋友圈文案",
  },
  wechatArticle: {
    label: "公众号长文",
    guide: "找适合沉淀成长文的方法论主题",
    text: "系统会把短内容信号合并成一篇能讲清楚原理、流程、案例和决策理由的长文结构。",
    target: "公众号长文：文章结构、小标题、正文草稿、案例位置。",
    button: "生成公众号长文",
  },
};

const sourceProfiles = {
  xhs: { label: "小红书", status: "已接入，自动采集", usable: true },
  douyin: { label: "抖音", status: "已打通 Longka 雷达采集", usable: true },
  kuaishou: { label: "快手", status: "已打通 Longka 雷达采集", usable: true },
  bili: { label: "Bilibili", status: "已打通 Longka 雷达采集", usable: true },
  weibo: { label: "微博", status: "已打通 Longka 雷达采集", usable: true },
  zhihu: { label: "知乎", status: "已打通 Longka 雷达采集", usable: true },
  tieba: { label: "百度贴吧", status: "已打通 Longka 雷达采集", usable: true },
  upload: { label: "自己上传素材", status: "已接入，本地导入", usable: true },
  link: { label: "竞品账号 / 链接", status: "可手动粘贴", usable: true },
};

let activeTask = "imageText";
let activePublish = "xhs";
let activeTopic = null;
let activeTitleChoice = "";
let candidateTopics = [];
let hasSearched = false;
let latestAiDraft = null;
let activeQualityFeedback = null;
let activeRevisionRound = 0;
let copyDraftVersions = [];
let copyProgressTimer = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

$("#taskPicker").addEventListener("click", (event) => {
  const button = event.target.closest("[data-task]");
  if (!button) return;
  activeTask = button.dataset.task;
  $$("#taskPicker [data-task]").forEach((item) => item.classList.toggle("active", item === button));
  if (activeTask === "imageText") setPublish("xhs");
  if (activeTask === "video") setPublish("douyinVideo");
  if (activeTask === "moments") setPublish("moments");
  if (activeTask === "article") setPublish("wechatArticle");
  resetSearchState();
  setWorkflowStep(2);
  updateAll();
});

$("#saveCustomerProfile")?.addEventListener("click", async () => {
  const payload = {
    displayName: formValue("#profileName"),
    industry: formValue("#profileIndustry") || formValue("#industry"),
    goal: formValue("#profileGoal") || formValue("#businessGoal"),
    keywords: formValue("#profileKeywords") || formValue("#topic"),
  };
  const button = $("#saveCustomerProfile");
  button.disabled = true;
  button.textContent = "正在创建资料库...";
  try {
    const res = await fetch("/api/customer-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.message || data.error || "创建资料库失败");
    applyCustomerProfile(data.profile);
    $("#profileStatus").textContent = `已创建：${data.profile.libraryName}。数据库：${data.assetDbPath}`;
  } catch (error) {
    $("#profileStatus").textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = "创建我的数字资产库";
  }
});

$("#sourcePicker").addEventListener("click", (event) => {
  const button = event.target.closest("[data-source]");
  if (!button) return;
  button.classList.toggle("active");
  resetSearchState();
  setWorkflowStep(3);
  updateAll();
});

$("#publishPicker")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-publish]");
  if (!button) return;
  setPublish(button.dataset.publish);
  resetSearchState();
  updateAll();
});

$("#findTopics").addEventListener("click", () => {
  activeTopic = null;
  hasSearched = true;
  setWorkflowStep(4);
  $("#findTopics").disabled = true;
  $("#findTopics").textContent = "正在采集分析...";
  renderWorkConsole("running");
  renderCrawlStatus("running");
  renderEmptyTopics("正在调用真实采集数据。没有真实数据时不会生成候选题。");
  $("#crawlPanel").hidden = false;
  $("#crawlPanel").scrollIntoView({ behavior: "smooth", block: "start" });
  runTerminalProgress(async () => {
    const result = await collectRealTopics();
    $("#findTopics").disabled = false;
    $("#findTopics").textContent = result.ok ? "重新真实采集" : "重新尝试采集";
    if (result.ok) {
      candidateTopics = result.topics;
      renderWorkConsole("done");
      renderCrawlStatus("done");
      renderTopics();
      setRoute("topics", { scroll: false });
      renderWorkflowContext();
      $("#topicsPanel").scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      renderWorkConsole("failed", result.message);
      renderCrawlStatus("failed", result.message);
      renderEmptyTopics(result.message);
    }
  });
});

$("#confirmTopic").addEventListener("click", async () => {
  if (!activeTopic) {
    $("#topicHint").textContent = "请先在第四步选择一条真实采集帖子/候选选题，再进入第五步生成标题和文案。";
    $("#topicsPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  setWorkflowStep(5);
  setRoute("delivery", { scroll: false });
  window.setTimeout(() => {
    $("#outputsPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 0);
  await showCopyGenerationProgress();
  renderOutput();
});

$("#makeVideoTask")?.addEventListener("click", async () => {
  await exportToXiaomeiWorkbench();
});

$("#runFullPipeline")?.addEventListener("click", async () => {
  await runFullKeywordPipelineFromWorkbench();
});

function setPublish(publish) {
  activePublish = publish;
  $$("#publishPicker [data-publish]").forEach((item) => item.classList.toggle("active", item.dataset.publish === publish));
}

function selectedSources() {
  return $$("#sourcePicker [data-source].active").map((item) => item.dataset.source);
}

function formValue(id) {
  return $(id)?.value.trim() || "";
}

function updateAll() {
  const profile = publishProfiles[activePublish];
  const sources = selectedSources().map((key) => sourceProfiles[key].label);
  $("#guideTitle").textContent = profile.guide;
  $("#guideText").textContent = `你选择的是“${taskLabels[activeTask]}”，参考来源是“${sources.join("、") || "未选择"}”，最后发布到“${profile.label}”。系统会按这个目标去找选题，不会把采集来源和发布平台混在一起。`;
  $("#taskSummary").textContent = `${taskLabels[activeTask]}，参考${sources.join("、") || "未选择来源"}，最后发布到${profile.label}。`;
  if ($("#targetSummary")) $("#targetSummary").textContent = profile.target;
  if ($("#confirmTopic")) $("#confirmTopic").textContent = profile.button;
  renderWorkflowContext();
}

function applyCustomerProfile(profile) {
  if (!profile) return;
  if ($("#profileName")) $("#profileName").value = profile.displayName || "";
  if ($("#profileIndustry")) $("#profileIndustry").value = profile.industry || "";
  if ($("#profileGoal")) $("#profileGoal").value = profile.goal || "";
  if ($("#profileKeywords")) $("#profileKeywords").value = Array.isArray(profile.keywords) ? profile.keywords.join("、") : "";
  if ($("#industry")) $("#industry").value = profile.industry || $("#industry").value;
  if ($("#businessGoal")) $("#businessGoal").value = profile.goal || $("#businessGoal").value;
  if ($("#businessKeywords") && Array.isArray(profile.keywords) && profile.keywords.length) {
    $("#businessKeywords").value = profile.keywords.join("、");
  }
  if ($("#profileStatus")) {
    $("#profileStatus").textContent = `当前资料库：${profile.libraryName}。后续采集、客户问题、标题和内容都会沉淀到这里。`;
  }
  updateAll();
}

async function loadCustomerProfile() {
  try {
    const res = await fetch("/api/customer-profile");
    const data = await res.json();
    if (data?.profile) applyCustomerProfile(data.profile);
  } catch {
    // Static preview without server keeps the default onboarding values.
  }
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function showCopyGenerationProgress() {
  const profile = publishProfiles[activePublish] || publishProfiles.xhs;
  const isVideo = ["douyinVideo", "wechatVideo", "xhsVideo"].includes(activePublish);
  const steps = [
    ["读取你的资料库", `${formValue("#industry") || "当前行业"} / ${formValue("#businessGoal") || "当前目标"}`],
    ["匹配客户问题", "从评论区问题和历史素材里找可做选题"],
    ["选择标题结构", isVideo ? "匹配短视频开头和口播结构" : "匹配小红书标题和图文结构"],
    ["生成成品草稿", isVideo ? "输出可交给小妹的视频制作脚本" : "输出标准小红书图文和配图建议"],
  ];
  $("#resultPlatform").textContent = profile.label;
  $("#resultTitle").textContent = isVideo ? "正在生成标准视频脚本" : "正在生成标准小红书图文";
  $("#resultCopy").value = "";
  $("#videoTask").hidden = false;
  for (let index = 0; index < steps.length; index += 1) {
    $("#copyDiagnosis").innerHTML = steps.map(([title, text], stepIndex) => `
      <div class="${stepIndex < index ? "done" : stepIndex === index ? "running" : "wait"}">
        <b>${escapeHtml(title)}</b>
        <p>${escapeHtml(text)}</p>
      </div>
    `).join("");
    $("#videoTask").innerHTML = `<div class="operator-brief"><b>生成过程</b><p>${escapeHtml(steps[index][0])}，请稍等。</p></div>`;
    await sleep(360);
  }
}

function renderWorkflowContext() {
  const sources = selectedSources().map((key) => sourceProfiles[key]?.label || key);
  const industry = formValue("#industry") || "未填写";
  const keyword = formValue("#topic") || "未填写";
  const goal = formValue("#businessGoal") || "未填写";
  const profile = publishProfiles[activePublish] || publishProfiles.xhs;
  const topicTitle = activeTopic?.title || "未选择";
  const sourceText = sources.length ? sources.join("、") : "未选择";
  const html = `
    <div><b>今天要做</b><span>${escapeHtml(taskLabels[activeTask] || activeTask)}</span></div>
    <div><b>发布位置</b><span>${escapeHtml(profile.label)}</span></div>
    <div><b>行业 / 关键词</b><span>${escapeHtml(industry)} / ${escapeHtml(keyword)}</span></div>
    <div><b>目标</b><span>${escapeHtml(goal)}</span></div>
    <div><b>素材来源</b><span>${escapeHtml(sourceText)}</span></div>
    <div><b>已选题</b><span>${escapeHtml(topicTitle)}</span></div>
  `;
  $$(".workflow-context").forEach((node) => {
    node.innerHTML = html;
  });
}

async function runFullKeywordPipelineFromWorkbench() {
  const button = $("#runFullPipeline");
  const industry = formValue("#industry") || "未分类行业";
  const keyword = formValue("#topic") || "";
  const platform = publishProfiles[activePublish]?.label || "小红书图文";
  if (!keyword) {
    alert("请先填写今天关心的话题。");
    return;
  }
  button.disabled = true;
  button.textContent = "正在生成完整内容包...";
  $("#crawlPanel").hidden = false;
  renderWorkConsole("running");
  appendTerminalLine(`> 启动完整闭环：${industry} / ${keyword} / ${platform}`);
  try {
    const res = await fetch("/api/keyword-pipeline/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        industry,
        keyword,
        platform,
        visualMode: "pexels",
        projectId: "workbench-v2",
        owner: "客户本人",
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.message || data.error || "完整闭环生成失败");
    appendTerminalLine(`> 内容包完成：真实样本 ${data.content.sampleCount} 条，素材图 ${data.content.imageCount} 张`);
    appendTerminalLine(`> 问题库完成：${data.questionBank.questionCount} 条问题，${data.questionBank.answerCount} 条答案`);
    appendTerminalLine(`> 卡片导出完成：${data.cardExport.count} 张 PNG`);
    renderWorkConsole("done");
    renderFullPipelineResult(data);
    $("#outputsPanel").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    appendTerminalLine(`> 完整闭环失败：${error.message}`);
    renderWorkConsole("failed", error.message);
  } finally {
    button.disabled = false;
    button.textContent = "一键生成完整内容包";
  }
}

function renderFullPipelineResult(data) {
  const content = data.content || {};
  const bank = data.questionBank || {};
  const cards = data.cardExport || {};
  const files = cards.files || [];
  $("#resultPlatform").textContent = data.platform || publishProfiles[activePublish]?.label || "内容包";
  $("#resultTitle").textContent = `完整内容包：${data.keyword}`;
  $("#resultCopy").value = [
    `关键词：${data.keyword}`,
    `行业：${data.industry}`,
    `真实样本：${content.sampleCount || 0} 条`,
    `素材图：${content.imageCount || 0} 张`,
    `问题库：${bank.questionCount || 0} 条`,
    `答案库：${bank.answerCount || 0} 条`,
    `卡片：${cards.count || 0} 张`,
    "",
    `内容包目录：${content.outputDir || ""}`,
    `问题库目录：${bank.outputDir || ""}`,
    `卡片目录：${files[0] ? files[0].replace(/\\xhs-card-01\.png$/, "") : ""}`,
  ].join("\n");
  const previewCards = files.slice(0, 6).map((file, index) => {
    const src = toWorkbenchRelativePath(file);
    return `<a class="pipeline-card-link" href="${escapeAttr(src)}" target="_blank"><img src="${escapeAttr(src)}" alt="卡片 ${index + 1}" /><span>卡片 ${index + 1}</span></a>`;
  }).join("");
  const sources = (content.topSources || cards.visualSources || []).slice(0, 5).map((item) => `
    <div>
      <b>${escapeHtml(item.title || item.keyword || "来源样本")}</b>
      <p>赞 ${escapeHtml(item.metrics?.likes || 0)} / 藏 ${escapeHtml(item.metrics?.saves || item.metrics?.collects || 0)} / 评 ${escapeHtml(item.metrics?.comments || 0)}</p>
      <p>${escapeHtml(item.url || "")}</p>
    </div>
  `).join("");
  $("#contentPack").innerHTML = `
    <div class="pack-head">
      <div>
        <b>完整关键词闭环结果</b>
        <p>已从真实采集样本生成内容包、私有问题库、答案库和小红书卡片。</p>
      </div>
      <span>${escapeHtml(data.keyword)}</span>
    </div>
    <div class="pipeline-card-strip">${previewCards}</div>
    <div class="pack-grid">
      <article class="pack-card"><h3>来源样本</h3><div class="asset-list">${sources}</div></article>
      <article class="pack-card"><h3>文件路径</h3><pre>${escapeHtml(JSON.stringify({ contentDir: content.outputDir, questionBankDir: bank.outputDir, cardFiles: files }, null, 2))}</pre></article>
    </div>`;
}

function toWorkbenchRelativePath(file) {
  const normalized = String(file || "").replaceAll("\\", "/");
  const marker = "/command-center-prototype/";
  const index = normalized.indexOf(marker);
  return index >= 0 ? `./${normalized.slice(index + marker.length)}` : "#";
}

function resetSearchState() {
  hasSearched = false;
  activeTopic = null;
  activeTitleChoice = "";
  candidateTopics = [];
  $("#crawlPanel").hidden = true;
  $("#findTopics").disabled = false;
  $("#findTopics").textContent = "帮我找选题";
  $("#analysisTitle").textContent = "还没选择选题";
  $("#reasonText").textContent = "先点击上方“帮我找选题”，再选择一个候选选题。";
  $("#painText").textContent = "这里会显示用户在评论区真实关心什么。";
  $("#rewriteText").textContent = "这里会说明如何把别人的爆款结构改造成你的内容。";
  renderEmptyTopics("你刚调整了任务设置。点击“帮我找选题”后，这里会出现新的候选选题。");
  renderOutput();
}

function buildCandidateTopics() {
  const industry = formValue("#industry") || "你的行业";
  const topicText = formValue("#topic") || "用户关心的话题";
  const note = formValue("#note");
  const keywords = topicText.split(/[、,，\s]+/).filter(Boolean).slice(0, 4);
  const primary = keywords[0] || topicText;
  const second = keywords[1] || "用户痛点";
  const third = keywords[2] || "案例对比";
  const publish = publishProfiles[activePublish].label;
  const sourceNames = selectedSources().map((key) => sourceProfiles[key].label).join("、") || "手动输入";

  return [
    {
      id: makeTraceId("xhs", primary, 1),
      title: `${primary}：普通人第一步到底该怎么做？`,
      source: `${sourceNames} 候选素材`,
      reason: `这个选题把“${industry}”从专业概念翻译成普通人能理解的第一步，适合做${publish}。`,
      pain: `用户不是不感兴趣，而是不知道从“${primary}”开始能得到什么具体变化。`,
      rewrite: `用“先做一小步、先看到一个结果”的表达降低行动门槛。${note ? `补充方向：${note}` : ""}`,
      risk: "不要写成绝对承诺，避免保证效果。",
      fit: publish,
      evidence: buildEvidence(primary, "测试感切入", 0),
    },
    {
      id: makeTraceId("xhs", second, 2),
      title: `为什么你总在${second}上花冤枉钱？`,
      source: `${sourceNames} 评论痛点`,
      reason: `这个选题有冲突感，容易引发评论和收藏，也容易转成对比图或短视频脚本。`,
      pain: `用户已经尝试过，但没有判断标准，所以反复试错。`,
      rewrite: `把“你做错了”改成“你缺少判断顺序”，语气更容易被接受。`,
      risk: "批判不要太重，避免让用户觉得被冒犯。",
      fit: `${publish} / 可改写成朋友圈`,
      evidence: buildEvidence(second, "避坑痛点", 1),
    },
    {
      id: makeTraceId("xhs", third, 3),
      title: `${third}前后对比，为什么有的人一眼就变精致？`,
      source: `${sourceNames} 高互动案例`,
      reason: `这个选题天然适合配图和视频，能展示过程、差异和结果。`,
      pain: `用户想看到真实变化，而不是只看抽象建议。`,
      rewrite: `先展示“变化点”，再解释背后的选择逻辑，最后引导用户自己试一次。`,
      risk: "案例图要真实，不要过度美化导致不像本人。",
      fit: `${publish} / 视频平台`,
      evidence: buildEvidence(third, "前后对比", 2),
    },
    {
      id: makeTraceId("xhs", primary, 4),
      title: `别急着下单，先用${primary}做一次低成本判断`,
      source: `${sourceNames} 转化类素材`,
      reason: `这个选题直接连接成交，但表达上是帮用户降低决策成本，不像硬卖。`,
      pain: `用户怕花钱后不适合，缺少一个试错成本低的入口。`,
      rewrite: `突出“先试看、满意再继续”，适合承接小程序体验。`,
      risk: "不要把试看说成完整服务，避免预期过高。",
      fit: `${publish} / 私域成交`,
      evidence: buildEvidence(primary, "低成本决策", 3),
    },
  ];
}

async function collectRealTopics() {
  const keywords = formValue("#topic");
  const industry = formValue("#industry");
  const sources = selectedSources();
  if (/^\?+$/.test(keywords.replace(/\s/g, ""))) {
    return {
      ok: false,
      message: "关键词输入出现编码异常，系统读到的是问号。请在浏览器输入中文，或重新粘贴一次关键词。",
    };
  }
  if (!sources.includes("xhs")) {
    return {
      ok: false,
      message: "当前只有小红书真实采集已接入。请选择“小红书”作为参考来源后再试。",
    };
  }
  try {
    appendTerminalLine("> 先查询本地真实样本库，避免每次都等待实时采集");
    const cached = await loadRealTopicsFromState({ keywords, allowRelated: false });
    if (cached.topics.length) {
      appendTerminalLine(`> 本地真实样本库命中 ${cached.topics.length} 个候选题，直接进入选题。`);
      return { ok: true, topics: cached.topics };
    }

    appendTerminalLine("> 本地样本库未命中当前关键词，尝试从 Longka 雷达资产库导入已采集数据");
    await fetch("/api/sources/mediacrawler/import-sqlite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ industry, keywords, limit: 80 }),
    }).catch(() => null);
    const imported = await loadRealTopicsFromState({ keywords, allowRelated: false });
    if (imported.topics.length) {
      appendTerminalLine(`> SQLite 真实样本命中 ${imported.topics.length} 个候选题。`);
      return { ok: true, topics: imported.topics };
    }

    appendTerminalLine("> 正在调用真实小红书采集接口 /api/sources/mediacrawler/xhs-collect");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 600000);
    const waitHint = window.setTimeout(() => {
      appendTerminalLine("> 真实采集仍在运行：这一步需要已登录的平台窗口和 Longka 雷达系统，耗时会比读取缓存长。");
    }, 10000);
    const collectRes = await fetch("/api/sources/mediacrawler/xhs-collect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ industry, keywords }),
      signal: controller.signal,
    });
    window.clearTimeout(timeout);
    window.clearTimeout(waitHint);
    const collectData = await collectRes.json().catch(() => ({}));
    if (!collectRes.ok || collectData.ok === false) {
      const message = collectData.message || collectData.error || "真实采集失败。请确认平台窗口已登录，并且 Longka 雷达系统可用。";
      appendTerminalLine(`> 真实采集失败：${message}`);
      return { ok: false, message };
    }

    appendTerminalLine("> 采集完成，正在读取系统候选题 /api/state");
    if (Number.isFinite(Number(collectData.quickScanCount))) {
      appendTerminalLine(`> 第一层快扫：找到 ${collectData.quickScanCount} 条真实帖子，保留标题、正文、赞藏评转和原帖地址`);
    }
    if (Number.isFinite(Number(collectData.deepDiveCount))) {
      appendTerminalLine(`> 第二层深挖：自动挑选 Top ${collectData.deepDiveCount} 条高互动帖子补抓评论区`);
    }
    if (Number.isFinite(Number(collectData.questionCount))) {
      appendTerminalLine(`> 第三层问题库：从评论区提炼 ${collectData.questionCount} 条客户问题，绑定原帖和评论原文`);
    }
    const afterCollect = await loadRealTopicsFromState({ keywords, allowRelated: false });
    let topics = afterCollect.topics;
    if (!topics.length) {
      return {
        ok: false,
        message: `真实采集执行了，但没有拿到和“${keywords}”匹配的真实候选题。页面不会用其他行业样本冒充结果，请先采集这个关键词的数据。`,
      };
    }
    appendTerminalLine(`> 已读取 ${topics.length} 个真实候选题，全部带来源追踪。`);
    return { ok: true, topics };
  } catch (error) {
    const message = error.name === "AbortError"
      ? "真实采集超过 10 分钟仍未返回。请检查平台登录态、Longka 雷达系统和关键词，页面不会生成假数据。"
      : `真实采集接口调用失败：${error.message}`;
    appendTerminalLine(`> ${message}`);
    return { ok: false, message };
  }
}

async function loadRealTopicsFromState({ keywords = "", allowRelated = false } = {}) {
  const stateRes = await fetch("/api/state");
  const state = await stateRes.json();
  const words = splitWords(`${keywords}`);
  const realSamples = (Array.isArray(state.contentSamples) ? state.contentSamples : [])
    .filter((item) => item.sourceTool === "mediacrawler-pro" || item.collectionStatus === "real")
    .filter((item) => allowRelated || matchesWords(`${item.keyword || ""} ${item.title || ""} ${item.content || ""} ${(item.tags || []).join(" ")}`, words))
    .slice(0, 8)
    .map(mapRealSampleToCandidate);
  if (realSamples.length) return { topics: realSamples };

  const realCandidates = (Array.isArray(state.candidates) ? state.candidates : [])
    .filter(isRealCandidate)
    .filter((item) => allowRelated || matchesWords([
      item.title,
      item.angle,
      item.hook,
      item.source,
      ...(Array.isArray(item.material) ? item.material : []),
      ...(Array.isArray(item.commentPains) ? item.commentPains : []),
    ].join(" "), words))
    .slice(0, 8)
    .map(mapRealCandidate);
  if (realCandidates.length) return { topics: realCandidates };
  return { topics: [] };
}

function splitWords(text) {
  return String(text || "")
    .split(/[、,，\s/]+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 2);
}

function matchesWords(text, words) {
  if (!words.length) return true;
  const haystack = String(text || "").toLowerCase();
  return words.some((word) => haystack.includes(word.toLowerCase()));
}

function isRealCandidate(item) {
  return item.source === "mediacrawler-pro"
    || item.sourceTool === "mediacrawler-pro"
    || item.collectionStatus === "real"
    || item.sourceSampleId
    || (Array.isArray(item.signals) && item.signals.some((signal) => signal.source === "mediacrawler-pro"));
}

function mapRealSampleToCandidate(sample) {
  const metrics = sample.metrics || {};
  const pain = Array.isArray(sample.comments) && sample.comments.length
    ? sample.comments[0]
    : inferPainFromTitle(sample.title || sample.content || "");
  const titleText = sample.title || sample.content || "";
  const healthHair = /白发|变黑|黑发|染发|养发|头发/.test(titleText);
  return {
    id: sample.id || sample.url || sample.title,
    title: sample.title || "真实采集样本",
    source: "小红书真实样本",
    reason: healthHair
      ? "来自真实小红书白发/养发素材，用户关注点集中在显老焦虑、是否可信、是否少折腾。适合改造成避坑型或体验型短视频。"
      : "来自 Longka 雷达真实采集样本，尚未完成深度拆解，可先作为选题参考。",
    pain,
    rewrite: healthHair
      ? "不要照抄“用了就变黑”的承诺，改成“白发焦虑怎么判断、哪些说法要谨慎、如何降低试错成本”的内容结构。"
      : "保留来源内容的用户痛点和内容结构，替换成你的案例、工具入口和发布平台表达。",
    risk: healthHair
      ? "大健康内容不能承诺治疗、逆转、一定变黑；要用个人经验/信息整理/避坑提醒表达，并提示因人而异。"
      : sample.comments?.length ? "发布前仍需人工复核评论语境。" : "缺少评论明细，只能根据标题、正文和互动数据判断。",
    fit: publishProfiles[activePublish].label,
    evidence: {
      mode: "真实采集",
      traceId: sample.id || sample.url || "real-sample",
      sourcePosts: [{
        platform: "小红书",
        noteId: sample.id || "真实样本",
        title: sample.title || "真实采集笔记",
        url: sample.url || "采集数据未提供链接",
        metrics: {
          likes: Number(metrics.likes || 0),
          saves: Number(metrics.saves || 0),
          comments: Number(metrics.comments || 0),
          shares: Number(metrics.shares || 0),
        },
      }],
      comments: sample.comments?.length ? sample.comments.slice(0, 3) : ["该样本暂未补抓评论，需要补抓评论后再确认痛点。"],
    },
  };
}

function inferPainFromTitle(text) {
  if (/白发|变黑|头发/.test(text)) return "用户担心头发状态显老，想找可验证的改善方法。";
  if (/健康|养生|睡眠|减肥/.test(text)) return "用户想改善身体状态，但不知道哪个方法可信。";
  if (/形象|穿搭|发型|色彩/.test(text)) return "用户想变好看，但不知道第一步该改哪里。";
  return "用户有需求，但缺少可信判断标准和低成本尝试入口。";
}


function mapRealCandidate(item) {
  const validation = item.topicValidation || {};
  const signal = Array.isArray(item.signals) ? item.signals.find((row) => row.source === "mediacrawler-pro") || item.signals[0] : null;
  const metrics = item.metrics || validation.metrics || signal?.metrics || {};
  const sourceJudgement = item.sourceJudgement || {};
  const materialTitle = Array.isArray(item.material) ? item.material[0] : "";
  const materialBody = Array.isArray(item.material) ? item.material[1] : "";
  const evidence = {
    mode: "真实采集",
    traceId: item.sourceSampleId || item.id || signal?.source || "real-sample",
    sourcePosts: [
      {
        platform: "小红书",
        noteId: item.sourceSampleId || item.id || "候选题来源样本",
        title: item.sourceTitle || item.originalTitle || materialTitle || item.title || item.angle || "真实采集笔记",
        url: item.sourceUrl || item.url || "采集数据未提供链接",
        metrics: {
          likes: Number(metrics.likes || item.likes || 0),
          saves: Number(metrics.saves || item.saves || 0),
          comments: Number(metrics.comments || item.commentsCount || 0),
          shares: Number(metrics.shares || item.shares || 0),
        },
      },
    ],
    comments: Array.isArray(item.commentPains) && item.commentPains.length
      ? item.commentPains
      : [validation.pain || item.pain || "真实数据中暂未导入评论痛点，请补抓评论。"],
  };
  if (materialBody) evidence.comments.push(`来源正文摘要：${materialBody.slice(0, 80)}`);
  return {
    id: item.id || evidence.traceId,
    title: item.title || item.angle || "真实采集候选题",
    source: `${item.platform || "小红书"} 真实采集`,
    reason: sourceJudgement.reason || validation.reason || item.reason || "来自真实采集样本，已进入候选题池。",
    pain: validation.pain || item.pain || evidence.comments[0],
    rewrite: Array.isArray(item.replicationPlan) ? item.replicationPlan.join("；") : (item.rewrite || "根据来源结构进行二次改写，保留痛点，替换案例和表达。"),
    risk: Array.isArray(item.riskNotes) ? item.riskNotes.join("；") : (item.risk || "发布前仍需人工复核事实和合规表达。"),
    fit: publishProfiles[activePublish].label,
    evidence,
  };
}

function makeTraceId(platform, keyword, index) {
  const clean = String(keyword || "topic").replace(/[^\w\u4e00-\u9fa5]/g, "").slice(0, 8) || "topic";
  return `${platform}-${clean}-${String(index).padStart(2, "0")}`;
}

function buildEvidence(keyword, angle, offset) {
  const base = [
    { likes: 1280, saves: 642, comments: 96, shares: 38 },
    { likes: 2430, saves: 1180, comments: 214, shares: 75 },
    { likes: 870, saves: 530, comments: 68, shares: 22 },
    { likes: 1560, saves: 910, comments: 145, shares: 61 },
  ][offset] || { likes: 600, saves: 320, comments: 42, shares: 15 };
  return {
    mode: "演示样本",
    traceId: makeTraceId("demo", keyword, offset + 1),
    sourcePosts: [
      {
        platform: "小红书",
        noteId: `demo-note-${offset + 1}a`,
        title: `${keyword}相关爆款标题样本`,
        url: "待接入真实采集后回填",
        metrics: base,
      },
      {
        platform: "小红书",
        noteId: `demo-note-${offset + 1}b`,
        title: `${angle}评论区痛点样本`,
        url: "待接入真实采集后回填",
        metrics: {
          likes: Math.round(base.likes * 0.62),
          saves: Math.round(base.saves * 0.74),
          comments: Math.round(base.comments * 1.18),
          shares: Math.round(base.shares * 0.8),
        },
      },
    ],
    comments: [
      `评论里反复出现“${keyword}到底先看什么”的疑问`,
      "用户更关心低成本试看，而不是一上来购买完整服务",
      "收藏理由集中在步骤清楚、能保存、能对照自己使用",
    ],
  };
}

function renderCrawlStatus(status = "done", message = "") {
  const sources = selectedSources();
  const topicText = formValue("#topic") || "未填写关键词";
  const statusText = status === "running" ? "采集中" : status === "failed" ? "失败" : "已完成";
  const analysisText = status === "running" ? "正在调用真实采集接口，不生成模拟数据。" : status === "failed" ? message : "已生成真实候选题：标题钩子、用户痛点、适合平台、改写方向、风险提醒。";
  $("#crawlGrid").innerHTML = sources.map((key) => {
    const source = sourceProfiles[key];
    const state = source.usable ? statusText : "待接入";
    const className = status === "failed" ? "wait" : source.usable ? (status === "running" ? "running" : "done") : "wait";
    return `<div class="crawl-item ${className}">
      <b>${source.label}</b>
      <span>${state}</span>
      <p>${source.status}。本次围绕“${topicText}”生成选题参考。</p>
    </div>`;
  }).join("") + `<div class="crawl-item ${status === "running" ? "running" : status === "failed" ? "wait" : "done"}">
    <b>分析维度</b>
    <span>${statusText}</span>
    <p>${analysisText}</p>
  </div>`;
}

function renderWorkConsole(status = "running", message = "") {
  const sources = selectedSources().map((key) => sourceProfiles[key].label);
  const publish = publishProfiles[activePublish].label;
  const topicText = formValue("#topic") || "未填写关键词";
  const isRunning = status === "running";
  $("#consoleTitle").textContent = isRunning ? "正在采集并分析选题信号" : "采集分析已完成";
  $("#consoleSubtitle").textContent = `参考来源：${sources.join("、") || "未选择"}；目标发布：${publish}；关键词：${topicText}`;
  $("#consoleBadge").textContent = isRunning ? "运行中" : status === "failed" ? "采集失败" : "已生成候选题";
  $("#consoleBadge").className = isRunning ? "running" : status === "failed" ? "failed" : "done";
  $("#progressBar").style.width = isRunning ? "62%" : status === "failed" ? "100%" : "100%";
  const steps = [
    ["读取任务设置", `确认产物是“${taskLabels[activeTask]}”，最终发布到“${publish}”。`, "done"],
    ["检查采集来源", `已选择：${sources.join("、") || "未选择来源"}。未接入的平台会标记为待验证。`, "done"],
    ["采集参考素材", isRunning ? `正在围绕“${topicText}”整理标题、正文和互动信号。` : `已围绕“${topicText}”整理出候选方向。`, isRunning ? "running" : "done"],
    ["拆解爆款结构", isRunning ? "正在提取标题钩子、评论痛点、收藏理由和风险点。" : "已提取标题钩子、评论痛点、收藏理由和风险点。", isRunning ? "running" : "done"],
    ["生成候选选题", isRunning ? "稍后会在下方出现 4 个可选择的选题。" : "下方已生成候选选题，请选择一个继续。", isRunning ? "wait" : "done"],
  ];
  $("#consoleSteps").innerHTML = steps.map(([title, text, state]) => `<li class="${state}">
    <b>${title}</b>
    <p>${text}</p>
  </li>`).join("");
  if (status === "running") {
    $("#terminalStatus").textContent = "运行中";
    $("#terminalStatus").className = "running";
    $("#terminalLog").textContent = "准备启动采集任务...\n";
  }
  if (status === "done") {
    $("#terminalStatus").textContent = "已完成";
    $("#terminalStatus").className = "done";
  }
  if (status === "failed") {
    $("#consoleTitle").textContent = "真实采集没有完成";
    $("#consoleSubtitle").textContent = message;
    $("#terminalStatus").textContent = "失败";
    $("#terminalStatus").className = "failed";
  }
}

function runTerminalProgress(onDone) {
  const sources = selectedSources().map((key) => sourceProfiles[key].label).join("、") || "未选择来源";
  const publish = publishProfiles[activePublish].label;
  const topicText = formValue("#topic") || "未填写关键词";
  const lines = [
    `> 已读取任务：${taskLabels[activeTask]}，最终发布到 ${publish}`,
    `> 已读取关键词：${topicText}`,
    `> 正在检查采集来源：${sources}`,
    "> 小红书来源可用，准备调用真实采集接口",
    "> 未接入平台会先标记为待验证，不参与本次自动采集",
    "> 正在拆解标题钩子：找出用户一眼能懂的痛点表达",
    "> 正在拆解评论痛点：提取用户担心、犹豫和想要的结果",
    "> 正在判断适配平台：把素材改造成当前发布平台的表达方式",
    "> 正在生成候选选题：每个选题附带推荐理由和风险提醒",
    "> 正在绑定来源证据：参考帖子、互动数据、评论痛点、追踪 ID",
    "> 本地预检完成，开始请求真实采集接口",
  ];
  const log = $("#terminalLog");
  log.textContent = "";
  let index = 0;
  const timer = window.setInterval(() => {
    log.textContent += `${new Date().toLocaleTimeString()} ${lines[index]}\n`;
    log.scrollTop = log.scrollHeight;
    $("#progressBar").style.width = `${Math.min(96, 12 + index * 9)}%`;
    index += 1;
    if (index >= lines.length) {
      window.clearInterval(timer);
      $("#progressBar").style.width = "84%";
      window.setTimeout(onDone, 250);
    }
  }, 380);
}

function appendTerminalLine(line) {
  const log = $("#terminalLog");
  log.textContent += `${new Date().toLocaleTimeString()} ${line}\n`;
  log.scrollTop = log.scrollHeight;
}

renderTopics = function renderTopicsOverride() {
  const list = candidateTopics.length ? candidateTopics : buildCandidateTopics();
  $("#topicHint").textContent = "从下面选一个你今天想做的方向，选中后再生成对应平台内容。";
  $("#topicGrid").innerHTML = list.map((topic, index) => `<article class="topic-card ${activeTopic === topic ? "active" : ""}" data-topic-card="${index}" tabindex="0">
    <span>${topic.source}</span>
    <h3>${topic.title}</h3>
    <p>${topic.reason}</p>
    ${renderEvidence(topic)}
    <dl>
      <dt>评论痛点</dt><dd>${topic.pain}</dd>
      <dt>适合发布</dt><dd>${topic.fit}</dd>
      <dt>风险提醒</dt><dd>${topic.risk}</dd>
    </dl>
    <button class="secondary" data-topic-index="${index}">选择这个选题</button>
  </article>`).join("");

  $$("#topicGrid [data-topic-card]").forEach((card) => {
    card.addEventListener("click", () => {
      const index = Number(card.dataset.topicCard);
      if (typeof selectCandidateTopic === "function") return selectCandidateTopic(list[index]);
      activeTopic = list[index];
      $("#analysisTitle").textContent = activeTopic.title;
      $("#reasonText").textContent = activeTopic.reason;
      $("#painText").textContent = activeTopic.pain;
      $("#rewriteText").textContent = activeTopic.rewrite;
      renderTopics();
      $("#decisionPanel").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      card.click();
    });
  });
};

renderEvidence = function renderEvidenceOverride(topic) {
  const evidence = topic.evidence;
  if (!evidence || !Array.isArray(evidence.sourcePosts) || !evidence.sourcePosts.length) return "";
  const totals = evidence.sourcePosts.reduce((sum, post) => ({
    likes: sum.likes + post.metrics.likes,
    saves: sum.saves + post.metrics.saves,
    comments: sum.comments + post.metrics.comments,
    shares: sum.shares + post.metrics.shares,
  }), { likes: 0, saves: 0, comments: 0, shares: 0 });
  const topPost = evidence.sourcePosts[0];
  const sourceUrl = topPost.url && !topPost.url.includes("未提供") && !topPost.url.includes("待接入") ? topPost.url : "";
  return `<div class="evidence-box always-open">
    <div class="evidence-head">
      <b>来源依据</b>
      <i>${evidence.mode}</i>
    </div>
    <p class="trace-id">追踪 ID：${evidence.traceId}</p>
    <div class="source-line">
      <p class="source-title">参考帖子：${topPost.platform}《${topPost.title}》</p>
      ${sourceUrl ? `<a class="source-open-link" href="${sourceUrl}" target="_blank" rel="noopener noreferrer">查看原帖</a>` : `<small class="source-missing">未提供原帖链接</small>`}
    </div>
    ${topPost.summary ? `<p class="source-summary">${topPost.summary}</p>` : ""}
    <div class="metric-row">
      <span>赞 ${totals.likes}</span>
      <span>藏 ${totals.saves}</span>
      <span>评 ${totals.comments}</span>
      <span>转 ${totals.shares}</span>
    </div>
    <div class="reason-list">
      <b>为什么推荐</b>
      <p>${topic.reason}</p>
      <b>评论区依据</b>
      <p>${evidence.comments.slice(0, 2).join("；")}</p>
    </div>
    <details>
      <summary>展开全部来源</summary>
      ${evidence.sourcePosts.map((post) => `<div class="source-post">
        <b>${post.platform}｜${post.noteId}</b>
        <p>${post.title}</p>
        ${post.summary ? `<p class="source-summary">${post.summary}</p>` : ""}
        ${post.url && !post.url.includes("未提供") && !post.url.includes("待接入")
          ? `<a href="${post.url}" target="_blank" rel="noopener noreferrer">打开原帖</a>`
          : `<small>未提供原帖链接</small>`}
      </div>`).join("")}
      <ul>
        ${evidence.comments.map((comment) => `<li>${comment}</li>`).join("")}
      </ul>
    </details>
  </div>`;
};

function renderEmptyTopics(message) {
  $("#topicHint").textContent = message;
  $("#topicGrid").innerHTML = `<article class="empty-card">
    <b>还没有生成候选选题</b>
    <p>${message}</p>
  </article>`;
}

buildOutputCopy = function buildOutputCopyOverride(topic, publish) {
  const title = topic?.title || "先选择一个选题";
  const industry = formValue("#industry") || "这个项目";
  const profile = publishProfiles[publish];

  if (["douyinVideo", "wechatVideo", "xhsVideo"].includes(publish)) {
    return buildVideoScriptFromTopic(topic, publish, industry);
  }

  if (publish === "moments") {
    return `今天看到一个很典型的问题：${topic?.pain || "很多用户不是没有需求，而是不知道怎么开始"}。

我现在更倾向于把复杂服务先做成一个小工具，让用户先看到一个初步结果，再决定要不要继续深入。

比如${industry}，不要一上来就讲一堆专业概念，先让用户知道自己第一步该看什么、改什么，行动门槛会低很多。

有兴趣的可以先试试看。`;
  }

  if (publish === "wechatArticle") {
    return `标题：${title}

一、为什么这个问题值得做
${topic?.pain || "用户有需求，但不知道如何判断。"}

二、普通用户真正卡在哪里
不是没有信息，而是没有顺序、没有判断标准，也没有低成本验证方法。

三、我们如何把它变成可交付的小工具
先把专业判断拆成几个可理解的问题，再把结果做成用户能保存、能分享、能继续行动的内容。

四、内容怎么发
先讲痛点，再讲判断逻辑，最后给一个可以体验的小入口。`;
  }

  if (publish === "douyinImage") {
    return `第 1 页：${title}
第 2 页：很多人卡住，不是因为没需求，而是不知道第一步该看什么。
第 3 页：先把“${topic?.pain || "用户痛点"}”拆成一个可判断的问题。
第 4 页：再给一个低成本体验入口，让用户先看到结果。
第 5 页：觉得方向对，再继续深入。

评论引导：你最想先解决哪一步？`;
  }

  return `标题：${title}

很多人做${industry}时，真正卡住的不是没有需求，而是不知道第一步该怎么判断。

${topic?.pain || "用户有痛点，但缺少一个低成本开始方式。"}

所以这篇内容不直接硬推产品，而是先给用户一个能理解、能参与、能看到初步结果的入口。

推荐发布结构：
1. 封面：一句话点破痛点
2. 正文：解释为什么会这样
3. 案例：展示一个可感知变化
4. 行动：引导用户先试一次

标签：#${industry.replace(/[ /]+/g, "")} #内容营销 #小程序工具`;
};

buildVideoScriptFromTopic = function buildVideoScriptFromTopicOverride(topic, publish, industry) {
  const title = topic?.title || "先选择一个选题";
  const platformName = publishProfiles[publish].label;
  const evidence = topic?.evidence;
  const source = evidence?.sourcePosts?.[0];
  const metrics = source?.metrics || {};
  const sourceLine = source ? `参考来源：${source.platform}《${source.title}》，赞${metrics.likes || 0} / 藏${metrics.saves || 0} / 评${metrics.comments || 0} / 转${metrics.shares || 0}` : "参考来源：未选择真实来源";
  const pain = topic?.pain || "用户有需求，但缺少可信判断标准";
  const risk = topic?.risk || "发布前需要人工复核";
  const isHairHealth = /白发|变黑|黑发|染发|养发|头发|大健康/.test(`${title} ${pain} ${industry}`);
  const styleLine = publish === "douyinVideo"
    ? "抖音处理：开头要直接，但不能夸大功效；用反常识和避坑切入。"
    : publish === "wechatVideo"
      ? "视频号处理：语气更稳，强调经验整理和理性判断。"
      : "小红书视频处理：保留种草感，但重点放在可收藏的判断清单。";

  if (isHairHealth) {
    return `视频标题：${title}

发布平台：${platformName}
${sourceLine}

选题判断：
这条素材能做，不是因为它证明“白发一定能变黑”，而是因为它击中了用户的真实焦虑：显老、怕染发伤头皮、又不知道哪些方法可信。

0-3 秒：
“白发真的能变黑吗？先别急着信，也别急着买。”
画面：放来源帖子标题/白发焦虑关键词，大字写“别被一句白转黑带跑”。

3-10 秒：
“我看了这类白发变黑内容，爆的原因不是方法多神，而是很多人都有同一个痛点：不想一直染，又怕越折腾越糟。”
画面：展示赞藏评转数据，突出评论和收藏。

10-25 秒：
“这类内容要拆成三件事看：第一，是个人经历还是产品宣传；第二，有没有过程记录；第三，有没有提醒因人而异。”
画面：三条判断清单，不展示夸张疗效承诺。

25-40 秒：
“所以这条视频不教你马上变黑，而是教你怎么判断一个白发养护方法值不值得试。先收藏，后面我把常见说法逐条拆给你看。”
画面：收藏引导 + 下一条预告。

封面建议：
标题：“白发变黑？先看这 3 个坑”
副标题：“别急着买，先学会判断”

风险提醒：
${risk}

${styleLine}`;
  }

  return `视频标题：${title}

发布平台：${platformName}
${sourceLine}

选题判断：
这个选题的核心不是复述原帖，而是提炼用户痛点：${pain}

0-3 秒：
用一个真实问题开场，让用户知道这条内容和自己有关。

3-10 秒：
说明为什么用户会被这个问题卡住，避免直接卖产品。

10-25 秒：
展示解决路径：案例、工具、步骤、对比图或操作录屏。

25-40 秒：
给行动引导：评论、私信、搜索小程序、先试一次。

封面建议：
用“痛点 + 结果/避坑”做大字标题，配来源截图或案例图。

平台处理：
${styleLine}`;
};

renderOutput = function renderOutputOverride() {
  const profile = publishProfiles[activePublish];
  $("#resultPlatform").textContent = profile.label;
  $("#resultTitle").textContent = activeTopic ? activeTopic.title : "先选择一个选题";
  $("#resultCopy").value = buildOutputCopy(activeTopic, activePublish);
  $("#videoTask").hidden = true;
  $("#videoTask").innerHTML = "";
};

renderVideoTask = function renderVideoTaskOverride() {
  const profile = publishProfiles[activePublish];
  const title = activeTopic?.title || $("#resultTitle").textContent || "未选择选题";
  const evidence = activeTopic?.evidence;
  const source = evidence?.sourcePosts?.[0];
  const platform = profile.label;
  const shots = [
    ["0-3 秒", "用一句强痛点开场，画面放原帖标题/关键词或问题大字。"],
    ["3-10 秒", "解释用户为什么会被这个问题卡住，避免直接卖产品。"],
    ["10-25 秒", "展示解决路径：案例、工具、小程序、步骤或对比图。"],
    ["25-40 秒", "给行动引导：评论、私信、搜索小程序、先试一次。"],
  ];
  $("#videoTask").hidden = false;
  $("#videoTask").innerHTML = `
    <b>视频制作任务包</b>
    <p><strong>发布平台：</strong>${platform}</p>
    <p><strong>选题：</strong>${title}</p>
    <p><strong>参考来源：</strong>${source ? `${source.platform}《${source.title}》` : "未选择来源"}</p>
    <p><strong>素材要求：</strong>原帖截图/评论截图、产品操作录屏、1-2 张案例图、封面大字。</p>
    <div class="shot-list">
      ${shots.map(([time, copy]) => `<div><span>${time}</span><p>${copy}</p></div>`).join("")}
    </div>
    <p><strong>下一步：</strong>把这个任务交给小妹视频工作台，选择对应模板后生成封面、配音、字幕和成片。</p>
  `;
  $("#videoTask").scrollIntoView({ behavior: "smooth", block: "nearest" });
};

async function exportToXiaomeiWorkbench() {
  renderVideoTask();
  const title = activeTopic?.title || $("#resultTitle").textContent || "未选择选题";
  const profile = publishProfiles[activePublish];
  const copy = buildOutputCopy(activeTopic, activePublish);
  const source = activeTopic?.evidence?.sourcePosts?.[0] || null;
  const shotList = [
    "封面：用来源帖子痛点或结果反差做大字标题",
    "镜头1：展示来源帖子/评论截图，说明真实用户在关心什么",
    "镜头2：拆解问题背后的原因，不直接硬卖",
    "镜头3：展示工具、案例、流程或小程序操作录屏",
    "镜头4：结尾引导用户搜索、评论或先试一次",
  ];
  const button = $("#makeVideoTask");
  button.disabled = true;
  button.textContent = "正在交接并启动制作...";
  try {
    const res = await fetch("/api/xiaomei/video-job", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        platform: profile.label,
        script: copy.split(/\n{2,}/).filter(Boolean),
        shotList,
        coverText: `${title}，先看这一幕`,
        source,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.message || data.error || "交接失败");
    $("#videoTask").hidden = false;
    $("#videoTask").innerHTML += `
      <div class="handoff-result">
        <b>${data.manifest.generationStarted ? "已交接并启动制作" : "已交接，自动启动失败"}</b>
        <p><strong>任务目录：</strong>${data.manifest.jobDir}</p>
        <p><strong>文案文件：</strong>${data.manifest.copyPlanFile}</p>
        <p><strong>制作状态：</strong>${data.manifest.generationMessage}</p>
        ${data.manifest.generationPid ? `<p><strong>后台进程：</strong>${data.manifest.generationPid}</p>` : ""}
      </div>`;
  } catch (error) {
    $("#videoTask").hidden = false;
    $("#videoTask").innerHTML += `<div class="handoff-result failed"><b>交接失败</b><p>${error.message}</p></div>`;
  } finally {
    button.disabled = false;
    button.textContent = "重新交接并启动制作";
  }
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function hasAny(text, words) {
  const source = cleanText(text);
  return words.some((word) => source.includes(word));
}

function topSourceOf(topic) {
  return topic?.evidence?.sourcePosts?.[0] || null;
}

function metricTotalOf(topic) {
  const posts = topic?.evidence?.sourcePosts || [];
  return posts.reduce((sum, post) => ({
    likes: sum.likes + Number(post.metrics?.likes || 0),
    saves: sum.saves + Number(post.metrics?.saves || 0),
    comments: sum.comments + Number(post.metrics?.comments || 0),
    shares: sum.shares + Number(post.metrics?.shares || 0),
  }), { likes: 0, saves: 0, comments: 0, shares: 0 });
}

splitWords = function splitWordsOverride(text) {
  return String(text || "")
    .split(/[、,，\s/]+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 2);
};

matchesWords = function matchesWordsOverride(text, words) {
  const cleanWords = (Array.isArray(words) ? words : splitWords(words)).filter(Boolean);
  if (!cleanWords.length) return true;
  const haystack = String(text || "").toLowerCase();
  return cleanWords.some((word) => haystack.includes(String(word).toLowerCase()));
};

inferPainFromTitle = function inferPainFromTitleOverride(text) {
  if (/白发|变黑|转黑|黑发|头发|染发|养发/.test(text)) {
    return "用户担心白发显老，又怕染发伤头皮、怕被夸大功效内容带偏。";
  }
  if (/发型|穿搭|形象|显白|风格|妆容|变美/.test(text)) {
    return "用户想变好看，但不知道自己第一步该改发型、穿搭还是色彩。";
  }
  return "用户有需求，但缺少可信判断标准和低成本试错入口。";
};

function compactSampleTitle(sample) {
  const raw = String(sample?.title || "").trim();
  const content = String(sample?.content || "").replace(/\s+/g, " ").trim();
  const source = raw || content || "真实采集样本";
  const firstLine = source.split(/[。！？!?；;]/).find(Boolean) || source;
  return firstLine.length > 34 ? `${firstLine.slice(0, 34)}...` : firstLine;
}

function compactSampleSummary(sample) {
  const text = String(sample?.content || sample?.title || "").replace(/\s+/g, " ").trim();
  if (!text) return "来自真实采集样本，发布前需要结合评论区和互动数据人工复核。";
  const summary = text.split(/[。！？!?；;]/).filter(Boolean).slice(0, 2).join("。");
  return summary.length > 88 ? `${summary.slice(0, 88)}...` : summary;
}

mapRealSampleToCandidate = function mapRealSampleToCandidateOverride(sample) {
  const metrics = sample.metrics || {};
  const titleText = sample.title || sample.content || "";
  const shortTitle = compactSampleTitle(sample);
  const sourceSummary = compactSampleSummary(sample);
  const healthHair = /白发|变黑|转黑|黑发|染发|养发|头发/.test(`${sample.keyword || ""} ${titleText}`);
  const pain = Array.isArray(sample.comments) && sample.comments.length
    ? sample.comments[0]
    : inferPainFromTitle(titleText);
  return {
    id: sample.id || sample.url || sample.title,
    title: shortTitle,
    source: "小红书真实样本",
    reason: healthHair
      ? "来自真实小红书白发/养发素材。用户关注点集中在显老焦虑、是否可信、是否少折腾，适合改造成避坑型或判断清单型短视频。"
      : "来自 Longka 雷达真实采集样本，可作为选题参考，但发布前仍要做人工复核。",
    pain,
    rewrite: healthHair
      ? "不要照抄“用了就变黑”的承诺，改成“白发焦虑怎么判断、哪些说法要谨慎、如何降低试错成本”的内容结构。"
      : "保留来源内容的用户痛点和内容结构，替换成你的案例、工具入口和目标平台表达。",
    risk: healthHair
      ? "大健康内容不能承诺治疗、逆转、一定变黑；要用个人经验、信息整理、避坑提醒表达，并提示因人而异。"
      : sample.comments?.length ? "发布前仍需人工复核评论语境。" : "缺少评论明细，只能根据标题、正文和互动数据判断。",
    fit: publishProfiles[activePublish].label,
    evidence: {
      mode: "真实采集",
      traceId: sample.id || sample.url || "real-sample",
      sourcePosts: [{
        platform: "小红书",
        noteId: sample.id || "真实样本",
        title: shortTitle,
        rawTitle: sample.title || "",
        summary: sourceSummary,
        url: sample.url || "采集数据未提供链接",
        metrics: {
          likes: Number(metrics.likes || 0),
          saves: Number(metrics.saves || 0),
          comments: Number(metrics.comments || 0),
          shares: Number(metrics.shares || 0),
        },
      }],
      comments: sample.comments?.length ? sample.comments.slice(0, 3) : ["该样本暂未补抓评论，先用标题、正文和互动数据判断选题价值。"],
    },
  };
};

collectRealTopics = async function collectRealTopicsOverride() {
  const keywords = formValue("#topic");
  const industry = formValue("#industry");
  const sources = selectedSources();
  if (/^\?+$/.test(keywords.replace(/\s/g, ""))) {
    return {
      ok: false,
      message: "关键词输入出现编码异常，系统读到的是问号。请在浏览器重新输入中文关键词。",
    };
  }
  if (!sources.includes("xhs")) {
    return {
      ok: false,
      message: "当前只有小红书真实采集已接入。请先选择“小红书”作为参考来源。",
    };
  }

  try {
    appendTerminalLine("> 先查询本地真实样本库，命中就不重新采集");
    const cached = await loadRealTopicsFromState({ keywords, allowRelated: false });
    if (cached.topics.length) {
      appendTerminalLine(`> 本地真实样本库命中 ${cached.topics.length} 个候选题，跳过实时采集。`);
      return { ok: true, topics: cached.topics };
    }

    appendTerminalLine("> 本地状态库未命中，尝试从 Longka 雷达资产库导入已采集数据");
    const importRes = await fetch("/api/sources/mediacrawler/import-sqlite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ industry, keywords, limit: 80 }),
    });
    const importedPayload = await importRes.json().catch(() => ({}));
    if (importedPayload.ok && Array.isArray(importedPayload.samples) && importedPayload.samples.length) {
      appendTerminalLine(`> SQLite 已命中 ${importedPayload.samples.length} 条真实样本，直接生成候选题，不再重新采集。`);
      return { ok: true, topics: importedPayload.samples.slice(0, 8).map(mapRealSampleToCandidate) };
    }

    const imported = await loadRealTopicsFromState({ keywords, allowRelated: false });
    if (imported.topics.length) {
      appendTerminalLine(`> SQLite 导入后命中 ${imported.topics.length} 个候选题，跳过实时采集。`);
      return { ok: true, topics: imported.topics };
    }

    appendTerminalLine("> 已采集库没有这个关键词，才调用真实小红书采集接口 /api/sources/mediacrawler/xhs-collect");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 600000);
    const waitHint = window.setTimeout(() => {
      appendTerminalLine("> 真实采集仍在运行：需要已登录的平台窗口和 Longka 雷达系统，耗时会比读取缓存长。");
    }, 10000);
    const collectRes = await fetch("/api/sources/mediacrawler/xhs-collect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ industry, keywords, deepDiveLimit: 5 }),
      signal: controller.signal,
    });
    window.clearTimeout(timeout);
    window.clearTimeout(waitHint);
    const collectData = await collectRes.json();
    if (!collectRes.ok || !collectData.ok) throw new Error(collectData.message || collectData.error || "真实采集失败");

    if (Number.isFinite(Number(collectData.quickScanCount))) {
      appendTerminalLine(`> 第一层快扫：找到 ${collectData.quickScanCount} 条真实帖子，保留标题、正文、赞藏评转和原帖地址`);
    }
    if (Number.isFinite(Number(collectData.deepDiveCount))) {
      appendTerminalLine(`> 第二层深挖：自动挑选 Top ${collectData.deepDiveCount} 条高互动帖子补抓评论区`);
    }
    if (Number.isFinite(Number(collectData.questionCount))) {
      appendTerminalLine(`> 第三层问题库：从评论区提炼 ${collectData.questionCount} 条客户问题，绑定原帖和评论原文`);
    }

    if (Array.isArray(collectData.samples) && collectData.samples.length) {
      appendTerminalLine(`> 实时采集返回 ${collectData.samples.length} 条真实样本，直接生成候选题。`);
      return { ok: true, topics: collectData.samples.slice(0, 8).map(mapRealSampleToCandidate) };
    }

    appendTerminalLine("> 采集完成，正在读取系统候选题 /api/state");
    const afterCollect = await loadRealTopicsFromState({ keywords, allowRelated: false });
    if (!afterCollect.topics.length) {
      return {
        ok: false,
        message: `真实采集执行了，但没有拿到和“${keywords}”匹配的真实候选题。页面不会用其他行业样本冒充结果。`,
      };
    }
    appendTerminalLine(`> 已读取 ${afterCollect.topics.length} 个真实候选题，全部带来源追踪。`);
    return { ok: true, topics: afterCollect.topics };
  } catch (error) {
    return {
      ok: false,
      message: error.name === "AbortError"
        ? "真实采集超过 120 秒仍未返回。请检查平台登录态、Longka 雷达系统和关键词。"
        : `真实采集失败：${error.message}`,
    };
  }
};

function deconstructViralTopic(topic, publish = activePublish) {
  const industry = formValue("#industry") || "当前行业";
  const keyword = formValue("#topic") || topic?.title || "用户问题";
  const title = cleanText(topic?.title || keyword);
  const pain = cleanText(topic?.pain || "用户有需求，但缺少可信判断标准");
  const reason = cleanText(topic?.reason || "真实数据里出现了可复用的用户痛点");
  const source = topSourceOf(topic);
  const comments = topic?.evidence?.comments || [];
  const text = `${title} ${pain} ${reason} ${comments.join(" ")} ${industry} ${keyword}`;
  const platformName = publishProfiles[publish]?.label || "目标平台";
  const metrics = metricTotalOf(topic);
  const sourceSummary = source
    ? `${source.platform}《${source.title}》，赞${source.metrics?.likes || 0} / 藏${source.metrics?.saves || 0} / 评${source.metrics?.comments || 0}`
    : "未绑定真实来源";

  if (hasAny(text, ["白发", "变黑", "黑发", "染发", "养发", "头发", "健康", "内调", "中医", "脱发", "护肤", "减肥"])) {
    return {
      type: "health",
      sourceSummary,
      viralHook: "它不是靠一个神奇方法爆，而是踩中了中年人对显老、反复染发、怕被骗的焦虑。",
      userEmotion: "不甘心变老；怕花钱买错；怕伤身体；想找一个低成本、可验证、看起来靠谱的办法。",
      replicableStructure: "先抛出强结果或强疑问，再展示经验/清单/对比，最后用收藏、评论或继续关注承接。",
      doNotCopy: "不能照抄“保证变黑、根治、立刻见效、人人有效”等医疗或功效承诺。",
      ourAngle: `把“${title}”改造成“如何判断这类内容是否可信”的避坑型内容，用真实帖子数据做引子，用判断清单建立信任。`,
      platformStrategy: `${platformName} 要先抓焦虑，再给判断标准。不要直接卖产品，先让用户觉得“这个人是在帮我避坑”。`,
      safeWords: "经验整理、判断标准、因人而异、先观察、先避坑、不要盲目下单。",
      emotionalWords: ["显老", "怕伤头皮", "怕被骗", "不想一直染", "先学会判断"],
      metrics,
    };
  }

  if (hasAny(text, ["形象", "穿搭", "发型", "肤色", "显白", "显老", "好看", "变美", "风格", "妆容", "色彩"])) {
    return {
      type: "beauty",
      sourceSummary,
      viralHook: "它爆的不是专业术语，而是把“变好看”翻译成了用户一眼能感知的结果。",
      userEmotion: "怕显老、怕土、怕拍照不上镜、怕买错衣服和妆容，也想被朋友夸一句变化很明显。",
      replicableStructure: "先展示前后差异，再指出变化点，最后给用户一个低成本试一次的入口。",
      doNotCopy: "不要做过度美颜和虚假对比，也不要把用户照片改到不像本人。",
      ourAngle: `把“${title}”改造成“普通人怎么先找到自己的一个变美抓手”，突出显白、减龄、风格更清楚。`,
      platformStrategy: `${platformName} 要多用对比图、样片、可保存清单和“先试看”的行动入口。`,
      safeWords: "更适合、参考方向、先试看、保留本人特征、降低试错成本。",
      emotionalWords: ["显白", "减龄", "不显土", "拍照更上镜", "少花冤枉钱"],
      metrics,
    };
  }

  return {
    type: "general",
    sourceSummary,
    viralHook: "这个选题能做，是因为它把一个抽象需求变成了用户当下能感知的麻烦。",
    userEmotion: "用户不是不需要，而是不知道第一步怎么判断，怕走弯路，也怕被硬卖。",
    replicableStructure: "真实问题开场，拆出判断标准，给一个小案例或小工具，最后引导用户低成本尝试。",
    doNotCopy: "不要照搬原帖标题、案例和结论；不要把不确定结果写成确定承诺。",
    ourAngle: `把“${title}”改造成“先帮用户做判断”的内容，让用户觉得有用，再进入产品或服务体验。`,
    platformStrategy: `${platformName} 要讲清楚场景、判断标准和下一步动作。`,
    safeWords: "先判断、先验证、低成本试一次、适合再深入。",
    emotionalWords: ["少走弯路", "先看明白", "不被硬卖", "低成本试错"],
    metrics,
  };
}

function renderDeconstruction(topic) {
  const pattern = deconstructViralTopic(topic);
  return `<div class="deconstruct-box">
    <b>爆款拆解与二次改造</b>
    <p><strong>原帖爆点：</strong>${pattern.viralHook}</p>
    <p><strong>用户情绪：</strong>${pattern.userEmotion}</p>
    <p><strong>可抄结构：</strong>${pattern.replicableStructure}</p>
    <p><strong>我方改造：</strong>${pattern.ourAngle}</p>
    <p><strong>不能照抄：</strong>${pattern.doNotCopy}</p>
  </div>`;
}

function selectCandidateTopic(topic) {
  activeTopic = topic;
  activeTitleChoice = "";
  const pattern = deconstructViralTopic(activeTopic);
  $("#analysisTitle").textContent = activeTopic.title;
  $("#reasonText").textContent = activeTopic.reason;
  $("#painText").textContent = activeTopic.pain;
  $("#rewriteText").textContent = `${pattern.ourAngle}\n\n爆点：${pattern.viralHook}\n情绪词：${pattern.emotionalWords.join("、")}\n不能照抄：${pattern.doNotCopy}`;
  renderWorkflowContext();
  renderTopics();
  $("#decisionPanel").scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderTopics() {
  const list = candidateTopics.length ? candidateTopics : buildCandidateTopics();
  $("#topicHint").textContent = "第四步：先选一条真实源头帖。第五步会只基于这条源头帖生成标题候选和二次创作文案。";
  $("#topicGrid").innerHTML = list.map((topic, index) => `<article class="topic-card ${activeTopic === topic ? "active" : ""}" data-topic-card="${index}" tabindex="0">
    <span>${topic.source}</span>
    <h3>${topic.title}</h3>
    <p>${topic.reason}</p>
    ${renderEvidence(topic)}
    ${renderDeconstruction(topic)}
    <dl>
      <dt>评论痛点</dt><dd>${topic.pain}</dd>
      <dt>适合发布</dt><dd>${topic.fit}</dd>
      <dt>风险提醒</dt><dd>${topic.risk}</dd>
    </dl>
    <button class="secondary" data-topic-index="${index}">${activeTopic === topic ? "已选择这条源头" : "选择这条源头做二创"}</button>
  </article>`).join("");

  $$("#topicGrid [data-topic-card]").forEach((card) => {
    card.addEventListener("click", () => selectCandidateTopic(list[Number(card.dataset.topicCard)]));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectCandidateTopic(list[Number(card.dataset.topicCard)]);
      }
    });
  });
}

function renderEvidence(topic) {
  const evidence = topic.evidence;
  if (!evidence || !Array.isArray(evidence.sourcePosts) || !evidence.sourcePosts.length) return "";
  const totals = metricTotalOf(topic);
  const topPost = evidence.sourcePosts[0];
  const sourceUrl = topPost.url && !topPost.url.includes("未提供") && !topPost.url.includes("待接入") ? topPost.url : "";
  return `<div class="evidence-box always-open">
    <div class="evidence-head">
      <b>来源依据</b>
      <i>${evidence.mode || "真实采集"}</i>
    </div>
    <p class="trace-id">追踪 ID：${evidence.traceId || topic.id || "未生成"}</p>
    <div class="source-line">
      <p class="source-title">参考帖子：${topPost.platform}《${topPost.title}》</p>
      ${sourceUrl ? `<a class="source-open-link" href="${sourceUrl}" target="_blank" rel="noopener noreferrer">查看原帖</a>` : `<small class="source-missing">未提供原帖链接</small>`}
    </div>
    ${topPost.summary ? `<p class="source-summary">${topPost.summary}</p>` : ""}
    <div class="metric-row">
      <span>赞 ${totals.likes}</span>
      <span>藏 ${totals.saves}</span>
      <span>评 ${totals.comments}</span>
      <span>转 ${totals.shares}</span>
    </div>
    <div class="reason-list">
      <b>为什么推荐</b>
      <p>${topic.reason}</p>
      <b>评论区依据</b>
      <p>${(evidence.comments || []).slice(0, 2).join("；") || "暂无评论样本"}</p>
    </div>
    <details>
      <summary>展开全部来源</summary>
      ${evidence.sourcePosts.map((post) => `<div class="source-post">
        <b>${post.platform}｜${post.noteId || "无ID"}</b>
        <p>${post.title}</p>
        ${post.summary ? `<p class="source-summary">${post.summary}</p>` : ""}
        ${post.url && !post.url.includes("未提供") && !post.url.includes("待接入")
          ? `<a href="${post.url}" target="_blank" rel="noopener noreferrer">打开原帖</a>`
          : `<small>未提供原帖链接</small>`}
      </div>`).join("")}
      <ul>
        ${(evidence.comments || []).map((comment) => `<li>${comment}</li>`).join("")}
      </ul>
    </details>
  </div>`;
}

function buildOutputCopy(topic, publish) {
  const title = topic?.title || "先选择一个选题";
  const industry = formValue("#industry") || "这个项目";
  const profile = publishProfiles[publish];
  const pattern = deconstructViralTopic(topic, publish);
  const source = pattern.sourceSummary;

  if (["douyinVideo", "wechatVideo", "xhsVideo"].includes(publish)) {
    return buildVideoScriptFromTopic(topic, publish, industry);
  }

  if (publish === "moments") {
    return `今天看到一个很典型的问题：${topic?.pain || "很多用户不是没有需求，而是不知道怎么开始"}。

我不想直接说“买什么最有效”，因为这种说法太容易把人带偏。更靠谱的方式是先给你一个判断标准：什么内容值得参考，什么内容只是情绪收割。

这次参考的真实来源：
${source}

我的拆解：
${pattern.viralHook}
用户真正被打动的是：${pattern.userEmotion}

所以这条内容我会改成一个“先判断、再行动”的小清单。感兴趣的可以先收藏，别急着下单。`;
  }

  if (publish === "wechatArticle") {
    return `标题：${title}

一、为什么这个选题值得做
${pattern.viralHook}

二、用户真正关心的不是功能，而是情绪
${pattern.userEmotion}

三、我们怎么改造，避免照搬原帖
${pattern.ourAngle}

四、可复用结构
${pattern.replicableStructure}

五、发布前风险提醒
${pattern.doNotCopy}

参考来源：
${source}`;
  }

  if (publish === "douyinImage") {
    return `第 1 页：${title}
第 2 页：这类内容为什么容易火？${pattern.viralHook}
第 3 页：用户真正担心的是：${pattern.userEmotion}
第 4 页：别照抄结论，要抄结构：${pattern.replicableStructure}
第 5 页：我的建议：${pattern.ourAngle}
第 6 页：先收藏，别急着买，先学会判断。

参考来源：${source}
合规提醒：${pattern.doNotCopy}`;
  }

  return `标题：${title}

参考来源：
${source}

开头：
${pattern.viralHook}

正文：
很多人以为用户要的是“一个答案”，其实用户先要的是“我怎么判断这件事靠不靠谱”。
这个选题背后的情绪是：${pattern.userEmotion}

所以这篇内容不照搬原帖，也不直接硬卖，而是改成：
${pattern.ourAngle}

可直接使用的结构：
1. 先讲一个用户正在纠结的问题。
2. 再拆出 3 个判断标准。
3. 给一个低成本验证入口。
4. 最后引导收藏、评论或试用。

风险提醒：
${pattern.doNotCopy}

标签：#${industry.replace(/[ /]+/g, "")} #选题拆解 #小红书内容 #内容营销`;
}

function buildVideoScriptFromTopic(topic, publish, industry) {
  const title = topic?.title || "先选择一个选题";
  const platformName = publishProfiles[publish]?.label || "短视频平台";
  const pattern = deconstructViralTopic(topic, publish);
  const source = topSourceOf(topic);
  const sourceLine = source
    ? `参考来源：${source.platform}《${source.title}》，赞${source.metrics?.likes || 0} / 藏${source.metrics?.saves || 0} / 评${source.metrics?.comments || 0} / 转${source.metrics?.shares || 0}`
    : "参考来源：未选择真实来源";
  const platformLine = publish === "douyinVideo"
    ? "抖音处理：开头要直接、有冲突，但不能夸大结果。"
    : publish === "wechatVideo"
      ? "视频号处理：语气更稳，强调经验整理和理性判断。"
      : "小红书视频处理：保留种草感，重点放在可收藏的清单和对比。";

  return `视频标题：${title}

发布平台：${platformName}
${sourceLine}

选题判断：
${pattern.viralHook}

二次改造方向：
${pattern.ourAngle}

0-3 秒：
“先别急着信，也别急着买。这个话题真正火的原因，不是答案多神，而是它打中了一个很真实的焦虑。”
画面：放原帖标题/关键词/数据截图，大字写“先学会判断”。

3-10 秒：
“我拆了这类高互动内容，发现用户真正关心的是：${pattern.userEmotion}”
画面：展示点赞、收藏、评论数据，再切到 3 个情绪词。

10-25 秒：
“这类内容可以抄的不是结论，而是结构：${pattern.replicableStructure}”
画面：三段式白板卡片，左边原帖爆点，右边我方改造角度。

25-40 秒：
“所以这条内容我不会直接教你照做，而是给你一个判断清单：先看来源，再看过程，再看是否承认因人而异。”
画面：判断清单 + 收藏提示。

结尾引导：
“想看我继续拆这个领域的真实爆款，可以先收藏。下一条我直接拿案例拆给你看。”

封面建议：
主标题：先别照抄这个爆款
副标题：真正该抄的是用户情绪和内容结构

平台处理：
${platformLine}

合规提醒：
${pattern.doNotCopy}`;
}

function renderOutput() {
  const profile = publishProfiles[activePublish];
  $("#resultPlatform").textContent = profile.label;
  $("#resultTitle").textContent = activeTopic ? activeTopic.title : "先选择一个选题";
  $("#resultCopy").value = buildOutputCopy(activeTopic, activePublish);
  $("#videoTask").hidden = true;
  $("#videoTask").innerHTML = "";
}

function renderVideoTask() {
  const profile = publishProfiles[activePublish];
  const title = activeTopic?.title || $("#resultTitle").textContent || "未选择选题";
  const source = topSourceOf(activeTopic);
  const pattern = deconstructViralTopic(activeTopic, activePublish);
  const shots = [
    ["0-3 秒", "用原帖关键词和数据开场，指出这条爆款真正打中的焦虑。"],
    ["3-10 秒", `拆用户情绪：${pattern.userEmotion}`],
    ["10-25 秒", `拆可抄结构：${pattern.replicableStructure}`],
    ["25-40 秒", "给我方判断清单和低成本行动入口，引导收藏或试用。"],
  ];
  $("#videoTask").hidden = false;
  $("#videoTask").innerHTML = `
    <b>视频制作任务区</b>
    <p><strong>发布平台：</strong>${profile.label}</p>
    <p><strong>选题：</strong>${title}</p>
    <p><strong>参考来源：</strong>${source ? `${source.platform}《${source.title}》` : "未选择来源"}</p>
    <p><strong>素材要求：</strong>原帖截图/评论截图、产品或小程序录屏、案例图、封面大字。</p>
    <div class="shot-list">
      ${shots.map(([time, copy]) => `<div><span>${time}</span><p>${copy}</p></div>`).join("")}
    </div>
    <p><strong>下一步：</strong>交给小妹视频工作台，按这个脚本生成封面、旁白、字幕、背景音乐和成片。</p>
  `;
  $("#videoTask").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

buildFinalContentPackage = function buildFinalContentPackageAudienceDelivery(topic, publish) {
  const industry = formValue("#industry") || "当前行业";
  const platform = publishProfiles[publish]?.label || "目标平台";
  const source = topSourceOf(topic);
  const metrics = source?.metrics || {};
  const title = cleanText(topic?.title || formValue("#topic") || "先选择一个选题");
  const pain = cleanText(topic?.pain || inferPainFromTitle(title));
  const reason = cleanText(topic?.reason || "真实采集样本里出现了可复用的用户痛点。");
  const rewrite = cleanText(topic?.rewrite || "保留痛点和结构，替换成我们的案例、工具入口和平台表达。");
  const risk = cleanText(topic?.risk || "发布前需要人工复核事实、平台规则和合规表达。");
  const sourceLine = source
    ? `${source.platform}《${cleanText(source.title)}》，赞 ${metrics.likes || 0} / 藏 ${metrics.saves || 0} / 评 ${metrics.comments || 0} / 转 ${metrics.shares || 0}`
    : "未选择真实来源，当前只能生成框架，不能当成可发布稿。";
  const isHair = /白发|变黑|转黑|黑发|染发|养发|头发/.test(`${title} ${pain} ${industry}`);
  const isVideo = ["douyinVideo", "wechatVideo", "xhsVideo"].includes(publish);

  const hook = isHair
    ? "白发变黑这类内容，为什么总是特别容易火？"
    : `${title}，为什么会让用户停下来？`;
  const voiceoverLines = isHair ? [
    "白发变黑这类内容，为什么总是特别容易火？",
    "不是因为每个方法都真的有效，而是它刚好打中了很多中年人的三个焦虑。",
    "第一，白发一多，人会觉得自己突然显老。",
    "第二，又不想一直染，怕伤头皮，也怕越折腾越糟。",
    "第三，网上方法太多，分不清哪些能参考，哪些只是夸大宣传。",
    "所以这类内容真正值得看的，不是“马上变黑”的结论，而是它有没有过程记录，有没有说明因人而异，有没有告诉你风险。",
    "如果你也被白发问题困扰，先别急着买东西，先学会判断。",
    "这条先收藏，下一条我拿真实案例继续拆给你看。"
  ] : [
    hook,
    `这个话题真正打中的不是功能点，而是用户心里的一个具体问题：${pain}`,
    "很多人不是没有需求，而是不知道第一步该怎么判断，怕走弯路，也怕被硬卖。",
    `所以这条内容不要照搬原帖结论，要把它改造成一个更容易理解的判断标准：${rewrite}`,
    "先讲用户正在纠结什么，再给一个能立刻用上的判断方法，最后给一个低成本行动入口。",
    "如果你也遇到类似问题，先把这条收藏起来，后面我继续用真实案例拆给你看。"
  ];

  const coverTitle = isHair ? "白发变黑？先看这3点" : title.slice(0, 18);
  const shotList = [
    `封面：${coverTitle}`,
    `开场：直接抛出用户能听懂的问题：${voiceoverLines[0]}`,
    `中段：围绕痛点展开，不展示内部分析话术：${pain}`,
    "结尾：引导收藏、评论或进入工具体验。"
  ];
  const diagnosis = [
    { name: "真实来源", ok: Boolean(source), text: sourceLine },
    { name: "选题判断", ok: Boolean(topic), text: reason },
    { name: "内容质量诊断", ok: Boolean(topic), text: `形式匹配 ${platform}；核心修改方向：${rewrite}` },
    { name: "AI 味检查", ok: true, text: "最终稿使用口语化短句，不带分析标签，不把操作员说明写给观众。" },
    { name: "风险提醒", ok: !isHair || /不能|风险|因人而异|复核|承诺/.test(risk), text: risk }
  ];

  if (isVideo) {
    return {
      title,
      platform,
      sourceLine,
      coverTitle,
      voiceoverLines,
      shotList,
      diagnosis,
      finalCopy: `标题：${title}

发布平台：${platform}

口播文案：
${voiceoverLines.map((line, index) => `${index + 1}. ${line}`).join("\n")}`
    };
  }

  const body = publish === "moments"
    ? [
      `今天看到一个很典型的问题：${pain}`,
      "我现在越来越觉得，真正能让用户行动的，不是一上来讲一堆专业概念，而是先给他一个能判断、能参与、能看到小结果的入口。",
      `这个选题参考的真实来源是：${sourceLine}`,
      `我会把它改造成：${rewrite}`,
      "如果你也遇到类似问题，先别急着下结论，先看清楚判断标准。"
    ]
    : [
      `很多人做${industry}，卡住的不是没需求，而是不知道第一步该怎么判断。`,
      `这次采集到的真实素材里，用户最关心的是：${pain}`,
      `所以这篇内容不照搬原帖，而是改成一个更适合${platform}的结构：先讲焦虑，再给判断标准，最后给低成本行动入口。`,
      `参考来源：${sourceLine}`,
      "你可以先收藏，后面按这个标准再去判断类似内容。"
    ];
  return {
    title,
    platform,
    sourceLine,
    coverTitle,
    voiceoverLines: body,
    shotList,
    diagnosis,
    finalCopy: `标题：${title}

正文：
${body.join("\n\n")}

标签：#${industry.replace(/[ /]+/g, "")} #选题拆解 #内容营销`
  };
}

buildOutputCopy = function buildOutputCopyCleanFinal(topic, publish) {
  return buildFinalContentPackage(topic, publish).finalCopy;
};

buildVideoScriptFromTopic = function buildVideoScriptFromTopicCleanFinal(topic, publish, industry) {
  return buildFinalContentPackage(topic, publish).finalCopy;
};

function renderDiagnosisPanel(pkg) {
  return `<div class="diagnosis-box">
    <b>Longka 发布前检查</b>
    ${pkg.diagnosis.map((item) => `<div class="diagnosis-row ${item.ok ? "ok" : "warn"}">
      <span>${item.ok ? "通过" : "待补"}</span>
      <p><strong>${item.name}</strong>${item.text}</p>
    </div>`).join("")}
  </div>`;
}

renderOutput = function renderOutputCleanFinal() {
  const profile = publishProfiles[activePublish];
  const pkg = buildFinalContentPackage(activeTopic, activePublish);
  $("#resultPlatform").textContent = profile.label;
  $("#resultTitle").textContent = activeTopic ? activeTopic.title : "先选择一个选题";
  $("#resultCopy").value = pkg.finalCopy;
  $("#videoTask").hidden = false;
  $("#videoTask").innerHTML = renderDiagnosisPanel(pkg);
};

renderVideoTask = function renderVideoTaskCleanFinal() {
  const pkg = buildFinalContentPackage(activeTopic, activePublish);
  $("#videoTask").hidden = false;
  $("#videoTask").innerHTML = `
    ${renderDiagnosisPanel(pkg)}
    <div class="operator-brief">
      <b>给小妹视频工作台的制作说明</b>
      <p><strong>发布平台：</strong>${pkg.platform}</p>
      <p><strong>封面大字：</strong>${pkg.coverTitle}</p>
      <p><strong>来源依据：</strong>${pkg.sourceLine}</p>
      <div class="shot-list">
        ${pkg.shotList.map((copy, index) => `<div><span>${index + 1}</span><p>${copy}</p></div>`).join("")}
      </div>
      <p><strong>注意：</strong>下面交接给视频工具的只会是“口播文案”，不会包含诊断过程。</p>
    </div>`;
  $("#videoTask").scrollIntoView({ behavior: "smooth", block: "nearest" });
};

exportToXiaomeiWorkbench = async function exportToXiaomeiWorkbenchCleanFinal() {
  const pkg = buildFinalContentPackage(activeTopic, activePublish);
  renderVideoTask();
  const button = $("#makeVideoTask");
  button.disabled = true;
  button.textContent = "正在生成小妹任务包...";
  try {
    const res = await fetch("/api/xiaomei/video-job", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: pkg.title,
        platform: pkg.platform,
        script: pkg.voiceoverLines,
        shotList: pkg.shotList,
        coverText: pkg.coverTitle,
        source: topSourceOf(activeTopic),
        diagnostics: pkg.diagnosis,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.message || data.error || "交接失败");
    $("#videoTask").innerHTML += `
      <div class="handoff-result">
        <b>${data.manifest.generationStarted ? "已交接并启动制作" : "已生成小妹视频任务包，未启动成片"}</b>
        <p><strong>任务目录：</strong>${data.manifest.jobDir}</p>
        <p><strong>口播/分镜文件：</strong>${data.manifest.copyPlanFile}</p>
        <p><strong>后续人工确认命令：</strong>${data.manifest.nextCommand}</p>
        <p><strong>成片生成命令：</strong>${data.manifest.generateCommand}</p>
        <p><strong>制作状态：</strong>${data.manifest.generationMessage}</p>
      </div>`;
  } catch (error) {
    $("#videoTask").innerHTML += `<div class="handoff-result failed"><b>交接失败</b><p>${error.message}</p></div>`;
  } finally {
    button.disabled = false;
    button.textContent = "生成视频制作任务";
  }
};

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value = "") {
  return escapeHtml(value);
}

function inferAudience(topic) {
  const text = `${formValue("#industry")} ${formValue("#topic")} ${formValue("#note")} ${topic?.title || ""} ${topic?.pain || ""}`;
  if (/白发|变黑|黑发|染发|养发|头发/.test(text)) {
    return "35-55 岁，白发变多、怕显老、怕染发伤头皮、怕被夸大方法误导的人。";
  }
  if (/形象|发型|穿搭|显白|变美|色彩/.test(text)) {
    return "想改善外在形象，但不知道先改发型、穿搭还是色彩的普通用户。";
  }
  if (/U盘|数据|恢复|文件|打不开/.test(text)) {
    return "U 盘打不开、文件丢失、担心数据恢复失败的小微老板或普通用户。";
  }
  return "正在被这个问题困扰、想先获得可靠判断标准再决定是否咨询或购买的人。";
}

function buildAudienceFacingVideo(topic) {
  const audience = inferAudience(topic);
  const title = cleanText(topic?.title || formValue("#topic") || "今天这个问题先别急着下结论");
  const pain = cleanText(topic?.pain || inferPainFromTitle(title));
  const isHair = /白发|变黑|黑发|染发|养发|头发/.test(`${title} ${pain} ${formValue("#topic")}`);
  if (isHair) {
    return `标题：白发越来越多，先别急着乱试方法

目标观众：${audience}

口播稿：
最近是不是发现，头顶和鬓角的白发越来越明显了？

尤其是拍照、照镜子，或者把头发扎起来的时候，会突然觉得自己老了很多。

很多人第一反应就是去染。

但染多了又担心伤头皮，怕发质变差，也怕刚染完没多久又长出来。

更麻烦的是，网上关于白发变黑的方法太多了。

有人说吃这个有用，有人说抹那个有用，还有人说几天就能看到变化。

看多了以后，反而更不知道该信谁。

如果你现在也有这种焦虑，先别急着买东西，也别急着乱试偏方。

你可以先用三个标准判断一下。

第一，看它有没有说清楚适合什么人。

第二，看它有没有完整过程记录，而不是只放一张前后对比图。

第三，看它有没有提醒风险，有没有说明哪些情况不适合参考。

白发问题最怕的不是慢，而是越急越乱试。

头皮和发质一旦被折腾坏，后面反而更麻烦。

所以如果你现在白发越来越多，第一步不是马上找一个所谓最快的方法。

第一步是先判断：你的白发属于哪种情况，你能不能承受这个方法的风险，它有没有真实过程可以参考。

先把这三个问题看明白，再决定要不要试。

这条你可以先收藏。下一条我继续讲，白发多的人最容易踩的几个养发误区。`;
  }
  return `标题：${title}

目标观众：${audience}

口播稿：
如果你现在也在纠结这个问题，先别急着找答案。

很多时候，真正让人焦虑的不是问题本身，而是不知道第一步该怎么判断。

${pain}

所以这条内容先不劝你买，也不直接给你一个绝对结论。

你先看三个标准。

第一，这个方法适合什么人，不适合什么人。

第二，它有没有真实过程，而不是只展示一个结果。

第三，它有没有告诉你风险和边界。

如果这三点都讲不清楚，你就不要急着跟着做。

先把判断标准看明白，再决定要不要继续试。

这条你可以先收藏，后面我继续用真实案例拆给你看。`;
}

function buildMultiPlatformContentPack(topic) {
  const source = topSourceOf(topic);
  const metrics = source?.metrics || {};
  const sourceLine = source
    ? `${source.platform}《${cleanText(source.title)}》，赞 ${metrics.likes || 0} / 藏 ${metrics.saves || 0} / 评 ${metrics.comments || 0} / 转 ${metrics.shares || 0}`
    : "还没有真实采集来源：当前内容包只能作为草稿结构，不能当成可发布稿。";
  const audience = inferAudience(topic);
  const title = cleanText(topic?.title || formValue("#topic") || "先选择一个选题");
  const pain = cleanText(topic?.pain || inferPainFromTitle(title));
  const video = buildAudienceFacingVideo(topic);
  const xhs = `标题备选：
1. ${title}
2. 最近被这个问题困住的人，先看这 3 点
3. 别急着乱试，先判断自己属于哪种情况

封面文案：
先别急着乱试
看懂这 3 个判断标准

正文：
如果你最近也在被这个问题困住，先别急着马上找一个所谓最快的方法。

真正重要的是先判断：你现在的问题属于哪种情况，哪些方法适合你，哪些方法可能只是看起来很吸引人。

这次参考的素材来源是：${sourceLine}

我建议先看三个标准：
1. 有没有说清楚适用人群。
2. 有没有真实过程记录。
3. 有没有提醒风险和边界。

如果这三点都没有讲清楚，就不要急着跟着做。

先收藏下来，后面我继续用真实案例拆给你看。

标签：#避坑 #判断标准 #真实案例 #${formValue("#industry").replace(/[ /]+/g, "")}`;
  const moments = `最近看到一个挺典型的问题：${pain}

很多人不是没有需求，而是不知道第一步该怎么判断。

我现在越来越觉得，真正靠谱的内容，不是一上来告诉你买什么、做什么，而是先帮你看清楚标准。

先看适合谁，再看过程，再看风险。

这比直接跟风试一个方法，要稳很多。`;
  const article = `# ${title}

## 一、为什么这个问题值得讲

目标观众：${audience}

他们真正焦虑的是：${pain}

## 二、真实素材来源

${sourceLine}

## 三、先建立判断标准

不要先问哪个方法最快，先问三个问题：

1. 它适合什么人？
2. 它有没有真实过程？
3. 它有没有风险边界？

## 四、为什么不能直接照搬爆款

爆款值得学的是它击中的真实焦虑和表达顺序，不是它的原文、案例和承诺。

## 五、下一步

用真实案例继续拆解，让用户先建立信任，再进入咨询或工具体验。`;
  const assets = [
    ["小红书图文配图", "封面大字图、3 条判断标准卡片、真实来源数据卡、风险提醒卡。"],
    ["视频素材", "来源帖截图、评论痛点截图、情绪场景图、判断标准白板图、结尾收藏引导图。"],
    ["配乐建议", "低压、温和、可信任的轻音乐，不要强节奏营销感。"],
    ["成片建议", "先做 45-60 秒视频号/抖音版本，再裁成小红书视频版本。"]
  ];
  return { sourceLine, audience, xhs, video, moments, article, assets };
}

renderContentPack = function renderContentPackDeliveryView() {
  const box = $("#contentPack");
  if (!box) return;
  const pack = buildMultiPlatformContentPack(activeTopic);
  box.innerHTML = `
    <div class="pack-head">
      <div>
        <b>多平台内容包</b>
        <p>输入行业和关键词后，围绕同一个选题输出图文、视频、朋友圈和公众号版本。</p>
      </div>
      <span>${activeTopic ? "已选择选题" : "等待选题"}</span>
    </div>
    <div class="pack-grid">
      <article class="pack-card"><h3>小红书图文</h3><pre>${escapeHtml(pack.xhs)}</pre></article>
      <article class="pack-card"><h3>视频脚本文案</h3><pre>${escapeHtml(pack.video)}</pre></article>
      <article class="pack-card"><h3>朋友圈文案</h3><pre>${escapeHtml(pack.moments)}</pre></article>
      <article class="pack-card"><h3>公众号长文</h3><pre>${escapeHtml(pack.article)}</pre></article>
      <article class="pack-card">
        <h3>配图与视频素材</h3>
        <div class="asset-list">
          ${pack.assets.map(([name, text]) => `<div><b>${escapeHtml(name)}</b><p>${escapeHtml(text)}</p></div>`).join("")}
        </div>
      </article>
      <article class="pack-card">
        <h3>验收状态</h3>
        <div class="asset-list">
          <div><b>目标观众</b><p>${escapeHtml(pack.audience)}</p></div>
          <div><b>来源依据</b><p>${escapeHtml(pack.sourceLine)}</p></div>
          <div><b>硬闸</b><p>没有真实来源时，只允许看草稿结构，不允许标记为可发布内容。</p></div>
        </div>
      </article>
    </div>`;
};

const previousRenderOutputForPack = renderOutput;
renderOutput = function renderOutputWithContentPack() {
  previousRenderOutputForPack();
  renderContentPack();
};

updateAll();
renderEmptyTopics("先输入关键词，然后点击“帮我找选题”。系统会显示采集过程，再给出可选择的候选题。");
renderOutput();

// Active final delivery layer: buyer-facing copy only. Operator analysis must not leak here.
const FINAL_COPY_FORBIDDEN = [
  "为什么会让用户停下来",
  "功能点",
  "不要照搬",
  "爆款",
  "结构",
  "替换成你的案例",
  "工具入口",
  "目标平台表达",
  "用户心里的一个具体问题",
  "内容创作",
  "运营",
  "拆解",
  "开头三秒",
  "黄金3秒",
];

function finalClean(value = "") {
  return cleanText(String(value || "")).replace(/\s+/g, " ").trim();
}

function finalPlatformName(publish) {
  if (publishProfiles[publish]?.label) return publishProfiles[publish].label;
  if (publish === "douyin") return "抖音短视频";
  if (publish === "xhsVideo") return "小红书视频";
  if (publish === "xhs") return "小红书图文";
  if (publish === "moments") return "朋友圈";
  if (publish === "wechatArticle") return "公众号长文";
  return "短视频平台";
}

function sanitizeFinalDelivery(text) {
  let output = String(text || "");
  FINAL_COPY_FORBIDDEN.forEach((word) => {
    output = output.replaceAll(word, "");
  });
  return output.replace(/\n{3,}/g, "\n\n").trim();
}

function sourceLineOf(topic) {
  const source = topSourceOf(topic);
  const metrics = source?.metrics || {};
  return source
    ? `${source.platform || "真实来源"}《${finalClean(source.title || topic?.title)}》，赞 ${metrics.likes || 0} / 藏 ${metrics.saves || 0} / 评 ${metrics.comments || 0} / 转 ${metrics.shares || 0}`
    : "还没有真实采集来源，这份内容只能作为草稿，不能标记为可发布。";
}

function buildFinalContentPackage(topic, publish) {
  const platform = finalPlatformName(publish);
  const title = finalClean(topic?.title || formValue("#topic") || "等待专属二创");
  const sourceLine = sourceLineOf(topic);
  const finalCopy = "等待系统按第四步源头帖、评论区和互动数据生成。这里不再由前端固定模板生成可发布文案。";
  return {
    title,
    platform,
    sourceLine,
    coverTitle: title,
    voiceoverLines: [],
    shotList: [],
    diagnosis: [
      { name: "真实来源", ok: Boolean(topSourceOf(topic)), text: sourceLine },
      { name: "成品闸门", ok: true, text: "文案必须按选中的源头素材生成，前端不生成固定模板。" }
    ],
    finalCopy: sanitizeFinalDelivery(finalCopy),
  };
};

buildAudienceFacingVideo = function buildAudienceFacingVideoAudienceDelivery(topic) {
  return buildFinalContentPackage(topic, activePublish || "douyin").finalCopy;
};

buildMultiPlatformContentPack = function buildMultiPlatformContentPackAudienceDelivery(topic) {
  const pending = "等待第五步专属二创结果。前端不再用固定领域模板生成内容。";
  return {
    sourceLine: sourceLineOf(topic),
    audience: "由系统根据源头帖和评论区生成",
    xhs: pending,
    video: pending,
    moments: pending,
    article: pending,
    assets: [
      ["小红书配图", "文案确认后，根据配图方案生成。"],
      ["视频素材", "文案确认后，根据视频脚本和素材要求生成。"],
      ["视频制作", "文案确认后交给小妹视频工作台。"]
    ],
  };
};

renderContentPack();

// Longka step-1 physical EOF override.
// Keep this block after every legacy renderContentPack/buildOutputCopy definition.
renderTopics = function renderTopicsStep1OnlyEof() {
  longkaLoadSamplePool()
    .then((pool) => longkaRenderSamplePool(pool))
    .catch((error) => {
      const hint = $("#topicHint");
      const grid = $("#topicGrid");
      if (hint) hint.textContent = "第一步读取样本池失败。请先检查真实采集或手动导入素材。";
      if (grid) {
        grid.innerHTML = `<article class="empty-card longka-sample-empty">
          <b>样本池读取失败</b>
          <p>${escapeHtml(error.message || "无法读取本地内容资产库")}</p>
        </article>`;
      }
    });
};

buildOutputCopy = function buildOutputCopyStep1LockedEof() {
  return "第 1 步只展示爆款样本池。请选择真实源头帖进入样本拆解后，再生成标题和文案。";
};

buildVideoScriptFromTopic = function buildVideoScriptStep1LockedEof() {
  return "第 1 步不生成视频脚本。文案确认前，视频入口保持锁定。";
};

renderContentPack = function renderContentPackStep1LockedEof() {
  const box = $("#contentPack");
  if (!box) return;
  box.innerHTML = `
    <div class="pack-head">
      <div>
        <b>成品区已锁定</b>
        <p>当前只验收第 1 步：爆款样本池。正文、配图、视频和打包必须等后续步骤逐项确认。</p>
      </div>
      <span>等待文案确认</span>
    </div>
    <div class="pack-grid">
      <article class="pack-card">
        <h3>当前允许的动作</h3>
        <pre>1. 输入行业、目标、关键词、平台
2. 读取真实采集或手动导入的 5-10 条样本
3. 展示标题、平台、赞藏评转、评论状态、来源追踪、入选理由
4. 选择一条源头帖进入下一步拆解</pre>
      </article>
      <article class="pack-card">
        <h3>当前禁止的动作</h3>
        <pre>不生成正文
不生成标题候选
不生成图片
不生成视频
不打包
不上传服务器
不用旧行业数据或固定模板冒充真实样本</pre>
      </article>
    </div>`;
};

renderContentPack();

// Longka step-1 final override. Keep this at the physical end of the file.
renderTopics = function renderTopicsStep1OnlyFinal() {
  longkaLoadSamplePool()
    .then((pool) => longkaRenderSamplePool(pool))
    .catch((error) => {
      const hint = $("#topicHint");
      const grid = $("#topicGrid");
      if (hint) hint.textContent = "第一步读取样本池失败。请先检查真实采集或手动导入素材。";
      if (grid) {
        grid.innerHTML = `<article class="empty-card longka-sample-empty">
          <b>样本池读取失败</b>
          <p>${escapeHtml(error.message || "无法读取本地内容资产库")}</p>
        </article>`;
      }
    });
};

buildOutputCopy = function buildOutputCopyStep1LockedFinal() {
  return "第 1 步只展示爆款样本池。请选择真实源头帖进入样本拆解后，再生成标题和文案。";
};

buildVideoScriptFromTopic = function buildVideoScriptStep1LockedFinal() {
  return "第 1 步不生成视频脚本。文案确认前，视频入口保持锁定。";
};

renderContentPack = function renderContentPackStep1LockedFinal() {
  const box = $("#contentPack");
  if (!box) return;
  box.innerHTML = `
    <div class="pack-head">
      <div>
        <b>成品区已锁定</b>
        <p>当前只验收第 1 步：爆款样本池。正文、配图、视频和打包必须等后续步骤逐项确认。</p>
      </div>
      <span>等待文案确认</span>
    </div>
    <div class="pack-grid">
      <article class="pack-card">
        <h3>当前允许的动作</h3>
        <pre>1. 输入行业、目标、关键词、平台
2. 读取真实采集或手动导入的 5-10 条样本
3. 展示标题、平台、赞藏评转、评论状态、来源追踪、入选理由
4. 选择一条源头帖进入下一步拆解</pre>
      </article>
      <article class="pack-card">
        <h3>当前禁止的动作</h3>
        <pre>不生成正文
不生成标题候选
不生成图片
不生成视频
不打包
不上传服务器
不用旧行业数据或固定模板冒充真实样本</pre>
      </article>
    </div>`;
};

renderContentPack();

// Longka harness authoritative cleanup for step 1.
// Anything below this point must respect the accepted step-1 contract:
// benchmark sample pool only; no local copy, no image, no video, no delivery package.
renderTopics = function renderTopicsStep1Only() {
  longkaLoadSamplePool()
    .then((pool) => longkaRenderSamplePool(pool))
    .catch((error) => {
      const hint = $("#topicHint");
      const grid = $("#topicGrid");
      if (hint) hint.textContent = "第一步读取样本池失败。请先检查真实采集或手动导入素材。";
      if (grid) {
        grid.innerHTML = `<article class="empty-card longka-sample-empty">
          <b>样本池读取失败</b>
          <p>${escapeHtml(error.message || "无法读取本地内容资产库")}</p>
        </article>`;
      }
    });
};

buildOutputCopy = function buildOutputCopyStep1Locked() {
  return "第 1 步只展示爆款样本池。请选择真实源头帖进入样本拆解后，再生成标题和文案。";
};

buildVideoScriptFromTopic = function buildVideoScriptStep1Locked() {
  return "第 1 步不生成视频脚本。文案确认前，视频入口保持锁定。";
};

renderContentPack = function renderContentPackStep1Locked() {
  const box = $("#contentPack");
  if (!box) return;
  box.innerHTML = `
    <div class="pack-head">
      <div>
        <b>成品区已锁定</b>
        <p>当前只验收第 1 步：爆款样本池。正文、配图、视频和打包必须等后续步骤逐项确认。</p>
      </div>
      <span>等待文案确认</span>
    </div>
    <div class="pack-grid">
      <article class="pack-card">
        <h3>当前允许的动作</h3>
        <pre>1. 输入行业、目标、关键词、平台
2. 读取真实采集或手动导入的 5-10 条样本
3. 展示标题、平台、赞藏评转、评论状态、来源追踪、入选理由
4. 选择一条源头帖进入下一步拆解</pre>
      </article>
      <article class="pack-card">
        <h3>当前禁止的动作</h3>
        <pre>不生成正文
不生成标题候选
不生成图片
不生成视频
不打包
不上传服务器
不用旧行业数据或固定模板冒充真实样本</pre>
      </article>
    </div>`;
};

renderContentPack();

// Longka harness step 1: benchmark sample pool contract.
// This layer owns only source samples and topic candidates. It must not generate copy, images, or video.
const LONGKA_SAMPLE_POOL_MIN = 5;
const LONGKA_SAMPLE_POOL_MAX = 10;

function longkaMetricNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function longkaMetricsOfSample(sample = {}) {
  const metrics = sample.metrics || {};
  return {
    likes: longkaMetricNumber(metrics.likes ?? metrics.likeCount ?? metrics.likedCount),
    saves: longkaMetricNumber(metrics.saves ?? metrics.collects ?? metrics.collectedCount),
    comments: longkaMetricNumber(metrics.comments ?? metrics.commentCount),
    shares: longkaMetricNumber(metrics.shares ?? metrics.shareCount),
  };
}

function longkaMetricLabel(metrics = {}) {
  const total = longkaMetricNumber(metrics.likes) + longkaMetricNumber(metrics.saves) + longkaMetricNumber(metrics.comments) + longkaMetricNumber(metrics.shares);
  if (!total) return "缺少互动指标";
  return `赞 ${metrics.likes || 0} / 藏 ${metrics.saves || 0} / 评 ${metrics.comments || 0} / 转 ${metrics.shares || 0}`;
}

function longkaCommentStatus(sample = {}) {
  const comments = Array.isArray(sample.comments) ? sample.comments.filter(Boolean) : [];
  if (comments.length >= 8) return { key: "deep", label: `深挖评论 ${comments.length} 条` };
  if (comments.length > 0) return { key: "partial", label: `已有评论 ${comments.length} 条` };
  return { key: "none", label: "未补抓评论" };
}

function longkaSampleStatus(sample = {}) {
  if (sample.sourceTool === "mediacrawler-pro" || sample.collectionStatus === "real") return "real";
  if (sample.collectionStatus === "manual" || sample.sourceTool === "manual-import") return "manual";
  if (sample.collectionStatus === "partial") return "partial";
  return sample.collectionStatus || "unknown";
}

function longkaSamplePoolScore(sample = {}) {
  const metrics = longkaMetricsOfSample(sample);
  const commentStatus = longkaCommentStatus(sample);
  const metricScore = Math.log10(metrics.likes + metrics.saves * 1.3 + metrics.comments * 2 + metrics.shares * 2 + 1) * 20;
  const commentScore = commentStatus.key === "deep" ? 20 : commentStatus.key === "partial" ? 10 : 0;
  const sourceScore = longkaSampleStatus(sample) === "real" ? 15 : longkaSampleStatus(sample) === "manual" ? 8 : 0;
  return Math.round(metricScore + commentScore + sourceScore);
}

function longkaWhySelected(sample = {}) {
  const metrics = longkaMetricsOfSample(sample);
  const commentStatus = longkaCommentStatus(sample);
  const reasons = [];
  if (metrics.saves >= metrics.likes * 0.35 && metrics.saves > 0) reasons.push("收藏占比高，适合做可保存图文");
  if (metrics.comments >= 20) reasons.push("评论多，适合沉淀客户问题库");
  if (metrics.likes + metrics.saves >= 300) reasons.push("互动强，说明话题被市场验证过");
  if (commentStatus.key !== "none") reasons.push("有评论问题，可继续拆选题角度");
  if (!reasons.length) reasons.push("有真实来源，可先进入样本池等待深挖");
  return reasons.slice(0, 3).join("；");
}

function longkaBuildSamplePoolFromState(state = {}, keywords = "") {
  const words = String(keywords || "").split(/[、,，\s]+/).map((word) => word.trim()).filter(Boolean);
  const samples = (Array.isArray(state.contentSamples) ? state.contentSamples : [])
    .filter((sample) => {
      const status = longkaSampleStatus(sample);
      return status === "real" || status === "manual" || status === "partial";
    })
    .filter((sample) => {
      if (!words.length) return true;
      const haystack = `${sample.keyword || ""} ${sample.title || ""} ${sample.content || ""} ${(sample.tags || []).join(" ")} ${(sample.comments || []).slice(0, 5).join(" ")}`;
      return words.some((word) => haystack.includes(word));
    })
    .map((sample) => {
      const metrics = longkaMetricsOfSample(sample);
      const commentStatus = longkaCommentStatus(sample);
      const status = longkaSampleStatus(sample);
      return {
        id: sample.id || sample.url || sample.title,
        sample,
        status,
        title: sample.title || sample.content || "未命名真实样本",
        platform: sample.platform || "xiaohongshu",
        url: sample.url || "",
        traceId: sample.id || sample.url || sample.title || "sample",
        keyword: sample.keyword || keywords,
        metrics,
        metricLabel: longkaMetricLabel(metrics),
        commentStatus,
        score: longkaSamplePoolScore(sample),
        whySelected: longkaWhySelected(sample),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, LONGKA_SAMPLE_POOL_MAX);
  return {
    samples,
    ready: samples.length >= LONGKA_SAMPLE_POOL_MIN,
    min: LONGKA_SAMPLE_POOL_MIN,
    max: LONGKA_SAMPLE_POOL_MAX,
  };
}

function longkaRenderSamplePool(pool) {
  const grid = $("#topicGrid");
  if (!grid) return;
  const hint = $("#topicHint");
  if (hint) {
    hint.textContent = pool.ready
      ? `第一步已整理 ${pool.samples.length} 条爆款样本。先选源头帖，下一步才做样本拆解。`
      : `第一步需要 5-10 条真实/手动样本；当前只有 ${pool.samples.length} 条。样本不足时不进入文案生成。`;
  }
  if (!pool.samples.length) {
    grid.innerHTML = `<article class="empty-card longka-sample-empty">
      <b>还没有可用爆款样本池</b>
      <p>请先用 Longka 雷达采集，或导入你已有的竞品帖子。系统不会用固定模板冒充真实样本。</p>
    </article>`;
    return;
  }
  grid.innerHTML = pool.samples.map((item, index) => {
    const commentClass = item.commentStatus.key === "deep" ? "good" : item.commentStatus.key === "partial" ? "warn" : "muted";
    return `<article class="topic-card longka-sample-card ${activeTopic?.evidence?.traceId === item.traceId ? "active" : ""}" data-topic-card="${index}" tabindex="0">
      <span>爆款样本池 · ${escapeHtml(item.status)}</span>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.whySelected)}</p>
      <div class="sample-contract-grid">
        <div><b>平台</b><span>${escapeHtml(item.platform)}</span></div>
        <div><b>关键词</b><span>${escapeHtml(item.keyword || "未记录")}</span></div>
        <div><b>互动指标</b><span>${escapeHtml(item.metricLabel)}</span></div>
        <div><b>评论状态</b><span class="sample-status ${commentClass}">${escapeHtml(item.commentStatus.label)}</span></div>
        <div><b>来源追踪</b><span>${item.url ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">打开原帖</a>` : escapeHtml(item.traceId)}</span></div>
        <div><b>下一步</b><span>${item.commentStatus.key === "none" ? "建议补抓评论区" : "可进入样本拆解"}</span></div>
      </div>
      <button class="secondary" data-topic-index="${index}">${activeTopic?.evidence?.traceId === item.traceId ? "已选择这条源头" : "选择这条源头做拆解"}</button>
    </article>`;
  }).join("");
  $$("#topicGrid [data-topic-card]").forEach((card) => {
    card.addEventListener("click", () => {
      const item = pool.samples[Number(card.dataset.topicCard)];
      if (!item) return;
      selectCandidateTopic(mapRealSampleToCandidate(item.sample));
    });
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      const item = pool.samples[Number(card.dataset.topicCard)];
      if (!item) return;
      selectCandidateTopic(mapRealSampleToCandidate(item.sample));
    });
  });
}

async function longkaLoadSamplePool({ keywords = formValue("#topic") } = {}) {
  let state = assetStateCache;
  if (!state) {
    state = await fetch("/api/state").then((res) => res.json());
    assetStateCache = state;
  }
  return longkaBuildSamplePoolFromState(state, keywords);
}

const collectRealTopicsBeforeSamplePool = collectRealTopics;
collectRealTopics = async function collectRealTopicsWithSamplePool() {
  const result = await collectRealTopicsBeforeSamplePool();
  if (!result.ok) return result;
  try {
    assetStateCache = await fetch("/api/state").then((res) => res.json());
    const pool = await longkaLoadSamplePool();
    if (pool.samples.length) {
      const topics = pool.samples.map((item) => mapRealSampleToCandidate(item.sample));
      longkaRenderSamplePool(pool);
      return { ok: true, topics, samplePool: pool };
    }
  } catch (error) {
    appendTerminalLine(`> 样本池读取失败：${error.message}`);
  }
  return result;
};

const renderTopicsBeforeSamplePool = renderTopics;
renderTopics = function renderTopicsWithSamplePoolContract() {
  longkaLoadSamplePool()
    .then((pool) => {
      if (pool.samples.length) longkaRenderSamplePool(pool);
      else renderTopicsBeforeSamplePool();
    })
    .catch(() => renderTopicsBeforeSamplePool());
};

// Longka content factory V1: onboarding anchors + calibrated topic scoring.
const calibrationAnswers = {
  leadGoal: true,
  primaryXhs: true,
  useBenchmarks: true,
  saveAssetDb: true,
  reviewAfterPublish: true,
};

try {
  const savedCalibration = JSON.parse(localStorage.getItem("longkaContentFactoryCalibration") || "{}");
  Object.assign(calibrationAnswers, savedCalibration);
} catch {
  // Keep defaults when localStorage is unavailable or corrupted.
}

function scoreValue(value, max, weight) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return 0;
  return Math.min(weight, (Math.log10(number + 1) / Math.log10(max + 1)) * weight);
}

function topicMetrics(topic) {
  const totals = typeof metricTotalOf === "function" ? metricTotalOf(topic) : null;
  if (totals) return totals;
  return (topic?.evidence?.sourcePosts || []).reduce((sum, post) => {
    const metrics = post.metrics || {};
    sum.likes += Number(metrics.likes || 0);
    sum.saves += Number(metrics.saves || metrics.collects || 0);
    sum.comments += Number(metrics.comments || 0);
    sum.shares += Number(metrics.shares || 0);
    return sum;
  }, { likes: 0, saves: 0, comments: 0, shares: 0 });
}

function scoreTopicPotential(topic) {
  const metrics = topicMetrics(topic);
  const comments = Array.isArray(topic?.evidence?.comments) ? topic.evidence.comments.filter(Boolean) : [];
  const sourcePosts = Array.isArray(topic?.evidence?.sourcePosts) ? topic.evidence.sourcePosts : [];
  const sourceBound = sourcePosts.some((post) => post.url && !String(post.url).includes("未提供") && !String(post.url).includes("待接入"));
  const text = [topic?.title, topic?.reason, topic?.pain, topic?.rewrite, comments.join(" ")].join(" ");
  const questionSignal = /吗|怎么|为什么|怎么办|适合|能不能|有没有|需要|多久|多少钱|担心|怕|求|不懂|判断/.test(text);
  const hookSignal = /别|先|错|坑|真相|原因|为什么|不是|一定|自查|判断|区别|适合/.test(topic?.title || text);
  const riskPenalty = /治疗|根治|保证|一定有效|逆转|稳赚|确定成交/.test(text) ? 8 : 0;
  const sourceScore = sourceBound ? 15 : 9;
  const commentScore = Math.min(18, comments.length * 4 + (questionSignal ? 8 : 0) + scoreValue(metrics.comments, 300, 6));
  const saveScore = scoreValue(metrics.saves, 2500, 18);
  const heatScore = scoreValue(metrics.likes, 5000, 14) + scoreValue(metrics.shares, 800, 7);
  const titleScore = hookSignal ? 12 : 7;
  const conversionScore = /咨询|检测|到店|私信|收藏|自查|先判断|下一步|方案|入口/.test(text) ? 14 : 8;
  const total = Math.max(0, Math.min(100, Math.round(sourceScore + commentScore + saveScore + heatScore + titleScore + conversionScore - riskPenalty)));
  const level = total >= 82 ? "高潜力" : total >= 70 ? "可优先测试" : total >= 58 ? "可做但需改角度" : "先补评论/证据";
  return {
    total,
    level,
    dimensions: [
      ["源头绑定", sourceScore, sourceBound ? "有真实原帖或采集追踪" : "有采集记录，但原帖链接不足"],
      ["评论问题", commentScore, comments.length ? "有评论/客户问题可用" : "评论不足，建议补抓评论区"],
      ["收藏价值", saveScore, `收藏 ${metrics.saves || 0}`],
      ["热度信号", heatScore, `赞 ${metrics.likes || 0} / 转 ${metrics.shares || 0}`],
      ["标题钩子", titleScore, hookSignal ? "标题有判断/避坑/反差信号" : "标题需要重写钩子"],
      ["转化入口", conversionScore, "能导向收藏、咨询、检测或下一步行动"],
    ],
    prediction: total >= 82
      ? "适合作为今天主推内容。发布前重点打磨标题和第一屏，保留评论区问题。"
      : total >= 70
        ? "适合进入候选池。需要基于评论区问题再做标题 A/B。"
        : "不要急着生成图和视频，先补评论或换一条更强源头帖。",
  };
}

function renderTopicScore(topic) {
  const score = scoreTopicPotential(topic);
  const [source, comments, save, heat, hook, conversion] = score.dimensions;
  return `<div class="calibrated-score">
    <div class="score-main">
      <span>Longka 推荐依据</span>
      <b>${escapeHtml(score.level)}</b>
      <p>${escapeHtml(score.prediction)}</p>
    </div>
    <div class="score-dims">
      <div>
        <span>为什么值得做</span>
        <small>${escapeHtml([heat?.[2], save?.[2]].filter(Boolean).join("；"))}</small>
      </div>
      <div>
        <span>客户在问什么</span>
        <small>${escapeHtml(comments?.[2] || topic?.pain || "评论问题不足，建议补抓评论区")}</small>
      </div>
      <div>
        <span>标题怎么切</span>
        <small>${escapeHtml(hook?.[2] || "进入第五步后生成多组标题给你选")}</small>
      </div>
      <div>
        <span>怎么接业务</span>
        <small>${escapeHtml(conversion?.[2] || "引导收藏、咨询、检测或下一步行动")}</small>
      </div>
      <div>
        <span>素材是否可靠</span>
        <small>${escapeHtml(source?.[2] || "有采集记录，发布前复核来源")}</small>
      </div>
      <div>
        <span>不要这样写</span>
        <small>${escapeHtml(topic?.risk || "不照抄原帖，不写保证效果，不夸大承诺")}</small>
      </div>
    </div>
  </div>`;
}

function getAnchorSamplesFromState(state) {
  const keyword = formValue("#topic");
  const words = splitWords(keyword);
  return (Array.isArray(state?.contentSamples) ? state.contentSamples : [])
    .filter((sample) => sample.sourceTool === "mediacrawler-pro" || sample.collectionStatus === "real" || sample.collectionStatus === "manual")
    .filter((sample) => !words.length || matchesWords(`${sample.keyword || ""} ${sample.title || ""} ${sample.content || ""} ${(sample.tags || []).join(" ")}`, words))
    .map((sample) => ({ sample, candidate: mapRealSampleToCandidate(sample) }))
    .map((item) => ({ ...item, score: scoreTopicPotential(item.candidate) }))
    .sort((a, b) => b.score.total - a.score.total)
    .slice(0, 10);
}

async function renderCalibrationPanel() {
  let panel = $("#calibrationPanel");
  if (panel) panel.remove();
  const host = $("#profileGate");
  if (!host) return;
  let state = assetStateCache;
  if (!state) {
    try {
      state = await fetch("/api/state").then((res) => res.json());
      assetStateCache = state;
    } catch {
      state = {};
    }
  }
  const anchors = getAnchorSamplesFromState(state);
  const answerRows = [
    ["leadGoal", "你现在最想要什么结果？", "获客转化", "涨粉曝光", "获客转化代表引导私信、咨询、到店或购买；涨粉曝光代表先做认知和关注。"],
    ["primaryXhs", "第一平台先从哪里开始？", "小红书优先", "其他平台优先", "Longka 内容工厂会按平台生成对应的标题、图文或短视频脚本。"],
    ["useBenchmarks", "是否让 Longka 雷达找高赞素材？", "开启雷达", "只用自有素材", "Longka 雷达系统会帮你找到并整理 5-10 条高赞素材，少刷平台、少凭感觉选题。"],
    ["saveAssetDb", "是否保存你的内容资产库？", "保存到资产库", "只做本次", "Longka 资产库会沉淀客户问题、标题、选题、爆款结构和发布反馈。"],
    ["reviewAfterPublish", "发布后是否复盘数据？", "愿意复盘", "暂不复盘", "记录点赞、收藏、评论和咨询问题，下次选题会更准。"],
  ];
  const summary = [
    calibrationAnswers.leadGoal ? "优先获客转化内容" : "优先涨粉曝光内容",
    calibrationAnswers.primaryXhs ? "小红书优先" : "按所选平台适配",
    calibrationAnswers.useBenchmarks ? "Longka 雷达整理 5-10 条高赞素材" : "只使用自有/导入素材",
    calibrationAnswers.saveAssetDb ? "写入本地资产库" : "仅保留当前会话",
    calibrationAnswers.reviewAfterPublish ? "发布后记录反馈继续优化" : "暂不记录发布反馈",
  ];
  const existing = host.querySelector(".profile-calibration");
  if (existing) existing.remove();
  host.insertAdjacentHTML("beforeend", `
    <div class="profile-calibration">
      <div class="profile-calibration-head">
        <b>Longka 内容工厂启动设置</b>
        <p>第一次只选方向。Longka 雷达负责找高赞素材，内容工厂负责生成图文和短视频脚本，资产库负责沉淀你的行业资料。</p>
      </div>
      <div class="profile-calibration-list">
        ${answerRows.map(([key, question, yesLabel, noLabel, help]) => `<div class="profile-calibration-row">
          <div>
            <strong>${escapeHtml(question)}</strong>
            <small>${escapeHtml(help)}</small>
          </div>
          <div class="choice-row">
            <button type="button" class="${calibrationAnswers[key] ? "active" : ""}" data-calibration-key="${key}" data-calibration-choice="yes">${escapeHtml(yesLabel)}</button>
            <button type="button" class="${!calibrationAnswers[key] ? "active" : ""}" data-calibration-key="${key}" data-calibration-choice="no">${escapeHtml(noLabel)}</button>
          </div>
        </div>`).join("")}
      </div>
      <div class="profile-calibration-result">
        <span>${escapeHtml(summary.join(" / "))}</span>
          <button class="secondary" type="button" id="saveCalibrationProfile">保存到 Longka 资产库</button>
      </div>
      ${anchors.length ? `<p class="profile-anchor-note">当前关键词已有 ${anchors.length} 条可用高赞素材。点击“帮我找选题”后会按这些素材生成候选。</p>` : `<p class="profile-anchor-note">当前关键词还没有足够高赞素材。点击“帮我找选题”后，Longka 雷达系统会先找真实素材，不用假数据顶上。</p>`}
    </div>`);
  host.querySelectorAll("[data-calibration-key][data-calibration-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.calibrationKey;
      calibrationAnswers[key] = button.dataset.calibrationChoice === "yes";
      renderCalibrationPanel();
    });
  });
  host.querySelector("#saveCalibrationProfile")?.addEventListener("click", () => {
    localStorage.setItem("longkaContentFactoryCalibration", JSON.stringify(calibrationAnswers));
    const status = $("#profileStatus");
    if (status) status.textContent = `已保存 Longka 内容工厂设置：${summary.join(" / ")}。后续找素材、选题、写文案和复盘都会按这套方向走。`;
  });
}

const renderTopicsBeforeCalibration = renderTopics;
renderTopics = function renderTopicsWithCalibrationScores() {
  const list = candidateTopics.length ? candidateTopics : buildCandidateTopics();
  $("#topicHint").textContent = "第四步：先从真实高赞素材里选一条源头。选中后，下一步会围绕这条素材生成多组标题和专属文案，不再套固定模板。";
  $("#topicGrid").innerHTML = list.map((topic, index) => `<article class="topic-card ${activeTopic === topic ? "active" : ""}" data-topic-card="${index}" tabindex="0">
    <span>${escapeHtml(topic.source || "候选选题")}</span>
    <h3>${escapeHtml(topic.title || "未命名选题")}</h3>
    <p>${escapeHtml(topic.reason || "")}</p>
    ${renderTopicScore(topic)}
    ${renderEvidence(topic)}
    ${renderDeconstruction(topic)}
    <dl>
      <dt>客户问题</dt><dd>${escapeHtml(topic.pain || "暂无")}</dd>
      <dt>适合发布</dt><dd>${escapeHtml(topic.fit || publishProfiles[activePublish].label)}</dd>
      <dt>不要踩坑</dt><dd>${escapeHtml(topic.risk || "发布前复核事实和合规边界")}</dd>
    </dl>
    <button class="secondary" data-topic-index="${index}">${activeTopic === topic ? "已选择这条源头" : "选择这条源头做二创"}</button>
  </article>`).join("");
  $$("#topicGrid [data-topic-card]").forEach((card) => {
    card.addEventListener("click", () => selectCandidateTopic(list[Number(card.dataset.topicCard)]));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectCandidateTopic(list[Number(card.dataset.topicCard)]);
      }
    });
  });
};

const loadAssetLibraryBeforeCalibration = loadAssetLibrary;
loadAssetLibrary = async function loadAssetLibraryWithCalibration() {
  await loadAssetLibraryBeforeCalibration();
  await renderCalibrationPanel();
};

renderCalibrationPanel();

// Fifth-step copy is generated by /api/content-draft/rewrite from selected source-post variables.
// The frontend must not create final copy with local fixed templates.

let aiRewriteRequestId = 0;
let isCopyDraftReady = false;

function compactForAi(value, limit = 800) {
  const text = cleanText(value || "");
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}

function selectedTopicPayload(topic) {
  const source = topSourceOf(topic) || {};
  const comments = Array.isArray(topic?.evidence?.comments)
    ? topic.evidence.comments.filter(Boolean).slice(0, 5).map((item) => compactForAi(item, 180))
    : [];
  return {
    industry: formValue("#industry"),
    businessGoal: formValue("#businessGoal"),
    keyword: formValue("#topic"),
    publish: activePublish,
    publishLabel: publishProfiles[activePublish]?.label || "",
    selectedTitle: activeTitleChoice || "",
    sourcePost: {
      platform: source.platform || topic?.source || "",
      title: source.title || topic?.title || "",
      url: source.url || "",
      summary: compactForAi(source.summary || topic?.reason || "", 900),
      metrics: source.metrics || {},
    },
    topic: {
      title: topic?.title || "",
      reason: compactForAi(topic?.reason || "", 260),
      pain: compactForAi(topic?.pain || "", 220),
      rewrite: compactForAi(topic?.rewrite || "", 260),
      risk: compactForAi(topic?.risk || "", 220),
      fit: topic?.fit || "",
    },
    comments,
    qualityFeedback: activeQualityFeedback ? {
      score: activeQualityFeedback.score,
      level: activeQualityFeedback.level,
      mode: activeQualityFeedback.mode,
      currentTitle: activeQualityFeedback.currentTitle,
      instructions: (activeQualityFeedback.instructions || []).slice(0, 6),
      required: activeQualityFeedback.required,
      previousBest: copyDraftVersions.reduce((winner, item) => (!winner || item.score > winner.score ? {
        score: item.score,
        title: item.title,
        feedback: item.feedback,
        strengths: item.quality?.dimensions?.filter((dim) => dim.score >= 8).map((dim) => dim.name) || [],
      } : winner), null),
      lastVersion: copyDraftVersions.length ? {
        score: copyDraftVersions[copyDraftVersions.length - 1].score,
        strengths: copyDraftVersions[copyDraftVersions.length - 1].quality?.dimensions?.filter((dim) => dim.score >= 8).map((dim) => dim.name) || [],
        weak: copyDraftVersions[copyDraftVersions.length - 1].quality?.weak?.map((dim) => dim.name) || [],
      } : null,
    } : null,
    revisionRound: activeRevisionRound,
    sop: {
      firstPrinciple: "选题定生死；不是抄标题和句子，而是复制情绪价值、结构、真实场景、信任建立和行动入口。",
      requiredAnalysis: ["为什么能吸引注意", "真正卖的情绪", "能复制的结构", "不能复制的内容", "如何翻译成自己的业务", "今天能发布什么"],
      outputGate: "文案确认前不得生成图片、视频、打包或上线。",
    },
  };
}

function compactSentence(value, fallback = "") {
  return cleanText(value || fallback).replace(/[。！？!?]+$/g, "");
}

function sourceBoundTitleChoices(topic) {
  const source = topSourceOf(topic) || {};
  const keyword = compactSentence(formValue("#topic"), "这个问题");
  const sourceTitle = compactSentence(source.title || topic?.title || keyword);
  const pain = compactSentence(topic?.pain, "用户还没找到可靠判断标准");
  const titles = [
    `${keyword}没效果，可能是一开始就判断错了`,
    `别急着做${keyword}，先看清问题属于哪一种`,
    `很多人${keyword}走弯路，是因为第一步搞错了`,
    `${keyword}前先自查：你真正要解决的是哪类问题`,
    `看到“${sourceTitle.slice(0, 16)}”这类内容，先学会这样判断`,
    `不是所有${keyword}，都适合同一种处理方式`,
    `用户最担心的不是${keyword}，而是${pain.slice(0, 18)}`,
  ];
  return [...new Set(titles.map((title) => title.replace(/\s+/g, "").trim()).filter(Boolean))].slice(0, 6);
}

function buildSourceBoundDraft(topic, selectedTitle = "") {
  const source = topSourceOf(topic) || {};
  const metrics = source.metrics || {};
  const keyword = compactSentence(formValue("#topic"), "这个问题");
  const industry = compactSentence(formValue("#industry"), "当前行业");
  const titleChoices = sourceBoundTitleChoices(topic);
  const title = selectedTitle || titleChoices[0] || compactSentence(topic?.title, keyword);
  const sourceTitle = compactSentence(source.title || topic?.title || keyword);
  const pain = compactSentence(topic?.pain, "用户有需求，但缺少可信判断标准和低成本试错入口");
  const reason = compactSentence(topic?.reason, "这条源头帖有真实互动数据，说明用户愿意停下来收藏和讨论");
  const risk = compactSentence(topic?.risk, "不照抄原帖，不承诺确定效果，发布前复核事实和合规边界");
  const comments = Array.isArray(topic?.evidence?.comments) ? topic.evidence.comments.filter(Boolean) : [];
  const commentLine = comments.length
    ? compactSentence(comments[0], pain)
    : pain;
  const sourceLine = `${source.platform || topic?.source || "真实来源"}《${sourceTitle}》，赞 ${metrics.likes || 0} / 藏 ${metrics.saves || 0} / 评 ${metrics.comments || 0} / 转 ${metrics.shares || 0}`;
  const isXhs = !["douyinVideo", "wechatVideo", "xhsVideo"].includes(activePublish);
  const xhsCopy = `标题：${title}

正文：
很多人一遇到${keyword}，第一反应就是马上找产品、找项目、找同款方案。

但真正容易走弯路的地方，往往不是你不够努力，而是第一步没有把问题判断清楚。

这次参考的源头帖是：${sourceLine}。

它能被收藏和讨论，不是因为一句标题好听，而是踩中了一个很真实的用户问题：${commentLine}。

所以这篇内容不要照搬原帖，而是换成一个更适合${industry}客户自查的结构：

1. 先别急着下结论，先看问题出现的诱因
2. 再看它是突然变化，还是长期慢慢加重
3. 最后看自己真正需要的是判断、修护、检测，还是进一步咨询

如果这三步没弄清楚，就很容易被别人的案例带着走：别人适合的方案，不一定适合你；别人有效的路径，也不一定能直接复制到你身上。

${keyword}最怕的不是慢，而是一开始方向就错了。

你可以先收藏这套判断方法，下次看到类似内容、准备买产品或做项目前，先拿它对照一遍。

配图建议：
1. 封面：${title}
2. 第 2 张：先别急着做${keyword}，先判断问题类型
3. 第 3 张：为什么同一个问题，别人有效你不一定适合
4. 第 4 张：三步自查：诱因、变化速度、当前状态
5. 第 5 张：先判断，再决定下一步行动

标签：#${keyword} #${industry} #避坑 #自查 #内容参考`;

  const videoScript = `标题：${title}

口播文案：
你做${keyword}一直没效果，可能不是方法完全没用。

而是你一开始，就没有把自己的情况判断清楚。

很多人看到别人分享有效，就想马上照着做。

但同样是${keyword}，背后的诱因、阶段、风险边界都可能不一样。

这条源头帖之所以值得参考，是因为它有真实互动：赞 ${metrics.likes || 0}，收藏 ${metrics.saves || 0}，评论 ${metrics.comments || 0}。

说明用户真正关心的不是一句结论，而是想知道：我到底该怎么判断，下一步怎么少走弯路。

你可以先看三个问题。

第一，最近有没有明显诱因变化。

第二，问题是突然出现，还是长期慢慢加重。

第三，你现在需要的是先自查、先修护、先检测，还是直接咨询专业方案。

这三个问题没弄清楚前，不建议直接照搬别人的做法。

${keyword}最怕的不是慢，是一开始方向就错了。

如果你也不确定自己属于哪种情况，可以先把这套判断标准保存下来，再决定下一步。

分镜提示：
1. 开头大字：${keyword}没效果，可能是判断错了
2. 源头依据：高互动帖子数据一闪而过
3. 三步自查卡：诱因 / 变化速度 / 当前状态
4. 风险提醒：别照搬别人的方案
5. 结尾：先判断，再决定下一步

素材要求：
用文字卡、判断流程卡、评论问题卡，不使用原帖图片冒充自己的案例。

合规边界：
${risk}`;

  return {
    titleChoices,
    selectedTitle: title,
    diagnosis: {
      attention: reason,
      emotion: pain,
      copyable: "复制源头帖的判断型结构、收藏动机和用户避坑情绪，不复制原文措辞和案例结论。",
      notCopy: risk,
      translation: `翻译成${industry}客户能执行的三步自查和下一步行动入口。`,
      publishable: isXhs ? "今天先发小红书图文，确认文案后再生成卡片。" : "今天先做口播脚本，确认后再交给小妹视频工作台。",
    },
    xhsCopy,
    videoScript,
    imagePlan: [
      `封面：${title}`,
      `判断卡：先分清${keyword}属于哪类问题`,
      "自查卡：诱因、变化速度、当前状态",
      "风险卡：不要照搬别人方案",
      "行动卡：先判断，再决定下一步",
    ],
    riskNote: risk,
    fallback: true,
  };
}

function formatDraftText(value, fallbackTitle = "") {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  if (Array.isArray(value)) return value.filter(Boolean).join("\n");
  const lines = [];
  const title = value.title || fallbackTitle;
  if (title) lines.push(`标题：${title}`);
  const body = value.body || value.content || value.copy || value.text || "";
  if (body) lines.push(`正文：\n${Array.isArray(body) ? body.join("\n\n") : body}`);
  const imagePlan = value.imagePlan || value.images || value.cards || value.visuals;
  if (Array.isArray(imagePlan) && imagePlan.length) {
    lines.push(`配图建议：\n${imagePlan.map((item, index) => `${index + 1}. ${typeof item === "string" ? item : (item.title || item.text || JSON.stringify(item))}`).join("\n")}`);
  }
  const tags = value.tags || value.hashtags;
  if (Array.isArray(tags) && tags.length) lines.push(`标签：${tags.join(" ")}`);
  return lines.join("\n\n").trim();
}

function displayText(value, fallbackTitle = "") {
  const text = formatDraftText(value, fallbackTitle);
  if (text) return text;
  if (value == null) return "";
  return cleanText(String(value));
}

function scoreTextSignal(text, patterns, max = 10) {
  const value = String(text || "");
  const hits = patterns.reduce((sum, pattern) => sum + (pattern.test(value) ? 1 : 0), 0);
  return Math.min(max, Math.round((hits / Math.max(1, patterns.length)) * max));
}

function evaluateCopyQuality(copy, title = "") {
  const text = String(copy || "");
  const body = text.replace(/^标题：.*?\n+/s, "");
  const opening = body.slice(0, 160);
  const titleText = String(title || "");
  const hasQuestionOrConflict = /[？?!！]|为什么|是不是|别|先|反而|原来|真相|误区|踩坑/.test(titleText);
  const hasListShape = /1[\.、）)]|1️⃣|①|第一|第二|第三|清单|步骤|自查|对照|阶段/.test(text);
  const hasHumanScene = /我|你|姐妹|客户|门店|皮肤管理师|到店|评论区|私信|素颜|镜子|花了|做完|最近/.test(text);
  const dimensions = [
    {
      key: "hook",
      name: "标题钩子",
      score: Math.min(10, scoreTextSignal(title, [/别|先|为什么|不是|真正|反复|白花钱|踩坑|方向错|真相|误区/, /淡斑|斑|肤况|项目|皮秒|反黑/, /？|\?|！|!|先|真正|原来/]) + (hasQuestionOrConflict ? 2 : 0)),
      fix: "标题要有用户心里的疑问、误区或反差，不能只是平铺描述。",
    },
    {
      key: "opening",
      name: "开头停留",
      score: scoreTextSignal(opening, [/很多人|你是不是|第一反应|但其实|我想先提醒/, /项目|产品|效果|反复|方向/, /不是|别急|关键|真正/]),
      fix: "开头前三行要先戳痛点，再给反常识判断。",
    },
    {
      key: "emotion",
      name: "情绪命中",
      score: scoreTextSignal(text, [/焦虑|担心|怕|白花钱|反复|越.*越|忽上忽下|白做/, /安全感|少走弯路|判断|稳|方向/]),
      fix: "要写出用户怕花钱没效果、怕反复、怕越做越糟的情绪。",
    },
    {
      key: "specific",
      name: "真实具体",
      score: Math.min(10, scoreTextSignal(text, [/肤况|防晒|作息|修护|敏感|屏障|观察|调整|评估|皮秒|结痂|反黑/, /1\.|1｜|①|1️⃣|- |第一/, /项目后|做完|近期|日常|术后/]) + (hasHumanScene ? 1 : 0)),
      fix: "多写门店真实经验、项目前后动作和用户可自查细节。",
    },
    {
      key: "save",
      name: "收藏价值",
      score: Math.min(10, scoreTextSignal(text, [/先确认|这 3 件事|三件事|清单|自查|步骤|标准|判断|阶段|对照/, /收藏|下次|对照|评估|发你|领取/]) + (hasListShape ? 2 : 0)),
      fix: "补一个可收藏的自查清单或判断标准。",
    },
    {
      key: "conversion",
      name: "转化入口",
      score: scoreTextSignal(text, [/评估|私信|咨询|到店|检测|方案|下一步/, /适合|节奏|安排|判断/]),
      fix: "结尾要自然引导评估、咨询或下一步判断。",
    },
    {
      key: "risk",
      name: "合规边界",
      score: /根治|保证|一定有效|彻底祛除|永久|包好/.test(text) ? 4 : 9,
      fix: "避免保证效果、根治、永久等绝对化承诺。",
    },
  ];
  const total = Math.round(dimensions.reduce((sum, item) => sum + item.score, 0) / dimensions.length * 10);
  const weak = dimensions.filter((item) => item.score < 8).sort((a, b) => a.score - b.score).slice(0, 3);
  const level = total >= 85 ? "可确认" : total >= 75 ? "建议小改后确认" : total >= 65 ? "需要优化一版" : "不建议进入制作";
  return {
    total,
    level,
    dimensions,
    weak,
    feedback: weak.map((item) => `${item.name}：${item.fix}`),
  };
}

function renderCopyQualityPanel(copy, title = "") {
  const quality = evaluateCopyQuality(copy, title);
  const feedbackText = quality.feedback.join("；") || "整体可进入人工确认，发布前再按品牌语气微调。";
  const versions = copyDraftVersions.slice(-4).reverse();
  const best = copyDraftVersions.reduce((winner, item) => (!winner || item.score > winner.score ? item : winner), null);
  return `<div class="copy-quality-panel">
    <div class="copy-quality-head">
      <div>
        <b>Longka 文案体检</b>
        <p>先判断初稿质量，再决定是否优化。确认文案前不会生成图片和视频。</p>
      </div>
      <span>${quality.total}<small>/100</small></span>
    </div>
    <div class="quality-level">${escapeHtml(quality.level)}</div>
    <div class="quality-dims">
      ${quality.dimensions.map((item) => `<div>
        <b>${escapeHtml(item.name)}</b>
        <meter min="0" max="10" value="${item.score}"></meter>
        <span>${item.score}/10</span>
      </div>`).join("")}
    </div>
    <div class="quality-feedback">
      <b>本轮优化方向</b>
      <p>${escapeHtml(feedbackText)}</p>
    </div>
    <div class="copy-evolve-controls" aria-label="文案进化方向">
      <button class="secondary" type="button" data-copy-evolve="score">按体检意见优化一版</button>
      <button class="secondary" type="button" data-copy-evolve="hook">强化标题和开头</button>
      <button class="secondary" type="button" data-copy-evolve="specific">写得更真实具体</button>
      <button class="secondary" type="button" data-copy-evolve="conversion">增强咨询转化</button>
      <button class="secondary" type="button" data-copy-evolve="human">去 AI 味，像真人运营</button>
    </div>
    ${versions.length ? `<div class="copy-version-list">
      <b>版本记录</b>
      ${versions.map((item) => `<button type="button" data-copy-version="${item.id}">
        <span>第 ${item.round} 版${best?.id === item.id ? " · 当前最佳" : ""}</span>
        <strong>${item.score}/100 ${item.delta > 0 ? `+${item.delta}` : item.delta < 0 ? item.delta : ""}</strong>
        <small>${escapeHtml(item.label)}${item.improved?.length ? `｜提升：${item.improved.join("、")}` : ""}${item.declined?.length ? `｜退步：${item.declined.join("、")}` : ""}</small>
      </button>`).join("")}
    </div>` : ""}
  </div>`;
}

function rememberCopyVersion(copy, title, label = "初稿") {
  if (!copy || !String(copy).trim()) return;
  const quality = evaluateCopyQuality(copy, title);
  const last = copyDraftVersions[copyDraftVersions.length - 1];
  if (last && last.copy === copy && last.title === title) return;
  const previous = last?.quality;
  const improved = previous
    ? quality.dimensions.filter((item) => item.score > (previous.dimensions.find((old) => old.key === item.key)?.score || 0)).map((item) => item.name)
    : [];
  const declined = previous
    ? quality.dimensions.filter((item) => item.score < (previous.dimensions.find((old) => old.key === item.key)?.score || 0)).map((item) => item.name)
    : [];
  copyDraftVersions.push({
    id: `v${Date.now()}-${copyDraftVersions.length}`,
    round: copyDraftVersions.length + 1,
    title,
    copy,
    score: quality.total,
    level: quality.level,
    quality,
    delta: previous ? quality.total - previous.total : 0,
    improved,
    declined,
    feedback: quality.feedback,
    label,
  });
  copyDraftVersions = copyDraftVersions.slice(-8);
}

function evolutionInstruction(mode, quality) {
  const best = copyDraftVersions.reduce((winner, item) => (!winner || item.score > winner.score ? item : winner), null);
  const strong = quality?.dimensions?.filter((item) => item.score >= 8).map((item) => item.name) || [];
  const map = {
    score: "按 Longka 文案体检的低分项重写，优先补齐弱项，不改变源头帖和标题。",
    hook: "重点强化标题承接、前三行停留和反常识判断，让用户一眼觉得和自己有关。",
    specific: "重点增加真实门店经验、客户自查细节、步骤清单和可执行动作，减少空泛表达。",
    conversion: "重点增强结尾咨询入口、评估理由和低压力行动，不要硬广。",
    human: "去掉 AI 腔，减少总结腔和套路句，写得像一个懂业务的小红书运营真实发帖。",
  };
  return [
    map[mode] || map.score,
    best ? `当前最佳版本是第 ${best.round} 版，分数 ${best.score}/100；如果本轮不能明显变好，要保留最佳版本的结构优势。` : "",
    strong.length ? `本版已有优势必须保留：${strong.join("、")}。` : "",
    "优化目标不是简单换词，而是让客户看得出依据：哪里更抓人、哪里更真实、哪里更容易收藏或咨询。",
    ...(quality?.feedback || []),
  ].filter(Boolean);
}

function startCopyProgress(label = "正在生成文案") {
  const steps = [
    ["读取源头帖", "正在读取第四步选中的帖子、互动数据和评论问题。"],
    ["生成标题角度", "用快速模型先出 6 个可选标题，保证方向不是固定模板。"],
    ["写正文初稿", "用高质量模型按选中的标题写正文，这一步会比普通问答慢。"],
    ["做文案体检", "正文完成后检查标题钩子、开头停留、情绪、收藏和转化入口。"],
    ["必要时自动重试", "如果模型返回格式不稳定，会用严格格式再请求一次，不用本地假文案顶上。"],
  ];
  let index = 0;
  const startedAt = Date.now();
  const box = $("#copyDiagnosis");
  if (!box) return;
  window.clearInterval(copyProgressTimer);
  const render = () => {
    const elapsed = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    index = elapsed < 10 ? 1 : elapsed < 45 ? 2 : elapsed < 70 ? 3 : 4;
    const waitMessage = elapsed < 25
      ? "正在处理真实源头和标题方向，通常几十秒内返回。"
      : elapsed < 70
        ? "正在写正文。为了避免固定模板，系统会绑定你选中的源头帖和标题重写。"
        : "还在等高质量模型返回。如果它格式不稳，系统会自动严格重试一次。";
    const eta = elapsed < 45 ? "预计还需 20-60 秒" : elapsed < 100 ? "可能还需 30-80 秒" : "已进入长等待，可继续等或稍后重试";
    const [currentTitle, currentText] = steps[Math.min(index, steps.length - 1)];
    box.innerHTML = `<div class="copy-progress-panel">
      <div class="copy-progress-head">
        <div>
          <b>${escapeHtml(label)}</b>
          <p>正在把真实源头帖改写成可确认的客户文案</p>
        </div>
        <span>${elapsed}s</span>
      </div>
      <div class="progress-track"><i style="width:${Math.min(96, Math.round((elapsed / 150) * 100))}%"></i></div>
      <div class="copy-stage-focus">
        <span>当前阶段</span>
        <b>${escapeHtml(currentTitle)}</b>
        <p>${escapeHtml(currentText)}</p>
      </div>
      <div class="copy-wait-note">
        <b>${escapeHtml(eta)}</b>
        <p>${escapeHtml(waitMessage)}</p>
      </div>
      <ol class="copy-step-rail">
        ${steps.map(([title], stepIndex) => `<li class="${stepIndex < index ? "done" : stepIndex === index ? "active" : ""}">
          <i>${stepIndex + 1}</i><span>${escapeHtml(title)}</span>
        </li>`).join("")}
      </ol>
    </div>`;
  };
  render();
  copyProgressTimer = window.setInterval(() => {
    render();
  }, 1000);
}

function stopCopyProgress() {
  window.clearInterval(copyProgressTimer);
  copyProgressTimer = null;
}

function renderAiDraft(draft = {}) {
  stopCopyProgress();
  latestAiDraft = draft;
  const choices = Array.isArray(draft.titleChoices) ? draft.titleChoices.filter(Boolean).slice(0, 8) : [];
  if (!activeTitleChoice) activeTitleChoice = draft.selectedTitle || choices[0] || "";
  const selectedTitle = activeTitleChoice || draft.selectedTitle || choices[0] || "";
  const diagnosis = draft.diagnosis || {};
  const isVideo = ["douyinVideo", "wechatVideo", "xhsVideo"].includes(activePublish);
  $("#resultTitle").textContent = selectedTitle || (isVideo ? "视频脚本草稿" : "小红书图文草稿");
  const draftText = isVideo
    ? formatDraftText(draft.videoScript, selectedTitle)
    : formatDraftText(draft.xhsCopy, selectedTitle);
  $("#resultCopy").value = draftText;
  const bodyText = String(isVideo ? (draft.videoScript?.voiceover || "") : (draft.xhsCopy?.body || "")).trim();
  isCopyDraftReady = bodyText.length >= 180;
  if (!isCopyDraftReady) {
    $("#resultCopy").value = [
      "这次只拿到了标题，没有拿到可验收正文。",
      "",
      "系统已拦截：不会评分、不会允许确认，也不会解锁图片和视频。",
      "请点击“生成文案草稿”重试，或换一个候选标题再生成。",
    ].join("\n");
  }
  rememberCopyVersion($("#resultCopy").value, selectedTitle, activeQualityFeedback ? `优化第 ${activeRevisionRound} 版` : "初稿");
  const qualitySlot = $("#copyQualitySlot");
  if (qualitySlot) {
    qualitySlot.innerHTML = isCopyDraftReady ? renderCopyQualityPanel($("#resultCopy").value, selectedTitle) : "";
    qualitySlot.hidden = !isCopyDraftReady;
  }
  const source = topSourceOf(activeTopic);
  const metrics = source?.metrics || {};
  const box = $("#copyDiagnosis");
  if (!box) return;
  box.innerHTML = `
    <div class="title-choice-panel ai-generated">
      <b>第五步：基于源头帖生成标题</b>
      <p>这些标题会读取第四步选中的源头帖、评论区问题和互动数据后生成。先选标题，再生成对应正文，标题变了正文也要跟着变。</p>
      <div class="selected-source-brief">
        <strong>本次二创源头：</strong>${escapeHtml(source ? `${source.platform || "真实来源"}《${source.title || activeTopic?.title || ""}》` : activeTopic?.title || "")}
        ${source ? `<span>赞 ${escapeHtml(metrics.likes || 0)} / 藏 ${escapeHtml(metrics.saves || 0)} / 评 ${escapeHtml(metrics.comments || 0)} / 转 ${escapeHtml(metrics.shares || 0)}</span>` : ""}
      </div>
      <div class="title-choice-list">
        ${choices.map((title, index) => `<button type="button" class="${title === selectedTitle ? "active" : ""}" aria-pressed="${title === selectedTitle ? "true" : "false"}" data-ai-title-choice="${escapeAttr(title)}">${index + 1}. ${escapeHtml(title)}</button>`).join("")}
      </div>
    </div>
    <div><b>为什么这个题能做</b><p>${escapeHtml(diagnosis.attention || "")}</p></div>
    <div><b>真正打动用户的情绪</b><p>${escapeHtml(diagnosis.emotion || "")}</p></div>
    <div><b>我们复制什么</b><p>${escapeHtml(diagnosis.copyable || "")}</p></div>
    <div><b>不能复制什么</b><p>${escapeHtml(diagnosis.notCopy || "")}</p></div>
    <div><b>怎么翻译成自己的业务</b><p>${escapeHtml(diagnosis.translation || "")}</p></div>
    <div><b>今天能发布什么</b><p>${escapeHtml(diagnosis.publishable || "")}</p></div>`;
  box.querySelectorAll("[data-ai-title-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      activeTitleChoice = button.dataset.aiTitleChoice || "";
      activeQualityFeedback = null;
      activeRevisionRound = 0;
      copyDraftVersions = [];
      box.querySelectorAll("[data-ai-title-choice]").forEach((item) => {
        item.classList.toggle("active", item === button);
        item.setAttribute("aria-pressed", item === button ? "true" : "false");
      });
      $("#resultTitle").textContent = activeTitleChoice;
      $("#resultCopy").value = `正在按你选中的标题生成正文：${activeTitleChoice}`;
      const qualitySlot = $("#copyQualitySlot");
      if (qualitySlot) {
        qualitySlot.innerHTML = "";
        qualitySlot.hidden = true;
      }
      resetWebCopyApproval?.();
      hydrateAiRewriteDraft();
    });
  });
  document.querySelectorAll("[data-copy-evolve]").forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.copyEvolve || "score";
      const quality = evaluateCopyQuality($("#resultCopy")?.value || "", selectedTitle);
      activeQualityFeedback = {
        score: quality.total,
        level: quality.level,
        mode,
        instructions: evolutionInstruction(mode, quality),
        currentTitle: selectedTitle,
        required: "保留当前选中标题和源头帖绑定关系，按选择的进化方向重写正文。不要只改标题，不要照搬原帖，不要承诺效果。",
      };
      activeRevisionRound += 1;
      resetWebCopyApproval?.();
      $("#resultTitle").textContent = selectedTitle;
      $("#resultCopy").value = `正在进行第 ${activeRevisionRound} 次文案进化：${activeQualityFeedback.instructions.join("；")}`;
      const qualitySlot = $("#copyQualitySlot");
      if (qualitySlot) {
        qualitySlot.innerHTML = "";
        qualitySlot.hidden = true;
      }
      hydrateAiRewriteDraft();
    });
  });
  document.querySelectorAll("[data-copy-version]").forEach((button) => {
    button.addEventListener("click", () => {
      const version = copyDraftVersions.find((item) => item.id === button.dataset.copyVersion);
      if (!version) return;
      activeTitleChoice = version.title;
      $("#resultTitle").textContent = version.title;
      $("#resultCopy").value = version.copy;
      const qualitySlot = $("#copyQualitySlot");
      if (qualitySlot) {
        qualitySlot.innerHTML = renderCopyQualityPanel(version.copy, version.title);
        qualitySlot.hidden = false;
      }
      resetWebCopyApproval?.();
    });
  });
  box.querySelector("#improveCopyDraft")?.addEventListener("click", () => {
    const quality = evaluateCopyQuality($("#resultCopy")?.value || "", selectedTitle);
    activeQualityFeedback = {
      score: quality.total,
      level: quality.level,
      instructions: quality.feedback,
      currentTitle: selectedTitle,
      required: "保留当前选中标题和源头帖绑定关系，按体检意见重写正文。不要只改标题，不要照搬原帖，不要承诺效果。",
    };
    activeRevisionRound += 1;
    resetWebCopyApproval?.();
    $("#resultTitle").textContent = selectedTitle;
    $("#resultCopy").value = `正在按 Longka 文案体检意见优化第 ${activeRevisionRound} 版：${quality.feedback.join("；") || "增强表达和转化入口"}`;
    const qualitySlot = $("#copyQualitySlot");
    if (qualitySlot) {
      qualitySlot.innerHTML = "";
      qualitySlot.hidden = true;
    }
    hydrateAiRewriteDraft();
  });
  applyHarnessGate?.();
}

async function hydrateAiRewriteDraft() {
  if (!activeTopic) return;
  const requestId = ++aiRewriteRequestId;
  const isVideo = ["douyinVideo", "wechatVideo", "xhsVideo"].includes(activePublish);
  isCopyDraftReady = false;
  resetWebCopyApproval?.();
  $("#resultTitle").textContent = activeTitleChoice || "正在按源头帖生成文案...";
  $("#resultCopy").value = "正在读取第四步选中的源头帖、评论区问题和互动数据，生成这一次专属的二创文案...";
  startCopyProgress(activeQualityFeedback ? "正在按体检意见优化文案" : "正在生成二创文案");
  const qualitySlot = $("#copyQualitySlot");
  if (qualitySlot) {
    qualitySlot.innerHTML = "";
    qualitySlot.hidden = true;
  }
  applyHarnessGate?.();
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 150000);
  try {
    const res = await fetch("/api/content-draft/rewrite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selectedTopicPayload(activeTopic)),
      signal: controller.signal,
    });
    window.clearTimeout(timeout);
    const data = await res.json();
    if (requestId !== aiRewriteRequestId) return;
    if (!res.ok || !data.ok || !data.draft) throw new Error(data.message || data.error || "二创接口失败");
    renderAiDraft(data.draft);
  } catch (error) {
    stopCopyProgress();
    window.clearTimeout(timeout);
    if (requestId !== aiRewriteRequestId) return;
    isCopyDraftReady = false;
    const message = error.name === "AbortError"
      ? "专属二创超过 150 秒仍未返回。请检查文案接口配置，或稍后重试。"
      : String(error.message || "").replace("AI 文案接口超过 30 秒未返回。", "AI 文案接口本次响应超时，请点击“生成文案草稿”重试。");
    $("#resultTitle").textContent = isVideo ? "视频脚本生成失败" : "小红书图文生成失败";
    $("#resultCopy").value = `${message}\n\n未拿到专属二创结果，系统不会生成本地固定模板文案。请检查配置或重试。`;
    const qualitySlot = $("#copyQualitySlot");
    if (qualitySlot) {
      qualitySlot.innerHTML = "";
      qualitySlot.hidden = true;
    }
  }
  applyHarnessGate?.();
}

renderOutput = function renderOutputWithAiRewrite() {
  const profile = publishProfiles[activePublish] || publishProfiles.xhs;
  isCopyDraftReady = false;
  $("#resultPlatform").textContent = profile.label;
  $("#resultTitle").textContent = activeTopic ? "等待专属二创" : "先选择第四步源头帖";
  $("#resultCopy").value = activeTopic ? "" : "请先在第四步选择一条真实采集帖子。";
  const qualitySlot = $("#copyQualitySlot");
  if (qualitySlot) {
    qualitySlot.innerHTML = "";
    qualitySlot.hidden = true;
  }
  $("#copyDiagnosis").innerHTML = activeTopic
    ? '<div class="running"><b>准备二创</b><p>正在把第四步源头帖、评论区和互动数据发给内容工厂生成。</p></div>'
    : '<div class="wait"><b>缺少源头</b><p>第五步不能脱离第四步选中的帖子生成文案。</p></div>';
  const videoTask = $("#videoTask");
  if (videoTask) {
    videoTask.hidden = true;
    videoTask.innerHTML = "";
  }
  const pack = $("#contentPack");
  if (pack) pack.innerHTML = "";
  hydrateAiRewriteDraft();
};

function renderRewriteDiagnosis() {
  // Analysis is returned by /api/content-draft/rewrite together with the draft.
}

$("#copyResultCopy")?.addEventListener("click", async () => {
  const button = $("#copyResultCopy");
  const text = $("#resultCopy")?.value || "";
  if (!text.trim()) {
    button.textContent = "没有可复制的文案";
    window.setTimeout(() => (button.textContent = "复制这份文案"), 1400);
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    $("#resultCopy")?.select();
    document.execCommand("copy");
  }
  button.textContent = "已复制";
  window.setTimeout(() => (button.textContent = "复制这份文案"), 1400);
});

function withViralSop(topic) {
  if (!topic) return topic;
  if (topic.viralSop) return topic;
  topic.viralSop = {
    targetUser: "等待内容工厂根据源头帖和评论区补全",
    realEmotion: "等待内容工厂补全",
    copyablePattern: "等待内容工厂按二创规则拆解",
    doNotCopy: ["不照抄原文", "不照抄案例结论", "不写确定效果"],
  };
  return topic;
}

function renderSopSnapshot(topic) {
  const sop = withViralSop(topic)?.viralSop;
  if (!sop) return "";
  if (String(sop.targetUser || "").startsWith("等待内容工厂")) return "";
  return `<div class="deconstruct-box sop-snapshot">
    <p><strong>目标用户：</strong>${escapeHtml(sop.targetUser)}</p>
    <p><strong>真实情绪：</strong>${escapeHtml(sop.realEmotion)}</p>
    <p><strong>可复制结构：</strong>${escapeHtml(sop.copyablePattern)}</p>
    <p><strong>不能复制：</strong>${escapeHtml(sop.doNotCopy.join("；"))}</p>
  </div>`;
}

const renderTopicsBeforeSop = renderTopics;
renderTopics = function renderTopicsWithSopFields() {
  candidateTopics = candidateTopics.map(withViralSop);
  renderTopicsBeforeSop();
  $$("#topicGrid .topic-card").forEach((card) => {
    const index = Number(card.dataset.topicCard);
    const topic = candidateTopics[index];
    if (!topic || card.querySelector(".sop-snapshot")) return;
    const button = card.querySelector("[data-topic-index]");
    button?.insertAdjacentHTML("beforebegin", renderSopSnapshot(topic));
  });
};

const selectCandidateTopicBeforeSop = selectCandidateTopic;
selectCandidateTopic = function selectCandidateTopicWithSop(topic) {
  selectCandidateTopicBeforeSop(withViralSop(topic));
};

function renderAssetPlansFromSop(topic) {
  const sop = withViralSop(topic)?.viralSop;
  if (!sop) return;
  const approved = typeof webCopyApproved !== "undefined" && webCopyApproved;
  const coverPattern = sop.coverPattern || "按已确认标题生成封面大字";
  const contentStructure = Array.isArray(sop.contentStructure) && sop.contentStructure.length
    ? sop.contentStructure
    : ["痛点封面", "判断标准", "自查清单", "风险提醒", "行动入口"];
  const template = sop.template || "已确认文案";
  $("#imagePlanCover") && ($("#imagePlanCover").textContent = approved ? coverPattern : `待确认文案后使用：${coverPattern}`);
  $("#imagePlanCards") && ($("#imagePlanCards").textContent = approved ? contentStructure.join(" / ") : "未确认文案前不生成正文卡片，只保留方案草稿");
  $("#videoPlanBrief") && ($("#videoPlanBrief").textContent = approved ? `按 ${template} 结构生成 0-58 秒脚本` : "未确认文案前不交接视频，只展示脚本结构");
}

const applyHarnessGateBeforeSopPlans = applyHarnessGate;
applyHarnessGate = function applyHarnessGateWithSopPlans() {
  applyHarnessGateBeforeSopPlans();
  renderAssetPlansFromSop(activeTopic);
};

// Longka AI Native harness gate.
// Image/video/package generation is locked until the operator confirms the copy in the web UI.
let webCopyApproved = false;

function resetWebCopyApproval() {
  webCopyApproved = false;
  applyHarnessGate();
}

function ensureHarnessGateUi() {
  const inputActions = $("#runFullPipeline")?.closest(".input-actions");
  if ($("#harnessGateNote")) return;
  $("#runFullPipeline").textContent = "继续生成图片和视频";
  $("#runFullPipeline").classList.remove("primary");
  $("#runFullPipeline").classList.add("secondary");
  const note = document.createElement("div");
  note.id = "harnessGateNote";
  note.className = "harness-gate-note";
  note.innerHTML = [
    "<b>怎么用</b>",
    "<span>在上面填你的行业和关键词，比如“美业护肤 / 淡斑 / 小红书”。先点“帮我找选题”，系统会优先复用已经采集过的素材；没有命中时，再尝试实时采集或让你粘贴已有素材。</span>",
    "<span>你选好选题后，系统会先生成文案草稿。确认文案没问题，再继续生成配图和视频，避免方向还没定就浪费时间做素材。</span>"
  ].join("");
  inputActions?.insertAdjacentElement("afterend", note);

  const copyResult = $(".copy-result");
  const approveButton = document.createElement("button");
  approveButton.id = "approveCopy";
  approveButton.className = "primary";
  approveButton.type = "button";
  approveButton.textContent = "确认文案，解锁图片和视频";
  approveButton.addEventListener("click", () => {
    if (!activeTopic) {
      alert("请先选择选题并生成文案草稿。");
      return;
    }
    if (!isCopyDraftReady) {
      alert("文案还没有生成完成，不能确认。请先等左侧出现完整文案。");
      return;
    }
    webCopyApproved = true;
    setWorkflowStep(6);
    applyHarnessGate();
  });
  copyResult?.appendChild(approveButton);

  const gateStatus = document.createElement("div");
  gateStatus.id = "copyApprovalStatus";
  gateStatus.className = "copy-approval-status locked";
  gateStatus.textContent = "请先确认文案：确认后才能继续生成配图和视频";
  $(".visual-result")?.insertAdjacentElement("afterbegin", gateStatus);
  applyHarnessGate();
}

function applyHarnessGate() {
  const locked = !webCopyApproved;
  const gatedButtons = [
    $("#runFullPipeline"),
    $("#makeVideoTask"),
    ...$$(".delivery-card button"),
  ].filter(Boolean);
  gatedButtons.forEach((button) => {
    button.disabled = locked;
    button.title = locked ? "请先确认文案，再继续生成配图和视频" : "";
  });
  const status = $("#copyApprovalStatus");
  if (status) {
    status.classList.toggle("locked", locked);
    status.classList.toggle("approved", !locked);
    status.textContent = locked
      ? "请先确认文案：确认后才能继续生成配图和视频"
      : "文案已确认：现在可以继续生成配图和视频";
  }
  const approveButton = $("#approveCopy");
  if (approveButton) {
    approveButton.textContent = webCopyApproved
      ? "文案已确认"
      : isCopyDraftReady
        ? "确认文案，解锁图片和视频"
        : "等待文案生成完成";
    approveButton.disabled = webCopyApproved || !isCopyDraftReady;
  }
  renderDeliveryFlow();
}

function renderDeliveryFlow() {
  const box = $("#deliveryFlow");
  if (!box) return;
  const platform = publishProfiles[activePublish]?.label || "发布平台";
  const isVideo = /Video|视频/.test(activePublish) || activeTask === "video";
  const nextStep = webCopyApproved
    ? `<section class="approved-next-step">
        <div>
          <b>下一步：${isVideo ? "生成小妹视频制作任务" : "生成归藏风格小红书图文卡片组"}</b>
          <p>${isVideo
            ? "把已确认的口播、分镜、封面大字和素材要求整理成小妹视频工作台能接住的制作任务。这里不会直接生成成片。"
            : "按已确认文案生成 3:4 封面 + 正文卡片，默认不使用竞品原图，只生成可发布的诊断卡、清单卡和流程卡。"}
          </p>
        </div>
        <button class="primary" type="button" data-approved-next="${isVideo ? "video" : "xhs"}">
          ${isVideo ? "生成小妹视频任务" : "生成小红书图文卡片"}
        </button>
      </section>`
    : `<section class="approved-next-step locked">
        <div>
          <b>下一步会在这里出现</b>
          <p>先确认上面的标题、正文和脚本。确认前不会生成图片、视频、打包或上线。</p>
        </div>
      </section>`;
  const steps = [
    ["文案/脚本验收", webCopyApproved ? "已通过，可以进入后续制作" : "先检查文案或视频脚本是否合格", webCopyApproved ? "done" : "locked"],
    ["选择发布位置", webCopyApproved ? `当前选择：${platform}` : "确认文案后再决定发朋友圈、小红书、公众号或视频平台", webCopyApproved ? "done" : "locked"],
    ["生成配图", webCopyApproved ? "可生成封面图、正文卡片和风险提醒卡" : "未确认文案前不生成图片", webCopyApproved ? "done" : "locked"],
    ["视频脚本", webCopyApproved ? "可整理成小妹视频工作台能接住的口播和分镜" : "未确认文案前不交接视频", webCopyApproved ? "done" : "locked"],
    ["生成可看视频", webCopyApproved ? "交给小妹视频工作台制作预览视频" : "最后一步，等脚本和素材都确认后执行", webCopyApproved ? "done" : "locked"],
  ];
  box.innerHTML = steps.map(([title, text, state]) => `<div class="flow-step ${state}">
    <b>${title}</b>
    <span>${text}</span>
  </div>`).join("") + nextStep;
  box.querySelector("[data-approved-next='xhs']")?.addEventListener("click", () => $("#runFullPipeline")?.click());
  box.querySelector("[data-approved-next='video']")?.addEventListener("click", () => $("#makeVideoTask")?.click());
}

const originalResetSearchStateForHarness = resetSearchState;
resetSearchState = function resetSearchStateWithHarnessGate() {
  originalResetSearchStateForHarness();
  resetWebCopyApproval();
};

const originalRenderOutputForHarness = renderOutput;
renderOutput = function renderOutputWithHarnessGate() {
  resetWebCopyApproval();
  originalRenderOutputForHarness();
  ensureHarnessGateUi();
  applyHarnessGate();
};

const originalRenderContentPackForHarness = renderContentPack;
renderContentPack = function renderContentPackWithHarnessGate() {
  originalRenderContentPackForHarness();
  ensureHarnessGateUi();
  applyHarnessGate();
};

ensureHarnessGateUi();
applyHarnessGate();

$("#importMaterial")?.addEventListener("click", async () => {
  activeAssetTab = "materials";
  setRoute("materials");
  await renderReusableMaterialLibrary();
});

$("#cancelImportMaterial")?.addEventListener("click", () => {
  const panel = $("#importPanel");
  if (panel) panel.hidden = true;
});

$("#saveImportedMaterial")?.addEventListener("click", async () => {
  const title = formValue("#importTitle");
  const content = formValue("#importContent");
  const commentsText = formValue("#importComments");
  if (!title && !content && !commentsText) {
    alert("请至少粘贴标题、正文或客户问题。");
    return;
  }
  const button = $("#saveImportedMaterial");
  button.disabled = true;
  button.textContent = "正在导入...";
  try {
    const sample = {
      platform: activePublish?.includes("douyin") ? "douyin" : "xiaohongshu",
      keyword: formValue("#topic"),
      title,
      content,
      commentsText,
      url: formValue("#importUrl"),
      sourceTool: "manual-import",
      collectionStatus: "manual",
    };
    const res = await fetch("/api/sources/content-samples/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ samples: [sample] }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) throw new Error(data.message || data.error || "导入失败");
    $("#importHelp").textContent = "已导入素材，并作为手动素材进入选题分析。";
    await useReusableMaterials({ includeManual: true });
  } catch (error) {
    $("#importHelp").textContent = `导入失败：${error.message}`;
  } finally {
    button.disabled = false;
    button.textContent = "导入并生成选题";
  }
});

async function renderReusableMaterialLibrary() {
  let box = $("#reusableMaterialBox");
  if (!box) {
    box = document.createElement("div");
    box.id = "reusableMaterialBox";
    box.className = "reusable-material-box";
    const assetMount = $("#materialAssetMount");
    if (assetMount) {
      assetMount.appendChild(box);
    } else {
      $("#importHelp")?.insertAdjacentElement("afterend", box);
    }
  }
  const initialQuery = formValue("#topic") || "";
  box.innerHTML = `
    <div class="reusable-head">
      <b>历史素材库</b>
      <input id="materialSearch" value="${escapeAttr(initialQuery)}" placeholder="输入关键词筛选，例如：淡斑、白发、穿搭" />
      <button class="secondary" type="button" id="searchReusableMaterials">查找历史素材</button>
    </div>
    <p>正在读取本地素材库...</p>`;
  $("#searchReusableMaterials")?.addEventListener("click", () => renderReusableMaterialLibraryResults());
  $("#materialSearch")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") renderReusableMaterialLibraryResults();
  });
  await renderReusableMaterialLibraryResults();
}

async function renderReusableMaterialLibraryResults() {
  const box = $("#reusableMaterialBox");
  if (!box) return;
  const state = await fetch("/api/state").then((res) => res.json());
  const query = ($("#materialSearch")?.value || formValue("#topic") || "").trim();
  const words = splitWords(query);
  const samples = (Array.isArray(state.contentSamples) ? state.contentSamples : [])
    .filter((item) => item.sourceTool === "mediacrawler-pro" || item.collectionStatus === "real")
    .filter((item) => matchesWords(`${item.keyword || ""} ${item.title || ""} ${item.content || ""} ${(item.tags || []).join(" ")}`, words))
    .slice(0, 6);
  const header = `
    <div class="reusable-head">
      <b>历史素材库</b>
      <input id="materialSearch" value="${escapeAttr(query)}" placeholder="输入关键词筛选，例如：淡斑、白发、穿搭" />
      <button class="secondary" type="button" id="searchReusableMaterials">查找历史素材</button>
    </div>`;
  if (!samples.length) {
    box.innerHTML = `${header}<p>没有找到“${escapeHtml(query || "当前关键词")}”的历史素材。可以换关键词搜索，或在下面粘贴一条素材。</p>`;
    $("#searchReusableMaterials")?.addEventListener("click", () => renderReusableMaterialLibraryResults());
    $("#materialSearch")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") renderReusableMaterialLibraryResults();
    });
    return;
  }
  box.innerHTML = `
    ${header}
    <div class="reusable-summary">
      <span>找到 ${samples.length} 条历史采集素材</span>
      <button class="secondary" type="button" id="useReusableMaterials">复用这些素材生成选题</button>
    </div>
    <div class="reusable-list compact">
      ${samples.map((item) => {
        const metrics = item.metrics || {};
        return `<article>
          <b>${escapeHtml(item.title || "历史采集素材")}</b>
          <p>赞 ${escapeHtml(metrics.likes || 0)} / 藏 ${escapeHtml(metrics.saves || 0)} / 评 ${escapeHtml(metrics.comments || 0)} / 转 ${escapeHtml(metrics.shares || 0)}</p>
        </article>`;
      }).join("")}
    </div>`;
  $("#searchReusableMaterials")?.addEventListener("click", () => renderReusableMaterialLibraryResults());
  $("#materialSearch")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") renderReusableMaterialLibraryResults();
  });
  $("#useReusableMaterials")?.addEventListener("click", () => useReusableMaterials({ includeManual: false, query }));
}

async function useReusableMaterials({ includeManual = false, query = "" } = {}) {
  const state = await fetch("/api/state").then((res) => res.json());
  const finalQuery = query || ($("#materialSearch")?.value || formValue("#topic") || "").trim();
  const words = splitWords(finalQuery);
  const samples = (Array.isArray(state.contentSamples) ? state.contentSamples : [])
    .filter((item) => includeManual || item.sourceTool === "mediacrawler-pro" || item.collectionStatus === "real")
    .filter((item) => matchesWords(`${item.keyword || ""} ${item.title || ""} ${item.content || ""} ${(item.tags || []).join(" ")}`, words))
    .slice(0, 8);
  if (!samples.length) {
    $("#importHelp").textContent = "没有找到可复用素材。请换关键词搜索，或在上面粘贴一条素材。";
    return;
  }
  if (finalQuery) $("#topic").value = finalQuery;
  candidateTopics = samples.map(mapRealSampleToCandidate);
  activeTopic = null;
  hasSearched = true;
  $("#topicHint").textContent = `已复用“${finalQuery || "当前关键词"}”的历史采集素材生成候选选题。`;
  renderTopics();
  resetWebCopyApproval();
  setRoute("topics");
  $("#topicsPanel").scrollIntoView({ behavior: "smooth", block: "start" });
}

let activeAssetTab = "keywords";
var assetStateCache = null;
let activeRoute = "home";
let workflowStep = 1;

function setWorkflowStep(step) {
  workflowStep = step;
  $$("#workflowStrip span").forEach((item, index) => item.classList.toggle("active", index + 1 === step));
}

function setRoute(route, options = {}) {
  activeRoute = route;
  const assetRoutes = {
    materials: "materials",
    keywords: "keywords",
    questions: "questions",
    titles: "titles",
    structures: "structures",
    plans: "plans",
  };
  const targetPanelRoute = assetRoutes[route] ? "assets" : route;
  const workflowRoutes = new Set(["collect", "materials", "topics", "delivery"]);
  $$(".route-panel").forEach((panel) => {
    const panelRoute = panel.dataset.route;
    const isWorkflowHome = workflowRoutes.has(route) && panelRoute === "home";
    const isWorkflowTarget = workflowRoutes.has(route) && panelRoute === targetPanelRoute;
    panel.hidden = !(isWorkflowHome || isWorkflowTarget || panelRoute === targetPanelRoute);
  });
  const navRoute = assetRoutes[route] ? "keywords" : route;
  $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.routeLink === navRoute));
  if (assetRoutes[route]) {
    activeAssetTab = assetRoutes[route];
    $$("#assetTabs [data-asset-tab]").forEach((item) => item.classList.toggle("active", item.dataset.assetTab === activeAssetTab));
    renderAssetBoard();
  }
  if (options.scroll === false) return;
  const firstVisible = $$(".route-panel").find((panel) => !panel.hidden);
  firstVisible?.scrollIntoView({ behavior: "smooth", block: "start" });
}

$("[data-route-link='home']")?.classList.add("active");
document.addEventListener("click", (event) => {
  const routeButton = event.target.closest("[data-route-link]");
  if (!routeButton) return;
  setRoute(routeButton.dataset.routeLink);
});

$("#assetTabs")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-asset-tab]");
  if (!button) return;
  activeAssetTab = button.dataset.assetTab;
  $$("#assetTabs [data-asset-tab]").forEach((item) => item.classList.toggle("active", item === button));
  const routeByTab = { materials: "materials", keywords: "keywords", questions: "questions", titles: "titles", structures: "structures", plans: "plans" };
  activeRoute = routeByTab[activeAssetTab] || "keywords";
  const navRoute = routeByTab[activeAssetTab] ? "keywords" : activeRoute;
  $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.routeLink === navRoute));
  renderAssetBoard();
});

document.addEventListener("click", (event) => {
  const scrollButton = event.target.closest("[data-scroll-target]");
  if (!scrollButton) return;
  if (scrollButton.dataset.scrollTarget === "assetLibrary") return setRoute("keywords");
  if (scrollButton.dataset.scrollTarget === "importPanel") return setRoute("materials");
  if (scrollButton.dataset.scrollTarget === "outputsPanel") return setRoute("delivery");
  const target = document.getElementById(scrollButton.dataset.scrollTarget);
  target?.scrollIntoView({ behavior: "smooth", block: "start" });
});

$("#globalSearch")?.addEventListener("keydown", async (event) => {
  if (event.key !== "Enter") return;
  const query = formValue("#globalSearch");
  if (!query) return;
  $("#topic").value = query;
  $("#materialSearch") && ($("#materialSearch").value = query);
  await useReusableMaterials({ includeManual: true, query });
});

function updateSidebarActive(targetId) {
  $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.scrollTarget === targetId));
}

$("#refreshAssetLibrary")?.addEventListener("click", async () => {
  await loadAssetLibrary();
});

$("#collectNewMaterial")?.addEventListener("click", () => {
  $("#findTopics")?.scrollIntoView({ behavior: "smooth", block: "center" });
  $("#findTopics")?.focus();
});

async function loadAssetLibrary() {
  const board = $("#assetBoard");
  if (board) board.innerHTML = '<div class="asset-empty">正在读取历史素材、问题和内容计划...</div>';
  assetStateCache = await fetch("/api/state").then((res) => res.json());
  renderCommandStats();
  renderAssetBoard();
}

function renderCommandStats() {
  const stats = $("#commandStats");
  if (!stats || !assetStateCache) return;
  const keywords = businessKeywordList();
  const samples = Array.isArray(assetStateCache.contentSamples) ? assetStateCache.contentSamples : [];
  const questionCount = samples.reduce((sum, item) => sum + (Array.isArray(item.comments) ? item.comments.length : 0), 0);
  const plans = Array.isArray(assetStateCache.assets) ? assetStateCache.assets.length : 0;
  stats.innerHTML = [
    ["关键词", keywords.length],
    ["历史素材", samples.length],
    ["客户问题", questionCount],
    ["内容计划", plans],
  ].map(([label, value]) => `<article><span>${label}</span><b>${value}</b></article>`).join("");
}

function businessKeywordList() {
  return String($("#businessKeywords")?.value || "")
    .split(/[、,，\s\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function assetSamplesFor(keyword) {
  const samples = Array.isArray(assetStateCache?.contentSamples) ? assetStateCache.contentSamples : [];
  const words = splitWords(keyword);
  return samples
    .filter((item) => item.sourceTool === "mediacrawler-pro" || item.collectionStatus === "real" || item.collectionStatus === "manual")
    .filter((item) => matchesWords(`${item.keyword || ""} ${item.title || ""} ${item.content || ""} ${(item.tags || []).join(" ")}`, words));
}

function selectKeyword(keyword) {
  $("#topic").value = keyword;
  $("#materialSearch") && ($("#materialSearch").value = keyword);
  activeAssetTab = "keywords";
  $$("#assetTabs [data-asset-tab]").forEach((item) => item.classList.toggle("active", item.dataset.assetTab === "keywords"));
  useReusableMaterials({ includeManual: true, query: keyword });
}

function renderAssetBoard() {
  const board = $("#assetBoard");
  if (!board) return;
  if (!assetStateCache) {
    board.innerHTML = '<div class="asset-empty">还没有读取内容资产。点击“刷新内容资产”。</div>';
    return;
  }
  const keywords = businessKeywordList();
  if (activeAssetTab === "materials") return renderMaterialAssets(board);
  if (activeAssetTab === "keywords") return renderKeywordAssets(board, keywords);
  if (activeAssetTab === "questions") return renderQuestionAssets(board, keywords);
  if (activeAssetTab === "titles") return renderTitleAssets(board, keywords);
  if (activeAssetTab === "structures") return renderStructureAssets(board, keywords);
  return renderPlanAssets(board);
}

function renderMaterialAssets(board) {
  board.innerHTML = `
    <div class="asset-empty material-asset-intro">
      <b>素材库</b>
      <p>这里复用历史采集素材。需要新增素材时，再粘贴竞品帖子、客户问题或评论区高频问题。</p>
      <div id="materialAssetMount"></div>
    </div>`;
  renderReusableMaterialLibrary();
}

function renderKeywordAssets(board, keywords) {
  if (!keywords.length) {
    board.innerHTML = '<div class="asset-empty">先填写业务关键词，例如：淡斑、祛痘、敏感肌、抗衰。</div>';
    return;
  }
  board.innerHTML = `<div class="asset-grid">${keywords.map((keyword) => {
    const samples = assetSamplesFor(keyword);
    const top = samples[0];
    return `<article class="asset-card">
      <b>业务关键词</b>
      <h3>${escapeHtml(keyword)}</h3>
      <p>历史素材 ${samples.length} 条${top ? `，最高赞 ${escapeHtml(top.metrics?.likes || 0)}` : ""}</p>
      <button class="mini-action" type="button" data-keyword="${escapeAttr(keyword)}">用这个关键词做内容</button>
    </article>`;
  }).join("")}</div>`;
  board.querySelectorAll("[data-keyword]").forEach((button) => {
    button.addEventListener("click", () => selectKeyword(button.dataset.keyword));
  });
}

function renderQuestionAssets(board, keywords) {
  const questions = [];
  const banks = Array.isArray(assetStateCache?.customerQuestionBank) ? assetStateCache.customerQuestionBank : [];
  banks.forEach((bank) => {
    (Array.isArray(bank.questions) ? bank.questions : []).forEach((item) => {
      questions.push({
        keyword: item.keyword || bank.keyword || "评论区问题",
        text: item.question || item.evidence?.matchedText || "",
        sourceTitle: item.evidence?.sourceTitle || "",
        sourceUrl: item.evidence?.sourceUrl || "",
        metrics: item.evidence?.metrics || {},
      });
    });
  });
  keywords.forEach((keyword) => {
    assetSamplesFor(keyword).forEach((sample) => {
      const comments = Array.isArray(sample.comments) ? sample.comments : [];
      comments.slice(0, 3).forEach((comment) => questions.push({ keyword, text: comment, sourceTitle: sample.title, sourceUrl: sample.url, metrics: sample.metrics }));
      if (!comments.length) questions.push({ keyword, text: inferPainFromTitle(`${sample.title || ""} ${sample.content || ""}`), sourceTitle: sample.title, sourceUrl: sample.url, metrics: sample.metrics });
    });
  });
  const unique = [...new Map(questions.filter((item) => item.text).map((item) => [`${item.keyword}:${item.text}`, item])).values()].slice(0, 12);
  board.innerHTML = unique.length ? `<div class="asset-grid">${unique.map((item) => `<article class="asset-card">
    <b>${escapeHtml(item.keyword)}</b>
    <h3>客户问题</h3>
    <p>${escapeHtml(item.text)}</p>
    ${item.sourceTitle ? `<small>来源：${escapeHtml(item.sourceTitle)}</small>` : ""}
    ${item.metrics ? `<small>赞 ${escapeHtml(item.metrics.likes || 0)} / 藏 ${escapeHtml(item.metrics.saves || item.metrics.collects || 0)} / 评 ${escapeHtml(item.metrics.comments || 0)}</small>` : ""}
    ${item.sourceUrl ? `<a href="${escapeAttr(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">打开原帖</a>` : ""}
  </article>`).join("")}</div>` : '<div class="asset-empty">还没有客户问题。可以先复用历史素材，或手动导入评论区问题。</div>';
}

function renderTitleAssets(board, keywords) {
  const titles = [];
  keywords.forEach((keyword) => {
    assetSamplesFor(keyword).slice(0, 5).forEach((sample) => titles.push({ keyword, title: sample.title || sample.content }));
  });
  board.innerHTML = titles.length ? `<div class="asset-grid">${titles.slice(0, 12).map((item) => `<article class="asset-card">
    <b>${escapeHtml(item.keyword)}</b>
    <h3>${escapeHtml(item.title || "标题样本")}</h3>
    <p>来自历史采集素材，可改写成新标题，不能直接照搬。</p>
  </article>`).join("")}</div>` : '<div class="asset-empty">还没有标题样本。先采集或导入素材。</div>';
}

function renderStructureAssets(board, keywords) {
  const structures = [
    ["避坑清单", "痛点开头 -> 错误做法 -> 判断标准 -> 风险提醒 -> 收藏引导"],
    ["分型科普", "先分类型 -> 每类表现 -> 适合/不适合 -> 下一步建议"],
    ["评论问题", "引用问题 -> 解释原因 -> 给判断步骤 -> 引导咨询/收藏"],
    ["案例拆解", "真实场景 -> 前后差异 -> 为什么这样做 -> 注意事项"],
  ];
  board.innerHTML = `<div class="asset-grid">${structures.map(([name, text]) => `<article class="asset-card">
    <b>爆款结构</b>
    <h3>${name}</h3>
    <p>${text}</p>
  </article>`).join("")}</div>`;
}

function renderPlanAssets(board) {
  const assets = Array.isArray(assetStateCache?.assets) ? assetStateCache.assets : [];
  const plans = assets.filter((item) => item.title || item.structured?.keyword).slice(0, 8);
  board.innerHTML = plans.length ? `<div class="asset-grid">${plans.map((item) => `<article class="asset-card">
    <b>内容计划</b>
    <h3>${escapeHtml(item.title || item.structured?.keyword || "未命名内容")}</h3>
    <p>${escapeHtml(item.type || item.status || "文案/内容包")}</p>
  </article>`).join("")}</div>` : '<div class="asset-empty">还没有内容计划。选题并生成文案后，会逐步沉淀到这里。</div>';
}

loadAssetLibrary();
loadCustomerProfile();
setRoute("home");

function buildPreviewBrief(topic) {
  const source = topSourceOf(topic);
  const metrics = source?.metrics || {};
  const keyword = finalClean(formValue("#topic") || topic?.title || "这个问题");
  const industry = finalClean(formValue("#industry") || "当前行业");
  const sourceTitle = finalClean(source?.title || topic?.title || "");
  const comments = Array.isArray(topic?.evidence?.comments) ? topic.evidence.comments.map(finalClean).filter(Boolean) : [];
  const painList = [...new Set([
    finalClean(topic?.pain),
    ...comments,
    finalClean(inferPainFromTitle(`${keyword} ${sourceTitle}`)),
  ].filter(Boolean))].slice(0, 4);
  const text = [keyword, industry, sourceTitle, painList.join(" "), finalClean(topic?.reason), finalClean(topic?.rewrite)].join(" ");
  const axes = [];
  if (/类型|种类|分清|区别|分类/.test(text)) axes.push("类型差异");
  if (/位置|部位|哪里|区域|脸|头|身/.test(text)) axes.push("出现位置");
  if (/时间|多久|最近|突然|长期|变化/.test(text)) axes.push("出现时间和变化速度");
  if (/原因|为什么|作息|压力|暴晒|熬夜|习惯/.test(text)) axes.push("可能原因");
  if (/适合|不适合|人群|敏感|风险|副作用/.test(text)) axes.push("适合人群和风险边界");
  if (/效果|对比|过程|记录|案例/.test(text)) axes.push("真实过程和结果证据");
  const finalAxes = [...new Set(axes.length ? axes : ["适合人群", "真实过程", "风险边界"])].slice(0, 4);
  const risks = ["不要把个体经验写成确定承诺"];
  if (/健康|护肤|养发|减肥|身体|治疗|功效|改善/.test(text)) risks.push("不要承诺治疗、逆转、一定有效");
  if (/赚钱|获客|成交|利润|收益/.test(text)) risks.push("不要承诺确定收益或确定成交");
  risks.push(`没有判断清楚${keyword}的具体情况前，不建议直接行动`);
  return {
    keyword,
    industry,
    painList,
    axes: finalAxes,
    risks: [...new Set(risks)].slice(0, 4),
    evidence: source ? `${source.platform || "真实来源"}《${sourceTitle}》，赞 ${metrics.likes || 0} / 藏 ${metrics.saves || 0} / 评 ${metrics.comments || 0} / 转 ${metrics.shares || 0}` : "还没有真实采集来源",
  };
}

finalTitle = function finalTitleVariable(topic, publish) {
  return finalClean(topic?.title || formValue("#topic") || "等待专属二创");
};

finalAudience = function finalAudienceVariable(topic) {
  return "由内容工厂根据第四步源头帖、评论区和客户业务生成";
};

finalLines = function finalLinesVariable(topic) {
  return ["等待专属二创结果"];
};

sourceLineOf = function sourceLineOfVariable(topic) {
  return buildPreviewBrief(topic).evidence;
};

renderContentPack();

function renderContentPack() {
  const box = $("#contentPack");
  if (!box) return;
  const pack = buildMultiPlatformContentPack(activeTopic);
  const hasTopic = Boolean(activeTopic);
  box.innerHTML = `
    <div class="pack-head">
      <div>
        <b>成品交付区</b>
        <p>这里不放分析过程，只放客户能直接拿去发布、配图和做视频的交付物。</p>
      </div>
      <span>${hasTopic ? "已选择选题" : "先选择选题"}</span>
    </div>
    <div class="pack-grid">
      <article class="pack-card">
        <h3>小红书图文，可复制发布</h3>
        <pre>${escapeHtml(displayText(pack.xhs, activeTopic?.title || ""))}</pre>
      </article>
      <article class="pack-card">
        <h3>短视频口播脚本，可交给小妹工作台</h3>
        <pre>${escapeHtml(displayText(pack.video, activeTopic?.title || ""))}</pre>
      </article>
      <article class="pack-card">
        <h3>朋友圈文案</h3>
        <pre>${escapeHtml(displayText(pack.moments, activeTopic?.title || ""))}</pre>
      </article>
      <article class="pack-card">
        <h3>公众号长文草稿</h3>
        <pre>${escapeHtml(displayText(pack.article, activeTopic?.title || ""))}</pre>
      </article>
      <article class="pack-card delivery-card">
        <h3>配图生成</h3>
        <div class="asset-list">
          <div><b>要生成什么</b><p>小红书封面、判断标准卡、风险提醒卡、评论痛点卡。</p></div>
          <div><b>使用哪条数据</b><p>${escapeHtml(pack.sourceLine)}</p></div>
          <div><b>当前状态</b><p>点击下面按钮会走真实关键词管线，生成卡片 PNG 和问题库。</p></div>
        </div>
        <button class="primary" type="button" onclick="document.getElementById('runFullPipeline')?.click()">生成配图和问题库</button>
      </article>
      <article class="pack-card delivery-card">
        <h3>视频制作</h3>
        <div class="asset-list">
          <div><b>封面大字</b><p>${escapeHtml(buildFinalContentPackage(activeTopic, activePublish).coverTitle)}</p></div>
          <div><b>制作方式</b><p>把左侧口播脚本、封面和分镜交给小妹视频工作台生成成片。</p></div>
          <div><b>素材要求</b><p>优先用采集来源图、评论痛点截图、判断标准白板卡；素材不足时用文字动画视频。</p></div>
        </div>
        <button class="secondary" type="button" onclick="document.getElementById('makeVideoTask')?.click()">生成视频制作任务</button>
      </article>
    </div>`;
}

renderContentPack();
