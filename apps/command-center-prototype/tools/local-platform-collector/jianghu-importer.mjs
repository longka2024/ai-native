#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

function argValue(name, fallback = '') {
  const index = process.argv.indexOf(name);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  const prefix = `${name}=`;
  const item = process.argv.find((arg) => arg.startsWith(prefix));
  return item ? item.slice(prefix.length) : fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function asText(value) {
  return String(value ?? '').trim();
}

function asNumber(value) {
  const text = asText(value).replace(/,/g, '');
  const n = Number(text);
  return Number.isFinite(n) ? n : 0;
}

function compactText(parts = []) {
  return parts.map(asText).filter(Boolean).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function normalizePlatform(value) {
  const text = asText(value).toLowerCase();
  if (text === 'xhs' || text.includes('xiaohongshu') || text.includes('小红书')) return 'xiaohongshu';
  if (text.includes('douyin') || text.includes('抖音') || text === 'dy') return 'douyin';
  if (text.includes('kuaishou') || text.includes('快手') || text === 'ks') return 'kuaishou';
  return text || 'xiaohongshu';
}

function parseJianghuFile(raw) {
  const text = raw.replace(/^\uFEFF/, '').trim();
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error('Jianghu export must be a JSON array.');
  return parsed;
}

function itemType(item = {}) {
  const type = asText(item.GetArtworkType || item.ArtworkType);
  if (type.includes('视频') || item.VideoDownUrl) return 'video';
  if (type.includes('图文') || Array.isArray(item.ListGraphicImgDownUrl)) return 'image_post';
  return 'post';
}

function jianghuItemToSample(item = {}, context = {}) {
  const title = asText(item.Title);
  const desc = asText(item.Desc);
  const topics = asText(item.TopicContent);
  const body = compactText([
    desc && desc !== title ? desc : '',
    topics ? `话题：${topics}` : '',
  ]) || title;
  const imageUrls = Array.isArray(item.ListGraphicImgDownUrl) ? item.ListGraphicImgDownUrl.map(asText).filter(Boolean) : [];
  const videoUrls = [
    asText(item.VideoDownUrl),
    ...(Array.isArray(item.ListGraphicVideoDownUrl) ? item.ListGraphicVideoDownUrl.map(asText) : []),
  ].filter(Boolean);
  const sourceId = asText(item.ArtworkId || item.video_id || item.ArtworkUrl || `${context.platform}-${item.Ordinal || Date.now()}`);
  return {
    sourceId,
    sourceUrl: asText(item.ArtworkUrl),
    authorName: asText(item.AuthorName),
    authorId: asText(item.AuthorSecUid || item.AuthorUid),
    title,
    body,
    publishedAt: asText(item.PublishTime) || null,
    language: 'zh',
    sourceType: asText(item.GetExtractType) || 'jianghu_export',
    collectorType: 'jianghu_toolbox',
    labelType: context.labelType || 'radar_seed',
    keyword: asText(item.SearchKeyword || context.query),
    metrics: {
      likes: asNumber(item.RealLikeCount),
      comments: asNumber(item.CommentCount),
      collects: asNumber(item.CollectCount),
      shares: asNumber(item.ShareCount),
      plays: asNumber(item.PlayCount),
      followers: asNumber(item.AuthorFollowerCount),
      durationSeconds: asNumber(item.DurationSeconds),
    },
    comments: [],
    rawJson: {
      ...item,
      longkaMedia: {
        type: itemType(item),
        imageUrls,
        imageSizes: Array.isArray(item.ListGraphicImgSize) ? item.ListGraphicImgSize : [],
        videoUrls,
        coverUrl: asText(item.CoverUrl),
        topicContent: topics,
      },
    },
  };
}

function buildBatch(items = [], options = {}) {
  const platform = normalizePlatform(options.platform || 'xiaohongshu');
  const batchName = options.batchName || `${platform} jianghu ${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}`;
  const query = options.query || inferQuery(items);
  return {
    platform,
    batchName,
    operator: options.operator || 'xiaomei',
    deviceName: options.deviceName || '',
    sourceMode: 'jianghu-toolbox-export',
    collectorType: 'jianghu_toolbox',
    sourceType: 'jianghu_export',
    labelType: options.labelType || 'radar_seed',
    query,
    samples: items.map((item) => jianghuItemToSample(item, { platform, query, labelType: options.labelType || 'radar_seed' })),
  };
}

function inferQuery(items = []) {
  const first = items.find((item) => asText(item.SearchKeyword)) || items[0] || {};
  return asText(first.SearchKeyword || first.AuthorName || first.TopicContent || 'jianghu-export');
}

function previewBatch(batch) {
  const samples = batch.samples || [];
  const top = samples.slice(0, 5).map((sample) => ({
    sourceId: sample.sourceId,
    authorName: sample.authorName,
    title: sample.title,
    likes: sample.metrics.likes,
    comments: sample.metrics.comments,
    collects: sample.metrics.collects,
    shares: sample.metrics.shares,
    sourceUrl: sample.sourceUrl,
  }));
  return {
    ok: true,
    mode: 'dry-run',
    platform: batch.platform,
    batchName: batch.batchName,
    query: batch.query,
    total: samples.length,
    top,
  };
}

async function uploadBatch(batch, base) {
  const endpoint = `${base.replace(/\/$/, '')}/api/collectors/local-platform/import-batch`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(batch),
  });
  const text = await response.text();
  let result;
  try {
    result = JSON.parse(text);
  } catch {
    result = { ok: false, error: 'non_json_response', detail: text.slice(0, 500) };
  }
  if (!response.ok || !result.ok) {
    throw new Error(JSON.stringify(result));
  }
  return result;
}

const file = argValue('--file');
if (!file) {
  console.error('Usage: node jianghu-importer.mjs --file jianghu.txt [--dry-run] [--upload] [--base http://122.51.218.154/ai-native-v2]');
  process.exit(2);
}

const base = argValue('--base', process.env.LONGKA_122_BASE_URL || 'http://122.51.218.154/ai-native-v2');
const output = argValue('--output');
const raw = await readFile(resolve(file), 'utf8');
const items = parseJianghuFile(raw);
const batch = buildBatch(items, {
  platform: argValue('--platform', 'xiaohongshu'),
  batchName: argValue('--batch-name', basename(file, '.txt')),
  operator: argValue('--operator', 'xiaomei'),
  deviceName: argValue('--device-name', ''),
  query: argValue('--query', ''),
  labelType: argValue('--label-type', 'radar_seed'),
});

if (output) {
  await writeFile(resolve(output), `${JSON.stringify(batch, null, 2)}\n`, 'utf8');
}

if (hasFlag('--upload')) {
  const result = await uploadBatch(batch, base);
  console.log(JSON.stringify({
    ok: true,
    uploaded: true,
    platform: result.platform,
    runId: result.run?.id,
    totalSampleCount: result.totalSampleCount,
    message: result.message,
  }, null, 2));
} else {
  console.log(JSON.stringify(previewBatch(batch), null, 2));
}
