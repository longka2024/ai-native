const titlePatterns = [
  '为什么你明明长得不差，照片里却总是没精神？',
  '普通人做一次形象分析，到底能看懂什么？',
  '别急着买衣服，先看看你的脸适合哪种风格',
  '我用 AI 给自己做了一张形象试看图，结果有点意外',
];

const painPoints = [
  '发型、衣服、妆容都单独看还可以，放在一起却不协调。',
  '不知道自己适合成熟感、清爽感，还是温柔知性的方向。',
  '买衣服靠感觉，试错成本高，拍照也不稳定。',
  '想改变形象，但不知道第一步应该改哪里。',
];

const callsToAction = [
  '想先看看自己适合什么风格，可以从一张试看图开始。',
  '先生成试看图，再决定要不要做完整报告，试错成本更低。',
  '适合想换发型、换穿搭、拍照更上镜的人先体验。',
];

export function generateContentDeliverable(task) {
  const seed = hashText(`${task.id}:${task.brief}`);
  const title = pick(titlePatterns, seed);
  const pain = pick(painPoints, seed + 3);
  const cta = pick(callsToAction, seed + 7);
  const topic = extractTopic(task.brief);

  return {
    title: '今日种草内容包',
    summary: `围绕“${topic}”生成 1 篇小红书笔记、3 条朋友圈配文和 3 条短视频脚本方向。`,
    content: {
      xiaohongshu: {
        title,
        coverText: '先看风格，再决定怎么变美',
        body: [
          '很多人不是不好看，而是没有找到适合自己的形象组合。',
          pain,
          '形象分析不是简单说你适合什么颜色，而是把脸型、肤色、发型、穿搭、配饰放在一起看。',
          '试看图的价值在于：先让你看到一个方向，再决定要不要继续做完整报告。',
          cta,
        ].join('\n\n'),
      },
      moments: [
        `今天做了一组形象试看图，最有意思的是：很多人的问题不是“不好看”，而是风格没有统一。${cta}`,
        `发型、衣服、颜色、配饰其实是一起工作的。先看一张试看图，很多人马上就知道自己该往哪个方向调整。`,
        `如果你最近想换发型、拍照、买衣服，但一直拿不准方向，可以先做一次轻量试看。`,
      ],
      videoScripts: [
        {
          hook: '为什么有的人换个发型，整个人就像变了？',
          outline: ['展示试看图', '解释脸型和发型关系', '给出适合/不适合方向', '引导体验小程序'],
        },
        {
          hook: '别再盲买衣服了，先看看你的风格定位',
          outline: ['提出痛点', '展示颜色对比', '说明完整报告能看什么', '引导先生成试看图'],
        },
        {
          hook: '普通人做形象分析，第一眼应该看什么？',
          outline: ['从脸型开始', '再看肤色和颜色', '最后看发型穿搭整体感', '引导下单完整报告'],
        },
      ],
    },
  };
}

function extractTopic(text) {
  if (!text) return '个人形象试看';
  if (text.includes('色彩')) return '色彩分析小程序';
  if (text.includes('发圈')) return '朋友圈传播';
  if (text.includes('短视频')) return '短视频种草';
  return text.slice(0, 18);
}

function pick(list, seed) {
  return list[Math.abs(seed) % list.length];
}

function hashText(text) {
  let hash = 0;
  for (const char of text) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }
  return hash;
}
