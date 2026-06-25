// vision-judge.mjs — 封面视觉质检:用智谱 GLM-5V 看图打分(信息密度/锚点/缩略图可读/对比度/文对题)。
// key 走 env ZHIPU_API_KEY,绝不硬编码。模型默认 glm-5v-turbo,可用 ZHIPU_VISION_MODEL 覆盖。
const ZHIPU_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

export function visionJudgeEnabled() {
  return Boolean(process.env.ZHIPU_API_KEY);
}

function extractJson(s) {
  try {
    const txt = String(s || '');
    const a = txt.indexOf('{');
    const b = txt.lastIndexOf('}');
    if (a < 0 || b <= a) return null;
    return JSON.parse(txt.slice(a, b + 1));
  } catch { return null; }
}

const clamp10 = (x) => Math.max(0, Math.min(10, Math.round(Number(x) || 0)));

// 判一张图。mode='cover'(封面:锚点/缩略图/对题) 或 'inner'(内页配图:对题/清晰)。
// 返回 {ok, pass, fix, summary, ...scores}。summary 是给前端直接显示的短串。
export async function judgeCover({ imageUrl, hook = '', topic = '', mode = 'cover' } = {}) {
  if (!process.env.ZHIPU_API_KEY) return { ok: false, error: 'zhipu_off' };
  if (!/^https?:\/\//.test(String(imageUrl || ''))) return { ok: false, error: 'bad_image_url' };
  const model = process.env.ZHIPU_VISION_MODEL || 'glm-5v-turbo';
  const prompt = mode === 'inner'
    ? `你是严格的小红书内页配图质检员。这张图配合正文,主题「${topic || hook}」。只返回 JSON,不要多余文字:`
      + `{"ontopic":图是否贴合正文主题不跑题不编数字1-10,"clarity":画面是否干净清晰可读不堆砌1-10,`
      + `"pass":true或false,"fix":"一句话最该改的,合格写 无"}。跑题/编数字/堆砌杂乱 都要扣到6分以下。`
    : `你是严格的小红书封面质检员。看这张封面,只返回 JSON,不要任何多余文字:`
      + `{"density":信息密度1-10,"anchor":视觉锚点强度1-10,"thumbnail":缩略到80px后标题/主体是否还看得清1-10,`
      + `"contrast":文字与背景对比度1-10,"ontopic":大标题是否=钩子「${hook}」且贴合主题不跑题不编数字1-10,`
      + `"pass":true或false,"fix":"一句话最该改的,合格就写 无"}。锚点不突出/缩略图糊/跑题/编数字 都要扣到6分以下。主题:${topic || hook}。`;
  try {
    const r = await fetch(ZHIPU_URL, {
      method: 'POST',
      headers: { authorization: `Bearer ${process.env.ZHIPU_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model, temperature: 0.2,
        messages: [{ role: 'user', content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl } },
        ] }],
      }),
    });
    const d = await r.json().catch(() => ({}));
    const content = d?.choices?.[0]?.message?.content || '';
    const j = extractJson(content);
    if (!j) return { ok: false, error: 'parse_fail', raw: String(content).slice(0, 200) };
    const fix = String(j.fix || '').trim().slice(0, 80);
    if (mode === 'inner') {
      const ontopic = clamp10(j.ontopic), clarity = clamp10(j.clarity);
      const pass = ontopic >= 7 && clarity >= 6;
      return { ok: true, model, mode, ontopic, clarity, pass, fix, summary: `对题${ontopic} 清晰${clarity}` };
    }
    const scores = {
      density: clamp10(j.density), anchor: clamp10(j.anchor), thumbnail: clamp10(j.thumbnail),
      contrast: clamp10(j.contrast), ontopic: clamp10(j.ontopic),
    };
    const pass = scores.anchor >= 6 && scores.thumbnail >= 6 && scores.ontopic >= 7;
    return { ok: true, model, mode, ...scores, pass, fix, summary: `锚点${scores.anchor} 缩图${scores.thumbnail} 对题${scores.ontopic}` };
  } catch (e) {
    return { ok: false, error: 'judge_failed', message: String(e.message || e).slice(0, 200) };
  }
}
