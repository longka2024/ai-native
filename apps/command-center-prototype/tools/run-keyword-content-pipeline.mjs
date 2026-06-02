import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const root = resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const dbPath = join(root, 'data', 'command-center.json');
const outRoot = join(root, 'exports', 'keyword-pipeline');

const keyword = getArg('--keyword') || '中年白发转黑';
const platform = getArg('--platform') || '小红书图文';
const industry = getArg('--industry') || '大健康/个人护理';

const visualMode = getArg('--visual') || process.env.AI_NATIVE_VISUAL_MODE || 'design';

const db = JSON.parse(await readFile(dbPath, 'utf8'));
const samples = pickSamples(db, keyword);
if (!samples.length) {
  throw new Error(`没有找到关键词“${keyword}”的真实采集样本。先采集或导入该关键词素材。`);
}

const ranked = samples.slice(0, 12);
const lead = ranked[0];
const referenceImageUrls = buildDiverseImageList(ranked).slice(0, 18);
const pains = inferPains(keyword, ranked);
const contentBrief = deriveContentBrief({ keyword, industry, platform, samples: ranked, pains });
const licensedVisualAssets = await resolveLicensedVisualAssets(contentBrief, visualMode);
const title = composeTitleFromBrief(contentBrief);
const hook = composeHookFromBrief(contentBrief);
const xhsCopy = composeXhsCopyFromBrief(contentBrief);
const momentsCopy = composeMomentsCopyFromBrief(contentBrief);
const videoScript = composeVideoScriptFromBrief(contentBrief);
const cardPlan = composeCardPlanFromBrief(contentBrief);
const sourceSummary = buildSourceSummary(ranked);

const asset = {
  id: randomUUID(),
  topicId: `keyword-${slug(keyword)}`,
  title: `关键词闭环发布包：${keyword}`,
  type: `${platform}生产线`,
  structured: {
    selectedTitle: title,
    contentBrief,
    sourceSummary,
    hook,
    coverText: title,
    bodyDraft: xhsCopy,
    cardPlan,
    momentsCopy,
    commentGuide: pains.map((pain) => `你有没有遇到过「${pain}」这种情况？`),
    visualMode,
    visualAssets: licensedVisualAssets.assets,
    visualPolicy: {
      publishDefault: 'do_not_use_collected_post_images',
      collectedImagesUsage: 'internal_reference_only',
      preferredSources: ['customer_owned_assets', 'pexels_licensed_assets', 'ai_generated_assets', 'designed_text_cards'],
    },
    licensedVisualPlan: licensedVisualAssets.plan,
    aiVisualPrompts: buildAiVisualPrompts(contentBrief),
    internalReferenceImages: referenceImageUrls,
    visualSources: ranked.map((sample) => ({
      platform: sample.platform || 'xiaohongshu',
      keyword: sample.keyword || keyword,
      title: sample.title || '',
      url: sample.url || '',
      metrics: sample.metrics || {},
      imageCount: (sample.images || []).length + (sample.cover ? 1 : 0),
    })),
    videoScript,
    videoPackage: buildVideoPackage(contentBrief, videoScript, cardPlan, licensedVisualAssets),
    publishChecklist: [
      '标题只承诺可感知的小结果，不承诺确定治愈、确定变黑或确定收益。',
      '正文必须引用真实采集样本的痛点和用户疑问，不写泛泛 AI 文案。',
      '配图必须使用采集素材、产品操作图、案例图或合规素材图，不用空白占位。',
      '视频脚本只给目标用户看，不出现创作者分析术语。',
    ],
    riskNotes: [
      '健康/养发内容不能承诺治疗效果。',
      '涉及白发转黑时，要用“改善思路、少走弯路、先判断原因”表达，避免绝对化。',
    ],
  },
  copy: [
    `# ${title}`,
    '',
    '## 小红书正文',
    ...xhsCopy.map((item, index) => `${index + 1}. ${item}`),
    '',
    '## 朋友圈文案',
    ...momentsCopy,
    '',
    '## 短视频口播脚本',
    ...videoScript.lines.map((item, index) => `${index + 1}. ${item}`),
    '',
    '## 来源样本',
    ...ranked.slice(0, 6).map((item, index) => `${index + 1}. ${item.title}｜赞${item.metrics?.likes || 0} 藏${item.metrics?.saves || item.metrics?.collects || 0} 评${item.metrics?.comments || 0}｜${item.url || ''}`),
  ].join('\n'),
  createdAt: new Date().toISOString(),
};

db.assets = [asset, ...(db.assets || [])].slice(0, 160);
db.updatedAt = new Date().toISOString();
await writeFile(dbPath, JSON.stringify(db, null, 2), 'utf8');

const outDir = join(outRoot, slug(keyword));
await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, 'content-package.json'), JSON.stringify(asset, null, 2), 'utf8');
await writeFile(join(outDir, 'content-package.md'), asset.copy, 'utf8');

console.log(JSON.stringify({
  ok: true,
  keyword,
  platform,
  industry,
  assetId: asset.id,
  sampleCount: ranked.length,
  imageCount: referenceImageUrls.length,
  topSources: asset.structured.visualSources.slice(0, 5),
  outputDir: outDir,
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
      return words.every((word) => text.includes(word)) || text.includes(keyword);
    })
    .sort((a, b) => scoreSample(b) - scoreSample(a));
}

function scoreSample(sample) {
  const m = sample.metrics || {};
  return Number(m.saves || m.collects || 0) * 1.8 + Number(m.comments || 0) * 2.2 + Number(m.likes || 0) + Number(m.shares || 0) * 1.5;
}

function splitWords(value) {
  return String(value || '').split(/[、,，\s/]+/).map((item) => item.trim()).filter(Boolean);
}

function inferPains(keyword, samples) {
  const text = samples.map((item) => `${item.title || ''} ${item.content || ''}`).join('\n');
  const base = [];
  if (/白发|黑发|染发|养发/.test(`${keyword} ${text}`)) {
    base.push('白发显老，但又怕频繁染发伤头皮');
    base.push('看了很多方法，不知道哪些是真的有用');
    base.push('想先知道自己适合从饮食、作息、护理还是遮盖开始');
  }
  if (!base.length) {
    base.push('问题很明确，但不知道第一步怎么做');
    base.push('看过很多内容，缺少可以照着执行的方法');
    base.push('想先看到一个小结果，再决定要不要继续投入');
  }
  return base;
}

function buildTitle(keyword, lead) {
  if (/白发|黑发|染发|养发/.test(keyword)) return '别急着染发，先判断白发为什么越来越明显';
  return `${keyword}，先别急着买，先做这一步判断`;
}

function buildAudienceHook(keyword, pain) {
  if (/白发|黑发|染发|养发/.test(keyword)) {
    return '最近是不是发现，头顶和鬓角的白发越来越明显了？尤其是拍照、照镜子，或者把头发扎起来的时候，会突然觉得自己老了很多。';
  }
  return `如果你正在被“${pain}”卡住，先不要急着买方案，第一步应该先把问题判断清楚。`;
}

function buildXhsCopy({ keyword, lead, pains, hook }) {
  return [
    hook,
    `我翻了一批“${keyword}”相关的高收藏内容，发现真正让人停下来的不是“保证变黑”，而是大家都在找一个更稳、更少折腾的判断路径。`,
    `先别急着跟风买东西，先看三个问题：白发集中在哪个位置？最近作息和压力有没有明显变化？你是想遮盖、护理，还是想先降低显老感？`,
    `如果这三个问题没想清楚，很容易一边焦虑一边乱试，钱花了不少，结果还不知道是哪一步起作用。`,
    `我建议先做一个小判断：把自己的头发状态、年龄、作息、护理习惯整理出来，再决定是从遮盖、护理、饮食作息，还是形象调整开始。`,
    `这篇先不讲神奇方法，只讲少走弯路。你也可以先保存，对照自己的情况看看最该先处理哪一步。`,
  ];
}

function buildMomentsCopy({ keyword, pains, hook }) {
  return [
    `今天拆了一个很典型的问题：${keyword}。`,
    `很多人不是不想改善，而是不知道该先判断原因，还是先买产品、先遮盖、先护理。`,
    `我把它整理成了一个更低风险的小流程：先判断状态，再选方法，最后再看是否需要进一步方案。`,
  ];
}

function buildVideoScript({ keyword, pains, lead }) {
  return {
    title: '别急着染发，先判断这三件事',
    duration: '45-60s',
    lines: [
      '如果你最近发现头顶和鬓角的白发越来越明显，先别急着染。',
      '很多人真正焦虑的不是一两根白发，而是它让整个人看起来更疲惫、更显老。',
      '但问题是，你不先判断原因，就很容易跟着别人乱买、乱试、乱染。',
      '第一，看白发集中在哪里。第二，看最近压力和睡眠有没有变化。第三，看你现在最想解决的是遮盖、护理，还是整体显年轻。',
      '这三件事想清楚之后，你再去选方法，会少走很多弯路。',
      '想要我把这个判断流程整理成清单，可以先保存这条。',
    ],
    shotList: [
      '开头：白发/发缝/照镜子的近景素材',
      '中段：三项判断清单大字卡',
      '证据：引用采集到的高收藏白发内容截图或素材图',
      '结尾：保存引导和评论提问',
    ],
  };
}

function buildCardPlan({ keyword, title, pains }) {
  return [
    { page: 1, role: '封面卡', title, copy: '把焦虑问题变成一个能判断的步骤。' },
    { page: 2, role: '痛点卡', title: '真正让人焦虑的不是白发', copy: pains[0] },
    { page: 3, role: '判断卡', title: '先看这三个信号', copy: '位置、压力睡眠、当前目标，先判断再行动。' },
    { page: 4, role: '方法卡', title: '别一上来就乱买', copy: '遮盖、护理、作息和形象调整，对应的是不同问题。' },
    { page: 5, role: '结果卡', title: '少走弯路就是价值', copy: '先知道自己该从哪里开始，才不会越试越焦虑。' },
    { page: 6, role: '行动卡', title: '先保存这张清单', copy: '对照自己的白发位置和状态，再决定下一步。' },
  ];
}

function buildSourceSummary(samples) {
  const total = samples.reduce((sum, item) => sum + scoreSample(item), 0);
  return {
    layer: '真实采集样本',
    score: Math.round(total / Math.max(samples.length, 1)),
    validation: '可进入选题池',
    validationScore: Math.min(92, Math.round(total / Math.max(samples.length, 1) / 12)),
    saveMotive: '用户想保存判断方法和改善路径',
    socialMotive: '白发显老焦虑强，适合避坑/清单型内容',
    conversion: '先给判断清单，再承接咨询或工具入口',
  };
}

function buildDiverseImageList(samples) {
  const firstPass = samples
    .map((item) => item.cover || item.images?.[0])
    .filter(Boolean);
  const rest = samples
    .flatMap((item) => (item.images || []).slice(1))
    .filter(Boolean);
  return [...new Set([...firstPass, ...rest])];
}

function slug(value) {
  return String(value || 'keyword').replace(/[^\w\u4e00-\u9fa5-]+/g, '-').slice(0, 48);
}

function deriveContentBrief({ keyword, industry, platform, samples = [], pains = [] }) {
  const sourceTitles = samples.map((item) => cleanCn(item.title || item.content || '')).filter(Boolean);
  const sourceComments = samples.flatMap((item) => item.comments || item.commentPains || []).map(cleanCn).filter(Boolean);
  const sourceText = [keyword, industry, ...sourceTitles, ...sourceComments].join('\n');
  const nouns = extractMeaningfulTerms(sourceText, keyword);
  const object = cleanCn(keyword) || nouns[0] || '这个问题';
  const topSource = samples[0] || {};
  const metrics = topSource.metrics || {};
  const painList = uniqueText([
    ...sourceComments,
    ...pains,
    inferPainFromKeyword(object, sourceText),
  ]).slice(0, 4);
  const axes = deriveJudgementAxes({ object, sourceText, nouns, painList });
  const risks = deriveRiskBoundaries({ object, sourceText, industry });
  const evidence = {
    title: cleanCn(topSource.title || ''),
    url: topSource.url || '',
    platform: topSource.platform || '真实采集样本',
    metrics: {
      likes: Number(metrics.likes || 0),
      saves: Number(metrics.saves || metrics.collects || 0),
      comments: Number(metrics.comments || 0),
      shares: Number(metrics.shares || 0),
    },
  };
  return {
    keyword: object,
    industry: cleanCn(industry),
    platform: cleanCn(platform),
    sourceTitles: sourceTitles.slice(0, 5),
    painList,
    axes,
    risks,
    evidence,
    promise: `先判断${object}的具体情况，再决定下一步怎么做`,
    action: `把${object}的判断清单先保存下来，下一次决策前对照看一遍`,
  };
}

function composeTitleFromBrief(brief) {
  const axis = brief.axes[0] || '类型';
  return `${brief.keyword}，先分清${axis}再行动`;
}

function composeHookFromBrief(brief) {
  const pain = brief.painList[0] || `不知道${brief.keyword}该先从哪一步判断`;
  return `如果你也在纠结${brief.keyword}，先别急着买方案，先弄清楚：${pain}`;
}

function composeXhsCopyFromBrief(brief) {
  return [
    composeHookFromBrief(brief),
    `我这次参考的是采集到的真实高互动内容，里面反复出现的焦虑不是“有没有需求”，而是“怎么判断自己属于哪种情况”。`,
    `所以这篇不直接劝你买，也不直接给一个绝对结论，先把${brief.keyword}拆成几个能判断的点。`,
    `先看这 ${brief.axes.length} 个判断：${brief.axes.map((axis, index) => `${index + 1}. ${axis}`).join('；')}。`,
    `再看风险边界：${brief.risks.join('；')}。`,
    `如果这些点还没弄清楚，就不要急着照着别人做。先判断清楚，再决定是继续了解、咨询，还是换一个更稳的方案。`,
    `这篇先收藏，下一次遇到${brief.keyword}相关内容时，先用这张清单对照看一遍。`,
  ];
}

function composeMomentsCopyFromBrief(brief) {
  return [
    `今天拆了一个很典型的问题：${brief.keyword}。`,
    `真实内容里最值得注意的不是某个神奇结论，而是大家都缺一个能先判断清楚的标准。`,
    `我把它整理成一个低风险流程：先看${brief.axes.slice(0, 3).join('、')}，再决定下一步怎么做。`,
    `很多时候，先不急着买，反而更容易少走弯路。`,
  ];
}

function composeVideoScriptFromBrief(brief) {
  return {
    title: composeTitleFromBrief(brief),
    duration: '35-55s',
    lines: [
      `如果你也在纠结${brief.keyword}，先别急着下结论。`,
      `很多人卡住，不是因为没有需求，而是没有先判断自己属于哪种情况。`,
      `先看第一个点：${brief.axes[0] || '出现的位置和状态'}。`,
      `再看第二个点：${brief.axes[1] || '最近有没有明显变化'}。`,
      `最后看第三个点：${brief.axes[2] || '这个方法有没有讲清楚适合谁和不适合谁'}。`,
      `如果这几个点都说不清楚，就不要急着跟着做。`,
      `先把判断标准弄明白，再决定是咨询、购买，还是继续观察。`,
      `这条先收藏，下一次遇到${brief.keyword}相关内容时，先对照看一遍。`,
    ],
    shotList: [
      `封面：${composeTitleFromBrief(brief)}`,
      `画面1：展示采集来源标题或评论痛点，证明选题来自真实数据`,
      `画面2：用白板卡展示判断点：${brief.axes.slice(0, 3).join(' / ')}`,
      `画面3：风险提醒：${brief.risks[0] || '不要做确定性承诺'}`,
      `结尾：收藏引导 + 评论提问`,
    ],
  };
}

function composeCardPlanFromBrief(brief) {
  const axes = brief.axes.length ? brief.axes : ['适合人群', '真实过程', '风险边界'];
  return [
    { page: 1, role: '封面卡', title: composeTitleFromBrief(brief), copy: brief.promise },
    { page: 2, role: '痛点卡', title: '真正卡住人的问题', copy: brief.painList[0] || `不知道${brief.keyword}怎么判断。` },
    { page: 3, role: '判断卡', title: `先看：${axes[0]}`, copy: `不要先找答案，先确认${axes[0]}。` },
    { page: 4, role: '判断卡', title: `再看：${axes[1] || axes[0]}`, copy: `第二步确认${axes[1] || axes[0]}，避免把不同情况混在一起。` },
    { page: 5, role: '风险卡', title: '别急着跟着做', copy: brief.risks[0] || '没有讲清楚适合谁、不适合谁，就先不要行动。' },
    { page: 6, role: '行动卡', title: '先保存这张清单', copy: brief.action },
  ];
}

function cleanCn(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function uniqueText(list) {
  return [...new Set(list.map(cleanCn).filter(Boolean))];
}

function extractMeaningfulTerms(text, fallback) {
  const words = String(text || '')
    .split(/[，。！？、\s#｜|/：:；;《》【】（）()]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2 && item.length <= 12);
  return uniqueText([fallback, ...words]).slice(0, 12);
}

function inferPainFromKeyword(keyword, text) {
  if (/怎么|如何|为什么|区别|类型|判断|避坑|教程/.test(keyword)) return `想搞清楚${keyword}，但不知道先看哪个判断标准`;
  if (/贵|便宜|价格|成本/.test(text)) return `担心花钱以后看不到结果`;
  if (/效果|有用|真的|靠谱吗|可靠吗/.test(text)) return `担心方法看起来很吸引人，但实际不适合自己`;
  return `有${keyword}相关需求，但缺少可信判断标准和低成本试错入口`;
}

function deriveJudgementAxes({ object, sourceText, nouns, painList }) {
  const axes = [];
  if (/类型|种类|分清|区别|分类/.test(sourceText)) axes.push('类型差异');
  if (/位置|部位|哪里|区域|脸颊|头顶|鬓角/.test(sourceText)) axes.push('出现位置');
  if (/时间|多久|最近|突然|长期|变化/.test(sourceText)) axes.push('出现时间和变化速度');
  if (/原因|为什么|作息|压力|暴晒|熬夜|内分泌|习惯/.test(sourceText)) axes.push('可能原因');
  if (/适合|不适合|人群|敏感|风险|副作用/.test(sourceText)) axes.push('适合人群和风险边界');
  if (/效果|对比|过程|记录|案例/.test(sourceText)) axes.push('真实过程和结果证据');
  if (!axes.length) axes.push('适合人群', '真实过程', '风险边界');
  return uniqueText(axes).slice(0, 4);
}

function deriveRiskBoundaries({ object, sourceText, industry }) {
  const risks = ['不要把个体经验写成确定承诺'];
  if (/健康|护肤|养发|减肥|身体|治疗|功效|改善/.test(`${industry} ${sourceText}`)) {
    risks.push('不要承诺治疗、逆转、一定有效');
    risks.push('涉及身体问题时建议先做专业判断');
  }
  if (/赚钱|获客|成交|利润|收益/.test(`${industry} ${sourceText}`)) {
    risks.push('不要承诺确定收益或确定成交');
  }
  risks.push(`没有判断清楚${object}的具体情况前，不建议直接行动`);
  return uniqueText(risks).slice(0, 4);
}

function detectKeywordDomain(keyword, samples = []) {
  const text = [keyword, ...samples.map((item) => `${item.title || ''} ${item.content || ''} ${(item.tags || []).join(' ')}`)].join('\n');
  if (/淡斑|斑点|色斑|黄褐斑|晒斑|雀斑|痘印|美白|护肤/.test(text)) return 'spots';
  if (/白发|黑发|染发|养发|头发|变黑|转黑/.test(text)) return 'hair';
  if (/形象|发型|穿搭|色彩|显白|变美|妆容/.test(text)) return 'image';
  if (/U盘|数据恢复|文件丢失|打不开/.test(text)) return 'data';
  return 'generic';
}

function buildDomainTitle(keyword, lead, domain) {
  if (domain === 'spots') return '淡斑前，先分清你是哪一种斑';
  if (domain === 'hair') return '别急着染发，先判断白发为什么越来越明显';
  if (domain === 'image') return '想变好看，先找准最该改的第一步';
  if (domain === 'data') return 'U盘打不开，先别急着点修复';
  return `${keyword}，先别急着买，先做这一判断`;
}

function buildDomainHook(keyword, pain, domain) {
  if (domain === 'spots') return '淡斑前先别急着买精华，先看清楚自己脸上的斑是哪一种。';
  if (domain === 'hair') return '最近是不是发现，头顶和鬓角的白发越来越明显了？';
  if (domain === 'image') return '想变好看，第一步不是照搬别人的发型和穿搭。';
  if (domain === 'data') return 'U盘打不开的时候，第一步不是反复插拔，也不是随便点修复。';
  return `如果你正被“${pain}”卡住，先不要急着买方案，第一步是把问题判断清楚。`;
}

function buildDomainXhsCopy({ keyword, lead, pains, hook, domain }) {
  if (domain === 'spots') {
    return [
      hook,
      '很多人淡斑没效果，不一定是产品太差，而是一开始就没有分清斑点类型。',
      '有些是晒出来的斑，有些和作息、情绪压力、内分泌波动有关，有些其实是痘印沉着。',
      '如果把所有斑都当成一种问题处理，就很容易越买越多，越试越乱。',
      '先做三个判断：颜色深浅、出现位置、最近有没有暴晒、长痘或作息变化。',
      '判断清楚以后，再决定是先防晒、先修护、先淡印，还是先去做专业检测。',
      '淡斑最怕的不是慢，而是没判断就乱试。这篇可以先收藏，下次买淡斑产品前先对照看一遍。',
    ];
  }
  if (domain === 'hair') {
    return [
      hook,
      '很多人真正焦虑的不是一两根白发，而是它让整个人看起来更疲惫、更显老。',
      '但不先判断原因，就很容易跟着别人乱买、乱试、乱染。',
      '先看三个问题：白发集中在哪个位置？最近作息和压力有没有变化？你想先解决遮盖、护理，还是整体显年轻？',
      '这三件事想清楚以后，再去选方法，会少走很多弯路。',
      '这篇先不讲神奇方法，只讲少走弯路。你也可以先保存，对照自己的情况看最该先处理哪一步。',
    ];
  }
  if (domain === 'image') {
    return [
      hook,
      '很多人变美失败，不是审美差，而是先后顺序错了。',
      '脸型、肤色、发量、日常场景不一样，适合的发型、颜色和穿搭也会不一样。',
      '先判断三个点：脸部重心、肤色冷暖、日常使用场景。',
      '判断清楚以后，再决定先改发型、配色、妆容，还是穿搭比例。',
      '先找到适合自己的方向，再做小成本尝试。',
    ];
  }
  if (domain === 'data') {
    return [
      hook,
      '很多数据最后恢复不了，是因为前面几次误操作把问题变严重了。',
      '先判断三件事：电脑有没有识别盘符，容量显示是否正常，有没有提示格式化。',
      '如果提示格式化，先不要点确定；如果文件很重要，也不要继续往里面写新文件。',
      '先保护现场，再判断下一步怎么处理。',
    ];
  }
  return [
    hook,
    '真正重要的是先判断你现在属于哪种情况，而不是马上找一个看起来最快的方法。',
    '先看适合人群、真实过程和风险边界。',
    '如果这三点都说不清楚，就不要急着跟着做。',
    '先建立判断标准，再去选择方法。',
  ];
}

function buildDomainMomentsCopy({ keyword, pains, hook, domain }) {
  if (domain === 'spots') {
    return [
      '今天拆了一个很典型的问题：淡斑为什么不能一上来就买精华。',
      '很多人不是没有需求，而是不知道自己脸上的斑到底是哪一种。',
      '先分清晒斑、黄褐斑、痘印沉着这类差异，再决定是先防晒、修护、淡印，还是做专业检测，会稳很多。',
    ];
  }
  return [
    `今天拆了一个很典型的问题：${keyword}。`,
    '很多人不是不想改善，而是不知道应该先判断原因，还是先买产品、先尝试方法。',
    '我把它整理成了一个更低风险的小流程：先判断状态，再选方法，最后再看是否需要进一步方案。',
  ];
}

function buildDomainVideoScript({ keyword, pains, lead, domain }) {
  if (domain === 'spots') {
    return {
      title: '淡斑前，先分清你是哪一种斑',
      duration: '35-50s',
      lines: [
        '淡斑前先别急着买精华，先看清楚自己脸上的斑是哪一种。',
        '很多人淡斑没效果，不一定是产品太差，而是从一开始就没分清类型。',
        '有些是晒出来的斑，有些和作息、情绪压力、内分泌波动有关，有些其实是痘印沉着。',
        '如果你把所有斑都当成一种问题处理，就很容易越买越多，越试越乱。',
        '先做三个判断：颜色深浅、出现位置、最近有没有暴晒、长痘或作息变化。',
        '判断清楚以后，再决定是先防晒、先修护、先淡印，还是先去做专业检测。',
        '淡斑最怕的不是慢，而是没判断就乱试。这条先收藏，下次买淡斑产品前先对照看一遍。',
      ],
      shotList: [
        '封面：淡斑前先分清斑点类型',
        '画面1：脸颊/颧骨/痘印区域示意，不做夸张前后对比',
        '画面2：晒斑、黄褐斑、痘印沉着的三列判断卡',
        '画面3：颜色、位置、近期变化三项检查清单',
        '结尾：收藏引导和风险提醒',
      ],
    };
  }
  return buildVideoScript({ keyword, pains, lead });
}

function buildDomainCardPlan({ keyword, title, pains, domain }) {
  if (domain === 'spots') {
    return [
      { page: 1, role: '封面卡', title, copy: '先判断类型，再决定怎么淡。' },
      { page: 2, role: '痛点卡', title: '淡斑没效果，可能不是产品问题', copy: '很多人一开始就没分清自己是哪种斑。' },
      { page: 3, role: '判断卡', title: '先看这3个信号', copy: '颜色深浅、出现位置、最近有没有暴晒/长痘/作息变化。' },
      { page: 4, role: '分类卡', title: '不是所有斑都一种处理', copy: '晒斑、黄褐斑、痘印沉着，对应的重点不一样。' },
      { page: 5, role: '方法卡', title: '先防晒、修护，还是淡印？', copy: '判断清楚以后，再决定下一步。' },
      { page: 6, role: '行动卡', title: '先收藏这张判断表', copy: '下一次买淡斑产品前，先对照看一遍。' },
    ];
  }
  return buildCardPlan({ keyword, title, pains });
}

async function resolveLicensedVisualAssets(brief, mode = 'design') {
  const normalized = String(mode || 'design').toLowerCase();
  const plan = buildLicensedVisualPlan(brief);
  if (normalized !== 'pexels') {
    return { assets: [], plan: { ...plan, mode: normalized, status: normalized === 'ai' ? 'ai_prompt_ready' : 'designed_cards_only' } };
  }
  const key = process.env.PEXELS_API_KEY || process.env.PEXELS_KEY || readLocalConfigValue('PEXELS_API_KEY');
  if (!key) {
    return {
      assets: [],
      plan: {
        ...plan,
        mode: 'pexels',
        status: 'missing_api_key',
        note: 'Set PEXELS_API_KEY to fetch licensed Pexels images. Without it, cards stay original designed text cards.',
      },
    };
  }
  try {
    const query = encodeURIComponent(plan.searchKeywords[0] || brief.keyword);
    const res = await fetch(`https://api.pexels.com/v1/search?query=${query}&orientation=portrait&per_page=6&locale=zh-CN`, {
      headers: { Authorization: key },
    });
    if (!res.ok) throw new Error(`Pexels HTTP ${res.status}`);
    const data = await res.json();
    const photos = Array.isArray(data.photos) ? data.photos : [];
    return {
      assets: photos.map((photo) => photo.src?.large2x || photo.src?.large || photo.src?.portrait).filter(Boolean),
      plan: {
        ...plan,
        mode: 'pexels',
        status: photos.length ? 'fetched' : 'empty',
        provider: 'Pexels',
        attribution: photos.map((photo) => ({
          id: photo.id,
          photographer: photo.photographer,
          url: photo.url,
        })),
      },
    };
  } catch (error) {
    return {
      assets: [],
      plan: {
        ...plan,
        mode: 'pexels',
        status: 'fetch_failed',
        error: error.message,
      },
    };
  }
}

function buildLicensedVisualPlan(brief) {
  const keywords = [
    brief.keyword,
    `${brief.keyword} 生活方式`,
    `${brief.keyword} 检查 清单`,
    `${brief.industry || ''} 专业 咨询`,
  ].map((item) => String(item || '').trim()).filter(Boolean);
  return {
    rule: 'Collected competitor/post images are internal references only, not publish assets.',
    priority: ['customer_owned_assets', 'pexels_licensed_assets', 'ai_generated_assets', 'designed_text_cards'],
    searchKeywords: [...new Set(keywords)],
    usage: 'Use licensed images only as atmosphere/evidence backgrounds; do not imply medical or guaranteed results.',
  };
}

function buildAiVisualPrompts(brief) {
  const axes = (brief.axes || []).slice(0, 3).join('、') || '判断清单';
  return [
    `Create a clean editorial 3:4 social card background for "${brief.keyword}", abstract and non-medical, with soft paper texture, no text, no logos, no before-after claims.`,
    `Create a minimal whiteboard-style illustration showing "${axes}" as neutral checklist symbols, no brand marks, no readable text.`,
    `Create a calm lifestyle consultation scene for "${brief.keyword}", realistic but generic, no identifiable person, no medical treatment claim, no embedded text.`,
  ];
}

function buildVideoPackage(brief, videoScript, cardPlan, licensedVisualAssets) {
  const assets = Array.isArray(licensedVisualAssets?.assets) ? licensedVisualAssets.assets : [];
  return {
    type: `${brief.platform || '短视频'}生产包`,
    status: 'ready_for_xiaomei_workbench',
    title: videoScript.title || composeTitleFromBrief(brief),
    coverText: videoScript.title || composeTitleFromBrief(brief),
    duration: videoScript.duration || '35-55s',
    script: Array.isArray(videoScript.lines) ? videoScript.lines : [],
    shotList: Array.isArray(videoScript.shotList) ? videoScript.shotList : [],
    materialMode: assets.length
      ? 'licensed_stock_plus_text_cards'
      : 'designed_text_cards_only',
    materialAssets: assets.slice(0, 8),
    cardPlan: cardPlan.slice(0, 6),
    templateSuggestions: ['ai-native-v2-video', 'pain-point-opener', 'checklist-explainer'],
    acceptance: [
      '视频只能输出给目标用户看的口播，不出现创作者分析话',
      '必须有封面、口播字幕、判断清单画面和结尾行动引导',
      '采集来的竞品图片只能做内部证据，不进入发布成片',
      'Pexels 或 AI 图只能做氛围/辅助画面，不能暗示确定效果',
    ],
  };
}

function readLocalConfigValue(name) {
  const candidates = [
    'E:\\Codex\\my-video\\小妹视频工作台配置.txt',
    'E:\\Codex\\my-video-release\\xiaomei-video-workbench-20260528-v22\\小妹视频工作台配置.txt',
  ];
  for (const file of candidates) {
    try {
      if (!existsSync(file)) continue;
      const text = readFileSyncUtf8(file);
      const line = text.split(/\r?\n/).find((item) => item.trim().startsWith(`${name}=`));
      if (line) return line.slice(name.length + 1).trim();
    } catch {
      // Ignore config read errors and fall back to env-only mode.
    }
  }
  return '';
}

function readFileSyncUtf8(file) {
  return existsSync(file) ? readFileSync(file, 'utf8') : '';
}
