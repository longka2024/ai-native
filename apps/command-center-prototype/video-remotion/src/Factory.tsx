import React from "react";
import {
  AbsoluteFill, OffthreadVideo, Audio, staticFile,
  useCurrentFrame, useVideoConfig, interpolate, spring, Sequence,
} from "remotion";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { fade } from "@remotion/transitions/fade";
import { clockWipe } from "@remotion/transitions/clock-wipe";
import { Trail } from "@remotion/motion-blur";
import { z } from "zod";

const FONT = "Deyi";

// ───────── 数据契约(数据驱动批量:换一组 props = 换一条片)─────────
export const clipSchema = z.object({
  fromSec: z.number(),   // 取 video.mp4 的起点(秒)
  durSec: z.number(),    // 这一镜时长(秒)
});
export const segSchema = z.tuple([z.number(), z.number(), z.string(), z.boolean()]); // [起,止,文字,是否数字强调]
export const numCardSchema = z.object({
  at: z.number(),        // 出现时刻(秒)
  dur: z.number(),       // 持续(秒)
  to: z.number(),        // 滚到的目标数
  unit: z.string(),      // 单位(万/个/...,空串=纯数)
  label: z.string(),     // 下方说明
  decimals: z.number().default(0),
});
export const factorySchema = z.object({
  durationSec: z.number(),
  theme: z.string(),
  brand: z.string(),
  video: z.string().default("video.mp4"),
  voice: z.string().default("voice.mp3"),
  bgm: z.string().default("bgm.mp3"),
  watermark: z.string().default("longka 制作"),
  clips: z.array(clipSchema),
  segs: z.array(segSchema),
  numCards: z.array(numCardSchema),
});
export type FactoryProps = z.infer<typeof factorySchema>;

const TR = 16; // 转场帧数

// 转场轮换:让相邻镜的切换花样不重复
const transitions = [
  () => ({ timing: springTiming({ config: { damping: 200 } }), presentation: slide({ direction: "from-right" as const }) }),
  () => ({ timing: linearTiming({ durationInFrames: TR }), presentation: wipe({ direction: "from-bottom-right" as const }) }),
  () => ({ timing: linearTiming({ durationInFrames: TR }), presentation: clockWipe({ width: 1080, height: 1920 }) }),
  () => ({ timing: linearTiming({ durationInFrames: TR }), presentation: fade() }),
  () => ({ timing: springTiming({ config: { damping: 200 } }), presentation: slide({ direction: "from-left" as const }) }),
];

// ───────── 背景 b-roll:多镜 + 转场(画面对应靠数据里 fromSec 切片)─────────
const Broll: React.FC<{ video: string; clips: FactoryProps["clips"] }> = ({ video, clips }) => {
  const { fps } = useVideoConfig();
  return (
    <TransitionSeries>
      {clips.flatMap((c, i) => {
        const seq = (
          <TransitionSeries.Sequence key={`s${i}`} durationInFrames={Math.round(c.durSec * fps) + (i > 0 ? TR : 0)}>
            <AbsoluteFill>
              <OffthreadVideo
                src={staticFile(video)}
                trimBefore={Math.round(c.fromSec * fps)}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                muted
              />
              <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 42%, rgba(0,0,0,0.72) 100%)" }} />
            </AbsoluteFill>
          </TransitionSeries.Sequence>
        );
        if (i === 0) return [seq];
        const t = transitions[(i - 1) % transitions.length]();
        return [
          <TransitionSeries.Transition key={`t${i}`} timing={t.timing} presentation={t.presentation} />,
          seq,
        ];
      })}
    </TransitionSeries>
  );
};

// ───────── 颗粒噪点(质感)─────────
const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{
      opacity: 0.07, backgroundSize: "300px", pointerEvents: "none",
      backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`,
      transform: `translate(${(frame % 3) * 7}px, ${(frame % 2) * 7}px)`,
    }} />
  );
};

// ───────── 逐字粗体字幕(卡拉OK高亮)─────────
const Caption: React.FC<{ seg: FactoryProps["segs"][number]; theme: string }> = ({ seg, theme }) => {
  const [s, e, text, isNum] = seg;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const chars = Array.from(text);
  return (
    <div style={{ position: "absolute", left: 40, right: 40, bottom: 790, textAlign: "center" }}>
      <span style={{ fontWeight: 900, fontSize: isNum ? 104 : 88, lineHeight: 1.15, WebkitTextStroke: "8px rgba(0,0,0,0.62)", paintOrder: "stroke fill" as any, textShadow: "0 6px 18px rgba(0,0,0,.5)" }}>
        {chars.map((ch, ci) => {
          const ct = s + ((e - s) * ci) / chars.length;
          const active = t >= ct;
          const sc = interpolate(t, [ct, ct + 0.12], [0.55, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <span key={ci} style={{ display: "inline-block", color: active ? (isNum ? theme : "#fff") : "rgba(255,255,255,0.25)", transform: `scale(${active ? 1 : sc})` }}>
              {ch === " " ? " " : ch}
            </span>
          );
        })}
      </span>
      <div style={{ height: 12, width: "70%", margin: "12px auto 0", borderRadius: 8, background: `linear-gradient(90deg,#0f9b8e,${theme})`, boxShadow: `0 0 18px ${theme}99`, transform: `scaleX(${interpolate(t, [s, s + 0.25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})` }} />
    </div>
  );
};

// ───────── 大数字:3D翻滚入场 + 数值滚动 + 运动模糊拖影 ─────────
const NumberCard: React.FC<{ card: FactoryProps["numCards"][number]; theme: string }> = ({ card, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 200, mass: 0.9 } });
  const val = (p * card.to).toFixed(card.decimals);
  const rotX = interpolate(p, [0, 1], [88, 0]);       // 3D 翻滚:从立着翻平
  const sc = interpolate(p, [0, 1], [0.55, 1]);
  const moving = p < 0.92;                              // 滚动中才挂拖影(省渲染)
  const numEl = (
    <span style={{ fontWeight: 900, fontSize: 240, color: theme, WebkitTextStroke: "10px rgba(0,0,0,0.65)", paintOrder: "stroke fill" as any, textShadow: `0 0 44px ${theme}88` }}>{val}</span>
  );
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", perspective: 1400 }}>
      <div style={{ transform: `scale(${sc}) rotateX(${rotX}deg)`, transformStyle: "preserve-3d", textAlign: "center", fontFamily: FONT }}>
        <div>
          {moving ? <Trail layers={5} lagInFrames={2} trailOpacity={0.45}>{numEl}</Trail> : numEl}
          {card.unit ? <span style={{ fontWeight: 900, fontSize: 100, color: "#fff", WebkitTextStroke: "8px rgba(0,0,0,0.6)", paintOrder: "stroke fill" as any }}>{card.unit}</span> : null}
        </div>
        <div style={{ fontWeight: 900, fontSize: 76, color: "#fff", WebkitTextStroke: "7px rgba(0,0,0,0.6)", paintOrder: "stroke fill" as any }}>{card.label}</div>
      </div>
    </AbsoluteFill>
  );
};

// ───────── 主模板 ─────────
export const Factory: React.FC<FactoryProps> = ({ theme, brand, video, voice, bgm, watermark, clips, segs, numCards }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width } = useVideoConfig();
  const t = frame / fps;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", fontFamily: FONT }}>
      <style>{`@font-face{font-family:'${FONT}';src:url('${staticFile("zh.ttc")}') format('truetype');font-weight:400 900;font-display:block;}`}</style>

      <Broll video={video} clips={clips} />
      <Grain />

      <div style={{ position: "absolute", top: 70, left: 56, background: "rgba(15,155,142,0.92)", padding: "12px 24px", borderRadius: 999, color: "#fff", fontSize: 36, fontWeight: 700, boxShadow: "0 6px 22px rgba(15,155,142,.4)" }}>{brand}</div>
      <div style={{ position: "absolute", top: 80, right: 56, color: "rgba(255,255,255,0.85)", fontSize: 30, textShadow: "0 2px 10px rgba(0,0,0,.7)" }}>{watermark}</div>

      {/* 大数字卡(数字钩子)*/}
      {numCards.map((c, i) => (
        <Sequence key={`n${i}`} from={Math.round(c.at * fps)} durationInFrames={Math.round(c.dur * fps)}>
          <NumberCard card={c} theme={theme} />
        </Sequence>
      ))}

      {/* 逐字字幕(配音原话)*/}
      {segs.map((seg, i) => (t >= seg[0] && t < seg[1] ? <Caption key={`c${i}`} seg={seg} theme={theme} /> : null))}

      <div style={{ position: "absolute", left: 0, bottom: 0, height: 10, background: theme, width: (frame / durationInFrames) * width }} />
      <Audio src={staticFile(voice)} volume={1} />
      <Audio src={staticFile(bgm)} volume={0.22} />
    </AbsoluteFill>
  );
};
