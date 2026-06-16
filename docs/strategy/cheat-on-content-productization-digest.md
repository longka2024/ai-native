# cheat-on-content 产品化消化笔记（2026-06-17）

来源:`external/cheat-on-content`(XBuilderLAB,4.3k★)。本文是把它"吃透"后、用于**产品化进 Longka 多租户后端**的提炼。配套:`docs/specs/2026-06-16-content-coach-loop-spec.md`、`memory/skill-productization-governance.md`。

## 核心闭环
`score → blind-predict → publish → T+3 retro → bump(进化rubric)`。方法论平台中立,自带 rubric 是"观点视频"赛道的种子。

## 子技能职责(15)
- init(建状态/rubric/目录/hooks) · learn-from(导对标账号样本起锚) · seed(生成草稿) · score(评分,委托给 blind 子代理,不写文件) · **score-blind**(隔离子代理,只看 草稿+rubric → 各维0-5 JSON) · predict(发布前写死`## 预测`,immutable) · shoot/publish(buffer±1) · **retro**(填实绩+评论聚类+证实/证伪→写观察) · persona(受众画像) · **bump**(全量重打+跨模型审计→重写rubric) · recommend/trends/status/migrate。

## rubric 四文件(故意拆分,防"盲通道"泄漏)
- `rubric_notes.md` = 评分公式唯一真源,**blind 子代理唯一白名单**,只准通用语言(公式/维度0-3-5锚点/桶边界/无样本名的观察ID)。
- `rubric-memo.md` = 升级备忘档,**blind 子代理禁读**(含真实标题+实绩+审计引述)。
- `benchmark.md` = 对标样本(calibration≥10后淡出,不删)。
- `audience.md` = 受众画像(评论衍生→含实绩→blind 禁读)。

种子 rubric(观点视频7维):ER情绪共鸣×1.5 / SR社会共鸣×1.5 / HP钩子×1.5 / QL金句 / NA叙事 / AB受众广度 / SAT讽刺深度,各0-5。冷启动用等权 v0。

## 三条不可违背原则 + 强制机制
1. **盲预测**:看到任何实绩前写完,`## 预测`段 immutable,只能往`## 复盘`追加。原版靠 `hooks/prediction-immutability.sh`(PreToolUse 拦 Edit)。→ **产品化改为 DB 不可变约束**。
2. **bump 刹车(全量重打)**:升级必须 ① 写完整新公式 ② 校准池全量用新公式重打(**必须走 blind 子代理,不接受 self-score**)③ 新排序 vs 实际播放排序 Spearman+两两 一致性 **≥0.8(写死,不许临时调低)** ④ **跨模型独立审计(必须)**:调外部 LLM 给 PASS/REJECT;本地PASS+外部REJECT=REJECT ⑤ 清理:删"已吸收为维度"和"被证伪"的观察,泄漏自检 grep 命中则 abort 回滚。
3. **观察是工作台不是博物馆**:被推翻/被吸收的观察**删掉**,git history 才是档案。禁止划线保留/"我曾以为X"。
+ 贯穿:**盲通道泄漏防护**——数字/万/播放量/标题/实绩绝不进 `rubric_notes.md`,只进 memo。

## 状态/DB
原版:每项目 `.cheat-state.json`(单文件单会话无锁)+ 一堆 md。可选 `content.db`(SQLite,calibration≥30触发):
- `articles`(id/title/7维分+composite/predicted bucket/blind_status/published_at/platform/**actual_plays/likes/comments/shares/saves**/...)
- `scoring_history`(追加,版本可溯) · `bumps`(追加:from/to版本+前后公式+rank_consistency+cross_model_audit结果+memo)
- 视图 calibration_pool / pending_retros / top_candidates
- confidence 由样本数派生(0→🔴 21+→🔵),只展示不卡功能。
→ **产品化:换成多租户 PG,表加 `tenant_id/account_id`;content.db schema 就是现成蓝图。**

## 小红书实绩适配器(xhs-explore)
契约 `bash run.sh <note_id> <folder> [script]` → `report.md`。拉:**view/likes/collected/comments/shared + 涨粉 + 热评(文本+赞+IP)**。机制:Playwright 持久登录(`.auth-xhs/` QR扫码)+ **被动拦截 XHR JSON**(不逆向签名),主路 creator-center galaxy API,评论走前端API,拦不到则降级人工。依赖 playwright+chromium(~500MB)。→ **产品化:复用"字段集+被动拦截哲学",出图数据走 Longka 内部采集(MediaCrawlerPro),不搬这个 CLI。**

## 方法论 vs 操作者机器(产品化取舍)
**重写进后端(纯方法论,无命令无人工):** 五段闭环 + 排序;rubric 维度定义+0-5标准+公式(每租户每号一份);盲预测纪律(DB存证+不可变+追加复盘);复盘结构(实绩+衍生比+评论聚类+证实证伪);**bump 校验逻辑(全量重打+≥0.8+跨模型审计+清理)**;confidence派生;观察生命周期;**A/B/C 通道**(A主推理 / B=只看草稿+rubric 的隔离 LLM 调用 / C=第二家模型审计——Longka 已有 DeepSeek,B/C 就是两个隔离 prompt 调用)。

**丢弃/不搬(假设单人敲命令):** 所有 `/cheat-*` 斜杠路由 + 触发词表;bash hooks(→改 DB 约束+后端事件);`.cheat-state.json` 单文件(→多租户 DB);交互式问答/控制台输出;xhs Playwright+QR 适配器(→复用字段集,数据走内部采集);每用户本地 md + git 当档案。

## Longka 大白话映射(客户端绝不露 cheat/rubric/盲预测/朱雀)
- **发布前判断** = B通道盲评分 + 桶 + confidence,以大白话建议呈现。
- **复盘校准** = retro(内部采集自动拉实绩 + 评论聚类 + 命中/落空)。
- **评分公式升级** = bump(按号自动触发,rank一致+跨模型审计把关),静默,永不外露。

## 载重警告(不可为省事砍掉)
**B通道隔离 + C跨模型审计 + 盲预测不可变** 是让闭环"不自欺"的承重墙。必须忠实重写成两个隔离 LLM 调用,不能简化掉,否则闭环退化成"凭直觉自我安慰"。
