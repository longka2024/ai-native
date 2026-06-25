import React from "react";
import {
  AbsoluteFill, OffthreadVideo, Audio, staticFile, Img,
  useCurrentFrame, useVideoConfig, interpolate, spring, Sequence,
} from "remotion";
import { TransitionSeries } from "@remotion/transitions";
import { z } from "zod";
import { Beat, STYLES, StyleId, pickTransition, pickCameraMove, showsBigNum } from "./engine/rules";

const FONT = "Deyi";

// 干净描边:8 向硬阴影(0 模糊),黑边直贴字形、无灰过渡(替代会出灰圈的 WebkitTextStroke)
const outline = (w: number, c = "#000") =>
  [`${-w}px ${-w}px 0 ${c}`, `${w}px ${-w}px 0 ${c}`, `${-w}px ${w}px 0 ${c}`, `${w}px ${w}px 0 ${c}`,
   `0 ${-w}px 0 ${c}`, `0 ${w}px 0 ${c}`, `${-w}px 0 0 ${c}`, `${w}px 0 0 ${c}`].join(", ");

// ───────── 数据契约(每条片 = 一份 script)─────────
export const beatZ = z.object({
  text: z.string(),
  startSec: z.number(),
  endSec: z.number(),
  kind: z.enum(["intro", "number", "contrast", "selling", "closing"]),
  clip: z.string(),
  feature: z.enum(["drone", "aisle", "wall", "people", "product", "loading"]),
  num: z.object({ to: z.number(), unit: z.string(), label: z.string(), decimals: z.number().default(0) }).optional(),
  hl: z.array(z.string()).optional(), // 重点词(金色高亮)
  bars: z.object({ title: z.string(), source: z.string().optional(), items: z.array(z.object({ label: z.string(), value: z.number(), unit: z.string().optional(), color: z.string() })) }).optional(), // 数据硬核:条形图对比
});
export const scriptZ = z.object({
  styleId: z.enum(["punchy", "premium", "datahard"]),
  theme: z.string(),
  brand: z.string(),
  watermark: z.string().default("longka 制作"),
  voice: z.string().optional(),
  bgm: z.string().default("bgm.mp3"),
  title: z.string().optional(),        // 开场点睛大标题(\n 分行)
  titleHl: z.array(z.string()).optional(),
  cap: z.enum(["highlight", "solidbar", "glow"]).default("highlight"), // 字幕样式
  host: z.object({ image: z.string(), label: z.string().optional() }).optional(), // 口播画中画窗(形象图,如小妹);纯混剪档不传
  beats: z.array(beatZ),
});
export type Script = z.infer<typeof scriptZ>;

const fr = (sec: number, fps: number) => Math.round(sec * fps);

// 单镜:按 pickCameraMove 的结果做 Ken Burns 景深
const Cam: React.FC<{ src: string; mv: ReturnType<typeof pickCameraMove>; frames: number }> = ({ src, mv, frames }) => {
  const frame = useCurrentFrame();
  const sc = interpolate(frame, [0, frames], mv.scale, { extrapolateRight: "clamp" });
  const ty = interpolate(frame, [0, frames], [mv.driftY, -mv.driftY], { extrapolateRight: "clamp" });
  const tx = interpolate(frame, [0, frames], [mv.driftX, -mv.driftX], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${sc}) translate(${tx}px,${ty}px)` }}>
        <OffthreadVideo src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.66) 100%)" }} />
    </AbsoluteFill>
  );
};

// 大数字:景深翻入 + 滚动 + 末端淡出
const BigNum: React.FC<{ num: NonNullable<Beat["num"]>; theme: string; size: number }> = ({ num, theme, size }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 200, mass: 0.9 } });
  const out = spring({ frame: frame - 48, fps, config: { damping: 200 } });
  const val = (p * num.to).toFixed(num.decimals ?? 0);
  // 大数字固定在上半屏(paddingTop),与下半屏字幕分区,绝不重叠
  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", perspective: 1400, opacity: interpolate(out, [0, 1], [1, 0]), paddingTop: 360 }}>
      <div style={{ transform: `scale(${interpolate(p, [0, 1], [0.6, 1])}) rotateX(${interpolate(p, [0, 1], [70, 0])}deg)`, textAlign: "center", fontFamily: FONT }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4 }}>
          <span style={{ fontWeight: 900, fontSize: size, color: theme, textShadow: `${outline(1)}, 0 10px 26px rgba(0,0,0,.55), 0 0 30px ${theme}55` }}>{val}</span>
          {num.unit ? <span style={{ fontWeight: 900, fontSize: size * 0.42, color: "#fff", textShadow: `${outline(1)}, 0 8px 20px rgba(0,0,0,.5)` }}>{num.unit}</span> : null}
        </div>
        <div style={{ display: "inline-block", marginTop: 14, background: theme, color: "#2A1E12", fontWeight: 900, fontSize: size * 0.26, borderRadius: 14, padding: "6px 22px", boxShadow: `0 6px 22px ${theme}55` }}>{num.label}</div>
      </div>
    </AbsoluteFill>
  );
};

// 数据硬核:条形图对比(那拍全屏网点背景,盖住 b-roll;条与数字按弹簧增长)
const BarChart: React.FC<{ bars: NonNullable<Beat["bars"]>; theme: string }> = ({ bars, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 200 } });
  const max = Math.max(...bars.items.map((it) => it.value)) || 1;
  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 38%, #1c1c1c 0%, #080808 100%)", justifyContent: "flex-start", padding: "300px 90px 0", fontFamily: FONT }}>
      <AbsoluteFill style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.06) 2px, transparent 2px)", backgroundSize: "24px 24px" }} />
      <div style={{ color: "#fff", fontWeight: 900, fontSize: 66, marginBottom: 10, textShadow: outline(1) }}>{bars.title}</div>
      {bars.source ? <div style={{ color: "rgba(255,255,255,.5)", fontSize: 28, marginBottom: 46 }}>{bars.source}</div> : <div style={{ height: 46 }} />}
      {bars.items.map((it, i) => {
        const a = interpolate(p, [i * 0.18, i * 0.18 + 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", marginBottom: 30 }}>
            <div style={{ width: 280, color: "#fff", fontWeight: 900, fontSize: 42 }}>{it.label}</div>
            <div style={{ flex: 1, height: 72, background: "rgba(255,255,255,.08)", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ width: `${a * (it.value / max) * 100}%`, height: "100%", background: it.color, borderRadius: 14, boxShadow: `0 0 20px ${it.color}88` }} />
            </div>
            <div style={{ width: 180, textAlign: "right", color: it.color, fontWeight: 900, fontSize: 56, textShadow: outline(1) }}>{Math.round(a * it.value)}{it.unit || ""}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

type Cap = "highlight" | "solidbar" | "glow";
// 逐字字幕(踩配音);三种无描边样式,避开"描边把密笔画填成灰底衬"的毛病
const Caption: React.FC<{ beat: Beat; theme: string; size: number; cap: Cap }> = ({ beat, theme, size, cap }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  if (t < beat.startSec || t >= beat.endSec) return null;
  const chars = Array.from(beat.text);
  const hlSet = new Set<number>();
  (beat.hl ?? []).forEach((kw) => {
    let idx = beat.text.indexOf(kw);
    while (idx >= 0) { for (let k = 0; k < Array.from(kw).length; k++) hlSet.add(idx + k); idx = beat.text.indexOf(kw, idx + 1); }
  });
  const ctOf = (ci: number) => beat.startSec + ((beat.endSec - beat.startSec) * ci) / chars.length;
  const wrap = (inner: React.ReactNode, extra?: React.CSSProperties) => (
    <div style={{ position: "absolute", left: 70, right: 70, bottom: 560, textAlign: "center" }}>
      <span style={{ display: "inline-block", fontWeight: 900, fontSize: size, lineHeight: 1.4, ...extra }}>{inner}</span>
    </div>
  );

  // ① 关键词金色块高亮(带货风):正文白+软投影,重点词嵌实色金块(深字)
  if (cap === "highlight") {
    return wrap(chars.map((ch, ci) => {
      if (hlSet.has(ci)) return <span key={ci} style={{ display: "inline-block", background: theme, color: "#2A1E12", borderRadius: 6, padding: "0 7px", margin: "0 2px" }}>{ch}</span>;
      return <span key={ci} style={{ display: "inline-block", color: "#fff", textShadow: "0 2px 6px rgba(0,0,0,.6)" }}>{ch === " " ? " " : ch}</span>;
    }));
  }
  // ② 整条实色深底条:不透明,不糊;白字+金重点
  if (cap === "solidbar") {
    return wrap(
      chars.map((ch, ci) => <span key={ci} style={{ display: "inline-block", color: hlSet.has(ci) ? theme : "#fff" }}>{ch === " " ? " " : ch}</span>),
      { background: "rgba(18,16,13,0.52)", borderRadius: 18, padding: "10px 30px" }
    );
  }
  // ③ 白字柔和外发光(无框);未念到=淡淡浅灰,已念到=满白,重点词金
  return wrap(chars.map((ch, ci) => {
    const active = t >= ctOf(ci);
    return <span key={ci} style={{ display: "inline-block", color: !active ? "rgba(194,194,194,0.88)" : hlSet.has(ci) ? theme : "#fff", textShadow: "0 0 9px rgba(0,0,0,.9), 0 0 16px rgba(0,0,0,.7)" }}>{ch === " " ? " " : ch}</span>;
  }));
};

// 开场点睛大标题(钩子大字,重点词金色,弹入)
const TitleHook: React.FC<{ text: string; hl?: string[]; theme: string }> = ({ text, hl, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 200, mass: 0.8 } });
  const out = spring({ frame: frame - 64, fps, config: { damping: 200 } });
  const sc = interpolate(p, [0, 1], [0.82, 1]);
  const y = interpolate(p, [0, 1], [40, 0]);
  const op = interpolate(out, [0, 1], [1, 0]);
  const lines = text.split("\n");
  const isHl = (s: string) => (hl ?? []).some((k) => s.includes(k));
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: op, paddingBottom: 120 }}>
      <div style={{ transform: `scale(${sc}) translateY(${y}px)`, textAlign: "center", fontFamily: FONT }}>
        {lines.map((ln, i) => (
          <div key={i} style={{ fontWeight: 900, fontSize: 128, lineHeight: 1.18, textShadow: `${outline(1)}, 0 12px 30px rgba(0,0,0,.55), 0 0 26px rgba(0,0,0,.4)`, color: isHl(ln) ? theme : "#fff" }}>{ln}</div>
        ))}
        <div style={{ height: 14, width: 200, margin: "26px auto 0", borderRadius: 8, background: theme, boxShadow: `0 0 20px ${theme}`, transform: `scaleX(${interpolate(p, [0.3, 1], [0, 1], { extrapolateLeft: "clamp" })})` }} />
      </div>
    </AbsoluteFill>
  );
};

// 口播画中画窗:右下角圆角形象窗(小妹/真人),弹入。给"口播"风格用,纯混剪档不传 host 即不显示。
const HostWindow: React.FC<{ host: NonNullable<Script["host"]>; theme: string }> = ({ host, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 200, mass: 0.7 } });
  return (
    <div style={{ position: "absolute", right: 48, bottom: 120, width: 230, height: 300, transform: `scale(${interpolate(p, [0, 1], [0.8, 1])})`, opacity: p, borderRadius: 20, overflow: "hidden", border: `3px solid ${theme}`, boxShadow: `0 10px 30px rgba(0,0,0,.5), 0 0 18px ${theme}66` }}>
      <Img src={staticFile(host.image)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }} />
      {host.label ? <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: theme, color: "#2A1E12", fontWeight: 900, fontSize: 24, textAlign: "center", padding: "4px 0" }}>{host.label}</div> : null}
    </div>
  );
};

export const EffectEngine: React.FC<Script> = ({ styleId, theme, brand, watermark, voice, bgm, beats, title, titleHl, cap, host }) => {
  const { fps, durationInFrames, width } = useVideoConfig();
  const frame = useCurrentFrame();
  const style = STYLES[styleId as StyleId];

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", fontFamily: FONT }}>
      <style>{`@font-face{font-family:'${FONT}';src:url('${staticFile("zh.ttc")}') format('truetype');font-weight:400 900;font-display:block;}`}</style>

      {/* 背景 b-roll:每镜 Ken Burns + 镜间按节拍转场 */}
      <TransitionSeries>
        {beats.flatMap((b, i) => {
          // 每镜真实跨度 = 到下一 beat 的音频间距(含停顿),保证画面跟配音对齐;
          // 末镜用自身时长;+trDur 补偿转场重叠吃掉的帧。
          const span = i < beats.length - 1 ? beats[i + 1].startSec - b.startSec : b.endSec - b.startSec;
          const f = Math.max(fr(span, fps) + style.trDur, 20);
          const mv = pickCameraMove(b.feature, style, i);
          const seq = (
            <TransitionSeries.Sequence key={`s${i}`} durationInFrames={f}>
              <Cam src={b.clip} mv={mv} frames={f} />
            </TransitionSeries.Sequence>
          );
          if (i === 0) return [seq];
          const tr = pickTransition(beats[i - 1].kind, style, i);
          return [<TransitionSeries.Transition key={`t${i}`} timing={tr.timing} presentation={tr.presentation} />, seq];
        })}
      </TransitionSeries>

      {/* 数据硬核:条形图(数据拍全屏盖 b-roll)*/}
      {beats.map((b, i) => (b.bars ? (
        <Sequence key={`bar${i}`} from={fr(b.startSec, fps)} durationInFrames={fr(b.endSec - b.startSec, fps)}>
          <BarChart bars={b.bars} theme={theme} />
        </Sequence>
      ) : null))}

      <div style={{ position: "absolute", top: 70, left: 56, display: "flex", alignItems: "center", gap: 12, background: "rgba(22,19,15,0.55)", backdropFilter: "blur(8px)", padding: "12px 26px", borderRadius: 999, color: "#fff", fontSize: 36, fontWeight: 700, boxShadow: "inset 0 1px 0 rgba(255,255,255,.12)" }}>
        <span style={{ width: 14, height: 14, borderRadius: 999, background: theme, boxShadow: `0 0 12px ${theme}` }} />
        {brand}
      </div>
      <div style={{ position: "absolute", top: 80, right: 56, color: "rgba(255,255,255,0.85)", fontSize: 30, textShadow: "0 2px 10px rgba(0,0,0,.7)" }}>{watermark}</div>

      {/* 大数字:仅数字钩子,绑该 beat 的配音时段 */}
      {beats.map((b, i) => (showsBigNum(b) ? (
        <Sequence key={`n${i}`} from={fr(b.startSec, fps)} durationInFrames={fr(b.endSec - b.startSec, fps)}>
          <BigNum num={b.num!} theme={theme} size={style.numSize} />
        </Sequence>
      ) : null))}

      {/* 逐字字幕:每 beat 踩配音(开场大标题期间 beat0 不出底部字幕,避免打架)*/}
      {beats.map((b, i) => (title && i === 0 ? null : <Caption key={`c${i}`} beat={b} theme={theme} size={style.captionSize} cap={(cap ?? "highlight") as Cap} />))}

      {/* 开场点睛大标题:首句时长内 */}
      {title ? (
        <Sequence from={0} durationInFrames={fr(beats[0]?.endSec ?? 3, fps)}>
          <TitleHook text={title} hl={titleHl} theme={theme} />
        </Sequence>
      ) : null}

      {host ? <HostWindow host={host} theme={theme} /> : null}
      <div style={{ position: "absolute", left: 0, bottom: 0, height: 10, background: theme, width: (frame / durationInFrames) * width }} />
      {voice ? <Audio src={staticFile(voice)} volume={1} /> : null}
      <Audio src={staticFile(bgm)} volume={voice ? 0.22 : 0.45} />
    </AbsoluteFill>
  );
};
