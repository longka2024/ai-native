# CLAUDE.md — Longka AI Native 项目入口

> 任何 Claude 会话开工前先读这份。它是热启动入口:项目是什么、铁律、架构、路径、当前目标、纪律。
> 细节去 `docs/specs/SPEC_INDEX.md` 和 `memory/` 找;别凭记忆猜路径或结论。

## 一句话

面向**中小商户(不懂技术)**的**商用多租户「内容生产工厂」**:商户只消费成品,平台替他们把
「选题 → 成稿 → 小红书图文 / 短视频」这条线跑通。

## 当前验证目标(2026-06)

- **主战场是 122 服务器**,跑通端到端验证效果。
- **小妹来用 ≈ 第一个真实客户**(代理客户)。任何改动先想"小妹在 122 上还能不能用",别只在本地自证。

## 四铁律(Codex 时期对齐,不可漂移)

1. **采集内部化** —— 自有小号池集中采,**客户全程不碰 cookie / 扩展 / F12**。
2. **一鱼多吃不跑题** —— 平台中立的「母题资产」,同一选题换结构 / 换表达发小红书 / 公众号 / 视频号,**但不准跑题**。
3. **绝不拿假数据冒充真采集** —— 来源 / 指标 / 评论必须可追溯;采集失败就如实报失败,不编锚点。
4. **稳定 > 花哨;脚本 > 大模型推理;能不花钱就不花钱** —— 重要逻辑用脚本,降低 Agent 成本。

## 业务线

美容 / 私校留学(温哥华私校) / 女性成长 / AI 自媒体。**只有 AI 线用海外工具**(XCrawl / AI HOT);另 3 条纯国内。

## 核心闭环(Content Factory Loop)

```
客户开通(行业/目标/平台/关键词)
→ 人群定位 + 关键词洞察(选对买单人群 + 这群人搜的真实词;**定位=选题第一要素**)
→ 信号发现(TrendRadar + AI HOT)
→ 真实素材采集(5-10 锚点 + 高价值帖评论深挖)
→ 选题候选(带评分+预测,绑真实来源)
→ 运营选 1 个 → DBS 标题/SOP 改写 → AI味/质量/合规质检
→ Web UI 确认文案 → 生成小红书图文卡 / 短视频任务
→ 发布记录 → T+3 复盘 → 回流更新客户 rubric + 资产库
```

10 层模块架构(Spec/纪律 → 工程 → 采集 → 内容资产 → 内容创作 → 视觉 → 排版 → 视频 → 发布风控 → QA)
详见 `docs/strategy/longka-ai-native-technical-base-report-2026-06-07.md`。

> **整条工厂的完整地图**(图文线 + 视频线·6 形态·风格库 6 档·渲染·降本·爆 vs 不差)见
> `docs/strategy/2026-06-25-content-factory-master-map.md`;视频风格库见 `2026-06-25-video-style-template-library.md`。

## 关键路径(注意:项目已从 E:\Codex 迁到 D:\AInative)

| 用途 | 路径 |
|---|---|
| 本仓库 | `D:\AInative\ai-native`(GitHub `longka2024/ai-native`,**public 仓库**) |
| 主应用 | `apps/command-center-prototype/`(Node ESM,`server.mjs` + 模块化前端) |
| 122 服务器 | `ubuntu@122.51.218.154`,密码认证(无 key) |
| 122 主应用 | PM2 `ai-native-command-center-v2`,`/home/ubuntu/ai-native-command-center-v2`,**端口 3760** |
| 122 对外 | nginx 80 → `/ai-native-v2/` 和 `/api/` 反代到 3760(3760 外网不通) |
| 122 PG | **localhost-only**,库 `longka_content`,用户 `longka`;DSN 在 app `.env` 的 `DATABASE_URL` |
| MediaCrawlerPro | `E:\Codex\MediaCrawlerPro\MediaCrawlerPro-Python`(暂留 E:\;红线:不改源码,只 `DB_TYPE=sqlite` 注入) |
| TrendRadar | 122 Docker `trendradar`,8390→8080 |

部署方式:paramiko `sftp.put` 单文件 → `pm2 restart ai-native-command-center-v2`。用 `DEPLOY_*` env,
**绝不硬编码密码**。本机 python 用 `py -3.14`(shebang 会被路由到 3.13);控制台 GBK 设 `PYTHONIOENCODING=utf-8`。

## Skills 运行时(skills-runner.mjs)

`apps/command-center-prototype/skills-runner.mjs` 把 `~/.claude/skills/<name>/SKILL.md` 当 system prompt 做无状态 LLM 调用。
**已注册 3 个**:`humanizer-zh`(去AI味)/ `dbs-ai-check`(AI味检测)/ `dbs-xhs-title`(标题公式)。
⚠️ **运行时依赖**:这 3 个 SKILL.md 必须存在于 **122 的 `~/.claude/skills/`**,否则线上对应功能 `skill_load_failed`(小妹会哑火)。

## 工具优先级(省钱保号)

MediaCrawlerPro(免费,国内深挖,**退出搜索保号**)> 内置 fetch(免费,网页正文)> XCrawl(付费,仅 X/海外)> hot30(兜底)。
高危「关键词搜索取爆款」交给 TrendRadar(零登录)+ 江湖工具箱(本地 win,手动补充档)。
正文写作主力 = **DeepSeek**(`api.deepseek.com`,`deepseek-v4-flash`),不是 Claude。

## 工作纪律

- **SPEC-first**:新功能 / 重构 / 关键改造先按 `docs/specs/SPEC_ALIGNMENT_PROTOCOL.md` 写五条件 spec、用户确认后再动手。开发前复述 spec。
- **回复用中文**。
- **顺序**:先本地调试好 → 传 122 → 最后对齐仓库(commit/push)。
- 不动已认可的**前端模块拆分结构**。
- 提交前必过 **secret 扫描**(public 仓库):cookie / DB 密码 / API key 一律不进 git;运维脚本 `scripts/` 与 vendored `.agents/` 已 gitignore。

## 记忆位置

- **仓库 `memory/`** = 版本化的耐久项目知识(技术基座总账 / 产品决策 / 失败策略 / 模块能力图),进 git,任何会话/工具可读。
- **Claude 项目记忆** `~/.claude/projects/D--AInative-ai-native/memory/`(`MEMORY.md` 索引)= 自动召回层,放指针 + 用户偏好 + 高频事实。
- 历史来源:Codex 时期 `~/.codex/memories/`(只读旧档,新事实写上面两处)。
