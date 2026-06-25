// asset-manager.js — 母题资产库、标题库、作品记录的渲染与操作
// 依赖: state-manager.js, config.js, utils.js, copy-manager.js

function renderAssetPage(route) {
  if (route === "assets") renderAssets();
  if (route === "titles") {
    renderTitleAssets();
    return;
  }
  if (route === "records") {
    renderRecords();
    return;
  }
  if (route === "dashboard") {
    renderDashboard();
    return;
  }
  if (route === "sources") {
    renderBenchmarkPanel();
    return;
  }
  const map = {
    questions: "客户问题库",
    titles: "标题库",
    structures: "爆款结构库",
    records: "作品记录",
  };
  const idMap = {
    questions: "questionBoard",
    titles: "titleBoard",
    structures: "structureBoard",
    records: "recordBoard",
  };
  if (map[route]) {
    const target = byId(idMap[route]);
    if (target) target.innerHTML = sampleAssetItems(map[route]);
  }
  if (route === "accounts") renderAccounts();
}

async function renderTitleAssets() {
  const target = byId("titleBoard");
  if (!target) return;
  target.innerHTML = `<div class="empty-state"><b>正在读取标题资产</b><span>从真实采集样本中抽取标题、公式和互动数据。</span></div>`;
  try {
    const params = new URLSearchParams({
      keywords: state.keywords || "",
      limit: "80",
    });
    const res = await fetch(apiPath(`/api/title-assets?${params.toString()}`));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    const titles = Array.isArray(result.titles) ? result.titles : [];
    const groups = groupTitleAssets(titles);
    target.innerHTML = renderTitleAssetWorkbench(result, titles, groups);
    return;
  } catch (error) {
    target.innerHTML = `<div class="empty-state"><b>标题库读取失败</b><span>${escapeHtml(error.message)}</span></div>`;
  }
}

function groupTitleAssets(titles = []) {
  const map = new Map();
  for (const item of titles) {
    const key = item.formula || inferTitleGroupName(item.title) || "待拆解";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return [...map.entries()].map(([name, items]) => ({
    name,
    items: items.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 8),
  })).sort((a, b) => b.items.length - a.items.length);
}

function renderTitleAssetWorkbench(result = {}, titles = [], groups = []) {
  const exactCount = result.filterMiss ? 0 : titles.length;
  const formulaCount = groups.length;
  const top = titles[0] || {};
  const status = result.filterMiss
    ? "当前方向还缺标题资产，下面先展示全库高分标题作为参考；需要继续采集本方向爆款标题。"
    : "当前方向已有可复用标题资产，可以直接支撑第 6 步标题改写。";
  return `
    <div class="asset-summary asset-command">
      <b>标题资产库不是标题列表</b>
      <span>它负责沉淀真实爆款标题、拆出公式、绑定表现数据，并反哺今日工作台第 6 步。</span>
    </div>
    <div class="asset-kpi-grid">
      <article><b>${exactCount}</b><span>当前方向标题</span></article>
      <article><b>${titles.length}</b><span>本次可参考标题</span></article>
      <article><b>${formulaCount}</b><span>已识别公式</span></article>
      <article><b>${escapeHtml(top.score || 0)}</b><span>最高标题分</span></article>
    </div>
    <section class="asset-lane">
      <div class="title-group-head">
        <b>现在该怎么用</b>
        <span>${escapeHtml(status)}</span>
      </div>
      <div class="asset-grid title-asset-grid">
        <article class="asset-item">
          <b>1. 先看当前方向是否有标题资产</b>
          <span>如果这里是 0，说明不是生成器不努力，而是这个方向还没采集足够好标题。</span>
        </article>
        <article class="asset-item">
          <b>2. 再看哪些公式真的有效</b>
          <span>同一话题要覆盖认知冲突、损失规避、数字清单、案例经验等不同触发器。</span>
        </article>
        <article class="asset-item">
          <b>3. 最后回到第 6 步改写标题</b>
          <span>第 6 步会优先调用这里的标题资产；发布后的数据再回流，标题库才会越用越强。</span>
        </article>
      </div>
    </section>
    ${groups.length ? groups.map(renderTitleAssetGroup).join("") : `<article class="empty-state"><b>还没有标题资产</b><span>先采集真实高表现内容，标题会自动进入这里。</span></article>`}
  `;
}

function inferTitleGroupName(title = "") {
  if (/为什么|不是|而是|真正/.test(title)) return "认知冲突型";
  if (/别|警告|避坑|不要/.test(title)) return "损失提醒型";
  if (/\d|第|个|条/.test(title)) return "数字清单型";
  if (/如何|怎么|清单|步骤/.test(title)) return "行动方法型";
  if (/我|亲测|经验|复盘/.test(title)) return "经验复盘型";
  return "待拆解";
}

function renderTitleAssetGroup(group) {
  return `<section class="title-group">
    <div class="title-group-head">
      <b>${escapeHtml(group.name)}</b>
      <span>${group.items.length} 条高分标题</span>
    </div>
    <div class="asset-grid title-asset-grid">${group.items.map(renderTitleAssetCard).join("")}</div>
  </section>`;
}

function renderTitleAssetCard(item) {
  const metrics = item.metrics || {};
  return `<article class="asset-item title-asset">
    <b>${escapeHtml(item.title)}</b>
    <span>${escapeHtml(item.reason || "真实标题资产")}</span>
    <div class="metric-row">
      <span>${escapeHtml(item.platform || "unknown")}</span>
      <span>分 ${escapeHtml(item.score || 0)}</span>
      <span>赞 ${escapeHtml(metrics.likes || 0)}</span>
      <span>藏 ${escapeHtml(metrics.saves || 0)}</span>
      <span>评 ${escapeHtml(metrics.comments || 0)}</span>
    </div>
    <p><strong>公式：</strong>${escapeHtml(item.formula || "待拆解")}</p>
    ${item.url ? `<a class="source-link" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">打开来源</a>` : ""}
  </article>`;
}

async function renderAssets() {
  const target = $("#assetBoard");
  if (!target) return;
  target.innerHTML = `<article class="empty-state"><b>${zh("&#27491;&#22312;&#35835;&#21462;&#20869;&#23481;&#36164;&#20135;&#24211;")}</b><span>${zh("&#27491;&#22312;&#20174; 122 &#32479;&#19968;&#20316;&#21697;&#24211;&#21644;&#32032;&#26448;&#24211;&#35835;&#21462;&#25968;&#25454;&#12290;")}</span></article>`;
  let db;
  let topics = [];
  let sampleCount = 0;
  try {
    db = await loadFullAssetState();
    let remoteWorks = Array.isArray(db.finalWorks) ? db.finalWorks : [];
    const localWorks = Array.isArray(state.finalWorks) ? state.finalWorks : [];
    const syncResult = await syncLocalFinalWorksToServer(localWorks, remoteWorks);
    remoteWorks = syncResult.finalWorks;
    if (syncResult.uploaded) log(`${zh("&#24050;&#25226;&#26412;&#26426;")} ${syncResult.uploaded} ${zh("&#20010;&#26087;&#25104;&#31295;&#21516;&#27493;&#21040; 122 &#32479;&#19968;&#20316;&#21697;&#24211;&#12290;")}`);
    const mergedWorks = new Map();
    [...remoteWorks, ...localWorks].forEach((item) => {
      if (item?.id) mergedWorks.set(item.id, item);
    });
    state.finalWorks = [...mergedWorks.values()].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))).slice(0, 300);
    persistWorkbenchSnapshot();
    const oldSource = state.sourceChannel;
    state.sourceChannel = "all-assets";
    topics = buildTopicsFromDb(db).slice(0, 9);
    state.sourceChannel = oldSource;
    sampleCount = Array.isArray(db.contentSamples) ? db.contentSamples.length : 0;
  } catch (error) {
    target.innerHTML = `<article class="empty-state"><b>${zh("&#20869;&#23481;&#36164;&#20135;&#24211;&#35835;&#21462;&#22833;&#36133;")}</b><span>${escapeHtml(error.message)}</span></article>`;
    return;
  }
  // 分页止血:作品卡极重(每张几十节点),只渲染前 N 张 + 加载更多,避免 300 张一次性注入卡死弱机
  const _assetShow = state._assetShowCount || 30;
  const _shownWorks = state.finalWorks.slice(0, _assetShow);
  const _moreWorks = state.finalWorks.length - _shownWorks.length;
  const finalWorksHtml = state.finalWorks.length
    ? `<div class="title-group-head"><b>${zh("&#24050;&#23436;&#25104;&#20316;&#21697;")}</b><span>${state.finalWorks.length} ${zh("&#20010;&#21487;&#22797;&#29992;&#25104;&#31295;")}</span></div><div class="asset-grid">${_shownWorks.map(renderFinalWorkAsset).join("")}</div>${_moreWorks > 0 ? `<button class="secondary" id="loadMoreWorks" type="button" style="margin-top:12px;width:100%;">加载更多（还有 ${_moreWorks} 个）</button>` : ""}`
    : `<article class="empty-state"><b>${zh("&#36824;&#27809;&#26377;&#20445;&#23384;&#36807;&#25104;&#31295;&#20316;&#21697;")}</b><span>${zh("&#20174;&#20170;&#26085;&#24037;&#20316;&#21488;&#23436;&#25104;&#20986;&#22270;&#21518;&#65292;&#22312;&#31532;12&#27493;&#20445;&#23384;&#65292;&#36825;&#37324;&#20250;&#20986;&#29616;&#21487;&#22797;&#30424;&#12289;&#21487;&#36716;&#24179;&#21488;&#30340;&#20316;&#21697;&#21345;&#12290;")}</span></article>`;
  const opsSummary = buildAssetOpsSummary(state.finalWorks);
  const topicCards = topics.map((item) => `<article class="asset-item"><b>${escapeHtml(item.theme)}</b><span>${escapeHtml(item.reason)}</span><p><strong>${zh("&#36866;&#21512;&#22797;&#29992;&#65306;")}</strong>${zh("&#23567;&#32418;&#20070;&#22270;&#25991;&#12289;&#20844;&#20247;&#21495;&#38271;&#25991;&#12289;&#26379;&#21451;&#22280;&#12289;&#30701;&#35270;&#39057;&#33050;&#26412;")}</p>${item.url ? `<a class="source-link" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${zh("&#25171;&#24320;&#26469;&#28304;")}</a>` : ""}</article>`).join("") || `<article class="empty-state"><b>${zh("&#26242;&#26080;&#28304;&#32032;&#26448;")}</b><span>${zh("&#20808;&#35835;&#21462;&#21382;&#21490;&#36164;&#20135;&#12289;&#37319;&#38598; X &#36134;&#21495;&#65292;&#25110;&#23548;&#20837;&#32032;&#26448;&#12290;")}</span></article>`;
  target.innerHTML = `
    <section class="asset-lane">
      <div class="asset-summary asset-command">
        <b>${zh("&#20869;&#23481;&#36164;&#20135;&#24211;&#19981;&#26159;&#25910;&#34255;&#22841;")}</b>
        <span>${zh("&#23427;&#25226;&#30495;&#23454;&#32032;&#26448;&#21464;&#25104;&#21487;&#22797;&#21033;&#22797;&#20889;&#30340;&#27597;&#39064;&#65292;&#20877;&#27785;&#28096;&#24179;&#21488;&#25104;&#31295;&#12289;&#22270;&#25991;&#36164;&#20135;&#21644;&#21457;&#24067;&#22797;&#30424;&#12290;")}</span>
      </div>
      <div class="asset-kpi-grid">
        <article><b>${sampleCount}</b><span>${zh("&#28304;&#32032;&#26448;&#26679;&#26412;")}</span></article>
        <article><b>${topics.length}</b><span>${zh("&#21487;&#29992;&#27597;&#39064;&#20505;&#36873;")}</span></article>
        <article><b>${state.finalWorks.length}</b><span>${zh("&#24050;&#23436;&#25104;&#24179;&#21488;&#29256;&#26412;")}</span></article>
        <article><b>7d</b><span>${zh("&#21457;&#24067;&#21518;&#22797;&#30424;&#33410;&#28857;")}</span></article>
      </div>
      <div class="asset-ops-board">
        <div class="title-group-head"><b>${zh("&#20170;&#26085;&#20316;&#21697;&#29366;&#24577;")}</b><span>${zh("&#23567;&#22969;&#19981;&#38656;&#35201;&#35760;&#25351;&#20196;&#65292;&#25353;&#29366;&#24577;&#28857;&#19979;&#19968;&#27493;&#12290;")}</span></div>
        <div class="asset-ops-grid">
          <article><b>${opsSummary.ready}</b><span>${zh("&#24453;&#30331;&#35760;&#21457;&#24067;")}</span><small>${zh("&#21457;&#20986;&#21435;&#21518;&#22635;&#24179;&#21488;&#21644;&#38142;&#25509;")}</small></article>
          <article><b>${opsSummary.pendingRetro}</b><span>${zh("&#24453;&#22797;&#30424;&#26657;&#20934;")}</span><small>${zh("T+3 &#34917;&#25968;&#25454;&#65292;&#26657;&#20934;&#21028;&#26029;")}</small></article>
          <article><b>${opsSummary.due}</b><span>${zh("&#21040;&#26399;&#24453;&#22797;&#30424;")}</span><small>${zh("&#20248;&#20808;&#34917;&#25968;&#25454;")}</small></article>
          <article><b>${opsSummary.positive}</b><span>${zh("&#27491;&#20363;&#26679;&#26412;")}</span><small>${zh("&#20540;&#24471;&#19968;&#40060;&#22810;&#21507;")}</small></article>
          <article><b>${opsSummary.negative}</b><span>${zh("&#21453;&#20363;&#26679;&#26412;")}</span><small>${zh("&#29992;&#26469;&#23545;&#29031;&#21644;&#38450;&#27490;&#37325;&#29359;")}</small></article>
        </div>
      </div>
      <div class="asset-grid">
        <article class="asset-item"><b>${zh("&#37319;&#38598;&#22522;&#24231;")}</b><span>MediaCrawlerPro / XCrawl / RSS / ${zh("&#25163;&#21160;&#23548;&#20837;&#36127;&#36131;&#25343;&#30495;&#23454;&#32032;&#26448;&#65292;&#19981;&#29992;&#20551;&#25968;&#25454;&#22635;&#39029;&#38754;&#12290;")}</span></article>
        <article class="asset-item"><b>${zh("&#20869;&#23481;&#25286;&#35299;&#22522;&#24231;")}</b><span>${zh("Longka &#26631;&#39064;&#24211; / &#32467;&#26500;&#24211;&#25226;&#32032;&#26448;&#25286;&#25104;&#29992;&#25143;&#30171;&#28857;&#12289;&#26631;&#39064;&#20844;&#24335;&#12289;&#32467;&#26500;&#21644;&#22797;&#29992;&#35282;&#24230;&#12290;")}</span></article>
        <article class="asset-item"><b>${zh("&#35270;&#35273;&#29983;&#20135;&#22522;&#24231;")}</b><span>${zh("&#23567;&#40657;&#12289;&#24402;&#34255;&#12289;&#23453;&#29577;&#12289;Open Design &#36127;&#36131;&#25226;&#30830;&#35748;&#25991;&#26696;&#20570;&#25104;&#22270;&#25991;&#12289;&#38271;&#25991;&#37197;&#22270;&#25110;&#28436;&#31034;&#31295;&#12290;")}</span></article>
        <article class="asset-item"><b>${zh("&#22797;&#30424;&#35757;&#32451;&#22522;&#24231;")}</b><span>${zh("&#21457;&#24067;&#21518;&#34917;&#38405;&#35835;&#12289;&#28857;&#36190;&#12289;&#25910;&#34255;&#12289;&#35780;&#35770;&#65292;&#21028;&#26029;&#27597;&#39064;&#26159;&#27491;&#20363;&#12289;&#21453;&#20363;&#65292;&#36824;&#26159;&#20540;&#24471;&#20108;&#27425;&#25913;&#20889;&#12290;")}</span></article>
      </div>
      ${finalWorksHtml}
    </section>
    <section class="asset-lane">
      <div class="title-group-head"><b>${zh("&#28304;&#32032;&#26448; / &#27597;&#39064;&#20505;&#36873;")}</b><span>${zh("&#29992;&#20110;&#32487;&#32493;&#25214;&#36873;&#39064;&#21644;&#19968;&#40060;&#22810;&#21507;&#12290;")}</span></div>
      <div class="asset-grid">${topicCards}</div>
    </section>`;
  // “加载更多”委托:绑常驻 #assetBoard 一次(守卫防重复绑定→泄漏),每次多渲染 30 张
  const _abDelegate = $("#assetBoard");
  if (_abDelegate && !_abDelegate.dataset.loadMoreBound) {
    _abDelegate.dataset.loadMoreBound = "1";
    _abDelegate.addEventListener("click", (e) => {
      if (e.target.closest("#loadMoreWorks")) {
        state._assetShowCount = (state._assetShowCount || 30) + 30;
        renderAssets();
      }
    });
  }
}

function renderFinalWorkAsset(item) {
  const images = Array.isArray(item.images) ? item.images : [];
  const body = cleanPublishBodyForCopy(item.body || "");
  const bodyPreview = body.length > 900 ? body.slice(0, 900) + "\n\n..." : body;
  const metrics = item.publishMetrics || {};
  const views = Number(metrics.views || 0);
  const likes = Number(metrics.likes || 0);
  const saves = Number(metrics.saves || 0);
  const comments = Number(metrics.comments || 0);
  const shares = Number(metrics.shares || 0);
  const pending = zh("&#24453;&#34917;");
  const saveRate = views ? `${((saves / views) * 100).toFixed(1)}%` : pending;
  const engageRate = views ? `${(((likes + saves + comments + shares) / views) * 100).toFixed(1)}%` : pending;
  const isEditing = state.editingMetricsWorkId === item.id;
  const isEditingPublish = state.editingPublishWorkId === item.id;
  const status = finalWorkStatus(item);
  const publishRecord = item.publishRecord || {};
  const platformId = item.platformId || inferPlatformIdFromTitle(item.platform);
  // 张数按内容判断：用保存时记录的规划张数；老作品没记的，回退到实际图数（不再写死 5、不误报“未齐”）
  const expectedImages = platformId === "xhs" ? (Number(item.plannedImageCount) || images.length || 1) : images.length;
  const imageComplete = platformId !== "xhs" || images.length >= expectedImages;
  const availableTargets = publishTargets.filter((target) => target.id !== "topic-only" && target.id !== platformId);
  const createdAt = item.createdAt ? new Date(item.createdAt).toLocaleString() : zh("&#26410;&#35760;&#24405;&#26102;&#38388;");
  return `<article class="asset-item final-work-asset">
    <header class="final-work-head"><div><b>${escapeHtml(item.title)}</b><span>${escapeHtml(item.platform)} ${zh("&#29256;&#26412;")} / ${body.length} ${zh("&#23383;&#27491;&#25991;")} / ${platformId === "xhs" ? `${images.length}/${expectedImages}` : images.length} ${zh("&#24352;&#22270;&#29255;")} / ${escapeHtml(createdAt)}</span></div><em class="asset-status-pill ${escapeHtml(imageComplete ? status.tone : "warn")}">${escapeHtml(imageComplete ? status.label : "图片未齐")}</em></header>
    ${!imageComplete ? `<div class="status-strip warn">这条小红书图文只保存了 ${images.length}/${expectedImages} 张图片，不是完整可发布成稿。请回今日工作台用同一个 jobId 补齐后再保存覆盖。</div>` : ""}
    <p><strong>${zh("&#22797;&#29992;&#27597;&#39064;&#65306;")}</strong>${escapeHtml(item.topic || zh("&#26410;&#35760;&#24405;"))}</p>
    <p><strong>${zh("&#25286;&#35299;&#36164;&#20135;&#65306;")}</strong>${escapeHtml(item.extractedAssets?.structure || zh("&#24453;&#25286;&#35299;"))}</p>
    <details class="asset-delivery-panel"><summary><b>${zh("&#24179;&#21488;&#21457;&#24067;&#25104;&#31295;")}</b><span>${zh("&#23637;&#24320;&#26597;&#30475;&#27491;&#25991;&#65292;&#25353;&#38062;&#21487;&#30452;&#25509;&#22797;&#21046;&#12290;")}</span></summary><pre>${escapeHtml(bodyPreview || zh("&#36825;&#26465;&#20316;&#21697;&#27809;&#26377;&#20445;&#23384;&#21040;&#27491;&#25991;&#12290;"))}</pre><div class="asset-action-row"><button class="primary" type="button" data-copy-final-body="${escapeHtml(item.id)}">${zh("&#22797;&#21046;&#23436;&#25972;&#25991;&#26696;")}</button><button class="secondary" type="button" data-copy-final-images="${escapeHtml(item.id)}" ${images.length ? "" : "disabled"}>${zh("&#22797;&#21046;&#22270;&#29255;&#38142;&#25509;")}</button></div></details>
    ${images.length ? "" : `<div class="status-strip warn">${zh("&#36825;&#26465;&#20316;&#21697;&#27809;&#26377;&#20445;&#23384;&#22270;&#29255;&#12290;")}</div>`}
    <div class="xhs-generated-grid asset-image-grid">${images.slice(0, 5).map((url, index) => `<div class="asset-image-tile"><a href="${escapeHtml(url)}" target="_blank" rel="noreferrer"><img src="${escapeHtml(url)}" alt="P${index + 1}" loading="lazy" /><span>P${index + 1}</span></a><div class="asset-image-actions"><button class="secondary" type="button" data-copy-image-url="${escapeHtml(url)}">${zh("&#22797;&#21046;&#38142;&#25509;")}</button></div></div>`).join("")}</div>
    <div class="asset-usage-panel"><b>${zh("&#19979;&#19968;&#27493;&#24590;&#20040;&#29992;")}</b><ol><li><strong>${zh("&#32487;&#32493;&#29983;&#20135;&#65306;")}</strong>${zh("&#25226;&#21516;&#19968;&#20010;&#27597;&#39064;&#25913;&#25104;&#21478;&#19968;&#20010;&#24179;&#21488;&#29256;&#26412;&#12290;")}</li><li><strong>${zh("&#21457;&#24067;&#22797;&#30424;&#65306;")}</strong>${zh("&#21457;&#20986;&#21435;&#21518;&#34917;&#25968;&#25454;&#65292;&#21028;&#26029;&#26159;&#21542;&#20540;&#24471;&#32487;&#32493;&#20570;&#12290;")}</li><li><strong>${zh("&#27785;&#28096;&#36164;&#20135;&#65306;")}</strong>${zh("&#25286;&#36827;&#26631;&#39064;&#24211;&#12289;&#32467;&#26500;&#24211;&#21644;&#22270;&#25991;&#39118;&#26684;&#24211;&#12290;")}</li></ol></div>
    ${renderLongkaPredictionPanel(item)}
    <div class="asset-publish-panel"><b>${zh("&#21457;&#24067;&#30331;&#35760;")}</b><em>${publishRecord.status === "published" ? `${zh("&#24050;&#21457;&#24067;&#65306;")}${escapeHtml(publishRecord.platform || item.platform)} ${escapeHtml(formatShortDate(publishRecord.publishedAt))}` : zh("&#20316;&#21697;&#21457;&#20986;&#21435;&#21518;&#65292;&#22312;&#36825;&#37324;&#22635;&#24179;&#21488;&#12289;&#38142;&#25509;&#21644;&#26102;&#38388;&#12290;")}</em>${isEditingPublish ? renderPublishRecordForm(item) : ""}</div>
    <div class="metric-row"><span>${zh("&#25104;&#31295;&#20316;&#21697;")}</span><span>${zh("&#22797;&#29992;&#27597;&#39064;")}</span><span>${zh("&#24453;&#34917;&#21457;&#24067;&#25968;&#25454;")}</span></div>
    <div class="asset-review-panel"><b>${zh("&#21457;&#24067;&#22797;&#30424;&#25968;&#25454;")}</b><em>${zh("&#31532;&#19968;&#29256;&#30001;&#36816;&#33829;&#21457;&#24067;&#21518;&#25163;&#21160;&#22635;&#20889;&#12290;")}</em><div class="asset-review-grid"><span>${zh("&#38405;&#35835;/&#25773;&#25918;")} <strong>${views || pending}</strong></span><span>${zh("&#28857;&#36190;")} <strong>${likes || pending}</strong></span><span>${zh("&#25910;&#34255;")} <strong>${saves || pending}</strong></span><span>${zh("&#35780;&#35770;")} <strong>${comments || pending}</strong></span><span>${zh("&#36716;&#21457;")} <strong>${shares || pending}</strong></span><span>${zh("&#25910;&#34255;&#29575;")} <strong>${saveRate}</strong></span><span>${zh("&#20114;&#21160;&#29575;")} <strong>${engageRate}</strong></span></div>${isEditing ? renderPublishMetricsForm(item) : `<p>${escapeHtml(buildReviewConclusion(item))}</p>`}</div>
    <div class="asset-reuse-panel"><b>${zh("&#36873;&#25321;&#19979;&#19968;&#20010;&#24179;&#21488;&#29256;&#26412;")}</b><span>${zh("&#20445;&#30041;&#21516;&#19968;&#20010;&#27597;&#39064;&#65292;&#20294;&#25353;&#30446;&#26631;&#24179;&#21488;&#37325;&#20889;&#12290;")}</span><div class="asset-action-row">${availableTargets.map((target) => `<button class="secondary" type="button" data-reuse-work="${escapeHtml(item.id)}" data-reuse-target="${escapeHtml(target.id)}">${zh("&#25913;&#25104;")}${escapeHtml(target.title)}</button>`).join("")}</div></div>
    <div class="asset-action-row"><button class="secondary" type="button" data-edit-publish="${escapeHtml(item.id)}">${isEditingPublish ? zh("&#25910;&#36215;&#21457;&#24067;&#34920;") : zh("&#30331;&#35760;&#24050;&#21457;&#24067;")}</button><button class="secondary" type="button" data-edit-metrics="${escapeHtml(item.id)}">${isEditing ? zh("&#25910;&#36215;&#25968;&#25454;&#34920;") : zh("&#34917;&#21457;&#24067;&#25968;&#25454;")}</button><button class="secondary" type="button" data-label-sample="${escapeHtml(item.id)}" data-sample-label="positive">${zh("&#26631;&#25104;&#27491;&#20363;")}</button><button class="secondary" type="button" data-label-sample="${escapeHtml(item.id)}" data-sample-label="negative">${zh("&#26631;&#25104;&#21453;&#20363;")}</button><button class="secondary" type="button" data-deconstruct-work="${escapeHtml(item.id)}">${zh("&#25286;&#25104;&#26631;&#39064;/&#32467;&#26500;&#36164;&#20135;")}</button></div>
  </article>`;
}
function inferPlatformIdFromTitle(title = "") {
  if (/小红书/.test(title)) return "xhs";
  if (/公众号|长文/.test(title)) return "wechat-article";
  if (/抖音/.test(title)) return "douyin";
  if (/视频号/.test(title)) return "video-account";
  if (/朋友圈/.test(title)) return "moments";
  return "";
}

function renderLongkaPredictionPanel(item) {
  const prediction = item.prediction || buildLongkaPredictionSnapshot({ topic: item, target: { id: item.platformId }, body: item.body, images: item.images });
  const calibration = item.calibration || buildLongkaCalibrationSnapshot(prediction);
  const factors = Array.isArray(prediction.factors) ? prediction.factors : [];
  const status = calibration.status === "reviewed" ? zh("&#24050;&#22797;&#30424;") : zh("&#24453;&#22797;&#30424;");
  return `<div class="asset-prediction-panel">
    <div class="asset-prediction-head">
      <div><b>${zh("&#21457;&#24067;&#21069;&#21028;&#26029;")}</b><span>${zh("&#20445;&#23384;&#20316;&#21697;&#26102;&#20889;&#20837;&#65292;&#21457;&#24067;&#21518;&#19981;&#22238;&#25913;&#65292;&#21482;&#36861;&#21152;&#22797;&#30424;&#12290;")}</span></div>
      <strong>${escapeHtml(prediction.score || 0)}</strong>
    </div>
    <div class="asset-review-grid">
      <span>${zh("&#39044;&#27979;&#26723;&#20301;")} <strong>${escapeHtml(prediction.bucket || zh("&#26410;&#35760;&#24405;"))}</strong></span>
      <span>${zh("&#26657;&#20934;&#29366;&#24577;")} <strong>${escapeHtml(status)}</strong></span>
      <span>${zh("&#38145;&#23450;&#26102;&#38388;")} <strong>${escapeHtml(formatShortDate(prediction.predictedAt))}</strong></span>
    </div>
    <p>${escapeHtml(prediction.reason || zh("&#36825;&#26465;&#20316;&#21697;&#32570;&#23569;&#21457;&#24067;&#21069;&#21028;&#26029;&#12290;"))}</p>
    ${factors.length ? `<div class="prediction-factor-list">${factors.map((factor) => `<span><b>${escapeHtml(factor.name)}</b><em>${escapeHtml(factor.score)}</em><small>${escapeHtml(factor.note || "")}</small></span>`).join("")}</div>` : ""}
    <div class="asset-calibration-result"><b>${zh("&#22797;&#30424;&#26657;&#20934;")}</b><span>${escapeHtml(calibration.conclusion || buildCalibrationConclusion(item))}</span></div>
  </div>`;
}

function renderPublishRecordForm(item) {
  const record = item.publishRecord || {};
  return `<div class="publish-record-form" data-publish-form="${escapeHtml(item.id)}">
    <label>${zh("&#21457;&#24067;&#24179;&#21488;")}<input type="text" data-publish-field="platform" value="${escapeHtml(record.platform || item.platform || "")}" placeholder="${zh("&#20363;&#65306;&#23567;&#32418;&#20070;")}"></label>
    <label>${zh("&#21457;&#24067;&#38142;&#25509;")}<input type="url" data-publish-field="url" value="${escapeHtml(record.url || "")}" placeholder="https://"></label>
    <label>${zh("&#21457;&#24067;&#26102;&#38388;")}<input type="datetime-local" data-publish-field="publishedAt" value="${escapeHtml(toDatetimeLocalValue(record.publishedAt))}"></label>
    <label>${zh("&#25805;&#20316;&#20154;")}<input type="text" data-publish-field="operator" value="${escapeHtml(record.operator || "")}" placeholder="${zh("&#20363;&#65306;&#23567;&#22969;")}"></label>
    <label class="wide">${zh("&#21457;&#24067;&#35760;&#24405;")}<input type="text" data-publish-field="note" value="${escapeHtml(record.note || "")}" placeholder="${zh("&#20363;&#65306;&#23553;&#38754;&#29992;&#31532; 1 &#24352;&#65292;&#26631;&#39064;&#26410;&#25913;")}"></label>
    <button class="primary" type="button" data-save-publish="${escapeHtml(item.id)}">${zh("&#20445;&#23384;&#21457;&#24067;&#30331;&#35760;&#24182;&#21516;&#27493;")}</button>
  </div>`;
}

function formatShortDate(value) {
  if (!value) return zh("&#26410;&#35760;&#24405;");
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return String(value).slice(0, 10);
  }
}

function toDatetimeLocalValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function renderPublishMetricsForm(item) {
  const metrics = item.publishMetrics || {};
  const calibration = item.calibration || {};
  return `<div class="publish-metrics-form" data-metrics-form="${escapeHtml(item.id)}">
    <label>${zh("&#38405;&#35835;/&#25773;&#25918;")}<input type="number" min="0" data-metric-field="views" value="${escapeHtml(metrics.views || "")}"></label>
    <label>${zh("&#28857;&#36190;")}<input type="number" min="0" data-metric-field="likes" value="${escapeHtml(metrics.likes || "")}"></label>
    <label>${zh("&#25910;&#34255;")}<input type="number" min="0" data-metric-field="saves" value="${escapeHtml(metrics.saves || "")}"></label>
    <label>${zh("&#35780;&#35770;")}<input type="number" min="0" data-metric-field="comments" value="${escapeHtml(metrics.comments || "")}"></label>
    <label>${zh("&#36716;&#21457;")}<input type="number" min="0" data-metric-field="shares" value="${escapeHtml(metrics.shares || "")}"></label>
    <label>${zh("&#23454;&#38469;&#34920;&#29616;&#26723;&#20301;")}<select data-metric-field="actualBucket">
      ${["", zh("&#36229;&#39044;&#26399;"), zh("&#31526;&#21512;&#39044;&#26399;"), zh("&#19968;&#33324;"), zh("&#20302;&#20110;&#39044;&#26399;")].map((value) => `<option value="${escapeHtml(value)}" ${value === calibration.actualBucket ? "selected" : ""}>${value || zh("&#24453;&#21028;&#26029;")}</option>`).join("")}
    </select></label>
    <label class="wide">${zh("&#22797;&#30424;&#35760;&#24405;")}<input type="text" data-metric-field="note" value="${escapeHtml(metrics.note || "")}" placeholder="${zh("&#20363;&#65306;&#25910;&#34255;&#39640;&#65292;&#35780;&#35770;&#20302;&#65292;&#19979;&#27425;&#22686;&#21152;&#20114;&#21160;&#25552;&#38382;")}"></label>
    <label class="wide">${zh("&#26032;&#23398;&#21040;&#30340;&#19968;&#26465;&#35268;&#24459;")}<input type="text" data-metric-field="learning" value="${escapeHtml(calibration.learning || "")}" placeholder="${zh("&#20363;&#65306;&#36825;&#31867;&#27597;&#39064;&#26356;&#36866;&#21512;&#28165;&#21333;&#22411;&#39318;&#23631;")}"></label>
    <button class="primary" type="button" data-save-metrics="${escapeHtml(item.id)}">${zh("&#20445;&#23384;&#22797;&#30424;&#24182;&#21516;&#27493;")}</button>
  </div>`;
}

function buildReviewConclusion(item) {
  const metrics = item.publishMetrics || {};
  const views = Number(metrics.views || 0);
  if (!views) return zh("&#36824;&#27809;&#26377;&#21457;&#24067;&#25968;&#25454;&#12290;&#21457;&#24067;&#21518;&#34917;&#20837;&#38405;&#35835;&#12289;&#28857;&#36190;&#12289;&#25910;&#34255;&#12289;&#35780;&#35770;&#65292;&#31995;&#32479;&#20250;&#21028;&#26029;&#36825;&#20010;&#27597;&#39064;&#26159;&#21542;&#20540;&#24471;&#32487;&#32493;&#19968;&#40060;&#22810;&#21507;&#12290;");
  const saves = Number(metrics.saves || 0);
  const comments = Number(metrics.comments || 0);
  const saveRate = saves / Math.max(views, 1);
  if (metrics.note) return metrics.note;
  if (saveRate >= 0.03) return zh("&#25910;&#34255;&#29575;&#19981;&#38169;&#65306;&#36825;&#31867;&#27597;&#39064;&#36866;&#21512;&#32487;&#32493;&#25286;&#25104;&#28165;&#21333;&#12289;&#25945;&#31243;&#25110;&#38271;&#25991;&#12290;");
  if (comments >= 10) return zh("&#35780;&#35770;&#20449;&#21495;&#19981;&#38169;&#65306;&#20248;&#20808;&#22238;&#25910;&#35780;&#35770;&#37324;&#30340;&#29992;&#25143;&#38382;&#39064;&#65292;&#34917;&#36827;&#23458;&#25143;&#38382;&#39064;&#24211;&#12290;");
  return zh("&#25968;&#25454;&#19968;&#33324;&#65306;&#20808;&#20445;&#30041;&#20026;&#23545;&#29031;&#26679;&#26412;&#65292;&#21518;&#32493;&#23545;&#27604;&#26631;&#39064;&#12289;&#24320;&#22836;&#21644;&#22270;&#29255;&#39318;&#23631;&#38382;&#39064;&#12290;");
}

function buildCalibrationConclusion(item) {
  const metrics = item.publishMetrics || {};
  const views = Number(metrics.views || 0);
  if (!views) return zh("&#24453;&#21457;&#24067;&#21518;&#22238;&#22635;&#25968;&#25454;&#12290;");
  const likes = Number(metrics.likes || 0);
  const saves = Number(metrics.saves || 0);
  const comments = Number(metrics.comments || 0);
  const shares = Number(metrics.shares || 0);
  const saveRate = saves / Math.max(views, 1);
  const engageRate = (likes + saves + comments + shares) / Math.max(views, 1);
  const predictionScore = Number(item.prediction?.score || item.calibration?.predictedScore || 0);
  const actualStrong = saveRate >= 0.03 || engageRate >= 0.08 || comments >= 10;
  const actualWeak = saveRate < 0.01 && engageRate < 0.025 && comments < 3;
  if (predictionScore >= 75 && actualWeak) return zh("&#21457;&#24067;&#21069;&#21028;&#26029;&#20559;&#20048;&#35266;&#65306;&#19979;&#27425;&#37325;&#28857;&#22797;&#26597;&#26631;&#39064;&#38057;&#23376;&#12289;&#39318;&#23631;&#22270;&#21644;&#35805;&#39064;&#20855;&#20307;&#24230;&#12290;");
  if (predictionScore < 70 && actualStrong) return zh("&#23454;&#38469;&#34920;&#29616;&#22909;&#20110;&#39044;&#21028;&#65306;&#36825;&#31867;&#39064;&#26448;&#35201;&#34917;&#36827;&#27491;&#20363;&#24211;&#65292;&#21518;&#32493;&#21487;&#20197;&#25193;&#23637;&#25104;&#38271;&#25991;&#25110;&#35270;&#39057;&#33050;&#26412;&#12290;");
  if (actualStrong) return zh("&#21028;&#26029;&#22522;&#26412;&#21629;&#20013;&#65306;&#36825;&#20010;&#27597;&#39064;&#26377;&#22797;&#21033;&#20215;&#20540;&#65292;&#21487;&#32487;&#32493;&#20570;&#19968;&#40060;&#22810;&#21507;&#12290;");
  if (actualWeak) return zh("&#23454;&#38469;&#34920;&#29616;&#20559;&#24369;&#65306;&#20808;&#19981;&#25193;&#23637;&#65292;&#25226;&#23427;&#24403;&#20316;&#23545;&#29031;&#26679;&#26412;&#65292;&#22797;&#30424;&#20026;&#20160;&#20040;&#27809;&#26377;&#25171;&#20013;&#12290;");
  return zh("&#34920;&#29616;&#23646;&#20110;&#20013;&#38388;&#26723;&#65306;&#21487;&#20197;&#23567;&#33539;&#22260;&#25913;&#26631;&#39064;&#25110;&#25442;&#22270;&#20877;&#27979;&#19968;&#29256;&#12290;");
}

function toggleMetricsEditor(id) {
  state.editingMetricsWorkId = state.editingMetricsWorkId === id ? "" : id;
  renderAssetPage("assets");
}

function togglePublishEditor(id) {
  state.editingPublishWorkId = state.editingPublishWorkId === id ? "" : id;
  renderAssetPage("assets");
}

async function syncFinalWorkUpdate(updated) {
  state.finalWorks = state.finalWorks.map((item) => item.id === updated.id ? updated : item);
  persistWorkbenchSnapshot();
  const res = await fetch(apiPath("/api/final-works"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ work: updated }),
  });
  const result = await res.json();
  if (!res.ok || !result.ok) throw new Error(result.message || result.error || "sync_failed");
  state.finalWorks = state.finalWorks.map((item) => item.id === updated.id ? (result.work || updated) : item);
  persistWorkbenchSnapshot();
  return result.work || updated;
}

async function savePublishRecord(id) {
  const form = byId("assetBoard")?.querySelector(`[data-publish-form="${CSS.escape(id)}"]`);
  if (!form) return;
  const current = state.finalWorks.find((item) => item.id === id);
  if (!current) return;
  const record = {};
  form.querySelectorAll("[data-publish-field]").forEach((input) => {
    record[input.dataset.publishField] = input.value.trim();
  });
  const publishedAt = record.publishedAt ? new Date(record.publishedAt).toISOString() : new Date().toISOString();
  const updated = {
    ...current,
    publishRecord: buildPublishRecordSnapshot({
      ...current.publishRecord,
      ...record,
      status: "published",
      publishedAt,
      platform: record.platform || current.platform || "",
      registeredAt: new Date().toISOString(),
    }),
  };
  state.editingPublishWorkId = "";
  try {
    await syncFinalWorkUpdate(updated);
  } catch (error) {
    state.archiveMessage = `${zh("&#21457;&#24067;&#30331;&#35760;&#24050;&#20445;&#23384;&#21040;&#24403;&#21069;&#27983;&#35272;&#22120;&#65292;&#20294;&#21516;&#27493;&#21040; 122 &#22833;&#36133;&#65306;")}${error.message}`;
  }
  renderAssetPage("assets");
}

async function savePublishMetrics(id) {
  const form = byId("assetBoard")?.querySelector(`[data-metrics-form="${CSS.escape(id)}"]`);
  if (!form) return;
  const metrics = {};
  const calibrationInput = {};
  form.querySelectorAll("[data-metric-field]").forEach((input) => {
    const key = input.dataset.metricField;
    const value = input.type === "number" ? Number(input.value || 0) : input.value.trim();
    if (key === "actualBucket" || key === "learning") calibrationInput[key] = value;
    else metrics[key] = value;
  });
  const current = state.finalWorks.find((item) => item.id === id);
  if (!current) return;
  const reviewedAt = new Date().toISOString();
  const updated = {
    ...current,
    publishMetrics: metrics,
    reviewedAt,
  };
  updated.calibration = {
    ...buildLongkaCalibrationSnapshot(updated.prediction || {}),
    ...(current.calibration || {}),
    ...calibrationInput,
    status: "reviewed",
    reviewedAt,
    conclusion: buildCalibrationConclusion(updated),
  };
  state.editingMetricsWorkId = "";
  try {
    await syncFinalWorkUpdate(updated);
  } catch (error) {
    state.archiveMessage = `${zh("&#22797;&#30424;&#24050;&#20445;&#23384;&#21040;&#24403;&#21069;&#27983;&#35272;&#22120;&#65292;&#20294;&#21516;&#27493;&#21040; 122 &#22833;&#36133;&#65306;")}${error.message}`;
  }
  renderAssetPage("assets");
}

async function labelFinalWorkSample(id, label) {
  const current = state.finalWorks.find((item) => item.id === id);
  if (!current) return;
  const updated = {
    ...current,
    sampleLabel: label === "negative" ? "negative" : "positive",
    sampleLabeledAt: new Date().toISOString(),
  };
  try {
    await syncFinalWorkUpdate(updated);
  } catch (error) {
    state.archiveMessage = `${zh("&#26679;&#26412;&#26631;&#35760;&#24050;&#20445;&#23384;&#21040;&#24403;&#21069;&#27983;&#35272;&#22120;&#65292;&#20294;&#21516;&#27493;&#21040; 122 &#22833;&#36133;&#65306;")}${error.message}`;
  }
  renderAssetPage("assets");
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand("copy");
  textarea.remove();
  return ok;
}

async function copyFinalWorkBody(id) {
  const work = state.finalWorks.find((item) => item.id === id);
  if (!work?.body) {
    alert("这条作品没有保存正文。");
    return;
  }
  await copyTextToClipboard(`${work.title || ""}\n\n${cleanPublishBodyForCopy(work.body)}`.trim());
  alert("已复制完整文案。");
}

// 下载单张图:优先 blob 抓取强制保存(同源/允许CORS必成),失败回退直链点击(浏览器自行处理/手机可长按)。
async function downloadOneImage(url, name) {
  try {
    const resp = await fetch(url, { mode: "cors" });
    if (!resp.ok) throw new Error("http " + resp.status);
    const blob = await resp.blob();
    const obj = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = obj; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(obj), 5000);
  } catch {
    const a = document.createElement("a");
    a.href = url; a.download = name; a.target = "_blank"; a.rel = "noreferrer";
    document.body.appendChild(a); a.click(); a.remove();
  }
}

async function copyFinalWorkImages(id) {
  const work = state.finalWorks.find((item) => item.id === id);
  const images = Array.isArray(work?.images) ? work.images : [];
  if (!images.length) {
    alert("这条作品没有保存图片链接。");
    return;
  }
  await copyTextToClipboard(images.map((url, index) => `P${index + 1}: ${url}`).join("\n"));
  alert(`已复制 ${images.length} 张图片链接。`);
}

function reuseFinalWork(id, target) {
  const work = state.finalWorks.find((item) => item.id === id);
  if (!work) return;
  state.publishTarget = target;
  const reuseTopic = {
    id: `reuse-${work.id}-${target}`,
    title: work.title,
    theme: work.topic || work.title,
    platform: work.platform,
    keyword: state.keywords,
    url: work.sourceUrl || "",
    content: [
      `原成稿标题：${work.title}`,
      `原平台：${work.platform}`,
      `母题：${work.topic || work.title}`,
      `原正文：${work.body}`,
      `原结构：${work.extractedAssets?.structure || ""}`,
      `复用要求：按 ${publishTargets.find((item) => item.id === target)?.title || target} 重新生成，保留母题，不沿用原平台正文结构。`,
    ].join("\n"),
    pain: `这个母题已经做过 ${work.platform || "一个平台"} 成稿，现在要改写成 ${publishTargets.find((item) => item.id === target)?.title || target}。`,
    reason: "来自已完成作品资产的一鱼多吃复用。",
    reuse: "必须重新匹配目标平台：标题、结构、正文长度、表达方式和转化动作都要变化。",
    metrics: work.publishMetrics || {},
    raw: work,
  };
  state.topics = [reuseTopic, ...state.topics.filter((item) => item.id !== reuseTopic.id)].slice(0, 10);
  state.selectedTopicId = reuseTopic.id;
  state.titleAssets = [];
  state.titleAssetMessage = "";
  state.titleAssetKey = "";
  state.titleChoices = buildCleanTitleChoices(reuseTopic, []);
  state.titleChoiceKey = currentTitleChoiceKey(reuseTopic);
  state.selectedTitle = "";
  state.draft = "";
  state.improvedDraft = "";
  state.copyConfirmed = false;
  state.copyVersions = [];
  state.currentCopyVersionId = "";
  state.confirmedCopyVersionId = "";
  state.xhsCardManifest = null;
  state.draftMeta = null;
  state.draftReview = null;
  state.archiveMessage = `已把《${work.title}》作为母题切到 ${currentTarget().title}。请先选新标题，再按该平台重写正文和配图策略。`;
  setRoute("today");
  setStep(6);
}

function deconstructFinalWork(id) {
  const work = state.finalWorks.find((item) => item.id === id);
  if (!work) return;
  state.archiveMessage = `已拆解：标题《${work.extractedAssets?.title || work.title}》、结构《${work.extractedAssets?.structure || "未记录"}》、图文风格《${work.extractedAssets?.visualStyle || "未记录"}》。后续会正式写入标题库和结构库。`;
  renderAssetPage("assets");
}

// 对标账号起锚:填几条对标爆款 → 拆解+起锚出评分方向/指纹/选题 → 存对标库
function renderBenchmarkPanel() {
  const target = byId("benchmarkPanel");
  if (!target) return;
  const rows = (n) => Array.from({ length: n }, (_, i) => `
    <div class="bm-sample" style="border:1px solid #e6ddd0;border-radius:8px;padding:12px;margin-bottom:8px;background:#fff;">
      <div style="font-size:13px;color:#3a2c1c;font-weight:600;margin-bottom:6px;">对标爆款 ${i + 1}${i < 3 ? "" : "(可不填)"}</div>
      <label style="font-size:12px;color:#7a6a55;">① 帖子正文 —— 打开这条帖子,把<b>文字内容全选复制</b>粘到这里:</label>
      <textarea class="bm-script" rows="3" placeholder="例:我裸辞那年做对了三件事…(粘对标帖子的正文文字)" style="width:100%;box-sizing:border-box;border:1px solid #e6ddd0;border-radius:6px;padding:6px;margin-top:3px;"></textarea>
      <div style="display:flex;gap:8px;margin-top:8px;align-items:flex-end;">
        <label style="flex:1;font-size:12px;color:#7a6a55;">② 这条的数据(帖子里看得到,可不填)<input class="bm-metrics" placeholder="例:赞2.1万 藏3.4万 评890" style="width:100%;box-sizing:border-box;border:1px solid #e6ddd0;border-radius:6px;padding:6px;font-size:13px;margin-top:3px;"></label>
        <label style="font-size:12px;color:#7a6a55;">③ 你觉得这条火不火<select class="bm-impression" style="display:block;border:1px solid #e6ddd0;border-radius:6px;padding:6px;margin-top:3px;"><option value="高">很火/想抄</option><option value="中" selected>一般</option><option value="低">不太行</option></select></label>
      </div>
    </div>`).join("");
  target.innerHTML = `
    <div style="border:1px solid #e6ddd0;border-radius:12px;padding:16px;background:#faf6ef;">
      <div style="background:#fff;border:1px solid #e6ddd0;border-radius:8px;padding:12px;margin-bottom:12px;font-size:13px;line-height:1.7;color:#5a4a40;">
        <b style="color:#3a2c1c;">怎么用(以小红书为例,3 步):</b><br>
        1️⃣ 打开小红书,搜到你想学的<b>对标博主</b>,进 ta 的<b>主页</b> —— 主页最上面那个<b>大字名字</b>就是「账号名」(例:<b>快失业的AI设计师</b>;底下"小红书号:545958787"那串数字<b>不用填</b>)。<br>
        2️⃣ 在 ta 主页点「笔记」,挑<b>最火的 3-5 条</b>(看点赞高的),<b>点进每一条</b>。<br>
        3️⃣ 每条笔记里:把<b>正文文字复制</b>粘到下面框 + 记下这条的<b>点赞/收藏数</b> + 选 ta 火不火 → 点「起锚」。
      </div>
      <label style="font-size:13px;color:#3a2c1c;font-weight:600;">① 对标账号名(博主主页顶上的昵称,不是数字号):</label>
      <div style="display:flex;gap:8px;align-items:center;margin:4px 0 12px;">
        <input id="bmAccount" placeholder="例:快失业的AI设计师(主页那个大字名字)" style="flex:1;border:1px solid #d8cdba;border-radius:8px;padding:9px 12px;">
        <button class="primary" data-bm-anchor>🎯 起锚</button>
      </div>
      <div style="color:#9a8a70;font-size:12px;margin-bottom:8px;">账号名只是个标签(方便你记是谁)。系统不自动爬,稿子你手动粘(用自己号正常浏览复制,系统不碰平台、不会封号)。至少填 1 条,填 3-5 条更准。</div>
      ${rows(4)}
      <div id="bmStatus" style="margin-top:8px;font-size:13px;"></div>
      <div id="bmResult" style="margin-top:10px;"></div>
    </div>
    <div style="margin-top:16px;"><b style="color:#3a2c1c;">已起锚的对标库</b><div id="bmList" style="margin-top:8px;"></div></div>`;
  target.querySelector("[data-bm-anchor]")?.addEventListener("click", () => doBenchmarkAnchor());
  loadBenchmarkList();
}

async function doBenchmarkAnchor() {
  const target = byId("benchmarkPanel"); if (!target) return;
  const account = byId("bmAccount")?.value.trim() || "对标账号";
  const samples = [...target.querySelectorAll(".bm-sample")].map((el) => ({
    script: el.querySelector(".bm-script")?.value.trim() || "",
    metrics: el.querySelector(".bm-metrics")?.value.trim() || "",
    impression: el.querySelector(".bm-impression")?.value || "中",
  })).filter((s) => s.script);
  const status = byId("bmStatus");
  if (!samples.length) { if (status) status.innerHTML = `<span style="color:#b4231f;">至少填一条对标作品的稿子。</span>`; return; }
  const ws = state.hot30Workspace || state.industry || state.businessLine || "";
  if (status) status.innerHTML = `正在拆解 ${samples.length} 条对标作品起锚…(每条约 10-20 秒)`;
  try {
    const d = await (await fetch(apiPath("/api/benchmark/anchor/start"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ account, workspace: ws, samples }) })).json();
    const jobId = d.jobId;
    if (!jobId) throw new Error(d.message || "启动失败");
    for (let i = 0; i < 80; i += 1) {
      await new Promise((r) => setTimeout(r, 4000));
      const sr = await (await fetch(apiPath(`/api/benchmark/anchor/status?jobId=${jobId}`))).json();
      if (status) status.innerHTML = `拆解中 ${sr.done || 0}/${sr.total || samples.length}…`;
      if (sr.status === "done") { renderBenchmarkResult(sr.result); if (status) status.innerHTML = "✅ 起锚完成,已存进对标库"; loadBenchmarkList(); return; }
      if (sr.status === "error") { if (status) status.innerHTML = `<span style="color:#b4231f;">起锚失败:${escapeHtml(sr.error || "")}</span>`; return; }
    }
    if (status) status.innerHTML = `<span style="color:#b4231f;">起锚超时,稍后在对标库看结果。</span>`;
  } catch (e) { if (status) status.innerHTML = `<span style="color:#b4231f;">起锚失败:${escapeHtml(e.message)}</span>`; }
}

function renderBenchmarkResult(r) {
  const box = byId("bmResult"); if (!box || !r) return;
  const sig = (r.signals || []).map((s) => `<span style="display:inline-block;margin:2px;padding:3px 9px;border-radius:10px;font-size:12px;background:${s.verdict === "重要" ? "#e6f4ea" : s.verdict === "不显著" ? "#f3ede1" : "#eee"};color:${s.verdict === "重要" ? "#1a7f37" : "#7a6a55"};">${escapeHtml(s.dim)}:${escapeHtml(s.verdict)}</span>`).join("");
  box.innerHTML = `<div style="border:1px solid #cfe6d4;border-radius:10px;padding:12px;background:#fff;">
    <b>「${escapeHtml(r.account || "对标账号")}」的评分方向(系统据此判稿)</b><div style="margin:6px 0;">${sig}</div>
    ${(r.hooks || []).length ? `<div style="font-size:13px;margin-top:6px;"><b>常用钩子:</b>${(r.hooks || []).map(escapeHtml).join(" / ")}</div>` : ""}
    ${(r.patterns || []).length ? `<div style="font-size:13px;margin-top:6px;"><b>可抄写法:</b><ul style="margin:4px 0 0 18px;">${(r.patterns || []).map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul></div>` : ""}
    ${(r.topics || []).length ? `<div style="font-size:13px;margin-top:6px;"><b>选题方向:</b>${(r.topics || []).map(escapeHtml).join(" · ")}</div>` : ""}
  </div>`;
}

async function loadBenchmarkList() {
  const box = byId("bmList"); if (!box) return;
  try {
    const ws = state.hot30Workspace || state.industry || state.businessLine || "";
    const d = await (await fetch(apiPath(`/api/benchmark/list?workspace=${encodeURIComponent(ws)}`))).json();
    const items = d.items || [];
    box.innerHTML = items.length ? items.map((it) => {
      const imp = (it.signals || []).filter((s) => s.verdict === "重要").map((s) => s.dim).join(" / ");
      return `<div style="border:1px solid #e6ddd0;border-radius:8px;padding:10px;margin-bottom:6px;background:#fff;"><b>${escapeHtml(it.account || "对标账号")}</b> <span style="color:#9a8a70;font-size:12px;">${it.sample_count || 0} 条 · ${String(it.created_at || "").slice(0, 10)}</span><div style="font-size:12px;color:#5a4a40;margin-top:4px;">重要维度:${escapeHtml(imp || "—")}</div></div>`;
    }).join("") : `<div class="muted-text">还没起锚过对标账号。上面填几条爆款,点起锚。</div>`;
  } catch (e) { box.innerHTML = `<div class="muted-text">读取对标库失败。</div>`; }
}

// 作品记录：显示真实成品(从122加载) + 已保存/已发布 + 每条「改成别的平台」(一鱼多吃)
async function renderRecords() {
  const target = byId("recordBoard");
  if (!target) return;
  target.innerHTML = `<div class="empty-state"><b>正在读取作品记录…</b><span>从 122 作品库读取你做过的成品。</span></div>`;
  try {
    const res = await fetch(apiPath("/api/final-works"));
    if (res.ok) {
      const result = await res.json();
      const remote = Array.isArray(result.works) ? result.works : (Array.isArray(result.finalWorks) ? result.finalWorks : []);
      const m = new Map();
      [...remote, ...(Array.isArray(state.finalWorks) ? state.finalWorks : [])].forEach((w) => { if (w?.id) m.set(w.id, w); });
      state.finalWorks = [...m.values()].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    }
  } catch (e) { /* 122 读不到就用本机缓存 */ }
  paintRecords();
}

// 预估 vs 实际 一句话(大白话,不露rubric/composite等黑话)
function normalizePredScore(raw) {
  let p = Number(raw || 0);
  if (p > 0 && p <= 10) p = Math.round(p * 10); // 0-10 制 → 0-100 制,统一显示/判准
  return p;
}
function calibText(pred, cal) {
  if (!cal) return "";
  const p = normalizePredScore(pred && (pred.composite != null ? pred.composite : pred.score));
  const win = !!cal.isWinner;
  if (!p) return win ? "出效果了" : "";
  if (p >= 70 && win) return "预估准 ✓";
  if (p >= 70 && !win) return "预估偏高了";
  if (p < 70 && win) return "低估了，实际更好";
  return "预估准（都一般）";
}

// 效果看板:已做/有数据/出效果 + 预估准度。异步填进 #cheatBoardStrip。
async function loadCheatBoard() {
  const el = byId("cheatBoardStrip");
  if (!el) return;
  try {
    const r = await fetch(apiPath("/api/cheat/board"));
    const d = await r.json();
    if (!d || !d.ok) { el.style.display = "none"; return; }
    const sig = d.rubricSignal;
    let note = "";
    if (typeof sig === "string") note = sig;
    else if (sig && typeof sig === "object") note = sig.note || sig.text || sig.verdict || sig.accuracy || "";
    if (!note && (d.withMetrics || 0) < 5) note = `再发布并复盘 ${Math.max(0, 5 - (d.withMetrics || 0))} 篇，就能看出预估准不准`;
    el.innerHTML = `<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;font-size:13px;color:#3a2c1c;background:#f3ede1;border-radius:10px;padding:10px 14px;">
      <b style="color:#7a6a55;">📊 效果看板</b>
      <span>已做 <b>${d.total || 0}</b> 篇</span>
      <span>有数据 <b>${d.withMetrics || 0}</b> 篇</span>
      <span>出效果 <b style="color:#1a7f37;">${d.winners || 0}</b> 篇</span>
      ${note ? `<span style="color:#7a6a55;">${escapeHtml(note)}</span>` : ""}
    </div>`;
  } catch (e) { el.style.display = "none"; }
}

// 获客短视频脚本结果渲染(大白话,不露skill名)
function acqScriptHtml(d) {
  const sp = d.sellingPoints || {};
  const shots = Array.isArray(d.shots) ? d.shots : [];
  const terms = Array.isArray(d.searchTerms) ? d.searchTerms : [];
  const row = (label, val) => val ? `<div style="margin-top:6px;"><b>${label}：</b>${escapeHtml(String(val))}</div>` : "";
  return `<div style="font-size:12px;line-height:1.7;color:#3a2c1c;background:#fbf7f0;border-radius:8px;padding:12px;">
    <div style="color:${d.hadRealVoices ? "#1a7f37" : "#b08a6a"};margin-bottom:4px;">${d.hadRealVoices ? "✅ 用了该业务线真实评论料" : "⚠️ 该业务线暂无真实料，先出通用脚本（建议先采评论补料）"}</div>
    ${row("定位", d.positioning)}
    ${row("锁定人群", d.targetAudience)}
    ${row("🎣 钩子（前3秒）", d.hook)}
    <div style="margin-top:6px;"><b>口播正文：</b><pre style="white-space:pre-wrap;font-family:inherit;background:#fff;border-radius:6px;padding:8px;margin:4px 0;">${escapeHtml(d.body || "")}</pre></div>
    ${(sp.product || sp.service || sp.vsPeers || sp.persona) ? `<div style="margin-top:6px;"><b>卖点：</b>${escapeHtml([sp.product, sp.service, sp.vsPeers, sp.persona].filter(Boolean).join(" / "))}</div>` : ""}
    ${row("📣 结尾引导", d.cta)}
    ${shots.length ? `<div style="margin-top:6px;"><b>分镜：</b><ol style="margin:4px 0;padding-left:18px;">${shots.map((s) => `<li>${escapeHtml(s.scene || "")}${s.line ? ` —— “${escapeHtml(s.line)}”` : ""}</li>`).join("")}</ol></div>` : ""}
    ${terms.length ? row("🔍 搜索词", terms.join(" / ")) : ""}
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
      <button class="secondary" data-copy-acq style="font-size:12px;padding:5px 14px;">📋 复制全文</button>
      <button class="primary" data-gen-acq-video style="font-size:12px;padding:5px 14px;background:#1a7f37;border-color:#1a7f37;">🎬 生成成品视频（自动配音+画面+字幕，不用实拍）</button>
    </div>
    <div class="acq-video-result" style="margin-top:8px;"></div>
  </div>`;
}

// 获客脚本 → 成品视频:口播文字配音(MiniMax) + Pexels空镜画面 + 烧字幕 + ffmpeg拼,零实拍
async function generateAcqVideoInline(d, resultEl, ws) {
  if (!resultEl) return;
  const shots = Array.isArray(d.shots) && d.shots.length ? d.shots : [];
  let beats;
  if (shots.length) beats = shots.map((s) => ({ text: String(s.line || s.scene || "").trim() })).filter((b) => b.text);
  else beats = String(d.body || "").split(/(?<=[。！？!?\n])/).map((t) => t.trim()).filter((t) => t.length > 1).slice(0, 12).map((t) => ({ text: t }));
  if (!beats.length) { resultEl.innerHTML = `<span style="color:#c0392b;font-size:12px;">没有可合成的口播文本。</span>`; return; }
  resultEl.innerHTML = `<div style="font-size:12px;color:#7a6a55;">正在配音 + 配画面 + 烧字幕合成成品视频…（${beats.length} 段，约 1-3 分钟，别关页面）</div>`;
  try {
    const jobId = `acqvideo-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
    const startRes = await fetch(apiPath("/api/oral-video/compose/start"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jobId, beats, workspace: ws || "" }) });
    const start = await startRes.json().catch(() => ({}));
    if (!startRes.ok || !start.ok) throw new Error(start.message || start.error || `HTTP ${startRes.status}`);
    const realId = start.jobId || jobId;
    for (let round = 0; round < 120; round += 1) {
      await new Promise((r) => setTimeout(r, 5000));
      const r = await fetch(apiPath(`/api/oral-video/compose/status?jobId=${encodeURIComponent(realId)}`));
      const st = await r.json().catch(() => ({}));
      if (st.status === "done" && st.url) {
        resultEl.innerHTML = `<video src="${escapeHtml(st.url)}" controls style="max-width:240px;border-radius:8px;display:block;"></video><div style="margin-top:4px;font-size:12px;"><a href="${escapeHtml(st.url)}" download="获客视频.mp4">⬇️ 下载成品视频</a> · 约 ${st.totalSeconds || 0} 秒，${st.withVideo || 0} 段真实画面</div>`;
        return;
      }
      if (st.status === "error") throw new Error(st.error || "合成失败");
      resultEl.innerHTML = `<div style="font-size:12px;color:#7a6a55;">合成中…（${st.done || 0}/${st.total || beats.length} 段）</div>`;
    }
    resultEl.innerHTML = `<div style="font-size:12px;color:#7a6a55;">合成耗时较久，稍后再点一次或刷新查看。</div>`;
  } catch (e) { resultEl.innerHTML = `<span style="color:#c0392b;font-size:12px;">合成失败：${escapeHtml(e.message)}</span>`; }
}
function buildAcqCopyText(d) {
  const shots = Array.isArray(d.shots) ? d.shots : [];
  const terms = Array.isArray(d.searchTerms) ? d.searchTerms : [];
  return [
    d.positioning ? `【定位】${d.positioning}` : "",
    d.hook ? `【钩子】${d.hook}` : "",
    "", d.body || "", "",
    d.cta ? `【结尾引导】${d.cta}` : "",
    shots.length ? "【分镜】\n" + shots.map((s, i) => `${i + 1}. ${s.scene || ""}${s.line ? ` | ${s.line}` : ""}`).join("\n") : "",
    terms.length ? `【搜索词】${terms.join(" / ")}` : "",
  ].filter(Boolean).join("\n");
}

// 作品记录的卡片(单条)
function recordCardHtml(w) {
  const pName = (p) => ((typeof publishTargets !== "undefined" && publishTargets.find((t) => t.id === p)?.title) || p || "");
  const published = w.publishRecord?.status === "published";
  const status = published ? "已发布" : "已保存";
  const titleText = String(w.title || w.theme || w.topic || "(无标题)").slice(0, 44);
  const imgs = Array.isArray(w.images) ? w.images.length : 0;
  const date = String(w.createdAt || "").slice(0, 10);
  const wpid = ((typeof publishTargets !== "undefined" && publishTargets.find((t) => t.id === w.platform || t.title === w.platform)?.id) || w.platform);
  const others = (typeof publishTargets !== "undefined" ? publishTargets : []).filter((t) => t.id !== wpid).slice(0, 4);
  // 数据闭环:系统预估 / 实际数据 / 准不准
  const pred = w.prediction || null;
  const rawScore = pred && (pred.composite != null ? pred.composite : (pred.score != null ? pred.score : ""));
  const predScore = rawScore === "" ? "" : normalizePredScore(rawScore);
  const predVerdict = pred ? String(pred.verdict || pred.bucket || "").slice(0, 40) : "";
  const mx = w.publishMetrics || null;
  const cal = w.calibration || null;
  const hasMetrics = !!(mx && (mx.likes != null || mx.views != null || mx.collects != null || mx.comments != null || mx.inquiries != null));
  return `<article class="asset-item" style="border:1px solid #e6ddd0;border-radius:10px;padding:14px;margin-bottom:10px;background:#fff;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
        <b style="font-size:15px;color:#3a2c1c;">${escapeHtml(titleText)}</b>
        <span style="font-size:12px;padding:2px 10px;border-radius:10px;background:${published ? "#e6f4ea" : "#f3ede1"};color:${published ? "#1a7f37" : "#7a6a55"};">${status}</span>
      </div>
      <div style="color:#9a8a70;font-size:12px;margin:6px 0;">${escapeHtml(pName(w.platform))}${imgs ? " · " + imgs + " 张图" : ""}${date ? " · " + date : ""}</div>
      <button class="secondary" data-toggle-detail="${escapeHtml(w.id)}" style="font-size:12px;padding:4px 10px;margin-top:4px;">📄 点开看正文+图</button>
      <div class="record-detail" data-detail="${escapeHtml(w.id)}" style="display:none;margin-top:10px;border-top:1px dashed #e6ddd0;padding-top:10px;">
        <div style="white-space:pre-wrap;font-size:13px;color:#3a2c1c;line-height:1.75;max-height:360px;overflow:auto;background:#fbf7f0;border-radius:8px;padding:12px;">${escapeHtml((typeof cleanPublishBodyForCopy === "function" ? cleanPublishBodyForCopy(w.body || "") : String(w.body || "")) || "(这条没存正文)")}</div>
        <div style="margin-top:8px;"><button class="secondary" data-copy-work="${escapeHtml(w.id)}" style="font-size:12px;padding:4px 10px;">📋 复制文案</button><span style="font-size:11px;color:#9a8a70;margin-left:8px;">标题+正文，粘到平台直接发</span></div>
        ${imgs ? `<div style="margin-top:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;"><button class="primary" data-download-selected="${escapeHtml(w.id)}" style="font-size:12px;padding:5px 12px;">⬇️ 一次性下载选中的图</button><button class="ghost" data-toggle-pick-all="${escapeHtml(w.id)}" style="font-size:11px;padding:3px 8px;">全选/全不选</button><span style="font-size:11px;color:#9a8a70;">默认全选 · 取消勾选就不下 · P1 是封面 · 手机也可长按图保存</span></div><div class="record-img-grid" data-img-grid="${escapeHtml(w.id)}" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">${(Array.isArray(w.images) ? w.images : []).slice(0, 9).map((url, i) => `<label style="width:92px;position:relative;display:block;cursor:pointer;"><input type="checkbox" class="record-img-pick" data-img-url="${escapeHtml(url)}" data-img-name="P${i + 1}.png" checked style="position:absolute;top:6px;left:6px;width:18px;height:18px;z-index:2;cursor:pointer;accent-color:#1a7f37;" /><a href="${escapeHtml(url)}" download="P${i + 1}.png" title="点击下载 P${i + 1}"><img src="${escapeHtml(url)}" alt="P${i + 1}" loading="lazy" style="width:92px;height:122px;object-fit:cover;border-radius:6px;border:1px solid #e6ddd0;" /><span style="display:block;text-align:center;font-size:11px;color:#7a6a55;">${i === 0 ? "封面" : "P" + (i + 1)}</span></a></label>`).join("")}</div>` : `<div style="font-size:12px;color:#b08a6a;margin-top:8px;">这条没存图片。</div>`}
        ${(Array.isArray(w.coverAlts) && w.coverAlts.length) ? `<div style="margin-top:12px;border-top:1px dashed #efe6d8;padding-top:8px;"><div style="font-size:12px;color:#7a6a55;margin-bottom:6px;">🖼 封面备选（生成时没选的，可下载 / 设为主封面 / 做A/B，没浪费）</div><div style="display:flex;gap:8px;flex-wrap:wrap;">${w.coverAlts.map((url, i) => `<div style="width:88px;"><a href="${escapeHtml(url)}" download="封面备选${i + 1}.png"><img src="${escapeHtml(url)}" alt="备选${i + 1}" loading="lazy" style="width:88px;height:117px;object-fit:cover;border-radius:6px;border:1px solid #e6ddd0;" /></a><button class="secondary" data-set-cover="${escapeHtml(w.id)}" data-set-cover-url="${escapeHtml(url)}" style="width:100%;margin-top:4px;font-size:11px;padding:3px;">设为主封面</button></div>`).join("")}</div></div>` : ""}
      </div>
      <div style="margin-top:8px;font-size:12px;color:#7a6a55;">用这个母题再做一篇：</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;">
        <button class="secondary" data-reuse-work="${escapeHtml(w.id)}" data-reuse-target="${escapeHtml(wpid)}" style="font-size:12px;padding:4px 10px;">✍️ 同平台换角度再写</button>
        ${others.map((t) => { const sfx = (t.id === "douyin" || t.id === "video-account") ? "脚本" : ""; return `<button class="secondary" data-reuse-work="${escapeHtml(w.id)}" data-reuse-target="${escapeHtml(t.id)}" style="font-size:12px;padding:4px 10px;">改成${escapeHtml(t.title)}${sfx}</button>`; }).join("")}
        <button class="secondary" data-gen-acq="${escapeHtml(w.id)}" style="font-size:12px;padding:4px 10px;">🎬 获客短视频脚本</button>
        <button class="ghost" data-delete-work="${escapeHtml(w.id)}" style="font-size:12px;padding:4px 10px;color:#c0392b;margin-left:auto;">🗑 删除</button>
      </div>
      <div class="acq-panel" data-acq="${escapeHtml(w.id)}" style="display:none;margin-top:10px;"></div>
      <div style="margin-top:10px;border-top:1px dashed #e6ddd0;padding-top:10px;">
        <div style="font-size:12px;color:#7a6a55;margin-bottom:6px;">📊 发布后复盘 · 看系统预估准不准</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;font-size:12px;color:#3a2c1c;">
          ${predScore !== "" ? `<span>系统预估:<b>${predScore}分</b>${predVerdict ? ` · ${escapeHtml(predVerdict)}` : ""}</span>` : `<button class="secondary" data-blind-predict="${escapeHtml(w.id)}" style="font-size:12px;padding:4px 10px;">看系统预估</button>`}
          ${hasMetrics
      ? `<span style="color:#1a7f37;">实际:阅${mx.views || 0}/赞${mx.likes || 0}/藏${mx.collects || 0}/评${mx.comments || 0}/问${mx.inquiries || 0}</span><span style="font-weight:600;color:${cal && cal.isWinner ? "#1a7f37" : "#b08a6a"};">${cal && cal.isWinner ? "✅ 出效果了" : "未到爆款线"}${calibText(pred, cal) ? " · " + escapeHtml(calibText(pred, cal)) : ""}</span><button class="ghost" data-toggle-retro="${escapeHtml(w.id)}" style="font-size:11px;padding:3px 8px;">改数据</button>`
      : `<button class="secondary" data-toggle-retro="${escapeHtml(w.id)}" style="font-size:12px;padding:4px 10px;">填发布后数据（T+3）</button>`}
        </div>
        <div class="retro-form" data-retro="${escapeHtml(w.id)}" style="display:none;margin-top:8px;background:#fbf7f0;border-radius:8px;padding:10px;">
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            ${[["views", "阅读"], ["likes", "点赞"], ["collects", "收藏"], ["comments", "评论"], ["inquiries", "有人来问"]].map(([k, lab]) => `<label style="font-size:12px;color:#7a6a55;">${lab}<br><input type="number" min="0" data-retro-field="${k}" value="${mx && mx[k] != null ? mx[k] : ""}" style="width:78px;padding:5px;border:1px solid #ddd;border-radius:6px;" /></label>`).join("")}
          </div>
          <button class="primary" data-save-retro="${escapeHtml(w.id)}" style="font-size:12px;padding:5px 14px;margin-top:8px;">保存复盘</button>
        </div>
      </div>
    </article>`;
}

// 渲染作品记录:搜索框 + 按月分组(可折叠,最新月默认展开)+ 删除。不重新拉取,只重画。
function paintRecords() {
  const target = byId("recordBoard");
  if (!target) return;
  const all = Array.isArray(state.finalWorks) ? state.finalWorks : [];
  if (!all.length) {
    target.innerHTML = `<div class="empty-state"><b>还没有作品</b><span>在今日工作台做完一条内容、点「✅ 完成」，它就会出现在这里。</span></div>`;
    return;
  }
  const q = String(state.recordSearch || "").trim().toLowerCase();
  const works = q
    ? all.filter((w) => `${w.title || ""} ${w.theme || ""} ${w.topic || ""} ${w.body || ""}`.toLowerCase().includes(q))
    : all;
  // 按月分组
  const groups = new Map();
  works.forEach((w) => { const mo = String(w.createdAt || "").slice(0, 7) || "未知"; if (!groups.has(mo)) groups.set(mo, []); groups.get(mo).push(w); });
  const months = [...groups.keys()].sort((a, b) => b.localeCompare(a));
  const monthLabel = (mo) => mo === "未知" ? "未知日期" : `${mo.slice(0, 4)}年${Number(mo.slice(5, 7))}月`;
  const openSet = state.recordOpenMonths instanceof Set ? state.recordOpenMonths : null;
  const searchBox = `<div style="margin-bottom:12px;"><input type="text" data-record-search placeholder="🔍 搜标题/正文关键词，快速找作品" value="${escapeHtml(state.recordSearch || "")}" style="width:100%;max-width:380px;padding:9px 13px;border:1px solid #ddd;border-radius:10px;font-size:14px;box-sizing:border-box;" /></div>`;
  const body = works.length
    ? months.map((mo, mi) => {
      const list = groups.get(mo);
      const open = q ? true : (openSet ? openSet.has(mo) : mi === 0); // 搜索时全展开;否则最新月默认开
      const cards = list.map((w) => recordCardHtml(w)).join("");
      return `<div class="record-month" style="margin-bottom:14px;">
        <button data-toggle-month="${escapeHtml(mo)}" style="width:100%;text-align:left;background:#f3ede1;border:none;border-radius:8px;padding:10px 14px;font-size:14px;font-weight:600;color:#3a2c1c;cursor:pointer;">${open ? "▼" : "▶"} ${escapeHtml(monthLabel(mo))} <span style="color:#9a8a70;font-weight:400;">（${list.length} 篇）</span></button>
        <div class="record-month-body" data-month-body="${escapeHtml(mo)}" style="display:${open ? "block" : "none"};margin-top:8px;">${cards}</div>
      </div>`;
    }).join("")
    : `<div class="empty-state"><b>没找到匹配的作品</b><span>换个关键词试试，或清空搜索框。</span></div>`;
  target.innerHTML = searchBox + body; // 看板已挪到独立的「数据看板」页,这里只留搜索+列表

  // 搜索框(实时过滤,保持焦点)
  const si = target.querySelector("[data-record-search]");
  if (si) {
    si.addEventListener("input", (e) => { state.recordSearch = e.target.value; state._recordSearchActive = true; paintRecords(); });
    if (state._recordSearchActive) { si.focus(); si.setSelectionRange(si.value.length, si.value.length); }
  }
  // 月份折叠
  target.querySelectorAll("[data-toggle-month]").forEach((b) => b.addEventListener("click", () => {
    const mo = b.dataset.toggleMonth;
    const set = state.recordOpenMonths instanceof Set ? state.recordOpenMonths : new Set(months.slice(0, 1));
    if (set.has(mo)) set.delete(mo); else set.add(mo);
    state.recordOpenMonths = set; state._recordSearchActive = false;
    paintRecords();
  }));
  // 复用 / 详情 / 下载 / 删除
  target.querySelectorAll("[data-reuse-work]").forEach((b) => b.addEventListener("click", () => reuseFinalWork(b.dataset.reuseWork, b.dataset.reuseTarget)));
  target.querySelectorAll("[data-toggle-detail]").forEach((b) => b.addEventListener("click", () => {
    const id = b.dataset.toggleDetail;
    const d = target.querySelector(`.record-detail[data-detail="${(window.CSS && CSS.escape) ? CSS.escape(id) : id}"]`);
    if (!d) return;
    const open = d.style.display !== "none";
    d.style.display = open ? "none" : "block";
    b.textContent = open ? "📄 点开看正文+图" : "🔼 收起";
  }));
  // 全选/全不选:翻转这条作品图片网格里的勾选框
  target.querySelectorAll("[data-toggle-pick-all]").forEach((b) => b.addEventListener("click", () => {
    const id = b.dataset.togglePickAll;
    const grid = target.querySelector(`.record-img-grid[data-img-grid="${(window.CSS && CSS.escape) ? CSS.escape(id) : id}"]`);
    if (!grid) return;
    const boxes = [...grid.querySelectorAll(".record-img-pick")];
    const allChecked = boxes.every((x) => x.checked);
    boxes.forEach((x) => { x.checked = !allChecked; });
  }));
  // 一次性下载选中的图(默认全选)。用 blob 强制保存(同源必成);跨域抓取失败回退直链点击。
  target.querySelectorAll("[data-download-selected]").forEach((b) => b.addEventListener("click", async () => {
    const id = b.dataset.downloadSelected;
    const grid = target.querySelector(`.record-img-grid[data-img-grid="${(window.CSS && CSS.escape) ? CSS.escape(id) : id}"]`);
    if (!grid) return;
    const picks = [...grid.querySelectorAll(".record-img-pick")].filter((x) => x.checked)
      .map((x) => ({ url: x.dataset.imgUrl, name: x.dataset.imgName || "image.png" }))
      .filter((p) => p.url);
    if (!picks.length) { alert("一张都没勾选。先勾上要下载的图。"); return; }
    const label = b.textContent;
    b.disabled = true;
    for (let i = 0; i < picks.length; i += 1) {
      b.textContent = `下载中…(${i + 1}/${picks.length})`;
      await downloadOneImage(picks[i].url, picks[i].name);
      await new Promise((r) => setTimeout(r, 450));
    }
    b.textContent = label;
    b.disabled = false;
  }));
  target.querySelectorAll("[data-copy-work]").forEach((b) => b.addEventListener("click", () => copyFinalWorkBody(b.dataset.copyWork)));
  target.querySelectorAll("[data-delete-work]").forEach((b) => b.addEventListener("click", async () => {
    const id = b.dataset.deleteWork;
    if (!confirm("确定删除这条作品记录吗？删了不可恢复。")) return;
    try { await fetch(apiPath(`/api/final-works/${encodeURIComponent(id)}`), { method: "DELETE" }); } catch (e) { /* 本地也删 */ }
    state.finalWorks = (Array.isArray(state.finalWorks) ? state.finalWorks : []).filter((w) => w.id !== id);
    if (typeof persistWorkbenchSnapshot === "function") persistWorkbenchSnapshot();
    state._recordSearchActive = false;
    paintRecords();
  }));
  // 设为主封面:把备选封面换成 P1,旧封面降为备选,重存
  target.querySelectorAll("[data-set-cover]").forEach((b) => b.addEventListener("click", async () => {
    const id = b.dataset.setCover;
    const url = b.dataset.setCoverUrl;
    const w = (state.finalWorks || []).find((x) => x.id === id);
    if (!w || !url) return;
    const imgs = Array.isArray(w.images) ? [...w.images] : [];
    const oldCover = imgs[0];
    imgs[0] = url;
    let alts = (Array.isArray(w.coverAlts) ? w.coverAlts : []).filter((u) => u !== url);
    if (oldCover && oldCover !== url) alts = [oldCover, ...alts];
    w.images = imgs; w.coverAlts = alts;
    b.disabled = true; b.textContent = "切换中…";
    try { await fetch(apiPath("/api/final-works"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ work: w }) }); } catch (e) { /* 本地也已换 */ }
    if (typeof persistWorkbenchSnapshot === "function") persistWorkbenchSnapshot();
    state._recordSearchActive = false;
    paintRecords();
  }));
  // 数据闭环:看系统预估(盲预测冻结)
  target.querySelectorAll("[data-blind-predict]").forEach((b) => b.addEventListener("click", async () => {
    const id = b.dataset.blindPredict;
    const w = (state.finalWorks || []).find((x) => x.id === id);
    b.disabled = true; b.textContent = "预估中…";
    try {
      const r = await fetch(apiPath("/api/cheat/blind-predict"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workId: id, workspace: (w && w.workspace) || state.workspace || "" }) });
      const d = await r.json();
      if (d && d.ok && d.prediction && w) { w.prediction = d.prediction; if (typeof persistWorkbenchSnapshot === "function") persistWorkbenchSnapshot(); state._recordSearchActive = false; paintRecords(); return; }
      alert("预估没出来，稍后再试。"); b.disabled = false; b.textContent = "看系统预估";
    } catch (e) { alert("预估失败：" + e.message); b.disabled = false; b.textContent = "看系统预估"; }
  }));
  // 展开/收起 填发布后数据
  target.querySelectorAll("[data-toggle-retro]").forEach((b) => b.addEventListener("click", () => {
    const id = b.dataset.toggleRetro;
    const f = target.querySelector(`.retro-form[data-retro="${(window.CSS && CSS.escape) ? CSS.escape(id) : id}"]`);
    if (f) f.style.display = f.style.display === "none" ? "block" : "none";
  }));
  // 保存复盘:填的真实数据 → /api/cheat/retro → 算准不准
  target.querySelectorAll("[data-save-retro]").forEach((b) => b.addEventListener("click", async () => {
    const id = b.dataset.saveRetro;
    const f = target.querySelector(`.retro-form[data-retro="${(window.CSS && CSS.escape) ? CSS.escape(id) : id}"]`);
    if (!f) return;
    const metrics = {};
    f.querySelectorAll("[data-retro-field]").forEach((inp) => { metrics[inp.dataset.retroField] = Number(inp.value || 0); });
    b.disabled = true; b.textContent = "保存中…";
    try {
      const r = await fetch(apiPath("/api/cheat/retro"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workId: id, metrics }) });
      const d = await r.json();
      const w = (state.finalWorks || []).find((x) => x.id === id);
      if (d && d.ok && w) { w.publishMetrics = d.metrics || metrics; if (d.calibration) w.calibration = d.calibration; if (typeof persistWorkbenchSnapshot === "function") persistWorkbenchSnapshot(); state._recordSearchActive = false; paintRecords(); return; }
      alert("保存失败，稍后再试。"); b.disabled = false; b.textContent = "保存复盘";
    } catch (e) { alert("保存失败：" + e.message); b.disabled = false; b.textContent = "保存复盘"; }
  }));
  // 获客短视频脚本:用这条母题 + 该业务线真实料,按获客三步框架出脚本
  target.querySelectorAll("[data-gen-acq]").forEach((b) => b.addEventListener("click", async () => {
    const id = b.dataset.genAcq;
    const w = (state.finalWorks || []).find((x) => x.id === id);
    const panel = target.querySelector(`.acq-panel[data-acq="${(window.CSS && CSS.escape) ? CSS.escape(id) : id}"]`);
    if (!panel) return;
    panel.style.display = "block";
    panel.innerHTML = `<div style="font-size:12px;color:#7a6a55;background:#fbf7f0;border-radius:8px;padding:12px;">生成中…（拉真实料 + 按获客三步框架写，约 15-40 秒）</div>`;
    b.disabled = true;
    try {
      const ws = (w && (w.workspace || w.businessLine)) || state.workspace || state.businessLine || "";
      const r = await fetch(apiPath("/api/acquisition-video/generate"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspace: ws, keyword: ws, topic: (w && (w.title || w.topic)) || "" }) });
      const d = await r.json();
      if (d && (d.hook || d.body)) {
        panel.innerHTML = acqScriptHtml(d);
        const cp = panel.querySelector("[data-copy-acq]");
        if (cp) cp.addEventListener("click", () => copyTextToClipboard(buildAcqCopyText(d)).then(() => { cp.textContent = "✓ 已复制"; }));
        const gv = panel.querySelector("[data-gen-acq-video]");
        if (gv) gv.addEventListener("click", () => { gv.disabled = true; gv.textContent = "合成中…(1-3分钟)"; generateAcqVideoInline(d, panel.querySelector(".acq-video-result"), ws); });
      } else {
        panel.innerHTML = `<div style="color:#c0392b;font-size:12px;background:#fbf7f0;border-radius:8px;padding:12px;">没生成出来：${escapeHtml(d.message || d.error || "稍后再试")}</div>`;
      }
    } catch (e) { panel.innerHTML = `<div style="color:#c0392b;font-size:12px;">失败：${escapeHtml(e.message)}</div>`; }
    b.disabled = false;
  }));
}

// ============ 数据看板:统一看预估vs实际、爆款、准度 ============
async function renderDashboard() {
  const target = byId("dashboardBoard");
  if (!target) return;
  target.innerHTML = `<div class="empty-state"><b>正在汇总数据…</b><span>读取作品 + 预估/真实表现。</span></div>`;
  try {
    const res = await fetch(apiPath("/api/final-works"));
    if (res.ok) {
      const d = await res.json();
      const remote = Array.isArray(d.finalWorks) ? d.finalWorks : (Array.isArray(d.works) ? d.works : []);
      const m = new Map();
      [...remote, ...(Array.isArray(state.finalWorks) ? state.finalWorks : [])].forEach((w) => { if (w?.id) m.set(w.id, w); });
      state.finalWorks = [...m.values()].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    }
  } catch (e) { /* 用本机缓存 */ }
  state.dashBoard = null;
  try { state.dashBoard = await (await fetch(apiPath("/api/cheat/board"))).json(); } catch (e) { /* 看板取不到不影响明细 */ }
  paintDashboard();
}

function dashWinner(w) { return !!(w.calibration && w.calibration.isWinner); }
function dashHasMetrics(w) { const m = w.publishMetrics; return !!(m && (m.likes != null || m.views != null || m.collects != null || m.comments != null || m.inquiries != null)); }
function dashPublished(w) { return !!(w.publishRecord && w.publishRecord.status === "published"); }

function paintDashboard() {
  const target = byId("dashboardBoard");
  if (!target) return;
  const works = Array.isArray(state.finalWorks) ? state.finalWorks : [];
  if (!works.length) {
    target.innerHTML = `<div class="empty-state"><b>还没有作品</b><span>做完一条内容点「完成」，这里就有数据了。</span></div>`;
    return;
  }
  const board = state.dashBoard || {};
  const total = works.length;
  const published = works.filter(dashPublished).length;
  const withMetrics = works.filter(dashHasMetrics).length;
  const winners = works.filter(dashWinner).length;
  const sig = board.rubricSignal;
  const accNote = typeof sig === "string" ? sig : ((sig && (sig.note || sig.text || sig.verdict)) || (withMetrics < 5 ? `再复盘 ${Math.max(0, 5 - withMetrics)} 篇就能看出预估准度` : ""));
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const inWeek = (w) => { const t = Date.parse(w.createdAt || ""); return t && t >= weekAgo; };
  const weekWorks = works.filter(inWeek);
  const card = (label, val, color) => `<div style="flex:1;min-width:104px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:15px 16px;"><div style="font-size:28px;font-weight:590;letter-spacing:-0.5px;line-height:1;color:${color || "#f7f8f8"};">${val}</div><div style="font-size:12px;font-weight:510;color:#8a8f98;margin-top:7px;">${label}</div></div>`;
  const lbl = (t) => `<div style="font-size:11px;font-weight:590;letter-spacing:0.6px;text-transform:uppercase;color:#62666d;margin:0 0 10px;">${t}</div>`;
  const summary = `
    <div style="margin-bottom:18px;">${lbl("本周 · 近 7 天")}
      <div style="display:flex;gap:10px;flex-wrap:wrap;">${card("做了(篇)", weekWorks.length)}${card("出效果", weekWorks.filter(dashWinner).length, "#10b981")}${card("待复盘", weekWorks.filter((w) => !dashHasMetrics(w)).length, "#7170ff")}</div>
    </div>
    <div style="margin-bottom:18px;">${lbl("累计")}
      <div style="display:flex;gap:10px;flex-wrap:wrap;">${card("做了(篇)", total)}${card("已发布", published)}${card("有数据", withMetrics)}${card("爆款", winners, "#10b981")}</div>
      ${accNote ? `<div style="font-size:12px;color:#8a8f98;margin-top:10px;">📈 预估准度：${escapeHtml(accNote)}</div>` : ""}
    </div>`;
  const lines = [...new Set(works.map((w) => w.workspace || "").filter(Boolean))];
  const fLine = state.dashFilterLine || "";
  const winnerOnly = !!state.dashWinnerOnly;
  const pendingOnly = !!state.dashPendingOnly;
  let rows = works.filter((w) => (!fLine || w.workspace === fLine) && (!winnerOnly || dashWinner(w)) && (!pendingOnly || (dashPublished(w) && !dashHasMetrics(w))));
  const sortKey = state.dashSort || "date";
  const dir = state.dashDir === "asc" ? 1 : -1;
  const predOf = (w) => normalizePredScore(w.prediction && (w.prediction.composite != null ? w.prediction.composite : w.prediction.score));
  const engOf = (w) => (w.publishMetrics && w.publishMetrics.realEngagement) || 0;
  const inqOf = (w) => (w.publishMetrics && w.publishMetrics.inquiries) || 0;
  rows = rows.sort((a, b) => {
    if (sortKey === "pred") return (predOf(a) - predOf(b)) * dir;
    if (sortKey === "eng") return (engOf(a) - engOf(b)) * dir;
    if (sortKey === "inq") return (inqOf(a) - inqOf(b)) * dir;
    return String(a.createdAt || "").localeCompare(String(b.createdAt || "")) * dir;
  });
  const sortBtn = (key, label) => `<button data-dash-sort="${key}" style="font-size:12px;font-weight:510;padding:5px 12px;border:1px solid ${sortKey === key ? "#5e6ad2" : "rgba(255,255,255,0.08)"};border-radius:9999px;background:${sortKey === key ? "rgba(94,106,210,0.18)" : "transparent"};color:${sortKey === key ? "#828fff" : "#d0d6e0"};cursor:pointer;">${label}${sortKey === key ? (dir === 1 ? " ↑" : " ↓") : ""}</button>`;
  const th = `padding:8px 10px;border-bottom:1px solid rgba(255,255,255,0.08);`;
  const filterBar = `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px;">
      <select data-dash-line style="font-size:12px;padding:6px 10px;border:1px solid rgba(255,255,255,0.08);border-radius:8px;background:#191a1b;color:#d0d6e0;"><option value="">全部业务线</option>${lines.map((l) => `<option value="${escapeHtml(l)}" ${l === fLine ? "selected" : ""}>${escapeHtml(l)}</option>`).join("")}</select>
      <label style="font-size:12px;color:#8a8f98;cursor:pointer;"><input type="checkbox" data-dash-winner ${winnerOnly ? "checked" : ""}/> 只看爆款</label>
      <label style="font-size:12px;color:#8a8f98;cursor:pointer;"><input type="checkbox" data-dash-pending ${pendingOnly ? "checked" : ""}/> 只看待复盘</label>
      <span style="font-size:12px;color:#62666d;margin-left:auto;">排序</span>${sortBtn("date", "日期")}${sortBtn("pred", "预估分")}${sortBtn("eng", "互动")}${sortBtn("inq", "询盘")}
    </div>`;
  const head = `<tr style="text-align:left;color:#62666d;font-size:11px;font-weight:590;text-transform:uppercase;letter-spacing:0.4px;"><th style="${th}">标题</th><th style="${th}">业务线</th><th style="${th}">预估</th><th style="${th}">阅读</th><th style="${th}">赞/藏</th><th style="${th}">评</th><th style="${th}">询盘</th><th style="${th}">出效果</th><th style="${th}">准不准</th><th style="${th}"></th></tr>`;
  const bodyRows = rows.map((w) => {
    const m = w.publishMetrics || {};
    const pred = predOf(w);
    const has = dashHasMetrics(w);
    const win = dashWinner(w);
    const calib = w.calibration ? calibText(w.prediction, w.calibration) : "";
    const pubNoData = dashPublished(w) && !has;
    const td = `padding:9px 10px;`;
    const dash = "<span style='color:#62666d'>—</span>";
    return `<tr class="od-row" style="border-top:1px solid rgba(255,255,255,0.06);font-size:13px;color:#d0d6e0;">
      <td style="${td}max-width:220px;color:#f7f8f8;font-weight:510;">${escapeHtml(String(w.title || w.topic || "(无标题)").slice(0, 30))}</td>
      <td style="${td}color:#8a8f98;">${escapeHtml(w.workspace || "—")}</td>
      <td style="${td}color:${pred ? "#828fff" : "#62666d"};font-weight:510;">${pred || "—"}</td>
      <td style="${td}">${has ? (m.views || 0) : dash}</td>
      <td style="${td}">${has ? `${m.likes || 0}/${m.collects || 0}` : dash}</td>
      <td style="${td}">${has ? (m.comments || 0) : dash}</td>
      <td style="${td}">${has ? (m.inquiries || 0) : dash}</td>
      <td style="${td}">${has ? (win ? "<span style='color:#10b981'>✅</span>" : dash) : ""}</td>
      <td style="${td}color:#8a8f98;">${has ? escapeHtml(calib) : (pubNoData ? "<span style='color:#7170ff'>待复盘</span>" : dash)}</td>
      <td style="${td}">${has ? "" : `<button data-dash-retro="${escapeHtml(w.id)}" style="font-size:11px;font-weight:510;padding:4px 10px;border:1px solid rgba(255,255,255,0.12);color:#d0d6e0;border-radius:6px;background:rgba(255,255,255,0.04);cursor:pointer;">填数据</button>`}</td>
    </tr>
    <tr class="dash-retro-row" data-dash-retro-row="${escapeHtml(w.id)}" style="display:none;"><td colspan="10" style="padding:12px;background:rgba(255,255,255,0.02);">
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;">
        ${[["views", "阅读"], ["likes", "点赞"], ["collects", "收藏"], ["comments", "评论"], ["inquiries", "有人来问"]].map(([k, lab]) => `<label style="font-size:12px;color:#8a8f98;">${lab}<br><input type="number" min="0" data-dr-field="${k}" value="${m[k] != null ? m[k] : ""}" style="width:74px;padding:6px;border:1px solid rgba(255,255,255,0.1);border-radius:6px;background:#191a1b;color:#f7f8f8;margin-top:4px;" /></label>`).join("")}
        <button data-dash-retro-save="${escapeHtml(w.id)}" style="font-size:12px;font-weight:510;padding:8px 16px;border:none;border-radius:6px;background:#5e6ad2;color:#fff;cursor:pointer;">保存复盘</button>
      </div>
    </td></tr>`;
  }).join("");
  target.innerHTML = `<style>#dashboardBoard .od-row:hover{background:rgba(255,255,255,0.03);}#dashboardBoard select option{background:#191a1b;}</style>
    <div style="background:#0f1011;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:22px;font-family:'Inter Variable',Inter,-apple-system,system-ui,'Segoe UI',Roboto,sans-serif;font-feature-settings:'cv01','ss03';color:#f7f8f8;">
      ${summary}${filterBar}
      <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;">${head}${bodyRows}</table></div>
    </div>`;

  const ls = target.querySelector("[data-dash-line]"); if (ls) ls.addEventListener("change", (e) => { state.dashFilterLine = e.target.value; paintDashboard(); });
  const wc = target.querySelector("[data-dash-winner]"); if (wc) wc.addEventListener("change", (e) => { state.dashWinnerOnly = e.target.checked; paintDashboard(); });
  const pc = target.querySelector("[data-dash-pending]"); if (pc) pc.addEventListener("change", (e) => { state.dashPendingOnly = e.target.checked; paintDashboard(); });
  target.querySelectorAll("[data-dash-sort]").forEach((b) => b.addEventListener("click", () => {
    const k = b.dataset.dashSort;
    if (state.dashSort === k) state.dashDir = state.dashDir === "asc" ? "desc" : "asc"; else { state.dashSort = k; state.dashDir = "desc"; }
    paintDashboard();
  }));
  target.querySelectorAll("[data-dash-retro]").forEach((b) => b.addEventListener("click", () => {
    const row = target.querySelector(`.dash-retro-row[data-dash-retro-row="${(window.CSS && CSS.escape) ? CSS.escape(b.dataset.dashRetro) : b.dataset.dashRetro}"]`);
    if (row) row.style.display = row.style.display === "none" ? "table-row" : "none";
  }));
  target.querySelectorAll("[data-dash-retro-save]").forEach((b) => b.addEventListener("click", async () => {
    const id = b.dataset.dashRetroSave;
    const row = target.querySelector(`.dash-retro-row[data-dash-retro-row="${(window.CSS && CSS.escape) ? CSS.escape(id) : id}"]`);
    if (!row) return;
    const metrics = {};
    row.querySelectorAll("[data-dr-field]").forEach((inp) => { metrics[inp.dataset.drField] = Number(inp.value || 0); });
    b.disabled = true; b.textContent = "保存中…";
    try {
      const r = await fetch(apiPath("/api/cheat/retro"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workId: id, metrics }) });
      const d = await r.json();
      const w = (state.finalWorks || []).find((x) => x.id === id);
      if (d && d.ok && w) { w.publishMetrics = d.metrics || metrics; if (d.calibration) w.calibration = d.calibration; paintDashboard(); return; }
      alert("保存失败，稍后再试。"); b.disabled = false; b.textContent = "保存复盘";
    } catch (e) { alert("保存失败：" + e.message); b.disabled = false; b.textContent = "保存复盘"; }
  }));
}

function sampleAssetItems(label) {
  return `<div class="asset-grid">
    <article class="asset-item"><b>${label}</b><span>这里展示长期沉淀的数据，不打断今日工作流。</span></article>
    <article class="asset-item"><b>下一步</b><span>从今日工作台完成内容后，自动回流到这里。</span></article>
  </div>`;
}

function sampleState() {
  return {
    contentSamples: [],
  };
}

// ===== 账号管理 =====

const ACCOUNT_PLATFORMS = [
  { id: 'xhs',    label: '小红书',   hint: '登录后复制全部 Cookie' },
  { id: 'wb',     label: '微博',     hint: '登录 weibo.com 后复制' },
  { id: 'tieba',  label: '百度贴吧',  hint: '登录 tieba.baidu.com 后复制' },
  { id: 'bili',   label: 'B站',      hint: '登录 bilibili.com 后复制' },
  { id: 'dy',     label: '抖音',     hint: '登录 douyin.com 后复制' },
  { id: 'ks',     label: '快手',     hint: '登录 kuaishou.com 后复制' },
  { id: 'zhihu',  label: '知乎',     hint: '登录 zhihu.com 后复制' },
];

async function renderAccounts() {
  const board = byId('accountCookiesBoard');
  if (!board) return;
  board.innerHTML = '<div class="empty-state"><b>加载中...</b><span>正在读取已保存的账号 Cookie</span></div>';

  // 从后端加载已有账号
  let existing = {};
  try {
    const resp = await fetch('/api/accounts/cookies');
    const data = await resp.json();
    if (data.ok && data.accounts) {
      for (const acct of data.accounts) {
        if (!existing[acct.platform_name]) existing[acct.platform_name] = [];
        existing[acct.platform_name].push(acct);
      }
    }
  } catch { /* 服务未就绪 */ }

  let html = `<div class="account-cookies-grid">`;
  for (const p of ACCOUNT_PLATFORMS) {
    const saved = existing[p.id] || [];
    const savedHtml = saved.map(a =>
      `<div class="account-cookie-saved">
        <span class="acct-name">${escHtml(a.account_name || p.label)}</span>
        <code class="acct-cookie-preview">${escHtml((a.cookies || '').slice(0, 60))}${(a.cookies || '').length > 60 ? '...' : ''}</code>
        <button class="small danger" onclick="deleteAccountCookie(${a.id},'${p.id}')">删除</button>
      </div>`
    ).join('');

    html += `
      <div class="account-cookie-card" data-platform="${p.id}">
        <div class="acct-header">
          <strong>${p.label}</strong>
          <span class="acct-id">${p.id}</span>
          ${saved.length > 0 ? '<span class="acct-badge">已配置</span>' : '<span class="acct-badge empty">未配置</span>'}
        </div>
        ${savedHtml}
        <textarea class="acct-cookie-input" placeholder="${p.hint}${saved.length > 0 ? '\n\n当前已有配置，粘贴将覆盖更新。' : ''}" rows="3"></textarea>
        <div class="acct-actions">
          <input class="acct-name-input" placeholder="账号名称（可选，多账号时区分）" value="default" />
          <button class="primary small" onclick="saveAccountCookie('${p.id}')">保存</button>
        </div>
      </div>`;
  }
  html += `</div>`;

  // 导出到 xlsx 按钮
  html += `
    <div class="acct-export-bar">
      <p>保存后，运行采集前需将 Cookie 导出到 MediaCrawlerPro 的 xlsx 文件。</p>
      <button class="primary" onclick="exportCookiesToXlsx()">导出到 xlsx</button>
    </div>`;

  board.innerHTML = html;
}

async function saveAccountCookie(platform) {
  const card = document.querySelector(`.account-cookie-card[data-platform="${platform}"]`);
  if (!card) return;
  const textarea = card.querySelector('.acct-cookie-input');
  const nameInput = card.querySelector('.acct-name-input');
  const cookies = textarea.value.trim();
  const account_name = nameInput.value.trim() || 'default';
  if (!cookies) { alert('请先粘贴 Cookie'); return; }

  try {
    const resp = await fetch('/api/accounts/cookies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform_name: platform, account_name, cookies }),
    });
    const data = await resp.json();
    if (data.ok) {
      textarea.value = '';
      renderAccounts();
    } else {
      alert('保存失败: ' + (data.error || ''));
    }
  } catch (e) {
    alert('网络错误: ' + e.message);
  }
}

async function deleteAccountCookie(id, platform) {
  if (!confirm('确认删除这条 Cookie 配置？')) return;
  try {
    const resp = await fetch(`/api/accounts/cookies?id=${id}`, { method: 'DELETE' });
    const data = await resp.json();
    if (data.ok) renderAccounts();
    else alert('删除失败: ' + (data.error || ''));
  } catch (e) {
    alert('网络错误: ' + e.message);
  }
}

async function exportCookiesToXlsx() {
  // 调后端 API 获取所有 cookie 数据，前端触发下载
  try {
    const resp = await fetch('/api/accounts/cookies/export-xlsx');
    const data = await resp.json();
    if (!data.ok) { alert('导出失败: ' + (data.error || '')); return; }
    if (!data.accounts || data.accounts.length === 0) { alert('没有已保存的 Cookie 可导出'); return; }

    // 构造 CSV 内容（按 platform 分组），让用户可下载后人工写入 xlsx
    let csv = 'platform,account_name,cookies,status\n';
    for (const acct of data.accounts) {
      const c = (acct.cookies || '').replace(/"/g, '""');
      csv += `${acct.platform_name},"${acct.account_name || 'default'}","${c}",${acct.status}\n`;
    }

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'crawler_cookies_account.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert(`已导出 ${data.accounts.length} 条 Cookie 配置为 CSV 文件。\n后续需通过 pg_to_xlsx.py 脚本导入到 MediaCrawlerPro 的 accounts_cookies.xlsx。`);
  } catch (e) {
    alert('导出错误: ' + e.message);
  }
}

function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

