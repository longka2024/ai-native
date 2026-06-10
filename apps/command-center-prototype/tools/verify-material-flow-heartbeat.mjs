import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

await page.route('**/api/sources/mediacrawler/xhs-collect', async (route) => {
  await new Promise((resolve) => setTimeout(resolve, 10500));
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      ok: false,
      message: 'heartbeat-test-end',
    }),
  });
});

await page.goto('http://localhost:3760/workbench-v2.html');
await page.waitForLoadState('networkidle');
await page.fill('#topic', 'heartbeat-test-keyword');
await page.evaluate(() => window.longkaMaterialFlow.collectFreshMaterial());
await page.waitForTimeout(11200);

const terminal = await page.locator('#terminalLog').innerText();
const status = await page.locator('#terminalStatus').innerText();

console.log(`STATUS=${status}`);
console.log(`TERMINAL=${terminal.replaceAll('\n', ' | ')}`);

if (!terminal.includes('正在等待 CDP Chrome 响应')) throw new Error('heartbeat line 1 did not appear');
if (!terminal.includes('正在读取搜索结果卡片')) throw new Error('heartbeat line 2 did not appear');
if (!terminal.includes('慢采集策略')) throw new Error('safe pacing strategy line did not appear');
if (!terminal.includes('已等待')) throw new Error('elapsed wait time did not appear');
if (!terminal.includes('heartbeat-test-end')) throw new Error('final mocked failure did not appear');

await browser.close();
