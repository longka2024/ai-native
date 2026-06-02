import { chromium } from 'playwright';

const url = process.env.AI_NATIVE_WORKBENCH_URL || 'http://localhost:3763/workbench-v2.html?verify=step6-improve';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const failures = [];
const messages = [];
page.on('console', (message) => messages.push(`${message.type()}: ${message.text()}`));
page.on('pageerror', (error) => messages.push(`pageerror: ${error.message}`));

function check(name, passed, detail = '') {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}${detail ? ` - ${detail}` : ''}`);
  if (!passed) failures.push(`${name}${detail ? ` - ${detail}` : ''}`);
}

try {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  const result = await page.evaluate(async () => {
    if (typeof window.longkaRunStep6CopyReview !== 'function') {
      return `MISSING_RUNNER:${typeof window.longkaRunStep6CopyReview}`;
    }
    const blueprint = {
      selectedTitle: '淡斑前先分清你是哪一种斑',
      mainQuestion: '我脸上到底是哪种斑',
      trustProof: '来自高收藏淡斑判断类帖子和评论区疑问',
      bodyStructure: ['评论问题前置', '三步自查', '风险边界', '低压行动入口'],
      compliance: ['不承诺淡斑效果', '不替代面诊'],
    };
    const originalFetch = window.fetch;
    window.fetch = async () => new Response(JSON.stringify({
      ok: true,
      draft: {
        xhsCopy: {
          title: blueprint.selectedTitle,
          body: '很多人淡斑没效果，不是因为完全没有护理，而是一开始就没有分清自己脸上的斑属于哪一种。评论区最常见的问题就是：我脸上这个到底是晒斑、黄褐斑，还是痘印留下来的色沉？先看最近有没有暴晒、熬夜、压力变大，再看斑点是突然变多还是慢慢加深，最后看颜色更像浅褐、深褐，还是痘印后的色沉。先判断类型，再决定是防晒、修护、淡印，还是做专业检测。这个过程不承诺任何固定效果，因为每个人肤况不一样。不确定时先做一次评估，不要急着跟风买同款。你可以先收藏这三个判断点，下次买产品或做项目前先对照一遍。',
        },
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } });
    await window.longkaRunStep6CopyReview(blueprint);
    await new Promise((resolve) => setTimeout(resolve, 100));
    const text = document.querySelector('#step6CopyReview')?.innerText || '';
    window.fetch = originalFetch;
    return text;
  });
  check('step 6 mocked result renders review', result.includes('Longka 文案体检') && result.includes('Humanizer'));
  check('step 6 renders original/improved comparison area', result.includes('原稿') && result.includes('优化稿'));
  check('step 6 renders improve button', result.includes('优化一版 / 对比原稿'));
  check('step 6 still requires manual copy confirmation', result.includes('文案已确认，进入生产准备'));
  if (failures.length) console.log(`DEBUG_TEXT ${result.slice(0, 500)}`);
  if (messages.length) console.log(`CONSOLE ${messages.slice(-12).join(' | ')}`);
  await page.screenshot({ path: 'exports/step6-improve-ui-verification.png', fullPage: true });
  console.log('SCREENSHOT exports/step6-improve-ui-verification.png');
} finally {
  await browser.close();
}

if (failures.length) {
  console.error('\nStep 6 improve UI verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
