import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { existsSync, createReadStream } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)));
const dataDir = join(root, 'data');
const dbPath = join(dataDir, 'command-center.json');
const verifiedClippingsDir = 'F:\\Longka Wiki\\龙咖Wiki\\Clippings';
const defaultClippingsDir = 'F:\\Longka Wiki\\龙咖Wiki\\Clippings';
const port = Number(process.env.PORT || 3760);
let dbWriteQueue = Promise.resolve();

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
    industry: ['AI 员工', 'AI Native', '小程序获客', '内容流水线'],
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
    name: '老板内容选题流水线',
    audience: '每天不知道发什么、缺少内容规划的小微企业老板',
    goal: '每天产出可发布选题、图文草稿和短视频脚本',
    status: '孵化中',
    createdAt: '2026-05-27T00:00:00.000Z',
  },
];

const seedMaterials = [
  makeSeedSignal('项目复盘', '客户说试看图不像本人，付费意愿会立刻下降。', 28, 17, 6, 3, 42, '像不像本人、值不值得付费'),
  makeSeedSignal('项目复盘', '小妹反馈：付款后看不到完整报告，会严重影响信任。', 36, 24, 8, 5, 55, '付款后看不到、交付不稳定'),
  makeSeedSignal('AI Native', '老板每天不知道发什么，需要一条选题流水线。', 92, 41, 33, 18, 76, '每天发什么、内容没规划'),
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

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'GET' && url.pathname === '/api/state') return sendJson(res, await readDb());

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

    if (req.method === 'POST' && url.pathname === '/api/pipeline/run') {
      const db = await readDb();
      const candidates = buildCandidates(db.config, db.rawMaterials);
      await mutateDb((nextDb) => {
        nextDb.candidates = candidates;
        nextDb.lastPipelineRunAt = new Date().toISOString();
        addActivity(nextDb, '运行流水线', `生成 ${candidates.length} 条候选选题`);
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
    { title: '老板每天不知道发什么，是因为没有选题流水线', match: ['老板', '选题', '内容', '每天', '流水线'], formula: 'QUEST', platform: '小红书 / 公众号' },
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

function inferPain(text = '') {
  if (text.includes('不像') || text.includes('本人')) return '担心不像本人';
  if (text.includes('付款') || text.includes('看不到')) return '担心付款后无交付';
  if (text.includes('发什么') || text.includes('选题')) return '每天不知道发什么';
  if (text.includes('朋友圈') || text.includes('分享')) return '想要可分享的成果';
  if (text.includes('男士')) return '男士想提升但怕变丑';
  return '需要进一步观察评论区';
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
      '建议下一步：运行选题流水线，交给内容员工做初稿。',
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
    candidates: Array.isArray(payload.candidates) ? payload.candidates : [],
    topics: Array.isArray(payload.topics) ? payload.topics : [],
    tasks: Array.isArray(payload.tasks) ? payload.tasks : [],
    assets: Array.isArray(payload.assets) ? payload.assets : [],
    lastPipelineRunAt: payload.lastPipelineRunAt || null,
    updatedAt: payload.updatedAt || new Date().toISOString(),
  };
}

async function ensureDb() {
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
    candidates: [],
    topics: [],
    tasks: [],
    assets: [],
    lastPipelineRunAt: null,
    updatedAt: new Date().toISOString(),
  });
}

async function readDb() {
  const db = JSON.parse(await readFile(dbPath, 'utf8'));
  return {
    company: normalizeCompany(db.company),
    currentProjectId: db.currentProjectId || defaultProjects[0].id,
    projects: normalizeProjects(db.projects),
    activityLog: Array.isArray(db.activityLog) ? db.activityLog.slice(0, 80) : [],
    config: normalizeConfig(db.config),
    workbench: normalizeWorkbench(db.workbench),
    rawMaterials: Array.isArray(db.rawMaterials) ? db.rawMaterials : [],
    candidates: Array.isArray(db.candidates) ? db.candidates : [],
    topics: Array.isArray(db.topics) ? db.topics : [],
    tasks: Array.isArray(db.tasks) ? db.tasks : [],
    assets: Array.isArray(db.assets) ? db.assets : [],
    lastPipelineRunAt: db.lastPipelineRunAt || null,
    updatedAt: db.updatedAt || null,
  };
}

async function writeDb(db) {
  dbWriteQueue = dbWriteQueue.then(() => writeFile(dbPath, JSON.stringify(db, null, 2), 'utf8'));
  await dbWriteQueue;
}

async function mutateDb(mutator) {
  dbWriteQueue = dbWriteQueue.then(async () => {
    const db = await readDb();
    await mutator(db);
    await writeFile(dbPath, JSON.stringify(db, null, 2), 'utf8');
  });
  await dbWriteQueue;
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function sendJson(res, value, status = 200) {
  const body = JSON.stringify(value);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(body), 'access-control-allow-origin': '*' });
  res.end(body);
}

function serveStatic(pathname, res) {
  const cleanPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = join(root, cleanPath.replace(/^\/+/, ''));
  if (!filePath.startsWith(root) || !existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  res.writeHead(200, { 'content-type': mimeTypes[extname(filePath)] || 'application/octet-stream' });
  createReadStream(filePath).pipe(res);
}
