# GSAP Skills 技术基座拆解

Updated: 2026-05-28

Source: https://github.com/greensock/gsap-skills

## 定位判断

`greensock/gsap-skills` 不是一个普通前端动画 demo 仓库，而是 GSAP 官方给 AI coding agents 准备的技能包。它的价值在于让 AI 员工在做网页、工作台、落地页、交互演示、小程序 WebView、视频封面动效时，按正确的 GSAP 模式写代码。

对 Longka AI Native 系统来说，它应归入：

- 技术基座：表现层 / 动效交互层
- AI 员工：动效设计员工、前端设计员工、产品展示员工
- 典型产物：可演示网页、滚动叙事页、老板工作台动效、案例展示页、视频封面首帧动效、产品官网

## 仓库能力结构

仓库核心是 `skills/` 目录，官方把 GSAP 拆成几个 AI 可调用技能：

| Skill | 能力 | 在 Longka 中的用途 |
| --- | --- | --- |
| `gsap-core` | `gsap.to/from/fromTo`、duration、ease、stagger、defaults | 页面元素入场、按钮反馈、卡片切换、局部微动效 |
| `gsap-timeline` | timeline、position 参数、labels、嵌套、播放控制 | AI 员工工作流演示、首页开场动画、复杂产品讲解 |
| `gsap-scrolltrigger` | 滚动触发、pin、scrub、refresh、cleanup | 长页面滚动叙事、技术基座展示、案例拆解页 |
| `gsap-plugins` | Flip、Draggable、Observer、SplitText、MorphSVG、ScrollSmoother 等 | 高级交互、拖拽式任务板、文字标题动效、SVG/形态变化 |
| `gsap-utils` | clamp、mapRange、random、snap、toArray、selector、wrap 等 | 动效参数化、可复用动画模板、数据驱动 UI |
| `gsap-react` | `useGSAP`、scope、cleanup、SSR 注意事项 | React/Next/Remotion 周边页面的安全接入 |
| `gsap-performance` | transforms 优先、避免 layout 抖动、批处理、ScrollTrigger 性能 | 保证工作台和展示页不卡顿 |
| `gsap-frameworks` | Vue、Svelte 等生命周期和清理 | 后续多端/多框架迁移时使用 |

## 与现有技术基座的分工

GSAP 不替代已有工具，而是补“表现力”和“交互演示”短板：

| 已有基座 | 负责什么 | GSAP 补什么 |
| --- | --- | --- |
| `open-design` | 设计系统、页面视觉、组件风格 | 把静态设计变成有质感的动态界面 |
| `html-anything` | 从需求快速生成可见 HTML 页面 | 给生成页面加动效规范，避免廉价感 |
| `Remotion` | 生成可导出视频 | Web 端动效可复用为视频分镜和封面动效参考 |
| `video-use / HyperFrames` | 视频编辑、运动图形 | GSAP 更适合网页交互，Remotion 更适合导出视频 |
| `multica / agency-orchestrator` | 任务可视化和多 Agent 调度 | 任务流转、卡片移动、员工状态变化的动效表达 |
| `md2wechat` | 公众号排版发布 | 不直接相关，但可为文章落地页/活动页提供动态版本 |

## 放进 AI Native 产品里的方式

### 1. 老板工作台

老板打开系统时，今日经营台不应该是死板表格。GSAP 可以用于：

- 今日任务卡片依次入场
- AI 员工从“待命 -> 工作中 -> 待验收 -> 已完成”的状态动效
- 商机雷达分数变化
- 任务拆解 timeline
- 预算消耗、发布进度、转化漏斗动画

要求：动效服务于理解，不做花哨装饰。

### 2. 技术基座展示页

Longka 对外讲“AI 原生经营系统”时，需要一个能打动老板和投资人的动态展示页：

- 滚动讲述：市场信号 -> 证据卡 -> 人工判断 -> AI 员工执行 -> 交付物 -> 反馈
- 技术基座模块滚动 pin 展示
- 每个 AI 员工被雇佣时，任务线和产物区动态连接

这里应优先用 `gsap-scrolltrigger` 和 `gsap-timeline`。

### 3. 小程序/网站营销落地页

色彩项目、私域内容雷达、U 盘 AI 员工系统都需要落地页：

- 首屏强钩子动画
- 样片/案例卡片切换
- 价格/套餐/员工能力对比
- FAQ 展开收起

这里用 `gsap-core` + `gsap-utils` 就够，避免复杂插件增加维护成本。

### 4. 小妹视频工作台

GSAP 不直接替代 Remotion，但能帮助做：

- 工作台步骤引导动效
- 素材卡片拖拽排序
- 模板选择时的视觉反馈
- 封面预览动效

最终视频仍由 Remotion / FFmpeg 生产。

## 接入优先级

1. 安装技能包到 Codex skills：

```powershell
npx skills add https://github.com/greensock/gsap-skills
```

2. 原型页先接入 `gsap-core` 和 `gsap-timeline`。
3. 技术基座展示页接入 `gsap-scrolltrigger`。
4. React 项目接入 `gsap-react`，必须处理 scope 和 cleanup。
5. 有拖拽任务板需求时再评估 `Draggable` / `Flip`。

## 使用边界

- 不要为了“炫”而给管理后台加过度动效。
- SaaS/老板工作台保持安静、清楚、可扫读。
- 动效必须能解释业务状态：任务推进、员工流转、证据链、产物生成。
- 优先 transform / opacity，不优先 top/left/width 这类容易触发布局重排的属性。
- React 里必须使用 scoped selector 和 cleanup，避免页面切换后残留动画。

## Longka 技术基座结论

GSAP Skills 应作为 Longka AI Native 的“动态表现技能包”纳入技术基座。

它解决的问题不是业务执行，而是让复杂 AI Native 系统变得可理解、可演示、可成交：

```text
open-design 负责好看
html-anything 负责快速生成页面
GSAP 负责让页面有动态表达和高级感
Remotion 负责把内容导出成视频
任务调度系统负责让这些产物进入业务闭环
```
