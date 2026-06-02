import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const root = resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const dbPath = join(root, 'data', 'command-center.json');
const outRoot = join(root, 'exports', 'customer-question-bank');

const keyword = getArg('--keyword') || '中年白发转黑';
const industry = getArg('--industry') || '大健康/个人护理';
const projectId = getArg('--project') || 'default-private-project';
const owner = getArg('--owner') || '客户本人';

const db = JSON.parse(await readFile(dbPath, 'utf8'));
const samples = pickSamples(db, keyword);
if (!samples.length) throw new Error(`没有找到关键词“${keyword}”的真实采集样本。`);

const questions = buildQuestionBank({ keyword, industry, samples }).slice(0, 30);
const answers = questions.map((item) => buildAnswerItem(item));
const bank = {
  id: `question-bank-${slug(keyword)}-${Date.now()}`,
  scope: 'private',
  projectId,
  owner,
  keyword,
  industry,
  source: 'contentSamples/mediacrawler-pro',
  sampleCount: samples.length,
  generatedAt: new Date().toISOString(),
  questions,
  answers,
};

db.customerQuestionBank = Array.isArray(db.customerQuestionBank) ? db.customerQuestionBank : [];
db.customerQuestionBank = [bank, ...db.customerQuestionBank.filter((item) => item.keyword !== keyword)].slice(0, 80);
db.updatedAt = new Date().toISOString();
await writeFile(dbPath, JSON.stringify(db, null, 2), 'utf8');

const outDir = join(outRoot, slug(keyword));
await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, 'question-bank.json'), JSON.stringify(bank, null, 2), 'utf8');
await writeFile(join(outDir, 'question-bank.md'), renderMarkdown(bank), 'utf8');

console.log(JSON.stringify({
  ok: true,
  keyword,
  industry,
  sampleCount: samples.length,
  questionCount: questions.length,
  answerCount: answers.length,
  outputDir: outDir,
  topQuestions: questions.slice(0, 8).map((item) => ({
    question: item.question,
    score: item.score,
    intent: item.intent,
    sourceTitle: item.sourceTitle,
  })),
}, null, 2));

function getArg(name) {
  const item = process.argv.find((arg) => arg.startsWith(`${name}=`));
  return item ? item.slice(name.length + 1) : '';
}

function pickSamples(db, keyword) {
  const words = splitWords(keyword);
  return (db.contentSamples || [])
    .filter((sample) => {
      const text = [sample.keyword, sample.title, sample.content, ...(sample.tags || [])].filter(Boolean).join(' ');
      return text.includes(keyword) || words.every((word) => text.includes(word));
    })
    .sort((a, b) => scoreSample(b) - scoreSample(a));
}

function buildQuestionBank({ keyword, industry, samples }) {
  const generated = [];
  for (const sample of samples) {
    const text = normalizeText(`${sample.title || ''}\n${sample.content || ''}`);
    const metricsScore = scoreSample(sample);
    const inferred = inferVariableQuestions(keyword, industry, sample, text);
    for (const item of inferred) {
      generated.push({
        id: randomUUID(),
        industry,
        keyword,
      question: item.question,
        scope: 'private',
        projectId,
        owner,
        userPain: item.userPain,
        intent: item.intent,
        contentAngle: item.contentAngle,
        recommendedFormats: item.recommendedFormats,
        score: Math.round(metricsScore + item.weight),
        evidence: {
          sourcePlatform: sample.platform || 'xiaohongshu',
          sourceTitle: sample.title || '',
          sourceUrl: sample.url || '',
          metrics: sample.metrics || {},
          matchedText: item.matchedText,
        },
        sourceTitle: sample.title || '',
        sourceUrl: sample.url || '',
        createdAt: new Date().toISOString(),
      });
    }
  }
  return dedupeQuestions(generated).sort((a, b) => b.score - a.score);
}

function inferQuestions(keyword, text) {
  const items = [];
  if (/白发|转黑|黑发|染发|养发/.test(`${keyword} ${text}`)) {
    items.push({
      question: '白发越来越明显，第一步到底该先做什么？',
      userPain: '显老焦虑强，但不知道先判断原因、先遮盖还是先护理。',
      intent: '求判断路径',
      contentAngle: '避坑清单：先判断白发位置、压力睡眠、护理目标，再决定行动。',
      recommendedFormats: ['短视频口播', '小红书图文', '朋友圈解释文案'],
      matchedText: pickMatched(text, ['白发', '转黑', '染发', '养发']),
      weight: 120,
    });
    items.push({
      question: '白发转黑内容这么多，哪些方法不能乱信？',
      userPain: '怕踩智商税，怕夸大承诺，也怕越试越焦虑。',
      intent: '求避坑',
      contentAngle: '把高流量内容拆成可信点、风险点和可验证动作。',
      recommendedFormats: ['避坑短视频', '清单图文', '公众号长文'],
      matchedText: pickMatched(text, ['智商税', '上当', '科学', '无效']),
      weight: 105,
    });
    items.push({
      question: '不想频繁染发，有没有更温和的改善思路？',
      userPain: '想减少染发频率，又希望外观看起来精神一点。',
      intent: '求替代方案',
      contentAngle: '从遮盖、发型、护理、作息四个层级给低风险方案。',
      recommendedFormats: ['小红书图文', '视频号口播', '朋友圈种草'],
      matchedText: pickMatched(text, ['染发', '护理', '改善', '养黑']),
      weight: 95,
    });
    items.push({
      question: '为什么有些人白发集中在头顶或鬓角？',
      userPain: '看到局部白发会更焦虑，希望知道是不是自己哪里出了问题。',
      intent: '求原因解释',
      contentAngle: '用位置差异做科普入口，但避免医疗诊断和绝对化。',
      recommendedFormats: ['短视频口播', '小红书多图卡片'],
      matchedText: pickMatched(text, ['头顶', '鬓角', '部位', '不同']),
      weight: 85,
    });
  } else {
    items.push({
      question: `${keyword}这件事，普通人第一步该怎么做？`,
      userPain: '知道问题存在，但缺少低门槛开始方式。',
      intent: '求第一步',
      contentAngle: '先拆判断标准，再给可执行的小步骤。',
      recommendedFormats: ['小红书图文', '短视频口播'],
      matchedText: text.slice(0, 120),
      weight: 80,
    });
  }
  return items;
}

function dedupeQuestions(items) {
  const seen = new Map();
  for (const item of items) {
    const key = item.question;
    const existing = seen.get(key);
    if (!existing || item.score > existing.score) seen.set(key, item);
  }
  return [...seen.values()];
}

function renderMarkdown(bank) {
  return [
    `# 客户问题库：${bank.keyword}`,
    '',
    `行业：${bank.industry}`,
    `来源：${bank.source}`,
    `样本数：${bank.sampleCount}`,
    `生成时间：${bank.generatedAt}`,
    '',
    '## 可直接复用的答案库',
    '',
    ...bank.answers.map((item, index) => [
      `### A${index + 1}. ${item.question}`,
      '',
      `- 回答策略：${item.answerStrategy}`,
      `- 标准回答：${item.standardAnswer}`,
      `- 内容切入：${item.contentHook}`,
      `- 禁区：${item.riskBoundary}`,
      '',
    ].join('\n')),
    '',
    ...bank.questions.map((item, index) => [
      `## ${index + 1}. ${item.question}`,
      '',
      `- 分数：${item.score}`,
      `- 用户痛点：${item.userPain}`,
      `- 意图：${item.intent}`,
      `- 内容角度：${item.contentAngle}`,
      `- 推荐形式：${item.recommendedFormats.join('、')}`,
      `- 来源标题：${item.sourceTitle}`,
      `- 来源链接：${item.sourceUrl}`,
      '',
    ].join('\n')),
  ].join('\n');
}

function buildAnswerItem(question) {
  const isHair = /白发|染发|养发|头顶|鬓角/.test(question.question + question.userPain);
  if (isHair) {
    return {
      id: randomUUID(),
      scope: question.scope,
      projectId: question.projectId,
      owner: question.owner,
      questionId: question.id,
      question: question.question,
      answerStrategy: '先共情焦虑，再给判断步骤，不承诺治疗或确定转黑。',
      standardAnswer: '先不要急着找一个“马上变黑”的方法。更稳的做法是先判断白发出现的位置、最近压力睡眠变化、染烫频率和护理习惯，再决定是先遮盖、先护理，还是先做整体形象调整。这样比直接跟风买产品更少走弯路。',
      contentHook: '“白发越来越明显，别急着染，先看这三件事。”',
      riskBoundary: '不说根治、不说保证转黑、不替代医疗诊断。',
      recommendedFormats: question.recommendedFormats,
      evidence: question.evidence,
    };
  }
  return {
    id: randomUUID(),
    scope: question.scope,
    projectId: question.projectId,
    owner: question.owner,
    questionId: question.id,
    question: question.question,
    answerStrategy: '先把问题说成人话，再给低门槛第一步。',
    standardAnswer: '先不要从产品和工具开始，而是先判断你现在卡在哪一步。只要第一步判断清楚，后面的方案才不会变成乱试。',
    contentHook: `“${question.question}，先别急着买，先做判断。”`,
    riskBoundary: '不夸大、不承诺确定结果、不制造恐慌。',
    recommendedFormats: question.recommendedFormats,
    evidence: question.evidence,
  };
}

function scoreSample(sample) {
  const m = sample.metrics || {};
  return Number(m.saves || m.collects || 0) * 1.8 + Number(m.comments || 0) * 2.2 + Number(m.likes || 0) + Number(m.shares || 0) * 1.5;
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function pickMatched(text, words) {
  const sentence = String(text || '').split(/[。！？!?]/).find((part) => words.some((word) => part.includes(word)));
  return sentence ? sentence.slice(0, 160) : String(text || '').slice(0, 160);
}

function splitWords(value) {
  return String(value || '').split(/[、,，\s/]+/).map((item) => item.trim()).filter(Boolean);
}

function slug(value) {
  return String(value || 'keyword').replace(/[^\w\u4e00-\u9fa5-]+/g, '-').slice(0, 48);
}

function inferVariableQuestions(keyword, industry, sample, text) {
  const sourceTitle = normalizeText(sample.title || '');
  const comments = Array.isArray(sample.comments) ? sample.comments.map(normalizeText).filter(Boolean) : [];
  const joined = [keyword, industry, sourceTitle, text, ...comments].join(' ');
  const axes = deriveQuestionAxes(joined);
  const pains = deriveQuestionPains(keyword, joined, comments);
  const questions = [];

  questions.push(makeVariableQuestion({
    keyword,
    text,
    question: `${keyword}这件事，普通人第一步该怎么判断？`,
    userPain: pains[0],
    intent: '求第一步',
    contentAngle: `把${keyword}拆成${axes.slice(0, 3).join('、')}这几个判断点，让用户先知道自己属于哪种情况。`,
    weight: 120,
    matchedWords: [keyword, ...axes],
  }));

  for (const axis of axes.slice(0, 4)) {
    questions.push(makeVariableQuestion({
      keyword,
      text,
      question: `判断${keyword}时，为什么要先看${axis}？`,
      userPain: `用户知道${keyword}重要，但不知道${axis}会影响下一步选择。`,
      intent: '求判断标准',
      contentAngle: `围绕“${axis}”做一条清单型内容，告诉用户怎么自查、怎么避免乱试。`,
      weight: 95,
      matchedWords: [axis, keyword],
    }));
  }

  for (const pain of pains.slice(0, 3)) {
    questions.push(makeVariableQuestion({
      keyword,
      text,
      question: `遇到“${pain}”时，应该先做什么？`,
      userPain: pain,
      intent: '求解决路径',
      contentAngle: '先共情这个具体焦虑，再给一个低风险第一步。',
      weight: 90,
      matchedWords: [keyword, pain],
    }));
  }

  questions.push(makeVariableQuestion({
    keyword,
    text,
    question: `${keyword}相关内容这么多，哪些说法不能直接信？`,
    userPain: '用户担心被夸大承诺误导，想知道哪些内容需要谨慎。',
    intent: '求避坑',
    contentAngle: '做避坑清单：没有适合人群、没有真实过程、没有风险边界的内容先不信。',
    weight: 88,
    matchedWords: [keyword, '风险', '适合', '过程'],
  }));

  questions.push(makeVariableQuestion({
    keyword,
    text,
    question: `${keyword}有没有适合发朋友圈或短视频的真实案例切入？`,
    userPain: '用户想看真实案例，但不想看硬广。',
    intent: '求案例表达',
    contentAngle: '用来源标题和评论痛点做案例开头，再转成判断清单和行动入口。',
    weight: 78,
    matchedWords: [keyword, sourceTitle],
  }));

  return questions;
}

function makeVariableQuestion({ keyword, text, question, userPain, intent, contentAngle, weight, matchedWords }) {
  return {
    question,
    userPain,
    intent,
    contentAngle,
    recommendedFormats: ['短视频口播', '小红书图文', '朋友圈解释文案'],
    matchedText: pickMatched(text, matchedWords.filter(Boolean)),
    weight,
  };
}

function deriveQuestionAxes(text) {
  const axes = [];
  if (/类型|种类|分清|区别|分类/.test(text)) axes.push('类型差异');
  if (/位置|部位|哪里|区域|脸|头|身|手/.test(text)) axes.push('出现位置');
  if (/时间|多久|最近|突然|长期|变化|反复/.test(text)) axes.push('变化过程');
  if (/原因|为什么|作息|压力|暴晒|熬夜|习惯|成因/.test(text)) axes.push('可能原因');
  if (/适合|不适合|人群|敏感|风险|副作用|禁忌/.test(text)) axes.push('适合人群和风险边界');
  if (/效果|对比|过程|记录|案例|结果/.test(text)) axes.push('真实过程和结果证据');
  return [...new Set(axes.length ? axes : ['适合人群', '真实过程', '风险边界'])].slice(0, 5);
}

function deriveQuestionPains(keyword, text, comments) {
  const pains = [];
  for (const comment of comments) {
    if (comment.length >= 6 && comment.length <= 80) pains.push(comment);
  }
  if (/效果|有用|真的|靠谱吗|可靠/.test(text)) pains.push(`担心${keyword}看起来很吸引人，但实际不适合自己。`);
  if (/贵|便宜|价格|成本|花钱/.test(text)) pains.push('担心花钱以后看不到结果。');
  if (/乱|瞎|反复|踩坑|偏方/.test(text)) pains.push('怕乱试以后问题更复杂。');
  pains.push(`知道${keyword}有需求，但不知道第一步该怎么判断。`);
  return [...new Set(pains.map(normalizeText).filter(Boolean))].slice(0, 5);
}
