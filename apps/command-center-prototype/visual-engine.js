// visual-engine.js — XHS卡片规划、插画导演方案、图片生成与轮询
// 依赖: state-manager.js, config.js, utils.js, copy-manager.js

function extractBodyLinesForCards(copy = "") {
  return normalizeCopyText(copy)
    .split(/\n+/)
    .map((line) => line.replace(/^(标题|正文|配图建议|标签)[:：\s]*/u, "").trim())
    .filter((line) => line && !/^#/.test(line))
    .slice(0, 12);
}
function buildXhsCardPlanFromConfirmedCopy() {
  const copy = confirmedCopyText();
  const topic = selectedTopic() || {};
  const visual = currentVisualStyle();
  const lines = extractBodyLinesForCards(copy);
  const title = state.selectedTitle || topic.theme || topic.title || "AI 内容创作为什么总是没流量";
  const director = buildLongkaIllustrationDirectorPlan({ copy, topic, visual, lines, title });
  return buildTopicBoundVisualCards({ copy, topic, visual, lines, title, director });
}
function ensureXhsCardPlan() {
  if (!state.xhsCardPlan.length && state.copyConfirmed) {
    state.xhsCardPlan = buildCleanXhsCardPlanFromConfirmedCopy();
  }
  return state.xhsCardPlan;
}

function buildCleanXhsCardPlanFromConfirmedCopy() {
  const copy = confirmedCopyText();
  const topic = selectedTopic() || {};
  const visual = currentVisualStyle();
  const lines = extractBodyLinesForCards(copy);
  const title = state.selectedTitle || topic.theme || topic.title || "AI 内容创作为什么总是没流量";
  const director = buildLongkaIllustrationDirectorPlan({ copy, topic, visual, lines, title });
  return buildTopicBoundVisualCards({ copy, topic, visual, lines, title, director });
}
function buildTopicBoundVisualCardsLegacy(options = {}) {
  return buildTopicBoundVisualCards(options);
}
function buildLongkaIllustrationDirectorPlan({ copy = "", topic = {}, visual = currentVisualStyle(), lines = [], title = "" } = {}) {
  const signal = extractVisualTopicSignals({ copy, topic, title, lines });
  const platform = visualPlatformForCurrentTarget();
  const style = visual.id;
  const contract = visualStyleContract(style);
  const density = estimateIllustrationDensity({ copy, lines, platform });
  const styleReason = style === "juju-organizing"
    ? "This copy needs a paper-world organizer: turn abstract method/process into enterable scenes."
    : style === "xiaohei-metaphor"
      ? "This copy has tension or opinion: use one weird-but-clear character action to make readers stop."
      : style === "guizang-editorial"
        ? "This copy is closer to insight/report/deck: use editorial hierarchy and evidence layout."
        : "This copy has checklist or tutorial value: turn it into save-worthy knowledge cards.";
  const platformMode = platform === "wechat-article"
    ? "semantic article illustration"
    : platform === "moments"
      ? "single light social image"
      : platform === "douyin-images"
        ? "cover plus image-post storyboard"
        : "xiaohongshu carousel";
  const qa = contract.qa || ["style contract is followed", "content matches topic", "text is readable", "image is publishable"];
  const allSlots = [
    { type: "cover", role: "Stop-scroll cover", placement: platform === "wechat-article" ? "article opening cover" : "P1", job: "make the reader stop and understand the main promise", focus: `${signal.subject} + ${signal.result}` },
    { type: "problem", role: "Problem visual", placement: platform === "wechat-article" ? "after the first pain paragraph" : "P2", job: "externalize the hidden question or pitfall", focus: signal.pain },
    { type: "case", role: "Key points", placement: platform === "wechat-article" ? "after the key-point paragraph" : "P3", job: "show the core points of THIS content (use the copy's own points; it is NOT a benchmark/case deconstruction unless the copy itself is)", focus: signal.casePoints.join(" / ") },
    { type: "method", role: "Method path", placement: platform === "wechat-article" ? "inside method section" : "P4", job: "turn the idea into an executable path", focus: signal.methodSteps.join(" -> ") },
    { type: "action", role: "Next action", placement: platform === "wechat-article" ? "before the ending CTA" : "P5", job: "tell the operator/reader the next concrete step", focus: signal.action },
  ];
  const jujuWorld = style === "juju-organizing" ? inferJujuParallelWorld({ copy, topic, signal, platform }) : "";
  const slots = allSlots
    .filter((slot) => density.types.includes(slot.type))
    .map((slot, index) => style === "juju-organizing" ? enrichJujuDirectorSlot(slot, index, signal, jujuWorld) : slot);
  return { style, styleReason, platformMode, signal, qa, slots, imageCount: slots.length, countReason: density.reason, jujuWorld };
}

function inferJujuParallelWorld({ copy = "", topic = {}, signal = {}, platform = "xhs" } = {}) {
  const text = [copy, topic.theme, topic.title, topic.pain, signal.subject, signal.pain].filter(Boolean).join(" ");
  if (/复盘|增长|数据|曝光|粉丝|阅读|播放/.test(text)) return "paper retrospective repair shop with pinned metric cards and small evidence photos";
  if (/面试|表达|孩子|家长|私校|教育/.test(text)) return "paper interview practice room with answer cards, expression path, and teacher question notes";
  if (/工具|AI|MVP|工作流|系统|流程/.test(text)) return "paper method desk with tool cards, route strips, and a small workflow board";
  if (/律师|案件|法条|客户|专业/.test(text)) return "paper case translation room with law-note cards and client question tabs";
  if (platform === "wechat-article") return "paper article reading desk with section cards and insertion markers";
  return "paper practice field with notes, tape, route cards, and small working props";
}

function enrichJujuDirectorSlot(slot, index, signal, parallelWorld) {
  const map = {
    cover: {
      cognitiveAction: "enter the topic through one concrete paper-world scene",
      jujuAction: "Juju pins the main topic note onto the practice field entrance and points to the result card",
      metaphorProps: "main note card, paper gate, tape, tiny flag, one result card",
      composition: "3:4 cover, large handwritten title on top, Juju in lower third, paper-world scene visible behind",
      colorMood: "near-white paper, black linework, muted green, small orange scarf accent",
    },
    problem: {
      cognitiveAction: "see the hidden reader problem instead of the surface topic",
      jujuAction: "Juju uses a magnifying glass to inspect a problem note and separates wrong path from real issue",
      metaphorProps: "magnifying glass, warning tab, two note cards, small red correction mark",
      composition: "subject on left third, problem note on right third, arrow connects Juju action to the note",
      colorMood: "near-white paper, muted orange warning, low-saturation blue secondary path",
    },
    case: {
      cognitiveAction: "organize this content's own core points into a few clear cards (not a benchmark-case deconstruction)",
      jujuAction: "Juju organizes a few note cards carrying the content's key points",
      metaphorProps: "archive cards, clips, divider tabs, tiny evidence photo, pencil marks",
      composition: "small archive desk, repeated cards create rhythm, Juju actively sorting one card",
      colorMood: "near-white paper, muted green dividers, small yellow tape accents",
    },
    method: {
      cognitiveAction: "turn the idea into an executable path",
      jujuAction: "Juju draws a route map with a pencil and marks the next station",
      metaphorProps: "route strip, dotted line, four small stations, pencil, arrow labels",
      composition: "leading-line composition, road/path guides the eye from Juju to the key step",
      colorMood: "near-white paper, muted blue route, orange main path",
    },
    action: {
      cognitiveAction: "know the next concrete step",
      jujuAction: "Juju stamps a checklist and places the first action card into an envelope",
      metaphorProps: "checklist, stamp, envelope, done mark, tiny paper tab",
      composition: "clean ending card, checklist centered, Juju action clear, plenty of whitespace",
      colorMood: "near-white paper, muted green success mark, small orange stamp",
    },
  };
  const base = map[slot.type] || map.cover;
  return {
    ...slot,
    cognitiveAction: base.cognitiveAction,
    jujuAction: base.jujuAction,
    parallelWorld,
    metaphorProps: base.metaphorProps,
    colorMood: base.colorMood,
    composition: base.composition,
    allowedText: jujuAllowedTextForSlot(slot, signal, index),
  };
}

function jujuAllowedTextForSlot(slot, signal, index) {
  const textByType = {
    cover: [signal.subject, signal.result].filter(Boolean),
    problem: [signal.problemTitle || "问题", String(signal.pain || "").slice(0, 16)].filter(Boolean),
    case: signal.casePoints || [],
    method: signal.methodSteps || [],
    action: [signal.actionTitle || "下一步", String(signal.action || "").slice(0, 18)].filter(Boolean),
  };
  return (textByType[slot.type] || [signal.subject])
    .map((item) => String(item || "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, slot.type === "method" ? 4 : 3)
    .join("; ");
}

function estimateIllustrationDensity({ copy = "", lines = [], platform = "xhs" } = {}) {
  if (platform === "moments") return { types: ["cover"], reason: "朋友圈只需要一张轻配图，不做图集。" };
  if (platform === "wechat-article") {
    const rich = lines.length >= 8 || /案例|步骤|方法|流程|对比|复盘|数据|清单/.test(copy);
    return rich
      ? { types: ["cover", "problem", "case", "method", "action"], reason: "公众号长文信息量足够，适合 4-5 张语义插图。" }
      : { types: ["cover", "problem", "action"], reason: "正文信息量一般，只插 3 张关键图，避免硬凑。" };
  }
  const signals = [
    /案例|来源|样本|对标|爆款/.test(copy),
    /步骤|方法|流程|SOP|路径|清单/.test(copy),
    /问题|痛点|坑|误区|为什么/.test(copy),
    /数据|结果|收益|阅读|收藏|评论|增长/.test(copy),
    lines.length >= 7,
  ].filter(Boolean).length;
  // 小红书:封面由【②做封面】单独出,③这里只出内页,绝不再自带封面(否则两个封面/重复)。
  if (signals >= 4) return { types: ["problem", "case", "method", "action"], reason: "内页 4 张（封面由②做封面单独出）。" };
  if (signals === 3) return { types: ["problem", "case", "action"], reason: "内页 3 张（封面由②做封面单独出）。" };
  if (signals === 2) return { types: ["problem", "case", "action"], reason: "内页 3 张（封面由②做封面单独出）。" };
  if (signals === 1) return { types: ["problem", "action"], reason: "内页 2 张（封面由②做封面单独出）。" };
  return { types: ["problem", "action"], reason: "内页 2 张（封面由②做封面单独出）。" };
}
function buildTopicBoundVisualCards({ copy = "", topic = {}, visual = currentVisualStyle(), lines = [], title = "", director = null } = {}) {
  const signal = extractVisualTopicSignals({ copy, topic, title, lines });
  const plan = director || buildLongkaIllustrationDirectorPlan({ copy, topic, visual, lines, title });
  const contract = visualStyleContract(visual.id);
  const juju = visual.id === "juju-organizing";
  const actionBriefs = visualCardActionBriefs(visual.id);
  const promptBase = [
    "3:4 social content image.",
    `Topic: ${signal.subject}.`,
    `Result/proof: ${signal.result}.`,
    `Topic context only (background, do NOT render this long title as the big headline text): ${title}.`,
    `Visual route: ${contract.route}.`,
    `Character/style: ${contract.character}.`,
    `Style lock: ${contract.styleLock}.`,
    `Style brief: ${contract.styleBrief}.`,
    `Negative prompt: ${contract.negativePrompt}.`,
    "Do not reuse unrelated content asset library, title formula library, user question library, or structure library visuals unless this selected topic is explicitly about those libraries.",
    "Aesthetic quality: clean, elegant, and clear at a glance (简洁大方、一目了然). ONE clear focal point / single scene that nails this page's theme, supported by only a few (about 3-5) meaningful details that reinforce that one point. Generous breathing room, strong visual hierarchy, mobile-legible. Do NOT crowd the canvas with many scattered objects, multiple protagonists, or several mini-scenes — clutter that splits the focus is worse than too little. Use tasteful light color accents (warm red/orange or soft blue) on a clean base, not flat black-and-white. Vary the layout from page to page so the set does not look monotonous.",
    "文对题铁律(HIGHEST PRIORITY): every page MUST visualize the MEANING of THIS copy's own text. Never substitute a generic framework (case-deconstruction, who/what/result, 选案例/拆结构/找亮点, a fixed step-flow) when the copy is not about that. Do NOT drift off-topic (不跑题). Numbers / facts / metrics only from the copy itself — never invent them."
  ].join(" ");
  const cardSpecs = {
    cover: { title: signal.coverText, text: signal.coverText, extra: `Hook = 「${signal.coverText}」.`, layout: "Cover layout: one bold headline, one strong hero focal element, lots of whitespace, magazine-cover feel.", prompt: `Cover page. The cover's ONE big headline text is EXACTLY this Chinese hook, verbatim: 「${signal.coverText}」 — and NOTHING ELSE as big text. Do NOT render the topic name, the source/母题 title, or any other long sentence as the big text. Do NOT replace the hook with a how-to/method/step line. The hook is the single dominant largest text; everything else is small annotations only.` },
    problem: { title: signal.problemTitle, text: signal.pain, extra: `Visualize EXACTLY this point from the copy: 「${signal.pain}」. Do not invent a generic problem.`, layout: "Layout that fits this point (a contrast / a single tense scene). Pick what suits the meaning, not a fixed template.", prompt: `A page that visualizes the copy's own idea, verbatim meaning: 「${signal.pain}」. Stay strictly on this meaning; do NOT drift to an unrelated topic or a generic framework.` },
    case: { title: signal.caseTitle, text: signal.casePoints.join("\n"), extra: `These are the copy's OWN points: ${signal.casePoints.join(" / ")}. Visualize THESE, not a generic who/what/result case.`, layout: "A clean points layout (a short list or a few blocks), one point per block; only as many blocks as there are real points.", prompt: `A key-points page visualizing the copy's own points: ${signal.casePoints.join(" / ")}. It is NOT a benchmark/case deconstruction unless the copy itself is about deconstructing a case. Do NOT add 选案例/拆结构/找亮点 style filler.` },
    method: { title: signal.methodTitle, text: signal.methodSteps.join("\n"), extra: `Use the copy's OWN steps: ${signal.methodSteps.join(" / ")}.`, layout: "Step-flow layout only IF the copy is actually a step/process; otherwise a simple clean layout for these points.", prompt: `A method page showing the copy's own steps/points, verbatim meaning: ${signal.methodSteps.join(" / ")}. Do not invent steps the copy never said.` },
    action: { title: signal.actionTitle, text: signal.action, extra: `The copy's OWN next step: 「${signal.action}」.`, layout: "Checklist or single-highlight layout for one concrete next step.", prompt: `An action page for the copy's own next step, verbatim meaning: 「${signal.action}」. Stay on this; do not drift.` },
  };
  return plan.slots.map((slot) => {
    const spec = cardSpecs[slot.type] || cardSpecs.cover;
    const actionBrief = actionBriefs[slot.type] || "";
    const role = `${slot.placement || ""} ${slot.role || slot.type}`.trim();
    const layoutHint = (visual.id === "xhs-knowledge-card" || visual.id === "guizang-editorial") ? (spec.layout || "") : "";
    const jujuPromptBlock = juju ? [
      "Original JUJU visual language.",
      "Target ratio and size: 3:4, 1200 x 1600.",
      "Juju must look like a white bichon dog: black eyes, black nose, clear eye-nose triangle, drooping ears, short legs, small dog proportions, optional orange scarf.",
      "Juju must look like a white bichon dog, not a sheep or wool ball.",
      `Cognitive action: ${slot.cognitiveAction || slot.job || ""}.`,
      `Juju action: ${slot.jujuAction || ""}. Juju must physically perform this action, not stand idle.`,
      `Parallel world: ${slot.parallelWorld || "paper practice field"}.`,
      `Metaphor props: ${slot.metaphorProps || "note cards, tape, route marks, paper tabs"}.`,
      `Color mood: ${slot.colorMood || "near-white paper, light black linework, low-saturation accents"}.`,
      `Composition: ${slot.composition || "paper-world scene with generous whitespace and one clear focal action"}.`,
      `Allowed text only: ${slot.allowedText || `${String(spec.title || "").slice(0, 18)}; ${String(spec.text || "").split("\n").slice(0, 2).join("; ").slice(0, 36)}`}.`,
      "Chinese labels must be handwritten and attached to paper objects such as note cards, tabs, arrows, tape, frames, tools, or props.",
      "No copied example composition; use the example set only to calibrate feel.",
      "No photo, no realistic human, no slide template, no dashboard, no dense paragraph, no pasted subtitle, no watermark."
    ].join(" ") : "";
    return {
      type: slot.type,
      role,
      title: spec.title,
      text: spec.text,
      visualStyle: visual.id,
      carouselJob: role,
      visualBrief: `${contract.styleBrief} Director placement: ${slot.placement || "current page"}. Reader job: ${slot.job || ""}. Visual focus: ${slot.focus || ""}. ${actionBrief} ${spec.extra}`,
      readerTakeaway: slot.job || signal.takeaway,
      imagePrompt: `${promptBase} Placement: ${slot.placement || ""}. Reader job: ${slot.job || ""}. Visual focus: ${slot.focus || ""}. Title: ${spec.title}. Allowed text only: ${String(spec.title || "").slice(0, 18)}; ${String(spec.text || "").split("\n").slice(0, 3).join("; ").slice(0, 48)}. ${spec.prompt} ${layoutHint} ${actionBrief} ${jujuPromptBlock}`,
    };
  });
}
function extractVisualTopicSignals({ copy = "", topic = {}, title = "", lines = [] } = {}) {
  const source = cleanSourceText([title, copy, topic.title, topic.theme, topic.body, topic.content].filter(Boolean).join(" "));
  // 数字只从正文取,没有就留空——绝不编(数字事实铁律)
  const metric = source.match(/(\d+(?:\.\d+)?\s*[万千百]?\+?\s*(?:阅读|播放|收藏|点赞|评论|收益|收入|粉丝|转化|天|周|个|件|次|%|倍))/)?.[1] || "";
  const subject = cleanSourceText(topic.theme || topic.title || title).replace(/[，。！？,.!?].*$/, "").slice(0, 18) || "这个主题";
  const clip = (s, n = 18) => cleanSourceText(String(s || "")).replace(/^[\s\d.、)）]+/, "").slice(0, n);
  const has = (re) => lines.find((line) => re.test(line)) || "";
  // 卡片内容一律从真实正文里抽,不套"案例拆解"模板
  const pain = has(/为什么|不是|别|误区|坑|焦虑|累|难|卡|忽略|问题|总是|老是/) || lines[0] || `${subject}里大多数人忽略的关键点`;
  const keyLine = has(/关键|核心|其实|重点|真相|本质|秘诀|不是.{0,12}而是/) || "";
  const stepLines = lines.filter((line) => /^\s*\d|第[一二三四五六七八九]|步|先|再|然后|接着|最后|每天|今天/.test(line)).slice(0, 4);
  const action = has(/先|第一步|今天|从.{0,8}开始|建议|试|做一件|行动|坚持|现在就/) || lines[lines.length - 1] || "从今天起先做最小的一件事";
  return {
    subject,
    result: metric, // 无则空,下游不显假数字
    keyPoint: keyLine ? clip(keyLine, 14) : "核心要点",
    coverText: (typeof state !== "undefined" && (state.coverHook || state.selectedTitle)) ? (state.coverHook || state.selectedTitle) : (title || subject),
    problemTitle: clip(pain, 16),
    caseTitle: keyLine ? clip(keyLine, 14) : `${subject}·重点`, // 跟正文走,不再"X案例拆解"
    methodTitle: "可执行的方法",
    actionTitle: clip(action, 16), // 用正文的行动句,不再"先照着拆一个真实案例"
    pain: clip(pain, 40),
    action: clip(action, 40),
    takeaway: keyLine ? clip(keyLine, 30) : clip(pain, 30),
    casePoints: (stepLines.length ? stepLines : lines.slice(0, 3)).map((line) => clip(line, 20)).filter(Boolean),
    methodSteps: (stepLines.length ? stepLines : lines.slice(0, 4)).map((line) => clip(line, 16)).filter(Boolean),
  };
}
function renderCleanXhsCardPreview() {
  const cards = ensureXhsCardPlan();
  if (!cards.length) return `<div class="empty-state"><b>${zh("&#35831;&#20808;&#30830;&#35748;&#25991;&#26696;")}</b><span>${zh("&#30830;&#35748;&#25991;&#26696;&#21518;&#65292;&#25165;&#20250;&#29983;&#25104;&#21487;&#25191;&#34892;&#30340;&#20986;&#22270; brief&#12290;")}</span></div>`;
  const realFiles = Array.isArray(currentVisualManifest()?.publicFiles) ? currentVisualManifest().publicFiles : [];
  return `<div class="xhs-card-preview-panel">
    ${renderXhsGeneratedGallery()}
    ${realFiles.length ? `<div class="status-strip success">${zh("&#24050;&#29983;&#25104;")}: ${escapeHtml(realFiles.length)} ${zh("&#24352;")}</div>` : ""}
    ${state.xhsCardExportMessage ? `<div class="status-strip ${state.xhsCardExportStatus === "error" ? "warn" : ""}">${escapeHtml(state.xhsCardExportMessage)}</div>` : ""}
  </div>`;
}

function renderIllustrationDirectorPanel() {
  const copy = confirmedCopyText();
  const topic = selectedTopic() || {};
  const visual = currentVisualStyle();
  const lines = extractBodyLinesForCards(copy);
  const title = state.selectedTitle || topic.theme || topic.title || "";
  const plan = buildLongkaIllustrationDirectorPlan({ copy, topic, visual, lines, title });
  return `<div class="illustration-director">
    <div class="director-head">
      <div>
        <b>Longka 配图导演</b>
        <span>先判断图位和阅读功能，再调用对应风格 skill 出图。图数按内容密度决定，不硬凑。</span>
      </div>
      <em>${escapeHtml(plan.platformMode)} / ${escapeHtml(visualRouteNameClean(plan.style))}</em>
    </div>
    <div class="director-reason"><b>推荐理由</b><span>${escapeHtml(plan.styleReason)} ${escapeHtml(plan.countReason || "")}</span></div>
    <div class="director-slots">
      ${plan.slots.map((slot) => `<article>
        <em>${escapeHtml(slot.placement)}</em>
        <b>${escapeHtml(slot.role)}</b>
        <span>${escapeHtml(slot.job)}</span>
        <small>${escapeHtml(String(slot.focus || "").slice(0, 90))}</small>
        ${plan.style === "juju-organizing" ? `<small>${escapeHtml(`Juju: ${slot.jujuAction || ""}`)}</small><small>${escapeHtml(`认知动作: ${slot.cognitiveAction || ""}`)}</small>` : ""}
      </article>`).join("")}
    </div>
    <div class="director-qa"><b>出图验收</b>${plan.qa.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
  </div>`;
}
function renderVisualStylePicker() {
  return `<div class="visual-style-grid">
    ${visualStyles.map((item) => `<button type="button" class="visual-style-option ${item.id === state.visualStyle ? "active" : ""}" data-visual-style="${escapeHtml(item.id)}">
      <b>${escapeHtml(item.title)}</b>
      <span>${escapeHtml(item.desc)}</span>
      <em>${escapeHtml(item.route)}</em>
    </button>`).join("")}
  </div>`;
}

function renderCurrentCopyForImage() {
  const confirmed = state.copyVersions.find((item) => item.id === state.confirmedCopyVersionId);
  const copy = confirmedCopyText();
  const title = state.selectedTitle || selectedTopic()?.theme || selectedTopic()?.title || "未选择标题";
  const summary = copy.split(/\n+/).map((line) => line.trim()).filter(Boolean).slice(0, 4).join("\n");
  return `<div class="xhs-current-copy">
    <div class="xhs-current-copy-head">
      <b>当前用于出图的文案</b>
      <span>${confirmed ? `已确认版本：第 ${confirmed.round} 版 / ${confirmed.score || "-"} 分` : "已确认当前正文"}</span>
    </div>
    <strong>${escapeHtml(title)}</strong>
    <pre>${escapeHtml(summary || copy || "暂无文案摘要")}</pre>
    <div class="xhs-current-copy-actions">
      <button class="secondary" type="button" data-step-target="7">重新生成文案</button>
      <button class="ghost" type="button" data-step-target="9">查看/更换确认版本</button>
    </div>
  </div>`;
}
function renderXhsGeneratedGallery() {
  const files = Array.isArray(currentVisualManifest()?.publicFiles) ? currentVisualManifest().publicFiles : [];
  const isXiaohei = /gpt-image-2|43-fallback/.test(String(state.xhsCardManifest?.renderer || ""));
  if (files.length) {
    const done = Number(state.xhsCardProgress?.done || files.length || 0);
    const total = Number(state.xhsCardProgress?.total || 5);
    const isLoading = state.xhsCardExportStatus === "loading";
    const styleName = visualRouteNameClean(state.visualStyle);
    return `<div class="xhs-generated-gallery">
      <div class="xhs-generated-head">
        <b>${escapeHtml(styleName)} 出图结果</b>
        <span>${isLoading ? `正在生成: ${done}/${total} 张。已生成的先显示，可点开看大图。` : "图片已生成，点开可看大图。"}</span>
        ${!isLoading ? `<button class="secondary" data-judge-inner style="font-size:12px;padding:4px 10px;margin-top:6px;" ${state.xhsCardJudging ? "disabled" : ""}>${state.xhsCardJudging ? "质检中…" : "🔍 质检这组配图(文对题/清晰)"}</button>` : ""}
      </div>
      <div class="xhs-generated-grid ${isLoading ? "partial" : ""}">
        ${files.map((file, index) => {
          const raw = String(file);
          const src = /^https?:\/\//.test(raw) ? raw : `./${raw.replace(/^\/+/, "")}`;
          const jd = (state.xhsCardJudge || {})[raw];
          const verdict = jd && jd.ok !== false
            ? `<span class="xhs-judge ${jd.pass ? "ok" : "warn"}">${jd.pass ? "✅ AI判图通过" : "⚠️ AI判图·建议重出"} · 对题${jd.ontopic ?? "?"}/10 清晰${jd.clarity ?? "?"}/10</span>`
            : "";
          const tip = jd && jd.fix && jd.fix !== "无" ? ` title="AI建议:${escapeHtml(String(jd.fix))}"` : "";
          return `<a href="${escapeHtml(src)}" target="_blank" rel="noreferrer"${tip}>
            <img src="${escapeHtml(src)}" alt="${escapeHtml(styleName)} P${index + 1}" loading="lazy" />
            <span class="xhs-page">P${index + 1}</span>
            ${verdict}
          </a>`;
        }).join("")}
      </div>
    </div>`;
  }
  if (state.xhsCardExportStatus === "loading" && state.xhsCardOperation === "xiaohei") {
    const done = Number(state.xhsCardProgress?.done || files.length || 0);
    const total = Number(state.xhsCardProgress?.total || 5);
    return `<div class="xhs-generated-empty loading">
      <b>正在生成配图</b>
      <span>正在逐张生成：${done}/${total}。已生成的图片会先保留，避免整批超时后全部丢失。</span>
      ${files.length ? `<div class="xhs-generated-grid partial">
        ${files.map((file, index) => {
          const raw = String(file);
          const src = /^https?:\/\//.test(raw) ? raw : `./${raw.replace(/^\/+/, "")}`;
          return `<a href="${escapeHtml(src)}" target="_blank" rel="noreferrer">
            <img src="${escapeHtml(src)}" alt="配图 ${index + 1}" loading="lazy" />
            <span>P${index + 1}</span>
          </a>`;
        }).join("")}
      </div>` : ""}
    </div>`;
  }
  if (state.xhsCardExportStatus === "loading") {
    return `<div class="xhs-generated-empty loading">
      <b>正在导出拆页方案</b>
      <span>这一步用于检查每页承载的信息，不代表最终出图结果。</span>
    </div>`;
  }
  if (!files.length) {
    return `<div class="xhs-generated-empty">
      <b>还没有出图</b>
      <span>确认文案后，点上面的【生成内页配图】，生成好的图会显示在这里。</span>
      <button class="secondary" type="button" data-restore-latest-xiaohei>查询这个主题已生成的图</button>
    </div>`;
  }
  return `<div class="xhs-generated-gallery">
    <div class="xhs-generated-head">
      <b>${isXiaohei ? "出图结果" : "拆页方案导出结果"}</b>
      <span>${isXiaohei ? "图片已生成，点开可看大图。" : "这些只是页面方案 PNG，不是最终配图成品。"}</span>
    </div>
    <div class="xhs-generated-grid">
      ${files.map((file, index) => {
        const raw = String(file);
        const src = /^https?:\/\//.test(raw) ? raw : `./${raw.replace(/^\/+/, "")}`;
        return `<a href="${escapeHtml(src)}" target="_blank" rel="noreferrer">
          <img src="${escapeHtml(src)}" alt="${isXiaohei ? "配图" : "拆页图"} ${index + 1}" loading="lazy" />
          <span>P${index + 1}</span>
        </a>`;
      }).join("")}
    </div>
  </div>`;
}

function renderXhsCarouselCard(card, index) {
  const role = escapeHtml(card.role || "内容页");
  const job = escapeHtml(card.carouselJob || "");
  const title = escapeHtml(card.title || "");
  const text = escapeHtml(card.text || "");
  const takeaway = escapeHtml(card.readerTakeaway || "");
  const items = String(card.text || "").split(/\n+/).map((line) => line.trim()).filter(Boolean).slice(0, 6);
  const ops = `<div class="xhs-card-ops"><span>P${index + 1} / ${role}</span><em>${job}</em></div>`;
  if (index === 0) {
    return `<div class="xhs-card-wrap">${ops}<article class="xhs-preview-card xhs-recipe-cover ${escapeHtml(card.type)}">
        <h3>${title}</h3>
        <div class="xhs-cover-scene">
          <div class="xhs-archive-stack"><i></i><i></i><i></i></div>
          <div class="xhs-xiaohei"><b></b><span></span></div>
        </div>
        <p>${text}</p>
      </article></div>`;
  }
  if (index === 1) {
    return `<div class="xhs-card-wrap">${ops}<article class="xhs-preview-card xhs-recipe-contrast ${escapeHtml(card.type)}">
        <h3>${title}</h3>
        <div class="xhs-contrast-board">
          <section><b>只靠工具</b><span>prompt</span><span>模板</span><span>换标题</span></section>
          <section><b>真正系统</b><span>素材</span><span>拆解</span><span>复用</span></section>
        </div>
        <p>${text}</p>
      </article></div>`;
  }
  if (index === 2) {
    return `<div class="xhs-card-wrap">${ops}<article class="xhs-preview-card xhs-recipe-matrix ${escapeHtml(card.type)}">
        <h3>${title}</h3>
        <div class="xhs-asset-matrix">
          ${(items.length ? items : ["爆款素材库", "标题公式库", "用户问题库", "结构拆解库"]).slice(0, 4).map((item, itemIndex) => `<div><em>0${itemIndex + 1}</em><strong>${escapeHtml(item)}</strong><span>${["看什么值得写", "标题不再乱编", "知道用户在问什么", "复用爆款结构"][itemIndex] || "沉淀资产"}</span></div>`).join("")}
        </div>
      </article></div>`;
  }
  if (index === 3) {
    return `<div class="xhs-card-wrap">${ops}<article class="xhs-preview-card xhs-recipe-flow ${escapeHtml(card.type)}">
        <h3>${title}</h3>
        <div class="xhs-flow-line">
          ${(items.length ? items : ["采集合格素材", "拆标题和开头", "沉淀到资产库", "再生成成稿"]).slice(0, 4).map((item, itemIndex) => `<div><em>${itemIndex + 1}</em><strong>${escapeHtml(item)}</strong></div>`).join("")}
        </div>
        <p>${takeaway || text}</p>
      </article></div>`;
  }
  return `<div class="xhs-card-wrap">${ops}<article class="xhs-preview-card xhs-recipe-action ${escapeHtml(card.type)}">
      <h3>${title}</h3>
      <div class="xhs-action-ledger">
        <div><span>今天先做</span><strong>跑通一个主题闭环</strong></div>
        <div><span>不要再做</span><strong>只让 AI 临时发挥</strong></div>
        <div><span>下一步</span><strong>${text}</strong></div>
      </div>
    </article></div>`;
}

async function exportCleanXhsCardPlan() {
  if (!state.copyConfirmed) return;
  const cards = ensureXhsCardPlan();
  if (!cards.length) return;
  const visual = currentVisualStyle();
  state.xhsCardExportStatus = "loading";
  state.xhsCardOperation = "plan";
  state.xhsCardProgress = null;
  state.xhsCardExportMessage = "正在导出拆页方案 PNG。注意：这不是最终真实配图。";
  state.xhsCardManifest = null;
  renderToday();
  try {
    const res = await fetch(apiPath("/api/xhs-cards/export-plan"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: state.selectedTitle,
        body: confirmedCopyText(),
        topicId: selectedTopic()?.id || `day2-xhs-${Date.now()}`,
        cards,
        layoutPlan: cards.map((card, index) => ({
          page: index + 1,
          role: card.role,
          carouselJob: card.carouselJob,
          visualBrief: card.visualBrief,
          readerTakeaway: card.readerTakeaway,
          imagePrompt: card.imagePrompt
        })),
        visualRoute: {
          theme: "AI 自媒体 / 内容资产库",
          style: visual.assetLabel,
          visualStyleId: visual.id,
          note: "Web preview is the stable fallback. Real image/video generation routes to 43-generation when selected."
        }
      })
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok || !result.ok) throw new Error(result.message || result.error || `HTTP ${res.status}`);
    state.xhsCardExportStatus = "done";
    state.xhsCardOperation = "plan";
    state.xhsCardExportMessage = "拆页方案 PNG 已导出，可用于检查每页承载，不作为最终配图。";
    applyRemoteVisualManifest(result.manifest || null);
  } catch (error) {
    state.xhsCardExportStatus = "error";
    state.xhsCardOperation = "plan";
    state.xhsCardExportMessage = `导出失败：${error.message}。网页卡片预览仍可用于演示，但不能冒充已经出图。`;
    state.xhsCardManifest = null;
  }
  renderToday();
}

// 出图前:接 cover-from-content 专业 skill,从正文+真实料提炼"痛点钩子"当封面大字(替代写死模板);风格不变
async function loadCoverHook() {
  try {
    const ws = state.hot30Workspace || state.industry || state.businessLine || "";
    const res = await fetch(apiPath("/api/cover/hook"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: state.selectedTitle || selectedTopic()?.theme || selectedTopic()?.title || "",
        copy: confirmedCopyText(),
        workspace: ws,
      }),
    });
    const d = await res.json().catch(() => ({}));
    const opts = d && d.result && Array.isArray(d.result.coverHookOptions) ? d.result.coverHookOptions : [];
    const hook = opts.length ? String(opts[0] || "").trim() : "";
    if (hook) state.coverHook = hook;
  } catch { /* 取钩子失败用模板兜底,不阻塞出图 */ }
}

async function generateXiaoheiCards() {
  if (!state.copyConfirmed) {
    state.xhsCardExportStatus = "error";
    state.xhsCardOperation = "visual";
    state.xhsCardExportMessage = "请先在第 9 步确认文案。确认后，作图按钮才会真正出图。";
    renderToday();
    return;
  }
  // 知识海报(HTML 精排)走专属流程:DeepSeek 拆卡 → 渲染,不走 Kie AI 出图。
  if (currentVisualStyle().id === "hanzi-poster") { await generateHanziPosterCards(); return; }
  await loadCoverHook();
  state.xhsCardPlan = []; // 用新的痛点钩子重建 plan
  const cards = ensureXhsCardPlan();
  if (!cards.length) {
    state.xhsCardExportStatus = "error";
    state.xhsCardOperation = "visual";
    state.xhsCardExportMessage = "当前文案还没有拆成可出图的 brief，无法出图。请先确认文案或重新生成文案。";
    renderToday();
    return;
  }
  const visual = currentVisualStyle();
  const visualContract = visualStyleContract(visual.id);
  if (state.xhsCardManifest && !manifestMatchesCurrentVisual()) state.xhsCardManifest = null;
  state.xhsCardJobBase = buildCurrentXiaoheiJobId();
  state.xhsCardExportStatus = "loading";
  state.xhsCardOperation = "visual";
  state.xhsCardProgress = { done: 0, total: cards.length };
  state.xhsCardAsyncJobId = state.xhsCardJobBase;
  state.xhsCardExportMessage = `正在生成${visualRouteNameClean(visual.id)}出图任务，页面会自动轮询结果。`;
  state.xhsCardManifest = {
    renderer: `pending-${visual.id}`,
    count: 0,
    files: [],
    publicFiles: [],
    jobIds: [],
    style: visual.id,
    visualStyleId: visual.id,
  };
  renderToday();
  try {
    const startPayload = {
        title: state.selectedTitle || selectedTopic()?.theme || selectedTopic()?.title || "",
        body: confirmedCopyText(),
        topicId: selectedTopic()?.id || `xhs-xiaohei-${Date.now()}`,
        jobId: state.xhsCardAsyncJobId,
        style: visual.id,
        visualStyle: visual.id,
        visualStyleTitle: visual.title,
        visualRoute: visualContract.route,
        visualCharacter: visualContract.character,
        styleBrief: visualContract.styleBrief,
        styleLock: visualContract.styleLock,
        negativePrompt: visualContract.negativePrompt,
        referenceImageUrl: visualContract.referenceImageUrl || "", // 小妹形象一致性:整套卡都引用人设图
        platform: visualPlatformForCurrentTarget(),
        targetPlatform: visualPlatformForCurrentTarget(),
        cards: cards.map((card, index) => ({
          page: index + 1,
          role: card.role,
          title: card.title,
          text: card.text,
          visualBrief: styleLockedVisualBrief(card, visual),
          readerTakeaway: card.readerTakeaway,
          carouselJob: card.carouselJob,
          imagePrompt: card.imagePrompt,
          visualStyle: card.visualStyle,
        })),
      };
    state.xhsCardStartPayload = startPayload;
    const res = await fetch(apiPath("/api/xhs-cards/generate-xiaohei/start"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(startPayload),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok || !result.ok) throw new Error(result.message || result.error || `HTTP ${res.status}`);
    state.xhsCardAsyncJobId = result.jobId || state.xhsCardAsyncJobId;
    if (result.manifest) applyRemoteVisualManifest(result.manifest);
    await pollXiaoheiCards({ jobId: state.xhsCardAsyncJobId, total: cards.length });
  } catch (error) {
    state.xhsCardExportStatus = "error";
    state.xhsCardOperation = "visual";
    state.xhsCardProgress = null;
    const count = state.xhsCardManifest?.count || 0;
    state.xhsCardExportMessage = `${visualRouteNameClean(visual.id)}出图中断：${error.message}。已生成 ${count} 张会保留显示，未生成的不冒充成品。`;
    if (!count) state.xhsCardManifest = null;
  }
  renderToday();
}

// 知识海报(hanzi-poster):确认文案 → DeepSeek 拆成系列卡 → HTML 精排渲染。复用 xhsCardManifest.publicFiles 走预览+存档。
async function generateHanziPosterCards() {
  const visual = currentVisualStyle();
  state.xhsCardExportStatus = "loading";
  state.xhsCardOperation = "visual";
  state.xhsCardExportMessage = "正在把文案拆成知识海报卡片…";
  state.xhsCardManifest = { renderer: "pending-hanzi-poster", count: 0, files: [], publicFiles: [], style: visual.id, visualStyleId: visual.id };
  renderToday();
  try {
    const title = state.selectedTitle || selectedTopic()?.theme || selectedTopic()?.title || "";
    const body = confirmedCopyText();
    // 1) DeepSeek 拆卡
    const skRes = await fetch(apiPath("/api/skills/run"), {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ skill: "hanzi-poster-cards", content: `标题：${title}\n\n${body}`,
        vars: { role: state.contentRole || "", angle: state.writingAngle || "" } }),
    });
    const skJson = await skRes.json().catch(() => ({}));
    if (!skRes.ok || !skJson.ok) throw new Error(skJson.message || skJson.error || `拆卡失败 HTTP ${skRes.status}`);
    const cards = (skJson.result && Array.isArray(skJson.result.cards)) ? skJson.result.cards : [];
    if (!cards.length) throw new Error("没有拆出卡片,请检查文案或重试。");
    state.hanziPosterCards = cards; // 留一份,便于以后做"微调"编辑
    state.xhsCardProgress = { done: 0, total: cards.length };
    state.xhsCardExportMessage = `已拆成 ${cards.length} 张,正在渲染…`;
    renderToday();
    // 2) 渲染(可选 Pexels 实景背景:线条化 / 虚化 / 关)
    const bgTreatment = state.hanziPosterBg || "sketch";
    const res = await fetch(apiPath("/api/visual/hanzi-poster"), {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ cards, bgTreatment, theme: "yingrui" }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok || !d.ok) throw new Error(d.message || d.error || `渲染失败 HTTP ${res.status}`);
    const publicFiles = (d.images || []).map((im) => apiPath("/" + im.url));
    if (!publicFiles.length) throw new Error("渲染没有产出图片。");
    state.xhsCardManifest = {
      renderer: "hanzi-poster", count: publicFiles.length, files: publicFiles, publicFiles,
      style: visual.id, visualStyleId: visual.id, jobId: `hanzi-${Date.now()}`,
    };
    state.xhsCardProgress = { done: publicFiles.length, total: publicFiles.length };
    state.xhsCardExportStatus = "done";
    state.xhsCardExportMessage = `知识海报出好了:${publicFiles.length} 张。下方预览,确认后存入作品记录。`;
  } catch (error) {
    state.xhsCardExportStatus = "error";
    state.xhsCardOperation = "visual";
    state.xhsCardProgress = null;
    state.xhsCardManifest = null;
    state.xhsCardExportMessage = `知识海报生成失败:${error.message}`;
  }
  renderToday();
}

// 封面模板矩阵(方法内化自 CTR-first 封面打法:信息密度 × 视觉锚点;只取方法,绝不含任何作者水印/署名)。脚本判型,不烧 LLM。
function pickCoverTemplate(hook = "", body = "") {
  const t = `${hook} ${body}`;
  if (/\d/.test(hook)) return "number"; // 钩子带数字 → 数字型
  if (/对比|改前|改后|前后|vs/i.test(t)) return "comparison";
  if (/案例|测评|结果|截图|实测|数据|证明|晒|复盘/.test(t)) return "screenshot";
  if (/内耗|焦虑|治愈|疗愈|孤独|一个人|放过|慢慢来|emo|情绪|崩溃|累了|emo|破防/.test(t)) return "emotion";
  return "conflict"; // 默认观点/方法 → 冲突型
}
const COVER_TEMPLATE_GUIDE = {
  conflict: "Cover template = CONFLICT: anchor is a confident subject/face or a strong graphic block in the lower-center; the bold hook headline sits in the TOP THIRD with a contrasting color/brush block behind it for impact.",
  number: "Cover template = NUMBER: pull the ONE key number from the hook and make it the dominant anchor (about 35-45% of the height) in the upper/center; the rest of the hook is one or two short lines under the number.",
  screenshot: "Cover template = SCREENSHOT/PROOF: anchor is a believable mockup/screenshot/result panel in the lower ~60% with a few hand-drawn red circles or arrows on the key spots; big bold headline on top. Do NOT fabricate dense unreadable UI.",
  comparison: "Cover template = BEFORE/AFTER: split left 'before' (dull) vs right 'after' (clean/bright) with a big VS as the center anchor; bold headline on top.",
  emotion: "Cover template = EMOTION: anchor is an authentic cinematic portrait or warm lifestyle scene in the lower two-thirds; one short emotional headline overlays the top third or a warm color band; keep it real, not a stock-photo selfie.",
};
const COVER_QUALITY_CONTRACT = [
  "Cover quality contract (HIGHEST priority):",
  "3-level text hierarchy — the hook headline dominates (~60-75% of text weight), an optional short support line is secondary (~20-30%), a small category tag is least (~5-10%); never let the tag outshine the headline.",
  "Placement — headline in the TOP THIRD, the single visual anchor at center / lower-center, optional tiny tag at the upper-left; keep fewer than 3 text regions.",
  "80px thumbnail test — the headline and the one anchor MUST stay readable when the whole cover is shrunk to ~80px wide; if unsure, enlarge the headline and thicken the strokes.",
  "Contrast — headline vs background at least 4.5:1 (aim higher); no pale low-contrast text.",
  "Chinese must be crisp, large and correctly written; no garbled characters, no tiny paragraphs, no explanatory blocks.",
  "Numbers / metrics / revenue ONLY if present in the copy — never invent them (数字事实铁律).",
].join(" ");
// 水印动态化:默认干净无水印;state.coverWatermark 有值(如 longka)→ 角落低调暗签,证明自有设计。绝不带任何第三方作者署名/水印。
function coverWatermarkLine() {
  const wm = (typeof state !== "undefined" && state.coverWatermark) ? String(state.coverWatermark).trim().slice(0, 16) : "";
  return wm
    ? `Brand signature: place a small, subtle, low-opacity "${wm}" text mark discreetly in a bottom corner as a faint watermark — never covering the headline or the anchor, never large. No other watermark, logo, '@' handle, or QR code.`
    : "No watermark, no author signature, no logo, no '@' handle, no QR code.";
}

async function generateCoverFromContent() {
  const title = state.selectedTitle || selectedTopic()?.theme || selectedTopic()?.title || "";
  const body = confirmedCopyText() || state.draft || "";
  if (!title || body.replace(/\s+/g, "").length < 20) {
    state.coverStatus = "error";
    state.coverMessage = "请先生成并确认正文——封面要从已写好的标题+正文里提炼。";
    renderToday();
    return;
  }
  const visual = currentVisualStyle();
  state.coverStatus = "loading";
  state.coverImage = "";
  state.coverOptions = [];
  state.coverMessage = "正在从正文提炼 2 个封面钩子…";
  renderToday();
  try {
    // 1) cover-from-content skill：提炼 3 个诚实钩子（不同切入角度）
    const skRes = await fetch(apiPath("/api/skills/run"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ skill: "cover-from-content", content: `标题：${title}\n\n正文：${body}` }),
    });
    const sk = await skRes.json().catch(() => ({}));
    const result = sk?.result || {};
    let hooks = (Array.isArray(result.coverHookOptions) ? result.coverHookOptions : [])
      .map((h) => String(h || "").trim()).filter(Boolean);
    if (!hooks.length) hooks = [String(result.coverHook || title || "").trim().slice(0, 40)].filter(Boolean);
    if (!hooks.length) throw new Error(sk.message || sk.error || "未能提炼封面钩子");
    hooks = hooks.slice(0, 2); // 一篇出最多 2 张(2 个钩子角度);3 张浪费 Kie 点数,2 张够选
    state.coverHooks = hooks;
    // 封面 = 选中配图风格（风格锁）+ 该风格的丰富封面构图 + 大钩子标题。画风永远跟随所选配图风格,绝不改成暗黑/极简。
    const contract = visualStyleContract(visual.id);
    const coverAction = (visualCardActionBriefs(visual.id) || {}).cover || "";
    const topicCtx = String(selectedTopic()?.theme || title || "").slice(0, 60);
    const refImg = (state.selectedReferenceImage || "").trim();
    const buildCoverBrief = (hook) => {
      const comp = [
        "This is the COVER image (not an inner content page).",
        "Render it in the SAME illustration style as the inner cards, but as a real scroll-stopping Xiaohongshu cover:",
        `the dominant element is one oversized bold Chinese hook title "${hook}";`,
        `one single strong focal subject representing the topic "${topicCtx}";`,
        "clear visual hierarchy, generous negative space, single focal point, NOT a multi-panel layout, NOT a content list page.",
        coverAction,
        COVER_TEMPLATE_GUIDE[pickCoverTemplate(hook, body)] || COVER_TEMPLATE_GUIDE.conflict,
        COVER_QUALITY_CONTRACT,
        coverWatermarkLine(),
      ].filter(Boolean).join(" ");
      const full = refImg
        ? `${comp} 重要：参考图里是这个主题的真实产品/主体，封面里的产品必须严格按参考图的外形、比例、颜色来，不要换成别的样子；只把它融入封面构图并套上风格，不要改变产品本身。`
        : comp;
      return styleLockedVisualBrief({ role: "cover", visualBrief: full }, visual);
    };
    // 2) 并行起 N 个 Kie 任务（一钩子一张）
    state.coverOptions = hooks.map((h) => ({ hook: h, url: "", jobId: "", status: "loading" }));
    state.coverMessage = `钩子已提炼，正在出 ${hooks.length} 张封面（同一画风、不同钩子）…`;
    renderToday();
    for (let i = 0; i < hooks.length; i += 1) {
      try {
        const jobId = `cover-${visual.id}-${Date.now()}-${i}`;
        const startRes = await fetch(apiPath("/api/xhs-cards/generate-xiaohei/start"), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title: hooks[i], style: visual.id, visualStyle: visual.id,
            visualStyleTitle: visual.title, visualRoute: contract.route,
            visualCharacter: contract.character, styleBrief: contract.styleBrief,
            styleLock: contract.styleLock, negativePrompt: contract.negativePrompt,
            platform: visualPlatformForCurrentTarget(), targetPlatform: visualPlatformForCurrentTarget(),
            jobId,
            referenceImageUrl: refImg,
            cards: [{ page: 1, role: "cover", title: hooks[i], visualBrief: buildCoverBrief(hooks[i]), referenceImageUrl: refImg }],
          }),
        });
        const sj = await startRes.json().catch(() => ({}));
        state.coverOptions[i].jobId = sj.jobId || jobId;
        if (!startRes.ok || !sj.ok) state.coverOptions[i].status = "error";
      } catch { state.coverOptions[i].status = "error"; }
    }
    renderToday();
    // 3) 轮询所有未完成任务（最多 ~7.5 分钟）
    for (let round = 0; round < 90; round += 1) {
      await new Promise((r) => setTimeout(r, 5000));
      let pending = 0;
      for (let i = 0; i < state.coverOptions.length; i += 1) {
        const o = state.coverOptions[i];
        if (o.status === "done" || o.status === "error" || !o.jobId) continue;
        const stRes = await fetch(apiPath(`/api/xhs-cards/generate-xiaohei/status?jobId=${encodeURIComponent(o.jobId)}&total=1`));
        const st = await stRes.json().catch(() => ({}));
        const url = (st?.manifest?.publicFiles || [])[0] || "";
        if (url) { o.url = url; o.status = "done"; if (!state.coverImage) { state.coverImage = url; state.coverHook = o.hook; } }
        else if (st.status === "error") { o.status = "error"; }
        else pending += 1;
      }
      const doneCount = state.coverOptions.filter((o) => o.status === "done").length;
      state.coverMessage = `封面出图中…（${doneCount}/${state.coverOptions.length} 张已出）`;
      renderToday();
      if (!pending) break;
    }
    const doneCount = state.coverOptions.filter((o) => o.status === "done").length;
    if (doneCount) {
      state.coverStatus = "done";
      if (!state.coverImage) { const f = state.coverOptions.find((o) => o.url); if (f) { state.coverImage = f.url; state.coverHook = f.hook; } }
      state.coverMessage = `出了 ${doneCount} 张封面，点你最想要的那张「✅ 用这张」（封面+标题=流量命门，挑最抓眼的）。`;
      // 视觉质检(免费):逐张用 GLM-5V 判分,给"通过/建议重出"+一句改进。判图不花钱,重出由你点。
      const toJudge = state.coverOptions.filter((o) => o.url && !o.judge);
      if (toJudge.length) {
        state.coverMessage = `出了 ${doneCount} 张封面，正在做视觉质检(锚点/缩略图/对题)…`;
        renderToday();
        await Promise.all(toJudge.map(async (o) => {
          try {
            const jr = await fetch(apiPath("/api/visual/judge-cover"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ imageUrl: o.url, hook: o.hook, topic: title }) });
            const jd = await jr.json().catch(() => ({}));
            if (jd && jd.ok) o.judge = jd;
          } catch {}
        }));
        const passN = state.coverOptions.filter((o) => o.judge && o.judge.pass).length;
        state.coverMessage = `出了 ${doneCount} 张封面，视觉质检完成(${passN} 张通过)。挑通过且最抓眼的那张「✅ 用这张」。`;
      }
    } else {
      state.coverStatus = "pending";
      state.coverMessage = "出图服务较慢，封面还在出，过一会儿再点一次「生成封面」即可（不重复扣已出的）。";
    }
    renderToday();
  } catch (error) {
    state.coverStatus = "error";
    state.coverMessage = `封面生成失败：${error.message}`;
    renderToday();
  }
}

// 内页配图视觉质检(免费):逐张用 GLM-5V 判 文对题/清晰,结果按 URL 存 state.xhsCardJudge。
async function judgeInnerCards() {
  const files = Array.isArray(currentVisualManifest()?.publicFiles) ? currentVisualManifest().publicFiles : [];
  if (!files.length) return;
  const topic = state.selectedTitle || selectedTopic()?.theme || selectedTopic()?.title || "";
  state.xhsCardJudge = state.xhsCardJudge || {};
  const todo = files.map(String).filter((k) => !state.xhsCardJudge[k]);
  if (!todo.length) return; // 这组都判过了
  state.xhsCardJudging = true;
  state.xhsCardExportMessage = "正在视觉质检这组配图(文对题/清晰)…";
  renderToday();
  await Promise.all(todo.map(async (key) => {
    try {
      const abs = /^https?:\/\//.test(key) ? key : new URL("./" + key.replace(/^\/+/, ""), window.location.href).href;
      const jr = await fetch(apiPath("/api/visual/judge-cover"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ imageUrl: abs, hook: topic, topic, mode: "inner" }) });
      const jd = await jr.json().catch(() => ({}));
      if (jd && jd.ok) state.xhsCardJudge[key] = jd;
    } catch {}
  }));
  state.xhsCardJudging = false;
  const judged = files.map(String).filter((k) => state.xhsCardJudge[k]);
  const pass = judged.filter((k) => state.xhsCardJudge[k].pass).length;
  state.xhsCardExportMessage = `配图视觉质检完成(${pass}/${judged.length} 张文对题通过)。⚠️ 的可换钩子/重出。`;
  renderToday();
}

async function pollXiaoheiCards({ jobId, total, repairAttempts = 0 }) {
  lastPollRenderSignature = "";
  for (let round = 0; round < 180; round += 1) {
    const res = await fetch(apiPath(`/api/xhs-cards/generate-xiaohei/status?jobId=${encodeURIComponent(jobId)}&total=${encodeURIComponent(total)}`));
    const result = await res.json().catch(() => ({}));
    if (!res.ok || !result.ok) throw new Error(result.message || result.error || `HTTP ${res.status}`);
    if (result.manifest) applyRemoteVisualManifest(result.manifest);
    const count = state.xhsCardManifest?.count || 0;
    if (count >= total) {
      state.xhsCardExportStatus = "done";
      state.xhsCardProgress = null;
      state.xhsCardExportMessage = `已生成 ${count} 张${visualRouteNameClean(state.visualStyle)}，正在做视觉质检(文对题/清晰)…`;
      renderToday();
      await judgeInnerCards();
      const innerPass = Object.values(state.xhsCardJudge || {}).filter((j) => j && j.pass).length;
      state.xhsCardExportMessage = `已生成 ${count} 张${visualRouteNameClean(state.visualStyle)}，视觉质检完成(${innerPass} 张文对题通过)。逐张打开检查。`;
      renderToday();
      return;
    }
    state.xhsCardProgress = { done: count, total };
    state.xhsCardExportMessage = `正在出图：已完成 ${count}/${total} 张。你可以停留等待，也可以稍后继续查询。`;
    const failedPages = Array.isArray(result.failed) ? result.failed.map((item) => Number(item.page || 0)).filter(Boolean) : [];
    if (["partial", "error"].includes(result.status) && count > 0 && count + failedPages.length >= total) {
      if (repairAttempts < 2 && state.xhsCardStartPayload) {
        state.xhsCardExportStatus = "loading";
        state.xhsCardProgress = { done: count, total };
        state.xhsCardExportMessage = `当前只完成 ${count}/${total} 张，系统正在自动补齐缺页${failedPages.length ? ` P${failedPages.join("/P")}` : ""}，补齐前不会保存为完成作品。`;
        renderToday();
        const repairRes = await fetch(apiPath("/api/xhs-cards/generate-xiaohei/start"), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...state.xhsCardStartPayload, jobId }),
        });
        const repairResult = await repairRes.json().catch(() => ({}));
        if (!repairRes.ok || !repairResult.ok) throw new Error(repairResult.message || repairResult.error || `HTTP ${repairRes.status}`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return pollXiaoheiCards({ jobId, total, repairAttempts: repairAttempts + 1 });
      }
      state.xhsCardExportStatus = "error";
      state.xhsCardProgress = null;
      state.xhsCardExportMessage = `当前已生成 ${count}/${total} 张${failedPages.length ? `，缺 P${failedPages.join("/P")}` : ""}。请再次点击出图按钮补齐缺页，补齐前不能保存为已完成作品。`;
      renderToday();
      return;
    }
    const signature = `${state.xhsCardExportStatus}|${count}|${total}|${result.status || ""}|${state.xhsCardExportMessage}`;
    if (signature !== lastPollRenderSignature) {
      lastPollRenderSignature = signature;
      renderToday();
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  state.xhsCardExportStatus = "error";
  state.xhsCardProgress = null;
  const count = state.xhsCardManifest?.count || 0;
  state.xhsCardExportMessage = `轮询等待超时，当前已看到 ${count}/${total} 张。后台任务 ${jobId} 可能仍在继续，请先点“查询当前主题已生成图片”，仍不满 ${total} 张再点击出图按钮补齐。`;
}

async function restoreLatestXiaoheiCards() {
  const jobId = state.xhsCardAsyncJobId || state.xhsCardJobBase || buildCurrentXiaoheiJobId();
  // 张数按内容判断，不写死 5
  const total = (typeof plannedVisualCardCount === "function" ? plannedVisualCardCount() : 0) || 5;
  state.xhsCardExportStatus = "loading";
  state.xhsCardOperation = "xiaohei";
  state.xhsCardAsyncJobId = jobId;
  state.xhsCardJobBase = jobId;
  state.xhsCardExportMessage = `正在恢复当前主题的图片：${jobId}`;
  renderToday();
  try {
    const res = await fetch(apiPath(`/api/xhs-cards/generate-xiaohei/status?jobId=${encodeURIComponent(jobId)}&total=${total}`));
    const result = await res.json().catch(() => ({}));
    if (!res.ok || !result.ok) throw new Error(result.message || result.error || `HTTP ${res.status}`);
    applyRemoteVisualManifest(result.manifest || null);
    state.xhsCardAsyncJobId = result.jobId || jobId;
    state.xhsCardJobBase = result.jobId || jobId;
    const count = state.xhsCardManifest?.count || 0;
    state.xhsCardExportStatus = count >= total ? "done" : (count > 0 ? "error" : "idle");
    state.xhsCardOperation = "xiaohei";
    state.xhsCardProgress = null;
    state.xhsCardExportMessage = count
      ? `已恢复当前主题 ${count}/${total} 张配图。`
      : "当前主题还没有生成过配图，请点击生成配图。";
    if (count) { renderToday(); await judgeInnerCards(); }
  } catch (error) {
    state.xhsCardExportStatus = "error";
    state.xhsCardProgress = null;
    state.xhsCardManifest = null;
    state.xhsCardExportMessage = `恢复当前主题失败：${error.message}`;
  }
  renderToday();
}

function buildCurrentXiaoheiJobId() {
  const seed = [
    VISUAL_PROMPT_VERSION,
    selectedTopic()?.id || "topic",
    state.confirmedCopyVersionId || state.currentCopyVersionId || "copy",
    state.visualStyle || "visual",
    state.selectedTitle || "title",
    simpleHash(confirmedCopyText() || ""),
  ].join("-");
  return `longka-xhs-${simpleHash(seed)}`;
}

// ===== 视频片段（让封面/分镜动起来；也可纯按脚本出片）=====

function buildCurrentVideoClipJobId() {
  const seed = [
    selectedTopic()?.id || "topic",
    state.confirmedCopyVersionId || state.currentCopyVersionId || "copy",
    state.videoClipMode || "frames",
    state.selectedTitle || "title",
    simpleHash(confirmedCopyText() || ""),
  ].join("-");
  return `longka-vid-${simpleHash(seed)}`;
}

// 出图结果（封面/分镜）作为视频首帧来源
function videoClipFirstFrames() {
  const files = Array.isArray(currentVisualManifest()?.publicFiles) ? currentVisualManifest().publicFiles : [];
  return files.filter((url) => /^https?:\/\//.test(String(url))).slice(0, 5);
}

// 脚本行（标题/钩子 + 段落），文生视频时每行一个片段
function videoClipScriptLines() {
  return String(confirmedCopyText() || "")
    .split(/\n+/)
    .map((line) => line.replace(/^(标题|正文|配图建议|标签|钩子)[:：\s]*/u, "").trim())
    .filter((line) => line && line.length > 4)
    .slice(0, 5);
}

// 给一段画面配一句“动起来”的运镜提示（中性、平和，喂给出片引擎）
function videoMotionPrompt(context = "") {
  const base = "Bring this scene gently to life: subtle natural motion, a slow cinematic camera push-in, soft light shifting, keep the original composition and subject stable, high quality, smooth, no text artifacts.";
  const ctx = String(context || "").slice(0, 200).trim();
  return ctx ? `${ctx}. ${base}` : base;
}

function buildVideoClipStartPayload() {
  const title = state.selectedTitle || selectedTopic()?.theme || selectedTopic()?.title || "";
  const platform = visualPlatformForCurrentTarget();
  const jobId = buildCurrentVideoClipJobId();
  const frames = videoClipFirstFrames();
  const useFrames = state.videoClipMode !== "script" && frames.length > 0;
  let clips = [];
  if (useFrames) {
    const lines = videoClipScriptLines();
    clips = frames.map((url, index) => ({
      page: index + 1,
      imageUrl: url,
      prompt: videoMotionPrompt(lines[index] || lines[0] || title),
      duration: 5,
    }));
  } else {
    const lines = videoClipScriptLines();
    const source = lines.length ? lines : [title].filter(Boolean);
    clips = source.map((line, index) => ({
      page: index + 1,
      prompt: videoMotionPrompt(line),
      duration: 5,
    }));
  }
  return { title, topicId: selectedTopic()?.id || jobId, jobId, platform, targetPlatform: platform, clips, _useFrames: useFrames };
}

// 把确认脚本切成分镜：按句/段落切，每镜一个画面意图，动态 1-6 镜（不硬凑）
// 生成口播片：每个 beat 配音(国内 MiniMax) + 用已出的视频片段做画面 + 烧字幕 → 拼成一条成片
async function generateOralVideo() {
  if (!state.copyConfirmed) {
    state.oralVideoStatus = "error";
    state.oralVideoMessage = "请先在上一步确认文案，确认后才能生成口播片。";
    renderToday();
    return;
  }
  const shots = buildVideoShots();
  if (!shots.length) {
    state.oralVideoStatus = "error";
    state.oralVideoMessage = "脚本内容太少，无法切成分镜。";
    renderToday();
    return;
  }
  // 防串档：只用"为当前这条脚本出的片段"。对不上(旧脚本/旧分镜)就不用，避免画面跟文案错位。
  const currentJob = buildCurrentVideoClipJobId();
  const clipsMatch = Boolean(state.videoClipForJobId) && state.videoClipForJobId === currentJob;
  const fileByPage = {};
  if (clipsMatch) {
    (Array.isArray(state.videoClipManifest?.files) ? state.videoClipManifest.files : []).forEach((f) => {
      if (f && f.url) fileByPage[Number(f.page)] = f.url;
    });
  }
  const hadAnyClips = Array.isArray(state.videoClipManifest?.files) && state.videoClipManifest.files.some((f) => f && f.url);
  const staleClips = hadAnyClips && !clipsMatch;
  const beats = shots.map((s) => ({ text: s.scriptText, videoUrl: fileByPage[s.page] || "" }));
  const withClips = beats.filter((b) => b.videoUrl).length;
  const jobId = `oralcompose-${buildCurrentVideoClipJobId()}`;
  state.oralVideoStatus = "loading";
  state.oralVideoUrl = "";
  state.oralVideoMessage = withClips
    ? "正在配音 + 合成口播片…"
    : (staleClips
      ? "上次的视频片段跟当前脚本对不上（脚本改过/分镜数变了），已忽略以防画面错位；本次先用纯背景合成。要带画面请先重新点【生成视频片段】。"
      : "没有可用的视频片段，将用纯背景 + 配音 + 字幕合成（建议先出视频片段画面更生动）。");
  renderToday();
  try {
    const startRes = await fetch(apiPath("/api/oral-video/compose/start"), {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ jobId, beats, voiceId: state.ttsVoice || undefined, workspace: state.industry || state.businessLine || state.hot30Workspace || "" }),
    });
    const start = await startRes.json().catch(() => ({}));
    if (!startRes.ok || !start.ok) throw new Error(start.message || start.error || `HTTP ${startRes.status}`);
    const realId = start.jobId || jobId;
    for (let round = 0; round < 120; round += 1) {
      await new Promise((r) => setTimeout(r, 5000));
      const r = await fetch(apiPath(`/api/oral-video/compose/status?jobId=${encodeURIComponent(realId)}`));
      const st = await r.json().catch(() => ({}));
      if (st.status === "done" && st.url) {
        state.oralVideoStatus = "done";
        state.oralVideoUrl = st.url;
        state.oralVideoMessage = `口播片已生成：约 ${st.totalSeconds || 0} 秒，其中 ${st.withVideo || 0} 段用真实画面。`;
        renderToday();
        return;
      }
      if (st.status === "error") throw new Error(st.error || "合成失败");
      state.oralVideoMessage = `正在配音 + 合成口播片…（${st.done || 0}/${st.total || beats.length} 段）`;
      renderToday();
    }
    state.oralVideoStatus = "done";
    state.oralVideoMessage = "合成耗时较久，请稍后再点一次查看。";
    renderToday();
  } catch (error) {
    state.oralVideoStatus = "error";
    state.oralVideoMessage = `口播片合成失败：${error.message}`;
    renderToday();
  }
}

// 把零散句子均匀归并成 n 段（每段是一个关键画面的脚本依据）
function groupLinesIntoN(arr, n) {
  n = Math.max(1, Math.min(n, arr.length));
  const out = [];
  const base = Math.floor(arr.length / n);
  let rem = arr.length % n;
  let idx = 0;
  for (let i = 0; i < n; i += 1) {
    const take = base + (rem > 0 ? 1 : 0);
    if (rem > 0) rem -= 1;
    out.push(arr.slice(idx, idx + take).join(" "));
    idx += take;
  }
  return out;
}

// 爆款视频脚本重构：调 video-script-restructure skill，把确认文案重构成爆款分镜(钩子/口播/大字/B-roll)
async function loadVideoScript() {
  if (!state.copyConfirmed) {
    state.videoScriptStatus = "error";
    state.videoScriptMessage = "请先在上一步确认文案，再生成视频脚本。";
    renderToday();
    return;
  }
  const title = state.selectedTitle || selectedTopic()?.theme || selectedTopic()?.title || "";
  const body = String(confirmedCopyText() || "").trim();
  if (!body) {
    state.videoScriptStatus = "error";
    state.videoScriptMessage = "当前没有可用的文案正文。";
    renderToday();
    return;
  }
  state.videoScriptStatus = "loading";
  state.videoScriptMessage = "正在把文案重构成爆款视频脚本…";
  renderToday();
  try {
    const platform = (typeof platformWanted === "function" ? platformWanted() : "") || "";
    const industry = state.industry || state.businessLine || state.hot30Workspace || "";
    const res = await fetch(apiPath("/api/skills/run"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ skill: "video-script-restructure", content: `标题：${title}\n\n正文：${body}`, vars: { platform, industry } }),
    });
    const j = await res.json().catch(() => ({}));
    const r = j?.result || {};
    const shots = Array.isArray(r.shots) ? r.shots : [];
    if (!j.ok || !shots.length) throw new Error(j.message || j.error || "脚本重构未返回分镜");
    state.videoScript = { hookType: r.hookType || "", shots, cta: r.cta || "", notes: r.notes || "" };
    state.videoScriptStatus = "done";
    state.videoScriptMessage = `已重构 ${shots.length} 个爆款分镜（钩子：${r.hookType || "—"}）。可逐镜微调口播/大字，再出片。`;
  } catch (error) {
    state.videoScriptStatus = "error";
    state.videoScriptMessage = `脚本重构失败：${error.message}`;
  }
  renderToday();
}

function buildVideoShots() {
  // 优先用爆款脚本重构的分镜（口播=画面脚本，大字/B-roll 一并带上）
  const vs = state.videoScript;
  if (vs && Array.isArray(vs.shots) && vs.shots.length) {
    return vs.shots.map((s, i) => ({
      page: i + 1,
      scriptText: String(s.narration || s.bigText || s.keywords || "").trim(),
      bigText: s.bigText || "",
      broll: s.broll || "",
      brollSource: s.brollSource || "",
      role: s.role || "",
      seconds: s.seconds || 0,
      isCover: i === 0,
    })).filter((s) => s.scriptText);
  }
  const title = state.selectedTitle || selectedTopic()?.theme || selectedTopic()?.title || "";
  const lines = String(confirmedCopyText() || "")
    .split(/\n+/)
    .map((s) => s.replace(/^(标题|正文|钩子|配图建议|标签)[:：\s]*/u, "").trim())
    .filter((s) => s && s.length > 6);
  const source = lines.length ? lines : (title ? [title] : []);
  if (!source.length) return [];
  // 根源控成本：归并成固定几个关键画面（默认 5），不再一句一镜 → 关键帧少→片段少→成本低、视频不拖长
  const target = Math.max(1, Math.min(Number(typeof VIDEO_TARGET_SHOTS !== "undefined" ? VIDEO_TARGET_SHOTS : 5) || 5, source.length));
  const beats = groupLinesIntoN(source, target);
  return beats.map((scriptText, i) => ({ page: i + 1, scriptText, isCover: i === 0 }));
}

// 关键帧 brief：严格从这一镜的脚本句出画，套所选风格——不用通用模板套话，数字/事实忠实脚本
function keyframeBriefForShot(shot, visual) {
  const composition = [
    "This is a single vertical short-video KEYFRAME (not a multi-panel card, not a content list).",
    "Depict THIS exact line of the script in the chosen illustration style, one clear focal subject/scene, single focus, readable:",
    `「${shot.scriptText}」.`,
    "Stay faithful to this sentence's meaning; if it contains numbers/facts, render them exactly as written, do NOT invent or change numbers, do NOT add clickbait words.",
    shot.isCover ? "Opening hook frame with a short bold title." : "A content-beat frame.",
  ].join(" ");
  return styleLockedVisualBrief({ role: shot.isCover ? "cover" : "scene", visualBrief: composition }, visual);
}

// 轮询关键帧出图，返回 page->url 映射
// 单次查询：这个关键帧任务此前是否已出过图（用于刷新后复用，省钱保号）。返回 page->url，查不到则空对象。
async function lookupExistingKeyframes(jobId, total) {
  try {
    const res = await fetch(apiPath(`/api/xhs-cards/generate-xiaohei/status?jobId=${encodeURIComponent(jobId)}&total=${total}`));
    if (!res.ok) return {};
    const result = await res.json().catch(() => ({}));
    if (!result.ok) return {};
    const files = Array.isArray(result.manifest?.files) ? result.manifest.files : [];
    const map = {};
    files.forEach((f) => { if (f.url) map[Number(f.page)] = f.url; });
    return map;
  } catch (_) {
    return {};
  }
}

async function pollKeyframeImages(jobId, total) {
  for (let round = 0; round < 120; round += 1) {
    await new Promise((r) => setTimeout(r, 5000));
    const res = await fetch(apiPath(`/api/xhs-cards/generate-xiaohei/status?jobId=${encodeURIComponent(jobId)}&total=${total}`));
    const result = await res.json().catch(() => ({}));
    if (!res.ok || !result.ok) continue;
    const files = Array.isArray(result.manifest?.files) ? result.manifest.files : [];
    const done = files.filter((f) => f.url).length;
    state.videoClipProgress = { done, total };
    state.videoClipMessage = `第 1 步·按脚本出关键帧：已出 ${done}/${total} 张。`;
    renderToday();
    if (done >= total && total > 0) {
      const map = {};
      files.forEach((f) => { if (f.url) map[Number(f.page)] = f.url; });
      return map;
    }
    if (result.status === "error" && done === 0) return {};
  }
  // 超时：返回已拿到的
  const res = await fetch(apiPath(`/api/xhs-cards/generate-xiaohei/status?jobId=${encodeURIComponent(jobId)}&total=${total}`));
  const result = await res.json().catch(() => ({}));
  const files = Array.isArray(result.manifest?.files) ? result.manifest.files : [];
  const map = {};
  files.forEach((f) => { if (f.url) map[Number(f.page)] = f.url; });
  return map;
}

// 视频片段 = 脚本→分镜→每镜出关键帧图(从脚本)→关键帧图生视频。文生模式则跳过出图直接按脚本出片。
async function generateVideoClips() {
  if (!state.copyConfirmed) {
    state.videoClipStatus = "error";
    state.videoClipMessage = "请先在上一步确认文案，确认后才能生成视频片段。";
    renderToday();
    return;
  }
  const shots = buildVideoShots();
  if (!shots.length) {
    state.videoClipStatus = "error";
    state.videoClipMessage = "脚本内容太少，无法切成分镜。请先确认文案。";
    renderToday();
    return;
  }
  const total = shots.length;
  const visual = currentVisualStyle();
  const platform = visualPlatformForCurrentTarget();
  const jobId = buildCurrentVideoClipJobId();
  const scriptMode = state.videoClipMode === "script";
  const tier = videoTierById(state.videoTier);            // 视频档位（省钱/精品）
  const clipSeconds = tier.defaultSeconds || VIDEO_DEFAULT_CLIP_SECONDS;
  state.videoClipStatus = "loading";
  state.videoClipJobId = jobId;
  state.videoClipProgress = { done: 0, total };
  state.videoClipPhase = scriptMode ? "clip" : "keyframe";
  state.videoClipManifest = { count: 0, files: [], publicFiles: [] };
  renderToday();
  try {
    let clips;
    if (scriptMode) {
      // 文生：不出关键帧，直接按每镜脚本出片
      state.videoClipMessage = `正在按脚本生成 ${total} 个视频片段（文生），出片较慢请耐心等。`;
      renderToday();
      clips = shots.map((s) => ({ page: s.page, prompt: videoMotionPrompt(s.scriptText), duration: clipSeconds }));
    } else {
      // 第 1 步：按脚本分镜出关键帧图（内容贴脚本、套风格、有真实参考图就用）
      state.videoClipMessage = `第 1 步·按脚本出 ${total} 张关键帧（贴合每一镜内容）…`;
      renderToday();
      const refImg = (state.selectedReferenceImage || "").trim();
      const contract = visualStyleContract(visual.id);
      const kfJobId = `vidkf-${jobId}`;
      // 省钱保号：先查这个主题之前是否已出过关键帧（浏览器刷新但服务未重启可复用），出齐就直接用、不再扣点
      let frameMap = await lookupExistingKeyframes(kfJobId, total);
      const reused = shots.every((s) => frameMap[s.page]);
      if (reused) {
        state.videoClipProgress = { done: shots.length, total };
        state.videoClipMessage = `已复用上次出好的 ${shots.length} 张关键帧（没重新出图、不再扣点），正在出视频片段…`;
        renderToday();
      } else {
        const startKf = await fetch(apiPath("/api/xhs-cards/generate-xiaohei/start"), {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title: state.selectedTitle || "", style: visual.id, visualStyle: visual.id,
            visualStyleTitle: visual.title, visualRoute: contract.route, visualCharacter: contract.character,
            styleBrief: contract.styleBrief, styleLock: contract.styleLock, negativePrompt: contract.negativePrompt,
            platform, targetPlatform: platform, jobId: kfJobId, referenceImageUrl: refImg,
            maxCards: shots.length, // 视频关键帧：放开图文卡的 5 张上限，按分镜数出图
            cards: shots.map((s) => ({ page: s.page, role: s.isCover ? "cover" : "scene", title: state.selectedTitle || "", visualBrief: keyframeBriefForShot(s, visual), referenceImageUrl: refImg })),
          }),
        });
        const kfJson = await startKf.json().catch(() => ({}));
        if (!startKf.ok || !kfJson.ok) throw new Error(kfJson.message || kfJson.error || "关键帧出图启动失败");
        const realKfJobId = kfJson.jobId || kfJobId;
        frameMap = await pollKeyframeImages(realKfJobId, total);
      }
      const gotFrames = shots.filter((s) => frameMap[s.page]).length;
      if (!gotFrames) throw new Error("关键帧没出来（出图服务慢或失败），可稍后再点一次");
      // 第 2 步：关键帧图生视频（首帧驱动）
      state.videoClipPhase = "clip";
      state.videoClipProgress = { done: 0, total: gotFrames };
      state.videoClipMessage = `第 2 步·关键帧已出 ${gotFrames}/${total} 张，正在按关键帧出视频片段…`;
      renderToday();
      clips = shots.filter((s) => frameMap[s.page]).map((s) => ({
        page: s.page, imageUrl: frameMap[s.page], prompt: videoMotionPrompt(s.scriptText), duration: clipSeconds,
      }));
    }
    const startRes = await fetch(apiPath("/api/video-clip/start"), {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: state.selectedTitle || "", jobId, platform, targetPlatform: platform, clips,
        model: tier.model, resolution: tier.resolution, duration: clipSeconds, // 按档位计费
      }),
    });
    const result = await startRes.json().catch(() => ({}));
    if (!startRes.ok || !result.ok) throw new Error(result.message || result.error || `HTTP ${startRes.status}`);
    state.videoClipJobId = result.jobId || jobId;
    state.videoClipForJobId = jobId; // 这批片段是为"当前脚本"出的，口播片据此校验对版，防串档
    if (result.manifest) state.videoClipManifest = result.manifest;
    await pollVideoClips({ jobId: state.videoClipJobId, total: clips.length });
  } catch (error) {
    state.videoClipStatus = "error";
    state.videoClipProgress = null;
    const count = state.videoClipManifest?.count || 0;
    state.videoClipMessage = `视频片段生成中断：${error.message}。已生成的 ${count} 段会保留，未生成的不冒充成品。`;
    if (!count) state.videoClipManifest = null;
  }
  renderToday();
}

async function pollVideoClips({ jobId, total }) {
  for (let round = 0; round < 180; round += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const res = await fetch(apiPath(`/api/video-clip/status?jobId=${encodeURIComponent(jobId)}`));
    const result = await res.json().catch(() => ({}));
    if (!res.ok || !result.ok) throw new Error(result.message || result.error || `HTTP ${res.status}`);
    if (result.manifest) state.videoClipManifest = result.manifest;
    const count = state.videoClipManifest?.count || 0;
    state.videoClipProgress = { done: count, total };
    if (count >= total && total > 0) {
      state.videoClipStatus = "done";
      state.videoClipProgress = null;
      state.videoClipMessage = `已生成 ${count} 段视频片段，下面可以逐段打开检查。`;
      renderToday();
      return;
    }
    const failed = Array.isArray(result.failed) ? result.failed : [];
    if (result.status === "error" || (failed.length && count + failed.length >= total)) {
      state.videoClipStatus = count > 0 ? "done" : "error";
      state.videoClipProgress = null;
      state.videoClipMessage = count > 0
        ? `已生成 ${count}/${total} 段${failed.length ? `（有 ${failed.length} 段没出来，可再点一次补）` : ""}。`
        : "这批视频片段没能出来，请稍后再点一次。出片服务较慢或排队时容易这样。";
      renderToday();
      return;
    }
    state.videoClipMessage = `正在出片：已完成 ${count}/${total} 段。可以停留等待，也可以稍后再点【查询已生成片段】。`;
    renderToday();
  }
  state.videoClipStatus = "done";
  state.videoClipProgress = null;
  const count = state.videoClipManifest?.count || 0;
  state.videoClipMessage = `等待较久，目前看到 ${count}/${total} 段。后台可能还在出，过一会点【查询已生成片段】取回，不用重出。`;
}

async function restoreLatestVideoClips() {
  const jobId = state.videoClipJobId || buildCurrentVideoClipJobId();
  state.videoClipStatus = "loading";
  state.videoClipJobId = jobId;
  state.videoClipMessage = "正在查询这个主题已生成的视频片段…";
  renderToday();
  try {
    const res = await fetch(apiPath(`/api/video-clip/status?jobId=${encodeURIComponent(jobId)}`));
    const result = await res.json().catch(() => ({}));
    if (!res.ok || !result.ok) throw new Error(result.message || result.error || `HTTP ${res.status}`);
    state.videoClipManifest = result.manifest || null;
    const count = state.videoClipManifest?.count || 0;
    state.videoClipStatus = count > 0 ? "done" : "idle";
    state.videoClipProgress = null;
    state.videoClipMessage = count
      ? `已找回这个主题的 ${count} 段视频片段。`
      : "这个主题还没有生成过视频片段，点上面的按钮开始。";
  } catch (error) {
    state.videoClipStatus = "error";
    state.videoClipProgress = null;
    state.videoClipMessage = `查询视频片段失败：${error.message}`;
  }
  renderToday();
}

function renderVideoClipGallery() {
  const files = Array.isArray(state.videoClipManifest?.publicFiles) ? state.videoClipManifest.publicFiles : [];
  if (files.length) {
    return `<div class="video-clip-gallery">
      ${files.map((url, index) => {
        const src = escapeHtml(String(url));
        return `<figure class="video-clip-item">
          <video src="${src}" controls preload="metadata" playsinline></video>
          <figcaption>片段 ${index + 1} · <a href="${src}" target="_blank" rel="noreferrer">下载</a></figcaption>
        </figure>`;
      }).join("")}
    </div>`;
  }
  if (state.videoClipStatus === "loading") {
    const done = Number(state.videoClipProgress?.done || 0);
    const total = Number(state.videoClipProgress?.total || 0);
    if (state.videoClipPhase === "keyframe") {
      return `<div class="video-clip-empty loading"><b>第 1 步·正在出关键帧图</b><span>已出 ${done}/${total} 张。要等关键帧出齐，才会开始第 2 步「关键帧→视频」（这时 Kie 才会有视频任务）。</span></div>`;
    }
    return `<div class="video-clip-empty loading"><b>第 2 步·正在出视频片段</b><span>已完成 ${done}/${total} 段，出好的会先显示在这里。</span></div>`;
  }
  return "";
}

