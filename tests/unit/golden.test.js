// Golden values (BUILD_SPEC 2 and 4.5) against the real dataset in data/.
// Expected numbers live here and only here; the UI always computes them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMatcher, statusOfLinks } from '../../src/logic/match.js';
import { searchEntities } from '../../src/logic/search.js';
import { blockCounts, jobLensCounts, linkSummary, linksPerType, entityPanel } from '../../src/logic/aggregate.js';
import { loadRealModel } from './helpers.js';

const m = loadRealModel();
const linksOf = (ids) => m.links.filter((l) => ids.includes(l.entity_id));
const perNormString = (s) => s.norms.map((n) => `${n}${s.perNorm.get(n)}`).join(' ');

test('totals: 196 links, 11 norms, 91 items; links per type', () => {
  assert.equal(m.links.length, 196);
  assert.equal(m.norms.length, 11);
  assert.equal(m.entities.length, 91);
  assert.deepEqual(Object.fromEntries(linksPerType(m.links)), { Legislation: 64, Partnerships: 46, Policies: 43, Institutions: 43 });
});

test('search NIS2: exact short-name hit, 22 links across 9 norms, one other mention', () => {
  const r = searchEntities(m.entities, 'NIS2');
  assert.equal(r.mode, 'single');
  assert.equal(r.exact, true);
  assert.equal(m.entityById.get(r.selected).name, 'NIS2 Directive (Directive 2022/2555)');
  const s = linkSummary(linksOf(r.matches), m.norms);
  assert.equal(s.links, 22);
  assert.deepEqual(s.norms, ['A', 'B', 'C', 'F', 'G', 'H', 'I', 'J', 'K']);
  assert.equal(perNormString(s), 'A1 B3 C2 F1 G4 H1 I3 J5 K2');

  assert.equal(r.others.length, 1);
  const other = m.entityById.get(r.others[0]);
  assert.match(other.name, /^Technical Implementation Guidance on Commission Implementing Regulation 2024\/2690/);
  assert.equal(m.linksByEntity.get(other.entity_id).length, 2);

  const { totals } = statusOfLinks(m.links, createMatcher({ q: 'NIS2' }, { searchMatches: r.matches }));
  assert.deepEqual(totals, { default: 0, full: 22, partial: 0, none: 174 });
  assert.equal(r.commission, false);
});

test('search ENISA: one item, 18 links across 7 norms', () => {
  const r = searchEntities(m.entities, 'ENISA');
  assert.equal(r.mode, 'single');
  assert.equal(r.matches.length, 1);
  assert.deepEqual(r.others, []);
  const s = linkSummary(linksOf(r.matches), m.norms);
  assert.equal(s.links, 18);
  assert.deepEqual(s.norms, ['A', 'B', 'C', 'G', 'H', 'I', 'J']);
  assert.equal(perNormString(s), 'A2 B2 C1 G3 H1 I3 J6');
  const p = entityPanel(m, r.selected);
  assert.equal(p.links, 18);
  assert.equal(p.normCount, 7);
  assert.deepEqual(p.perNorm.slice(0, 3).map((n) => `${n.normId}${n.count}`), ['J6', 'G3', 'I3']);
});

test('search Commission: 4 items in list mode, Commission note shown', () => {
  const r = searchEntities(m.entities, 'Commission');
  assert.equal(r.mode, 'list');
  assert.equal(r.commission, true);
  const rows = r.matches.map((id) => {
    const e = m.entityById.get(id);
    const s = linkSummary(m.linksByEntity.get(id), m.norms);
    return { name: e.name, type: e.type, norms: s.norms.join(''), links: s.links };
  });
  const find = (prefix) => rows.find((x) => x.name.startsWith(prefix));
  assert.equal(rows.length, 4);
  assert.deepEqual(find('European Commission'), { name: 'European Commission', type: 'Institutions', norms: 'I', links: 1 });
  assert.deepEqual({ ...find('Commission Implementing Regulation amending Implementing Regulation 2015/1998'), name: undefined },
    { name: undefined, type: 'Legislation', norms: 'G', links: 1 });
  assert.deepEqual({ ...find('Commission Recommendation on guidelines on the export of cyber-surveillance items'), name: undefined },
    { name: undefined, type: 'Policies', norms: 'E', links: 1 });
  assert.deepEqual({ ...find('Technical Implementation Guidance on Commission Implementing Regulation 2024/2690'), name: undefined },
    { name: undefined, type: 'Policies', norms: 'IJ', links: 2 });
});

test('search “cra” selects CRA and does not hit “democracy”', () => {
  const r = searchEntities(m.entities, 'cra');
  assert.equal(r.mode, 'single');
  assert.equal(m.entityById.get(r.selected).short_name, 'CRA');
  for (const id of [...r.matches, ...r.others]) assert.doesNotMatch(m.entityById.get(id).name, /democracy/i);
});

test('topic blocks (primary)', () => {
  assert.deepEqual(Object.fromEntries(blockCounts(m.links)), {
    'Incident response and management': 54,
    'Critical infrastructure': 37,
    'Stability and security': 30,
    'Supply chain security': 22,
    'Cybercrime and terrorism': 20,
    'Vulnerability disclosure': 18,
    'Human rights and privacy': 15,
  });
});

test('job lens counts, primary / primary+secondary', () => {
  const got = Object.fromEntries([...jobLensCounts(m.links, m.jobs)].map(([j, c]) => [j, `${c.primary}/${c.withSecondary}`]));
  assert.deepEqual(got, {
    'Incident manager': '54/89',
    'Threat analyst': '40/40',
    'Critical infrastructure actor': '37/49',
    Diplomat: '30/93',
    'Criminal justice': '20/26',
    'Not specified': '15/15',
  });
});

test('job lens status totals match the chips (full = primary, partial = secondary only)', () => {
  const { totals } = statusOfLinks(m.links, createMatcher({ job: 'Diplomat' }));
  assert.equal(totals.full, 30);
  assert.equal(totals.full + totals.partial, 93);
});

test('prohibitive norms: C, F, K with 36 of 196 links', () => {
  const prohibitive = m.norms.filter((n) => n.orientation === 'prohibitive').map((n) => n.norm_id);
  assert.deepEqual(prohibitive, ['C', 'F', 'K']);
  const { totals } = statusOfLinks(m.links, createMatcher({ orientation: 'prohibitive' }));
  assert.equal(totals.full, 36);
});
