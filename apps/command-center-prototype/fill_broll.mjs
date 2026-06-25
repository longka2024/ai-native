// fill_broll.mjs — 内容工厂管线·画面增强层:把"通用概念"beat 的画面换成 Pexels 空镜(说什么配什么、海量不重复);
// mizan 自己的场景(海外仓等)保留真实素材,绝不拿别人画面冒充。
// 解决:assets.db 真实素材只 65 条、跨视频反复挑 → "老画面"。
// 接进管线: matcher → (build_voice 出 final.json) → fill_broll → render
// 用法: PEXELS_API_KEY=.. DEEPSEEK_API_KEY=.. node fill_broll.mjs <script.json> <public_dir>
import { readFile, writeFile } from 'node:fs/promises';
import { translateToBrollQueries, fetchPexelsClip, pexelsEnabled } from './broll-pexels.mjs';

const SCRIPT = process.argv[2];
const PUBLIC = process.argv[3];
// 这些场景是 mizan 自己的、必须真实(讲"我们的海外仓"配别人仓库=冒充)→ 保留 assets.db 真实素材
const REAL_KEEP = /海外仓|自营仓/;

if (!SCRIPT || !PUBLIC) { console.error('用法: node fill_broll.mjs <script.json> <public_dir>'); process.exit(1); }
if (!pexelsEnabled()) { console.error('PEXELS_API_KEY 未设,无法拉空镜'); process.exit(1); }

const spec = JSON.parse(await readFile(SCRIPT, 'utf8'));
const beats = spec.beats || [];
const generic = beats.map((b, i) => ({ b, i }))
  .filter(({ b }) => !REAL_KEEP.test((b.text || '') + (b.hl || []).join('')));
console.log(`共 ${beats.length} 拍:通用 ${generic.length} 拍走 Pexels(说什么配什么),真实场景 ${beats.length - generic.length} 拍保留真实素材`);

// 中文文案 → 英文画面词(DeepSeek)
const queries = await translateToBrollQueries(generic.map(({ b }) => b.text));
const usedIds = new Set();   // 跨 beat 去重,杜绝"老画面"
let ok = 0;
for (let k = 0; k < generic.length; k++) {
  const { b, i } = generic[k];
  const q = queries[k];
  if (!q) { console.log(`  [${i}] 无画面词,保留真实 ${b.clip}`); continue; }
  const name = await fetchPexelsClip(q, PUBLIC, i, usedIds);
  if (name) { b.clip = name; ok++; console.log(`  [${i}] 「${(b.text || '').slice(0, 14)}」→ ${q} → ${name}`); }
  else console.log(`  [${i}] 「${q}」Pexels 无果,保留真实 ${b.clip}`);
}
await writeFile(SCRIPT, JSON.stringify(spec, null, 2));
console.log(`\n完成:${ok}/${generic.length} 拍换成 Pexels 新空镜 → 写回 ${SCRIPT}`);
