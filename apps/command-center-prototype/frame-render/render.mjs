// frame-render/render.mjs — HTML 模板 → PNG 帧渲染器(内化自 Pixelle 思路,纯 Node)
// 用法: node render.mjs <template.html> <data.json 路径或内联JSON> <out.png> [width] [height]
// 依赖: 本应用已装的 playwright(chromium-1223),无需额外安装。
import { chromium } from "playwright";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function substitute(html, data) {
  // 占位符: {{name}} / {{name:type=default}}  —— 优先 data[name],其次默认值,再空串
  return html.replace(/\{\{([a-zA-Z_][\w]*)(?::[a-z]+)?(?:=([^}]*))?\}\}/g, (_m, key, def) => {
    const v = data[key];
    return v !== undefined && v !== null ? String(v) : (def !== undefined ? def : "");
  });
}

async function render({ templatePath, data, outPath, width, height }) {
  const tpl = fs.readFileSync(templatePath, "utf8");
  const html = substitute(tpl, data || {});
  // 写临时 html(用 file:// 打开,保证 @font-face / 本地图片等 file:// 资源可加载)
  const tmp = path.join(os.tmpdir(), `frame_${process.pid}_${Date.now()}.html`);
  fs.writeFileSync(tmp, html, "utf8");
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    const page = await browser.newPage({
      viewport: { width: Number(width) || 1080, height: Number(height) || 1920 },
      deviceScaleFactor: 1,
    });
    await page.goto("file://" + tmp, { waitUntil: "networkidle" });
    await page.screenshot({ path: outPath, type: "png", omitBackground: true });
  } finally {
    await browser.close();
    try { fs.unlinkSync(tmp); } catch {}
  }
}

// CLI
const [, , templatePath, dataArg, outPath, width, height] = process.argv;
if (!templatePath || !outPath) {
  console.error("usage: node render.mjs <template.html> <data.json|inlineJSON> <out.png> [w] [h]");
  process.exit(1);
}
let data = {};
if (dataArg) {
  try { data = fs.existsSync(dataArg) ? JSON.parse(fs.readFileSync(dataArg, "utf8")) : JSON.parse(dataArg); }
  catch (e) { console.error("bad data json:", e.message); process.exit(1); }
}
render({ templatePath, data, outPath, width, height })
  .then(() => console.log("OK", outPath))
  .catch((e) => { console.error("RENDER_FAIL", e.message); process.exit(1); });

export { render, substitute };
