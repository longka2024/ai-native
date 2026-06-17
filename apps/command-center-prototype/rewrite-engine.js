// rewrite-engine.js — 文案生成、评分、优化 + 三层编辑审查循环
// 依赖: state-manager.js, config.js, utils.js, copy-manager.js

// 发布前判断（precheck-xhs 盲评分内化）：确认文案后，按账号 rubric 盲判这篇行不行
async function generateContentPrecheck() {
  const title = state.selectedTitle || selectedTopic()?.theme || selectedTopic()?.title || "";
  const body = confirmedCopyText() || state.draft || "";
  if (!title || body.replace(/\s+/g, "").length < 20) {
    state.precheckStatus = "error";
    state.precheckMessage = "请先生成并确认正文——发布前判断要看已写好的标题+正文。";
    renderToday();
    return;
  }
  state.precheckStatus = "loading";
  state.precheckResult = null;
  state.precheckMessage = "正在做发布前判断…";
  renderToday();
  try {
    const res = await fetch(apiPath("/api/skills/run"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ skill: "precheck-xhs", content: `标题：${title}\n\n正文：${body}` }),
    });
    const j = await res.json().catch(() => ({}));
    const r = j?.result || {};
    if (!j.ok || !r.verdict) throw new Error(j.message || j.error || "判断失败");
    state.precheckResult = r;
    state.precheckStatus = "done";
    state.precheckMessage = "";
    renderToday();
  } catch (error) {
    state.precheckStatus = "error";
    state.precheckMessage = `发布前判断失败：${error.message}`;
    renderToday();
  }
}

// 一键「帮我改好」：按发布前判断的结论，把当前文案整体改写成可直接发布的成稿。
// 复用 DeepSeek 改写链（改写→编辑审查→去AI味→存版本）。真实细节只从已采集素材取，
// 没有就留一个方括号占位让运营补，绝不虚构事实。改完自动确认为当前文案并重判一次。
async function optimizeByPrecheck() {
  const r = state.precheckResult;
  if (!r || !r.verdict) {
    state.precheckStatus = "error";
    state.precheckMessage = "请先做一次发布前判断，我才知道按什么标准帮你改。";
    renderToday();
    return;
  }
  if (state.draftStatus === "loading") return;
  const snapshot = currentCopySnapshot("优化前版本");
  if (!snapshot?.copy) {
    state.precheckStatus = "error";
    state.precheckMessage = "当前没有可优化的正文。";
    renderToday();
    return;
  }
  // 备份当前已确认文案，改写失败要能原样回滚，绝不弄丢小妹手里的稿
  const backup = {
    draft: state.draft,
    copyVersions: state.copyVersions,
    confirmedCopyVersionId: state.confirmedCopyVersionId,
    currentCopyVersionId: state.currentCopyVersionId,
    copyConfirmed: state.copyConfirmed,
    selectedTitle: state.selectedTitle,
  };
  const labelMap = { HP: "钩子", ER: "痛点共鸣", SV: "收藏价值", IV: "真实案例/独家细节", SP: "具体可信", HT: "人味", CV: "转化" };
  const weakest = Array.isArray(r.weakest) ? r.weakest.map((c) => labelMap[c] || c) : [];
  const brief = [
    ...(Array.isArray(r.fixes) ? r.fixes : []),
    ...(weakest.length ? [`重点补强：${weakest.join("、")}`] : []),
    ...(Array.isArray(r.honest_flags) ? r.honest_flags.map((f) => `发之前先改掉：${f}`) : []),
  ].filter(Boolean).slice(0, 10);
  state.draftRevision += 1;
  state.pendingRevision = {
    currentDraft: snapshot,
    qualityFeedback: { rewriteBrief: brief },
    instruction:
      "把当前这篇改写成一版可以直接发布的成稿，输出完整新正文（不要只在末尾追加建议）。按以下重点改到位：" +
      brief.join("；") + "。" +
      "【改动要最小、最精准】原文里没问题的句子尽量一字不动、原样保留，只改/补真正需要动的句子，不要为了改而把整篇重写一遍——这样运营才能一眼看出改了哪。" +
      "【真实性铁律，必须遵守】需要『真实案例 / 客户原话 / 具体细节』时，只能用我提供的真实素材（源帖正文、真实评论、客户资料）里的内容，把通用空话替换成这些真实锚点；" +
      "绝对不要编造任何具体的人物、经历、数字、结果或情节。" +
      "如果某处确实需要一段只有客户本人才有、而素材里又没有的真实经历，就在那里留一句方括号占位：" +
      "『【这里补一句你们的真实案例 / 客户原话】』，交给运营去补，不要自己虚构。" +
      "其余（钩子、结构、收藏点、转化、去AI味、说人话）一次改到能直接用。",
  };
  state.precheckStatus = "loading";
  state.precheckMessage = "正在按判断帮你改成能用的版本（同时去 AI 味），稍等…";
  clearCopyConfirmation();
  state.draftStatus = "idle";
  state.draftError = "";
  state.draftMeta = null;
  renderToday();

  await generateSopDraft();

  if (state.draftStatus === "done" && state.draft) {
    // 把刚改好的版本确认为当前文案，留在制作中心，不用回上一步
    const version = state.copyVersions.find((v) => v.id === state.currentCopyVersionId);
    if (version) {
      state.confirmedCopyVersionId = version.id;
      state.copyVersions = state.copyVersions.map((v) => ({ ...v, confirmed: v.id === version.id }));
    }
    state.copyConfirmed = true;
    // 记下改前/改后，给前端做对比高亮（黄色=改动处）
    state.optimizeDiff = { before: snapshot.copy, after: state.draft };
    state.precheckResult = null;
    state.precheckStatus = "idle";
    state.precheckMessage = "已按判断帮你改好。下面黄色高亮的就是改动/补上的地方，看一眼对不对；不满意可以点【撤销】还原。系统再自动判一次。";
    renderToday();
    await generateContentPrecheck();
  } else {
    // 失败回滚，保住原稿
    Object.assign(state, backup);
    state.pendingRevision = null;
    state.optimizeDiff = null;
    state.draftStatus = "done";
    state.precheckStatus = "error";
    state.precheckMessage = `自动优化这次没成功（${state.draftError || "改写失败"}）。你的原文案已原样保留，可以再点一次，或手动改。`;
    renderToday();
  }
}

async function generateSopDraft() {
  if (!state.selectedTitle || !selectedTopic()) return;
  if (state.draftStatus === "loading") return;
  state.draftStatus = "loading";
  state.draftError = "";
  state.copyConfirmed = false;
  renderToday();
  try {
    const payload = buildSopDraftPayload();
    const res = await fetch(apiPath("/api/content-draft/rewrite"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok || !result.ok || !result.draft) {
      const message = result.message || result.error || `HTTP ${res.status}`;
      // P0-2: API key 缺失时弹出配置引导
      if (result.error === "missing_ai_key" || message.includes("missing_ai_key")) {
        showApiKeyModal();
        throw new Error("AI 模型 API Key 未配置，请在设置中填写后重试。");
      }
      throw new Error(`AI SOP 文案生成失败：${message}`);
    }
    const draft = result.draft;
    state.draft = formatSopDraft(draft);
    state.draftMeta = {
      model: result.model || result.retriedFrom || "Longka",
      framework: draft.diagnosis?.copyable || draft.contentStrategy?.framework || "SOP",
      route: draft.contentStrategy?.selectedAngle || currentTarget().title,
    };
    state.draftReview = runLongkaReview(state.draft);
    // P1-2: 编辑审查——记录真实验收结论 + 把改进建议带给下一版（非破坏性，不覆盖 LLM 稿）
    state.draft = await runEditorialReviewLoop(state.draft, selectedTopic());
    // P2-1: 去 AI 味（humanizer-zh skill）——每一版都跑（含"继续优化"版），让小妹的再编辑也去 AI 味
    state.draft = await humanizeDraftWithSkill(state.draft);
    rememberCopyVersion(state.draft, state.pendingRevision ? `AI 优化第 ${state.draftRevision} 版` : "AI 初稿");
    state.improvedDraft = "";
    state.pendingRevision = null;
    state.draftStatus = "done";
    state.draftError = "";
    // 话题"已用过"标记：成功出稿即记下，下次这个话题从新选题里隐藏
    markTopicUsed(selectedTopic(), state.selectedTitle);
  } catch (error) {
    state.draftStatus = "error";
    state.draftError = `${error.message}。系统不会把本地模板当成最终稿，请检查文案模型配置后重试。`;
    state.draft = "";
  }
  renderToday();
}

function buildSopDraftPayload() {
  const topic = selectedTopic() || {};
  const source = topic.source || topic.raw || topic;
  const titleChoice = state.titleChoices.find((item) => item.title === state.selectedTitle) || {};
  const sourceContent = topic.content || topic.text || topic.summary || source.content || source.text || "";
  const comments = Array.isArray(topic.comments) ? topic.comments : Array.isArray(source.comments) ? source.comments : [];
  const normalizedTopic = {
    id: topic.id,
    title: topic.title || topic.theme || state.selectedTitle,
    theme: topic.theme,
    pain: topic.pain,
    rewrite: topic.reuse || topic.reason || "",
    risk: topic.risk,
    content: sourceContent,
    comments,
    metrics: topic.metrics || source.metrics || {},
    sources: [{
      title: topic.title,
      url: topic.url,
      platform: topic.platform,
      content: sourceContent,
      comments,
      metrics: topic.metrics || source.metrics || {},
    }],
  };
  return {
    selectedTitle: state.selectedTitle,
    titleChoices: state.titleChoices.map((item) => item.title || item).filter(Boolean),
    selectedFormat: currentTarget().title,
    platform: currentTarget().platform || state.publishTarget,
    publishTarget: state.publishTarget,
    keyword: state.keywords,
    industry: state.industry,
    businessLine: state.businessLine,
    goal: state.goal,
    keywords: state.keywords,
    revision: state.draftRevision,
    titleReason: titleChoice.reason || "",
    topic: normalizedTopic,
    sourcePost: {
      title: topic.title || topic.theme || "",
      summary: topic.pain || topic.reason || "",
      content: sourceContent,
      url: topic.url || "",
      platform: topic.platform || "",
      comments,
      commentQuestions: comments,
      metrics: topic.metrics || source.metrics || {},
    },
    comments,
    commentQuestions: comments,
    currentDraft: state.pendingRevision?.currentDraft ? {
      title: state.pendingRevision.currentDraft.title,
      copy: state.pendingRevision.currentDraft.copy,
      versionId: state.pendingRevision.currentDraft.id,
      round: state.pendingRevision.currentDraft.round,
      score: state.pendingRevision.currentDraft.score,
      label: state.pendingRevision.currentDraft.label,
    } : null,
    qualityFeedback: state.pendingRevision ? {
      score: state.pendingRevision.qualityFeedback?.score || 0,
      level: state.pendingRevision.qualityFeedback?.level || "",
      instructions: [
        state.pendingRevision.instruction,
        ...(state.pendingRevision.qualityFeedback?.rewriteBrief || []),
      ].filter(Boolean).slice(0, 8),
      required: "Rewrite from currentDraft.copy into a complete publishable new version. Do not append advice only.",
    } : null,
    sourceTopic: {
      id: topic.id,
      theme: topic.theme,
      title: topic.title,
      url: topic.url,
      platform: topic.platform,
      pain: topic.pain,
      reason: topic.reason,
      reuse: topic.reuse,
      risk: topic.risk,
      metrics: topic.metrics || source.metrics || {},
      content: sourceContent,
      comments,
    },
    sop: {
      sourceEvidence: "必须从源头素材提炼真实痛点，不复制原文表达。保留素材里的真实细节、数字、场景，不要泛化成通用描述。",
      dbsContent: "先判断选题是否值得做，再判断形式、标题、表达效率、认知落差和行动入口。",
      cheatOnContent: "初稿后必须做体检：开头留存、具体感、人味、收藏价值、转化动作。",
      humanizerZh: "删除模板腔、三段式套话、空泛连接词、过度完整的 AI 句式。如果内容里有编号列表，必须改写成自然段落。",
      antiAiStructure: "严禁输出任何编号列表。严禁首先/其次/最后。严禁金句对仗收尾。如果发现自己在写列表，立刻停下来用自然叙述代替。",
      platformStyle: platformStyleInstruction(),
      noFallbackTemplate: true,
    },
  };
}

function platformStyleInstruction() {
  if (state.publishTarget === "moments") {
    return [
      "朋友圈文案不是文章，不要标题、标签、配图建议，也不要输出“正文：”。",
      "只输出一条像真人随手发的朋友圈动态，控制在 120-260 字。",
      "语气像运营者随手发圈：有最近发生的场景、有一句判断、有一点经验，不要教程腔。",
      "可以分 3-5 个短段，中间允许空行；不要编号清单，不要一二三步骤。",
      "结尾轻一点，可以是私聊入口，不要硬广。"
    ].join("\n");
  }
  if (state.publishTarget === "wechat-article") {
    return [
      "公众号长文不是小红书短正文，不要标签，不要配图建议列表。",
      "需要有标题、开头问题、正文小标题、论证、案例或场景、方法和结尾。",
      "结构可以用 Markdown 标题，但正文要像一篇完整文章，不要写成轮播卡片说明。",
      "允许 900-1800 字，重点是观点展开和信任感，不要每段都短促喊口号。"
    ].join("\n");
  }
  if (state.publishTarget === "douyin" || state.publishTarget === "video-account") {
    return [
      "短视频脚本不是图文正文，不要标签，不要配图建议，不要公众号式长段落。",
      "必须按：封面标题、3秒钩子、口播正文、分镜画面、字幕关键词、结尾互动来写。",
      "口播要短句，适合真人说出来；每段控制在 1-3 句。",
      "视频号更偏信任和解释，抖音更偏钩子和节奏。"
    ].join("\n");
  }
  return [
    "小红书图文要有标题、正文和标签；配图建议只进入系统内部图文计划，不要混进最终正文。",
    "正文风格：像真人在写笔记，不是在写教程或攻略。有场景、有具体细节、有真实观察。",
    "【硬性禁止】不得使用数字编号清单（1. 2. 3. 或 ① ② ③）。",
    "【硬性禁止】不得使用首先/其次/最后、一方面/另一方面、总之/综上等结构化连接词。",
    "【硬性禁止】不得以对仗金句收尾，比如 A不是B，是C 这类句型。",
    "【硬性禁止】不得有希望对你有帮助、关注我了解更多等套话结尾。",
    "写法参考：可以跑题，可以插叙，可以有情绪，但要围绕一个真实观点。像朋友发微信说一件事。",
    "【视角要求】用第一人称写自己的经历和观察，不要用我见过很多人/很多家长/太多人都这样的旁观者视角。读者感受到的是作者本人在说话，不是在做总结陈词。",
    "如果需要表达步骤或方法，用连续自然段落描述，不要拆成列表项。",
    "配图计划必须对应轮播页，不要写泛泛的装饰图。"
  ].join("\n");
}

function formatSopDraft(draft = {}) {
  const copy = draft.xhsCopy || {};
  const title = state.selectedTitle || draft.selectedTitle || copy.title;
  const body = copy.body || draft.body || "";
  if (state.publishTarget === "moments") {
    return formatMomentsSopDraft(body || draft.copy || draft.text || "");
  }
  if (state.publishTarget === "wechat-article") {
    return formatWechatSopDraft({ title, body: body || draft.copy || draft.text || "", draft });
  }
  if (state.publishTarget === "douyin" || state.publishTarget === "video-account") {
    return formatVideoSopDraft({ title, body: body || draft.copy || draft.text || "", draft });
  }
  const imagePlan = Array.isArray(copy.imagePlan) ? copy.imagePlan : Array.isArray(draft.imagePlan) ? draft.imagePlan : [];
  const tags = Array.isArray(copy.tags) ? copy.tags : Array.isArray(draft.tags) ? draft.tags : [];
  const parts = [`标题：${title}`, "", "正文：", body.trim()];
  if (imagePlan.length) {
    state.currentImagePlan = imagePlan;
  }
  if (tags.length) parts.push("", `标签：${tags.map((tag) => String(tag).replace(/^#/, "#")).join(" ")}`);
  return parts.filter((item) => item !== undefined && item !== null).join("\n");
}

function formatWechatSopDraft({ title = "", body = "", draft = {} } = {}) {
  const clean = stripPlatformNoise(draft.wechatArticle?.body || body || draft.article?.body || draft.article || "");
  const articleTitle = title || state.selectedTitle || selectedTopic()?.theme || "未命名长文";
  if (/^#\s+/m.test(clean) || /^##\s+/m.test(clean)) {
    return clean.replace(/^标题[：:].*$/gm, "").trim();
  }
  const paragraphs = clean.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (paragraphs.length >= 5 && clean.length > 500) {
    return [`# ${articleTitle}`, "", ...paragraphs].join("\n\n");
  }
  return buildArticleDraft(selectedTopic() || {});
}

function formatVideoSopDraft({ title = "", body = "", draft = {} } = {}) {
  const video = draft.videoScript || {};
  const shotList = Array.isArray(video.shotList) ? video.shotList : [];
  if (video.hook || video.voiceover || shotList.length) {
    const parts = [
      `封面标题：${title || video.title || state.selectedTitle || ""}`,
      "",
      `3秒钩子：${video.hook || ""}`,
      "",
      "口播正文：",
      String(video.voiceover || body || "").trim(),
    ];
    if (shotList.length) {
      parts.push("", "分镜/画面：", ...shotList.map((item, index) => `${index + 1}. ${typeof item === "string" ? item : item.shot || item.copy || JSON.stringify(item)}`));
    }
    if (video.riskNote) parts.push("", `风险提醒：${video.riskNote}`);
    return parts.filter(Boolean).join("\n");
  }
  const clean = stripPlatformNoise(body);
  if (/0-3 秒|3秒|钩子|口播|分镜|字幕/.test(clean)) return clean;
  return buildVideoDraft(selectedTopic() || {});
}

function formatMomentsSopDraft(raw = "") {
  const topic = selectedTopic() || {};
  const clean = String(raw || "")
    .replace(/^标题[：:].*$/gm, "")
    .replace(/^正文[：:]\s*/gm, "")
    .replace(/\n+配图建议[：:][\s\S]*$/m, "")
    .replace(/\n+标签[：:][\s\S]*$/m, "")
    .replace(/^[-*]\s*/gm, "")
    .trim();
  const lines = clean.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const withoutLists = lines.filter((line) => !/^\d+[.、]/.test(line));
  const compact = withoutLists.join("\n\n").trim();
  if (compact && compact.length <= 360) return compact;
  if (compact) return compact.slice(0, 320).replace(/[，。；、][^，。；、]*$/, "。");
  return buildMomentsDraft(topic);
}

function stripPlatformNoise(raw = "") {
  return String(raw || "")
    .replace(/^标题[：:].*$/gm, "")
    .replace(/^正文[：:]\s*/gm, "")
    .replace(/\n+配图建议[：:][\s\S]*$/m, "")
    .replace(/\n+标签[：:][\s\S]*$/m, "")
    .trim();
}

function runLongkaReview(text = "") {
  const base = globalThis.LongkaContentCreationBase;
  if (base?.runEditorialReview) {
    return base.runEditorialReview({
      draft: text,
      brief: {
        selectedTitle: state.selectedTitle,
        targetPlatform: currentTarget().title,
        selectedQuestion: selectedTopic()?.pain || selectedTopic()?.theme,
        cta: state.goal,
      },
      round: state.draftRevision,
    });
  }
  return null;
}

function buildDraft(options = {}) {
  const topic = selectedTopic();
  if (!topic || !state.selectedTitle) return "";
  if (state.publishTarget === "douyin" || state.publishTarget === "video-account") return buildVideoDraft(topic);
  if (state.publishTarget === "wechat-article") return buildArticleDraft(topic);
  if (state.publishTarget === "moments") return buildMomentsDraft(topic);
  if (state.publishTarget === "topic-only") return buildTopicOnlyDraft(topic);
  return buildXhsDraft(topic, options);
}

function buildXhsDraft(topic, options = {}) {
  const insight = topic.sourceInsight || extractSourceInsight(topic);
  const sourceTitle = cleanSourceText(topic.title || "");
  const angleLine = options.variant
    ? "这次换一个更像真实复盘的角度讲，把问题说透，不写成教程腔。"
    : insight.angle || "这次不照搬原帖，而是把源头观点改成更适合小红书图文的内容。";
  const title = state.selectedTitle || topic.theme || sourceTitle || "这个选题值得重新拆一次";
  const pain = cleanReadableText(topic.pain || insight.pain || "很多人只照搬方法，却没有先判断自己是否适合");
  const theme = cleanReadableText(topic.theme || sourceTitle || state.businessLine);
  const tags = compactTags([state.businessLine, state.industry, "内容避坑", "判断标准", "经验分享"]);
  return `标题：${title}

正文：
很多人做「${theme}」的时候，最容易卡住的不是不会找方法，而是太快进入照抄。

${angleLine}

我这次参考的源头素材是：
「${sourceTitle || topic.theme || title}」

它真正值得拆的不是原句，而是背后的提醒：
${pain}

所以这条内容先不急着给答案，先把判断顺序讲清楚。

你可以先看 3 个地方：

1. 这个问题是突然出现，还是长期反复出现
2. 你之前照着别人做的时候，有没有判断前提是否一样
3. 你现在最缺的是马上行动，还是先把边界想清楚

如果这 3 个问题没弄清楚，先别急着套别人的方法。

真正稳的顺序是：先判断情况，再选择方法，再观察反馈。

标签：${tags}`;
}

function buildVideoDraft(topic) {
  const title = state.selectedTitle || topic.theme || "先别急着照抄这个方法";
  const theme = cleanReadableText(topic.theme || topic.title || state.businessLine);
  const pain = cleanReadableText(topic.pain || "很多人只看结果，没有先判断前提是否一样");
  return `封面标题：${title}

0-3 秒：钩子
你以为「${theme}」难在工具，其实很多人第一步就错了。

3-8 秒：代入
看到别人做出结果后，最容易犯的错就是直接照抄，但很少先问：这个方法适不适合我现在的情况？

8-35 秒：主体
先看三个判断：
第一，问题是突然出现，还是长期反复出现？
第二，你之前试过的方法，是不是只看结果，没看前提？
第三，你现在需要的是马上行动，还是先做一次基础判断？

35-48 秒：源头问题
这条选题来自真实素材：${topic.title || theme}
它值得参考的地方不是原文表达，而是背后的用户问题：${pain}

48-60 秒：行动
所以别急着照抄。先把自己的情况判断清楚，再决定下一步怎么做。

分镜提示：
1. 开头大字：先别急着照抄
2. 中段字幕卡：3 个判断问题
3. 画面：源头素材 / 评论问题打码截图
4. 结尾：先判断，再行动`;
}

function buildArticleDraft(topic) {
  const title = state.selectedTitle || topic.theme || "这个选题为什么值得写";
  const pain = cleanReadableText(topic.pain || "很多内容失败不是没有观点，而是没有把真实问题拆清楚");
  return `# ${title}

## 这个选题为什么值得写
在「${state.industry}」里，很多内容失败不是因为没有观点，而是没有把真实问题拆清楚。

这次源头素材暴露的问题是：${pain}

## 一、不要先套方法，先判断场景
同一个方法放在不同人身上，效果可能完全不同。内容创作也是一样，不能只学标题和句式，要先看它解决了什么问题。

## 二、拆源头素材的三个信号
1. 标题为什么能让人停下来？
2. 正文提供了什么判断标准？
3. 评论区或用户问题说明了什么需求？

## 三、改造成自己的内容资产
我们要复用的是结构和洞察，不是原文表达。围绕「${state.businessLine}」，更适合的写法是：先讲误区，再给判断框架，最后给低门槛行动入口。

## 四、一鱼多吃
这个选题后续可以继续改成小红书图文、短视频脚本和朋友圈文案。`;
}

function buildMomentsDraft(topic) {
  const pain = cleanReadableText(topic.pain || "很多内容不是没价值，是换个平台后还沿用同一套写法");
  return `最近越来越觉得，内容不能偷懒直接照抄。

比如同一个选题，小红书可以写得像干货清单，但发朋友圈就不一样。朋友圈里大家看的不是步骤，而是你最近真的发现了什么、踩过什么坑。

我这两天拆到一个点：${pain}

所以现在我会先把核心判断留下，再换成更像自己说话的表达。别一上来就讲方法，先讲你为什么突然有这个感受。

有需要的话，我把这套“一个选题改成不同平台”的小流程发你。`;
}

function buildTopicOnlyDraft(topic) {
  return `选题：${topic.theme}

源头素材：
${topic.title}

用户痛点：
${topic.pain}

复用方向：
${topic.reuse}

风险边界：
${topic.risk}`;
}

function renderBindingEvidence() {
  const topic = selectedTopic();
  if (!topic) return "<p>还没有选中选题。</p>";
  const titleLabel = state.publishTarget === "moments" ? "选中角度" : "选中标题";
  return `
    <p><strong>选题：</strong>${escapeHtml(topic.theme)}</p>
    <p><strong>源头素材：</strong>${escapeHtml(topic.title)}</p>
    <p><strong>来源平台：</strong>${escapeHtml(topic.platform)}</p>
    <p><strong>目标平台：</strong>${escapeHtml(currentTarget().title)}</p>
    <p><strong>${escapeHtml(titleLabel)}：</strong>${escapeHtml(state.selectedTitle)}</p>
    <p><strong>风险边界：</strong>${escapeHtml(topic.risk)}</p>
    ${topic.url ? `<p><a class="source-link" href="${escapeHtml(topic.url)}" target="_blank" rel="noreferrer">打开原始素材核对</a></p>` : ""}
  `;
}


function buildContentCoachReport() {
  const copy = activeCopyText();
  const topic = selectedTopic() || {};
  const title = state.selectedTitle || "";
  const plain = stripPlatformNoise(copy);
  const opening = plain.split(/\n+/).map((line) => line.trim()).filter(Boolean).slice(0, 2).join(" ");
  const platform = state.publishTarget;
  const dimensions = [
    scoreTitleHook(title, topic),
    scoreOpeningRetention(opening, title, topic),
    scoreUserPain(copy, topic),
    scoreSpecificity(copy),
    scoreSaveValue(copy, platform),
    scoreHumanTone(copy),
    scorePlatformFit(copy, platform),
    scoreConversionPath(copy),
  ];
  const total = Math.round(dimensions.reduce((sum, item) => sum + item.score, 0) / Math.max(1, dimensions.length));
  const weakest = dimensions.slice().sort((a, b) => a.score - b.score).slice(0, 3);
  return {
    total,
    level: total >= 86 ? zh("&#21487;&#20197;&#21457;&#65292;&#21482;&#38656;&#24494;&#35843;") : total >= 76 ? zh("&#22522;&#26412;&#33021;&#21457;&#65292;&#24314;&#35758;&#20877;&#20248;&#21270;&#19968;&#29256;") : total >= 66 ? zh("&#26377;&#26694;&#26550;&#65292;&#20294;&#29190;&#28857;&#19981;&#22815;") : zh("&#26242;&#26102;&#19981;&#24314;&#35758;&#21457;"),
    dimensions,
    weakest,
    nextAction: buildCoachNextAction(total, weakest),
  };
}

function scoreTitleHook(title = "", topic = {}) {
  const hasPain = title && topic.pain && textOverlap(title, topic.pain) > 0;
  const hookWords = ["why", "how", "mistake", "secret", "checklist", "AI", "3", "5", "7", "?", "？", "别", "为什么", "原来", "不是", "而是"];
  const hasHook = hookWords.some((word) => String(title || "").includes(word));
  const length = titleCharLength(title);
  const clear = length >= 8 && length <= titleMaxLengthForTarget(state.publishTarget);
  const score = (clear ? 28 : 18) + (hasHook ? 36 : 22) + (hasPain ? 26 : 16);
  return coachDim(zh("&#26631;&#39064;&#38057;&#23376;"), Math.min(92, score), clear && hasHook ? zh("&#26631;&#39064;&#26377;&#25235;&#20154;&#30340;&#21028;&#26029;&#25110;&#24748;&#24565;") : zh("&#26631;&#39064;&#36824;&#20687;&#35828;&#26126;&#25991;&#65292;&#19981;&#22815;&#25235;&#20154;"), clear && hasHook ? "" : zh("&#29992;&#12298;&#24773;&#22659; + &#20914;&#31361;/&#32467;&#26524; + &#21028;&#26029;&#12299;&#37325;&#20889;&#26631;&#39064;"));
}

function scoreOpeningRetention(opening = "", title = "") {
  const answersTitle = title && textOverlap(opening, title) > 0;
  const sceneWords = ["我", "你", "很多人", "刚开始", "卡住", "发现", "今天", "昨天", "测试"];
  const hasScene = sceneWords.some((word) => String(opening || "").includes(word));
  const notEmpty = opening.length >= 25;
  const score = (notEmpty ? 28 : 14) + (answersTitle ? 30 : 18) + (hasScene ? 30 : 18);
  return coachDim(zh("&#24320;&#22836;&#30041;&#23384;"), Math.min(92, score), hasScene ? zh("&#24320;&#22836;&#26377;&#22330;&#26223;&#25110;&#20154;&#30340;&#29366;&#24577;") : zh("&#24320;&#22836;&#36824;&#22312;&#35762;&#36947;&#29702;&#65292;&#32570;&#23569;&#20195;&#20837;&#24863;"), hasScene ? "" : zh("&#20808;&#20889;&#19968;&#20010;&#20855;&#20307;&#22330;&#26223;&#65292;&#20877;&#25243;&#20986;&#21028;&#26029;"));
}

function scoreUserPain(copy = "", topic = {}) {
  const pain = topic.pain || topic.theme || "";
  const bound = pain && textOverlap(copy, pain) > 1;
  const painWords = ["问题", "卡", "难", "不会", "没有", "担心", "焦虑", "为什么", "AI"];
  const hasQuestion = painWords.some((word) => String(copy || "").includes(word));
  const score = (bound ? 42 : 24) + (hasQuestion ? 42 : 26);
  return coachDim(zh("&#29992;&#25143;&#30171;&#28857;"), Math.min(92, score), bound ? zh("&#33021;&#22238;&#21040;&#24403;&#21069;&#27597;&#39064;&#30340;&#26680;&#24515;&#38382;&#39064;") : zh("&#21644;&#27597;&#39064;&#32465;&#23450;&#19981;&#22815;&#65292;&#23481;&#26131;&#36305;&#39064;"), bound ? "" : zh("&#25226;&#21069; 30% &#25913;&#25104;&#29992;&#25143;&#27491;&#22312;&#36935;&#21040;&#30340;&#38382;&#39064;"));
}

function scoreSpecificity(copy = "") {
  const numbers = (copy.match(/\d+|一|二|三|四|五|六|七|八|九|十/g) || []).length;
  const concreteWords = ["案例", "步骤", "清单", "表格", "账号", "数据", "截图", "模板", "方法", "流程"];
  const concrete = concreteWords.some((word) => String(copy || "").includes(word));
  const score = Math.min(92, 42 + Math.min(24, numbers * 4) + (concrete ? 26 : 12));
  return coachDim(zh("&#20855;&#20307;&#24863;"), score, concrete ? zh("&#26377;&#27493;&#39588;&#12289;&#26696;&#20363;&#25110;&#21487;&#35265;&#30340;&#19996;&#35199;") : zh("&#34920;&#36798;&#20559;&#25277;&#35937;&#65292;&#35835;&#32773;&#19981;&#22909;&#31435;&#21051;&#29992;"), concrete ? "" : zh("&#21152;&#20837;&#25968;&#23383;&#12289;&#27493;&#39588;&#12289;&#26696;&#20363;&#25110;&#20855;&#20307;&#22330;&#26223;"));
}

function scoreSaveValue(copy = "", platform = "xhs") {
  const reusableWords = ["清单", "模板", "步骤", "公式", "方法", "SOP", "避坑", "复盘", "收藏", "对照"];
  const hasReusable = reusableWords.some((word) => String(copy || "").includes(word));
  const enough = platform === "moments" ? copy.length >= 80 : copy.length >= 240;
  const score = (hasReusable ? 54 : 30) + (enough ? 32 : 18);
  return coachDim(zh("&#25910;&#34255;&#20215;&#20540;"), Math.min(92, score), hasReusable ? zh("&#26377;&#21487;&#22797;&#29992;&#30340;&#26041;&#27861;&#25110;&#28165;&#21333;") : zh("&#30475;&#23436;&#21487;&#33021;&#26377;&#24863;&#35273;&#65292;&#20294;&#19981;&#22815;&#20540;&#24471;&#25910;&#34255;"), hasReusable ? "" : zh("&#21152;&#19968;&#27573;&#12298;&#20320;&#21487;&#20197;&#30452;&#25509;&#25353;&#36825;&#20960;&#27493;&#20570;&#12299;"));
}

function scoreHumanTone(copy = "") {
  const aiSmellWords = ["综上", "总之", "首先", "其次", "最后", "需要注意的是"];
  const humanWords = ["我", "你", "其实", "说白了", "刚开始", "踩坑", "别急", "真的"];
  const aiSmell = aiSmellWords.some((word) => String(copy || "").includes(word));
  const hasHuman = humanWords.some((word) => String(copy || "").includes(word));
  const score = 50 + (hasHuman ? 28 : 12) - (aiSmell ? 16 : 0);
  return coachDim(zh("&#20154;&#21619;&#34920;&#36798;"), Math.max(48, Math.min(92, score)), hasHuman && !aiSmell ? zh("&#26377;&#33258;&#28982;&#35821;&#27668;&#65292;AI &#21619;&#19981;&#37325;") : zh("&#35821;&#27668;&#36824;&#20687;&#27169;&#26495;&#25991;"), hasHuman && !aiSmell ? "" : zh("&#25226;&#22823;&#36947;&#29702;&#25913;&#25104;&#19968;&#20010;&#20154;&#23545;&#21478;&#19968;&#20010;&#20154;&#35828;&#35805;"));
}

function scorePlatformFit(copy = "", platform = "xhs") {
  let ok = true;
  let advice = "";
  if (platform === "moments") {
    ok = !/(标题[:：]|正文[:：]|配图建议|标签[:：]|#)/.test(copy) && copy.length <= 420;
    advice = zh("&#26379;&#21451;&#22280;&#19981;&#35201;&#20687;&#25991;&#31456;&#65292;&#25913;&#25104;&#33258;&#28982;&#30340;&#21475;&#35821;&#20998;&#20139;");
  } else if (platform === "wechat-article") {
    ok = copy.length >= 700 || /^#|^##/m.test(copy);
    advice = zh("&#20844;&#20247;&#21495;&#38656;&#35201;&#26356;&#23436;&#25972;&#30340;&#35770;&#35777;&#12289;&#23567;&#26631;&#39064;&#21644;&#26696;&#20363;");
  } else if (platform === "douyin" || platform === "video-account") {
    ok = /(开场|镜头|口播|字幕|钩子|0-3|3秒)/.test(copy);
    advice = zh("&#30701;&#35270;&#39057;&#35201;&#26377; 3 &#31186;&#38057;&#23376;&#12289;&#21475;&#25773;&#33410;&#22863;&#21644;&#38236;&#22836;&#20998;&#35299;");
  } else {
    ok = /(标签[:：]|#|收藏|评论|私信)/.test(copy);
    advice = zh("&#23567;&#32418;&#20070;&#35201;&#26377;&#25910;&#34255;&#28857;&#12289;&#20302;&#21387;&#34892;&#21160;&#20837;&#21475;&#21644;&#35805;&#39064;&#26631;&#31614;");
  }
  return coachDim(zh("&#24179;&#21488;&#36866;&#37197;"), ok ? 88 : 62, ok ? zh("&#20889;&#27861;&#22522;&#26412;&#31526;&#21512;&#24403;&#21069;&#24179;&#21488;") : zh("&#36824;&#20687;&#36890;&#29992;&#25991;&#26696;&#65292;&#24179;&#21488;&#20889;&#27861;&#19981;&#22815;"), ok ? "" : advice);
}

function scoreConversionPath(copy = "") {
  const actionWords = ["收藏", "评论", "私信", "对照", "测试", "保存", "下一步", "留言"];
  const hardWords = ["立刻购买", "马上成交", "保证", "包你", "稳赚"];
  const hasSoftAction = actionWords.some((word) => String(copy || "").includes(word));
  const tooHard = hardWords.some((word) => String(copy || "").includes(word));
  const score = 56 + (hasSoftAction ? 28 : 8) - (tooHard ? 18 : 0);
  return coachDim(zh("&#34892;&#21160;&#20837;&#21475;"), Math.max(45, Math.min(92, score)), hasSoftAction ? zh("&#32467;&#23614;&#26377;&#20302;&#21387;&#21160;&#20316;") : zh("&#32467;&#23614;&#27809;&#26377;&#35753;&#35835;&#32773;&#30693;&#36947;&#19979;&#19968;&#27493;&#20570;&#20160;&#20040;"), hasSoftAction ? "" : zh("&#21152;&#19968;&#20010;&#20302;&#21387;&#21160;&#20316;&#65306;&#25910;&#34255;&#12289;&#23545;&#29031;&#12289;&#35780;&#35770;&#25110;&#31169;&#20449;"));
}

function coachDim(name, score, reason, advice = "") {
  return { name, score: Math.round(score), reason, advice, warn: score < 76 };
}

function textOverlap(a = "", b = "") {
  const aText = String(a || "");
  const bText = String(b || "");
  const tokens = bText.match(/[A-Za-z0-9\u4e00-\u9fa5]{2,}/g) || [];
  return tokens.filter((token) => aText.includes(token)).length;
}

function buildCoachNextAction(total, weakest = []) {
  const first = weakest[0]?.name || zh("&#20869;&#23481;");
  if (total >= 86) return zh("&#21487;&#20197;&#36827;&#20837;&#30830;&#35748;&#65292;&#21482;&#38656;&#25163;&#21160;&#26680;&#23545;&#32454;&#33410;");
  if (first === zh("&#26631;&#39064;&#38057;&#23376;")) return zh("&#20808;&#25913;&#26631;&#39064;&#65292;&#26631;&#39064;&#19981;&#36807;&#20851;&#65292;&#21518;&#38754;&#20877;&#22909;&#20063;&#38590;&#29190;");
  if (first === zh("&#24320;&#22836;&#30041;&#23384;")) return zh("&#20808;&#25913;&#24320;&#22836;&#65292;&#29992;&#22330;&#26223;&#25110;&#20914;&#31361;&#25235;&#20303;&#20154;");
  if (first === zh("&#24179;&#21488;&#36866;&#37197;")) return `${zh("&#20808;&#25353;")} ${currentTarget().title} ${zh("&#30340;&#20889;&#27861;&#37325;&#25490;&#19968;&#29256;")}`;
  if (first === zh("&#20154;&#21619;&#34920;&#36798;")) return zh("&#20808;&#21435; AI &#21619;&#65292;&#25913;&#25104;&#26356;&#20687;&#20154;&#35828;&#35805;&#30340;&#29256;&#26412;");
  return `${zh("&#20808;&#20462;")}${first}${zh("&#65292;&#20877;&#36827;&#20837;&#19979;&#19968;&#27493;")}`;
}

function renderContentCoachPanel(coach) {
  return `<div class="content-coach-panel">
    <div class="content-coach-head">
      <div><b>${zh("&#21457;&#24067;&#21069;&#20307;&#26816;")}</b><span>${escapeHtml(coach.level)} - ${escapeHtml(coach.nextAction)}</span></div>
      <strong>${coach.total}</strong>
    </div>
    <div class="coach-dim-grid">
      ${coach.dimensions.map((item) => `<article class="${item.warn ? "warn" : ""}"><b>${escapeHtml(item.name)}</b><strong>${item.score}</strong><span>${escapeHtml(item.reason)}</span>${item.advice ? `<small>${escapeHtml(item.advice)}</small>` : ""}</article>`).join("")}
    </div>
    <div class="coach-action-box">
      <b>${zh("&#26412;&#27425;&#20248;&#20808;&#20462;&#36825;&#20960;&#28857;")}</b>
      <ol>${coach.weakest.map((item) => `<li><strong>${escapeHtml(item.name)}?</strong>${escapeHtml(item.advice || item.reason)}</li>`).join("")}</ol>
    </div>
  </div>`;
}

function scoreDraft() {
  const text = state.improvedDraft || state.draft || "";
  const review = state.draftReview || runLongkaReview(text);
  if (review) {
    const gate = review.gate || {};
    const ai = review.ai || {};
    const rows = [
      { name: "开头留存", ok: gate.checks?.answers_question !== false, good: "开头围绕当前主问题，没有泛泛铺垫。", bad: "开头还没有咬住当前标题对应的主问题。" },
      { name: "源头绑定", ok: Boolean(state.selectedTopicId), good: "正文绑定了选中的素材和标题。", bad: "缺少源头素材绑定，容易写成通用稿。" },
      { name: "具体感", ok: gate.checks?.not_encyclopedia !== false, good: "不是百科式堆知识，保留了判断路径。", bad: "表达太像百科说明，需要改成具体判断场景。" },
      { name: "人味表达", ok: ai.ok !== false, good: "没有明显模板腔。", bad: (ai.fixes || ["句式太顺、太完整，需要打散并加入真实口语节奏。"])[0] },
      { name: "行动入口", ok: gate.checks?.has_action !== false, good: "结尾有低压力下一步。", bad: "结尾缺少可执行动作。" },
      { name: "合规边界", ok: gate.checks?.no_fake_story !== false, good: "没有虚构身份、绝对承诺或高风险表达。", bad: "有虚构经历或承诺感，需要删除。" },
    ];
    return rows.map((item) => ({
      score: item.ok ? 88 : 66,
      name: item.name,
      reason: item.ok ? item.good : item.bad,
      warn: !item.ok,
    }));
  }
  const hasAction = /收藏|私信|留言|下一步|行动|测试|评估|对照|评论/.test(text);
  const hasSource = Boolean(state.selectedTopicId);
  const hasAiSmell = /真正|关键|此外|总之|不是.*而是|首先|其次|最后|希望.*帮助/.test(text);
  const hasRisky = /保证|根治|一定有效|确定收益|100%/.test(text);
  return [
    { score: text.length > 350 ? 84 : 68, name: "完整度", reason: text.length > 350 ? "已有正文和行动入口。" : "正文偏短，难以完成平台内容交付。", warn: text.length <= 350 },
    { score: hasSource ? 88 : 60, name: "源头绑定", reason: hasSource ? "绑定了选中素材。" : "缺少选中素材。", warn: !hasSource },
    { score: hasAiSmell ? 64 : 86, name: "人味表达", reason: hasAiSmell ? "有明显 AI 连接词或模板句式。" : "没有明显模板腔。", warn: hasAiSmell },
    { score: hasAction ? 84 : 66, name: "行动入口", reason: hasAction ? "有下一步动作。" : "需要给读者一个低门槛动作。", warn: !hasAction },
    { score: hasRisky ? 58 : 88, name: "合规边界", reason: hasRisky ? "存在绝对化表达。" : "没有明显绝对承诺。", warn: hasRisky },
  ];
}

function improveDraft(text, again = false) {
  if (!text) return "";
  const review = state.draftReview || runLongkaReview(text);
  const fixes = review?.rewriteBrief?.length ? review.rewriteBrief : [
    "开头删除解释腔，直接回答标题里的主问题。",
    "保留一个真实场景，不要每段都写成完整道理。",
    "把结尾改成低压力动作：收藏、对照、留言或评估。",
  ];
  return rewriteDraftByEditorialRules(text, fixes, again);
}

function rewriteDraftByEditorialRules(text = "", fixes = [], again = false) {
  const clean = stripEditorialNotes(text);
  const title = extractDraftField(clean, "标题") || state.selectedTitle || selectedTopic()?.theme || "这件事别急着照抄";
  const body = extractDraftField(clean, "正文") || clean;
  if (state.publishTarget === "moments") {
    return formatMomentsSopDraft(rewriteBodyWithFocus(body, fixes, again));
  }
  if (state.publishTarget === "wechat-article") {
    return formatWechatSopDraft({ title, body: rewriteBodyWithFocus(body, fixes, again) });
  }
  if (state.publishTarget === "douyin" || state.publishTarget === "video-account") {
    return formatVideoSopDraft({ title, body: rewriteBodyWithFocus(body, fixes, again) });
  }
  const tags = extractDraftField(clean, "标签") || "";
  const rewrittenTitle = rewriteTitleWithSuspense(title);
  const rewrittenBody = rewriteBodyWithFocus(body, fixes, again);
  const parts = [
    `标题：${rewrittenTitle}`,
    "",
    "正文：",
    rewrittenBody,
  ];
  if (tags) parts.push("", `标签：${compactTags(tags)}`);
  return parts.join("\n");
}

function stripEditorialNotes(text = "") {
  return String(text || "")
    .replace(/\n+Longka 文案体检修改方向[:：][\s\S]*$/g, "")
    .replace(/\n+第二轮体检修改方向[:：][\s\S]*$/g, "")
    .replace(/\n+第\d+轮体检修改方向[:：][\s\S]*$/g, "")
    .replace(/\n+优化补充[:：][\s\S]*$/g, "")
    .trim();
}

function extractDraftField(text = "", label = "") {
  const pattern = new RegExp(`${label}[：:]\\s*([\\s\\S]*?)(?=\\n\\s*(标题|正文|标签|配图建议|Longka|第二轮|第\\d+轮|优化补充)[：:]|$)`);
  const match = String(text || "").match(pattern);
  return match ? match[1].trim() : "";
}

function rewriteTitleWithSuspense(title = "") {
  const clean = String(title || "").replace(/\s+/g, " ").trim();
  if (!clean) return state.selectedTitle || "这件事别急着照抄";
  if (/为什么|到底|别急|真正|不是/.test(clean)) return clean;
  if (clean.length > 24) return `${clean.slice(0, 22)}，问题不在工具`;
  return `${clean}，先别急着要答案`;
}

function rewriteBodyWithFocus(body = "", fixes = [], again = false) {
  const selected = selectedTopic() || {};
  const question = cleanSourceText(selected.pain || selected.reason || selected.theme || state.businessLine);
  const raw = stripDraftFieldLabels(body)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^标签[：:]/.test(line))
    .filter((line) => !/^配图建议[：:]/.test(line))
    .filter((line) => !/Longka|体检|修改方向|优化补充/.test(line));
  const lead = buildSharperLead(raw, question, again);
  const points = buildFocusedPoints(raw).slice(0, 3);
  const cta = buildLowPressureCta(question);
  return [
    lead,
    "",
    ...points.flatMap((point, index) => [`${index + 1}. ${point.title}`, point.body, ""]),
    cta,
  ].join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function stripDraftFieldLabels(text = "") {
  return String(text || "")
    .replace(/^正文[：:]\s*/m, "")
    .replace(/^标题[：:].*$/m, "")
    .trim();
}

function buildSharperLead(lines = [], question = "", again = false) {
  const useful = lines.find((line) => line.length >= 12 && !/很多人一开始|其实|所以|总结|首先|其次|最后/.test(line));
  const base = useful || question || "这个问题真正麻烦的地方，不是不会用工具。";
  if (again) return `我会把问题再收窄一点：${base.replace(/[。！？?.]$/, "")}。`;
  return `${base.replace(/[。！？?.]$/, "")}。`;
}

function buildFocusedPoints(lines = []) {
  const clean = lines
    .map((line) => line.replace(/^\d+[.、]\s*/, "").replace(/^[-•]\s*/, "").trim())
    .filter((line) => line.length >= 8)
    .filter((line) => !/标签|配图|Longka|体检|修改方向|优化补充/.test(line));
  if (clean.length >= 3) {
    return clean.slice(0, 3).map((line, index) => ({
      title: index === 0 ? "先把主问题说窄" : index === 1 ? "保留真实判断，不要写成百科" : "给读者一个能马上做的动作",
      body: line.endsWith("。") ? line : `${line}。`,
    }));
  }
  return [
    {
      title: "先判断你卡的是素材，还是表达",
      body: "如果素材本身很薄，继续换标题、换模型都没用。先把能证明这个观点的案例、评论、截图和反例补齐。",
    },
    {
      title: "只抓一个主问题写，不要一篇塞太满",
      body: "小红书图文更怕平均用力。围绕一个判断讲透，比把所有类型都讲一遍更容易让人停下来。",
    },
    {
      title: "结尾给一个低压力动作",
      body: "不要急着卖，也不要硬总结金句。让读者先收藏、对照、留言一个具体问题，后面才有继续转化的空间。",
    },
  ];
}

function buildLowPressureCta(question = "") {
  const topic = question || selectedTopic()?.theme || state.businessLine;
  return `如果你也卡在「${topic.slice(0, 24)}」这类问题上，先别急着照抄别人的方案。把你现在最卡的一句话写下来，再决定下一步怎么改。`;
}

function compactImagePlan(imagePlan = "") {
  return String(imagePlan || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5)
    .join("\n");
}

function compactTags(tags = "") {
  const clean = String(tags || "")
    .replace(/^标签[：:]\s*/, "")
    .replace(/[，,]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8);
  return clean.join(" ");
}
function buildDeliveryPlan() {
  if (state.publishTarget === "wechat-article") return ["长文标题", "开头问题", "案例展开", "方法论结构", "结尾转化"];
  if (state.publishTarget === "douyin" || state.publishTarget === "video-account") return ["封面标题", "黄金 3 秒", "口播正文", "分镜字幕", "素材需求"];
  if (state.publishTarget === "moments") return ["自然开头", "真实观察", "判断建议", "私聊入口"];
  return ["封面：停留标题", "第 2 张：为什么别急着照抄", "第 3 张：3 个自查问题", "第 4 张：源头痛点", "第 5 张：行动入口"];
}

// ── 编辑审查循环（P1-2）──────────────────────────────────────────────
// P2-1: 调用服务端 humanizer-zh skill 对最终稿做去 AI 味处理
// 仅当文案长度超过 100 字时触发；失败静默降级返回原文
async function humanizeDraftWithSkill(draft) {
  if (!draft || draft.length < 100) return draft;
  try {
    const res = await fetch(apiPath("/api/skills/run"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        skill: "humanizer-zh",
        content: draft,
        // 平台字数规则：xhs 350-600 字，wechat 不限字数但言之有物
        vars: { platform: currentTarget()?.platform || state.publishTarget || "xhs" },
      }),
    });
    if (!res.ok) return draft;
    const result = await res.json().catch(() => ({}));
    if (result.ok && result.result?.text && result.result.text.length > 50) {
      state.draftMeta = { ...(state.draftMeta || {}), humanized: true, humanizeModel: result.model };
      return result.result.text;
    }
  } catch {
    // 静默降级
  }
  return draft;
}

// 编辑审查：读取 runLongkaReview 已算出的真实诊断（同一个 runEditorialReview），
// 记录验收结论 + 把改进建议带给下一版。绝不用本地模板 improveDraft 覆盖 LLM 好稿（会降质）。
async function runEditorialReviewLoop(draft, topic) {
  const review = state.draftReview;
  if (!review) return draft;
  state.draftMeta = {
    ...(state.draftMeta || {}),
    editorialRounds: review.round || 1,
    editorialPass: !!review.passed,
  };
  const brief = (review.rewriteBrief || []).filter(Boolean);
  // 未通过：把真实改进建议带进"继续优化"指令，让下一版 LLM 重写时吸收（不在此处用模板改写）
  if (!review.passed && brief.length && state.pendingRevision) {
    state.pendingRevision.qualityFeedback = {
      ...(state.pendingRevision.qualityFeedback || {}),
      rewriteBrief: [
        ...(state.pendingRevision.qualityFeedback?.rewriteBrief || []),
        ...brief.map((s) => `编辑审查：${s}`),
      ].slice(0, 10),
    };
  }
  return draft;
}
