#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';

function argValue(name, fallback = '') {
  const index = process.argv.indexOf(name);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  const prefix = `${name}=`;
  const item = process.argv.find((arg) => arg.startsWith(prefix));
  return item ? item.slice(prefix.length) : fallback;
}

const file = argValue('--file');
const base = argValue('--base', process.env.LONGKA_122_BASE_URL || 'http://122.51.218.154/ai-native-v2');

if (!file) {
  console.error('Usage: node upload-batch.mjs --file batch.json --base http://122.51.218.154/ai-native-v2');
  process.exit(2);
}

const raw = await readFile(file, 'utf8');
const payload = JSON.parse(raw);
payload.batchName = payload.batchName || basename(file, '.json');
payload.clientVersion = payload.clientVersion || 'local-platform-collector-v0';

const endpoint = `${base.replace(/\/$/, '')}/api/collectors/local-platform/import-batch`;
const response = await fetch(endpoint, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(payload),
});
const text = await response.text();
let result;
try {
  result = JSON.parse(text);
} catch {
  result = { ok: false, error: 'non_json_response', detail: text.slice(0, 500) };
}

if (!response.ok || !result.ok) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  platform: result.platform,
  runId: result.run?.id,
  totalSampleCount: result.totalSampleCount,
  message: result.message,
}, null, 2));
