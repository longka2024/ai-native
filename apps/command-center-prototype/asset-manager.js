// asset-manager.js — 母题资产库、标题库、作品记录的渲染与操作
// 依赖: state-manager.js, config.js, utils.js, copy-manager.js

function renderAssetPage(route) {
  if (route === "assets") renderAssets();
  if (route === "titles") {
    renderTitleAssets();
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
  const finalWorksHtml = state.finalWorks.length
    ? `<div class="title-group-head"><b>${zh("&#24050;&#23436;&#25104;&#20316;&#21697;")}</b><span>${state.finalWorks.length} ${zh("&#20010;&#21487;&#22797;&#29992;&#25104;&#31295;")}</span></div><div class="asset-grid">${state.finalWorks.map(renderFinalWorkAsset).join("")}</div>`
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
  const expectedImages = platformId === "xhs" ? 5 : images.length;
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

