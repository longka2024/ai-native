# SPEC:122 命令中心 — 视频二创生产引擎升级(model-native 版)

> 状态:待用户拍板 → 拍板后从 Phase 1 起,动手前先复述 spec(SPEC-first)。
> 日期:2026-06-30。背景:对标 OpenMontage / Pixelle / 楚川 后的"今天版"重构。

## 定性(已与用户敲定)
- **122 命令中心 = 图文 + 视频的统一生产引擎**;shipany(买的 SaaS 模板)只做**后期**的会员/鉴权/支付/分层外壳,不在里面 fork 核心逻辑。
- 一个**共享内容大脑** + 两个出片引擎:
  - 内容大脑:真实采集 / 选题 / 对标拆解 / 角色·角度层 / 判断库 / 质检中台 / 回流。
  - 出片引擎:图文(已建:知识海报等)+ 视频(本次升级)。

## 核心原则:模型做判断、脚本做执行
几个月前的重型管线大半是为补当时模型的弱;今天多模态模型把很多环节压成一次调用。重新划线:
- **模型层(它现在强)**:视频理解、脚本/角色二创、对标拆解、配镜精排、成片软质检。
- **脚本层(模型不可靠/贵/要稳)**:渲染、硬 QC、调度、成本、声明式管线骨架。

## 做啥

### 模型层
1. **对标爆款分析**:Gemini 原生整段理解 → 结构化输出(5 维镜头语法[主体/主体动作/场景&叠层/构图/镜头] + 每场景 motion_type + 钩子/节奏/转场)→ 喂脚本与配镜。替掉 whisper+场景检测+CLIP+读帧那套拼装 plumbing(我们 Gemini 原生已更先进)。
2. **脚本 / 角色二创**:复用已建**角色·角度层**(账号身份锁口吻,英锐=教育规划顾问)+ 真实料 + 判断库 → 二创脚本;两形态:国内中文二创 / 海外多语言旁白。
3. **配镜检索(双塔已判定为正解,见附录)**:
   - **召回**:双塔 = **Gemini 描述塔(主)** + 可选 CLIP 视觉塔 → RRF 融合候选。
   - **精排**:VLM 直接判"这条镜配不配这句话" → 终选。
   - **起步**:素材库规模未到前,先用"关键词/文本召回 + VLM 重排"轻量版;库长大了 Gemini 描述塔自然顶上(别过度建)。
4. **软质检**:VLM 看整片(信息密度 / 钩子 / 声画同步 / 节奏)。

### 脚本层
5. **渲染**:Remotion EffectEngine(已有);批量真上量时切 bundle-once-render-N。
6. **硬 QC**:ffprobe(黑屏/静音/声画错位/分辨率)+ golden 暗角 SSIM(已有)+ 运动量/重复画面评分。**不用 VLM 干 ffprobe 能干的活(省钱)**。
7. **批量变体矩阵**(语言×时长×风格),挂声明式管线。
8. **回流**:T+3 指标 → 喂回判断库/角色,越用越准。

## 不做啥(边界)
- 不在 shipany 建/fork 核心逻辑(它后期只做会员/支付外壳)。
- 不烧钱 churn:烧钱形态/provider **默认关**,启用走 cost闸+用户点头;批量前必须先过质量门。
- 规模没到不过度建双塔(先召回+VLM重排);形态按验证逐个真做,不投机摊大(贺野教训)。
- ⚠️ **不因"现在贵/暂时不用"把能力划掉**——见下"形态菜单"与 [[capability-default-off-principle]]:能力默认要有、默认关。

## 视频形态菜单 + 自动分诊 + 模块化授权(北极星:镜像图文线)
**目标**:视频线做成图文线的镜像——一排形态可选 + 按内容自动分诊匹配 + 小妹可覆盖;每形态=可插拔模块,按客户付费授权装载。两条线共用一个内容大脑 + 质量门。

### 12 形态菜单(借自 OpenMontage,全接;烧钱的默认关)
| 形态 | 引擎 | 默认 |
|---|---|---|
| clip-factory 长素材切片 | Gemini拆+ffmpeg | 开(吃"素材大把"·先做) |
| talking-head 真人口播 | ffmpeg+字幕 | 开(先做) |
| documentary-montage 混剪 | 双塔检索+Remotion | 开(mizan已有) |
| animation 动效/图表 | Remotion EffectEngine | 开 |
| animated-explainer 解说 | Remotion+charts+TTS | 开(AI生成画面默认关) |
| screen-demo 录屏演示 | 录屏capture+Remotion | 开 |
| character-animation 角色动画 | Remotion/HyperFrames(接小妹xiaohei形象) | 开 |
| hybrid 混合 | 混剪+overlay | 开 |
| podcast-repurpose 音频转片 | ffmpeg+audiogram | 开 |
| avatar-spokesperson 数字人 | provider路由 | **关**(终局自建ComfyUI) |
| cinematic 情绪片(AI补镜) | 混剪+AI补镜provider | **AI补镜关** |
| localization-dub 多语言 | 云TTS多语言+唇形 | **关**(海外/唇形) |
| ~~framework-smoke~~ | — | 不接(测试infra) |

### 形态分诊器(像图文 autoApplyRecommendedVisualStyle)
内容信号 → 形态(脚本判型为主,拿不准上LLM精判),自动推荐 + 小妹可见可覆盖:
- 长素材/录屏→clip-factory/screen-demo · 真人素材→talking-head · 数据/知识点→animation/animated-explainer · 真实素材够+主题→documentary-montage · 海外多语言→localization-dub · 音频→podcast-repurpose · 情绪/品牌→cinematic · 品牌IP→character-animation
- **只在客户已授权(已装)的模块里分诊**。

### 四道门控(同一套注册-门控机制;分诊/选择器只露出「已上架 ∧ 已授权」的模块)
```
模块注册表(在不在) → 平台上架(后台开关) → 客户授权(付费解锁) → 成本闸(烧钱才consent)
```
- **闸1 注册**:形态注册表(视频版,同构 config.js visualStyles[]);能力默认要有、默认关。每条带 `listed`(平台上架)+ `entitled`(客户授权,per-customer)+ `engine`/`cost`/`provider`。
- **闸2 平台上架**:Longka 后台开关某模块整体上/下架(beta下架、成熟上架、下线)。**shipany 后期供后台管理 UI**;中台现在留 `listed` 字段 + 过滤 hook。
- **闸3 客户授权**:已上架模块里,客户付费解锁哪些 → 选择器只显示其购买的、分诊只在其中路由。**shipany 后期收钱写 `entitled`**;中台现在留字段 + 按授权显示/路由 hook。
- **闸4 成本**:烧钱模块(AI生成/数字人/唇形)= provider路由 + cost闸 + 用户点头。接官网还是第三方 = 运行时配置,不重写。
> 中台现在只需把"注册表 + listed/entitled 字段 + 按二者过滤显示/路由 + cost闸"留好;shipany 后期接上"后台开关 UI + 支付写字段",不回头改架构。

### 还要补的 lib 机制(之前漏/低估,已认领)
- `verify_scene_pacing` 节奏校验 → 并进 Phase1 质量门;`variation_checker` 批量去雷同 → Phase4;`cost_tracker` 成本闸 + sample-first 小样(批量前出10-15s验风格)→ 跨阶段铁规。

## 所需输入
真实料(采集已有)、对标爆款 URL/视频、账号角色(角色层已有)、品牌事实(mizan brief 已有)。

## 怎么验
- **单条**:选题→出片;配镜准(声画同步)、过硬QC+软QC、口吻跟所选角色 → 肉眼+VLM 双判通过。
- **批量**:一套业务信息 → N 变体,每条都过质量门、无翻车。
- **对楚川**:同主题,我们(真实料×质量)vs 他的,更真更稳更准。

## 分期(质量在前,规模在后)
| Phase | 做什么 | 性质 | 状态 |
|---|---|---|---|
| 1 | 质量门:ffprobe硬(分辨率/帧率/时长/音轨/静音/声画错位/黑屏)+ 运动量/重复 + **节奏校验(scene_pacing)** + VLM软看片 | 地基·免费 | 🔵 确定性部分已建+本机验通(qc_gate.py);待补 scene_pacing + VLM软看片 |
| 2 | 配镜升级(文本召回 + VLM重排;双塔预留) | 单条质量 | ⏳ |
| 3 | 对标分析进管线(Gemini结构化)+ 内容大脑(角色/判断/真实料)喂出片 | 上限·打楚川 | ⏳ |
| 4 | **形态注册表 + 形态分诊器(镜像图文)+ 模块化授权门 + 批量变体矩阵(配 variation_checker 去雷同)** | 规模·SaaS | ⏳ |
| 跨阶段铁规 | cost闸(估价)+ sample-first(批量前出10-15s小样)+ 烧钱模块默认关 | 防浪费/防烧钱 | ⏳ |

## 附录:双塔检索的判断(2026-06-30,用户提出 + 模型评估)
- 双塔 = 现代检索主干(retrieve-then-rerank 的召回层),未过时,反更核心。
- 用户的"Gemini 描述向量"双塔 > OpenMontage 的 CLIP:caption-then-embed 语义深、抓意图,且质量随 Gemini 进步而涨(CLIP 冻结)。更未来proof。
- vs 楚川 = 不同轴:楚川护城河是内容知识深度,双塔是配镜/检索(放大执行)。双塔不替代知识深度,但叠加真实料后楚川难有同等深度的真实素材语义检索。
- 最强版 = 双塔召回 + VLM 精排。timing:规模未到先轻量,别过度建。

## 铁律对齐
稳定>花哨 · 脚本>大模型 · 能不花钱 · 产品化(小妹零技术、选形态自动跑)。
