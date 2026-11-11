// Validate data/ (BUILD_SPEC 4.3). Read-only: this script never writes to data/.
// Exit code 1 on any problem, so CI fails loudly.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname, resolve } from 'node:path';
import { parseDataset, DATA_FILES } from '../src/data/load.js';
import { validateDataset, summarize } from '../src/data/validate.js';
import { DOWNLOADS } from '../src/config.js';

// Optional argument: another data directory (used by tests with broken fixtures).
const dataDir = process.argv[2] ? resolve(process.argv[2]) : join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const read = (f) => readFileSync(join(dataDir, f), 'utf8');

const problems = [];
let raw;
try {
  raw = parseDataset({ norms: read(DATA_FILES.norms), entities: read(DATA_FILES.entities), links: read(DATA_FILES.links) });
} catch (err) {
  console.error(`✗ Could not read the CSVs: ${err.message}`);
  process.exit(1);
}
try {
  raw.meta = JSON.parse(read(DATA_FILES.meta));
} catch (err) {
  raw.meta = undefined;
  problems.push({ code: 'bad-meta', message: `meta.json could not be read or parsed: ${err.message}` });
}

problems.push(...validateDataset(raw));
for (const { file } of DOWNLOADS)
  if (!existsSync(join(dataDir, file))) problems.push({ code: 'missing-download', message: `download file data/${file} is missing` });

const s = summarize(raw);
console.log(`links ${s.links} · norms ${s.norms} · items ${s.entities}`);
console.log(`links per type: ${Object.entries(s.linksPerType).map(([t, n]) => `${t} ${n}`).join(', ')}`);

if (problems.length) {
  console.error(`\n✗ Data check failed (${problems.length} problem${problems.length === 1 ? '' : 's'}):`);
  for (const p of problems) console.error(`  [${p.code}] ${p.message}`);
  process.exit(1);
}
console.log('\n✓ Data check passed');
