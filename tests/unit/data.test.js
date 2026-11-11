import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDataset } from '../../src/data/load.js';
import { validateDataset } from '../../src/data/validate.js';
import { buildModel } from '../../src/data/model.js';
import { FIXTURE, fixtureRaw, loadRealRaw } from './helpers.js';

const codes = (problems) => problems.map((p) => p.code);

test('loader: strings stay strings, link_id becomes an integer, empty stays empty string', () => {
  const raw = parseDataset(FIXTURE);
  assert.equal(raw.links[0].link_id, 1);
  assert.equal(typeof raw.links[0].norm_id, 'string');
  assert.equal(raw.links[1].topic_secondary, '');
  assert.equal(raw.entities[0].aliases, '');
  assert.deepEqual(raw.links.columns.slice(0, 2), ['link_id', 'norm_id']);
});

test('loader: rows are frozen (no mutation)', () => {
  const raw = parseDataset(FIXTURE);
  assert.ok(Object.isFrozen(raw.links));
  assert.ok(Object.isFrozen(raw.links[0]));
  assert.throws(() => { 'use strict'; raw.links[0].topic_primary = 'x'; }, TypeError);
});

test('validation: fixture and real data are clean', () => {
  assert.deepEqual(validateDataset(fixtureRaw()), []);
  assert.deepEqual(validateDataset(loadRealRaw()), []);
});

test('validation: unknown topic fails', () => {
  const links = FIXTURE.links.replace('2,A,Op two,dem,Stability and security', '2,A,Op two,dem,Space security');
  assert.deepEqual(codes(validateDataset(fixtureRaw({ links }))), ['unknown-topic']);
});

test('validation: unknown secondary job fails', () => {
  const links = FIXTURE.links.replace('Incident manager,Diplomat', 'Incident manager,Astronaut');
  assert.deepEqual(codes(validateDataset(fixtureRaw({ links }))), ['unknown-job']);
});

test('validation: empty primary topic or job fails, empty secondary is fine', () => {
  const links = FIXTURE.links.replace('2,A,Op two,dem,Stability and security,,Diplomat,', '2,A,Op two,dem,,,,');
  assert.deepEqual(codes(validateDataset(fixtureRaw({ links }))), ['empty-topic_primary', 'empty-job_primary']);
});

test('validation: unknown type fails', () => {
  const entities = FIXTURE.entities.replace('European Democracy Action Plan,,Policies', 'European Democracy Action Plan,,Strategies');
  assert.deepEqual(codes(validateDataset(fixtureRaw({ entities }))), ['unknown-type']);
});

test('validation: bad orientation fails', () => {
  const norms = FIXTURE.norms.replace('Norm C: Gamma,prohibitive', 'Norm C: Gamma,negative');
  assert.deepEqual(codes(validateDataset(fixtureRaw({ norms }))), ['unknown-orientation']);
});

test('validation: broken norm and entity references fail', () => {
  const links = FIXTURE.links.replace('2,A,Op two,dem', '2,Z,Op two,ghost');
  assert.deepEqual(codes(validateDataset(fixtureRaw({ links }))), ['broken-norm-ref', 'broken-entity-ref']);
});

test('validation: duplicate and non-integer link_id fail', () => {
  const dup = FIXTURE.links.replace('\n2,A,', '\n1,A,');
  assert.deepEqual(codes(validateDataset(fixtureRaw({ links: dup }))), ['duplicate-id']);
  const bad = FIXTURE.links.replace('\n2,A,', '\n2a,A,');
  assert.deepEqual(codes(validateDataset(fixtureRaw({ links: bad }))), ['bad-link-id']);
});

test('validation: duplicate entity_id and missing column fail', () => {
  const entities = FIXTURE.entities.replace('dem,European', 'cra,European');
  assert.ok(codes(validateDataset(fixtureRaw({ entities }))).includes('duplicate-id'));
  const norms = FIXTURE.norms.replace('norm_id,title,label,orientation', 'norm_id,title,label,kind');
  assert.ok(codes(validateDataset(fixtureRaw({ norms }))).includes('missing-column'));
});

test('validation: meta.json must have every key, string or null', () => {
  const raw = fixtureRaw();
  assert.deepEqual(codes(validateDataset({ ...raw, meta: { version: null } })), Array(5).fill('bad-meta'));
  assert.deepEqual(codes(validateDataset({ ...raw, meta: { ...raw.meta, date: 2026 } })), ['bad-meta']);
  assert.deepEqual(codes(validateDataset({ ...raw, meta: null })), ['bad-meta']);
});

test('model: refs, indexes, distinct operationalizations; nothing dropped', () => {
  const m = buildModel(fixtureRaw());
  assert.equal(m.links.length, 4);
  assert.equal(m.links[0].norm.label, 'Norm A: Alpha');
  assert.equal(m.links[0].entity.short_name, 'CRA');
  assert.equal(m.linksByNorm.get('C').length, 2);
  assert.equal(m.linksByEntity.get('cra').length, 2);
  assert.equal(m.linksByTopicPrimary.get('Stability and security').length, 1);
  assert.equal(m.linksByJobPrimary.get('Diplomat').length, 1);
  assert.deepEqual(m.topics, ['Incident response and management', 'Critical infrastructure', 'Stability and security', 'Supply chain security']);
  assert.deepEqual(m.jobs, ['Incident manager', 'Threat analyst', 'Critical infrastructure actor', 'Diplomat']);
  assert.deepEqual(m.entityNormSummary.get('cra').get('C'), { count: 1, operationalizations: ['Op three'] });
});

test('model: a broken reference stays undefined and is not repaired', () => {
  const links = FIXTURE.links.replace('2,A,Op two,dem', '2,A,Op two,ghost');
  const m = buildModel(fixtureRaw({ links }));
  assert.equal(m.links.length, 4);
  assert.equal(m.links[1].entity, undefined);
});
