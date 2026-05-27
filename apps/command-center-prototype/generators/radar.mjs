const hotSignals = [
  {
    source: '小红书',
    topic: '普通人形象改造前后对比',
    heat: 92,
    insight: '用户更愿意点开“前后变化明显”的内容，适合用试看图做引子。',
    action: '生成一组前后对比封面和 3 条种草标题。',
  },
  {
    source: '朋友圈',
    topic: '朋友帮我看这张风格卡准不准',
    heat: 81,
    insight: '带社交评价的问题更容易被转发，适合把试看图包装成可发圈分享卡。',
    action: '制作 3 条朋友圈互动配文。',
  },
  {
    source: '视频号',
    topic: '上传两张照片就能看形象建议',
    heat: 76,
    insight: '流程型视频降低用户行动门槛，适合做 30 秒操作演示。',
    action: '生成一条小程序使用流程视频脚本。',
  },
];

const publishQueue = [
  {
    platform: '小红书',
    title: '不是你不适合打扮，是你没拿到自己的风格说明书',
    status: '待人工确认',
    asset: '小红书图文 + 封面',
  },
  {
    platform: '朋友圈',
    title: '你觉得这张形象试看图像我吗？',
    status: '可直接复制',
    asset: '朋友圈配文 + 分享图',
  },
  {
    platform: '视频号',
    title: '两张照片生成形象试看图的完整流程',
    status: '待生成视频',
    asset: '短视频脚本',
  },
];

export function generateRadarState() {
  return {
    updatedAt: new Date().toISOString(),
    hotSignals,
    publishQueue,
    summary: 'AIMedia 的热点抓取和发布队列思路已融合为“经营雷达”：先发现热点，再转成内容任务和发布计划。',
  };
}
