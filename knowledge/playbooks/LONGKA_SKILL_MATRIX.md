# Longka Skill Matrix

这是 Longka 长期基建的 skill 矩阵索引。目标不是只服务一个色彩项目，而是让后续国内、海外、图文、视频、SaaS、小程序、独立站项目都能复用同一套生产方法。

## 1. 市场轨道

### 国内轨道

适用：

- 微信小程序
- 微信支付 / 支付宝
- 小红书 / 抖音 / 视频号
- 短信验证
- 小程序审核
- 算法备案、ICP备案、合规表达
- 人工核销、客服微信、后台订单

优先目标：

- 审核能过
- 支付能闭环
- 客户不懵
- 后台好操作
- 生成成本可控

### 海外轨道

适用：

- DTC / Shopify / 独立站
- Stripe / PayPal
- Meta Ads / Google Ads / TikTok Ads
- Amazon / Reddit / TikTok 选品和 VOC
- 英文落地页
- Email / SMS 用户生命周期

优先目标：

- Offer 测试
- 创意测试
- 转化率
- 投放经济账
- 留存和复购

### 通用轨道

适用：

- AI 产品开发
- 源码基座复用
- 图片生成
- Remotion/HyperFrames 视频生产
- 内容情报采集
- 后台管理
- 质量诊断

## 2. 当前已建立的 Longka Skill 骨架

| Skill | 路径 | 作用 |
| --- | --- | --- |
| `longka-hub` | `E:\Codex\skills\longka-hub` | 总入口，判断任务属于国内、海外还是通用，并路由到对应工作流 |
| `longka-diagnose` | `E:\Codex\skills\longka-diagnose` | 处理反复出 bug、流程断裂、生图失败、支付订单异常、部署异常 |
| `longka-product-base` | `E:\Codex\skills\longka-product-base` | 管理 ShipAny、TinyShip、未来购买源码和可复用模块 |
| `longka-payment-wechat-alipay` | `E:\Codex\skills\longka-payment-wechat-alipay` | 微信/支付宝/人工核销的订单状态机和前后台展示规则 |
| `longka-mini-program-review` | `E:\Codex\skills\longka-mini-program-review` | 小程序审核包、合规文案、隐私协议、审核风险控制 |
| `longka-admin-ops` | `E:\Codex\skills\longka-admin-ops` | 后台订单分组、客户原图、成品图、失败页重做、下载和核销 |
| `longka-content-intelligence` | `E:\Codex\skills\longka-content-intelligence` | 小红书/抖音/TikTok/Reddit 等内容情报和爆款拆解 SOP |
| `longka-content-creative` | `E:\Codex\skills\longka-content-creative` | 把内容情报变成标题、封面、脚本、图文页和视频节奏 |
| `longka-cro` | `E:\Codex\skills\longka-cro` | 首页、移动端、上传、试看、付款、报告页的转化路径设计 |
| `longka/_system` | `E:\Codex\skills\longka\_system` | 共享规则：市场路由、上下文矩阵、硬规则、输出格式 |

## 3. 已有可继续复用的 Skill

| Skill | 作用 |
| --- | --- |
| `longka-project-harness` | 全局工作纪律、上下文、长期基建管理 |
| `personal-color-stylist` | 色彩报告生产经验和业务规则 |
| `xiaomei-promo-video` | 小妹可用的宣传视频生产工作流 |
| `agent-reach` | 小红书等平台数据获取 |
| `remotion-video-production` | Remotion 视频生产 |
| `hyperframes` | 视频布局和动效灵感 |
| `imagegen` / `baoyu-image-gen` | 图片生成 |

## 4. 下一批应补的 Skill

### 近期优先

第一批已完成。下一步应进入项目成品验证：选色彩报告或宣传视频项目，用这些规则实际改一版页面/后台/视频。

### 中期

- `longka-overseas-dtc`
- `longka-shopify-adapter`
- `longka-stripe-paypal`
- `longka-ads-creative-testing`
- `longka-email-sms-lifecycle`

### 后期产品化

- `longka-skill-packager`
- `longka-operator-kit`
- `longka-content-machine`
- `longka-video-machine`

## 5. 与 AFA DTC Skills 的关系

AFA DTC Skills 作为海外 DTC 顾问矩阵参考，不直接照搬。

吸收：

- Hub / Supervisor / Worker 分层
- `_system` 共享规则
- `references` 资料库
- dashboard / diagnose / creative / convert / launch / product 的业务角色

改造：

- 国内项目走 Longka China track
- 海外项目走 Longka Overseas track
- 通用生产力工具走 Longka shared track

## 6. 使用原则

1. 先判断市场，不要把国内微信逻辑和海外 DTC 逻辑混在一起。
2. 先判断层级，不要用开发修 bug 的方式解决商业定位问题。
3. 可复用经验必须沉淀到 skill、reference、script 或项目 docs。
4. 遇到反复 bug，必须先用 `longka-diagnose`，不要直接补丁式乱改。
5. 色彩报告项目的经验，不只属于色彩项目，要逐步抽象成订单、支付、后台、内容获客、AI 生成的通用模块。

## 7. 应该在最终成品里看到的效果

### 色彩报告产品

基座打磨后的成品表现：

- 首页更清楚：用户一眼知道这是“上传照片生成个人形象色彩报告”。
- 移动端流程更顺：上传试看、看样片、付款核对、补全身照、看报告，各状态不混乱。
- 支付更稳：按钮点击不等于已付款，必须有清晰的订单状态和管理员核销。
- 后台更好用：先按“待核对付款 / 未付款预览 / 已开通记录 / 制作异常”分组，再看订单。
- 生图更可控：失败页能被识别和逐页重做，不让客户看到一堆无意义提示。
- 报告更适合传播：移动端图片可滑动查看，图片旁边有明确保存/下载动作。

### 小程序审核包

基座打磨后的成品表现：

- 审核源码和完整业务源码分离。
- 文案更合规，不主动暴露敏感模型或海外服务细节。
- 隐私协议、用户协议、服务说明齐全。
- 审核人员能走通核心流程，不会看到半成品后台逻辑。

### 宣传视频 / 图文爆款机

基座打磨后的成品表现：

- 不再只靠灵感写文案，而是先采集需求和爆款样本。
- 每条视频有明确 hook、视觉对比、证明点、CTA。
- Remotion/HyperFrames/FFmpeg 只是生产工具，前面的内容洞察决定成败。
- 小妹后续可以按 operator kit 操作，不必理解底层代码。

### 海外项目

基座打磨后的成品表现：

- 能从 AFA DTC 思路切入 Shopify/DTC/Stripe/广告创意测试。
- 国内微信支付和海外 Stripe/PayPal 不混在一个逻辑里。
- 同一套内容情报方法可以切到 TikTok、Reddit、Amazon、Google。
