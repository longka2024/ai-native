# 个人形象诊断报告项目状态备忘录

更新时间：2026-05-03

## 本次已推进

### 2026-05-03 商业模板 V2 交付版

- 已生成彭元琴商业模板 V2 九页成品，当前最适合直接交付预览的版本：
  - 成品目录：`E:\Codex\output\peng-yuanqin-commercial-template-v2-9pages`
  - 成品压缩包：`E:\Codex\output\peng-yuanqin-commercial-template-v2-9pages.zip`
  - 公开目录：`E:\Codex\open-design\public\personal-image-report-demo\redo-v2-commercial-9pages`
  - 公开压缩包：`E:\Codex\open-design\public\personal-image-report-demo\redo-v2-commercial-9pages\peng-yuanqin-commercial-template-v2-9pages.zip`
  - 生成脚本：`E:\Codex\make_peng_yuanqin_commercial_template_v2.ps1`
- 这版已经把 31 张细节模块接入 4-7 页：
  - 发型模块：8 张，来自 `E:\Codex\output\imagegen\peng-yuanqin-detail-modules\hair-*.png`
  - 发色模块：7 张，来自 `E:\Codex\output\imagegen\peng-yuanqin-detail-modules\haircolor-*.png`
  - 眼镜模块：8 张，来自 `E:\Codex\output\imagegen\peng-yuanqin-detail-modules\glasses-*.png`
  - 首饰模块：8 张，来自 `E:\Codex\output\imagegen\peng-yuanqin-detail-modules\jewelry-*.png`
- 已视觉抽查第 4、5、6、7 页：新发型、新发色、首饰、眼镜均已替换进入正式页面。
- 已修正 `00-contact-sheet.png` 的预览方式：总览图现在使用完整等比缩放，不再裁切 8、9 页这类长版页面。
- 已重新运行脚本并验证：输出目录、公开目录、zip 包均包含 `00-contact-sheet.png` + 9 张正式 PNG。

重新生成命令：

```powershell
powershell -ExecutionPolicy Bypass -File E:\Codex\make_peng_yuanqin_commercial_template_v2.ps1
```

### 2026-05-03 商业模板 V3 快速修正版

- 用户反馈 V2 有大量素材硬贴、假试戴和拼贴感，判断成立。
- 已新增 V3 脚本：`E:\Codex\make_peng_yuanqin_commercial_template_v3.ps1`
- V3 输出目录：`E:\Codex\output\peng-yuanqin-commercial-template-v3-9pages`
- V3 输出 zip：`E:\Codex\output\peng-yuanqin-commercial-template-v3-9pages.zip`
- V3 公开目录：`E:\Codex\open-design\public\personal-image-report-demo\redo-v3-commercial-9pages`
- V3 公开 zip：`E:\Codex\open-design\public\personal-image-report-demo\redo-v3-commercial-9pages\peng-yuanqin-commercial-template-v3-9pages.zip`
- 已把第 4、5、6、7 页中最明显的“完整生成脸硬贴”改成参考卡、色卡、材质卡、镜框参数卡。
- 已重新生成并验证：输出目录与公开目录 10 张 PNG 文件哈希一致，zip 包包含总览图 + 9 张正式页。
- 注意：V3 是“降假感可信骨架”，不是最终美术版。当前卡片为英文占位，下一步应解决中文文案编码和卡片视觉设计，再做最终商业精修。

重新生成 V3：

```powershell
powershell -ExecutionPolicy Bypass -File E:\Codex\make_peng_yuanqin_commercial_template_v3.ps1
```

- 2026-05-02 追加：已按“本人脸形象图作为统一 anchor model”的方向生成 Anchor V4。
- Anchor 基准图：`E:\Codex\open-design\public\personal-image-report-demo\kie-tests\1777630916556-flux-kontext-trend.png`
- 新生成 KIE 模块：
  - 发型：`E:\Codex\open-design\public\personal-image-report-demo\kie-tests\1777711763685-flux-kontext-anchor-hair.png`
  - 妆容：`E:\Codex\open-design\public\personal-image-report-demo\kie-tests\1777712649464-flux-kontext-anchor-makeup.png`
  - 眼镜：`E:\Codex\open-design\public\personal-image-report-demo\kie-tests\1777712674458-flux-kontext-anchor-glasses.png`
  - 首饰：`E:\Codex\open-design\public\personal-image-report-demo\kie-tests\1777712702755-flux-kontext-anchor-jewelry.png`
  - 穿搭：`E:\Codex\open-design\public\personal-image-report-demo\kie-tests\1777712724470-flux-kontext-anchor-outfit.png`
- Anchor V4 成品目录：`E:\Codex\output\personal-image-report-anchor-v4-9pages`
- Anchor V4 公开目录：`E:\Codex\open-design\public\personal-image-report-demo\anchor-9pages-v4`
- Anchor V4 生成脚本：`E:\Codex\make_anchor_report_v4.ps1`
- 网页预览首页已新增 `Anchor V4` 区块，并放在 V3 前面作为主推荐版。
- 3000 静态服务已作为外部后台进程启动，验证 `http://localhost:3000/personal-image-report-demo/index.html` 返回 200 且包含 Anchor V4。
- 已把 `hybrid-9pages-v3` 接入网页预览页：`E:\Codex\open-design\public\personal-image-report-demo\index.html`
- 顶部导航已新增 `Hybrid V3`。
- 页面首屏附近已新增 V3 总览图、9 页单图预览、单页 PNG 下载和整套 ZIP 下载。
- `E:\Codex\make_hybrid_report_v3.ps1` 已支持命令行覆盖客户照片、模块图、输出目录和 zip 路径。
- 脚本现在会把 zip 同步到 `E:\Codex\open-design\public\personal-image-report-demo\hybrid-9pages-v3`，网页可直接下载。
- 已重新生成并验证：公开目录中 V3 的 21 个网页引用都存在，zip 中包含总览图 + 9 张单页 PNG。
- HTTP 预览内容已在一次性启动中验证通过；如需持续预览，运行 `cd E:\Codex\open-design; node scripts\static-demo-server.mjs` 后打开 `http://localhost:3000/personal-image-report-demo/index.html`。

## 当前结论

这个项目已经不是停在一次性出图阶段，而是进入了“可复用商业交付流程”的雏形阶段。

当前最完整、最新、最值得继续迭代的版本是：

- 成品目录：`E:\Codex\output\peng-yuanqin-commercial-template-v2-9pages`
- 成品压缩包：`E:\Codex\output\peng-yuanqin-commercial-template-v2-9pages.zip`
- 前端公开资源：`E:\Codex\open-design\public\personal-image-report-demo\redo-v2-commercial-9pages`
- 生成脚本：`E:\Codex\make_peng_yuanqin_commercial_template_v2.ps1`
- 页面入口：`E:\Codex\open-design\public\personal-image-report-demo\index.html` 的 `Commercial V2` 区块

这个版本的核心策略是：

- 先生成发型、发色、眼镜、首饰等细节模块，再嵌入固定商业模板，避免整页生成导致版式和身份漂移。
- 4-7 页使用新模块做细节示范，1-3 页和 8-9 页保留已经稳定的诊断、妆容、穿搭结构。
- 输出 9 页 PNG、1 张总览 contact sheet 和 1 个 zip 包，并同步到公开目录供网页预览和下载。
- Anchor V4 仍可作为历史参考和后续身份一致性路线，但当前交付主线以 Commercial Template V2 为准。

## 项目结构

### 1. 核心前端项目

目录：`E:\Codex\open-design`

这是一个 Next.js / local-first design 项目。当前形象报告 Demo 放在：

- `E:\Codex\open-design\public\personal-image-report-demo\index.html`
- `E:\Codex\open-design\public\personal-image-report-demo\pages`
- `E:\Codex\open-design\public\personal-image-report-demo\pages-hd`
- `E:\Codex\open-design\public\personal-image-report-demo\pages-uhd`
- `E:\Codex\open-design\public\personal-image-report-demo\hybrid-9pages-v3`

当前 `index.html` 已经包含：

- 客户问卷模块
- 商业混合版说明
- 本人脸模块展示
- 高级穿搭效果展示
- 成品预览区域
- 母版参考区域
- 打印导出按钮

但它还没有把最新的 `hybrid-9pages-v3` 成品套图直接挂到页面导航和预览区里，这是下一步很适合补的地方。

### 2. 可复用技能和设计系统

已经新增了项目专用 skill：

- `E:\Codex\open-design\skills\personal-image-report\SKILL.md`

它定义了 9 页报告的结构、身份保真原则、KIE 模块生成规则、Soft Autumn 默认色盘和自检标准。

也新增了项目专用设计系统：

- `E:\Codex\open-design\design-systems\personal-image-studio\DESIGN.md`

它定义了韩式个人形象咨询报告的视觉风格：

- 暖象牙纸张
- taupe 细分割线
- Georgia 英文标题
- 中文报告正文
- 香槟金、豆沙玫瑰、鼠尾草绿、可可棕
- 密集但对齐的专业咨询版式

### 3. 图片生成和 API 测试层

目录：

- `E:\Codex\open-design\tools\image-provider`
- `E:\Codex\open-design\public\personal-image-report-demo\kie-tests`

已经有 KIE 图片提供商脚本：

- `run-kie-report-module.mjs`
- `run-kie-kontext-test.mjs`
- `run-kie-outfit-set-test.mjs`
- `run-kie-9piece-cost-test.mjs`
- `kie-client.mjs`

已测试并保留下来的关键模块包括：

- 发型本人特征图：`1777652615798-flux-kontext-hair-feature-v2.png`
- 眼镜本人特征图：`1777652806610-flux-kontext-glasses-feature-v2.png`
- 首饰本人特征图：`1777652934522-flux-kontext-jewelry-feature-v2.png`
- 多组穿搭、趋势图、upscale 测试图

README 里已经写明推荐流程：不要一次生成整套 9 页报告，而是一个模块一个模块生成、挑选、再放进固定报告模板。

### 4. 原始客户照片

当前脚本硬编码使用了：

- `E:\彭元琴\4869.jpg`
- `E:\彭元琴\4866.jpg`

该目录下还有：

- `4865.heic`
- `4866.jpg`
- `4867.jpg`
- `4868.jpg`
- `4869.jpg`
- `4870.jpg`
- `4871.jpg`

`open-design\public\personal-image-report-demo\current-client.jpg` 当前也对应客户照片。

## 已生成版本时间线

### V1：基础 9 页报告

- 目录：`E:\Codex\output\personal-image-report-9pages`
- zip：`E:\Codex\output\personal-image-report-9pages.zip`
- 时间：2026-04-29

这个版本更像从模板或初版生成出的 9 页报告。

### Clear 版：清晰 9 页报告

- 脚本：`E:\Codex\make_clear_personal_report.ps1`
- 目录：`E:\Codex\output\personal-image-report-clear-9pages`
- zip：`E:\Codex\output\personal-image-report-clear-9pages.zip`
- 时间：2026-04-29 22:08

这个版本用 PowerShell/System.Drawing 稳定绘制了 9 页，风格更清楚，但身份表达主要靠原图裁切和图形示意。

### Identity Safe 版

- 脚本：`E:\Codex\make_identity_safe_report_v2.ps1`
- 目录：`E:\Codex\output\personal-image-report-identity-safe-v2-9pages`
- zip：`E:\Codex\output\personal-image-report-identity-safe-v2-9pages.zip`
- 时间：2026-04-30 00:10

这个版本是“本人保真、不重绘客户五官”的安全交付思路。优点是身份风险低，缺点是商业高级感不如后面的 hybrid 版本。

### Hybrid V3：当前最佳版本

- 脚本：`E:\Codex\make_hybrid_report_v3.ps1`
- 目录：`E:\Codex\output\personal-image-report-hybrid-v3-9pages`
- zip：`E:\Codex\output\personal-image-report-hybrid-v3-9pages.zip`
- 公开资源：`E:\Codex\open-design\public\personal-image-report-demo\hybrid-9pages-v3`
- 时间：2026-05-02 00:57

尺寸和产物：

- `00-hybrid-v3-contact-sheet.png`：1800x2600
- 第 1 页：2592x5463
- 第 2 到 7 页：3072x4608
- 第 8 到 9 页：2592x5463
- zip 大小约 150 MB

这是目前最像可卖交付物的一版。

## 继续工作的常用命令

### 预览静态 Demo

```powershell
cd E:\Codex\open-design
node scripts\static-demo-server.mjs
```

打开：

```text
http://localhost:3000/personal-image-report-demo/index.html
```

### 重新生成 Hybrid V3

```powershell
powershell -ExecutionPolicy Bypass -File E:\Codex\make_hybrid_report_v3.ps1
```

生成后会更新：

- `E:\Codex\output\personal-image-report-hybrid-v3-9pages`
- `E:\Codex\open-design\public\personal-image-report-demo\hybrid-9pages-v3`
- `E:\Codex\output\personal-image-report-hybrid-v3-9pages.zip`

### 重新生成 Anchor V4

```powershell
powershell -ExecutionPolicy Bypass -File E:\Codex\make_anchor_report_v4.ps1 -Config E:\Codex\clients\peng-yuanqin-anchor-v4.json
```

生成后会更新：

- `E:\Codex\output\personal-image-report-anchor-v4-9pages`
- `E:\Codex\open-design\public\personal-image-report-demo\anchor-9pages-v4`
- `E:\Codex\output\personal-image-report-anchor-v4-9pages.zip`
- `E:\Codex\open-design\public\personal-image-report-demo\anchor-9pages-v4\personal-image-report-anchor-v4-9pages.zip`

### 测试 KIE 模块

先进入：

```powershell
cd E:\Codex\open-design
```

设置 API key：

```powershell
$env:KIE_API_KEY="你的 KIE API key"
```

干跑，不消耗额度：

```powershell
node tools\image-provider\run-kie-report-module.mjs --provider flux-kontext --input "E:\彭元琴\4866.jpg" --look glasses --dry-run
```

真实生成时去掉 `--dry-run`。

## 目前最值得补的改进

1. 继续把 Anchor V4 的配置项做细。
   当前 `make_anchor_report_v4.ps1` 已支持 `-Config` 读取客户 JSON，已覆盖输出路径、公开路径、KIE 模块图、季型、色彩维度和色盘。后续可以继续把每页重点建议、避免项、客户姓名和交付版本号也配置化。

2. 为多客户建立 `clients/*.json`。
   每个客户保存姓名、照片路径、季型、色盘、选中的 KIE 模块、输出目录。这样每个客户可以一键复现，并且不会污染主脚本。

3. 合并三代 PowerShell 生成器。
   目前有 `make_clear_personal_report.ps1`、`make_identity_safe_report_v2.ps1`、`make_hybrid_report_v3.ps1`。建议保留 V3 作为主线，把前两版中的有用模块整理成函数。

4. 增加视觉 QA 清单。
   每次生成后检查：脸是否像本人、文字是否被遮挡、页面是否齐全、zip 是否更新、页面预览是否引用最新图。

5. 输出商业分层。
   当前 `index.html` 已经有 19.9、59、高价定制的定价思路。可以继续沉淀成不同交付模板：
   - 低价版：本人主图 + 色彩诊断 + 穿搭参考
   - 高级版：增加发型、眼镜、首饰、妆容本人模块
   - 定制版：补全身照、人工筛图或 FaceID 工作流

## 建议下一步

最顺手的下一步是先改 `index.html`：

- 在顶部导航增加“Hybrid V3 套图”
- 在页面首屏附近加入 `00-hybrid-v3-contact-sheet.png`
- 加 9 个单页下载链接
- 加 zip 下载链接，指向 `output` 目录时需要考虑静态服务无法直接访问，可以复制 zip 到 `public/personal-image-report-demo/hybrid-9pages-v3` 或新增下载说明

然后再把 `make_hybrid_report_v3.ps1` 参数化，变成可以替换客户照片和模块文件的一键生成脚本。
