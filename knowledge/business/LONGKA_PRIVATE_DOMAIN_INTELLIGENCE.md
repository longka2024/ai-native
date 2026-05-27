# Longka Private Domain Intelligence

这是 Longka 私域情报模块，用来对齐截图里的 `wx-cli` 能力。

## 1. 它解决什么问题

公域情报：

```text
公众号 / 小红书 / 抖音 / TikTok / Reddit
```

私域情报：

```text
微信群 / 客户聊天 / 咨询记录 / 售后记录 / 社群讨论
```

客户买行业 AI 助理 U 盘后，真正想要的是：

- 今天客户群里大家在问什么？
- 哪些问题代表真实需求？
- 哪些客户有购买意向？
- 我该怎么回复？
- 这些聊天能不能变成小红书/短视频选题？
- 哪些问题要沉淀成 FAQ？

## 2. 候选工具：wx-cli

仓库：

```text
https://github.com/jackwener/wx-cli
```

用途：

```text
从命令行查询本地微信数据：
会话、聊天记录、搜索、联系人、群成员、收藏、统计、导出
```

定位：

```text
wx-cli 是第三方开源依赖，不是 Longka 自有源码。
Longka 产品可以封装“分析微信群”按钮，但要把价值放在摘要、洞察、选题和话术，而不是宣称自研微信读取器。
```

安装：

```powershell
npm install -g @jackwener/wx-cli
```

Windows 初始化：

```powershell
wx init
```

验证：

```powershell
wx sessions
```

注意：Windows 下官方建议用管理员 PowerShell，并保持微信运行和已登录。

## 3. 产品化边界

这类能力非常有价值，但必须谨慎：

- 只读用户自己电脑上的微信。
- 用户主动选择要分析的群。
- 默认不上传原始聊天记录。
- 输出摘要、选题、话术、商机，不输出完整聊天。
- 敏感人名、手机号、地址、金额可做脱敏。
- U 盘版必须写清楚“本地授权分析”。

## 4. 推荐输出

不要输出原始聊天流水。

要输出：

```text
今日群聊重点
高频问题
客户真实痛点
潜在购买信号
建议回复话术
可发小红书选题
可拍短视频脚本
需要老板处理的事项
可沉淀 FAQ
```

## 5. 与 Longka 平台情报的关系

```text
公域情报：别人公开发了什么，市场在流行什么
私域情报：你的客户真实问了什么，今天该怎么跟进
```

两者结合才是完整行业助理：

```text
公域找趋势
私域找需求
AI 生成内容
AI 生成话术
AI 帮助成交
```

## 6. 下一步验证

一行安装：

```powershell
npm install -g @jackwener/wx-cli
```

然后以管理员 PowerShell 执行：

```powershell
wx init
```

再执行：

```powershell
wx sessions
```

如果能看到最近会话，说明私域微信情报底层可用。
