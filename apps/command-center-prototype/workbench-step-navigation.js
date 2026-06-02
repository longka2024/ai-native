// Longka workflow back navigation.
// Loaded last. It lets operators review previous workflow steps without clearing current results.
(function installLongkaStepNavigation() {
  const $ = window.$ || ((selector) => document.querySelector(selector));

  function showRoutes(routes) {
    const allowed = new Set(routes);
    document.querySelectorAll(".route-panel").forEach((panel) => {
      const route = panel.getAttribute("data-route");
      panel.hidden = !allowed.has(route);
    });
  }

  function markNav(routeName) {
    document.querySelectorAll("[data-route-link], .nav-item").forEach((button) => {
      button.classList.toggle("active", button.dataset.routeLink === routeName);
    });
  }

  function scrollTo(selector) {
    window.setTimeout(() => {
      document.querySelector(selector)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  function setHint(text) {
    const hint = $("#topicHint");
    if (hint) hint.textContent = text;
  }

  function goStep(step) {
    if (step <= 3) {
      showRoutes(["home"]);
      markNav("home");
      scrollTo(step === 1 ? "#taskPicker" : step === 2 ? "#sourcePicker" : "#topic");
      setHint("已回到前面步骤。查看不会清空结果；如果修改行业、关键词或素材来源，需要重新找选题。");
      return;
    }
    if (step === 4) {
      showRoutes(["collect", "topics"]);
      markNav("home");
      scrollTo("#topicsPanel");
      setHint("已回到第 4 步选题区。你可以换一条源头帖，后续拆解、问题库、标题和文案需要重新确认。");
      return;
    }
    showRoutes(["collect", "topics"]);
    markNav("home");
    scrollTo("#decisionPanel");
    setHint("已回到文案工作区。你可以查看前面选择，也可以返回第 3 步修改关键词。");
  }

  function button(label, step) {
    return `<button class="secondary longka-back-step" type="button" data-longka-back-step="${step}">${label}</button>`;
  }

  function enhanceCard(card, html) {
    if (!card || card.dataset.longkaNavEnhanced === "1") return;
    const target = card.querySelector(".publish-target");
    if (!target) return;
    target.insertAdjacentHTML("beforeend", `<div class="longka-back-actions">${html}</div>`);
    card.dataset.longkaNavEnhanced = "1";
  }

  function enhanceAll() {
    enhanceCard(document.querySelector(".step2-deconstruct"), [
      button("返回第 3 步改关键词", 3),
      button("返回第 4 步换源头帖", 4),
    ].join(""));
    enhanceCard(document.querySelector("#step3QuestionBank"), [
      button("返回第 3 步改关键词", 3),
      button("返回第 2 步看拆解", 5),
    ].join(""));
    enhanceCard(document.querySelector("#step4TitleFormulas"), [
      button("返回客户问题库", 5),
      button("返回第 3 步改关键词", 3),
    ].join(""));
    enhanceCard(document.querySelector("#step5CopyBlueprint"), [
      button("返回标题选择", 5),
      button("返回第 3 步改关键词", 3),
    ].join(""));
    enhanceCard(document.querySelector("#step6CopyReview"), [
      button("返回文案框架", 5),
      button("返回第 3 步改关键词", 3),
    ].join(""));
    enhanceCard(document.querySelector("#step7ProductionBrief"), [
      button("返回文案确认", 5),
      button("返回第 3 步改关键词", 3),
    ].join(""));
  }

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-longka-back-step]");
    if (!trigger) return;
    event.preventDefault();
    goStep(Number(trigger.dataset.longkaBackStep));
  });

  const strip = $("#workflowStrip");
  if (strip && strip.dataset.longkaStepNav !== "1") {
    strip.dataset.longkaStepNav = "1";
    Array.from(strip.querySelectorAll("span")).forEach((item, index) => {
      item.dataset.longkaBackStep = String(index + 1);
      item.setAttribute("role", "button");
      item.setAttribute("tabindex", "0");
      item.title = "点击回到这一步查看或调整";
    });
  }

  const observer = new MutationObserver(enhanceAll);
  observer.observe(document.body, { childList: true, subtree: true });
  enhanceAll();

  window.longkaGoWorkflowStep = goStep;
})();
