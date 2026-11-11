// state.js (store + URL), view.js (derived screen state), block tree and methodology facts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseQuery, serializeQuery, createStore, clearAll, drillUp, isOpening, DEFAULT_STATE } from '../../src/logic/state.js';
import { derive } from '../../src/logic/view.js';
import { resolveSearch } from '../../src/logic/search.js';
import { blockTree, methodologyFacts, fillTokens, matrixCells } from '../../src/logic/aggregate.js';
import { createMatcher } from '../../src/logic/match.js';
import { TOPICS, JOBS, TYPES, JOB_NOT_SPECIFIED } from '../../src/config.js';
import { loadRealModel } from './helpers.js';

const m = loadRealModel();
const S = (patch) => ({ ...DEFAULT_STATE, ...patch });

test('URL parse/serialise round-trip', () => {
  const qs = '?view=explore&by=job&q=NIS2&norm=C&orientation=prohibitive&type=Legislation&topic=Critical+infrastructure&job=Diplomat&item=european-commission&all=1';
  const { state, ignored } = parseQuery(qs, m);
  assert.deepEqual(ignored, []);
  assert.equal(state.job, 'Diplomat');
  assert.equal(state.all, true);
  const again = parseQuery(serializeQuery(state), m).state;
  assert.deepEqual(again, state);
  assert.equal(serializeQuery(DEFAULT_STATE), '');
  assert.equal(serializeQuery(S({ by: 'topic', q: 'ENISA' })), '?by=topic&q=ENISA');
});

test('URL: unknown keys and values are ignored and reported, never fatal', () => {
  const { state, ignored } = parseQuery('?by=sideways&job=Astronaut&norm=Z&item=nope&table=maybe&foo=1&q=ok', m);
  assert.equal(state.by, 'topic'); // q present → leaves the opening
  assert.equal(state.job, '');
  assert.equal(state.q, 'ok');
  assert.deepEqual(ignored.map((i) => i.key).sort(), ['by', 'foo', 'item', 'job', 'norm', 'table']);
});

test('state normalisation: drill-down needs its parent; criteria leave the opening', () => {
  assert.equal(parseQuery('?bnorm=A&btype=Policies', m).state.bnorm, '');
  const s = parseQuery('?block=Critical+infrastructure&btype=Policies', m).state;
  assert.equal(s.btype, '');
  assert.equal(s.by, 'topic');
  assert.ok(isOpening(DEFAULT_STATE));
  assert.ok(!isOpening(S({ by: 'job' })));
});

test('store: changing q resets “all”; clearAll keeps the starting point; drillUp', () => {
  const store = createStore({ by: 'job', q: 'NIS2', all: true });
  let calls = 0;
  store.subscribe(() => { calls += 1; });
  store.set({ q: 'ENISA' });
  assert.equal(store.get().all, false);
  store.set({ q: 'ENISA' }); // no change → no notification
  assert.equal(calls, 1);
  const cleared = clearAll(S({ by: 'job', q: 'x', norm: 'A', item: 'european-commission', block: 'Critical infrastructure' }));
  assert.deepEqual(cleared, S({ by: 'job' }));
  assert.deepEqual(drillUp(S({ by: 'topic', block: 'B', bnorm: 'A', btype: 'Policies' })), S({ by: 'topic', block: 'B', bnorm: 'A' }));
});

test('resolveSearch “all”: exact hit plus other mentions in list mode', () => {
  const r = resolveSearch(m.entities, 'NIS2', { all: true });
  assert.equal(r.mode, 'list');
  assert.equal(r.matches.length, 2);
  assert.equal(resolveSearch(m.entities, 'ENISA', { all: true }).mode, 'single'); // no other mentions
});

test('derive: panel modes, chips, announcement', () => {
  const nis2 = derive(m, S({ by: 'topic', q: 'NIS2' }));
  assert.equal(nis2.panel.mode, 'item');
  assert.equal(nis2.panel.fromSearch, true);
  assert.equal(nis2.panel.others.length, 1);
  assert.equal(nis2.announce, '22 links match “NIS2” across 9 norms.');
  assert.deepEqual(nis2.chips.map((c) => c.label), ['Search: NIS2']);

  const comm = derive(m, S({ by: 'topic', q: 'commission' }));
  assert.equal(comm.panel.mode, 'list');
  assert.equal(comm.panel.ids.length, 4);
  assert.equal(comm.search.commission, true);

  const picked = derive(m, S({ by: 'topic', q: 'commission', item: 'european-commission' }));
  assert.equal(picked.panel.mode, 'item');
  assert.equal(picked.selectedEntity, 'european-commission');

  assert.equal(derive(m, S({ by: 'topic', q: 'zzzz' })).panel.mode, 'empty');
  assert.equal(derive(m, S({ by: 'topic' })).panel, null);

  const job = derive(m, S({ by: 'job', job: 'Diplomat' }));
  assert.equal(job.announce, '93 links match the filters across 7 norms, 63 of them through a secondary topic or job.');
  assert.equal(derive(m, S({ by: 'topic', q: 'zzzz' })).announce, 'No links match “zzzz”.');
});

test('blockTree: norm › type › item counts add up to the block', () => {
  const tree = blockTree(m.links, m.norms, 'Incident response and management');
  assert.equal(tree.reduce((a, n) => a + n.count, 0), 54);
  const b = tree.find((n) => n.normId === 'B');
  assert.equal(b.count, 23);
  assert.deepEqual(b.types.map((t) => t.type), TYPES.filter((t) => b.types.some((x) => x.type === t)));
  for (const n of tree) assert.equal(n.types.reduce((a, t) => a + t.items.reduce((x, i) => x + i.links.length, 0), 0), n.count);
});

test('matrix hitLevel: full beats partial', () => {
  const cells = matrixCells(m.links, m.norms, ['Diplomat'], 'job', createMatcher({ job: 'Diplomat' }));
  assert.equal(cells.get('A').get('Diplomat').hitLevel, 'full');
  assert.equal(cells.get('F').get('Diplomat').hitLevel, 'partial');
  assert.equal(cells.get('E').get('Diplomat').hitLevel, null);
});

test('methodology facts are computed from the data', () => {
  const f = methodologyFacts(m, { jobNotSpecified: JOB_NOT_SPECIFIED, types: TYPES, topicsConfigured: TOPICS.map((t) => t.value), jobsConfigured: JOBS.map((j) => j.value) });
  assert.equal(f.links, '196');
  assert.equal(f.entities, '91');
  assert.equal(f.normRange, 'A–K');
  assert.equal(f.prohibitiveList, 'C, F and K');
  assert.equal(f.prohibitiveWord, 'three');
  assert.equal(f.positiveWord, 'eight');
  assert.equal(f.topicsWord, 'seven');
  assert.equal(f.jobsWord, 'five');
  assert.equal(f.distinctOperationalizations, '59');
  assert.equal(f.normOperationalizations, '63');
  assert.equal(f.commissionLinksWordCap, 'One');
  assert.equal(f.commissionNorms, 'Norm I');
  assert.equal(f.commissionOthersWord, 'three');
  assert.equal(f.notSpecifiedNorms, 'Norm E');
  assert.equal(fillTokens('{links} and {nope}', f), '196 and [?]');
});

test('derive: selection without filters dims other dots; with filters statuses are kept', () => {
  const v = derive(m, S({ by: 'topic', item: 'european-union-agency-for-cybersecurity-enisa' }));
  assert.equal(v.dimmed, true);
  const shown = [...v.displayById.values()];
  assert.equal(shown.filter((s) => s === 'default').length, 18);
  assert.equal(shown.filter((s) => s === 'none').length, 178);
  assert.ok([...v.statusById.values()].every((s) => s === 'default')); // real status untouched
  const f = derive(m, S({ by: 'topic', item: 'european-union-agency-for-cybersecurity-enisa', type: 'Institutions' }));
  assert.equal(f.dimmed, false);
  assert.equal(f.displayById, f.statusById);
});
