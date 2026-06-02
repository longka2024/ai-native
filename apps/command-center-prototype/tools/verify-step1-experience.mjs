import { chromium } from 'playwright';

const url = process.env.AI_NATIVE_WORKBENCH_URL || 'http://localhost:3763/workbench-v2.html?verify=step1-experience';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
const failures = [];

function check(name, passed, detail = '') {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}${detail ? ` - ${detail}` : ''}`);
  if (!passed) failures.push(`${name}${detail ? ` - ${detail}` : ''}`);
}

try {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.locator('#topic').fill('淡斑');
  await page.locator('#findTopics').click();
  await page.waitForTimeout(3200);

  const state = await page.evaluate(() => ({
    consoleTitle: document.querySelector('#consoleTitle')?.textContent || '',
    terminalLog: document.querySelector('#terminalLog')?.textContent || '',
    topicHint: document.querySelector('#topicHint')?.textContent || '',
    cardCount: document.querySelectorAll('.longka-sample-card-v2').length,
    firstCard: document.querySelector('.longka-sample-card-v2')?.innerText || '',
    progressWidth: document.querySelector('#progressBar')?.style.width || '',
    crawlHidden: document.querySelector('#crawlPanel')?.hidden,
    topicsHidden: document.querySelector('#topicsPanel')?.hidden,
    bodyText: document.body.innerText,
  }));

  check('collection window uses Longka radar label', state.consoleTitle.includes('Longka 雷达素材搜索'));
  check('collection panels stay visible', state.crawlHidden === false && state.topicsHidden === false);
  check('terminal shows gradual collection actions',
    state.terminalLog.includes('已读取任务')
    && state.terminalLog.includes('正在检查素材来源')
    && state.terminalLog.includes('整理赞、藏、评、转')
    && state.terminalLog.includes('当前门禁'));
  check('progress reaches completion', state.progressWidth === '100%');
  check('sample pool appears', state.cardCount > 0 && state.topicHint.includes('爆款样本'));
  check('sample card is source-bound and customer-readable',
    state.firstCard.includes('真实采集')
    && state.firstCard.includes('小红书')
    && state.firstCard.includes('本次关键词：淡斑')
    && state.firstCard.includes('打开原帖')
    && state.firstCard.includes('选择这条源头帖做拆解'));
  check('old raw collection keyword is not exposed as the active keyword', !state.bodyText.includes('原采集词：皮肤有老人斑'));
  check('step 1 gate still blocks production', state.terminalLog.includes('不生成正文、图片、视频或打包'));

  await page.screenshot({ path: 'exports/step1-experience-v2.png', fullPage: true });
  console.log('SCREENSHOT exports/step1-experience-v2.png');
} finally {
  await browser.close();
}

if (failures.length) {
  console.error('\nStep 1 experience verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
