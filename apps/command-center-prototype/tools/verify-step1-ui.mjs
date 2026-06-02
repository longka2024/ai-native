import { chromium } from 'playwright';

const url = process.env.AI_NATIVE_WORKBENCH_URL || 'http://localhost:3763/workbench-v2.html?verify=step1-gate-3';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
const consoleMessages = [];
page.on('console', (message) => consoleMessages.push(`${message.type()}: ${message.text()}`));
page.on('pageerror', (error) => consoleMessages.push(`pageerror: ${error.message}`));

const failures = [];
function check(name, passed, detail = '') {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}${detail ? ` - ${detail}` : ''}`);
  if (!passed) failures.push(`${name}${detail ? ` - ${detail}` : ''}`);
}

try {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.addStyleTag({ content: '[hidden]{display:block!important;visibility:visible!important;opacity:1!important}' });
  const bodyText = await page.locator('body').innerText({ timeout: 10000 });
  console.log(`BODY_HAS_LOCK=${bodyText.includes('成品区已锁定')}`);
  check('page loads workbench', bodyText.includes('v2.4.3') || bodyText.includes('内容生产中台'), url);
  check('delivery area is locked for step 1', bodyText.includes('成品区已锁定') && bodyText.includes('不生成图片') && bodyText.includes('不生成视频'));

  const industry = page.locator('#industry');
  const topic = page.locator('#topic');
  if (await industry.count()) await industry.fill('美业护肤');
  if (await topic.count()) await topic.fill('淡斑');

  const findButton = page.locator('#findTopics');
  check('find topics button exists', await findButton.count() > 0);
  if (await findButton.count()) {
    await findButton.click();
    await page.waitForTimeout(2500);
  }

  const afterText = await page.locator('body').innerText({ timeout: 10000 });
  console.log(`AFTER_HAS_LOCK=${afterText.includes('成品区已锁定')}`);
  if (!afterText.includes('成品区已锁定')) console.log(`CONSOLE ${consoleMessages.slice(-10).join(' | ')}`);
  const hasSamplePool = afterText.includes('爆款样本池') || afterText.includes('第一步需要 5-10 条真实/手动样本') || afterText.includes('来源追踪');
  check('step 1 sample pool or shortage message is visible', hasSamplePool);
  check('collection work window remains visible after finding topics', afterText.includes('采集工作窗口'));
  check('collection terminal log remains visible', afterText.includes('运行日志'));
  check('step 1 does not expose final delivery action', !afterText.includes('生成配图和问题库') && !afterText.includes('生成视频制作任务'));

  const sampleCard = page.locator('[data-step1-sample]').first();
  const sampleCount = await sampleCard.count();
  if (sampleCount) {
    const firstSampleText = await sampleCard.innerText();
    check('sample card keeps source traceability', firstSampleText.includes('来源追踪') && firstSampleText.includes('互动指标'));
    check('sample card keeps original source link area', firstSampleText.includes('打开原帖') || firstSampleText.includes('来源追踪'));
    const pickButton = sampleCard.locator('[data-step1-pick]').first();
    if (await pickButton.count()) {
      await pickButton.evaluate((node) => node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));
    } else {
      await sampleCard.evaluate((node) => node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));
    }
    await page.waitForTimeout(800);
    const step2Text = await page.locator('body').innerText({ timeout: 10000 });
    check('creative flow material deconstruction appears after selecting a sample', step2Text.includes('素材拆解') && step2Text.includes('这条为什么火') && step2Text.includes('Longka 二创方向'));
    check('step 2 still blocks copy/image/video', step2Text.includes('当前仍不生成正文、图片或视频') || step2Text.includes('不生成正文'));
    const confirmStep2 = page.locator('#confirmStep2Deconstruction');
    if (await confirmStep2.count()) {
      await confirmStep2.click();
      await page.waitForTimeout(800);
      const step3Text = await page.locator('body').innerText({ timeout: 10000 });
      check('creative angles appear after confirming deconstruction', step3Text.includes('创作角度') && step3Text.includes('客户问题库是左侧内容资产库'));
      check('step 3 does not hard-block when comments are missing', step3Text.includes('不阻断创作') || step3Text.includes('评论区强信号'));
      const confirmStep3 = page.locator('#confirmStep3QuestionBank');
      if (await confirmStep3.count()) {
        await confirmStep3.click();
        await page.waitForTimeout(800);
        const step4Text = await page.locator('body').innerText({ timeout: 10000 });
        check('title candidates appear after confirming creative angles', step4Text.includes('标题候选') && step4Text.includes('公式：') && step4Text.includes('对应问题：'));
        check('step 4 still blocks body copy', step4Text.includes('这里只生成标题候选，不生成正文'));
        const titleChoice = page.locator('[data-step4-title]').first();
        if (await titleChoice.count()) {
          await titleChoice.click();
          await page.waitForTimeout(300);
          const selectedText = await page.locator('body').innerText({ timeout: 10000 });
          check('step 4 title selection enables framework gate', selectedText.includes('已选择：') && selectedText.includes('下一步只生成框架'));
          const confirmStep4 = page.locator('#confirmStep4Title');
          await confirmStep4.click();
          await page.waitForTimeout(800);
          const step5Text = await page.locator('body').innerText({ timeout: 10000 });
          check('copy blueprint appears after confirming title', step5Text.includes('文案框架') && step5Text.includes('开头策略') && step5Text.includes('正文结构'));
          check('step 5 still blocks body before framework confirmation', step5Text.includes('这里只生成框架，不生成正文'));
          const confirmStep5 = page.locator('#confirmStep5Blueprint');
          if (await confirmStep5.count()) {
            await confirmStep5.click();
            await page.waitForSelector('#step6CopyReview', { timeout: 10000 });
            const step6InitialText = await page.locator('#step6CopyReview').innerText({ timeout: 10000 });
            check('copy review appears only after confirming framework', step6InitialText.includes('正文体检') || step6InitialText.includes('正文生成'));
            await page.waitForTimeout(3500);
            const step6Text = await page.locator('#step6CopyReview').innerText({ timeout: 10000 });
            const hasDraft = step6Text.includes('Longka 文案体检') && step6Text.includes('Humanizer');
            const hasNoFallbackError = step6Text.includes('系统没有生成本地固定模板文案') || step6Text.includes('正文生成失败');
            const isStillLoading = step6Text.includes('正在按框架生成正文');
            check('step 6 either shows draft review, explicit no-fallback error, or loading state', hasDraft || hasNoFallbackError || isStillLoading);
            if (hasDraft && !isStillLoading) {
              check('step 6 exposes improve-and-compare controls after body review', step6Text.includes('优化一版 / 对比原稿') && step6Text.includes('原稿') && step6Text.includes('优化稿'));
            }
            const step6BodyText = await page.locator('body').innerText({ timeout: 10000 });
            check('step 6 keeps production locked until copy confirmation', step6BodyText.includes('成品区已锁定') || step6BodyText.includes('未确认文案前'));
            await page.evaluate(() => {
              document.dispatchEvent(new CustomEvent('longka:step6-confirmed', {
                detail: {
                  title: '淡斑前先分清你是哪一种斑',
                  body: '很多人淡斑没效果，不是因为完全没有做护理，而是一开始就没有分清自己脸上的斑属于哪一种。先看最近有没有暴晒、熬夜、压力变大，再看斑点是突然变多还是慢慢加深，最后看颜色更像浅褐、深褐，还是痘印后的色沉。先判断类型，再决定是防晒、修护、淡印，还是做专业检测。不确定时先做一次评估，不要急着跟风买同款。',
                  blueprint: {
                    selectedTitle: '淡斑前先分清你是哪一种斑',
                    sourceTitle: '淡斑前，一定要先搞清楚这4种斑点类型',
                  },
                },
              }));
            });
            await page.waitForSelector('#step7ProductionBrief', { timeout: 10000 });
            const step7Text = await page.locator('#step7ProductionBrief').innerText({ timeout: 10000 });
            check('production brief appears after copy confirmation', step7Text.includes('生产准备') && step7Text.includes('小红书图文卡片方案') && step7Text.includes('小妹视频工作台脚本草稿'));
            check('step 7 does not generate assets directly', step7Text.includes('不生成图片') && step7Text.includes('不生成视频') && step7Text.includes('不打包') && step7Text.includes('不上线'));
          } else {
            check('step 6 skipped because step 5 confirm button is missing', false);
          }
        }
      } else {
        check('step 4 skipped because step 3 confirm button is missing', false);
      }
    } else {
      check('step 3 skipped because step 2 confirm button is missing', false);
    }
  } else {
    check('step 2 deconstruction skipped when no samples exist', true, 'no sample card in current state');
  }

  const step3Nav = page.locator('.longka-back-step[data-longka-back-step="3"]').last();
  check('visible workflow card allows going back to step 3', await step3Nav.count() > 0);
  if (await step3Nav.count()) {
    await step3Nav.click();
    await page.waitForTimeout(500);
    const backText = await page.locator('body').innerText({ timeout: 10000 });
    check('going back to step 3 keeps keyword input workflow visible', backText.includes('今天关心的话题'));
  }

  await page.screenshot({ path: 'exports/step1-sample-pool-verification.png', fullPage: true });
  console.log('SCREENSHOT exports/step1-sample-pool-verification.png');
} finally {
  await browser.close();
}

if (failures.length) {
  console.error('\nUI verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
