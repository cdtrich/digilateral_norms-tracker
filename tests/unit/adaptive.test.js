// View 2 (BUILD_SPEC 5.5–5.9, 12): adaptive grouping, ghost totals, card threshold, includeSecondary,
// show non-matching, combobox suggestions, URL round-trip, and every v2 golden value (4.5).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildModel } from '../../src/data/model.js';
import { adaptiveLayout, groupingDimension, countLabel } from '../../src/logic/layout-adaptive.js';
import { fixedLayout } from '../../src/logic/layout-fixed.js';
import { createMatcher, matchLevel } from '../../src/logic/match.js';
import { suggestItems } from '../../src/logic/search.js';
import { parseQuery, serializeQuery, DEFAULT_STATE, clearAll, criteriaOf } from '../../src/logic/state.js';
import { derive, countLine } from '../../src/logic/view.js';
import { TYPES, CARD_THRESHOLD, DEFAULT_VIEW } from '../../src/config.js';
import { loadRealModel, fixtureRaw } from './helpers.js';

const m = loadRealModel();
const copy = JSON.parse(readFileSync(new URL('../../src/content/copy.json', import.meta.url), 'utf8'));
const STAB = 'Stability and security';
const EEAS = 'european-external-action-service-eeas';
const ENISA = 'european-union-agency-for-cybersecurity-enisa';
const layout = (criteria, opts = {}) => adaptiveLayout(m.links, criteria, { norms: m.norms, ...opts });
const headers = (L) => Object.fromEntries(L.groups.map((g) => [g.value, g.countText]));
const perGroup = (L) => Object.fromEntries(L.groups.map((g) => [g.value, g.n]));

// ── 5.5 grouping table ───────────────────────────────────────────────────────────────────────────
test('5.5 grouping dimension: first of Topic → Norm → Type not pinned', () => {
  assert.equal(groupingDimension({}), 'topic');
  assert.equal(groupingDimension({ type: 'Legislation' }), 'topic');
  assert.equal(groupingDimension({ orientation: 'prohibitive' }), 'topic');
  assert.equal(groupingDimension({ norm: 'A' }), 'topic');
  assert.equal(groupingDimension({ topic: STAB }), 'norm');
  assert.equal(groupingDimension({ job: 'Diplomat' }), 'norm'); // job pins topic (lens)
  assert.equal(groupingDimension({ topic: STAB, norm: 'A' }), 'type');
  assert.equal(groupingDimension({ job: 'Diplomat', norm: 'A' }), 'type');
  assert.equal(groupingDimension({ item: EEAS }), 'norm');
  assert.equal(groupingDimension({ item: EEAS, type: 'Institutions' }), 'norm');
  assert.equal(groupingDimension({ item: EEAS, norm: 'A' }), 'type');
  assert.equal(groupingDimension({ q: 'commission' }), 'norm');
  assert.equal(groupingDimension({ topic: STAB, norm: 'A', type: 'Institutions' }), 'all');
});

test('5.5 group order, empty groups, order inside a group', () => {
  const byNorm = layout({ topic: STAB });
  assert.deepEqual(byNorm.groups.map((g) => g.value), ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']); // no I, J, K
  const byType = layout({ topic: STAB, norm: 'A' });
  assert.deepEqual(byType.groups.map((g) => g.value), TYPES.filter((t) => byType.groups.some((g) => g.value === t)));
  const byTopic = layout({});
  assert.deepEqual(byTopic.groups.map((g) => g.value), [
    'Incident response and management', 'Critical infrastructure', 'Stability and security', 'Supply chain security',
    'Cybercrime and terrorism', 'Vulnerability disclosure', 'Human rights and privacy']);
  // full before partial, then type order, then name
  for (const g of byNorm.groups) {
    const st = g.links.map((l) => byNorm.statusById.get(l.link_id));
    assert.deepEqual(st, [...st].sort((a, b) => (a === 'full' ? 0 : 1) - (b === 'full' ? 0 : 1)), g.value);
    const full = g.links.filter((l) => byNorm.statusById.get(l.link_id) === 'full');
    for (let i = 1; i < full.length; i += 1) assert.ok(TYPES.indexOf(full[i - 1].entity.type) <= TYPES.indexOf(full[i].entity.type));
  }
  const all = layout({ topic: STAB, norm: 'A', type: 'Institutions' });
  assert.equal(all.groups.length, 1);
  assert.equal(all.groupBy, 'all');
});

test('5.5 only full and partial links are laid out; topic groups hold norm sub-groups', () => {
  const L = layout({ type: 'Legislation' });
  assert.equal(L.visible, 64);
  assert.equal(L.groups.reduce((a, g) => a + g.n, 0), 64);
  for (const g of L.groups) assert.equal(g.subgroups.reduce((a, s) => a + s.n, 0), g.n);
  assert.ok(L.groups.every((g) => g.links.every((l) => l.entity.type === 'Legislation')));
});

// ── 5.6 ghost totals and header text ────────────────────────────────────────────────────────────
test('5.6 count label: “n of N” with item or search, “p +s” with topic or job, else n', () => {
  const g = { n: 3, N: 28, primary: 3, secondary: 0 };
  assert.equal(countLabel(g, { ghost: true, split: false }), '3 of 28');
  assert.equal(countLabel({ n: 28, primary: 24, secondary: 4 }, { ghost: false, split: true }), '24 +4');
  assert.equal(countLabel({ n: 5 }, { ghost: false, split: false }), '5');
  assert.equal(layout({ type: 'Legislation' }).groups[0].countText, '20');
  assert.equal(layout({ q: 'ENISA' }, { searchMatches: [ENISA] }).groups.find((g) => g.value === 'J').countText, '6 of 18');
});

// ── 5.7 card threshold ──────────────────────────────────────────────────────────────────────────
test('5.7 card threshold: 12 visible links → cards, 13 → dots, 0 → no groups', () => {
  assert.equal(CARD_THRESHOLD, 12);
  const positive = m.links.filter((l) => l.norm.orientation === 'positive');
  const c = { orientation: 'positive' };
  assert.equal(adaptiveLayout(positive.slice(0, 12), c, { norms: m.norms }).mode, 'cards');
  assert.equal(adaptiveLayout(positive.slice(0, 13), c, { norms: m.norms }).mode, 'dots');
  assert.equal(adaptiveLayout(positive.slice(0, 13), c, { norms: m.norms, cardThreshold: 13 }).mode, 'cards');
  const none = adaptiveLayout(m.links, { norm: 'K', topic: STAB }, { norms: m.norms });
  assert.equal(none.visible, 0);
  assert.equal(none.groups.length, 0);
  assert.equal(none.mode, 'dots');
});

test('5.7 card labels: primary / secondary topic or job match; none without topic or job', () => {
  const l = m.links.find((x) => x.topic_secondary === STAB);
  assert.deepEqual(matchLevel(l, { topic: STAB }), { level: 'secondary', via: 'topic' });
  assert.deepEqual(matchLevel(l, { topic: l.topic_primary }), { level: 'primary', via: 'topic' });
  assert.deepEqual(matchLevel(l, { job: l.job_primary }), { level: 'primary', via: 'job' });
  assert.equal(matchLevel(l, { norm: l.norm_id }), null);
});

// ── 5.2 includeSecondary ────────────────────────────────────────────────────────────────────────
test('5.2 includeSecondary off: partial becomes none (fixture)', () => {
  const f = buildModel(fixtureRaw());
  const on = f.links.map(createMatcher({ topic: STAB }));
  const off = f.links.map(createMatcher({ topic: STAB }, { includeSecondary: false }));
  assert.deepEqual(on, ['partial', 'full', 'none', 'none']);
  assert.deepEqual(off, ['none', 'full', 'none', 'none']);
  assert.deepEqual(f.links.map(createMatcher({ item: 'cra' })), ['full', 'none', 'none', 'full']);
});

// ── 5.8 show non-matching ───────────────────────────────────────────────────────────────────────
test('5.8 show non-matching dots: the fixed layout of view 1, every link, same positions', () => {
  const L = layout({ topic: STAB }, { showNonMatching: true });
  const fixed = fixedLayout(m.links, m.norms);
  assert.equal(L.fixed, true);
  assert.equal(L.mode, 'dots');
  assert.deepEqual(L.groups.map((g) => g.links.map((l) => l.link_id)), fixed.groups.map((g) => g.links.map((l) => l.link_id)));
  assert.equal(L.visible, 95); // the count line still counts matches
  assert.equal(L.groups.reduce((a, g) => a + g.n, 0), 196);
});

// ── 5.9 combobox ────────────────────────────────────────────────────────────────────────────────
test('5.9 suggestions: word-start match, grouped by type in config order, link counts, type narrowing', () => {
  const s = suggestItems(m.entities, m.linksByEntity, 'commission', { types: TYPES });
  assert.equal(s.total, 4);
  assert.deepEqual(s.groups.map((g) => g.type), ['Legislation', 'Policies', 'Institutions']);
  assert.deepEqual(s.groups.map((g) => g.items.map((i) => i.links)), [[1], [1, 2], [1]]);
  const pol = s.groups.find((g) => g.type === 'Policies').items.map((i) => i.name);
  assert.deepEqual(pol, [...pol].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })));
  const narrowed = suggestItems(m.entities, m.linksByEntity, 'commission', { types: TYPES, type: 'Policies' });
  assert.equal(narrowed.total, 2);
  assert.deepEqual(narrowed.groups.map((g) => g.type), ['Policies']);
  assert.equal(suggestItems(m.entities, m.linksByEntity, 'cra', { types: TYPES }).groups.flatMap((g) => g.items).some((i) => /democracy/i.test(i.name)), false);
  assert.equal(suggestItems(m.entities, m.linksByEntity, '', { types: TYPES }).total, 0);
  const all = suggestItems(m.entities, m.linksByEntity, '', { types: TYPES, all: true });
  assert.equal(all.total, 91);
  assert.equal(all.groups.reduce((a, g) => a + g.items.reduce((x, i) => x + i.links, 0), 0), 196);
});

// ── URL round-trip ──────────────────────────────────────────────────────────────────────────────
test('URL: view, tab, item, sec and non round-trip; defaults are left out', () => {
  assert.equal(DEFAULT_VIEW, '2');
  assert.equal(serializeQuery(DEFAULT_STATE), '');
  const qs = `?view=1&tab=methodology&by=job&q=NIS2&item=${EEAS}&norm=C&type=Legislation&topic=Stability+and+security&job=Diplomat&sec=0&non=1`;
  const { state, ignored } = parseQuery(qs, m);
  assert.deepEqual(ignored, []);
  assert.equal(state.view, '1');
  assert.equal(state.tab, 'methodology');
  assert.equal(state.sec, false);
  assert.equal(state.non, true);
  assert.deepEqual(parseQuery(serializeQuery(state), m).state, state);
  const { state: s2 } = parseQuery(`?item=${EEAS}&sec=1&non=0`, m);
  assert.equal(serializeQuery(s2), `?by=topic&item=${EEAS}`);
  const bad = parseQuery('?view=3&sec=maybe&non=yes', m);
  assert.deepEqual(bad.ignored.map((i) => i.key), ['view', 'sec', 'non']);
  assert.equal(bad.state.view, '2');
  assert.equal(parseQuery('?view=2&block=Critical+infrastructure', m).state.block, ''); // block focus is view 1 only
});

test('state: item is a criterion in view 2 only; Clear all keeps sec and non', () => {
  const s = { ...DEFAULT_STATE, by: 'topic', item: EEAS };
  assert.equal(criteriaOf(s).item, EEAS);
  assert.equal(criteriaOf({ ...s, view: '1' }).item, '');
  const cleared = clearAll({ ...s, topic: STAB, sec: false, non: true });
  assert.equal(cleared.item, '');
  assert.equal(cleared.topic, '');
  assert.equal(cleared.sec, false);
  assert.equal(cleared.non, true);
});

// ── 4.5 golden values (v2) ──────────────────────────────────────────────────────────────────────
test('golden: norm totals', () => {
  const L = layout({ orientation: '' , norm: '' });
  const perNorm = {};
  for (const l of m.links) perNorm[l.norm_id] = (perNorm[l.norm_id] ?? 0) + 1;
  assert.deepEqual(perNorm, { A: 28, B: 27, C: 17, D: 17, E: 15, F: 14, G: 23, H: 10, I: 22, J: 18, K: 5 });
  assert.equal(L.visible, 196);
});

test('golden: topic Stability and security, secondary included and excluded', () => {
  const L = layout({ topic: STAB });
  assert.equal(L.groupBy, 'norm');
  assert.equal(L.visible, 95);
  assert.equal(L.primary, 30);
  assert.equal(L.secondary, 65);
  assert.deepEqual(headers(L), { A: '24 +4', B: '4 +5', C: '2 +15', D: '0 +4', E: '0 +2', F: '0 +12', G: '0 +15', H: '0 +8' });
  const off = layout({ topic: STAB }, { includeSecondary: false });
  assert.equal(off.visible, 30);
  assert.deepEqual(perGroup(off), { A: 24, B: 4, C: 2 });
  assert.deepEqual(headers(off), { A: '24', B: '4', C: '2' });
});

test('golden: EEAS alone, with Stability and security, secondary on and off', () => {
  const alone = layout({ item: EEAS });
  assert.equal(m.entityById.get(EEAS).name, 'European External Action Service (EEAS)');
  assert.equal(m.entityById.get(EEAS).type, 'Institutions');
  assert.equal(alone.visible, 8);
  assert.deepEqual(perGroup(alone), { A: 3, B: 2, C: 1, E: 1, F: 1 });

  const L = layout({ item: EEAS, topic: STAB });
  assert.equal(L.visible, 8);
  assert.equal(L.primary, 6);
  assert.equal(L.secondary, 2);
  assert.equal(L.mode, 'cards');
  assert.equal(L.groupBy, 'norm');
  assert.deepEqual(headers(L), { A: '3 of 28', B: '2 of 9', C: '1 of 17', E: '1 of 2', F: '1 of 12' });
  assert.deepEqual(L.groups.filter((g) => g.secondary > 0).map((g) => g.value), ['E', 'F']);

  const off = layout({ item: EEAS, topic: STAB }, { includeSecondary: false });
  assert.equal(off.visible, 6);
  assert.deepEqual(perGroup(off), { A: 3, B: 2, C: 1 });
});

test('golden: ENISA alone, dot mode, “n of N” headers', () => {
  const L = layout({ item: ENISA });
  assert.equal(L.visible, 18);
  assert.equal(L.mode, 'dots');
  assert.deepEqual(headers(L), { A: '2 of 28', B: '2 of 27', C: '1 of 17', G: '3 of 23', H: '1 of 10', I: '3 of 22', J: '6 of 18' });
});

// ── derive + count line + announcement ─────────────────────────────────────────────────────────
test('derive (view 2): item chip, announcement, count line', () => {
  const S = (p) => ({ ...DEFAULT_STATE, by: 'topic', ...p });
  const v = derive(m, S({ item: EEAS, topic: STAB }));
  assert.equal(v.adaptive, true);
  assert.equal(v.dimmed, false);
  assert.deepEqual(v.chips.map((c) => c.label), ['Item: EEAS', 'Topic: Stability & security']);
  assert.equal(v.announce, '8 of 196 links match: item EEAS, topic Stability and security.');
  const line = countLine(v, copy);
  assert.equal(line.heading, '8 of 196 links');
  assert.match(line.text, /^6 with this primary topic, 2 through a secondary topic \(rings\)\./);
  assert.match(line.text, /Twelve links or fewer/);

  const all = countLine(derive(m, S({})), copy);
  assert.equal(all.heading, '196 links');
  const topic = countLine(derive(m, S({ topic: STAB })), copy);
  assert.equal(topic.heading, '95 of 196 links');
  assert.match(topic.text, /^30 with this primary topic, 65 through a secondary topic/);
  assert.equal(derive(m, S({ norm: 'K', topic: STAB })).announce, 'No links match: norm K, topic Stability and security.');
  const non = countLine(derive(m, S({ topic: STAB, non: true })), copy);
  assert.equal(non.heading, '95 of 196 links');
  assert.match(non.text, /All 196 links stay in their topic blocks/);
});

test('derive (view 1) is unchanged by the item criterion: selection dims, no item chip', () => {
  const v = derive(m, { ...DEFAULT_STATE, view: '1', by: 'topic', item: ENISA });
  assert.equal(v.adaptive, false);
  assert.equal(v.dimmed, true);
  assert.deepEqual(v.chips, []);
  assert.equal(v.layout.fixed, true);
});
