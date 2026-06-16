# 系统模块 × 工具/Skill 使用对账表（2026-06-17 实测代码）

图例:✅ 真用上了 / ⚠️ 半接·死标签·写了没接 / ❌ 没用上(浪费)

## 按内容工厂流程逐段

| 流程步骤 | ✅ 用上了 | ⚠️ 半接/死标签 | ❌ 没用上(浪费) |
|---|---|---|---|
| ① 信号发现 | TrendRadar(`/api/signals/trendradar-hits`)、AI HOT(`/api/signals/aihot-items`) | — | agent-reach |
| ② 真实采集 | MediaCrawlerPro(import-sqlite/xhs-collect/xhs-comments)、XCrawl(x-user-tweets,X/海外)、内置 fetch(`/api/fetch-article` 抓网页正文)、hot30(兜底) | — | last30days(只 vendored 在 `.agents/`,没接)、agent-reach |
| ③ 选题候选 | 本地脚本 buildTopicsFromDb(评分+预测,绑真实来源) | — | cheat-trends / cheat-recommend、dbs-deconstruct(选题清晰度) |
| ④ 成篇/改写 | DeepSeek(写作主力)、**humanizer-zh**(去AI味,每版都跑) | — | cheat-seed、dbs-content、dbs-hook |
| ⑤ 质检/教练打分 | 本地**硬编码 8 维启发式**(scoreTitleHook/开头留存/痛点/具体感/收藏/人味/平台契合/转化) | 硬编码、部分死在美业 | **cheat-score(盲评分+rubric)**、dbs-content |
| ⑥ 标题 | 本地标题逻辑 | dbs-xhs-title(注册了,spec审计为**死标签**,没真调) | — |
| ⑦ AI味检测 | — | dbs-ai-check(注册了,**死标签**,没真调) | 朱雀终检 |
| ⑧ 封面/配图 | **cover-from-content**(今天)、Kie+43出图、风格库(归藏/juju/小黑=内化的 guizang/juju/ian-xiaohei skill) | cover-replicator(人像对标,写了**没接UI**) | — |
| ⑨ 发布登记/作品记录 | 表单+存储有(`/api/final-work`) | "作品记录"面板是**假占位**(sampleAssetItems),没接真实已发帖 | — |
| ⑩ 数据回填 | 回填表单字段有(阅读/赞/藏/评/转) | 没看板、没T+3驱动 | **cheat 的 xhs-explore 自动拉数据**(现在全靠手填) |
| ⑪ 复盘 | server 复盘 endpoint(自动生成复刻任务)半成品 | — | **cheat-retro**(评论聚类+证实/证伪) |
| ⑫ 越改越好(rubric进化) | — | — | **cheat-bump + 每号独立 rubric + 盲预测 + 跨模型审计 全空白** |

## skills 总账

- **skills-runner 真正注册的只有 4 个**:`cover-from-content`✅、`humanizer-zh`✅、`dbs-ai-check`⚠️死、`dbs-xhs-title`⚠️死。
- **cheat-on-content(15子技能):整套❌没接**——`rewrite-engine.js:140` 只有一句 prompt 提示词"初稿后必须做体检",不是真 skill。已迁到 `external/cheat-on-content`,待产品化。
- **DB系列(~20个 dbs-*):只 2 个注册且都是死标签**;deconstruct/diagnosis/hook/report/content/content-system/save/restore/learning… 全❌没用(其中多数本就是"操作者对话工具",按治理不该塞进客户产品)。
- **视觉类**:guizang/juju/ian-xiaohei 的方法论已内化进 VISUAL_STYLE_REGISTRY ✅。

## 浪费最大的三块(= 下一步主战场)
1. **cheat-on-content 整套**(越改越好的发动机)——一行没接。
2. **数据闭环**:作品记录看板假占位、回填无驱动、xhs 自动拉数据没用、复盘半成品、rubric进化全空白。
3. **agent-reach / last30days / 朱雀**——给了没接。

(DB系列大部分是"对话诊断工具",按 `skill-productization-governance.md` 只挖方法论、不进客户产品,不算狭义"浪费"。)
