// CoverShot.tsx — 视频瀑布流封面缩略图(单帧,发布用 cover)。
// 方法来自 lingzao 封面研究:素材决定风格(海外开店带货=本地生活组:真实场景底图 + 强地点标签 +
// 夺目大字锚点 + 微信息标签),三级文字层级(大标题带关键词锚 / 副标 / 标签);
// 确定性叠字(得意黑 Remotion)天然规避生图模型"中文字不稳",这是我们相对 lingzao 服务端出图的优势。
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { z } from "zod";

const FONT = "Deyi";
// 干净 8 向硬描边(0 模糊),让大字在任意底图上都够对比(80px 缩略图可读)
const outline = (w: number, c = "#000") =>
  [`${-w}px ${-w}px 0 ${c}`, `${w}px ${-w}px 0 ${c}`, `${-w}px ${w}px 0 ${c}`, `${w}px ${w}px 0 ${c}`,
   `0 ${-w}px 0 ${c}`, `0 ${w}px 0 ${c}`, `${-w}px 0 0 ${c}`, `${w}px 0 0 ${c}`].join(", ");

export const coverZ = z.object({
  bg: z.string(),                        // 底图(从视频抽的好帧),public 下相对路径
  title: z.string(),                     // 大标题(\n 分行;短、带关键词锚)
  titleHl: z.array(z.string()).optional(),// 标题重点行(金色)
  sub: z.string().optional(),            // 副标(二级)
  tags: z.array(z.string()).optional(),  // 标签(三级微信息,如"工厂价/一件起订/10到15天")
  locale: z.string().optional(),         // 地点标签(本地生活组特征,如"🇪🇸 西班牙开店")
  theme: z.string().default("#F2B33D"),
});
export type Cover = z.infer<typeof coverZ>;

export const CoverShot: React.FC<Cover> = ({ bg, title, titleHl, sub, tags, locale, theme }) => {
  const lines = title.split("\n");
  const isHl = (s: string) => (titleHl ?? []).some((k) => s.includes(k));
  return (
    <AbsoluteFill style={{ backgroundColor: "#120e0a", fontFamily: FONT }}>
      <style>{`@font-face{font-family:'${FONT}';src:url('${staticFile("zh.ttc")}') format('truetype');font-weight:400 900;font-display:block;}`}</style>
      {/* 底图:选定的视频帧(有视觉主体/信息密度/场景反差) */}
      <Img src={staticFile(bg)} style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover" }} />
      {/* 暗角聚焦:顶轻压 + 底重压(暖)+ 中心留亮,让大字够对比、一秒看懂 */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(12,9,6,0.55) 0%, rgba(12,9,6,0.12) 30%, rgba(12,9,6,0.45) 60%, rgba(12,9,6,0.93) 100%)" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, transparent 38%, rgba(8,6,4,0.5) 100%)" }} />
      {/* 内容:下三分之二,三级层级 */}
      <AbsoluteFill style={{ justifyContent: "flex-end", padding: "0 70px 150px" }}>
        {locale ? (
          <div style={{ alignSelf: "flex-start", marginBottom: 26, background: theme, color: "#2A1E12", fontWeight: 900, fontSize: 42, padding: "8px 26px", borderRadius: 14, boxShadow: `0 6px 22px ${theme}66` }}>{locale}</div>
        ) : null}
        {lines.map((ln, i) => (
          <div key={i} style={{ fontWeight: 900, fontSize: 140, lineHeight: 1.1, letterSpacing: "-0.02em", color: isHl(ln) ? theme : "#fff", textShadow: `${outline(2)}, 0 10px 30px rgba(0,0,0,.7)` }}>{ln}</div>
        ))}
        {sub ? <div style={{ marginTop: 22, fontSize: 52, fontWeight: 700, color: "#fdf6ec", textShadow: `${outline(1)}, 0 4px 16px rgba(0,0,0,.7)` }}>{sub}</div> : null}
        {tags && tags.length ? (
          <div style={{ display: "flex", gap: 16, marginTop: 30, flexWrap: "wrap" }}>
            {tags.map((tg, i) => (
              <span key={i} style={{ fontSize: 38, fontWeight: 700, color: "#fff", background: "rgba(0,0,0,0.5)", border: `2px solid ${theme}`, borderRadius: 999, padding: "8px 24px" }}>{tg}</span>
            ))}
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
