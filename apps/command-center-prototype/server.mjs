import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { existsSync, createReadStream } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { collectorHealth, confirmContentAsset, initCollectorHub, loadLatestXBatch, loadRecentContentAssets, loadUnifiedContentAssets, loadXBatchAssets, runXcrawlStandard, runXcrawlXUserTweets, runXcrawlXUserTweetsBatch } from './collector-hub.mjs';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)));
const dataDir = join(root, 'data');
const dbPath = join(dataDir, 'command-center.json');
const assetVaultDir = join(dataDir, 'customer-assets');
const assetDbPath = join(assetVaultDir, 'customer-assets.sqlite');
const mediaCrawlerRoot = resolveMediaCrawlerRoot();
const mediaCrawlerPythonDir = join(mediaCrawlerRoot, 'MediaCrawlerPro-Python');
const mediaCrawlerDbPath = process.env.MEDIACRAWLER_DB_PATH || join(mediaCrawlerPythonDir, 'media_crawler.db');
const mediaCrawlerPythonExe = resolveMediaCrawlerPythonExe();
const mediaCrawlerSitePackages = join(root, 'Runtime', 'site-packages');
const verifiedClippingsDir = 'F:\\Longka Wiki\\龙咖Wiki\\Clippings';
const defaultClippingsDir = 'F:\\Longka Wiki\\龙咖Wiki\\Clippings';
const port = Number(process.env.PORT || 3760);
let dbWriteQueue = Promise.resolve();
const execFileAsync = promisify(execFile);
let assetDb = null;
let sqliteUnavailableReason = null;
let pgPool = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

const defaultConfig = {
  project: '色彩分析小程序获客',
  audience: '想改善形象、愿意发圈分享的女性和男士用户',
  goal: '筛出 3 条能直接进入视频/图文生产的选题',
  sources: [
    { layer: '快水', name: '小红书 / 视频号热点', cadence: '每 4 小时', use: '观察用户正在被什么内容触发兴趣。' },
    { layer: '深水', name: 'X / GitHub / 行业文章', cadence: '每天', use: '发现 AI Native、Agent、自动化工具的新方法。' },
    { layer: '慢水', name: '行业报告 / 竞品动态', cadence: '每周 2 次', use: '沉淀长文、课程和产品路线判断。' },
    { layer: '反水', name: '评论区 / 群聊问题', cadence: '每天', use: '抓取真实问题，把用户追问变成选题。' },
  ],
  keywords: {
    industry: ['AI 员工', 'AI Native', '小程序获客', '内容生产线'],
    pain: ['不会选题', '没流量', '客户不付款', '内容不稳定'],
    project: ['色彩分析', '形象试看', '朋友圈分享', '男士变精神'],
    conversion: ['怎么成交', '怎么种草', '怎么复购', '怎么让客户愿意试'],
  },
};

const defaultCompany = {
  name: '龙咖实验室',
  owner: '老板',
  stage: '项目验证期',
};

function resolveMediaCrawlerRoot() {
  const candidates = [
    process.env.MEDIACRAWLER_ROOT,
    join(root, 'MediaCrawlerPro'),
    resolve(root, '..', 'MediaCrawlerPro'),
    'E:\\Codex\\MediaCrawlerPro',
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(join(candidate, 'MediaCrawlerPro-Python', 'main.py'))) || candidates[0];
}

function resolveMediaCrawlerPythonExe() {
  const candidates = [
    process.env.MEDIACRAWLER_PYTHON,
    join(root, 'Runtime', 'Python312', 'python.exe'),
    join(mediaCrawlerPythonDir, '.venv', 'Scripts', 'python.exe'),
    'python',
  ].filter(Boolean);
  return candidates.find((candidate) => candidate === 'python' || existsSync(candidate)) || 'python';
}

function mediaCrawlerPythonEnv(extra = {}) {
  const separator = process.platform === 'win32' ? ';' : ':';
  const pythonPath = [mediaCrawlerSitePackages, process.env.PYTHONPATH].filter(Boolean).join(separator);
  return {
    ...process.env,
    PYTHONIOENCODING: 'utf-8',
    PYTHONPATH: pythonPath,
    ...extra,
  };
}

const defaultProjects = [
  {
    id: 'color-report',
    name: '色彩分析小程序获客',
    audience: '想改善形象、愿意发圈分享的女性和男士用户',
    goal: '筛出 3 条能直接进入视频/图文生产的选题',
    status: '运行中',
    createdAt: '2026-05-27T00:00:00.000Z',
  },
  {
    id: 'boss-content-os',
    name: '老板内容生产线',
    audience: '每天不知道发什么、缺少内容规划的小微企业老板',
    goal: '每天产出可发布选题、图文草稿和短视频脚本',
    status: '孵化中',
    createdAt: '2026-05-27T00:00:00.000Z',
  },
];

const seedMaterials = [
  makeSeedSignal('项目复盘', '客户说试看图不像本人，付费意愿会立刻下降。', 28, 17, 6, 3, 42, '像不像本人、值不值得付费'),
  makeSeedSignal('项目复盘', '小妹反馈：付款后看不到完整报告，会严重影响信任。', 36, 24, 8, 5, 55, '付款后看不到、交付不稳定'),
  makeSeedSignal('AI Native', '老板每天不知道发什么，需要一条选题中心。', 92, 41, 33, 18, 76, '每天发什么、内容没规划'),
  makeSeedSignal('增长观察', '试看图如果足够好看、能发朋友圈炫耀，就更容易带来自传播。', 156, 62, 47, 29, 88, '想发圈、想炫耀、想被夸'),
  makeSeedSignal('测试反馈', '男士形象分析不一定要变帅，但要变精神、干净、可信、有职业感。', 74, 39, 21, 11, 64, '男士变精神、不要变丑'),
];

const defaultWorkbench = {
  approved: false,
  approvedAt: null,
  employees: [
    {
      id: 'intel',
      role: '情报员工',
      status: '待老板批准',
      sop: ['读取高价值信息源', '按表现分排序', '标注客户痛点', '输出候选选题'],
      boundary: '不采集未授权私密聊天，不替老板判断商业优先级。',
      deliverable: '今日痛点雷达 + 10 条候选信号',
      result: '',
      updatedAt: null,
    },
    {
      id: 'content',
      role: '内容员工',
      status: '待老板批准',
      sop: ['选择一个痛点', '套用 PAS/SCAR/QUEST 结构', '生成 3 个标题', '输出小红书和朋友圈草稿'],
      boundary: '不承诺确定收益，不写违规夸大话术。',
      deliverable: '小红书笔记 + 朋友圈配文',
      result: '',
      updatedAt: null,
    },
    {
      id: 'video',
      role: '视频员工',
      status: '等待素材',
      sop: ['读取案例素材', '匹配视频模板', '生成封面和脚本', '交给小妹工作台合成'],
      boundary: '不使用无授权素材，不自动发布。',
      deliverable: '30 秒种草视频脚本 + 封面建议',
      result: '',
      updatedAt: null,
    },
    {
      id: 'growth',
      role: '增长员工',
      status: '排队中',
      sop: ['检查搜索词', '生成 FAQ', '规划小程序入口', '沉淀可复用转化话术'],
      boundary: '不绕过平台规则，不做封号风险动作。',
      deliverable: '搜索入口词 + 转化问答资产',
      result: '',
      updatedAt: null,
    },
  ],
};

await mkdir(dataDir, { recursive: true });
await ensureDb();
await initCollectorHub();
await ensureAssetDb();

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'GET' && url.pathname === '/api/state') return sendJson(res, await readDb());

    if (req.method === 'GET' && url.pathname === '/api/radar/seed-plan') {
      const db = await readDb();
      return sendJson(res, { ok: true, plan: db.radarSeedPlan || defaultRadarSeedPlan() });
    }

    if (req.method === 'POST' && url.pathname === '/api/radar/seed-plan') {
      const payload = await readJson(req);
      let plan = null;
      await mutateDb((db) => {
        plan = normalizeRadarSeedPlan(payload);
        db.radarSeedPlan = plan;
        addActivity(db, '保存内容雷达种子表', `赛道：${plan.track}，关键词 ${plan.keywords.length} 个，对标账号 ${plan.accounts.length} 个`);
        db.updatedAt = new Date().toISOString();
      });
      return sendJson(res, { ok: true, plan });
    }

    if (req.method === 'GET' && url.pathname === '/api/collectors/health') {
      return sendJson(res, await collectorHealth());
    }

    if (req.method === 'GET' && url.pathname === '/api/collectors/recent-assets') {
      const result = await loadRecentContentAssets({
        platform: url.searchParams.get('platform') || 'x',
        limit: url.searchParams.get('limit') || 100,
      });
      return sendJson(res, result);
    }

    if (req.method === 'GET' && url.pathname === '/api/content-assets/unified') {
      const result = await loadUnifiedContentAssets({
        platform: url.searchParams.get('platform') || '',
        keywords: url.searchParams.get('keywords') || '',
        runIds: url.searchParams.get('runIds') || '',
        limit: url.searchParams.get('limit') || 200,
      });
      return sendJson(res, result);
    }

    if (req.method === 'GET' && url.pathname === '/api/content-assets/x-batch') {
      const result = await loadXBatchAssets({
        runIds: url.searchParams.get('runIds') || '',
      });
      return sendJson(res, result, result.ok ? 200 : 400);
    }

    if (req.method === 'GET' && url.pathname === '/api/content-assets/x-latest-batch') {
      const result = await loadLatestXBatch({
        limitRuns: url.searchParams.get('limitRuns') || 3,
      });
      return sendJson(res, result, result.ok ? 200 : 400);
    }

    if (req.method === 'POST' && url.pathname === '/api/content-assets/confirm') {
      const payload = await readJson(req);
      const result = await confirmContentAsset(payload);
      return sendJson(res, result, result.ok ? 200 : 400);
    }

    if (req.method === 'POST' && url.pathname === '/api/collectors/xcrawl/x-user-tweets') {
      const payload = await readJson(req);
      const result = await runXcrawlXUserTweets(payload);
      return sendJson(res, result, result.ok ? 200 : 400);
    }

    if (req.method === 'POST' && url.pathname === '/api/collectors/xcrawl/x-user-tweets-batch') {
      const payload = await readJson(req);
      const result = await runXcrawlXUserTweetsBatch(payload);
      return sendJson(res, result, result.ok ? 200 : 400);
    }

    const xcrawlMatch = url.pathname.match(/^\/api\/collectors\/xcrawl\/(scrape|map|crawl|search)$/);
    if (req.method === 'POST' && xcrawlMatch) {
      const payload = await readJson(req);
      const result = await runXcrawlStandard(xcrawlMatch[1], payload);
      return sendJson(res, result, result.ok ? 200 : 400);
    }

    if (req.method === 'GET' && url.pathname === '/api/customer-profile') {
      return sendJson(res, { ok: true, profile: getCustomerProfile(), assetDbPath, assetVaultDir });
    }

    if (req.method === 'POST' && url.pathname === '/api/customer-profile') {
      const payload = await readJson(req);
      const profile = saveCustomerProfile(payload);
      await mutateDb((db) => {
        db.customerProfile = profile;
        db.config = normalizeConfig({
          ...db.config,
          project: profile.libraryName,
          audience: profile.industry,
          goal: profile.goal,
        });
        addActivity(db, '创建客户资料库', `客户资料库：${profile.libraryName}`);
        db.updatedAt = new Date().toISOString();
      });
      return sendJson(res, { ok: true, profile, assetDbPath, assetVaultDir, state: await readDb() });
    }

    if (req.method === 'GET' && url.pathname === '/api/export') {
      const db = await readDb();
      const body = JSON.stringify({ exportedAt: new Date().toISOString(), ...db }, null, 2);
      res.writeHead(200, {
        'content-type': 'application/json; charset=utf-8',
        'content-disposition': `attachment; filename="ai-native-backup-${new Date().toISOString().slice(0, 10)}.json"`,
        'content-length': Buffer.byteLength(body),
      });
      res.end(body);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/import') {
      const payload = await readJson(req);
      const restored = normalizeImportedDb(payload);
      addActivity(restored, '导入备份', `恢复经营数据：${restored.projects.length} 个项目`);
      restored.updatedAt = new Date().toISOString();
      await writeDb(restored);
      return sendJson(res, { ok: true, state: await readDb() });
    }

    if (req.method === 'POST' && url.pathname === '/api/config') {
      const payload = await readJson(req);
      await mutateDb((db) => {
        db.config = normalizeConfig({ ...db.config, ...payload });
        addActivity(db, '更新配置', `调整当前项目配置：${db.config.project}`);
        db.updatedAt = new Date().toISOString();
      });
      return sendJson(res, { ok: true });
    }

    if (req.method === 'POST' && url.pathname === '/api/projects') {
      const payload = await readJson(req);
      let project = null;
      await mutateDb((db) => {
        db.projects = normalizeProjects(db.projects);
        project = {
          id: slugify(payload.name || `project-${Date.now()}`),
          name: String(payload.name || '新经营项目').trim(),
          audience: String(payload.audience || '待定义客户人群').trim(),
          goal: String(payload.goal || '待定义今日经营目标').trim(),
          status: '新建',
          createdAt: new Date().toISOString(),
        };
        if (db.projects.some((item) => item.id === project.id)) project.id = `${project.id}-${Date.now()}`;
        db.projects.unshift(project);
        db.currentProjectId = project.id;
        db.config = normalizeConfig({ ...db.config, project: project.name, audience: project.audience, goal: project.goal });
        addActivity(db, '新建项目', `创建并切换到项目：${project.name}`);
        db.updatedAt = new Date().toISOString();
      });
      return sendJson(res, { ok: true, project, state: await readDb() });
    }

    if (req.method === 'POST' && url.pathname === '/api/projects/select') {
      const payload = await readJson(req);
      const projectId = String(payload.projectId || '');
      let selected = null;
      await mutateDb((db) => {
        db.projects = normalizeProjects(db.projects);
        selected = db.projects.find((item) => item.id === projectId) || db.projects[0];
        db.currentProjectId = selected.id;
        db.config = normalizeConfig({ ...db.config, project: selected.name, audience: selected.audience, goal: selected.goal });
        addActivity(db, '切换项目', `当前项目切换为：${selected.name}`);
        db.updatedAt = new Date().toISOString();
      });
      return sendJson(res, { ok: true, project: selected, state: await readDb() });
    }

    if (req.method === 'POST' && url.pathname === '/api/materials') {
      const payload = await readJson(req);
      const lines = String(payload.text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      await mutateDb((db) => {
        for (const line of lines) {
          db.rawMaterials.unshift({
            id: randomUUID(),
            source: payload.source || '手动录入',
            text: line,
            metrics: normalizeMetrics(payload.metrics),
            pain: payload.pain || inferPain(line),
            createdAt: new Date().toISOString(),
          });
        }
        db.rawMaterials = db.rawMaterials.slice(0, 200);
        addActivity(db, '补充信号', `手动录入 ${lines.length} 条高价值信号`);
      });
      return sendJson(res, { ok: true, count: lines.length });
    }

    if (req.method === 'POST' && url.pathname === '/api/customer-question-bank/manual') {
      const payload = await readJson(req);
      const projectId = String(payload.projectId || 'default-private-project');
      const owner = String(payload.owner || '客户本人');
      const keyword = String(payload.keyword || payload.industry || '客户问题').trim();
      const industry = String(payload.industry || '未分类行业').trim();
      const lines = String(payload.questions || payload.text || '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      if (!lines.length) return sendJson(res, { ok: false, error: 'empty_questions', message: '请至少填写一个客户问题。' }, 400);
      let bank = null;
      await mutateDb((db) => {
        db.customerQuestionBank = Array.isArray(db.customerQuestionBank) ? db.customerQuestionBank : [];
        bank = {
          id: `manual-question-bank-${Date.now()}`,
          scope: 'private',
          projectId,
          owner,
          keyword,
          industry,
          source: 'manual/customer-input',
          sampleCount: lines.length,
          generatedAt: new Date().toISOString(),
          questions: lines.map((question) => ({
            id: randomUUID(),
            scope: 'private',
            projectId,
            owner,
            keyword,
            industry,
            question,
            userPain: String(payload.userPain || '客户主动提出的问题，说明已有真实需求。'),
            intent: String(payload.intent || '客户咨询/成交前顾虑'),
            contentAngle: String(payload.contentAngle || '把客户问题改造成可解释、可保存、可转发的内容。'),
            recommendedFormats: Array.isArray(payload.recommendedFormats) ? payload.recommendedFormats : ['小红书图文', '短视频口播', '朋友圈文案'],
            score: Number(payload.score || 100),
            evidence: {
              sourcePlatform: 'manual',
              sourceTitle: String(payload.sourceTitle || '客户手动添加'),
              sourceUrl: String(payload.sourceUrl || ''),
              metrics: {},
              matchedText: question,
            },
            createdAt: new Date().toISOString(),
          })),
          answers: [],
        };
        bank.answers = bank.questions.map((item) => ({
          id: randomUUID(),
          scope: 'private',
          projectId,
          owner,
          questionId: item.id,
          question: item.question,
          answerStrategy: String(payload.answerStrategy || '先共情，再解释判断标准，最后给低门槛下一步。'),
          standardAnswer: String(payload.standardAnswer || '这个问题先不要急着直接买方案，第一步是把你现在具体卡在哪里判断清楚。判断清楚后，再选择最省力、风险最低的一步去尝试。'),
          contentHook: String(payload.contentHook || `很多客户都会问：${item.question}`),
          riskBoundary: String(payload.riskBoundary || '不夸大、不承诺确定结果、不替代专业诊断。'),
          recommendedFormats: item.recommendedFormats,
          evidence: item.evidence,
        }));
        db.customerQuestionBank.unshift(bank);
        db.customerQuestionBank = db.customerQuestionBank.slice(0, 80);
        addActivity(db, '添加客户问题库', `手动添加 ${lines.length} 条私有客户问题：${keyword}`);
        db.updatedAt = new Date().toISOString();
      });
      return sendJson(res, { ok: true, bank });
    }

    if (req.method === 'POST' && url.pathname === '/api/keyword-pipeline/run') {
      const payload = await readJson(req);
      const keyword = String(payload.keyword || '').trim();
      const industry = String(payload.industry || '未分类行业').trim();
      const platform = String(payload.platform || '小红书图文').trim();
      const visualMode = String(payload.visualMode || 'pexels').trim();
      if (!keyword) return sendJson(res, { ok: false, error: 'empty_keyword', message: '请填写行业关键词。' }, 400);
      const content = await runNodeTool('run-keyword-content-pipeline.mjs', [
        `--keyword=${keyword}`,
        `--industry=${industry}`,
        `--platform=${platform}`,
        `--visual=${visualMode}`,
      ]);
      if (!content.ok) return sendJson(res, content, 500);
      const questionBank = await runNodeTool('build-customer-question-bank.mjs', [
        `--keyword=${keyword}`,
        `--industry=${industry}`,
        `--project=${payload.projectId || 'web-test'}`,
        `--owner=${payload.owner || '客户本人'}`,
      ]);
      if (!questionBank.ok) return sendJson(res, questionBank, 500);
      const cardExport = await runNodeTool('export-xhs-cards.mjs', [`--asset=${content.assetId}`]);
      if (!cardExport.ok) return sendJson(res, cardExport, 500);
      return sendJson(res, {
        ok: true,
        keyword,
        industry,
        platform,
        visualMode,
        content,
        questionBank,
        cardExport,
      });
    }

    if (req.method === 'POST' && url.pathname === '/api/sources/content-samples/import') {
      const payload = await readJson(req);
      const samples = normalizeContentSamplePayload(payload);
      await mutateDb((db) => {
        db.contentSamples = Array.isArray(db.contentSamples) ? db.contentSamples : [];
        db.rawMaterials = Array.isArray(db.rawMaterials) ? db.rawMaterials : [];
        for (const sample of samples.reverse()) {
          db.contentSamples.unshift(sample);
          db.rawMaterials.unshift(contentSampleToMaterial(sample));
        }
        db.contentSamples = db.contentSamples.slice(0, 300);
        db.rawMaterials = db.rawMaterials.slice(0, 300);
        addActivity(db, '导入内容样本', `导入 ${samples.length} 条 ${samples[0]?.platform || '平台'} 样本，进入选题中心`);
        db.updatedAt = new Date().toISOString();
      });
      return sendJson(res, { ok: true, count: samples.length, samples });
    }

    if (req.method === 'POST' && url.pathname === '/api/sources/mediacrawler/import-sqlite') {
      const payload = await readJson(req);
      const dbFile = String(payload.dbPath || mediaCrawlerDbPath);
      const limit = Math.min(Math.max(Number(payload.limit || 20), 1), 100);
      const queryWords = splitQueryWords(`${payload.keywords || ''}`);
      const result = await importMediaCrawlerSqlite(dbFile, limit, queryWords);
      if (queryWords.length) {
        result.samples = result.samples.filter((sample) => sampleMatchesQuery(sample, queryWords));
      }
      if (!result.samples.length) {
        return sendJson(res, {
          ok: true,
          count: 0,
          dbPath: dbFile,
          message: result.message || '没有匹配当前行业和关键词的 MediaCrawlerPro 采集数据。请先真实运行对应关键词采集，再导入 SQLite。',
        });
      }
      await mutateDb((db) => {
        db.contentSamples = Array.isArray(db.contentSamples) ? db.contentSamples : [];
        db.rawMaterials = Array.isArray(db.rawMaterials) ? db.rawMaterials : [];
        const existing = new Set(db.contentSamples.map((item) => item.url || `${item.sourceTool}:${item.title}:${item.publishedAt}`));
        for (const sample of result.samples.reverse()) {
          const key = sample.url || `${sample.sourceTool}:${sample.title}:${sample.publishedAt}`;
          if (existing.has(key)) continue;
          db.contentSamples.unshift(sample);
          db.rawMaterials.unshift(contentSampleToMaterial(sample));
          existing.add(key);
        }
        db.contentSamples = db.contentSamples.slice(0, 300);
        db.rawMaterials = db.rawMaterials.slice(0, 300);
        addActivity(db, '导入 MediaCrawlerPro', `从 SQLite 导入 ${result.samples.length} 条真实小红书样本`);
        db.updatedAt = new Date().toISOString();
      });
      return sendJson(res, { ok: true, count: result.samples.length, dbPath: dbFile, samples: result.samples });
    }

    if (req.method === 'POST' && url.pathname === '/api/cdp/start-xhs-browser') {
      return sendJson(res, startXhsCdpBrowser());
    }

    if (req.method === 'POST' && url.pathname === '/api/cdp/sync-xhs-cookie') {
      const cdp = await syncXhsCookieFromCdp();
      return sendJson(res, cdp, cdp.ok ? 200 : 409);
    }

    if (req.method === 'POST' && url.pathname === '/api/sources/mediacrawler/xhs-collect') {
      const payload = await readJson(req);
      const industry = String(payload.industry || '');
      const keywords = splitQueryWords(`${payload.keywords || ''}`).slice(0, 5);
      const cdpLimit = Math.max(5, Math.min(20, Number(payload.cdpLimit || 12)));
      const deepLimit = Math.max(0, Math.min(5, Number(payload.deepLimit || 3)));
      const detailDelayMs = Math.max(0, Math.min(20000, Number(payload.detailDelayMs || 0)));
      const detailDelayJitterMs = Math.max(0, Math.min(10000, Number(payload.detailDelayJitterMs || 0)));
      const collectionRunId = `xhs-cdp-${Date.now()}-${randomUUID().slice(0, 8)}`;
      if (!keywords.length) return sendJson(res, { ok: false, error: 'missing_keywords', message: '请先输入要验证的关键词。' }, 400);
      const cdp = await syncXhsCookieFromCdp();
      if (!cdp.ok) return sendJson(res, { ok: false, stage: 'cdp-cookie', ...cdp }, 409);
      const preflight = await mediaCrawlerPreflight('xhs');
      if (!preflight.ready) return sendJson(res, { ok: false, stage: 'preflight', ...preflight }, 409);
      const cdpCollect = await collectXhsSearchViaCdp(keywords, cdpLimit);
      const collect = { ok: false, skipped: true, reason: 'cdp_primary', message: '当前版本先用 CDP 浏览器页面采集，MediaCrawler API 不阻塞第一闭环。' };
      const imported = { samples: [], message: '' };
      if (!cdpCollect.samples?.length) {
        return sendJson(res, {
          ok: false,
          stage: cdpCollect.stage || 'cdp-search',
          keywords,
          collected: collect,
          cdpFallback: cdpCollect,
          importedCount: 0,
          dbPath: mediaCrawlerDbPath,
          importMessage: imported.message,
          message: cdpCollect.message || 'CDP 浏览器页面没有采集到可用帖子。系统不会用假数据替代。',
        }, 500);
      }
      const quickSamples = cdpCollect.samples;
      const deepTargets = selectCommentDeepDiveTargets(quickSamples, deepLimit);
      const deepDiveResults = [];
      for (const [index, target] of deepTargets.entries()) {
        if (!target.url) continue;
        if (index > 0 && detailDelayMs > 0) {
          const jitter = detailDelayJitterMs ? Math.floor(Math.random() * detailDelayJitterMs) : 0;
          await sleep(detailDelayMs + jitter);
        }
        const detail = await collectXhsDetailViaCdp(target);
        deepDiveResults.push({
          id: target.id,
          title: target.title,
          url: target.url,
          metrics: target.metrics,
          result: detail,
        });
      }
      const deepSamples = deepDiveResults
        .filter((item) => item.result?.ok && item.result.sample)
        .map((item) => item.result.sample);
      const finalSamples = mergeContentSamples(quickSamples, deepSamples).map((sample) => ({
        ...sample,
        collectionRunId,
        collectedAt: sample.collectedAt || new Date().toISOString(),
        collectionStatus: 'real',
      }));
      const questionBank = buildQuestionBankFromSamples(finalSamples, { industry, keywords });
      if (finalSamples.length) {
        await mutateDb((db) => {
          db.contentSamples = Array.isArray(db.contentSamples) ? db.contentSamples : [];
          db.rawMaterials = Array.isArray(db.rawMaterials) ? db.rawMaterials : [];
          const existing = new Set(db.contentSamples.map((item) => item.url || `${item.sourceTool}:${item.title}:${item.publishedAt}`));
          for (const sample of finalSamples.reverse()) {
            const key = sample.url || `${sample.sourceTool}:${sample.title}:${sample.publishedAt}`;
            const sampleIndex = db.contentSamples.findIndex((item) => (sample.url && item.url === sample.url) || item.id === sample.id);
            if (sampleIndex >= 0) db.contentSamples[sampleIndex] = sample;
            else db.contentSamples.unshift(sample);
            const material = contentSampleToMaterial(sample);
            const materialIndex = db.rawMaterials.findIndex((item) => item.contentSampleId === sample.id);
            if (materialIndex >= 0) db.rawMaterials[materialIndex] = material;
            else db.rawMaterials.unshift(material);
            existing.add(key);
          }
          db.customerQuestionBank = Array.isArray(db.customerQuestionBank) ? db.customerQuestionBank : [];
          if (questionBank.questions.length) {
            db.customerQuestionBank.unshift(questionBank);
            db.customerQuestionBank = db.customerQuestionBank.slice(0, 80);
          }
          db.contentSamples = db.contentSamples.slice(0, 300);
          db.rawMaterials = db.rawMaterials.slice(0, 300);
          db.lastCollectionRunId = collectionRunId;
          db.lastCollectionKeywords = keywords;
          const workflow = buildXhsWorkflow({ contentSamples: finalSamples, rawMaterials: [] });
          db.candidates = workflow.candidates;
          db.tasks = [...workflow.tasks, ...db.tasks].slice(0, 120);
          db.assets = [...workflow.assets, ...db.assets].slice(0, 120);
          db.lastPipelineRunAt = new Date().toISOString();
          addActivity(db, '采集并生成选题', `小红书关键词：${keywords.join(' / ')}，导入 ${finalSamples.length} 条样本`);
          db.updatedAt = new Date().toISOString();
        });
      }
      return sendJson(res, {
        ok: true,
        stage: 'done',
        keywords,
        collectionRunId,
        collected: collect,
        cdpFallback: cdpCollect,
        pacing: {
          mode: payload.paceMode || 'safe',
          cdpLimit,
          deepLimit,
          detailDelayMs,
          detailDelayJitterMs,
        },
        importedCount: finalSamples.length,
        samples: finalSamples,
        quickScanCount: quickSamples.length,
        deepDiveCount: deepDiveResults.length,
        deepDiveTargets: deepTargets.map((item) => ({
          id: item.id,
          title: item.title,
          url: item.url,
          metrics: item.metrics,
        })),
        deepDiveDiagnostics: deepDiveResults.map((item) => ({
          id: item.id,
          ok: Boolean(item.result?.ok),
          bodyLength: item.result?.bodyLength || 0,
          imageCount: item.result?.imageCount || 0,
          commentCount: item.result?.commentCount || 0,
          domDescLength: item.result?.domDescLength || 0,
          extractedLength: item.result?.extractedLength || 0,
          bodyCandidateLengths: item.result?.bodyCandidateLengths || [],
          domError: item.result?.domError || '',
          message: item.result?.message || '',
          contentHead: item.result?.sample?.content ? String(item.result.sample.content).slice(0, 160) : '',
        })),
        questionCount: questionBank.questions.length,
        questionBank,
        message: `已通过 CDP 浏览器采集 ${finalSamples.length} 条真实小红书结果，其中深挖 ${deepSamples.length} 条详情/评论。`,
      });
    }

    if (req.method === 'POST' && url.pathname === '/api/sources/mediacrawler/xhs-comments') {
      const payload = await readJson(req);
      const noteUrl = String(payload.url || '');
      if (!noteUrl) return sendJson(res, { ok: false, error: 'missing_url', message: '缺少要补抓评论的小红书笔记 URL。' }, 400);
      const cdp = await syncXhsCookieFromCdp();
      if (!cdp.ok) return sendJson(res, { ok: false, stage: 'cdp-cookie', ...cdp }, 409);
      const preflight = await mediaCrawlerPreflight('xhs');
      if (!preflight.ready) return sendJson(res, { ok: false, stage: 'preflight', ...preflight }, 409);
      const detail = await runMediaCrawlerXhsDetail(noteUrl);
      const imported = await importMediaCrawlerSqlite(mediaCrawlerDbPath, 120);
      const noteId = extractXhsNoteId(noteUrl);
      const matched = imported.samples.find((sample) => sample.id.endsWith(noteId)) || imported.samples[0];
      await mutateDb((db) => {
        db.contentSamples = Array.isArray(db.contentSamples) ? db.contentSamples : [];
        if (matched) {
          const next = { ...matched, sourceJudgement: judgeContentSource(matched) };
          const index = db.contentSamples.findIndex((item) => item.id === next.id || item.url === next.url);
          if (index >= 0) db.contentSamples[index] = next;
          else db.contentSamples.unshift(next);
        }
        const workflow = buildXhsWorkflow(db);
        db.candidates = workflow.candidates;
        db.tasks = [...workflow.tasks, ...db.tasks].slice(0, 120);
        db.assets = [...workflow.assets, ...db.assets].slice(0, 120);
        addActivity(db, '补抓评论', `补抓小红书笔记评论：${noteId || noteUrl.slice(0, 40)}`);
        db.updatedAt = new Date().toISOString();
      });
      return sendJson(res, {
        ok: Boolean(matched),
        stage: 'done',
        detail: { ...detail, ok: Boolean(matched) || detail.ok },
        sample: matched || null,
        message: matched
          ? `已补抓并回写：${matched.title || noteId}，评论 ${matched.comments.length} 条${detail.ok ? '' : '；采集进程超时但有效数据已写入'}`
          : '详情命令已执行，但没有在 SQLite 中匹配到该笔记。',
      });
    }

    if (req.method === 'POST' && url.pathname === '/api/content-workflow/xhs/run') {
      const db = await readDb();
      const result = buildXhsWorkflow(db);
      await mutateDb((nextDb) => {
        nextDb.candidates = result.candidates;
        nextDb.tasks = [...result.tasks, ...nextDb.tasks].slice(0, 120);
        nextDb.assets = [...result.assets, ...nextDb.assets].slice(0, 120);
        nextDb.lastPipelineRunAt = new Date().toISOString();
        addActivity(nextDb, '运行小红书工作流', `生成 ${result.candidates.length} 条候选选题、${result.assets.length} 份发布草稿`);
        nextDb.updatedAt = new Date().toISOString();
      });
      return sendJson(res, { ok: true, ...result });
    }

    if (req.method === 'POST' && url.pathname === '/api/pipeline/run') {
      const db = await readDb();
      const candidates = buildCandidates(db.config, db.rawMaterials);
      await mutateDb((nextDb) => {
        nextDb.candidates = candidates;
        nextDb.lastPipelineRunAt = new Date().toISOString();
        addActivity(nextDb, '运行内容生产线', `生成 ${candidates.length} 条候选选题`);
      });
      return sendJson(res, { ok: true, candidates });
    }

    if (req.method === 'POST' && url.pathname === '/api/workbench/approve') {
      await mutateDb((db) => {
        db.workbench = normalizeWorkbench(db.workbench);
        db.workbench.approved = true;
        db.workbench.approvedAt = new Date().toISOString();
        db.workbench.employees = db.workbench.employees.map((employee) => ({
          ...employee,
          status: employee.status === '待老板批准' ? '可派发' : employee.status,
          updatedAt: new Date().toISOString(),
        }));
        addActivity(db, '批准目标', '老板批准今日 AI 员工工作目标');
        db.updatedAt = new Date().toISOString();
      });
      return sendJson(res, { ok: true, workbench: (await readDb()).workbench });
    }

    if (req.method === 'POST' && url.pathname === '/api/workbench/employee-action') {
      const payload = await readJson(req);
      const action = String(payload.action || '');
      const employeeId = String(payload.employeeId || '');
      let changed = null;
      await mutateDb((db) => {
        db.workbench = normalizeWorkbench(db.workbench);
        db.workbench.employees = db.workbench.employees.map((employee) => {
          if (employee.id !== employeeId) return employee;
          const next = { ...employee, updatedAt: new Date().toISOString() };
          if (action === 'dispatch') {
            next.status = '执行中';
            next.result = buildEmployeeResult(employee, db);
          } else if (action === 'review') {
            next.status = '待老板验收';
            next.result = next.result || buildEmployeeResult(employee, db);
          } else if (action === 'complete') {
            next.status = '已验收';
            next.result = next.result || buildEmployeeResult(employee, db);
          }
          changed = next;
          return next;
        });
        if (changed) addActivity(db, '员工流转', `${changed.role}：${changed.status}`);
        db.updatedAt = new Date().toISOString();
      });
      if (!changed) return sendJson(res, { ok: false, error: 'employee_not_found' }, 404);
      return sendJson(res, { ok: true, employee: changed, workbench: (await readDb()).workbench });
    }

    if (req.method === 'POST' && url.pathname === '/api/sources/clippings/scan') {
      const payload = await readJson(req);
      const dir = payload.dir || verifiedClippingsDir || defaultClippingsDir;
      const limit = Math.min(Math.max(Number(payload.limit || 30), 1), 100);
      const signals = await scanClippings(dir, limit);
      await mutateDb((db) => {
        const existingKeys = new Set(db.rawMaterials.map((item) => `${item.source}:${item.text}`));
        for (const signal of signals.reverse()) {
          const key = `${signal.source}:${signal.text}`;
          if (!existingKeys.has(key)) db.rawMaterials.unshift(signal);
        }
        db.rawMaterials = db.rawMaterials.slice(0, 300);
        addActivity(db, '扫描资料', `扫描精选资料 ${signals.length} 条`);
        db.updatedAt = new Date().toISOString();
      });
      return sendJson(res, { ok: true, count: signals.length, dir });
    }

    if (req.method === 'POST' && url.pathname === '/api/topics') {
      const payload = await readJson(req);
      const db = await readDb();
      const candidate = db.candidates.find((item) => item.id === payload.candidateId);
      if (!candidate) return sendJson(res, { ok: false, error: 'candidate_not_found' }, 404);
      const topic = { ...candidate, id: randomUUID(), status: '待生产', addedAt: new Date().toISOString() };
      await mutateDb((nextDb) => {
        if (!nextDb.topics.some((item) => item.title === topic.title)) nextDb.topics.unshift(topic);
        addActivity(nextDb, '选题入库', `选题入库：${topic.title}`);
      });
      return sendJson(res, { ok: true, topic });
    }

    if (req.method === 'POST' && url.pathname === '/api/production-tasks') {
      const payload = await readJson(req);
      const db = await readDb();
      const candidate = db.candidates.find((item) => item.id === payload.candidateId) || db.topics.find((item) => item.id === payload.topicId);
      if (!candidate) return sendJson(res, { ok: false, error: 'topic_not_found' }, 404);
      const task = buildProductionTask(candidate);
      const asset = buildAssetDraft(candidate);
      await mutateDb((nextDb) => {
        if (!nextDb.topics.some((item) => item.title === candidate.title)) nextDb.topics.unshift({ ...candidate, id: randomUUID(), status: '待生产', addedAt: new Date().toISOString() });
        nextDb.tasks.unshift(task);
        nextDb.assets.unshift(asset);
        addActivity(nextDb, '生成任务', `生成生产任务：${task.title}`);
      });
      return sendJson(res, { ok: true, task, asset });
    }

    if (req.method === 'POST' && url.pathname === '/api/publish-records') {
      const payload = await readJson(req);
      const db = await readDb();
      const asset = db.assets.find((item) => item.id === payload.assetId);
      if (!asset) return sendJson(res, { ok: false, error: 'asset_not_found', message: '没有找到对应发布包。' }, 404);
      const record = buildPublishRecord(asset, payload);
      const sample = buildPublishSample(asset, record);
      const replicationTasks = buildReplicationTasks(asset, record);
      await mutateDb((nextDb) => {
        nextDb.publishRecords = [record, ...(nextDb.publishRecords || [])].slice(0, 200);
        nextDb.contentSamples = [sample, ...(nextDb.contentSamples || [])].slice(0, 240);
        nextDb.tasks = [...replicationTasks, ...nextDb.tasks].slice(0, 160);
        addActivity(nextDb, '发布复盘', `记录 ${record.platform} 数据：赞${record.metrics.likes}/藏${record.metrics.saves}/评${record.metrics.comments}/私信${record.metrics.messages}/付款${record.metrics.orders}`);
        if (replicationTasks.length) addActivity(nextDb, '生成复刻任务', `从复盘自动生成 ${replicationTasks.length} 个下一轮生产任务`);
        nextDb.updatedAt = new Date().toISOString();
      });
      return sendJson(res, { ok: true, record, sample, tasks: replicationTasks });
    }

    if (req.method === 'POST' && url.pathname === '/api/tasks/execute') {
      const payload = await readJson(req);
      const db = await readDb();
      const task = db.tasks.find((item) => item.id === payload.taskId);
      if (!task) return sendJson(res, { ok: false, error: 'task_not_found', message: '没有找到任务。' }, 404);
      const result = executeTask(task, db);
      if (!result.asset) return sendJson(res, { ok: false, error: 'task_not_executable', message: result.message || '这个任务暂时没有可自动执行的动作。' }, 400);
      await mutateDb((nextDb) => {
        nextDb.assets = [result.asset, ...(nextDb.assets || [])].slice(0, 160);
        nextDb.tasks = (nextDb.tasks || []).map((item) => item.id === task.id ? {
          ...item,
          status: '已生成发布包',
          executedAt: new Date().toISOString(),
          generatedAssetId: result.asset.id,
        } : item);
        addActivity(nextDb, '执行复刻任务', `生成发布包：${result.asset.title}`);
        nextDb.updatedAt = new Date().toISOString();
      });
      return sendJson(res, { ok: true, taskId: task.id, asset: result.asset });
    }

    if (req.method === 'POST' && url.pathname === '/api/assets/export-xhs-cards') {
      const payload = await readJson(req);
      const db = await readDb();
      const asset = db.assets.find((item) => item.id === payload.assetId);
      if (!asset || !asset.structured?.cardPlan?.length) return sendJson(res, { ok: false, error: 'asset_not_exportable', message: '这个发布包没有可导出的卡片组。' }, 400);
      const manifest = await exportXhsCards(asset.id);
      await mutateDb((nextDb) => {
        nextDb.assets = (nextDb.assets || []).map((item) => item.id === asset.id ? {
          ...item,
          exportedCards: manifest,
          exportedAt: new Date().toISOString(),
        } : item);
        addActivity(nextDb, '导出卡片组', `导出 ${manifest.count} 张小红书 PNG：${asset.title}`);
        nextDb.updatedAt = new Date().toISOString();
      });
      return sendJson(res, { ok: true, manifest });
    }

    if (req.method === 'POST' && url.pathname === '/api/xhs-cards/export-plan') {
      const payload = await readJson(req);
      const cards = Array.isArray(payload.cards) ? payload.cards : [];
      if (!cards.length) return sendJson(res, { ok: false, error: 'missing_cards', message: '没有可导出的卡片方案。' }, 400);
      const now = new Date().toISOString();
      const asset = {
        id: randomUUID(),
        topicId: payload.topicId || `xhs-plan-${Date.now()}`,
        title: `小红书图文卡片组：${payload.title || cards[0]?.title || '已确认文案'}`,
        type: '小红书图文卡片组',
        structured: {
          selectedTitle: payload.title || cards[0]?.title || '',
          coverText: payload.title || cards[0]?.title || '',
          sourceSummary: {
            layer: 'confirmed-copy',
            validation: '文案已确认',
            validationScore: 90,
            saveMotive: '用户可收藏对照',
            socialMotive: '来自已确认源头和二创文案',
            conversion: '先收藏对照，再咨询或评估',
          },
          hook: cards[1]?.text || cards[0]?.text || '',
          bodyDraft: String(payload.body || '').split(/\n+/).map((line) => line.trim()).filter(Boolean).slice(0, 8),
          cardPlan: cards.map((card, index) => ({
            page: index + 1,
            role: card.type || card.role || `第 ${index + 1} 页`,
            title: card.title || '',
            copy: card.text || card.copy || '',
          })),
          commentGuide: [
            '你最想先判断哪一种情况？',
            '如果分不清，可以先按这张清单对照。',
          ],
          publishChecklist: [
            '确认文案已经人工验收。',
            '确认图片没有使用竞品原图。',
            '确认没有疗效承诺、医疗诊断语气和夸张前后对比。',
          ],
          riskNotes: [
            '当前导出为原创信息卡片，不渲染竞品原图。',
            '发布前仍需人工复核平台合规表达。',
          ],
          visualRoute: payload.visualRoute || null,
        },
        copy: payload.body || '',
        createdAt: now,
      };
      await mutateDb((nextDb) => {
        nextDb.assets = [asset, ...(nextDb.assets || [])].slice(0, 200);
        addActivity(nextDb, '生成小红书卡片方案', `准备导出 ${asset.structured.cardPlan.length} 张 PNG：${asset.title}`);
        nextDb.updatedAt = now;
      });
      const manifest = await exportXhsCards(asset.id);
      await mutateDb((nextDb) => {
        nextDb.assets = (nextDb.assets || []).map((item) => item.id === asset.id ? {
          ...item,
          exportedCards: manifest,
          exportedAt: new Date().toISOString(),
        } : item);
        addActivity(nextDb, '导出小红书 PNG', `已导出 ${manifest.count} 张可发卡片：${asset.title}`);
        nextDb.updatedAt = new Date().toISOString();
      });
      return sendJson(res, { ok: true, assetId: asset.id, manifest });
    }

    if (req.method === 'POST' && url.pathname === '/api/assets/export-video-package') {
      const payload = await readJson(req);
      const db = await readDb();
      const asset = db.assets.find((item) => item.id === payload.assetId);
      if (!asset || !asset.structured?.videoPackage) return sendJson(res, { ok: false, error: 'asset_not_video_ready', message: '这个发布包没有可交接给小妹工作台的视频包。' }, 400);
      const manifest = await exportVideoPackageForXiaomei(asset);
      await mutateDb((nextDb) => {
        nextDb.assets = (nextDb.assets || []).map((item) => item.id === asset.id ? {
          ...item,
          exportedVideoPackage: manifest,
          exportedVideoPackageAt: new Date().toISOString(),
        } : item);
        addActivity(nextDb, '导出视频任务包', `交接到小妹视频工作台：${asset.title}`);
        nextDb.updatedAt = new Date().toISOString();
      });
      return sendJson(res, { ok: true, manifest });
    }

    if (req.method === 'POST' && url.pathname === '/api/content-draft/rewrite') {
      const payload = await readJson(req);
      const result = await generateSopRewriteDraft(payload);
      return sendJson(res, result.ok ? result : { ...result, fallback: true });
    }

    if (req.method === 'POST' && url.pathname === '/api/xiaomei/video-job') {
      const payload = await readJson(req);
      const manifest = await exportAdhocVideoJobForXiaomei(payload);
      await mutateDb((nextDb) => {
        addActivity(nextDb, '交接小妹视频工作台', `V2 选题视频任务：${payload.title || payload.topic || '未命名选题'}`);
        nextDb.updatedAt = new Date().toISOString();
      });
      return sendJson(res, { ok: true, manifest });
    }

    if (req.method === 'POST' && url.pathname === '/api/workflow-actions') {
      const payload = await readJson(req);
      const task = buildWorkflowActionTask(String(payload.actionKey || ''), await readDb());
      if (!task) return sendJson(res, { ok: false, error: 'workflow_action_not_found' }, 404);
      await mutateDb((nextDb) => {
        nextDb.tasks.unshift(task);
        addActivity(nextDb, '系统建设任务', `从 ${task.layer} 生成任务：${task.title}`);
        nextDb.updatedAt = new Date().toISOString();
      });
      return sendJson(res, { ok: true, task });
    }

    return serveStatic(url.pathname, res);
  } catch (error) {
    return sendJson(res, { ok: false, error: error.message }, 500);
  }
}).listen(port, () => {
  console.log(`AI Native topic pipeline: http://localhost:${port}`);
});

function buildCandidates(config, rawMaterials) {
  const materials = rawMaterials.length ? rawMaterials : seedMaterials;
  const keywordText = Object.values(config.keywords || {}).flat().join(' ');
  const base = materials.slice(0, 12).map((item) => scoreMaterial(item, keywordText, config));
  const clusters = [
    { title: '付了钱却看不到结果，是 AI 产品最不能犯的错', match: ['同步', '付款', '看不到', '交付', '稳定'], formula: 'SCAR', platform: '朋友圈 / 公众号' },
    { title: '为什么用户愿意为一张形象试看图付款？', match: ['试看', '朋友圈', '分享', '炫耀', '愿意'], formula: 'PAS', platform: '小红书 / 朋友圈' },
    { title: '男士形象分析不是变帅，而是先变精神', match: ['男士', '精神', '干净', '职业', '可信'], formula: 'SCAR', platform: '视频号' },
    { title: '老板每天不知道发什么，是因为没有内容生产线', match: ['老板', '选题', '内容', '每天', '流水线'], formula: 'QUEST', platform: '小红书 / 公众号' },
  ];

  return clusters.map((cluster) => {
    const related = base.filter((item) => cluster.match.some((word) => item.text.includes(word))).sort((a, b) => b.score - a.score);
    const picked = related.length ? related : base.slice(0, 2);
    const signalScore = picked.reduce((sum, item) => sum + Number(item.performanceScore || 0), 0) / Math.max(1, picked.length);
    const score = Math.min(98, Math.round(58 + signalScore * 0.34 + picked.length * 4 + (cluster.formula === 'SCAR' ? 5 : 3)));
    return {
      id: randomUUID(),
      title: cluster.title,
      source: picked.map((item) => item.source).join(' / ') || '信息池',
      score,
      formula: cluster.formula,
      platform: cluster.platform,
      angle: buildAngle(cluster.title, config),
      material: picked.slice(0, 3).map((item) => item.text),
      signals: picked.slice(0, 3).map((item) => ({
        source: item.source,
        text: item.text,
        metrics: item.metrics,
        pain: item.pain || inferPain(item.text),
        performanceScore: item.performanceScore,
      })),
      createdAt: new Date().toISOString(),
    };
  }).sort((a, b) => b.score - a.score);
}

function normalizeContentSamplePayload(payload = {}) {
  const rows = Array.isArray(payload.samples) ? payload.samples : [payload];
  return rows.map((row) => normalizeContentSample(row)).filter((row) => row.title || row.content || row.comments.length);
}

function splitQueryWords(text = '') {
  return String(text)
    .split(/[\s,，、;；|]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);
}

function sampleMatchesQuery(sample, words) {
  const haystack = [
    sample.keyword,
    sample.title,
    sample.content,
    sample.author,
    ...(Array.isArray(sample.tags) ? sample.tags : []),
    ...(Array.isArray(sample.comments) ? sample.comments.slice(0, 8) : []),
  ].join(' ');
  return words.some((word) => haystack.includes(word));
}

async function syncXhsCookieFromCdp() {
  let version;
  try {
    version = await fetchJson('http://127.0.0.1:9222/json/version', 2500);
  } catch {
    return {
      ok: false,
      message: '没有检测到 CDP 浏览器。请用 --remote-debugging-port=9222 启动 Chrome，并在该浏览器登录小红书。',
      action: 'start_cdp_browser',
      command: `chrome.exe --remote-debugging-port=9222 --user-data-dir="${join(root, 'chrome-cdp-profile')}" https://www.xiaohongshu.com`,
    };
  }
  const pageWsUrl = await getCdpPageWebSocketUrl();
  if (!pageWsUrl) {
    return { ok: false, message: 'CDP 已打开，但没有可用页面 target，无法读取 Cookie。请在调试浏览器里打开 xiaohongshu.com。' };
  }
  const cookieResult = await readCookiesViaCdp(pageWsUrl, 'https://www.xiaohongshu.com');
  const cookies = (cookieResult.cookies || []).filter((item) => /xiaohongshu\.com$/.test(String(item.domain || '').replace(/^\./, '')));
  const webSession = cookies.find((item) => item.name === 'web_session' && item.value);
  if (!webSession) {
    return {
      ok: false,
      message: 'CDP 浏览器里没有检测到小红书登录态 web_session。请在这个调试浏览器里打开 xiaohongshu.com 并登录。',
      action: 'login_xhs_in_cdp_browser',
    };
  }
  const cookieString = cookies.map((item) => `${item.name}=${item.value}`).join('; ');
  await writeXhsCookieToExcel(cookieString);
  return { ok: true, cookieCount: cookies.length, source: 'cdp', browser: version.Browser || '' };
}

function startXhsCdpBrowser() {
  const profileDir = join(root, 'chrome-cdp-profile');
  const command = `start "" chrome.exe --remote-debugging-port=9222 --user-data-dir="${profileDir}" https://www.xiaohongshu.com`;
  try {
    const child = spawn('cmd.exe', ['/d', '/s', '/c', command], {
      cwd: root,
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    });
    child.unref();
    return {
      ok: true,
      action: 'start_cdp_browser',
      port: 9222,
      profileDir,
      command,
      message: '已弹出新的 Chrome CDP 窗口。请在这个窗口扫码登录小红书，登录后回到页面点击“已扫码，读取 Cookie”。',
    };
  } catch (error) {
    return {
      ok: false,
      action: 'start_cdp_browser_failed',
      profileDir,
      command,
      message: `启动 Chrome CDP 失败：${error.message}`,
    };
  }
}

async function getCdpPageWebSocketUrl() {
  const targets = await fetchJson('http://127.0.0.1:9222/json/list', 2500).catch(() => []);
  const pages = Array.isArray(targets) ? targets.filter((item) => item.type === 'page' && item.webSocketDebuggerUrl) : [];
  const xhs = pages.find((item) => String(item.url || '').includes('xiaohongshu.com'));
  if (xhs) return xhs.webSocketDebuggerUrl;
  if (pages[0]) return pages[0].webSocketDebuggerUrl;
  const created = await fetchJson('http://127.0.0.1:9222/json/new?https://www.xiaohongshu.com', 2500).catch(() => null);
  return created?.webSocketDebuggerUrl || '';
}

async function readCookiesViaCdp(wsUrl, url) {
  const script = [
    'const wsUrl = process.argv[1];',
    'const targetUrl = process.argv[2];',
    'if (typeof WebSocket === "undefined") { console.error("当前 Node 不支持内置 WebSocket，请升级 Node 或安装 ws。"); process.exit(1); }',
    'const ws = new WebSocket(wsUrl);',
    'let id = 1;',
    'function call(method, params) {',
    '  return new Promise((resolve, reject) => {',
    '    const msgId = id++;',
    '    const timer = setTimeout(() => reject(new Error("CDP timeout: " + method)), 8000);',
    '    function onMessage(event) {',
    '      const data = JSON.parse(String(event.data));',
    '      if (data.id !== msgId) return;',
    '      clearTimeout(timer);',
    '      ws.removeEventListener("message", onMessage);',
    '      if (data.error) reject(new Error(data.error.message));',
    '      else resolve(data.result || {});',
    '    }',
    '    ws.addEventListener("message", onMessage);',
    '    ws.send(JSON.stringify({ id: msgId, method, params }));',
    '  });',
    '}',
    'ws.addEventListener("open", async () => {',
    '  try {',
    '    await call("Network.enable", {});',
    '    const result = await call("Network.getCookies", { urls: [targetUrl] });',
    '    console.log(JSON.stringify(result));',
    '    ws.close();',
    '  } catch (err) { console.error(err.message); ws.close(); process.exit(1); }',
    '});',
  ].join('\n');
  const { stdout } = await execFileAsync(process.execPath, ['-e', script, wsUrl, url], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 4,
    windowsHide: true,
  });
  return JSON.parse(stdout || '{}');
}

async function writeXhsCookieToExcel(cookieString) {
  const script = [
    'import openpyxl, sys',
    'path=sys.argv[1]',
    'cookies=sys.argv[2]',
    'wb=openpyxl.load_workbook(path)',
    "ws=wb['xhs'] if 'xhs' in wb.sheetnames else wb.create_sheet('xhs')",
    "if ws.max_row < 1:",
    "    ws.append(['id','account_name','cookies','platform_name','status'])",
    'ws.cell(2,1).value=1',
    "ws.cell(2,2).value='cdp_xhs_account'",
    'ws.cell(2,3).value=cookies',
    "ws.cell(2,4).value='xhs'",
    "ws.cell(2,5).value='normal'",
    'wb.save(path)',
  ].join('\n');
  await execFileAsync(mediaCrawlerPythonExe, ['-c', script, 'config/accounts_cookies.xlsx', cookieString], {
    cwd: mediaCrawlerPythonDir,
    env: mediaCrawlerPythonEnv(),
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 4,
    windowsHide: true,
  });
}

async function mediaCrawlerPreflight(platform) {
  if (!existsSync(join(mediaCrawlerPythonDir, 'main.py'))) {
    return { ready: false, message: `MediaCrawlerPro-Python 未找到：${mediaCrawlerPythonDir}` };
  }
  const sign = await fetchJson('http://127.0.0.1:8989/signsrv/pong', 2500).catch(() => null);
  if (!sign?.isok) return { ready: false, message: 'SignSrv 未启动，请先启动 8989 签名服务。' };
  const script = [
    'import openpyxl, sys',
    'wb=openpyxl.load_workbook("config/accounts_cookies.xlsx")',
    'p=sys.argv[1]',
    'ws=wb[p] if p in wb.sheetnames else None',
    'has=bool(ws and any(ws.cell(r,3).value for r in range(2, ws.max_row+1)))',
    'print("OK" if has else "MISSING")',
  ].join('\n');
  const { stdout } = await execFileAsync(mediaCrawlerPythonExe, ['-c', script, platform], {
    cwd: mediaCrawlerPythonDir,
    env: mediaCrawlerPythonEnv(),
    encoding: 'utf8',
    windowsHide: true,
  });
  if (!stdout.includes('OK')) return { ready: false, message: `Excel 账号池缺少 ${platform} Cookie。` };
  return { ready: true, message: 'MediaCrawlerPro 前置检查通过。' };
}

async function runMediaCrawlerXhsSearch(keywords) {
  try {
    const env = mediaCrawlerPythonEnv({
      DB_TYPE: 'sqlite',
      ACCOUNT_POOL_SAVE_TYPE: 'xlsx',
      ENABLE_GET_COMMENTS: 'false',
    });
    const { stdout, stderr } = await execFileAsync(mediaCrawlerPythonExe, [
      'main.py',
      '--platform',
      'xhs',
      '--type',
      'search',
      '--keywords',
      keywords.join(','),
      '--no-enable_comments',
    ], {
      cwd: mediaCrawlerPythonDir,
      env,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 8,
      timeout: 180000,
      windowsHide: true,
    });
    const diagnosis = diagnoseMediaCrawlerOutput(`${stdout}\n${stderr}`);
    return { ok: !diagnosis.blocked, message: diagnosis.message || 'MediaCrawler search finished.', reason: diagnosis.reason, stdout: stdout.slice(-1800), stderr: stderr.slice(-1800) };
  } catch (error) {
    return { ok: false, message: error.message, stdout: error.stdout?.slice(-1200) || '', stderr: error.stderr?.slice(-1200) || '' };
  }
}

async function runMediaCrawlerXhsDetail(noteUrl) {
  try {
    const env = mediaCrawlerPythonEnv({
      DB_TYPE: 'sqlite',
      ACCOUNT_POOL_SAVE_TYPE: 'xlsx',
      ENABLE_GET_COMMENTS: 'true',
    });
    const { stdout, stderr } = await execFileAsync(mediaCrawlerPythonExe, [
      'main.py',
      '--platform',
      'xhs',
      '--type',
      'detail',
      '--urls',
      noteUrl,
    ], {
      cwd: mediaCrawlerPythonDir,
      env,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 8,
      timeout: 180000,
      windowsHide: true,
    });
    const diagnosis = diagnoseMediaCrawlerOutput(`${stdout}\n${stderr}`);
    return { ok: !diagnosis.blocked, message: diagnosis.message || 'MediaCrawler detail finished.', reason: diagnosis.reason, stdout: stdout.slice(-1800), stderr: stderr.slice(-1800) };
  } catch (error) {
    return { ok: false, message: error.message, stdout: error.stdout?.slice(-1200) || '', stderr: error.stderr?.slice(-1200) || '' };
  }
}

async function collectXhsSearchViaCdp(keywords, limit = 20) {
  const keyword = keywords[0] || '';
  if (!keyword) return { ok: false, stage: 'cdp-search', samples: [], message: '缺少 CDP 页面搜索关键词。' };
  let pageWsUrl = '';
  try {
    pageWsUrl = await getCdpPageWebSocketUrl();
  } catch {
    return { ok: false, stage: 'cdp-search', samples: [], message: '没有检测到可用的 CDP Chrome 页面。' };
  }
  if (!pageWsUrl) return { ok: false, stage: 'cdp-search', samples: [], message: '没有可用的 CDP Chrome 页面。' };

  const script = [
    'const wsUrl = process.argv[1];',
    'const keyword = process.argv[2];',
    'const limit = Number(process.argv[3] || 20);',
    'const ws = new WebSocket(wsUrl);',
    'let id = 1;',
    'const pending = new Map();',
    'const searchResponses = [];',
    'function call(method, params = {}) {',
    '  return new Promise((resolve, reject) => {',
    '    const msgId = id++;',
    '    const timer = setTimeout(() => reject(new Error("CDP timeout: " + method)), 25000);',
    '    pending.set(msgId, { resolve, reject, timer });',
    '    ws.send(JSON.stringify({ id: msgId, method, params }));',
    '  });',
    '}',
    'function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }',
    'function compactNumber(value) {',
    '  if (value === undefined || value === null || value === "") return 0;',
    '  if (typeof value === "number") return value;',
    '  const text = String(value);',
    '  const match = text.match(/(\\d+(?:\\.\\d+)?)(万)?/);',
    '  if (!match) return 0;',
    '  return Math.round(Number(match[1]) * (match[2] ? 10000 : 1));',
    '}',
    'function bestImage(imageList) {',
    '  if (!Array.isArray(imageList) || !imageList.length) return "";',
    '  const img = imageList[0] || {};',
    '  return img.url_default || img.url || img.info_list?.[0]?.url || "";',
    '}',
    'function parseSearchBody(body) {',
    '  const parsed = JSON.parse(body || "{}");',
    '  const data = parsed.data || parsed;',
    '  const items = Array.isArray(data.items) ? data.items : [];',
    '  return items.map((item) => {',
    '    const card = item.note_card || item.note || item;',
    '    const noteId = item.id || item.note_id || card.note_id || card.id || "";',
    '    const xsecToken = item.xsec_token || card.xsec_token || "";',
    '    const xsecSource = item.xsec_source || card.xsec_source || "pc_search";',
    '    const interact = card.interact_info || item.interact_info || {};',
    '    const user = card.user || item.user || {};',
    '    const images = Array.isArray(card.image_list) ? card.image_list.map(bestImage).filter(Boolean) : [];',
    '    return {',
    '      noteId, xsecToken, xsecSource,',
    '      title: card.display_title || card.title || card.desc || "",',
    '      content: card.desc || card.display_title || card.title || "",',
    '      author: user.nickname || "",',
    '      cover: images[0] || "", images,',
    '      metrics: {',
    '        likes: compactNumber(interact.liked_count),',
    '        saves: compactNumber(interact.collected_count),',
    '        comments: compactNumber(interact.comment_count),',
    '        shares: compactNumber(interact.shared_count),',
    '        growth: 0',
    '      },',
    '      url: noteId ? `https://www.xiaohongshu.com/explore/${noteId}?xsec_token=${encodeURIComponent(xsecToken)}&xsec_source=${encodeURIComponent(xsecSource)}` : ""',
    '    };',
    '  }).filter((item) => item.noteId && item.title).slice(0, limit);',
    '}',
    'ws.addEventListener("message", async (event) => {',
    '  const data = JSON.parse(String(event.data));',
    '  if (data.id && pending.has(data.id)) {',
    '    const item = pending.get(data.id);',
    '    pending.delete(data.id);',
    '    clearTimeout(item.timer);',
    '    data.error ? item.reject(new Error(data.error.message)) : item.resolve(data.result || {});',
    '    return;',
    '  }',
    '  if (data.method === "Network.responseReceived" && data.params?.response?.url?.includes("/api/sns/web/v1/search/notes")) {',
    '    searchResponses.push({ requestId: data.params.requestId, url: data.params.response.url, status: data.params.response.status });',
    '  }',
    '});',
    'ws.addEventListener("open", async () => {',
    '  try {',
    '    await call("Network.enable", {});',
    '    await call("Page.enable", {});',
    '    await call("Runtime.enable", {});',
    '    const target = "https://www.xiaohongshu.com/search_result/?keyword=" + encodeURIComponent(keyword) + "&type=51";',
    '    await call("Page.navigate", { url: target });',
    '    await sleep(12000);',
    '    let apiItems = [];',
    '    const bodies = [];',
    '    for (const response of searchResponses.slice(-3)) {',
    '      try {',
    '        const body = await call("Network.getResponseBody", { requestId: response.requestId });',
    '        const text = body.base64Encoded ? Buffer.from(body.body, "base64").toString("utf8") : body.body;',
    '        bodies.push({ url: response.url, status: response.status, length: text.length });',
    '        apiItems = parseSearchBody(text);',
    '        if (apiItems.length) break;',
    '      } catch (err) { bodies.push({ url: response.url, status: response.status, error: err.message }); }',
    '    }',
    '    const expression = `(() => {',
    '      const cards = Array.from(document.querySelectorAll("a[href*=\'/explore/\']")).slice(0, ${limit}).map((a) => {',
    '        const box = a.closest("section,div") || a;',
    '        const text = (box.innerText || a.innerText || "").trim();',
    '        const lines = text.split(/\\\\n+/).map((line) => line.trim()).filter(Boolean);',
    '        const img = a.querySelector("img")?.src || box.querySelector("img")?.src || "";',
    '        return { href: a.href, title: lines[0] || (a.getAttribute("title") || "").trim(), author: lines[1] || "", text, image: img };',
    '      }).filter((item) => item.href && item.title);',
    '      return { href: location.href, title: document.title, input: Array.from(document.querySelectorAll("input")).map((i) => i.value).filter(Boolean)[0] || "", cards };',
    '    })()`;',
    '    const out = await call("Runtime.evaluate", { expression, returnByValue: true });',
    '    console.log(JSON.stringify({ ...(out.result?.value || {}), apiItems, bodies }));',
    '    ws.close();',
    '  } catch (err) { console.error(err.stack || err.message); ws.close(); process.exit(1); }',
    '});',
  ].join('\n');

  try {
    const { stdout } = await execFileAsync(process.execPath, ['-e', script, pageWsUrl, keyword, String(limit)], {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 4,
      windowsHide: true,
      timeout: 45000,
    });
    const parsed = JSON.parse(stdout || '{}');
    const apiItems = Array.isArray(parsed.apiItems) ? parsed.apiItems : [];
    const domCards = Array.isArray(parsed.cards) ? parsed.cards : [];
    const pageUrl = String(parsed.href || '');
    const pageInput = String(parsed.input || '');
    const pageMatchesKeyword = pageUrl.includes(encodeURIComponent(keyword)) || pageUrl.includes(keyword) || pageInput.includes(keyword);
    if (!pageMatchesKeyword) {
      return {
        ok: false,
        stage: 'cdp-search',
        samples: [],
        keyword,
        pageTitle: parsed.title || '',
        pageUrl,
        input: pageInput,
        apiResponseCount: Array.isArray(parsed.bodies) ? parsed.bodies.length : 0,
        message: `CDP 页面没有进入当前关键词搜索：${keyword}。系统不会用旧数据冒充新采集。`,
      };
    }
    const samples = apiItems.length
      ? apiItems.map((item, index) => cdpSearchApiItemToSample(item, keyword, index))
      : domCards.map((card, index) => cdpSearchCardToSample(card, keyword, index));
    return {
      ok: samples.length > 0,
      stage: 'cdp-search',
      source: 'cdp-browser-page',
      keyword,
      pageTitle: parsed.title || '',
      pageUrl: parsed.href || '',
      input: parsed.input || '',
      apiResponseCount: Array.isArray(parsed.bodies) ? parsed.bodies.length : 0,
      samples,
      message: samples.length ? `CDP 浏览器采集到 ${samples.length} 条真实搜索结果。` : 'CDP 浏览器页面没有抽取到帖子卡片。',
    };
  } catch (error) {
    return { ok: false, stage: 'cdp-search', samples: [], message: `CDP 浏览器页面采集失败：${error.message}` };
  }
}

async function collectXhsDetailViaCdp(sample) {
  if (!sample?.url) return { ok: false, stage: 'cdp-detail', message: '缺少要深挖的小红书详情 URL。' };
  let pageWsUrl = '';
  try {
    pageWsUrl = await getCdpPageWebSocketUrl();
  } catch {
    return { ok: false, stage: 'cdp-detail', message: '没有检测到可用的 CDP Chrome 页面。' };
  }
  const payload = Buffer.from(JSON.stringify({
    id: sample.id,
    keyword: sample.keyword,
    title: sample.title,
    url: sample.url,
    author: sample.author,
    metrics: sample.metrics,
    cover: sample.cover,
    images: sample.images,
  }), 'utf8').toString('base64');

  const script = [
    'const wsUrl = process.argv[1];',
    'const target = JSON.parse(Buffer.from(process.argv[2], "base64").toString("utf8"));',
    'const ws = new WebSocket(wsUrl);',
    'let id = 1;',
    'const pending = new Map();',
    'const responses = [];',
    'const imageUrls = [];',
    'function call(method, params = {}) {',
    '  return new Promise((resolve, reject) => {',
    '    const msgId = id++;',
    '    const timer = setTimeout(() => reject(new Error("CDP timeout: " + method)), 25000);',
    '    pending.set(msgId, { resolve, reject, timer });',
    '    ws.send(JSON.stringify({ id: msgId, method, params }));',
    '  });',
    '}',
    'function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }',
    'function compactNumber(value) {',
    '  if (value === undefined || value === null || value === "") return 0;',
    '  if (typeof value === "number") return value;',
    '  const text = String(value);',
    '  const match = text.match(/(\\d+(?:\\.\\d+)?)(万)?/);',
    '  if (!match) return 0;',
    '  return Math.round(Number(match[1]) * (match[2] ? 10000 : 1));',
    '}',
    'function bestImage(imageList) {',
    '  if (!Array.isArray(imageList)) return [];',
    '  return imageList.map((img) => img?.url_default || img?.urlDefault || img?.url || img?.info_list?.[0]?.url || img?.infoList?.[0]?.url || "").filter(Boolean);',
    '}',
    'function extractNoteFromFeedBody(body) {',
    '  try {',
    '    const parsed = JSON.parse(body || "{}");',
    '    const items = parsed.data?.items || parsed.items || [];',
    '    const card = items[0]?.note_card || items[0]?.noteCard || null;',
    '    if (!card) return null;',
    '    const interact = card.interact_info || card.interactInfo || {};',
    '    const user = card.user || {};',
    '    const images = bestImage(card.image_list || card.imageList || []);',
    '    return {',
    '      title: card.title || card.display_title || card.displayTitle || "",',
    '      desc: card.desc || "",',
    '      author: user.nickname || "",',
    '      images,',
    '      metrics: { likes: compactNumber(interact.liked_count || interact.likedCount), saves: compactNumber(interact.collected_count || interact.collectedCount), comments: compactNumber(interact.comment_count || interact.commentCount), shares: compactNumber(interact.share_count || interact.shareCount || interact.shared_count), growth: 0 }',
    '    };',
    '  } catch { return null; }',
    '}',
    'function collectCommentTexts(node, out = []) {',
    '  if (!node || typeof node !== "object") return out;',
    '  if (Array.isArray(node)) { for (const item of node) collectCommentTexts(item, out); return out; }',
    '  if (typeof node.content === "string" && node.content.trim()) {',
    '    out.push({ content: node.content.trim(), likeCount: compactNumber(node.like_count), nickname: node.user_info?.nickname || node.nickname || "" });',
    '  }',
    '  for (const key of ["comments", "sub_comments", "subComments"]) collectCommentTexts(node[key], out);',
    '  return out;',
    '}',
    'function extractCommentsFromBody(body) {',
    '  try {',
    '    const parsed = JSON.parse(body || "{}");',
    '    return collectCommentTexts(parsed.data || parsed).filter((item) => item.content).slice(0, 80);',
    '  } catch { return []; }',
    '}',
    'ws.addEventListener("message", (event) => {',
    '  const data = JSON.parse(String(event.data));',
    '  if (data.id && pending.has(data.id)) {',
    '    const item = pending.get(data.id);',
    '    pending.delete(data.id);',
    '    clearTimeout(item.timer);',
    '    data.error ? item.reject(new Error(data.error.message)) : item.resolve(data.result || {});',
    '    return;',
    '  }',
    '  const url = data.params?.response?.url || "";',
    '  if (data.method === "Network.responseReceived") {',
    '    if (/sns-webpic|sns-img|notes_pre_post/.test(url) && !/\\.js(\\?|$)|avatar|fe-static/.test(url)) imageUrls.push(url);',
    '    if (/\\/api\\/sns\\/web\\/v2\\/comment\\/(page|sub\\/page)|\\/api\\/sns\\/web\\/v1\\/feed/.test(url)) {',
    '      responses.push({ requestId: data.params.requestId, url, status: data.params.response.status });',
    '    }',
    '  }',
    '});',
    'ws.addEventListener("open", async () => {',
    '  try {',
    '    await call("Network.enable", {});',
    '    await call("Page.enable", {});',
    '    await call("Runtime.enable", {});',
    '    await call("Page.navigate", { url: target.url });',
    '    await sleep(9000);',
    '    await call("Runtime.evaluate", { expression: "window.scrollTo(0, Math.min(document.body.scrollHeight, 1800))" });',
    '    for (let i = 0; i < 12; i++) {',
    '      const ready = await call("Runtime.evaluate", { expression: "(function(){var el=document.querySelector(\'#detail-desc, .note-text\'); return el ? String(el.innerText || el.textContent || \'\').trim().length : 0;})()", returnByValue: true });',
    '      if (Number((ready.result && ready.result.value) || 0) > 30) break;',
    '      await sleep(1500);',
    '    }',
    '    const expression = `(function () {',
    '      var primaryDesc = "";',
    '      var primaryNode = document.querySelector("#detail-desc") || document.querySelector(".note-content .note-text") || document.querySelector(".note-text");',
    '      if (primaryNode) primaryDesc = String(primaryNode.innerText || primaryNode.textContent || "").trim();',
    '      var bodyCandidates = ["#detail-desc", ".note-text", ".note-content", ".note-scroller", ".interaction-container"].map(function (selector) {',
    '        var el = document.querySelector(selector);',
    '        return el ? String(el.innerText || el.textContent || "").trim() : "";',
    '      }).filter(function (text) { return text.length > 0; }).sort(function (a, b) { return b.length - a.length; });',
    '      var titleNode = document.querySelector("#detail-title");',
    '      var title = titleNode ? String(titleNode.innerText || titleNode.textContent || "").trim() : target.title;',
    '      var images = Array.prototype.slice.call(document.images).map(function (img) { return { src: img.currentSrc || img.src || "", size: (img.naturalWidth || 0) * (img.naturalHeight || 0) }; })',
    '        .filter(function (img) { return /sns-webpic|sns-img|notes_pre_post/.test(img.src) && img.src.indexOf("avatar") < 0 && img.src.indexOf(".js") < 0 && img.src.indexOf("fe-static") < 0; })',
    '        .sort(function (a, b) { return b.size - a.size; })',
    '        .map(function (img) { return img.src; });',
    '      return { href: location.href, pageTitle: document.title, title: title, desc: primaryDesc.length > 30 ? primaryDesc : (bodyCandidates[0] || ""), bodyText: document.body.innerText.slice(0, 5000), bodyCandidateLengths: bodyCandidates.map(function (text) { return text.length; }).slice(0, 5), author: "", images: Array.from(new Set(images)).slice(0, 30), metrics: { likes: 0, saves: 0, comments: 0, shares: 0, growth: 0 } };',
    '    })()`;',
    '    const dom = await call("Runtime.evaluate", { expression, returnByValue: true });',
    '    const domValue = dom.result?.value || {};',
    '    const domError = dom.exceptionDetails ? (dom.exceptionDetails.exception?.description || dom.exceptionDetails.text || JSON.stringify(dom.exceptionDetails)) : "";',
    '    const comments = [];',
    '    let apiNote = null;',
    '    const bodies = [];',
    '    for (const response of responses.slice(-20)) {',
    '      try {',
    '        const body = await call("Network.getResponseBody", { requestId: response.requestId });',
    '        const text = body.base64Encoded ? Buffer.from(body.body, "base64").toString("utf8") : body.body;',
    '        bodies.push({ url: response.url, status: response.status, length: text.length });',
    '        if (response.url.includes("/api/sns/web/v1/feed")) apiNote = extractNoteFromFeedBody(text) || apiNote;',
    '        if (response.url.includes("/comment/")) comments.push(...extractCommentsFromBody(text));',
    '      } catch (err) { bodies.push({ url: response.url, status: response.status, error: err.message }); }',
    '    }',
    '    console.log(JSON.stringify({ target, dom: domValue, domError, apiNote, comments, imageUrls: Array.from(new Set(imageUrls)).slice(0, 30), bodies }));',
    '    ws.close();',
    '  } catch (err) { console.error(err.stack || err.message); ws.close(); process.exit(1); }',
    '});',
  ].join('\n');

  try {
    const { stdout } = await execFileAsync(process.execPath, ['-e', script, pageWsUrl, payload], {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 8,
      windowsHide: true,
      timeout: 50000,
    });
    const parsed = JSON.parse(stdout || '{}');
    const dom = parsed.dom || {};
    const apiNote = parsed.apiNote || {};
    const commentTexts = [...new Map((parsed.comments || [])
      .map((item) => String(item.content || '').trim())
      .filter(Boolean)
      .map((text) => [text, text])).values()].slice(0, 80);
    const extractedContent = extractXhsBodyTextFromPage(dom.bodyText || '', sample.title);
    const content = pickBestXhsContent([apiNote.desc, dom.desc, extractedContent, sample.content], sample.title);
    const images = Array.from(new Set([
      ...(Array.isArray(apiNote.images) ? apiNote.images : []),
      ...(Array.isArray(dom.images) ? dom.images : []),
      ...(Array.isArray(parsed.imageUrls) ? parsed.imageUrls : []),
      ...(sample.images || []),
    ].filter(Boolean))).slice(0, 30);
    const detailSample = normalizeContentSample({
      ...sample,
      sourceTool: 'xhs-cdp-detail',
      collectionStatus: 'real',
      title: String(apiNote.title || dom.title || sample.title || '').trim(),
      content: content || sample.content || '',
      author: apiNote.author || dom.author || sample.author || '',
      comments: commentTexts,
      metrics: mergeMetrics(sample.metrics, apiNote.metrics || dom.metrics),
      url: dom.href || sample.url,
      cover: images[0] || sample.cover || '',
      images,
    });
    return {
      ok: Boolean(detailSample.content || detailSample.comments.length || detailSample.images.length),
      stage: 'cdp-detail',
      sample: detailSample,
      commentCount: detailSample.comments.length,
      imageCount: detailSample.images.length,
      bodyLength: detailSample.content.length,
      domDescLength: String(dom.desc || '').length,
      extractedLength: String(extractedContent || '').length,
      bodyCandidateLengths: Array.isArray(dom.bodyCandidateLengths) ? dom.bodyCandidateLengths : [],
      domError: parsed.domError || '',
      networkResponses: parsed.bodies || [],
      message: `CDP 深挖完成：正文 ${detailSample.content.length} 字，图片 ${detailSample.images.length} 张，评论 ${detailSample.comments.length} 条。`,
    };
  } catch (error) {
    return { ok: false, stage: 'cdp-detail', message: `CDP 详情深挖失败：${error.message}` };
  }
}

function mergeMetrics(primary = {}, secondary = {}) {
  const a = normalizeMetrics(primary);
  const b = normalizeMetrics(secondary);
  return {
    likes: b.likes || a.likes,
    saves: b.saves || a.saves,
    comments: b.comments || a.comments,
    shares: b.shares || a.shares,
    growth: b.growth || a.growth,
  };
}

function pickBestXhsContent(candidates = [], title = '') {
  const titleText = String(title || '').trim();
  const valid = candidates
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .filter((item) => {
      if (!titleText) return item.length >= 20;
      const withoutTitle = item.replace(titleText, '').trim();
      return withoutTitle.length >= 20 || item.length >= Math.max(60, titleText.length + 20);
    });
  if (!valid.length) return String(candidates.find(Boolean) || '').trim();
  return valid.sort((a, b) => b.length - a.length)[0].slice(0, 3000);
}

function extractXhsBodyTextFromPage(bodyText = '', title = '') {
  const lines = String(bodyText || '').split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return '';
  const titleText = String(title || '').trim();
  const titleIndex = lines.findIndex((line) => titleText && (line === titleText || line.includes(titleText) || titleText.includes(line)));
  const start = titleIndex >= 0 ? titleIndex + 1 : 0;
  const picked = [];
  const blockedExact = new Set(['创作中心', '业务合作', '发现', 'RED', '直播', '发布', '通知', '我', '更多', '关于我们', '关注', '赞', '回复', '发送', '取消', '活动', '评论']);
  for (const line of lines.slice(start)) {
    if (/猜你想搜|共\s*\d+\s*条评论|- THE END -|^评论$|鼠标悬停查看/.test(line)) break;
    if (blockedExact.has(line)) continue;
    if (/ICP备|营业执照|公网安备|增值电信|互联网药品|举报|行吟信息科技|© 2014|地址：|电话：/.test(line)) continue;
    if (/^\d+\/\d+$/.test(line)) continue;
    picked.push(line);
    if (picked.join('\n').length > 2500) break;
  }
  const text = picked.join('\n').trim();
  return text.length > titleText.length ? text.slice(0, 3000) : '';
}

function extractLikelyXhsBodyText(bodyText = '', title = '') {
  const lines = String(bodyText || '').split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return '';
  const start = lines.findIndex((line) => title && (line.includes(title) || title.includes(line)));
  const from = start >= 0 ? start : 0;
  const picked = [];
  const blockedExact = /^(创作中心|业务合作|发现|RED|直播|发布|通知|我|更多|关于我们|关注|赞|回复|发送|取消|活动)$/;
  const stop = /猜你想搜|共\s*\d+\s*条评论|- THE END -|^评论$|鼠标悬停查看/;
  for (const line of lines.slice(from)) {
    if (stop.test(line)) break;
    if (blockedExact.test(line)) continue;
    if (/沪ICP备|营业执照|公网安备|增值电信|互联网药品|举报|行吟信息科技|© 2014|地址：|电话：/.test(line)) continue;
    picked.push(line);
    if (picked.join('\n').length > 2500) break;
  }
  const text = picked.join('\n').trim();
  return text.length > String(title || '').length ? text.slice(0, 3000) : '';
}

function cdpSearchApiItemToSample(item, keyword, index) {
  const noteId = item.noteId || extractXhsNoteId(item.url) || index;
  return normalizeContentSample({
    platform: 'xiaohongshu',
    sourceTool: 'xhs-cdp-search-api',
    collectionStatus: 'real',
    id: `cdp-xhs-${noteId}`,
    keyword,
    title: item.title || '',
    content: item.content || item.title || '',
    author: item.author || '',
    comments: [],
    metrics: normalizeMetrics(item.metrics || {}),
    url: item.url || '',
    cover: item.cover || '',
    images: Array.isArray(item.images) ? item.images : [],
  });
}

function cdpSearchCardToSample(card, keyword, index) {
  const text = String(card.text || '');
  return normalizeContentSample({
    platform: 'xiaohongshu',
    sourceTool: 'xhs-cdp-page',
    collectionStatus: 'real',
    id: `cdp-xhs-${extractXhsNoteId(card.href) || index}`,
    keyword,
    title: card.title || text.split(/\n/).find(Boolean) || '',
    content: text,
    author: card.author || '',
    comments: [],
    metrics: parseMetricText(text),
    url: card.href || '',
    cover: card.image || '',
    images: card.image ? [card.image] : [],
  });
}

function parseMetricText(text = '') {
  const lines = String(text).split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const metricLine = [...lines].reverse().find((line) => !/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(line) && !/^\d+天前$/.test(line)) || '';
  const number = parseCompactNumber(metricLine);
  return { likes: number, saves: 0, comments: 0, shares: 0, growth: 0 };
}

function parseCompactNumber(value = '') {
  const match = String(value).match(/(\d+(?:\.\d+)?)(万)?/);
  if (!match) return 0;
  const base = Number(match[1]);
  return Math.round(base * (match[2] ? 10000 : 1));
}

function diagnoseMediaCrawlerOutput(output = '') {
  const text = stripAnsi(String(output || ''));
  if (/没有权限访问|code['"]?:\s*-104|code["']?:\s*-104/.test(text)) {
    return { blocked: true, reason: 'xhs_account_no_search_permission', message: '小红书返回 -104：当前登录账号没有权限访问搜索接口。' };
  }
  if (/验证码|status code 461|Response \[461/.test(text)) {
    return { blocked: true, reason: 'xhs_verify_required', message: '小红书返回验证码风控 461，MediaCrawler API 当前不可用。' };
  }
  if (/账号池中没有可用的账号|没有可用的账号/.test(text)) {
    return { blocked: true, reason: 'xhs_account_pool_empty', message: 'MediaCrawler 账号池没有可用账号。' };
  }
  if (/Login state result:\s*False|登录状态.*False/i.test(text)) {
    return { blocked: true, reason: 'xhs_cookie_invalid', message: '小红书 Cookie 已失效或未登录成功。' };
  }
  return { blocked: false, reason: '' };
}

function stripAnsi(value = '') {
  return String(value).replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '');
}

function extractXhsNoteId(url) {
  const match = String(url || '').match(/\/explore\/([a-zA-Z0-9]+)/);
  return match ? match[1] : '';
}

async function fetchJson(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function importMediaCrawlerSqlite(dbFile, limit, queryWords = []) {
  if (!existsSync(dbFile)) {
    return { samples: [], message: `未找到 MediaCrawlerPro SQLite：${dbFile}` };
  }
  const py = [
    'import json, sqlite3, sys',
    'db_path=sys.argv[1]',
    'limit=int(sys.argv[2])',
    'query_words=[w for w in sys.argv[3:] if w]',
    'conn=sqlite3.connect(db_path)',
    'conn.row_factory=sqlite3.Row',
    'cur=conn.cursor()',
    "tables={row['name'] for row in cur.execute(\"select name from sqlite_master where type='table'\")}",
    "if 'xhs_note' not in tables:",
    "    print(json.dumps({'samples': [], 'message': 'SQLite 中没有 xhs_note 表，请先运行小红书采集。'}, ensure_ascii=False)); sys.exit(0)",
    "comment_sql=\"select content from xhs_note_comment where note_id=? order by like_count desc, create_time desc limit 8\" if 'xhs_note_comment' in tables else None",
    "base_sql='''select note_id,title,desc,type,video_url,time,liked_count,collected_count,comment_count,share_count,image_list,tag_list,note_url,source_keyword,user_id,nickname from xhs_note'''",
    "if query_words:",
    "    clauses=[]; params=[]",
    "    for w in query_words:",
    "        clauses.append('(source_keyword like ? or title like ? or desc like ? or tag_list like ?)')",
    "        params.extend(['%'+w+'%']*4)",
    "    rows=cur.execute(base_sql+' where '+(' or '.join(clauses))+' order by time desc limit ?', params+[limit]).fetchall()",
    "else:",
    "    rows=cur.execute(base_sql+' order by time desc limit ?',(limit,)).fetchall()",
    'samples=[]',
    'for row in rows:',
    '    comments=[]',
    '    if comment_sql:',
    '        comments=[r[0] for r in cur.execute(comment_sql,(row["note_id"],)).fetchall() if r[0]]',
    '    def parse_list(value):',
    '        if not value: return []',
    '        try:',
    '            parsed=json.loads(value)',
    '            return parsed if isinstance(parsed, list) else [parsed]',
    '        except Exception:',
    '            return [item.strip() for item in str(value).replace("，", ",").split(",") if item.strip()]',
    '    samples.append({',
    '        "platform":"xiaohongshu",',
    '        "sourceTool":"mediacrawler-pro",',
    '        "collectionStatus":"real",',
    '        "id":"mcp-xhs-"+str(row["note_id"]),',
    '        "keyword":row["source_keyword"] or "",',
    '        "title":row["title"] or "",',
    '        "content":row["desc"] or "",',
    '        "tags":parse_list(row["tag_list"]),',
    '        "author":row["nickname"] or row["user_id"] or "",',
    '        "publishedAt":str(row["time"] or ""),',
    '        "metrics":{"likes":row["liked_count"] or 0,"saves":row["collected_count"] or 0,"comments":row["comment_count"] or 0,"shares":row["share_count"] or 0,"growth":0},',
    '        "comments":comments,',
    '        "url":row["note_url"] or "",',
    '        "cover":"",',
    '        "images":parse_list(row["image_list"]),',
    '    })',
    "print(json.dumps({'samples': samples}, ensure_ascii=False))",
  ].join('\n');
  try {
    const { stdout } = await execFileAsync(mediaCrawlerPythonExe, ['-c', py, dbFile, String(limit), ...queryWords], {
      encoding: 'utf8',
      env: mediaCrawlerPythonEnv(),
      maxBuffer: 1024 * 1024 * 8,
      windowsHide: true,
    });
    const parsed = JSON.parse(stdout || '{}');
    return {
      samples: normalizeContentSamplePayload({ samples: parsed.samples || [] }).map((sample) => ({
        ...sample,
        sourceTool: 'mediacrawler-pro',
        collectionStatus: 'real',
      })),
      message: parsed.message || '',
    };
  } catch (error) {
    return { samples: [], message: `读取 MediaCrawlerPro SQLite 失败：${error.message}` };
  }
}

function normalizeContentSample(row = {}) {
  const metrics = normalizeMetrics({
    likes: row.likes ?? row.metrics?.likes,
    comments: row.commentsCount ?? row.metrics?.comments ?? row.metrics?.comment,
    saves: row.collects ?? row.saves ?? row.metrics?.collects ?? row.metrics?.saves,
    shares: row.shares ?? row.metrics?.shares,
    growth: row.growth ?? row.metrics?.growth,
  });
  const comments = Array.isArray(row.comments)
    ? row.comments.map((item) => String(item).trim()).filter(Boolean)
    : String(row.commentsText || '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  const title = String(row.title || '').trim();
  const content = String(row.content || row.text || '').trim();
  const sample = {
    id: row.id || randomUUID(),
    platform: String(row.platform || 'xiaohongshu'),
    keyword: String(row.keyword || ''),
    title,
    content,
    tags: Array.isArray(row.tags) ? row.tags : String(row.tags || '').split(/[,\s#，]+/).map((item) => item.trim()).filter(Boolean),
    author: String(row.author || ''),
    publishedAt: row.publishedAt || '',
    metrics,
    comments,
    url: String(row.url || ''),
    cover: String(row.cover || ''),
    images: Array.isArray(row.images) ? row.images : [],
    sourceTool: String(row.sourceTool || 'manual-import'),
    collectionStatus: String(row.collectionStatus || 'manual'),
    failureReason: String(row.failureReason || ''),
    collectedAt: row.collectedAt || new Date().toISOString(),
  };
  return {
    ...sample,
    sourceJudgement: judgeContentSource(sample),
  };
}

function contentSampleToMaterial(sample) {
  const text = [sample.title, sample.content, sample.comments.slice(0, 3).join(' / ')].filter(Boolean).join('。');
  return {
    id: randomUUID(),
    source: `${sample.platform}/${sample.sourceTool}`,
    text: text || sample.url || '手动导入内容样本',
    pain: inferPain(`${sample.title} ${sample.content} ${sample.comments.join(' ')}`),
    metrics: sample.metrics,
    contentSampleId: sample.id,
    collectionStatus: sample.collectionStatus,
    sourceTool: sample.sourceTool,
    createdAt: new Date().toISOString(),
  };
}

function sampleEngagementScore(sample = {}) {
  const metrics = normalizeMetrics(sample.metrics);
  return Number(metrics.likes || 0)
    + Number(metrics.saves || 0) * 2.4
    + Number(metrics.comments || 0) * 3
    + Number(metrics.shares || 0) * 2.2;
}

function selectCommentDeepDiveTargets(samples = [], limit = 5) {
  const max = Math.min(Math.max(Number(limit || 5), 1), 10);
  return [...samples]
    .filter((sample) => sample?.url)
    .sort((a, b) => {
      const aNeedsComments = Array.isArray(a.comments) && a.comments.length ? 0 : 500;
      const bNeedsComments = Array.isArray(b.comments) && b.comments.length ? 0 : 500;
      return (sampleEngagementScore(b) + bNeedsComments) - (sampleEngagementScore(a) + aNeedsComments);
    })
    .slice(0, max);
}

function mergeContentSamples(...groups) {
  const map = new Map();
  for (const sample of groups.flat()) {
    if (!sample) continue;
    const key = sample.url || sample.id || `${sample.sourceTool}:${sample.title}:${sample.publishedAt}`;
    const old = map.get(key);
    if (!old) {
      map.set(key, sample);
      continue;
    }
    map.set(key, mergeContentSamplePair(old, sample));
  }
  return [...map.values()].sort((a, b) => sampleEngagementScore(b) - sampleEngagementScore(a));
}

function mergeContentSamplePair(oldSample = {}, nextSample = {}) {
  const oldComments = Array.isArray(oldSample.comments) ? oldSample.comments : [];
  const nextComments = Array.isArray(nextSample.comments) ? nextSample.comments : [];
  const oldImages = Array.isArray(oldSample.images) ? oldSample.images : [];
  const nextImages = Array.isArray(nextSample.images) ? nextSample.images : [];
  const oldContent = String(oldSample.content || '');
  const nextContent = String(nextSample.content || '');
  return {
    ...oldSample,
    ...nextSample,
    content: nextContent.length >= oldContent.length ? nextContent : oldContent,
    comments: nextComments.length >= oldComments.length ? nextComments : oldComments,
    images: nextImages.length >= oldImages.length ? nextImages : oldImages,
    cover: nextSample.cover || oldSample.cover || '',
    metrics: mergeMetrics(oldSample.metrics, nextSample.metrics),
  };
}

function looksLikeCustomerQuestion(text = '') {
  const value = String(text || '').trim();
  if (value.length < 4) return false;
  return /[?？]|吗|么|怎么|咋|哪里|多少|几次|多久|适合|可以|能不能|会不会|是不是|有没有|求|怕|担心|纠结|不知道|不敢|踩坑|后悔/.test(value);
}

function inferQuestionIntent(text = '') {
  if (/多少|价格|收费|贵|便宜/.test(text)) return 'price';
  if (/适合|能不能|可以|是不是|类型|哪种/.test(text)) return 'fit-judgement';
  if (/怎么|哪里|入口|链接|流程|步骤/.test(text)) return 'next-step';
  if (/怕|担心|不敢|后悔|踩坑|副作用|反黑|没效果/.test(text)) return 'risk-concern';
  return 'content-topic';
}

function buildQuestionBankFromSamples(samples = [], { industry = '', keywords = [] } = {}) {
  const questions = [];
  for (const sample of samples) {
    const comments = Array.isArray(sample.comments) ? sample.comments : [];
    for (const comment of comments) {
      const text = String(comment || '').trim();
      if (!looksLikeCustomerQuestion(text)) continue;
      questions.push({
        id: randomUUID(),
        scope: 'public-platform',
        projectId: 'ai-native-content-workflow',
        owner: 'platform-user',
        keyword: sample.keyword || keywords.join(' / '),
        industry,
        question: text.length > 80 ? text.slice(0, 80) : text,
        userPain: inferPain(`${sample.title || ''} ${sample.content || ''} ${text}`),
        intent: inferQuestionIntent(text),
        contentAngle: 'Turn this real comment into a topic candidate, not just supporting evidence.',
        recommendedFormats: ['小红书图文', '短视频口播', '朋友圈文案'],
        score: Math.min(100, Math.round(40 + Math.log10(sampleEngagementScore(sample) + 1) * 12)),
        evidence: {
          sourcePlatform: sample.platform || 'xiaohongshu',
          sourceTitle: sample.title || '',
          sourceUrl: sample.url || '',
          metrics: sample.metrics || {},
          matchedText: text,
        },
        createdAt: new Date().toISOString(),
      });
    }
  }
  const unique = [...new Map(questions.map((item) => [`${item.sourceUrl}:${item.question}`, item])).values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 80);
  return {
    id: `comment-question-bank-${Date.now()}`,
    scope: 'public-platform',
    projectId: 'ai-native-content-workflow',
    owner: 'platform-users',
    keyword: keywords.join(' / '),
    industry,
    source: 'mediacrawler-pro/xhs-comments',
    sampleCount: samples.length,
    generatedAt: new Date().toISOString(),
    questions: unique,
    answers: [],
  };
}

function buildXhsWorkflow(db) {
  const samples = (Array.isArray(db.contentSamples) ? db.contentSamples : []).filter((item) => item.platform === 'xiaohongshu');
  const source = samples.length ? samples : (db.rawMaterials || []).map((item) => ({
    title: item.text,
    content: item.text,
    comments: [],
    metrics: normalizeMetrics(item.metrics),
    sourceTool: item.source || 'raw-material',
    collectionStatus: item.collectionStatus || 'seed',
  }));
  const rankedAll = source.map(analyzeContentSample).sort(compareTopicCandidates);
  const ranked = diversifyTopicCandidates(rankedAll, 12);
  const candidates = ranked.slice(0, 10).map((item) => ({
    id: randomUUID(),
    title: item.topic,
    source: item.source,
    score: item.score,
    formula: item.formula,
    platform: '小红书 / 视频号 / 朋友圈',
    angle: item.angle,
    hook: item.hook,
    coverPattern: item.coverPattern,
    commentPains: item.commentPains,
    replicationPlan: item.replicationPlan,
    publishTiming: item.publishTiming,
    riskNotes: item.riskNotes,
    sourceJudgement: item.sourceJudgement,
    topicValidation: item.topicValidation,
    optionGroup: item.optionGroup,
    material: item.evidence,
    signals: item.signals,
    createdAt: new Date().toISOString(),
  }));
  const tasks = candidates.slice(0, 4).map((candidate) => buildProductionTask(candidate));
  const assets = candidates.slice(0, 4).map((candidate) => buildXhsPublishAsset(candidate));
  return { samples: ranked, candidates, tasks, assets };
}

function analyzeContentSample(sample) {
  const text = `${sample.title || ''} ${sample.content || ''} ${(sample.comments || []).join(' ')}`;
  const metrics = normalizeMetrics(sample.metrics);
  const sourceJudgement = sample.sourceJudgement || judgeContentSource(sample);
  const topicValidation = validateTopicSample(sample, sourceJudgement);
  const engagement = metrics.likes + metrics.comments * 2 + metrics.saves * 2.4 + metrics.shares * 2.2;
  const score = Math.min(96, Math.round(18 + Math.log10(engagement + 1) * 7 + topicValidation.score * 0.46 + sourceJudgement.score * 0.16 + topicValidation.relevance * 0.26));
  const pain = topicValidation.pain;
  const hook = inferHook(text, pain);
  const comments = Array.isArray(sample.comments) ? sample.comments : [];
  const formula = inferFormula(text);
  const topic = normalizeTopicTitle(sample.title, pain);
  const commentPains = inferCommentPains(comments, pain);
  const coverPattern = inferCoverPattern(text, pain);
  const replicationPlan = buildReplicationPlan({ pain, formula, hook, coverPattern, sample });
  const publishTiming = metrics.growth >= 50 || metrics.comments >= 80 ? '今天优先发，趁讨论热度还在' : '可进入本周内容池，配合真实案例再发';
  const riskNotes = buildRiskNotes(sample, text);
  return {
    source: sample.sourceTool || sample.source || 'content-sample',
    topic,
    score,
    formula,
    hook,
    pain,
    angle: `围绕「${pain}」，先展示真实问题，再给出小程序/工具的解决过程，最后引导用户试一次。`,
    coverPattern,
    commentPains,
    replicationPlan,
    publishTiming,
    riskNotes,
    sourceJudgement,
    topicValidation,
    evidence: [sample.title, sample.content, ...(sample.comments || []).slice(0, 3)].filter(Boolean),
    signals: [{
      source: sample.sourceTool || sample.source || 'content-sample',
      text: sample.title || sample.content || '',
      metrics,
      pain,
      performanceScore: score,
      sourceLayer: sourceJudgement.layer,
      validation: topicValidation.label,
    }],
  };
}

function compareTopicCandidates(a, b) {
  const ar = a.topicValidation?.relevance || 0;
  const br = b.topicValidation?.relevance || 0;
  const av = a.topicValidation?.score || 0;
  const bv = b.topicValidation?.score || 0;
  const as = a.score || 0;
  const bs = b.score || 0;
  const aTier = ar >= 78 ? 3 : ar >= 60 ? 2 : ar >= 42 ? 1 : 0;
  const bTier = br >= 78 ? 3 : br >= 60 ? 2 : br >= 42 ? 1 : 0;
  if (aTier !== bTier) return bTier - aTier;
  if (av !== bv) return bv - av;
  return bs - as;
}

function diversifyTopicCandidates(items, limit) {
  const buckets = [
    { name: '色彩/AI测试', match: (item) => /色彩|肤色|冷暖|四季|配色|诊断|测试|GPT|AI|报告|prompt/.test(item.evidence.join(' ')) },
    { name: '形象改造/反差', match: (item) => /形象|改造|爆改|变美|变帅|素人|反差|前后|同一个人/.test(item.evidence.join(' ')) },
    { name: '发型/脸型', match: (item) => /发型|刘海|锁骨发|圆脸|方圆脸|脸型|高颅顶/.test(item.evidence.join(' ')) },
    { name: '穿搭/风格', match: (item) => /穿搭|搭配|显瘦|显高|氛围感|通勤|风格/.test(item.evidence.join(' ')) },
    { name: '真实测评/避坑', match: (item) => /真实测评|原相机|素颜|回归现实|避坑|翻车/.test(item.evidence.join(' ')) },
  ];
  const picked = [];
  const used = new Set();
  for (const bucket of buckets) {
    for (const item of items) {
      const key = item.topic;
      if (!used.has(key) && bucket.match(item)) {
        picked.push({ ...item, optionGroup: bucket.name });
        used.add(key);
        break;
      }
    }
  }
  for (const item of items) {
    if (picked.length >= limit) break;
    const key = item.topic;
    if (!used.has(key)) {
      picked.push({ ...item, optionGroup: '综合高表现' });
      used.add(key);
    }
  }
  return picked.slice(0, limit);
}

function judgeContentSource(sample) {
  const metrics = normalizeMetrics(sample.metrics);
  const hasCrawler = sample.collectionStatus === 'real' && sample.sourceTool === 'mediacrawler-pro';
  const hasKeyword = Boolean(sample.keyword);
  const hasComments = Array.isArray(sample.comments) && sample.comments.length > 0;
  const hasImages = Array.isArray(sample.images) && sample.images.length > 0;
  const engagement = metrics.likes + metrics.comments * 2 + metrics.saves * 2.4 + metrics.shares * 2.2;
  const score = Math.min(100, Math.round(
    (hasCrawler ? 24 : 6) +
    (hasKeyword ? 12 : 0) +
    (hasComments ? 18 : 0) +
    (hasImages ? 10 : 0) +
    Math.min(36, Math.log10(engagement + 1) * 13)
  ));
  let layer = '关键词搜索';
  if (hasComments) layer = '评论区验证';
  else if (metrics.comments >= 800 || metrics.shares >= 1500 || metrics.saves >= 2500) layer = '高表现样本';
  else if (sample.collectionStatus === 'manual') layer = '手动导入';
  const risks = [];
  if (!hasComments) risks.push('缺评论明细，只能用评论数推断痛点强度');
  if (!hasImages) risks.push('缺视觉素材，不能直接进入视频制作');
  if (!hasKeyword) risks.push('缺来源关键词，无法判断采集意图');
  return {
    layer,
    score,
    evidence: [
      hasCrawler ? '真实爬虫采集' : '非爬虫来源',
      hasKeyword ? `来源关键词：${sample.keyword}` : '无来源关键词',
      `赞${metrics.likes}/藏${metrics.saves}/评${metrics.comments}/转${metrics.shares}`,
    ],
    risks,
  };
}

function validateTopicSample(sample, sourceJudgement) {
  const metrics = normalizeMetrics(sample.metrics);
  const text = `${sample.title || ''} ${sample.content || ''} ${(sample.tags || []).join(' ')}`;
  const relevance = scoreColorProjectRelevance(text);
  const saveMotive = inferSaveMotive(text, metrics);
  const socialMotive = inferSocialMotive(text, metrics);
  const pain = inferPain(text, metrics);
  const conversion = inferConversionPath(text);
  const replicationDifficulty = inferReplicationDifficulty(sample, text);
  const score = Math.min(100, Math.round(
    relevance * 0.28 +
    Math.min(100, Math.log10(metrics.saves + 1) * 24) * 0.18 +
    Math.min(100, Math.log10(metrics.comments + 1) * 24) * 0.16 +
    Math.min(100, Math.log10(metrics.shares + 1) * 24) * 0.14 +
    sourceJudgement.score * 0.14 +
    (100 - replicationDifficulty.score) * 0.10
  ));
  const label = score >= 82 ? '优先复刻' : score >= 68 ? '进入选题池' : score >= 52 ? '观察备用' : '暂不优先';
  return {
    label,
    score,
    relevance,
    pain,
    saveMotive,
    socialMotive,
    conversion,
    replicationDifficulty,
    reason: `相关度${relevance}，收藏动机：${saveMotive}，传播动机：${socialMotive}`,
  };
}

function scoreColorProjectRelevance(text = '') {
  let score = 20;
  const rules = [
    [/色彩|肤色|冷暖|四季|流行色|配色|诊断|测试/, 42],
    [/形象|改造|爆改|变美|变帅|气质|颜值|素人/, 28],
    [/发型|刘海|锁骨发|圆脸|方圆脸|脸型|高颅顶/, 24],
    [/穿搭|搭配|显瘦|显高|氛围感|通勤|风格/, 14],
    [/AI|GPT|小程序|报告|prompt|免费|平替/, 24],
    [/前后|对比|同一个人|翻车|避坑|真实测评/, 18],
  ];
  for (const [pattern, value] of rules) if (pattern.test(text)) score += value;
  return Math.min(100, score);
}

function inferSaveMotive(text, metrics) {
  if (/教程|公式|一篇搞定|手把手|指南|干货|步骤|流程/.test(text)) return '工具性收藏：用户想照着做';
  if (/发型|穿搭|配色|色彩|搭配|显瘦|显脸小/.test(text)) return '审美参考收藏：用户想留作改造模板';
  if (metrics.saves >= metrics.comments * 3 && metrics.saves >= 1000) return '高收藏低讨论：内容像清单/模板，适合做工具入口';
  return '普通兴趣收藏：需要进一步用评论或案例验证';
}

function inferSocialMotive(text, metrics) {
  if (/爆改|反差|前后|同一个人|变帅|变美|逆袭/.test(text)) return '反差传播：适合做前后对比和炫耀分享';
  if (/真实测评|回归现实|素颜|原相机|避坑|翻车/.test(text)) return '真实感传播：适合用“不装”的测评角度';
  if (metrics.shares >= 1500) return '高转发传播：话题有社交讨论价值';
  return '弱传播：更适合做搜索流量或笔记收藏';
}

function inferConversionPath(text) {
  if (/免费|平替|省了|不用花钱|低成本/.test(text)) return '低门槛试看入口：先给免费/低价小结果，再卖完整报告';
  if (/发型|脸型|穿搭|色彩|诊断/.test(text)) return '个人建议入口：上传照片得到自己的方案';
  if (/教程|公式|指南|一篇搞定/.test(text)) return '知识清单入口：先收藏，再引导工具自动生成';
  return '兴趣种草入口：用案例结果吸引用户试一次';
}

function inferReplicationDifficulty(sample, text) {
  const hasImages = Array.isArray(sample.images) && sample.images.length > 0;
  if (/明星|综艺|影视|超模|法拉利/.test(text)) return { label: '高', score: 75, reason: '依赖外部人物或热点素材，复刻风险高' };
  if (/发型|穿搭|色彩|形象|爆改|前后|测评/.test(text) && hasImages) return { label: '中低', score: 35, reason: '可用授权案例图、小程序报告图或录屏复刻结构' };
  if (hasImages) return { label: '中', score: 52, reason: '有视觉素材，但需要重新包装成色彩项目语境' };
  return { label: '高', score: 70, reason: '缺视觉素材，视频化成本高' };
}

function normalizeTopicTitle(title, pain) {
  const clean = String(title || '').trim();
  if (clean) return clean.length > 42 ? clean.slice(0, 42) : clean;
  return `${pain}：把用户真实问题变成可发布内容`;
}

function inferFormula(text) {
  if (text.includes('为什么') || text.includes('怎么')) return '问题钩子';
  if (text.includes('前后') || text.includes('对比') || text.includes('变化')) return '对比结构';
  if (text.includes('避坑') || text.includes('翻车') || text.includes('后悔')) return '避坑结构';
  if (text.includes('流程') || text.includes('步骤') || text.includes('教程')) return '流程演示';
  return '痛点-过程-结果';
}

function inferHook(text, pain) {
  if (text.includes('不像') || text.includes('翻车')) return '这类形象分析最怕的不是不好看，而是不像本人。';
  if (text.includes('发什么') || text.includes('选题')) return '每天发不出来内容，通常不是懒，是没有稳定选题中心。';
  if (text.includes('对比') || text.includes('前后')) return '把改变前后放在一起，用户才会一眼看懂价值。';
  return `很多人都有「${pain}」这个问题，但不知道第一步怎么做。`;
}

function inferCommentPains(comments, fallbackPain) {
  const pains = [];
  for (const comment of comments.slice(0, 12)) {
    const text = String(comment || '');
    if (/贵|多少钱|价格|收费/.test(text)) pains.push('价格敏感，需要先给可见结果');
    else if (/不像|本人|真实|假/.test(text)) pains.push('担心不像本人，需要展示原图到结果的依据');
    else if (/怎么|哪里|入口|小程序|链接/.test(text)) pains.push('想知道怎么体验，需要明确入口');
    else if (/后悔|翻车|踩坑|失败/.test(text)) pains.push('害怕踩坑，需要避坑型内容');
    else if (/适合|发型|穿搭|颜色|风格/.test(text)) pains.push('想要具体建议，不要泛泛讲审美');
  }
  return [...new Set(pains)].slice(0, 4).concat(pains.length ? [] : [fallbackPain]);
}

function inferCoverPattern(text, pain) {
  if (/前后|对比|变化/.test(text)) return '左右对比封面：左边原始困扰，右边结果变化，中间放一句判断';
  if (/不像|翻车|后悔/.test(text)) return '避坑封面：大字写“别这样做”，配一张真实问题截图或案例';
  if (/怎么|为什么/.test(text)) return '问题封面：一句用户问题 + 一个清晰答案方向';
  if (pain.includes('发什么')) return '流程封面：从信息源到发布包的 4 步流程';
  return '结果封面：真实样片/工具界面做主体，标题只写一个明确收益';
}

function buildReplicationPlan({ pain, formula, hook, coverPattern, sample }) {
  const sampleTitle = sample.title ? `参考样本《${sample.title}》` : '参考高表现样本';
  return [
    `${sampleTitle}，保留它的「${formula}」结构，不照抄表达。`,
    `开头先用：${hook}`,
    `正文围绕「${pain}」展示判断过程，必须配截图、样片或操作录屏。`,
    `封面采用：${coverPattern}`,
    '结尾引导用户评论自己的问题，或搜索/进入小程序先拿一个试看结果。',
  ];
}

function buildRiskNotes(sample, text) {
  const notes = [];
  if (!sample.metrics || signalWeight({ metrics: sample.metrics }) === 0) notes.push('缺少真实互动数据，不能判断爆款强度，只能当选题素材。');
  if (!sample.comments || !sample.comments.length) notes.push('缺少评论区，无法验证真实用户痛点。');
  if (/保证|一定|暴富|躺赚|封号/.test(text)) notes.push('文案需要避开夸大承诺和平台敏感表达。');
  if (!sample.cover && (!sample.images || !sample.images.length)) notes.push('缺少封面/配图，生成视频和图文前必须补真实视觉素材。');
  return notes.length ? notes : ['可进入生产，但发布前仍需人工复核事实和合规表达。'];
}

function buildXhsPublishAsset(candidate) {
  const title = candidate.title.length > 28 ? candidate.title.slice(0, 28) : candidate.title;
  const commentPains = Array.isArray(candidate.commentPains) ? candidate.commentPains : [];
  const replicationPlan = Array.isArray(candidate.replicationPlan) ? candidate.replicationPlan : [];
  const riskNotes = Array.isArray(candidate.riskNotes) ? candidate.riskNotes : [];
  const validation = candidate.topicValidation || {};
  const sourceJudgement = candidate.sourceJudgement || {};
  const hook = candidate.hook || '很多人不是不想改变，而是不知道第一步怎么做。';
  const titleOptions = buildXhsTitleOptions(candidate, title);
  const bodyDraft = [
    hook,
    '我最近把这个问题拆成了一个可测试的小流程：先看真实困扰，再看判断依据，最后给一个能立刻体验的小结果。',
    '真正有用的地方不是 AI 说得多漂亮，而是你能不能看到自己的变化、知道下一步怎么选。',
    '如果你也有类似问题，可以先用工具做一次试看，结果满意再继续做完整方案。',
  ];
  const cardPlan = buildXhsCardPlan(candidate, title, commentPains);
  const publishChecklist = [
    '必须配真实样片、操作录屏、前后对比图或评论截图之一。',
    '标题只承诺可感知的小结果，不承诺确定变美、确定成交或确定收益。',
    '正文保留真实判断过程，不写平台敏感词，不做夸大前后对比。',
    '发布后记录点赞、收藏、评论、私信和成交问题，回流到选题素材池。',
  ];
  const momentsCopy = [
    `今天看到一个很典型的问题：${candidate.title}`,
    '很多人不是没有变好的需求，而是缺一个能马上看见小结果的入口。',
    '我把它拆成了一个小工具流程：先试看，再决定要不要继续做完整方案。这个方式比硬卖自然很多。',
  ];
  const commentGuide = commentPains.length
    ? commentPains.map((item) => `你有没有遇到过「${item}」这种情况？`)
    : ['你最想先解决发型、穿搭、色彩，还是整体形象方向？'];
  const videoPackage = buildPromoVideoPackage(candidate, { title, hook, cardPlan, bodyDraft, commentGuide });
  const structured = {
    titleOptions,
    selectedTitle: titleOptions[0]?.text || title,
    sourceSummary: {
      layer: sourceJudgement.layer || '未评级',
      score: sourceJudgement.score || 0,
      validation: validation.label || '等待判断',
      validationScore: validation.score || 0,
      saveMotive: validation.saveMotive || '等待收藏动机判断',
      socialMotive: validation.socialMotive || '等待传播动机判断',
      conversion: validation.conversion || '等待转化入口判断',
    },
    hook,
    coverText: buildCoverText(candidate, title),
    bodyDraft,
    cardPlan,
    momentsCopy,
    commentGuide,
    replicationPlan: replicationPlan.length ? replicationPlan : ['补充真实案例素材后再发布。'],
    publishChecklist,
    riskNotes,
    replayFields: ['发布时间', '点赞数', '收藏数', '评论数', '私信数', '小程序访问数', '付款数', '用户追问'],
  };
  enrichPublishAssetStructured(candidate, structured, { title, hook, cardPlan, bodyDraft, commentGuide, titleOptions, publishChecklist });
  return {
    id: randomUUID(),
    topicId: candidate.id,
    title: `小红书发布包：${title}`,
    type: '小红书图文生产线',
    structured,
    copy: [
      '标题候选：',
      ...structured.titleOptions.map((item, index) => `${index + 1}. ${item.text}（${item.formula}：${item.reason}）`),
      '',
      `选题判断：${candidate.angle}`,
      `来源判断：${structured.sourceSummary.layer} / ${structured.sourceSummary.validation}（${structured.sourceSummary.validationScore}分）`,
      `收藏动机：${structured.sourceSummary.saveMotive}`,
      `传播动机：${structured.sourceSummary.socialMotive}`,
      `转化入口：${structured.sourceSummary.conversion}`,
      `黄金开头：${structured.hook}`,
      `封面字：${structured.coverText}`,
      `封面方向：${candidate.coverPattern || '真实案例或操作界面做主体，标题只写一个明确问题。'}`,
      `发布时间建议：${candidate.publishTiming || '今天可发，发布后回收评论。'}`,
      '',
      '小红书正文草稿：',
      ...structured.bodyDraft.map((item, index) => `${index + 1}. ${item}`),
      '',
      '小红书卡片组脚本：',
      ...structured.cardPlan.map((item) => `- P${item.page} ${item.role}：${item.title}｜${item.copy}`),
      '',
      '评论区引导：',
      ...structured.commentGuide.map((item) => `- ${item}`),
      '',
      '朋友圈配文：',
      ...structured.momentsCopy,
      '',
      '复刻执行单：',
      ...structured.replicationPlan.map((item, index) => `${index + 1}. ${item}`),
      '',
      '发布前检查：',
      ...structured.publishChecklist.map((item) => `- ${item}`),
      '',
      '风险提醒：',
      ...(structured.riskNotes.length ? structured.riskNotes.map((item) => `- ${item}`) : ['- 暂无明显风险，发布前仍需人工看一遍素材和措辞。']),
      '',
      '发布后复盘字段：',
      ...structured.replayFields.map((item) => `- ${item}`),
    ].join('\n'),
    createdAt: new Date().toISOString(),
  };
}

function buildGraphicTextSkillPipeline(candidate, outputs = {}) {
  const sourceReady = Boolean(candidate.sourceSampleId || candidate.sourceTool || candidate.metrics);
  return [
    {
      name: '找选题',
      engine: candidate.sourceTool || 'manual-import / MediaCrawlerPro',
      status: sourceReady ? '已完成' : '待补真实来源',
      output: candidate.title || candidate.angle || '候选选题',
      acceptance: sourceReady ? '有来源、有指标或有人工导入样本' : '必须补充真实笔记、评论或人工样本',
    },
    {
      name: '拆爆款',
      engine: 'dbs-deconstruct',
      status: candidate.topicValidation ? '已完成' : '初步完成',
      output: candidate.topicValidation?.pain || candidate.angle || '痛点、收藏动机、传播动机',
      acceptance: '能说清楚用户为什么收藏、为什么转发、为什么愿意点进小程序',
    },
    {
      name: '起标题',
      engine: 'dbs-xhs-title',
      status: outputs.titleOptions?.length ? '已完成' : '待生成',
      output: `${outputs.titleOptions?.length || 0} 个标题候选`,
      acceptance: '每个标题必须对应一个公式或心理触发点，不能只是同义改写',
    },
    {
      name: '写开头',
      engine: 'dbs-hook',
      status: outputs.bodyDraft?.[0] ? '已完成' : '待生成',
      output: outputs.bodyDraft?.[0] || '黄金开头',
      acceptance: '开头要在 3-5 秒内说明话题、悬念和可信度',
    },
    {
      name: '内容体检',
      engine: 'dbs-content',
      status: outputs.bodyDraft?.length ? '已完成' : '待生成',
      output: `${outputs.bodyDraft?.length || 0} 段正文草稿`,
      acceptance: '正文必须有判断过程、真实素材位置、行动入口，不只是一段泛泛文案',
    },
    {
      name: '生成卡片组',
      engine: 'guizang-social-card-skill',
      status: outputs.cardPlan?.length ? '已完成' : '待生成',
      output: `${outputs.cardPlan?.length || 0} 张 3:4 小红书卡片脚本`,
      acceptance: '有封面卡、内容卡、行动卡，可导出 900x1200 PNG',
    },
    {
      name: '发前检查',
      engine: 'dbs-ai-check + Longka compliance gate',
      status: outputs.publishChecklist?.length ? '已完成' : '待检查',
      output: `${outputs.publishChecklist?.length || 0} 条发布检查`,
      acceptance: '不夸大、不违规、有真实素材、有评论区承接动作',
    },
  ];
}

function enrichPublishAssetStructured(candidate, structured, outputs = {}) {
  const videoPackage = buildPromoVideoPackage(candidate, outputs);
  structured.videoPackage = videoPackage;
  structured.skillPipeline = buildGraphicTextSkillPipeline(candidate, { ...outputs, videoPackage });
  structured.closureEvidence = buildFirstVersionClosureEvidence(candidate, { ...outputs, videoPackage });
  return structured;
}

function buildPromoVideoPackage(candidate, outputs = {}) {
  const title = outputs.title || candidate.title || '小程序体验过程';
  const pain = candidate.topicValidation?.pain || candidate.pain || '不知道第一步怎么做';
  const hook = outputs.hook || candidate.hook || `很多人都有「${pain}」这个问题，但不知道第一步怎么做。`;
  return {
    type: '小红书视频生产线',
    status: '待交给小妹视频工作台合成',
    title: `宣传短视频：${title}`,
    coverText: `${title}，先看这一幕`,
    duration: '25-35 秒',
    templateSuggestions: ['小程序流程版', '样片展示版', '前后对比版'],
    materialMode: '案例素材为主，补充小程序录屏、样片图、原始素材图和报告结果图',
    script: [
      `0-3秒：${hook}`,
      `3-8秒：展示用户痛点：${pain}`,
      '8-16秒：录屏演示上传照片、生成试看图或查看报告样片',
      '16-25秒：穿插样片/报告卡片，说明能看到发型、色彩、风格方向',
      '25-35秒：引导搜索小程序或先生成自己的试看图',
    ],
    shotList: [
      '封面：真实样片或小程序界面做主体，字要大，不能像空白白板',
      '镜头1：用户原始问题或评论痛点截图',
      '镜头2：小程序操作录屏，突出“上传-试看-解锁报告”',
      '镜头3：样片/报告结果快速切换，避免只用一个人的素材',
      '镜头4：结尾行动引导，搜索小程序或生成自己的试看图',
    ],
    xiaomeiWorkbench: {
      target: 'E:\\Codex\\my-video',
      nextAction: '把 script、shotList、coverText 和素材要求同步给小妹视频工作台，生成带封面、旁白、背景音乐的成片。',
    },
    acceptance: [
      '必须有封面、旁白、背景音乐和成片文件',
      '必须有小程序真实录屏或真实样片，不能只做静态图轮播',
      '开头 3 秒要有痛点或反差，不用泛泛介绍产品',
      '图文卡片和视频脚本要来自同一个选题，不各说各话',
    ],
  };
}

function buildFirstVersionClosureEvidence(candidate, outputs = {}) {
  const publishPackReady = Boolean(outputs.bodyDraft?.length && outputs.commentGuide?.length);
  const cardPlanReady = Boolean(outputs.cardPlan?.length);
  const videoReady = Boolean(outputs.videoPackage?.script?.length);
  const reviewReady = Boolean(outputs.publishChecklist?.length);
  return {
    source: candidate.sourceTool || 'manual-import',
    sampleId: candidate.sourceSampleId || '',
    topic: candidate.title || candidate.angle || '',
    candidateReady: Boolean(candidate.title || candidate.angle),
    titleReady: Boolean(outputs.titleOptions?.length),
    hookReady: Boolean(outputs.bodyDraft?.[0]),
    publishPackReady,
    cardPlanReady,
    videoReady,
    reviewReady,
    firstVersionDone: publishPackReady && cardPlanReady && videoReady && reviewReady,
    endpoint: '图文 + 视频双产物可交付',
    nextLoop: '第一版闭环终点：采集、分析、改造、成文，并交付精致小红书图文卡片和宣传短视频包。人工发布和发布后复盘先保留入口，不作为本版验收终点。',
  };
}

function buildContentClosureEvidence(candidate, outputs = {}) {
  return {
    source: candidate.sourceTool || 'manual-import',
    sampleId: candidate.sourceSampleId || '',
    topic: candidate.title || candidate.angle || '',
    candidateReady: Boolean(candidate.title || candidate.angle),
    titleReady: Boolean(outputs.titleOptions?.length),
    hookReady: Boolean(outputs.bodyDraft?.[0]),
    publishPackReady: Boolean(outputs.bodyDraft?.length && outputs.commentGuide?.length),
    cardPlanReady: Boolean(outputs.cardPlan?.length),
    reviewReady: Boolean(outputs.publishChecklist?.length),
    nextLoop: '发布后填写点赞、收藏、评论、私信、付款和高频问题，系统回流样本池并生成复刻任务。',
  };
}

function buildXhsTitleOptions(candidate, fallbackTitle) {
  const pain = candidate.topicValidation?.pain || inferPainPoint(candidate.title || candidate.angle || '');
  const shortPain = pain.length > 18 ? pain.slice(0, 18) : pain;
  const base = fallbackTitle.replace(/[#\[\]【】]/g, '').trim();
  return [
    {
      formula: '互动测试型',
      text: `测一测：你适合什么形象风格？`,
      reason: '色彩项目本身是测评类产品，先让用户参与，比直接介绍服务更容易进入。',
    },
    {
      formula: '身份代入型',
      text: `普通人做形象分析，最先该看这一步`,
      reason: '把用户从围观拉到“说的就是我”的状态，适合小红书图文。',
    },
    {
      formula: '损失提醒型',
      text: `别再靠感觉选发型和穿搭了`,
      reason: '把隐性问题显性化，适合承接评论区对发型、穿搭、显土的焦虑。',
    },
    {
      formula: '案例复盘型',
      text: base || `一个关于${shortPain}的真实样片复盘`,
      reason: '保留真实采集样本的语感，降低 AI 味和广告感。',
    },
  ];
}

function buildCoverText(candidate, title) {
  const pain = candidate.topicValidation?.pain || inferPainPoint(candidate.title || candidate.angle || '');
  if (/男|精神|干净|职业|可信/.test(`${candidate.title} ${candidate.angle} ${pain}`)) return '男士变精神，先看这 3 点';
  if (/发型|脸型|头发/.test(`${candidate.title} ${candidate.angle} ${pain}`)) return '发型别乱换，先看脸型';
  if (/穿搭|风格|衣服|显瘦/.test(`${candidate.title} ${candidate.angle} ${pain}`)) return '穿搭没方向，先做风格判断';
  if (/色彩|肤色|妆容/.test(`${candidate.title} ${candidate.angle} ${pain}`)) return '你的肤色适合什么颜色？';
  return title.length > 16 ? title.slice(0, 16) : title;
}

function buildXhsCardPlan(candidate, title, commentPains) {
  const pain = candidate.topicValidation?.pain || commentPains[0] || '想变好看但不知道第一步';
  const conversion = candidate.topicValidation?.conversion || '上传照片得到自己的方案';
  return [
    { page: 1, role: '封面卡', title: buildCoverText(candidate, title), copy: '用真实样片或小程序界面做主体，只放一个强问题。' },
    { page: 2, role: '痛点卡', title: '为什么你总觉得哪里不对？', copy: pain },
    { page: 3, role: '判断卡', title: '不要先买衣服，先判断方向', copy: '脸型、肤色、发型、穿搭风格要放在一起看。' },
    { page: 4, role: '过程卡', title: '上传照片后看什么？', copy: '看适合色彩、发型建议、风格关键词和可执行搭配方向。' },
    { page: 5, role: '结果卡', title: '先拿一个试看结果', copy: '让用户看到一个小变化，再决定要不要做完整报告。' },
    { page: 6, role: '行动卡', title: '想试的话，从这一步开始', copy: conversion },
  ];
}

function scoreMaterial(item, keywordText, config) {
  const text = item.text || '';
  let score = 35;
  const metrics = normalizeMetrics(item.metrics);
  const engagement = metrics.likes + metrics.comments * 2 + metrics.saves * 2.4 + metrics.shares * 2.2;
  score += Math.min(42, Math.log10(engagement + 1) * 16);
  score += Math.min(18, metrics.growth / 6);
  for (const keyword of Object.values(config.keywords || {}).flat()) if (keyword && text.includes(keyword)) score += 5;
  if (text.includes('付款') || text.includes('成交')) score += 12;
  if (text.includes('问题') || text.includes('不稳定')) score += 10;
  if (text.includes('朋友圈') || text.includes('分享')) score += 8;
  if (keywordText && text.length > 20) score += 3;
  return { ...item, metrics, pain: item.pain || inferPain(text), performanceScore: Math.round(score), score };
}

function makeSeedSignal(source, text, likes, comments, saves, shares, growth, pain) {
  return { id: randomUUID(), source, text, pain, metrics: { likes, comments, saves, shares, growth }, createdAt: new Date().toISOString() };
}

function normalizeMetrics(metrics = {}) {
  return {
    likes: Number(metrics.likes || 0),
    comments: Number(metrics.comments || 0),
    saves: Number(metrics.saves || 0),
    shares: Number(metrics.shares || 0),
    growth: Number(metrics.growth || 0),
  };
}

function inferPain(text = '', metrics = {}) {
  if (text.includes('不像') || text.includes('本人')) return '担心不像本人';
  if (text.includes('付款') || text.includes('看不到')) return '担心付款后无交付';
  if (text.includes('发什么') || text.includes('选题')) return '每天不知道发什么';
  if (text.includes('朋友圈') || text.includes('分享')) return '想要可分享的成果';
  if (/男士|男生|宅男|男大|变帅/.test(text)) return '男士想变精神但怕改造翻车';
  if (/发型|刘海|锁骨发|圆脸|方圆脸|脸型|高颅顶/.test(text)) return '不知道自己适合什么发型和脸型修饰';
  if (/穿搭|显瘦|显高|梨形|通勤|氛围感/.test(text)) return '想变好看但不会把风格落到穿搭';
  if (/色彩|肤色|冷暖|四季|配色|诊断|测试/.test(text)) return '不知道什么颜色真正适合自己';
  if (/真实测评|原相机|素颜|回归现实|避坑|翻车/.test(text)) return '害怕被过度美化，想看真实效果';
  if (/低成本|免费|平替|省了|不用花钱/.test(text)) return '想低成本先验证效果';
  if (normalizeMetrics(metrics).comments >= 800) return '评论多但缺明细，需要补抓评论验证具体问题';
  if (normalizeMetrics(metrics).saves >= 2000) return '收藏高，说明用户想保存为改造参考';
  return '泛审美兴趣，需要补充评论或案例验证';
}

function buildAngle(title, config) {
  if (title.includes('付了钱')) return '用真实交付事故讲清楚状态闭环、同步机制和兜底机制，让客户相信系统不是玩具。';
  if (title.includes('试看图')) return '从好奇心、即时反馈和社交炫耀解释试看图为什么能促成体验和转化。';
  if (title.includes('男士')) return '把男士形象优化从“变帅”改成“变精神、干净、可信”，降低审美争议。';
  return `把“${config.project}”的内容焦虑拆成信息源、关键词、AI 初筛和人工判断四个动作。`;
}

function buildProductionTask(candidate) {
  const owner = candidate.platform.includes('视频') ? '视频制作员工' : '内容策划员工';
  return {
    id: randomUUID(),
    topicId: candidate.id,
    title: candidate.title,
    owner,
    status: '待制作',
    next: owner === '视频制作员工' ? '生成短视频脚本，交给小妹视频工作台。' : '生成小红书正文、朋友圈配文和封面文案。',
    createdAt: new Date().toISOString(),
  };
}

function buildPublishRecord(asset, payload = {}) {
  const metrics = {
    likes: Number(payload.likes || payload.metrics?.likes || 0),
    saves: Number(payload.saves || payload.metrics?.saves || payload.metrics?.collects || 0),
    comments: Number(payload.comments || payload.metrics?.comments || 0),
    shares: Number(payload.shares || payload.metrics?.shares || 0),
    messages: Number(payload.messages || payload.metrics?.messages || 0),
    visits: Number(payload.visits || payload.metrics?.visits || 0),
    orders: Number(payload.orders || payload.metrics?.orders || 0),
  };
  const review = String(payload.review || '').trim();
  const commentHighlights = String(payload.commentHighlights || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12);
  return {
    id: randomUUID(),
    assetId: asset.id,
    assetTitle: asset.title,
    topicId: asset.topicId || '',
    platform: String(payload.platform || '小红书').trim(),
    url: String(payload.url || '').trim(),
    publishedAt: payload.publishedAt || new Date().toISOString(),
    metrics,
    commentHighlights,
    review,
    judgement: judgePublishRecord(metrics, review, commentHighlights),
    createdAt: new Date().toISOString(),
  };
}

function buildPublishSample(asset, record) {
  const data = asset.structured || {};
  const content = [
    data.selectedTitle || asset.title,
    ...(Array.isArray(data.bodyDraft) ? data.bodyDraft : []),
    record.review ? `复盘：${record.review}` : '',
  ].filter(Boolean).join('\n');
  return normalizeContentSample({
    platform: 'xiaohongshu',
    sourceTool: 'publish-review',
    collectionStatus: 'real',
    keyword: '自有发布复盘',
    title: data.selectedTitle || asset.title,
    content,
    comments: record.commentHighlights,
    metrics: {
      likes: record.metrics.likes,
      saves: record.metrics.saves,
      comments: record.metrics.comments,
      shares: record.metrics.shares,
      growth: record.metrics.orders * 20 + record.metrics.messages * 3,
    },
    url: record.url,
    collectedAt: new Date().toISOString(),
  });
}

function buildReplicationTasks(asset, record) {
  const judgement = record.judgement || {};
  if (!['优先复刻', '继续优化'].includes(judgement.label)) return [];
  const baseTitle = (asset.structured?.selectedTitle || asset.title || '复盘内容').replace(/^小红书发布包：/, '');
  const tasks = [
    {
      id: randomUUID(),
      topicId: asset.topicId || '',
      assetId: asset.id,
      publishRecordId: record.id,
      title: `复刻图文：${baseTitle}`,
      owner: '内容策划员工',
      status: '待制作',
      source: 'publish-review',
      priority: judgement.label === '优先复刻' ? '高' : '中',
      next: `沿用这条内容的有效角度，重写一版小红书图文。复盘判断：${judgement.reason}`,
      acceptance: '输出新的标题候选、正文、卡片组脚本、评论引导和发前检查。',
      createdAt: new Date().toISOString(),
    },
  ];
  if (record.metrics.orders > 0 || record.metrics.messages > 0 || judgement.label === '优先复刻') {
    tasks.push({
      id: randomUUID(),
      topicId: asset.topicId || '',
      assetId: asset.id,
      publishRecordId: record.id,
      title: `复刻视频：${baseTitle}`,
      owner: '视频制作员工',
      status: '待制作',
      source: 'publish-review',
      priority: '高',
      next: '把这条高反馈图文改成 30 秒短视频：黄金 3 秒、痛点解释、工具演示、搜索/体验引导。',
      acceptance: '输出短视频脚本、分镜、封面字和小妹视频工作台素材要求。',
      createdAt: new Date().toISOString(),
    });
  }
  if (record.metrics.messages > 0 || record.metrics.orders > 0) {
    tasks.push({
      id: randomUUID(),
      topicId: asset.topicId || '',
      assetId: asset.id,
      publishRecordId: record.id,
      title: `私域承接：${baseTitle}`,
      owner: '增长员工',
      status: '待制作',
      source: 'publish-review',
      priority: '高',
      next: '整理私信和评论里的问题，生成朋友圈承接文案、FAQ 和客服回复话术。',
      acceptance: '输出 1 条朋友圈种草文、5 条 FAQ、3 条私信回复话术。',
      createdAt: new Date().toISOString(),
    });
  }
  return tasks;
}

function executeTask(task, db) {
  if (task.source !== 'publish-review') {
    return { asset: null, message: '目前只自动执行发布复盘生成的复刻任务。' };
  }
  const sourceAsset = (db.assets || []).find((item) => item.id === task.assetId);
  const record = (db.publishRecords || []).find((item) => item.id === task.publishRecordId);
  if (!sourceAsset || !record) return { asset: null, message: '复刻任务缺少原发布包或复盘记录。' };
  if (task.owner === '内容策划员工') return { asset: buildReplicatedXhsAsset(sourceAsset, record, task, '图文复刻') };
  if (task.owner === '视频制作员工') return { asset: buildReplicatedVideoAsset(sourceAsset, record, task) };
  if (task.owner === '增长员工') return { asset: buildPrivateDomainAsset(sourceAsset, record, task) };
  return { asset: null, message: '这个复刻任务还没有自动执行器。' };
}

function buildReplicatedXhsAsset(sourceAsset, record, task, variantName) {
  const original = sourceAsset.structured || {};
  const baseTitle = (original.selectedTitle || sourceAsset.title || '').replace(/^小红书发布包：/, '');
  const pain = record.commentHighlights?.[0] || '想先看到自己的形象变化';
  const title = task.title.replace(/^复刻图文：/, `${variantName}：`);
  const candidate = {
    id: task.id,
    title: title || `${variantName}：${baseTitle}`,
    angle: `根据发布复盘继续放大有效角度：${record.judgement?.reason || '用户已有反馈'}`,
    hook: `上一条内容已经拿到真实反馈，这次把问题讲得更具体：${pain}`,
    coverPattern: '复刻封面：保留测试感，增加真实反馈或评论截图',
    publishTiming: '复盘后 24 小时内发布变体，承接已有兴趣',
    commentPains: record.commentHighlights?.length ? record.commentHighlights : original.commentGuide || [],
    replicationPlan: [
      `沿用原标题方向《${baseTitle}》，但开头改成复盘后的具体问题。`,
      `把评论/私信问题「${pain}」放到第二张卡片，降低广告感。`,
      '结尾引导用户先试看，再决定是否做完整报告。',
    ],
    riskNotes: ['复刻内容必须换标题、换封面表达、换案例角度，不能直接重复发布。'],
    sourceJudgement: { layer: '发布复盘', score: record.judgement?.score || 0 },
    topicValidation: {
      label: record.judgement?.label || '复盘复刻',
      score: record.judgement?.score || 0,
      saveMotive: original.sourceSummary?.saveMotive || '用户愿意保存为形象参考',
      socialMotive: original.sourceSummary?.socialMotive || '测试类内容有分享动机',
      conversion: record.metrics.orders > 0 ? '已验证付款入口：继续引导试看到完整报告' : '引导私信/试看继续验证',
      pain,
    },
  };
  const asset = buildXhsPublishAsset(candidate);
  asset.title = `复刻发布包：${baseTitle}`;
  asset.sourceTaskId = task.id;
  asset.sourceAssetId = sourceAsset.id;
  asset.publishRecordId = record.id;
  return asset;
}

function buildReplicatedVideoAsset(sourceAsset, record, task) {
  const data = sourceAsset.structured || {};
  const title = task.title.replace(/^复刻视频：/, '短视频脚本：');
  const lines = [
    `标题：${title}`,
    '',
    `复盘依据：${record.judgement?.reason || '已有发布反馈'}`,
    '0-3秒：展示原图文的评论/私信问题，直接说“很多人问我这个适不适合自己”。',
    '3-10秒：展示小程序/试看图流程，不讲技术，讲用户能看到什么。',
    '10-22秒：用 2-3 张卡片或样片解释色彩、发型、穿搭方向。',
    '22-30秒：引导搜索小程序或私信关键词，先拿试看结果。',
    '',
    '封面字：测一测你适合什么形象风格',
    '素材要求：原发布卡片组、操作录屏、试看样片、评论截图至少三种。',
  ];
  return {
    id: randomUUID(),
    topicId: task.topicId || '',
    title,
    type: '小红书视频生产线',
    sourceTaskId: task.id,
    sourceAssetId: sourceAsset.id,
    publishRecordId: record.id,
    copy: lines.join('\n'),
    structured: {
      selectedTitle: title,
      coverText: data.coverText || '测一测你适合什么形象风格',
      script: lines,
      materialChecklist: ['原发布卡片组', '操作录屏', '试看样片', '评论截图'],
      sourceSummary: { layer: '发布复盘', validation: record.judgement?.label || '复刻视频', validationScore: record.judgement?.score || 0 },
    },
    createdAt: new Date().toISOString(),
  };
}

function buildPrivateDomainAsset(sourceAsset, record, task) {
  const data = sourceAsset.structured || {};
  const title = task.title.replace(/^私域承接：/, '私域承接包：');
  const questions = record.commentHighlights?.length ? record.commentHighlights : ['我适合什么颜色？', '男生可以做吗？', '试看和完整报告有什么区别？'];
  const copy = [
    `标题：${title}`,
    '',
    '朋友圈种草文：',
    `今天这条内容收到几个很典型的问题：${questions.slice(0, 2).join(' / ')}`,
    '其实很多人不是不想改变形象，而是不知道第一步该看哪里。',
    '所以我更建议先做一次试看，看到自己的方向，再决定要不要做完整报告。',
    '',
    'FAQ：',
    ...questions.slice(0, 5).map((item, index) => `${index + 1}. ${item}：先用试看结果判断方向，再决定是否深入。`),
    '',
    '私信回复：',
    '1. 可以，先发一张正面照和一张全身照，我帮你看适合走哪个方向。',
    '2. 试看能看到大方向，完整报告会细到发型、色彩、穿搭和风格建议。',
    '3. 如果你担心不像本人，建议先做试看，满意再解锁完整报告。',
  ].join('\n');
  return {
    id: randomUUID(),
    topicId: task.topicId || '',
    title,
    type: '朋友圈种草 / 私域承接',
    sourceTaskId: task.id,
    sourceAssetId: sourceAsset.id,
    publishRecordId: record.id,
    structured: {
      selectedTitle: title,
      momentsCopy: copy.split('\n'),
      sourceSummary: { layer: '发布复盘', validation: record.judgement?.label || '私域承接', validationScore: record.judgement?.score || 0 },
      originalCover: data.coverText || '',
    },
    copy,
    createdAt: new Date().toISOString(),
  };
}

function judgePublishRecord(metrics, review, comments) {
  const score = Math.min(100, Math.round(
    Math.log10(metrics.likes + 1) * 13 +
    Math.log10(metrics.saves + 1) * 18 +
    Math.log10(metrics.comments + 1) * 16 +
    Math.log10(metrics.shares + 1) * 16 +
    Math.log10(metrics.messages + 1) * 18 +
    Math.log10(metrics.orders + 1) * 28
  ));
  const label = score >= 70 ? '优先复刻' : score >= 45 ? '继续优化' : '观察/换角度';
  const reason = metrics.orders > 0
    ? '已经产生付款，优先拆成交路径'
    : metrics.messages > 0
      ? '有私信兴趣，优先优化转化入口'
      : metrics.saves >= metrics.likes
        ? '收藏强于点赞，说明有参考价值'
        : comments.length
          ? '评论有反馈，可以继续补痛点'
          : '数据不足，先观察标题和封面是否需要换';
  return {
    score,
    label,
    reason,
    next: buildPublishNextAction(label, metrics, review),
  };
}

function buildPublishNextAction(label, metrics, review) {
  if (metrics.orders > 0) return '把这条内容拆成成交复盘，再生成同角度图文和短视频。';
  if (metrics.messages > 0) return '整理私信问题，补一条 FAQ 型图文和朋友圈承接文案。';
  if (metrics.saves > metrics.likes * 1.5) return '把卡片组做成清单/模板型内容，继续强化收藏价值。';
  if (label === '观察/换角度') return '换标题和封面重新发，或换成真实案例前后对比。';
  return review ? '根据复盘结论生成下一条变体。' : '补充人工复盘结论后再决定是否复刻。';
}

function buildWorkflowActionTask(actionKey, db) {
  const project = getCurrentProject(db);
  const actions = {
    'context-profile': {
      layer: '上下文层',
      owner: '企业大脑',
      title: `为「${project.name}」建立客户画像和业务规则卡`,
      next: '整理目标客户、产品卖点、禁区话术、历史案例和素材目录，形成 AI 员工接任务前必须读取的上下文卡。',
      acceptance: '打开项目档案时能看到客户画像、业务规则、素材索引和可引用案例。',
    },
    'task-template': {
      layer: '任务层',
      owner: '调度官',
      title: `把「${project.goal}」拆成可复用任务模板`,
      next: '定义任务输入、优先级、预算、截止时间、人工批准点和交付格式，作为后续 AI 员工派单模板。',
      acceptance: '老板批准一个目标后，系统能自动生成不少于 3 条带负责人的生产任务。',
    },
    'tool-wiring': {
      layer: '执行层',
      owner: '架构官 / AI 员工',
      title: '接入一个真实执行工具到 AI 员工工作台',
      next: '优先选择 md2wechat、open-design、Remotion 或小妹视频工作台，补齐调用入口、输入字段和产物回写。',
      acceptance: '点击员工动作后能生成真实产物或明确进入外部工具，不只停留在文字说明。',
    },
    'feedback-metrics': {
      layer: '反馈层',
      owner: '验收官',
      title: '建立内容和交付质量反馈表',
      next: '补充图片质量、视频成片、内容发布、点击、留资、付款、复购和失败原因字段。',
      acceptance: '每条任务都能记录结果好坏、失败原因和下一次规则调整。',
    },
    'governance-check': {
      layer: '治理层',
      owner: '系统管理员',
      title: '生成上线前治理清单',
      next: '检查客户数据隔离、调用预算、权限、导入导出、错误重试、版本记录和发布前人工确认。',
      acceptance: '调试期开放，正式交付前每个客户空间都有权限、预算、日志和恢复方案。',
    },
  };
  const action = actions[actionKey];
  if (!action) return null;
  return {
    id: randomUUID(),
    source: 'workflow-layer',
    projectId: project.id,
    layer: action.layer,
    title: action.title,
    owner: action.owner,
    status: '待建设',
    next: action.next,
    acceptance: action.acceptance,
    createdAt: new Date().toISOString(),
  };
}

function buildAssetDraft(candidate) {
  return {
    id: randomUUID(),
    topicId: candidate.id,
    title: candidate.title,
    type: candidate.platform,
    copy: [
      `标题：${candidate.title}`,
      '',
      `核心角度：${candidate.angle}`,
      '',
      `内容结构：${candidate.formula}`,
      '',
      '开头：很多问题不是 AI 不能做，而是没有把业务流程拆成可执行、可检查、可恢复的步骤。',
      '正文：先把真实问题记录下来，再让 AI 做信息压缩和结构化，最后由人判断是否值得发布。',
      '行动：今天先跑一轮选题，把最有转化价值的一条做成图文或视频。',
    ].join('\n'),
    createdAt: new Date().toISOString(),
  };
}

function buildEmployeeResult(employee, db) {
  const topCandidate = Array.isArray(db.candidates) && db.candidates[0] ? db.candidates[0] : null;
  const topSignal = Array.isArray(db.rawMaterials) && db.rawMaterials[0] ? db.rawMaterials[0] : null;
  if (employee.id === 'intel') {
    return [
      '已读取当前信息池。',
      `最高优先级信号：${topSignal ? topSignal.text : '暂无新信号，请先补充资料或扫描 Obsidian。'}`,
      '建议下一步：运行选题中心，交给内容员工做初稿。',
    ].join('\n');
  }
  if (employee.id === 'content') {
    return [
      `建议选题：${topCandidate ? topCandidate.title : '为什么用户愿意为一张形象试看图付款？'}`,
      '内容结构：先指出真实痛点，再展示样片带来的即时反馈，最后引导用户生成自己的试看图。',
      '验收标准：不夸大收益，不承诺变美，只讲可见体验和可分享结果。',
      '可交付渠道：文章定稿后交给 md2wechat-skill 排版为公众号草稿。',
    ].join('\n');
  }
  if (employee.id === 'video') {
    return [
      '视频方向：用 3 秒前后对比抓注意力，随后演示上传照片生成试看图。',
      '素材要求：优先使用已授权案例图和小程序真实界面。',
      '下一步：交给小妹视频工作台选择“样片展示版”或“小程序流程版”。',
    ].join('\n');
  }
  return [
    '增长动作：沉淀 5 个用户会搜索的问题。',
    '入口设计：短视频和图文统一引导搜索小程序名称。',
    '复用资产：把用户疑问整理成 FAQ，用于页面、朋友圈和评论回复。',
  ].join('\n');
}

async function scanClippings(dir, limit) {
  const files = await listMarkdownFiles(dir);
  const ranked = [];
  for (const file of files.slice(0, limit * 3)) {
    try {
      const text = await readFile(file, 'utf8');
      const title = extractTitle(text, file);
      const summary = extractUsefulLine(text) || title;
      const s = await stat(file);
      const metrics = estimateClippingMetrics(text, s.mtimeMs);
      ranked.push({
        id: randomUUID(),
        source: 'Obsidian 精选文章',
        text: `${title}：${summary}`.slice(0, 240),
        pain: inferPain(`${title} ${summary}`),
        metrics,
        file,
        createdAt: new Date().toISOString(),
      });
    } catch {}
  }
  return ranked.sort((a, b) => signalWeight(b) - signalWeight(a)).slice(0, limit);
}

async function listMarkdownFiles(dir) {
  const out = [];
  async function walk(current) {
    let entries = [];
    try { entries = await readdir(current, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (/\.md$/i.test(entry.name)) out.push(full);
    }
  }
  await walk(dir);
  const stats = await Promise.all(out.map(async (file) => ({ file, s: await stat(file).catch(() => null) })));
  return stats.filter((item) => item.s).sort((a, b) => b.s.mtimeMs - a.s.mtimeMs).map((item) => item.file);
}

function extractTitle(text, file) {
  const frontTitle = text.match(/^title:\s*["']?(.+?)["']?\s*$/m);
  if (frontTitle) return frontTitle[1].trim();
  const heading = text.match(/^#\s+(.+)$/m);
  if (heading) return heading[1].trim();
  return file.split(/[\\/]/).pop().replace(/\.md$/i, '');
}

function extractUsefulLine(text) {
  const lines = text.replace(/^---[\s\S]*?---/, '').split(/\r?\n/).map((line) => line.replace(/!\[[^\]]*]\([^)]+\)/g, '').trim()).filter((line) => line.length >= 18 && !line.startsWith('http'));
  return lines.find((line) => /问题|痛点|方法|选题|增长|客户|老板|AI|Agent|内容|成交|私域|小程序/.test(line)) || lines[0] || '';
}

function estimateClippingMetrics(text, mtimeMs) {
  const days = Math.max(0, (Date.now() - mtimeMs) / 86400000);
  const recency = Math.max(0, 90 - days * 3);
  const lengthScore = Math.min(80, Math.round(text.length / 260));
  const keywordScore = ['AI', 'Agent', '选题', '增长', '客户', '老板', '成交', '内容', '小程序', '私域'].reduce((sum, word) => sum + (text.includes(word) ? 8 : 0), 0);
  return {
    likes: Math.round(20 + lengthScore + keywordScore * 0.7),
    comments: Math.round(8 + keywordScore * 0.38),
    saves: Math.round(18 + lengthScore * 0.8 + keywordScore * 0.55),
    shares: Math.round(5 + keywordScore * 0.25),
    growth: Math.round(Math.min(95, recency + keywordScore * 0.3)),
  };
}

function signalWeight(item) {
  const m = normalizeMetrics(item.metrics);
  return m.likes + m.comments * 2 + m.saves * 2.4 + m.shares * 2.2 + m.growth;
}

function normalizeConfig(config = {}) {
  return {
    ...defaultConfig,
    ...config,
    sources: Array.isArray(config.sources) && config.sources.length ? config.sources : defaultConfig.sources,
    keywords: config.keywords || defaultConfig.keywords,
  };
}

function normalizeCompany(company = {}) {
  return {
    ...defaultCompany,
    ...company,
  };
}

function normalizeProjects(projects = []) {
  const list = Array.isArray(projects) && projects.length ? projects : defaultProjects;
  return list.map((project) => ({
    id: String(project.id || slugify(project.name || 'project')),
    name: String(project.name || '未命名项目'),
    audience: String(project.audience || '待定义客户人群'),
    goal: String(project.goal || '待定义经营目标'),
    status: String(project.status || '运行中'),
    createdAt: project.createdAt || new Date().toISOString(),
  }));
}

function addActivity(db, action, detail) {
  db.activityLog = Array.isArray(db.activityLog) ? db.activityLog : [];
  const project = getCurrentProject(db);
  db.activityLog.unshift({
    id: randomUUID(),
    at: new Date().toISOString(),
    actor: '老板 / AI 中台',
    projectId: project.id,
    projectName: project.name,
    action,
    detail,
  });
  db.activityLog = db.activityLog.slice(0, 80);
}

function getCurrentProject(db) {
  const projects = normalizeProjects(db.projects);
  return projects.find((item) => item.id === db.currentProjectId) || projects[0];
}

function slugify(value) {
  const ascii = String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return ascii || `project-${Date.now()}`;
}

async function ensureAssetDb() {
  await mkdir(assetVaultDir, { recursive: true });
  let DatabaseSync;
  try {
    ({ DatabaseSync } = await import('node:sqlite'));
  } catch (error) {
    sqliteUnavailableReason = error.message;
    assetDb = null;
    return;
  }
  assetDb = new DatabaseSync(assetDbPath);
  assetDb.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS customer_profiles (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      industry TEXT NOT NULL,
      goal TEXT NOT NULL,
      keywords TEXT NOT NULL DEFAULT '[]',
      library_name TEXT NOT NULL,
      materials_dir TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS asset_events (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      summary TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

function customerLibraryName({ displayName, industry }) {
  const name = String(displayName || '客户').trim();
  const field = String(industry || '行业').trim();
  return `${name}-${field}-数字资产库`;
}

function getCustomerProfile() {
  if (!assetDb) return null;
  const row = assetDb.prepare('SELECT * FROM customer_profiles ORDER BY updated_at DESC LIMIT 1').get();
  if (!row) return null;
  return {
    id: row.id,
    displayName: row.display_name,
    industry: row.industry,
    goal: row.goal,
    keywords: JSON.parse(row.keywords || '[]'),
    libraryName: row.library_name,
    materialsDir: row.materials_dir,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function saveCustomerProfile(payload = {}) {
  const now = new Date().toISOString();
  const displayName = String(payload.displayName || payload.name || payload.storeName || '客户').trim();
  const industry = String(payload.industry || '未分类行业').trim();
  const goal = String(payload.goal || '持续创作并获得咨询').trim();
  const keywords = Array.isArray(payload.keywords)
    ? payload.keywords.map((item) => String(item).trim()).filter(Boolean)
    : String(payload.keywords || '').split(/[、,，\s\n]+/).map((item) => item.trim()).filter(Boolean);
  const libraryName = customerLibraryName({ displayName, industry });
  const profileId = slugify(libraryName);
  const materialsDir = join(assetVaultDir, `${profileId}-materials`);
  if (!assetDb) {
    mkdir(materialsDir, { recursive: true }).catch(() => {});
    return {
      id: profileId,
      displayName,
      industry,
      goal,
      keywords,
      libraryName,
      materialsDir,
      createdAt: now,
      updatedAt: now,
      assetDbAvailable: false,
      assetDbReason: sqliteUnavailableReason || 'asset database is not initialized',
    };
  }
  assetDb.prepare(`
    INSERT INTO customer_profiles (id, display_name, industry, goal, keywords, library_name, materials_dir, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      display_name = excluded.display_name,
      industry = excluded.industry,
      goal = excluded.goal,
      keywords = excluded.keywords,
      library_name = excluded.library_name,
      materials_dir = excluded.materials_dir,
      updated_at = excluded.updated_at
  `).run(profileId, displayName, industry, goal, JSON.stringify(keywords), libraryName, materialsDir, now, now);
  assetDb.prepare('INSERT INTO asset_events (id, profile_id, event_type, summary, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(randomUUID(), profileId, 'profile-upsert', `Initialized asset library: ${libraryName}`, now);
  mkdir(materialsDir, { recursive: true }).catch(() => {});
  return getCustomerProfile();
}

function normalizeWorkbench(workbench = {}) {
  const existing = new Map((Array.isArray(workbench.employees) ? workbench.employees : []).map((item) => [item.id, item]));
  return {
    approved: Boolean(workbench.approved),
    approvedAt: workbench.approvedAt || null,
    employees: defaultWorkbench.employees.map((employee) => ({
      ...employee,
      ...(existing.get(employee.id) || {}),
      sop: Array.isArray((existing.get(employee.id) || {}).sop) ? existing.get(employee.id).sop : employee.sop,
    })),
  };
}

function defaultRadarSeedPlan() {
  return {
    track: 'AI + 自媒体内容生产',
    goal: '建立 Longka 第一版 AI 自媒体内容雷达，找到对标账号、种子样本、客户问题和标题公式。',
    platforms: ['X', '小红书', '公众号', '今日头条', 'B站'],
    keywords: ['AI 写作', 'AI 自媒体', 'AI 内容工厂', 'AI 爆款文案', 'AI 图文', 'AI 短视频', 'AI 自动化', 'AI 副业', 'AI 账号矩阵', 'AI 私域获客'],
    accounts: [],
    sampleLinks: [],
    customerQuestions: [],
    titleFormulas: [],
    notes: '',
    updatedAt: null,
  };
}

function normalizeRadarSeedPlan(payload = {}) {
  return {
    track: String(payload.track || 'AI + 自媒体内容生产').trim(),
    goal: String(payload.goal || '').trim(),
    platforms: normalizeLineList(payload.platforms),
    keywords: normalizeLineList(payload.keywords),
    accounts: normalizeLineList(payload.accounts),
    sampleLinks: normalizeLineList(payload.sampleLinks || payload.sample_links),
    customerQuestions: normalizeLineList(payload.customerQuestions || payload.customer_questions),
    titleFormulas: normalizeLineList(payload.titleFormulas || payload.title_formulas),
    notes: String(payload.notes || '').trim(),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeLineList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || '')
    .split(/\r?\n|[,，、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeImportedDb(payload = {}) {
  const projects = normalizeProjects(payload.projects);
  const currentProjectId = projects.some((item) => item.id === payload.currentProjectId)
    ? payload.currentProjectId
    : projects[0].id;
  const config = normalizeConfig(payload.config);
  const activityLog = Array.isArray(payload.activityLog)
    ? payload.activityLog.slice(0, 80).map((item) => ({
        id: item.id || randomUUID(),
        at: item.at || new Date().toISOString(),
        actor: item.actor || '老板 / AI 中台',
        projectId: item.projectId || currentProjectId,
        projectName: item.projectName || (projects.find((project) => project.id === currentProjectId) || projects[0]).name,
        action: item.action || '历史记录',
        detail: item.detail || '',
      }))
    : [];
  return {
    company: normalizeCompany(payload.company),
    currentProjectId,
    projects,
    activityLog,
    config,
    workbench: normalizeWorkbench(payload.workbench),
    rawMaterials: Array.isArray(payload.rawMaterials) ? payload.rawMaterials : [],
    contentSamples: Array.isArray(payload.contentSamples) ? payload.contentSamples : [],
    candidates: Array.isArray(payload.candidates) ? payload.candidates : [],
    topics: Array.isArray(payload.topics) ? payload.topics : [],
    tasks: Array.isArray(payload.tasks) ? payload.tasks : [],
    assets: Array.isArray(payload.assets) ? payload.assets : [],
    publishRecords: Array.isArray(payload.publishRecords) ? payload.publishRecords : [],
    radarSeedPlan: normalizeRadarSeedPlan(payload.radarSeedPlan || defaultRadarSeedPlan()),
    lastPipelineRunAt: payload.lastPipelineRunAt || null,
    updatedAt: payload.updatedAt || new Date().toISOString(),
  };
}

async function ensureDb() {
  if (process.env.DATABASE_URL) {
    const pg = await import('pg');
    pgPool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.DB_POOL_MAX || 8),
      idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
    });
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS ai_native_command_center_state (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    const existing = await pgPool.query('SELECT id FROM ai_native_command_center_state WHERE id = $1', ['default']);
    if (!existing.rowCount) {
      const initial = {
        company: defaultCompany,
        currentProjectId: defaultProjects[0].id,
        projects: defaultProjects,
        activityLog: [],
        config: defaultConfig,
        workbench: defaultWorkbench,
        rawMaterials: seedMaterials,
        contentSamples: [],
        candidates: [],
        topics: [],
        tasks: [],
    assets: [],
    publishRecords: [],
    radarSeedPlan: defaultRadarSeedPlan(),
    lastPipelineRunAt: null,
    updatedAt: new Date().toISOString(),
  };
      await pgPool.query(
        'INSERT INTO ai_native_command_center_state (id, data, updated_at) VALUES ($1, $2::jsonb, now())',
        ['default', JSON.stringify(initial)],
      );
    }
    return;
  }
  if (existsSync(dbPath)) {
    try {
      JSON.parse(await readFile(dbPath, 'utf8'));
      return;
    } catch {
      await writeFile(`${dbPath}.broken-${Date.now()}`, await readFile(dbPath, 'utf8'), 'utf8');
    }
  }
  await writeDb({
    company: defaultCompany,
    currentProjectId: defaultProjects[0].id,
    projects: defaultProjects,
    activityLog: [],
    config: defaultConfig,
    workbench: defaultWorkbench,
    rawMaterials: seedMaterials,
    contentSamples: [],
    candidates: [],
    topics: [],
    tasks: [],
    assets: [],
    publishRecords: [],
    radarSeedPlan: defaultRadarSeedPlan(),
    lastPipelineRunAt: null,
    updatedAt: new Date().toISOString(),
  });
}

async function readDb() {
  const db = pgPool
    ? (await pgPool.query('SELECT data FROM ai_native_command_center_state WHERE id = $1', ['default'])).rows[0]?.data || {}
    : JSON.parse(await readFile(dbPath, 'utf8'));
  return {
    company: normalizeCompany(db.company),
    currentProjectId: db.currentProjectId || defaultProjects[0].id,
    projects: normalizeProjects(db.projects),
    activityLog: Array.isArray(db.activityLog) ? db.activityLog.slice(0, 80) : [],
    config: normalizeConfig(db.config),
    workbench: normalizeWorkbench(db.workbench),
    rawMaterials: Array.isArray(db.rawMaterials) ? db.rawMaterials : [],
    contentSamples: Array.isArray(db.contentSamples) ? db.contentSamples : [],
    candidates: Array.isArray(db.candidates) ? db.candidates : [],
    topics: Array.isArray(db.topics) ? db.topics : [],
    tasks: Array.isArray(db.tasks) ? db.tasks : [],
    assets: Array.isArray(db.assets) ? db.assets : [],
    publishRecords: Array.isArray(db.publishRecords) ? db.publishRecords : [],
    radarSeedPlan: normalizeRadarSeedPlan(db.radarSeedPlan || defaultRadarSeedPlan()),
    lastPipelineRunAt: db.lastPipelineRunAt || null,
    updatedAt: db.updatedAt || null,
  };
}

async function writeDb(db) {
  if (pgPool) {
    db.updatedAt = db.updatedAt || new Date().toISOString();
    dbWriteQueue = dbWriteQueue.then(() => pgPool.query(
      `INSERT INTO ai_native_command_center_state (id, data, updated_at)
       VALUES ($1, $2::jsonb, now())
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
      ['default', JSON.stringify(db)],
    ));
    await dbWriteQueue;
    return;
  }
  dbWriteQueue = dbWriteQueue.then(() => writeFile(dbPath, JSON.stringify(db, null, 2), 'utf8'));
  await dbWriteQueue;
}

async function mutateDb(mutator) {
  dbWriteQueue = dbWriteQueue.then(async () => {
    const db = await readDb();
    await mutator(db);
    db.updatedAt = db.updatedAt || new Date().toISOString();
    if (pgPool) {
      await pgPool.query(
        `INSERT INTO ai_native_command_center_state (id, data, updated_at)
         VALUES ($1, $2::jsonb, now())
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
        ['default', JSON.stringify(db)],
      );
    } else {
      await writeFile(dbPath, JSON.stringify(db, null, 2), 'utf8');
    }
  });
  await dbWriteQueue;
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8').replace(/^\uFEFF/, ''));
}

async function readOperatorAiConfig() {
  const configFile = process.env.XIAOMEI_CONFIG_FILE || 'E:\\Codex\\my-video\\小妹视频工作台配置.txt';
  const config = {};
  for (const file of [join(root, '.env'), configFile]) {
    const text = await readFile(file, 'utf8').catch(() => '');
    for (const line of text.split(/\r?\n/)) {
      const clean = line.trim();
      if (!clean || clean.startsWith('#') || !clean.includes('=')) continue;
      const [key, ...rest] = clean.split('=');
      if (!config[key.trim()]) config[key.trim()] = rest.join('=').trim();
    }
  }
  for (const [key, value] of Object.entries(config)) {
    if (!process.env[key]) process.env[key] = value;
  }
  const useDeepSeek = Boolean(process.env.DEEPSEEK_API_KEY || config.DEEPSEEK_API_KEY || process.env.DEEPSEEK_BASE_URL || config.DEEPSEEK_BASE_URL);
  return {
    apiKey: process.env.DEEPSEEK_API_KEY || config.DEEPSEEK_API_KEY || process.env.AIGOCODE_API_KEY || config.AIGOCODE_API_KEY || '',
    baseUrl: process.env.DEEPSEEK_BASE_URL || config.DEEPSEEK_BASE_URL || process.env.AIGOCODE_BASE_URL || config.AIGOCODE_BASE_URL || (useDeepSeek ? 'https://api.deepseek.com' : 'https://api.aigocode.com/v1'),
    model: process.env.COPY_MODEL || config.COPY_MODEL || (useDeepSeek ? 'deepseek-v4-pro' : 'gpt-5.5'),
    draftModel: process.env.COPY_DRAFT_MODEL || config.COPY_DRAFT_MODEL || (useDeepSeek ? 'deepseek-v4-pro' : 'gpt-5.2-chat-latest'),
    titleModel: process.env.COPY_TITLE_MODEL || config.COPY_TITLE_MODEL || (useDeepSeek ? 'deepseek-v4-flash' : ''),
    provider: useDeepSeek ? 'deepseek' : 'openai-compatible',
  };
}

function parseJsonObjectFromModel(content = '') {
  const text = String(content || '').trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    if (start >= 0) {
      let depth = 0;
      let inString = false;
      let escaped = false;
      for (let index = start; index < text.length; index += 1) {
        const char = text[index];
        if (escaped) {
          escaped = false;
          continue;
        }
        if (char === '\\') {
          escaped = true;
          continue;
        }
        if (char === '"') {
          inString = !inString;
          continue;
        }
        if (inString) continue;
        if (char === '{') depth += 1;
        if (char === '}') {
          depth -= 1;
          if (depth === 0) return JSON.parse(text.slice(start, index + 1));
        }
      }
    }
    throw new Error('模型没有返回可解析的 JSON。');
  }
}

function asText(value = '') {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value.map((item) => asText(item)).filter(Boolean).join('\n');
  if (value && typeof value === 'object') {
    return [
      value.title,
      value.body,
      value.content,
      value.copy,
      value.text,
    ].map((item) => asText(item)).filter(Boolean).join('\n\n');
  }
  return String(value || '').trim();
}

function normalizeStringArray(value, fallback = []) {
  const source = Array.isArray(value) ? value : (typeof value === 'string' ? value.split(/\r?\n/) : fallback);
  return source.map((item) => asText(item).replace(/^\d+[\.、]\s*/, '').trim()).filter(Boolean);
}

function normalizeDraftShape(raw = {}, payload = {}) {
  const selectedTitle = asText(raw.selectedTitle || payload.selectedTitle || raw.title || raw.xhsCopy?.title || payload.topic?.title || payload.keyword || '未命名标题');
  const titleChoices = normalizeStringArray(raw.titleChoices, [selectedTitle]).slice(0, 8);
  if (!titleChoices.includes(selectedTitle)) titleChoices.unshift(selectedTitle);
  const copyBlueprint = normalizeCopyBlueprint(raw.copyBlueprint || raw.blueprint || raw.contentBlueprint, payload, selectedTitle);
  const xhsSource = raw.xhsCopy || {};
  const xhsTitle = asText(xhsSource.title || selectedTitle);
  const xhsBody = asText(xhsSource.body || xhsSource.content || xhsSource.copy || raw.body || raw.copy || raw.xhsCopy);
  const imagePlan = normalizeStringArray(raw.imagePlan || xhsSource.imagePlan || xhsSource.images || xhsSource.cards, []);
  const tags = normalizeStringArray(xhsSource.tags || raw.tags || raw.hashtags, []);
  const videoSource = raw.videoScript || {};
  const videoScript = typeof videoSource === 'string' ? videoSource : {
    title: asText(videoSource.title || selectedTitle),
    hook: asText(videoSource.hook || ''),
    voiceover: asText(videoSource.voiceover || videoSource.body || ''),
    shotList: normalizeStringArray(videoSource.shotList || videoSource.shots, []),
    riskNote: asText(videoSource.riskNote || raw.riskNote || ''),
  };
  return {
    titleChoices: [...new Set(titleChoices)].slice(0, 8),
    selectedTitle,
    copyBlueprint,
    diagnosis: {
      attention: asText(raw.diagnosis?.attention || '源头帖有真实互动数据，说明这个问题值得做。'),
      emotion: asText(raw.diagnosis?.emotion || payload.topic?.pain || ''),
      copyable: asText(raw.diagnosis?.copyable || '复制痛点、结构和收藏动机，不复制原文。'),
      notCopy: asText(raw.diagnosis?.notCopy || payload.topic?.risk || '不照抄原帖，不承诺效果。'),
      translation: asText(raw.diagnosis?.translation || '翻译成客户自己的业务表达和行动入口。'),
      publishable: asText(raw.diagnosis?.publishable || '先发布一篇可收藏图文，确认后再做配图和视频。'),
    },
    xhsCopy: {
      title: xhsTitle,
      body: xhsBody,
      imagePlan,
      tags,
    },
    videoScript,
    imagePlan,
    riskNote: asText(raw.riskNote || payload.topic?.risk || ''),
  };
}

function normalizeDraftFromModelText(content = '', payload = {}) {
  const text = asText(content);
  if (text.length < 80) return null;
  const selectedTitle = asText(payload.selectedTitle || payload.topic?.title || payload.keyword || '未命名标题');
  const titleMatch = text.match(/(?:^|\n)\s*标题[:：]\s*(.+)/);
  const body = text
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```(?:json)?/g, '').replace(/```/g, ''))
    .replace(/^\s*标题[:：].+$/m, '')
    .trim();
  const title = asText(titleMatch?.[1] || selectedTitle);
  return normalizeDraftShape({
    titleChoices: [title],
    selectedTitle: title,
    diagnosis: {
      attention: '模型返回了可用正文，但格式不是标准 JSON；系统已保留模型原文并继续进入人工体检。',
      emotion: payload.topic?.pain || '',
      copyable: payload.topic?.rewrite || '',
      notCopy: payload.topic?.risk || '不照抄原帖，不承诺确定效果。',
      translation: '继续按当前标题和源头帖做人工确认。',
      publishable: '先确认正文，再生成配图或视频。',
    },
    xhsCopy: {
      title,
      body,
      imagePlan: [],
      tags: [],
    },
    videoScript: {
      title,
      hook: '',
      voiceover: body,
      shotList: [],
      riskNote: payload.topic?.risk || '',
    },
    imagePlan: [],
    riskNote: payload.topic?.risk || '',
  }, payload);
}

function collectPayloadComments(payload = {}) {
  const buckets = [
    payload.comments,
    payload.commentQuestions,
    payload.topic?.comments,
    payload.topic?.evidence?.comments,
    payload.sourcePost?.comments,
    payload.sourcePost?.commentQuestions,
    payload.topic?.sources?.flatMap?.((source) => source.comments || source.commentQuestions || []) || [],
  ];
  return [...new Set(buckets.flat().map(asText).filter(Boolean))]
    .filter((text) => !/暂未补抓|缺少评论|没有评论/.test(text))
    .slice(0, 12);
}

function inferTitleAngle(title = '') {
  const text = asText(title);
  if (/评论区|问最多|到底|怎么判断|是哪种/.test(text)) return '评论追问答疑：用评论区真实问题开场，先共情，再给判断路径';
  if (/医生|皮肤科|专业|成因|科学/.test(text)) return '专业背书科普：用更克制的专业视角解释边界和判断依据';
  if (/别|不要|误区|踩坑|没效果|白做|反黑/.test(text)) return '避坑反差：先指出常见错误，再给低风险替代动作';
  if (/自查|清单|三步|步骤|对照/.test(text)) return '自查清单：给用户可保存、可对照的判断流程';
  if (/项目|配合|护理|术后|修护/.test(text)) return '方案配合：讲项目前后配合、护理节奏和观察逻辑';
  return '用户故事拆解：从一个典型困惑切入，写成有场景的解决思路';
}

function pickQuestionForTitle(title = '', questions = [], payload = {}) {
  const text = asText(title);
  const matched = questions.find((question) => {
    if (/反黑|皮秒|项目|术后|护理/.test(text) && /反黑|皮秒|项目|术后|护理/.test(question)) return true;
    if (/黄褐斑|内分泌|刺激/.test(text) && /黄褐斑|内分泌|刺激/.test(question)) return true;
    if (/哪种|类型|分清|判断|自查/.test(text) && /哪种|类型|判断|分不清|怎么/.test(question)) return true;
    if (/买|精华|产品|没效果/.test(text) && /产品|精华|没效果|买/.test(question)) return true;
    return false;
  });
  return matched || questions[0] || asText(payload.topic?.pain || payload.sourcePost?.summary || payload.keyword || '用户不知道下一步该怎么判断');
}

function buildCommentDrivenCopyStrategy(payload = {}) {
  const selectedTitle = asText(payload.selectedTitle || payload.topic?.title || payload.keyword || '');
  const questions = collectPayloadComments(payload);
  const selectedQuestion = pickQuestionForTitle(selectedTitle, questions, payload);
  const angle = inferTitleAngle(selectedTitle);
  const sourceTitle = asText(payload.sourcePost?.title || payload.topic?.sources?.[0]?.title || payload.topic?.title || '');
  return {
    selectedTitle,
    selectedAngle: angle,
    selectedQuestion,
    commentQuestions: questions,
    sourceTitle,
    mustChangeWithTitle: [
      '开头第一段必须围绕 selectedQuestion，不要复用上一版开头。',
      '主体结构必须围绕 selectedAngle，不要每个标题都写同一套分类清单。',
      '行动入口必须随标题变化：答疑型引导发图初判，避坑型引导先停手检查，自查型引导收藏清单，专业型引导面诊/评估。',
      '如果标题变了，正文的段落顺序、重点和结尾 CTA 都要变。',
    ],
    forbiddenSameness: [
      '禁止连续输出同样的四种类型逐条科普。',
      '禁止只把“姐妹/医生/皮肤管理师”身份换一下。',
      '禁止正文 70% 以上和上一版结构相同。',
    ],
  };
}

function normalizeCopyBlueprint(raw = {}, payload = {}, selectedTitle = '') {
  const strategy = payload.contentStrategy || buildCommentDrivenCopyStrategy({ ...payload, selectedTitle });
  const title = asText(selectedTitle || raw.selectedTitle || strategy.selectedTitle || payload.selectedTitle || payload.topic?.title || '');
  const angle = asText(raw.angle || raw.contentAngle || strategy.selectedAngle || inferTitleAngle(title));
  const question = asText(raw.mainQuestion || raw.selectedQuestion || strategy.selectedQuestion || pickQuestionForTitle(title, collectPayloadComments(payload), payload));
  const formula = asText(raw.titleFormula || raw.formula || inferXhsTitleFormula(title));
  const audience = asText(raw.audience || raw.targetAudience || inferAudienceFromQuestion(question, payload));
  const structure = normalizeStringArray(raw.structure || raw.articleStructure || raw.outline, defaultArticleStructure(angle, question));
  const opening = asText(raw.openingStrategy || raw.hookStrategy || defaultOpeningStrategy(angle, question));
  const cta = asText(raw.conversionPath || raw.cta || defaultConversionPath(angle));
  const qualityChecks = normalizeStringArray(raw.qualityChecks || raw.checklist, [
    '选题回答一个真实评论问题，不写泛科普。',
    '标题有公式来源，留悬念，不把答案说完。',
    '开头独立成立，5 秒内给出话题、Hook 和可信度。',
    '正文有具体场景、判断路径和低风险行动。',
    '表达干净，不堆术语、不写百科腔、不承诺效果。',
  ]);
  return {
    mainQuestion: question,
    targetAudience: audience,
    angle,
    titleFormula: formula,
    structure,
    openingStrategy: opening,
    conversionPath: cta,
    qualityChecks,
    sourceMethod: 'Longka 爆款拆解：评论问题 + 标题公式 + 内容诊断 + AI 味体检',
  };
}

function inferXhsTitleFormula(title = '') {
  const text = asText(title);
  if (/为什么|其实|不是/.test(text)) return '认知冲突型：打破已有判断';
  if (/别|不要|没效果|白做|踩坑|反黑/.test(text)) return '恐惧/损失规避型：指出错误代价';
  if (/评论区|问最多|到底/.test(text)) return '互动/评论问题型：把真实追问变选题';
  if (/\d|几种|三步|自查|清单/.test(text)) return '数字锚定型：降低理解成本';
  if (/医生|皮肤科|专业/.test(text)) return '权威借力型：用专业视角建立可信度';
  if (/如果|适合|该不该/.test(text)) return '场景/条件型：匹配用户当前状态';
  return '身份代入型：让目标用户觉得说的就是自己';
}

function inferAudienceFromQuestion(question = '', payload = {}) {
  const text = `${question} ${payload.keyword || ''}`;
  if (/反黑|皮秒|项目|术后/.test(text)) return '做过或准备做项目、担心踩坑和反复的人';
  if (/黄褐斑|内分泌|刺激/.test(text)) return '怀疑自己是黄褐斑、怕越弄越严重的人';
  if (/精华|产品|买|没效果/.test(text)) return '买过淡斑产品但没有明显改善的人';
  if (/哪种|判断|分不清|自查/.test(text)) return '刚开始淡斑、还分不清自己问题类型的人';
  return asText(payload.industry || '当前行业客户');
}

function defaultArticleStructure(angle = '', question = '') {
  if (/评论追问/.test(angle)) return [
    `用评论区原问题开场：${question}`,
    '解释为什么很多人会卡在这个判断点',
    '给 3 个普通人能自查的判断依据',
    '点出最容易误判的一步',
    '给出低风险下一步行动',
  ];
  if (/避坑/.test(angle)) return [
    '先写一个常见错误动作',
    '说明这个动作为什么容易带来反复或踩坑',
    '拆出正确顺序：先判断、再护理、再决定项目/产品',
    '给出今天就能停止的错误和能开始的小动作',
    '用合规方式引导咨询或评估',
  ];
  if (/自查/.test(angle)) return [
    '先说明这篇适合谁收藏',
    '给 3-5 个自查问题',
    '每个问题配一个判断标准',
    '提醒不能自己下结论的边界',
    '引导保存清单或发图初判',
  ];
  if (/专业/.test(angle)) return [
    '先用克制口吻说明误区',
    '解释成因和边界，不直接承诺改善',
    '拆出专业判断时会看的几个维度',
    '指出普通人最容易忽略的风险',
    '引导做专业评估',
  ];
  return [
    `围绕主问题开场：${question}`,
    '给一个真实场景',
    '拆出问题背后的原因',
    '给可执行判断路径',
    '给下一步行动入口',
  ];
}

function defaultOpeningStrategy(angle = '', question = '') {
  if (/评论追问/.test(angle)) return `第一句直接引用或转述评论区追问：${question}`;
  if (/避坑/.test(angle)) return '第一句先指出一个用户正在做、但可能导致走弯路的动作。';
  if (/自查/.test(angle)) return '第一句告诉用户这篇可以用来对照自己，不直接给结论。';
  if (/专业/.test(angle)) return '第一句用克制专业语气指出“先判断再处理”的必要性。';
  return '第一句给具体场景，不写空泛结论。';
}

function defaultConversionPath(angle = '') {
  if (/评论追问|自查/.test(angle)) return '引导保存清单；分不清时发清晰照片做初步判断。';
  if (/避坑/.test(angle)) return '引导先停下错误动作，再做肤况评估。';
  if (/专业/.test(angle)) return '引导做专业检测或面诊，不承诺结果。';
  return '引导低成本评估，再决定下一步。';
}

async function generateSopRewriteDraft(payload = {}) {
  const cfg = await readOperatorAiConfig();
  if (!cfg.apiKey) return { ok: false, error: 'missing_ai_key', message: '缺少 AIGOCODE_API_KEY，无法按 SOP 生成二创文案。' };
  const commentDrivenStrategy = buildCommentDrivenCopyStrategy(payload);
  const system = [
    '你是 Longka AI Native 内容生产系统的资深小红书/短视频内容策划。',
    '你必须严格按“爆款采集分析 SOP：从爬虫样本到自己的内容框架”工作。',
    '不要套固定模板，不要只替换标题，不要复述原帖。',
    '必须基于用户在第四步选中的单条源头帖、评论问题、互动数据和第五步选中的标题做二次创作。',
    '评论区问题是选题入口，不是装饰性证据。每次写正文前，必须先选定一个评论问题作为本篇文章的主问题。',
    '不同标题必须对应不同主问题、不同开头、不同正文结构和不同行动入口；禁止把同一篇科普正文换标题重复输出。',
    '必须保留：原帖打中的真实痛点、情绪价值、可复制结构、评论区问题、收藏动机。',
    '必须替换：措辞、案例结论、品牌承诺、行动入口，改成用户自己的业务表达。',
    '美业/护肤/医美内容不得承诺祛斑、根治、必然有效，不替代专业诊断。',
    '硬约束：xhsCopy.title 必须逐字使用 payload.selectedTitle，禁止模型自拟新标题。',
    '硬约束：正文必须围绕 payload.topic/sourcePost 的 title、content、pain、comments 写，不得跳到无关案例、无关行业或无关主题。',
    '硬约束：除非源头素材明确提供真实经历，不得虚构“我上周帮客户”“我见过一个客户”“医生说”等第一人称或权威案例。',
    '硬约束：小红书正文要像真实运营者写给读者的口语内容，少用“首先/其次/最后/其实根源就一个/正确的废话”等 AI 腔连接。',
    '输出必须是 JSON，不要 Markdown，不要解释。',
  ].join('\n');
  const user = {
    task: '根据第四步选中的源头帖，按 SOP 生成第五步可给客户确认的二创稿。',
    sourceEvidence: {
      selectedTitle: asText(payload.selectedTitle),
      sourceTitle: asText(payload.topic?.title || payload.sourcePost?.title || payload.sourceTopic?.title),
      sourcePain: asText(payload.topic?.pain || payload.sourcePost?.summary || payload.sourceTopic?.pain),
      sourceContent: asText(payload.topic?.content || payload.sourcePost?.content || payload.sourceTopic?.content).slice(0, 1200),
      sourceComments: collectPayloadComments(payload),
      businessLine: asText(payload.businessLine || payload.keyword),
      rule: '正文只能使用这些源头证据展开。没有出现在源头证据里的案例、数字、身份、结果，不准编。',
    },
    requiredOutput: {
      titleChoices: '6 个标题。每个标题必须从源头帖不同角度改写，不能只有一个源头标题变体。',
      selectedTitle: '使用用户已选择标题；如果为空，使用第一个标题。',
      diagnosis: {
        attention: '为什么这个题能做',
        emotion: '真正打动用户的情绪',
        copyable: '我们复制什么结构',
        notCopy: '不能复制什么',
        translation: '怎么翻译成客户自己的业务',
        publishable: '今天能发布什么',
      },
      xhsCopy: '完整小红书图文，字段为 title/body/imagePlan/tags。body 控制在 600-900 中文字，必须像真实运营稿，不要写内部分析腔。',
      structureRequirement: '正文必须按 contentStrategy.selectedAngle 写，不同标题换正文结构。不要每次都写“四种类型逐条科普”。',
      commentRequirement: '正文必须明显回应 contentStrategy.selectedQuestion，并自然吸收 1-2 个评论区追问。',
      videoScript: '短视频脚本摘要，字段为 title/hook/voiceover/shotList/riskNote。',
      imagePlan: '5 张图文卡片建议，每张一句话，必须贴合源头帖主题。',
      riskNote: '发布前合规提醒。',
    },
    contentStrategy: commentDrivenStrategy,
    context: { ...payload, contentStrategy: commentDrivenStrategy },
  };
  function validateDraftBody(draft, requestUser = {}) {
    const titleOnlyTask = /只根据|不要写正文/.test(asText(requestUser.task));
    if (titleOnlyTask) return { ok: true };
    const format = asText(payload.selectedFormat || payload.platform || '');
    const body = /视频/.test(format)
      ? asText(draft.videoScript?.voiceover || draft.xhsCopy?.body)
      : asText(draft.xhsCopy?.body);
    if (body.length < 180) {
      return {
        ok: false,
        error: 'ai_empty_body',
        message: '模型只返回了标题，没有返回可验收正文。',
      };
    }
    const selectedTitle = asText(payload.selectedTitle);
    const returnedTitle = asText(draft.xhsCopy?.title || draft.selectedTitle);
    if (selectedTitle && returnedTitle && returnedTitle !== selectedTitle) {
      return {
        ok: false,
        error: 'ai_title_mismatch',
        message: `模型改写了标题。必须逐字使用用户选中的标题：${selectedTitle}`,
      };
    }
    const sourceText = [
      payload.topic?.title,
      payload.topic?.pain,
      payload.topic?.content,
      payload.sourcePost?.title,
      payload.sourcePost?.summary,
      payload.sourcePost?.content,
      payload.sourceTopic?.title,
      payload.sourceTopic?.pain,
      payload.sourceTopic?.content,
      ...(collectPayloadComments(payload) || []),
    ].map(asText).join(' ');
    const fictionalPattern = /我收到|我见过|我让她|上周|前几天|一个客户|一个姐妹|小眼睛|涨到|掉到|翻\s*\d+\s*倍|月入|宝妈|医生说|专家说/;
    if (fictionalPattern.test(body) && !fictionalPattern.test(sourceText)) {
      return {
        ok: false,
        error: 'ai_fictional_case',
        message: '模型虚构了源头素材里不存在的案例、身份、数据或结果。',
      };
    }
    const knownSourcePhrases = ['内容资产库', '不知道发什么', 'AI 味', 'AI味', '素材', '沉淀', 'Agent', '工作流', 'AI自媒体', 'AI 内容'];
    const anchors = [...new Set([
      ...splitQueryWords(`${payload.businessLine || ''} ${payload.keyword || ''}`).filter((word) => word.length >= 2),
      ...knownSourcePhrases.filter((word) => sourceText.includes(word)),
    ])].slice(0, 10);
    const hitCount = anchors.filter((word) => body.includes(word)).length;
    if (anchors.length >= 3 && hitCount < 1) {
      return {
        ok: false,
        error: 'ai_source_drift',
        message: '正文没有咬住源头素材和业务关键词，疑似跑题。',
      };
    }
    return { ok: true };
  }

  async function requestDraft(model, timeoutMs, requestUser = user) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const requestBody = {
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: JSON.stringify(requestUser, null, 2) },
        ],
        response_format: { type: 'json_object' },
        max_tokens: Number(process.env.COPY_MAX_TOKENS || 3200),
        temperature: 0.4,
      };
      if (cfg.provider === 'deepseek') {
        requestBody.thinking = { type: 'disabled' };
      }
      const response = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${cfg.apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify(requestBody),
      });
      const raw = await response.text();
      if (!response.ok) {
        return { ok: false, error: 'ai_request_failed', message: `AI 文案接口失败 HTTP ${response.status}`, detail: raw.slice(0, 500), model };
      }
      const data = JSON.parse(raw);
      const content = data.choices?.[0]?.message?.content || '';
      try {
        const draft = normalizeDraftShape(parseJsonObjectFromModel(content), payload);
        if (payload.selectedTitle) {
          draft.selectedTitle = asText(payload.selectedTitle);
          draft.xhsCopy = { ...(draft.xhsCopy || {}), title: asText(payload.selectedTitle) };
        }
        const bodyCheck = validateDraftBody(draft, requestUser);
        if (!bodyCheck.ok) return { ...bodyCheck, detail: content.slice(0, 500), model };
        return { ok: true, draft, model };
      } catch (error) {
        const textDraft = normalizeDraftFromModelText(content, payload);
        if (textDraft) {
          if (payload.selectedTitle) {
            textDraft.selectedTitle = asText(payload.selectedTitle);
            textDraft.xhsCopy = { ...(textDraft.xhsCopy || {}), title: asText(payload.selectedTitle) };
          }
          const bodyCheck = validateDraftBody(textDraft, requestUser);
          if (!bodyCheck.ok) return { ...bodyCheck, detail: content.slice(0, 500), model, parseError: error.message };
          return { ok: true, draft: textDraft, model, recoveredFromText: true, parseError: error.message };
        }
        return { ok: false, error: 'ai_parse_or_request_failed', message: error.message, detail: content.slice(0, 500), model };
      }
    } catch (error) {
      return {
        ok: false,
        error: error.name === 'AbortError' ? 'ai_request_timeout' : 'ai_parse_or_request_failed',
        message: error.name === 'AbortError' ? `AI 文案接口超过 ${timeoutMs / 1000} 秒未返回。` : error.message,
        model,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async function requestTitleChoices(model, timeoutMs) {
    const titleUser = {
      task: '只根据第四步选中的真实源头帖，快速生成第五步候选标题和选题诊断。不要写正文。',
      requiredOutput: {
        titleChoices: '6 个候选标题，必须来自同一条源头帖的不同角度：痛点、误区、清单、反差、行动、评论问题。',
        selectedTitle: '如果用户已经选过标题，用用户选过的标题；否则用第一个候选标题。',
        diagnosis: user.requiredOutput.diagnosis,
        xhsCopy: '只返回空对象或只包含 title，不要写 body。',
        videoScript: '只返回空对象。',
        imagePlan: '只返回 5 个卡片方向短句。',
        riskNote: '合规提醒。',
      },
      context: payload,
    };
    return requestDraft(model, timeoutMs, titleUser);
  }

  let seededTitleChoices = null;
  let seededDiagnosis = null;
  let seededImagePlan = null;
  const titleModel = cfg.titleModel;
  if (!payload.selectedTitle && titleModel && titleModel !== (cfg.draftModel || cfg.model)) {
    const titleResult = await requestTitleChoices(titleModel, Number(process.env.COPY_TITLE_TIMEOUT_MS || 25000));
    if (titleResult.ok) {
      seededTitleChoices = titleResult.draft.titleChoices;
      seededDiagnosis = titleResult.draft.diagnosis;
      seededImagePlan = titleResult.draft.imagePlan;
      if (!payload.selectedTitle && seededTitleChoices?.[0]) payload.selectedTitle = seededTitleChoices[0];
    }
  }

  const primaryModel = cfg.draftModel || cfg.model;
  const bodyUser = seededTitleChoices ? {
    ...user,
    fastTitleStage: {
      model: titleModel,
      titleChoices: seededTitleChoices,
      diagnosis: seededDiagnosis,
      imagePlan: seededImagePlan,
      instruction: '这些标题来自快速标题阶段。正文必须绑定 selectedTitle，不要重新发散成另一组标题。',
    },
    requiredOutput: {
      ...user.requiredOutput,
      titleChoices: '必须原样保留 fastTitleStage.titleChoices，不要重写标题列表。',
    },
  } : user;
  const primary = await requestDraft(primaryModel, Number(process.env.COPY_REQUEST_TIMEOUT_MS || 18000), bodyUser);
  if (primary.ok && seededTitleChoices) {
    primary.draft.titleChoices = seededTitleChoices;
    primary.draft.diagnosis = primary.draft.diagnosis || seededDiagnosis;
    primary.titleModel = titleModel;
  }
  if (primary.ok) return primary;
  const retryableErrors = new Set(['ai_parse_or_request_failed', 'ai_request_timeout', 'ai_request_failed', 'ai_empty_body', 'ai_fictional_case', 'ai_source_drift', 'ai_title_mismatch']);
  if (!retryableErrors.has(primary.error)) return primary;

  const retryModel = process.env.COPY_RETRY_MODEL || 'gpt-5.2-chat-latest';
  if (retryModel === primaryModel && !['ai_parse_or_request_failed', 'ai_empty_body', 'ai_fictional_case', 'ai_source_drift', 'ai_title_mismatch'].includes(primary.error)) return primary;
  const retryUser = {
    ...user,
    fastTitleStage: seededTitleChoices ? {
      model: titleModel,
      titleChoices: seededTitleChoices,
      diagnosis: seededDiagnosis,
      imagePlan: seededImagePlan,
      instruction: '必须保留这些标题。正文只围绕 selectedTitle 写完整可发布稿。',
    } : undefined,
    retryReason: `上一次模型返回不可验收：${primary.message}`,
    strictRewriteMode: [
      '禁止故事化。不要写“我收到私信/我见过客户/我让她改/涨了多少”。',
      '只围绕 sourceEvidence 写：内容资产库、每天不知道发什么、AI 味、长期素材沉淀。',
      '正文可以写成“很多人会卡在...”这种观察，但不能编具体人物、时间、数据和结果。',
      '标题必须保持 selectedTitle。正文第一段必须直接回应 selectedTitle。',
    ],
    requiredOutput: {
      ...user.requiredOutput,
      strictJson: '必须输出单个合法 JSON 对象。不要代码块，不要尾注，不要多余文字，数组元素之间必须有逗号。',
      hardRequirement: 'xhsCopy.body 必须是 600-900 中文字完整正文。只返回标题、空正文、提纲或解释都算失败。',
    },
  };
  const retry = await requestDraft(retryModel, Number(process.env.COPY_RETRY_TIMEOUT_MS || 45000), retryUser);
  return retry.ok ? { ...retry, retriedFrom: primaryModel } : { ...retry, firstError: primary };
}

async function exportXhsCards(assetId) {
  const { stdout } = await execFileAsync(process.execPath, ['tools/export-xhs-cards.mjs', `--asset=${assetId}`], {
    cwd: root,
    env: { ...process.env, AI_NATIVE_BASE_URL: `http://localhost:${port}` },
    windowsHide: true,
    maxBuffer: 1024 * 1024 * 4,
  });
  const start = stdout.indexOf('{');
  const end = stdout.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('导出脚本没有返回 manifest。');
  return JSON.parse(stdout.slice(start, end + 1));
}

async function runNodeTool(scriptName, args = []) {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [join(root, 'tools', scriptName), ...args], {
      cwd: root,
      env: { ...process.env, AI_NATIVE_BASE_URL: `http://localhost:${port}` },
      windowsHide: true,
      maxBuffer: 1024 * 1024 * 12,
    });
    const start = stdout.indexOf('{');
    const end = stdout.lastIndexOf('}');
    const parsed = start >= 0 && end >= start ? JSON.parse(stdout.slice(start, end + 1)) : {};
    return { ok: true, ...parsed, stderr: String(stderr || '').trim() };
  } catch (error) {
    return {
      ok: false,
      error: 'tool_failed',
      script: scriptName,
      message: error.message,
      stdout: String(error.stdout || '').slice(-4000),
      stderr: String(error.stderr || '').slice(-4000),
    };
  }
}

async function exportVideoPackageForXiaomei(asset) {
  const video = asset.structured.videoPackage;
  const targetRoot = process.env.XIAOMEI_VIDEO_ROOT || 'E:\\Codex\\my-video';
  const jobRoot = join(targetRoot, 'video-workbench', 'ai-native-jobs');
  const safeId = String(asset.id || randomUUID()).replace(/[^\w.-]+/g, '_');
  const jobDir = join(jobRoot, safeId);
  await mkdir(jobDir, { recursive: true });

  const scriptText = Array.isArray(video.script) ? video.script.join('\n') : '';
  const shotText = Array.isArray(video.shotList) ? video.shotList.join('\n') : '';
  const approvedTemplates = selectXiaomeiTemplates(video);
  const copyPlan = {
    drafts: approvedTemplates.map((id) => ({
      id,
      name: xiaomeiTemplateName(id),
      note: `AI Native 选题：${asset.title}`,
      hook: video.script?.[0] || video.coverText || asset.title,
      copy: [
        video.coverText || asset.title,
        scriptText,
        '',
        '分镜素材：',
        shotText,
      ].filter(Boolean).join('\n'),
      approved: true,
    })),
    generatedAt: new Date().toISOString(),
    source: 'ai-native-command-center',
    assetId: asset.id,
  };
  const taskPackage = {
    exportedAt: new Date().toISOString(),
    assetId: asset.id,
    assetTitle: asset.title,
    endpoint: asset.structured.closureEvidence?.endpoint || '图文 + 视频双产物可交付',
    videoPackage: video,
    xiaomei: {
      targetRoot,
      copyPlanFile: join(targetRoot, 'out', 'standard', 'copy-plan.json'),
      jobDir,
      approvedTemplates,
      nextCommand: 'npm run videos:workbench',
      generateCommand: `npm run videos:xiaomei -- --only ${approvedTemplates.join(',')} --with-voiceover`,
    },
  };
  await mkdir(join(targetRoot, 'out', 'standard'), { recursive: true });
  await writeFile(join(targetRoot, 'out', 'standard', 'copy-plan.json'), JSON.stringify(copyPlan, null, 2), 'utf8');
  await writeFile(join(jobDir, 'copy-plan.json'), JSON.stringify(copyPlan, null, 2), 'utf8');
  await writeFile(join(jobDir, 'video-package.json'), JSON.stringify(taskPackage, null, 2), 'utf8');
  await writeFile(join(jobDir, 'README.md'), buildXiaomeiJobReadme(taskPackage), 'utf8');
  return {
    exportedAt: taskPackage.exportedAt,
    assetId: asset.id,
    jobDir,
    copyPlanFile: taskPackage.xiaomei.copyPlanFile,
    approvedTemplates,
    nextCommand: taskPackage.xiaomei.nextCommand,
    generateCommand: taskPackage.xiaomei.generateCommand,
  };
}

async function exportAdhocVideoJobForXiaomei(payload = {}) {
  const targetRoot = process.env.XIAOMEI_VIDEO_ROOT || 'E:\\Codex\\my-video';
  const jobRoot = join(targetRoot, 'video-workbench', 'ai-native-jobs');
  const jobId = `v2-${Date.now()}`;
  const jobDir = join(jobRoot, jobId);
  await mkdir(jobDir, { recursive: true });
  const title = String(payload.title || payload.topic || 'AI Native 视频任务').trim();
  const platform = String(payload.platform || '抖音短视频').trim();
  const script = Array.isArray(payload.script) ? payload.script : String(payload.script || '').split(/\r?\n/).filter(Boolean);
  const shotList = Array.isArray(payload.shotList) ? payload.shotList : [];
  const videoPackage = {
    type: `${platform}生产线`,
    status: '待交给小妹视频工作台合成',
    title: `宣传短视频：${title}`,
    coverText: payload.coverText || `${title}，先看这一幕`,
    duration: payload.duration || '25-40 秒',
    templateSuggestions: payload.templateSuggestions || ['痛点开场版', '小程序流程版', '样片展示版'],
    materialMode: payload.materialMode || '来源帖子截图、评论截图、产品/小程序录屏、案例素材',
    script,
    shotList,
    source: payload.source || {},
    acceptance: [
      '必须有封面、旁白、背景音乐和成片文件',
      '必须有真实来源截图或产品操作录屏，不能只做静态文字',
      '开头 3 秒必须有痛点、反差或强结果',
    ],
  };
  const copyPlan = {
    drafts: [{
      id: 'ai-native-v2-video',
      name: platform,
      note: `AI Native V2 选题：${title}`,
      hook: script[0] || videoPackage.coverText,
      copy: [videoPackage.coverText, ...script, '', '分镜素材：', ...shotList].join('\n'),
      approved: true,
    }],
    generatedAt: new Date().toISOString(),
    source: 'ai-native-workbench-v2',
    assetId: jobId,
  };
  const taskPackage = {
    exportedAt: new Date().toISOString(),
    assetId: jobId,
    assetTitle: title,
    endpoint: 'V2 选题到小妹视频工作台',
    videoPackage,
    xiaomei: {
      targetRoot,
      copyPlanFile: join(targetRoot, 'out', 'standard', 'copy-plan.json'),
      jobDir,
      approvedTemplates: ['ai-native-v2-video'],
      nextCommand: 'npm run videos:workbench',
      generateCommand: 'npm run videos:xiaomei -- --only ai-native-v2-video --with-voiceover',
    },
  };
  await mkdir(join(targetRoot, 'out', 'standard'), { recursive: true });
  await writeFile(join(targetRoot, 'out', 'standard', 'copy-plan.json'), JSON.stringify(copyPlan, null, 2), 'utf8');
  await writeFile(join(jobDir, 'copy-plan.json'), JSON.stringify(copyPlan, null, 2), 'utf8');
  await writeFile(join(jobDir, 'video-package.json'), JSON.stringify(taskPackage, null, 2), 'utf8');
  await writeFile(join(jobDir, 'README.md'), buildXiaomeiJobReadme(taskPackage), 'utf8');
  return {
    exportedAt: taskPackage.exportedAt,
    assetId: jobId,
    jobDir,
    copyPlanFile: taskPackage.xiaomei.copyPlanFile,
    approvedTemplates: taskPackage.xiaomei.approvedTemplates,
    nextCommand: taskPackage.xiaomei.nextCommand,
    generateCommand: taskPackage.xiaomei.generateCommand,
    generationStarted: false,
    generationPid: null,
    generationMessage: '已按 harness 只生成小妹视频任务包，未自动启动视频生成。请在网页端继续确认后再进入成片制作。',
  };
}

function startXiaomeiVideoGeneration(targetRoot, templates = []) {
  try {
    const only = templates.join(',');
    const command = `start /b npm run videos:xiaomei -- --only ${only} --with-voiceover`;
    const child = spawn('cmd.exe', ['/d', '/s', '/c', command], {
      cwd: targetRoot,
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.unref();
    return { ok: true, pid: child.pid, message: '已启动小妹视频工作台后台生成进程。' };
  } catch (error) {
    return { ok: false, message: `任务包已写入，但自动启动失败：${error.message}` };
  }
}

function selectXiaomeiTemplates(video = {}) {
  const text = [
    video.type,
    video.title,
    video.coverText,
    video.materialMode,
    video.source?.type,
    video.source?.name,
    ...(video.script || []),
    ...(video.shotList || []),
  ].filter(Boolean).join(' ');
  if (/AI Native|ai-native|选题|关键词|脚本|口播|判断清单|客户问题|内容生产|图文|短视频/i.test(text)) {
    return ['ai-native-v2-video'];
  }
  const ids = new Set(['miniapp-flow']);
  if (/痛点|问题|困扰|不知道/.test(text)) ids.add('pain-hook');
  if (/样片|报告|结果|卡片/.test(text)) ids.add('sample-showcase');
  if (/对比|原图|前后/.test(text)) ids.add('before-after');
  return [...ids].slice(0, 4);
}

function xiaomeiTemplateName(id) {
  const map = {
    'pain-hook': '痛点开场版',
    'sample-showcase': '样片展示版',
    'miniapp-flow': '小程序流程版',
    'before-after': '报告对照版',
  };
  return map[id] || id;
}

function buildXiaomeiJobReadme(taskPackage) {
  return [
    `# ${taskPackage.assetTitle}`,
    '',
    `来源：AI Native 内容生产闭环`,
    `闭环终点：${taskPackage.endpoint}`,
    '',
    '## 下一步',
    `1. 打开小妹视频工作台：${taskPackage.xiaomei.nextCommand}`,
    '2. 检查已导入的文案，确认审核通过的模板。',
    '3. 选择合适素材组，生成封面、旁白、背景音乐和成片。',
    '',
    '## 推荐模板',
    ...taskPackage.xiaomei.approvedTemplates.map((id) => `- ${xiaomeiTemplateName(id)} (${id})`),
    '',
    '## 视频脚本',
    ...(taskPackage.videoPackage.script || []).map((line) => `- ${line}`),
    '',
    '## 分镜素材',
    ...(taskPackage.videoPackage.shotList || []).map((line) => `- ${line}`),
  ].join('\n');
}

function sendJson(res, value, status = 200) {
  const body = JSON.stringify(value);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(body), 'access-control-allow-origin': '*' });
  res.end(body);
}

function serveStatic(pathname, res) {
  const cleanPath = pathname === '/' ? '/workbench-v2.html' : pathname;
  const filePath = join(root, cleanPath.replace(/^\/+/, ''));
  if (!filePath.startsWith(root) || !existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  res.writeHead(200, { 'content-type': mimeTypes[extname(filePath)] || 'application/octet-stream' });
  createReadStream(filePath).pipe(res);
}
