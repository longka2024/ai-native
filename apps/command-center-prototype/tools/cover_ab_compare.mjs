// 一次性 A/B:同钩子同风格,老 prompt(无波妞方法) vs 新 prompt(模板矩阵+Universal契约)。Kie gpt-image-2。
import { writeFile } from "fs/promises";
const KEY = process.env.KIE_API_KEY;
if (!KEY) { console.log("NO_KEY"); process.exit(1); }
const OUT = "/home/ubuntu/ai-native-command-center-v2/media/persona";

const GUIDE = {
  number: "Cover template = NUMBER: pull the ONE key number from the hook and make it the dominant anchor (about 35-45% of the height) in the upper/center; the rest of the hook is one or two short lines under the number.",
  emotion: "Cover template = EMOTION: anchor is an authentic cinematic portrait or warm lifestyle scene in the lower two-thirds; one short emotional headline overlays the top third or a warm color band; keep it real, not a stock-photo selfie.",
  screenshot: "Cover template = SCREENSHOT/PROOF: anchor is a believable notebook/checklist/result panel in the lower ~60% with a few hand-drawn red circles or arrows on the key spots; big bold headline on top. Do NOT fabricate dense unreadable UI or invent numbers.",
  comparison: "Cover template = BEFORE/AFTER: split left 'before' (dull, heavy) vs right 'after' (clean, bright, lighter) with a big VS as the center anchor; bold headline on top.",
};
const CONTRACT = [
  "Cover quality contract (HIGHEST priority):",
  "3-level text hierarchy — the hook headline dominates (~60-75% of text weight), an optional short support line is secondary (~20-30%), a small category tag is least (~5-10%); never let the tag outshine the headline.",
  "Placement — headline in the TOP THIRD, the single visual anchor at center / lower-center, optional tiny tag at the upper-left; keep fewer than 3 text regions.",
  "80px thumbnail test — the headline and the one anchor MUST stay readable when the whole cover is shrunk to ~80px wide; if unsure, enlarge the headline and thicken the strokes.",
  "Contrast — headline vs background at least 4.5:1 (aim higher); no pale low-contrast text.",
  "Chinese must be crisp, large and correctly written; no garbled characters, no tiny paragraphs, no explanatory blocks.",
  "Numbers / metrics / revenue ONLY if present in the copy — never invent them.",
  "No watermark, no author signature, no logo, no '@' handle, no QR code.",
].join(" ");

const oldP = (style, hook, topic) =>
  `Create a 3:4 vertical Xiaohongshu cover poster, 1080x1440 style. ${style}. This is the cover image. The dominant element is one oversized bold Chinese hook title "${hook}". One single strong focal subject representing "${topic}". Clear visual hierarchy, generous negative space, single focal point, not a multi-panel layout, not a content list page.`;
const newP = (style, hook, topic, type) => `${oldP(style, hook, topic)} ${GUIDE[type]} ${CONTRACT}`;

const STYLE_A = "Style: clean modern editorial illustration cover for a women's-growth account, soft warm palette, tasteful coral/cream color blocks on a clean base, simple shapes";
const STYLE_B = "Style: warm soft cinematic cover for a women's-growth account, cozy reflective lifestyle mood, gentle low-saturation palette, soft natural light";

const STYLE_C = "Style: clean modern illustration cover for a women's-growth account, a realistic notebook / habit-tracker checklist as a prop, soft warm palette, tasteful red accent marks";
const STYLE_D = "Style: warm illustration cover for a women's-growth account, before/after split composition, soft palette, clear left-vs-right contrast";

const jobs = [
  { name: "cmp_5_screenshot", prompt: newP(STYLE_C, "30天自律打卡", "女性成长·习惯打卡记录", "screenshot") },
  { name: "cmp_6_compare", prompt: newP(STYLE_D, "内耗的我 VS 现在", "女性成长·改变前后对比", "comparison") },
];

async function createTask(prompt) {
  const r = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
    method: "POST", headers: { authorization: `Bearer ${KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ model: "gpt-image-2-text-to-image", input: { prompt, aspect_ratio: "3:4" } }),
  });
  const d = await r.json(); if (!d?.data?.taskId) throw new Error(d?.msg || "createTask fail");
  return d.data.taskId;
}
async function getTask(id) {
  const r = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${id}`, { headers: { authorization: `Bearer ${KEY}` } });
  const d = await r.json(); return d.data || {};
}

for (const j of jobs) { try { j.taskId = await createTask(j.prompt); } catch (e) { j.err = String(e.message); } }
for (let i = 0; i < 40; i++) {
  await new Promise((r) => setTimeout(r, 5000));
  let pending = 0;
  for (const j of jobs) {
    if (j.url || j.err || !j.taskId) continue;
    try { const d = await getTask(j.taskId);
      if (d.state === "success") { const u = (JSON.parse(d.resultJson || "{}").resultUrls || [])[0]; if (u) j.url = u; }
      else if (d.state === "fail") j.err = d.failMsg || "fail"; else pending++;
    } catch { pending++; }
  }
  if (!pending) break;
}
for (const j of jobs) {
  if (j.url) { const b = Buffer.from(await (await fetch(j.url)).arrayBuffer()); await writeFile(`${OUT}/${j.name}.png`, b); }
  console.log(j.name, j.url ? "OK" : ("ERR:" + (j.err || "timeout")));
}
