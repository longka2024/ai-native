import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

await page.goto('http://localhost:3760/workbench-v2.html');
await page.waitForLoadState('networkidle');
await page.fill('#topic', '鱼尾纹');
await page.click('#findTopics');
await page.waitForTimeout(1800);

const terminal = await page.locator('#terminalLog').innerText();
const hint = await page.locator('#topicHint').innerText();
const cards = await page.locator('#topicGrid article').count();
const grid = await page.locator('#topicGrid').innerText();

console.log(`TERMINAL=${terminal.replaceAll('\n', ' | ')}`);
console.log(`HINT=${hint}`);
console.log(`CARDS=${cards}`);
console.log(`GRID_HEAD=${grid.slice(0, 500).replaceAll('\n', ' | ')}`);

if (!terminal.includes('本地资产库命中')) throw new Error('local asset match log missing');
if (cards < 1) throw new Error('local result cards were not rendered');
if (grid.includes('本地资产库没有匹配素材')) throw new Error('still showing empty state despite collected results');

await browser.close();
