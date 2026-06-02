// Longka AI Native step-1 gate.
// Loaded after workbench-v2.js so legacy local copy/image/video paths cannot override it.
(function installLongkaStep1Gate() {
  const $ = window.$ || ((selector) => document.querySelector(selector));
  const $$ = window.$$ || ((selector) => Array.from(document.querySelectorAll(selector)));
  const escapeHtml = window.escapeHtml || ((value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;"));

  const min = 5;
  const max = 10;

  function formValue(selector) {
    return $(selector)?.value?.trim() || "";
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
    if (comments.length >= 8) return { key: "deep", label: `深挖评论 ${comments.length} 条` };
    if (comments.length > 0) return { key: "partial", label: `已有评论 ${comments.length} 条` };
    return { key: "none", label: "未补抓评论" };
  }

  function metricLabel(metrics) {
    const total = metrics.likes + metrics.saves + metrics.comments + metrics.shares;
    if (!total) return "缺少互动指标";
    return `赞 ${metrics.likes || 0} / 藏 ${metrics.saves || 0} / 评 ${metrics.comments || 0} / 转 ${metrics.shares || 0}`;
  }

  function score(sample) {
    const metrics = metricsOf(sample);
    const comments = commentStatus(sample);
    const sourceScore = sampleStatus(sample) === "real" ? 15 : sampleStatus(sample) === "manual" ? 8 : 0;
    const commentScore = comments.key === "deep" ? 20 : comments.key === "partial" ? 10 : 0;
    const metricScore = Math.log10(metrics.likes + metrics.saves * 1.3 + metrics.comments * 2 + metrics.shares * 2 + 1) * 20;
    return Math.round(sourceScore + commentScore + metricScore);
  }

  function whySelected(sample) {
    const metrics = metricsOf(sample);
    const comments = commentStatus(sample);
    const reasons = [];
    if (metrics.saves >= metrics.likes * 0.35 && metrics.saves > 0) reasons.push("收藏占比高，适合做可保存图文");
    if (metrics.comments >= 20) reasons.push("评论多，适合沉淀客户问题库");
    if (metrics.likes + metrics.saves >= 300) reasons.push("互动强，说明话题被市场验证过");
    if (comments.key !== "none") reasons.push("有评论问题，可继续拆选题角度");
    if (!reasons.length) reasons.push("有真实来源，可先进入样本池等待深挖");
    return reasons.slice(0, 3).join("；");
  }

  function buildPool(state = {}, keywords = "") {
    const words = String(keywords || "").split(/[、,，\s]+/).map((word) => word.trim()).filter(Boolean);
    const samples = (Array.isArray(state.contentSamples) ? state.contentSamples : [])
      .filter((sample) => ["real", "manual", "partial"].includes(sampleStatus(sample)))
      .filter((sample) => {
        if (!words.length) return true;
        const haystack = `${sample.keyword || ""} ${sample.title || ""} ${sample.content || ""} ${(sample.tags || []).join(" ")} ${(sample.comments || []).slice(0, 5).join(" ")}`;
        return words.some((word) => haystack.includes(word));
      })
      .map((sample) => {
        const metrics = metricsOf(sample);
        return {
          sample,
          status: sampleStatus(sample),
          title: sample.title || sample.content || "未命名真实样本",
          platform: sample.platform || "xiaohongshu",
          keyword: sample.keyword || keywords,
          url: sample.url || "",
          traceId: sample.id || sample.url || sample.title || "sample",
          metrics,
          metricLabel: metricLabel(metrics),
          commentStatus: commentStatus(sample),
          score: score(sample),
          whySelected: whySelected(sample),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, max);
    return { samples, ready: samples.length >= min };
  }

  function toTopic(item) {
    if (typeof window.mapRealSampleToCandidate === "function") return window.mapRealSampleToCandidate(item.sample);
    return {
      id: item.traceId,
      title: item.title,
      source: item.platform,
      reason: item.whySelected,
      pain: item.commentStatus.key === "none" ? "该样本暂未补抓评论，需要补抓评论后再确认痛点。" : "评论区已有客户问题，可进入样本拆解。",
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

  function renderPool(pool) {
    const grid = $("#topicGrid");
    const hint = $("#topicHint");
    if (!grid) return;
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
    grid.innerHTML = pool.samples.map((item, index) => `<article class="topic-card longka-sample-card" data-step1-sample="${index}" tabindex="0">
      <span>爆款样本池 · ${escapeHtml(item.status)}</span>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.whySelected)}</p>
      <div class="sample-contract-grid">
        <div><b>平台</b><span>${escapeHtml(item.platform)}</span></div>
        <div><b>关键词</b><span>${escapeHtml(item.keyword || "未记录")}</span></div>
        <div><b>互动指标</b><span>${escapeHtml(item.metricLabel)}</span></div>
        <div><b>评论状态</b><span>${escapeHtml(item.commentStatus.label)}</span></div>
        <div><b>来源追踪</b><span>${item.url ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">打开原帖</a>` : escapeHtml(item.traceId)}</span></div>
        <div><b>下一步</b><span>${item.commentStatus.key === "none" ? "建议补抓评论区" : "可进入样本拆解"}</span></div>
      </div>
      <button class="secondary" type="button" data-step1-pick="${index}">选择这条源头做拆解</button>
    </article>`).join("");
    $$("[data-step1-sample]").forEach((card) => {
      card.addEventListener("click", () => {
        const item = pool.samples[Number(card.dataset.step1Sample)];
        if (!item) return;
        window.activeTopic = toTopic(item);
        if (typeof window.selectCandidateTopic === "function") window.selectCandidateTopic(window.activeTopic);
      });
    });
  }

  async function loadPool() {
    const state = await fetch("/api/state").then((response) => response.json());
    return buildPool(state, formValue("#topic"));
  }

  window.renderTopics = function renderTopicsStep1Only() {
    loadPool().then(renderPool).catch((error) => {
      const grid = $("#topicGrid");
      const hint = $("#topicHint");
      if (hint) hint.textContent = "第一步读取样本池失败。请先检查真实采集或手动导入素材。";
      if (grid) grid.innerHTML = `<article class="empty-card"><b>样本池读取失败</b><p>${escapeHtml(error.message)}</p></article>`;
    });
  };

  window.buildOutputCopy = () => "第 1 步只展示爆款样本池。请选择真实源头帖进入样本拆解后，再生成标题和文案。";
  window.buildVideoScriptFromTopic = () => "第 1 步不生成视频脚本。文案确认前，视频入口保持锁定。";
  window.renderContentPack = function renderContentPackStep1Locked() {
    const box = $("#contentPack");
    if (!box) return;
    box.innerHTML = `<div class="pack-head">
      <div>
        <b>成品区已锁定</b>
        <p>当前只验收第 1 步：爆款样本池。正文、配图、视频和打包必须等后续步骤逐项确认。</p>
      </div>
      <span>等待文案确认</span>
    </div>
    <div class="pack-grid">
      <article class="pack-card"><h3>当前允许的动作</h3><pre>1. 输入行业、目标、关键词、平台
2. 读取真实采集或手动导入的 5-10 条样本
3. 展示标题、平台、赞藏评转、评论状态、来源追踪、入选理由
4. 选择一条源头帖进入下一步拆解</pre></article>
      <article class="pack-card"><h3>当前禁止的动作</h3><pre>不生成正文
不生成标题候选
不生成图片
不生成视频
不打包
不上传服务器
不用旧行业数据或固定模板冒充真实样本</pre></article>
    </div>`;
  };

  window.renderContentPack();

  function installVisibleStep1LockNotice() {
    const actions = document.querySelector(".input-actions");
    if (actions && !document.querySelector("#step1GateNotice")) {
      actions.insertAdjacentHTML("afterend", `<div id="step1GateNotice" class="import-help">
        <b>成品区已锁定：</b>当前只验收第 1 步爆款样本池。不生成正文，不生成图片，不生成视频，不打包。后续步骤必须逐项确认。
      </div>`);
    }
    const topicsPanel = $("#topicsPanel");
    if (topicsPanel && !document.querySelector("#step1TopicGateNotice")) {
      topicsPanel.insertAdjacentHTML("afterbegin", `<div id="step1TopicGateNotice" class="import-help">
        <b>成品区已锁定：</b>这里只能选择真实源头帖做拆解。不生成正文，不生成标题候选，不生成图片，不生成视频，不打包。
      </div>`);
    }
  }

  function selectedSourceLabels() {
    return Array.from(document.querySelectorAll("#sourcePicker [data-source].active"))
      .map((button) => button.querySelector("b")?.textContent || button.dataset.source)
      .filter(Boolean);
  }

  function showHomeAndScroll(selector) {
    document.querySelectorAll(".route-panel").forEach((panel) => {
      const route = panel.getAttribute("data-route");
      panel.hidden = route !== "home";
    });
    document.querySelectorAll("[data-route-link]").forEach((button) => {
      button.classList.toggle("active", button.dataset.routeLink === "home");
    });
    document.querySelector(selector)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function installWorkflowBackNav() {
    const strip = $("#workflowStrip");
    if (!strip || strip.dataset.longkaBackNav === "1") return;
    strip.dataset.longkaBackNav = "1";
    Array.from(strip.querySelectorAll("span")).forEach((item, index) => {
      item.setAttribute("role", "button");
      item.setAttribute("tabindex", "0");
      item.dataset.workflowBackStep = String(index + 1);
      item.title = "点击回到这一步查看或调整";
    });
    const go = (step) => {
      const hint = $("#topicHint");
      if (step <= 3) {
        showHomeAndScroll(step === 1 ? "#taskPicker" : step === 2 ? "#sourcePicker" : "#topic");
        if (hint) hint.textContent = "已回到前面步骤。查看不会清空结果；如果修改行业、关键词或素材来源，需要重新找选题。";
        return;
      }
      if (step === 4) {
        showStep1CollectPanel();
        $("#topicsPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (step >= 5) {
        showStep1CollectPanel();
        $("#decisionPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    strip.addEventListener("click", (event) => {
      const item = event.target.closest("[data-workflow-back-step]");
      if (item) go(Number(item.dataset.workflowBackStep));
    });
    strip.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const item = event.target.closest("[data-workflow-back-step]");
      if (item) {
        event.preventDefault();
        go(Number(item.dataset.workflowBackStep));
      }
    });
  }

  function showStep1CollectPanel() {
    document.querySelectorAll(".route-panel").forEach((panel) => {
      const route = panel.getAttribute("data-route");
      panel.hidden = !["collect", "topics"].includes(route);
    });
    document.querySelectorAll("[data-route-link]").forEach((button) => {
      button.classList.toggle("active", button.dataset.routeLink === "topics");
    });
    const crawlPanel = $("#crawlPanel");
    if (crawlPanel) crawlPanel.hidden = false;
    const topicsPanel = $("#topicsPanel");
    if (topicsPanel) topicsPanel.hidden = false;
    crawlPanel?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderStep1CollectWindow(status = "running", pool = { samples: [] }, message = "") {
    const sourceLabels = selectedSourceLabels();
    const keyword = formValue("#topic") || "未填写关键词";
    const consoleTitle = $("#consoleTitle");
    const consoleSubtitle = $("#consoleSubtitle");
    const consoleBadge = $("#consoleBadge");
    const terminalStatus = $("#terminalStatus");
    const terminalLog = $("#terminalLog");
    const progressBar = $("#progressBar");
    const consoleSteps = $("#consoleSteps");
    const crawlGrid = $("#crawlGrid");
    if (consoleTitle) consoleTitle.textContent = "采集工作窗口";
    if (consoleSubtitle) consoleSubtitle.textContent = status === "running"
      ? `正在读取 ${sourceLabels.join("、") || "历史素材库"} / ${keyword}`
      : status === "failed"
        ? "样本池读取失败"
        : `已整理 ${pool.samples.length} 条可用素材`;
    if (consoleBadge) {
      consoleBadge.textContent = status === "running" ? "运行中" : status === "failed" ? "失败" : "已完成";
      consoleBadge.className = status === "running" ? "running" : status === "failed" ? "failed" : "done";
    }
    if (terminalStatus) {
      terminalStatus.textContent = status === "running" ? "正在整理" : status === "failed" ? "失败" : "已完成";
      terminalStatus.className = status === "running" ? "running" : status === "failed" ? "failed" : "done";
    }
    if (progressBar) progressBar.style.width = status === "running" ? "42%" : status === "failed" ? "100%" : "100%";
    if (consoleSteps) {
      const steps = [
        ["读取输入", `行业、关键词、平台：${keyword}`],
        ["读取素材", "优先复用历史 MediaCrawler/手动导入素材"],
        ["整理样本池", "只展示真实/手动/部分采集样本，不生成正文"],
        ["等待选择", "选择一条源头帖后才进入爆款拆解"],
      ];
      consoleSteps.innerHTML = steps.map((step, index) => {
        const className = status === "failed" && index >= 1 ? "failed" : status === "running" && index >= 2 ? "wait" : "done";
        return `<li class="${className}"><b>${escapeHtml(step[0])}</b><span>${escapeHtml(step[1])}</span></li>`;
      }).join("");
    }
    if (terminalLog) {
      const lines = status === "failed"
        ? [
          `> 读取关键词：${keyword}`,
          `> 读取失败：${message || "样本池不可用"}`,
          "> 已保持后续生产锁定，没有生成正文、图片或视频。",
        ]
        : [
          `> 读取关键词：${keyword}`,
          `> 参考来源：${sourceLabels.join("、") || "未选择来源"}`,
          "> 读取本地内容资产库和真实采集记录...",
          `> 整理可用样本：${pool.samples.length} 条`,
          pool.ready ? "> 样本池达到 5-10 条验收要求，等待选择源头帖。" : "> 样本不足 5 条，请补采集或导入素材后再继续。",
          "> 当前门禁：不生成正文、不生成图片、不生成视频、不打包。",
        ];
      terminalLog.textContent = lines.join("\n");
      terminalLog.scrollTop = terminalLog.scrollHeight;
    }
    if (crawlGrid) {
      const sourceCards = sourceLabels.length ? sourceLabels : ["历史素材库"];
      crawlGrid.innerHTML = sourceCards.map((label) => `<div class="crawl-item ${status === "failed" ? "failed" : status === "running" ? "running" : "done"}">
        <b>${escapeHtml(label)}</b>
        <span>${status === "running" ? "读取中" : status === "failed" ? "失败" : "已读取"}</span>
        <p>${status === "failed" ? escapeHtml(message || "读取失败") : `找到 ${pool.samples.length} 条匹配样本，下一步显示候选源头。`}</p>
      </div>`).join("");
    }
  }

  async function runStep1FromButton(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const button = event.currentTarget;
    const oldText = button.textContent;
    button.disabled = true;
    button.textContent = "正在整理爆款样本池";
    try {
      showStep1CollectPanel();
      renderStep1CollectWindow("running");
      const pool = await loadPool();
      renderStep1CollectWindow("done", pool);
      renderPool(pool);
      $("#topicsPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      renderStep1CollectWindow("failed", { samples: [] }, error.message);
      const grid = $("#topicGrid");
      const hint = $("#topicHint");
      if (hint) hint.textContent = "第一步读取样本池失败。请先检查真实采集或手动导入素材。";
      if (grid) grid.innerHTML = `<article class="empty-card"><b>样本池读取失败</b><p>${escapeHtml(error.message)}</p></article>`;
    } finally {
      button.disabled = false;
      button.textContent = oldText || "下一步：帮我找选题";
    }
  }

  $("#findTopics")?.addEventListener("click", runStep1FromButton, true);
  installVisibleStep1LockNotice();
  installWorkflowBackNav();
})();
