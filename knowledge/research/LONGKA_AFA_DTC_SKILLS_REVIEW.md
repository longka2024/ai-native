# Longka 对 AFA DTC Skills 的吸收评估

评估对象：`https://github.com/afadtc/afa-dtc-skills`

本地评估副本：`E:\tmp\afa-dtc-skills`

结论：这套仓库不建议原样照搬成 Longka 主基建。它最值得吸收的不是单个 skill，而是“AI 顾问矩阵”的组织方式：Hub 负责路由，Supervisor 负责业务域，Worker 负责具体任务，`_system` 负责统一纪律、上下文、输出格式、降级规则、品牌记忆和成本意识。

## 1. 它真正有价值的地方

### 1.1 Hub + Supervisor + Worker

AFA 不是一堆散装提示词，而是一个分层系统：

- `afa`：总入口，负责识别问题属于哪个业务域。
- `afa-foundation / afa-paid / afa-organic / afa-monetize / afa-scale`：业务域主管。
- `afa-creative / afa-social / afa-convert / afa-product / afa-launch` 等：具体工作 skill。

Longka 应吸收这个模式，但业务域要换成我们自己的：

- 产品基座
- 小程序审核
- 微信 / 支付宝支付
- 后台运营
- 内容情报
- 小红书增长
- 图文爆款机
- 视频爆款机
- 色彩报告生产
- 诊断与质量门

### 1.2 `_system` 共享协议

AFA 的 `afa/_system` 很值得学：

- `preamble.md`：任务开始时先确认上下文。
- `iron-rules.md`：硬规则。
- `degradation-rules.md`：资料不足或工具失败时如何降级。
- `edge-cases.md`：边界情况。
- `interaction-protocol.md`：如何和用户交互。
- `context-matrix.md`：不同任务需要哪些输入。
- `output-format.md`：输出格式统一。
- `brand-memory-protocol.md`：品牌记忆。
- `cost-tag-spec.md`：成本意识。
- `reasoning-rules.md`：推理约束。
- `reference-authoring-rules.md`：资料库写法。
- `skill-directory.md`：skill 路由表。

Longka 需要自己的 `_system`，但内容应围绕国内项目实际情况：微信生态、支付宝/微信支付、小程序审核、短信、备案、内容矩阵、人工核销、后台订单、图片生成成本、服务器部署、ShipAny/TinyShip 基座复用。

### 1.3 Reference Library

AFA 每个 skill 都配了 `references/`，这点非常关键。

Skill 本身不应该堆太多知识，应该只写工作流程；具体模板、案例、指标、反例、SOP 放在 reference 里。这样 skill 才能长期维护，也能产品化销售。

Longka 后面也要这样拆：

- skill：告诉 agent 怎么工作。
- references：放方法论、案例、模板、检查表。
- scripts：放可复用自动化脚本。
- assets：放样例素材、视频模板、提示词模板。

## 2. 哪些 AFA 模块对我们有用

| AFA 模块 | 对 Longka 的价值 | 吸收方式 |
| --- | --- | --- |
| `afa` | 总路由设计很有价值 | 改造成 `longka-hub` |
| `afa-dashboard` | 适合做后台指标、订单、转化、内容数据看板 | 改造成 `longka-dashboard` |
| `afa-diagnose` | 适合做项目故障诊断、转化诊断、生产流程卡住诊断 | 改造成 `longka-diagnose` |
| `afa-creative` | 适合图文、短视频、广告素材、hook 生成 | 融入 `longka-content-creative` 和 `xiaomei-promo-video` |
| `afa-social` | 可借鉴社媒内容分发逻辑 | 改造成小红书/视频号/抖音优先 |
| `afa-convert` | 对首页、支付页、下单流程、按钮文案很有价值 | 改造成 `longka-cro` |
| `afa-product` | 可用于新项目定位、功能范围、MVP 判断 | 改造成 `longka-product-base` |
| `afa-launch` | 可用于产品上线、审核、发布、推广节奏 | 改造成 `longka-launch` |
| `afa-brand` | 对品牌调性、产品命名、页面文案有价值 | 改造成 `longka-brand` |
| `afa-email / afa-sms` | 暂时次要，但以后做用户生命周期可用 | 后置 |
| `afa-fb / afa-gg / afa-tt` | 海外投放场景强，当前国内项目优先级低 | 暂不吸收 |
| `afa-seo / afa-pr / afa-influencer` | 可借鉴，但国内渠道要重写 | 后续本土化 |
| `afa-ops / afa-scale / afa-expand` | 规模化阶段有用 | 等订单、支付、内容系统稳定后再吸收 |

## 3. 不建议直接照搬的原因

1. 它的业务语境是 DTC / Shopify / 海外广告，我们当前主战场是微信、小程序、小红书、国内支付、AI 生成图片服务。
2. 仓库中文在当前环境下存在编码乱码，直接安装会降低可读性。
3. 它强调海外独立站经营，而我们的核心是“源码基座 + AI 能力 + 内容获客 + 微信支付闭环 + 后台运营”。
4. 我们已经有自己的项目经验，尤其是色彩报告、Remotion 宣传视频、Agent Reach 小红书数据、微信审核包、ShipAny/TinyShip 基座，这些都应该成为 Longka 自己的 reference library。

## 4. Longka 应该改造成的 Skill 矩阵

第一批建议做这些，不要一次做太大：

- `longka-hub`：总入口，判断当前任务属于产品、开发、内容、审核、运营、诊断、视频还是部署。
- `longka-product-base`：管理 ShipAny、TinyShip、未来购买源码的复用边界。
- `longka-payment-wechat-alipay`：微信支付、支付宝、人工核销、订单状态机。
- `longka-mini-program-review`：小程序审核包、合规文案、禁用海外模型表达、隐私协议。
- `longka-admin-ops`：后台订单、客户图片、生成状态、重做、下载、核销。
- `longka-content-intelligence`：小红书/网页/评论区/爆款内容的数据采集和需求洞察。
- `longka-content-creative`：图文爆款机、标题、钩子、封面、对标拆解、复刻方案。
- `longka-promo-video`：视频脚本、Remotion/HyperFrames/FFmpeg、素材组织、小妹可操作工作流。
- `longka-color-report`：色彩报告项目的业务规则、订单状态、图片生成质量标准。
- `longka-cro`：首页、移动端流程、付款引导、用户不懵的转化路径。
- `longka-diagnose`：遇到 bug、流程断裂、服务器异常、生图失败时强制走诊断流程。

## 5. 与现有 Longka 资产的关系

现有资产不要推倒重来，而是补一个更清晰的组织层：

- `longka-project-harness`：继续作为全局工作纪律。
- `personal-color-stylist`：继续作为色彩报告生产 skill。
- `xiaomei-promo-video`：继续作为宣传视频生产 skill。
- `agent-reach`：继续作为小红书/平台数据获取工具。
- `remotion-video-production / hyperframes`：继续作为视频制作工具链。
- 新增 Longka 矩阵：负责把这些 skill 串成“业务系统”，不是替代它们。

## 6. 下一步建议

### 第一阶段：先建骨架

1. 建 `longka-hub`。
2. 建 `longka/_system`。
3. 建 `longka-diagnose`。
4. 建 `longka-product-base`。

### 第二阶段：服务当前赚钱项目

1. 强化 `longka-color-report`。
2. 强化 `longka-admin-ops`。
3. 强化 `longka-payment-wechat-alipay`。
4. 强化 `longka-mini-program-review`。

### 第三阶段：服务获客和放大

1. 强化 `longka-content-intelligence`。
2. 强化 `longka-content-creative`。
3. 强化 `longka-promo-video`。
4. 建立小妹可用的 operator kit。

### 第四阶段：产品化出售

把成熟 skill 拆成：

- 安装说明
- 使用边界
- 输入模板
- 输出样例
- 脚本工具
- 参考案例
- 常见错误
- 交付清单

这样它就不只是内部经验，而是可复用、可迁移、可售卖的数字资产。

## 7. 最终判断

AFA DTC Skills 对我们非常有参考价值，但价值在“框架”，不在“照搬内容”。

我们应该吸收：

- 分层顾问矩阵
- shared system
- reference library
- 诊断 skill
- dashboard skill
- creative / convert / product / launch 的业务思维

我们不应该照搬：

- Shopify/DTC 语境
- 海外广告平台优先级
- 乱码中文内容
- 与国内微信/小红书/小程序不匹配的流程

Longka 的方向应该是：用 AFA 的骨架，装进我们自己的国内 AI 产品生产经验、源码基座复用经验、内容获客 SOP、微信支付闭环、后台运营规则和视频图文生产能力。
