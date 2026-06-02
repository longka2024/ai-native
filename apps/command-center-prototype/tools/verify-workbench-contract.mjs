import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const files = {
  html: resolve(root, 'workbench-v2.html'),
  js: resolve(root, 'workbench-v2.js'),
  step1Gate: resolve(root, 'workbench-step1-gate.js'),
  step2Deconstruct: resolve(root, 'workbench-step2-deconstruct.js'),
  step3QuestionBank: resolve(root, 'workbench-step3-question-bank.js'),
  step4TitleFormulas: resolve(root, 'workbench-step4-title-formulas.js'),
  step5CopyBlueprint: resolve(root, 'workbench-step5-copy-blueprint.js'),
  step6ContentAction: resolve(root, 'workbench-content-action-panel.js'),
  step7ProductionBrief: resolve(root, 'workbench-step7-production-brief.js'),
  creativeFlowLabels: resolve(root, 'workbench-creative-flow-labels.js'),
  server: resolve(root, 'server.mjs'),
};

const failures = [];
const checks = [];

function check(name, passed, detail = '') {
  checks.push({ name, passed, detail });
  if (!passed) failures.push(`${name}${detail ? `：${detail}` : ''}`);
}

function includesAll(text, snippets) {
  return snippets.every((snippet) => text.includes(snippet));
}

const [html, js, step1Gate, step2Deconstruct, step3QuestionBank, step4TitleFormulas, step5CopyBlueprint, step6ContentAction, step7ProductionBrief, creativeFlowLabels, server] = await Promise.all([
  readFile(files.html, 'utf8'),
  readFile(files.js, 'utf8'),
  readFile(files.step1Gate, 'utf8'),
  readFile(files.step2Deconstruct, 'utf8'),
  readFile(files.step3QuestionBank, 'utf8'),
  readFile(files.step4TitleFormulas, 'utf8'),
  readFile(files.step5CopyBlueprint, 'utf8'),
  readFile(files.step6ContentAction, 'utf8'),
  readFile(files.step7ProductionBrief, 'utf8'),
  readFile(files.creativeFlowLabels, 'utf8'),
  readFile(files.server, 'utf8'),
]);

check('页面版本是 v2.4.4 内容动作面板版', html.includes('内容生产中台 v2.4.4 内容动作面板版'));
check('静态资源带契约版缓存参数', html.includes('workbench-v2.css?v=20260602-contract-1') && html.includes('workbench-v2.js?v=20260602-contract-1'));

check('前端正文不足不能算可确认', includesAll(js, [
  'const bodyText = String(isVideo ? (draft.videoScript?.voiceover || "") : (draft.xhsCopy?.body || "")).trim();',
  'isCopyDraftReady = bodyText.length >= 180;',
  '这次只拿到了标题，没有拿到可验收正文。',
]));

check('前端标题切换会重新生成正文', includesAll(js, [
  'activeTitleChoice = button.dataset.aiTitleChoice || "";',
  '正在按你选中的标题生成正文',
  'hydrateAiRewriteDraft();',
]));

check('前端未确认文案锁住后续制作', includesAll(js, [
  'let webCopyApproved = false;',
  'const locked = !webCopyApproved;',
  '未确认文案前不生成图片',
  '未确认文案前不交接视频',
]));

check('服务端正文不足会失败', includesAll(server, [
  'function validateDraftBody',
  "error: 'ai_empty_body'",
  '模型只返回了标题，没有返回可验收正文。',
]));

check('服务端空正文会进入重试', includesAll(server, [
  "const retryableErrors = new Set(['ai_parse_or_request_failed', 'ai_request_timeout', 'ai_request_failed', 'ai_empty_body']);",
  "['ai_parse_or_request_failed', 'ai_empty_body'].includes(primary.error)",
  'xhsCopy.body 必须是 600-900 中文字完整正文',
]));

check('服务端非 JSON 可用正文可恢复但仍需验收', includesAll(server, [
  'function normalizeDraftFromModelText',
  'const bodyCheck = validateDraftBody(textDraft, requestUser);',
]));

check('Step 1 sample pool only', includesAll(js, [
  'LONGKA_SAMPLE_POOL_MIN = 5',
  'LONGKA_SAMPLE_POOL_MAX = 10',
  'function longkaBuildSamplePoolFromState',
  'function longkaRenderSamplePool',
  '第一步需要 5-10 条真实/手动样本',
]));

check('HTML loads lightweight step-1 gate after legacy workbench', html.includes('workbench-v2.js?v=20260602-contract-1')
  && html.includes('workbench-step1-gate.js?v=20260602-step1-gate-3')
  && html.indexOf('workbench-v2.js?v=20260602-contract-1') < html.indexOf('workbench-step1-gate.js?v=20260602-step1-gate-3'));

check('Lightweight step-1 gate owns final UI behavior', includesAll(step1Gate, [
  'Longka AI Native step-1 gate',
  'const min = 5',
  'const max = 10',
  'window.renderTopics = function renderTopicsStep1Only',
  'window.renderContentPack = function renderContentPackStep1Locked',
  '成品区已锁定',
]));

check('Step 1 preserves collection window and workflow back navigation', includesAll(step1Gate, [
  'function showStep1CollectPanel',
  'function renderStep1CollectWindow',
  '采集工作窗口',
  'terminalLog',
  'crawlGrid',
  'function installWorkflowBackNav',
  'data-workflow-back-step',
  '如果修改行业、关键词或素材来源，需要重新找选题',
]));

check('Step 1 keeps source links and traceability on sample cards', includesAll(step1Gate, [
  '打开原帖',
  '来源追踪',
  'item.url',
  'target="_blank"',
  'traceId',
  '互动指标',
]));

check('HTML loads lightweight step-2 deconstruction gate after step-1', html.includes('workbench-step2-deconstruct.js?v=20260602-step2-deconstruct-1')
  && html.indexOf('workbench-step1-gate.js?v=20260602-step1-gate-3') < html.indexOf('workbench-step2-deconstruct.js?v=20260602-step2-deconstruct-1'));

check('Step 2 deconstructs selected source before any copy', includesAll(step2Deconstruct, [
  'Longka AI Native step-2 deconstruction gate',
  '第二步：爆款样本拆解',
  '这条为什么火',
  '评论区主问题',
  '可复制结构',
  '不能复制',
  '当前仍不生成正文、图片或视频',
]));

check('HTML loads lightweight step-3 question bank gate after step-2', html.includes('workbench-step3-question-bank.js?v=20260602-step3-question-bank-1')
  && html.indexOf('workbench-step2-deconstruct.js?v=20260602-step2-deconstruct-1') < html.indexOf('workbench-step3-question-bank.js?v=20260602-step3-question-bank-1'));

check('Step 3 creates creative angles and deposits customer questions as assets', includesAll(step3QuestionBank, [
  'Longka AI Native step-3 creative angle gate',
  '第三步：创作角度生成',
  '客户问题库是左侧内容资产库的长期资产',
  '不是每次创作的硬阻断',
  '评论证据不足',
  '不阻断创作',
  '确认创作角度，进入标题候选',
]));

check('HTML loads lightweight step-4 title formula gate after step-3', html.includes('workbench-step4-title-formulas.js?v=20260602-step4-title-formulas-1')
  && html.indexOf('workbench-step3-question-bank.js?v=20260602-step3-question-bank-1') < html.indexOf('workbench-step4-title-formulas.js?v=20260602-step4-title-formulas-1'));

check('Step 4 creates formula-bound title choices before copy', includesAll(step4TitleFormulas, [
  'Longka AI Native step-4 title formula matcher',
  '第四步：标题公式匹配',
  '基于客户问题生成标题候选',
  '公式：',
  '对应问题：',
  '确认标题，生成文案框架',
  '这里只生成标题候选，不生成正文',
]));

check('HTML loads lightweight step-5 copy blueprint gate after step-4', html.includes('workbench-step5-copy-blueprint.js?v=20260602-step5-copy-blueprint-1')
  && html.indexOf('workbench-step4-title-formulas.js?v=20260602-step4-title-formulas-1') < html.indexOf('workbench-step5-copy-blueprint.js?v=20260602-step5-copy-blueprint-1'));

check('Step 5 creates source/question/title-bound blueprint before body', includesAll(step5CopyBlueprint, [
  'Longka AI Native step-5 copy blueprint',
  '第五步：文案框架',
  '这里只生成框架，不生成正文',
  '主问题',
  '开头策略',
  '情绪路线',
  '正文结构',
  '合规边界',
  '确认框架，进入正文生成',
]));

check('HTML loads content action panel after step-5', html.includes('workbench-content-action-panel.js?v=20260602-content-action-panel-1')
  && html.indexOf('workbench-step5-copy-blueprint.js?v=20260602-step5-copy-blueprint-1') < html.indexOf('workbench-content-action-panel.js?v=20260602-content-action-panel-1'));

check('Step 6 content action panel generates body only after blueprint confirmation and forbids fallback', includesAll(step6ContentAction, [
  'Clean content action panel',
  'longka:step5-confirmed',
  '第六步：正文生成 + 编辑部体检',
  '文案接口没有返回可验收正文',
  '系统没有使用本地固定模板文案',
  '编辑部体检',
  '已生成文案记录',
  '文案已确认，进入生产准备',
  'longka:step6-confirmed',
]));

check('Step 6 supports one-step improvement, comparison, and title draft history', includesAll(step6ContentAction, [
  '按体检建议优化一版',
  'originalDraft',
  'originalReview',
  'improvementDirections',
  '优化稿与初稿完全相同，系统拒绝把它当成有效优化。',
  'data-content-version="draft"',
  'data-content-version="improved"',
  'data-copy-history',
]));

check('HTML loads lightweight step-7 production brief after step-6', html.includes('workbench-step7-production-brief.js?v=20260602-step7-production-brief-1')
  && html.indexOf('workbench-content-action-panel.js?v=20260602-content-action-panel-1') < html.indexOf('workbench-step7-production-brief.js?v=20260602-step7-production-brief-1'));

check('Step 7 prepares production assets without generating them', includesAll(step7ProductionBrief, [
  'Longka AI Native step-7 production preparation',
  'document.addEventListener("longka:step6-confirmed"',
  '第七步：确认后生产准备',
  '小红书图文卡片方案',
  '配图提示词草稿',
  '小妹视频工作台脚本草稿',
  '仅准备，不生成图片、不生成视频、不打包、不上线',
  '当前页面没有触发真实生成',
]));

check('Creative flow labels remove duplicate numbered step wording', html.includes('workbench-creative-flow-labels.js?v=20260602-creative-flow-labels-1') && includesAll(creativeFlowLabels, [
  '创作加工流程',
  '顶部是输入流程',
  '不直接让 AI 凭空写',
  '把空话、模板味和机器腔压下去',
  '素材拆解 -> 创作角度 -> 标题候选 -> 文案框架 -> 正文体检 -> 生产准备',
  '客户问题库会沉淀到左侧内容资产库',
  '素材拆解',
  '创作角度',
  '标题候选',
  '正文体检',
]));

check('Step 1 sample cards show source and rationale', includesAll(js, [
  'longkaMetricLabel(metrics)',
  'longkaCommentStatus(sample)',
  'longkaWhySelected(sample)',
  '来源追踪',
  '选择这条源头做拆解',
]));

check('Step 1 blocks local copy and video scripts', includesAll(js, [
  'buildOutputCopyStep1Locked',
  '第 1 步只展示爆款样本池',
  'buildVideoScriptStep1Locked',
  '第 1 步不生成视频脚本',
]));

check('Step 1 locks delivery package', includesAll(js, [
  'renderContentPackStep1Locked',
  '成品区已锁定',
  '不生成图片',
  '不生成视频',
  '不打包',
]));

const baseUrl = process.env.AI_NATIVE_BASE_URL || 'http://localhost:3763';
let apiChecked = false;
try {
  const state = await fetch(`${baseUrl}/api/state`, { signal: AbortSignal.timeout(3000) });
  apiChecked = state.ok;
} catch {
  apiChecked = false;
}

if (apiChecked && process.env.RUN_AI_CONTRACT === '1') {
  const payload = {
    industry: '美业护肤',
    keyword: '淡斑',
    platform: '小红书图文',
    selectedFormat: '小红书图文',
    topic: {
      title: '淡斑别只盯着项目，真正影响效果的是这套配合思路',
      pain: '用户担心做了淡斑项目却反复，想知道项目前后怎么配合。',
      rewrite: '从项目迷信转向肤况判断、术后护理、分阶段观察。',
      risk: '不承诺祛斑效果，不替代专业诊断。',
      metrics: { likes: 1898, collects: 1664, comments: 57, shares: 286 },
      sources: [{
        title: '淡斑前，一定要先搞清楚这4种斑点类型',
        platform: '小红书',
        url: 'https://www.xiaohongshu.com/explore/test',
        summary: '高收藏淡斑判断类帖子，评论集中在不知道自己属于哪种斑、担心反黑、项目后护理。',
        metrics: { likes: 1898, collects: 1664, comments: 57, shares: 286 },
        comments: ['做完皮秒反黑怎么办？', '黄褐斑到底能不能做项目？', '是不是要先修护屏障再淡斑？'],
      }],
    },
  };
  const response = await fetch(`${baseUrl}/api/content-draft/rewrite`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(180000),
  });
  const data = await response.json();
  const bodyLength = String(data.draft?.xhsCopy?.body || '').length;
  check('在线文案接口返回可验收正文', response.ok && data.ok && bodyLength >= 180, `status=${response.status}, ok=${data.ok}, bodyLength=${bodyLength}, error=${data.error || ''}`);
  check('在线文案接口返回候选标题', Array.isArray(data.draft?.titleChoices) && data.draft.titleChoices.length >= 3, `titleCount=${data.draft?.titleChoices?.length || 0}`);
} else {
  check('在线文案接口验证已跳过', true, apiChecked ? '设置 RUN_AI_CONTRACT=1 可跑真实模型验收' : '本地服务未启动，仅跑静态契约');
}

for (const item of checks) {
  const mark = item.passed ? 'PASS' : 'FAIL';
  console.log(`${mark} ${item.name}${item.detail ? ` - ${item.detail}` : ''}`);
}

if (failures.length) {
  console.error('\nContract failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
