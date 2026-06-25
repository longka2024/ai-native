import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { fade } from "@remotion/transitions/fade";


const FONT = "Deyi";
const SCENE = 75;
const TR = 18;
const start = (i: number) => i * (SCENE - TR); // scene start frame

const Clip: React.FC<{ src: string }> = ({ src }) => (
  <AbsoluteFill>
    <OffthreadVideo src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)" }} />
  </AbsoluteFill>
);

const Title: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const x = interpolate(spring({ frame, fps: 30, config: { damping: 200 } }), [0, 1], [-120, 0]);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ transform: `translateX(${x}px)`, fontFamily: FONT, fontWeight: 900, fontSize: 110, color: "#fff", WebkitTextStroke: "9px rgba(0,0,0,0.62)", paintOrder: "stroke fill" as any, textShadow: "0 8px 24px rgba(0,0,0,.5)" }}>{text}</div>
    </AbsoluteFill>
  );
};

const CountNum: React.FC<{ to: number; unit: string; label: string }> = ({ to, unit, label }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 200, mass: 0.9 } });
  const val = unit === "万" ? (p * to).toFixed(1) : String(Math.round(p * to));
  const sc = interpolate(p, [0, 1], [0.55, 1]);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ transform: `scale(${sc})`, textAlign: "center", fontFamily: FONT }}>
        <div>
          <span style={{ fontWeight: 900, fontSize: 240, color: "#19e3c8", WebkitTextStroke: "10px rgba(0,0,0,0.65)", paintOrder: "stroke fill" as any, textShadow: "0 0 40px rgba(25,227,200,.5)" }}>{val}</span>
          <span style={{ fontWeight: 900, fontSize: 100, color: "#fff", WebkitTextStroke: "8px rgba(0,0,0,0.6)", paintOrder: "stroke fill" as any }}>{unit}</span>
        </div>
        <div style={{ fontWeight: 900, fontSize: 76, color: "#fff", WebkitTextStroke: "7px rgba(0,0,0,0.6)", paintOrder: "stroke fill" as any }}>{label}</div>
      </div>
    </AbsoluteFill>
  );
};

export const FxDemo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", fontFamily: FONT }}>
      <style>{`@font-face{font-family:'${FONT}';src:url('${staticFile("zh.ttc")}') format('truetype');font-weight:400 900;font-display:block;}`}</style>

      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SCENE}><Clip src="c1.mp4" /></TransitionSeries.Sequence>
        <TransitionSeries.Transition timing={springTiming({ config: { damping: 200 } })} presentation={slide({ direction: "from-right" })} />
        <TransitionSeries.Sequence durationInFrames={SCENE}><Clip src="c2.mp4" /></TransitionSeries.Sequence>
        <TransitionSeries.Transition timing={linearTiming({ durationInFrames: TR })} presentation={wipe({ direction: "from-bottom-right" })} />
        <TransitionSeries.Sequence durationInFrames={SCENE}><Clip src="c3.mp4" /></TransitionSeries.Sequence>
        <TransitionSeries.Transition timing={linearTiming({ durationInFrames: TR })} presentation={fade()} />
        <TransitionSeries.Sequence durationInFrames={SCENE}><Clip src="c4.mp4" /></TransitionSeries.Sequence>
      </TransitionSeries>

      <Sequence from={start(0)} durationInFrames={SCENE}><Title text="源头大仓 · 实力供货" /></Sequence>
      <Sequence from={start(1)} durationInFrames={SCENE}><CountNum to={10} unit="万" label="SKU 全覆盖" /></Sequence>
      <Sequence from={start(2)} durationInFrames={SCENE}><CountNum to={26} unit="" label="大类 一站选齐" /></Sequence>
      <Sequence from={start(3)} durationInFrames={SCENE}><Title text="找货源 · 认准 mizan" /></Sequence>

      <div style={{ position: "absolute", top: 70, left: 56, background: "rgba(15,155,142,0.92)", padding: "12px 24px", borderRadius: 999, color: "#fff", fontSize: 36, fontWeight: 700 }}>源头供应链 · mizan</div>
      <div style={{ position: "absolute", top: 80, right: 56, color: "rgba(255,255,255,0.85)", fontSize: 30 }}>longka 制作</div>
    </AbsoluteFill>
  );
};
