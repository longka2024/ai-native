# 内容工厂总图(2026-06-25)

> 一张图看懂整条内容工厂:图文线已成熟,视频线本轮梳理完成。任何会话/人开工前看这张定位全局。

## 北极星
**产品化**:能力一律沉后端工作流,**客户(小妹)零技术只拿成品**,数据复利=护城河。判断任何功能的最高标尺。

## 一句话
`内容 → 选对人群的真实需求(选题)→ 创作(文案/视觉/视频)→ 质检 → 成品 → 发布 → 回流`。客户只消费成品。

## 总图

```
客户开通(行业 / 目标 / 平台 / 关键词)
      ↓
━━━ ① 公共上游(所有内容共用)━━━
  选题层 = 关键词洞察层(人群定位→真实采词(百度sug等)→脚本框架 70/30)  ← 定位是第一要素·爆的上限
         + 信号发现(TrendRadar 11热榜 / AI HOT)
  真实料层 = 真实采集(5-10锚点,MediaCrawler/江湖工具箱)+ 评论深挖(痛点/异议/金句)
  质量门(文字)= dbs-ai-check + humanizer-zh + 合规门(防导流封号)
      ↓ 内容定了 → 选产出形态
━━━ ② 形态分诊(video-format-router:内容→形式,反千篇一律)━━━
  ├─ 图文线【已成熟】→ 小红书图文卡 / 公众号长文
  │     风格12 × 打法(冲击力封面/杂志叠字/实拍/插画)+ 封面引擎(Kie/43)+ GLM-5V 判图
  │
  └─ 视频线【本轮梳理完成】↓
━━━ ③ 视频线 ━━━
  形态(6):混剪B-roll / 口播 / AI剧情 / 泥偶 / 漫画 / 数据
  风格模板库(6档·2类,扒自剪映21期成品,详见 video-style-template-library):
     · 纯混剪(无人):  档0 mizan 实景空镜(暖金)
     · 口播(画中画):  档1 商业知识 / 档2 数据硬核 / 档3 快剪燃 / 档4 专业讲解 / 档5 治愈生活
  生产流水:选题套脚本框架 → matcher 配 A-roll/B-roll → 配音(IndexTTS本机免费 / provider云API豆包千问火山)
            → fill_broll 声画同步换 Pexels(真实素材优先)→ 渲染
  渲染两路:Remotion(主干·无头批量·122) / VectCut(精修分支·剪映桌面端·人在环)
  降本:AI生成→ComfyUI自建LTX(几毛/条);数字人→ComfyUI自建口型(LatentSync/MuseTalk/HeyGem)
      ↓
━━━ ④ 质检(三质量门)━━━
  文字(已在①) · 视觉(GLM-5V判图 / taste-skill) · 视频(声画同步铁律 / video-use)
      ↓
━━━ ⑤ 成品 → 发布 → 回流 ━━━
  Web UI 确认 → 发布记录 →(自动发布·缺)→ T+3复盘 → 回流更新 人群/选词/rubric(数据复利)
```

## 关键认知:"不会差" vs "能爆"(别只顾制作)
- **不会差(下限)** = 制作质量(风格模板库 / 声画同步 / 画质)
- **能爆(上限)** = 选题 / 钩子 / 情绪 / 完播(关键词洞察层 + 真实料)
- **制作是放大器,放大的是好内容**。模板只保证"不差",真正爆靠选题钩子。详见 [[viral-video-model]]。

## 现状 / 缺口
- ✅ **已通**:图文线(小妹在用);视频混剪线(声画同步·端到端零花钱);关键词洞察层骨架;风格库 v0;配音(IndexTTS)
- ⚠️ **半成品**:口播(缺数字人);风格库 5 档待参数化进 Remotion;配音 provider 化(豆包/千问/火山)待接
- ❌ **缺口**:AI生成自建(ComfyUI);自动发布;发布→回流学习闭环;**客户自助 UI 接入(产品化最后一公里)**;真实付费数据(mizan,索取中)

## 索引
- 选题根基:[[seo-keyword-insight-layer]] · 策略 `docs/strategy/mizan-seo-keyword-strategy.md`
- 出片管线:[[content-factory-rendering-pipeline]] · 工具 `tools/make_video.py`
- 风格库:`docs/strategy/2026-06-25-video-style-template-library.md` · [[video-effect-template-engine-roadmap]]
- 铁律:[[video-audio-sync-mandatory]] · [[viral-video-model]] · [[three-quality-gates-mandatory]] · [[2026-06-21-stop-churning-ai-videos]] · [[2026-06-22-paid-action-consent]]
- 渲染/数字人:[[2026-06-22-digital-human-and-vectcut]] · [[video-cost-must-self-host-ltx]]
- 管线 spec:`docs/specs/2026-06-24-content-factory-pipeline-spec.md`
