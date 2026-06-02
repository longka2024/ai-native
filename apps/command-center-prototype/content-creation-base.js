// Longka content creation base.
// A small, testable content brain for topic diagnosis, title matching,
// writing-route selection, quality review, and rewrite direction.

const TITLE_TRIGGERS = [
  {
    id: "loss_avoidance",
    name: "损失规避",
    match: /别急|先别|没效果|走弯路|白花|踩坑|反复|判断错|乱买|乱做/,
    bestFor: "用户已经在行动，但行动顺序可能错了",
    opening: "先拦住一个错误动作。",
    route: "mistake_correction",
  },
  {
    id: "self_check",
    name: "自查清单",
    match: /自查|分清|哪一种|3|三|判断|标准|清单|对照/,
    bestFor: "用户想先自己判断，不想马上被推销",
    opening: "把内容做成可收藏的判断清单。",
    route: "checklist",
  },
  {
    id: "comment_qa",
    name: "评论答疑",
    match: /评论|问最多|到底|怎么办|能不能|该不该|分不清/,
    bestFor: "源头评论区有高频疑问，适合直接回应",
    opening: "像回复一个真实客户问题一样开场。",
    route: "comment_answer",
  },
  {
    id: "professional_boundary",
    name: "专业边界",
    match: /皮肤科|专业|成因|视角|原理|检测|评估|项目|皮秒|护理/,
    bestFor: "需要建立信任，但必须控制承诺边界",
    opening: "先讲判断维度，不急着给方案。",
    route: "professional_boundary",
  },
  {
    id: "experience_review",
    name: "经历复盘",
    match: /10年|才知道|后来|以前|终于|原来|复盘/,
    bestFor: "适合写常见经历，不适合虚构本人故事",
    opening: "用第三方常见经历复盘，不编作者亲身经历。",
    route: "experience_review",
  },
  {
    id: "cognitive_conflict",
    name: "认知冲突",
    match: /不是|其实|真正|天差地别|反而|误区/,
    bestFor: "用户已有错误认知，需要制造停顿感",
    opening: "先给一个反常识判断，再解释边界。",
    route: "cognitive_conflict",
  },
];

const WRITING_FRAMEWORKS = {
  PAS: {
    name: "PAS",
    fullName: "Pain -> Agitate -> Solution",
    bestFor: ["mistake_correction", "cognitive_conflict"],
    useWhen: "用户已经有痛感，且可能正在做错动作。",
    paragraphs: [
      "Pain：直接说出用户正在经历的问题",
      "Agitate：指出继续错下去会浪费什么",
      "Solution：给一个更低风险的新顺序",
      "Boundary：补充不能承诺的边界",
      "Action：引导先做判断或评估",
    ],
    risk: "容易写焦虑营销，必须克制。",
  },
  AIDA: {
    name: "AIDA",
    fullName: "Attention -> Interest -> Desire -> Action",
    bestFor: ["professional_boundary"],
    useWhen: "目标是从内容过渡到咨询或服务，但不能硬推销。",
    paragraphs: [
      "Attention：用一个反常识或高频问题抓注意",
      "Interest：解释为什么这个问题值得认真看",
      "Desire：让用户看到更稳的判断方式",
      "Action：给低压下一步",
    ],
    risk: "容易写成广告腔，必须先服务判断。",
  },
  BAB: {
    name: "BAB",
    fullName: "Before -> After -> Bridge",
    bestFor: ["experience_review"],
    useWhen: "标题是经历复盘、认知转变、终于明白类。",
    paragraphs: [
      "Before：很多人原来怎么做",
      "After：后来意识到真正关键点",
      "Bridge：中间要跨过哪几个判断步骤",
      "Action：下一次先怎么做",
    ],
    risk: "不能虚构第一人称经历，只能写客户常见经历。",
  },
  QUEST: {
    name: "QUEST",
    fullName: "Qualify -> Understand -> Educate -> Stimulate -> Transition",
    bestFor: ["comment_answer", "professional_boundary"],
    useWhen: "来自评论区问题、咨询问答、专业评估类内容。",
    paragraphs: [
      "Qualify：先说明谁适合看",
      "Understand：复述用户真实疑问",
      "Educate：给判断维度，不堆百科",
      "Stimulate：指出为什么现在该先判断",
      "Transition：转到评估、对照或咨询",
    ],
    risk: "容易讲太多知识，要保留一个主问题。",
  },
  SCQA: {
    name: "SCQA",
    fullName: "Situation -> Complication -> Question -> Answer",
    bestFor: ["professional_boundary", "cognitive_conflict"],
    useWhen: "需要讲清楚一个复杂问题，但要避免百科铺开。",
    paragraphs: [
      "Situation：用户现在普遍怎么做",
      "Complication：为什么这个做法会遇到问题",
      "Question：真正该问的问题是什么",
      "Answer：给判断路径和边界",
    ],
    risk: "容易写成长文说理，小红书要压缩。",
  },
  RASA: {
    name: "RASA",
    fullName: "Relevance -> Agitation -> Solution -> Action",
    bestFor: ["checklist", "mistake_correction"],
    useWhen: "需要让用户立刻觉得和自己有关，并收藏执行。",
    paragraphs: [
      "Relevance：点出用户此刻的具体场景",
      "Agitation：说明不判断清楚会乱在哪",
      "Solution：给自查清单或顺序",
      "Action：让用户收藏、对照、评估",
    ],
    risk: "不能只制造焦虑，必须给可执行标准。",
  },
};

const ROUTE_BLUEPRINTS = {
  mistake_correction: {
    structure: [
      "错误动作：用户正在跟风买、做、试什么",
      "为什么错：这个动作为什么会让问题更乱",
      "停手清单：现在先检查哪几个点",
      "替代顺序：先判断，再选择产品/项目/评估",
      "低压 CTA：先停下来对照，不承诺效果",
    ],
    cta: "先停下来对照这几个检查点；分不清，再做专业评估。",
    avoid: ["分类百科", "虚构亲身经历", "直接推项目"],
  },
  checklist: {
    structure: [
      "适用人群：谁需要保存这张清单",
      "自查问题 1：近期诱因或变化",
      "自查问题 2：出现速度和变化节奏",
      "自查问题 3：颜色、位置、边界",
      "风险边界：哪些情况不要自己下结论",
      "低压 CTA：收藏对照或做评估",
    ],
    cta: "先收藏，对照完再决定下一步。",
    avoid: ["线上确诊", "医学承诺", "百科堆砌"],
  },
  comment_answer: {
    structure: [
      "评论问题：把用户疑问转成一句人话",
      "共情：为什么这个疑问很常见",
      "判断路径：先看哪几个证据",
      "误判边界：最容易错在哪里",
      "低压 CTA：带着问题做下一步判断",
    ],
    cta: "把你的具体情况带过来，先判断属于哪类问题。",
    avoid: ["假装有评论", "泛泛科普", "直接推销"],
  },
  professional_boundary: {
    structure: [
      "边界声明：这不是线上诊断",
      "判断维度 1：诱因和近期状态",
      "判断维度 2：分布、颜色、变化节奏",
      "判断维度 3：屏障、敏感和处理史",
      "低压 CTA：先评估，再决定产品或项目",
    ],
    cta: "不确定时先做评估，不要直接照搬别人方案。",
    avoid: ["医生身份冒充", "免费检测虚构", "保证效果"],
  },
  experience_review: {
    structure: [
      "常见经历：很多人一开始怎么做",
      "转折：后来发现问题不是产品不够多",
      "关键：第一步真正要判断什么",
      "新顺序：现在更稳的安排",
      "低压 CTA：先把方向判断清楚",
    ],
    cta: "先把方向判断清楚，再决定花钱做什么。",
    avoid: ["我长斑10年", "虚构案例", "机构服务承诺"],
  },
  cognitive_conflict: {
    structure: [
      "反常识判断：真正影响结果的不是表面动作",
      "旧认知：多数人原来怎么理解",
      "新判断：应该先看哪一个关键条件",
      "操作路径：怎么把新判断用于决策",
      "低压 CTA：先换判断标准，再行动",
    ],
    cta: "先换判断标准，再决定下一步。",
    avoid: ["故作高深", "金句堆砌", "没有操作路径"],
  },
};

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function analyzeSource(source = {}) {
  const title = clean(source.title);
  const content = clean(source.content || source.summary || "");
  const comments = Array.isArray(source.comments) ? source.comments.map(clean).filter(Boolean) : [];
  const metrics = source.metrics || {};
  const evidence = [];
  if (Number(metrics.likes || 0) > 0) evidence.push(`赞 ${metrics.likes}`);
  if (Number(metrics.saves || metrics.collects || 0) > 0) evidence.push(`藏 ${metrics.saves || metrics.collects}`);
  if (Number(metrics.comments || 0) > 0) evidence.push(`评 ${metrics.comments}`);
  const inferredProblems = [];
  const haystack = `${title} ${content} ${comments.join(" ")}`;
  if (/分清|类型|判断|哪一种/.test(haystack)) inferredProblems.push("用户分不清自己属于哪种情况");
  if (/没效果|反复|走弯路|乱买|乱做/.test(haystack)) inferredProblems.push("用户担心花钱做错方向");
  if (/项目|皮秒|护理|修护|检测/.test(haystack)) inferredProblems.push("用户不知道什么时候该做专业评估");
  if (!inferredProblems.length) inferredProblems.push("用户有需求，但缺少可信判断标准");
  return {
    title,
    content,
    comments,
    metrics,
    evidence,
    inferredProblems,
    sourceValue: evidence.length ? evidence.join(" / ") : "有真实源头，但互动证据不足",
  };
}

function matchTitle(title = "") {
  const text = clean(title);
  return TITLE_TRIGGERS.find((trigger) => trigger.match.test(text)) || TITLE_TRIGGERS[0];
}

function buildWritingBrief({ source = {}, title = "", industry = "", keyword = "", goal = "" } = {}) {
  const sourceAnalysis = analyzeSource(source);
  const trigger = matchTitle(title);
  const route = ROUTE_BLUEPRINTS[trigger.route];
  const framework = pickFramework(trigger.route, title);
  const selectedQuestion = selectQuestionForRoute(trigger.route, sourceAnalysis);
  return {
    title: clean(title),
    industry: clean(industry),
    keyword: clean(keyword),
    goal: clean(goal),
    sourceTitle: sourceAnalysis.title,
    sourceValue: sourceAnalysis.sourceValue,
    trigger: {
      id: trigger.id,
      name: trigger.name,
      why: trigger.bestFor,
      opening: trigger.opening,
    },
    selectedQuestion,
    writingRoute: trigger.route,
    framework: {
      id: framework.name,
      name: framework.fullName,
      useWhen: framework.useWhen,
      paragraphs: framework.paragraphs,
      risk: framework.risk,
    },
    structure: route.structure,
    cta: route.cta,
    avoid: [
      ...route.avoid,
      "只换标题和开头",
      "复用上一版正文结构",
      "虚构作者经历",
      "虚构门店服务",
      "保证淡斑或根治",
    ],
    draftInstruction: [
      `本篇只回答一个主问题：${selectedQuestion}`,
      `本篇写作模型：${framework.name}（${framework.fullName}）`,
      `开头按「${trigger.opening}」写`,
      `段落功能按写作模型走：${framework.paragraphs.join(" / ")}`,
      `正文按 ${trigger.route} 路线写，不要改回分类百科`,
      `必须使用源头证据：${sourceAnalysis.sourceValue}`,
      `结尾 CTA：${route.cta}`,
    ],
  };
}

function pickFramework(route, title = "") {
  const text = clean(title);
  if (/10年|才知道|后来|以前|终于|复盘/.test(text)) return WRITING_FRAMEWORKS.BAB;
  if (/评论|问最多|到底|怎么办|分不清/.test(text)) return WRITING_FRAMEWORKS.QUEST;
  if (/皮肤科|专业|成因|视角|原理|评估|检测/.test(text)) return WRITING_FRAMEWORKS.SCQA;
  if (/自查|清单|3|三|判断|标准|对照/.test(text)) return WRITING_FRAMEWORKS.RASA;
  if (/没效果|别急|先别|走弯路|乱买|踩坑/.test(text)) return WRITING_FRAMEWORKS.PAS;
  return Object.values(WRITING_FRAMEWORKS).find((framework) => framework.bestFor.includes(route)) || WRITING_FRAMEWORKS.PAS;
}

function selectQuestionForRoute(route, sourceAnalysis) {
  const problems = sourceAnalysis.inferredProblems;
  if (route === "mistake_correction") return problems.find((item) => /花钱|方向|错/.test(item)) || "我现在是不是正在用错顺序？";
  if (route === "checklist") return problems.find((item) => /分不清|哪种|判断/.test(item)) || "我怎么先做自查判断？";
  if (route === "comment_answer") return sourceAnalysis.comments[0] || problems[0] || "评论区最关心的问题是什么？";
  if (route === "professional_boundary") return problems.find((item) => /评估|专业/.test(item)) || "什么时候需要专业评估？";
  if (route === "experience_review") return "为什么很多人拖了很久才发现第一步错了？";
  return problems[0] || "这个选题真正要解决什么问题？";
}

function diagnoseDraft(text = "", brief = {}) {
  const body = clean(text);
  const checks = [
    {
      id: "answers_question",
      label: "回答主问题",
      ok: body.includes(brief.selectedQuestion?.slice(0, 6) || "") || brief.structure?.some((item) => body.includes(item.slice(0, 4))),
    },
    {
      id: "not_encyclopedia",
      label: "不是分类百科复读",
      ok: !/雀斑[\s\S]{0,160}晒斑[\s\S]{0,160}黄褐斑[\s\S]{0,220}(褐青色痣|ADM|混合斑)/.test(body),
    },
    {
      id: "no_fake_story",
      label: "没有虚构经历/身份/服务",
      ok: !/我长斑|我.*10年|我们中心|免费.*检测|我帮你看看|作为皮肤科医生|作为皮肤管理师/.test(body),
    },
    {
      id: "has_action",
      label: "有低压行动入口",
      ok: /收藏|对照|评估|判断|先看|先停|下一步/.test(body),
    },
    {
      id: "not_ai_smooth",
      label: "不是过度光滑 AI 腔",
      ok: !/综上|总的来说|值得注意的是|本质上|核心在于|闭环|赋能/.test(body),
    },
  ];
  return {
    score: checks.reduce((sum, check) => sum + (check.ok ? 2 : 0), 0),
    ok: checks.every((check) => check.ok),
    checks,
    rewriteDirections: checks.filter((check) => !check.ok).map((check) => rewriteDirection(check.id, brief)),
  };
}

function diagnoseDbsContent(text = "", brief = {}) {
  const body = clean(text);
  const title = clean(brief.title);
  const dimensions = [
    {
      id: "text_cleanliness",
      name: "文字洁癖",
      ok: !/(综上|总的来说|值得注意的是|本质上|核心在于|赋能|闭环|深度解析|全方位)/.test(body)
        && !/姐妹们[\s\S]{0,80}真的/.test(body),
      issue: "文字有空话、套话或社媒模板腔。",
      fix: "删掉空泛连接词和模板称呼，只保留具体问题、判断和动作。",
    },
    {
      id: "title_cover",
      name: "封面/标题",
      ok: Boolean(title) && title.length >= 8 && title.length <= 32,
      issue: "标题不够具体，或过长过散。",
      fix: "标题保留一个悬念，不把答案说完；控制在小红书可读长度。",
    },
    {
      id: "expression_efficiency",
      name: "表达效率",
      ok: body.length >= 260 && body.length <= 1200 && !/首先[\s\S]{0,40}其次[\s\S]{0,40}最后/.test(body),
      issue: "表达效率低，像在铺一篇百科或作文。",
      fix: "每段只承担一个功能：痛点、判断、动作、边界，不做全量知识输出。",
    },
    {
      id: "cognitive_gap",
      name: "认知落差",
      ok: /(不是|先别|先看|真正|容易错|别急|很多人以为|但)/.test(body),
      issue: "没有认知落差，读者看完觉得只是常识。",
      fix: "补一个和用户原有做法相冲突的判断，但不要故作高深。",
    },
    {
      id: "ai_workflow",
      name: "AI 辅助工作流",
      ok: !/雀斑[\s\S]{0,160}晒斑[\s\S]{0,160}黄褐斑[\s\S]{0,220}(褐青色痣|ADM|混合斑)/.test(body)
        && !/我长斑|我.*10年|我们中心|免费.*检测|我帮你看看|作为皮肤科医生|作为皮肤管理师/.test(body),
      issue: "AI 没按源头和标题路线写，退回百科、虚构经历或虚构服务。",
      fix: "退回写作任务书，强制按当前标题路线重写，不允许继续润色这版。",
    },
  ];
  return {
    ok: dimensions.every((item) => item.ok),
    greenCount: dimensions.filter((item) => item.ok).length,
    dimensions,
    fixes: dimensions.filter((item) => !item.ok).map((item) => item.fix),
  };
}

function diagnoseAiFingerprints(text = "") {
  const body = clean(text);
  const fingerprints = [
    {
      id: "too_smooth",
      name: "太顺滑",
      hit: /(综上|总的来说|值得注意的是|由此可见|换句话说|与此同时)/.test(body),
      fix: "删连接词，保留更直接的短句。",
    },
    {
      id: "knowledge_dump",
      name: "知识全量输出",
      hit: /1[.、][\s\S]{0,120}2[.、][\s\S]{0,120}3[.、][\s\S]{0,120}4[.、]/.test(body),
      fix: "不要一次讲完所有类型，只围绕当前主问题选 2-3 个判断点。",
    },
    {
      id: "fake_story",
      name: "虚假故事",
      hit: /我长斑|我.*10年|我踩过|我后来才知道|有个朋友|一个客户/.test(body),
      fix: "没有真实输入就不写第一人称故事，改成“很多人常见情况”。",
    },
    {
      id: "fake_authority",
      name: "虚假权威/服务",
      hit: /我们中心|免费.*检测|发照片.*帮你|作为皮肤科医生|作为皮肤管理师/.test(body),
      fix: "删除未由客户输入确认的身份、门店服务和检测承诺。",
    },
    {
      id: "golden_sentence",
      name: "金句收尾过多",
      hit: /(皮肤会给你答案|方向就错了|慢慢来|少走弯路|不是.*而是.*){2,}/.test(body),
      fix: "结尾只留一个行动入口，不要硬收金句。",
    },
  ].filter((item) => item.hit);
  return {
    ok: fingerprints.length < 3,
    count: fingerprints.length,
    fingerprints,
    fixes: fingerprints.map((item) => item.fix),
  };
}

function runEditorialReview({ draft = "", brief = {}, round = 1 } = {}) {
  const gate = diagnoseDraft(draft, brief);
  const dbs = diagnoseDbsContent(draft, brief);
  const ai = diagnoseAiFingerprints(draft);
  const passed = gate.ok && dbs.ok && ai.ok;
  const maxRounds = 3;
  const shouldStop = passed || round >= maxRounds;
  const stopReason = passed
    ? "通过编辑部验收，可以进入人工确认。"
    : round >= maxRounds
      ? "最多 3 轮仍未通过，问题可能在选题、源头素材或客户问题不足，应该退回前面步骤。"
      : "未通过，按诊断方向改一轮。";
  return {
    passed,
    round,
    maxRounds,
    shouldStop,
    stopReason,
    gate,
    dbs,
    ai,
    rewriteBrief: passed ? [] : [
      ...gate.rewriteDirections,
      ...dbs.fixes,
      ...ai.fixes,
    ].filter(Boolean),
    nextAction: passed
      ? "confirm_copy"
      : round >= maxRounds
        ? "return_to_topic_or_source"
        : "rewrite_once",
  };
}

function rewriteDirection(id, brief = {}) {
  const map = {
    answers_question: `重写时只回答「${brief.selectedQuestion || "当前主问题"}」，删掉旁支。`,
    not_encyclopedia: "删掉斑点类型百科，改成当前标题对应的判断路径。",
    no_fake_story: "删除虚构第一人称经历、医生身份、免费检测、机构服务。",
    has_action: `结尾改成低压行动：${brief.cta || "先评估再行动"}。`,
    not_ai_smooth: "删掉空话连接词，保留一个真实问题和几个短句。",
  };
  return map[id] || "按当前写作任务书重写。";
}

globalThis.LongkaContentCreationBase = {
  analyzeSource,
  matchTitle,
  buildWritingBrief,
  diagnoseDraft,
  diagnoseDbsContent,
  diagnoseAiFingerprints,
  runEditorialReview,
  pickFramework,
  TITLE_TRIGGERS,
  ROUTE_BLUEPRINTS,
  WRITING_FRAMEWORKS,
};
