// ───────── 配音档(IndexTTS2 公模轮换库)─────────
// 用户耳判选定的 4 个常用公模(2男2女),30 条片轮换配不同风格。
// 真音色 wav 在 G:\index-tts_v2.5\voices_real\,合成走 tts_gen.py(本机免费)。
export type Gender = "male" | "female";
export type VoiceSlot = { id: string; file: string; gender: Gender; label: string };

export const VOICE_ROSTER: VoiceSlot[] = [
  { id: "voice_04", file: "voices_real/voice_04.wav", gender: "male",   label: "男·专业(默认)" },
  { id: "voice_01", file: "voices_real/voice_01.wav", gender: "male",   label: "男" },
  { id: "voice_03", file: "voices_real/voice_03.wav", gender: "female", label: "女·促销" },
  { id: "voice_08", file: "voices_real/voice_08.wav", gender: "female", label: "女" },
];

export const DEFAULT_VOICE = "voice_04";

export const voiceById = (id: string): VoiceSlot =>
  VOICE_ROSTER.find((v) => v.id === id) ?? VOICE_ROSTER[0];
