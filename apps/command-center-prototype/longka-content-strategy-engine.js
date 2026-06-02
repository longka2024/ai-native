// Longka content strategy engine.
// Turns a selected source post + selected title into a concrete writing route.
(function installLongkaContentStrategyEngine() {
  const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

  const ROUTES = {
    mistake: {
      id: "mistake",
      label: "避坑纠偏",
      match: /别急|先别|别只|避坑|走弯路|没效果|反复|判断错|乱买|乱做|白做|踩坑|瞎折腾/,
      mainQuestion: "为什么我越着急处理，反而越容易走弯路？",
      opening: "先拦住一个正在发生的错误动作，不直接开始科普。",
      bodyStructure: [
        "错误动作：用户正在跟风买、做、试什么",
        "失败原因：为什么这个动作容易让问题更乱",
        "停手清单：现在先检查哪 2-3 个点",
        "替代顺序：更稳的处理路径是什么",
        "行动入口：先做低风险评估，不承诺效果",
      ],
      cta: "先停下来对照这几个检查点；分不清，再做专业评估。",
      forbid: ["不要写成斑点类型百科", "不要逐条罗列五种斑", "不要虚构亲身经历"],
    },
    checklist: {
      id: "checklist",
      label: "自查清单",
      match: /自查|3|三|清单|判断|标准|分清|哪一种|类型|对照/,
      mainQuestion: "我怎么先判断自己大概属于哪种情况？",
      opening: "告诉用户这是一张可保存的自查表，而不是结论判定。",
      bodyStructure: [
        "适用人群：谁需要先收藏这张清单",
        "自查问题 1：近期诱因或变化",
        "自查问题 2：出现速度和变化节奏",
        "自查问题 3：颜色、位置、边界",
        "风险边界：哪些情况不要自己下结论",
        "行动入口：收藏对照或做评估",
      ],
      cta: "先收藏，对照完再决定下一步。",
      forbid: ["不要写成医生诊断", "不要承诺自查就能确诊", "不要每段都用同样句式"],
    },
    comment: {
      id: "comment",
      label: "评论答疑",
      match: /评论|问最多|到底|分不清|怎么办|能不能|该不该/,
      mainQuestion: "评论区真正想问的那个问题是什么？",
      opening: "用一个真实疑问开场，像在回答客户，不像百科词条。",
      bodyStructure: [
        "评论问题：把用户疑问转成一句人话",
        "共情：为什么这个疑问很常见",
        "判断路径：先看哪几个证据",
        "误判边界：最容易错在哪里",
        "行动入口：带着问题去做下一步判断",
      ],
      cta: "把你的具体情况带过来，先判断问题属于哪一类。",
      forbid: ["不要泛泛科普", "不要假装已经抓到大量评论", "不要直接推项目"],
    },
    professional: {
      id: "professional",
      label: "专业边界",
      match: /皮肤科|专业|成因|视角|原理|项目|配合|检测|评估|皮秒|护理/,
      mainQuestion: "专业判断到底在看哪些维度？",
      opening: "用克制的专业语气讲判断维度，不制造焦虑。",
      bodyStructure: [
        "先说边界：这不是线上诊断",
        "维度 1：近期诱因和皮肤状态",
        "维度 2：分布、颜色、变化节奏",
        "维度 3：屏障、敏感和既往处理",
        "下一步：先评估，再决定产品或项目",
      ],
      cta: "不确定时先做评估，不要直接照搬别人方案。",
      forbid: ["不要说免费检测，除非用户明确提供", "不要承诺疗效", "不要冒充医生身份"],
    },
    story: {
      id: "story",
      label: "经历复盘",
      match: /10年|才知道|后来|以前|经历|终于|原来/,
      mainQuestion: "很多人为什么拖了很久才发现第一步错了？",
      opening: "写成客户常见经历复盘，不能编造作者本人经历。",
      bodyStructure: [
        "常见经历：很多人一开始怎么做",
        "转折：后来发现问题不是产品不够多",
        "真正关键：第一步要先判断什么",
        "新顺序：现在应该怎么安排",
        "收束：慢一点，但方向要对",
      ],
      cta: "先把方向判断清楚，再决定花钱做什么。",
      forbid: ["不要写“我长斑10年”", "不要写虚构案例结论", "不要写机构承诺"],
    },
  };

  function routeForTitle(title = "", formula = "") {
    const text = `${clean(title)} ${clean(formula)}`;
    return Object.values(ROUTES).find((route) => route.match.test(text)) || ROUTES.mistake;
  }

  function build({ titleItem = {}, source = {}, questions = [], keyword = "", industry = "", goal = "" } = {}) {
    const selectedTitle = clean(titleItem.title || "");
    const route = routeForTitle(selectedTitle, titleItem.type || titleItem.formula || "");
    const sourceTitle = clean(source.title || "");
    const sourceSummary = clean(source.summary || source.reason || "");
    const questionList = questions.map(clean).filter(Boolean).slice(0, 6);
    const selectedQuestion = clean(titleItem.question || questionList.find((item) => item.includes(keyword)) || questionList[0] || route.mainQuestion);
    return {
      selectedTitle,
      keyword: clean(keyword),
      industry: clean(industry),
      goal: clean(goal),
      sourceTitle,
      sourceSummary,
      sourceUrl: source.url || source.noteUrl || source.sourceUrl || "",
      routeId: route.id,
      routeLabel: route.label,
      selectedQuestion,
      openingStrategy: route.opening,
      bodyStructure: route.bodyStructure,
      emotionalRoute: emotionalRouteFor(route.id),
      actionEntry: route.cta,
      forbidden: [
        ...route.forbid,
        "不要只替换标题和第一段",
        "不要复用上一版正文主体结构",
        "不要虚构作者本人经历",
        "不要虚构门店、中心、免费检测、医生身份",
        "不要写保证淡斑、根治、一定有效",
      ],
      requiredDifference: [
        "开头必须服务当前 routeLabel",
        "正文段落顺序必须按 bodyStructure 写",
        "CTA 必须按 actionEntry 写",
        "如果 routeLabel 不同，正文主体不能同构",
      ],
      qualityChecks: [
        "是否回答了 selectedQuestion",
        "是否绑定 sourceTitle 和真实互动证据",
        "是否避免百科式分类清单",
        "是否没有虚构经历和服务",
        "是否有低风险行动入口",
      ],
    };
  }

  function emotionalRouteFor(routeId) {
    const map = {
      mistake: ["着急", "发现可能走错", "停下来检查", "愿意做评估"],
      checklist: ["混乱", "拿到标准", "可以对照", "愿意收藏"],
      comment: ["疑惑", "被说中", "知道先看什么", "愿意继续提问"],
      professional: ["不确定", "看到边界", "理解评估维度", "愿意谨慎决策"],
      story: ["后悔", "发现转折", "重建顺序", "愿意慢慢来"],
    };
    return map[routeId] || map.mistake;
  }

  function diagnoseDraft(text = "", strategy = {}) {
    const body = clean(text);
    const repeatedEncyclopedia = /雀斑[\s\S]{0,160}晒斑[\s\S]{0,160}黄褐斑[\s\S]{0,220}(褐青色痣|ADM|混合斑)/.test(body);
    const fabricated = /我长斑|我.*10年|我们中心|免费.*检测|我帮你看看|作为皮肤科医生|作为皮肤管理师/.test(body);
    const titleOnly = body.length < 180;
    const routeWords = (strategy.bodyStructure || []).filter((item) => {
      const key = clean(item).slice(0, 4);
      return key && body.includes(key);
    }).length;
    const checks = [
      { id: "body_length", ok: !titleOnly, label: "正文长度够验收" },
      { id: "route_binding", ok: routeWords >= 1 || body.includes(strategy.selectedQuestion || ""), label: "绑定当前标题路线" },
      { id: "no_encyclopedia_loop", ok: !repeatedEncyclopedia, label: "没有复用分类百科结构" },
      { id: "no_fabrication", ok: !fabricated, label: "没有虚构经历/身份/服务" },
      { id: "cta", ok: /收藏|评估|判断|对照|先看|先停|下一步/.test(body), label: "有低风险行动入口" },
    ];
    return {
      ok: checks.every((item) => item.ok),
      score: checks.reduce((sum, item) => sum + (item.ok ? 2 : 0), 0),
      checks,
      blockers: checks.filter((item) => !item.ok).map((item) => item.label),
    };
  }

  window.LongkaContentStrategy = { build, diagnoseDraft, routeForTitle };
})();
