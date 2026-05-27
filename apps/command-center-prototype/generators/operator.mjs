export function generateOperatorPlan(goal = {}) {
  const target = goal.target || '7 天内让色彩小程序拿到 5 个付费订单';
  const budget = goal.budget || '每天 30 元';
  const deadline = goal.deadline || '7 天';
  const metric = inferMetric(target);

  return {
    target,
    budget,
    deadline,
    honestFeedback: buildFeedback(target),
    strategy: [
      '先用内容和发圈图拉起兴趣，不急着卖完整报告。',
      '每天固定产出小红书笔记、朋友圈配文、短视频脚本和试看图传播素材。',
      '所有内容都要把用户导向“先生成试看图”，不要直接讲大而全服务。',
      '每天晚上复盘试看人数、付款人数、问题反馈和内容表现。',
    ],
    tasks: [
      { type: 'intel', title: '检查今天的热点和竞品动作', owner: '市场情报官' },
      { type: 'content', title: '生成 3 条获客内容和 3 条发圈配文', owner: '内容策划官' },
      { type: 'visual', title: '制作 3 张试看图分享素材', owner: '视觉设计官' },
      { type: 'video', title: '生成 1 条小程序种草视频脚本', owner: '视频制作官' },
    ],
    progress: [
      { label: '今日内容', current: 1, target: 3 },
      { label: '试看用户', current: metric.previewUsers, target: metric.previewTarget },
      { label: '付费订单', current: metric.paidUsers, target: metric.paidTarget },
      { label: '复盘记录', current: 0, target: 1 },
    ],
    correction: [
      '如果试看用户少，优先优化封面和开头 3 秒钩子。',
      '如果试看多但付款少，优先检查试看图质量和付款按钮位置。',
      '如果评论多但上传少，补一条“如何拍两张照片”的流程视频。',
      '如果内容没互动，换成更强的前后对比和朋友评价话题。',
    ],
  };
}

function inferMetric(target) {
  const paidMatch = String(target).match(/(\d+)\s*个?付费|(\d+)\s*单/);
  const paidTarget = Number(paidMatch?.[1] || paidMatch?.[2] || 5);
  return {
    previewUsers: 0,
    previewTarget: Math.max(20, paidTarget * 8),
    paidUsers: 0,
    paidTarget,
  };
}

function buildFeedback(target) {
  if (String(target).includes('100') || String(target).includes('翻')) {
    return '这个目标可能偏激进，建议先拆成 7 天可验证的小目标，用内容和试看用户数据判断是否能放大。';
  }
  return '目标可以执行，但不能只靠发内容，需要把试看、付款、交付和复盘数据串起来。';
}
