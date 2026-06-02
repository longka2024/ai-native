// Longka AI Native step-7 production preparation.
// Loaded after step-6. It shows production briefs after copy confirmation, but does not generate assets.
(function installLongkaStep7ProductionBrief() {
  const $ = window.$ || ((selector) => document.querySelector(selector));
  const escapeHtml = window.escapeHtml || ((value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;"));

  function clean(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
  }

  function approvedCopyText(approved) {
    return clean(approved?.body || approved?.raw?.xhsCopy?.body || approved?.raw?.body || "");
  }

  function sourceTitle(approved) {
    return clean(approved?.blueprint?.sourceTitle || window.longkaSelectedSource?.title || window.activeTopic?.title || "");
  }

  function selectedTitle(approved) {
    return clean(approved?.title || approved?.blueprint?.selectedTitle || window.longkaSelectedTitleFormula?.title || "");
  }

  function splitCards(body, title) {
    const shortTitle = title || "已确认文案";
    const points = body
      .split(/\n+/)
      .map(clean)
      .filter((line) => line && !/^#/.test(line))
      .slice(0, 6);
    return [
      `封面：${shortTitle}`,
      points[0] ? `痛点页：${points[0].slice(0, 36)}` : "痛点页：提炼正文开头的客户痛点",
      points[1] ? `判断页：${points[1].slice(0, 36)}` : "判断页：提炼正文里的判断标准",
      points[2] ? `行动页：${points[2].slice(0, 36)}` : "行动页：给客户一个低压下一步",
      "结尾页：先收藏/对照/咨询，再决定下一步",
    ];
  }

  function imagePrompts(cards, approved) {
    const industry = $("#industry")?.value || "当前行业";
    const keyword = $("#topic")?.value || "当前关键词";
    return cards.map((card, index) => ({
      page: index + 1,
      title: card,
      prompt: `${industry} ${keyword} 小红书图文卡片，第 ${index + 1} 页，干净专业，真实护肤/门店咨询语境，避免夸张疗效承诺，文字区清晰留白。`,
    }));
  }

  function videoScript(approved) {
    const title = selectedTitle(approved);
    const body = approvedCopyText(approved);
    const firstLine = clean(body.split(/\n+/).find(Boolean) || title);
    return [
      { time: "0-3 秒", shot: "封面大字 + 直接痛点", voice: firstLine || title },
      { time: "3-10 秒", shot: "真实场景/问题截图/评论问题", voice: "先把客户最关心的问题讲清楚，不急着卖项目。" },
      { time: "10-35 秒", shot: "三段判断卡或手写白板", voice: "按已确认正文提炼 2-3 个判断标准，逐条解释。" },
      { time: "35-50 秒", shot: "风险边界 + 正确下一步", voice: "强调因人而异，先判断再行动，不承诺结果。" },
      { time: "50-58 秒", shot: "结尾行动入口", voice: "引导收藏、对照、咨询或做一次评估。" },
    ];
  }

  function renderProductionBrief(approved) {
    const panel = $("#decisionPanel");
    if (!panel) return;
    $("#step7ProductionBrief")?.remove();

    const body = approvedCopyText(approved);
    const title = selectedTitle(approved);
    const cards = splitCards(body, title);
    const prompts = imagePrompts(cards, approved);
    const script = videoScript(approved);
    const source = sourceTitle(approved);

    panel.insertAdjacentHTML("beforeend", `<article class="analysis-card step7-production-brief" id="step7ProductionBrief">
      <span>第七步：确认后生产准备</span>
      <h2>${escapeHtml(title || "已确认文案")}</h2>
      <p class="import-help">这里不是直接生成图片或视频，只把已确认文案拆成可执行的图文卡片方案、配图提示词、视频脚本和小妹工作台任务草稿。真正生成前仍要展示来源、路径和证据。</p>

      <div class="deconstruct-grid">
        <div><b>已确认源头</b><p>${escapeHtml(source || "使用当前选中源头帖")}</p></div>
        <div><b>已确认标题</b><p>${escapeHtml(title || "等待标题")}</p></div>
        <div><b>正文长度</b><p>${body.length} 字</p></div>
        <div><b>生产状态</b><p>仅准备，不生成图片、不生成视频、不打包、不上线</p></div>
      </div>

      <div class="deconstruct-lists">
        <div>
          <b>小红书图文卡片方案</b>
          <ol>${cards.map((card) => `<li>${escapeHtml(card)}</li>`).join("")}</ol>
        </div>
        <div>
          <b>配图提示词草稿</b>
          <ol>${prompts.map((item) => `<li>${escapeHtml(item.title)}<br><small>${escapeHtml(item.prompt)}</small></li>`).join("")}</ol>
        </div>
      </div>

      <div class="deconstruct-lists">
        <div>
          <b>小妹视频工作台脚本草稿</b>
          <ol>${script.map((item) => `<li><b>${escapeHtml(item.time)}</b> ${escapeHtml(item.shot)}：${escapeHtml(item.voice)}</li>`).join("")}</ol>
        </div>
        <div>
          <b>下一步执行证据要求</b>
          <ol>
            <li>生成图文卡片前：显示使用的文案版本、卡片页数、输出目录。</li>
            <li>生成配图前：显示每张图的提示词、模型/工具、成本风险。</li>
            <li>交给小妹前：显示脚本、分镜、素材要求和任务文件路径。</li>
            <li>任何打包、上线、改服务器配置，必须再次确认。</li>
          </ol>
        </div>
      </div>

      <div class="publish-target">
        <div>
          <b>可进入下一轮人工选择</b>
          <p>你可以选择先做小红书卡片、先准备 AI 配图，或先整理小妹视频任务。当前页面没有触发真实生成。</p>
        </div>
        <button class="secondary" type="button" id="copyStep7Brief">复制生产准备草稿</button>
      </div>
    </article>`);

    $("#copyStep7Brief")?.addEventListener("click", async () => {
      const text = [
        `标题：${title}`,
        `源头：${source}`,
        "",
        "小红书图文卡片方案：",
        ...cards.map((item, index) => `${index + 1}. ${item}`),
        "",
        "小妹视频工作台脚本草稿：",
        ...script.map((item) => `${item.time}｜${item.shot}｜${item.voice}`),
      ].join("\n");
      try {
        await navigator.clipboard?.writeText(text);
        const hint = $("#topicHint");
        if (hint) hint.textContent = "第 7 步生产准备草稿已复制。当前仍未生成图片或视频。";
      } catch {
        const hint = $("#topicHint");
        if (hint) hint.textContent = "复制失败，但生产准备草稿已显示在页面。";
      }
    });

    $("#step7ProductionBrief")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  window.longkaRenderStep7ProductionBrief = renderProductionBrief;
  document.addEventListener("longka:step6-confirmed", (event) => {
    renderProductionBrief(event.detail || window.longkaApprovedCopy);
  });
})();
