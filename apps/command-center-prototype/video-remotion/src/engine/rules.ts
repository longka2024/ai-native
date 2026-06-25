// ───────── 效果模板引擎 · 决策大脑 ─────────
// 铁律:剪辑效果 = f(文案节拍, 镜头特色, 风格档)。不套模板乱贴,按语义咬合。
import { TransitionPresentation } from "@remotion/transitions";
import { linearTiming, springTiming, TransitionTiming } from "@remotion/transitions";
import { wipe } from "@remotion/transitions/wipe";
import { crossZoom } from "@remotion/transitions/cross-zoom";
import { dreamyZoom } from "@remotion/transitions/dreamy-zoom";
import { zoomBlur } from "@remotion/transitions/zoom-blur";
import { linearBlur } from "@remotion/transitions/linear-blur";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";

// 文案这一句在干嘛
export type BeatKind = "intro" | "number" | "contrast" | "selling" | "closing";
// 这条镜头是什么货(决定怎么动)
export type ClipFeature = "drone" | "aisle" | "wall" | "people" | "product" | "loading";
// 风格档(模板档,后续从剪映成片扩充)
export type StyleId = "punchy" | "premium" | "datahard";

export type Beat = {
  text: string;         // 文案原话(逐字字幕用)
  startSec: number;     // 配音起(踩字幕/卡点)
  endSec: number;       // 配音止
  kind: BeatKind;       // 节拍类型
  clip: string;         // 镜头文件名(public/ 下)
  feature: ClipFeature; // 镜头特色
  num?: { to: number; unit: string; label: string; decimals?: number }; // 数字钩子时填
  hl?: string[]; // 重点词(金色高亮)
  bars?: { title: string; source?: string; items: { label: string; value: number; unit?: string; color: string }[] }; // 数据硬核:条形图对比(那拍全屏盖 b-roll)
};

export type StyleProfile = {
  id: StyleId;
  label: string;
  trDur: number;        // 转场基准帧
  push: [number, number]; // Ken Burns 缩放区间(景深强度)
  captionSize: number;  // 字幕字号
  numSize: number;      // 大数字字号
};

export const STYLES: Record<StyleId, StyleProfile> = {
  punchy:   { id: "punchy",   label: "快剪带感", trDur: 12, push: [1.06, 1.22], captionSize: 76, numSize: 230 },
  premium:  { id: "premium",  label: "慢剪高级", trDur: 22, push: [1.03, 1.12], captionSize: 72, numSize: 210 },
  datahard: { id: "datahard", label: "数据硬核", trDur: 14, push: [1.05, 1.16], captionSize: 78, numSize: 230 },
};

// ① 文案节拍 × 风格 → 转场(数字砸/对比擦除/铺陈慢推/收尾稳)
export function pickTransition(prevKind: BeatKind, style: StyleProfile, idx: number): {
  timing: TransitionTiming; presentation: TransitionPresentation<any>;
} {
  const T = style.trDur;
  const lin = (d = T) => linearTiming({ durationInFrames: d });
  const spr = springTiming({ config: { damping: 200 } });
  switch (prevKind) {
    case "number":   // 数字砸:缩放模糊冲击
      return { timing: lin(T + 4), presentation: zoomBlur({}) };
    case "contrast": // 对比/痛点:对角擦除(用户最爱),奇偶变方向
      return { timing: lin(), presentation: wipe({ direction: idx % 2 ? "from-bottom-right" : "from-top-right" }) };
    case "selling":  // 卖点铺陈:梦幻/推镜虚化慢过
      return { timing: spr, presentation: idx % 2 ? dreamyZoom({}) : crossZoom({}) };
    case "closing":  // 收尾:稳,淡入
      return { timing: lin(T + 6), presentation: fade() };
    case "intro":
    default:         // 起势:方向模糊 / 滑入(快剪用滑,其余用模糊)
      return style.id === "punchy"
        ? { timing: lin(), presentation: slide({ direction: "from-right" }) }
        : { timing: lin(T + 4), presentation: linearBlur({}) };
  }
}

// ② 镜头特色 → 运镜(纵深推进/横移/跟拍/快推)
export function pickCameraMove(feature: ClipFeature, style: StyleProfile, idx: number): {
  scale: [number, number]; driftY: number; driftX: number;
} {
  const [lo, hi] = style.push;
  switch (feature) {
    case "drone":
    case "aisle":   // 无人机/长廊:顺势放大纵深,强推
      return { scale: [lo, hi + 0.04], driftY: 36, driftX: 0 };
    case "wall":    // 货架花墙(信息密):横移带过,别推糊
      return { scale: [lo, lo + 0.05], driftY: 0, driftX: idx % 2 ? 40 : -40 };
    case "people":  // 客户选品:轻景深跟拍
      return { scale: [lo + 0.02, hi - 0.02], driftY: 14, driftX: 0 };
    case "product": // 品类特写:快推强调
      return { scale: [lo, hi + 0.02], driftY: 0, driftX: 0 };
    case "loading":
    default:
      return { scale: [lo, hi], driftY: 24, driftX: 0 };
  }
}

// ③ 该不该弹大数字
export function showsBigNum(beat: Beat): boolean {
  return beat.kind === "number" && !!beat.num;
}
