# Longka Research Brief Playbook

这个 playbook 对齐截图里的能力：用户给一个主题，Agent 自动搜索、筛选、分类、整理成“精选资料清单”。

## 1. 目标效果

用户说：

```text
帮我找微信公众号里 Claude Code 的优质教程
```

理想输出不是原始搜索结果，而是：

```text
找到了很多优质教程，以下是微信公众号 Claude Code 教程精选：

---
入门教程
1. ...
2. ...

---
进阶技巧
4. ...

---
官方 / 权威来源
7. ...
```

客户要的是“我接下来能怎么用”，不是“你搜到了多少条”。所以报告必须先给结论和可执行动作，再给来源和证据。

## 2. 固定流程

```text
确定主题
-> 选择平台
-> 搜索
-> 初筛
-> 阅读重点内容
-> 分类
-> 摘要
-> 输出 Markdown 报告
-> 必要时保存到文件
```

## 3. 当前已打通平台

### 微信公众号

状态：搜索已打通。

工具：

- Exa MCP
- mcporter
- `E:\Codex\.env.local` 中的 `EXA_API_KEY`

固定命令：

```powershell
$env:EXA_API_KEY=(Get-Content E:\Codex\.env.local | Where-Object { $_ -match '^EXA_API_KEY=' } | ForEach-Object { $_.Split('=',2)[1] }); mcporter call --stdio "npx -y exa-mcp-server" --env EXA_API_KEY=$env:EXA_API_KEY web_search_exa query="site:mp.weixin.qq.com Claude Code 教程" numResults=10
```

### 小红书

状态：已登录并验证可搜索/读取。

工具：

- `C:\Users\longfei\.agent-reach-venv\Scripts\xhs.exe`

### 网页

状态：Jina Reader 可用。

工具：

- `curl.exe -L https://r.jina.ai/http://r.jina.ai/http://目标URL`

## 4. 报告分类模板

根据主题自动选择分类。

### 教程类

- 入门教程
- 进阶技巧
- 官方 / 权威来源
- 实战案例
- 工具链 / 插件 / Skills
- 常见坑

### 内容获客类

- 爆款案例
- 标题钩子
- 封面结构
- 评论区需求
- 转化话术
- 可复刻选题

### 行业研究类

- 用户痛点
- 竞品打法
- 价格/服务模式
- 渠道打法
- 内容机会
- 产品机会

## 5. 输出质量标准

每个条目至少包含：

- 标题
- 链接
- 来源平台
- 适合谁
- 重点摘要
- 为什么值得看
- 质量判断：高 / 中 / 低，或 0-20 分

报告开头必须包含：

- 这批资料说明了什么。
- 用户现在应该怎么做。
- 哪几条最值得先看。
- 能转成什么选题、脚本、产品功能或 SOP。

如果是给 Longka 基建使用，还要补：

- 能沉淀成什么 skill
- 能变成什么 SOP
- 能接到哪个产品
- 是否适合 U 盘行业包

## 6. 优质信息源判断标准

搜索结果只是原料，不能直接输出。必须先判断质量。

### 评分维度

总分 20 分：

- 相关性 0-5：是否直接回答主题。
- 实操性 0-5：是否有步骤、案例、模板、工具、截图、命令。
- 可信度 0-4：是否官方、权威、真实实践者、可交叉验证。
- 新鲜度 0-3：是否适合当前时间，工具类内容尤其看更新时间。
- 可复用性 0-3：是否能沉淀成 Longka SOP、skill、脚本、产品功能、行业包。

### 入选规则

- 16-20 分：必选。
- 12-15 分：可选，适合补分类空位。
- 8-11 分：备选，只在没有更好来源时使用。
- 0-7 分：剔除。

### 分类不是按搜索顺序

要按用途分类：

- 入门教程：适合新手快速上手。
- 进阶技巧：提高效率、质量、调试能力。
- 官方/权威：官方文档、作者、维护者、权威社区。
- 实战案例：真实项目或真实工作流。
- 工具链：MCP、CLI、插件、skills、自动化工具。
- 避坑风险：失败案例、限制、成本、封号、合规。

### 每条必须有判断

每条入选资料都要写：

- 为什么入选。
- 适合谁。
- 能复用什么。
- 有什么风险或局限。

## 7. 保存位置

研究输出默认保存到：

```text
E:\Codex\research-output
```

文件命名：

```text
YYYYMMDD-主题-research-brief.md
```

## 8. 与 Longka Skill 的关系

- `longka-research-brief`：负责搜索、筛选、分类、报告。
- `longka-content-intelligence`：负责把资料转成需求洞察。
- `longka-content-creative`：负责把洞察转成标题、封面、脚本。
- `longka-product-base`：负责把方法沉淀成产品基座。
