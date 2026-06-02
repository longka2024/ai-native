// Clean content action panel.
// Web action: generate draft -> diagnose -> improve -> compare -> confirm.
(function installLongkaContentActionPanel() {
  const $ = (selector) => document.querySelector(selector);
  const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
  const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  const state = {
    blueprint: null,
    draft: null,
    improved: null,
    review: null,
    improvedReview: null,
    selected: "draft",
    loadingTimer: null,
    loadingIndex: 0,
    history: new Map(),
  };

  const loadingLines = [
    "正在绑定你选中的源头帖、评论问题和标题路线",
    "正在按写作任务书生成正文，不使用本地固定模板",
    "正在检查开头、痛点、收藏价值、转化入口和合规边界",
    "正在检查机器味、套话、百科堆砌和只换标题的问题",
    "如果接口失败，系统会停在这里，不会偷偷生成假文案",
  ];

  function activeSource() {
    return window.longkaSelectedSource || window.activeTopic?.evidence?.sourcePosts?.[0] || window.activeTopic || {};
  }

  function sourceKey() {
    const source = activeSource();
    return clean(source.url || source.noteUrl || source.sourceUrl || source.id || source.title || window.activeTopic?.title || "source");
  }

  function blueprintKey(blueprint) {
    return [
      sourceKey(),
      clean(blueprint?.selectedTitle || blueprint?.title || window.longkaSelectedTitleFormula?.title || ""),
      clean(blueprint?.mainQuestion || blueprint?.selectedQuestion || window.longkaSelectedTitleFormula?.question || ""),
    ].join("::");
  }

  function saveCurrentVersion() {
    if (!state.blueprint || !state.draft) return;
    state.history.set(blueprintKey(state.blueprint), {
      blueprint: state.blueprint,
      draft: state.draft,
      improved: state.improved,
      review: state.review,
      improvedReview: state.improvedReview,
      selected: state.selected,
      savedAt: new Date().toLocaleTimeString(),
      displayTitle: clean(state.blueprint?.selectedTitle || state.blueprint?.title || state.draft?.title || "未命名文案"),
    });
    window.longkaCopyDraftHistory = Array.from(state.history.values());
  }

  function restoreVersion(record) {
    state.blueprint = record.blueprint;
    state.draft = record.draft;
    state.improved = record.improved || null;
    state.review = record.review || null;
    state.improvedReview = record.improvedReview || null;
    state.selected = record.selected || "draft";
    renderResult();
  }

  function questionBankItems() {
    return Array.from(document.querySelectorAll("#step3QuestionBank .question-card"))
      .map((card) => clean(card.innerText))
      .filter(Boolean)
      .slice(0, 12);
  }

  function metricValue(metrics, keys) {
    for (const key of keys) {
      if (metrics?.[key] !== undefined && metrics?.[key] !== null && metrics?.[key] !== "") return metrics[key];
    }
    return 0;
  }

  function buildPayload(blueprint, extra = {}) {
    const source = activeSource();
    const metrics = source.metrics || window.activeTopic?.metrics || {};
    const selectedTitle = clean(blueprint?.selectedTitle || blueprint?.title || window.longkaSelectedTitleFormula?.title || "");
    const comments = source.comments || questionBankItems();
    return {
      industry: $("#industry")?.value || $("#profileIndustry")?.value || "",
      businessGoal: $("#businessGoal")?.value || $("#profileGoal")?.value || "",
      keyword: $("#topic")?.value || "",
      platform: "xiaohongshu",
      publish: "xhs",
      selectedFormat: "小红书图文",
      selectedTitle,
      topic: {
        title: selectedTitle,
        pain: clean(blueprint?.mainQuestion || blueprint?.selectedQuestion || window.longkaSelectedTitleFormula?.question || ""),
        reason: clean(blueprint?.trustProof || source.reason || source.summary || ""),
        rewrite: Array.isArray(blueprint?.bodyStructure) ? blueprint.bodyStructure.join(" -> ") : clean(blueprint?.bodyStructure || ""),
        risk: Array.isArray(blueprint?.compliance) ? blueprint.compliance.join("；") : clean(blueprint?.compliance || ""),
        fit: "小红书图文",
        metrics: {
          likes: metricValue(metrics, ["likes", "like", "likedCount"]),
          collects: metricValue(metrics, ["collects", "saves", "collect", "collectedCount"]),
          comments: metricValue(metrics, ["comments", "comment", "commentCount"]),
          shares: metricValue(metrics, ["shares", "share", "shareCount"]),
        },
        sources: [{
          title: source.title || window.activeTopic?.title || "",
          platform: source.platform || "xiaohongshu",
          url: source.url || source.noteUrl || source.sourceUrl || "",
          summary: source.summary || source.reason || window.activeTopic?.reason || "",
          metrics,
          comments,
        }],
      },
      sourcePost: {
        platform: source.platform || "xiaohongshu",
        title: source.title || window.activeTopic?.title || "",
        url: source.url || source.noteUrl || source.sourceUrl || "",
        summary: source.summary || source.reason || window.activeTopic?.reason || "",
        metrics,
        comments,
      },
      comments,
      copyBlueprint: blueprint || {},
      contentStrategy: blueprint?.contentStrategy || blueprint || {},
      qualityGate: {
        mustBindSource: true,
        mustUseQuestionBank: true,
        noLocalFallback: true,
        titleChangeRequiresNewBody: true,
        improvementMustChangeBody: true,
      },
      ...extra,
    };
  }

  async function requestDraft(blueprint, extra = {}) {
    const response = await fetch("/api/content-draft/rewrite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload(blueprint, extra)),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.message || data.error || `文案接口失败：HTTP ${response.status}`);
    const draft = data.draft || {};
    const body = clean(draft.xhsCopy?.body || draft.body || "");
    const title = clean(draft.xhsCopy?.title || draft.title || blueprint?.selectedTitle || blueprint?.title || "");
    if (body.length < 180) throw new Error("文案接口没有返回可验收正文。系统没有使用本地固定模板兜底。");
    return { title, body, raw: draft };
  }

  function localReview(draft, blueprint, round = 1) {
    const engine = window.LongkaContentCreationBase;
    if (engine?.runEditorialReview) {
      return engine.runEditorialReview({
        draft: draft.body,
        brief: blueprint?.contentStrategy || blueprint || {},
        round,
      });
    }
    const body = clean(draft.body);
    const issues = [];
    if (/我长斑快10年|我们中心|免费检测|帮你看看/.test(body)) issues.push("出现虚构经历或门店承诺");
    if (/1[.、].*2[.、].*3[.、].*4[.、]/s.test(body) && /雀斑|晒斑|黄褐斑|老年斑/.test(body)) issues.push("容易变成分类百科");
    if (/总的来说|核心在于|底层逻辑|闭环|赋能/.test(body)) issues.push("机器味表达偏重");
    if (!/评论|很多人问|你是不是|先别|分不清|纠结/.test(body.slice(0, 160))) issues.push("开头没有贴近真实问题");
    const score = Math.max(3, 9 - issues.length * 1.5);
    return {
      passed: score >= 8,
      score: Math.round(score),
      stopReason: issues.length ? "需要继续优化，不能直接进入生产。" : "可以进入人工确认。",
      rewriteBrief: issues.length ? issues : ["压缩开头，保留真实问题，强化低压行动入口。"],
    };
  }

  function stopLoading() {
    if (state.loadingTimer) clearInterval(state.loadingTimer);
    state.loadingTimer = null;
  }

  function renderShell(status = "准备生成正文") {
    const panel = $("#decisionPanel");
    if (!panel) return null;
    $("#longkaContentActionPanel")?.remove();
    panel.insertAdjacentHTML("beforeend", `<article class="analysis-card step6-copy-review" id="longkaContentActionPanel">
      <span>第六步：正文生成 + 编辑部体检</span>
      <h2>${escapeHtml(status)}</h2>
      <p class="import-help">这里把“写作任务书 -> 正文 -> 体检 -> 优化 -> 确认”变成网页动作。文案未确认前，图片、视频、打包继续锁定。</p>
      <div class="console-steps" id="contentActionSteps">
        <li class="running">${escapeHtml(loadingLines[0])}</li>
        <li class="wait">${escapeHtml(loadingLines[1])}</li>
        <li class="wait">${escapeHtml(loadingLines[2])}</li>
      </div>
    </article>`);
    return $("#longkaContentActionPanel");
  }

  function startLoading() {
    stopLoading();
    state.loadingIndex = 0;
    state.loadingTimer = setInterval(() => {
      state.loadingIndex = (state.loadingIndex + 1) % loadingLines.length;
      const steps = $("#contentActionSteps");
      if (!steps) return;
      steps.innerHTML = loadingLines.map((line, index) => (
        `<li class="${index === state.loadingIndex ? "running" : index < state.loadingIndex ? "done" : "wait"}">${escapeHtml(line)}</li>`
      )).join("");
    }, 1800);
  }

  function scoreText(review) {
    if (!review) return "待体检";
    const value = Number.isFinite(review.score) ? review.score : review.gate?.score;
    return Number.isFinite(value) ? `${value}/10` : "已体检";
  }

  function reviewHtml(review) {
    const lines = review?.rewriteBrief || review?.blockers || review?.gate?.rewriteDirections || [];
    return `<div class="copy-quality-slot">
      <div class="quality-head">
        <b>编辑部体检：${escapeHtml(scoreText(review))}</b>
        <span>${review?.passed || review?.ok ? "可人工确认" : "建议先优化"}</span>
      </div>
      <div class="step6-exp-note">
        <b>${escapeHtml(review?.stopReason || "根据标题、源头帖、评论问题和写作任务书检查正文质量。")}</b>
        ${lines.length ? `<ol>${lines.slice(0, 8).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>` : ""}
      </div>
    </div>`;
  }

  function renderResult() {
    stopLoading();
    const box = $("#longkaContentActionPanel") || renderShell("正文已生成");
    if (!box || !state.draft) return;
    const selectedDraft = state.selected === "improved" && state.improved ? state.improved : state.draft;
    const selectedReview = state.selected === "improved" && state.improvedReview ? state.improvedReview : state.review;
    box.innerHTML = `<span>第六步：正文生成 + 编辑部体检</span>
      <h2>${escapeHtml(selectedDraft.title)}</h2>
      <p class="import-help">正文已绑定当前源头帖和选中标题。你可以先优化一版，对比后再确认最终文案。</p>
      <div class="step6-compare-grid">
        <div>
          <b>初稿 ${escapeHtml(scoreText(state.review))}</b>
          <textarea readonly class="step6-copy-text">${escapeHtml(state.draft.body)}</textarea>
          <button class="secondary ${state.selected === "draft" ? "selected" : ""}" type="button" data-content-version="draft">选择初稿</button>
        </div>
        <div>
          <b>优化稿 ${state.improved ? escapeHtml(scoreText(state.improvedReview)) : ""}</b>
          ${state.improved
            ? `<textarea readonly class="step6-copy-text">${escapeHtml(state.improved.body)}</textarea>
               <button class="secondary ${state.selected === "improved" ? "selected" : ""}" type="button" data-content-version="improved">选择优化稿</button>`
            : `<p class="import-help">点击“按体检建议优化一版”后，这里会显示新版本。优化失败不会用模板兜底。</p>`}
        </div>
      </div>
      ${historyHtml()}
      ${reviewHtml(selectedReview)}
      <div class="publish-target">
        <div>
          <b>下一步由你决定</b>
          <p>未点击“文案已确认”前，系统不会生成配图、视频或打包。</p>
        </div>
        <button class="secondary" type="button" id="improveContentCopy">按体检建议优化一版</button>
        <button class="primary" type="button" id="confirmContentCopy">文案已确认，进入生产准备</button>
      </div>`;

    box.querySelectorAll("[data-content-version]").forEach((button) => {
      button.addEventListener("click", () => {
        state.selected = button.dataset.contentVersion || "draft";
        renderResult();
      });
    });
    $("#improveContentCopy")?.addEventListener("click", runImprovement);
    box.querySelectorAll("[data-copy-history]").forEach((button) => {
      button.addEventListener("click", () => {
        const record = state.history.get(button.dataset.copyHistory);
        if (record) restoreVersion(record);
      });
    });
    $("#confirmContentCopy")?.addEventListener("click", () => {
      const finalDraft = state.selected === "improved" && state.improved ? state.improved : state.draft;
      const finalReview = state.selected === "improved" && state.improvedReview ? state.improvedReview : state.review;
      window.longkaApprovedCopy = {
        ...finalDraft,
        review: finalReview,
        blueprint: state.blueprint,
        selectedVersion: state.selected,
      };
      saveCurrentVersion();
      document.dispatchEvent(new CustomEvent("longka:step6-confirmed", { detail: window.longkaApprovedCopy }));
    });
  }

  function historyHtml() {
    const records = Array.from(state.history.entries());
    if (!records.length) {
      return `<div class="step6-exp-note">
        <b>已生成文案记录</b>
        <p>当前标题生成完成后会自动保存。你换标题重写后，可以从这里切回上一版。</p>
      </div>`;
    }
    return `<div class="step6-exp-note">
      <b>已生成文案记录</b>
      <div class="title-formula-grid">
        ${records.slice(-8).reverse().map(([key, record]) => `<button class="title-formula-card" type="button" data-copy-history="${escapeHtml(key)}">
          <span>${escapeHtml(record.savedAt || "已保存")}</span>
          <h3>${escapeHtml(record.displayTitle || record.blueprint?.selectedTitle || record.draft?.title || "未命名文案")}</h3>
          <p>${escapeHtml(record.selected === "improved" ? "已保存优化稿" : "已保存初稿")}</p>
        </button>`).join("")}
      </div>
    </div>`;
  }

  function renderError(error) {
    stopLoading();
    const box = $("#longkaContentActionPanel") || renderShell("正文生成失败");
    if (!box) return;
    box.innerHTML = `<span>第六步：正文生成 + 编辑部体检</span>
      <h2>正文生成失败</h2>
      <p class="import-help">${escapeHtml(error.message || "文案接口失败")}</p>
      <p>系统没有使用本地固定模板文案。图片、视频、打包继续锁定。请检查模型配置、接口返回或重新选择源头帖。</p>`;
  }

  async function runImprovement() {
    const button = $("#improveContentCopy");
    if (!button || !state.draft) return;
    button.disabled = true;
    button.textContent = "正在按体检建议优化...";
    try {
      const review = state.review || localReview(state.draft, state.blueprint, 1);
      const improved = await requestDraft(state.blueprint, {
        improvementMode: true,
        originalDraft: state.draft,
        originalReview: review,
        improvementDirections: review.rewriteBrief || review.blockers || [],
        task: [
          "请根据编辑部体检建议优化一版。",
          "必须改变开头切入、表达节奏和正文组织方式。",
          "必须继续绑定源头帖、评论问题、选中标题和写作任务书。",
          "禁止只换标题、只换同义词、复用初稿主体结构。",
          "禁止虚构亲身经历、医生身份、门店服务、免费检测和确定性效果承诺。",
        ].join("\n"),
      });
      if (clean(improved.body) === clean(state.draft.body)) throw new Error("优化稿与初稿完全相同，系统拒绝把它当成有效优化。");
      state.improved = improved;
      state.improvedReview = localReview(improved, state.blueprint, 2);
      state.selected = "improved";
      saveCurrentVersion();
      renderResult();
    } catch (error) {
      button.disabled = false;
      button.textContent = "按体检建议优化一版";
      const box = $("#longkaContentActionPanel");
      box?.insertAdjacentHTML("beforeend", `<p class="import-help">优化失败：${escapeHtml(error.message || "文案接口失败")}。系统没有使用本地模板兜底。</p>`);
    }
  }

  async function runContentAction(blueprint) {
    saveCurrentVersion();
    state.blueprint = blueprint || window.longkaCopyBlueprint || {};
    const cached = state.history.get(blueprintKey(state.blueprint));
    if (cached) {
      restoreVersion(cached);
      $("#longkaContentActionPanel")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }
    state.draft = null;
    state.improved = null;
    state.review = null;
    state.improvedReview = null;
    state.selected = "draft";
    const box = renderShell("正在生成正文");
    box?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    startLoading();
    try {
      state.draft = await requestDraft(state.blueprint);
      state.review = localReview(state.draft, state.blueprint, 1);
      saveCurrentVersion();
      renderResult();
    } catch (error) {
      renderError(error);
    }
  }

  window.longkaRunContentActionPanel = runContentAction;

  const nativeDispatchEvent = document.dispatchEvent.bind(document);
  document.dispatchEvent = function dispatchWithContentAction(event) {
    if (event?.type === "longka:step5-confirmed") {
      window.setTimeout(() => runContentAction(event.detail || window.longkaCopyBlueprint), 0);
    }
    return nativeDispatchEvent(event);
  };
})();
