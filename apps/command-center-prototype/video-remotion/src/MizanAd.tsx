import React from "react";
import { AbsoluteFill, OffthreadVideo, Audio, staticFile, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { z } from "zod";

const FONT = "Deyi";

export const mizanSchema = z.object({
  durationSec: z.number(),
  theme: z.string(),
  brand: z.string(),
  segs: z.array(z.tuple([z.number(), z.number(), z.string(), z.boolean()])),
});

export const MizanAd: React.FC<z.infer<typeof mizanSchema>> = ({ theme, brand, segs }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width } = useVideoConfig();
  const t = frame / fps;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", fontFamily: FONT }}>
      <style>{`@font-face{font-family:'${FONT}';src:url('${staticFile("zh.ttc")}') format('truetype');font-weight:400 900;font-display:block;}`}</style>
      <OffthreadVideo src={staticFile("video.mp4")} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 42%, rgba(0,0,0,0.72) 100%)" }} />
      <AbsoluteFill style={{ opacity: 0.07, backgroundSize: "300px",
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`,
        transform: `translate(${(frame % 3) * 7}px, ${(frame % 2) * 7}px)` }} />

      <div style={{ position: "absolute", top: 70, left: 56, background: "rgba(15,155,142,0.92)", padding: "12px 24px", borderRadius: 999, color: "#fff", fontSize: 36, fontWeight: 700, boxShadow: "0 6px 22px rgba(15,155,142,.4)" }}>{brand}</div>
      <div style={{ position: "absolute", top: 80, right: 56, color: "rgba(255,255,255,0.85)", fontSize: 30, textShadow: "0 2px 10px rgba(0,0,0,.7)" }}>longka 制作</div>

      {segs.map(([s, e, text, isNum], i) => {
        if (t < s || t >= e) return null;
        const chars = Array.from(text);
        return (
          <div key={i} style={{ position: "absolute", left: 40, right: 40, bottom: 790, textAlign: "center" }}>
            <span style={{ fontWeight: 900, fontSize: isNum ? 104 : 88, lineHeight: 1.15, WebkitTextStroke: "8px rgba(0,0,0,0.62)", paintOrder: "stroke fill" as any, textShadow: "0 6px 18px rgba(0,0,0,.5)" }}>
              {chars.map((ch, ci) => {
                const ct = s + ((e - s) * ci) / chars.length;
                const active = t >= ct;
                const sc = interpolate(t, [ct, ct + 0.12], [0.55, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                return (
                  <span key={ci} style={{ display: "inline-block", color: active ? (isNum ? theme : "#fff") : "rgba(255,255,255,0.25)", transform: `scale(${active ? 1 : sc})` }}>{ch === " " ? " " : ch}</span>
                );
              })}
            </span>
            <div style={{ height: 12, width: "70%", margin: "12px auto 0", borderRadius: 8, background: `linear-gradient(90deg,#0f9b8e,${theme})`, boxShadow: `0 0 18px ${theme}99`, transform: `scaleX(${interpolate(t, [s, s + 0.25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})` }} />
          </div>
        );
      })}

      <div style={{ position: "absolute", left: 0, bottom: 0, height: 10, background: theme, width: (frame / durationInFrames) * width }} />
      <Audio src={staticFile("voice.mp3")} volume={1} />
      <Audio src={staticFile("bgm.mp3")} volume={0.22} />
    </AbsoluteFill>
  );
};
