// charts.tsx — EffectEngine 原生动态图表组件
// 借鉴 hyperframes frame-data-rollup(活柱+滚数+自动log+响应式)+ data2motion 类型 + data-in-motion 规则(无网格/无图例/数字配视觉重量)。
// 全部数据驱动:数字从 0 滚到真值、柱子 spring 长出;得意黑(Deyi)+ 风格档 theme + 玻璃卡叠实景。
import React from "react";
import { AbsoluteFill, interpolate, spring, Easing, useCurrentFrame, useVideoConfig } from "remotion";

const FONT = "Deyi";
const MUTED = "#c4ccd8";   // 比原 #aeb6c4 更亮:玻璃卡上对比拉够(design-brain:别把要读的字做太淡)
const INK = "#F5F6F8";
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
// 揭示缓动:ease-out-expo(干净、无弹跳/过冲;design-brain 铁律),到 1 即停 → 数字滚完完全静止
const reveal = (frame: number, fps: number, dur = 0.85, delay = 0) =>
  interpolate(frame, [delay * fps, (delay + dur) * fps], [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.exp) });

export type ChartSpec = {
  type: "kpi" | "bars" | "drop" | "ratio";
  title?: string;
  takeaway?: string;
  value?: number;
  unit?: string;
  label?: string;
  items?: { label: string; value: number; unit?: string; role?: string }[];
  startText?: string;
  startLabel?: string;
  endText?: string;
  endLabel?: string;
  anim?: "rise" | "flip" | "float";   // 入场动效(不填则按图表序号轮换)
};

// 玻璃卡外壳:叠实景上、上半屏、与底部字幕分区。多样入场(翻书/浮空/上升)+ 轻浮在空中
const Card: React.FC<{ title?: string; takeaway?: string; children: React.ReactNode; top?: number; anim?: string }> = ({ title, takeaway, children, top = 260, anim = "rise" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inP = reveal(frame, fps, 0.7, 0);   // ease-out-expo 入场,无弹跳
  const t = frame / fps;
  // design-brain 铁律:文字被阅读时必须完全静止(1px 漂移都算违规)。
  // bob 仅在入场尾段存在,入场完成(inP→1)即 settle→0 锁死静止,不再全程漂移。
  const settle = 1 - inP;
  const bobY = Math.sin(t * 1.05) * 5 * settle;
  const bobR = Math.sin(t * 0.85) * 0.5 * settle;
  let transform: string, origin = "center center";
  if (anim === "flip") {        // 翻书:绕左侧竖轴翻入
    transform = `perspective(1500px) rotateY(${interpolate(inP, [0, 1], [-80, 0])}deg) translateY(${bobY}px)`;
    origin = "left center";
  } else if (anim === "float") { // 浮空:缩放上浮 + 极轻俯仰
    transform = `perspective(1500px) rotateX(${bobR}deg) scale(${interpolate(inP, [0, 1], [0.84, 1])}) translateY(${interpolate(inP, [0, 1], [46, 0]) + bobY}px)`;
  } else {                       // 上升:滑入
    transform = `translateY(${interpolate(inP, [0, 1], [30, 0]) + bobY}px)`;
  }
  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: top, perspective: 1500 }}>
      <div style={{
        width: 960, boxSizing: "border-box", padding: "44px 58px 52px",
        // 液态玻璃:毛玻璃模糊背后画面(文字更清、更高级)+ 顶部高光边
        background: "linear-gradient(160deg, rgba(28,32,42,0.6), rgba(10,13,20,0.66))",
        backdropFilter: "blur(22px) saturate(1.25)", WebkitBackdropFilter: "blur(22px) saturate(1.25)",
        border: "1px solid rgba(255,255,255,0.18)", borderTop: "1.5px solid rgba(255,255,255,0.32)",
        borderRadius: 40, boxShadow: "0 36px 100px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.12)", fontFamily: FONT,
        opacity: inP, transform, transformOrigin: origin, willChange: "transform",
      }}>
        {title ? <div style={{ fontSize: 44, fontWeight: 900, color: INK, letterSpacing: "-0.01em" }}>{title}</div> : null}
        {takeaway ? <div style={{ fontSize: 30, color: MUTED, marginTop: 12, lineHeight: 1.45 }}>{takeaway}</div> : null}
        <div style={{ marginTop: 30 }}>{children}</div>
      </div>
    </AbsoluteFill>
  );
};

// KPI:大数字从 0 滚到目标
const KPI: React.FC<{ c: ChartSpec; theme: string }> = ({ c, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = reveal(frame, fps, 0.95, 0.15);   // 错峰:卡先入,数字稍后滚;滚完即停(静止可读)
  // 中文大数走「万」(10万+),不显 99,902 这种西式数字;有单位(%/个/次)则按原值
  const raw = c.value ?? 0;
  const big = raw >= 10000 && !c.unit;
  const target = big ? raw / 10000 : raw;
  const shown = target * p;
  const numStr = big ? String(Math.round(shown)) : fmt(shown);
  const suffix = big ? "万+" : (c.unit ?? "");
  return (
    <Card title={c.title} takeaway={c.takeaway} top={320} anim={c.anim ?? "float"}>
      <div style={{ textAlign: "center", padding: "16px 0 8px", position: "relative" }}>
        {/* design-brain:删掉无阈值弥散辉光(廉价 glow=贴纸感);大数字只留干净深度投影,有重量但不发光 */}
        <span style={{ display: "inline-flex", alignItems: "baseline", justifyContent: "center", position: "relative" }}>
          <span style={{ fontSize: 230, fontWeight: 900, color: theme, lineHeight: 1, textShadow: `0 4px 18px rgba(0,0,0,0.5)` }}>{numStr}</span>
          {suffix ? <span style={{ fontSize: 96, fontWeight: 900, color: "#fff", marginLeft: 10 }}>{suffix}</span> : null}
        </span>
        {c.label ? <div style={{ fontSize: 36, color: MUTED, marginTop: 18 }}>{c.label}</div> : null}
      </div>
    </Card>
  );
};

// 对比柱:横向条,柱子 spring 长出 + 数字滚动,数据悬殊自动 log 缩放
const Bars: React.FC<{ c: ChartSpec; theme: string }> = ({ c, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = c.items ?? [];
  const values = items.map((it) => (Number.isFinite(it.value) ? it.value : 0));
  const maxV = Math.max(1, ...values);
  const pos = values.filter((v) => v > 0);
  const minP = pos.length ? Math.min(...pos) : maxV;
  const useLog = minP > 0 && maxV / minP >= 50;
  const frac = (v: number) => {
    if (v <= 0) return 0;
    if (!useLog) return v / maxV;
    const lo = Math.log(minP), hi = Math.log(maxV);
    return 0.18 + ((Math.log(v) - lo) / ((hi - lo) || 1)) * 0.82;
  };
  return (
    <Card title={c.title} takeaway={c.takeaway} top={250} anim={c.anim ?? "rise"}>
      <div style={{ display: "flex", flexDirection: "column", gap: 38, marginTop: 8 }}>
        {items.map((it, i) => {
          const g = reveal(frame, fps, 0.7, 0.15 + i * 0.12);   // 逐条错峰长出,ease-out-expo 无弹跳
          const w = frac(Number(it.value) || 0) * 100 * g;
          const rolled = (Number(it.value) || 0) * g;
          const good = it.role === "good";
          const col = good ? theme : "#8b93a3";
          return (
            <div key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                <span style={{ fontSize: 32, fontWeight: 700, color: good ? "#fff" : MUTED }}>{it.label}</span>
                <span style={{ fontSize: 38, fontWeight: 900, color: col }}>{fmt(rolled)}{c.unit ?? it.unit ?? ""}</span>
              </div>
              <div style={{ height: 36, background: "rgba(255,255,255,0.08)", borderRadius: 18, overflow: "hidden" }}>
                <div style={{ width: `${w}%`, height: "100%", background: col, borderRadius: 18, boxShadow: good ? `0 0 22px ${theme}66` : "none" }} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

// 落差:前→后,真实数值两端 + 落差线,主角端大号金
const Drop: React.FC<{ c: ChartSpec; theme: string }> = ({ c, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = reveal(frame, fps, 0.9, 0.15);
  const W = 840, H = 330;
  const x1 = 70, y1 = 64, x2 = W - 70, y2 = H - 96;
  const cx = interpolate(p, [0, 1], [x1, x2]);
  const cy = interpolate(p, [0, 1], [y1, y2]);
  const endOp = interpolate(p, [0.55, 1], [0, 1], { extrapolateLeft: "clamp" });
  return (
    <Card title={c.title} takeaway={c.takeaway} top={290} anim={c.anim ?? "flip"}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", overflow: "visible" }}>
        <line x1={x1} y1={y1} x2={cx} y2={cy} stroke={theme} strokeWidth={7} strokeLinecap="round" />
        <circle cx={x1} cy={y1} r={12} fill={MUTED} />
        <circle cx={cx} cy={cy} r={17} fill={theme} />
        <text x={x1 + 26} y={y1 - 18} fontFamily={FONT} fontSize={42} fontWeight={900} fill={MUTED} textAnchor="start">{c.startText}</text>
        <text x={x1} y={H - 8} fontFamily={FONT} fontSize={30} fontWeight={700} fill="#8b93a3" textAnchor="middle">{c.startLabel}</text>
        <text x={x2} y={y2 + 64} fontFamily={FONT} fontSize={74} fontWeight={900} fill={theme} textAnchor="end" opacity={endOp}>{c.endText}</text>
        <text x={x2} y={H - 8} fontFamily={FONT} fontSize={30} fontWeight={700} fill="#8b93a3" textAnchor="end">{c.endLabel}</text>
      </svg>
    </Card>
  );
};

// 占比:环填到 value%,中心大百分数
const Ratio: React.FC<{ c: ChartSpec; theme: string }> = ({ c, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = reveal(frame, fps, 0.95, 0.15);
  const val = (c.value ?? 0);
  const shown = val * p;
  const R = 130, C = 2 * Math.PI * R;
  return (
    <Card title={c.title} takeaway={c.takeaway} top={300} anim={c.anim ?? "flip"}>
      <div style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}>
        <svg viewBox="0 0 340 340" style={{ width: 340, height: 340, overflow: "visible" }}>
          <circle cx={170} cy={170} r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={30} />
          <circle cx={170} cy={170} r={R} fill="none" stroke={theme} strokeWidth={30} strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * (1 - shown / 100)} transform="rotate(-90 170 170)" />
          <text x={170} y={172} fontFamily={FONT} fontSize={108} fontWeight={900} fill={theme} textAnchor="middle">{Math.round(shown)}</text>
          <text x={170} y={172 + 64} fontFamily={FONT} fontSize={40} fontWeight={900} fill="#fff" textAnchor="middle">%</text>
        </svg>
      </div>
      {c.label ? <div style={{ textAlign: "center", fontSize: 36, color: MUTED, marginTop: 6 }}>{c.label}</div> : null}
    </Card>
  );
};

export const Chart: React.FC<{ c: ChartSpec; theme: string }> = ({ c, theme }) => {
  if (!c || !c.type) return null;
  if (c.type === "kpi") return <KPI c={c} theme={theme} />;
  if (c.type === "bars") return <Bars c={c} theme={theme} />;
  if (c.type === "drop") return <Drop c={c} theme={theme} />;
  if (c.type === "ratio") return <Ratio c={c} theme={theme} />;
  return null;
};
