import { randomUUID } from 'node:crypto';

let pgPool = null;

export async function initCollectorHub({ databaseUrl = process.env.DATABASE_URL } = {}) {
  if (!databaseUrl) return { ok: true, mode: 'disabled', reason: 'DATABASE_URL is not configured' };
  if (!pgPool) {
    const pg = await import('pg');
    pgPool = new pg.Pool({
      connectionString: databaseUrl,
      max: Number(process.env.COLLECTOR_DB_POOL_MAX || process.env.DB_POOL_MAX || 8),
      idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
    });
  }
  await ensureCollectorSchema();
  return { ok: true, mode: 'postgres' };
}

export async function collectorHealth() {
  if (!pgPool) {
    await initCollectorHub();
  }
  const checks = {
    postgres: Boolean(pgPool),
    xcrawl: Boolean(process.env.XCRAWL_API_KEY),
    mediacrawlerRoot: process.env.MEDIACRAWLER_ROOT || null,
  };
  let counts = null;
  if (pgPool) {
    const result = await pgPool.query(`
      select
        (select count(*)::int from longka_collection_runs) as runs,
        (select count(*)::int from longka_content_samples) as samples
    `);
    counts = result.rows[0];
  }
  return { ok: true, checks, counts };
}

export async function loadRecentContentAssets(input = {}) {
  await requireCollectorDb();
  const limit = clampNumber(input.limit || 100, 1, 300);
  const platform = normalizeText(input.platform || 'x');
  const result = await pgPool.query(`
    select
      id, run_id, collector_type, platform, source_type, source_url, source_id,
      author_name, author_id, title, body, markdown, language, keyword, label_type,
      metrics, comments, raw_json, published_at, collected_at, created_at
    from longka_content_samples
    where ($1 = '' or platform = $1)
    order by collected_at desc, created_at desc
    limit $2
  `, [platform, limit]);
  const samples = result.rows.map(dbRowToContentSample);
  const evaluated = evaluateXContentSamples(samples);
  const candidates = evaluated.candidates.slice(0, 20);
  const assetBuckets = buildXAssetBuckets(evaluated.rows);
  const contentEngine = buildContentEngineArtifacts(assetBuckets, {
    sourceAccounts: [...new Set(samples.map((sample) => sample.keyword).filter(Boolean))].slice(0, 20),
    totalSampleCount: samples.length,
  });
  return {
    ok: true,
    platform,
    sourceType: 'recent_content_assets',
    totalSampleCount: samples.length,
    candidates,
    candidateCount: evaluated.candidates.length,
    rejectedCount: evaluated.rejected.length,
    rejectedStats: evaluated.rejectedStats,
    assetBuckets,
    contentEngine,
    samples: samples.slice(0, 30),
    message: 'Recent content assets loaded from database.',
  };
}

// hot30：近 30 天样本按互动热度评分排序，供 topic-engine "30天热点"选题信号消费。
// 依据 spec: docs/specs/2026-06-12-collection-pipeline-rebuild-spec.md §7
// score = (likes×1.0 + comments×2.5 + collects×1.5 + shares×2.0) × 时效衰减（半衰期 10 天）
export async function loadHot30Samples(input = {}) {
  await requireCollectorDb();
  const limit = clampNumber(input.limit || 30, 1, 100);
  const workspace = normalizeText(input.workspace || '');
  const platform = normalizeText(input.platform || '');
  const keywords = normalizeText(input.keywords || '');
  const kwList = keywords ? keywords.split(',').map((k) => k.trim()).filter(Boolean) : [];
  // 构建关键词 ILIKE 条件
  let kwWhere = '';
  const params = [workspace, platform];
  if (kwList.length > 0) {
    const likes = kwList.map((_, i) => `(title ILIKE $${i + 3} OR body ILIKE $${i + 3} OR keyword ILIKE $${i + 3})`).join(' OR ');
    kwWhere = ` AND (${likes})`;
    params.push(...kwList.map((k) => `%${k}%`));
  }
  const result = await pgPool.query(`
    select id, platform, source_id, source_url, title, body, keyword, label_type,
           metrics, published_at, collected_at,
           coalesce(workspace, '') as workspace
    from longka_content_samples
    where published_at >= now() - interval '30 days'
      and ($1 = '' or coalesce(workspace, '') = $1)
      and ($2 = '' or platform = $2)
      ${kwWhere}
  `, params);
  const now = Date.now();
  const scored = result.rows.map((row) => {
    const metrics = row.metrics || {};
    const likes = Number(metrics.likes) || 0;
    const comments = Number(metrics.comments) || Number(metrics.replies) || 0;
    const collects = Number(metrics.collects) || Number(metrics.bookmarks) || 0;
    const shares = Number(metrics.shares) || Number(metrics.retweets) || 0;
    const engagement = likes * 1.0 + comments * 2.5 + collects * 1.5 + shares * 2.0;
    const ageDays = Math.max(0, (now - new Date(row.published_at).getTime()) / 86400000);
    const recency = Math.pow(0.5, ageDays / 10);
    const score = Math.round(engagement * (0.3 + 0.7 * recency) * 100) / 100;
    return {
      id: row.id,
      platform: row.platform,
      sourceId: row.source_id,
      url: row.source_url,
      title: normalizeText(row.title || '') || normalizeText(row.body || '').slice(0, 60),
      body: normalizeText(row.body || '').slice(0, 2000),
      keyword: row.keyword,
      workspace: row.workspace,
      labelType: row.label_type,
      metrics: { likes, comments, collects, shares },
      publishedAt: row.published_at,
      ageDays: Math.round(ageDays * 10) / 10,
      score,
    };
  });
  scored.sort((a, b) => b.score - a.score);
  return {
    ok: true,
    workspace: workspace || 'all',
    platform: platform || 'all',
    windowDays: 30,
    totalInWindow: scored.length,
    items: scored.slice(0, limit),
  };
}

export async function loadUnifiedContentAssets(input = {}) {
  await requireCollectorDb();
  const limit = clampNumber(input.limit || 200, 1, 500);
  const poolLimit = clampNumber(input.poolLimit || Math.max(limit * 5, 200), limit, 1000);
  const platform = normalizeText(input.platform || '');
  const workspace = normalizeText(input.workspace || input.businessLine || '');
  const keywords = parseSearchWords(input.keywords || input.keyword || '');
  let runIds = parseSearchWords(input.runIds || input.run_ids || '');
  const latestRunCount = clampNumber(input.latestRunCount || input.latest_run_count || 0, 0, 20);
  const unusedOnly = normalizeBoolean(input.unusedOnly || input.unused_only);
  const creationOnly = normalizeBoolean(input.creationOnly || input.creation_only);
  if (!runIds.length && latestRunCount > 0 && platform) {
    runIds = await loadLatestCollectionRunIds({ platform, limit: latestRunCount });
  }
  const result = await pgPool.query(`
    select
      id, run_id, collector_type, platform, source_type, source_url, source_id,
      author_name, author_id, title, body, markdown, language, keyword, label_type,
      metrics, comments, raw_json, published_at, collected_at, created_at
    from longka_content_samples
    where ($1 = '' or platform = $1 or ($1 in ('xiaohongshu','xhs') and platform in ('xiaohongshu','xhs')))
      and ($3::text[] is null or run_id = any($3::text[]))
      and ($4 = '' or workspace = $4 or workspace ilike '%'||$4||'%' or $4 ilike '%'||coalesce(nullif(workspace,''),'__none__')||'%')
    order by collected_at desc, created_at desc
    limit $2
  `, [platform, poolLimit, runIds.length ? runIds : null, workspace]);
  const samples = result.rows.map(dbRowToContentSample);
  const preparedSamples = platform === 'x' ? evaluateXContentSamples(samples).rows : samples;
  let assets = preparedSamples
    .map((sample) => contentSampleToUnifiedAsset(sample, keywords))
    .filter((asset) => !keywords.length || asset.matchScore > 0)
    .sort((a, b) => {
      if (platform === 'x') {
        return Date.parse(b.collectedAt || b.createdAt || 0) - Date.parse(a.collectedAt || a.createdAt || 0)
          || Number(b.keepForCreation === true) - Number(a.keepForCreation === true)
          || Number(b.contentValueScore || 0) - Number(a.contentValueScore || 0)
          || b.matchScore - a.matchScore
          || b.heatScore - a.heatScore;
      }
      return b.matchScore - a.matchScore || b.heatScore - a.heatScore;
    })
  assets = await attachAssetConfirmationStatus(assets);
  if (unusedOnly) {
    assets = assets.filter((asset) => !asset.confirmationStatus || asset.confirmationStatus === 'discarded');
  }
  if (creationOnly) {
    assets = assets.filter((asset) => {
      if (asset.platform === 'x') return asset.keepForCreation === true || asset.assetTier === 'mother_topic_candidate';
      if (asset.platform === 'xiaohongshu') return asset.readyForCreation === true;
      return true;
    });
  }
  assets = assets.slice(0, limit);
  return {
    ok: true,
    sourceType: 'unified_content_assets',
    platform: platform || 'all',
    keywords,
    runIds,
    latestRunCount,
    unusedOnly,
    creationOnly,
    totalSourceSamples: samples.length,
    matchedCount: assets.length,
    assets,
    samples: assets,
    message: assets.length
      ? 'Unified content assets loaded from PostgreSQL sample library.'
      : 'No unified content assets matched the current platform and keywords.',
  };
}

export async function loadXBatchAssets(input = {}) {
  await requireCollectorDb();
  const runIds = parseSearchWords(input.runIds || input.run_ids || '');
  if (!runIds.length) {
    return { ok: false, error: 'missing_run_ids', message: 'runIds is required.' };
  }
  const result = await pgPool.query(`
    select
      id, run_id, collector_type, platform, source_type, source_url, source_id,
      author_name, author_id, title, body, markdown, language, keyword, label_type,
      metrics, comments, raw_json, published_at, collected_at, created_at
    from longka_content_samples
    where platform = 'x' and run_id = any($1::text[])
    order by collected_at desc, created_at desc
  `, [runIds]);
  const samples = result.rows.map(dbRowToContentSample);
  const evaluated = evaluateXContentSamples(samples);
  const buckets = {
    goodPosts: evaluated.rows.filter((sample) => sample.assetTier === 'mother_topic_candidate'),
    assetOnly: evaluated.rows.filter((sample) => sample.assetTier === 'asset_only'),
    rejected: evaluated.rows.filter((sample) => sample.assetTier === 'rejected'),
  };
  const accountStats = {};
  for (const sample of evaluated.rows) {
    const account = sample.keyword || sample.authorId || sample.authorName || 'unknown';
    if (!accountStats[account]) accountStats[account] = { total: 0, good: 0, asset: 0, rejected: 0 };
    accountStats[account].total += 1;
    if (sample.assetTier === 'mother_topic_candidate') accountStats[account].good += 1;
    else if (sample.assetTier === 'asset_only') accountStats[account].asset += 1;
    else accountStats[account].rejected += 1;
  }
  return {
    ok: true,
    platform: 'x',
    runIds,
    totalSampleCount: samples.length,
    accountStats,
    rejectedStats: evaluated.rejectedStats,
    buckets,
    samples: evaluated.rows,
  };
}

export async function loadLatestXBatch(input = {}) {
  await requireCollectorDb();
  const limitRuns = clampNumber(input.limitRuns || input.limit_runs || 3, 1, 20);
  const runs = await pgPool.query(`
    select id, query, status, started_at, finished_at, created_at
    from longka_collection_runs
    where platform = 'x'
      and collector_type = 'xcrawl'
      and source_type = 'x_user_tweets'
      and status = 'completed'
    order by coalesce(finished_at, created_at) desc
    limit $1
  `, [limitRuns]);
  const runIds = runs.rows.map((row) => row.id);
  if (!runIds.length) {
    return { ok: false, error: 'no_recent_x_batch', message: 'No recent completed X collection runs found.' };
  }
  const batch = await loadXBatchAssets({ runIds });
  return {
    ...batch,
    sourceType: 'latest_x_batch',
    runs: runs.rows,
  };
}

export async function loadRecentCollectionBatches(input = {}) {
  await requireCollectorDb();
  const platform = normalizeText(input.platform || '');
  const limit = clampNumber(input.limit || 20, 1, 100);
  const result = await pgPool.query(`
    select
      r.id,
      r.collector_type,
      r.platform,
      r.source_type,
      r.query,
      r.status,
      r.label_type,
      r.started_at,
      r.finished_at,
      r.created_at,
      count(s.id)::int as sample_count,
      count(c.id)::int as confirmed_count
    from longka_collection_runs r
    left join longka_content_samples s on s.run_id = r.id
    left join longka_asset_confirmations c on c.sample_id = s.id and c.status = 'confirmed'
    where ($1 = '' or r.platform = $1)
      and r.status = 'completed'
    group by r.id
    order by coalesce(r.finished_at, r.created_at) desc
    limit $2
  `, [platform, limit]);
  return {
    ok: true,
    platform: platform || 'all',
    batches: result.rows.map((row) => ({
      id: row.id,
      runId: row.id,
      collectorType: row.collector_type,
      platform: row.platform,
      sourceType: row.source_type,
      query: row.query,
      status: row.status,
      labelType: row.label_type,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      createdAt: row.created_at,
      sampleCount: row.sample_count,
      confirmedCount: row.confirmed_count,
      unusedCount: Math.max(0, Number(row.sample_count || 0) - Number(row.confirmed_count || 0)),
    })),
  };
}

async function loadLatestCollectionRunIds({ platform = '', limit = 1 } = {}) {
  const result = await pgPool.query(`
    select id
    from longka_collection_runs
    where ($1 = '' or platform = $1)
      and status = 'completed'
    order by coalesce(finished_at, created_at) desc
    limit $2
  `, [platform, limit]);
  return result.rows.map((row) => row.id);
}

async function attachAssetConfirmationStatus(assets = []) {
  const ids = assets.map((asset) => asset.sourceSampleId || asset.id).filter(Boolean);
  if (!ids.length) return assets;
  const result = await pgPool.query(`
    select distinct on (sample_id)
      sample_id,
      destination,
      status,
      created_at,
      updated_at
    from longka_asset_confirmations
    where sample_id = any($1::text[])
    order by sample_id, updated_at desc
  `, [ids]);
  const bySample = new Map(result.rows.map((row) => [row.sample_id, row]));
  return assets.map((asset) => {
    const row = bySample.get(asset.sourceSampleId || asset.id);
    return {
      ...asset,
      used: row?.status === 'confirmed',
      confirmationDestination: row?.destination || '',
      confirmationStatus: row?.status || '',
      confirmedAt: row?.updated_at || row?.created_at || null,
    };
  });
}

export async function confirmContentAsset(input = {}) {
  await requireCollectorDb();
  const sampleId = normalizeText(input.sampleId || input.sample_id || '');
  const destination = normalizeText(input.destination || 'mother_topic');
  if (!sampleId) {
    return { ok: false, error: 'missing_sample_id', message: 'sampleId is required.' };
  }
  const rowResult = await pgPool.query(`
    select
      id, run_id, collector_type, platform, source_type, source_url, source_id,
      author_name, author_id, title, body, markdown, language, keyword, label_type,
      metrics, comments, raw_json, published_at, collected_at, created_at
    from longka_content_samples
    where id = $1
    limit 1
  `, [sampleId]);
  if (!rowResult.rows.length) {
    return { ok: false, error: 'sample_not_found', message: `Sample not found: ${sampleId}` };
  }
  const sample = evaluateXContentSamples([dbRowToContentSample(rowResult.rows[0])]).rows[0];
  const now = new Date().toISOString();
  const confirmationId = `asset-confirm-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const deconstruction = destination === 'discard'
    ? null
    : buildViralDeconstructionCard(sample, { destination, operatorNote: input.operatorNote || input.operator_note || '' });
  await pgPool.query(`
    insert into longka_asset_confirmations
      (id, sample_id, run_id, platform, destination, status, operator_note, deconstruction, created_at, updated_at)
    values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10)
    on conflict (sample_id, destination) do update set
      status = excluded.status,
      operator_note = excluded.operator_note,
      deconstruction = excluded.deconstruction,
      updated_at = excluded.updated_at
  `, [
    confirmationId,
    sample.id,
    sample.runId,
    sample.platform,
    destination,
    destination === 'discard' ? 'discarded' : 'confirmed',
    normalizeText(input.operatorNote || input.operator_note || ''),
    JSON.stringify(deconstruction),
    now,
    now,
  ]);
  return {
    ok: true,
    confirmationId,
    destination,
    sample,
    deconstruction,
  };
}

export async function deleteCollectionRun(input = {}) {
  await requireCollectorDb();
  const runId = normalizeText(input.runId || input.run_id || input.id || '');
  if (!runId) return { ok: false, error: 'missing_run_id', message: 'runId is required.' };
  const before = await pgPool.query(
    'select id, platform, source_type, query, status from longka_collection_runs where id=$1',
    [runId],
  );
  const sampleCount = await pgPool.query(
    'select count(*)::int as count from longka_content_samples where run_id=$1',
    [runId],
  );
  if (!before.rows.length && !sampleCount.rows[0]?.count) {
    return { ok: false, error: 'run_not_found', message: `Collection run not found: ${runId}` };
  }
  await pgPool.query('begin');
  try {
    const deletedSamples = await pgPool.query('delete from longka_content_samples where run_id=$1 returning id', [runId]);
    const deletedRun = await pgPool.query('delete from longka_collection_runs where id=$1 returning id', [runId]);
    await pgPool.query('commit');
    return {
      ok: true,
      runId,
      run: before.rows[0] || null,
      sampleCount: sampleCount.rows[0]?.count || 0,
      deletedSamples: deletedSamples.rowCount,
      deletedRuns: deletedRun.rowCount,
    };
  } catch (error) {
    await pgPool.query('rollback');
    throw error;
  }
}

export async function createCollectionRun(input = {}) {
  await requireCollectorDb();
  const now = new Date().toISOString();
  const run = {
    id: input.id || `run-${Date.now()}-${randomUUID().slice(0, 8)}`,
    collectorType: normalizeText(input.collectorType || input.collector_type || 'manual_import'),
    platform: normalizeText(input.platform || 'unknown'),
    sourceType: normalizeText(input.sourceType || input.source_type || 'unknown'),
    query: normalizeText(input.query || input.keyword || input.account || ''),
    status: normalizeText(input.status || 'running'),
    labelType: normalizeText(input.labelType || input.label_type || 'unknown'),
    sourceConfig: input.sourceConfig || input.source_config || {},
    startedAt: input.startedAt || now,
    finishedAt: input.finishedAt || null,
    createdAt: now,
  };
  await pgPool.query(`
    insert into longka_collection_runs
      (id, collector_type, platform, source_type, query, status, label_type, source_config, started_at, finished_at, created_at)
    values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11)
    on conflict (id) do update set
      status = excluded.status,
      finished_at = excluded.finished_at,
      source_config = excluded.source_config
  `, [
    run.id,
    run.collectorType,
    run.platform,
    run.sourceType,
    run.query,
    run.status,
    run.labelType,
    JSON.stringify(run.sourceConfig),
    run.startedAt,
    run.finishedAt,
    run.createdAt,
  ]);
  return run;
}

export async function finishCollectionRun(runId, patch = {}) {
  await requireCollectorDb();
  const status = normalizeText(patch.status || 'completed');
  await pgPool.query(
    'update longka_collection_runs set status=$2, finished_at=coalesce($3, now()), error=$4 where id=$1',
    [runId, status, patch.finishedAt || null, patch.error || null],
  );
}

export async function importLocalPlatformBatch(input = {}) {
  await requireCollectorDb();
  const platform = normalizeText(input.platform || input.sourcePlatform || '').toLowerCase();
  const allowed = new Set(['xiaohongshu', 'xhs', 'wechat', 'wechat_article', 'toutiao', 'douyin', 'kuaishou', 'bilibili', 'zhihu', 'rss', 'webpage']);
  if (!allowed.has(platform)) {
    return { ok: false, error: 'unsupported_platform', message: `Unsupported local platform import: ${platform || 'empty'}` };
  }
  const samples = Array.isArray(input.samples) ? input.samples : [];
  if (!samples.length) {
    return { ok: false, error: 'empty_samples', message: 'samples must contain at least one collected item.' };
  }
  const normalizedPlatform = platform === 'xhs' ? 'xiaohongshu' : platform;
  const query = normalizeText(input.query || input.keyword || input.account || input.batchName || '');
  const workspace = normalizeText(input.workspace || '');
  const run = await createCollectionRun({
    id: normalizeText(input.runId || input.run_id || ''),
    collectorType: normalizeText(input.collectorType || 'local_platform_helper'),
    platform: normalizedPlatform,
    sourceType: normalizeText(input.sourceType || input.source_type || 'local_browser_batch'),
    query,
    status: 'running',
    labelType: normalizeText(input.labelType || input.label_type || 'radar_seed'),
    sourceConfig: {
      batchName: normalizeText(input.batchName || input.batch_name || ''),
      operator: normalizeText(input.operator || ''),
      deviceName: normalizeText(input.deviceName || input.device_name || ''),
      sourceMode: normalizeText(input.sourceMode || input.source_mode || ''),
      uploadMode: 'local-helper-to-122',
      clientVersion: normalizeText(input.clientVersion || input.client_version || ''),
      rawCount: samples.length,
    },
    startedAt: input.startedAt || input.started_at || new Date().toISOString(),
  });
  const ingested = await ingestContentSamples(samples, {
    runId: run.id,
    collectorType: run.collectorType,
    platform: normalizedPlatform,
    sourceType: run.sourceType,
    keyword: query,
    workspace,
    labelType: run.labelType,
    language: input.language || 'zh',
  });
  await finishCollectionRun(run.id, { status: 'completed', finishedAt: input.finishedAt || input.finished_at || new Date().toISOString() });
  return {
    ok: true,
    platform: normalizedPlatform,
    run,
    totalSampleCount: ingested.length,
    samples: ingested.slice(0, 20),
    message: `Local ${normalizedPlatform} batch imported into PostgreSQL.`,
  };
}

export async function ingestContentSamples(samples = [], context = {}) {
  await requireCollectorDb();
  const normalized = samples.map((sample) => normalizeContentSample(sample, context));
  for (const sample of normalized) {
    await pgPool.query(`
      insert into longka_content_samples (
        id, run_id, collector_type, platform, source_type, source_url, source_id,
        author_name, author_id, title, body, markdown, language, keyword, label_type,
        metrics, comments, raw_json, published_at, collected_at, created_at, workspace
      )
      values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
        $16::jsonb,$17::jsonb,$18::jsonb,$19,$20,$21,$22
      )
      on conflict (platform, source_id) do update set
        run_id = excluded.run_id,
        collector_type = excluded.collector_type,
        source_type = excluded.source_type,
        source_url = excluded.source_url,
        author_name = excluded.author_name,
        author_id = excluded.author_id,
        title = excluded.title,
        body = excluded.body,
        markdown = excluded.markdown,
        keyword = excluded.keyword,
        label_type = excluded.label_type,
        metrics = excluded.metrics,
        comments = excluded.comments,
        raw_json = excluded.raw_json,
        published_at = excluded.published_at,
        collected_at = excluded.collected_at,
        workspace = excluded.workspace
    `, [
      sample.id,
      sample.runId,
      sample.collectorType,
      sample.platform,
      sample.sourceType,
      sample.sourceUrl,
      sample.sourceId,
      sample.authorName,
      sample.authorId,
      sample.title,
      sample.body,
      sample.markdown,
      sample.language,
      sample.keyword,
      sample.labelType,
      JSON.stringify(sample.metrics),
      JSON.stringify(sample.comments),
      JSON.stringify(sample.rawJson),
      sample.publishedAt,
      sample.collectedAt,
      sample.createdAt,
      sample.workspace,
    ]);
  }
  return normalized;
}

export async function runXcrawlXUserTweets(input = {}) {
  await requireCollectorDb();
  const apiKey = process.env.XCRAWL_API_KEY || input.apiKey;
  if (!apiKey) {
    return { ok: false, error: 'missing_xcrawl_api_key', message: 'XCRAWL_API_KEY is not configured.' };
  }
  const screenName = normalizeText(input.screenName || input.screen_name || input.account || '');
  if (!screenName) {
    return { ok: false, error: 'missing_screen_name', message: 'screenName is required.' };
  }
  const maxTweets = clampNumber(input.maxTweets || input.max_tweets || 10, 1, 100);
  const pages = clampNumber(input.pages || 1, 1, 10);
  const labelType = normalizeText(input.labelType || input.label_type || 'unknown');
  const run = await createCollectionRun({
    collectorType: 'xcrawl',
    platform: 'x',
    sourceType: 'x_user_tweets',
    query: screenName,
    labelType,
    sourceConfig: { screenName, maxTweets, pages },
  });
  try {
    const response = await fetch('https://run.xcrawl.com/v1/data', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        engine: 'x_user_tweets',
        screen_name: screenName,
        max_tweets: maxTweets,
        pages,
        delay: clampNumber(input.delay || 1, 0, 30),
      }),
    });
    const rawText = await response.text();
    let payload;
    try {
      payload = JSON.parse(rawText);
    } catch {
      throw new Error(`XCrawl returned non-JSON response: ${rawText.slice(0, 200)}`);
    }
    if (!response.ok || payload.status === 'failed' || payload.error) {
      throw new Error(payload.error || payload.message || `XCrawl request failed: HTTP ${response.status}`);
    }
    const result = payload.data?.data?.result || {};
    const user = result.user || {};
    const tweets = Array.isArray(result.tweets) ? result.tweets : [];
    const samples = tweets.map((tweet) => xTweetToContentSample(tweet, {
      runId: run.id,
      screenName,
      user,
      labelType,
      rawEnvelope: payload,
    }));
    const ingested = await ingestContentSamples(samples, {
      runId: run.id,
      collectorType: 'xcrawl',
      platform: 'x',
      sourceType: 'x_user_tweets',
      keyword: screenName,
      labelType,
    });
    await finishCollectionRun(run.id, { status: 'completed' });
    return {
      ok: true,
      run,
      account: screenName,
      credits: payload.total_credits_used || null,
      pagesFetched: result.pages_fetched || null,
      nextCursor: result.next_cursor || null,
      user: sanitizeXUser(user),
      sampleCount: ingested.length,
      samples: ingested.slice(0, 20),
    };
  } catch (error) {
    await finishCollectionRun(run.id, { status: 'failed', error: error.message });
    return { ok: false, run, error: 'xcrawl_failed', message: error.message };
  }
}

export async function runXcrawlXUserTweetsBatch(input = {}) {
  const accounts = parseCleanXAccountList(input.accounts || input.screenNames || input.screen_names || input.account || input.screenName);
  if (!accounts.length) {
    return { ok: false, error: 'missing_accounts', message: 'Please provide at least one X account.' };
  }
  const maxAccounts = clampNumber(input.maxAccounts || input.max_accounts || 10, 1, 30);
  const selectedAccounts = accounts.slice(0, maxAccounts);
  const maxTweets = clampNumber(input.maxTweets || input.max_tweets || 20, 1, 100);
  const pages = clampNumber(input.pages || 1, 1, 10);
  const labelType = normalizeText(input.labelType || input.label_type || 'radar_seed');
  const results = [];
  for (const account of selectedAccounts) {
    const result = await runXcrawlXUserTweets({
      account,
      maxTweets,
      pages,
      labelType,
      delay: input.delay ?? 1,
    });
    results.push(result);
  }
  const allSamples = results.flatMap((result) => Array.isArray(result.samples) ? result.samples : []);
  const evaluated = evaluateXContentSamples(allSamples);
  const candidates = evaluated.candidates.slice(0, 20);
  const assetBuckets = buildXAssetBuckets(evaluated.rows);
  const contentEngine = buildContentEngineArtifacts(assetBuckets, {
    sourceAccounts: selectedAccounts,
    totalSampleCount: allSamples.length,
  });
  return {
    ok: results.some((result) => result.ok),
    platform: 'x',
    sourceType: 'x_user_tweets_batch',
    requestedAccounts: accounts.length,
    accounts: selectedAccounts,
    successCount: results.filter((result) => result.ok).length,
    failCount: results.filter((result) => !result.ok).length,
    totalSampleCount: results.reduce((sum, result) => sum + Number(result.sampleCount || 0), 0),
    totalCredits: results.reduce((sum, result) => sum + Number(result.credits || 0), 0) || null,
    results,
    candidates,
    candidateCount: evaluated.candidates.length,
    rejectedCount: evaluated.rejected.length,
    rejectedStats: evaluated.rejectedStats,
    assetBuckets,
    contentEngine,
    message: 'X account radar collection finished.',
  };
}

export async function runXcrawlStandard(endpoint, input = {}) {
  await requireCollectorDb();
  const allowed = new Set(['scrape', 'map', 'crawl', 'search']);
  if (!allowed.has(endpoint)) {
    return { ok: false, error: 'unsupported_xcrawl_endpoint', message: `Unsupported XCrawl endpoint: ${endpoint}` };
  }
  const apiKey = process.env.XCRAWL_API_KEY || input.apiKey;
  if (!apiKey) {
    return { ok: false, error: 'missing_xcrawl_api_key', message: 'XCRAWL_API_KEY is not configured.' };
  }
  const run = await createCollectionRun({
    collectorType: 'xcrawl',
    platform: normalizeText(input.platform || endpoint),
    sourceType: `xcrawl_${endpoint}`,
    query: normalizeText(input.query || input.url || ''),
    labelType: normalizeText(input.labelType || input.label_type || 'unknown'),
    sourceConfig: redactedXcrawlInput(endpoint, input),
  });
  try {
    const requestBody = buildXcrawlStandardBody(endpoint, input);
    const payload = await requestXcrawl(endpoint, requestBody, apiKey);
    const samples = normalizeXcrawlStandardSamples(endpoint, payload, {
      runId: run.id,
      labelType: normalizeText(input.labelType || input.label_type || 'unknown'),
      keyword: normalizeText(input.query || input.url || ''),
    });
    const ingested = samples.length ? await ingestContentSamples(samples) : [];
    const completed = payload.status === 'completed' || payload.status === 'success';
    await finishCollectionRun(run.id, { status: completed ? 'completed' : payload.status || 'submitted' });
    return {
      ok: true,
      endpoint,
      run,
      status: payload.status,
      credits: payload.total_credits_used || payload.data?.credits_used || null,
      sampleCount: ingested.length,
      samples: ingested.slice(0, 20),
      rawId: payload.scrape_id || payload.map_id || payload.crawl_id || payload.search_id || null,
      message: endpoint === 'crawl' && !completed
        ? 'XCrawl crawl is async; use crawl result API later to fetch completed pages.'
        : 'XCrawl request completed.',
    };
  } catch (error) {
    await finishCollectionRun(run.id, { status: 'failed', error: error.message });
    return { ok: false, endpoint, run, error: 'xcrawl_failed', message: error.message };
  }
}

async function ensureCollectorSchema() {
  await pgPool.query(`
    create table if not exists longka_collection_runs (
      id text primary key,
      collector_type text not null,
      platform text not null,
      source_type text not null,
      query text not null default '',
      status text not null,
      label_type text not null default 'unknown',
      source_config jsonb not null default '{}'::jsonb,
      error text,
      started_at timestamptz not null default now(),
      finished_at timestamptz,
      created_at timestamptz not null default now()
    )
  `);
  await pgPool.query(`
    create table if not exists longka_content_samples (
      id text primary key,
      run_id text references longka_collection_runs(id) on delete set null,
      collector_type text not null,
      platform text not null,
      source_type text not null,
      source_url text,
      source_id text not null,
      author_name text,
      author_id text,
      title text,
      body text,
      markdown text,
      language text not null default 'unknown',
      keyword text,
      label_type text not null default 'unknown',
      metrics jsonb not null default '{}'::jsonb,
      comments jsonb not null default '[]'::jsonb,
      raw_json jsonb not null default '{}'::jsonb,
      published_at timestamptz,
      collected_at timestamptz not null default now(),
      created_at timestamptz not null default now(),
      unique(platform, source_id)
    )
  `);
  await pgPool.query('alter table longka_content_samples add column if not exists workspace text');
  await pgPool.query('create index if not exists idx_longka_content_samples_workspace on longka_content_samples(workspace, published_at desc)');
  await pgPool.query('create index if not exists idx_longka_content_samples_platform on longka_content_samples(platform)');
  await pgPool.query('create index if not exists idx_longka_content_samples_collector on longka_content_samples(collector_type)');
  await pgPool.query('create index if not exists idx_longka_content_samples_label on longka_content_samples(label_type)');
  await pgPool.query('create index if not exists idx_longka_content_samples_metrics on longka_content_samples using gin(metrics)');
  await pgPool.query('create index if not exists idx_longka_content_samples_raw on longka_content_samples using gin(raw_json)');
  await pgPool.query(`
    create table if not exists longka_asset_confirmations (
      id text primary key,
      sample_id text not null references longka_content_samples(id) on delete cascade,
      run_id text,
      platform text not null,
      destination text not null,
      status text not null default 'confirmed',
      operator_note text,
      deconstruction jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique(sample_id, destination)
    )
  `);
  await pgPool.query('create index if not exists idx_longka_asset_confirmations_destination on longka_asset_confirmations(destination)');
  await pgPool.query('create index if not exists idx_longka_asset_confirmations_run on longka_asset_confirmations(run_id)');
  // 对标起锚库:每次起锚一行(该账号的评分方向 signals + 指纹 patterns + 选题 topics)
  await pgPool.query(`
    create table if not exists longka_benchmark (
      id text primary key,
      workspace text not null default '',
      account text not null default '',
      sample_count int not null default 0,
      signals jsonb, patterns jsonb, topics jsonb, hooks jsonb, samples jsonb,
      created_at timestamptz not null default now()
    )
  `);
  await pgPool.query('create index if not exists idx_longka_benchmark_workspace on longka_benchmark(workspace)');
  // 评论深挖洞察:一帖一行,把评论提炼成的真实料(痛点/欲望/异议/金句/选题缺口)
  // spec: docs/specs/2026-06-19-comment-mining-spec.md
  await pgPool.query(`
    create table if not exists longka_comment_insights (
      id text primary key,
      sample_id text references longka_content_samples(id) on delete cascade,
      workspace text not null default '',
      platform text not null default '',
      comment_count int not null default 0,
      pain_points jsonb not null default '[]'::jsonb,
      desires jsonb not null default '[]'::jsonb,
      objections jsonb not null default '[]'::jsonb,
      golden_quotes jsonb not null default '[]'::jsonb,
      emotions jsonb not null default '[]'::jsonb,
      topic_gaps jsonb not null default '[]'::jsonb,
      created_at timestamptz not null default now(),
      unique(sample_id)
    )
  `);
  await pgPool.query('create index if not exists idx_longka_comment_insights_workspace on longka_comment_insights(workspace, created_at desc)');
}

// 找「有评论、但还没深挖」的样本(L1 已回填 comments → L2 待挖)
// jsonb_array_length(comments) > 0 且无对应 insight 行
export async function listSamplesNeedingCommentMining(input = {}) {
  await requireCollectorDb();
  const workspace = normalizeText(input.workspace || '');
  const limit = clampNumber(input.limit || 50, 1, 300);
  const minComments = clampNumber(input.minComments || 5, 1, 100);
  const result = await pgPool.query(`
    select s.id, s.platform, s.title, s.body, s.keyword, s.comments,
           coalesce(s.workspace, '') as workspace,
           jsonb_array_length(s.comments) as comment_count
    from longka_content_samples s
    left join longka_comment_insights i on i.sample_id = s.id
    where i.id is null
      and jsonb_typeof(s.comments) = 'array'
      and jsonb_array_length(s.comments) >= $1
      and ($2 = '' or coalesce(s.workspace, '') = $2)
    order by jsonb_array_length(s.comments) desc
    limit $3
  `, [minComments, workspace, limit]);
  return result.rows.map((row) => ({
    id: row.id,
    platform: row.platform,
    title: normalizeText(row.title || ''),
    body: normalizeText(row.body || '').slice(0, 500),
    keyword: row.keyword,
    workspace: row.workspace,
    commentCount: Number(row.comment_count) || 0,
    comments: Array.isArray(row.comments) ? row.comments : [],
  }));
}

// 存一帖的评论深挖洞察(幂等:sample_id 唯一)
export async function saveCommentInsight(input = {}) {
  await requireCollectorDb();
  const sampleId = normalizeText(input.sampleId || input.sample_id || '');
  if (!sampleId) return { ok: false, error: 'missing_sample_id' };
  const id = `ci-${randomUUID().slice(0, 12)}`;
  const arr = (v) => JSON.stringify(Array.isArray(v) ? v : []);
  await pgPool.query(`
    insert into longka_comment_insights
      (id, sample_id, workspace, platform, comment_count, pain_points, desires, objections, golden_quotes, emotions, topic_gaps)
    values ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb)
    on conflict (sample_id) do update set
      workspace = excluded.workspace,
      platform = excluded.platform,
      comment_count = excluded.comment_count,
      pain_points = excluded.pain_points,
      desires = excluded.desires,
      objections = excluded.objections,
      golden_quotes = excluded.golden_quotes,
      emotions = excluded.emotions,
      topic_gaps = excluded.topic_gaps,
      created_at = now()
  `, [
    id, sampleId, normalizeText(input.workspace || ''), normalizeText(input.platform || ''),
    Number(input.commentCount) || 0,
    arr(input.painPoints), arr(input.desires), arr(input.objections),
    arr(input.goldenQuotes), arr(input.emotions), arr(input.topicGaps),
  ]);
  return { ok: true, id };
}

// 列出某 workspace 已深挖的洞察(供 UI"真实声音"块)
export async function listCommentInsights(input = {}) {
  await requireCollectorDb();
  const workspace = normalizeText(input.workspace || '');
  const limit = clampNumber(input.limit || 100, 1, 300);
  const result = await pgPool.query(`
    select i.id, i.sample_id, i.workspace, i.platform, i.comment_count,
           i.pain_points, i.desires, i.objections, i.golden_quotes, i.emotions, i.topic_gaps,
           i.created_at, s.title
    from longka_comment_insights i
    left join longka_content_samples s on s.id = i.sample_id
    where ($1 = '' or i.workspace = $1)
    order by i.created_at desc
    limit $2
  `, [workspace, limit]);
  return result.rows.map((row) => ({
    id: row.id,
    sampleId: row.sample_id,
    workspace: row.workspace,
    platform: row.platform,
    title: normalizeText(row.title || ''),
    commentCount: row.comment_count,
    painPoints: row.pain_points || [],
    desires: row.desires || [],
    objections: row.objections || [],
    goldenQuotes: row.golden_quotes || [],
    emotions: row.emotions || [],
    topicGaps: row.topic_gaps || [],
    createdAt: row.created_at,
  }));
}

// 聚合某 workspace 的真实料,供创作 RAG 注入(去重 + 按复现/赞排序)
export async function getCommentRealMaterial(input = {}) {
  await requireCollectorDb();
  const workspace = normalizeText(input.workspace || '');
  const result = await pgPool.query(`
    select pain_points, desires, objections, golden_quotes, topic_gaps
    from longka_comment_insights
    where ($1 = '' or workspace = $1)
    order by created_at desc
    limit 200
  `, [workspace]);
  const painMap = new Map(); // quote → freq 累加
  const objections = new Set();
  const desires = new Set();
  const quotes = new Set();
  const topicGaps = new Set();
  for (const row of result.rows) {
    for (const p of (row.pain_points || [])) {
      const q = normalizeText(p?.quote || p);
      if (q) painMap.set(q, (painMap.get(q) || 0) + (Number(p?.freq) || 1));
    }
    for (const d of (row.desires || [])) { const q = normalizeText(d?.quote || d); if (q) desires.add(q); }
    for (const o of (row.objections || [])) { const q = normalizeText(o?.quote || o); if (q) objections.add(q); }
    for (const g of (row.golden_quotes || [])) { const q = normalizeText(g); if (q) quotes.add(q); }
    for (const t of (row.topic_gaps || [])) { const q = normalizeText(t); if (q) topicGaps.add(q); }
  }
  const painPoints = [...painMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([quote, freq]) => ({ quote, freq }));
  return {
    workspace: workspace || 'all',
    insightCount: result.rows.length,
    painPoints: painPoints.slice(0, 30),
    desires: [...desires].slice(0, 30),
    objections: [...objections].slice(0, 30),
    goldenQuotes: [...quotes].slice(0, 40),
    topicGaps: [...topicGaps].slice(0, 30),
  };
}

// 保存一次对标起锚结果
export async function saveBenchmarkAnchor({ workspace = '', account = '', sampleCount = 0, signals = [], patterns = [], topics = [], hooks = [], samples = [] }) {
  await requireCollectorDb();
  const id = `bm-${randomUUID().slice(0, 12)}`;
  await pgPool.query(
    `insert into longka_benchmark (id, workspace, account, sample_count, signals, patterns, topics, hooks, samples)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [id, normalizeText(workspace), normalizeText(account), Number(sampleCount) || 0,
     JSON.stringify(signals || []), JSON.stringify(patterns || []), JSON.stringify(topics || []), JSON.stringify(hooks || []), JSON.stringify(samples || [])],
  );
  return { id };
}

export async function listBenchmarks(workspace = '') {
  await requireCollectorDb();
  const r = await pgPool.query(
    `select id, workspace, account, sample_count, signals, patterns, topics, hooks, created_at
     from longka_benchmark where ($1='' or workspace=$1) order by created_at desc limit 50`,
    [normalizeText(workspace)],
  );
  return r.rows;
}

// 给"发布前判断"用:某 workspace 最新起锚的评分方向(客户专属)
export async function getBenchmarkRubric(workspace = '') {
  await requireCollectorDb();
  const r = await pgPool.query(
    `select signals, account from longka_benchmark where ($1='' or workspace=$1) order by created_at desc limit 1`,
    [normalizeText(workspace)],
  );
  return r.rows[0] || null;
}

async function requireCollectorDb() {
  if (!pgPool) {
    await initCollectorHub();
  }
  if (!pgPool) {
    throw new Error('Collector database is not available. Configure DATABASE_URL first.');
  }
}

function normalizeContentSample(sample = {}, context = {}) {
  const now = new Date().toISOString();
  const sourceId = normalizeText(sample.sourceId || sample.source_id || sample.id || sample.url || randomUUID());
  return {
    id: normalizeText(sample.id || `${context.platform || sample.platform || 'sample'}-${sourceId}`).replace(/[^\w:.-]+/g, '-').slice(0, 180),
    runId: normalizeText(sample.runId || sample.run_id || context.runId || ''),
    collectorType: normalizeText(sample.collectorType || sample.collector_type || context.collectorType || 'manual_import'),
    platform: normalizeText(sample.platform || context.platform || 'unknown'),
    sourceType: normalizeText(sample.sourceType || sample.source_type || context.sourceType || 'unknown'),
    sourceUrl: normalizeText(sample.sourceUrl || sample.source_url || sample.url || ''),
    sourceId,
    authorName: normalizeText(sample.authorName || sample.author_name || sample.author || ''),
    authorId: normalizeText(sample.authorId || sample.author_id || ''),
    title: normalizeText(sample.title || ''),
    body: normalizeText(sample.body || sample.content || sample.text || ''),
    markdown: normalizeText(sample.markdown || ''),
    language: normalizeText(sample.language || context.language || 'unknown'),
    keyword: normalizeText(sample.keyword || context.keyword || ''),
    workspace: normalizeText(sample.workspace || context.workspace || ''),
    labelType: normalizeText(sample.labelType || sample.label_type || context.labelType || 'unknown'),
    metrics: sample.metrics && typeof sample.metrics === 'object' ? sample.metrics : {},
    comments: Array.isArray(sample.comments) ? sample.comments : [],
    rawJson: sample.rawJson || sample.raw_json || sample,
    publishedAt: sample.publishedAt || sample.published_at || null,
    collectedAt: sample.collectedAt || sample.collected_at || now,
    createdAt: sample.createdAt || sample.created_at || now,
  };
}

function dbRowToContentSample(row = {}) {
  return normalizeContentSample({
    id: row.id,
    runId: row.run_id,
    collectorType: row.collector_type,
    platform: row.platform,
    sourceType: row.source_type,
    sourceUrl: row.source_url,
    sourceId: row.source_id,
    authorName: row.author_name,
    authorId: row.author_id,
    title: row.title,
    body: row.body,
    markdown: row.markdown,
    language: row.language,
    keyword: row.keyword,
    workspace: row.workspace,
    labelType: row.label_type,
    metrics: row.metrics || {},
    comments: row.comments || [],
    rawJson: row.raw_json || {},
    publishedAt: row.published_at,
    collectedAt: row.collected_at,
    createdAt: row.created_at,
  });
}

function xTweetToContentSample(tweet = {}, context = {}) {
  const sourceTweet = extractOriginalXTweet(tweet);
  const id = normalizeText(sourceTweet.id || sourceTweet.tweet_id || sourceTweet.rest_id || randomUUID());
  const text = normalizeText(sourceTweet.text || sourceTweet.full_text || sourceTweet.content || '');
  const author = extractXTweetAuthor(sourceTweet, tweet, context);
  const url = normalizeText(sourceTweet.url || tweet.url || (id ? (author.screenName ? `https://x.com/${author.screenName}/status/${id}` : `https://x.com/i/web/status/${id}`) : ''));
  return normalizeContentSample({
    id: `x-${id}`,
    runId: context.runId,
    collectorType: 'xcrawl',
    platform: 'x',
    sourceType: 'x_user_tweets',
    sourceUrl: url,
    sourceId: id,
    authorName: author.name,
    authorId: author.id || author.screenName,
    title: text.slice(0, 80),
    body: text,
    language: normalizeText(sourceTweet.lang || tweet.lang || 'unknown'),
    keyword: context.screenName,
    labelType: context.labelType,
    metrics: {
      likes: numberOrNull(sourceTweet.like_count ?? sourceTweet.favorite_count ?? sourceTweet.likes),
      replies: numberOrNull(sourceTweet.reply_count ?? sourceTweet.replies),
      retweets: numberOrNull(sourceTweet.retweet_count ?? sourceTweet.retweets),
      quotes: numberOrNull(sourceTweet.quote_count ?? sourceTweet.quotes),
      views: numberOrNull(sourceTweet.view_count ?? sourceTweet.views),
      bookmarks: numberOrNull(sourceTweet.bookmark_count ?? sourceTweet.bookmarks),
    },
    publishedAt: sourceTweet.created_at || sourceTweet.createdAt || tweet.created_at || tweet.createdAt || null,
    rawJson: tweet,
  }, {
    runId: context.runId,
    collectorType: 'xcrawl',
    platform: 'x',
    sourceType: 'x_user_tweets',
    keyword: context.screenName,
    labelType: context.labelType,
  });
}

function extractOriginalXTweet(tweet = {}) {
  const candidates = [
    tweet.retweeted_status,
    tweet.retweeted_status_result?.result?.legacy,
    tweet.retweeted_status_result?.result,
    tweet.quoted_status,
    tweet.quoted_status_result?.result?.legacy,
    tweet.quoted_status_result?.result,
    tweet.legacy,
    tweet,
  ];
  return candidates.find((item) => item && typeof item === 'object' && (item.id || item.rest_id || item.tweet_id || item.full_text || item.text)) || tweet;
}

function extractXTweetAuthor(sourceTweet = {}, envelopeTweet = {}, context = {}) {
  const userCandidates = [
    sourceTweet.user,
    sourceTweet.author,
    sourceTweet.core?.user_results?.result?.legacy,
    sourceTweet.core?.user_results?.result,
    envelopeTweet.user,
    envelopeTweet.author,
    envelopeTweet.core?.user_results?.result?.legacy,
    envelopeTweet.core?.user_results?.result,
  ].filter((item) => item && typeof item === 'object');
  for (const user of userCandidates) {
    const screenName = normalizeText(user.screen_name || user.username || user.userName || user.handle);
    const rawName = normalizeText(user.name || user.full_name);
    const id = normalizeText(user.id || user.user_id || user.rest_id || screenName);
    const collectedUserId = normalizeText(context.user?.id || context.user?.user_id || '');
    if (!screenName && !rawName && id && collectedUserId && id !== collectedUserId) {
      return {
        screenName: '',
        name: '原帖作者待识别',
        id,
      };
    }
    const name = rawName || screenName || normalizeText(context.screenName);
    if (screenName || name || id) {
      return {
        screenName: screenName || normalizeText(context.screenName),
        name: name || screenName || normalizeText(context.screenName),
        id,
      };
    }
  }
  return {
    screenName: normalizeText(context.screenName),
    name: normalizeText(context.user?.name || context.screenName),
    id: normalizeText(context.user?.id || context.user?.user_id || context.screenName),
  };
}

function sanitizeXUser(user = {}) {
  return {
    id: normalizeText(user.id || user.user_id || ''),
    screenName: normalizeText(user.screen_name || user.username || ''),
    name: normalizeText(user.name || ''),
    followers: numberOrNull(user.followers_count ?? user.followers),
    following: numberOrNull(user.friends_count ?? user.following),
    verified: Boolean(user.verified),
  };
}

function parseAccountList(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => normalizeXAccount(item)).filter(Boolean))];
  }
  return [...new Set(String(value || '')
    .split(/[\n,，;；\s]+/)
    .map((item) => normalizeXAccount(item))
    .filter(Boolean))];
}

function normalizeXAccount(value) {
  return normalizeText(value)
    .replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, '')
    .replace(/^@+/, '')
    .split(/[/?#]/)[0]
    .trim();
}

function parseXAccountList(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => normalizeXAccount(item)).filter(Boolean))];
  }
  return [...new Set(String(value || '')
    .replace(/[，；、]/g, ',')
    .replace(/[;\s]+/g, ',')
    .split(',')
    .map((item) => normalizeXAccount(item))
    .filter(Boolean))];
}

function parseCleanXAccountList(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => normalizeXAccount(item)).filter(Boolean))];
  }
  return [...new Set(String(value || '')
    .replace(/[\uFF0C\uFF1B\u3001]/g, ',')
    .replace(/[;\s]+/g, ',')
    .split(',')
    .map((item) => normalizeXAccount(item))
    .filter(Boolean))];
}

function evaluateXContentSamples(samples = []) {
  const rows = samples.map((sample) => {
    const metrics = sample.metrics || {};
    const radarScore = scoreXEngagement(metrics);
    const quality = classifyXContentSample(sample, radarScore);
    return { ...sample, radarScore, ...quality };
  });
  const candidates = rows
    .filter((sample) => sample.keepForCreation)
    .sort((a, b) => (b.contentValueScore + b.radarScore / 1000) - (a.contentValueScore + a.radarScore / 1000));
  const rejected = rows.filter((sample) => !sample.keepForCreation);
  return {
    rows,
    candidates,
    rejected,
    rejectedStats: rejected.reduce((stats, sample) => {
      const key = sample.rejectReason || 'other';
      stats[key] = (stats[key] || 0) + 1;
      return stats;
    }, {}),
  };
}

function scoreXEngagement(metrics = {}) {
  return Number(metrics.bookmarks || 0) * 5
    + Number(metrics.replies || 0) * 4
    + Number(metrics.retweets || 0) * 3
    + Number(metrics.quotes || 0) * 3
    + Number(metrics.likes || 0);
}

function buildXAssetBuckets(rows = []) {
  const ranked = [...rows].sort((a, b) => (b.contentValueScore + b.radarScore / 1000) - (a.contentValueScore + a.radarScore / 1000));
  const useful = ranked.filter((sample) => !['pure_link', 'reply_or_contextless'].includes(sample.rejectReason));
  return {
    goodPosts: useful.filter((sample) => sample.assetTier === 'mother_topic_candidate').slice(0, 20),
    titleSamples: useful.filter((sample) => normalizeText(sample.title).length >= 12).slice(0, 30),
    structureSamples: useful.filter((sample) => sample.hasStructure || normalizeText(sample.body).length >= 180).slice(0, 20),
    viewpoints: useful.filter((sample) => sample.hasSignal).slice(0, 20),
    rawSamples: ranked.slice(0, 60),
    noiseStats: rows.reduce((stats, sample) => {
      if (!sample.rejectReason) return stats;
      stats[sample.rejectReason] = (stats[sample.rejectReason] || 0) + 1;
      return stats;
    }, {}),
  };
}

function buildViralDeconstructionCard(sample = {}, context = {}) {
  const title = normalizeText(sample.title || '').slice(0, 120);
  const body = normalizeText(sample.body || sample.markdown || '');
  const text = `${title}\n${body}`.trim();
  const metrics = sample.metrics || {};
  const sentences = splitContentSentences(text);
  const firstLine = sentences[0] || title;
  const claim = findClaimSentence(sentences) || firstLine;
  const pain = findPainSentence(sentences) || inferDeconstructionPain(text);
  const methodLines = sentences.filter((line) => looksLikeSolution(line) || /\d+[.)、]|第一|第二|第三|步骤|方法|框架|清单/.test(line)).slice(0, 5);
  const caseLines = sentences.filter((line) => looksLikeCase(line)).slice(0, 4);
  const reusableHooks = [
    firstLine ? `开头先抛出一个具体判断：${firstLine.slice(0, 80)}` : '',
    claim ? `主张句可以复用：${claim.slice(0, 90)}` : '',
    pain ? `用户痛点是：${pain.slice(0, 90)}` : '',
    methodLines.length ? `正文用 ${methodLines.length} 个步骤/判断点承接，不要只讲观点。` : '',
    caseLines.length ? `素材里有案例/经历信号，适合改写成更接地气的个人观察。` : '',
  ].filter(Boolean);
  return {
    version: 'longka-deconstruction-card-v1',
    generatedAt: new Date().toISOString(),
    source: {
      sampleId: sample.id,
      runId: sample.runId,
      platform: sample.platform,
      sourceUrl: sample.sourceUrl,
      authorName: sample.authorName,
      authorId: sample.authorId,
      keyword: sample.keyword,
      metrics,
      contentValueScore: sample.contentValueScore,
      radarScore: sample.radarScore,
      qualityReasons: sample.qualityReasons || [],
    },
    classification: {
      mainCategory: inferTheme(text),
      subCategory: inferContentSubCategory(text),
      destination: context.destination || 'mother_topic',
      suitablePlatforms: ['小红书图文', '公众号长文', '视频号口播脚本'],
    },
    titleFormula: inferTitleFormula(title, text),
    openingHook: {
      mechanism: inferOpeningMechanism(firstLine),
      firstLine,
      whyItRetains: firstLine ? '首句没有先解释概念，而是直接给判断、结果或冲突，适合做停留。' : '源文开头不完整，需要二创时补一个具体场景。'
    },
    core: {
      claim,
      userPain: pain,
      whyReaderCares: inferReaderPromise(text, pain),
      informationGain: inferInformationGain(text, methodLines),
      emotionCurve: inferEmotionCurve(text),
    },
    structureFormula: buildStructureFormula(sentences, methodLines, caseLines),
    reusableAssets: {
      hooks: reusableHooks,
      methods: methodLines,
      cases: caseLines,
      quoteableLines: sentences.filter((line) => line.length >= 12 && line.length <= 80).slice(0, 8),
    },
    rewriteDirections: buildRewriteDirections(sample, pain, claim),
    warnings: buildDeconstructionWarnings(sample, text),
    operatorNote: normalizeText(context.operatorNote || ''),
  };
}

function splitContentSentences(value = '') {
  return normalizeText(value)
    .replace(/\r/g, '\n')
    .split(/[\n。！？!?；;]+/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 6)
    .slice(0, 80);
}

function findClaimSentence(sentences = []) {
  return sentences.find((line) => /不是.*而是|真正|关键|核心|最重要|本质|必须|一定要|不要只|不是靠/.test(line))
    || sentences.find((line) => /should|must|actually|because|framework|system|workflow/i.test(line));
}

function findPainSentence(sentences = []) {
  return sentences.find((line) => /卡住|难|痛苦|没效果|没流量|不会|不知道|焦虑|踩坑|问题|失败|浪费/.test(line));
}

function inferDeconstructionPain(text = '') {
  if (/AI|内容|写作|自媒体|爆款/.test(text)) return '用户想用 AI 做内容，但缺少长期素材库、拆解方法和复用机制，导致产出像模板。';
  if (/Agent|工作流|自动化/.test(text)) return '用户想搭 Agent 或工作流，但不知道从哪里开始，也怕做成不能落地的玩具。';
  return '源素材有可复用观点，但用户问题还需要人工确认后再用于创作。';
}

function inferContentSubCategory(text = '') {
  if (/拆文|爆款|标题|开头|文案|写作|内容/.test(text)) return '爆文拆解与内容创作';
  if (/Agent|工作流|自动化|Codex|Claude/.test(text)) return 'AI Agent 与自动化工作流';
  if (/知识库|素材库|资产库|Obsidian|飞书|语料/.test(text)) return '内容资产库与知识工程';
  if (/商业|获客|增长|产品|付费/.test(text)) return '商业增长与获客';
  return 'AI 与自媒体观察';
}

function inferTitleFormula(title = '', text = '') {
  if (/为什么|为何/.test(title)) return '反常识追问型：用“为什么”制造认知缺口，再给出新解释。';
  if (/别|不要|不是/.test(title)) return '避坑纠偏型：先指出常见误区，再给正确做法。';
  if (/怎么|如何/.test(title)) return '方法承诺型：直接承诺步骤、框架或可执行方案。';
  if (/\d+/.test(title)) return '数字清单型：用数量降低阅读成本，适合收藏。';
  if (/我|经历|复盘|才知道/.test(title + text)) return '经验复盘型：用个人经历增强可信度。';
  return '观点判断型：先给明确判断，再用正文解释依据。';
}

function inferOpeningMechanism(firstLine = '') {
  if (/很多人|大多数|你以为|你可能/.test(firstLine)) return '共识反转开头';
  if (/我|最近|这次|经历/.test(firstLine)) return '个人经历开头';
  if (/为什么|怎么|到底/.test(firstLine)) return '问题钩子开头';
  if (/不是|别|不要/.test(firstLine)) return '纠偏提醒开头';
  return '判断句开头';
}

function inferReaderPromise(text = '', pain = '') {
  if (/拆|公式|标题|开头|结构|爆点/.test(text)) return '读完能知道一篇好内容到底该拆哪些维度，而不是只套提示词。';
  if (/知识库|素材库|资产库|沉淀/.test(text)) return '读完能知道如何把零散素材变成长期可复用的内容资产。';
  if (/Agent|工作流|自动化/.test(text)) return '读完能知道一个 AI 工作流要先解决什么真实问题。';
  return pain || '读完能得到一个更具体的判断标准或行动入口。';
}

function inferInformationGain(text = '', methodLines = []) {
  if (methodLines.length) return `提供了 ${methodLines.length} 个可拆解步骤/方法点，二创时要补充真实场景和例子。`;
  if (/系统|流程|闭环|入库|复用/.test(text)) return '信息增量在于把单次写作升级成系统化流程。';
  return '信息增量偏弱，入母题库前建议补充案例、步骤或对比。';
}

function inferEmotionCurve(text = '') {
  const curve = [];
  if (/卡|难|痛苦|没效果|浪费|焦虑/.test(text)) curve.push('先戳中挫败感');
  if (/其实|根本|真正|关键|本质/.test(text)) curve.push('再给认知反转');
  if (/步骤|流程|系统|方法|框架/.test(text)) curve.push('中段给可执行路径');
  if (/可以|持续|复用|沉淀|优化/.test(text)) curve.push('结尾给掌控感');
  return curve.length ? curve : ['判断切入', '解释原因', '给出行动方向'];
}

function buildStructureFormula(sentences = [], methodLines = [], caseLines = []) {
  return [
    '开头：用具体痛点或反常识判断让用户停下来',
    '承接：指出普通做法为什么写不出效果',
    methodLines.length ? '主体：拆成判断标准、步骤或清单，增强收藏价值' : '主体：补充 3 个具体判断点，避免空泛观点',
    caseLines.length ? '证据：加入源素材里的案例/经历，增强人味' : '证据：二创时必须补真实例子或操作细节',
    '结尾：给一个低门槛行动入口，不要硬广'
  ];
}

function buildRewriteDirections(sample = {}, pain = '', claim = '') {
  return [
    {
      format: '小红书图文',
      angle: pain ? `从“${pain.slice(0, 34)}”切入，做成判断/避坑型图文。` : '从用户最容易误解的地方切入，做成避坑型图文。',
    },
    {
      format: '公众号长文',
      angle: claim ? `围绕“${claim.slice(0, 38)}”展开，补案例、方法论和系统图。` : '围绕一个主张展开，补行业背景、案例和方法论。',
    },
    {
      format: '短视频脚本',
      angle: '前三秒先讲错误做法，再用 3 个镜头讲正确流程，结尾引导领取拆解卡。',
    },
  ];
}

function buildDeconstructionWarnings(sample = {}, text = '') {
  const warnings = [];
  if (normalizeText(text).length < 100) warnings.push('正文信息量偏少，只能做素材资产，暂不建议直接作为母题。');
  if (sample.rejectReason) warnings.push(`采集筛选曾标记风险：${sample.rejectReason}`);
  if (!sample.sourceUrl) warnings.push('缺少原帖链接，后续复核不方便。');
  warnings.push('只学习结构、痛点、节奏和爆点，不复制原文表达。');
  return warnings;
}

function buildContentEngineArtifacts(assetBuckets = {}, context = {}) {
  const sourceRows = [
    ...(assetBuckets.goodPosts || []),
    ...(assetBuckets.viewpoints || []),
    ...(assetBuckets.structureSamples || []),
  ];
  const uniqueRows = uniqueSamples(sourceRows).slice(0, 30);
  const units = [];
  for (const sample of uniqueRows) {
    units.push(...extractUnitsFromXSample(sample));
  }
  const uniqueUnits = uniqueContentUnits(units).slice(0, 40);
  const topicMaps = buildTopicMaps(uniqueUnits, context).slice(0, 5);
  const assemblyDrafts = buildAssemblyDrafts(topicMaps, uniqueUnits).slice(0, 3);
  return {
    generatedAt: new Date().toISOString(),
    sourceAccounts: context.sourceAccounts || [],
    totalSampleCount: context.totalSampleCount || 0,
    units: uniqueUnits,
    unitStats: countBy(uniqueUnits, 'type'),
    topicMaps,
    assemblyDrafts,
    relationCount: uniqueUnits.reduce((sum, unit) => sum + unit.relationships.length, 0),
  };
}

function extractUnitsFromXSample(sample = {}) {
  const text = normalizeText(`${sample.title || ''}\n${sample.body || ''}`);
  const title = normalizeText(sample.title || text.slice(0, 60));
  const source = {
    platform: 'x',
    sourceId: sample.sourceId,
    sourceUrl: sample.sourceUrl,
    authorName: sample.authorName,
    keyword: sample.keyword,
  };
  const units = [];
  const theme = inferTheme(text);
  if (looksLikeQuestion(text)) {
    units.push(makeUnit('QST', questionTitle(title, text), text.slice(0, 260), theme, source));
  }
  if (looksLikeConcept(text)) {
    units.push(makeUnit('CON', conceptTitle(title, text), text.slice(0, 260), theme, source));
  }
  if (looksLikeOpinion(text)) {
    units.push(makeUnit('OPI', opinionTitle(title, text), text.slice(0, 300), theme, source));
  }
  if (looksLikeCase(text)) {
    units.push(makeUnit('CAS', caseTitle(title, text), text.slice(0, 300), theme, source));
  }
  if (looksLikeSolution(text)) {
    units.push(makeUnit('SOL', solutionTitle(title, text), text.slice(0, 300), theme, source));
  }
  return units.length ? units : [makeUnit('OPI', opinionTitle(title, text), text.slice(0, 240), theme, source)];
}

function makeUnit(type, title, canonical, theme, source) {
  const id = `${type}-${stableId(`${type}:${title}:${source.sourceId}`)}`.slice(0, 64);
  return {
    id,
    type,
    title: normalizeText(title).slice(0, 80),
    canonical: normalizeText(canonical),
    themes: [theme].filter(Boolean),
    source,
    relationships: [],
  };
}

function buildTopicMaps(units = [], context = {}) {
  const groups = new Map();
  for (const unit of units) {
    const theme = unit.themes[0] || '未分类主题';
    if (!groups.has(theme)) groups.set(theme, []);
    groups.get(theme).push(unit);
  }
  return [...groups.entries()].map(([theme, items]) => {
    const questions = items.filter((item) => item.type === 'QST');
    const opinions = items.filter((item) => item.type === 'OPI');
    const concepts = items.filter((item) => item.type === 'CON');
    const cases = items.filter((item) => item.type === 'CAS');
    const solutions = items.filter((item) => item.type === 'SOL');
    const relations = [];
    for (const question of questions) {
      for (const opinion of opinions.slice(0, 3)) relations.push({ from: question.id, to: opinion.id, type: '回应' });
      for (const solution of solutions.slice(0, 2)) relations.push({ from: question.id, to: solution.id, type: '回应' });
    }
    for (const concept of concepts) {
      for (const question of questions.slice(0, 2)) relations.push({ from: concept.id, to: question.id, type: '解释' });
    }
    for (const itemCase of cases) {
      for (const opinion of opinions.slice(0, 2)) relations.push({ from: itemCase.id, to: opinion.id, type: '证明' });
    }
    return {
      id: `TM-${stableId(theme)}`,
      title: theme,
      sourceAccounts: context.sourceAccounts || [],
      units: items.map((item) => item.id),
      unitStats: countBy(items, 'type'),
      relations,
    };
  }).sort((a, b) => b.units.length - a.units.length);
}

function buildAssemblyDrafts(topicMaps = [], units = []) {
  const unitMap = new Map(units.map((unit) => [unit.id, unit]));
  return topicMaps.map((map) => {
    const mapUnits = map.units.map((id) => unitMap.get(id)).filter(Boolean);
    const question = mapUnits.find((unit) => unit.type === 'QST') || mapUnits[0];
    const opinions = mapUnits.filter((unit) => unit.type === 'OPI').slice(0, 3);
    const cases = mapUnits.filter((unit) => unit.type === 'CAS').slice(0, 2);
    const solutions = mapUnits.filter((unit) => unit.type === 'SOL').slice(0, 2);
    return {
      id: `AD-${stableId(map.title)}`,
      title: `${map.title}：今天值得展开的内容角度`,
      targetReader: '关注 AI、自媒体、内容生产和 Agent 工具的运营者/创业者',
      coreQuestion: question?.title || map.title,
      recommendedFormats: ['公众号长文', '小红书图文', '短视频口播'],
      opinions: opinions.map((unit) => unit.title),
      cases: cases.map((unit) => unit.title),
      solutions: solutions.map((unit) => unit.title),
      sourceUrls: [...new Set(mapUnits.map((unit) => unit.source?.sourceUrl).filter(Boolean))].slice(0, 6),
      whyWorthDoing: `该主题下已沉淀 ${map.units.length} 个内容单元，可组合成一篇有问题、有观点、有案例或方案的内容。`,
    };
  });
}

function inferTheme(text = '') {
  const value = text.toLowerCase();
  if (/codex|claude|agent|agents|智能体|插件|skills?/.test(value)) return 'Agent 与 AI 工具';
  if (/写作|文案|内容|自媒体|小红书|公众号|爆款|标题/.test(value)) return '内容创作与自媒体';
  if (/创业|产品|增长|商业|收入|客户|获客/.test(value)) return '产品增长与商业化';
  if (/知识库|资产库|obsidian|wiki|素材|训练/.test(value)) return '内容资产与知识工程';
  return 'AI 与个人生产力';
}

function looksLikeQuestion(text = '') {
  return /[?？]|为什么|怎么|如何|怎么办|问题|困住|误区|难点|卡住/i.test(text);
}

function looksLikeConcept(text = '') {
  return /叫做|本质|概念|定义|是什么|means|is a|refers to/i.test(text);
}

function looksLikeOpinion(text = '') {
  return /我认为|我发现|真正|不是.*而是|核心|关键|最重要|should|must|actually|because/i.test(text);
}

function looksLikeCase(text = '') {
  return /案例|实测|经历|数据|阅读量|粉丝|增长|from .* to |%|倍|万|example|case/i.test(text);
}

function looksLikeSolution(text = '') {
  return /步骤|方法|方案|建议|先.*再|可以|应该|做法|流程|清单|playbook|guide|how to/i.test(text);
}

function questionTitle(title, text) {
  return title || text.split(/[。.!?\n]/).find(Boolean) || '待回答的问题';
}

function conceptTitle(title) {
  return title ? `概念：${title}` : '关键概念';
}

function opinionTitle(title) {
  return title ? `观点：${title}` : '可复用观点';
}

function caseTitle(title) {
  return title ? `案例：${title}` : '可复用案例';
}

function solutionTitle(title) {
  return title ? `方案：${title}` : '可落地方案';
}

function uniqueSamples(samples = []) {
  const seen = new Set();
  return samples.filter((sample) => {
    const key = sample.sourceId || sample.sourceUrl || sample.title;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueContentUnits(units = []) {
  const seen = new Set();
  return units.filter((unit) => {
    const key = `${unit.type}:${unit.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function countBy(items = [], key) {
  return items.reduce((stats, item) => {
    const value = item[key] || 'unknown';
    stats[value] = (stats[value] || 0) + 1;
    return stats;
  }, {});
}

function classifyXContentSample(sample = {}, radarScore = 0) {
  const text = normalizeText(`${sample.title || ''}\n${sample.body || ''}`);
  const authorName = normalizeText(sample.authorName);
  const metrics = sample.metrics || {};
  const bodyLength = text.replace(/https?:\/\/\S+/g, '').trim().length;
  const isUnknownSource = authorName === '原帖作者待识别' || authorName === 'unknown_original_author';
  const isRetweet = /^rt\s*@/i.test(text) || /^转发/.test(text);
  const isReply = /^@\w+/.test(text);
  const isPureUrl = /^(https?:\/\/\S+\s*){1,3}$/i.test(text);
  const isTooShort = bodyLength < 50;
  const hasSignal = /(how|why|because|lesson|learned|framework|strategy|playbook|guide|case study|mistake|problem|solution|thread|here'?s|steps|rules|example|趋势|方法|框架|复盘|案例|经验|教训|问题|原因|步骤|清单|规则|怎么|为什么|爆款|拆文|提示词|同质化|素材|资产|社群|增长)/i.test(text);
  const hasStructure = /\n\s*[-*•]|\n\s*\d+[.)、]|:/.test(text);
  const hasEngagementSignal = Number(metrics.bookmarks || 0) >= 5
    || Number(metrics.replies || 0) >= 3
    || Number(metrics.retweets || 0) >= 2
    || Number(metrics.quotes || 0) >= 1
    || radarScore >= 25;
  const hasStrongSaveSignal = Number(metrics.bookmarks || 0) >= 15 || radarScore >= 80;

  let contentValueScore = 0;
  if (hasSignal) contentValueScore += 28;
  if (hasStructure) contentValueScore += 16;
  if (bodyLength >= 120) contentValueScore += 18;
  if (bodyLength >= 220) contentValueScore += 10;
  if (hasEngagementSignal) contentValueScore += 18;
  if (hasStrongSaveSignal) contentValueScore += 12;
  if (isUnknownSource) contentValueScore -= 35;
  if (isRetweet) contentValueScore -= 45;
  if (isReply) contentValueScore -= 30;
  if (isPureUrl) contentValueScore -= 60;
  if (isTooShort) contentValueScore -= 25;

  let rejectReason = '';
  if (isPureUrl) rejectReason = 'pure_link';
  else if (isRetweet) rejectReason = 'retweet';
  else if (isReply) rejectReason = 'reply_or_contextless';
  else if (isUnknownSource) rejectReason = 'repost_or_unknown_source';
  else if (isTooShort) rejectReason = 'too_short';
  else if (!hasEngagementSignal) rejectReason = 'weak_engagement_signal';
  else if (!hasSignal && contentValueScore < 55) rejectReason = 'weak_content_signal';
  else if (contentValueScore < 55) rejectReason = 'low_mother_topic_score';

  return {
    contentType: isUnknownSource ? 'repost_or_unknown_source' : (isRetweet ? 'retweet' : (isReply ? 'reply' : 'original_or_direct')),
    contentValueScore,
    hasSignal,
    hasStructure,
    hasEngagementSignal,
    hasStrongSaveSignal,
    keepForCreation: !rejectReason && contentValueScore >= 55,
    rejectReason,
    assetTier: !rejectReason && contentValueScore >= 70 ? 'mother_topic_candidate' : (!rejectReason ? 'asset_only' : 'rejected'),
    qualityReasons: [
      hasStrongSaveSignal ? '收藏/综合互动强' : '',
      hasEngagementSignal ? '有评论转发等讨论信号' : '',
      hasSignal ? '有观点/方法/经验信号' : '',
      hasStructure ? '有可拆结构' : '',
      bodyLength >= 120 ? '正文信息量够' : '',
    ].filter(Boolean),
  };
}

async function requestXcrawl(endpoint, body, apiKey) {
  const response = await fetch(`https://run.xcrawl.com/v1/${endpoint}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  const rawText = await response.text();
  let payload;
  try {
    payload = JSON.parse(rawText);
  } catch {
    throw new Error(`XCrawl returned non-JSON response: ${rawText.slice(0, 200)}`);
  }
  if (!response.ok || payload.error) {
    throw new Error(payload.error || payload.message || `XCrawl request failed: HTTP ${response.status}`);
  }
  return payload;
}

function buildXcrawlStandardBody(endpoint, input = {}) {
  if (endpoint === 'scrape') {
    const url = normalizeText(input.url);
    if (!url) throw new Error('url is required for XCrawl scrape.');
    return {
      url,
      output: input.output || { formats: input.formats || ['markdown'] },
      js_render: input.js_render,
      json: input.json,
      proxy: input.proxy,
    };
  }
  if (endpoint === 'map') {
    const url = normalizeText(input.url);
    if (!url) throw new Error('url is required for XCrawl map.');
    return {
      url,
      limit: clampNumber(input.limit || 20, 1, 500),
      filter: input.filter,
    };
  }
  if (endpoint === 'search') {
    const query = normalizeText(input.query);
    if (!query) throw new Error('query is required for XCrawl search.');
    return {
      query,
      location: normalizeText(input.location || 'US'),
      language: normalizeText(input.language || 'en'),
      limit: clampNumber(input.limit || 10, 1, 100),
    };
  }
  if (endpoint === 'crawl') {
    const url = normalizeText(input.url);
    if (!url) throw new Error('url is required for XCrawl crawl.');
    return {
      url,
      crawler: {
        limit: clampNumber(input.limit || input.crawler?.limit || 3, 1, 100),
        max_depth: clampNumber(input.maxDepth || input.max_depth || input.crawler?.max_depth || 1, 0, 5),
        include: input.include || input.crawler?.include,
        exclude: input.exclude || input.crawler?.exclude,
        include_entire_domain: Boolean(input.includeEntireDomain || input.crawler?.include_entire_domain),
        include_subdomains: Boolean(input.includeSubdomains || input.crawler?.include_subdomains),
        include_external_links: Boolean(input.includeExternalLinks || input.crawler?.include_external_links),
        sitemaps: input.sitemaps ?? input.crawler?.sitemaps,
      },
      output: input.output || { formats: input.formats || ['markdown'] },
    };
  }
  throw new Error(`Unsupported XCrawl endpoint: ${endpoint}`);
}

function normalizeXcrawlStandardSamples(endpoint, payload = {}, context = {}) {
  if (endpoint === 'scrape') return normalizeXcrawlScrapeSamples(payload, context);
  if (endpoint === 'search') return normalizeXcrawlSearchSamples(payload, context);
  if (endpoint === 'map') return normalizeXcrawlMapSamples(payload, context);
  return [];
}

function normalizeXcrawlScrapeSamples(payload = {}, context = {}) {
  const data = payload.data || {};
  const metadata = data.metadata || {};
  const url = normalizeText(payload.url || metadata.final_url || metadata.url);
  const markdown = normalizeText(data.markdown || '');
  const body = markdown || normalizeText(data.summary || data.html || '');
  return [normalizeContentSample({
    id: `xcrawl-scrape-${payload.scrape_id || stableId(url)}`,
    runId: context.runId,
    collectorType: 'xcrawl',
    platform: 'web',
    sourceType: 'xcrawl_scrape',
    sourceUrl: url,
    sourceId: payload.scrape_id || stableId(url),
    title: normalizeText(metadata.title || ''),
    body,
    markdown,
    keyword: context.keyword,
    labelType: context.labelType,
    metrics: {
      credits: numberOrNull(payload.total_credits_used || data.credits_used),
      trafficBytes: numberOrNull(data.traffic_bytes),
      statusCode: numberOrNull(metadata.status_code),
    },
    rawJson: payload,
  })];
}

function normalizeXcrawlSearchSamples(payload = {}, context = {}) {
  const rows = Array.isArray(payload.data?.data) ? payload.data.data : [];
  return rows.map((item) => normalizeContentSample({
    id: `xcrawl-search-${payload.search_id || stableId(context.keyword)}-${item.position || stableId(item.url)}`,
    runId: context.runId,
    collectorType: 'xcrawl',
    platform: 'search',
    sourceType: 'xcrawl_search',
    sourceUrl: normalizeText(item.url),
    sourceId: normalizeText(item.url || `${payload.search_id}-${item.position}`),
    title: normalizeText(item.title || ''),
    body: normalizeText(item.snippet || item.description || ''),
    keyword: context.keyword,
    labelType: context.labelType,
    metrics: { position: numberOrNull(item.position), credits: numberOrNull(payload.total_credits_used || payload.data?.credits_used) },
    rawJson: item,
  }));
}

function normalizeXcrawlMapSamples(payload = {}, context = {}) {
  const links = Array.isArray(payload.data?.links) ? payload.data.links : [];
  return links.map((link, index) => normalizeContentSample({
    id: `xcrawl-map-${payload.map_id || stableId(payload.url)}-${index + 1}`,
    runId: context.runId,
    collectorType: 'xcrawl',
    platform: 'web',
    sourceType: 'xcrawl_map',
    sourceUrl: normalizeText(link),
    sourceId: normalizeText(link),
    title: normalizeText(link),
    body: '',
    keyword: context.keyword,
    labelType: context.labelType,
    metrics: { position: index + 1, totalLinks: numberOrNull(payload.data?.total_links), credits: numberOrNull(payload.total_credits_used || payload.data?.credits_used) },
    rawJson: { url: link },
  }));
}

function redactedXcrawlInput(endpoint, input = {}) {
  const clone = { ...input, endpoint };
  delete clone.apiKey;
  delete clone.api_key;
  return clone;
}

function contentSampleToUnifiedAsset(sample = {}, keywords = []) {
  const metrics = sample.metrics || {};
  const rawJson = sample.rawJson && typeof sample.rawJson === 'object' ? sample.rawJson : {};
  const media = rawJson.longkaMedia && typeof rawJson.longkaMedia === 'object' ? rawJson.longkaMedia : {};
  const longkaQuality = rawJson.longkaQuality && typeof rawJson.longkaQuality === 'object' ? rawJson.longkaQuality : {};
  const heatScore = contentHeatScore(metrics);
  const text = `${sample.title} ${sample.body} ${sample.markdown} ${sample.keyword} ${sample.authorName}`.toLowerCase();
  const compactText = text.replace(/\s+/g, '');
  const matchScore = keywords.reduce((sum, keyword) => {
    const word = normalizeText(keyword).toLowerCase();
    if (!word) return sum;
    const compactWord = word.replace(/\s+/g, '');
    if (text.includes(word) || compactText.includes(compactWord)) return sum + 20;
    const parts = expandAssetKeywordParts(word);
    const matched = parts.filter((part) => text.includes(part) || compactText.includes(part.replace(/\s+/g, ''))).length;
    return matched >= Math.min(2, parts.length) ? sum + 8 + matched * 3 : sum;
  }, 0);
  return {
    id: sample.id,
    sourceSampleId: sample.id,
    runId: sample.runId,
    platform: sample.platform,
    sourcePlatform: sample.platform,
    sourceTool: sample.collectorType,
    collectorType: sample.collectorType,
    sourceType: sample.sourceType,
    sourceUrl: sample.sourceUrl,
    url: sample.sourceUrl,
    sourceId: sample.sourceId,
    authorName: sample.authorName,
    authorId: sample.authorId,
    title: sample.title || sample.body?.slice(0, 80) || '未命名素材',
    body: sample.body || sample.markdown || '',
    content: sample.body || sample.markdown || '',
    markdown: sample.markdown || '',
    language: sample.language,
    keyword: sample.keyword,
    labelType: sample.labelType,
    metrics,
    comments: sample.comments || [],
    publishedAt: sample.publishedAt,
    collectedAt: sample.collectedAt,
    createdAt: sample.createdAt,
    collectionStatus: 'real',
    assetKind: 'training_sample',
    trainingRole: sample.labelType || 'unlabeled',
    heatScore,
    matchScore,
    keepForCreation: sample.keepForCreation,
    assetTier: sample.assetTier,
    rejectReason: sample.rejectReason,
    contentValueScore: sample.contentValueScore,
    radarScore: sample.radarScore,
    mediaType: media.type || '',
    media,
    qualityTier: longkaQuality.qualityTier || '',
    qualityLabel: longkaQuality.qualityLabel || '',
    readyForCreation: Boolean(longkaQuality.readyForCreation),
    needsTranscript: Boolean(longkaQuality.needsTranscript),
    bodyCompleteness: longkaQuality.bodyCompleteness || '',
    qualityReasons: sample.qualityReasons || longkaQuality.reasons || [],
    qualitySignals: {
      hasSourceUrl: Boolean(sample.sourceUrl),
      hasBody: Boolean(sample.body && sample.body.length >= 20),
      hasMetrics: Object.keys(metrics).length > 0,
      hasComments: Array.isArray(sample.comments) && sample.comments.length > 0,
      engagementScore: longkaQuality.engagementScore || heatScore,
    },
  };
}

function contentHeatScore(metrics = {}) {
  return Number(metrics.likes || metrics.favorite_count || 0)
    + Number(metrics.bookmarks || metrics.saves || metrics.collects || 0) * 1.2
    + Number(metrics.replies || metrics.comments || 0) * 2
    + Number(metrics.retweets || metrics.shares || 0) * 2
    + Number(metrics.quotes || 0) * 1.5;
}

function parseSearchWords(value) {
  return normalizeText(value)
    .split(/[,，、\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function expandAssetKeywordParts(keyword) {
  const parts = keyword.split(/\s+/).filter(Boolean);
  if (/ai/.test(keyword)) parts.push('ai', '自媒体', '内容', '提示词', '写作');
  if (/agent|工作流/.test(keyword)) parts.push('agent', '工作流', '自动化');
  if (/内容资产|素材库|资产库|语料/.test(keyword)) parts.push('内容', '素材', '资产', '语料', '知识库');
  return [...new Set(parts.filter((part) => part.length >= 2 || part === 'ai'))];
}

function stableId(value) {
  return Buffer.from(normalizeText(value)).toString('base64url').slice(0, 80) || randomUUID();
}

function normalizeText(value) {
  return String(value ?? '').trim();
}

function normalizeBoolean(value) {
  if (typeof value === 'boolean') return value;
  const text = normalizeText(value).toLowerCase();
  return ['1', 'true', 'yes', 'y', 'on'].includes(text);
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, Math.floor(number)));
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
