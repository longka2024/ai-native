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
    const box = await cards[index].boundingBox();
    if (!box) throw new Error(`Card ${index + 1} has no bounding box.`);
    await cards[index].screenshot({ path: file });
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
