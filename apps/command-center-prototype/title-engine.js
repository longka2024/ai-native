// title-engine.js — 标题生成引擎
// 依赖: state-manager.js, config.js, utils.js, copy-manager.js, topic-engine.js

async function ensureTitleAssetsForCurrentTopic() {
  const topic = selectedTopic();
  if (!topic || state.titleAssetLoading) return;
  const key = [
    state.publishTarget,
    state.keywords,
    topic.id,
    topic.theme || topic.title || "",
  ].join("|");
  if (state.titleAssetKey === key) return;
  state.titleAssetKey = key;
  state.titleAssetLoading = true;
  state.titleAssetMessage = "";
  try {
    const params = new URLSearchParams({
      keywords: [state.keywords, topic.theme, topic.title].filter(Boolean).join(","),
      platform: currentTarget().platform || "",
      limit: "40",
    });
    const res = await fetch(apiPath(`/api/title-assets?${params.toString()}`));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    state.titleAssets = Array.isArray(result.titles) ? result.titles : [];
    state.titleAssetMessage = result.filterMiss
      ? "当前方向标题资产不足：本次先基于当前选题生成临时标题，标题库只做辅助参考。"
      : `当前方向已匹配 ${state.titleAssets.length} 条标题资产，候选标题会参考真实爆款公式，但仍优先绑定当前选题。`;
    state.titleChoiceKey = "";
    ensureFreshTitleChoices(state.titleAssets);
    if (!state.titleChoices.some((item) => item.title === state.selectedTitle)) state.selectedTitle = "";
  } catch (error) {
    state.titleAssets = [];
    state.titleAssetMessage = `标题资产读取失败：${error.message}`;
  } finally {
    state.titleAssetLoading = false;
    if (state.step === 6) renderToday();
    // 资产加载完成后立即触发 LLM 标题生成（不被 titleAssetLoading 阻断）
    triggerLlmTitleGeneration();
  }
}

function buildAssetBackedTitleChoices(topic, assets = []) {
  const seed = buildTitleSeed(topic);
  const usable = assets.filter((item) => item && item.title).slice(0, 18);
  const groups = groupTitleAssets(usable).slice(0, 5);
  return groups.map((group, index) => {
    const example = group.items[0] || usable[index] || {};
    const title = rewriteTitleFromAsset(seed, group.name, example.title || "");
    const metrics = example.metrics || {};
    const proof = metrics.likes || metrics.saves || metrics.comments
      ? `赞${metrics.likes || 0}/藏${metrics.saves || 0}/评${metrics.comments || 0}`
      : "真实标题资产";
    return titleChoice(title, `${group.name}：参考《${example.title || "标题资产"}》，${proof}`);
  });
}

function rewriteTitleFromAsset(seed, formula = "", example = "") {
  const core = seed.core || state.businessLine;
  const problem = seed.problem || `${core}没效果`;
  const scene = seed.scene || `做${core}`;
  const audience = seed.audience || "普通人";
  const mark = `${formula} ${example}`;
  if (/认知|冲突|对比|不是|而是/.test(mark)) return `${core}真正难的，不是工具`;
  if (/损失|避坑|别|警告|不要/.test(mark)) return `别急着做${core}，先看这一步`;
  if (/数字|清单|\d/.test(mark)) return `${audience}做${core}，先存这 5 类素材`;
  if (/结果|承诺|如何|怎么/.test(mark)) return `如何把${scene}变成稳定选题`;
  if (/经验|案例|复盘|我/.test(mark)) return `我做${core}后才明白的一件事`;
  if (/争议|互动|测试|问题/.test(mark)) return `${problem}，到底卡在哪一步？`;
  return `${core}不是照抄爆款，而是先建资产`;
}

function currentTitleChoiceKey(topic = selectedTopic()) {
  if (!topic) return "";
  return [
    TITLE_LOGIC_VERSION,
    state.publishTarget,
    state.keywords,
    topic.id,
    topic.title || "",
    topic.theme || "",
  ].join("|");
}

function llmTitleChoiceKey(topic) {
  return (topic.id || topic.theme || topic.title || "") + "|" + (state.publishTarget || "xhs") + "-llm";
}

function ensureFreshTitleChoices(titleAssets = state.titleAssets) {
  const topic = selectedTopic();
  if (!topic) return;
  // LLM 已为当前选题+平台生成标题时，不得用本地公式覆盖（否则渲染循环会反复抹掉 LLM 结果）
  if (state.titleChoiceKey === llmTitleChoiceKey(topic) && state.titleChoices.length) return;
  const key = currentTitleChoiceKey(topic);
  if (state.titleChoiceKey === key && state.titleChoices.length) return;
  state.titleChoiceKey = key;
  state.titleChoices = buildCleanTitleChoices(topic, titleAssets);
  if (!state.titleChoices.some((item) => item.title === state.selectedTitle)) state.selectedTitle = "";
}

function topicTextForTitle(topic = {}) {
  return cleanSourceText([
    topic.theme,
    topic.title,
    topic.body,
    topic.content,
    topic.raw?.title,
    topic.raw?.theme,
    topic.raw?.text,
    topic.raw?.content,
    topic.raw?.description,
  ].filter(Boolean).join(" "));
}

function extractTopicSignals(topic = {}) {
  const text = topicTextForTitle(topic);
  const hasCaseProof = /(?:收益|收入|变现|利润|流量|阅读|播放|涨粉|曝光|点赞|收藏|成交)[^，。！？\d]{0,12}\d|\d+(?:\.\d+)?\s*[万千百kK]?\+?\s*(?:曝光|阅读|播放|点赞|收藏|涨粉|收益|收入|成交|变现)/.test(text);
  const caseSignal = hasCaseProof ? extractCaseTitleSignal(text) : null;
  if (caseSignal) return caseSignal;
  const clauses = text
    .split(/[。！？?!\n\r]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 4)
    .slice(0, 8);
  const keep = [];
  const push = (value) => {
    const word = String(value || "").trim();
    if (word && !keep.includes(word) && keep.length < 8) keep.push(word);
  };
  const tokenPattern = /[A-Za-z][A-Za-z0-9_-]{1,20}|[\u4e00-\u9fa5]{2,12}/g;
  for (const match of text.matchAll(tokenPattern)) {
    const word = match[0];
    if (/^(这个|那个|因为|所以|但是|如果|不是|而是|真正|可以|已经|现在|昨天|今天|一个|一种|很多|时候|内容|选题|素材)$/.test(word)) continue;
    if (/AI|Agent|FDE|自媒体|企业|落地|组织|工作流|岗位|采购|部署|培训|知识库|资产库|小红书|公众号|视频号|朋友圈|模型|爆款|人味|复写|复盘|工具/.test(word)) push(word);
  }
  const contrast = text.match(/不是([^，。！？?；]{2,24})[，；]?\s*而是([^，。！？?；]{2,32})/);
  const cleanKeywords = keep.filter((item) => isGoodTitleSlot(item));
  const sourceTitle = cleanSourceText(topic.title || topic.theme || clauses[0] || "").slice(0, 42);
  const main = cleanTitleSlot(cleanKeywords[0] || sourceTitle || state.businessLine);
  const second = cleanTitleSlot(cleanKeywords.find((item) => item !== main) || inferSurfaceMisread(text) || state.businessLine || "这件事");
  const third = cleanTitleSlot(cleanKeywords.find((item) => item !== main && item !== second) || inferRealValue(text) || "关键变化");
  return {
    text,
    clauses,
    keywords: cleanKeywords,
    main,
    second,
    third,
    sourceTitle,
    contrastA: contrast?.[1]?.trim() || "",
    contrastB: contrast?.[2]?.trim() || "",
  };
}

function extractCaseTitleSignal(text = "") {
  const clean = cleanSourceText(text);
  const money = clean.match(/(?:收益|收入|变现|利润|流量|阅读|播放|涨粉)[^，。！？]{0,12}?(\d+(?:\.\d+)?\s*[万千百kK]?\+?)/);
  const daily = /一天|每日|每天|日更|24h|24小时/.test(clean);
  const account = clean.match(/([^，。！？\s]{0,10}(?:公众号流量主|公众号|小红书账号|账号|视频号|自媒体|项目|副业))/);
  const location = clean.match(/(小地方|县城|本地|三四线|大城市|普通人|新人|新手)/);
  if (!money && !account) return null;
  const main = cleanTitleSlot(account?.[1] || location?.[1] || "这个真实案例").replace(/^.*?(公众号流量主|公众号|小红书账号|账号|视频号|自媒体|项目|副业)$/, "$1");
  const result = cleanTitleSlot(`${daily ? "一天" : ""}${money ? `${money[1]}收益` : "跑出结果"}`);
  const contrastA = cleanTitleSlot(location?.[1] || "大城市流量");
  const contrastB = cleanTitleSlot(result || "稳定收益");
  return {
    text: clean,
    clauses: [clean.slice(0, 80)],
    keywords: [main, result, contrastA, contrastB].filter(Boolean),
    main,
    second: contrastA,
    third: contrastB,
    sourceTitle: clean.slice(0, 42),
    contrastA,
    contrastB,
    mode: "case",
  };
}

function inferSurfaceMisread(text = "") {
  if (/收益|收入|变现|利润/.test(text)) return "大城市流量";
  if (/AI|Agent|工具/.test(text)) return "买工具";
  if (/标题|爆款|流量/.test(text)) return "套公式";
  return state.businessLine || "表面动作";
}

function inferRealValue(text = "") {
  if (/收益|收入|变现|利润/.test(text)) return "真实收益模型";
  if (/案例|数据|实操|复盘/.test(text)) return "真实案例";
  if (/AI|Agent|工具/.test(text)) return "工作流变化";
  if (/内容|素材|资产/.test(text)) return "内容资产";
  return "关键变化";
}

function buildTopicDrivenTitleChoices(topic = {}) {
  const signal = extractTopicSignals(topic);
  if (!signal.text || signal.text.length < 8) return [];
  return dedupeTitleChoices(titleFormulaLibraryForTarget(state.publishTarget).map((formula) => {
    const title = applyTitleFormula(formula, signal);
    return titleChoice(title, `公式：${formula.name} · 替换：${formula.slots.join(" / ")} · 绑定当前选题`);
  }));
}

function titleFormulaLibraryForTarget(target) {
  const common = [
    { name: "不是 A，而是 B", pattern: "contrast", slots: ["选题", "表层认知", "真实变化"] },
    { name: "别把 X 当成 Y", pattern: "misread", slots: ["选题", "误区"] },
    { name: "X 背后真正变的是 Y", pattern: "behind", slots: ["选题", "真实变化"] },
    { name: "为什么 X 会影响 Y", pattern: "why-impact", slots: ["选题", "影响对象"] },
    { name: "普通人看 X，先抓 3 点", pattern: "three-points", slots: ["选题"] },
  ];
  if (target === "moments") {
    return [
      { name: "最近重新理解 X", pattern: "moments-observe", slots: ["选题"] },
      { name: "以前以为是 A，其实是 B", pattern: "moments-contrast", slots: ["表层认知", "真实变化"] },
      { name: "X 让我停下来的点", pattern: "moments-stop", slots: ["选题", "真实变化"] },
      { name: "关于 X，我现在更在意 Y", pattern: "moments-care", slots: ["选题", "真实变化"] },
      { name: "今天看到一个 X 判断", pattern: "moments-note", slots: ["选题"] },
    ];
  }
  if (target === "wechat-article") {
    return [
      common[0],
      { name: "从 X 看懂 Y", pattern: "from-to", slots: ["选题", "真实变化"] },
      { name: "X 背后的真正问题", pattern: "deep-problem", slots: ["选题", "表层认知"] },
      common[3],
      { name: "X 之后，Y 怎么重新理解", pattern: "after-rethink", slots: ["选题", "影响对象"] },
    ];
  }
  if (target === "douyin" || target === "video-account") {
    return [
      common[0],
      { name: "X 不是新概念", pattern: "not-new", slots: ["选题", "真实变化"] },
      common[1],
      common[2],
      common[3],
    ];
  }
  return common;
}

function applyTitleFormula(formula, signal) {
  const main = cleanTitleSlot(signal.main);
  const second = cleanTitleSlot(signal.contrastA || signal.second);
  const third = cleanTitleSlot(signal.contrastB || signal.third);
  const impact = cleanTitleSlot(signal.keywords.find((item) => item !== main && item !== second && item !== third) || signal.second);
  if (signal.mode === "case") {
    const caseMap = {
      contrast: `${main}的重点不是${second}，而是${third}`,
      misread: `别把${main}只看成${second}`,
      behind: `${main}背后，藏着一套${third}`,
      "why-impact": `为什么${main}能跑出${third}`,
      "three-points": `${main}这件事，先拆清 3 个信号`,
      "not-new": `${main}不是偶然，真正关键是${third}`,
    };
    if (caseMap[formula.pattern]) return caseMap[formula.pattern];
  }
  const map = {
    contrast: `${main}的重点不是${second}，而是${third}`,
    misread: `别再把${main}只理解成${second}`,
    behind: `${main}背后，真正变的是${third}`,
    "why-impact": `为什么${main}会影响${impact}`,
    "three-points": `普通人看${main}，先抓住这 3 个变化`,
    "moments-observe": `我最近重新理解了${main}`,
    "moments-contrast": `以前我也以为关键是${second}，后来发现是${third}`,
    "moments-stop": `${main}这事，真正让我停下来的点是${third}`,
    "moments-care": `关于${main}，我现在更在意${third}`,
    "moments-note": `今天看到一个关于${main}的判断，挺值得拆`,
    "from-to": `从${main}看懂${third}：为什么这不是一次普通变化`,
    "deep-problem": `${main}背后的真正问题：${second}只是表层`,
    "after-rethink": `${main}之后，${impact}应该怎么重新理解`,
    "not-new": `${main}不是新概念，真正变的是${third}`,
  };
  return map[formula.pattern] || `${main}真正该看的，不是${second}，而是${third}`;
}

function cleanTitleSlot(value = "") {
  const clean = cleanSourceText(value)
    .replace(/^(关于|这个|那个|一种|一个|很多|真正|关键|当前)/, "")
    .replace(/(可以先改成|后续再扩展成|视频号短视频|抖音短视频|公众号长文|小红书图文|朋友圈文案|短视频脚本|平台成品|发布目标)/g, "")
    .replace(/[，、。！？；：,.!?;:]+$/g, "")
    .trim();
  return clean.length > 18 ? clean.slice(0, 18) : clean || state.businessLine || "这件事";
}

function isGoodTitleSlot(value = "") {
  const clean = cleanTitleSlot(value);
  if (!clean || clean.length < 2) return false;
  if (/视频号短视频|公众号|朋友圈|后续|扩展|当前选题|发布目标|目标平台|生成|标题|正文|平台成品/.test(clean)) return false;
  if (/^[\d\s]+$/.test(clean)) return false;
  return true;
}

function buildTitleChoices(topic, titleAssets = state.titleAssets) {
  return buildCleanTitleChoices(topic, titleAssets);
}

function buildTitleSeed(topic = {}) {
  const sourceText = cleanSourceText([
    topic.theme,
    topic.title,
    topic.pain,
    topic.reason,
    topic.reuse,
    topic.content,
  ].filter(Boolean).join(" "));
  const text = sourceText || state.businessLine;
  const hasAsset = /资产库|素材库|知识库|语料库|内容库/.test(text);
  const hasAgent = /Agent|智能体|工作流|自动化/.test(text);
  const hasAiTaste = /AI味|AI 味|不像人|模板|同质化/.test(text);
  const hasNoTopic = /不知道发什么|选题|话题|素材/.test(text);
  const asset = hasAsset ? "内容资产库" : hasAgent ? "Agent 工作流" : hasAiTaste ? "人味素材库" : "素材库";
  const core = hasAsset ? "内容资产库" : hasAgent ? "Agent 工作流" : state.businessLine;
  const scene = hasNoTopic ? "每天不知道发什么" : hasAiTaste ? "写出来总有 AI 味" : hasAgent ? "Agent 总是跑偏" : `做${state.businessLine}`;
  const problem = hasNoTopic ? "每天不知道发什么" : hasAiTaste ? "文案越来越像 AI" : hasAgent ? "Agent 工作流总卡壳" : `${state.businessLine}没效果`;
  const audience = /普通人|新手|小白/.test(text) ? "普通人" : /公众号|小红书|自媒体/.test(text) ? "自媒体人" : "内容创作者";
  const sourceType = hasAsset ? "asset" : hasAgent ? "agent" : hasAiTaste ? "humanize" : /公众号|长文/.test(text) ? "longform" : "general";
  return { asset, core, scene, problem, audience, sourceType };
}

function xhsTitlePoolForSeed(seed) {
  return [
    { title: `${seed.problem}？先看这一步`, reason: "通用避坑：保底但绑定问题。" },
    { title: `${seed.audience}最容易忽略的内容动作`, reason: "人群代入：降低门槛。" },
    { title: `${seed.core}不是照抄爆款`, reason: "观点型：适合二创解释。" },
    { title: `为什么你做${seed.core}总是没结果？`, reason: "问题型：引出诊断。" },
    { title: `想做好${seed.core}，先存这张清单`, reason: "收藏型：适合图文。" },
  ];
}
function titleChoice(title, reason) {
  return { title: trimTitleForTarget(title, state.publishTarget), reason };
}

function titleMaxLengthForTarget(target = state.publishTarget) {
  if (target === "xhs") return 20;
  if (target === "moments") return 32;
  if (target === "douyin" || target === "video-account") return 30;
  return 60;
}

function titleCharLength(title = "") {
  return Array.from(String(title || "").trim()).length;
}

function normalizeTitleText(value = "") {
  return String(value || "")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/#([^#\s]+)\[.*?\]#/g, "$1")
    .replace(/[#@]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function polishTitleText(title = "") {
  return normalizeTitleText(title)
    .replace(/MVP\u771f\u6b63/g, "MVP \u771f\u6b63")
    .replace(/MVP\u4e4b/g, "MVP \u4e4b")
    .replace(/MVP\u60f3/g, "MVP \u60f3")
    .replace(/AI\u5de5\u5177/g, "AI \u5de5\u5177")
    .replace(/\s+/g, " ")
    .trim();
}

function trimTitleForTarget(title = "", target = state.publishTarget) {
  const clean = polishTitleText(title);
  if (target === "wechat-article") return clean;
  const max = titleMaxLengthForTarget(target);
  const chars = Array.from(clean);
  if (chars.length <= max) return clean;
  return chars.slice(0, max).join("").replace(/[\uFF0C\u3002\uFF01\uFF1F\uFF1B\uFF1A,.!?;:]$/g, "").trim();
}

function clampTitle(title = "") {
  return trimTitleForTarget(title, state.publishTarget);
}

function dedupeTitleChoices(items = []) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    if (!item?.title) continue;
    const key = normalizeTitleText(item.title).replace(/[\uFF0C\u3002\uFF01\uFF1F\uFF1B\uFF1A,.!?;:\s]/g, "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result.slice(0, 5);
}

// 本地公式系统已清除 — 标题全部由 LLM 生成
// 此函数仅返回空数组，UI 会显示 loading 状态直到 LLM 返回结果
function buildCleanTitleChoices(_topic, _titleAssets) {
  return [];
}

function buildAssetTitleCandidates(signal, titleAssets = []) {
  const example = (titleAssets || []).find((item) => normalizeTitleText(item?.title).length >= 6);
  if (!example) return [];
  const title = normalizeTitleText(example.title);
  if (state.publishTarget === "xhs") {
    if (/\d/.test(title)) return [titleChoice(`${signal.shortSubject}\u5148\u770b\u8fd93\u70b9`, `\u53c2\u8003\u6807\u9898\u5e93\u6570\u5b57\u578b\uff1a${title}`)];
    if (/\u522b|\u4e0d\u8981|\u907f\u5751|\u9519|\u5751/.test(title)) return [titleChoice(`${signal.shortSubject}\u522b\u518d\u4e71\u8ddf\u98ce`, `\u53c2\u8003\u6807\u9898\u5e93\u907f\u5751\u578b\uff1a${title}`)];
    return [titleChoice(`${signal.shortSubject}\u8fd9\u6837\u7528\u624d\u6709\u6548`, `\u53c2\u8003\u6807\u9898\u5e93\u65b9\u6cd5\u578b\uff1a${title}`)];
  }
  if (state.publishTarget === "wechat-article") {
    if (/\u4e3a\u4ec0\u4e48|\u4e0d\u662f|\u800c\u662f/.test(title)) return [titleChoice(`${signal.subject}\u771f\u6b63\u96be\u7684\u4e0d\u662f\u5de5\u5177\uff0c\u800c\u662f${signal.action}`, `\u53c2\u8003\u6807\u9898\u5e93\u89c2\u70b9\u578b\uff1a${title}`)];
    if (/\d/.test(title)) return [titleChoice(`${signal.audience}\u505a${signal.subject}\uff0c\u5148\u60f3\u6e05\u695a\u8fd9\u51e0\u4e2a\u95ee\u9898`, `\u53c2\u8003\u6807\u9898\u5e93\u6e05\u5355\u578b\uff1a${title}`)];
    return [titleChoice(`\u4ece${signal.subject}\u5230${signal.result}\uff1a${signal.audience}\u771f\u6b63\u8981\u8865\u7684\u4e00\u8bfe`, `\u53c2\u8003\u6807\u9898\u5e93\u590d\u76d8\u578b\uff1a${title}`)];
  }
  return [titleChoice(`${signal.subject}\u8fd9\u4ef6\u4e8b\uff0c\u522b\u53ea\u770b\u8868\u9762`, `\u53c2\u8003\u6807\u9898\u5e93\uff1a${title}`)];
}

function buildPlatformTitleCandidates(signal, target = state.publishTarget) {
  return buildFormulaTitleCandidates(signal, target);
}

const TITLE_FORMULAS = [
  { id: "counter", style: "\u53cd\u5e38\u8bc6\u578b", tags: ["contrast"], render: (s) => `\u522b\u5148\u8ff7\u4fe1${s.subject}` },
  { id: "pain-root", style: "\u75db\u70b9\u578b", tags: ["pain"], render: (s) => `${s.problem}\u95ee\u9898\u51fa\u5728\u54ea` },
  { id: "subject-pain", style: "\u4e3b\u9898\u75db\u70b9\u578b", tags: ["pain", "subject"], render: (s) => `${s.shortSubject}\u522b\u518d${s.badAction}` },
  { id: "subject-list", style: "\u4e3b\u9898\u6e05\u5355\u578b", tags: ["list", "subject"], render: (s) => `${s.audience}\u5148\u770b${s.number}\u4e2a${s.shortSubject}` },
  { id: "result", style: "\u7ed3\u679c\u578b", tags: ["result"], render: (s) => `${s.shortSubject}\u60f3\u8981${s.result}` },
  { id: "truth", style: "\u771f\u76f8\u578b", tags: ["truth"], render: (s) => `${s.shortSubject}\u522b\u53ea\u770b\u8868\u9762` },
  { id: "compare", style: "\u5bf9\u6bd4\u578b", tags: ["contrast"], render: (s) => `${s.shortSubject}\u6709\u7528\u548c\u6ca1\u7528\u7684\u5dee\u522b` },
  { id: "list", style: "\u6e05\u5355\u578b", tags: ["list"], render: (s) => `${s.audience}\u5148\u770b\u8fd9${s.number}\u4e2a\u4fe1\u53f7` },
  { id: "avoid", style: "\u907f\u5751\u578b", tags: ["loss"], render: (s) => `${s.shortSubject}\u522b\u4e71\u8ddf\u98ce` },
  { id: "action", style: "\u52a8\u4f5c\u578b", tags: ["action"], render: (s) => `${s.problem}\u5148\u62c6\u6e05\u518d\u884c\u52a8` },
  { id: "question", style: "\u95ee\u9898\u578b", tags: ["question"], render: (s) => `${s.audience}\u4e3a\u4ec0\u4e48\u5361\u5728${s.problem}` },
  { id: "stop", style: "\u884c\u52a8\u53f7\u53ec\u578b", tags: ["action"], render: (s) => `\u522b\u518d${s.badAction}\uff0c\u5148${s.action}` },
  { id: "root-cause", style: "\u6839\u56e0\u578b", tags: ["pain", "truth"], render: (s) => `${s.problem}\u7684\u6839\u672c\u539f\u56e0` },
  { id: "before-after", style: "\u8f6c\u53d8\u578b", tags: ["result", "contrast"], render: (s) => `\u4ece${s.problem}\u5230${s.result}` },
  { id: "late-lesson", style: "\u6559\u8bad\u578b", tags: ["loss", "list"], render: (s) => `${s.audience}\u592a\u665a\u77e5\u9053\u7684${s.number}\u4e2a\u6559\u8bad` },
  { id: "worth", style: "\u5224\u65ad\u578b", tags: ["question"], render: (s) => `${s.shortSubject}\u503c\u4e0d\u503c\u5f97\u505a` },
];

function buildFormulaTitleCandidates(signal, target = state.publishTarget) {
  const s = normalizeTitleFormulaSignal(signal);
  const formulas = rankTitleFormulasForSignal(s, target);
  return formulas.map((formula) => titleChoice(renderFormulaTitleForTarget(formula, s, target), `${formula.style}\uff1a${formula.id}`));
}

function renderFormulaTitleForTarget(formula, signal, target = state.publishTarget) {
  const short = formula.render(signal);
  if (target !== "wechat-article") return short;
  const expansions = {
    "pain-root": `${signal.problem}\u95ee\u9898\u51fa\u5728\u54ea\uff1f${signal.audience}\u9700\u8981\u5148\u770b\u61c2\u8fd9\u4e2a\u5224\u65ad`,
    "root-cause": `${signal.problem}\u7684\u6839\u672c\u539f\u56e0\uff0c\u5f80\u5f80\u4e0d\u5728${signal.shortSubject}\u672c\u8eab`,
    truth: `${signal.shortSubject}\u522b\u53ea\u770b\u8868\u9762\uff0c\u771f\u6b63\u5173\u952e\u5728${signal.action}`,
    compare: `${signal.shortSubject}\u6709\u7528\u548c\u6ca1\u7528\u7684\u5dee\u522b\uff0c\u5c31\u5728\u8fd9\u4e2a\u5224\u65ad\u4e0a`,
    list: `${signal.audience}\u5148\u522b\u6025\u7740\u7167\u6284\uff1a${signal.subject}\u7684${signal.number}\u4e2a\u5224\u65ad\u4fe1\u53f7`,
    result: `\u4ece${signal.problem}\u5230${signal.result}\uff1a${signal.subject}\u7684\u5b8c\u6574\u8def\u5f84`,
    stop: `\u522b\u518d${signal.badAction}\uff0c${signal.audience}\u771f\u6b63\u8981\u5148\u505a\u7684\u662f${signal.action}`,
    counter: `${signal.audience}\u522b\u5148\u8ff7\u4fe1${signal.subject}\uff0c\u5148\u60f3\u6e05\u695a\u5b83\u89e3\u51b3\u4ec0\u4e48\u95ee\u9898`,
  };
  return expansions[formula.id] || `${short}\uff1a${signal.audience}\u5e94\u8be5\u5148\u770b\u61c2\u7684\u5224\u65ad`;
}

function normalizeTitleFormulaSignal(signal = {}) {
  const sourceNumber = String(signal.sourceTitle || "").match(/(\d+)\s*(\u4e2a|\u6761|\u70b9|\u4ef6|\u5929|\u5c0f\u65f6)?/);
  return {
    ...signal,
    subject: shortTitlePhrase(signal.subject || signal.sourceTitle || "\u8fd9\u4ef6\u4e8b", 12),
    shortSubject: shortTitlePhrase(signal.shortSubject || signal.subject || "\u8fd9\u4ef6\u4e8b", 8),
    audience: shortTitlePhrase(signal.audience || "\u666e\u901a\u4eba", 8),
    problem: shortTitlePhrase(signal.problem || "\u95ee\u9898\u6ca1\u62c6\u6e05", 10),
    action: shortTitlePhrase(signal.action || "\u5148\u505a\u5224\u65ad", 10),
    result: shortTitlePhrase(signal.result || "\u62ff\u5230\u7ed3\u679c", 8),
    badAction: shortTitlePhrase(signal.badAction || inferBadTitleAction(signal), 8),
    number: sourceNumber?.[1] || "3",
  };
}

function rankTitleFormulasForSignal(signal, target = state.publishTarget) {
  return TITLE_FORMULAS
    .map((formula, index) => ({ formula, score: scoreTitleFormula(formula, signal, target, index) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, target === "wechat-article" ? 12 : 10)
    .map((item) => item.formula);
}

function scoreTitleFormula(formula, signal, target, index) {
  let score = 100 - index;
  const text = signal.text || "";
  if (formula.tags.includes("pain") && /痛|怕|担心|卡|难|没|低质|模板|焦虑|问题/.test(text)) score += 28;
  if (formula.tags.includes("subject") && /AI|工具|Skill|skills|MVP|私校|面试|律师|教育|公众号|小红书/.test(signal.subject + text)) score += 30;
  if (formula.tags.includes("list") && /\d+|清单|方法|步骤|工具|案例|信号/.test(text)) score += 24;
  if (formula.tags.includes("loss") && /别|不要|坑|错|风险|低质|浪费|后果/.test(text)) score += 22;
  if (formula.tags.includes("result") && /结果|提升|增长|收藏|点赞|转发|阅读|省|效率|MVP/.test(text)) score += 20;
  if (formula.tags.includes("contrast") && /不是|而是|对比|差别|误区|反常识|真相/.test(text)) score += 18;
  if (target === "wechat-article" && ["question", "truth", "compare"].includes(formula.id)) score += 12;
  if (target === "xhs" && ["pain-root", "list", "avoid", "action"].includes(formula.id)) score += 12;
  return score;
}

function inferBadTitleAction(signal = {}) {
  const text = [signal.sourceTitle, signal.problem, signal.action, signal.subject, signal.text].filter(Boolean).join(" ");
  if (/背答案|标准答案|表达.*僵|硬背/.test(text)) return "硬背答案";
  if (/模板|同质化|AI味|像模板/.test(text)) return "套模板";
  if (/收藏|清单|工具/.test(text)) return "只收藏清单";
  if (/跟风|热点/.test(text)) return "乱跟风";
  if (/报名|申请|择校/.test(text)) return "盲目报名";
  return "照抄方法";
}
function rankTitleChoicesForTarget(items = [], signal = {}, target = state.publishTarget) {
  const seen = new Set();
  return (items || [])
    .filter(Boolean)
    .map((item) => {
      const title = trimTitleForTarget(item.title, target);
      return { ...item, title, score: scoreTitleChoiceForTarget(title, signal, target) };
    })
    .filter((item) => {
      const key = normalizeTitleText(item.title).replace(/[\uFF0C\u3002\uFF01\uFF1F\uFF1B\uFF1A,.!?;:\s]/g, "");
      if (!key || seen.has(key) || item.score <= 0) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.score - a.score)
    .map(({ score, ...item }) => item);
}

function scoreTitleChoiceForTarget(title = "", signal = {}, target = state.publishTarget) {
  const clean = trimTitleForTarget(title, target);
  const length = titleCharLength(clean);
  if (!isCompleteTitleForTarget(clean, target)) return 0;
  let score = 50;
  const signalWords = [signal.subject, signal.shortSubject, signal.problem, signal.action, signal.result]
    .filter(Boolean)
    .flatMap((item) => String(item).split(/\s+/))
    .filter((word) => word.length >= 2);
  if (signalWords.some((word) => clean.includes(word.slice(0, 4)))) score += 18;
  if (/[0-9\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341]/.test(clean)) score += 6;
  if (/\u6e05\u5355|\u907f\u5751|\u5224\u65ad|\u4fe1\u53f7|\u5173\u952e|\u5de5\u4f5c\u6d41|\u95ee\u9898|\u7ed3\u679c|\u522b\u53ea|\u4e3a\u4ec0\u4e48|\u771f\u6b63/.test(clean)) score += 12;
  if (target === "xhs") {
    if (length >= 14 && length <= 20) score += 18;
    if (length < 10 || length > 20) return 0;
    if (signal.topicType === "ai-tool-list") {
      if (/\u6a21\u677f|\u4f4e\u8d28|\u5199\u5e9f|5\u4e2a|\u522b\u4e71\u88c5|\u8ddf\u98ce/.test(clean)) score += 35;
      if (/\u771f\u80fd\u7701\u4e8b|\u597d\u7528\u4f46|\u5fc5\u88c5/.test(clean)) score += 18;
      if (/\u522b\u5148\u8ff7\u4fe1|\u60f3\u8981\u62ff\u5230\u771f\u5b9e\u53cd\u9988|\u771f\u76f8\u4e0d\u662f\u6e05\u5355/.test(clean)) score -= 24;
    }
  }
  if (target === "wechat-article" && length >= 18 && length <= 48) score += 16;
  if (/\u5f53\u524d|\u6807\u9898|\u751f\u6210|\u5e73\u53f0|\u6210\u54c1|\u7d20\u6750\u5e93|\u70b9\u51fb|\u6b65\u9aa4|\u7b2c\d\u6b65/.test(clean)) score -= 80;
  if (/(\u8fd9\u70b9|\u8fd9\u4e2a|\u56e0\u4e3a|\u5982\u679c|\u800c\u662f|\u4e0d\u662f|\uff0c|\uff1a)$/.test(clean)) score -= 60;
  return score;
}

function isCompleteTitleForTarget(title = "", target = state.publishTarget) {
  const clean = normalizeTitleText(title);
  const length = titleCharLength(clean);
  if (!clean || /\uFFFD/.test(clean)) return false;
  if (/[\uFF0C\u3001\uFF1A\uFF1B,;:]$/.test(clean)) return false;
  if (target === "xhs") return length >= 8 && length <= 20;
  if (target === "moments") return length >= 8 && length <= 36;
  if (target === "douyin" || target === "video-account") return length >= 8 && length <= 34;
  return length >= 12 && length <= 70;
}

function extractTopicBoundSignal(topic = {}) {
  const topicText = normalizeTitleText([
    topic.theme, topic.title, topic.pain, topic.reason, topic.reuse,
    topic.content, topic.body, topic.summary,
    topic.raw?.title, topic.raw?.description, topic.raw?.content, topic.raw?.text,
    topic.raw?.note, topic.raw?.analysis, topic.raw?.pain,
  ].filter(Boolean).join(" "));
  const contextText = normalizeTitleText([state.keywords, state.businessLine].filter(Boolean).join(" "));
  const hasStrongTopicText = topicText.replace(/\s/g, "").length >= 8;
  const text = hasStrongTopicText ? topicText : normalizeTitleText([topicText, contextText].filter(Boolean).join(" "));
  const sentences = text.split(/[，。！？；：,.!?;:\n]/).map((item) => item.trim()).filter((item) => item.length >= 2);
  const sourceTitle = normalizeTitleText(topic.title || topic.theme || sentences[0] || state.businessLine || "当前选题");
  const hasAiToolSignal = /AI|Claude|Codex|DeepSeek|Cursor|Lovable|Replit|Base44|Skill|skills|工具/i.test(topicText);
  const hasCreatorSignal = /内容|创作|自媒体|博主|账号|写作|模板|低质|同质/i.test(topicText);
  const isAiToolList = hasAiToolSignal && hasCreatorSignal;
  const subject = pickTitleSignal(text, [
    [/必装.*(Skill|skills|工具)|速码|Skill|skills|Claude|Codex|DeepSeek|Cursor|Lovable|Replit|Base44|工具/i, isAiToolList ? "AI 内容工具" : "AI 工具"],
    [/模板|同质化|低质|内容创作|自媒体/i, isAiToolList ? "AI 写作工具" : "内容创作"],
    [/AI\s*Native/i, "AI Native 项目"],
    [/MVP|最小可行产品/i, "AI 工具做 MVP"],
    [/Agent|智能体|工作流/i, "Agent 工作流"],
    [/小红书|图文笔记/i, "小红书图文"],
    [/公众号|长文/i, "公众号长文"],
    [/私校|择校|升学|面试/i, "私校教育"],
    [/律师|法律|案件/i, "律师内容账号"],
  ], shortTitlePhrase(sourceTitle, 16) || "当前选题");
  const audience = pickTitleSignal(text, [
    [/自媒体人|自媒体|博主|内容创作者|账号|小红书/i, "内容创作者"],
    [/不会写代码|零代码|不懂代码|普通人/i, "普通人"],
    [/老板|创业者|团队|公司/i, "创业者"],
    [/家长|妈妈|孩子|学生/i, "家长"],
    [/律师|医生|老师|顾问/i, "专业服务者"],
  ], "普通人");
  const problem = pickTitleSignal(text, [
    [/硬背标准答案|背标准答案|硬背|表达很僵|表达逻辑/i, "孩子面试表达很僵"],
    [/内容越来越像模板|像模板|模板化|同质化/i, "内容越来越像模板"],
    [/判低质|低质|没流量|流量/i, "担心被判低质"],
    [/只看清单|只收藏|收藏.*工具|工具清单/i, "只收藏工具清单"],
    [/不会写代码|不懂代码/i, "不会写代码"],
    [/提前下班|提效|省.*小时|效率/i, "把效率真正提起来"],
    [/没结果|不出结果|卡住/i, "做了却没结果"],
    [/不知道.*发什么|选题/i, "不知道写什么"],
  ], shortTitlePhrase(topic.pain || sentences[1] || "没有抓住关键问题", 18));
  const action = pickTitleSignal(text, [
    [/硬背标准答案|背标准答案|表达很僵|表达逻辑/i, "先练表达逻辑"],
    [/模板|同质化|低质|没流量/i, "先把工具放进内容系统"],
    [/必装|清单|Skill|skills|工具/i, "先选对工具和用法"],
    [/工作流|流程|系统/i, "放进工作流"],
    [/MVP|产品|项目/i, "做出一个 MVP"],
    [/拆解|复盘|二创/i, "拆成可复用结构"],
    [/采集|入库|素材库|知识库/i, "沉淀进素材库"],
  ], "先判断要解决的问题");
  const result = pickTitleResult(text);
  return {
    text, sourceTitle,
    subject: shortTitlePhrase(subject, 18),
    shortSubject: shortTitlePhrase(subject, 10),
    audience,
    problem: shortTitlePhrase(problem, 18),
    action: shortTitlePhrase(action, 18),
    result: shortTitlePhrase(result, 12),
    topicType: isAiToolList ? "ai-tool-list" : "general",
  };
}
function pickTitleSignal(text = "", rules = [], fallback = "") {
  for (const [pattern, value] of rules) {
    if (pattern.test(text)) return value;
  }
  return fallback;
}

function pickTitleResult(text = "") {
  const hour = text.match(/(\u63d0\u524d\u4e0b\u73ed|\u7701\u4e0b|\u8282\u7701).{0,6}(\d+)\s*(\u5c0f\u65f6|h)/i);
  if (hour) return `${hour[2]}\u5c0f\u65f6`;
  const metric = text.match(/(\d+(?:\.\d+)?\s*[\u4e07\u5343\u767ekK]?\+?)\s*(\u70b9\u8d5e|\u6536\u85cf|\u8bc4\u8bba|\u8f6c\u53d1|\u9605\u8bfb|\u64ad\u653e)/);
  if (metric) return "\u62ff\u5230\u771f\u5b9e\u53cd\u9988";
  if (/MVP|\u6700\u5c0f\u53ef\u884c\u4ea7\u54c1/i.test(text)) return "\u505a\u51fa MVP";
  return "\u62ff\u5230\u7ed3\u679c";
}

function pickCompactTitleSubject(text = "", fallback = "") {
  const clean = readableCn([text, fallback].filter(Boolean).join(" "));
  const patterns = [
    [/低龄.{0,4}英文写作比赛|英文写作比赛|写作比赛/, "低龄英文写作比赛"],
    [/私校面试|面试/, "私校面试"],
    [/私校申请|申请季|择校/, "私校申请"],
    [/夏校|夏令营/, "夏校申请"],
    [/标化|SSAT|托福|雅思|AP/, "标化备考"],
    [/AI\s*Native|AI原生/, "AI Native项目"],
    [/Agent|工作流/, "Agent工作流"],
    [/内容资产库|素材库|知识库/, "内容资产库"],
    [/小红书|图文/, "小红书图文"],
    [/公众号|长文/, "公众号长文"],
  ];
  for (const [pattern, subject] of patterns) {
    if (pattern.test(clean)) return subject;
  }
  return shortTitlePhrase(fallback || firstReadableSentence(clean), 10);
}

function shortTitlePhrase(value = "", max = 8) {
  const clean = readableCn(value)
    .replace(/^(关于|如果|为什么|怎么|如何)/, "")
    .replace(/[，、。！？；：,.!?;:].*$/, "")
    .trim();
  const chars = Array.from(clean);
  return chars.length > max ? chars.slice(0, max).join("") : clean;
}

function readableCn(value = "") {
  return String(value || "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/#([^#\s]+)\[话题\]#/g, "$1")
    .replace(/[#@]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstReadableSentence(text = "") {
  return readableCn(text).split(/[，、。！？；：,.!?\n]/).map((item) => item.trim()).find((item) => item.length >= 4) || "";
}

function pickSubjectPhrase(value = "") {
  const text = readableCn(value);
  const phrase = firstReadableSentence(text) || text;
  return clampTitlePart(phrase, 18) || "这个选题";
}
function pickAudiencePhrase(text = "") {
  if (/家长|妈妈|爸爸|父母|孩子|娃/.test(text)) return "家长";
  if (/学生|孩子|小孩|初中|高中|申请者/.test(text)) return "学生";
  if (/老师|机构|顾问|招生官/.test(text)) return "教育从业者";
  if (/律师|当事人|客户/.test(text)) return "客户";
  if (/老板|团队|公司|创业者/.test(text)) return "创业者";
  return "普通人";
}

function pickProblemPhrase(text = "", pain = "", subject = "") {
  const source = readableCn(pain) || firstReadableSentence(text);
  if (/面试/.test(text)) return "不知道招生官真正想听什么";
  if (/SSAT|托福|雅思|AP|标化|考试/.test(text)) return "备考卡在关键瓶颈";
  if (/申请|录取|择校|私校/.test(text)) return "申请准备没有抓住重点";
  if (/退费|避雷|踩坑|投诉/.test(text)) return "选机构怕踩坑";
  return clampTitlePart(source || `${subject}没有效果`, 18);
}

function pickActionPhrase(text = "", subject = "") {
  if (/面试/.test(text)) return "先准备高分回答框架";
  if (/SSAT|托福|雅思|AP|标化|考试/.test(text)) return "先拆清提分瓶颈";
  if (/申请|录取|择校|私校/.test(text)) return "先理清申请路径";
  if (/写作|英文写作|作文/.test(text)) return "先搭好写作结构";
  if (/避雷|退费|踩坑/.test(text)) return "先看清风险信号";
  return `先把${clampTitlePart(subject, 10)}拆成步骤`;
}

function pickResultPhrase(text = "") {
  const metric = text.match(/(\d+(?:\.\d+)?\s*[万千百Kk]?\+?)\s*(点赞|收藏|评论|阅读|播放|录取|提分|分)/);
  if (metric) return `${metric[1]}${metric[2]}`;
  if (/高分|提分|满分/.test(text)) return "更容易拿高分";
  if (/录取|offer|上岸/.test(text)) return "提升录取把握";
  if (/避雷|退费|踩坑/.test(text)) return "少花冤枉钱";
  return "更稳地推进";
}

function clampTitlePart(value = "", max = 18) {
  const clean = readableCn(value).replace(/[，、。！？；：,.!?].*$/, "").trim();
  return clean.length > max ? clean.slice(0, max) : clean;
}
function topicBoundTemplatesForTarget(target) {
  if (target === "xhs") {
    return [
      { reason: "小红书痛点型", render: (s) => `${s.shortSubject}别急着报名` },
      { reason: "小红书避坑型", render: (s) => `${s.shortSubject}先看这3点` },
      { reason: "小红书收藏型", render: (s) => `${s.shortSubject}准备清单` },
      { reason: "小红书判断型", render: (s) => `${s.shortSubject}值不值得做` },
      { reason: "小红书方法型", render: (s) => `${s.shortSubject}这样准备更稳` },
    ];
  }
  if (target === "wechat-article") {
    return [
      { reason: "公众号深度型", render: (s) => `为什么${s.subject}真正难的不是信息，而是${s.problem}` },
      { reason: "公众号方法型", render: (s) => `从${s.problem}到${s.result}：${s.subject}的完整路径` },
      { reason: "公众号复盘型", render: (s) => `拆完${s.subject}后，我发现关键在${s.action}` },
      { reason: "公众号系统型", render: (s) => `${s.subject}不能只靠经验，要靠一套判断标准` },
    ];
  }
  if (target === "moments") {
    return [
      { reason: "朋友圈观察型", render: (s) => `最近重新理解了${s.subject}` },
      { reason: "朋友圈提醒型", render: (s) => `${s.subject}这件事，别只看表面` },
      { reason: "朋友圈经验型", render: (s) => `${s.problem}，很多人一开始都会忽略` },
      { reason: "朋友圈行动型", render: (s) => `如果你也在看${s.subject}，先做这一步` },
    ];
  }
  if (target === "douyin" || target === "video-account") {
    return [
      { reason: "短视频钩子型", render: (s) => `别再乱准备${s.subject}了，先看这一点` },
      { reason: "短视频痛点型", render: (s) => `${s.problem}，通常卡在这一步` },
      { reason: "短视频清单型", render: (s) => `${s.audience}看${s.subject}，先抓3个信号` },
      { reason: "短视频结果型", render: (s) => `${s.subject}想要${s.result}，关键不是死记硬背` },
    ];
  }
  return [
    { reason: "通用痛点型", render: (s) => `${s.audience}做${s.subject}，别先死磕工具` },
    { reason: "通用方法型", render: (s) => `${s.subject}想出效果，先把这步做好` },
    { reason: "通用收藏型", render: (s) => `${s.pain}？这套${s.subject}流程建议收藏` },
  ];
}

function buildTopicBoundAssetTitle(signal, assets = []) {
  const matched = (assets || []).find((item) => item?.title && readableCn(item.title).length >= 6);
  if (!matched) return null;
  const example = readableCn(matched.title);
  if (state.publishTarget === "xhs") {
    if (/\d/.test(example)) return titleChoiceForTarget(`${signal.shortSubject}先看3个信号`, `标题库参考：${example}`, "xhs");
    if (/[，、：]/.test(example)) return titleChoiceForTarget(`${signal.shortSubject}怎么判断才稳`, `标题库参考：${example}`, "xhs");
    return titleChoiceForTarget(`${signal.shortSubject}别踩这个坑`, `标题库参考：${example}`, "xhs");
  }
  if (/\d/.test(example)) return titleChoice(`${signal.audience}看${signal.subject}，先记住这3个判断`, `标题库参考：${example}`);
  if (/[，、：]/.test(example)) return titleChoice(`${signal.subject}为什么总卡在${signal.problem}？`, `标题库参考：${example}`);
  return titleChoice(`${signal.subject}想出结果，别忽略${signal.action}`, `标题库参考：${example}`);
}

function dedupeTopicBoundTitleChoices(items = []) {
  const bannedTerms = ["AI自媒体", "内容资产库", "内容创作", "大城市流量", "素材库", "标题库", "工具", "拆分", "平台成品"];
  const seen = new Set();
  const result = [];
  for (const item of items) {
    if (!item) continue;
    const title = clampTitle(readableCn(item.title));
    const key = title.replace(/[，。！？\s]/g, "");
    if (!title || !isCompleteShortTitle(title) || seen.has(key) || bannedTerms.some((term) => title.includes(term))) continue;
    seen.add(key);
    result.push({ title, reason: readableCn(item.reason || "绑定当前选题生成") });
  }
  return result;
}

function extractCleanTitleSignal(topic = {}) {
  const rawTitle = cleanReadableText(topic.title || topic.theme || "");
  const rawBody = cleanReadableText(topic.body || topic.content || topic.summary || topic.reason || "");
  const text = cleanReadableText([rawTitle, rawBody, state.keywords, state.businessLine].filter(Boolean).join(" "));
  const sourceTitle = rawTitle || firstMeaningfulPhrase(text) || state.businessLine || "这个选题";
  return {
    text,
    sourceTitle,
    subject: shortenTitlePart(extractSubject(text, sourceTitle)),
    audience: shortenTitlePart(extractAudience(text)),
    action: shortenTitlePart(extractAction(text)),
    pain: shortenTitlePart(extractPain(text, sourceTitle)),
    result: shortenTitlePart(extractResult(text)),
    platform: currentTarget().title || "小红书图文",
  };
}

function cleanReadableText(value = "") {
  return String(value || "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/#([^#\s]+)\[话题\]#/g, "$1")
    .replace(/[#@]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstMeaningfulPhrase(text = "") {
  return text.split(/[，。！？；：,.!?\n]/).map((item) => item.trim()).find((item) => item.length >= 4) || "";
}

function extractSubject(text = "", fallback = "") {
  const patterns = [
    /(AI做Plog|AI\s*Plog|Plog)/i,
    /(AI做图|AI出图|AI作图|AI生成图片|AI绘图)/i,
    /(AI自媒体|自媒体|内容创作|内容生产线)/i,
    /(Agent工作流|Agent|工作流)/i,
    /(小红书|公众号|视频号|朋友圈)/i,
    /(爆款标题|标题|选题|素材库|内容资产库|知识库)/i,
    /(Claude|DeepSeek|豆包|即梦|WorkBuddy|Skill|Skills)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }
  return fallback;
}
function extractAudience(text = "") {
  if (/女生|姐妹|宝妈|女性/.test(text)) return "想做自媒体的女生";
  if (/新手|小白|0基础|零基础/.test(text)) return "新手";
  if (/博主|账号|自媒体/.test(text)) return "内容创作者";
  if (/老板|团队|公司|企业/.test(text)) return "小团队";
  return "普通人";
}

function extractAction(text = "") {
  if (/素材|资产|知识库|收藏/.test(text)) return "先建可复用素材库";
  if (/Agent|工作流|自动化/.test(text)) return "先拆清任务流程";
  if (/标题|选题|爆款/.test(text)) return "先拆用户问题";
  if (/AI味|不像人|同质化/.test(text)) return "先补真实经验";
  return "先做一次判断";
}

function extractPain(text = "", fallback = "") {
  if (/没方向|不知道.*发|没选题|缺.*素材/.test(text)) return "每天不知道发什么";
  if (/AI味|像AI|同质化|模板/.test(text)) return "写出来太像模板";
  if (/没流量|没人看|不涨粉|没结果/.test(text)) return "发了也没结果";
  if (/卡住|跑偏|不稳定/.test(text)) return "流程总是卡住";
  return shortenTitlePart(fallback || "问题没被拆清楚");
}

function extractResult(text = "") {
  if (/出图|作图|图片|插画/.test(text)) return "配图能直接用";
  if (/发布|发文|日更/.test(text)) return "稳定发出去";
  if (/资产|复用|一鱼多吃/.test(text)) return "后续能复用";
  if (/涨粉|流量|阅读/.test(text)) return "更容易拿反馈";
  return "跑出结果";
}
function shortenTitlePart(value = "") {
  const clean = cleanReadableText(value).replace(/[，。！？；:：,.!?].*$/, "").trim();
  return clean.length > 18 ? clean.slice(0, 18) : clean || "这个方法";
}

function titleTemplatesForTarget(target) {
  if (target === "moments") {
    return [
      { reason: "朋友圈观察型", render: (s) => `我最近重新理解了${s.subject}` },
      { reason: "朋友圈反差型", render: (s) => `以前以为难在${s.subject}，后来发现是${s.action}` },
      { reason: "朋友圈经验型", render: (s) => `${s.pain}这事，真的不能只靠感觉` },
      { reason: "朋友圈提醒型", render: (s) => `如果你也在做${s.subject}，先别急着照抄` },
    ];
  }
  if (target === "wechat-article") {
    return [
      { reason: "公众号深度型", render: (s) => `${s.subject}真正难的不是工具，而是${s.action}` },
      { reason: "公众号问题型", render: (s) => `为什么很多人做${s.subject}，最后都卡在${s.pain}` },
      { reason: "公众号方法型", render: (s) => `从${s.pain}到${s.result}：一套可复用的${s.subject}方法` },
      { reason: "公众号系统型", render: (s) => `${s.subject}不能只靠灵感，要靠一套内容系统` },
    ];
  }
  if (target === "douyin" || target === "video-account") {
    return [
      { reason: "短视频钩子型", render: (s) => `别再乱做${s.subject}了，先看这一步` },
      { reason: "短视频反差型", render: (s) => `${s.subject}没效果，问题通常不是工具` },
      { reason: "短视频清单型", render: (s) => `${s.audience}做${s.subject}，先抓这3个信号` },
      { reason: "短视频避坑型", render: (s) => `${s.pain}，多半是少了这套流程` },
    ];
  }
  return [
    { reason: "小红书痛点型", render: (s) => `${s.audience}做${s.subject}，别先死磕工具` },
    { reason: "小红书方法型", render: (s) => `${s.subject}想出效果，先把这步做好` },
    { reason: "小红书收藏型", render: (s) => `${s.pain}？这套${s.subject}流程建议收藏` },
    { reason: "小红书反差型", render: (s) => `${s.subject}的重点不是技巧，是${s.action}` },
  ];
}

function buildCleanAssetTitleChoice(signal, assets = []) {
  const matched = (assets || []).find((item) => item?.title && cleanReadableText(item.title).length >= 6);
  if (!matched) return null;
  const example = cleanReadableText(matched.title);
  const style = /[，、：？?]/.test(example) ? "问题式" : /\d/.test(example) ? "数字清单式" : "爆款参考式";
  const rendered = style === "数字清单式"
    ? `${signal.audience}做${signal.subject}，先记住这3个动作`
    : style === "问题式"
      ? `为什么你做${signal.subject}总是卡在${signal.pain}`
      : `${signal.subject}想做出效果，别忽略${signal.action}`;
  return titleChoice(rendered, `标题库参考：${style}，已按当前选题重写`);
}

function dedupeCleanTitleChoices(items = []) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const title = clampTitle(cleanReadableText(item.title));
    const key = title.replace(/[，、。！？\s]/g, "");
    if (!title || seen.has(key)) continue;
    if (/大城市流量|跑出结果|当前选题|绑定当前选题|公式/.test(title)) continue;
    seen.add(key);
    result.push({ title, reason: cleanReadableText(item.reason || "绑定当前选题生成") });
  }
  return result;
}

function safeThemeForTitle(topic = {}) {
  const sourceTheme = cleanSourceText(topic.theme || topic.title || state.businessLine);
  if (!sourceTheme || looksLikeGenericDiagnosis(sourceTheme)) return state.businessLine;
  return sourceTheme.length > 24 ? sourceTheme.slice(0, 24) : sourceTheme;
}


// LongkaTitleEngineV2: source-bound title engine.
// Overrides the older title helpers above while keeping the UI entry function.
const LONGKA_TITLE_FORMULAS_V2 = [
  { id: "loss", style: "避坑型", tags: ["pain", "loss"], render: (s) => `${s.shortSubject}别再${s.badAction}` },
  { id: "root", style: "真相型", tags: ["pain", "truth"], render: (s) => `${s.problem}问题出在哪` },
  { id: "list", style: "清单型", tags: ["list"], render: (s) => `${s.audience}先看${s.number}个${s.xhsSubject}` },
  { id: "result", style: "结果型", tags: ["result"], render: (s) => `${s.shortSubject}怎么拿到${s.result}` },
  { id: "contrast", style: "对比型", tags: ["contrast"], render: (s) => `${s.shortSubject}有用和没用的差别` },
  { id: "truth", style: "反常识型", tags: ["truth"], render: (s) => `${s.shortSubject}别只看表面` },
  { id: "action", style: "行动型", tags: ["action"], render: (s) => `${s.problem}先做这一步` },
  { id: "question", style: "痛点型", tags: ["question", "pain"], render: (s) => `${s.audience}为什么卡在${s.problem}` },
  { id: "compare", style: "判断型", tags: ["contrast"], render: (s) => `${s.shortSubject}到底该怎么判断` },
  { id: "lesson", style: "教训型", tags: ["loss", "list"], render: (s) => `${s.audience}太晚知道的${s.number}个教训` },
  { id: "stop", style: "纠偏型", tags: ["action", "loss"], render: (s) => `别再${s.badAction}，先${s.action}` },
  { id: "why", style: "解释型", tags: ["truth"], render: (s) => `为什么${s.shortSubject}总是没效果` },
];

// V2 公式系统已停用 — 标题全部由 LLM 生成

function extractLongkaTitleSignalV2(topic = {}) {
  const rawTitle = cleanLongkaTitleTextV2(topic.title || topic.theme || topic.raw?.title || "");
  const rawText = cleanLongkaTitleTextV2([
    topic.theme, topic.title, topic.pain, topic.reason, topic.reuse, topic.content, topic.body, topic.summary,
    topic.raw?.title, topic.raw?.description, topic.raw?.content, topic.raw?.text, topic.raw?.analysis, topic.raw?.pain,
  ].filter(Boolean).join(" "));
  const text = rawText || cleanLongkaTitleTextV2([state.keywords, state.businessLine].filter(Boolean).join(" "));
  const domain = inferLongkaTitleDomainV2(text);
  const subject = pickLongkaSubjectV2(text, rawTitle, domain);
  return {
    text,
    sourceTitle: rawTitle,
    domain,
    number: extractLongkaSourceNumberV2(rawTitle),
    subject: limitLongkaPhraseV2(subject, 18),
    shortSubject: limitLongkaPhraseV2(subject, 8),
    xhsSubject: compactLongkaXhsSubjectV2(subject),
    audience: limitLongkaPhraseV2(pickLongkaAudienceV2(text, domain), 8),
    problem: limitLongkaPhraseV2(pickLongkaProblemV2(text, domain), 10),
    action: limitLongkaPhraseV2(pickLongkaActionV2(text, domain), 10),
    result: limitLongkaPhraseV2(pickLongkaResultV2(text, domain), 8),
    badAction: limitLongkaPhraseV2(pickLongkaBadActionV2(text, domain), 8),
  };
}

function cleanLongkaTitleTextV2(value = "") {
  return String(value || "")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/#([^#\s]+)\[.*?\]#/g, "$1")
    .replace(/[#@]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferLongkaTitleDomainV2(text = "") {
  if (/私校|面试|择校|升学|孩子|家长|夏校|教育/.test(text)) return "education";
  if (/律师|法律|法条|案件|客户/.test(text)) return "lawyer";
  if (/AI|Cursor|Claude|Codex|DeepSeek|Lovable|Replit|Base44|skills?|工具|MVP|自媒体|内容创作|模板|低质/i.test(text)) return "ai-content";
  if (/公众号|小红书|短视频|朋友圈|图文|账号|爆款|选题/.test(text)) return "content";
  return "general";
}

function extractLongkaSourceNumberV2(text = "") {
  const matched = String(text || "").match(/(\d+)\s*(个|条|点|件|种|步|招)?/);
  if (!matched) return "3";
  return matched[1];
}

function pickLongkaSubjectV2(text = "", title = "", domain = "general") {
  const source = `${title} ${text}`;
  if (domain === "education") {
    if (/私校.*面试|面试.*私校/.test(source)) return "私校面试";
    if (/夏校/.test(source)) return "夏校申请";
    if (/择校|申请/.test(source)) return "私校申请";
    return "私校教育";
  }
  if (domain === "lawyer") return "律师短视频";
  if (/MVP|最小可行产品/i.test(source)) return "AI工具做MVP";
  if (/自媒体|内容创作|创作者|博主/.test(source) && /AI|工具|skills?/i.test(source)) return "AI内容工具";
  if (/Cursor|Lovable|Replit|Base44|工具/.test(source)) return "AI工具";
  if (/公众号/.test(source)) return "公众号内容";
  if (/小红书/.test(source)) return "小红书图文";
  return limitLongkaPhraseV2(title || firstLongkaSentenceV2(source) || "当前选题", 12);
}

function pickLongkaAudienceV2(text = "", domain = "general") {
  if (domain === "education") return "家长";
  if (domain === "lawyer") return "律师";
  if (/自媒体|内容创作|创作者|博主|账号/.test(text)) return "内容创作者";
  if (/不懂代码|普通人|新手|小白/.test(text)) return "普通人";
  if (/创业|老板|团队|公司/.test(text)) return "创业者";
  return "普通人";
}

function pickLongkaProblemV2(text = "", domain = "general") {
  if (domain === "education") return /背|标准答案|表达|僵/.test(text) ? "孩子表达太僵" : "面试准备跑偏";
  if (domain === "lawyer") return /法条|看不懂|太专业/.test(text) ? "用户听不懂" : "内容太专业";
  if (/模板|同质|像模板|AI 味|AI味/.test(text)) return "内容越来越像模板";
  if (/低质|没流量|流量/.test(text)) return "担心被判低质";
  if (/只收藏|清单|工具清单/.test(text)) return "只收藏工具清单";
  if (/不懂代码|不会代码/.test(text)) return "不懂代码";
  if (/效率|下班|提效/.test(text)) return "效率没真正提起来";
  if (/没结果|卡住|做不出来/.test(text)) return "做了却没结果";
  return "关键问题没拆清";
}

function pickLongkaActionV2(text = "", domain = "general") {
  if (domain === "education") return "练表达逻辑";
  if (domain === "lawyer") return "讲解决路径";
  if (/MVP|产品/.test(text)) return "先做MVP";
  if (/工作流|系统|流程/.test(text)) return "放进工作流";
  if (/清单|工具|skills?/i.test(text)) return "选对工具用法";
  if (/拆解|复盘|二创/.test(text)) return "拆成可复用结构";
  return "先判断再行动";
}

function pickLongkaResultV2(text = "", domain = "general") {
  if (domain === "education") return "真实表达";
  if (domain === "lawyer") return "客户信任";
  if (/MVP|产品/.test(text)) return "做出MVP";
  if (/下班|效率|提效/.test(text)) return "提高效率";
  if (/流量|低质|模板/.test(text)) return "内容不写废";
  return "拿到结果";
}

function pickLongkaBadActionV2(text = "", domain = "general") {
  if (domain === "education") return "硬背答案";
  if (domain === "lawyer") return "只讲法条";
  if (/模板|同质|AI 味|AI味/.test(text)) return "套模板";
  if (/只收藏|清单|工具清单/.test(text)) return "只收藏清单";
  if (/跟风|热门/.test(text)) return "乱跟风";
  if (/工具|skills?/i.test(text)) return "乱装工具";
  return "照抄方法";
}

function scoreLongkaTitleFormulaV2(formula, signal, target, index) {
  let score = 100 - index;
  const text = signal.text || "";
  if (formula.tags.includes("pain") && /别|不要|痛点|担心|低质|模板|背|僵|看不懂|没结果|问题/.test(text)) score += 28;
  if (formula.tags.includes("list") && /清单|\d+\s*(个|条|点|件|种|步|招)|工具|skills?|方法/i.test(signal.sourceTitle + text)) score += 22;
  if (formula.tags.includes("loss") && /别|不要|坑|风险|低质|浪费|硬背|只讲|只收藏/.test(text)) score += 20;
  if (formula.tags.includes("result") && /结果|效率|MVP|信任|流量|表达|客户/.test(text)) score += 16;
  if (formula.tags.includes("contrast") && /不是|而是|只|别|对比|真正/.test(text)) score += 14;
  if (target === "xhs" && ["loss", "root", "list", "stop", "action"].includes(formula.id)) score += 10;
  if (target === "wechat-article" && ["root", "truth", "contrast", "question"].includes(formula.id)) score += 18;
  return score;
}

function renderLongkaTitleForTargetV2(formula, signal, target = state.publishTarget) {
  if (target !== "wechat-article") return formula.render(signal);
  const longTitles = {
    loss: `${signal.audience}别再${signal.badAction}：${signal.subject}真正要先解决的是${signal.problem}`,
    root: `${signal.problem}问题出在哪？${signal.audience}做${signal.subject}前要先看懂这个判断`,
    list: `${signal.audience}做${signal.subject}，先想清楚这${signal.number}个关键问题`,
    result: `从${signal.problem}到${signal.result}：${signal.subject}真正有效的做法`,
    contrast: `${signal.subject}有用和没用的差别，往往藏在${signal.action}这一步`,
    truth: `${signal.subject}别只看表面，真正关键的是${signal.action}`,
    action: `${signal.problem}时，${signal.audience}应该先做${signal.action}`,
    question: `${signal.audience}为什么总是卡在${signal.problem}？答案不只在${signal.subject}`,
    compare: `${signal.subject}到底该怎么判断？先看${signal.problem}背后的真实需求`,
    lesson: `${signal.audience}太晚知道的${signal.number}个教训：别让${signal.problem}拖垮结果`,
    stop: `别再${signal.badAction}，${signal.audience}做${signal.subject}要先${signal.action}`,
    why: `为什么${signal.subject}总是没效果？因为你可能忽略了${signal.problem}`,
  };
  return longTitles[formula.id] || formula.render(signal);
}

function buildLongkaAssetFormulaTitlesV2(signal, titleAssets = [], target = "xhs") {
  const sample = (titleAssets || []).find((item) => cleanLongkaTitleTextV2(item?.title).length >= 6);
  if (!sample) return [];
  const title = cleanLongkaTitleTextV2(sample.title);
  if (target === "wechat-article") return [{ title: `${signal.audience}做${signal.subject}，不要只套标题公式，要先抓住${signal.problem}`, reason: `参考标题库结构：${title}` }];
  if (/\d/.test(title)) return [{ title: `${signal.audience}先看${signal.number}个${signal.shortSubject}`, reason: `参考标题库数字型：${title}` }];
  if (/别|不要|避坑|错|坑/.test(title)) return [{ title: `${signal.shortSubject}别再${signal.badAction}`, reason: `参考标题库避坑型：${title}` }];
  return [{ title: `${signal.shortSubject}先解决${signal.problem}`, reason: `参考标题库方法型：${title}` }];
}

function rankLongkaTitlesV2(items = [], signal = {}, target = "xhs") {
  const seen = new Set();
  return items
    .map((item) => ({ ...item, title: trimLongkaTitleForTargetV2(item.title, target) }))
    .map((item) => ({ ...item, score: scoreLongkaTitleChoiceV2(item.title, signal, target) }))
    .filter((item) => {
      const key = item.title.replace(/[，。！？；：,.!?;:\s]/g, "");
      if (!key || seen.has(key) || item.score <= 0) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.score - a.score)
    .map(({ score, ...item }) => item);
}

function scoreLongkaTitleChoiceV2(title = "", signal = {}, target = "xhs") {
  const clean = cleanLongkaTitleTextV2(title);
  const length = Array.from(clean).length;
  if (!clean || /�|閸|鐏|閿|缁|锟/.test(clean)) return 0;
  if (/[，、：；,;:]$/.test(clean)) return 0;
  if (target === "xhs" && (length < 8 || length > 20)) return 0;
  if (target === "wechat-article" && (length < 16 || length > 70)) return 0;
  if (signal.domain === "education" && /AI|工具|模板|低质|Agent|工作流/.test(clean)) return 0;
  if (signal.domain === "lawyer" && /AI|工具|模板|私校|面试/.test(clean)) return 0;
  if (signal.domain === "ai-content" && /私校|面试|孩子|家长|法条|律师/.test(clean)) return 0;
  let score = 50;
  const anchors = [signal.subject, signal.shortSubject, signal.problem, signal.action, signal.result, signal.badAction]
    .filter(Boolean)
    .map((item) => String(item).replace(/\s/g, ""));
  if (anchors.some((word) => clean.replace(/\s/g, "").includes(word.slice(0, Math.min(4, word.length))))) score += 28;
  if (/[0-9一二三四五六七八九十]/.test(clean)) score += 6;
  if (/别|问题|为什么|差别|判断|真正|先|清单|教训|结果/.test(clean)) score += 12;
  if (target === "xhs" && length >= 12 && length <= 20) score += 16;
  if (target === "wechat-article" && length > 20) score += 14;
  if (/当前|标题|生成|平台|点击|步骤|第\d步|素材库|brief/i.test(clean)) return 0;
  return score;
}

function trimLongkaTitleForTargetV2(title = "", target = "xhs") {
  const clean = cleanLongkaTitleTextV2(title);
  if (target === "wechat-article") return clean;
  const max = target === "xhs" ? 20 : target === "moments" ? 32 : 30;
  const chars = Array.from(clean);
  if (chars.length <= max) return clean;
  return chars.slice(0, max).join("").replace(/[，。！？；：,.!?;:]$/g, "").trim();
}

function limitLongkaPhraseV2(value = "", max = 8) {
  const clean = cleanLongkaTitleTextV2(value)
    .replace(/^(关于|如果|为什么|怎么|如何)/, "")
    .replace(/[，、。！？；：,.!?;:].*$/, "")
    .trim();
  const chars = Array.from(clean);
  return chars.length > max ? chars.slice(0, max).join("") : clean;
}

function compactLongkaXhsSubjectV2(value = "") {
  const clean = cleanLongkaTitleTextV2(value).replace(/\s+/g, "");
  if (/AI工具做MVP/i.test(clean)) return "AI工具MVP";
  if (/AI内容工具/i.test(clean)) return "AI内容工具";
  if (/AI工具/i.test(clean)) return "AI工具";
  if (/私校面试/.test(clean)) return "私校面试";
  if (/律师短视频/.test(clean)) return "律师短视频";
  return limitLongkaPhraseV2(clean, 7);
}

function firstLongkaSentenceV2(text = "") {
  return cleanLongkaTitleTextV2(text).split(/[，。！？；：,.!?;:\n]/).find((item) => item.trim().length >= 2) || "";
}

// LongkaTitleEngineV3: block title-asset pollution and growth-number mistakes.
const LONGKA_TITLE_FORMULAS_V3 = [
  { id: "growth-review", style: "复盘型", tags: ["growth", "result"], render: (s) => `${s.result}我做对了什么` },
  { id: "growth-method", style: "方法型", tags: ["growth", "action"], render: (s) => `${s.audience}怎么跑出${s.result}` },
  { id: "growth-truth", style: "真相型", tags: ["growth", "truth"], render: (s) => `${s.shortSubject}别只看涨粉` },
  { id: "growth-list", style: "清单型", tags: ["growth", "list"], render: (s) => `${s.timeWindow}复盘${s.number}个增长动作` },
  { id: "loss", style: "避坑型", tags: ["pain", "loss"], render: (s) => `${s.shortSubject}别再${s.badAction}` },
  { id: "root", style: "真相型", tags: ["pain", "truth"], render: (s) => `${s.problem}问题出在哪` },
  { id: "list", style: "清单型", tags: ["list"], render: (s) => `${s.audience}先看${s.number}个${s.xhsSubject}` },
  { id: "result", style: "结果型", tags: ["result"], render: (s) => `${s.shortSubject}怎么拿到${s.result}` },
  { id: "contrast", style: "对比型", tags: ["contrast"], render: (s) => `${s.shortSubject}有用和没用的差别` },
  { id: "stop", style: "纠偏型", tags: ["action", "loss"], render: (s) => `别再${s.badAction}，先${s.action}` },
  { id: "question", style: "痛点型", tags: ["question", "pain"], render: (s) => `${s.audience}为什么卡在${s.problem}` },
  { id: "why", style: "解释型", tags: ["truth"], render: (s) => `为什么${s.shortSubject}总是没效果` },
];

// V3 公式系统已停用 — 标题全部由 LLM 生成

function extractLongkaTitleSignalV3(topic = {}) {
  const rawTitle = cleanLongkaTitleTextV2(topic.title || topic.theme || topic.raw?.title || "");
  const text = cleanLongkaTitleTextV2([
    topic.theme, topic.title, topic.pain, topic.reason, topic.reuse, topic.content, topic.body, topic.summary,
    topic.raw?.title, topic.raw?.description, topic.raw?.content, topic.raw?.text, topic.raw?.analysis, topic.raw?.pain,
  ].filter(Boolean).join(" "));
  const domain = inferLongkaTitleDomainV3(text);
  const subject = pickLongkaSubjectV3(text, rawTitle, domain);
  return {
    text,
    sourceTitle: rawTitle,
    domain,
    number: extractLongkaTitleFormulaNumberV3(rawTitle, text, domain),
    timeWindow: extractLongkaTimeWindowV3(text),
    subject: limitLongkaPhraseV2(subject, 18),
    shortSubject: limitLongkaPhraseV2(subject, 8),
    xhsSubject: compactLongkaXhsSubjectV3(subject, domain),
    audience: limitLongkaPhraseV2(pickLongkaAudienceV3(text, domain), 8),
    problem: limitLongkaPhraseV2(pickLongkaProblemV3(text, domain), 10),
    action: limitLongkaPhraseV2(pickLongkaActionV3(text, domain), 10),
    result: limitLongkaPhraseV2(pickLongkaResultV3(text, domain), 8),
    badAction: limitLongkaPhraseV2(pickLongkaBadActionV3(text, domain), 8),
  };
}

function inferLongkaTitleDomainV3(text = "") {
  if (/从\s*\d+(?:\.\d+)?\s*到\s*\d+(?:\.\d+)?\s*[Kk万千]?|\d+(?:\.\d+)?\s*[Kk]\b|\d+(?:\.\d+)?\s*万\s*(曝光|浏览|播放|阅读)|\d+\s*个月|涨粉|粉丝|曝光|浏览|播放|发布/.test(text)) return "growth";
  if (/私校|面试|择校|升学|孩子|家长|夏校|教育/.test(text)) return "education";
  if (/律师|法律|法条|案件|客户/.test(text)) return "lawyer";
  if (/AI|Cursor|Claude|Codex|DeepSeek|Lovable|Replit|Base44|skills?|工具|MVP|自媒体|内容创作|模板|低质/i.test(text)) return "ai-content";
  return "general";
}

function pickLongkaSubjectV3(text = "", title = "", domain = "general") {
  if (domain === "growth") {
    if (/小红书|图文/.test(text)) return "小红书账号";
    if (/视频|短视频/.test(text)) return "账号增长";
    return "账号增长";
  }
  return pickLongkaSubjectV2(text, title, domain);
}

function pickLongkaAudienceV3(text = "", domain = "general") {
  if (domain === "growth") return /小红书|图文/.test(text) ? "小红书博主" : "内容创作者";
  return pickLongkaAudienceV2(text, domain);
}

function pickLongkaProblemV3(text = "", domain = "general") {
  if (domain === "growth") {
    if (/没有什么方法论|没方法|刚开始/.test(text)) return "起号没方法论";
    if (/发布|曝光|内容/.test(text)) return "内容多但没复盘";
    return "增长路径没拆清";
  }
  return pickLongkaProblemV2(text, domain);
}

function pickLongkaActionV3(text = "", domain = "general") {
  if (domain === "growth") return "复盘增长动作";
  return pickLongkaActionV2(text, domain);
}

function pickLongkaResultV3(text = "", domain = "general") {
  if (domain === "growth") {
    const k = text.match(/(\d+(?:\.\d+)?)\s*K/i);
    if (k) return `${k[1]}K粉丝`;
    const exposure = text.match(/(\d+(?:\.\d+)?)\s*万\s*(曝光|浏览|播放)/);
    if (exposure) return `${exposure[1]}万曝光`;
    return "跑出增长";
  }
  return pickLongkaResultV2(text, domain);
}

function pickLongkaBadActionV3(text = "", domain = "general") {
  if (domain === "growth") return "只看数据";
  return pickLongkaBadActionV2(text, domain);
}

function extractLongkaTitleFormulaNumberV3(title = "", text = "", domain = "general") {
  if (domain === "growth") {
    const month = text.match(/(\d+)\s*个月/);
    if (month) return month[1];
    return "3";
  }
  const source = title || text;
  const matched = String(source || "").match(/(\d+)\s*(个|条|点|件|种|步|招)/);
  if (!matched) return "3";
  const value = Number(matched[1]);
  if (!Number.isFinite(value) || value <= 0 || value > 20) return "3";
  return String(value);
}

function extractLongkaTimeWindowV3(text = "") {
  const month = text.match(/(\d+)\s*个月/);
  if (month) return `${month[1]}个月`;
  const day = text.match(/(\d+)\s*天/);
  if (day) return `${day[1]}天`;
  return "这次";
}

function compactLongkaXhsSubjectV3(subject = "", domain = "general") {
  if (domain === "growth") return "账号增长";
  return compactLongkaXhsSubjectV2(subject);
}

function scoreLongkaTitleFormulaV3(formula, signal, target, index) {
  let score = 100 - index;
  if (signal.domain === "growth") {
    if (formula.tags.includes("growth")) score += 120;
    if (["growth-review", "growth-method", "growth-list"].includes(formula.id)) score += 40;
    if (["loss", "root", "question", "contrast"].includes(formula.id)) score -= 40;
  } else if (formula.tags.includes("growth")) {
    score -= 220;
  }
  score += scoreLongkaTitleFormulaV2(formula, signal, target, index) / 10;
  return score;
}

function renderLongkaTitleForTargetV3(formula, signal, target = state.publishTarget) {
  if (target !== "wechat-article") return formula.render(signal);
  if (signal.domain === "growth") {
    const longTitles = {
      "growth-review": `从 0 到 ${signal.result}：这次账号增长真正做对了什么`,
      "growth-method": `${signal.timeWindow}跑出${signal.result}，不是靠运气，而是靠这几个内容动作`,
      "growth-truth": `${signal.shortSubject}别只看涨粉，真正值得拆的是背后的内容复盘`,
      "growth-list": `${signal.timeWindow}复盘：一个账号从 0 跑出结果的关键动作`,
    };
    return longTitles[formula.id] || `${signal.subject}复盘：从数据里拆出可复制的方法`;
  }
  return renderLongkaTitleForTargetV2(formula, signal, target);
}

function buildLongkaDomainTitleCandidatesV3(signal, target = "xhs") {
  if (signal.domain !== "growth") return [];
  if (target === "wechat-article") {
    return [
      { title: `从 0 到 ${signal.result}：这次账号增长真正做对了什么`, reason: "账号增长复盘型：绑定粉丝增长和时间窗口" },
      { title: `${signal.timeWindow}跑出${signal.result}，不是靠运气，而是靠内容复盘`, reason: "账号增长方法型：绑定持续发布和复盘" },
    ];
  }
  return [
    { title: `从0到${signal.result}复盘`, reason: "账号增长复盘型：绑定从0到结果" },
    { title: `${signal.timeWindow}涨到${signal.result}`, reason: "结果型：绑定时间窗口和粉丝增长" },
    { title: `${signal.result}我做对了什么`, reason: "真相型：绑定增长结果和复盘问题" },
    { title: `${signal.shortSubject}增长复盘`, reason: "复盘型：绑定账号增长主题" },
    { title: `${signal.problem}怎么办`, reason: "痛点型：绑定起号阶段问题" },
  ];
}

function rankLongkaTitlesV3(items = [], signal = {}, target = "xhs") {
  const forbidden = signal.domain === "growth" ? /公众号|关键问题|0个|素材库|标题库|工具|AI/ : /素材库|标题库/;
  return rankLongkaTitlesV2(items, signal, target)
    .filter((item) => !forbidden.test(item.title))
    .filter((item) => !/先先|涨粉/.test(item.title) || signal.domain === "growth")
    .filter((item) => target !== "xhs" || Array.from(item.title).length <= 20);
}


// ── LLM 标题生成（P1-1）──────────────────────────────────────────────
// 优先调用后端 LLM，降级到本地公式
async function generateLlmTitleChoices(topic, titleAssets = state.titleAssets) {
  if (!topic) return [];
  const signal = extractLongkaTitleSignalV3(topic);
  const payload = {
    topic: {
      theme: topic.theme || topic.title || "",
      title: topic.title || topic.theme || "",
      content: topic.content || topic.text || topic.body || "",
      pain: topic.pain || topic.theme || topic.title || "",
      comments: Array.isArray(topic.comments) ? topic.comments.slice(0, 8) : [],
      platform: state.publishTarget,
    },
    titleAssets: (titleAssets || []).slice(0, 20),
    publishTarget: state.publishTarget,
    keywords: state.keywords,
    signal,
  };
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(apiPath("/api/content/title-choices"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    if (Array.isArray(result.choices) && result.choices.length) {
      const mapped = result.choices.map((item) => ({
        title: trimTitleForTarget(String(item.title || ""), state.publishTarget),
        reason: item.reason || "LLM 生成",
      })).filter((item) => item.title.length >= 4);
      if (mapped.length) return mapped;
    }
  } catch (error) {
    if (error.name === "AbortError") {
      console.warn("LLM title generation timed out after 20s");
      throw new Error("timeout");
    }
    console.warn("LLM title generation failed, using local formulas:", error.message);
  } finally {
    clearTimeout(timeoutId);
  }
  // 降级：使用本地公式（仅 growth 领域有公式，其他领域可能为空）
  const fallback = buildLongkaDomainTitleCandidatesV3(signal, state.publishTarget).slice(0, 5);
  if (fallback.length) return fallback;
  // 空结果按失败处理，避免 UI 卡在"正在生成"假加载状态
  throw new Error("AI 未返回有效标题");
}

// LLM 标题生成 — 用 topic id 做 debounce，不受资产加载 flag 影响
function triggerLlmTitleGeneration() {
  const topic = selectedTopic();
  if (!topic) {
    // 静默 return 会导致 UI 永久显示"正在生成"，必须给出终态提示
    state.titleErrorMessage = "未找到当前选题，请返回上一步重新选择选题。";
    if (!state.titleChoices.length) {
      state.titleChoices = [{ title: "", reason: state.titleErrorMessage, isError: true }];
    }
    if (state.step === 6) renderToday();
    return;
  }
  // 当前选题+平台已有 LLM 标题时不再重复生成（否则每次渲染都会重新调 LLM，标题几秒一换）
  // 手动“刷新标题”会先清空 titleChoiceKey，因此不受影响
  if (state.titleChoiceKey === llmTitleChoiceKey(topic) && state.titleChoices.length) return;
  const callKey = (topic.id || topic.theme || topic.title || "") + "|" + (state.publishTarget || "xhs");
  if (state._llmTitleCallKey === callKey) return; // 同一选题+平台已在进行中
  state._llmTitleCallKey = callKey;
  generateLlmTitleChoices(topic, state.titleAssets).then((choices) => {
    // 只在 key 未变（用户没换选题）时才更新
    if (state._llmTitleCallKey !== callKey) return;
    if (choices.length) {
      state.titleChoices = choices;
      state.titleChoiceKey = llmTitleChoiceKey(topic);
      if (!choices.some((item) => item.title === state.selectedTitle)) {
        state.selectedTitle = "";
      }
    }
  }).catch((err) => {
    if (state._llmTitleCallKey !== callKey) return;
    const isTimeout = err.message === "timeout";
    const msg = isTimeout
      ? "标题生成超时（>20秒）。点击“刷新标题”重试，或直接手动输入标题。"
      : `标题生成失败：${err.message}。点击“刷新标题”重试。`;
    console.warn("[title-engine] LLM 标题生成失败:", err.message);
    state.titleErrorMessage = msg;
    if (!state.titleChoices.length) {
      state.titleChoices = [{ title: "", reason: msg, isError: true }];
    }
  }).finally(() => {
    if (state._llmTitleCallKey === callKey) {
      state._llmTitleCallKey = null;
      if (state.step === 6) renderToday();
    }
  });
}

function refreshTitleChoicesWithLlm() {
  triggerLlmTitleGeneration();
}
