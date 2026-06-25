// kie-image.mjs — Longka 配图走 Kie.ai 的 gpt-image-2-text-to-image。
// 122 只负责"调用 Kie 的 API"，真正出图在 Kie 那边（便宜、配图不需要高质量）。
// 与 43 的 CLI gpt-image-2（高级报告卡）完全独立。key 走 env KIE_API_KEY，绝不硬编码。

const JOBS_BASE = 'https://api.kie.ai/api/v1/jobs';
const jobs = new Map(); // jobId -> { jobId, status, style, platform, total, cards:[{page,taskId,url,state,error}], startedAt, updatedAt }

export function kieEnabled() {
  return Boolean(process.env.KIE_API_KEY);
}

function authHeaders(extra = {}) {
  return { authorization: `Bearer ${process.env.KIE_API_KEY}`, ...extra };
}

function aspectForPlatform(platform) {
  if (platform === 'wechat-article') return process.env.KIE_ASPECT_WECHAT || '3:2';
  if (platform === 'moments') return process.env.KIE_ASPECT_MOMENTS || '1:1';
  return process.env.KIE_ASPECT_XHS || '2:3'; // xhs / douyin 竖图
}

function parseResultUrls(resultJson) {
  try {
    const obj = typeof resultJson === 'string' ? JSON.parse(resultJson) : (resultJson || {});
    if (Array.isArray(obj.resultUrls)) return obj.resultUrls;
    if (Array.isArray(obj.urls)) return obj.urls;
    return [];
  } catch {
    return [];
  }
}

async function createTask(prompt, aspectRatio, referenceImageUrl) {
  // 有真实参考图 → 用图生图/编辑模型（按参考图出，更对版）；没有 → 纯文生图（原行为）
  const hasRef = referenceImageUrl && /^https?:\/\//i.test(referenceImageUrl);
  // 图生图/编辑用 nano-banana-edit(Gemini 图像编辑,角色一致性强;seedream/4.5-edit 已挂 422/500)
  const model = hasRef
    ? (process.env.KIE_IMAGE_EDIT_MODEL || 'google/nano-banana-edit')
    : (process.env.KIE_IMAGE_MODEL || 'gpt-image-2-text-to-image');
  const input = hasRef
    ? { prompt, image_urls: [referenceImageUrl] } // nano-banana-edit 跟随参考图比例,不收 aspect_ratio
    : { prompt, aspect_ratio: aspectRatio };
  const response = await fetch(`${JOBS_BASE}/createTask`, {
    method: 'POST',
    headers: authHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify({ model, input }),
  });
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : {}; } catch { throw new Error(`kie_createTask_non_json_${response.status}: ${raw.slice(0, 200)}`); }
  if (!response.ok || (data.code && data.code !== 200) || !data?.data?.taskId) {
    throw new Error(data?.msg || `kie_createTask_http_${response.status}: ${raw.slice(0, 200)}`);
  }
  return data.data.taskId;
}

async function getTask(taskId) {
  const u = new URL(`${JOBS_BASE}/recordInfo`);
  u.searchParams.set('taskId', taskId);
  const response = await fetch(u, { method: 'GET', headers: authHeaders() });
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : {}; } catch { throw new Error(`kie_recordInfo_non_json_${response.status}`); }
  if (!response.ok) throw new Error(data?.msg || `kie_recordInfo_http_${response.status}`);
  return data.data || {};
}

// 启动任务：每张卡用前端拼好的 imagePrompt 各建一个 Kie 任务（并行），存任务表。
export async function kieStartXiaoheiJob(payload) {
  const style = payload.style || payload.visualStyle || 'xiaohei-metaphor';
  const platform = payload.platform || payload.targetPlatform || 'xhs';
  const aspect = aspectForPlatform(platform);
  const maxCards = Math.min(Math.max(Number(payload.maxCards) || 5, 1), 12); // 图文卡默认 5；视频关键帧传 maxCards 放开（上限 12 防跑飞）
  const cards = (Array.isArray(payload.cards) ? payload.cards : []).slice(0, maxCards);
  const rawId = String(payload.jobId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 72);
  const jobId = rawId || `longka-kie-${style}-${Date.now()}`;
  const job = { jobId, status: 'running', style, platform, total: cards.length, cards: [], startedAt: Date.now(), updatedAt: Date.now(), payload, fb43JobId: '' };

  job.cards = await Promise.all(cards.map(async (card, index) => {
    const page = Number(card.page || index + 1);
    const prompt = String(card.imagePrompt || card.visualBrief || card.text || payload.title || '').slice(0, 4000);
    const referenceImageUrl = card.referenceImageUrl || payload.referenceImageUrl || '';
    const entry = { page, taskId: '', url: '', state: 'waiting', error: '' };
    try {
      entry.taskId = await createTask(prompt, aspect, referenceImageUrl);
      entry.state = 'generating';
    } catch (error) {
      entry.state = 'fail';
      entry.error = String(error.message || error).slice(0, 200);
    }
    return entry;
  }));

  if (job.cards.every((c) => c.state === 'fail')) job.status = 'error';
  jobs.set(jobId, job);
  return job;
}

// 单张同步生成：建任务 → 轮询到出图 → 返回图 URL。用于杂志海报打法"自己出无字底图"。
export async function kieGenerateOne(prompt, aspect = '2:3', referenceImageUrl = '') {
  const taskId = await createTask(String(prompt || '').slice(0, 4000), aspect, referenceImageUrl);
  for (let i = 0; i < 50; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    let d;
    try { d = await getTask(taskId); } catch { continue; } // 瞬时错误重试
    if (d.state === 'success') { const urls = parseResultUrls(d.resultJson); if (urls[0]) return urls[0]; }
    if (d.state === 'fail') throw new Error(d.failMsg || 'kie_task_fail');
  }
  throw new Error('kie_timeout');
}

// 查询：轮询尚未完成的卡的 Kie 任务，回填 url / state。
export async function kieXiaoheiJobStatus(jobId) {
  const job = jobs.get(jobId);
  if (!job) return null;
  await Promise.all(job.cards
    .filter((c) => c.taskId && !c.url && c.state !== 'fail')
    .map(async (c) => {
      try {
        const d = await getTask(c.taskId);
        c.state = d.state || c.state;
        if (d.state === 'success') {
          const urls = parseResultUrls(d.resultJson);
          if (urls[0]) c.url = urls[0];
        } else if (d.state === 'fail') {
          c.error = d.failMsg || 'kie_task_fail';
        }
      } catch {
        // 瞬时错误，保持 generating，下次再轮询
      }
    }));
  const done = job.cards.filter((c) => c.url).length;
  const failed = job.cards.filter((c) => c.state === 'fail').length;
  job.status = done >= job.total && job.total > 0 ? 'done' : (failed >= job.total && job.total > 0 ? 'error' : 'running');
  job.updatedAt = Date.now();
  return job;
}
