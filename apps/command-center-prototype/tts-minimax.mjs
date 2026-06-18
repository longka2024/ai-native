// tts-minimax.mjs — 口播配音走国内 MiniMax T2A v2。
// 端点统一 api.minimaxi.com（旧 api.minimax.chat 仍可用）；key 走 env MINIMAX_API_KEY，绝不硬编码。
// 122 在国内，必须用国内域名（别再调国际站 minimax.io / minimaxi.chat）。
// 返回 { buffer(mp3), durationMs }（durationMs 用 MiniMax 回的 extra_info.audio_length，省 ffprobe）。

const TTS_URL = process.env.MINIMAX_TTS_URL || 'https://api.minimaxi.com/v1/t2a_v2';

export function minimaxEnabled() {
  return Boolean(process.env.MINIMAX_API_KEY);
}

export async function synthesizeSpeech(text, opts = {}) {
  if (!minimaxEnabled()) throw new Error('minimax_disabled: MINIMAX_API_KEY 未配置');
  const model = opts.model || process.env.MINIMAX_TTS_MODEL || 'speech-02-hd';
  const voiceId = opts.voiceId || process.env.MINIMAX_TTS_VOICE || 'male-qn-qingse';
  const speed = Number(opts.speed || process.env.MINIMAX_TTS_SPEED || 1) || 1;
  const clean = String(text || '').trim().slice(0, 4000);
  if (!clean) throw new Error('tts_empty_text');

  const body = {
    model,
    text: clean,
    stream: false,
    voice_setting: { voice_id: voiceId, speed, vol: 1, pitch: 0 },
    audio_setting: { sample_rate: 32000, bitrate: 128000, format: 'mp3' },
  };

  const resp = await fetch(TTS_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.MINIMAX_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const raw = await resp.text();
  let data;
  try { data = JSON.parse(raw); } catch { throw new Error(`minimax_tts_non_json_${resp.status}: ${raw.slice(0, 160)}`); }
  const status = data?.base_resp?.status_code;
  if (status !== 0 && status !== undefined) {
    throw new Error(`minimax_tts_err_${status}: ${data?.base_resp?.status_msg || raw.slice(0, 160)}`);
  }
  const hex = data?.data?.audio;
  if (!hex) throw new Error(`minimax_tts_no_audio: ${data?.base_resp?.status_msg || raw.slice(0, 160)}`);
  return {
    buffer: Buffer.from(hex, 'hex'),
    durationMs: Number(data?.extra_info?.audio_length || 0),
    format: 'mp3',
    model,
    voiceId,
  };
}
