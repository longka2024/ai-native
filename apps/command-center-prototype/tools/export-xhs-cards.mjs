import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';

const root = resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const dbPath = join(root, 'data', 'command-center.json');
const outRoot = join(root, 'exports', 'xhs-cards');
const baseUrl = process.env.AI_NATIVE_BASE_URL || 'http://localhost:3760';
const assetId = process.argv.find((arg) => arg.startsWith('--asset='))?.slice('--asset='.length);
const allowCollectedImages = process.argv.includes('--allow-collected-images') || process.env.ALLOW_COLLECTED_IMAGES === '1';

if (!existsSync(dbPath)) {
  throw new Error(`Missing state file: ${dbPath}`);
}

const db = JSON.parse(await readFile(dbPath, 'utf8'));
const asset = findAsset(db.assets || [], assetId);
if (!asset) {
  throw new Error(assetId ? `No structured asset found for ${assetId}` : 'No structured Xiaohongshu asset found. Run the Xiaohongshu production line first.');
}
const visualSources = resolveVisualSources(db, asset);

const safeAssetId = asset.id || `asset-${Date.now()}`;
const outDir = join(outRoot, safeAssetId);
await mkdir(outDir, { recursive: true });
await mkdir(join(outDir, 'prompts'), { recursive: true });
await writeFile(join(outDir, 'copy.md'), buildCopyMarkdown(asset), 'utf8');
await writeFile(join(outDir, 'layout-plan.md'), buildLayoutPlanMarkdown(asset), 'utf8');
await writePromptFiles(asset, join(outDir, 'prompts'));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1280, height: 1700 },
  deviceScaleFactor: 1,
});

try {
  const url = `${baseUrl}/xhs-card-preview.html?asset=${encodeURIComponent(asset.id)}${allowCollectedImages ? '&allowCollectedImages=1' : ''}`;
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForSelector('.xhs-preview-card', { timeout: 10000 });
  await page.waitForFunction(() => !document.querySelector('.xhs-card-visual.pending-ratio'), null, { timeout: 15000 }).catch(() => {});
  const cards = await page.locator('.xhs-preview-card').all();
  if (!cards.length) throw new Error('Preview page rendered no cards.');

  const files = [];
  for (let index = 0; index < cards.length; index += 1) {
    const file = join(outDir, `xhs-card-${String(index + 1).padStart(2, '0')}.png`);
    await cards[index].evaluate((node) => node.scrollIntoView({ block: 'center', inline: 'center' }));
    const box = await cards[index].boundingBox();
    if (!box) throw new Error(`Card ${index + 1} has no bounding box.`);
    await page.screenshot({
      path: file,
      clip: {
        x: Math.round(box.x),
        y: Math.round(box.y),
        width: 1080,
        height: 1440,
      },
    });
    files.push(file);
  }

  const manifest = {
    exportedAt: new Date().toISOString(),
    assetId: asset.id,
    title: asset.title,
    selectedTitle: asset.structured?.selectedTitle,
    coverText: asset.structured?.coverText,
    renderer: 'guizang-social-card-skill-compatible',
    rendererPath: 'C:\\Users\\longfei\\.agents\\skills\\guizang-social-card-skill',
    stage: '生成小红书卡片组',
    qa: {
      ratio: '3:4',
      expectedSize: '1080x1440',
      source: allowCollectedImages && visualSources.length ? 'contentSamples collected images, internal/reference mode' : 'original editorial cards without collected post images',
      status: 'exported',
      note: allowCollectedImages
        ? 'Reference mode: collected post images may appear and must not be published without rights clearance.'
        : 'Publish-safe default: collected post images are only evidence/reference and are not rendered into final cards.',
    },
    visualSources,
    count: files.length,
    files,
    publicFiles: files.map((file) => `exports/xhs-cards/${safeAssetId}/${file.split(/[\\/]/).pop()}`),
    outputDir: outDir,
    assetFiles: {
      copy: join(outDir, 'copy.md'),
      layoutPlan: join(outDir, 'layout-plan.md'),
      promptsDir: join(outDir, 'prompts'),
    },
  };
  const manifestJson = JSON.stringify(manifest, null, 2);
  await writeFile(join(outDir, 'manifest.json'), escapeJsonUnicode(manifestJson), 'utf8');
  console.log(manifestJson);
} finally {
  await browser.close();
}

function findAsset(assets, id) {
  if (id) return assets.find((item) => item.id === id && item.structured?.cardPlan?.length);
  return assets.find((item) => item.structured?.cardPlan?.length);
}

function resolveVisualSources(db, asset) {
  const data = asset.structured || {};
  const candidate = (db.candidates || []).find((item) => item.id === asset.topicId)
    || (db.topics || []).find((item) => item.id === asset.topicId);
  const queryParts = [candidate?.title, candidate?.material?.[0], data.selectedTitle, asset.title]
    .filter(Boolean)
    .map((item) => String(item).slice(0, 18));
  const matched = (db.contentSamples || []).filter((sample) => {
    const hasImage = sample.cover || (Array.isArray(sample.images) && sample.images.length);
    const haystack = [sample.title, sample.content, sample.keyword].filter(Boolean).join(' ');
    return hasImage && queryParts.some((part) => part && haystack.includes(part));
  });
  const fallback = matched.length ? matched : (db.contentSamples || []).filter((sample) => sample.cover || sample.images?.length);
  return fallback.slice(0, 8).map((sample) => ({
    platform: sample.platform || 'xiaohongshu',
    keyword: sample.keyword || '',
    title: sample.title || '',
    url: sample.url || '',
    imageCount: (sample.images || []).length + (sample.cover ? 1 : 0),
  }));
}

function escapeJsonUnicode(value) {
  return value.replace(/[\u007f-\uffff]/g, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

function buildCopyMarkdown(asset) {
  const data = asset.structured || {};
  return [
    `# ${data.selectedTitle || asset.title || '小红书图文文案'}`,
    '',
    String(asset.copy || data.bodyDraft?.join('\n') || '').trim(),
    '',
  ].join('\n');
}

function buildLayoutPlanMarkdown(asset) {
  const data = asset.structured || {};
  const cards = Array.isArray(data.cardPlan) ? data.cardPlan : [];
  const lines = [
    `# ${data.selectedTitle || asset.title || '小红书图文插图计划'}`,
    '',
    `- 输出规格：小红书 3:4 图文卡片，默认 1080x1440`,
    `- 视觉路线：${data.visualRoute?.style || 'Guizang editorial + Xiaohongshu knowledge cards'}`,
    `- 生成环境：当前为 122/Web 或本地网页导出；43-generation 真出图服务待接入`,
    '',
  ];
  cards.forEach((card, index) => {
    lines.push(`## P${index + 1} ${card.role || '内容页'}`);
    lines.push(`- 标题：${card.title || ''}`);
    lines.push(`- 卡片文字：${card.copy || ''}`);
    lines.push(`- 轮播任务：${card.carouselJob || '按图片集顺序展示'}`);
    if (card.insertAfter) lines.push(`- 公众号插文参考：${card.insertAfter}`);
    lines.push(`- 读者一眼要懂：${card.readerTakeaway || ''}`);
    lines.push(`- 视觉说明：${card.visualBrief || ''}`);
    lines.push('');
  });
  return lines.join('\n');
}

async function writePromptFiles(asset, promptDir) {
  const data = asset.structured || {};
  const cards = Array.isArray(data.cardPlan) ? data.cardPlan : [];
  for (let index = 0; index < cards.length; index += 1) {
    const card = cards[index];
    const name = `${String(index + 1).padStart(2, '0')}-${slugify(card.role || card.title || 'card')}.md`;
    const content = [
      `# P${index + 1} ${card.role || '内容页'}`,
      '',
      `Title: ${card.title || ''}`,
      `Card copy: ${card.copy || ''}`,
      `Carousel job: ${card.carouselJob || '按图片集顺序展示'}`,
      card.insertAfter ? `Article insertion reference: ${card.insertAfter}` : '',
      `Reader takeaway: ${card.readerTakeaway || ''}`,
      `Visual brief: ${card.visualBrief || ''}`,
      '',
      'Prompt:',
      card.imagePrompt || `Create a 3:4 Xiaohongshu card for: ${card.title || card.copy || data.selectedTitle || asset.title}`,
      '',
    ].join('\n');
    await writeFile(join(promptDir, name), content, 'utf8');
  }
}

function slugify(value) {
  const ascii = String(value || '')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
  return ascii || 'card';
}
