// broll-pexels.mjs — 按内容关键词从 Pexels 抓竖屏空镜(说什么配什么)。
// 中文分镜 → DeepSeek 转英文画面词 → Pexels 竖屏搜 → 随机选(避免固化)→ 下载。
// key 走 env PEXELS_API_KEY / DEEPSEEK_*,绝不硬编码。122 能直连 Pexels(慢但通)。

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// env 必须在「调用时」读,不能在模块顶层读 —— server.mjs 的 import 被提升到 .env 加载器之前执行,
// 顶层读会拿到空值(踩过坑:pexelsEnabled 一直 false)。
const pexelsKey = () => process.env.PEXELS_API_KEY || '';
const dsKey = () => process.env.DEEPSEEK_API_KEY || '';
const dsBase = () => (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '');
const dsModel = () => process.env.BROLL_TRANSLATE_MODEL || process.env.COPY_MODEL || 'deepseek-chat';

export function pexelsEnabled() { return Boolean(pexelsKey()); }

// 中文分镜文案 → 每段一个 2-4 词英文空镜搜索词(具体可视场景,不要抽象)
export async function translateToBrollQueries(texts = []) {
  if (!dsKey() || !texts.length) return texts.map(() => '');
  const list = texts.map((t, i) => `${i + 1}. ${String(t || '').slice(0, 80)}`).join('\n');
  const sys = 'You convert Chinese short-video narration lines into English stock-video B-roll search queries. For each numbered line output a 2-4 word CONCRETE VISUAL scene that fits the line and exists as stock footage (people/actions/objects/places, never abstract concepts). Return ONLY a JSON array of strings, same length and order as the input lines.';
  try {
    const r = await fetch(`${dsBase()}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${dsKey()}` },
      body: JSON.stringify({ model: dsModel(), messages: [{ role: 'system', content: sys }, { role: 'user', content: list }], max_tokens: 500, temperature: 0.3, thinking: { type: 'disabled' } }),
    });
    if (!r.ok) return texts.map(() => '');
    const j = await r.json();
    const txt = j.choices?.[0]?.message?.content || '';
    const m = txt.match(/\[[\s\S]*\]/);
    const arr = m ? JSON.parse(m[0]) : [];
    return texts.map((_, i) => String(arr[i] || '').trim());
  } catch { return texts.map(() => ''); }
}

// Pexels 横屏静图搜索 → 返回一张 large 图 URL(给「知识海报」做线条化/虚化背景,直接喂渲染,不下载)。
// 必带 User-Agent(否则 Pexels 403)。query 给英文实景词(campus / library / laboratory…)。
export async function fetchPexelsPhotoUrl(query, { orientation = 'landscape', pick = 0 } = {}) {
  if (!pexelsKey() || !query) return '';
  try {
    const u = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=${orientation}&per_page=8`;
    const r = await fetch(u, {
      headers: { authorization: pexelsKey(), 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return '';
    const j = await r.json();
    const photos = j.photos || [];
    if (!photos.length) return '';
    const p = photos[Math.min(pick, photos.length - 1)] || photos[0];
    return p.src?.large || p.src?.landscape || p.src?.original || '';
  } catch { return ''; }
}

// Pexels 竖屏搜索 → 随机选一条(避开 usedIds,防固化)→ 下载到 workdir → 返回相对文件名
export async function fetchPexelsClip(query, workdir, idx, usedIds) {
  if (!pexelsKey() || !query) return null;
  try {
    const u = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&orientation=portrait&size=medium&per_page=15`;
    const r = await fetch(u, { headers: { authorization: pexelsKey() }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) return null;
    const j = await r.json();
    let vids = (j.videos || []).filter((v) => Number(v.duration) >= 3 && Number(v.duration) <= 45 && !usedIds.has(v.id));
    if (!vids.length) vids = (j.videos || []).filter((v) => !usedIds.has(v.id));
    if (!vids.length) return null;
    const v = vids[Math.floor(Math.random() * Math.min(vids.length, 12))]; // 前12随机,避免固化
    usedIds.add(v.id);
    const portrait = (v.video_files || []).filter((f) => /mp4/i.test(f.file_type || '') && f.height >= 1280 && f.width < f.height).sort((a, b) => a.height - b.height);
    const pick = portrait[0] || (v.video_files || []).find((f) => /mp4/i.test(f.file_type || ''));
    if (!pick?.link) return null;
    const resp = await fetch(pick.link, { signal: AbortSignal.timeout(40000) });
    if (!resp.ok) return null;
    const buf = Buffer.from(await resp.arrayBuffer());
    if (buf.length < 5000) return null;
    const name = `broll_${idx}.mp4`;
    await writeFile(join(workdir, name), buf);
    return name;
  } catch { return null; }
}
