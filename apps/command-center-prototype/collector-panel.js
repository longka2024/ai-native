(() => {
  const $ = (selector) => document.querySelector(selector);

  const rejectReasonText = {
    pure_link: "纯链接，暂不适合直接二创",
    reply_or_contextless: "回复或上下文不足",
    repost_or_unknown_source: "转发/引用来源不清，先不进入二创候选",
    too_short: "内容太短，缺少可学习结构",
    weak_content_signal: "干货信号弱，暂不推荐",
    other: "其他原因",
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function installCollectorPanel() {
    installContentAssetEnginePage();
    // 适配 workbench-v2.html：挂载到 #contentAssetEngine 而非旧版 #assetLibrary
    const container = $("#contentAssetEngine") || $("#assetLibrary");
    if (!container || $("#collectorPanel")) return;
    container.insertAdjacentHTML("afterbegin", buildPanelHtml());
    bindActions();
    refreshCollectorHealth();
  }

  function installContentAssetEnginePage() {
    if (!document.querySelector("[data-route='content-engine']")) {
      // 适配 workbench-v2.html 的 .sidebar 结构（而非旧版 .command-sidebar）
      const sidebar = document.querySelector(".sidebar");
      const button = document.createElement("button");
      button.className = "nav-item";
      button.dataset.route = "content-engine";
      button.innerHTML = "<b>内容资产工程</b><span>采集 / 单元 / 主题 / 装配</span>";
      if (sidebar) sidebar.appendChild(button);
    }

    if (!$("#contentAssetEngine")) {
      const content = document.querySelector(".content");
      const section = document.createElement("section");
      section.className = "asset-library route-panel content-engine-page";
      section.id = "contentAssetEngine";
      section.dataset.route = "content-engine";
      section.hidden = true;
      section.innerHTML = buildContentEngineHtml();
      content?.appendChild(section);
      bindContentEngineActions(section);
    }
    bindContentEngineRoute();
  }

  function bindContentEngineRoute() {
    if (document.body.dataset.contentEngineRouteBound === "1") return;
    document.body.dataset.contentEngineRouteBound = "1";
    document.addEventListener("click", (event) => {
      const trigger = event.target.closest("[data-route='content-engine']");
      if (!trigger) return;
      event.preventDefault();
      document.querySelectorAll(".route-panel").forEach((panel) => {
        panel.hidden = panel.dataset.route !== "content-engine" && panel.dataset.panel !== "content-engine";
      });
      document.querySelectorAll(".nav-item").forEach((button) => {
        button.classList.toggle("active", button.dataset.route === "content-engine");
      });
      $("#contentAssetEngine")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function buildContentEngineHtml() {
    return `
      <div class="section-title">
        <span>Longka 内容资产工程</span>
        <small>把对标信息源变成每天可执行的内容生产任务。</small>
      </div>
      ${buildDailySopHtml()}
      ${buildSourceLibraryHtml()}
      <div class="radar-guide">
        <b>今日内容雷达</b>
        <p>今天先从启用的信息源里采集真实内容，再沉淀成客户问题、关键概念、有用观点、真实案例和可执行方法。没有真实数据时不会生成假结果。</p>
      </div>
      <div class="x-radar-form">
        <label>
          <span>X 对标账号</span>
          <textarea id="engineXAccounts" rows="4">Xudong07452910
snail_9106
xionghuanwei</textarea>
        </label>
        <div class="x-radar-controls">
          <label><span>每个账号采集条数</span><input id="engineXLimit" type="number" min="1" max="100" value="20" /></label>
          <label><span>采集页数</span><input id="engineXPages" type="number" min="1" max="10" value="1" /></label>
          <label><span>本次用途</span><select id="engineXLabel"><option value="positive_seed">高质量正例</option><option value="radar_seed">雷达种子</option></select></label>
        </div>
        <div class="input-actions">
          <button class="primary" type="button" id="runContentEngine">立即采集并生成今日雷达</button>
          <button class="secondary" type="button" id="loadRecentAssets">读取历史资产</button>
        </div>
      </div>
      <div class="collector-progress" id="engineProgress"><b>处理进度</b><ol><li>等待开始</li></ol></div>
      <div class="collector-result" id="engineResult">还没有生成今日内容雷达。</div>
    `;
  }

  function buildDailySopHtml() {
    return `
      <section class="daily-sop-board">
        <div class="bucket-heading">
          <div>
            <span>每日固定 SOP</span>
            <h3>每天打开系统，就按这条线推进内容工厂</h3>
          </div>
          <small>先做采集和资产沉淀，再做选题和文案，不跳步骤。</small>
        </div>
        <div class="sop-track">
          <article><span>1</span><b>检查信息源</b><p>先看今天启用了哪些来源，不要临时乱填。</p><button type="button" data-engine-action="show-sources">查看信息源库</button></article>
          <article><span>2</span><b>维护来源</b><p>没有合适来源时，先补 X 对标账号或导入收藏。</p><button type="button" data-engine-action="focus-accounts">维护 X 账号</button></article>
          <article><span>3</span><b>执行采集</b><p>从启用来源采集新内容，失败就显示真实原因。</p><button type="button" data-engine-action="run-collection">开始今日采集</button></article>
          <article><span>4</span><b>读取资产</b><p>不想重复采集时，直接复用历史样本。</p><button type="button" data-engine-action="load-history">读取历史资产</button></article>
          <article><span>5</span><b>选择方向</b><p>系统只推 3 个方向，你选一个进入文案生产。</p><button type="button" data-engine-action="show-recommendations">查看推荐方向</button></article>
          <article><span>6</span><b>确认生产</b><p>选题和文案确认后，才做图文或视频。</p><button type="button" data-engine-action="go-workflow">进入今日工作台</button></article>
        </div>
      </section>
    `;
  }

  function buildSourceLibraryHtml() {
    const sources = [
      { type: "X 对标账号", status: "已启用", count: 3, note: "先监控 AI、自媒体、Agent 工具领域的高价值推主。" },
      { type: "小红书对标账号", status: "待接入", count: 0, note: "后续用于美业、实体店、获客类爆款拆解。" },
      { type: "网站 / RSS", status: "待接入", count: 0, note: "适合博客、产品更新、行业新闻和技术文章。" },
      { type: "Newsletter", status: "待接入", count: 0, note: "适合沉淀长期稳定的行业观点和选题来源。" },
      { type: "手工收藏", status: "待导入", count: 0, note: "用于导入你过去收藏的 X 书签和 Obsidian 精选文章。" },
    ];
    return `
      <section class="source-library-board">
        <div class="bucket-heading">
          <div>
            <span>对标信息源库</span>
            <h3>先把值得长期监控的来源沉淀下来</h3>
          </div>
          <small>临时输入账号只适合测试，真正运营要维护固定信息源。</small>
        </div>
        <div class="source-grid">
          ${sources.map((source) => `
            <article>
              <div>
                <b>${escapeHtml(source.type)}</b>
                <span>${escapeHtml(source.status)}</span>
              </div>
              <strong>${source.count}</strong>
              <p>${escapeHtml(source.note)}</p>
              <button type="button" data-engine-action="${source.type === "X 对标账号" ? "focus-accounts" : "source-coming-soon"}">${source.status === "已启用" ? "维护来源" : "标记待接入"}</button>
            </article>
          `).join("")}
        </div>
      </section>
    `;
  }

  function bindContentEngineActions(root) {
    root.querySelector("#runContentEngine")?.addEventListener("click", runContentEngine);
    root.querySelector("#loadRecentAssets")?.addEventListener("click", loadRecentAssets);
    root.addEventListener("click", handleEngineAction);
  }

  function handleEngineAction(event) {
    const trigger = event.target.closest("[data-engine-action]");
    if (!trigger) return;
    const action = trigger.dataset.engineAction;
    if (action === "show-sources") {
      document.querySelector(".source-library-board")?.scrollIntoView({ behavior: "smooth", block: "start" });
      markSopAction(trigger, "已定位");
      return;
    }
    if (action === "focus-accounts") {
      const input = $("#engineXAccounts");
      input?.scrollIntoView({ behavior: "smooth", block: "center" });
      input?.focus();
      markSopAction(trigger, "正在维护");
      return;
    }
    if (action === "run-collection") {
      $("#runContentEngine")?.click();
      markSopAction(trigger, "已开始");
      return;
    }
    if (action === "load-history") {
      $("#loadRecentAssets")?.click();
      markSopAction(trigger, "读取中");
      return;
    }
    if (action === "show-recommendations") {
      const result = $("#engineResult");
      if (!result?.innerText.includes("先从这 3 个方向")) {
        $("#loadRecentAssets")?.click();
      }
      setTimeout(() => document.querySelector(".priority-bucket")?.scrollIntoView({ behavior: "smooth", block: "start" }), 600);
      markSopAction(trigger, "已定位");
      return;
    }
    if (action === "go-workflow") {
      document.querySelector("[data-route='today']")?.click();
      markSopAction(trigger, "已跳转");
      return;
    }
    if (action === "source-coming-soon") {
      $("#engineResult").innerHTML = "<b>这个信息源类型还在接入中</b><p>当前可用的是 X 对标账号和历史资产复用。小红书、RSS、Newsletter、手工收藏会作为后续信息源库扩展。</p>";
      markSopAction(trigger, "待接入");
    }
  }

  function markSopAction(button, text) {
    button.textContent = text;
    button.classList.add("is-done");
  }

  async function runContentEngine() {
    const button = $("#runContentEngine");
    const accounts = $("#engineXAccounts")?.value.trim() || "";
    const maxTweets = Number($("#engineXLimit")?.value || 20);
    const pages = Number($("#engineXPages")?.value || 1);
    const labelType = $("#engineXLabel")?.value || "positive_seed";
    if (!accounts) {
      $("#engineResult").innerHTML = "<b>缺少账号</b><p>请先输入至少一个 X 账号。</p>";
      return;
    }
    setEngineProgress(["正在真实采集 X 账号", "正在入库并去重", "正在抽取内容单元与主题地图", "正在生成今日内容雷达"]);
    setButtonLoading(button, true, "正在处理...");
    $("#engineResult").textContent = "处理中。没有真实数据时不会生成假结果。";
    try {
      const data = await postXBatch({ accounts, maxTweets, pages, labelType });
      renderContentEngineResult(data);
      refreshCollectorHealth();
    } catch (error) {
      $("#engineResult").innerHTML = `<b>生成失败</b><p>${escapeHtml(error.message)}</p>`;
    } finally {
      setButtonLoading(button, false, "立即采集并生成今日雷达");
    }
  }

  async function loadRecentAssets() {
    const button = $("#loadRecentAssets");
    setEngineProgress(["正在从内容资产库读取历史样本", "正在复用历史样本生成内容单元、主题地图和装配稿"]);
    setButtonLoading(button, true, "正在读取...");
    $("#engineResult").textContent = "正在读取历史资产，不会重新采集。";
    try {
      const response = await fetch("/api/collectors/recent-assets?platform=x&limit=100");
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) throw new Error(data.message || data.error || `HTTP ${response.status}`);
      renderContentEngineResult(data, { mode: "history" });
      refreshCollectorHealth();
    } catch (error) {
      $("#engineResult").innerHTML = `<b>读取失败</b><p>${escapeHtml(error.message)}</p>`;
    } finally {
      setButtonLoading(button, false, "读取历史资产");
    }
  }

  function setEngineProgress(items) {
    $("#engineProgress").innerHTML = `<b>处理进度</b><ol>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>`;
  }

  function renderContentEngineResult(data, options = {}) {
    const engine = data.contentEngine || {};
    const units = Array.isArray(engine.units) ? engine.units : [];
    const maps = Array.isArray(engine.topicMaps) ? engine.topicMaps : [];
    const drafts = Array.isArray(engine.assemblyDrafts) ? engine.assemblyDrafts : [];
    setEngineProgress([
      `采集账号 ${data.accounts?.length || 0} 个，原始样本 ${data.totalSampleCount || 0} 条`,
      `生成内容单元 ${units.length} 个，关系 ${engine.relationCount || 0} 条`,
      `生成主题地图 ${maps.length} 张，选题装配稿 ${drafts.length} 份`,
    ]);
    $("#engineResult").innerHTML = `
      <div class="engine-hero">
        <div>
          <span>${options.mode === "history" ? "已从资产库读取" : "本次采集已完成"}</span>
          <b>${options.mode === "history" ? "这些历史素材可以继续复用" : "今日内容雷达已生成"}</b>
          <p>不要逐条处理所有帖子。先按今日工作安排走：入库、筛选、二创、反馈沉淀。</p>
        </div>
        <div class="engine-metrics">
          <span><strong>${data.totalSampleCount || 0}</strong>历史帖子</span>
          <span><strong>${(engine.unitStats?.QST || 0) + (engine.unitStats?.OPI || 0)}</strong>问题和观点</span>
          <span><strong>${maps.length}</strong>主题方向</span>
          <span><strong>${drafts.length}</strong>可做选题</span>
        </div>
      </div>
      ${renderDailyWorkPlan(data, units, drafts)}
      ${renderNextActions(drafts)}
      ${renderWorthReading(data)}
      ${renderAssetSummary(units)}
      ${renderTopicMaps(maps, units)}
    `;
  }

  function renderDailyWorkPlan(data, units, drafts) {
    const goodCount = data.assetBuckets?.goodPosts?.length || data.candidateCount || 0;
    const questionCount = units.filter((unit) => unit.type === "QST").length;
    const methodCount = units.filter((unit) => unit.type === "SOL").length;
    return `
      <section class="asset-bucket daily-plan">
        <div class="bucket-heading">
          <div>
            <span>今日工作安排</span>
            <h3>采集后按这 4 步走，不要被数据淹没</h3>
          </div>
          <small>系统负责筛选和装配，你只需要确认方向和文案。</small>
        </div>
        <div class="daily-plan-grid">
          <article>
            <span>1</span>
            <b>先入库</b>
            <p>已读取 ${data.totalSampleCount || 0} 条真实样本，先沉淀为今天的内容资产。</p>
          </article>
          <article>
            <span>2</span>
            <b>再筛选</b>
            <p>系统筛出 ${goodCount} 条高价值素材，优先核对前 3 条来源。</p>
          </article>
          <article>
            <span>3</span>
            <b>选一个二创</b>
            <p>今天先从 ${drafts.length} 个推荐方向里选 1 个进入文案生产。</p>
          </article>
          <article>
            <span>4</span>
            <b>沉淀反馈</b>
            <p>发布后把客户问题 ${questionCount} 条、可执行方法 ${methodCount} 条继续写回资产库。</p>
          </article>
        </div>
      </section>
    `;
  }

  function renderNextActions(drafts) {
    return `
      <section class="asset-bucket priority-bucket">
        <div class="bucket-heading">
          <div>
            <span>下一步</span>
            <h3>先从这 3 个方向里选一个</h3>
          </div>
          <small>选题确定后，再去写文案和做配图/视频。</small>
        </div>
        <div class="assembly-list priority-list">
          ${drafts.slice(0, 3).map((draft, index) => `
            <article>
              <span>推荐 ${index + 1}</span>
              <b>${escapeHtml(draft.title)}</b>
              <p><strong>适合谁：</strong>${escapeHtml(draft.targetReader)}</p>
              <p><strong>可以解决：</strong>${escapeHtml(draft.coreQuestion)}</p>
              <div class="candidate-actions">
                ${(draft.sourceUrls || []).slice(0, 2).map((url) => `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">核对来源</a>`).join("")}
                <button type="button">用这个方向写文案</button>
              </div>
            </article>
          `).join("") || "<p>暂时没有可推荐的方向。</p>"}
        </div>
      </section>
    `;
  }

  function renderWorthReading(data) {
    const rows = data.assetBuckets?.goodPosts || data.candidates || [];
    return `
      <section class="asset-bucket">
        <div class="bucket-heading">
          <div>
            <span>来源证据</span>
            <h3>先看 3 条最值得核对的原帖</h3>
          </div>
          <small>更多样本在下面折叠区，避免页面太密。</small>
        </div>
        <div class="collector-samples focus-samples">${rows.slice(0, 3).map((sample, index) => renderSampleCard(sample, index, "good")).join("") || "<p>没有筛出高价值样本。</p>"}</div>
        <details class="asset-more">
          <summary>查看更多历史样本，共 ${rows.length} 条</summary>
          <div class="collector-samples">${rows.slice(3, 15).map((sample, index) => renderSampleCard(sample, index + 3, "good")).join("") || "<p>暂无更多样本。</p>"}</div>
        </details>
      </section>
    `;
  }

  function renderAssetSummary(units) {
    const groups = groupUnits(units);
    return `
      <section class="asset-bucket">
        <div class="bucket-heading">
          <div>
            <span>内容资产</span>
            <h3>系统已经帮你拆成 5 类可复用素材</h3>
          </div>
          <small>这里不是让客户学习术语，而是告诉他能拿来做什么。</small>
        </div>
        <div class="unit-grid asset-type-grid">
          ${renderUnitGroup("客户问题", "用户真正关心、会追问、可直接变成选题的问题。", groups.QST)}
          ${renderUnitGroup("关键概念", "需要先讲清楚的定义、模型和判断标准。", groups.CON)}
          ${renderUnitGroup("有用观点", "能拿来做开头、立场和评论区讨论的判断。", groups.OPI)}
          ${renderUnitGroup("真实案例", "能证明观点、增加可信度的故事和经历。", groups.CAS)}
          ${renderUnitGroup("可执行方法", "能写成步骤、清单、教程和行动建议的内容。", groups.SOL)}
        </div>
      </section>
    `;
  }

  function groupUnits(units) {
    return units.reduce((groups, unit) => {
      const key = unit.type || "OPI";
      if (!groups[key]) groups[key] = [];
      groups[key].push(unit);
      return groups;
    }, { QST: [], CON: [], OPI: [], CAS: [], SOL: [] });
  }

  function renderUnitGroup(title, note, items = []) {
    const first = items[0];
    return `
      <article>
        <span>${items.length} 条</span>
        <b>${escapeHtml(title)}</b>
        <p>${escapeHtml(note)}</p>
        ${first ? `<small>例：${escapeHtml(first.title)}</small>` : "<small>这次暂时没有沉淀出来。</small>"}
      </article>
    `;
  }

  function renderTopicMaps(maps, units) {
    const unitMap = new Map((units || []).map((unit) => [unit.id, unit]));
    return `
      <section class="asset-bucket">
        <div class="bucket-heading">
          <div>
            <span>主题地图</span>
            <h3>这些素材可以归到哪些内容方向</h3>
          </div>
          <small>主题地图用于后续连续发内容，不是只写一篇。</small>
        </div>
        <div class="topic-map-list">
          ${maps.slice(0, 5).map((map) => `
            <article>
              <b>${escapeHtml(map.title)}</b>
              <p>可用素材 ${map.units.length} 条 / 关联线索 ${map.relations.length} 条</p>
              <div class="mini-graph">
                ${map.relations.slice(0, 8).map((rel) => `
                  <span>${escapeHtml(unitTypeName(unitMap.get(rel.from)?.type))}</span>
                  <i>${escapeHtml(rel.type)}</i>
                  <span>${escapeHtml(unitTypeName(unitMap.get(rel.to)?.type))}</span>
                `).join("") || "<small>暂无关系</small>"}
              </div>
            </article>
          `).join("") || "<p>暂未生成主题地图。</p>"}
        </div>
      </section>
    `;
  }

  function unitTypeName(type) {
    return {
      QST: "客户问题",
      CON: "关键概念",
      OPI: "有用观点",
      CAS: "真实案例",
      SOL: "可执行方法",
    }[type] || "素材";
  }

  function renderAssemblyDrafts(drafts) {
    return `
      <section class="asset-bucket">
        <h3>今日可做的 3 个选题装配稿</h3>
        <div class="assembly-list">
          ${drafts.slice(0, 3).map((draft) => `
            <article>
              <b>${escapeHtml(draft.title)}</b>
              <p><strong>目标读者：</strong>${escapeHtml(draft.targetReader)}</p>
              <p><strong>核心问题：</strong>${escapeHtml(draft.coreQuestion)}</p>
              <p><strong>可调用观点：</strong>${escapeHtml((draft.opinions || []).join("；") || "暂无")}</p>
              <p><strong>可调用案例：</strong>${escapeHtml((draft.cases || []).join("；") || "暂无")}</p>
              <p><strong>可调用方案：</strong>${escapeHtml((draft.solutions || []).join("；") || "暂无")}</p>
              <p><strong>推荐形式：</strong>${escapeHtml((draft.recommendedFormats || []).join(" / "))}</p>
              <p>${escapeHtml(draft.whyWorthDoing || "")}</p>
              <div class="candidate-actions">${(draft.sourceUrls || []).slice(0, 3).map((url) => `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">来源</a>`).join("")}</div>
            </article>
          `).join("") || "<p>暂未生成装配稿。</p>"}
        </div>
      </section>
    `;
  }

  function buildPanelHtml() {
    return `
      <section class="collector-panel radar-panel" id="collectorPanel">
        <div class="section-title">
          <span>Longka 内容雷达</span>
          <small>先采集对标账号，把好帖、标题、结构、观点和原始样本沉淀进内容资产库。</small>
        </div>
        <div class="collector-status" id="collectorStatus">正在检查采集器状态...</div>
        <div class="radar-guide">
          <b>第一阶段：X 多账号雷达采集</b>
          <p>输入不带 @ 的 X 账号名，多个账号用逗号或换行分隔。系统会先采集最近帖子并入库，再拆成内容资产：好帖样本、标题素材、结构素材、观点素材和原始样本。</p>
          <p>不是每条都要仿写。大部分样本用于学习账号、平台语言、标题公式和表达结构，少数高价值样本才进入选题或二创。</p>
        </div>
        <div class="x-radar-form">
          <label>
            <span>X 账号列表</span>
            <textarea id="xcrawlXAccounts" rows="5" placeholder="Xudong07452910&#10;snail_9106&#10;xionghuanwei"></textarea>
          </label>
          <div class="x-radar-controls">
            <label><span>每个账号采集条数</span><input id="xcrawlXLimit" type="number" min="1" max="100" value="20" /></label>
            <label><span>采集页数</span><input id="xcrawlXPages" type="number" min="1" max="10" value="1" /></label>
            <label><span>样本用途</span><select id="xcrawlXLabel"><option value="positive_seed">高表现正例</option><option value="radar_seed">雷达种子</option><option value="benchmark">对标账号</option><option value="unknown">暂不分类</option></select></label>
          </div>
          <div class="input-actions">
            <button class="primary" type="button" id="runXcrawlXBatch">采集 X 多账号</button>
            <button class="secondary" type="button" id="fillXDemoAccounts">填入示例账号</button>
          </div>
        </div>
        <div class="collector-progress" id="collectorProgress"><b>采集进度</b><ol><li>等待输入账号</li></ol></div>
        <div class="collector-result" id="collectorResult">还没有运行采集任务。采集失败时会显示真实错误，不会用假数据顶替。</div>
      </section>
    `;
  }

  function bindActions() {
    $("#fillXDemoAccounts")?.addEventListener("click", () => {
      $("#xcrawlXAccounts").value = ["Xudong07452910", "snail_9106", "xionghuanwei"].join("\n");
    });
    $("#runXcrawlXBatch")?.addEventListener("click", runXBatchRadar);
  }

  async function refreshCollectorHealth() {
    const status = $("#collectorStatus");
    if (!status) return;
    try {
      const data = await fetch("/api/collectors/health").then((res) => res.json());
      const checks = data.checks || {};
      const counts = data.counts || {};
      status.innerHTML = `
        <span class="${checks.postgres ? "ok" : "fail"}">样本库：${checks.postgres ? "已连接" : "未连接"}</span>
        <span class="${checks.xcrawl ? "ok" : "fail"}">X 采集：${checks.xcrawl ? "已配置" : "未配置"}</span>
        <span>采集批次：${counts.runs ?? 0}</span>
        <span>入库样本：${counts.samples ?? 0}</span>
      `;
    } catch (error) {
      status.textContent = `采集器状态检查失败：${error.message}`;
    }
  }

  async function runXBatchRadar() {
    const button = $("#runXcrawlXBatch");
    const accounts = $("#xcrawlXAccounts")?.value.trim() || "";
    const maxTweets = Number($("#xcrawlXLimit")?.value || 20);
    const pages = Number($("#xcrawlXPages")?.value || 1);
    const labelType = $("#xcrawlXLabel")?.value || "radar_seed";
    if (!accounts) {
      renderError("请先输入至少一个 X 账号。");
      return;
    }

    setProgress([
      "已收到账户列表，正在请求真实采集服务",
      "先入库原始样本，再沉淀到不同内容资产库",
      "纯链接、回复和弱内容会进入噪音统计，不作为主资产展示",
    ]);
    setButtonLoading(button, true, "正在采集...");
    $("#collectorResult").textContent = "正在采集真实数据，请等待。系统不会展示假样本。";

    try {
      const data = await postXBatch({ accounts, maxTweets, pages, labelType });
      renderBatchResult(data);
      refreshCollectorHealth();
    } catch (error) {
      renderError(error.message);
    } finally {
      setButtonLoading(button, false, "采集 X 多账号");
    }
  }

  async function postXBatch(payload) {
    const response = await fetch("/api/collectors/xcrawl/x-user-tweets-batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
      throw new Error(data.message || data.error || `HTTP ${response.status}`);
    }
    return data;
  }

  function setButtonLoading(button, loading, text) {
    if (!button) return;
    button.disabled = loading;
    button.textContent = text;
  }

  function setProgress(items) {
    $("#collectorProgress").innerHTML = `<b>采集进度</b><ol>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>`;
  }

  function renderError(message) {
    setProgress(["采集失败", "请检查账号、接口配置或稍后重试"]);
    $("#collectorResult").innerHTML = `
      <b>采集失败</b>
      <p>${escapeHtml(message)}</p>
      <p>没有拿到真实数据时，系统不会生成候选选题，也不会用本地固定模板冒充采集结果。</p>
    `;
  }

  function renderBatchResult(data) {
    const results = Array.isArray(data.results) ? data.results : [];
    const candidates = Array.isArray(data.candidates) ? data.candidates : [];
    const rejectedStats = data.rejectedStats || {};
    const buckets = data.assetBuckets || {};
    setProgress([
      `已完成 ${data.accounts?.length || results.length} 个账号采集`,
      `成功 ${data.successCount || 0} 个，失败 ${data.failCount || 0} 个`,
      `入库 ${data.totalSampleCount || 0} 条原始样本，沉淀 ${bucketCount(buckets)} 条资产，过滤 ${data.rejectedCount || 0} 条噪音`,
    ]);
    $("#collectorResult").innerHTML = `
      <b>采集完成</b>
      <p>本次采集到的是原始材料。系统不会要求每条都仿写，而是把它们拆进内容资产库，后面用于找选题、拆标题、学结构、积累观点。</p>
      <div class="account-result-list">${results.map(renderAccountResult).join("")}</div>
      <div class="radar-filter-summary">
        <b>资产沉淀结果</b>
        <span>入库 ${data.totalSampleCount || 0} 条</span>
        <span>好帖 ${buckets.goodPosts?.length || 0} 条</span>
        <span>标题 ${buckets.titleSamples?.length || 0} 条</span>
        <span>结构 ${buckets.structureSamples?.length || 0} 条</span>
        <span>观点 ${buckets.viewpoints?.length || 0} 条</span>
        <span>过滤 ${data.rejectedCount || 0} 条</span>
        ${Object.entries(rejectedStats).map(([key, count]) => `<small>${escapeHtml(rejectReasonText[key] || key)}：${count}</small>`).join("")}
      </div>
      ${renderAssetSection("好帖样本库", "用于后续选题、拆解和少量二创，不是每条都仿写。", buckets.goodPosts || candidates, "good")}
      ${renderAssetSection("标题素材库", "保留标题表达、反差、问题意识和点击理由。", buckets.titleSamples || [], "title")}
      ${renderAssetSection("结构素材库", "保留开头、展开方式、清单、案例和复盘结构。", buckets.structureSamples || [], "structure")}
      ${renderAssetSection("观点素材库", "保留可转化成中文内容选题的判断和经验。", buckets.viewpoints || [], "viewpoint")}
    `;
    bindCandidateActions(buckets);
  }

  function bucketCount(buckets = {}) {
    return ["goodPosts", "titleSamples", "structureSamples", "viewpoints"]
      .reduce((sum, key) => sum + (Array.isArray(buckets[key]) ? buckets[key].length : 0), 0);
  }

  function renderAssetSection(title, note, samples, bucket) {
    return `
      <section class="asset-bucket">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(note)}</p>
        <div class="collector-samples">
          ${(samples || []).slice(0, bucket === "title" ? 12 : 8).map((sample, index) => renderSampleCard(sample, index, bucket)).join("") || "<p>本次没有沉淀出这一类资产。</p>"}
        </div>
      </section>
    `;
  }

  function renderAccountResult(result) {
    const ok = Boolean(result.ok);
    return `
      <article class="${ok ? "ok" : "fail"}">
        <b>@${escapeHtml(result.account || result.run?.query || "未知账号")}</b>
        <span>${ok ? "成功" : "失败"} / 入库 ${result.sampleCount || 0} 条 / ${result.credits ?? "-"} credits</span>
        ${ok ? "" : `<p>${escapeHtml(result.message || result.error || "未知错误")}</p>`}
      </article>
    `;
  }

  function renderSampleCard(sample, index, bucket = "good") {
    const metrics = sample.metrics || {};
    const metricText = [
      `赞 ${metrics.likes ?? 0}`,
      `评 ${metrics.replies ?? 0}`,
      `转 ${metrics.retweets ?? 0}`,
      `引 ${metrics.quotes ?? 0}`,
      `藏 ${metrics.bookmarks ?? 0}`,
      `雷达分 ${sample.radarScore ?? 0}`,
      `干货分 ${sample.contentValueScore ?? 0}`,
    ].join(" / ");
    const author = sample.authorName === "unknown_original_author" ? "转发/引用来源不清" : (sample.authorName || sample.keyword || "X");
    const body = String(sample.body || sample.markdown || sample.title || "").slice(0, 260);
    return `
      <article>
        <span>${escapeHtml(author)} · ${escapeHtml(metricText)}</span>
        <b>${escapeHtml(sample.title || "未命名样本")}</b>
        <p>${escapeHtml(body)}</p>
        <div class="candidate-actions">
          ${sample.sourceUrl ? `<a href="${escapeHtml(sample.sourceUrl)}" target="_blank" rel="noreferrer">打开原帖</a>` : ""}
          <button type="button" data-bucket="${escapeHtml(bucket)}" data-candidate-index="${index}" data-action="save-sample">加入资产暂存</button>
          <button type="button" data-bucket="${escapeHtml(bucket)}" data-candidate-index="${index}" data-action="select-topic">生成选题角度</button>
        </div>
      </article>
    `;
  }

  function bindCandidateActions(buckets = {}) {
    const bucketMap = {
      good: buckets.goodPosts || [],
      title: buckets.titleSamples || [],
      structure: buckets.structureSamples || [],
      viewpoint: buckets.viewpoints || [],
    };
    document.querySelectorAll("[data-candidate-index]").forEach((button) => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.candidateIndex);
        const action = button.dataset.action;
        const bucket = button.dataset.bucket || "good";
        const sample = bucketMap[bucket]?.[index];
        if (!sample) return;
        localStorage.setItem("longka-selected-x-radar-sample", JSON.stringify({
          action,
          bucket,
          selectedAt: new Date().toISOString(),
          sample,
        }));
        button.textContent = action === "select-topic" ? "已选为选题素材" : "已加入资产暂存";
        button.disabled = true;
      });
    });
  }

  window.addEventListener("load", installCollectorPanel);
})();
