// Longka AI Native step-4 title formula matcher.
// Loaded after step-3. It creates source-bound title choices without generating body copy.
(function installLongkaStep4TitleFormulas() {
  const $ = window.$ || ((selector) => document.querySelector(selector));
  const escapeHtml = window.escapeHtml || ((value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;"));

  function clean(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
  }

  function compact(value, limit = 18) {
    const text = clean(value);
    return text.length > limit ? text.slice(0, limit) : text;
  }

  function currentQuestions() {
    return Array.from(document.querySelectorAll("#step3QuestionBank .question-card h3"))
      .map((node) => clean(node.textContent))
      .filter(Boolean)
      .slice(0, 10);
  }

  function topicKeyword() {
    return clean($("#topic")?.value || window.activeTopic?.title || "这个问题");
  }

  function formulaFor(question, index) {
    const keyword = topicKeyword();
    const q = clean(question);
    const core = compact(keyword, 10);
    const shortQ = compact(q.replace(/[？?。!！]$/g, ""), 18);
    const variants = [
      {
        type: "恐惧/损失规避型",
        formula: "别急着 [行动]，先搞清 [风险]",
        title: `别急着做${core}，先搞清这件事`,
        why: "适合用户怕踩坑、怕白花钱的场景",
      },
      {
        type: "互动/测试型",
        formula: "敢不敢测一测，[问题]",
        title: `敢不敢测一测：${shortQ}`,
        why: "适合把评论问题变成自查互动",
      },
      {
        type: "场景/条件型",
        formula: "如果你 [状态]，先看 [判断标准]",
        title: `如果你也分不清${core}，先看这个判断标准`,
        why: "适合精准筛选有同类困惑的人",
      },
      {
        type: "认知冲突型",
        formula: "为什么 [常见做法] 反而可能 [坏结果]",
        title: `为什么你越急着做${core}，越容易走弯路`,
        why: "适合打破用户已有误区，制造停留",
      },
      {
        type: "数字锚定型",
        formula: "[数字] 个判断，帮你避开 [问题]",
        title: `${core}前先看 3 个判断`,
        why: "适合做小红书可收藏图文",
      },
      {
        type: "评论区问题型",
        formula: "评论区问最多的：[问题]",
        title: `评论区问最多的：${shortQ}`,
        why: "适合直接把真实评论变成选题入口",
      },
      {
        type: "避坑纠错型",
        formula: "很多人 [结果不好]，是因为 [第一步错]",
        title: `很多人${core}没效果，是因为第一步判断错了`,
        why: "适合承接失败经验和焦虑情绪",
      },
      {
        type: "决策降低型",
        formula: "先别买/做 [方案]，先确认 [条件]",
        title: `先别跟风做${core}，先确认你适不适合`,
        why: "适合把内容导向咨询或检测入口",
      },
    ];
    return variants[index % variants.length];
  }

  function buildTitles() {
    const questions = currentQuestions();
    const sourceTitle = clean(window.activeTopic?.title || "");
    const baseQuestions = questions.length ? questions : [
      `${topicKeyword()}到底应该怎么判断？`,
      `${topicKeyword()}为什么容易没效果？`,
      `${topicKeyword()}前最怕踩什么坑？`,
    ];
    const seen = new Set();
    const titles = [];
    baseQuestions.forEach((question, index) => {
      const item = formulaFor(question, index);
      if (seen.has(item.title)) return;
      seen.add(item.title);
      titles.push({
        ...item,
        question,
        sourceTitle,
        audience: "有同类困惑、准备做决定但还怕选错的人",
      });
    });
    while (titles.length < 6) {
      const item = formulaFor(`${topicKeyword()}还有哪些容易忽略的问题？`, titles.length);
      if (!seen.has(item.title)) {
        seen.add(item.title);
        titles.push({ ...item, question: `${topicKeyword()}还有哪些容易忽略的问题？`, sourceTitle, audience: "需要先收藏判断标准的人" });
      } else {
        break;
      }
    }
    return titles.slice(0, 10);
  }

  function renderTitles() {
    const panel = $("#decisionPanel");
    if (!panel) return;
    const old = $("#step4TitleFormulas");
    if (old) old.remove();
    const titles = buildTitles();
    panel.insertAdjacentHTML("beforeend", `<article class="analysis-card step4-title-formulas" id="step4TitleFormulas">
      <span>第四步：标题公式匹配</span>
      <h2>基于客户问题生成标题候选</h2>
      <p class="import-help">这里只生成标题候选，不生成正文。选择标题后，第 5 步才生成文案框架。</p>
      <div class="title-formula-grid">
        ${titles.map((item, index) => `<button class="title-formula-card" type="button" data-step4-title="${index}">
          <span>${escapeHtml(item.type)}</span>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.why)}</p>
          <small>公式：${escapeHtml(item.formula)}</small>
          <small>对应问题：${escapeHtml(item.question)}</small>
          <small>适合人群：${escapeHtml(item.audience)}</small>
        </button>`).join("")}
      </div>
      <div class="publish-target">
        <div>
          <b>下一步：文案框架</b>
          <p id="step4SelectedTitleHint">先选择一个标题。标题不同，下一步的主问题、结构和正文都必须不同。</p>
        </div>
        <button class="primary" type="button" id="confirmStep4Title" disabled>确认标题，生成文案框架</button>
      </div>
    </article>`);

    let selected = null;
    document.querySelectorAll("[data-step4-title]").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelectorAll("[data-step4-title]").forEach((node) => node.classList.remove("active"));
        button.classList.add("active");
        selected = titles[Number(button.dataset.step4Title)];
        window.longkaSelectedTitleFormula = selected;
        $("#step4SelectedTitleHint").textContent = `已选择：${selected.title}。下一步只生成框架，不生成正文。`;
        $("#confirmStep4Title").disabled = false;
      });
    });
    $("#confirmStep4Title")?.addEventListener("click", () => {
      if (!selected) return;
      const hint = $("#topicHint");
      if (hint) hint.textContent = "第 4 步已确认。下一步应生成文案框架；当前仍不生成正文、图片或视频。";
      document.dispatchEvent(new CustomEvent("longka:step4-confirmed", { detail: selected }));
    });
  }

  window.longkaRenderStep4TitleFormulas = renderTitles;

  document.addEventListener("click", (event) => {
    if (!event.target.closest?.("#confirmStep3QuestionBank")) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    renderTitles();
    $("#step4TitleFormulas")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, true);
})();
