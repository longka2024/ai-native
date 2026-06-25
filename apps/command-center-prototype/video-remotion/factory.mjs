#!/usr/bin/env node
// ───────── Remotion 混剪工厂:批量出片 ─────────
// 用法: node factory.mjs <rows.json> [outDir]
//   rows.json = FactoryProps[](每行一条片,见 src/Factory.tsx 的 factorySchema)
// 思路:bundle 一次 → 循环 selectComposition(inputProps) + renderMedia(inputProps)
//   ⚠ 渲染是本机免费(只吃 CPU),不调任何付费 API。配音/配乐请预先放进 public/。

import { bundle } from "@remotion/bundler";
import { selectComposition, renderMedia } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const rowsPath = process.argv[2];
  const outDir = process.argv[3] || "G:/longka-demo/factory-out";
  if (!rowsPath || !fs.existsSync(rowsPath)) {
    console.error("用法: node factory.mjs <rows.json> [outDir]");
    process.exit(1);
  }

  const rows = JSON.parse(fs.readFileSync(rowsPath, "utf8"));
  if (!Array.isArray(rows) || rows.length === 0) {
    console.error("rows.json 必须是非空数组");
    process.exit(1);
  }
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`[工厂] 待出 ${rows.length} 条 → ${outDir}`);
  console.log("[工厂] 打包 bundle(一次)...");
  const t0 = Date.now();
  const serveUrl = await bundle({
    entryPoint: path.join(__dirname, "src", "index.ts"),
    webpackOverride: (c) => c,
  });
  console.log(`[工厂] bundle 完成 (${((Date.now() - t0) / 1000).toFixed(1)}s)`);

  const results = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = row.name || `mizan_${String(i + 1).padStart(2, "0")}`;
    const inputProps = { ...row };
    delete inputProps.name;
    const outPath = path.join(outDir, `${name}.mp4`);
    const ti = Date.now();
    try {
      const comp = await selectComposition({
        serveUrl,
        id: "Factory",
        inputProps,
      });
      // 时长以数据 durationSec 为准
      const durationInFrames = Math.round((inputProps.durationSec || 33) * comp.fps);
      await renderMedia({
        composition: { ...comp, durationInFrames },
        serveUrl,
        codec: "h264",
        outputLocation: outPath,
        inputProps,
        concurrency: 4,
        onProgress: ({ progress }) => {
          process.stdout.write(`\r[${i + 1}/${rows.length}] ${name} ${(progress * 100).toFixed(0)}%   `);
        },
      });
      console.log(`\r[${i + 1}/${rows.length}] ✅ ${name} (${((Date.now() - ti) / 1000).toFixed(1)}s)            `);
      results.push({ name, ok: true, path: outPath });
    } catch (err) {
      console.log(`\r[${i + 1}/${rows.length}] ❌ ${name}: ${err.message}`);
      results.push({ name, ok: false, error: err.message });
    }
  }

  const ok = results.filter((r) => r.ok).length;
  console.log(`\n[工厂] 完成 ${ok}/${rows.length} 条,总耗时 ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  fs.writeFileSync(path.join(outDir, "_manifest.json"), JSON.stringify(results, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
