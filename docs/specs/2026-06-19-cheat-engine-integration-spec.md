# cheat-on-content 接入工作台 落地 spec（2026-06-19 吃透后）

> 源:`external/cheat-on-content`(XBuilderLAB 4.3k★)。4 个 agent 全文读透。延续 `2026-06-16-content-coach-loop-spec.md`,这份是**后端落地版**。
> 北极星:cheat 能力**沉后端自动跑**,客户(小妹)零技术、只拿结果;**客户端绝不暴露** cheat/rubric/channel/盲预测/bump 黑话。

## 一句话
给**每个客户**一个「**随真实数据进化的评分公式(rubric)+ 盲预测纪律**」,让内容质量**越改越好**。不是 AI 替你写,是 AI 替你**判分**,稿子还是运营的。

## 全貌(飞轮)
```
对标起锚(learn-from) → 打分(盲score) → 盲预测(锁死) → 发布登记
→ T+3 复盘(真实数据+评论) → bump 进化 rubric → 回到打分(越来越准)
```

## rubric(核心数据)
- 每租户一份评分公式。起步 = 内置 **v0 等权 7 维**(直接抄 `starter-rubrics/opinion-video-zero.md`):ER 情感共鸣 / HP 钩子强度 / QL 金句密度 / NA 叙事性 / AB 受众广度 / SR 社会议题共振 / SAT 讽刺深度,各 0-5,`composite=(7维和)/7×2.0`(0-10)。
- **存 PG JSONB**(不用它的 md 文件流),每租户一行。**拆两份(血泪教训)**:`rubric_notes`(纯公式+通用维度定义,盲打分可读)+ `rubric_memo`(含真实实绩/视频名,盲打分**物理上 SELECT 不到**)。

## 三 Channel 隔离(防作弊根基)
- **A 主决策**(后端编排,被"看过实绩"污染)
- **B 盲打分**(skills-runner 无状态调用,**只喂 草稿+rubric_notes 两段,绝不拼实绩/评论/历史** → 后端天然盲,比它文件隔离更干净)。主力 DeepSeek,出严格 7 维 JSON,composite 在 Node 算。
- **C 跨模型审**(bump 终局,**必须真跨厂商**:DeepSeek 打分 → Qwen/Kimi 审,否则 RLHF 共享=白审)。

## 分期落地

### P0(先上·治小妹"改文案质量"真痛 + 激活闲置 dbs;纯 LLM+存储,不依赖抓取/调度)
1. **rubric 存 PG**:每租户一份,起步内置 v0 等权 7 维。
2. **盲打分 skill**:skills-runner 注册 `content-score`,system prompt=维度定义+打分规则+JSON schema;Node 只传 `{草稿, rubric_notes}`(自检不漏实绩),DeepSeek 出 7 维 `{score,confidence,reason引用原文}`;composite Node 算。UI 大白话:**综合分 + 各维一句话 + 预计热度档**。整数分、理由必引原文(复盘定位错判用)。
3. **对标起锚(learn-from 落地 = 对标一条龙 + 冷启动)**:输入对标账号 + 3-10 样本(每条 **稿子+数据+印象** 三元组)→ DeepSeek 拆(钩子类型/3段结构/双声道/MVP + 7维**定性**信号)→ 起锚该租户 rubric 定性方向 + 指纹库(标 `imported_untested`)+ 选题方向感。**红线:只给方向不给权重(5-10样本必过拟合)。** 图文对标走江湖导入;视频对标走"下载+正文抓取/转写+拆解"。

### P1(盲预测纪律·DB 不变量)
- 确认文案 → **盲预测**(7维+composite+热度档+概率分布)→ 写 PG `predictions` 行,**写入即 freeze**(行级 `is_locked`/触发器禁 UPDATE 预测列,只许 append 复盘列)= 物理锁的后端替代(它的 shell hook 我们搬不动)。
- 发布登记(平台/URL/时间/平台ID)→ pending_retros 入列。
- disagreement:主估 vs 盲打分 delta≥2 的维度推 UI 让运营裁定(绑当前内容,合人性化偏好)。

### P2(复盘飞轮·要数据回流+调度)
- **T+3 cron** 扫所有租户 `published_at+window<=now 且未复盘` → 生成"该复盘"任务。
- **抓真实数据**:**xhs-explore galaxy 创作者中心移植(唯一硬骨头)** —— 抓客户自己笔记 曝光/赞/藏/评/转/涨粉(MediaCrawler 抓别人爆款替代不了自己后台数据);评论/互动用 MediaCrawler。Playwright 持久登录+被动拦截(合四铁律,不逆向)。多租户:每客户授权一次创作者中心登录态(新授权维度,采集内部化)。
- 复盘:实绩 vs 盲预测 → 派生比率(赞播比/评播比)+ 评论聚类 + 逐维验证/推翻 → 写 `rubric_memo`;`consecutive_directional_errors` push high/low;Phase7 **提议** bump(脚本规则触发:≥3连续同向 或 单次≥10x)。

### P3(rubric 自进化 bump·最难最高风险)
- bump 5 步(`bump-validation-protocol` 写死,不可跳):① 写完整新公式 ② 校准池**全量重打**(channel B,每维重打不只 composite,Task 不可用就 abort)③ 排序一致性 ≥**4/5 写死** + pairwise 无回归 ④ **跨模型审(channel C)** PASS/REJECT,冲突视为 REJECT ⑤ 落地 + **cleanup(证伪即删)** + **leak guard**(rubric_notes 跑正则查实绩泄漏,命中回滚)。
- 历史预测追加 `Re-scored`;rubric 升版;清空 errors。
- 移植 `diff_pct`(改稿>30%重判)、`score-curve`(预测精度收敛曲线,看在校准还是漂移)。
- **升级故意做难**:健康节奏=bump 越来越罕见、越来越大(一次解释多个累积观察)。

## 大白话映射(客户端)
| 内部(绝不暴露) | 小妹界面 |
|---|---|
| rubric / composite | 评分标准 / 综合分 |
| ER/HP/QL... 维度 | 钩子强不强 / 情感够不够 / 有没有金句… |
| bucket | 预计热度档 |
| 盲预测 | 发布前判断 |
| retro | 发完3天回看准不准 |
| bump | 评分公式升级(自动) |
| channel/blind/audit | (完全不出现) |

## 复用我们已有 vs 必须新建
- **复用**:趋势源(aihot/trendradar 122 已部署)、`/api/fetch-article` 正文抓取(代 whisper)、MediaCrawler(评论/别人爆款)、DeepSeek(打分/拆解)、江湖工具箱(对标图文导入)、PG。
- **新建**:xhs-explore galaxy 创作者中心抓取(硬骨头)、PG immutable 预测表、T+3 cron、跨模型审(加 Qwen/Kimi)。

## 红线(照搬会踩坑)
盲打分 prompt 只喂草稿+rubric_notes(漏实绩即破盲)· rubric/memo 双表物理隔离 · rubric 信号只定性不给权重 · persona 绝不进打分 · 对标"印象判断"不能省 · THRESHOLD 4/5 写死不可临时调 · 跨模型审必须真跨厂商 · 证伪即删(rubric 是工作台不是博物馆)。

## 建议起步
**先做 P0**(打分 + rubric + 对标起锚)—— 直接治小妹"改文案质量低"的真痛,且激活闲置的 dbs 拆解/cheat 评分,**不依赖抓取/调度/数据**,当天能见效。盲预测→复盘→bump 是数据攒够后的二三阶段。
</content>
