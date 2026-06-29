import React from "react";
import {
  AbsoluteFill, OffthreadVideo, Audio, staticFile, Img,
  useCurrentFrame, useVideoConfig, interpolate, spring, Sequence, Easing,
} from "remotion";
import { TransitionSeries } from "@remotion/transitions";
import { z } from "zod";
import { Beat, STYLES, StyleId, pickTransition, pickCameraMove, showsBigNum } from "./engine/rules";
import { Chart } from "./engine/charts";

const FONT = "Deyi";
// 暖偏近黑替代纯黑(design-brain texture:#000 死填=banding+无 headroom;暗端注入暖色相,与暖金同温)
const NEARBLACK = "#120e0a";

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
  chart: z.object({  // 原生动态图表(charts.tsx):按 type 渲 KPI/对比柱/落差/占比,绑该 beat 配音时段
    type: z.enum(["kpi", "bars", "drop", "ratio"]),
    title: z.string().optional(), takeaway: z.string().optional(),
    value: z.number().optional(), unit: z.string().optional(), label: z.string().optional(),
    items: z.array(z.object({ label: z.string(), value: z.number(), unit: z.string().optional(), role: z.string().optional() })).optional(),
    startText: z.string().optional(), startLabel: z.string().optional(), endText: z.string().optional(), endLabel: z.string().optional(),
  }).optional(),
});
export const scriptZ = z.object({
  styleId: z.enum(["punchy", "premium", "datahard"]),
  theme: z.string(),
  brand: z.string(),
  watermark: z.string().default(""),   // 正式版不带第三方水印;品牌用 logo
  logo: z.string().optional(),         // 角标 logo(贯穿,透明版),如 brand/mizan-logo.png
  endLogo: z.string().optional(),      // 片尾 logo(蓝底app图标),如 brand/mizan-icon.png
  voice: z.string().optional(),
  bgm: z.string().default("bgm.mp3"),
  title: z.string().optional(),        // 开场点睛大标题(\n 分行)
  titleHl: z.array(z.string()).optional(),
  cover: z.object({ locale: z.string().optional(), sub: z.string().optional(), tags: z.array(z.string()).optional(), flag: z.string().optional(), img: z.string().optional() }).optional(), // 开场封面定格:地点标签/副标/卖点标签/国旗图(flags/<cc>.png);国旗用真实图,不用emoji(渲染掉字形)
  cap: z.enum(["highlight", "solidbar", "glow"]).default("highlight"), // 字幕样式
  coverStyle: z.enum(["lingzao", "lingzaoTop", "question", "editorial"]).default("lingzao"), // lingzao/lingzaoTop/question=视频场景底图+黄色粗描边大字(已去暗幕,不再灰黑);editorial=象牙纸编辑风(备选,一般不用)
  host: z.object({ image: z.string(), label: z.string().optional() }).optional(), // 口播画中画窗(形象图,如小妹);纯混剪档不传
  beats: z.array(beatZ),
});
export type Script = z.infer<typeof scriptZ>;

const fr = (sec: number, fps: number) => Math.round(sec * fps);

// 单镜:按 pickCameraMove 的结果做 Ken Burns 景深
const Cam: React.FC<{ src: string; mv: ReturnType<typeof pickCameraMove>; frames: number; screen?: boolean }> = ({ src, mv, frames, screen }) => {
  const frame = useCurrentFrame();
  // 录屏/UI 镜头:静止 + 完整显示(contain,不裁界面),不套暗角(浅色界面套暗角会四周发暗发脏)
  const sc = screen ? 1 : interpolate(frame, [0, frames], mv.scale, { extrapolateRight: "clamp" });
  const ty = screen ? 0 : interpolate(frame, [0, frames], [mv.driftY, -mv.driftY], { extrapolateRight: "clamp" });
  const tx = screen ? 0 : interpolate(frame, [0, frames], [mv.driftX, -mv.driftX], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: screen ? "#0a0c10" : NEARBLACK }}>
      <AbsoluteFill style={{ transform: `scale(${sc}) translate(${tx}px,${ty}px)` }}>
        <OffthreadVideo src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: screen ? "contain" : "cover", filter: screen ? undefined : "contrast(1.14) saturate(1.06)" }} muted />
      </AbsoluteFill>
      {/* 暗角已去除(客户反馈:不要四周暗角/椭圆光圈,画面要通透)。golden_check.py 焊死防漂移 */}
    </AbsoluteFill>
  );
};

// 大数字:景深翻入 + 滚动 + 末端淡出
const BigNum: React.FC<{ num: NonNullable<Beat["num"]>; theme: string; size: number; holdF: number }> = ({ num, theme, size, holdF }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 200, mass: 0.9 } });
  // 结尾才淡出(按整段时长,不写死帧数;否则 60fps 下 0.8s 就消失):最后 ~0.3s 淡出
  const fadeLen = Math.round(fps * 0.3);
  const out = 1 - interpolate(frame, [holdF - fadeLen, holdF], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
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
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 38%, #241c14 0%, #0d0a07 100%)", justifyContent: "flex-start", padding: "300px 90px 0", fontFamily: FONT }}>
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
  // ③ 白字柔和外发光(无框);未念到=淡淡浅灰,已念到=暖白,重点词金。
  // design-brain:层级靠字重对比(别全 900 拍平)——重点 900 / 正文 700;已念正文用暖白非纯白(从暖金底吸色)。
  return wrap(chars.map((ch, ci) => {
    const active = t >= ctOf(ci);
    const hot = hlSet.has(ci);
    return <span key={ci} style={{ display: "inline-block",
      fontWeight: hot ? 900 : 700,
      color: !active ? "rgba(194,194,194,0.88)" : hot ? theme : "#fdf6ec",
      textShadow: "0 0 9px rgba(0,0,0,.9), 0 0 16px rgba(0,0,0,.7)" }}>{ch === " " ? " " : ch}</span>;
  }));
};

// 开场封面(正规化):暗幕 + mizan logo + 点睛大标题(重点词金) + 品牌行 + 金色起笔条
// 开场封面定格:frame 0 就完整显示(转发预览=首帧=夺目封面),停留念第一句钩子,末尾淡出进正片。
// 设计同 CoverShot(lingzao 本地生活组:地点标签 + 大标题锚点 + 副标 + 卖点标签),底图=正片第一镜头(在底层)。
// frame 0 即完整、静止(design-brain:文字静读;且转发首帧必须完整夺目),不做入场动画。
const CoverHold: React.FC<{ text: string; hl?: string[]; theme: string; cover?: { locale?: string; sub?: string; tags?: string[]; flag?: string; img?: string }; holdSec: number; coverStyle?: "lingzao" | "lingzaoTop" | "question" | "editorial" }> = ({ text, hl, theme, cover, holdSec, coverStyle = "lingzao" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const holdF = holdSec * fps;
  const fadeOut = interpolate(frame, [holdF - 12, holdF], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lines = text.split("\n");
  const isHl = (s: string) => (hl ?? []).some((k) => s.includes(k));
  if (coverStyle === "editorial") {
    // 象牙纸高级编辑风:纯亮净底(无暗幕)+ 衬线大字 + 一块亮彩产品图 + mizan 落款。根治"开场灰黑"。
    const SER = "'NotoSerif', serif";
    const last = lines[lines.length - 1] || "";
    const qm = last.match(/[?？]$/);
    const hasImg = !!cover?.img;
    return (
      <AbsoluteFill style={{ opacity: fadeOut, background: "radial-gradient(120% 80% at 50% 26%, #F7F2E8 0%, #EFE7D7 60%, #E8DEC9 100%)", fontFamily: SER }}>
        <div style={{ position: "absolute", inset: 56, border: "1.5px solid rgba(34,28,20,.22)" }} />
        <div style={{ position: "absolute", inset: 56, padding: "70px 74px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontFamily: FONT, fontWeight: 700, fontSize: 32, letterSpacing: ".26em", color: "#7A6A3C" }}>
            <span style={{ width: 16, height: 16, borderRadius: "50%", background: "#B8862F", boxShadow: "0 0 0 6px rgba(184,134,47,.18)" }} />源头供应链
            <span style={{ marginLeft: "auto", letterSpacing: ".5em", color: "#9A8A66", fontSize: 24 }}>SOURCING</span>
          </div>
          {hasImg ? (
            <div style={{ marginTop: 40, height: 760, borderRadius: 10, overflow: "hidden", position: "relative", boxShadow: "0 18px 44px rgba(34,24,12,.28)" }}>
              <Img src={staticFile(cover!.img!)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 55%" }} />
              {cover?.tags?.[0] ? <div style={{ position: "absolute", left: 0, bottom: 0, background: "#B8862F", color: "#1E1810", fontFamily: FONT, fontWeight: 800, fontSize: 30, letterSpacing: ".08em", padding: "10px 28px" }}>{cover.tags[0]}</div> : null}
            </div>
          ) : null}
          <div style={{ marginTop: hasImg ? 54 : 210 }}>
            {cover?.locale ? <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 44, letterSpacing: ".2em", color: "#6E6047", marginBottom: 26 }}>{cover.locale}</div> : null}
            {lines.map((ln, i) => {
              const isLast = i === lines.length - 1 && !!qm;
              const body = isLast ? ln.slice(0, -1) : ln;
              return <div key={i} style={{ fontSize: hasImg ? 158 : 214, lineHeight: 1.04, fontWeight: 800, color: "#1E1810", letterSpacing: ".02em" }}>{body}{isLast ? <span style={{ color: "#B8862F" }}>{qm![0]}</span> : null}</div>;
            })}
            {cover?.sub ? <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 48, letterSpacing: ".04em", color: "#54493A", marginTop: 30 }}>{cover.sub}</div> : null}
          </div>
          <div style={{ marginTop: "auto", display: "flex", alignItems: "flex-end", justifyContent: "space-between", fontFamily: FONT }}>
            <div style={{ fontWeight: 800, fontSize: 42, letterSpacing: ".16em", color: "#1E1810" }}>mi<span style={{ color: "#B8862F" }}>z</span>an</div>
            <div style={{ fontFamily: SER, fontSize: 36, color: "#A89A78", letterSpacing: ".08em" }}>海外供应链笔记</div>
          </div>
        </div>
      </AbsoluteFill>
    );
  }
  if (coverStyle === "question") {
    // 大问句钩子:画面中央一个大问句当主视觉 + 下方小字预告,勾人;无地点/卖点标签
    return (
      <AbsoluteFill style={{ opacity: fadeOut }}>
        {/* 去暗幕:视频场景直接当背景,黄色粗描边大字读清(不压黑) */}
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "0 80px 130px", fontFamily: FONT }}>
          {lines.map((ln, i) => (
            <div key={i} style={{ fontWeight: 900, fontSize: isHl(ln) ? 176 : 140, lineHeight: 1.12, letterSpacing: "-0.02em", color: isHl(ln) ? theme : "#fff", textShadow: `${outline(3)}, 3px 5px 9px rgba(0,0,0,.5)`, textAlign: "center" }}>{ln}</div>
          ))}
          {cover?.sub ? <div style={{ marginTop: 40, fontSize: 52, fontWeight: 800, color: "#fff", background: "rgba(20,16,12,0.5)", borderRadius: 16, padding: "12px 36px", textShadow: outline(1) }}>{cover.sub}</div> : null}
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      {/* 去暗幕:视频场景直接当背景,黄色粗描边大字读清(不压黑) */}
      {/* 下三分之二三级层级,左对齐 */}
      <AbsoluteFill style={{ justifyContent: coverStyle === "lingzaoTop" ? "flex-start" : "flex-end", alignItems: "flex-start", padding: coverStyle === "lingzaoTop" ? "300px 70px 0" : "0 70px 230px", fontFamily: FONT }}>
        {cover?.locale ? <div style={{ marginBottom: 26, background: theme, color: "#2A1E12", fontWeight: 900, fontSize: 44, padding: "8px 28px", borderRadius: 14, boxShadow: `0 6px 22px ${theme}66`, display: "flex", alignItems: "center", gap: 14 }}>{cover.flag ? <Img src={staticFile(`flags/${cover.flag}.png`)} style={{ height: 40, width: "auto", borderRadius: 4, boxShadow: "0 1px 4px rgba(0,0,0,.4)" }} /> : null}{cover.locale}</div> : null}
        {lines.map((ln, i) => (
          <div key={i} style={{ fontWeight: 900, fontSize: isHl(ln) ? 152 : 132, lineHeight: 1.08, letterSpacing: "-0.02em", color: isHl(ln) ? theme : "#fff", textShadow: `${outline(3)}, 3px 5px 9px rgba(0,0,0,.5)`, textAlign: "left" }}>{ln}</div>
        ))}
        {cover?.sub ? <div style={{ marginTop: 24, fontSize: 50, fontWeight: 800, color: "#fff", background: "rgba(20,16,12,0.5)", borderRadius: 16, padding: "12px 34px", textShadow: outline(1) }}>{cover.sub}</div> : null}
        {cover?.tags?.length ? (
          <div style={{ display: "flex", gap: 16, marginTop: 32, flexWrap: "wrap" }}>
            {cover.tags.map((tg, i) => <span key={i} style={{ fontSize: 40, fontWeight: 900, color: "#2A1E12", background: theme, borderRadius: 999, padding: "10px 28px", boxShadow: "0 4px 14px rgba(0,0,0,.35)" }}>{tg}</span>)}
          </div>
        ) : null}
      </AbsoluteFill>
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

// logo 动效:发光脉冲(drop-shadow)+ 高光扫过(用 logo 自身当遮罩,白色斜带划过,只在 logo 形状上亮)
// 角标用柔和版(subtle),片尾用强版(strong)。纯 Remotion 实现,不依赖 GSAP。
const LogoFX: React.FC<{ src: string; width: number; theme: string; strong?: boolean }> = ({ src, width, theme, strong }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const period = (strong ? 2.4 : 4.5) * fps;                 // 高光扫过周期(秒)
  const ph = (frame % period) / period;                     // 0..1
  const sweep = interpolate(ph, [0, 0.42, 1], [-130, 130, 130], { extrapolateRight: "clamp" }); // 前42%划过,其余停
  const glow = (strong ? 24 : 10) + (strong ? 16 : 6) * (0.5 + 0.5 * Math.sin((frame / fps) * (strong ? 3.2 : 2.0)));
  const url = staticFile(src);
  return (
    <div style={{ position: "relative", width, lineHeight: 0 }}>
      <Img src={url} style={{ width, height: "auto", filter: `drop-shadow(0 3px 12px rgba(0,0,0,.55)) drop-shadow(0 0 ${glow}px ${theme}cc)` }} />
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "screen",
        WebkitMaskImage: `url(${url})`, maskImage: `url(${url})`,
        WebkitMaskSize: "contain", maskSize: "contain", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
        background: `linear-gradient(115deg, transparent 42%, rgba(255,255,255,${strong ? 0.95 : 0.65}) 50%, transparent 58%)`,
        backgroundSize: "260% 100%", backgroundRepeat: "no-repeat", backgroundPositionX: `${sweep}%`,
      }} />
    </div>
  );
};

// 片尾品牌露出:最后一拍 logo 上中位弹入(避开底部字幕)+ 强高光闪过,给正式版一个亮眼的品牌收尾
const EndLogo: React.FC<{ logo: string; theme: string }> = ({ logo, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 18, mass: 0.9 } });
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 260 }}>
      <div style={{ opacity: p, transform: `scale(${interpolate(p, [0, 1], [0.78, 1])})` }}>
        <LogoFX src={logo} width={440} theme={theme} strong />
      </div>
    </AbsoluteFill>
  );
};

export const EffectEngine: React.FC<Script> = ({ styleId, theme, brand, watermark, logo, endLogo, voice, bgm, beats, title, titleHl, cover, cap, coverStyle, host }) => {
  const { fps, durationInFrames, width } = useVideoConfig();
  const frame = useCurrentFrame();
  const style = STYLES[styleId as StyleId];

  return (
    <AbsoluteFill style={{ backgroundColor: NEARBLACK, fontFamily: FONT }}>
      <style>{`@font-face{font-family:'${FONT}';src:url('${staticFile("zh.ttc")}') format('truetype');font-weight:400 900;font-display:block;}@font-face{font-family:'NotoSerif';src:url('${staticFile("serif.ttf")}') format('truetype');font-weight:300 900;font-display:block;}`}</style>

      {/* 背景 b-roll:每镜 Ken Burns + 镜间按节拍转场 */}
      <TransitionSeries>
        {beats.flatMap((b, i) => {
          // 每镜真实跨度 = 到下一 beat 的音频间距(含停顿),保证画面跟配音对齐;
          // 末镜用自身时长;+trDur 补偿转场重叠吃掉的帧。
          const span = i < beats.length - 1 ? beats[i + 1].startSec - b.startSec : b.endSec - b.startSec;
          const f = Math.max(fr(span, fps) + style.trDur, 20);
          const mv = pickCameraMove(b.feature, style, i);
          const isScreen = b.clip.startsWith("shared/");  // 录屏/UI:静止完整显示,不套暗角
          const seq = (
            <TransitionSeries.Sequence key={`s${i}`} durationInFrames={f}>
              <Cam src={b.clip} mv={mv} frames={f} screen={isScreen} />
            </TransitionSeries.Sequence>
          );
          if (i === 0) return [seq];
          // 录屏镜头前后用叠化,避免缩放/对角把界面糊出闪白
          const screenTr = isScreen || beats[i - 1].clip.startsWith("shared/");
          const tr = pickTransition(beats[i - 1].kind, style, i, screenTr);
          return [<TransitionSeries.Transition key={`t${i}`} timing={tr.timing} presentation={tr.presentation} />, seq];
        })}
      </TransitionSeries>

      {/* 数据硬核:条形图(数据拍全屏盖 b-roll)*/}
      {beats.map((b, i) => (b.bars ? (
        <Sequence key={`bar${i}`} from={fr(b.startSec, fps)} durationInFrames={fr(b.endSec - b.startSec, fps)}>
          <BarChart bars={b.bars} theme={theme} />
        </Sequence>
      ) : null))}

      {/* 原生动态图表(charts.tsx):从该 beat 起,持续到下一 beat 开始(含尾部停顿),让人看清 */}
      {beats.map((b, i) => (b.chart ? (
        <Sequence key={`ch${i}`} from={fr(b.startSec, fps)} durationInFrames={fr((i < beats.length - 1 ? beats[i + 1].startSec : b.endSec) - b.startSec, fps)}>
          <Chart c={b.chart as any} theme={theme} />
        </Sequence>
      ) : null))}

      {/* 片尾品牌 logo:最后一拍露出(优先蓝底app图标 endLogo)*/}
      {(endLogo || logo) && beats.length > 0 ? (
        <Sequence from={fr(beats[beats.length - 1].startSec, fps)} durationInFrames={fr(beats[beats.length - 1].endSec - beats[beats.length - 1].startSec + 1.2, fps)}>
          <EndLogo logo={endLogo || logo!} theme={theme} />
        </Sequence>
      ) : null}

      {/* 顶部错落:logo 顶格右上突出;品牌条左侧下移错开水平线,且去掉重复的"mizan"(品牌交给 logo)*/}
      {logo
        ? <div style={{ position: "absolute", top: 52, right: 48, width: 176 }}><LogoFX src={logo} width={176} theme={theme} /></div>
        : (watermark ? <div style={{ position: "absolute", top: 60, right: 48, color: "rgba(255,255,255,0.85)", fontSize: 30, textShadow: "0 2px 10px rgba(0,0,0,.7)" }}>{watermark}</div> : null)}
      <div style={{ position: "absolute", top: 132, left: 48, display: "flex", alignItems: "center", gap: 12, background: "rgba(22,19,15,0.55)", backdropFilter: "blur(8px)", padding: "12px 26px", borderRadius: 999, color: "#fff", fontSize: 36, fontWeight: 700, boxShadow: "inset 0 1px 0 rgba(255,255,255,.12)" }}>
        <span style={{ width: 14, height: 14, borderRadius: 999, background: theme, boxShadow: `0 0 12px ${theme}` }} />
        {brand.replace(/\s*·\s*mizan/i, "")}
      </div>

      {/* 大数字:数字钩子,持续到下一拍开始(含尾部停顿,和图表一致),结尾才淡出 */}
      {beats.map((b, i) => {
        if (!showsBigNum(b)) return null;
        const span = (i < beats.length - 1 ? beats[i + 1].startSec : b.endSec) - b.startSec;
        return (
          <Sequence key={`n${i}`} from={fr(b.startSec, fps)} durationInFrames={fr(span, fps)}>
            <BigNum num={b.num!} theme={theme} size={style.numSize} holdF={fr(span, fps)} />
          </Sequence>
        );
      })}

      {/* 逐字字幕:每 beat 踩配音(开场大标题期间 beat0 不出底部字幕,避免打架)*/}
      {beats.map((b, i) => (title && i === 0 ? null : <Caption key={`c${i}`} beat={b} theme={theme} size={style.captionSize} cap={(cap ?? "highlight") as Cap} />))}

      {/* 开场点睛大标题:首句时长内 */}
      {title ? (
        <Sequence from={0} durationInFrames={fr(beats[0]?.endSec ?? 3, fps)}>
          <CoverHold text={title} hl={titleHl} theme={theme} cover={cover} holdSec={beats[0]?.endSec ?? 3} coverStyle={coverStyle} />
        </Sequence>
      ) : null}

      {host ? <HostWindow host={host} theme={theme} /> : null}
      {/* film grain 已移除(用户要清晰无颗粒,grain 反而添颗粒) */}
      {/* 底部进度条已移除(像播放器控制条、挡画面、不像成品) */}
      {voice ? <Audio src={staticFile(voice)} volume={1} /> : null}
      <Audio src={staticFile(bgm)} volume={voice ? 0.08 : 0.3} />
    </AbsoluteFill>
  );
};
