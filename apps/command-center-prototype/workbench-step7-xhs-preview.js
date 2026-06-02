// Step 7 XHS card preview.
// Shows a production-ready card plan after copy confirmation, without generating images/videos.
(function installStep7XhsPreview() {
  const $ = (selector) => document.querySelector(selector);
  const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
  const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  function bodyText(approved) {
    return clean(approved?.body || approved?.raw?.xhsCopy?.body || approved?.raw?.body || "");
  }

  function titleText(approved) {
    return clean(approved?.title || approved?.blueprint?.selectedTitle || window.longkaSelectedTitleFormula?.title || "");
  }

  function sourceText(approved) {
    return clean(approved?.blueprint?.sourceTitle || window.longkaSelectedSource?.title || window.activeTopic?.title || "");
  }

  function extractLines(body) {
    return body
      .split(/\n+/)
      .map((line) => clean(line.replace(/^[-\d.、\s]+/, "")))
      .filter((line) => line && !/^#/.test(line) && !/^标签/.test(line))
      .slice(0, 12);
  }

  function cardPlan(approved) {
    const title = titleText(approved) || "已确认文案";
    const lines = extractLines(bodyText(approved));
    const opening = lines[0] || "先把客户最关心的问题说清楚。";
    const pointLines = lines.filter((line) => /先|看|判断|如果|不是|而是|第一|第二|第三|1|2|3/.test(line));
    const riskLine = lines.find((line) => /不承诺|因人而异|专业|评估|检测|风险|不要|先别/.test(line)) || "不做效果承诺，先判断再行动。";
    const actionLine = [...lines].reverse().find((line) => /收藏|对照|咨询|评估|下一步|决定|先/.test(line)) || "先收藏对照，再决定下一步。";
    return [
      { type: "封面", title, text: "一句话点破痛点，保留大字标题，适合 3:4 封面。" },
      { type: "痛点卡", title: "为什么很多人会卡住", text: opening },
      { type: "判断卡", title: "先看 3 个判断点", text: pointLines.slice(0, 3).join(" / ") || "近期状态 / 变化速度 / 颜色和位置" },
      { type: "风险卡", title: "不要直接照搬别人的做法", text: riskLine },
      { type: "行动卡", title: "下一步怎么做", text: actionLine },
    ];
  }

  function promptFor(card, index) {
    const industry = clean($("#industry")?.value || $("#profileIndustry")?.value || "美业护肤");
    const keyword = clean($("#topic")?.value || "业务关键词");
    return [
      `${industry} ${keyword} 小红书图文卡片，第 ${index + 1} 页：${card.type}`,
      "3:4 竖版，干净专业，留白充足，文字区域清晰",
      "风格：浅色编辑感卡片，适合美容护肤客户收藏",
      "禁止：疗效承诺、夸张对比、盗用竞品原图、医疗诊断语气",
    ].join("；");
  }

  function visualRoutes(cards) {
    return [
      {
        id: "editorial-card",
        name: "龙咖高级卡片",
        fit: "最适合直接发小红书图文，走归藏式编辑感排版。",
        style: "Editorial Magazine / Swiss clean",
        output: "3:4 封面 + 4 张正文信息卡",
        risk: "文字需要压缩，每张卡只放一个观点。",
        prompt: [
          "小红书 3:4 社交卡片组，编辑杂志感，浅色纸感背景，深绿色标题，信息层级清楚。",
          `页面结构：${cards.map((card) => `${card.type}:${card.title}`).join("；")}`,
          "每页只表达一个观点，中文大字清晰，适合手机端阅读。",
          "禁止使用竞品原图、疗效承诺、夸张前后对比。",
        ].join("\n"),
      },
      {
        id: "infographic",
        name: "龙咖知识图卡",
        fit: "适合护肤判断、自查清单、流程说明，信息密度更高。",
        style: "小红书信息图 / fresh + flow",
        output: "封面 + 判断流程卡 + 风险提醒卡 + 行动入口卡",
        risk: "不要把长正文塞进图里，要改成短标签和流程。",
        prompt: [
          "小红书信息图系列，fresh 风格，flow 布局，清爽、专业、易收藏。",
          "用 3-5 个模块表达判断流程，使用箭头、编号、短标签。",
          `核心模块：${cards.map((card) => card.title).join(" / ")}`,
          "禁止长段落、花哨装饰、医疗诊断语气。",
        ].join("\n"),
      },
      {
        id: "ai-visual",
        name: "龙咖 AI 配图",
        fit: "适合后续需要实景或卡通素材，提高淡斑/护肤主题相关性。",
        style: "GPT-Image2 infographic-engine / poster-layout-system",
        output: "封面主视觉、流程插画、护肤场景图",
        risk: "AI 图容易假，需要限制文字、人物、疗效暗示和皮肤细节。",
        prompt: [
          "为美容护肤小红书图文生成主题相关配图，3:4 竖版。",
          "画面：干净护肤咨询场景，桌面有皮肤状态记录卡、防晒、修护产品剪影，不出现品牌商标。",
          "风格：真实但不过度医疗化，浅色自然光，中文标题区域留白。",
          "约束：不展示夸张斑点前后对比，不暗示治愈，不生成难以阅读的小字。",
        ].join("\n"),
      },
    ];
  }

  function videoBrief(approved) {
    const title = titleText(approved);
    const lines = extractLines(bodyText(approved));
    return [
      { time: "0-3 秒", shot: "封面大字 + 痛点停顿", voice: lines[0] || title },
      { time: "3-10 秒", shot: "评论问题或客户场景", voice: "把用户最关心的问题说成人话，不急着卖项目。" },
      { time: "10-35 秒", shot: "三张判断卡依次出现", voice: "按已确认正文提炼 2-3 个判断标准。" },
      { time: "35-50 秒", shot: "风险边界卡", voice: "说明因人而异，先判断再决定下一步。" },
      { time: "50-58 秒", shot: "行动入口卡", voice: "引导收藏、对照或做一次低压评估。" },
    ];
  }

  function render(approved) {
    const panel = $("#decisionPanel");
    if (!panel) return;
    $("#step7ProductionBrief")?.remove();
    $("#step7XhsPreview")?.remove();

    const title = titleText(approved);
    const source = sourceText(approved);
    const body = bodyText(approved);
    const cards = cardPlan(approved);
    const script = videoBrief(approved);
    const routes = visualRoutes(cards);

    panel.insertAdjacentHTML("beforeend", `<article class="analysis-card step7-xhs-preview" id="step7XhsPreview">
      <span>第七步：图文卡片组预览</span>
      <h2>${escapeHtml(title || "已确认文案")}</h2>
      <p class="import-help">文案已确认。这里先把正文拆成可验收的小红书卡片组和视频脚本草稿；当前不会直接生成图片、不会生成视频、不会打包。</p>

      <div class="deconstruct-grid">
        <div><b>已确认源头</b><p>${escapeHtml(source || "当前选中源头帖")}</p></div>
        <div><b>正文长度</b><p>${body.length} 字</p></div>
        <div><b>卡片数量</b><p>${cards.length} 张：封面 / 痛点 / 判断 / 风险 / 行动</p></div>
        <div><b>生产门禁</b><p>生成图片或视频前，还要再次确认卡片方案。</p></div>
      </div>

      <div class="xhs-card-preview-grid">
        ${cards.map((card, index) => `<section class="xhs-preview-card ${index === 0 ? "cover" : ""}">
          <small>${String(index + 1).padStart(2, "0")} ${escapeHtml(card.type)}</small>
          <h3>${escapeHtml(card.title)}</h3>
          <p>${escapeHtml(card.text)}</p>
        </section>`).join("")}
      </div>

      <div class="visual-route-grid">
        ${routes.map((route, index) => `<button class="visual-route-card ${index === 0 ? "selected" : ""}" type="button" data-visual-route="${escapeHtml(route.id)}">
          <span>${escapeHtml(route.name)}</span>
          <h3>${escapeHtml(route.output)}</h3>
          <p>${escapeHtml(route.fit)}</p>
          <small>${escapeHtml(route.style)}</small>
        </button>`).join("")}
      </div>

      <div class="deconstruct-lists">
        <div>
          <b>单页配图提示词草稿</b>
          <ol>${cards.map((card, index) => `<li>${escapeHtml(promptFor(card, index))}</li>`).join("")}</ol>
        </div>
        <div>
          <b>制图方案提示词</b>
          <ol id="visualRoutePromptList">${routes.map((route) => `<li><b>${escapeHtml(route.name)}</b><br><small>${escapeHtml(route.prompt)}</small><br><small>风险：${escapeHtml(route.risk)}</small></li>`).join("")}</ol>
        </div>
      </div>

      <div class="deconstruct-lists">
        <div>
          <b>小妹视频工作台脚本草稿</b>
          <ol>${script.map((item) => `<li><b>${escapeHtml(item.time)}</b> ${escapeHtml(item.shot)}：${escapeHtml(item.voice)}</li>`).join("")}</ol>
        </div>
      </div>

      <div class="publish-target">
        <div>
          <b>下一步：先确认卡片方案</b>
          <p>确认后才进入真实图文卡片生成或小妹视频任务。当前只是预览和制作说明。</p>
        </div>
        <button class="secondary" type="button" id="copyXhsCardPlan">复制卡片方案</button>
        <button class="primary" type="button" id="approveXhsCardPlan">生成可发小红书 PNG 卡片</button>
      </div>
      <div class="step7-export-result" id="xhsCardExportResult" hidden></div>
    </article>`);

    let selectedRoute = routes[0];
    document.querySelectorAll("[data-visual-route]").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelectorAll("[data-visual-route]").forEach((node) => node.classList.remove("selected"));
        button.classList.add("selected");
        selectedRoute = routes.find((route) => route.id === button.dataset.visualRoute) || routes[0];
      });
    });

    $("#copyXhsCardPlan")?.addEventListener("click", async () => {
      const text = [
        `标题：${title}`,
        `源头：${source}`,
        "",
        "小红书卡片组：",
        ...cards.map((card, index) => `${index + 1}. ${card.type}｜${card.title}｜${card.text}`),
      ].join("\n");
      await navigator.clipboard?.writeText(text).catch(() => {});
    });

    $("#approveXhsCardPlan")?.addEventListener("click", async () => {
      const button = $("#approveXhsCardPlan");
      const resultBox = $("#xhsCardExportResult");
      if (button) {
        button.disabled = true;
        button.textContent = "正在生成 PNG 卡片...";
      }
      window.longkaApprovedXhsCardPlan = { title, source, body, cards, script, visualRoute: selectedRoute, approvedCopy: approved };
      const hint = $("#topicHint");
      if (hint) hint.textContent = "正在导出小红书 PNG 卡片。系统会生成本地文件路径，不会发布。";
      try {
        const response = await fetch("/api/xhs-cards/export-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(window.longkaApprovedXhsCardPlan),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) throw new Error(data.message || data.error || `HTTP ${response.status}`);
        const files = data.manifest?.files || [];
        if (resultBox) {
          resultBox.hidden = false;
          resultBox.innerHTML = `<b>PNG 卡片已生成</b>
            <p>共 ${files.length} 张，输出目录：${escapeHtml(files[0] ? files[0].replace(/\\xhs-card-01\.png$/, "") : "见 manifest")}</p>
            <ol>${files.map((file) => `<li>${escapeHtml(file)}</li>`).join("")}</ol>`;
        }
        if (button) button.textContent = "PNG 卡片已生成";
        document.dispatchEvent(new CustomEvent("longka:xhs-card-plan-confirmed", { detail: { ...window.longkaApprovedXhsCardPlan, manifest: data.manifest } }));
      } catch (error) {
        if (resultBox) {
          resultBox.hidden = false;
          resultBox.innerHTML = `<b>PNG 生成失败</b><p>${escapeHtml(error.message || "导出失败")}</p>`;
        }
        if (button) {
          button.disabled = false;
          button.textContent = "重新生成可发小红书 PNG 卡片";
        }
      }
    });

    $("#step7XhsPreview")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  window.longkaRenderXhsCardPreview = render;
  document.addEventListener("longka:step6-confirmed", (event) => {
    window.setTimeout(() => render(event.detail || window.longkaApprovedCopy), 0);
  });
})();
