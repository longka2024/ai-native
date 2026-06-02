// Longka AI Native step-5 copy blueprint.
// Loaded after step-4. It creates a source/question/title-bound framework before body copy.
(function installLongkaStep5CopyBlueprint() {
  const $ = window.$ || ((selector) => document.querySelector(selector));
  const escapeHtml = window.escapeHtml || ((value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;"));

  function clean(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
  }

  function selectedTitle() {
    return window.longkaSelectedTitleFormula || null;
  }

  function activeSource() {
    return window.activeTopic?.evidence?.sourcePosts?.[0] || {};
  }

  function questionLines() {
    return Array.from(document.querySelectorAll("#step3QuestionBank .question-card h3"))
      .map((node) => clean(node.textContent))
      .filter(Boolean)
      .slice(0, 5);
  }

  function titleIntent(titleItem = selectedTitle()) {
    const title = clean(titleItem?.title || "");
    const question = clean(titleItem?.question || questionLines()[0] || "");
    if (/别急|先别|走弯路|踩坑|白花/.test(title)) return "先拦住错误行动，再给判断标准";
    if (/评论区|问最多/.test(title)) return "从真实评论切入，让用户觉得这篇是在回答自己";
    if (/测一测|自查|判断/.test(title)) return "用自查结构提高收藏和互动";
    if (/为什么/.test(title)) return "制造认知冲突，再解释真正原因";
    if (/适不适合|确认/.test(title)) return "降低决策成本，引导咨询或检测";
    return question || "围绕客户主问题建立判断标准";
  }

  function openingStrategy(titleItem = selectedTitle()) {
    const intent = titleIntent(titleItem);
    if (/拦住|错误/.test(intent)) return "开头先指出常见错误做法，但不骂用户，马上解释为什么容易错。";
    if (/真实评论/.test(intent)) return "开头引用评论区主问题，让读者感觉这是从真实困惑里长出来的内容。";
    if (/自查/.test(intent)) return "开头给一个能立刻代入的自查场景，承诺看完能判断下一步。";
    if (/认知冲突/.test(intent)) return "开头提出反常识判断，但先留悬念，不直接把答案说完。";
    return "开头先讲用户正在纠结的具体场景，再给这篇内容的判断边界。";
  }

  function emotionalRoute(titleItem = selectedTitle()) {
    const question = clean(titleItem?.question || questionLines()[0] || "");
    if (/怕|担心|反黑|副作用|踩坑|白花/.test(question)) return ["担心", "看见风险", "获得判断标准", "愿意收藏或咨询"];
    if (/哪种|判断|分清|区别/.test(question)) return ["混乱", "被分类理清", "知道自己该看哪一步", "愿意继续评估"];
    if (/没效果|反复/.test(question)) return ["挫败", "发现第一步可能错了", "重新建立路径", "降低试错成本"];
    return ["有需求", "缺判断", "看到可执行标准", "进入下一步行动"];
  }

  function bodyStructure(titleItem = selectedTitle()) {
    const type = clean(titleItem?.type || "");
    if (/恐惧|避坑|损失/.test(type)) return ["错误行动前置", "为什么会踩坑", "判断标准", "风险边界", "低成本下一步"];
    if (/互动|测试/.test(type)) return ["评论问题开场", "自查问题", "结果解释", "适合/不适合", "收藏互动"];
    if (/数字/.test(type)) return ["先讲适用人群", "3 个判断", "每个判断的解释", "常见误区", "行动入口"];
    if (/认知冲突/.test(type)) return ["反常识开头", "拆掉旧认知", "给出新判断", "真实来源证据", "下一步建议"];
    return ["真实问题", "判断依据", "解决路径", "风险边界", "行动入口"];
  }

  function complianceBoundaries() {
    const text = `${$("#industry")?.value || ""} ${$("#topic")?.value || ""} ${selectedTitle()?.title || ""}`;
    const base = ["不照抄原帖标题和正文", "不冒充原帖案例", "不写确定性承诺"];
    if (/护肤|淡斑|斑|祛痘|抗衰|减肥|健康|项目|皮秒/.test(text)) base.push("不承诺治疗、根治、保证效果，不替代专业诊断");
    return base;
  }

  function imageDirection(titleItem = selectedTitle()) {
    const type = clean(titleItem?.type || "");
    if (/测试|数字|判断/.test(type)) return ["封面强问题", "自查问题卡", "判断流程卡", "风险提醒卡", "结尾行动卡"];
    if (/避坑|恐惧|损失/.test(type)) return ["封面警示句", "错误做法卡", "正确判断卡", "不适合人群卡", "收藏提醒卡"];
    return ["封面问题卡", "评论问题卡", "判断标准卡", "来源证据卡", "下一步行动卡"];
  }

  function buildBlueprint(titleItem = selectedTitle()) {
    const source = activeSource();
    const questions = questionLines();
    const mainQuestion = clean(titleItem?.question || questions[0] || "用户真正想问什么");
    return {
      selectedTitle: clean(titleItem?.title || ""),
      formulaType: clean(titleItem?.type || ""),
      mainQuestion,
      targetUser: clean(titleItem?.audience || "有同类困惑、准备做决定但还怕选错的人"),
      openingStrategy: openingStrategy(titleItem),
      emotionalRoute: emotionalRoute(titleItem),
      bodyStructure: bodyStructure(titleItem),
      trustProof: source.title ? `参考源头帖《${source.title}》，绑定真实互动数据和评论问题。` : "绑定第 1 步选中的真实/手动源头帖。",
      commentUsage: questions.length ? `正文必须至少回应这些问题中的 1-2 个：${questions.slice(0, 3).join("；")}` : "评论不足时，正文必须明确说明证据不足，不能假装有评论共识。",
      actionEntry: "先收藏判断标准；如果还分不清，再进入咨询、检测或到店评估。",
      compliance: complianceBoundaries(),
      imageDirection: imageDirection(titleItem),
    };
  }

  function renderBlueprint(titleItem = selectedTitle()) {
    const panel = $("#decisionPanel");
    if (!panel || !titleItem) return;
    const old = $("#step5CopyBlueprint");
    if (old) old.remove();
    const b = buildBlueprint(titleItem);
    window.longkaCopyBlueprint = b;
    panel.insertAdjacentHTML("beforeend", `<article class="analysis-card step5-copy-blueprint" id="step5CopyBlueprint">
      <span>第五步：文案框架</span>
      <h2>${escapeHtml(b.selectedTitle)}</h2>
      <p class="import-help">这里只生成框架，不生成正文。确认框架后，第 6 步才写正文并体检。</p>
      <div class="analysis-grid">
        ${[
          ["标题公式", b.formulaType],
          ["主问题", b.mainQuestion],
          ["目标人群", b.targetUser],
          ["开头策略", b.openingStrategy],
          ["信任证据", b.trustProof],
          ["评论如何进入正文", b.commentUsage],
          ["行动入口", b.actionEntry],
        ].map(([name, value]) => `<div><b>${escapeHtml(name)}</b><p>${escapeHtml(value)}</p></div>`).join("")}
      </div>
      <div class="deconstruct-lists">
        <div>
          <b>情绪路线</b>
          <ol>${b.emotionalRoute.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
        </div>
        <div>
          <b>正文结构</b>
          <ol>${b.bodyStructure.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
        </div>
        <div>
          <b>合规边界</b>
          <ol>${b.compliance.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
        </div>
        <div>
          <b>配图方向</b>
          <ol>${b.imageDirection.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
        </div>
      </div>
      <div class="publish-target">
        <div>
          <b>下一步：正文生成 + 体检进化</b>
          <p>确认框架后，才允许按这个框架生成正文。正文仍需体检和优化后才能确认。</p>
        </div>
        <button class="primary" type="button" id="confirmStep5Blueprint">确认框架，进入正文生成</button>
      </div>
    </article>`);
    $("#confirmStep5Blueprint")?.addEventListener("click", () => {
      const hint = $("#topicHint");
      if (hint) hint.textContent = "第 5 步已确认。下一步才允许生成正文并做文案体检。";
      document.dispatchEvent(new CustomEvent("longka:step5-confirmed", { detail: b }));
    });
  }

  window.longkaRenderStep5CopyBlueprint = renderBlueprint;

  document.addEventListener("longka:step4-confirmed", (event) => {
    renderBlueprint(event.detail);
    $("#step5CopyBlueprint")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
})();
