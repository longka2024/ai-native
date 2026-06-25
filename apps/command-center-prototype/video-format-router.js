// video-format-router.js — 文案 → 视频形态 智能推荐(脚本规则,免费即时)
// 反"千篇一律 AI 味":不同文案荐不同形态(AI剧情/泥人偶/口播/混剪/漫画/数据)。
// 文案为先:读类型/情绪/意图 → 打分 → 推荐 ready 形态;最配但建设中的会回落到最高分 ready 形态。

const VIDEO_FORMATS = [
  { id: "ai", name: "AI 剧情", emoji: "🎬", good: "情绪 / 故事 / 痛点 / 逆袭", cost: "约 7 元/条", desc: "拟人角色把故事演出来,有情节有钩子", ready: true },
  { id: "clay", name: "泥人偶定格", emoji: "🧸", good: "治愈 / 反差萌 / 慢生活", cost: "约 7 元/条", desc: "黏土定格风,温暖手作感,反 AI 味", ready: true },
  { id: "oral", name: "口播", emoji: "🎙️", good: "观点 / 态度 / 带教 / 认知", cost: "≈ 免费", desc: "有立场地把观点讲透,卡通形象出镜", ready: true },
  { id: "mix", name: "混剪 B-roll", emoji: "🎞️", good: "盘点 / 种草 / 清单 / 对比", cost: "≈ 免费", desc: "真实空镜按节奏剪 + 字幕,信息密度高", ready: true },
  { id: "comic", name: "小妹漫画", emoji: "🖼️", good: "知识 / 干货 / 步骤 / 教程", cost: "约 1 元/条", desc: "小妹卡通分格漫画把方法/故事讲清楚(真实物件+短句,3秒读懂)", ready: true },
  { id: "data", name: "数据视频", emoji: "📊", good: "数据 / 复盘 / 榜单", cost: "≈ 免费", desc: "数字动起来,程序化生成,可信", ready: false },
];

const VIDEO_SIGNAL_REASON = {
  story: "这篇偏情绪故事 / 第一人称经历,适合让角色演出来",
  calm: "这篇偏治愈 / 慢节奏,定格泥偶的手作感更对味",
  opinion: "这篇是观点 / 态度输出,口播能把立场讲透",
  list: "这篇是盘点 / 种草 / 清单,混剪空镜信息密度高",
  howto: "这篇是知识 / 步骤干货,漫画或信息图最讲得清",
  data: "这篇含数据 / 榜单,数据动效更可信",
  default: "按内容默认推荐叙事形态",
};

// 文案 → 形态打分。返回 { ranked:[{...fmt,score}], top, signal, reason }
function classifyVideoFormats(copy, title, workspace) {
  const t = (String(title || "") + " " + String(copy || "")).toLowerCase();
  const ws = String(workspace || "");
  const has = (arr) => arr.some((k) => t.includes(k));
  const cat = { story: 0, calm: 0, opinion: 0, list: 0, howto: 0, data: 0 };
  if (has(["那天", "后来", "曾经", "崩溃", "焦虑", "摆烂", "逆袭", "以前的我", "直到", "那一刻", "我哭", "我曾", "故事"])) cat.story += 3;
  if (has(["治愈", "温柔", "慢", "陪伴", "晚安", "疗愈", "松弛", "可爱", "萌", "温暖", "小确幸", "慢生活"])) cat.calm += 3;
  if (has(["我觉得", "其实", "真相", "别再", "你要", "你得", "建议", "认知", "劝你", "记住", "听我", "千万", "不要", "醒醒"])) cat.opinion += 3;
  if (has(["盘点", "推荐", "好用", "排行", "排名", "对比", "测评", "清单", "合集", "好物", "避雷", "第一名", "必买", "种草"])) cat.list += 3;
  if (has(["步骤", "方法", "教程", "攻略", "如何", "怎么", "技巧", "指南", "第一步", "干货", "①", "②", "流程", "公式"])) cat.howto += 3;
  if (has(["数据", "复盘", "增长", "涨粉", "转化", "营收", "榜单", "统计", "报告", "万赞", "占比", "同比"])) cat.data += 3;
  if (ws.includes("女性")) { cat.story += 1; cat.calm += 1; }
  if (ws.includes("留学") || ws.includes("私校")) { cat.howto += 1; cat.list += 1; }
  if (ws.includes("美容")) { cat.list += 1; cat.howto += 1; }

  const score = { ai: 0, clay: 0, oral: 0, mix: 0, comic: 0, data: 0 };
  score.ai += cat.story * 1.0 + cat.calm * 0.4;
  score.clay += cat.calm * 1.0 + cat.story * 0.3;
  score.oral += cat.opinion * 1.0;
  score.mix += cat.list * 1.0 + cat.howto * 0.4 + cat.data * 0.4;
  score.comic += cat.howto * 1.0;
  score.data += cat.data * 1.0;

  let signal = "default";
  let best = 0;
  for (const k of Object.keys(cat)) if (cat[k] > best) { best = cat[k]; signal = k; }

  const ranked = VIDEO_FORMATS.map((f) => ({ ...f, score: score[f.id] || 0 })).sort((a, b) => b.score - a.score);
  const readyRanked = ranked.filter((f) => f.ready);
  const top = readyRanked.find((f) => f.score > 0) || readyRanked[0];
  return { ranked, top, signal, reason: VIDEO_SIGNAL_REASON[signal] || VIDEO_SIGNAL_REASON.default };
}
