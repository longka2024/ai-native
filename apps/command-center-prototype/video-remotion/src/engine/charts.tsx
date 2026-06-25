// charts.tsx — EffectEngine 原生动态图表组件
// 借鉴 hyperframes frame-data-rollup(活柱+滚数+自动log+响应式)+ data2motion 类型 + data-in-motion 规则(无网格/无图例/数字配视觉重量)。
// 全部数据驱动:数字从 0 滚到真值、柱子 spring 长出;得意黑(Deyi)+ 风格档 theme + 玻璃卡叠实景。
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

const FONT = "Deyi";
const MUTED = "#aeb6c4";
const INK = "#F5F6F8";
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

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
};

// 玻璃卡外壳:叠实景上、上半屏、与底部字幕分区,弹入
const Card: React.FC<{ title?: string; takeaway?: string; children: React.ReactNode; top?: number }> = ({ title, takeaway, children, top = 260 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inP = spring({ frame, fps, config: { damping: 200 } });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: top }}>
      <div style={{
        width: 960, boxSizing: "border-box", padding: "44px 58px 52px",
        background: "rgba(12,15,22,0.74)", border: "1px solid rgba(255,255,255,0.14)",
        borderRadius: 40, boxShadow: "0 30px 90px rgba(0,0,0,0.55)", fontFamily: FONT,
        opacity: inP, transform: `translateY(${interpolate(inP, [0, 1], [28, 0])}px)`,
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
  const p = spring({ frame, fps, config: { damping: 60, mass: 1.1, stiffness: 70 } });
  const shown = (c.value ?? 0) * p;
  return (
    <Card title={c.title} takeaway={c.takeaway} top={320}>
      <div style={{ textAlign: "center", padding: "16px 0 8px" }}>
        <span style={{ display: "inline-flex", alignItems: "baseline", justifyContent: "center" }}>
          <span style={{ fontSize: 230, fontWeight: 900, color: theme, lineHeight: 1, textShadow: `0 10px 34px ${theme}44` }}>{fmt(shown)}</span>
          {c.unit ? <span style={{ fontSize: 96, fontWeight: 900, color: "#fff", marginLeft: 10 }}>{c.unit}</span> : null}
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
    <Card title={c.title} takeaway={c.takeaway} top={250}>
      <div style={{ display: "flex", flexDirection: "column", gap: 38, marginTop: 8 }}>
        {items.map((it, i) => {
          const delay = i * Math.round(fps * 0.12);
          const g = spring({ frame: frame - delay, fps, config: { damping: 16, mass: 0.8, stiffness: 90 } });
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
  const p = spring({ frame, fps, config: { damping: 22, mass: 0.9, stiffness: 80 } });
  const W = 840, H = 330;
  const x1 = 70, y1 = 64, x2 = W - 70, y2 = H - 96;
  const cx = interpolate(p, [0, 1], [x1, x2]);
  const cy = interpolate(p, [0, 1], [y1, y2]);
  const endOp = interpolate(p, [0.55, 1], [0, 1], { extrapolateLeft: "clamp" });
  return (
    <Card title={c.title} takeaway={c.takeaway} top={290}>
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
  const p = spring({ frame, fps, config: { damping: 30, mass: 1, stiffness: 80 } });
  const val = (c.value ?? 0);
  const shown = val * p;
  const R = 130, C = 2 * Math.PI * R;
  return (
    <Card title={c.title} takeaway={c.takeaway} top={300}>
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
