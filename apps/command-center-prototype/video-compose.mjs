// video-compose.mjs — 口播片本地拼接（ffmpeg，在 122 跑，0 元）。
// 每个 beat：视频片段(循环/裁到该段配音时长) + 该段口播音轨 + 烧中文字幕 → 段；再 concat 成片。
// 无视频片段时回落纯色背景（保证有声+字幕；不做 Ken Burns 假动）。
// 字体走 env SUBTITLE_FONT（122 已装 Noto CJK）。竖屏 1080x1920。

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const run = promisify(execFile);
const FFMPEG = process.env.FFMPEG_BIN || 'ffmpeg';
const SUB_FONT = process.env.SUBTITLE_FONT || 'Noto Sans CJK SC';
const VW = Number(process.env.VIDEO_W || 1080);
const VH = Number(process.env.VIDEO_H || 1920);
const FF_TIMEOUT = Number(process.env.FFMPEG_TIMEOUT_MS || 180000);

function srtTime(sec) {
  const ms = Math.max(0, Math.round(sec * 1000));
  const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
  const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
  const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
  const f = String(ms % 1000).padStart(3, '0');
  return `${h}:${m}:${s},${f}`;
}

// 竖屏字幕按字数折行（中文约 14 字/行）
function wrapText(text, per = 14) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  const out = [];
  for (let i = 0; i < t.length; i += per) out.push(t.slice(i, i + per));
  return out.join('\n');
}

function buildSrt(text, durSec) {
  return `1\n${srtTime(0)} --> ${srtTime(durSec)}\n${wrapText(text)}\n`;
}

function subFilter(srtName) {
  // libass 默认脚本坐标 384x288，按视频高缩放：MarginV/FontSize 都在 288 空间内取值。
  // 下三分之一 ≈ MarginV 45；字号 14（缩放后约 90px，竖屏抖音可读）。
  const style = [
    `FontName=${SUB_FONT}`,
    'FontSize=14',
    'PrimaryColour=&H00FFFFFF&',
    'OutlineColour=&H00000000&',
    'BorderStyle=1',
    'Outline=2',
    'Shadow=0',
    'Alignment=2',
    'MarginV=45',
  ].join(',');
  return `subtitles=${srtName}:force_style='${style}'`;
}

async function buildSegment(workdir, beat, idx) {
  const seg = `seg_${idx}.mp4`;
  const srt = `sub_${idx}.srt`;
  const dur = Math.max(1, Number(beat.durationSec) || 5);
  await writeFile(join(workdir, srt), buildSrt(beat.text, dur));

  const common = [
    '-map', '0:v', '-map', '1:a',
    '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-r', '30',
    '-c:a', 'aac', '-b:a', '128k', '-ar', '44100',
    '-t', String(dur), '-shortest', seg,
  ];
  let args;
  if (beat.videoFile) {
    const vf = `scale=${VW}:${VH}:force_original_aspect_ratio=increase,crop=${VW}:${VH},setsar=1,${subFilter(srt)}`;
    args = ['-y', '-stream_loop', '-1', '-i', beat.videoFile, '-i', beat.audioFile, '-vf', vf, ...common];
  } else {
    const vf = subFilter(srt);
    args = ['-y', '-f', 'lavfi', '-i', `color=c=0x141422:s=${VW}x${VH}:r=30`, '-i', beat.audioFile, '-vf', vf, ...common];
  }
  await run(FFMPEG, args, { cwd: workdir, maxBuffer: 1 << 25, timeout: FF_TIMEOUT });
  return seg;
}

async function concatSegments(workdir, segs, outName) {
  await writeFile(join(workdir, 'list.txt'), segs.map((s) => `file '${s}'`).join('\n') + '\n');
  await run(FFMPEG, [
    '-y', '-f', 'concat', '-safe', '0', '-i', 'list.txt',
    '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k', outName,
  ], { cwd: workdir, maxBuffer: 1 << 25, timeout: FF_TIMEOUT });
}

// beats: [{ text, audioFile, videoFile|null, durationSec }]，文件名都相对 workdir
export async function composeOralVideo({ workdir, beats, outName = 'final.mp4' }) {
  await mkdir(workdir, { recursive: true });
  const list = Array.isArray(beats) ? beats.filter((b) => b && b.audioFile) : [];
  if (!list.length) throw new Error('compose_no_beats');
  const segs = [];
  for (let i = 0; i < list.length; i += 1) {
    segs.push(await buildSegment(workdir, list[i], i));
  }
  await concatSegments(workdir, segs, outName);
  return { outName, segments: segs.length };
}
