# SPEC：二期 信号驱动采集 + 热点融合选题

- **名称**：信号驱动采集与热点融合二期
- **触发词**："二期 spec" / "信号融合" / "热点选题升级"
- **日期**：2026-06-12
- **状态**：已拍板（2026-06-12）
- **上游依据**：一期（2026-06-12-collection-pipeline-rebuild-spec.md）已完成；TrendRadar 已部署运行

---

## 0. 一句话目标

把 TrendRadar 实时热榜信号与 hot30 样本库打通：TrendRadar 命中关键词 → 自动触发对应关键词采集 → 新数据进 hot30 评分 → 工作台选题面板看到真正的"当下热门"。

---

## 1. 问题诊断（为什么要二期）

一期 flume 跑通但 hot30 数据不新鲜的根因：

| 问题 | 表现 | 根因 |
|------|------|------|
| 素材旧 | hot30 显示的是几周前的老帖 | 样本库只存了历史采集数据，没有"信号→采集"的自动触发 |
| 信号孤岛 | TrendRadar 每 30 分钟抓到热榜命中，但没人看 | 报告在 8390 独立页面，与工作台隔裂 |
| 选题靠猜 | 用户不知道该采什么关键词 | 工作台没有任何"现在什么火"的信号提示 |

二期核心思路：**让信号层自动驱动采集层、喂给选题层**，形成闭环。

---

## 2. 总体架构

```
TrendRadar 每 30 分钟跑
  │
  ├─ 输出到 output/news/YYYY-MM-DD.db（SQLite）
  │    └─ hot_news 表：标题、来源、链接、匹配关键词组、时间
  │
  ├─ [新增] trendradar_hits API
  │    └─ GET /api/signals/trendradar-hits?hours=6
  │    └─ 返回近 N 小时 TrendRadar 匹配到的热榜条目
  │
  └─ [新增] 自动采集触发器
       └─ 当某个关键词组连续 2 次扫描都有命中
       └─ → 自动调 Pro 采集对应关键词
       └─ → 新数据进 hot30 评分
```

### 2.1 TrendRadar DB 读取层

TrendRadar 每轮跑完后在 `output/news/YYYY-MM-DD.db` 存 SQLite，里面有 `hot_news` 表含标题/来源/匹配的关键词组。

新增 `server.mjs` 接口：

```
GET /api/signals/trendradar-hits
  params:
    - hours (默认 6): 回溯小时数
    - workspace (可选): 按工作台过滤
    - min_hits (默认 1): 最低命中次数

  response:
    { ok, hits: [{ keyword, group, title, source, url, matchedAt, platform }] }
```

实现方式：
- 扫描 `/home/ubuntu/trendradar/output/news/` 下当日/昨日 SQLite
- 按 add_ts 过滤近 N 小时的数据
- 按 workspace 关键词组分组合并计数

### 2.2 触发器：信号 → 采集

> **2026-06-14 状态**（见 `2026-06-14-collection-architecture-pivot-spec.md`）：`trigger-collection` 当前是空壳（`server.mjs` `handleTriggerCollection` 仅返回 `triggered:true`，含 `// TODO Phase 2-2`，不真采集）。本自动触发闭环**暂缓**——结合自有账号封号风险，高危"关键词搜索"改由江湖工具箱 / TrendRadar 人工承接，不让 Pro 自动猛搜。

```
信号命中计数器（内存中维护）：
  { keywordGroup: { keyword: count, lastHitAt } }

规则：
- 同一个关键词连续 2 次 TrendRadar 扫描（间隔 30 分钟）都有命中 → 触发采集
- 每个关键词组 24 小时内只触发一次（防重复）
- 触发后自动调 collect_and_sync.sh xhs "<关键词>" --workspace <对应工作台>

状态存在 state-manager 的 signalTrigger 字段：
  signalTrigger: {
    lastTriggeredAt: {},        // { "美容/轻医美": "2026-06-12T06:00:00Z" }
    hitCounters: {},           // { "美容/轻医美": { count: 2, lastHitAt: "..." } }
    pendingKeywords: [],       // 待采集队列
  }
```

### 2.3 多信号融合选题

选题面板从"只看 hot30"升级为"多信号融合"：

```
┌─ 信号源 ─────────────────────────────────────┐
│ ① TrendRadar 实时热榜（30 分钟级）            │
│    命中词 → 直接显示为"热门趋势"标签            │
│ ② hot30 样本库（按互动+时效评分）               │
│    来自 Pro 采集的帖子的热度排序                │
│ ③ [预留] AI HOT 日报                           │
└──────────────────────────────────────────────┘
```

选题卡增加信号标识：
- 🔥 TrendRadar 命中：「词条「AI硬件」正在 财联社/华尔街见闻 热榜上升」
- 📈 样本高热度：「30天热度分 2845（赞 1.2k/评 342/藏 568，12 小时前发布）」

### 2.4 工作台界面变更

素材来源「30天热点」下增加：

1. **信号面板**（在选题前显示）：
   - 今日 TrendRadar 命中词条列表（按工作组分组）
   - 每个命中词条显示：来源平台数、命中次数、最近命中时间
   - 点击某个命中词条 → 切换工作台输入框为该关键词

2. **选题卡**（原有 + 信号融合）：
   - TrendRadar 命中的词条生成"趋势选题"，排在常规选题之前
   - 趋势选题标题如：「AI硬件惊魂时刻」「Token经济学拐点」

---

## 3. API 设计

### GET /api/signals/trendradar-hits

```json
{
  "ok": true,
  "hits": [
    {
      "keyword": "AI硬件",
      "group": "AI",
      "workspace": "AI与自媒体",
      "title": "一份研报引爆AI硬件\"惊魂时刻\"",
      "source": "财联社热门",
      "url": "...",
      "matchedAt": "2026-06-12T05:23:00+08:00",
      "totalHits": 3
    }
  ],
  "window": "6h",
  "workspace": "AI与自媒体"
}
```

### POST /api/signals/trigger-collection

```json
{
  "ok": true,
  "keyword": "轻医美",
  "workspace": "美容",
  "triggered": true,
  "message": "关键词「轻医美」已加入采集队列"
}
```

手动触发采集（供工作台界面使用，也供自动触发器调用）。

---

## 4. 数据流

```
[TrendRadar 每 30 分钟]
  → 写 output/news/YYYY-MM-DD.db
  → [新增] 读 DB → 匹配关键词组 → 更新 hitCounters
  → [条件] 连续命中 ≥ 2 次 → 推送关键词到采集队列
  → [采集线程] 调 collect_and_sync.sh → 新数据入库
  → hot30 评分自动包含新数据
```

---

## 5. 不实现（明确排除）

| 功能 | 理由 |
|------|------|
| TrendRadar 通知/推送 | 一期已关，不重新打开 |
| AI 分析/摘要 | 一期已关，二期仍不需要 |
| 定时自动采集全量关键词 | 流量太大，只做信号触发 |
| 微信/飞书/钉钉通知 | 超出 scope |
| Octoparse 冷备集成 | 保持离线兜底角色 |

---

## 6. 验收标准

1. TrendRadar 命中数据可在工作台看到实时列表（刷新即可）
2. 某个关键词连续命中后，自动触发 Pro 采集
3. 采集完成后 hot30 接口出现新数据（采集时间在近 30 分钟内）
4. 选题卡同时显示 TrendRadar 信号标识 + hot30 评分
5. 24 小时内同一关键词不重复触发

---

## 7. 分期

| 期 | 内容 |
|----|------|
| 二期-1（本 spec） | TrendRadar DB 读取 API → 信号面板 → 自动采集触发器 |
| 二期-2 | 多信号融合选题（TrendRadar 趋势选题 + hot30 评分排序） |
| 三期 | 公众号采集（隐私 spec 先行）→ 发布反馈回流 |

---

## 8. 红线

- TrendRadar SQLite 只读不写（不修改 TrendRadar 代码/数据）
- 采集频率克制：24 小时/关键词组最多触发 1 次，单次搜索间隔 ≥ 5 秒
- 触发器状态存 state-manager（页面刷新不丢），但 122 重启后丢失可接受（重新积累命中）
- 不改 Pro 源码
- TrendRadar GPL 代码不混入本仓库
