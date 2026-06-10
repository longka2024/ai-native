import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const src = readFileSync(new URL("../workbench-v2-clean.js", import.meta.url), "utf8");
const start = src.indexOf("// LongkaTitleEngineV2: source-bound title engine.");
const end = src.indexOf("restoreWorkbenchSnapshot();", start);

if (start < 0 || end < 0) throw new Error("LongkaTitleEngineV2 block not found");

const state = {
  publishTarget: "xhs",
  keywords: "AI 自媒体 内容资产库 Agent 工作流",
  businessLine: "AI 内容创作",
  titleAssets: [],
};

const factory = new Function("state", `
${src.slice(start, end)}
return { buildCleanTitleChoices };
`);

const { buildCleanTitleChoices } = factory(state);

function titlesFor(target, topic) {
  state.publishTarget = target;
  return buildCleanTitleChoices(topic, []).map((item) => item.title);
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

const mvpTopic = {
  title: "不早说！看懂这些AI工具提前下班三小时",
  theme: "看懂 AI 工具如何让普通人提前下班三小时",
  pain: "代表工具：Cursor、Lovable、Replit、Base44。不懂代码的人也能用AI快速做出MVP，不要只收藏工具清单，要放进工作流。",
  reason: "点赞 2441 收藏 2766 评论 95 转发 219",
};

const creatorTopic = {
  platform: "xiaohongshu",
  title: "自媒体人速码！5 个内容创作者必装的skills",
  theme: "自媒体人速码！5 个内容创作者必装的skills",
  pain: "很多人用 AI 写得更快了，但内容越来越像模板，担心没流量甚至被平台判低质。",
  reason: "点赞 175 收藏 257 转发 24 评论 11",
  reuse: "可以改成小红书图文、公众号长文、短视频脚本和朋友圈文案。",
  content: "这条素材方向是 AI 内容创作者的工具清单，但重点不是堆工具，而是怎么避免内容模板化和低质风险。",
};

const educationTopic = {
  platform: "xiaohongshu",
  title: "私校面试别只背答案，孩子真正要练的是表达逻辑",
  theme: "私校面试准备方法",
  pain: "很多家长让孩子硬背标准答案，结果面试时表达很僵，老师反而看不出孩子真实特点。",
  reason: "点赞 328 收藏 601 评论 42",
  content: "这条素材适合写给准备私校面试的家长，重点是从背答案转向训练表达逻辑和真实经历。",
};

const lawyerTopic = {
  title: "律师做短视频别只讲法条，客户真正想听的是案件怎么解决",
  theme: "律师账号内容选题",
  pain: "很多律师账号内容太专业，用户看不懂，也不知道这个律师能不能解决自己的问题。",
  reason: "点赞 430 收藏 388 评论 56",
  content: "适合写律师内容账号，重点是从法条讲解转向客户问题和案件解决路径。",
};

const mvpXhs = titlesFor("xhs", mvpTopic);
assertFiveXhsTitles("mvp xhs", mvpXhs);
assert.ok(mvpXhs.some((title) => /AI|工具|MVP|效率|下班/.test(title)), "mvp xhs should bind to AI tool/MVP/efficiency topic");

const creatorXhs = titlesFor("xhs", creatorTopic);
assertFiveXhsTitles("creator xhs", creatorXhs);
assert.ok(creatorXhs.every((title) => !/Agent|工作流/.test(title)), "creator xhs should not be polluted by global Agent/workflow");
assert.ok(creatorXhs.some((title) => /AI|工具/.test(title)), "creator xhs should mention AI/tool");
assert.ok(creatorXhs.some((title) => /模板|低质|内容|写废/.test(title)), "creator xhs should bind to template/quality pain");

const educationXhs = titlesFor("xhs", educationTopic);
assertFiveXhsTitles("education xhs", educationXhs);
assert.ok(educationXhs.every((title) => !/AI|工具|模板|低质|Agent|工作流/.test(title)), "education xhs should not reuse AI titles");
assert.ok(educationXhs.some((title) => /私校|面试|孩子|家长|表达/.test(title)), "education xhs should bind to education topic");

const lawyerXhs = titlesFor("xhs", lawyerTopic);
assertFiveXhsTitles("lawyer xhs", lawyerXhs);
assert.ok(lawyerXhs.every((title) => !/AI|工具|模板|私校|面试/.test(title)), "lawyer xhs should not reuse AI or education titles");
assert.ok(lawyerXhs.some((title) => /律师|法条|客户|案件|解决|听不懂/.test(title)), "lawyer xhs should bind to lawyer topic");

const mvpWechat = titlesFor("wechat-article", mvpTopic);
assert.equal(mvpWechat.length, 5, "mvp wechat should produce five titles");
assert.ok(mvpWechat.some((title) => Array.from(title).length > 20), "wechat titles must not use xhs 20-char cap");
assert.ok(mvpWechat.some((title) => /AI|工具|MVP|效率|下班/.test(title)), "wechat titles should bind to mvp topic");

console.log(JSON.stringify({ mvpXhs, creatorXhs, educationXhs, lawyerXhs, mvpWechat }, null, 2));
