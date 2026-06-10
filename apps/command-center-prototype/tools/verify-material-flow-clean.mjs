import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

await page.goto('http://localhost:3760/workbench-v2.html');
await page.waitForLoadState('networkidle');
await page.fill('#topic', 'zzzz-local-empty-keyword');
await page.click('#findTopics');
await page.waitForTimeout(1200);

const terminal = await page.locator('#terminalLog').innerText();
const hint = await page.locator('#topicHint').innerText();
const grid = await page.locator('#topicGrid').innerText();
const xhsPanel = await page.locator('#xhsCdpLoginPanel').innerText();
const scripts = await page.locator('script').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('src')).filter(Boolean));

console.log(`SCRIPTS=${scripts.join('|')}`);
console.log(`TERMINAL=${terminal.replaceAll('\n', ' | ')}`);
console.log(`HINT=${hint}`);
console.log(`GRID=${grid.replaceAll('\n', ' | ')}`);
console.log(`XHS_PANEL=${xhsPanel.replaceAll('\n', ' | ')}`);

if (scripts.join('|').includes('workbench-step1')) throw new Error('old step1 scripts are still loaded');
if (!scripts.join('|').includes('material-flow.js')) throw new Error('material-flow.js is not loaded');
if (!terminal.includes('本地资产库命中 0 条')) throw new Error('empty local asset state was not logged');
if (!grid.includes('当前关键词还没有素材')) throw new Error('empty local asset card was not rendered');
if (!grid.includes('立即采集新素材')) throw new Error('collect fresh material button was not rendered');
if (!xhsPanel.includes('小红书采集状态')) throw new Error('xhs cdp status panel was not rendered');
if (!xhsPanel.includes('打开小红书登录窗口')) throw new Error('xhs cdp browser button was not rendered');
if (!xhsPanel.includes('已扫码，读取 Cookie')) throw new Error('xhs cookie sync button was not rendered');
if (terminal.includes('已整理 0 条')) throw new Error('old broken 0-items-done state still appears');

await browser.close();
