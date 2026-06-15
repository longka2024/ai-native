# Longka Spec Index

这个文件用于唤醒已经对齐过的开发标准。

以后只要用户说“按某个 spec 做”“按我们刚才对齐的标准做”“不要跑偏”，开发前必须先读取对应 spec 文件。

## 当前有效 Spec

### Spec 对齐流程

- 文件：`docs/specs/SPEC_ALIGNMENT_PROTOCOL.md`
- 触发说法：
  - “我们先对齐 spec”
  - “这个 spec 怎么定”
  - “你没有按 Spec 对齐流程”
  - “我只记得大概，不记得具体 spec”
- 用途：
  - 把模糊需求逐步变成名字、触发词、范围、禁止范围、验收标准齐全的合格 spec。

### Day1 文案版本管理器

- 文件：`docs/specs/2026-06-06-day1-copy-version-manager-spec.md`
- 触发说法：
  - “按 Day1 spec”
  - “按文案版本历史那个 spec”
  - “继续优化不要只追加建议”
  - “不丢稿、可回看、可恢复、可确认”
- 开发边界：
  - 只做文案版本历史、AI 改写、回看、恢复、确认。
  - 不做采集、母题、标题库、资产模块、图文闭环。

### 三天稳定版计划

- 文件：`docs/specs/2026-06-06-three-day-stabilization-plan-spec.md`
- 触发说法：
  - “按三天稳定版”
  - “三天稳定版 Day1”
  - “明天要给投资人看”
  - “小红书图文成稿样板”
  - “10 小时冲刺版”
- 开发边界：
  - Day1 做文案版本管理器。
  - Day2 做内容资产调用 + 小红书图文样板。
  - Day3 做今日工作台 SOP + 122 验收。
  - 不做完整视频闭环、小妹包、完整训练体系。

### 母题资产运营与一鱼多吃平台复用

- 文件：`docs/specs/2026-06-07-motif-asset-operations-spec.md`
- 触发说法：
  - “母题资产运营”
  - “一鱼多吃”
  - “小妹工作流”
  - “按母题资产 spec”
  - “平台切换不跑题”
  - “同一个话题做小红书、公众号、视频号”
- 开发边界：
  - 把内容资产升级为平台中立的母题资产。
  - 用户可选择任意首发平台。
  - 同一母题可继续生成小红书、公众号、视频脚本、朋友圈等平台版本。
  - 平台切换必须换结构、换表达、换图片策略，但不能跑题。
  - 复盘数据必须说明来源，不得伪装真实数据。
  - 不允许新开割裂页面作为唯一入口，不允许 CSS 假图当最终图。

### 采集流程重构一期

- 文件：`docs/specs/2026-06-12-collection-pipeline-rebuild-spec.md`
- 触发说法：
  - "按采集 spec"
  - "采集重构"
  - "样本库管线"
- 开发边界：
  - 三层架构：信号层（TrendRadar + AI HOT）→ 采集层（MediaCrawlerPro 主力 / XCrawl / Octoparse 冷备）→ 122 服务器 PG 样本库。
  - Pro 用 SQLite 暂存，采集完即同步到 PG（一条包装命令）。
  - 不改 MediaCrawlerPro 源码；不引入 last30days-cn 爬虫代码（只借鉴评分公式）；TrendRadar GPL 代码独立部署不混仓。
  - 公众号采集和发布回流放三期，不在本 spec 范围。

### 采集架构商用定调（2026-06-14，修正前两期方向）

- 文件：`docs/specs/2026-06-14-collection-architecture-pivot-spec.md`
- 触发说法：
  - "采集架构定调"
  - "客户不碰cookie"
  - "江湖补充档"
  - "采集分工"
  - "黄金组合"
- 开发边界：
  - 采集内部化：自有小号池集中采，客户只消费成品，不碰 cookie/扩展/F12。
  - 工具分工：高危搜索给 TrendRadar + 江湖；MediaCrawlerPro 号退出搜索只做深挖保号；海外工具只服务 AI 线。
  - 江湖工具箱从"退役"改为"手动补充档"。
  - 不做客户发布、不托管客户 cookie；`trigger-collection` 自动闭环仍暂缓。

### Codex → Claude 技术基座移植（2026-06-16）

- 文件：`docs/specs/2026-06-16-codex-to-claude-base-migration-spec.md`
- 触发说法：
  - "基座迁移"
  - "移植到 Claude"
  - "搬记忆 / memos"
  - "建 CLAUDE.md"
  - "Codex 迁移"
- 开发边界：
  - 建仓库根 CLAUDE.md（项目入口：四铁律 / 架构 / 正确 D:\ 与 122 路径 / 验证目标=122+小妹 / spec 索引）。
  - 记忆移植：核心大文件落仓库 `memory/`（进 git），Claude 项目记忆补指针 + 偏好。
  - 路径扫改 `E:\Codex` → `D:\AInative`；补 4 个缺失 skill。
  - 不裸拷记忆（必须提炼）；不搬外部工具大仓；不改 server.mjs 业务逻辑；不删 ~/.codex 原文件。

## 使用规则

1. 开发前先读 spec。
2. 把 spec 的目标、范围、禁止项复述到 5 行以内。
3. 只改 spec 允许的文件和逻辑。
4. 如果发现必须扩大范围，先停下来让用户确认。
5. 完成后把验证结果写回最终回复。
