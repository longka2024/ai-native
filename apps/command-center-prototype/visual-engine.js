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
    { type: "case", role: "Source deconstruction", placement: platform === "wechat-article" ? "after source/case paragraph" : "P3", job: "show what is worth borrowing from the source", focus: signal.casePoints.join(" / ") },
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
      cognitiveAction: "deconstruct the source case into reusable pieces",
      jujuAction: "Juju sorts three paper cards into who, action, result",
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
  if (signals >= 4) return { types: ["cover", "problem", "case", "method", "action"], reason: "当前文案信息密度够，适合 5 张小红书图集。" };
  if (signals >= 2) return { types: ["cover", "problem", "action"], reason: "当前文案只有 2-3 个关键关系，做 3 张更干净。" };
  return { types: ["cover"], reason: "当前文案只适合一张主视觉，硬凑多图会稀释重点。" };
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
    `Current title: ${title}.`,
    `Visual route: ${contract.route}.`,
    `Character/style: ${contract.character}.`,
    `Style lock: ${contract.styleLock}.`,
    `Style brief: ${contract.styleBrief}.`,
    `Negative prompt: ${contract.negativePrompt}.`,
    "Do not reuse unrelated content asset library, title formula library, user question library, or structure library visuals unless this selected topic is explicitly about those libraries.",
    "Aesthetic quality: clean, elegant, and clear at a glance (简洁大方、一目了然). ONE clear focal point / single scene that nails this page's theme, supported by only a few (about 3-5) meaningful details that reinforce that one point. Generous breathing room, strong visual hierarchy, mobile-legible. Do NOT crowd the canvas with many scattered objects, multiple protagonists, or several mini-scenes — clutter that splits the focus is worse than too little. Use tasteful light color accents (warm red/orange or soft blue) on a clean base, not flat black-and-white. Vary the layout from page to page so the set does not look monotonous."
  ].join(" ");
  const cardSpecs = {
    cover: { title: title || signal.coverText, text: signal.coverText, extra: `Only express ${signal.subject} and ${signal.result}.`, layout: "Cover layout: one bold headline, one strong hero focal element, lots of whitespace, magazine-cover feel.", prompt: `Cover page. Strong focal point: ${signal.subject} + ${signal.result}.` },
    problem: { title: signal.problemTitle, text: signal.pain, extra: `Show the real reader question behind ${signal.result}.`, layout: "Comparison layout: two contrasting panels (wrong vs right / before vs after) side by side.", prompt: `Problem page. Show the question behind ${signal.subject}.` },
    case: { title: signal.caseTitle, text: signal.casePoints.join("\n"), extra: `Break the current case into subject=${signal.subject}, result=${signal.result}, key=${signal.keyPoint}.`, layout: "Evidence layout: a 3-card grid or quadrant (who / what worked / result), each a distinct block.", prompt: "Case deconstruction page with three cards: who, what worked, result." },
    method: { title: signal.methodTitle, text: signal.methodSteps.join("\n"), extra: `Break the path to ${signal.result} into executable steps.`, layout: "Step-flow layout: a numbered vertical path with 3-5 connected nodes and arrows.", prompt: "Method page. Show an executable route, not a generic template." },
    action: { title: signal.actionTitle, text: signal.action, extra: `Give only the next practical step around ${signal.subject}.`, layout: "Checklist layout: a short check-item list with check marks, one clear next step highlighted.", prompt: `Action checklist page, practical next step for ${signal.subject}.` },
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
  const metric = source.match(/(\d+(?:\.\d+)?\s*[万千百]?\+?\s*(?:阅读|播放|收藏|点赞|评论|收益|收入|粉丝|转化))/)?.[1] || "";
  const subject = cleanSourceText(topic.theme || topic.title || title).replace(/[，。！？].*$/, "").slice(0, 18) || "这个选题";
  const result = metric || (source.match(/(涨粉|阅读|播放|成交|获客|收益|收入|增长)[^，。！？]{0,16}/)?.[0] || "跑出结果");
  const pain = lines.find((line) => /为什么|不是|关键|忽略|收益|流量|定位|内容|案例|痛点|问题/.test(line)) || `很多人只看到${result}，但没看懂${subject}背后的关键变量。`;
  const action = lines.find((line) => /先|第一步|建议|测试|行动|复盘|观察|评论|私信/.test(line)) || `先拆一个真实${subject}案例：看它服务谁、发什么、怎么把注意力变成${result}。`;
  const keyPoint = /定位/.test(source) ? "账号定位" : /内容/.test(source) ? "持续内容" : /收益|流量|增长/.test(source) ? "结果路径" : "可复用动作";
  return {
    subject,
    result,
    keyPoint,
    coverText: `${subject}为什么能${result}`,
    problemTitle: `为什么${subject}能跑出来`,
    caseTitle: `${subject}案例拆解`,
    methodTitle: `跑通${subject}的动作`,
    actionTitle: "先照着拆一个真实案例",
    pain,
    action,
    takeaway: `这篇讲的是${subject}的真实结果，不是泛泛讲内容资产库。`,
    casePoints: [`对象：${subject}`, `结果：${result}`, `关键：${keyPoint}`],
    methodSteps: ["找准具体人群", "持续发有用内容", "观察结果数据", "复盘可复制动作"],
  };
}
function renderCleanXhsCardPreview() {
  const cards = ensureXhsCardPlan();
  if (!cards.length) return `<div class="empty-state"><b>${zh("&#35831;&#20808;&#30830;&#35748;&#25991;&#26696;")}</b><span>${zh("&#30830;&#35748;&#25991;&#26696;&#21518;&#65292;&#25165;&#20250;&#29983;&#25104;&#21487;&#25191;&#34892;&#30340;&#20986;&#22270; brief&#12290;")}</span></div>`;
  const hasRealImages = Array.isArray(currentVisualManifest()?.publicFiles) && currentVisualManifest().publicFiles.length > 0;
  const visual = currentVisualStyle();
  return `<div class="xhs-card-preview-panel">
    <div class="visual-workspace-head">
      <div>
        <b>${zh("&#24403;&#21069;&#20986;&#22270;&#20869;&#23481;")}</b>
        <span>${zh("&#24050;&#32465;&#23450;")}: ${escapeHtml(state.selectedTitle || selectedTopic()?.theme || "no title")} / ${escapeHtml(visualRouteNameClean(state.visualStyle))}</span>
      </div>
      <em>${escapeHtml(visual.route || visual.id)}</em>
    </div>
    ${hasRealImages ? "" : `<div class="status-strip warn">${zh("&#36825;&#37324;&#20808;&#25226;&#25991;&#26696;&#25286;&#25104; 5 &#39029;&#21487;&#25191;&#34892;&#20986;&#22270; brief&#12290;&#26368;&#32456;&#33021;&#21457;&#24067;&#30340;&#32467;&#26524;&#65292;&#20197; 43 &#36820;&#22238;&#30340;&#30495;&#23454;&#22270;&#29255;&#20026;&#20934;&#12290;")}</div>`}
    ${renderCurrentCopyForImage()}
    ${renderIllustrationDirectorPanel()}
    ${renderXhsGeneratedGallery()}
    <details class="xhs-carousel-plan" ${hasRealImages ? "" : "open"}>
      <summary>${zh("&#26597;&#30475; 5 &#39029;&#20986;&#22270; brief")}</summary>
      ${cards.map((card, index) => `<div><span>P${index + 1}</span><strong>${escapeHtml(card.role)}</strong><em>${escapeHtml(card.carouselJob || card.visualBrief || "brief")}</em></div>`).join("")}
    </details>
    ${currentVisualManifest() ? `<div class="status-strip success">${zh("&#24050;&#29983;&#25104;")}: ${escapeHtml(currentVisualManifest().count || cards.length)} ${zh("&#24352;")} / ${escapeHtml(currentVisualManifest().jobId || currentVisualManifest().outputDir || "")}</div>` : ""}
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
  const isXiaohei = String(state.xhsCardManifest?.renderer || "").includes("43-gpt-image-2-xiaohei");
  if (files.length) {
    const done = Number(state.xhsCardProgress?.done || files.length || 0);
    const total = Number(state.xhsCardProgress?.total || 5);
    const isLoading = state.xhsCardExportStatus === "loading";
    const styleName = visualRouteNameClean(state.visualStyle);
    return `<div class="xhs-generated-gallery">
      <div class="xhs-generated-head">
        <b>${escapeHtml(styleName)} ${zh("&#30495;&#23454;&#20986;&#22270;&#32467;&#26524;")}</b>
        <span>${isLoading ? `43 ${zh("&#21518;&#21488;&#36824;&#22312;&#29983;&#25104;")}: ${done}/${total}${zh("&#24352;&#12290;&#24050;&#29983;&#25104;&#30340;&#22270;&#29255;&#20808;&#26174;&#31034;&#65292;&#21487;&#28857;&#24320;&#26816;&#26597;&#21407;&#22270;&#12290;")}` : zh("&#22270;&#29255;&#26469;&#33258; 43 &#20986;&#22270;&#26381;&#21153;&#65292;&#21487;&#28857;&#20987;&#25171;&#24320;&#21407;&#22270;&#26816;&#26597;&#12290;")}</span>
      </div>
      <div class="xhs-generated-grid ${isLoading ? "partial" : ""}">
        ${files.map((file, index) => {
          const raw = String(file);
          const src = /^https?:\/\//.test(raw) ? raw : `./${raw.replace(/^\/+/, "")}`;
          return `<a href="${escapeHtml(src)}" target="_blank" rel="noreferrer">
            <img src="${escapeHtml(src)}" alt="${escapeHtml(styleName)} P${index + 1}" loading="lazy" />
            <span>P${index + 1}</span>
          </a>`;
        }).join("")}
      </div>
    </div>`;
  }
  if (state.xhsCardExportStatus === "loading" && state.xhsCardOperation === "xiaohei") {
    const done = Number(state.xhsCardProgress?.done || files.length || 0);
    const total = Number(state.xhsCardProgress?.total || 5);
    return `<div class="xhs-generated-empty loading">
      <b>43 正在生成配图</b>
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
      <b>还没有生成配图</b>
      <span>确认当前文案后，点击生成配图。这里会直接显示 43 返回的真实图片。</span>
      <button class="secondary" type="button" data-restore-latest-xiaohei>查询当前主题已生成图片</button>
    </div>`;
  }
  return `<div class="xhs-generated-gallery">
    <div class="xhs-generated-head">
      <b>${isXiaohei ? "43 真实出图结果" : "拆页方案导出结果"}</b>
      <span>${isXiaohei ? "这些图片来自 43 出图服务，可点击打开原图检查。" : "这些只是页面方案 PNG，不是最终配图成品。"}</span>
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

async function generateXiaoheiCards() {
  if (!state.copyConfirmed) {
    state.xhsCardExportStatus = "error";
    state.xhsCardOperation = "visual";
    state.xhsCardExportMessage = "请先在第 9 步确认文案。确认后，作图按钮才会真正调用 43 出图服务。";
    renderToday();
    return;
  }
  const cards = ensureXhsCardPlan();
  if (!cards.length) {
    state.xhsCardExportStatus = "error";
    state.xhsCardOperation = "visual";
    state.xhsCardExportMessage = "当前文案还没有拆成可出图的 brief，无法启动 43 出图。请先确认文案或重新生成文案。";
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
  state.xhsCardExportMessage = `43 正在启动${visualRouteNameClean(visual.id)}出图任务，页面会自动轮询结果。`;
  state.xhsCardManifest = {
    renderer: `43-gpt-image-2-${visual.id}-async`,
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
    state.xhsCardExportMessage = `43 ${visualRouteNameClean(visual.id)}出图中断：${error.message}。已生成 ${count} 张会保留显示，未生成的不冒充成品。`;
    if (!count) state.xhsCardManifest = null;
  }
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
      state.xhsCardExportMessage = `43 已生成 ${count} 张${visualRouteNameClean(state.visualStyle)}，下面可以逐张打开检查。`;
      renderToday();
      return;
    }
    state.xhsCardProgress = { done: count, total };
    state.xhsCardExportMessage = `43 后台出图中：已完成 ${count}/${total} 张。你可以停留等待，也可以稍后继续查询。`;
    const failedPages = Array.isArray(result.failed) ? result.failed.map((item) => Number(item.page || 0)).filter(Boolean) : [];
    if (["partial", "error"].includes(result.status) && count > 0 && count + failedPages.length >= total) {
      if (repairAttempts < 2 && state.xhsCardStartPayload) {
        state.xhsCardExportStatus = "loading";
        state.xhsCardProgress = { done: count, total };
        state.xhsCardExportMessage = `43 当前只完成 ${count}/${total} 张，系统正在自动补齐缺页${failedPages.length ? ` P${failedPages.join("/P")}` : ""}，补齐前不会保存为完成作品。`;
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
      state.xhsCardExportMessage = `43 当前已生成 ${count}/${total} 张${failedPages.length ? `，缺 P${failedPages.join("/P")}` : ""}。请再次点击出图按钮补齐缺页，补齐前不能保存为已完成作品。`;
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
  state.xhsCardExportStatus = "loading";
  state.xhsCardOperation = "xiaohei";
  state.xhsCardAsyncJobId = jobId;
  state.xhsCardJobBase = jobId;
  state.xhsCardExportMessage = `正在从 43 恢复当前主题的图片：${jobId}`;
  renderToday();
  try {
    const res = await fetch(apiPath(`/api/xhs-cards/generate-xiaohei/status?jobId=${encodeURIComponent(jobId)}&total=5`));
    const result = await res.json().catch(() => ({}));
    if (!res.ok || !result.ok) throw new Error(result.message || result.error || `HTTP ${res.status}`);
    applyRemoteVisualManifest(result.manifest || null);
    state.xhsCardAsyncJobId = result.jobId || jobId;
    state.xhsCardJobBase = result.jobId || jobId;
    const count = state.xhsCardManifest?.count || 0;
    state.xhsCardExportStatus = count >= 5 ? "done" : (count > 0 ? "error" : "idle");
    state.xhsCardOperation = "xiaohei";
    state.xhsCardProgress = null;
    state.xhsCardExportMessage = count
      ? `已恢复当前主题 ${count}/5 张配图。`
      : "当前主题还没有生成过配图，请点击生成配图。";
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

