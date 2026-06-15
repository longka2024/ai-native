# Codex → Claude 技术基座移植 Spec

Date: 2026-06-16

## 背景

项目根基在 Codex 时期铸就(四铁律、10 层模块架构、技术基座总账、采集架构定调均已对齐),
现切换到 Claude 下继续开发,目标是更高效完成项目。

对账结论(2026-06-16):**文档/根基层已迁好**——当下仓库 `D:\AInative\ai-native` 已是老
`E:\Codex\ai-native` 的(且更新的)副本(7 个根基文件 + docs 全套 + 多出 3 份采集新 spec,
已由 `ee3d56b` 提交)。真正没迁的只剩 4 个缺口,且都在仓库外。

**当前验证目标(2026-06-16 明确):** 主要在 **122 服务器**上跑通验证效果,**小妹来用 ≈ 第一个真实客户**。
迁移必须服务这个目标:既让 Claude 会话热启动,也保证 122 运行时不因迁移而瘸腿。

---

## 1. 名字

Codex → Claude 技术基座移植(基座迁移)

## 2. 触发词

- 「基座迁移」「移植到 Claude」
- 「搬记忆 / memos」
- 「建 CLAUDE.md」
- 「Codex 迁移」

## 3. 范围(可执行动作)

1. **建仓库根 `CLAUDE.md`(项目入口)**,写入:
   - 四铁律(采集内部化 / 一鱼多吃不跑题 / 绝不假数据 / 稳定>花哨·脚本>大模型·省钱)
   - 10 层模块架构摘要 + 四业务线(美容 / 私校留学 / 女性成长 / AI 自媒体)
   - **正确的 D:\ 与 122 路径**(纠正 Codex 时期 `E:\Codex` 残留)
   - **当前验证目标:122 跑通 + 小妹(代理客户)实际能用**
   - **122 运行时依赖**:`skills-runner` 需要 `~/.claude/skills/<name>/SKILL.md` 存在于 122
   - spec 索引指针 + `skills-runner` 用法 + 记忆位置说明
2. **记忆移植**:把 `~/.codex/memories/` 的耐久事实迁过来:
   - 核心大文件(技术基座总账 / 模块能力图 / 产品决策 / 失败策略)→ 落 **仓库 `memory/`**(版本化、进 git、任何会话/工具可读)
   - 同时在 **Claude 项目记忆**(`~/.claude/projects/D--AInative-ai-native/memory/`)补"指针 + 用户偏好 + 高频事实",更新 `MEMORY.md` 索引
3. **路径扫改**:docs 与根基文件里失效的 `E:\Codex\ai-native` → `D:\AInative\ai-native`、`~/.codex/` → `~/.claude/`(仅改失效引用,不动叙述性历史记录)
4. **补 4 个缺失 skill**:`longka-project-harness`、`xiaomei-promo-video`、`competitive-ads-extractor`、`repomix-explorer` 从 `~/.codex/skills/` 拷到 `~/.claude/skills/`,校验 `SKILL.md` 能被 Claude 识别

## 4. 禁止范围

- ❌ 不动已认可的前端模块拆分结构
- ❌ 不裸拷 100KB 记忆——**必须提炼**;不搬工作流水(`longka_work_trace` 32KB)和与本项目无关的历史(`personal-image-report*` / heye / video-review 等)
- ❌ 不搬外部工具大仓(MediaCrawlerPro / open-design / html-anything / Remotion)——暂留 `E:\`,只在 CLAUDE.md 记其路径,本期不移动、不改源码
- ❌ 不改产品业务逻辑 / `server.mjs` 功能(纯基座 + 文档 + 记忆迁移)
- ❌ 不把任何 secret 写进迁移文件(沿用 `.gitignore` 红线:cookie / DB 密码 / API key)
- ❌ **不删 `~/.codex` 原文件**(只拷不删,留退路)

## 5. 验收标准

- 根目录有 `CLAUDE.md`,新会话能据它复述四铁律 + 架构 + 路径 + 验证目标,无需用户重讲
- 仓库 `memory/` 出现技术基座总账等核心文件;Claude `MEMORY.md` 索引含新指针
- `grep` 不再有失效的 `E:\Codex` 路径引用(叙述性历史记录除外)
- 4 个 skill 在 `~/.claude/skills/` 可见
- **确认 122 上 `~/.claude/skills/` 有 `humanizer-zh`/`dbs-ai-check`/`dbs-xhs-title` 三个 SKILL.md**(否则小妹用 AI 功能会哑火)
- 全部改动经 secret 扫描干净后提交

## 6. 执行优先级(建议)

- **P0** 建 `CLAUDE.md`(热启动,最高杠杆)
- **P0.5** 查 122 上 3 个 skill 文件是否在位(直接关系小妹能否用 AI 功能)
- **P1** 记忆移植(技术基座总账 / 产品决策 / 失败策略优先)
- **P2** 路径扫改 + 补 4 个 skill(可并行)
