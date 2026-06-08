#!/usr/bin/env node

import pg from 'pg';
import { readFile } from 'node:fs/promises';

async function loadDotenvFallback() {
  if (process.env.DATABASE_URL) return;
  try {
    const text = await readFile('.env', 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const index = trimmed.indexOf('=');
      if (index <= 0) continue;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, '');
      if (key && process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // Keep the explicit DATABASE_URL error below.
  }
}

const runId = process.argv[2];
const execute = process.argv.includes('--execute');

if (!runId) {
  console.error('Usage: node tools/delete-collector-run.mjs <runId> [--execute]');
  process.exit(2);
}

await loadDotenvFallback();

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not configured.');
  process.exit(2);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  const run = await pool.query(
    'select id, platform, source_type, query, status from longka_collection_runs where id=$1',
    [runId],
  );
  const samples = await pool.query(
    'select count(*)::int as count from longka_content_samples where run_id=$1',
    [runId],
  );
  if (!execute) {
    console.log(JSON.stringify({
      ok: true,
      mode: 'dry-run',
      run: run.rows[0] || null,
      sampleCount: samples.rows[0]?.count || 0,
    }, null, 2));
    process.exit(0);
  }
  await pool.query('begin');
  const deletedSamples = await pool.query('delete from longka_content_samples where run_id=$1 returning id', [runId]);
  const deletedRun = await pool.query('delete from longka_collection_runs where id=$1 returning id', [runId]);
  await pool.query('commit');
  console.log(JSON.stringify({
    ok: true,
    mode: 'execute',
    runId,
    deletedSamples: deletedSamples.rowCount,
    deletedRuns: deletedRun.rowCount,
  }, null, 2));
} catch (error) {
  await pool.query('rollback').catch(() => {});
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
} finally {
  await pool.end();
}
