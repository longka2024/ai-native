import React from "react";
import {
  AbsoluteFill, OffthreadVideo, Audio, staticFile,
  useCurrentFrame, useVideoConfig, interpolate, spring, Sequence,
} from "remotion";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { wipe } from "@remotion/transitions/wipe";
import { crossZoom } from "@remotion/transitions/cross-zoom";
import { dreamyZoom } from "@remotion/transitions/dreamy-zoom";
import { zoomBlur } from "@remotion/transitions/zoom-blur";
import { linearBlur } from "@remotion/transitions/linear-blur";

const FONT = "Deyi";
const THEME = "#19e3c8";
const CLIPF = 80;          // 每镜帧数(2.67s)
const TR = 18;             // 转场帧数
const start = (i: number) => i * (CLIPF - TR); // 第 i 镜在总时间线的起点

// ───────── 单镜:Ken Burns 镜头推进(景深/纵深)─────────
const KenBurns: React.FC<{ src: string; zoomIn?: boolean; drift?: number }> = ({ src, zoomIn = true, drift = 0 }) => {
  const frame = useCurrentFrame(); // 相对本镜
  const s0 = zoomIn ? 1.04 : 1.18;
  const s1 = zoomIn ? 1.18 : 1.04;
  const sc = interpolate(frame, [0, CLIPF], [s0, s1], { extrapolateRight: "clamp" });
  const ty = interpolate(frame, [0, CLIPF], [drift, -drift], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${sc}) translateY(${ty}px)` }}>
        <OffthreadVideo src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.65) 100%)" }} />
    </AbsoluteFill>
  );
};

// 转场轮换:对角擦除(你喜欢的,变方向)+ 电影感缩放/模糊
const TRS = [
  { timing: linearTiming({ durationInFrames: TR }), presentation: wipe({ direction: "from-bottom-right" }) }, // 对角擦除
  { timing: springTiming({ config: { damping: 200 } }), presentation: crossZoom({}) },                          // 推镜虚化穿越
  { timing: linearTiming({ durationInFrames: TR }), presentation: wipe({ direction: "from-top-right" }) },     // 对角擦除(反向)
  { timing: springTiming({ config: { damping: 200 } }), presentation: dreamyZoom({}) },                         // 梦幻推进
  { timing: linearTiming({ durationInFrames: TR + 4 }), presentation: zoomBlur({}) },                           // 缩放模糊
  { timing: linearTiming({ durationInFrames: TR }), presentation: wipe({ direction: "from-left" }) },          // 横向擦除
  { timing: linearTiming({ durationInFrames: TR + 4 }), presentation: linearBlur({}) },                         // 方向运动模糊
];

// ───────── 大数字(单张,景深翻入 + 数值滚动)─────────
const BigNum: React.FC<{ to: number; unit: string; label: string; decimals?: number }> = ({ to, unit, label, decimals = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 200, mass: 0.9 } });
  const out = spring({ frame: frame - 50, fps, config: { damping: 200 } }); // 末端淡出避免叠下一段
  const val = (p * to).toFixed(decimals);
  const sc = interpolate(p, [0, 1], [0.5, 1]);
  const rotX = interpolate(p, [0, 1], [80, 0]);
  const op = interpolate(out, [0, 1], [1, 0]);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", perspective: 1400, opacity: op }}>
      <div style={{ transform: `scale(${sc}) rotateX(${rotX}deg)`, textAlign: "center", fontFamily: FONT }}>
        <div>
          <span style={{ fontWeight: 900, fontSize: 250, color: THEME, WebkitTextStroke: "11px rgba(0,0,0,0.7)", paintOrder: "stroke fill" as any, textShadow: `0 0 48px ${THEME}88` }}>{val}</span>
          {unit ? <span style={{ fontWeight: 900, fontSize: 104, color: "#fff", WebkitTextStroke: "8px rgba(0,0,0,0.65)", paintOrder: "stroke fill" as any }}>{unit}</span> : null}
        </div>
        <div style={{ fontWeight: 900, fontSize: 78, color: "#fff", WebkitTextStroke: "7px rgba(0,0,0,0.6)", paintOrder: "stroke fill" as any, marginTop: 8 }}>{label}</div>
      </div>
    </AbsoluteFill>
  );
};

// ───────── 标题卡(滑入)─────────
const TitleCard: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const x = interpolate(spring({ frame, fps, config: { damping: 200 } }), [0, 1], [-140, 0]);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ transform: `translateX(${x}px)`, fontFamily: FONT, fontWeight: 900, fontSize: 118, color: "#fff", WebkitTextStroke: "10px rgba(0,0,0,0.65)", paintOrder: "stroke fill" as any, textShadow: "0 8px 24px rgba(0,0,0,.5)", textAlign: "center", lineHeight: 1.1, whiteSpace: "pre-line" }}>{text}</div>
    </AbsoluteFill>
  );
};

export const Showcase: React.FC = () => {
  const clips = ["s1.mp4", "s2.mp4", "s3.mp4", "s4.mp4", "s5.mp4", "s6.mp4", "s7.mp4", "s8.mp4"];
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", fontFamily: FONT }}>
      <style>{`@font-face{font-family:'${FONT}';src:url('${staticFile("zh.ttc")}') format('truetype');font-weight:400 900;font-display:block;}`}</style>

      <TransitionSeries>
        {clips.flatMap((src, i) => {
          const seq = (
            <TransitionSeries.Sequence key={`s${i}`} durationInFrames={CLIPF}>
              <KenBurns src={src} zoomIn={i % 2 === 0} drift={i % 3 === 0 ? 30 : 0} />
            </TransitionSeries.Sequence>
          );
          if (i === 0) return [seq];
          const tr = TRS[(i - 1) % TRS.length];
          return [<TransitionSeries.Transition key={`t${i}`} timing={tr.timing} presentation={tr.presentation} />, seq];
        })}
      </TransitionSeries>

      <div style={{ position: "absolute", top: 70, left: 56, background: "rgba(15,155,142,0.92)", padding: "12px 24px", borderRadius: 999, color: "#fff", fontSize: 36, fontWeight: 700 }}>源头供应链 · mizan</div>
      <div style={{ position: "absolute", top: 80, right: 56, color: "rgba(255,255,255,0.85)", fontSize: 30, textShadow: "0 2px 10px rgba(0,0,0,.7)" }}>longka 制作</div>

      {/* 文字层:互不重叠(修叠卡 bug)*/}
      <Sequence from={0} durationInFrames={58}><TitleCard text={"源头大仓\n一站选齐"} /></Sequence>
      <Sequence from={start(2)} durationInFrames={70}><BigNum to={10} unit="万" label="SKU 工厂价" /></Sequence>
      <Sequence from={start(5)} durationInFrames={70}><BigNum to={26} unit="" label="大类全覆盖" /></Sequence>
      <Sequence from={start(7) - 6} durationInFrames={86}><TitleCard text={"找货源\n认准 mizan"} /></Sequence>

      <Audio src={staticFile("bgm.mp3")} volume={0.45} />
    </AbsoluteFill>
  );
};
