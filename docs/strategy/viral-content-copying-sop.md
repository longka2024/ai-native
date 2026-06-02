# 爆款采集分析 SOP：从爬虫样本到自己的内容框架

Updated: 2026-05-29

Reference:

- Feishu note: `粉底液内衣 爆款素材底层逻辑拆解｜情绪价值+跨类目抄作业手册`
- Source URL: `https://t6mqqf4jd0.feishu.cn/wiki/G4WywUCW7inXvMkQlrUcyggTnMe`

## Core Judgment

爆款不是抄句子、抄标题、抄同行模板。

Longka content production has one first principle:

```text
选题定生死。
```

内容生产不是先问“怎么写”，而是先问“这个题值不值得做”。过去内容没有流量、没有结果，核心问题往往不是文案不够勤奋，而是选题没有经过高价值样本、评论痛点、情绪价值和可转化场景验证。

So the crawler technical base exists for one reason:

```text
不是为了爬得多，而是为了选得准。
```

Every source adapter must help answer:

1. 这个话题已经被市场验证过吗？
2. 它打中的真实痛点是什么？
3. 它调动了什么大众情绪？
4. 它能不能翻译成我们的产品表达？
5. 它今天能不能变成可发布内容？

真正要抄的是：

```text
产品功能背后的情绪价值
-> 高转化类目的表达结构
-> 目标用户的真实生活场景
-> 开头筛选人群
-> 中段建立信任
-> 结尾触发互动/行动
```

对于 Longka AI Native 内容工作流，这意味着爬虫采集来的爆款不能只做摘要，而要拆成“可复刻生产单”。

## What To Copy

### 1. Copy Emotion, Not Feature

不要只记录爆款说了什么功能，要翻译它卖的是什么情绪。

Example principle:

```text
普通表达：无痕、舒适、承托
高手表达：不用总是扯衣服的自在、穿浅色不尴尬的安心、不被身材困扰的自信
```

Apply to color report:

```text
普通表达：AI 色彩分析、生成形象报告、11 张图
高手表达：终于知道自己适合什么的确定感、发朋友圈有人夸的开心、买衣服少踩坑的安心、看到自己变精神的信心
```

Apply to AI Native boss system:

```text
普通表达：AI 员工、自动写文案、采集数据
高手表达：老板每天不再不知道发什么、少雇一个运营也能推进事情、看到工作进度的掌控感、内容终于有反馈的成就感
```

## 1:1 Viral Structure From The Reference

The reference gives a reusable 0-58 second short-video structure. This should become the default analysis template for short-video samples:

```text
0-3s: 集体痛点前置
3-8s: 个人信任背书
8-40s: 分维度实测验证
40-50s: 全场景覆盖
50-58s: 情绪共鸣 + 引导
```

| Time | Module | Purpose | Longka reusable rule |
| --- | --- | --- | --- |
| 0-3s | 集体痛点前置 | 一秒筛选精准人群 | Use "如果你想要 A、B、C" or "最怕的不是 X，而是 Y" to hit 3 pains at once |
| 3-8s | 个人信任背书 | 用自用/实测替代硬广 | Use "我测试了很多次", "小妹实测后发现", "客户反复问的是这个" |
| 8-40s | 分维度实测验证 | 眼见为实，打消顾虑 | Use before/after, screen recording, report output, comments, case images |
| 40-50s | 全场景覆盖 | 让用户代入自己的生活 | Cover at least 3 high-frequency scenes |
| 50-58s | 情绪共鸣 + 引导 | 提升点赞评论，降低销售阻力 | Roast the old way, name the new standard, invite users to test |

Longka must not produce content without this structure unless the operator explicitly chooses another template.

## Function To Emotion Translation Table

The reference article's strongest method is:

```text
功能 -> 用户真正痛点 -> 底层情绪价值 -> 可用话术
```

This must become a standard field in crawler analysis.

### Color Report Translation

| Surface feature | Real user pain | Emotional value | Content wording |
| --- | --- | --- | --- |
| AI 生成试看图 | 不知道自己适合什么，怕结果不像本人 | 确定感 | "先不急着买衣服，先看看自己到底适合什么方向" |
| 11 张完整报告图 | 单张图不过瘾，不知道发型、穿搭、色彩怎么统一 | 被完整照顾的安心 | "不是只给你一张好看的图，而是把妆发、色彩、穿搭方向一次整理清楚" |
| 前后对比 | 用户怕没变化、怕花钱没效果 | 看得见的变化 | "值不值得做，看对比图最直接" |
| 可发圈分享图 | 用户想被夸、想有社交反馈 | 被认可、被赞美 | "这张图不是给 AI 看的，是给朋友一眼看懂你的变化" |
| 男士形象优化 | 男士怕被美颜过度、怕变娘、怕不像本人 | 干净、精神、可信 | "男士不是要变网红脸，而是先变得精神、干净、有职业感" |

### AI Native Boss System Translation

| Surface feature | Real boss pain | Emotional value | Content wording |
| --- | --- | --- | --- |
| 内容采集 | 每天不知道发什么 | 不再卡住 | "不是让老板学 AI，而是每天先告诉你今天该发什么" |
| 爆款拆解 | 以前乱发内容没反馈 | 有依据 | "先看别人已经跑出来的内容，再拆成你自己的表达" |
| AI 员工任务 | 老板不会分配 AI 工作 | 掌控感 | "你只批目标，系统把事情拆给内容、视频、增长员工" |
| 发布包 | 文案生成后不知道怎么用 | 可执行 | "生成的不是建议，而是小妹今天就能复制、拍摄、发布的执行单" |
| 反馈闭环 | 发完就没下文 | 复利感 | "每条内容的评论和私信，都会变成下一轮选题" |
```

### 2. Copy Cross-category Patterns, Not Direct Competitors

直接抄同行会同质化，尤其是同一个类目里大家都在讲类似卖点。

Better source categories:

- Beauty and skincare: teaches before/after, insecurity, visible change.
- Fitness and body shaping: teaches discipline, comparison, transformation.
- Education and courses: teaches pain diagnosis, trust-building, result framing.
- Mother/baby and home: teaches safety, reassurance, detail proof.
- High-ticket consulting: teaches authority, decision framing, risk reversal.

For Longka:

- Color report should borrow from beauty/skincare, fitness transformation, personal styling, and consulting.
- AI Native boss system should borrow from business coaching, operations consulting, SaaS dashboards, and productivity transformations.

### 3. Copy Structure, Not Wording

A usable viral sample must be decomposed into:

```text
0-3s hook
target user filter
trust proof
pain expansion
solution process
visible result
interaction trigger
conversion action
```

The crawler output must not stop at title/body/comments. It must produce these fields.

## What Not To Copy

Do not copy:

- Exact wording.
- Competitor brand claims.
- Unrealistic promises.
- Sensitive platform phrases.
- Product categories with different decision logic.
- Pure feature explanations without emotional value.

For example, if a competitor says “AI 自动生成爆款内容”，Longka should not copy that claim. It should translate it:

```text
老板每天最痛苦的不是不会用 AI，而是不知道今天该发什么。
所以我们先帮你找到别人已经验证过的话题，再拆成你自己的内容。
```

## Analysis Framework For Crawled Samples

Every crawled content sample should be analyzed into this shape:

```json
{
  "sampleId": "",
  "platform": "xiaohongshu",
  "sourceTool": "manual-import | mediacrawler | apify-xhs | xcrawl",
  "originalTitle": "",
  "metrics": {
    "likes": 0,
    "collects": 0,
    "comments": 0,
    "shares": 0
  },
  "targetUser": "",
  "surfaceTopic": "",
  "realEmotion": "",
  "hiddenDesire": "",
  "fearOrRisk": "",
  "firstThreeSecondsHook": "",
  "trustProof": "",
  "contentStructure": [],
  "coverPattern": "",
  "commentPains": [],
  "copyablePattern": "",
  "doNotCopy": [],
  "longkaTranslation": "",
  "publishPackage": {
    "xhsTitle": "",
    "xhsBody": "",
    "videoScript": "",
    "momentsCopy": "",
    "commentReplySeeds": []
  }
}
```

## Longka Translation Method

Use this 5-step translation:

### Step 1: Identify the obvious topic

What is the content apparently about?

Example:

```text
粉底液内衣：无痕、浅色不透、舒服。
```

### Step 2: Identify the real emotion

What does the user emotionally want?

Example:

```text
不尴尬、不焦虑、不需要一直调整，穿出去很安心。
```

### Step 3: Map to Longka product

What similar emotion exists in our product?

Color report:

```text
不再乱买衣服、不怕拍照不好看、不怕别人说土，知道自己适合什么。
```

AI Native boss system:

```text
不再每天卡在“发什么”、不再靠灵感乱发、能看到今天的工作推进。
```

### Step 4: Rebuild the structure

Keep the structure, replace the scene.

```text
如果你想要 XX、XX、XX，这个工具就是给你的。
我最近一直在测试这套流程。
不是让你学 AI，而是让你每天知道先做哪件事。
```

### Step 5: Add proof and action

No proof means no conversion.

Proof can be:

- Screenshots.
- Before/after images.
- Comment screenshots.
- Operation recording.
- Real report output.
- Task board progress.
- Published content feedback.

## Production Templates

### Template A: Pain Test

Use when the sample has strong user pain.

```text
0-3s:
如果你也经常遇到 XX、XX、XX，这个问题不是你一个人有。

Middle:
我把它拆成了一个小流程：先看真实问题，再看判断依据，最后给一个能马上看到的小结果。

Proof:
这里是实际生成/实际测试的结果。

End:
你可以先试一次，不满意就当做一次自测，满意再继续做完整方案。
```

### Template B: Real Experience

Use when the sample has trust and personal-story value.

```text
0-3s:
我最近一直在测试一个方法，发现它解决的不是 XX，而是 XX 背后的焦虑。

Middle:
以前我以为用户在意的是功能，后来发现用户更在意的是能不能马上看到自己的变化。

Proof:
所以我把流程改成先出试看，再决定是否继续。

End:
这比一上来卖完整服务自然得多。
```

### Template C: Reverse Roast

Use when the sample has high completion potential.

```text
0-3s:
很多人做 XX 的方式，一开始就错了。

Middle:
不是功能不够多，而是没有先命中用户最想解决的那个情绪问题。

Proof:
你看这个案例，真正让人停下来的不是功能，而是这句痛点。

End:
所以我们抄爆款时，不抄句子，抄它为什么让人停下来。
```

## Product Integration

The AI Native content module should add these stages:

```text
Collect sample
-> detect category
-> extract emotion
-> extract structure
-> cross-category translation
-> generate Longka version
-> publish package
-> feedback metrics
```

Minimum useful output:

- 3 hook options.
- 1 title formula.
- 1 emotional value translation.
- 1 cover direction.
- 1 Xiaohongshu note.
- 1 short video script.
- 1 Moments copy.
- 3 comment replies.
- 1 risk note.

## Acceptance Standard

A sample analysis is usable only if it answers:

1. Why did this content attract attention?
2. What emotion is it really selling?
3. Which part can be copied?
4. Which part must not be copied?
5. How do we translate it into our own product?
6. What can Xiaomei or an operator publish today?
7. What feedback should be collected after publishing?

If it cannot answer these, it is only a summary, not a production asset.
