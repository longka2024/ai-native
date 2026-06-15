// topic-engine.js — 素材读取、对标采集、选题生成
// 依赖: state-manager.js, config.js, utils.js, copy-manager.js

async function readMaterials() {
  saveMaterialFilterInputs();
  state.logs = [];
  if (state.sourceChannel === "x-history" || state.sourceChannel === "x-live") {
    state.useLatestXRunOnly = false;
    state.lastXRunIds = [];
  }
  state.assetStatus = "正在读取";
  log("读取任务信息");
  log(`发布目标：${currentTarget().title}`);
  log(`素材来源：${sourceTitleForTarget()}`);
  log(`关键词：${state.keywords}`);
  renderToday();
  await delay(180);

  const db = await loadState();
  const topics = buildTopicsFromDb(db);
  state.assets = db;
  if (!topics.length) {
    state.assetStatus = "没有匹配选题";
    log("当前素材来源没有匹配选题。系统不会从其他平台乱拿素材。");
    log("建议：换关键词、切换到历史素材，或先采集/导入对应平台素材。");
    state.topics = [];
    renderToday();
    return;
  }
  state.topics = topics.slice(0, 10);
  state.selectedTopicId = "";
  state.titleChoices = [];
  state.titleChoiceKey = "";
  state.assetStatus = `找到 ${state.topics.length} 个选题`;
  log(`找到 ${state.topics.length} 个候选选题。`);
  log("已提取：来源平台、选题方向、用户痛点、写作角度、风险提醒。");
  renderToday();
  setStep(5);
}

async function collectXAccounts() {
  const accounts = byId("xAccountsInput")?.value.trim() || "";
  const maxTweets = Math.max(5, Math.min(100, Number(byId("xMaxTweetsInput")?.value || 30)));
  const pages = Math.max(1, Math.min(5, Number(byId("xPagesInput")?.value || 1)));
  if (!accounts) {
    state.logs = ["请先输入至少一个 X 推主账号。"];
    state.assetStatus = "缺少 X 账号";
    renderToday();
    return;
  }
  state.logs = [];
  state.assetStatus = "正在采集 X";
  state.isCollectingX = true;
  log("开始采集 X 推主。");
  log(`账号：${accounts.replace(/\n+/g, " / ")}`);
  log(`每号采集：${maxTweets} 条，页数：${pages}`);
  log("好帖标准：优先看收藏、评论、转发，其次看正文信息量和赛道相关性。");
  renderToday();
  scheduleProgressLog("正在调用 XCrawl 读取推主最近帖子，通常需要 10-60 秒。", 1200);
  scheduleProgressLog("采集完成后会先筛掉纯链接、短碎片、弱互动帖子。", 4200);
  scheduleProgressLog("如果账号较多，请等控制台出现采集完成和本轮批次。", 9000);
  try {
    const res = await fetch(apiPath("/api/collectors/xcrawl/x-user-tweets-batch"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accounts, maxTweets, pages, labelType: "radar_seed" }),
    });
    const result = await res.json();
    if (!res.ok || !result.ok) throw new Error(result.message || result.error || `HTTP ${res.status}`);
    state.lastXRunIds = (result.results || []).map((item) => item.run?.id).filter(Boolean);
    state.useLatestXRunOnly = state.lastXRunIds.length > 0;
    log(`采集完成：成功账号 ${result.successCount || 0} 个，原始样本 ${result.totalSampleCount || 0} 条。`);
    if (state.lastXRunIds.length) log("本轮采集已保存，后续可继续复用。");
    log(`好帖候选：${result.candidateCount || 0} 条；淘汰：${result.rejectedCount || 0} 条。`);
    if (result.rejectedStats) log(`淘汰原因：${Object.entries(result.rejectedStats).map(([key, value]) => `${key} ${value}`).join(" / ") || "无"}`);
    const batchSamples = balanceXBatchSamples([
      ...(Array.isArray(result.candidates) ? result.candidates : []),
      ...(Array.isArray(result.assetBuckets?.goodPosts) ? result.assetBuckets.goodPosts : []),
    ]);
    const topics = await buildTopicsWithXHistoryBackfill(buildTopicsFromLiveXSamples(batchSamples));
    state.assets = result;
    state.topics = topics.slice(0, 10);
    state.selectedTopicId = "";
    state.titleChoices = [];
    state.titleChoiceKey = "";
    state.assetStatus = state.topics.length ? `本轮采集生成 ${state.topics.length} 个选题` : "本轮没有合格选题";
    state.isCollectingX = false;
    if (!state.topics.length) {
      log("本轮采集没有找到合适选题。请换账号、提高采集条数，或调整关键词。");
      renderToday();
      return;
    }
    log(`已基于本轮采集生成 ${state.topics.length} 个候选选题，不读取历史旧数据。`);
    renderToday();
    setStep(5);
  } catch (error) {
    state.assetStatus = "X 采集失败";
    state.isCollectingX = false;
    log(`X 采集失败：${error.message}`);
    renderToday();
  }
}

function balanceXBatchSamples(samples = []) {
  const seen = new Set();
  const unique = samples.filter((sample) => {
    const key = sample.sourceUrl || sample.url || sample.id || sample.title;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const groups = new Map();
  for (const sample of unique) {
    const account = sample.keyword || sample.authorName || "unknown";
    if (!groups.has(account)) groups.set(account, []);
    groups.get(account).push(sample);
  }
  for (const group of groups.values()) {
    group.sort((a, b) => (Number(b.contentValueScore || 0) + Number(b.radarScore || 0) / 1000) - (Number(a.contentValueScore || 0) + Number(a.radarScore || 0) / 1000));
  }
  const balanced = [];
  for (const group of groups.values()) balanced.push(...group.slice(0, 2));
  const used = new Set(balanced.map((sample) => sample.sourceUrl || sample.url || sample.id || sample.title));
  const rest = unique
    .filter((sample) => !used.has(sample.sourceUrl || sample.url || sample.id || sample.title))
    .sort((a, b) => (Number(b.contentValueScore || 0) + Number(b.radarScore || 0) / 1000) - (Number(a.contentValueScore || 0) + Number(a.radarScore || 0) / 1000));
  return [...balanced, ...rest].slice(0, 12);
}

async function buildTopicsWithXHistoryBackfill(liveTopics = []) {
  const targetCount = 8;
  if (liveTopics.length >= 6) return liveTopics.slice(0, 10);
  const previousUseLatest = state.useLatestXRunOnly;
  try {
    state.useLatestXRunOnly = false;
    const db = await loadState();
    const historyTopics = buildTopicsFromDb(db);
    const seen = new Set(liveTopics.map((topic) => topic.url || topic.id || topic.title).filter(Boolean));
    const merged = [...liveTopics];
    for (const topic of historyTopics) {
      const key = topic.url || topic.id || topic.title;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(topic);
      if (merged.length >= targetCount) break;
    }
    if (merged.length > liveTopics.length) {
      log(`本轮 X 优质候选 ${liveTopics.length} 个，已从历史 X 资产补到 ${merged.length} 个。`);
    }
    return merged.slice(0, 10);
  } catch (error) {
    log(`历史 X 资产补位失败：${error.message}`);
    return liveTopics.slice(0, 10);
  } finally {
    state.useLatestXRunOnly = previousUseLatest;
  }
}

function buildTopicsFromLiveXSamples(samples = []) {
  return samples
    .filter(Boolean)
    .map((item, index) => normalizeSample(item))
    .filter((sample) => cleanSourceText(`${sample.title} ${sample.body}`).length >= 30)
    .map((sample, index) => {
      const title = cleanSourceText(sample.title || sample.body || `X 素材 ${index + 1}`).slice(0, 72);
      const body = cleanSourceText(sample.body || "");
      const metrics = sample.metrics || {};
      const heat = Number(metrics.likes || 0)
        + Number(metrics.saves || metrics.bookmarks || 0) * 2
        + Number(metrics.comments || metrics.replies || 0) * 3
        + Number(metrics.shares || metrics.retweets || 0) * 3
        + Number(metrics.quotes || 0) * 3;
      const pain = inferLiveXTopicPain(title, body);
      return {
        id: sample.id || `live-x-topic-${index}-${Date.now()}`,
        title,
        theme: title,
        platform: "X",
        keyword: sample.keyword || "X 账号素材",
        url: sample.url || "",
        body,
        sourceInsight: {
          theme: title,
          pain,
          angle: "这条选题直接来自本轮 X 采集结果，优先学习它的观点、问题意识和结构，不照抄原文。",
        },
        metrics: {
          likes: metrics.likes || 0,
          saves: metrics.saves || metrics.bookmarks || 0,
          comments: metrics.comments || metrics.replies || 0,
          shares: metrics.shares || metrics.retweets || 0,
          heat,
        },
        reason: buildLiveXReason(sample, heat),
        pain,
        reuse: `可以先改成 ${currentTarget().title}，后续再扩展成公众号、短视频脚本和朋友圈内容。`,
        risk: "只学习观点、结构和用户问题，不复制原帖表达。",
        collectionStatus: "本轮真实采集",
      };
    })
    .sort((a, b) => Number(b.metrics?.heat || 0) - Number(a.metrics?.heat || 0))
    .slice(0, 10);
}

function inferLiveXTopicPain(title = "", body = "") {
  const text = cleanSourceText(`${title} ${body}`);
  const sentence = text.split(/[。！？?!\n]/).find((line) => /难|痛|卡|问题|为什么|怎么|如何|不懂|没效果|踩坑|焦虑|失败|浪费/.test(line));
  if (sentence) return sentence.slice(0, 96);
  if (/AI|Agent|内容|自媒体|写作|爆款|素材/.test(text)) {
    return "用户想用 AI 做内容和自媒体，但缺少可复用素材、判断标准和稳定流程。";
  }
  return "这条素材有可复用观点，需要结合目标平台重新找到用户痛点。";
}

function selectTopicForCreation(topicId = "") {
  const topic = state.topics.find((item) => String(item.id) === String(topicId));
  if (!topic) {
    log(`选题不存在或已过期：${topicId}`);
    return;
  }
  state.selectedTopicId = topic.id;
  clearAfter(5);
  state.titleChoices = buildCleanTitleChoices(topic);
  state.titleChoiceKey = currentTitleChoiceKey(topic);
  state.selectedTitle = "";
  state.draft = "";
  state.improvedDraft = "";
  state.copyConfirmed = false;
  state.copyVersions = [];
  state.currentCopyVersionId = "";
  state.confirmedCopyVersionId = "";
  state.draftReview = null;
  state.draftMeta = null;
  setStep(6);
}

function buildLiveXReason(sample = {}, heat = 0) {
  const parts = [];
  const metrics = sample.metrics || {};
  if (heat >= 50) parts.push("互动信号较强");
  if (Number(metrics.bookmarks || metrics.saves || 0) > 0) parts.push("有收藏价值");
  if (Number(metrics.replies || metrics.comments || 0) > 0) parts.push("有讨论信号");
  if (cleanSourceText(sample.body || "").length >= 120) parts.push("正文信息量足够");
  return parts.length
    ? `入选依据：${parts.join("；")}。`
    : "入选依据：来自本轮真实采集，适合人工判断是否继续创作。";
}

function scheduleProgressLog(message, ms) {
  setTimeout(() => {
    if (!state.isCollectingX) return;
    log(message);
    renderToday();
  }, ms);
}

async function readDemoMaterials() {
  state.logs = [];
  state.assetStatus = "本地预览样本";
  log("使用本地预览样本演示流程。");
  log("注意：这不是真实采集结果，只用于验证页面步骤是否能走通。");
  const db = sampleState();
  state.assets = db;
  state.topics = buildTopicsFromDb(db).slice(0, 10);
  state.selectedTopicId = "";
  state.titleChoices = [];
  state.titleChoiceKey = "";
  state.assetStatus = `预览 ${state.topics.length} 个选题`;
  renderToday();
  setStep(5);
}

async function loadState() {
  if (state.sourceChannel === "hot30") return loadHot30State();
  if (state.sourceChannel === "signal-search") return loadSignalSearchState();
  try {
    const params = new URLSearchParams({
      keywords: state.keywords,
      limit: "200",
    });
    const wanted = platformWanted();
    if (wanted !== "all") params.set("platform", wanted);
    if (state.sourceChannel === "x-history") {
      params.set("latestRunCount", "5");
      params.set("unusedOnly", "1");
      params.set("creationOnly", "1");
    }
    if (state.sourceChannel === "xhs" || (state.sourceChannel === "same-platform" && wanted === "xiaohongshu")) {
      if (state.materialScope === "latest") params.set("latestRunCount", String(Math.max(1, Math.min(10, Number(state.materialLatestRuns || 3)))));
      else params.set("latestRunCount", "0");
      params.set("unusedOnly", "1");
      params.set("creationOnly", "1");
    }
    if (wanted === "xiaohongshu" && state.materialScope === "author" && state.materialAuthor) {
      const existingKeywords = String(state.keywords || "").trim();
      params.set("keywords", `${existingKeywords} ${state.materialAuthor}`.trim());
      params.set("latestRunCount", "0");
    }
    if (state.sourceChannel === "x-live" && state.useLatestXRunOnly && state.lastXRunIds.length) {
      params.set("runIds", state.lastXRunIds.join(","));
      params.set("unusedOnly", "1");
      params.set("creationOnly", "1");
    }
    const res = await fetch(apiPath(`/api/content-assets/unified?${params.toString()}`));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    state.assetStatus = "已读取统一内容资产库";
    log(`统一内容资产库：读取 ${result.totalSourceSamples || 0} 条，匹配 ${result.matchedCount || 0} 条。`);
    let contentSamples = Array.isArray(result.assets) ? result.assets : [];
    if (wanted === "xiaohongshu" && state.materialScope === "author" && state.materialAuthor) {
      const authorNeedle = String(state.materialAuthor || "").toLowerCase().replace(/\s+/g, "");
      contentSamples = contentSamples.filter((item) => String(item.authorName || item.author || "").toLowerCase().replace(/\s+/g, "").includes(authorNeedle));
      result.assets = contentSamples;
      result.matchedCount = contentSamples.length;
    }
    return {
      contentSamples,
      rawMaterials: [],
      candidates: [],
      assets: [],
      unifiedAssets: result,
    };
  } catch (error) {
    state.assetStatus = "本地预览样本";
    log(`读取统一内容资产库失败：${error.message}`);
    return sampleState();
  }
}

async function loadHot30State() {
  try {
    const params = new URLSearchParams({ limit: "50" });
    const workspace = byId("hot30WorkspaceInput")?.value.trim() ?? state.hot30Workspace ?? "";
    state.hot30Workspace = workspace;
    if (workspace) params.set("workspace", workspace);
    const keywords = (state.signalKeywords || "").trim();
    if (keywords) params.set("keywords", keywords);
    const res = await fetch(apiPath(`/api/samples/hot30?${params.toString()}`));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    if (!result.ok) throw new Error(result.message || result.error || "hot30 接口返回失败");
    state.assetStatus = "已读取 30 天热点";
    log(`30 天热点：窗口内 ${result.totalInWindow || 0} 条，取 Top ${result.items?.length || 0}（工作台：${result.workspace}）。`);
    const contentSamples = (Array.isArray(result.items) ? result.items : []).map((item) => ({
      ...item,
      sourceUrl: item.url,
      radarScore: item.score,
      hot30Score: item.score,
      hot30AgeDays: item.ageDays,
    }));
    return { contentSamples, rawMaterials: [], candidates: [], assets: [], unifiedAssets: result };
  } catch (error) {
    state.assetStatus = "30 天热点读取失败";
    log(`读取 30 天热点失败：${error.message}`);
    return { contentSamples: [], rawMaterials: [], candidates: [], assets: [], unifiedAssets: null };
  }
}

// 信号驱动采集：用 TrendRadar 信号原文 URL → 内置 fetch 免费抓取新闻正文
async function loadSignalSearchState() {
  try {
    const title = (state.signalKeywords || state.signalSearchQuery || "").trim();
    const signalUrl = (state.signalUrl || "").trim();
    if (!title) {
      state.assetStatus = "缺少信号信息";
      log("信号采集缺少标题");
      return { contentSamples: [], rawMaterials: [], candidates: [], assets: [] };
    }
    // 优先用原文 URL 走内置 fetch 抓取正文（免费，不用 xcrawl）
    if (signalUrl) {
      state.assetStatus = "正在抓取信号原文";
      log(`信号原文抓取：${title} → ${signalUrl}`);
      renderToday();
      const res = await fetch(apiPath("/api/fetch-article"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: signalUrl }),
      });
      if (res.ok) {
        const result = await res.json();
        if (result.ok && result.body && result.body.length > 50) {
          const bodyLen = result.body.length;
          log(`信号原文抓取成功：${result.title || title}（正文 ${bodyLen} 字符）`);
          const contentSamples = [{
            id: `signal-${signalUrl.slice(0, 40).replace(/[^a-zA-Z0-9]/g, "-")}`,
            title: result.title || title,
            body: result.body,
            sourceUrl: signalUrl,
            platform: "web",
            collectionStatus: "real",
            hot30Score: 100,
            metrics: { chars: bodyLen },
          }];
          return { contentSamples, rawMaterials: [], candidates: [], assets: [] };
        }
        const shortBody = result?.body?.length || 0;
        log(`信号原文正文太短（${shortBody} 字符），尝试关键词搜索回退`);
      } else {
        log(`内置抓取 HTTP ${res.status}，尝试关键词搜索回退`);
      }
    } else {
      log(`信号无原文 URL，尝试 XCrawl 搜索回退：${title}`);
    }
    // XCrawl js_render 抓取 JS 渲染页面（微博/头条等平台 URL）
    // 仅在有 signalUrl 时使用，XCrawl 处理 JS 页面比内置 fetch 强
    if (signalUrl) {
      state.assetStatus = "正在用 XCrawl 抓取 JS 页面";
      renderToday();
      try {
        const xcRes = await fetch(apiPath("/api/collectors/xcrawl/scrape"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: signalUrl,
            output: { formats: ["markdown"] },
            js_render: { enabled: true, wait_until: "networkidle" },
          }),
        });
        if (xcRes.ok) {
          const xcResult = await xcRes.json();
          const samples = Array.isArray(xcResult.samples) ? xcResult.samples : [];
          if (samples.length && samples[0].body?.length > 100) {
            // 检测登录墙：微博/知乎等平台需登录，抓到的只是登录页
            const sampleTitle = (samples[0].title || "").toLowerCase();
            const sampleBody = (samples[0].body || "").toLowerCase();
            const isLoginWall = /登录|扫码|验证|login|sign[- ]?in/i.test(sampleTitle)
              && sampleBody.length < 2000;
            if (isLoginWall) {
              log(`XCrawl 抓取结果需登录（标题含"登录"），跳过 XCrawl 结果`);
            } else {
              const bodyLen = samples[0].body.length;
              log(`XCrawl 抓取成功：正文 ${bodyLen} 字符`);
              const contentSamples = [{
                id: `signal-xc-${signalUrl.slice(0, 40).replace(/[^a-zA-Z0-9]/g, "-")}`,
                title: samples[0].title || title,
                body: samples[0].body,
                sourceUrl: signalUrl,
                platform: "web",
                collectionStatus: "xcrawl",
                hot30Score: 95,
                metrics: { chars: bodyLen },
              }];
              return { contentSamples, rawMaterials: [], candidates: [], assets: [] };
            }
            log("XCrawl 抓取无正文");
          }
        } else {
          const xcBody = await xcRes.text().catch(() => "");
          log(`XCrawl HTTP ${xcRes.status}${xcBody ? ` ${xcBody.slice(0, 200)}` : ""}`);
        }
      } catch (xcErr) {
        log(`XCrawl 抓取异常：${xcErr.message}`);
      }
    }
    // 最终回退：hot30 按关键词过滤
    log(`回退到 hot30 搜索`);
    state.assetStatus = "正在查询历史素材";
    renderToday();
    const hot30 = await loadHot30StateByKw(title);
    if (hot30?.contentSamples?.length) return hot30;
    state.assetStatus = "信号采集无结果";
    log("未找到相关文章，建议换关键词或使用素材库。");
    return { contentSamples: [], rawMaterials: [], candidates: [], assets: [] };
  } catch (error) {
    state.assetStatus = "信号采集失败";
    log(`信号采集失败：${error.message}`);
    try {
      const kw = (state.signalKeywords || state.signalSearchQuery || "").trim();
      if (kw) {
        const hot30 = await loadHot30StateByKw(kw);
        if (hot30?.contentSamples?.length) return hot30;
      }
    } catch {}
    return { contentSamples: [], rawMaterials: [], candidates: [], assets: [] };
  }
}

// hot30 关键词检索（信号采集回退用）
async function loadHot30StateByKw(kw) {
  if (!kw) return null;
  const params = new URLSearchParams({ limit: "20", keywords: kw });
  const workspace = state.hot30Workspace || "";
  if (workspace) params.set("workspace", workspace);
  const res = await fetch(apiPath(`/api/samples/hot30?${params.toString()}`));
  if (!res.ok) return null;
  const result = await res.json();
  if (!result.ok) return null;
  const items = Array.isArray(result.items) ? result.items : [];
  if (!items.length) return null;
  const contentSamples = items.map((item) => ({
    ...item,
    sourceUrl: item.url,
    hot30Score: item.score,
  }));
  return { contentSamples, rawMaterials: [], candidates: [], assets: [] };
}

async function loadFullAssetState() {
  try {
    const res = await fetch(apiPath("/api/state"));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const db = await res.json();
    return {
      ...db,
      contentSamples: Array.isArray(db.contentSamples) ? db.contentSamples : [],
      rawMaterials: Array.isArray(db.rawMaterials) ? db.rawMaterials : [],
      candidates: Array.isArray(db.candidates) ? db.candidates : [],
      assets: Array.isArray(db.assets) ? db.assets : [],
      finalWorks: Array.isArray(db.finalWorks) ? db.finalWorks : [],
    };
  } catch (error) {
    console.warn("loadFullAssetState failed", error);
    return {
      contentSamples: [],
      rawMaterials: [],
      candidates: [],
      assets: [],
      finalWorks: [],
    };
  }
}

async function syncLocalFinalWorksToServer(localWorks = [], remoteWorks = []) {
  const remoteIds = new Set(remoteWorks.map((item) => item?.id).filter(Boolean));
  const missing = localWorks.filter((item) => item?.id && item.body && !remoteIds.has(item.id)).slice(0, 30);
  if (!missing.length) return { uploaded: 0, finalWorks: remoteWorks };
  let uploaded = 0;
  for (const work of missing) {
    try {
      const res = await fetch(apiPath("/api/final-works"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ work }),
      });
      const result = await res.json();
      if (res.ok && result.ok) uploaded += 1;
    } catch (error) {
      log(`本机旧作品同步失败：${work.title || work.id} / ${error.message}`);
    }
  }
  try {
    const res = await fetch(apiPath("/api/final-works"));
    const result = await res.json();
    if (res.ok && result.ok && Array.isArray(result.finalWorks)) {
      return { uploaded, finalWorks: result.finalWorks };
    }
  } catch (error) {
    log(`同步后读取 122 作品库失败：${error.message}`);
  }
  return { uploaded, finalWorks: remoteWorks };
}

function sourceTitleForTarget() {
  if (state.sourceChannel !== "same-platform") return currentSource().title;
  const map = {
    xhs: "小红书同平台素材",
    douyin: "抖音同平台素材",
    "video-account": "视频号同平台素材",
    "wechat-article": "公众号长文同平台素材",
    moments: "朋友圈私域素材",
    "topic-only": "全库选题资产",
  };
  return map[state.publishTarget] || currentSource().title;
}

function platformWanted() {
  if (state.sourceChannel === "same-platform") return currentTarget().platform;
  if (state.sourceChannel === "xhs") return "xiaohongshu";
  if (state.sourceChannel === "x-history") return "x";
  if (state.sourceChannel === "x-live") return "x";
  if (state.sourceChannel === "manual") return "manual";
  if (state.sourceChannel === "hot30") return "all";
  return "all";
}

function buildTopicsFromDb(db) {
  const keywords = tokenize(state.keywords);
  const rawSamples = [
    ...(Array.isArray(db.contentSamples) ? db.contentSamples : []),
    ...(Array.isArray(db.rawMaterials) ? db.rawMaterials : []),
    ...(Array.isArray(db.candidates) ? db.candidates : []),
    ...(Array.isArray(db.assets) ? db.assets : []),
  ];
  const normalized = rawSamples
    .filter((item) => item && (item.title || item.text || item.content || item.body || item.copy || item.structured))
    .map(normalizeSample)
    .filter(matchesWantedPlatform);
  if (state.sourceChannel === "x-history" || state.sourceChannel === "x-live") {
    const xScored = normalized
      .map((sample) => ({ sample, score: scoreSample(sample, keywords), eligibility: judgeMotherTopicEligibility(sample) }))
      .filter((item) => shouldKeepXSample(item, keywords))
      .sort(sortXHistorySample);
    const balanced = balanceXHistoryScored(xScored);
    return dedupeMotherTopics(balanced.map(({ sample, eligibility }, index) => {
      const topic = makeMotherTopic(sample, index, eligibility);
      if (!eligibility.pass && eligibility.blockers?.length) {
        topic.reason = `真实 X 素材，建议人工判断后再用；风险：${eligibility.blockers.slice(0, 2).join("；")}。`;
      }
      return topic;
    })).slice(0, 10);
  }
  if (state.sourceChannel === "hot30") {
    const hotScored = normalized
      .map((sample) => ({ sample, eligibility: judgeMotherTopicEligibility(sample) }))
      .filter((item) => cleanSourceText(`${item.sample.title} ${item.sample.body}`).length >= 10)
      .sort((a, b) => Number(b.sample.hot30Score || 0) - Number(a.sample.hot30Score || 0));
    return dedupeMotherTopics(hotScored.map(({ sample, eligibility }, index) => {
      const topic = makeMotherTopic(sample, index, eligibility);
      const m = sample.metrics || {};
      topic.reason = `30天热度分 ${Math.round(sample.hot30Score || 0)}（赞 ${m.likes || 0} / 评 ${m.comments || 0} / 藏 ${m.collects || m.saves || 0}，发布于 ${Math.round(sample.hot30AgeDays || 0)} 天前）。`;
      if (!eligibility.pass && eligibility.blockers?.length) {
        topic.reason += `风险：${eligibility.blockers.slice(0, 2).join("；")}。`;
      }
      return topic;
    })).slice(0, 10);
  }
  if (state.sourceChannel === "signal-search") {
    // 信号驱动采集：刚抓回来的热点原文/搜索结果，直接展示
    const signalSamples = normalized
      .filter((item) => cleanSourceText(`${item.title || ""} ${item.body || ""}`).length >= 10);
    if (signalSamples.length === 0) {
      log("信号采集结果为空，无法生成选题");
      return [];
    }
    // 判断是否来自 xcrawl scrape（单篇原文）
    const isSingleArticle = signalSamples.length === 1 && (signalSamples[0].body || "").length > 100;
    return dedupeMotherTopics(signalSamples.map((sample, index) => {
      const eligibility = judgeMotherTopicEligibility(sample);
      const topic = makeMotherTopic(sample, index, eligibility);
      const url = sample.sourceUrl || state.signalUrl || "";
      topic.collectionStatus = "信号采集";
      if (isSingleArticle) {
        topic.reason = `来自热点信号「${state.signalKeywords || state.signalSearchQuery || ""}」的原文抓取${url ? `（[原文](${url})）` : ""}。正文 ${(sample.body || "").length} 字符，可直接用于二创。`;
      } else {
        topic.reason = `来自热点信号「${state.signalKeywords || state.signalSearchQuery || ""}」的相关搜索结果${url ? `（[原文](${url})）` : ""}。`;
        const m = sample.metrics || {};
        const likes = m.likes || m.zans || 0;
        if (likes) topic.reason += ` 互动 ${likes} 赞。`;
      }
      if (!eligibility.pass && eligibility.blockers?.length) {
        topic.reason += ` 风险：${eligibility.blockers.slice(0, 2).join("；")}。`;
      }
      return topic;
    })).slice(0, 10);
  }
  const scored = normalized
    .map((sample) => ({ sample, score: scoreSample(sample, keywords), eligibility: judgeMotherTopicEligibility(sample) }))
    .filter((item) => shouldKeepScoredSample(item, keywords))
    .filter((item) => item.eligibility.pass)
    .sort((a, b) => b.score - a.score);
  return dedupeMotherTopics(scored.map(({ sample, eligibility }, index) => makeMotherTopic(sample, index, eligibility))).slice(0, 10);
}

function dedupeMotherTopics(topics = []) {
  const seen = new Set();
  const unique = [];
  for (const topic of topics) {
    const key = motherTopicKey(topic);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(topic);
  }
  return unique;
}

function motherTopicKey(topic = {}) {
  if (state.sourceChannel === "x-history" || state.sourceChannel === "x-live" || topic.platform === "xiaohongshu") {
    return topic.url || topic.id || cleanSourceText(topic.title || topic.theme || "").slice(0, 80);
  }
  const text = `${topic.theme} ${topic.sourceInsight?.angle || ""}`.toLowerCase();
  if (/同质化|模板|规范|点击/.test(text)) return "ai-content-template-risk";
  if (/拆文|爆款|关键|提示词/.test(text)) return "viral-deconstruction-missing-layer";
  if (/社群|同频|连接/.test(text)) return "community-filtering";
  if (/素材|清洗|去重|资产/.test(text)) return "content-asset-cleaning";
  return cleanSourceText(topic.theme || topic.title || "").slice(0, 28);
}

function shouldKeepScoredSample(item, keywords) {
  if (item.sample.platform === "xiaohongshu" && item.sample.readyForCreation === true) return true;
  if (!keywords.length) return state.sourceChannel === "all-assets";
  if (item.score > 0) return true;
  return false;
}

function shouldKeepXSample(item, keywords) {
  const text = cleanSourceText(`${item.sample.title} ${item.sample.body}`);
  const tier = String(item.sample.assetTier || "");
  const explicitGood = item.sample.keepForCreation === true || tier === "mother_topic_candidate";
  if (text.length < 20) return false;
  if (/^rt\s*@/i.test(text) || /^杞彂/.test(text)) return false;
  if (/^https?:\/\/\S+$/i.test(text)) return false;
  if (explicitGood) return true;
  if (item.sample.rejectReason && item.sample.rejectReason !== "weak_content_signal") return false;
  if (!keywords.length) return (item.sample.contentValueScore || 0) >= 55;
  if (item.score > 0 && (item.sample.contentValueScore || 0) >= 55) return true;
  return item.score > 0 && (item.eligibility.heat || 0) >= 50 && text.length >= 80;
}

function sortXHistorySample(a, b) {
  const bt = Date.parse(b.sample.collectedAt || b.sample.createdAt || 0) || 0;
  const at = Date.parse(a.sample.collectedAt || a.sample.createdAt || 0) || 0;
  return bt - at
    || Number(b.sample.keepForCreation === true) - Number(a.sample.keepForCreation === true)
    || Number(b.sample.contentValueScore || 0) - Number(a.sample.contentValueScore || 0)
    || (b.score + (b.eligibility.heat || 0) / 100) - (a.score + (a.eligibility.heat || 0) / 100);
}

function balanceXHistoryScored(items = []) {
  const good = items.filter((item) => item.sample.keepForCreation === true || item.sample.assetTier === "mother_topic_candidate");
  const backup = items.filter((item) => !(item.sample.keepForCreation === true || item.sample.assetTier === "mother_topic_candidate"));
  const groups = new Map();
  for (const item of good) {
    const account = item.sample.keyword || item.sample.authorName || item.sample.author || item.sample.source || "unknown";
    if (!groups.has(account)) groups.set(account, []);
    groups.get(account).push(item);
  }
  const picked = [];
  for (const group of groups.values()) picked.push(...group.slice(0, 2));
  const used = new Set(picked.map((item) => item.sample.url || item.sample.id || item.sample.title));
  const restGood = good.filter((item) => !used.has(item.sample.url || item.sample.id || item.sample.title));
  const restBackup = backup.filter((item) => !used.has(item.sample.url || item.sample.id || item.sample.title));
  return [...picked, ...restGood, ...restBackup];
}

function judgeMotherTopicEligibility(sample = {}) {
  if (sample.platform === "xiaohongshu" && sample.readyForCreation === true) {
    return {
      pass: true,
      reasons: [sample.qualityLabel || "小红书图文正文完整，适合进入二创"],
      blockers: [],
      heat: Number(sample.metrics?.likes || 0)
        + Number(sample.metrics?.collects || sample.metrics?.saves || 0) * 1.2
        + Number(sample.metrics?.comments || 0) * 2
        + Number(sample.metrics?.shares || 0) * 2,
    };
  }
  const text = cleanSourceText(`${sample.title} ${sample.body}`);
  const metrics = sample.metrics || {};
  const heat = Number(metrics.likes || 0)
    + Number(metrics.bookmarks || metrics.saves || metrics.collects || 0) * 1.2
    + Number(metrics.replies || metrics.comments || 0) * 2
    + Number(metrics.retweets || metrics.shares || 0) * 2
    + Number(metrics.quotes || 0) * 1.5;
  const reasons = [];
  if (text.length >= 70) reasons.push("内容信息量足够，能拆出观点或方法");
  if (heat >= 30) reasons.push("互动数据有信号");
  if (/AI|自媒体|公众号|小红书|爆款|拆文|提示词|素材|同质化|模板|社群|内容/.test(text)) reasons.push("与当前赛道相关");
  if (/怎么|为什么|问题|经验|方法|总结|避坑|拆|复盘|真正|关键|别|不要|发现/.test(text)) reasons.push("有可二创的表达角度");

  const blockers = [];
  if (text.length < 35) blockers.push("正文太短");
  if (/^rt\s*@/i.test(text) || /^转发/.test(text)) blockers.push("疑似转发内容");
  if (/^https?:\/\/\S+$/i.test(text)) blockers.push("纯链接内容");
  if (heat < 8 && text.length < 120) blockers.push("热度和信息量都偏弱");

  return {
    pass: blockers.length === 0 && reasons.length >= 2,
    reasons,
    blockers,
    heat,
  };
}

function tokenize(value) {
  return String(value || "")
    .split(/[,，、\s]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function matchesWantedPlatform(sample) {
  const wanted = platformWanted();
  if (wanted === "all") return true;
  const haystack = `${sample.platform} ${sample.source} ${sample.sourceTool} ${sample.type} ${sample.url}`.toLowerCase();
  if (wanted === "xiaohongshu") return /xiaohongshu|xhs|小红书/.test(haystack);
  if (wanted === "x") return /\b(x|twitter|xcrawl)\b|x\.com|twitter\.com/.test(haystack);
  if (wanted === "douyin") return /douyin|抖音/.test(haystack);
  if (wanted === "wechat") return /wechat|公众号|mp\.weixin/.test(haystack);
  if (wanted === "video") return /video|视频号/.test(haystack);
  if (wanted === "moments") return /moments|朋友圈|私域|manual/.test(haystack);
  if (wanted === "manual") return /manual|手动|import/.test(haystack);
  return true;
}

function scoreSample(sample, keywords) {
  const text = `${sample.title} ${sample.body} ${sample.keyword} ${sample.author || ""}`.toLowerCase();
  const compactText = text.replace(/\s+/g, "");
  const keywordScore = keywords.reduce((sum, keyword) => {
    const compactKeyword = keyword.replace(/\s+/g, "");
    if (text.includes(keyword) || compactText.includes(compactKeyword)) return sum + 14;
    const parts = expandKeywordParts(keyword);
    const matched = parts.filter((part) => text.includes(part) || compactText.includes(part.replace(/\s+/g, ""))).length;
    if (matched >= Math.min(2, parts.length)) return sum + 8 + matched * 2;
    return sum;
  }, 0);
  const metrics = sample.metrics || {};
  const heat = Number(metrics.likes || metrics.like || metrics["赞"] || metrics["点赞"] || 0)
    + Number(metrics.saves || metrics.collects || metrics["藏"] || metrics["收藏"] || 0) * 1.2
    + Number(metrics.comments || metrics["评"] || metrics["评论"] || 0) * 2;
  return keywordScore + Math.min(heat / 500, 20);
}

function expandKeywordParts(keyword) {
  const value = String(keyword || "").toLowerCase().replace(/[，、]/g, " ");
  const parts = value.split(/\s+/).filter(Boolean);
  if (/ai/.test(value)) parts.push("ai", "提示词", "自媒体", "内容");
  if (/agent|工作流/.test(value)) parts.push("agent", "工作流", "自动化");
  if (/内容资产|素材库|资产库/.test(value)) parts.push("内容", "素材", "资产", "知识库");
  return [...new Set(parts.filter((part) => part.length >= 2 || part === "ai"))];
}

function normalizeSample(item) {
  const structured = item.structured || {};
  const metrics = item.metrics || {
    likes: item.likes || item.likeCount || item.liked_count || item.heat,
    saves: item.saves || item.collects || item.collected_count,
    comments: item.comments || item.comment_count,
    shares: item.shares || item.share_count,
  };
  return {
    id: item.id || item.sourceSampleId || item.topicId || item.noteId,
    title: item.title || item.text || structured.selectedTitle || structured.keyword || "未命名素材",
    body: item.content || item.body || item.copy || item.desc || structured.body || structured.xhsCopy?.body || "",
    platform: item.platform || item.sourcePlatform || item.type || "内容资产库",
    source: item.source || item.sourceName || "",
    sourceTool: item.sourceTool || item.collector || "",
    type: item.type || "",
    keyword: item.keyword || item.sourceKeyword || structured.keyword || "",
    url: item.url || item.sourceUrl || item.noteUrl || "",
    keepForCreation: item.keepForCreation,
    assetTier: item.assetTier || item.asset_tier || "",
    rejectReason: item.rejectReason || item.reject_reason || "",
    contentValueScore: Number(item.contentValueScore || item.content_value_score || 0),
    radarScore: Number(item.radarScore || item.radar_score || 0),
    hot30Score: Number(item.hot30Score || 0),
    hot30AgeDays: Number(item.hot30AgeDays || 0),
    workspace: item.workspace || "",
    mediaType: item.mediaType || item.media?.type || "",
    qualityTier: item.qualityTier || "",
    qualityLabel: item.qualityLabel || "",
    readyForCreation: item.readyForCreation === true,
    needsTranscript: item.needsTranscript === true,
    bodyCompleteness: item.bodyCompleteness || "",
    qualityReasons: Array.isArray(item.qualityReasons) ? item.qualityReasons : [],
    collectedAt: item.collectedAt || item.collected_at || "",
    createdAt: item.createdAt || item.created_at || "",
    metrics,
    collectionStatus: item.collectionStatus || item.status || "real",
    reason: item.angle || item.reason || "",
    risk: Array.isArray(item.riskNotes) ? item.riskNotes.join("；") : item.riskNotes,
  };
}

function makeMotherTopic(sample, index, eligibility = judgeMotherTopicEligibility(sample)) {
  const sourceInsight = extractSourceInsight(sample);
  const pain = inferPain(sample, sourceInsight);
  const theme = inferTheme(sample, sourceInsight);
  return {
    id: sample.id || `topic-${index}-${Date.now()}`,
    title: sample.title,
    theme,
    platform: sample.platform || "内容资产库",
    keyword: sample.keyword || state.keywords,
    url: sample.url || "",
    body: sample.body || "",
    sourceInsight,
    metrics: sample.metrics || {},
    reason: sample.reason || `入选理由：${eligibility.reasons.slice(0, 3).join("；")}。`,
    pain,
    reuse: reuseLineForTarget(theme),
    risk: sample.risk || "复制结构和洞察，不照抄标题、正文、案例和承诺。",
    eligibility,
    collectionStatus: sample.collectionStatus || "real",
  };
}

function inferTheme(sample, pain) {
  const insight = extractSourceInsight(sample);
  const title = cleanSourceText(sample.title || "");
  if (title && title.length <= 42 && !looksLikeGenericDiagnosis(title)) return title;
  if (insight.theme) return insight.theme;
  if (title) return title.slice(0, 42);
  return `${state.businessLine}里一个值得反复改写的选题`;
}

function inferPain(sample, sourceInsight = extractSourceInsight(sample)) {
  const text = cleanSourceText(`${sample.title} ${sample.body}`);
  const match = text.match(/[^。！？\n]*(不知道|怎么|为什么|到底|不会|分不清|没效果|没流量|没人看|卡住|走弯路|焦虑)[^。！？\n]*/);
  if (match && !looksLikeGenericDiagnosis(match[0])) return match[0].slice(0, 90);
  if (sourceInsight.pain) return sourceInsight.pain;
  return `做 ${state.businessLine} 的人，最怕不是不会用工具，而是看不出什么内容值得拆、怎么改才不像模板。`;
}

function extractSourceInsight(sample = {}) {
  const title = cleanSourceText(sample.title || "");
  const body = cleanSourceText(sample.body || "");
  const text = `${title}\n${body}`;
  if (/套路|模板|同质化|规范|点击/.test(text)) {
    return {
      theme: "AI 自媒体内容别再套模板，平台已经开始打同质化",
      pain: "很多人用 AI 写得更快了，但内容越来越像模板，担心没流量甚至被平台判低质。",
      angle: "从平台规则和同质化风险切入，讲普通人如何把 AI 内容写得更像自己的经验。",
    };
  }
  if (/拆文|爆款|100篇|关键的一层|提示词/.test(text)) {
    return {
      theme: "拆了很多爆款还不火，可能漏掉了真正该拆的一层",
      pain: "很多人只抄标题和结构，却没有拆出爆款背后的用户问题、情绪和行动理由。",
      angle: "从拆爆款的误区切入，讲如何从素材里提炼选题、痛点和表达节奏。",
    };
  }
  if (/社群|同频|创业者|连接/.test(text)) {
    return {
      theme: "做 AI 自媒体，不只是发内容，还要筛选同频的人",
      pain: "很多人发了很多内容，但没有把内容变成筛选客户、连接同频人的入口。",
      angle: "从社群和同频连接切入，讲内容如何承担获客和筛选用户的功能。",
    };
  }
  if (/素材|清洗|去重|素材功能/.test(text)) {
    return {
      theme: "AI 内容工厂真正卡住的，往往是素材清洗和去重",
      pain: "很多人以为内容生产难在生成，其实难在素材太乱、重复太多、无法稳定复用。",
      angle: "从素材工程切入，讲内容资产库为什么比单次写作更重要。",
    };
  }
  if (title) {
    return {
      theme: title.slice(0, 42),
      pain: `这条素材暴露的问题是：${title.slice(0, 70)}`,
      angle: "从源头素材的真实观点切入，改写成适合目标平台的内容。",
    };
  }
  return { theme: "", pain: "", angle: "" };
}

function cleanSourceText(value = "") {
  return String(value || "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeGenericDiagnosis(value = "") {
  return /用户关心|判断标准|行动入口|更具体/.test(String(value || ""));
}

function reuseLineForTarget(theme) {
  return `选题“${theme}”后续可改成小红书图文、公众号长文、短视频脚本和朋友圈文案。`;
}

