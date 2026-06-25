# 评论深挖（真实料引擎）SPEC — 2026-06-19

> 状态：待拍板（SPEC-first，未动手）
> 关联北极星：内容质量的"因"= 输入端真实料；文案/配图/视频只是表达手段。
> 关联记忆：collection-source-quality-jianghu · 2026-06-19-coach-pivot-buildinpublic
> 上游讨论结论：采集入口不薄，薄的是**评论这座未开采的金矿**；真实料 80% 来自评论深挖。

## 1. 为什么做（背景 / 命门）

- 投资人"电子垃圾"的真正命门 = 交付质量。质量的根在**输入语料的真实感**，不在排版/视频。
- 龙卡熟悉 AI 行业，能产 AI 线真实料；但民宿/私校/女性成长这些行业，**自己说不出有洞见、有真情实感的话** → 必须从"已经变成文字的真人表达"里捞。
- 真人表达密度最高、最新鲜、最对口的地方 = **爆款帖的评论区**。
  - 量级直觉：100 条真爆款 × 200–500 条评论 = **2–5 万条真实人话**，一周可达；远胜"再攒几千篇帖子"。
- 这是"破局慢"那个问题的最快一刀：现有 93 条料已够开跑，评论深挖让真实感再上一个台阶。

## 2. 现状（已勘定，基于真实代码，避免重造轮子）

| 资产 | 位置 | 状态 |
|---|---|---|
| `comments` jsonb 列 | `longka_content_samples` | ✅ 已存在 |
| 评论同步 `fetch_comments()` | `tools/sync_to_samples.py` | ✅ 已能拉 top-50 高赞评论（xhs/dy/wb/bili/zhihu），ON CONFLICT 仅在非空时覆盖 |
| MediaCrawlerPro 评论表 | `xhs_note_comment` 等 | ✅ Pro 采集后落 SQLite，sync 脚本已映射 |
| 江湖 93 条女性成长爆款 | PG（江湖导入） | ❌ `comments=[]`（江湖导出无评论正文，只有 CommentCount） |
| 评论"深挖"层（痛点/欲望/异议/金句提炼） | — | ❌ 不存在（核心新增） |
| 真实料喂回创作（RAG） | rewrite-engine / 起草 | ❌ 未接 |

**铁律对齐**：采集内部化（小号池详情模式，客户不碰 cookie）；绝不编评论（铁律3）；脚本预筛 > 大模型（铁律4，降成本）。

## 3. 方案设计（三层）

### L1 · 采集评论（把评论灌进系统）— 复用现有管线，不新建

- **路径**：MediaCrawlerPro **详情/指定帖模式**（给定 note_id 列表，**不走关键词搜索 → 保号**）。
- **取 note_id**：写一个小工具 `export-note-ids-for-comments.mjs`，从 PG 拉指定 workspace（先女性成长）江湖样本的 `source_id` / `source_url`（小红书 ArtworkUrl 形如 `.../explore/{note_id}`，可解析），输出 note_id 清单喂给 Pro。
- **回填**：Pro 采评论落 SQLite → **直接复用 `sync_to_samples.py`**（已有 fetch_comments + ON CONFLICT 非空覆盖），评论写回对应 sample 的 `comments` 列。**L1 几乎零新代码**，主要是打通操作链路 + 取 id 小工具。
- **保号红线**：只详情模式、限速、绝不"关键词搜索取评论"。

### L2 · 深挖 / 蒸馏（评论 → 结构化真实料）— 核心新增价值

- **脚本预筛（先，省钱）**：按赞排序、去重、长度过滤（剔 <6 字水评）、垃圾/广告词过滤、emoji-only 剔除 → 每帖精选 Top 20–30 条再喂 LLM。
- **新 skill `comment-miner`**（`~/.claude/skills/comment-miner/SKILL.md`，注册进 skills-runner，model: main，JSON 输出）：
  输入一帖的精选评论，输出结构化真实料：
  ```
  {
    painPoints: [{quote, freq}],     // 真实痛点（用户原话 + 复现度）
    desires:    [{quote}],           // 真实欲望 / 期待
    objections: [{quote}],           // 异议 / 反对 / 担忧（最珍贵，杀 AI 味）
    goldenQuotes:[string],           // 可直接进文案的真人金句
    emotions:   [string],            // 情绪信号
    topicGaps:  [string]             // 评论反复问、帖子没答 → 选题缺口
  }
  ```
- **存储**：新表 `longka_comment_insights`（一帖一行，可跨帖按 workspace 聚合真实料；不污染 sample 表）：
  ```sql
  create table if not exists longka_comment_insights (
    id text primary key,
    sample_id text references longka_content_samples(id) on delete cascade,
    workspace text default '',
    platform text default '',
    comment_count int default 0,        -- 实际深挖的评论条数
    pain_points jsonb, desires jsonb, objections jsonb,
    golden_quotes jsonb, emotions jsonb, topic_gaps jsonb,
    created_at timestamptz default now(),
    unique(sample_id)
  );
  ```
- **批处理 API**：`POST /api/comments/mine/start`（异步，按 workspace 批量跑），`GET /api/comments/mine/status`，`GET /api/comments/insights?workspace=`（聚合真实料）。

### L3 · 喂回创作（闭环，真实感落地）

- **RAG 注入**：起草 / 改写时，把该 workspace 的真实料（高频痛点 + 金句 + 异议）拼进 prompt 当"地基"，强制内容带真人具体表达。接 `rewrite-engine` 起草链路 + `doPrecheck`。
- **接对标起锚**：评论真实料补进 `longka_benchmark` 的 signals（选题缺口 → 选题方向；痛点 → 评分方向），强化已建的"客户专属打分"。
- **UI（大白话，不暴露黑话）**：素材/选题侧增一块"真实声音"——展示这个方向用户**真实在说什么/担心什么/反复问什么**；不出现"评论挖掘/RAG/insights"等内部名。

## 4. 验收条件

1. 女性成长 93 条中，可解析 note_id 的帖子 ≥ N 条成功回填真实评论（comments 非空）。
2. `comment-miner` 跑通：随机抽 5 帖，人工核对真实料**确实来自评论原话**（铁律3，无编造）。
3. `longka_comment_insights` 按 workspace 可聚合查询真实料。
4. 起草一条女性成长文案时，能注入并明显用到真实料（对比无注入版，具体度肉眼可见提升）。
5. 全程不触发关键词搜索采集（保号）；提交前过 secret 扫描。

## 5. 边界 / 风险

- **保号**：L1 仅详情模式 + 限速；高危搜索仍交 TrendRadar/江湖。
- **江湖视频帖 / 大图帖**：正文少 → 评论深挖对这两类**价值最大**（补的就是缺的真实料）。
- **成本**：脚本预筛后只精选喂 LLM；DeepSeek 为主，不用 Claude 跑量。
- **cookie 依赖**：L1 需小号池登录态（内部化，客户不碰）；属一次性环境配置，不是工程黑洞。
- **不做**：不建 2019 老语料仓库（上游已否决：日期非价值、料会馊、是先完善系统再跑爆的老毛病）。

## 6. 落地顺序（边跑边补，不阻塞 7 天跑爆）

1. L2 先行（最高价值、不依赖采集环境）：建表 + comment-miner skill + 预筛脚本 + API。
2. L1 打通：取 note_id 工具 + Pro 详情采评论 + sync 回填。
3. L3 接起草 RAG + 对标起锚 + UI"真实声音"块。
4. 女性成长 7 天计划照跑，评论料进一条用一条。
