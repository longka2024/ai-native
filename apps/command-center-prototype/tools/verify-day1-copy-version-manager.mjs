import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const js = fs.readFileSync(path.join(root, 'workbench-v2-clean.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'workbench-v2-clean.css'), 'utf8');

const requiredJs = [
  'currentCopyVersionId',
  'confirmedCopyVersionId',
  'currentDraft:',
  'pendingRevision',
  'currentCopySnapshot',
  'restoreCopyVersion',
  'data-copy-restore',
  'data-copy-confirm',
];

const requiredCss = [
  '.copy-version-item',
  '.copy-version-actions',
  '.copy-version-item.confirmed',
];

const missingJs = requiredJs.filter((item) => !js.includes(item));
const missingCss = requiredCss.filter((item) => !css.includes(item));

if (missingJs.length || missingCss.length) {
  console.error(JSON.stringify({ ok: false, missingJs, missingCss }, null, 2));
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});

const response = await page.goto('http://127.0.0.1:3761/workbench-v2.html', { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForTimeout(1200);

const status = response?.status() || 0;
const hasWorkArea = await page.locator('#workArea').count();
const hasStepRail = await page.locator('#stepRail').count();
const hasTodayPanel = await page.locator('[data-panel="today"]').count();

await browser.close();

const ok = status === 200 && hasWorkArea === 1 && hasStepRail === 1 && hasTodayPanel === 1 && errors.length === 0;
console.log(JSON.stringify({
  ok,
  status,
  hasWorkArea,
  hasStepRail,
  hasTodayPanel,
  errors,
}, null, 2));

if (!ok) process.exit(1);
