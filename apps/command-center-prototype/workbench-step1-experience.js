// Step 1 experience layer: keeps the material search visible, paced, and source-bound.
(function installStep1Experience() {
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  const MIN_SAMPLES = 5;
  const MAX_SAMPLES = 10;
  let timers = [];

  function clearTimers() {
    timers.forEach((timer) => clearTimeout(timer));
    timers = [];
  }

  function formValue(selector) {
    return $(selector)?.value?.trim() || "";
  }

  function selectedTaskLabel() {
    return $("#taskPicker .task-card.active b")?.textContent?.trim() || "做一篇图文";
  }

  function selectedSourceLabels() {
    return $$("#sourcePicker [data-source].active")
      .map((button) => button.querySelector("b")?.textContent?.trim() || button.dataset.source)
      .filter(Boolean);
  }

  function metricNumber(value) {
    const number = Number(value || 0);
    return Number.isFinite(number) ? number : 0;
  }

  function metricsOf(sample = {}) {
    const metrics = sample.metrics || {};
    return {
      likes: metricNumber(metrics.likes ?? metrics.likeCount ?? metrics.likedCount),
      saves: metricNumber(metrics.saves ?? metrics.collects ?? metrics.collectedCount),
      comments: metricNumber(metrics.comments ?? metrics.commentCount),
      shares: metricNumber(metrics.shares ?? metrics.shareCount),
    };
  }

  function sampleStatus(sample = {}) {
    if (sample.sourceTool === "mediacrawler-pro" || sample.collectionStatus === "real") return "real";
    if (sample.sourceTool === "manual-import" || sample.collectionStatus === "manual") return "manual";
    if (sample.collectionStatus === "partial") return "partial";
    return sample.collectionStatus || "unknown";
  }

  function commentStatus(sample = {}) {
    const comments = Array.isArray(sample.comments) ? sample.comments.filter(Boolean) : [];
    if (comments.length >= 8) return { key: "deep", label: `已深挖 ${comments.length} 条评论` };
    if (comments.length > 0) return { key: "partial", label: `已有 ${comments.length} 条评论` };
    return { key: "none", label: "未补抓评论" };
  }

  function metricLabel(metrics) {
    const total = metrics.likes + metrics.saves + metrics.comments + metrics.shares;
    if (!total) return "缺少互动指标";
    return `赞 ${metrics.likes || 0} / 藏 ${metrics.saves || 0} / 评 ${metrics.comments || 0} / 转 ${metrics.shares || 0}`;
  }

  function scoreSample(sample) {
    const metrics = metricsOf(sample);
    const comments = commentStatus(sample);
    const sourceScore = sampleStatus(sample) === "real" ? 15 : sampleStatus(sample) === "manual" ? 8 : 0;
    const commentScore = comments.key === "deep" ? 20 : comments.key === "partial" ? 10 : 0;
    const metricScore = Math.log10(metrics.likes + metrics.saves * 1.3 + metrics.comments * 2 + metrics.shares * 2 + 1) * 20;
    return Math.round(sourceScore + commentScore + metricScore);
  }

  function textOf(sample = {}) {
    return [
      sample.keyword,
      sample.title,
      sample.content,
      ...(Array.isArray(sample.tags) ? sample.tags : []),
      ...(Array.isArray(sample.comments) ? sample.comments.slice(0, 8) : []),
    ].join(" ");
  }

  function buildPool(state = {}) {
    const keywordInput = formValue("#topic");
    const words = keywordInput.split(/[、，,\s]+/).map((word) => word.trim()).filter(Boolean);
    const sourceLabels = selectedSourceLabels();
    const samples = (Array.isArray(state.contentSamples) ? state.contentSamples : [])
      .filter((sample) => ["real", "manual", "partial"].includes(sampleStatus(sample)))
      .filter((sample) => {
        if (!words.length) return true;
        const haystack = textOf(sample);
        return words.some((word) => haystack.includes(word));
      })
      .map((sample) => {
        const metrics = metricsOf(sample);
        const comments = commentStatus(sample);
        const savesHot = metrics.saves >= Math.max(20, metrics.likes * 0.3);
        const commentHot = metrics.comments >= 20 || comments.key !== "none";
        const reasons = [
          savesHot ? "收藏占比高，适合做可保存图文" : "",
          commentHot ? "评论信号强，适合沉淀客户问题" : "",
          metrics.likes + metrics.saves >= 300 ? "互动被市场验证过" : "",
        ].filter(Boolean);
        const deconstruction = buildDeconstructionHints(sample, metrics, comments);
        return {
          sample,
          status: sampleStatus(sample),
          title: sample.title || sample.content || "未命名真实样本",
          platform: normalizePlatform(sample.platform || sourceLabels[0] || "小红书"),
          keyword: keywordInput || sample.keyword || "未填写关键词",
          rawKeyword: sample.keyword || "",
          url: sample.url || "",
          traceId: sample.id || sample.url || sample.title || "sample",
          metrics,
          metricLabel: metricLabel(metrics),
          comments,
          score: scoreSample(sample),
          reason: reasons.length ? reasons.join("；") : "有真实来源，可先进入样本池等待深挖",
          deconstruction,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_SAMPLES);
    return { samples, ready: samples.length >= MIN_SAMPLES };
  }

  function buildDeconstructionHints(sample, metrics, comments) {
    const title = sample.title || "";
    const content = sample.content || "";
    const text = `${title} ${content}`;
    const hints = [];
    if (/类型|分清|认清|判断|自查|区别/.test(text)) {
      hints.push("适合拆成「判断标准 / 自查流程 / 避坑清单」");
    }
    if (/没效果|反复|乱|别急|拒绝|瞎折腾|误区/.test(text)) {
      hints.push("适合拆成「常见误区 / 失败原因 / 正确顺序」");
    }
    if (/成分|知识|科普|原因|原理/.test(text)) {
      hints.push("适合拆成「知识科普 / 成因解释 / 方案选择」");
    }
    if (/皮秒|项目|护理|修护|防晒|检测/.test(text)) {
      hints.push("适合拆成「项目前后配合 / 到店咨询 / 专业评估」");
    }
    if (metrics.comments >= 20) {
      hints.push("评论数较高，优先补抓评论做客户问题库");
    } else if (comments.key === "none") {
      hints.push("评论未补抓，先用标题正文和互动数据判断方向");
    }
    if (!hints.length) hints.push("先拆痛点、承诺边界、收藏理由，再决定二创角度");
    return hints.slice(0, 3);
  }

  function normalizePlatform(value = "") {
    const text = String(value || "").trim().toLowerCase();
    const map = {
      xiaohongshu: "小红书",
      xhs: "小红书",
      douyin: "抖音",
      kuaishou: "快手",
      bilibili: "Bilibili",
      bili: "Bilibili",
      weibo: "微博",
      zhihu: "知乎",
      tieba: "百度贴吧",
    };
    return map[text] || value || "小红书";
  }

  function toTopic(item) {
    if (typeof window.mapRealSampleToCandidate === "function") return window.mapRealSampleToCandidate(item.sample);
    return {
      id: item.traceId,
      title: item.title,
      source: item.platform,
      reason: item.reason,
      pain: item.comments.key === "none" ? "这条样本还没有评论区问题，需要补抓评论后再增强选题。" : "评论区已有客户问题，可以进入拆解。",
      fit: "待拆解",
      risk: "不照抄原帖，不生成正文，不生成图片或视频。",
      evidence: {
        mode: "真实/手动样本池",
        traceId: item.traceId,
        sourcePosts: [{ platform: item.platform, title: item.title, url: item.url, metrics: item.metrics }],
        comments: Array.isArray(item.sample.comments) ? item.sample.comments.slice(0, 3) : [],
      },
    };
  }

  function showCollectRoute() {
    $$(".route-panel").forEach((panel) => {
      const route = panel.getAttribute("data-route");
      panel.hidden = !["collect", "topics"].includes(route);
    });
    $$("[data-route-link]").forEach((button) => {
      button.classList.toggle("active", button.dataset.routeLink === "topics");
    });
    $("#crawlPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function setProgress(percent) {
    const bar = $("#progressBar");
    if (bar) bar.style.width = `${percent}%`;
  }

  function appendLog(line) {
    const log = $("#terminalLog");
    if (!log) return;
    const stamp = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    log.textContent = `${log.textContent || ""}${log.textContent ? "\n" : ""}[${stamp}] ${line}`;
    log.scrollTop = log.scrollHeight;
  }

  function renderConsoleSteps(activeIndex = 0, failed = false) {
    const steps = [
      ["读取输入", "确认行业、关键词、目标和平台"],
      ["检查素材", "优先复用本地资产库和真实采集记录"],
      ["筛选高表现", "按赞藏评转、来源链接和评论状态排序"],
      ["展示样本池", "只展示源头帖，等你选择后再拆解"],
    ];
    const box = $("#consoleSteps");
    if (!box) return;
    box.innerHTML = steps.map((step, index) => {
      const status = failed && index >= activeIndex ? "failed" : index < activeIndex ? "done" : index === activeIndex ? "running" : "wait";
      return `<li class="${status}"><b>${escapeHtml(step[0])}</b><span>${escapeHtml(step[1])}</span></li>`;
    }).join("");
  }

  function renderSourceCards(status, count = 0, message = "") {
    const grid = $("#crawlGrid");
    if (!grid) return;
    const sources = selectedSourceLabels();
    const cards = sources.length ? sources : ["本地内容资产库"];
    grid.innerHTML = cards.map((label) => `<div class="crawl-item ${status}">
      <b>${escapeHtml(label)}</b>
      <span>${status === "running" ? "读取中" : status === "failed" ? "失败" : "已读取"}</span>
      <p>${escapeHtml(status === "failed" ? message || "读取失败" : `已整理 ${count} 条匹配素材，保留原帖链接和互动数据。`)}</p>
    </div>`).join("");
  }

  function startCollectAnimation() {
    clearTimers();
    const keyword = formValue("#topic") || "未填写关键词";
    const industry = formValue("#industry") || "未填写行业";
    const goal = formValue("#businessGoal") || "未填写目标";
    const sources = selectedSourceLabels().join("、") || "本地内容资产库";
    $("#consoleTitle") && ($("#consoleTitle").textContent = "Longka 雷达素材搜索");
    $("#consoleSubtitle") && ($("#consoleSubtitle").textContent = `正在读取 ${industry} / ${keyword}`);
    $("#consoleBadge") && ($("#consoleBadge").textContent = "运行中");
    $("#consoleBadge") && ($("#consoleBadge").className = "running");
    $("#terminalStatus") && ($("#terminalStatus").textContent = "正在整理");
    $("#terminalStatus") && ($("#terminalStatus").className = "running");
    $("#terminalLog") && ($("#terminalLog").textContent = "");
    renderConsoleSteps(0);
    renderSourceCards("running", 0);
    setProgress(8);

    const actions = [
      [180, 16, 0, `已读取任务：${selectedTaskLabel()}，目标：${goal}`],
      [520, 28, 1, `正在检查素材来源：${sources}`],
      [900, 42, 1, "优先读取本地内容资产库和真实采集记录，不用假数据替代"],
      [1280, 58, 2, `按关键词筛选：${keyword}`],
      [1660, 72, 2, "整理赞、藏、评、转、原帖链接和评论区状态"],
      [2040, 84, 3, "当前门禁：只展示样本池，不生成正文、图片、视频或打包"],
    ];
    actions.forEach(([delay, progress, step, line]) => {
      timers.push(setTimeout(() => {
        setProgress(progress);
        renderConsoleSteps(step);
        appendLog(line);
      }, delay));
    });
  }

  function finishCollectAnimation(pool, errorMessage = "") {
    clearTimers();
    const failed = Boolean(errorMessage);
    setProgress(100);
    renderConsoleSteps(failed ? 1 : 4, failed);
    renderSourceCards(failed ? "failed" : "done", pool.samples.length, errorMessage);
    $("#consoleSubtitle") && ($("#consoleSubtitle").textContent = failed ? "素材池读取失败" : `已整理 ${pool.samples.length} 条可用素材`);
    $("#consoleBadge") && ($("#consoleBadge").textContent = failed ? "失败" : "已完成");
    $("#consoleBadge") && ($("#consoleBadge").className = failed ? "failed" : "done");
    $("#terminalStatus") && ($("#terminalStatus").textContent = failed ? "失败" : "已完成");
    $("#terminalStatus") && ($("#terminalStatus").className = failed ? "failed" : "done");
    appendLog(failed ? `读取失败：${errorMessage}` : `完成：找到 ${pool.samples.length} 条候选源头帖，等待你选择一条进入拆解。`);
  }

  function renderPool(pool) {
    const grid = $("#topicGrid");
    const hint = $("#topicHint");
    if (!grid) return;
    if (hint) {
      hint.textContent = pool.ready
        ? `第一步已整理 ${pool.samples.length} 条爆款样本。先选源头帖，下一步才做样本拆解。`
        : `需要 5-10 条真实/手动样本；当前只有 ${pool.samples.length} 条。样本不足时不进入文案生成。`;
    }
    if (!pool.samples.length) {
      grid.innerHTML = `<article class="empty-card longka-sample-empty">
        <b>还没有可用的爆款样本池</b>
        <p>请先用 Longka 雷达采集，或导入你已有的竞品帖子。系统不会用固定模板冒充真实样本。</p>
      </article>`;
      return;
    }
    grid.innerHTML = pool.samples.map((item, index) => {
      const needsComment = item.comments.key === "none";
      return `<article class="topic-card longka-sample-card-v2" data-step1-sample-v2="${index}" tabindex="0">
        <div class="sample-card-top">
          <span class="sample-chip">${escapeHtml(item.status === "real" ? "真实采集" : item.status === "manual" ? "手动导入" : "部分采集")}</span>
          <span class="sample-score">热度 ${item.score}</span>
        </div>
        <h3>${escapeHtml(item.title)}</h3>
        <p class="sample-reason">${escapeHtml(item.reason)}</p>
        <div class="sample-meta-line">
          <span>${escapeHtml(item.platform)}</span>
          <span>本次关键词：${escapeHtml(item.keyword)}</span>
        </div>
        <div class="sample-metrics">
          <span><b>${item.metrics.likes || 0}</b>赞</span>
          <span><b>${item.metrics.saves || 0}</b>藏</span>
          <span><b>${item.metrics.comments || 0}</b>评</span>
          <span><b>${item.metrics.shares || 0}</b>转</span>
        </div>
        <div class="sample-deconstruct">
          <b>推荐拆解</b>
          ${item.deconstruction.map((hint) => `<span>${escapeHtml(hint)}</span>`).join("")}
        </div>
        <div class="sample-footer">
          <span class="${needsComment ? "need" : "ready"}">${escapeHtml(item.comments.label)}</span>
          ${item.url ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">打开原帖</a>` : `<span>${escapeHtml(item.traceId)}</span>`}
        </div>
        <button class="primary sample-pick" type="button" data-step1-pick-v2="${index}">选择这条源头帖做拆解</button>
      </article>`;
    }).join("");
    $$("[data-step1-sample-v2], [data-step1-pick-v2]").forEach((node) => {
      node.addEventListener("click", (event) => {
        event.preventDefault();
        const host = event.target.closest("[data-step1-sample-v2]") || event.target.closest("[data-step1-pick-v2]");
        const index = Number(host?.dataset.step1SampleV2 ?? host?.dataset.step1PickV2);
        const item = pool.samples[index];
        if (!item) return;
        window.activeTopic = toTopic(item);
        if (typeof window.selectCandidateTopic === "function") window.selectCandidateTopic(window.activeTopic);
      });
    });
  }

  async function loadPool() {
    const state = await fetch("/api/state").then((response) => response.json());
    return buildPool(state);
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function runSearch(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const button = event.currentTarget;
    const oldText = button.textContent;
    button.disabled = true;
    button.textContent = "正在搜索真实素材...";
    showCollectRoute();
    startCollectAnimation();
    try {
      const [pool] = await Promise.all([loadPool(), delay(2300)]);
      finishCollectAnimation(pool);
      renderPool(pool);
      $("#topicsPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      const pool = { samples: [], ready: false };
      finishCollectAnimation(pool, error.message);
      renderPool(pool);
    } finally {
      button.disabled = false;
      button.textContent = oldText || "下一步：帮我找选题";
    }
  }

  function replaceFindButton() {
    const oldButton = $("#findTopics");
    if (!oldButton || oldButton.dataset.step1Experience === "1") return;
    const button = oldButton.cloneNode(true);
    button.dataset.step1Experience = "1";
    oldButton.replaceWith(button);
    button.addEventListener("click", runSearch, true);
  }

  window.renderTopics = function renderTopicsExperience() {
    loadPool().then(renderPool).catch((error) => {
      const grid = $("#topicGrid");
      const hint = $("#topicHint");
      if (hint) hint.textContent = "第一步读取样本池失败。请先检查真实采集或手动导入素材。";
      if (grid) grid.innerHTML = `<article class="empty-card"><b>样本池读取失败</b><p>${escapeHtml(error.message)}</p></article>`;
    });
  };

  replaceFindButton();
})();

// Longka v9 final handoff: this file is loaded after workbench-v2.js and used to
// replace the "find topics" button. Keep the final click behavior here so the
// visible customer path cannot fall back to the old "0 items, done" sample-pool UI.
(() => {
  const $ = (selector) => document.querySelector(selector);

  function bindV9MaterialFlow() {
    const flow = window.longkaMaterialFlowV9;
    if (!flow?.findTopicsFromLocalAssets || !flow?.collectFreshMaterial) return;

    const findButton = $("#findTopics");
    if (findButton && findButton.dataset.v9MaterialFlow !== "1") {
      findButton.dataset.v9MaterialFlow = "1";
      findButton.textContent = "帮我找选题";
      findButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        flow.findTopicsFromLocalAssets();
      }, true);
    }

    const collectButton = $("#collectNewMaterial");
    if (collectButton && collectButton.dataset.v9MaterialFlow !== "1") {
      collectButton.dataset.v9MaterialFlow = "1";
      collectButton.textContent = "采集新素材";
      collectButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        flow.collectFreshMaterial();
      }, true);
    }
  }

  bindV9MaterialFlow();
  window.addEventListener("load", bindV9MaterialFlow);
})();
