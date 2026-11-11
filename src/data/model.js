// Derived model (BUILD_SPEC 4.2): built once, immutable. Indexes only; no row is changed or dropped.
import { TOPICS, JOBS } from '../config.js';

function groupBy(items, key) {
  const m = new Map();
  for (const it of items) {
    const k = typeof key === 'function' ? key(it) : it[key];
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(it);
  }
  for (const v of m.values()) Object.freeze(v);
  return m;
}

/** Distinct non-empty values of the given fields, in config order, unknown values last (data order). */
function distinctOrdered(links, fields, order) {
  const seen = new Set();
  for (const l of links) for (const f of fields) if (l[f] !== '') seen.add(l[f]);
  const known = order.filter((v) => seen.has(v));
  const unknown = [...seen].filter((v) => !order.includes(v));
  return Object.freeze([...known, ...unknown]);
}

export function buildModel(raw) {
  const normById = new Map(raw.norms.map((n) => [n.norm_id, n]));
  const entityById = new Map(raw.entities.map((e) => [e.entity_id, e]));

  // Links carry refs to their norm and entity. A broken ref stays undefined (validation reports it).
  const links = Object.freeze(
    raw.links.map((l) => Object.freeze({ ...l, norm: normById.get(l.norm_id), entity: entityById.get(l.entity_id) })),
  );

  const linksByNorm = groupBy(links, 'norm_id');
  const linksByEntity = groupBy(links, 'entity_id');

  const entityNormSummary = new Map();
  for (const [entityId, ls] of linksByEntity) {
    const perNorm = new Map();
    for (const l of ls) {
      if (!perNorm.has(l.norm_id)) perNorm.set(l.norm_id, { count: 0, operationalizations: [] });
      const s = perNorm.get(l.norm_id);
      s.count += 1;
      if (l.operationalization !== '' && !s.operationalizations.includes(l.operationalization))
        s.operationalizations.push(l.operationalization);
    }
    for (const s of perNorm.values()) Object.freeze(s.operationalizations), Object.freeze(s);
    entityNormSummary.set(entityId, perNorm);
  }

  return Object.freeze({
    norms: raw.norms,
    entities: raw.entities,
    links,
    meta: raw.meta ?? null,
    normById,
    entityById,
    linksByNorm,
    linksByEntity,
    linksByTopicPrimary: groupBy(links, 'topic_primary'),
    linksByJobPrimary: groupBy(links, 'job_primary'),
    topics: distinctOrdered(links, ['topic_primary', 'topic_secondary'], TOPICS.map((t) => t.value)),
    jobs: distinctOrdered(links, ['job_primary', 'job_secondary'], JOBS.map((j) => j.value)),
    entityNormSummary,
  });
}
