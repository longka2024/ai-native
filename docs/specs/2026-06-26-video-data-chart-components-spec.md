# Spec:视频数据图表组件库(EffectEngine 原生)· 2026-06-26

**① 名字**:video-data-chart-components

**② 触发词**:数据图表 / 动态图表 / 图表组件 / chart / 选图器

**③ 范围(这次做什么)**
1. 在 `video-remotion/src/engine/charts.tsx` **自实现一组原生 Remotion 动态图表组件**,起步 4 种:
   - **KPI**(大数字从 0 滚到目标)· **对比柱 bars**(柱子 spring 长出 + 数字滚动,**数据悬殊自动 log 缩放**)· **落差 drop**(前→后,真实数值两端 + 落差线,主角端大号金色)· **占比 ratio**(八成型,环/进度 + 大百分数)
2. 借鉴:实现范式取自 hyperframes `frame-data-rollup/DataRollup.tsx`(活柱+滚数+自动log+响应式);类型/样式点子取自 data2motion(11 类);设计守 `data-in-motion.md`(无网格线/无图例/无饼图;每个数字配视觉重量;3 秒能懂)。
3. 统一视觉:得意黑(Deyi)+ 风格档 theme 配色 + 半透明玻璃卡叠实景 + 上半屏图/下三分之一字幕分区 + 动效绑该 beat 配音时段(声画同步)。**数值标签必须贴字幕真实数字。**
4. `beatZ` 加 `chart:{type,title?,takeaway?,...}`,按 type 渲对应组件 —— **替换并删除旧的 chartSeq 透明帧 hack**。
5. **"数据形态→图表类型"选型器**(脚本侧):单数字→kpi;悬殊落差→drop;量级可比→bars;比例→ratio。后续视频按话术自动配、可随机多样。
6. 用 mizan 片验证:十万→kpi、八成一件起订→drop(上百件→1件)、到货→bars(拼海运35/米站12)。

**④ 禁止范围(这次不做)**
- 不把 data2motion / hyperframes 的代码搬进仓库(只借设计与范式,自实现);删现有 chartSeq + `public/charts/` 生成帧。
- 不碰口播线 A(ffmpeg)/不动其它 composition/不动既定字幕·转场·景深标准。
- 不做客户自助 UI(工作台按钮另立 spec);不烧钱/不调付费 API(纯本机渲)。
- 起步只做 4 种,不一次堆满 data2motion 全部类型。

**⑤ 验收标准**
- mizan 片重渲,三处用**原生组件**(非帧 hack):图大、清、贴字幕、对比生动、三种不同类型;
- 出片后抽帧自检 + 过 GLM-5V 判图(带分)再交用户;
- 任意改某 beat 的 `chart.type` 或数值,**不用手抠 SVG** 即可重渲出对应图;
- EffectEngine 既有(字幕/转场/声画同步/BigNum)不回归。

**状态**:2026-06-26 用户确认,开发中。
