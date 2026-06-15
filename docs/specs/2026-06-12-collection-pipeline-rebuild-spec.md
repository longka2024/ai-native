# SPEC：采集流程重构一期（信号层 + 采集层 + 样本库管线）

- **名字**：采集流程重构一期
- **触发词**："按采集 spec" / "采集重构" / "样本库管线"
- **日期**：2026-06-12
- **状态**：已拍板（2026-06-12，简报功能不做，hot30 直接喂工作台选题面板）
- **上游依据**：指纹库架构链（采集层 → PostgreSQL 样本库 → 正反例/人工语料标注 → 平台爆款指纹库 → 小模型评分 → 大模型改写 → 检测 → 发布回流）

---

## 0. 一句话目标

把"信号发现 → 内容采集 → 统一入库 → 选题供给"打通成一条可重复执行的管线，全部数据沉淀到 122 服务器的 PostgreSQL 样本库，为二期标注和指纹库供料。

---

## 1. 总体架构（三层）

```
┌─ 信号层（发现"该采什么"）─────────────────────────┐
│  TrendRadar（全网热榜，所有工作台）                  │
│  AI HOT（AI 垂直精选，仅"AI与自媒体"工作台）          │
└──────────────┬────────────────────────────────┘
               ↓ 关键词 / 话题
┌─ 采集层（把内容抓回来）───────────────────────────┐
│  路线1 MediaCrawlerPro：中文社交主力                │
│         xhs / dy / wb / bili / zhihu / ks / tieba │
│  路线2 XCrawl：公开网页、X(Twitter)、海外资讯        │
│  路线3 Octoparse（八爪鱼）：冷备，特殊站点手动兜底     │
└──────────────┬────────────────────────────────┘
               ↓ 各自暂存 → 同步脚本
┌─ 入库层（统一资产）──────────────────────────────┐
│  PostgreSQL 样本库 @ 122 服务器                    │
│  samples / sample_comments / creators 统一 schema  │
└──────────────┬────────────────────────────────┘
               ↓
       topic-engine（工作台"30天热点"选题信号）
```

### 工作台 ↔ 信号/采集映射

| 工作台 | 信号层 | 采集层 |
|---|---|---|
| 美容 | TrendRadar 关键词过滤 | MediaCrawlerPro（xhs 为主） |
| 私校/留学 | TrendRadar 关键词过滤 | MediaCrawlerPro（xhs 为主） |
| 女性成长 | TrendRadar 关键词过滤 | MediaCrawlerPro（xhs 为主） |
| AI与自媒体 | TrendRadar + AI HOT | MediaCrawlerPro + XCrawl（X/海外资讯） |

---

## 2. 工具裁决（本次评估结论，写死避免反复）

### 主力（集成进管线）
| 工具 | 角色 | 边界 |
|---|---|---|
| **MediaCrawlerPro**（E:\Codex\MediaCrawlerPro，付费版） | 中文社交平台唯一采集器：搜索/创作者主页/详情+评论 | **不改 Pro 源码**（私有商业仓库）；依赖 SignSrv :8989 / CookieBridge :8274 / Downloader :8205 |
| **XCrawl** | 公开网页、X(Twitter)、海外资讯批量采集 | 与 Firecrawl 分工：临时调研用 Firecrawl，批量采集入库用 XCrawl |
| **TrendRadar**（sansan0 原版 v6.9+） | 信号层：全网热榜聚合 + 关键词过滤 + 推送 | GPL-3.0，**独立部署不混源码**（Docker @ 122）；newsnow 第三方 API 轻度使用 |
| **AI HOT skill**（aihot.virxact.com） | 信号层：AI 垂直精选日报 | 免费公开 API；需浏览器 UA + `aihot-skill/0.2.0` 后缀；items 仅近 7 天；只服务 AI 线 |
| **defuddle** | 网页正文净化（XCrawl 下游配套） | 保留 |

### 冷备（不集成，保留账号/工具）
- **Octoparse（八爪鱼）**：特殊反爬站点的手动兜底，不进自动管线。
- **baoyu-url-to-markdown**：降级为备用，功能与 XCrawl+defuddle 重叠。

### 退役 / 不集成
- **江湖工具箱**：Pro 管线稳定运行后退役（爆款帖/对标账号采集已被路线1覆盖）。
  > **2026-06-14 修正**（见 `2026-06-14-collection-architecture-pivot-spec.md`）：江湖工具箱**不退役**，改为"手动补充档"——本地 win 软件扫码登录、健壮，承接高危"关键词搜索取爆款"，导出 Excel 经 `import-batch` 写 `longka_content_samples`（带 workspace）供二创；让 Pro 号退出搜索、只做低危深挖以保号。
- **joyce677/TrendRadar fork**：v2.1.0 过时，弃用，用 sansan0 原版。
- **Agent-Reach / web-access / apify-ultimate-scraper**：与主力路线重复，不集成。
- **last30days-cn 的 Playwright 爬虫代码**：禁止引入（裸爬不如 Pro）；只借鉴其评分公式（见 §5）。

### 三期暂缓
- **公众号四件套**（wechat-assistant / wechat-radar / wx-cli / wechat-cli）：涉及私域敏感数据，三期单独立隐私 spec 后再接。

---

## 3. 已拍板决策

| 决策点 | 结论 |
|---|---|
| 样本库位置 | **122 服务器 PostgreSQL**（复用现有 PG 实例） |
| Pro 暂存库 | **SQLite**（`DB_TYPE=sqlite`，Pro 原生支持，不改源码；PG 非 Pro 原生选项） |
| 同步时机 | **采集完即同步**：一条命令包住"采集 + 同步"两步 |

> 原则：SQLite = 暂存区（staging），PG = 资产库（asset）。暂存区可随时清空重建，资产库只进不删。

---

## 4. 入库层：PG 样本库 Schema（已拍板：复用现有表）

> 2026-06-12 拍板：**复用 122 上已在用的 `longka_content_samples` 体系**（collector-hub.mjs 维护，XCrawl/X 采集已往里写），不新建平行 samples 表，避免资产分裂。连接串沿用 `DATABASE_URL` 环境变量，**禁止硬编码**。

现有表（已存在，不动）：
- `longka_collection_runs` — 采集批次
- `longka_content_samples` — 样本主表：`unique(platform, source_id)`、`metrics` JSONB、`comments` JSONB、`label_type`（二期标注直接用）、`keyword`、`raw_json`
- `longka_asset_confirmations` — 资产确认

本期增量 DDL：

```sql
-- 1) 样本主表补 workspace 列
ALTER TABLE longka_content_samples ADD COLUMN IF NOT EXISTS workspace TEXT;
CREATE INDEX IF NOT EXISTS idx_longka_content_samples_workspace
  ON longka_content_samples(workspace, published_at DESC);

-- 2) 创作者/对标账号表（新建）
CREATE TABLE IF NOT EXISTS longka_creators (
  id            BIGSERIAL PRIMARY KEY,
  platform      TEXT NOT NULL,
  platform_id   TEXT NOT NULL,
  nickname      TEXT,
  fans          BIGINT DEFAULT 0,
  notes_count   INT DEFAULT 0,
  description   TEXT,
  extra         JSONB DEFAULT '{}',
  workspace     TEXT,
  is_benchmark  BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(platform, platform_id)
);

-- 3) 同步水位表（新建）
CREATE TABLE IF NOT EXISTS longka_sync_watermarks (
  source_table  TEXT PRIMARY KEY,           -- 如 xhs_note / dy_aweme
  last_add_ts   BIGINT DEFAULT 0,
  last_sync_at  TIMESTAMPTZ
);
```

字段映射约定（Pro → longka_content_samples）：
- `collector_type = 'mediacrawler_pro'`，`source_type = 'search' | 'creator' | 'detail'`
- `source_id` = note_id/aweme_id 等平台原始 ID；`keyword` = source_keyword
- `metrics` JSONB 统一存清洗后的整数：`{"likes":n,"comments":n,"collects":n,"shares":n,"views":n}`
- 帖子评论存样本行的 `comments` JSONB（按点赞排序取 top 50，全量留在 `raw_json` 不必复制）
- 平台特有字段原样进 `raw_json`

---

## 5. 同步脚本：`tools/sync_to_samples.py`

职责：从 Pro 的 SQLite（`media_crawler.db`）增量读取 → 清洗 → 写入 122 PG。

- **增量**：按各表 `add_ts` 与 `longka_sync_watermarks` 水位比较，只同步新增/更新行。
- **清洗**：
  - 互动数 varchar → int："1.2万" → 12000，"3亿" → 300000000，空/异常 → 0。
  - `tag_list` / `image_list` 字符串 → JSON 数组（进 `raw_json` / `metrics`）。
  - 时间统一转 timestamptz 写入 `published_at`。
- **写入**：`INSERT ... ON CONFLICT (platform, source_id) DO UPDATE` 刷新 `metrics`（互动数会增长）。
- **workspace 归属**：按 `source_keyword` → 工作台映射表（配置文件维护）。
- **XCrawl 路线**：已直接写 `longka_content_samples`（collector-hub 现有逻辑），不经此脚本。
- 连接串读 `DATABASE_URL`，失败时明确报错（不静默）。

## 6. 包装命令：`tools/collect_and_sync.sh`

```
collect_and_sync.sh xhs "轻医美 抗初老" --workspace 美容
  → 1) 健康检查 SignSrv/CookieBridge
  → 2) 调 Pro 采集（search，含评论）
  → 3) 跑 sync_to_samples.py
  → 4) 输出本次新增样本数
```

---

## 7. 选题供给：hot30 评分 API

在 server.mjs 增加 `/api/samples/hot30`（借鉴 last30days-cn 的评分思路，公式自有实现）：

- 范围：近 30 天（`published_at` 过滤，查 `longka_content_samples`），按 workspace 过滤。
- 评分：`score = likes×1.0 + comments×2.5 + collects×1.5 + shares×2.0`，叠加时效衰减（越新权重越高）。
- 输出：top N 帖子（标题/链接/互动/关键词），供 topic-engine 的"30天热点"选题信号消费。

---

## 8. 信号层部署

1. **TrendRadar**：Docker 部署在 122 服务器，配置各工作台关键词（美容/私校/女性成长/AI 领域词），推送到微信/飞书。GPL-3.0 独立运行，不与本仓库代码混合。
2. **AI HOT**：先以 skill 形式安装本地使用；后续可选在 122 上做定时拉取（`/api/public/daily`）写入信号缓存，仅供 AI 线。

---

## 9. 验收标准

1. `collect_and_sync.sh xhs "<关键词>"` 一条命令完成采集+同步，`longka_content_samples` 可查到新增带 workspace 的记录。
2. `metrics` 互动数全部为整数，无 "1.2万" 类脏数据；`unique(platform, source_id)` 无重复。
3. 重复执行同一关键词采集，老帖互动数被刷新而非重复插入。
4. `/api/samples/hot30?workspace=美容` 返回近 30 天评分排序结果。
5. TrendRadar 在 122 上跑通并按关键词推送至少一条热榜消息。

---

## 10. 分期

| 期 | 内容 |
|---|---|
| **一期（本 spec）** | PG 建库建表 → sync_to_samples.py → collect_and_sync 包装 → hot30 API → 工作台选题接入 → TrendRadar 部署 |
| 二期 | 正反例/人工语料标注界面 → 平台爆款指纹库 → 小模型评分 |
| 三期 | 公众号采集（隐私 spec 先行）→ 发布反馈回流 |

---

## 11. 红线

- 不改 MediaCrawlerPro 源码。
- 不引入 last30days-cn 的 Playwright 爬虫代码（只借鉴评分公式）。
- TrendRadar GPL-3.0 代码不混入本仓库，仅独立部署调用。
- PG 连接串走 `DATABASE_URL` 环境变量，禁止硬编码。
- 不新建平行样本表，统一写 `longka_content_samples`。
- 采集频率克制（单次搜索间隔 ≥ 5 秒），样本仅用于自有内容生产研究。
