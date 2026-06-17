// kie-video.mjs — Longka 视频片段走 Kie.ai 的视频模型(默认 bytedance/seedance-2)。
// 与 kie-image.mjs 完全同一套 jobs API(createTask → 轮询 recordInfo)。
// key 走 env KIE_API_KEY,绝不硬编码。模型可用 env KIE_VIDEO_MODEL 覆盖(seedance-2 / seedance-2-fast / seedance-1-5-pro 等)。

const JOBS_BASE = 'https://api.kie.ai/api/v1/jobs';
const videoJobs = new Map(); // jobId -> { jobId, status, platform, total, clips:[{page,taskId,url,state,error}], startedAt, updatedAt }

export function kieVideoEnabled() {
  return Boolean(process.env.KIE_API_KEY);
}

function authHeaders(extra = {}) {
  return { authorization: `Bearer ${process.env.KIE_API_KEY}`, ...extra };
}

// 竖屏优先(小红书/抖音/视频号),公众号横屏,朋友圈方形
function aspectForPlatform(platform) {
  if (platform === 'wechat-article') return process.env.KIE_VIDEO_ASPECT_WECHAT || '16:9';
  if (platform === 'moments') return process.env.KIE_VIDEO_ASPECT_MOMENTS || '1:1';
  return process.env.KIE_VIDEO_ASPECT_XHS || '9:16';
}

function parseResultUrls(resultJson) {
  try {
    const obj = typeof resultJson === 'string' ? JSON.parse(resultJson) : (resultJson || {});
    if (Array.isArray(obj.resultUrls)) return obj.resultUrls;
    if (Array.isArray(obj.urls)) return obj.urls;
    if (typeof obj.resultUrl === 'string') return [obj.resultUrl];
    if (typeof obj.videoUrl === 'string') return [obj.videoUrl];
    return [];
  } catch {
    return [];
  }
}

async function createVideoTask(input) {
  const response = await fetch(`${JOBS_BASE}/createTask`, {
    method: 'POST',
    headers: authHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify({
      model: process.env.KIE_VIDEO_MODEL || 'bytedance/seedance-2-fast', // 默认省钱档;贵的旗舰 seedance-2 需显式 env 指定
      input,
    }),
  });
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : {}; } catch { throw new Error(`kie_video_createTask_non_json_${response.status}: ${raw.slice(0, 200)}`); }
  if (!response.ok || (data.code && data.code !== 200) || !data?.data?.taskId) {
    throw new Error(data?.msg || `kie_video_createTask_http_${response.status}: ${raw.slice(0, 200)}`);
  }
  return data.data.taskId;
}

async function getTask(taskId) {
  const u = new URL(`${JOBS_BASE}/recordInfo`);
  u.searchParams.set('taskId', taskId);
  const response = await fetch(u, { method: 'GET', headers: authHeaders() });
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : {}; } catch { throw new Error(`kie_video_recordInfo_non_json_${response.status}`); }
  if (!response.ok) throw new Error(data?.msg || `kie_video_recordInfo_http_${response.status}`);
  return data.data || {};
}

// 启动:每个 clip 各建一个 Kie 视频任务(并行)。clip 可带 imageUrl(图生视频,作首帧)或纯 prompt(文生视频)。
export async function kieStartVideoJob(payload) {
  const platform = payload.platform || payload.targetPlatform || 'xhs';
  const aspect = payload.aspect || aspectForPlatform(platform);
  const resolution = payload.resolution || process.env.KIE_VIDEO_RESOLUTION || '480p'; // 默认最省档,需要高清显式传 720p/1080p
  const defaultDuration = Number(payload.duration || process.env.KIE_VIDEO_DURATION || 5);
  const clips = (Array.isArray(payload.clips) ? payload.clips : []).slice(0, 5);
  const rawId = String(payload.jobId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 72);
  const jobId = rawId || `longka-kievid-${Date.now()}`;
  const job = { jobId, status: 'running', platform, aspect, resolution, total: clips.length, clips: [], startedAt: Date.now(), updatedAt: Date.now() };

  job.clips = await Promise.all(clips.map(async (clip, index) => {
    const page = Number(clip.page || index + 1);
    const prompt = String(clip.prompt || clip.imagePrompt || clip.text || payload.prompt || '').slice(0, 20000);
    const duration = Math.min(15, Math.max(4, Number(clip.duration || defaultDuration)));
    const imageUrl = clip.imageUrl || clip.first_frame_url || '';
    const input = {
      prompt,
      aspect_ratio: aspect,
      resolution,
      duration,
      generate_audio: Boolean(clip.generateAudio || payload.generateAudio || false),
    };
    if (imageUrl) input.first_frame_url = imageUrl;
    const entry = { page, taskId: '', url: '', state: 'waiting', error: '' };
    try {
      entry.taskId = await createVideoTask(input);
      entry.state = 'generating';
    } catch (error) {
      entry.state = 'fail';
      entry.error = String(error.message || error).slice(0, 200);
    }
    return entry;
  }));

  if (job.clips.length && job.clips.every((c) => c.state === 'fail')) job.status = 'error';
  videoJobs.set(jobId, job);
  return job;
}

// 查询:轮询未完成的 clip 的 Kie 任务,回填 url / state。
export async function kieVideoJobStatus(jobId) {
  const job = videoJobs.get(jobId);
  if (!job) return null;
  await Promise.all(job.clips
    .filter((c) => c.taskId && !c.url && c.state !== 'fail')
    .map(async (c) => {
      try {
        const d = await getTask(c.taskId);
        c.state = d.state || c.state;
        if (d.state === 'success') {
          const urls = parseResultUrls(d.resultJson);
          if (urls[0]) c.url = urls[0];
        } else if (d.state === 'fail') {
          c.error = d.failMsg || 'kie_video_task_fail';
        }
      } catch {
        // 瞬时错误,保持 generating,下次再轮询
      }
    }));
  const done = job.clips.filter((c) => c.url).length;
  const failed = job.clips.filter((c) => c.state === 'fail').length;
  job.status = done >= job.total && job.total > 0 ? 'done' : (failed >= job.total && job.total > 0 ? 'error' : 'running');
  job.updatedAt = Date.now();
  return job;
}
