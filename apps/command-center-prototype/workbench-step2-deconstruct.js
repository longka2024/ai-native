// Longka AI Native step-2 deconstruction gate.
// Loaded after step-1 gate. It turns the selected source sample into a visible viral deconstruction.
(function installLongkaStep2Deconstruct() {
  const $ = window.$ || ((selector) => document.querySelector(selector));
  const escapeHtml = window.escapeHtml || ((value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;"));

  function clean(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
  }

  function metricsOf(sample = {}) {
    const metrics = sample.metrics || {};
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

  function firstComments(sample = {}, limit = 5) {
    return (Array.isArray(sample.comments) ? sample.comments : [])
      .map(clean)
      .filter(Boolean)
      .slice(0, limit);
  }

  function inferSurfaceTopic(sample = {}) {
    const text = `${sample.keyword || ""} ${sample.title || ""}`.trim();
    return text || "当前关键词相关问题";
  }

  function inferTargetUser(sample = {}, industry = "") {
    const text = `${industry} ${sample.keyword || ""} ${sample.title || ""} ${sample.content || ""}`;
    if (/淡斑|斑|黄褐斑|晒斑|护肤|皮肤/.test(text)) return "有皮肤问题、想少走弯路、准备买产品或做项目前先判断的人";
    if (/减肥|瘦|体重|身材/.test(text)) return "想改变身材，但怕方法不适合自己、怕反复失败的人";
    if (/穿搭|形象|发型|色彩|妆容/.test(text)) return "想改善形象，但缺少判断标准和低成本试错入口的人";
    return "有明确需求，但不知道第一步怎么判断、怕选错方案的人";
  }

  function inferEmotion(sample = {}) {
    const text = `${sample.title || ""} ${sample.content || ""} ${firstComments(sample, 8).join(" ")}`;
    if (/没效果|反复|踩坑|后悔|白花|乱买|焦虑|担心|怕/.test(text)) return "怕花钱试错，怕方向错，想先拿到可靠判断标准";
    if (/分不清|哪种|怎么判断|适合|能不能/.test(text)) return "不确定自己属于哪种情况，希望有人把判断标准说清楚";
    if (/收藏|清单|步骤|方法|攻略/.test(text)) return "想保存一套以后能反复对照的方法";
    return "用户不是没需求，而是缺少可信、具体、能马上行动的判断入口";
  }

  function inferHiddenDesire(sample = {}) {
    const text = `${sample.title || ""} ${sample.content || ""}`;
    if (/淡斑|护肤|皮肤|斑/.test(text)) return "不想继续盲买盲做，希望先确认自己问题类型，再决定下一步";
    if (/减肥|身材/.test(text)) return "不想再靠意志力硬撑，希望找到适合自己的节奏";
    return "希望少走弯路，用更低成本先判断自己该不该继续投入";
  }

  function inferFear(sample = {}) {
    const text = `${sample.title || ""} ${sample.content || ""} ${firstComments(sample, 8).join(" ")}`;
    if (/反黑|敏感|副作用|屏障|皮秒|刷酸|项目/.test(text)) return "怕乱做项目、乱用产品，导致问题更复杂";
    if (/没效果|白花|被骗|踩坑/.test(text)) return "怕被夸大承诺带偏，最后钱花了但没有结果";
    return "怕照搬别人的做法不适合自己，最后越做越乱";
  }

  function inferHook(sample = {}) {
    const comments = firstComments(sample, 3);
    if (comments.length) return `评论区问得最多的是：${comments[0]}`;
    const title = clean(sample.title || sample.keyword || "这个问题");
    return `${title}，先别急着照做，先看它真正解决的是什么问题`;
  }

  function inferTrustProof(sample = {}) {
    const metrics = metricsOf(sample);
    return `源头帖互动：赞 ${metrics.likes} / 藏 ${metrics.saves} / 评 ${metrics.comments} / 转 ${metrics.shares}`;
  }

  function inferStructure(sample = {}) {
    const text = `${sample.title || ""} ${sample.content || ""}`;
    if (/分清|类型|哪种|判断|自查|区别/.test(text)) return ["问题前置", "分类判断", "自查标准", "风险提醒", "收藏或咨询入口"];
    if (/避坑|别|不要|错|误区|真相/.test(text)) return ["错误做法", "为什么会踩坑", "正确判断标准", "替代行动", "评论互动"];
    if (/步骤|方法|清单|攻略/.test(text)) return ["适用人群", "步骤清单", "关键细节", "常见问题", "保存提醒"];
    return ["真实痛点", "判断依据", "解决路径", "风险边界", "下一步行动"];
  }

  function inferCoverPattern(sample = {}) {
    const text = `${sample.title || ""} ${sample.content || ""}`;
    if (/别|不要|错|坑/.test(text)) return "封面用反常识警示句：先别急着做 X，问题可能在 Y";
    if (/哪种|类型|分清|自查/.test(text)) return "封面用自查问题：你属于哪一种？";
    return "封面只放一个强问题，避免堆知识点";
  }

  function buildDoNotCopy(sample = {}) {
    const list = ["不照抄原帖标题", "不照抄原帖正文", "不冒充原帖案例"];
    const text = `${sample.title || ""} ${sample.content || ""}`;
    if (/护肤|淡斑|斑|减肥|健康|项目|皮秒/.test(text)) list.push("不写保证效果、根治、一定改善");
    return list;
  }

  function buildDeconstruction(sample = {}, profile = {}) {
    const comments = firstComments(sample, 5);
    const structure = inferStructure(sample);
    return {
      whyViral: `${inferTrustProof(sample)}。这条值得拆，不是因为句子能抄，而是它证明用户愿意为这个问题停留、收藏或提问。`,
      targetUser: inferTargetUser(sample, profile.industry),
      surfaceTopic: inferSurfaceTopic(sample),
      realEmotion: inferEmotion(sample),
      hiddenDesire: inferHiddenDesire(sample),
      fearOrRisk: inferFear(sample),
      commentMainQuestion: comments[0] || "该样本暂未补抓评论，需要进入深挖后确认主问题",
      firstHook: inferHook(sample),
      trustProof: inferTrustProof(sample),
      contentStructure: structure,
      coverPattern: inferCoverPattern(sample),
      commentPains: comments.length ? comments : ["缺少评论区，下一步应优先补抓评论"],
      copyablePattern: `可以复制的是「${structure.join(" -> ")}」这条结构，不复制原句和案例。`,
      doNotCopy: buildDoNotCopy(sample),
      longkaTranslation: "把源头帖翻译成客户自己的业务表达：先帮用户判断问题，再给低成本行动入口，最后引导咨询或收藏。",
    };
  }

  function renderStep2(sample) {
    const panel = $("#decisionPanel");
    if (!panel || !sample) return;
    const profile = {
      industry: $("#industry")?.value || $("#profileIndustry")?.value || "",
    };
    const d = buildDeconstruction(sample, profile);
    panel.hidden = false;
    panel.innerHTML = `<article class="analysis-card step2-deconstruct">
      <span>第二步：爆款样本拆解</span>
      <h2>${escapeHtml(sample.title || "已选择源头帖")}</h2>
      <div class="analysis-grid">
        ${[
          ["这条为什么火", d.whyViral],
          ["目标人群", d.targetUser],
          ["表层话题", d.surfaceTopic],
          ["真实情绪", d.realEmotion],
          ["隐藏需求", d.hiddenDesire],
          ["用户害怕什么", d.fearOrRisk],
          ["评论区主问题", d.commentMainQuestion],
          ["开头钩子", d.firstHook],
          ["信任证据", d.trustProof],
          ["封面套路", d.coverPattern],
          ["可复制结构", d.copyablePattern],
          ["Longka 二创方向", d.longkaTranslation],
        ].map(([name, value]) => `<div><b>${escapeHtml(name)}</b><p>${escapeHtml(value)}</p></div>`).join("")}
      </div>
      <div class="deconstruct-lists">
        <div>
          <b>内容结构</b>
          <ol>${d.contentStructure.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
        </div>
        <div>
          <b>评论痛点</b>
          <ol>${d.commentPains.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
        </div>
        <div>
          <b>不能复制</b>
          <ol>${d.doNotCopy.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
        </div>
      </div>
      <div class="publish-target">
        <div>
          <b>下一步：客户问题库</b>
          <p>确认这份拆解后，才能进入第 3 步，把评论区问题沉淀成客户问题库。</p>
        </div>
        <button class="primary" type="button" id="confirmStep2Deconstruction">确认拆解，进入客户问题库</button>
      </div>
    </article>`;
    $("#confirmStep2Deconstruction")?.addEventListener("click", () => {
      const hint = $("#topicHint");
      if (hint) hint.textContent = "第 2 步已确认。下一步应生成客户问题库；当前仍不生成正文、图片或视频。";
    });
  }

  window.longkaRenderStep2Deconstruction = renderStep2;

  document.addEventListener("click", (event) => {
    const card = event.target.closest?.("[data-step1-sample]");
    if (!card) return;
    setTimeout(() => {
      const topic = window.activeTopic;
      const source = topic?.evidence?.sourcePosts?.[0] || {};
      const sample = {
        id: topic?.evidence?.traceId,
        title: source.rawTitle || source.title || topic?.title,
        keyword: $("#topic")?.value || "",
        platform: source.platform,
        url: source.url,
        metrics: source.metrics || {},
        comments: topic?.evidence?.comments || [],
        content: source.summary || topic?.reason || "",
      };
      renderStep2(sample);
      $("#decisionPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }, true);
})();
