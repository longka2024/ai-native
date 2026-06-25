// frame-render/render-koubo.mjs — 把口播视频套上 HTML 逐字高亮字幕(卡拉OK),纯本地零花费
// 用法: node render-koubo.mjs <video.mp4> <text.txt(utf8)> <out.mp4>
// 字幕时间按字均分(近似同步);真·分秒不差需 Whisper 词级时间戳(以后补)。
import { chromium } from "playwright";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const [, , VIDEO, TEXTFILE, OUT] = process.argv;
const FONT_B64 = fs.readFileSync("/home/ubuntu/.fonts/ZCOOLKuaiLe.ttf").toString("base64");
const WORK = "/tmp/kf";
const LOG = "/tmp/koubo-html.log";
const log = (m) => fs.appendFileSync(LOG, m + "\n");
fs.writeFileSync(LOG, "");
fs.rmSync(WORK, { recursive: true, force: true });
fs.mkdirSync(WORK, { recursive: true });

// 1) 视频时长
const dur = Number(
  execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nk=1:nw=1", VIDEO])
    .toString().trim()
) || 19.4;
log("dur " + dur);

// 2) 文案 → 行(去所有标点,每行<=11字 → 一行显示)
const raw = fs.readFileSync(TEXTFILE, "utf8").trim();
const PUNC = /[。，,、；;！!？?\s—…·\.]/g;
const parts = raw.split(/(?<=[。，,；;！!？?])/).map((s) => s.replace(PUNC, "")).filter(Boolean);
const lines = [];
let cur = "";
for (const p of parts) {
  if ((cur + p).length <= 11) cur += p;
  else { if (cur) lines.push(cur); cur = p; }
}
if (cur) lines.push(cur);
const totalChars = lines.reduce((a, l) => a + l.length, 0) || 1;
log("lines " + JSON.stringify(lines));

// 3) 逐字帧时间表
const frames = []; // {png, dur, done, pending}
let t = 0;
for (let li = 0; li < lines.length; li++) {
  const line = lines[li];
  const lineDur = (li === lines.length - 1) ? (dur - t) : dur * line.length / totalChars;
  const step = lineDur / line.length;
  for (let k = 1; k <= line.length; k++) {
    frames.push({ done: line.slice(0, k), pending: line.slice(k), dur: step });
  }
  t += lineDur;
}
log("frames " + frames.length);

const tpl = (done, pending) => `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><style>
@font-face{font-family:'ZCOOL';src:url(data:font/ttf;base64,${FONT_B64});}
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:1080px;height:1920px;background:transparent;overflow:hidden;}
.wrap{position:absolute;left:0;right:0;bottom:540px;padding:0 70px;text-align:center;}
.line{font-family:'ZCOOL';font-size:80px;line-height:1.35;letter-spacing:1px;text-shadow:0 5px 12px rgba(0,0,0,.45);}
.line span{-webkit-text-stroke:7px #ff7814;paint-order:stroke fill;}
.done{color:#fff;}.pending{color:#ff7814;}
</style></head><body><div class="wrap"><div class="line"><span class="done">${done}</span><span class="pending">${pending}</span></div></div></body></html>`;

// 4) 一次启浏览器,渲染所有帧
const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
for (let i = 0; i < frames.length; i++) {
  await page.setContent(tpl(frames[i].done, frames[i].pending), { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const png = path.join(WORK, `f${String(i).padStart(4, "0")}.png`);
  await page.screenshot({ path: png, type: "png", omitBackground: true });
  frames[i].png = png;
  if (i % 10 === 0) log("rendered " + i);
}
await browser.close();
log("render done");

// 5) concat 列表(每帧带时长,末帧重复一次)
let list = "ffconcat version 1.0\n";
for (const f of frames) list += `file '${f.png}'\nduration ${f.dur.toFixed(3)}\n`;
list += `file '${frames[frames.length - 1].png}'\n`;
const listPath = path.join(WORK, "list.txt");
fs.writeFileSync(listPath, list);

// 6) ffmpeg:字幕帧序列(alpha)叠到视频上
const fc = "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[bg];" +
           "[1:v]setpts=PTS-STARTPTS,format=rgba[ov];[bg][ov]overlay=0:0:shortest=1[v]";
const r = spawnSync("ffmpeg", ["-y", "-i", VIDEO, "-f", "concat", "-safe", "0", "-i", listPath,
  "-filter_complex", fc, "-map", "[v]", "-map", "0:a",
  "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-c:a", "aac", OUT],
  { encoding: "utf8" });
log("ffmpeg rc " + r.status + (r.status ? " " + (r.stderr || "").slice(-300) : " OK " + OUT));
log("DONE");
