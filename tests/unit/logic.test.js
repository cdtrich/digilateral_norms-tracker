// BUILD_SPEC section 5 rules on a small fixture.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildModel } from '../../src/data/model.js';
import { createMatcher, activeCriteria, statusOfLinks } from '../../src/logic/match.js';
import { searchEntities, normalize, matchesWordStart, mentionsCommission } from '../../src/logic/search.js';
import { blockNormDots, matrixCells, entityPanel, compareDots } from '../../src/logic/aggregate.js';
import { fixtureRaw } from './helpers.js';

const m = buildModel(fixtureRaw());
const statuses = (criteria, ctx) => m.links.map(createMatcher(criteria, ctx));

// 5.2 statuses
test('5.2 default when no criteria are active (empty strings do not count)', () => {
  assert.deepEqual(statuses({}), ['default', 'default', 'default', 'default']);
  assert.deepEqual(statuses({ q: '  ', norm: '' }), ['default', 'default', 'default', 'default']);
  assert.deepEqual(activeCriteria({ q: ' ', job: 'Diplomat' }), ['job']);
});

test('5.2 topic: primary = full, secondary = partial, else none', () => {
  assert.deepEqual(statuses({ topic: 'Stability and security' }), ['partial', 'full', 'none', 'none']);
  assert.deepEqual(statuses({ topic: 'Incident response and management' }), ['full', 'none', 'partial', 'none']);
});

test('5.2 job: primary = full, secondary = partial, else none', () => {
  assert.deepEqual(statuses({ job: 'Diplomat' }), ['partial', 'full', 'none', 'none']);
  assert.deepEqual(statuses({ job: 'Incident manager' }), ['full', 'none', 'partial', 'none']);
});

test('5.2 norm, orientation and type criteria', () => {
  assert.deepEqual(statuses({ norm: 'C' }), ['none', 'none', 'full', 'full']);
  assert.deepEqual(statuses({ orientation: 'prohibitive' }), ['none', 'none', 'full', 'full']);
  assert.deepEqual(statuses({ orientation: 'positive' }), ['full', 'full', 'none', 'none']);
  assert.deepEqual(statuses({ type: 'Legislation' }), ['full', 'none', 'none', 'full']);
});

test('5.2 combined criteria: all must hold; any secondary makes it partial', () => {
  assert.deepEqual(statuses({ norm: 'A', job: 'Diplomat' }), ['partial', 'full', 'none', 'none']);
  assert.deepEqual(statuses({ topic: 'Incident response and management', job: 'Incident manager' }), ['full', 'none', 'partial', 'none']);
  assert.deepEqual(statuses({ topic: 'Incident response and management', job: 'Diplomat' }), ['partial', 'none', 'none', 'none']);
  assert.deepEqual(statuses({ type: 'Legislation', norm: 'C' }), ['none', 'none', 'none', 'full']);
});

test('5.2 q uses the search matches; empty search makes everything none', () => {
  const r = searchEntities(m.entities, 'CRA');
  assert.deepEqual(statuses({ q: 'CRA' }, { searchMatches: r.matches }), ['full', 'none', 'none', 'full']);
  assert.deepEqual(statuses({ q: 'zzz' }, { searchMatches: [] }), ['none', 'none', 'none', 'none']);
  assert.deepEqual(statuses({ q: 'CRA', job: 'Diplomat' }, { searchMatches: r.matches }), ['partial', 'none', 'none', 'none']);
});

test('statusOfLinks totals', () => {
  const { totals, byId } = statusOfLinks(m.links, createMatcher({ topic: 'Stability and security' }));
  assert.deepEqual(totals, { default: 0, full: 1, partial: 1, none: 2 });
  assert.equal(byId.get(1), 'partial');
});

// 5.3 search
test('5.3 normalize is case- and diacritics-insensitive', () => {
  assert.equal(normalize('  Café   COOPÉRATION '), 'cafe cooperation');
  assert.equal(searchEntities(m.entities, 'cafe').selected, 'cafe');
  assert.equal(searchEntities(m.entities, 'CAFÉ coop').selected, 'cafe');
});

test('5.3 tokens match at the start of a word only: “cra” does not hit “democracy”', () => {
  assert.equal(matchesWordStart(normalize('European Democracy Action Plan'), 'cra'), false);
  assert.equal(matchesWordStart(normalize('Regulation 2024/2847'), '2847'), true);
  assert.equal(matchesWordStart(normalize('(ENISA)'), 'enisa'), true);
  const r = searchEntities(m.entities, 'cra');
  assert.deepEqual(r.matches, ['cra']);
  assert.ok(!r.matches.includes('dem'));
});

test('5.3 all tokens must match', () => {
  assert.equal(searchEntities(m.entities, 'european plan').selected, 'dem');
  assert.equal(searchEntities(m.entities, 'european resilience').mode, 'empty');
});

test('5.3.1 exact short_name or alias → single mode, other mentions listed', () => {
  const r = searchEntities(m.entities, 'ccn');
  assert.equal(r.mode, 'single');
  assert.equal(r.exact, true);
  assert.equal(r.selected, 'cafe');
  const alias = searchEntities(m.entities, 'Cafe Net');
  assert.equal(alias.selected, 'cafe');
});

test('5.3.2 one word-match → single; several → list; none → empty', () => {
  assert.equal(searchEntities(m.entities, 'democracy').mode, 'single');
  assert.equal(searchEntities(m.entities, 'democracy').exact, false);
  const list = searchEntities(m.entities, 'c');
  assert.equal(list.mode, 'list');
  assert.equal(list.selected, null);
  assert.deepEqual(list.matches, ['cafe', 'cra']); // sorted by name
  assert.equal(searchEntities(m.entities, 'nothing here').mode, 'empty');
  assert.equal(searchEntities(m.entities, '   ').mode, 'idle');
});

test('5.3.1 two exact hits are ambiguous → list of word matches', () => {
  const entities = [
    { entity_id: 'x', name: 'Cybersecurity Act', short_name: 'CSA', aliases: '' },
    { entity_id: 'y', name: 'Cyber Solidarity Act', short_name: 'CSA', aliases: '' },
  ];
  const r = searchEntities(entities, 'csa');
  assert.equal(r.mode, 'list');
  assert.deepEqual(r.matches, ['y', 'x']);
});

test('5.3.3 Commission rule: the word “commission”, any case', () => {
  assert.equal(mentionsCommission('European COMMISSION'), true);
  assert.equal(mentionsCommission('commissions'), true);
  assert.equal(mentionsCommission('subcommission'), false);
  assert.equal(mentionsCommission('NIS2'), false);
  assert.equal(searchEntities(m.entities, 'Commission').commission, true);
});

// 5.4 aggregations
test('5.4 dots inside a norm: type order, then entity name', () => {
  const grid = blockNormDots(m.links, m.norms);
  assert.deepEqual([...grid.get('Critical infrastructure').keys()], ['C']);
  const a = { entity: { type: 'Policies', name: 'A' }, link_id: 1 };
  const b = { entity: { type: 'Legislation', name: 'Z' }, link_id: 2 };
  const c = { entity: { type: 'Legislation', name: 'B' }, link_id: 3 };
  assert.deepEqual([a, b, c].sort(compareDots), [c, b, a]);
});

test('5.4 matrix cell: primary count, secondary count, hit from status', () => {
  const cols = ['Incident manager', 'Diplomat'];
  const matcher = createMatcher({ job: 'Diplomat' });
  const cells = matrixCells(m.links, m.norms, cols, 'job', matcher);
  assert.deepEqual(cells.get('A').get('Diplomat'), { primary: 1, secondary: 1, hit: true });
  assert.deepEqual(cells.get('A').get('Incident manager'), { primary: 1, secondary: 0, hit: true });
  assert.deepEqual(cells.get('C').get('Incident manager'), { primary: 0, secondary: 1, hit: false });
});

test('5.4 panel: links, distinct norms, per-norm counts ordered by count then letter', () => {
  const p = entityPanel(m, 'cra');
  assert.equal(p.links, 2);
  assert.equal(p.normCount, 2);
  assert.deepEqual(p.perNorm.map((n) => [n.normId, n.count]), [['A', 1], ['C', 1]]);
});
