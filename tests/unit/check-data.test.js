// check-data must fail loudly (exit 1) on broken data and pass on the real data.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FIXTURE } from './helpers.js';
import { DOWNLOADS, META_KEYS } from '../../src/config.js';

const script = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'scripts', 'check-data.js');
const run = (dir) => spawnSync(process.execPath, dir ? [script, dir] : [script], { encoding: 'utf8' });

function fixtureDir({ links = FIXTURE.links, withMeta = true } = {}) {
  const meta = withMeta ? Object.fromEntries(META_KEYS.map((k) => [k, null])) : undefined;
  const dir = mkdtempSync(join(tmpdir(), 'norms-check-'));
  for (const { file } of DOWNLOADS) writeFileSync(join(dir, file), '');
  writeFileSync(join(dir, 'norms.csv'), FIXTURE.norms);
  writeFileSync(join(dir, 'entities.csv'), FIXTURE.entities);
  writeFileSync(join(dir, 'links.csv'), links);
  if (meta !== undefined) writeFileSync(join(dir, 'meta.json'), JSON.stringify(meta));
  return dir;
}

test('check-data passes on the real data', () => {
  const r = run();
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /links 196 · norms 11 · items 91/);
});

test('check-data passes on a clean fixture', () => {
  const dir = fixtureDir();
  try { assert.equal(run(dir).status, 0); } finally { rmSync(dir, { recursive: true }); }
});

test('check-data exits 1 and names the problem on an unknown topic', () => {
  const dir = fixtureDir({ links: FIXTURE.links.replace('Supply chain security', 'Quantum security') });
  try {
    const r = run(dir);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /\[unknown-topic\].*Quantum security/);
  } finally { rmSync(dir, { recursive: true }); }
});

test('check-data exits 1 when meta.json or a download is missing', () => {
  const dir = fixtureDir({ withMeta: false });
  rmSync(join(dir, 'CLEANING_LOG.md'));
  try {
    const r = run(dir);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /meta\.json could not be read/);
    assert.match(r.stderr, /CLEANING_LOG\.md is missing/);
  } finally { rmSync(dir, { recursive: true }); }
});
