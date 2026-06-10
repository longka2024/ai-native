// Longka material flow, single source of truth for step 1-4.
// Scope: local asset reuse, real CDP collection, source-card rendering.
(() => {
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const escape = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const formValueSafe = (id) => (typeof formValue === "function" ? formValue(id) : $(id)?.value?.trim() || "");

  function words() {
    return formValueSafe("#topic").split(/[\s,，、]+/).map((word) => word.trim()).filter(Boolean);
  }

  function showRoute(names) {
    const routeNames = Array.isArray(names) ? names : [names];
    $$(".route-panel").forEach((panel) => {
      const route = panel.getAttribute("data-route");
      panel.hidden = !routeNames.includes(route);
    });
    $$("[data-route-link]").forEach((button) => {
      button.classList.toggle("active", routeNames.includes(button.dataset.routeLink));
    });
  }

  function appendLog(text) {
    const log = $("#terminalLog");
    if (!log) return;
    const stamp = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    log.textContent = `${log.textContent || ""}${log.textContent ? "\n" : ""}[${stamp}] ${text}`;
    log.scrollTop = log.scrollHeight;
  }

  function setMonitor(status, title, subtitle, progress) {
    $("#crawlPanel") && ($("#crawlPanel").hidden = false);
    $("#consoleTitle") && ($("#consoleTitle").textContent = title);
    $("#consoleSubtitle") && ($("#consoleSubtitle").textContent = subtitle);
    $("#consoleBadge") && ($("#consoleBadge").textContent = status);
    $("#terminalStatus") && ($("#terminalStatus").textContent = status);
    $("#progressBar") && ($("#progressBar").style.width = `${progress}%`);
    const steps = [
      ["读任务", "读取行业、关键词、目标和平台"],
      ["查本地库", "先查客户自己的素材库，不用假数据顶上"],
      ["采集新素材", "需要新素材时才打开 CDP 真实搜索"],
      ["展示源头帖", "只展示真实/手动/部分采集素材，选择后再写文案"],
    ];
    const active = progress >= 100 ? 4 : progress >= 60 ? 2 : progress >= 30 ? 1 : 0;
    $("#consoleSteps") && ($("#consoleSteps").innerHTML = steps.map((step, index) => {
      const cls = index < active ? "done" : index === active ? "running" : "wait";
      return `<li class="${cls}"><b>${escape(step[0])}</b><span>${escape(step[1])}</span></li>`;
    }).join(""));
  }

  function metricLabel(sample) {
    const metrics = sample?.metrics || {};
    return `赞 ${metrics.likes || 0} / 藏 ${metrics.saves || metrics.collects || 0} / 评 ${metrics.comments || 0} / 转 ${metrics.shares || 0}`;
  }

  function sampleStatus(sample) {
    if (typeof longkaSampleStatus === "function") return longkaSampleStatus(sample);
    return sample?.collectionStatus || sample?.status || "";
  }

  function sampleScore(sample) {
    if (typeof longkaSamplePoolScore === "function") return longkaSamplePoolScore(sample);
    const metrics = sample?.metrics || {};
    return (metrics.likes || 0) + (metrics.saves || 0) * 1.5 + (metrics.comments || 0) * 2 + (metrics.shares || 0) * 2;
  }

  function matchesTask(sample) {
    const taskWords = words();
    if (!taskWords.length) return true;
    const text = `${sample.keyword || ""} ${sample.title || ""} ${sample.content || ""} ${(sample.tags || []).join(" ")} ${(sample.comments || []).slice(0, 10).join(" ")}`;
    return taskWords.some((word) => text.includes(word));
  }

  async function postJson(path, body) {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
      const err = new Error(data.message || data.error || `HTTP ${res.status}`);
      err.data = data;
      throw err;
    }
    return data;
  }

  async function loadLocalSamples() {
    const state = await fetch("/api/state").then((res) => res.json());
    return (Array.isArray(state.contentSamples) ? state.contentSamples : [])
      .filter((sample) => ["real", "partial", "manual"].includes(sampleStatus(sample)))
      .filter(matchesTask)
      .sort((a, b) => sampleScore(b) - sampleScore(a))
      .slice(0, 10);
  }

  function toTopic(sample) {
    if (typeof mapRealSampleToCandidate === "function") return mapRealSampleToCandidate(sample);
    return {
      title: sample.title || formValueSafe("#topic") || "未命名源头帖",
      reason: metricLabel(sample),
      pain: Array.isArray(sample.comments) && sample.comments.length ? sample.comments[0] : "等待评论区深挖",
      rewrite: "选择这条源头帖后，再进入标题和文案二创。",
      evidence: {
        traceId: sample.id || sample.url || sample.title,
        comments: sample.comments || [],
        sourcePosts: [sample],
      },
    };
  }

  function renderNeedCollection(message) {
    const text = message || "当前关键词还没有可复用素材，需要采集一批新的小红书源头帖。";
    $("#topicHint") && ($("#topicHint").textContent = text);
    $("#topicGrid") && ($("#topicGrid").innerHTML = `<article class="empty-card longka-sample-empty">
      <b>当前关键词还没有素材</b>
      <p>${escape(text)}</p>
      <button class="primary" type="button" id="collectFreshInline">立即采集新素材</button>
    </article>`);
    $("#crawlGrid") && ($("#crawlGrid").innerHTML = `<div class="crawl-item failed">
      <b>小红书</b>
      <span>需要采集</span>
      <p>${escape(text)}</p>
    </div>`);
    $("#collectFreshInline")?.addEventListener("click", collectFreshMaterial, true);
  }

  function renderTopicsFromSamples(samples, label) {
    activeTopic = null;
    candidateTopics = samples.map(toTopic);
    if (typeof longkaRenderCandidateTopicsOnly === "function") {
      longkaRenderCandidateTopicsOnly(`${label} ${candidateTopics.length} 条源头帖。请选择一条进入文案二创。`);
    } else if ($("#topicGrid")) {
      $("#topicGrid").innerHTML = samples.map((sample, index) => `<article class="topic-card" data-material-topic="${index}">
        <span>${escape(sample.collectionRunId ? "本次采集" : "本地资产库")}</span>
        <h3>${escape(sample.title || "未命名源头帖")}</h3>
        <p>${escape(String(sample.content || "").slice(0, 120) || "这条素材暂无正文摘要。")}</p>
        <div class="sample-contract-grid">
          <div><b>互动</b><span>${escape(metricLabel(sample))}</span></div>
          <div><b>评论</b><span>${escape(Array.isArray(sample.comments) ? `已抓 ${sample.comments.length} 条` : "未补抓评论")}</span></div>
          <div><b>来源</b><span>${sample.url ? `<a href="${escape(sample.url)}" target="_blank" rel="noreferrer">打开原帖</a>` : "缺少原帖链接"}</span></div>
        </div>
      </article>`).join("");
    }
    $("#crawlGrid") && ($("#crawlGrid").innerHTML = `<div class="crawl-item done">
      <b>小红书</b>
      <span>已读取</span>
      <p>${escape(label)} ${samples.length} 条源头帖，保留原帖链接、互动数据和评论状态。</p>
    </div>`);
  }

  async function findTopicsFromLocalAssets(event) {
    event?.preventDefault();
    event?.stopImmediatePropagation();
    const keyword = formValueSafe("#topic");
    if (!keyword) {
      showRoute(["collect", "topics"]);
      setMonitor("需要输入", "Longka 雷达素材搜索", "请先输入业务关键词", 100);
      renderNeedCollection("请先输入业务关键词。");
      return;
    }
    showRoute(["collect", "topics"]);
    $("#crawlPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    $("#terminalLog") && ($("#terminalLog").textContent = "");
    setMonitor("检查中", "Longka 雷达素材搜索", `正在检查本地内容资产库：${keyword}`, 28);
    appendLog(`读取任务：${formValueSafe("#industry") || "未填写行业"} / ${keyword}`);
    appendLog("先查本地客户资产库和真实采集记录，不使用固定模板或假数据。");
    const samples = await loadLocalSamples();
    if (!samples.length) {
      appendLog("本地资产库命中 0 条。没有素材就停在这里，等待你采集新素材。");
      setMonitor("需要采集", "Longka 雷达素材搜索", "本地没有匹配素材，请采集新素材", 100);
      renderNeedCollection();
      $("#topicsPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    appendLog(`本地资产库命中 ${samples.length} 条可复用源头帖。`);
    setMonitor("已完成", "Longka 雷达素材搜索", `找到 ${samples.length} 条可复用素材`, 100);
    renderTopicsFromSamples(samples, "本地资产库找到");
    $("#topicsPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function collectFreshMaterial(event) {
    event?.preventDefault();
    event?.stopImmediatePropagation();
    const keyword = formValueSafe("#topic");
    const industry = formValueSafe("#industry");
    if (!keyword) {
      renderNeedCollection("请先输入业务关键词。");
      return;
    }
    showRoute(["collect", "topics"]);
    $("#crawlPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    $("#terminalLog") && ($("#terminalLog").textContent = "");
    setMonitor("采集中", "Longka 雷达正在采集新素材", "请观察小红书 Chrome 窗口是否跳转搜索", 18);
    appendLog(`采集新素材：${industry || "未填写行业"} / ${keyword} / 小红书`);
    appendLog("慢采集策略：本轮快扫最多 12 条，深挖最多 3 条，深挖之间会等待 6-10 秒，尽量降低验证触发概率。");
    appendLog("1/5 检查小红书 CDP 登录窗口。");
    appendLog("2/5 打开搜索页并输入关键词。");
    appendLog("3/5 快扫高赞、高藏、高评源头帖。");
    appendLog("4/5 深挖 Top 帖子的正文、图片和评论区。");
    appendLog("5/5 生成客户问题库和可二创选题。");
    const startedAt = Date.now();
    let heartbeatIndex = 0;
    const heartbeatLines = [
      ["采集中", "正在等待 CDP Chrome 响应，请观察小红书窗口是否已经跳转搜索页", 24],
      ["采集中", "正在读取搜索结果卡片；如果页面还没变化，请不要重复点击按钮", 34],
      ["采集中", "正在过滤低质量结果，只保留带原帖链接和互动数据的源头帖", 46],
      ["采集中", "正在打开高互动帖子做深挖，补正文、图片和评论区", 58],
      ["采集中", "正在整理客户问题库：疑问句、求助句、担忧句会优先保留", 70],
      ["采集中", "真实采集比读取本地库慢，系统不会用旧数据或假数据顶上", 82],
    ];
    const heartbeat = window.setInterval(() => {
      const [status, text, progress] = heartbeatLines[heartbeatIndex % heartbeatLines.length];
      heartbeatIndex += 1;
      const seconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      const detail = `已等待 ${seconds} 秒：${text}`;
      setMonitor(status, "Longka 雷达正在采集新素材", detail, progress);
      appendLog(detail);
    }, 4500);
    try {
      const data = await postJson("/api/sources/mediacrawler/xhs-collect", {
        industry,
        keywords: keyword,
        platform: "xhs",
        cdpLimit: 12,
        deepLimit: 3,
        paceMode: "safe",
        detailDelayMs: 7000,
        detailDelayJitterMs: 3000,
      });
      const samples = Array.isArray(data.samples) ? data.samples : [];
      if (!samples.length) throw new Error("本次真实采集返回 0 条，请确认 CDP Chrome 已登录且关键词可搜索。");
      appendLog(`已拿到后端结果：本次返回 ${samples.length} 条源头帖。`);
      appendLog(`采集完成：快扫 ${data.quickScanCount || samples.length} 条；深挖 ${data.deepDiveCount || 0} 条；客户问题 ${data.questionCount || 0} 条。`);
      appendLog(`RunId: ${data.collectionRunId || "未返回"}`);
      appendLog(`第一条：${samples[0]?.title || "未命名"}；${metricLabel(samples[0])}`);
      setMonitor("已完成", "Longka 雷达采集完成", `找到 ${samples.length} 条真实源头帖`, 100);
      renderTopicsFromSamples(samples, "本次真实采集到");
      $("#topicsPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      const message = error?.data?.stage ? `阶段：${error.data.stage}；${error.message}` : error.message;
      appendLog(`采集失败：${message}`);
      setMonitor("失败", "Longka 雷达采集失败", message, 100);
      renderNeedCollection(message);
    } finally {
      window.clearInterval(heartbeat);
    }
  }

  function bindCleanButtons() {
    const find = $("#findTopics");
    if (find && find.dataset.materialFlowClean !== "1") {
      const button = find.cloneNode(true);
      button.dataset.materialFlowClean = "1";
      button.textContent = "帮我找选题";
      button.addEventListener("click", findTopicsFromLocalAssets, true);
      find.replaceWith(button);
    }
    const collect = $("#collectNewMaterial");
    if (collect && collect.dataset.materialFlowClean !== "1") {
      const button = collect.cloneNode(true);
      button.dataset.materialFlowClean = "1";
      button.textContent = "采集新素材";
      button.addEventListener("click", collectFreshMaterial, true);
      collect.replaceWith(button);
    }
  }

  function setXhsCdpStatus(message, isError = false) {
    const node = $("#xhsCdpStatus");
    if (!node) return;
    node.textContent = message;
    node.classList.toggle("error", Boolean(isError));
  }

  function installXhsCdpPanel() {
    const actions = document.querySelector(".input-actions");
    if (!actions || document.querySelector("#xhsCdpLoginPanel")) return;
    actions.insertAdjacentHTML("afterend", `<div id="xhsCdpLoginPanel" class="xhs-cdp-login-panel">
      <div>
        <b>小红书采集状态</b>
        <p>采集新素材前，先打开独立 Chrome 窗口扫码登录小红书。读取 Cookie 成功后，再开始真实搜索和采集。</p>
        <small id="xhsCdpStatus">未读取 Cookie。</small>
      </div>
      <div class="xhs-cdp-actions">
        <button class="secondary" type="button" id="openXhsCdpBrowser">打开小红书登录窗口</button>
        <button class="primary" type="button" id="syncXhsCdpCookie">已扫码，读取 Cookie</button>
      </div>
    </div>`);
    $("#openXhsCdpBrowser")?.addEventListener("click", async () => {
      const button = $("#openXhsCdpBrowser");
      if (button) button.disabled = true;
      setXhsCdpStatus("正在弹出新的 Chrome 登录窗口...");
      try {
        const response = await fetch("/api/cdp/start-xhs-browser", { method: "POST" });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) throw new Error(data.message || "Chrome 启动失败");
        setXhsCdpStatus("Chrome 已弹出。请在新窗口扫码登录小红书，登录后点击“已扫码，读取 Cookie”。");
      } catch (error) {
        setXhsCdpStatus(error.message || "Chrome 启动失败", true);
      } finally {
        if (button) button.disabled = false;
      }
    });
    $("#syncXhsCdpCookie")?.addEventListener("click", async () => {
      const button = $("#syncXhsCdpCookie");
      if (button) button.disabled = true;
      setXhsCdpStatus("正在从 CDP Chrome 读取小红书 Cookie...");
      try {
        const response = await fetch("/api/cdp/sync-xhs-cookie", { method: "POST" });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) throw new Error(data.message || "Cookie 读取失败");
        setXhsCdpStatus(`Cookie 已写入 MediaCrawler 账号池，共读取 ${data.cookieCount || 0} 个 Cookie。现在可以开始真实采集。`);
      } catch (error) {
        setXhsCdpStatus(error.message || "Cookie 读取失败，请确认新 Chrome 已登录小红书。", true);
      } finally {
        if (button) button.disabled = false;
      }
    });
  }

  window.longkaMaterialFlow = {
    findTopicsFromLocalAssets,
    collectFreshMaterial,
  };

  bindCleanButtons();
  installXhsCdpPanel();
  window.addEventListener("load", bindCleanButtons);
  window.addEventListener("load", installXhsCdpPanel);
})();
