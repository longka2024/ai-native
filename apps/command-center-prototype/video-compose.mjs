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
const SUB_FONT = process.env.SUBTITLE_FONT || 'Noto Sans CJK SC'; // 粗黑体，比衬线好看
const SUB_COLOR = (process.env.SUBTITLE_COLOR || 'FFE34D').replace(/^#/, ''); // 默认抖音暖黄，RRGGBB
const PER_LINE = Number(process.env.SUBTITLE_PER_LINE || 12); // 每行最多字数
const MAX_LINES = 2; // 每条字幕最多两行
const VW = Number(process.env.VIDEO_W || 1080);
const VH = Number(process.env.VIDEO_H || 1920);
const FF_TIMEOUT = Number(process.env.FFMPEG_TIMEOUT_MS || 180000);

// RRGGBB → ASS &H00BBGGRR&
function assColor(rrggbb) {
  const r = rrggbb.slice(0, 2), g = rrggbb.slice(2, 4), b = rrggbb.slice(4, 6);
  return `&H00${b}${g}${r}&`.toUpperCase();
}

function srtTime(sec) {
  const ms = Math.max(0, Math.round(sec * 1000));
  const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
  const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
  const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
  const f = String(ms % 1000).padStart(3, '0');
  return `${h}:${m}:${s},${f}`;
}

// 把一条字幕折成最多两行（均衡）
function wrapTwoLines(t) {
  const s = String(t || '').replace(/\n/g, '').trim();
  if (s.length <= PER_LINE) return s;
  const mid = Math.ceil(s.length / 2);
  return `${s.slice(0, mid)}\n${s.slice(mid)}`;
}

// 把整段按标点拆成多条短字幕（每条 ≤ 2 行），不再一坨
function splitIntoCues(text) {
  const maxChars = PER_LINE * MAX_LINES;
  const parts = String(text || '').replace(/\s+/g, '').split(/(?<=[。！？，、；：!?,.])/).filter(Boolean);
  const cues = [];
  let cur = '';
  for (const p of parts) {
    if ((cur + p).length <= maxChars) {
      cur += p;
    } else {
      if (cur) cues.push(cur);
      if (p.length <= maxChars) {
        cur = p;
      } else {
        for (let i = 0; i < p.length; i += maxChars) cues.push(p.slice(i, i + maxChars));
        cur = '';
      }
    }
  }
  if (cur) cues.push(cur);
  return cues.length ? cues : [String(text || '').slice(0, maxChars)];
}

// 多条字幕按字数比例分配该段配音时长 → SRT
function buildSrt(text, durSec) {
  const cues = splitIntoCues(text);
  const totalChars = cues.reduce((s, c) => s + c.length, 0) || 1;
  let t = 0;
  return cues.map((c, i) => {
    const start = t;
    const end = i === cues.length - 1 ? durSec : Math.min(durSec, t + durSec * (c.length / totalChars));
    t = end;
    return `${i + 1}\n${srtTime(start)} --> ${srtTime(end)}\n${wrapTwoLines(c)}\n`;
  }).join('\n');
}

function subFilter(srtName) {
  // libass 默认脚本坐标 384x288，按视频高缩放：MarginV/FontSize 在 288 空间取值。
  const style = [
    `FontName=${SUB_FONT}`,
    'FontSize=15',
    'Bold=1',
    `PrimaryColour=${assColor(SUB_COLOR)}`,
    'OutlineColour=&H00000000&',
    'BorderStyle=1',
    'Outline=2',
    'Shadow=1',
    'Alignment=2',
    'MarginV=55',
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

// 成品合成:原视频(画面不动,直接copy)+ 配音(apad补静音到视频长)+ 可选BGM(循环·压低·混音)。
// videoFile/audioFile/bgmFile 都相对 workdir;durationSec=视频时长(秒)。
export async function finalizeFilm({ workdir, videoFile, audioFile, bgmFile = '', srtText = '', durationSec = 15, outName = 'film.mp4' }) {
  await mkdir(workdir, { recursive: true });
  const dur = Math.max(2, Number(durationSec) || 15);
  // 视频:有字幕则烧字幕(需重编码),否则直接 copy
  // tpad:把视频末帧定格延长到 dur(= 视频与旁白更长者),保证旁白说完不被切。
  let vmap, vcodec, fcV;
  if (String(srtText || '').trim()) {
    await writeFile(join(workdir, 'sub.srt'), buildSrt(srtText, dur));
    fcV = `[0:v]tpad=stop_mode=clone:stop_duration=60,${subFilter('sub.srt')}[v]`; vmap = '[v]';
    vcodec = ['-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-r', '30'];
  } else {
    fcV = '[0:v]tpad=stop_mode=clone:stop_duration=60[v]'; vmap = '[v]';
    vcodec = ['-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-r', '30'];
  }
  // 音频:配音补静音到视频长 + 可选 BGM(循环·压低·混音)
  const fcA = bgmFile
    ? '[1:a]apad[va];[2:a]volume=0.14[b];[va][b]amix=inputs=2:duration=longest:dropout_transition=0[a]'
    : '[1:a]apad[a]';
  const fc = fcV ? `${fcV};${fcA}` : fcA;
  const inputs = bgmFile
    ? ['-i', videoFile, '-i', audioFile, '-stream_loop', '-1', '-i', bgmFile]
    : ['-i', videoFile, '-i', audioFile];
  const args = ['-y', ...inputs, '-filter_complex', fc, '-map', vmap, '-map', '[a]',
    ...vcodec, '-c:a', 'aac', '-b:a', '160k', '-ar', '44100', '-t', String(dur), outName];
  await run(FFMPEG, args, { cwd: workdir, maxBuffer: 1 << 25, timeout: FF_TIMEOUT });
  return { outName };
}
