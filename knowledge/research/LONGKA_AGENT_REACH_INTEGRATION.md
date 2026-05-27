# Longka Agent Reach Integration

这个文档记录 Agent Reach 在 Longka 基建里的固定接入方式。目标是以后用户用自然语言说“搜公众号/搜小红书/读文章/拆爆款”，Agent 能直接选择正确工具链。

## 1. 已确认能力

### 小红书

本地已验证：

- `xhs.exe status` 可登录成功。
- `xhs.exe search "关键词" --sort latest --json` 可搜索。
- `xhs.exe read "小红书链接" --json` 可读笔记详情。

用途：

- 需求洞察
- 标题/封面/评论 VOC
- 色彩项目获客内容选题
- 图文爆款机素材输入

### 微信公众号

Agent Reach 支持微信公众号文章，但不是一个独立 `wechat.exe`。

官方设计是组合链路：

- 搜索：Exa MCP + `mcporter`
- 阅读：Camoufox / Jina Reader
- 整理：`longka-content-intelligence`

当前本地状态：

- Camoufox 已安装，可作为公众号文章阅读能力的一部分。
- 搜索链路需要补齐 `mcporter + Exa MCP`。

## 2. 微信公众号安装补齐

优先用 Agent Reach 官方安装器：

```powershell
$env:PYTHONIOENCODING='utf-8'; C:\Users\longfei\.agent-reach-venv\Scripts\agent-reach.exe install --env=auto --channels=wechat
```

如果还提示缺 `mcporter + Exa MCP`，执行：

```powershell
npm install -g mcporter
```

然后：

```powershell
mcporter config add exa https://mcp.exa.ai/mcp
```

## 3. 微信公众号搜索固定命令

```powershell
mcporter call 'exa.web_search_exa(query: "site:mp.weixin.qq.com 关键词", numResults: 5)'
```

例子：

```powershell
mcporter call 'exa.web_search_exa(query: "site:mp.weixin.qq.com 个人色彩分析", numResults: 5)'
```

## 4. 微信公众号读取固定流程

1. 用 Exa 搜到 `mp.weixin.qq.com` 文章链接。
2. 优先用 Jina Reader 读取：

```powershell
curl.exe -L "https://r.jina.ai/http://r.jina.ai/http://mp.weixin.qq.com/s/ARTICLE_ID"
```

3. 如果失败，改用 Camoufox 浏览器链路。
4. 读取后交给 `longka-content-intelligence` 归纳。

## 5. 公众号文章整理格式

每篇文章进入内容情报库时，按这个结构：

- 标题
- 链接
- 账号名
- 发布时间
- 目标用户
- 核心观点
- 用户痛点
- 反复出现的关键词
- 标题/钩子
- 内容结构
- 可信证据
- 可复刻点
- 对当前项目的启发

## 6. Longka 调用规则

用户说这些话时，应走公众号链路：

- “搜公众号里关于 XX 的文章”
- “看看微信公众号有没有 XX 的爆文”
- “读这篇公众号文章”
- “把这篇公众号文章拆成爆款结构”
- “把公众号里关于色彩分析的文章整理成选题”

用户说这些话时，应走小红书链路：

- “搜小红书 XX”
- “看看小红书用户怎么说”
- “拆这个小红书笔记”
- “找色彩分析的小红书爆款”

## 7. 与 Longka Skills 的关系

- 采集归属：`agent-reach`
- 资料精选报告归属：`longka-research-brief`
- 情报分析归属：`longka-content-intelligence`
- 创意生成归属：`longka-content-creative`
- 视频生产归属：`xiaomei-promo-video` / Remotion skills
- 产品转化归属：`longka-cro`
- 私域聊天洞察归属：`longka-private-domain-intelligence`

## 8. 重要边界

- 搜索结果只是线索，不是市场结论。
- 公众号原文不能大段照搬用于商业发布。
- 要提炼结构、需求、钩子和表达方式，而不是复制文章。
- 如果涉及平台登录、验证码或风控，优先让用户手动完成登录确认。
