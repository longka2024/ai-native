// ───────── 风格档库(可枚举的"档";匹配器按行业/内容选一张)─────────
// 每张档 = 节奏(styleId→rules.STYLES) + 配色(theme) + 字幕样式(cap)。
// mizan 暖金 = 第一张(定稿)。后续从剪映成片偷师扩档(见 video-effect-template-engine-roadmap)。
import { StyleId } from "./rules";

export type StylePreset = {
  id: string;
  label: string;
  styleId: StyleId;   // 节奏档(快剪/慢剪/数据硬核)→ rules.STYLES
  theme: string;      // 唯一重点色
  cap: "highlight" | "solidbar" | "glow"; // 字幕样式
  fitIndustries: string[]; // 适配行业(匹配器选档用)
};

export const STYLE_PRESETS: StylePreset[] = [
  // mizan 定稿:数据硬核 × 暖金 × 灰透字幕
  { id: "datahard-gold", label: "数据硬核·暖金", styleId: "datahard", theme: "#F2B33D", cap: "glow",
    fitIndustries: ["商超采购", "供应链", "批发", "外贸", "电商"] },
  // 备选档(占位,待从剪映成片偷师细化)
  { id: "punchy-emerald", label: "快剪带感·翠绿", styleId: "punchy", theme: "#19c37d", cap: "highlight",
    fitIndustries: ["美妆", "种草", "快消", "美食"] },
  { id: "premium-cream", label: "慢剪高级·米白", styleId: "premium", theme: "#e8d6a8", cap: "glow",
    fitIndustries: ["留学", "教育", "高端", "品牌"] },
];

export const presetById = (id: string): StylePreset =>
  STYLE_PRESETS.find((p) => p.id === id) ?? STYLE_PRESETS[0];

// 行业 → 推荐档(匹配器入口);命不中回落第一张
export const pickPresetByIndustry = (industry: string): StylePreset =>
  STYLE_PRESETS.find((p) => p.fitIndustries.some((k) => industry.includes(k))) ?? STYLE_PRESETS[0];
