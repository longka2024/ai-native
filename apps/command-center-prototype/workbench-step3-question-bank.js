// Longka AI Native step-3 creative angle gate.
// Customer questions are asset deposits here, not a hard blocker for every article.
(function installLongkaStep3CreativeAngles() {
  const $ = window.$ || ((selector) => document.querySelector(selector));
  const escapeHtml = window.escapeHtml || ((value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;"));

  function clean(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
  }

  function metricsOf(source = {}) {
    const metrics = source.metrics || {};
    const number = (value) => {
      const next = Number(value || 0);
      return Number.isFinite(next) ? next : 0;
    };
    return {
      likes: number(metrics.likes ?? metrics.likeCount ?? metrics.likedCount),
      saves: number(metrics.saves ?? metrics.collects ?? metrics.collectedCount),
      comments: number(metrics.comments ?? metrics.commentCount),
      shares: number(metrics.shares ?? metrics.shareCount),
    };
  }

  function inferQuestion(text, keyword = "这个问题") {
    const value = clean(text);
    if (!value) return "";
    if (/怎么|如何|能不能|可不可以|适合|是不是|要不要|多久|多少钱|哪种|哪个|区别|为什么|吗|\?/.test(value)) return value;
    if (/分清|判断|类型|区别/.test(value)) return `${keyword}到底应该怎么判断？`;
    if (/没效果|反复|踩坑|白花/.test(value)) return `${keyword}为什么做了还是没效果？`;
    if (/风险|敏感|反黑|副作用/.test(value)) return `${keyword}会不会有风险，什么情况不适合做？`;
    return value.length > 36 ? `${value.slice(0, 34)}……用户真正想问什么？` : `${value}，用户真正想问什么？`;
  }

  function angleType(text) {
    if (/哪种|类型|区别|判断|分清|自查/.test(text)) return "自查判断角度";
    if (/没效果|反复|白花|踩坑/.test(text)) return "避坑纠错角度";
    if (/风险|反黑|副作用|敏感|不适合/.test(text)) return "风险边界角度";
    if (/多少钱|值不值|买不买|做不做|项目|产品/.test(text)) return "决策降低角度";
    if (/怎么|如何|步骤|流程/.test(text)) return "方法步骤角度";
    return "观点拆解角度";
  }

  function buildAngles(topic = window.activeTopic || {}) {
    const source = topic?.evidence?.sourcePosts?.[0] || {};
    const keyword = clean($("#topic")?.value || topic?.title || "");
    const metrics = metricsOf(source);
    const comments = Array.isArray(topic?.evidence?.comments) ? topic.evidence.comments.map(clean).filter(Boolean) : [];
    const evidenceLevel = comments.length ? "strong-comment-evidence" : "source-only-evidence";
    const seeds = comments.length ? comments : [
      topic?.pain,
      topic?.reason,
      topic?.title,
      source.title,
      source.summary,
    ].map(clean).filter(Boolean);

    const unique = new Map();
    seeds.forEach((seed) => {
      const question = inferQuestion(seed, keyword);
      if (!question) return;
      const key = question.replace(/[，。？！?.、\s]/g, "");
      if (unique.has(key)) return;
      unique.set(key, {
        question,
        angle: angleType(question),
        sourceText: seed,
        evidenceLevel,
        sourceTitle: source.title || topic?.title || "",
        sourceUrl: source.url || "",
        keyword,
        metrics,
      });
    });

    if (!unique.size) {
      unique.set("source-structure", {
        question: `${keyword || "当前主题"}还能从哪个角度重新讲？`,
        angle: "爆款结构仿写角度",
        sourceText: topic?.title || source.title || "当前源头帖",
        evidenceLevel,
        sourceTitle: source.title || topic?.title || "",
        sourceUrl: source.url || "",
        keyword,
        metrics,
      });
    }
    return Array.from(unique.values()).slice(0, 12);
  }

  function evidenceLabel(level) {
    return level === "strong-comment-evidence"
      ? "评论区强信号：同步沉淀到客户问题库"
      : "评论证据不足：先用标题、正文结构和互动数据推导，建议后续补抓评论";
  }

  function renderCreativeAngles(topic = window.activeTopic || {}) {
    const panel = $("#decisionPanel");
    if (!panel) return;
    const old = $("#step3QuestionBank");
    if (old) old.remove();
    const angles = buildAngles(topic);
    const source = topic?.evidence?.sourcePosts?.[0] || {};
    const hasComments = angles.some((item) => item.evidenceLevel === "strong-comment-evidence");
    panel.hidden = false;
    panel.insertAdjacentHTML("beforeend", `<article class="analysis-card step3-question-bank" id="step3QuestionBank">
      <span>第三步：创作角度生成</span>
      <h2>从源头样本提炼可写角度</h2>
      <p class="import-help">客户问题库是左侧内容资产库的长期资产，不是每次创作的硬阻断。这里会把评论问题同步沉淀为资产；如果暂时没有评论，也可以基于源头帖结构、标题和互动数据生成创作角度，但会标明证据不足。</p>
      <div class="question-bank-grid">
        ${angles.map((item) => `<div class="question-card" data-creative-angle="${escapeHtml(item.angle)}">
          <b>${escapeHtml(item.angle)} · ${escapeHtml(evidenceLabel(item.evidenceLevel))}</b>
          <h3>${escapeHtml(item.question)}</h3>
          <p>${escapeHtml(item.sourceText)}</p>
          <small>来源：${escapeHtml(item.sourceTitle || "当前源头帖")}</small>
          <small>赞 ${item.metrics.likes} / 藏 ${item.metrics.saves} / 评 ${item.metrics.comments} / 转 ${item.metrics.shares}</small>
          ${item.sourceUrl ? `<a href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noreferrer">打开原帖</a>` : ""}
        </div>`).join("")}
      </div>
      <div class="publish-target">
        <div>
          <b>下一步：标题候选</b>
          <p>${hasComments ? "已提炼评论区问题，并会同步作为客户问题资产。" : "当前没有评论区强信号，不阻断创作；建议后续补抓评论，让客户问题库越来越丰满。"}</p>
        </div>
        <button class="primary" type="button" id="confirmStep3QuestionBank">确认创作角度，进入标题候选</button>
      </div>
    </article>`);
    $("#confirmStep3QuestionBank")?.addEventListener("click", () => {
      const hint = $("#topicHint");
      if (hint) hint.textContent = "第 3 步已确认。下一步生成标题候选；客户问题会作为资产沉淀，不再作为主流程硬阻断。";
    });
  }

  window.longkaRenderStep3QuestionBank = renderCreativeAngles;

  document.addEventListener("click", (event) => {
    if (!event.target.closest?.("#confirmStep2Deconstruction")) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    renderCreativeAngles(window.activeTopic || {});
    $("#step3QuestionBank")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, true);
})();
