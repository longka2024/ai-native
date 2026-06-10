import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const src = readFileSync(new URL("../workbench-v2-clean.js", import.meta.url), "utf8");
const start = src.indexOf("// LongkaTitleEngineV2: source-bound title engine.");
const end = src.indexOf("restoreWorkbenchSnapshot();", start);

if (start < 0 || end < 0) throw new Error("Longka title engine block not found");

const state = {
  publishTarget: "xhs",
  keywords: "AI 自媒体 内容资产库 Agent 工作流",
  businessLine: "AI 内容创作",
  titleAssets: [
    { title: "不删！来报恩的吧，重复发黄的上岸了！" },
    { title: "普通人做公众号内容，先想清楚这几个关键问题" },
  ],
};

const factory = new Function("state", `
${src.slice(start, end)}
return { buildCleanTitleChoices };
`);

const { buildCleanTitleChoices } = factory(state);

function titlesFor(target, topic) {
  state.publishTarget = target;
  return buildCleanTitleChoices(topic, state.titleAssets).map((item) => item.title);
}

function assertFiveXhsTitles(name, titles) {
  assert.equal(titles.length, 5, `${name}: should produce five titles`);
  for (const title of titles) {
    assert.ok(Array.from(title).length <= 20, `${name}: xhs title too long: ${title}`);
    assert.ok(!/�|閸|鐏|閿|缁|锟/.test(title), `${name}: mojibake title: ${title}`);
    assert.ok(!/当前|标题|生成|平台|点击|步骤|素材库|brief/i.test(title), `${name}: internal word leaked: ${title}`);
    assert.ok(!/(^|[^A-Za-z])(M|MV)$/.test(title), `${name}: truncated latin word: ${title}`);
  }
}

const topics = {
  mvp: {
    title: "不早说！看懂这些AI工具提前下班三小时",
    theme: "看懂 AI 工具如何让普通人提前下班三小时",
    pain: "代表工具：Cursor、Lovable、Replit、Base44。不懂代码的人也能用AI快速做出MVP，不要只收藏工具清单，要放进工作流。",
    reason: "点赞 2441 收藏 2766 评论 95 转发 219",
  },
  creator: {
    platform: "xiaohongshu",
    title: "自媒体人速码！5 个内容创作者必装的skills",
    theme: "自媒体人速码！5 个内容创作者必装的skills",
    pain: "很多人用 AI 写得更快了，但内容越来越像模板，担心没流量甚至被平台判低质。",
    reason: "点赞 175 收藏 257 转发 24 评论 11",
    reuse: "可以改成小红书图文、公众号长文、短视频脚本和朋友圈文案。",
    content: "这条素材方向是 AI 内容创作者的工具清单，但重点不是堆工具，而是怎么避免内容模板化和低质风险。",
  },
  education: {
    platform: "xiaohongshu",
    title: "私校面试别只背答案，孩子真正要练的是表达逻辑",
    theme: "私校面试准备方法",
    pain: "很多家长让孩子硬背标准答案，结果面试时表达很僵，老师反而看不出孩子真实特点。",
    reason: "点赞 328 收藏 601 评论 42",
    content: "这条素材适合写给准备私校面试的家长，重点是从背答案转向训练表达逻辑和真实经历。",
  },
  lawyer: {
    title: "律师做短视频别只讲法条，客户真正想听的是案件怎么解决",
    theme: "律师账号内容选题",
    pain: "很多律师账号内容太专业，用户看不懂，也不知道这个律师能不能解决自己的问题。",
    reason: "点赞 430 收藏 388 评论 56",
    content: "适合写律师内容账号，重点是从法条讲解转向客户问题和案件解决路径。",
  },
  growth: {
    platform: "x",
    title: "这条视频，想认真感谢一下这一路关注我的朋友。从 0 到 21K，我爬了 6 个月。",
    theme: "从 0 到 21K 的账号增长复盘",
    pain: "刚开始没有什么方法论，但通过持续发布和复盘，从 0 到 21K，发布1.8万条内容，3700万曝光。",
    reason: "likes 116 views quotes 12 replies 71 retweets 8 bookmarks 76",
    content: "适合改成小红书图文、公众号长文、短视频脚本和朋友圈文案，重点是账号增长复盘，而不是照抄感谢文案。",
  },
};

const mvpXhs = titlesFor("xhs", topics.mvp);
assertFiveXhsTitles("mvp xhs", mvpXhs);
assert.ok(mvpXhs.some((title) => /AI|工具|MVP|效率|下班/.test(title)), "mvp xhs should bind to AI tool/MVP/efficiency topic");

const creatorXhs = titlesFor("xhs", topics.creator);
assertFiveXhsTitles("creator xhs", creatorXhs);
assert.ok(creatorXhs.every((title) => !/Agent|工作流/.test(title)), "creator xhs should not be polluted by global Agent/workflow");
assert.ok(creatorXhs.some((title) => /AI|工具/.test(title)), "creator xhs should mention AI/tool");
assert.ok(creatorXhs.some((title) => /模板|低质|内容|写废/.test(title)), "creator xhs should bind to template/quality pain");

const educationXhs = titlesFor("xhs", topics.education);
assertFiveXhsTitles("education xhs", educationXhs);
assert.ok(educationXhs.every((title) => !/AI|工具|模板|低质|Agent|工作流/.test(title)), "education xhs should not reuse AI titles");
assert.ok(educationXhs.some((title) => /私校|面试|孩子|家长|表达/.test(title)), "education xhs should bind to education topic");

const lawyerXhs = titlesFor("xhs", topics.lawyer);
assertFiveXhsTitles("lawyer xhs", lawyerXhs);
assert.ok(lawyerXhs.every((title) => !/AI|工具|模板|私校|面试/.test(title)), "lawyer xhs should not reuse AI or education titles");
assert.ok(lawyerXhs.some((title) => /律师|法条|客户|案件|解决|听不懂/.test(title)), "lawyer xhs should bind to lawyer topic");

const growthXhs = titlesFor("xhs", topics.growth);
assertFiveXhsTitles("growth xhs", growthXhs);
assert.ok(growthXhs.every((title) => !/公众号|关键问题|0个|素材库|标题库|工具|AI/.test(title)), "growth xhs should not be polluted by title assets or AI topics");
assert.ok(growthXhs.some((title) => /21K|粉丝|增长|涨粉|复盘|账号|6个月/.test(title)), "growth xhs should bind to account growth topic");

const mvpWechat = titlesFor("wechat-article", topics.mvp);
assert.equal(mvpWechat.length, 5, "mvp wechat should produce five titles");
assert.ok(mvpWechat.some((title) => Array.from(title).length > 20), "wechat titles must not use xhs 20-char cap");
assert.ok(mvpWechat.some((title) => /AI|工具|MVP|效率|下班/.test(title)), "wechat titles should bind to mvp topic");

console.log(JSON.stringify({ mvpXhs, creatorXhs, educationXhs, lawyerXhs, growthXhs, mvpWechat }, null, 2));
