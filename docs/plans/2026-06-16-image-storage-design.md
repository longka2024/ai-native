# 配图持久化存储 — 设计 + 实现计划

Date: 2026-06-16
方法：按 Superpowers brainstorming → writing-plans 流程产出。用户已批准设计。

## 问题

配图改走 Kie gpt-image-2 后，Kie 返回的是**临时图床 URL（约 24h 失效）**。
- 长期留存（资产库 / 母题复用 / 复盘）需要我们自己的持久存储。
- 但 122 磁盘扛量会塞满（用户明确担心"量大了 122 塞满"）。

## 已定决策（brainstorm 结论）

- **只存"保留的"**：生成时用 Kie 临时链接预览；只有"保存为母题资产 / 确认成稿 / 导出交付"才转存。丢弃的草图不占空间。
- **Provider 无关**：阿里 OSS / 火山 TOS / 腾讯 COS / 华为 OBS / 七牛 Kodo 大多兼容 S3 协议 → 做一个 S3 兼容上传层，全靠 env 配，用户填哪家的密钥就用哪家，代码不改。
- **公读直链**：对象 public-read，直接公网 URL（配图本就要发到小红书=公开）；有 CDN 域名填 `OSS_PUBLIC_BASE`。
- **不丢图**：上传失败则保留 Kie 临时链接 + 标记"未持久化"，可重试。

## 架构

```
生成（现状不变）：前端 → 122 → Kie createTask → 轮询 → Kie 临时 URL → 预览
持久化（新增，仅"保留"时触发）：
  前端"保存为资产/确认/导出" → POST 122 /api/assets/persist-images { urls[], workspace, style, jobId }
  → 122 asset-store.mjs：逐张 fetch(Kie URL) → 上传 S3 兼容对象存储
     key = longka/<业务线>/<风格>/<YYYYMMDD>/<jobId>-pN.png
  → 返回持久 URL[] → 前端写回 manifest / finalWorks，替换临时链接
122 磁盘：只在 fetch→upload 间做内存中转，不常驻存图。
```

env 配置：`OSS_ENDPOINT / OSS_REGION / OSS_BUCKET / OSS_ACCESS_KEY / OSS_SECRET / OSS_PUBLIC_BASE`（不进 git，放 122 .env）。

## 实现计划（writing-plans）

**Phase 1 — 后端存储层（可独立测）**
1. `apps/command-center-prototype/asset-store.mjs`：S3 兼容上传。用 `@aws-sdk/client-s3`（endpoint 覆盖 + forcePathStyle，兼容各家）；导出 `ossEnabled()` + `uploadBuffer(key, buf, contentType)` → 返回公读 URL（`OSS_PUBLIC_BASE` 优先，否则拼 endpoint/bucket）。key 读自 env，绝不硬编码。
2. `server.mjs` 新增 `POST /api/assets/persist-images`：收 `{ urls[], workspace, style, jobId }` → 逐张 `fetch` 下载 → `uploadBuffer` → 返回 `{ ok, files:[{src, url}] }`；单张失败不阻断其余，失败项标 `persisted:false`。
3. 122 `npm i @aws-sdk/client-s3`；env 填选定 provider 的密钥。
4. 验收：curl 传一个测试 URL，确认对象进桶 + 公网可访问。

**Phase 2 — 前端接线**
5. "保存为母题资产 / 确认成稿 / 导出交付"动作里：拿当前 manifest.publicFiles → 调 `/api/assets/persist-images` → 用返回的持久 URL 替换 manifest/finalWorks 里的临时链接（持久化后资产库存的就是永久 URL）。
6. 验收：保存为资产后，资产里的图链接是对象存储域名、且 24h 后仍可访问。

**Phase 3 —（可选）生命周期**
7. 桶上配生命周期规则（超期未引用自动清）；或留作后续。

## 禁止范围
- 不动 43；不动生成主链路（生成仍走 Kie 临时链接，只在"保留"时才持久化）。
- 不把密钥写进代码/仓库（env only）。
- 不在 122 磁盘常驻存图。

## 待用户提供（实现前）
- 选定哪家对象存储 + 其 `endpoint/region/bucket/access-key/secret`（+ 可选 CDN 域名）。
