(() => {
  const $ = (selector) => document.querySelector(selector);

  function setAgentActive(name) {
    document.querySelectorAll(".agent-card").forEach((card) => {
      card.classList.toggle("active", card.dataset.agent === name);
    });
  }

  function selectedTopicChannel() {
    return document.querySelector("#topicChannelPicker [data-topic-channel].active")?.dataset.topicChannel || "x-history";
  }

  function scrollTo(selector) {
    $(selector)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function startTeam() {
    setAgentActive("topic");
    runTopicChannel();
  }

  function openContentEngine() {
    document.querySelector("[data-route-link='content-engine']")?.click();
  }

  function runXHistoryTopics() {
    openContentEngine();
    setTimeout(() => {
      $("#loadRecentAssets")?.click();
      $("#loadRecentAssets")?.focus();
    }, 500);
  }

  function runXLiveTopics() {
    openContentEngine();
    setTimeout(() => {
      $("#engineXAccounts")?.focus();
      $("#engineXAccounts")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 500);
  }

  function showXhsPending() {
    openContentEngine();
    setTimeout(() => {
      const result = $("#engineResult");
      if (result) {
        result.innerHTML = "<b>小红书素材通道暂不作为默认流程</b><p>当前小红书采集稳定性还没达到主流程要求。你可以先用 X 历史资产找选题；需要测试小红书时，再单独进入采集调试。</p>";
        result.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 500);
  }

  function runTopicChannel() {
    const channel = selectedTopicChannel();
    if (channel === "x-live") {
      runXLiveTopics();
      return;
    }
    if (channel === "xhs") {
      showXhsPending();
      return;
    }
    runXHistoryTopics();
  }

  function handleAgentAction(event) {
    const trigger = event.target.closest("[data-agent-action], #startAgentTeam");
    if (!trigger) return;

    const action = trigger.id === "startAgentTeam" ? "start" : trigger.dataset.agentAction;
    if (action === "start") {
      startTeam();
      return;
    }
    if (action === "find-topics") {
      setAgentActive("topic");
      runTopicChannel();
      return;
    }
    if (action === "go-copy") {
      setAgentActive("copy");
      scrollTo("#outputsPanel");
      return;
    }
    if (action === "go-visual") {
      setAgentActive("visual");
      scrollTo(".visual-result");
      return;
    }
    if (action === "go-assets") {
      setAgentActive("review");
      document.querySelector("[data-route-link='keywords']")?.click();
    }
  }

  function handleChannelClick(event) {
    const button = event.target.closest("#topicChannelPicker [data-topic-channel]");
    if (!button) return;
    document.querySelectorAll("#topicChannelPicker [data-topic-channel]").forEach((item) => {
      item.classList.toggle("active", item === button);
    });
  }

  document.addEventListener("click", handleAgentAction);
  document.addEventListener("click", handleChannelClick);
})();
