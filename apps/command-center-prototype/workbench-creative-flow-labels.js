// Longka creative flow labels.
// Loaded last to avoid duplicated "step 3/4/5" wording in the operator workflow.
(function installLongkaCreativeFlowLabels() {
  const labels = [
    ["step2-deconstruct", "素材拆解"],
    ["step3-question-bank", "创作角度"],
    ["step4-title-formulas", "标题候选"],
    ["step5-copy-blueprint", "文案框架"],
    ["step6-copy-review", "正文体检"],
    ["step7-production-brief", "生产准备"],
  ];

  function rewriteText(node, from, to) {
    if (node && node.textContent && node.textContent.includes(from)) node.textContent = node.textContent.replace(from, to);
  }

  function updateCard(card, label) {
    if (!card) return;
    const badge = card.querySelector(":scope > span");
    if (badge) badge.textContent = label;
    card.querySelectorAll("b, p, button, small").forEach((node) => {
      rewriteText(node, "第二步：爆款样本拆解", "素材拆解");
      rewriteText(node, "第三步：客户问题库", "创作角度");
      rewriteText(node, "第三步：创作角度生成", "创作角度");
      rewriteText(node, "第四步：标题公式匹配", "标题候选");
      rewriteText(node, "第五步：文案框架", "文案框架");
      rewriteText(node, "第六步：正文生成 + 文案体检", "正文体检");
      rewriteText(node, "第七步：确认后生产准备", "生产准备");
      rewriteText(node, "下一步：客户问题库", "下一步：创作角度");
      rewriteText(node, "进入客户问题库", "进入创作角度");
      rewriteText(node, "确认创作角度，进入标题候选", "确认角度，进入标题候选");
      rewriteText(node, "返回客户问题库", "返回创作角度");
      rewriteText(node, "第 3 步", "关键词输入");
      rewriteText(node, "返回第 3 步改关键词", "返回关键词输入");
      rewriteText(node, "返回第 4 步换源头帖", "返回素材池换源头帖");
    });
  }

  function ensureGuide() {
    const panel = document.querySelector("#decisionPanel");
    if (!panel || document.querySelector("#creativeFlowGuide")) return;
    panel.insertAdjacentHTML("afterbegin", `<article class="analysis-card creative-flow-guide" id="creativeFlowGuide">
      <span>创作加工流程</span>
      <h2>选中素材后，按这条线完成文案</h2>
      <p class="import-help">顶部是输入流程：选产物、选素材、填关键词、找素材。这里是创作加工流程：素材拆解 -> 创作角度 -> 标题候选 -> 文案框架 -> 正文体检 -> 生产准备。我们不直接让 AI 凭空写，而是先看真实爆款怎么打动人，再用体检把空话、模板味和机器腔压下去。客户问题库会沉淀到左侧内容资产库，不再作为单篇创作的硬阻断。</p>
    </article>`);
  }

  let applying = false;
  let scheduled = false;

  function applyLabels() {
    if (applying) return;
    applying = true;
    labels.forEach(([className, label]) => {
      document.querySelectorAll(`.${className}`).forEach((card) => updateCard(card, label));
      document.querySelectorAll(`#${className}`).forEach((card) => updateCard(card, label));
    });
    if (document.querySelector(".step2-deconstruct, #step3QuestionBank, #step4TitleFormulas, #step5CopyBlueprint, #step6CopyReview, #step7ProductionBrief")) {
      ensureGuide();
    }
    applying = false;
  }

  function scheduleApply() {
    if (scheduled) return;
    scheduled = true;
    window.setTimeout(() => {
      scheduled = false;
      applyLabels();
    }, 50);
  }

  const observer = new MutationObserver(scheduleApply);
  observer.observe(document.body, { childList: true, subtree: true });
  applyLabels();
})();
