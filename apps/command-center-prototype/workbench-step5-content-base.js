// Step 5 content-base bridge.
// Replaces the old scattered blueprint with a writing brief from content-creation-base.
(function installStep5ContentBaseBridge() {
  const $ = (selector) => document.querySelector(selector);
  const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

  function activeSource() {
    return window.longkaSelectedSource || window.activeTopic?.evidence?.sourcePosts?.[0] || window.activeTopic || {};
  }

  function questionLines() {
    return Array.from(document.querySelectorAll("#step3QuestionBank .question-card h3, #step3QuestionBank .question-card"))
      .map((node) => clean(node.textContent))
      .filter(Boolean)
      .slice(0, 8);
  }

  function buildBrief(titleItem) {
    const engine = window.LongkaContentCreationBase;
    if (!engine?.buildWritingBrief) throw new Error("内容生产基座未加载");
    const source = activeSource();
    const brief = engine.buildWritingBrief({
      source: {
        ...source,
        comments: source.comments || questionLines(),
        content: source.content || source.summary || source.reason || window.activeTopic?.reason || "",
      },
      title: titleItem?.title || "",
      industry: $("#industry")?.value || $("#profileIndustry")?.value || "",
      keyword: $("#topic")?.value || "",
      goal: $("#businessGoal")?.value || $("#profileGoal")?.value || "",
    });
    return {
      ...brief,
      selectedTitle: brief.title,
      formulaType: titleItem?.type || brief.trigger?.name || "",
      mainQuestion: brief.selectedQuestion,
      targetUser: titleItem?.audience || brief.trigger?.why || "",
      openingStrategy: brief.trigger?.opening || "",
      emotionalRoute: brief.emotionalRoute || [],
      bodyStructure: brief.structure || [],
      trustProof: brief.sourceValue,
      commentUsage: brief.selectedQuestion,
      actionEntry: brief.cta,
      compliance: brief.avoid || [],
      contentStrategy: brief,
    };
  }

  function renderBrief(titleItem) {
    const panel = $("#decisionPanel");
    if (!panel || !titleItem) return;
    $("#step5CopyBlueprint")?.remove();
    const brief = buildBrief(titleItem);
    window.longkaCopyBlueprint = brief;

    panel.insertAdjacentHTML("beforeend", `<article class="analysis-card step5-copy-blueprint step5-content-base" id="step5CopyBlueprint">
      <span>第五步：写作任务书</span>
      <h2>${escapeHtml(brief.title)}</h2>
      <p class="import-help">这里不直接写正文。先把源头帖、客户问题、标题公式和写作模型定清楚，确认后才进入正文生成和编辑部体检。</p>
      <div class="analysis-grid">
        ${[
          ["标题触发器", `${brief.trigger.name}：${brief.trigger.why}`],
          ["写作模型", `${brief.framework.id} / ${brief.framework.name}`],
          ["本篇主问题", brief.selectedQuestion],
          ["源头证据", `${brief.sourceTitle || "已选源头帖"}；${brief.sourceValue}`],
          ["开头策略", brief.trigger.opening],
          ["行动入口", brief.cta],
        ].map(([name, value]) => `<div><b>${escapeHtml(name)}</b><p>${escapeHtml(value)}</p></div>`).join("")}
      </div>
      <div class="deconstruct-lists">
        <div>
          <b>写作模型段落功能</b>
          <ol>${brief.framework.paragraphs.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
        </div>
        <div>
          <b>正文结构</b>
          <ol>${brief.structure.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
        </div>
        <div>
          <b>必须避开</b>
          <ol>${brief.avoid.slice(0, 8).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
        </div>
        <div>
          <b>生成指令</b>
          <ol>${brief.draftInstruction.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
        </div>
      </div>
      <div class="publish-target">
        <div>
          <b>确认后进入正文生成</b>
          <p>正文生成后会进入 DBS Content 五维诊断和 AI 指纹检查。最多 3 轮，不合格就退回源头或选题。</p>
        </div>
        <button class="primary" type="button" id="confirmStep5Blueprint">确认任务书，生成正文</button>
      </div>
    </article>`);

    $("#confirmStep5Blueprint")?.addEventListener("click", () => {
      const hint = $("#topicHint");
      if (hint) hint.textContent = "第五步已确认。下一步生成正文，并进入编辑部体检。";
      document.dispatchEvent(new CustomEvent("longka:step5-confirmed", { detail: brief }));
    });
  }

  window.longkaRenderStep5CopyBlueprint = renderBrief;

  document.addEventListener("longka:step4-confirmed", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    renderBrief(event.detail || window.longkaSelectedTitleFormula);
    $("#step5CopyBlueprint")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, true);
})();
