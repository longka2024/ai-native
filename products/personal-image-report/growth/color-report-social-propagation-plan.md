# Color Report Social Propagation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 把星火形象色彩报告从“付费交付工具”升级为“可晒、可转、可讨论、可复购”的社交传播型 AI 小程序样板。

**Architecture:** 维持现有 122 小程序/API + 43 生图服务 + 微信小程序前端三方职责不变。在现有试看图和 11 页完整报告之外，新增分享资产生成、分享文案、用户分享入口、后台追踪和小妹种草视频模板。

**Tech Stack:** 微信小程序、Node.js API、Postgres、43 图像生成服务、Remotion 小妹视频工作台、现有个人形象报告生成链路。

---

## Product Principle

这次不是增加“更多报告页”，而是补齐增长机制：

1. 用户先因为好奇上传照片。
2. 系统给她一个低门槛试看结果。
3. 结果里有一张可发朋友圈/小红书的分享卡。
4. 用户可以一键保存图、一键复制文案。
5. 朋友看到后产生“我也想测”的冲动。
6. 完整报告继续承接付款和复购。

关键判断：分享卡不是报告摘要，而是社交货币。它要让用户愿意表达“我是谁、我适合什么、你们看准不准”。

## WeChat Review Safety Principle

这套社交属性必须按正式审核可过的保守方案做：

- 不做诱导分享：不写“转发后解锁”“分享给好友领取”“拉人获得报告”。
- 不做返利裂变：不做邀请奖励、返现、抽奖、排行榜。
- 不做强制传播：用户不分享也能正常查看试看图和完整报告。
- 不做夸大承诺：不写“保证变美”“精准改变人生”“一定提升桃花/收入”。
- 不做敏感人群判断：不基于照片输出种族、政治、疾病、命运等敏感判断。
- 分享功能只保留三个安全动作：保存自己的结果图、复制自用文案、查看工具生成过程。
- 视频内容只展示“小程序怎么用”和“结果卡长什么样”，不引导加微信、不诱导私信、不承诺收益。

正式提交审核时，分享区文案应使用“保存结果图”“复制记录文案”“发给朋友看看”这类中性表达，避免“裂变、拉新、邀请、奖励、爆粉”等词。

---

## Phase 1: Define Share Assets

### Task 1: Add Share Asset Product Spec

**Files:**
- Create: `color-report-social-assets-spec.md`

**Requirements:**
- 定义 3 类分享资产：
  - `style-tag-card`: 我的形象标签卡，适合朋友圈。
  - `xiaohongshu-cover-card`: 小红书封面卡，适合种草笔记。
  - `friend-quiz-card`: 朋友互动卡，适合“你觉得准吗”。
- 每类资产包含：标题、视觉结构、必填字段、中文文案、CTA、是否带头像/试看图。
- 明确不写夸大承诺，不写医疗、玄学、绝对变美。

**Acceptance:**
- 规格文件能让开发者不再临时想版式。
- 每张卡都能回答：用户为什么愿意发？别人为什么想点？

### Task 2: Add Social Copy Bank

**Files:**
- Create: `color-report-social-copy-bank.md`

**Requirements:**
- 朋友圈文案 20 条。
- 小红书标题 30 条。
- 评论区回复 20 条。
- 朋友互动话术 15 条。
- 按驱动力分类：好奇心、个人魅力、社会认同、懒惰、避坑恐惧。

**Acceptance:**
- 小妹可以直接复制使用。
- 文案重点是“过程展示/工具体验”，不是硬广。

---

## Phase 2: Backend Data Model

### Task 3: Add Share Asset Fields To Job Data

**Files:**
- Modify: 122 API project job model / report job serialization.
- Modify: 43 generation result payload.

**Data Shape:**

```json
{
  "shareAssets": [
    {
      "id": "style-tag-card",
      "title": "我的形象标签卡",
      "file": "share-style-tag-card.png",
      "publicPath": "/generated/.../share-style-tag-card.png",
      "usage": "朋友圈/私聊",
      "copy": "我刚测出来...你觉得准吗？"
    }
  ],
  "shareCopies": {
    "moments": ["..."],
    "xiaohongshu": ["..."],
    "friendAsk": ["..."]
  }
}
```

**Acceptance:**
- 老订单没有 `shareAssets` 时前端不报错。
- 新订单生成后可以从 122 API 读到分享图和文案。

### Task 4: Generate Share Cards On 43

**Files:**
- Modify: 43 `personal-image-report-demo/server.js` or existing module image generation pipeline.
- Reuse: current overview/full report image generation path.

**Requirements:**
- 试看成功后至少生成 `style-tag-card`。
- 完整 11 页报告成功后生成全部 3 张分享卡。
- 分享卡必须使用已生成的人物结果/客户画像，不重新走高风险复杂生图时尽量复用已出图资产。
- 若分享卡生成失败，不阻断完整报告交付，但记录 `share_asset_generation_failed`。

**Acceptance:**
- 试看订单：有试看图 + 至少 1 张分享卡。
- 付款订单：有 11 页完整报告 + 3 张分享卡。
- 失败不影响主报告。

---

## Phase 3: Mini Program UX

### Task 5: Add Share Section To Preview Result Page

**Files:**
- Modify: 小程序试看结果页 WXML/WXSS/JS。

**UI Requirements:**
- 试看图下方新增“保存我的风格分享卡”。
- 按钮：`保存分享图`、`复制朋友圈文案`、`生成完整报告`。
- 未生成分享卡时显示“分享卡生成中，稍后刷新”。

**Acceptance:**
- 用户看完试看图后有明确下一步：保存、分享、付款。
- 不再只停留在“看图然后付款”。

### Task 6: Add Share Section To Full Report Page

**Files:**
- Modify: 小程序“我的完整形象报告”详情页。

**UI Requirements:**
- 完整 11 张高清图保持主位置。
- 分享资产作为独立区域：`适合发朋友圈`、`适合发小红书`、`发给朋友看准不准`。
- 每张卡支持点击放大、保存到相册、复制配文。
- ZIP 不是主入口；PDF 可保留为辅助下载。

**Acceptance:**
- 付费用户可以直接保存报告图，也可以保存分享图。
- 分享区不是挤在角落，而是完整报告交付后的第二转化动作。

### Task 7: Add Share Event Tracking

**Files:**
- Modify: 122 API event endpoint.
- Modify: 小程序分享/保存/复制按钮调用。

**Events:**
- `share_card_view`
- `share_card_save`
- `share_copy_copy`
- `report_image_save`
- `second_report_cta_click`

**Acceptance:**
- 后台能看到每个订单是否保存了分享图、复制了文案。
- 后续判断“分享卡是否真的带增长”有数据依据。

---

## Phase 4: Xiaomei Video Workbench

### Task 8: Add Social Propagation Video Templates

**Files:**
- Modify: `E:/Codex/my-video/scripts/xiaomei-video-workbench.mjs`
- Modify: `E:/Codex/my-video/video-workbench/catalog.json`
- Modify if needed: `E:/Codex/my-video/src/Composition.tsx`

**Templates:**
- `tool-demo-upload-two-photos`: 上传两张照片实测。
- `share-card-showcase`: 展示朋友圈分享卡。
- `xhs-note-cover`: 展示小红书封面卡。
- `friend-quiz`: “你觉得准吗”互动玩法。
- `full-report-unlock`: 试看满意后解锁完整报告。

**Acceptance:**
- 小妹每天可以选“工具怎么用/分享卡怎么晒/完整报告长什么样”三个方向发视频。
- 视频内容是种草工具体验，不是硬广引流。

### Task 9: Add Daily Posting Calendar

**Files:**
- Create: `E:/Codex/my-video/video-workbench/color-social-14-day-calendar.md`

**Requirements:**
- 14 天日更计划。
- 每天一个视频主题、开头 3 秒钩子、画面素材、CTA、发布平台。
- 第 1-3 天重点工具实测，第 4-7 天重点分享卡，第 8-14 天重点案例/复购/完整报告。

**Acceptance:**
- 小妹不用每天想选题。
- 运营每天只需替换素材和确认文案。

---

## Phase 5: Admin & Metrics

### Task 10: Add Social Metrics To Admin Page

**Files:**
- Modify: 122 admin backend/page.

**Metrics:**
- 今日试看数。
- 今日付款数。
- 分享卡生成数。
- 分享图保存数。
- 文案复制数。
- 从分享入口进入的人数，如微信小程序能拿到场景值则记录。

**Acceptance:**
- 管理后台能回答：有多少人看了、多少人保存、多少人付款、分享是否有迹象。

### Task 11: Add 7-Day Decision Dashboard

**Files:**
- Create or modify admin report view.

**Decision Rules:**
- 如果 7 天内试看转付款低于目标，先改试看图质量和促单文案。
- 如果保存分享卡的人少，改分享卡视觉和文案。
- 如果保存多但付款少，强化完整报告价值。
- 如果视频有播放但小程序访问少，改视频 CTA 和小程序名称露出。

**Acceptance:**
- 不是只凭感觉改产品，每 7 天有明确复盘依据。

---

## Execution Order

1. 先写规格和文案库，避免开发时乱做版式。
2. 先给试看订单加 1 张分享卡，不等完整 3 张全做完。
3. 小程序先接“保存分享图/复制文案”两个按钮。
4. 小妹视频工作台先加 3 个种草模板，不一次性做 5 个。
5. 后台先记录保存/复制事件，再做复杂归因。

---

## MVP Scope

第一版只要求：

- 试看结果多一张 `我的形象标签卡`。
- 页面能保存分享卡和复制朋友圈文案。
- 小妹视频工作台增加“分享卡展示”种草模板。
- 后台记录保存分享卡和复制文案。

不做：

- 复杂裂变奖励。
- 多级邀请返佣。
- 过度游戏化排行。
- 所有行业复制。

---

## Risks

1. 分享卡太像广告，用户不愿意发。解决：强调“我的风格结果”，少放商业 CTA。
2. 分享卡不像本人。解决：优先复用已经通过的试看图/报告图，不重新生成复杂人物。
3. 小程序保存图片权限体验差。解决：保存失败时给出清晰提示，并支持点击放大长按保存。
4. 数据归因不完整。解决：第一版只记录行为，不承诺完整裂变归因。
5. 过早扩展 B 端。解决：先把色彩项目跑成样板。

---

## Definition Of Done

- 新用户上传照片后，能看到试看图和一张可保存的分享卡。
- 付费用户完整报告页能看到报告图、分享图、复制文案。
- 小妹可以用工作台生产至少 3 类“工具使用种草视频”。
- 管理后台能看到分享图保存和文案复制行为。
- 7 天后可以根据数据判断：是试看图、分享卡、视频内容还是付款页的问题。
