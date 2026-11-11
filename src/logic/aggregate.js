// Pure aggregations for blocks, matrix and panel (BUILD_SPEC 5.4). Every count is computed here.
import { TYPES } from '../config.js';
import { STATUS } from './match.js';

export function countBy(links, key) {
  const m = new Map();
  for (const l of links) {
    const k = typeof key === 'function' ? key(l) : l[key];
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

/** Links per primary topic (grid blocks are always grouped by primary topic). */
export function blockCounts(links) {
  return countBy(links, 'topic_primary');
}

/** Dot order inside a norm group: type (config order), then entity name. */
export function compareDots(a, b) {
  const ta = TYPES.indexOf(a.entity?.type);
  const tb = TYPES.indexOf(b.entity?.type);
  if (ta !== tb) return (ta === -1 ? Infinity : ta) - (tb === -1 ? Infinity : tb);
  const byName = (a.entity?.name ?? '').localeCompare(b.entity?.name ?? '', 'en', { sensitivity: 'base' });
  return byName !== 0 ? byName : a.link_id - b.link_id;
}

/** topic_primary → norm_id → links (sorted for display). Norm order follows `norms`. */
export function blockNormDots(links, norms) {
  const out = new Map();
  for (const l of links) {
    if (!out.has(l.topic_primary)) out.set(l.topic_primary, new Map());
    const byNorm = out.get(l.topic_primary);
    if (!byNorm.has(l.norm_id)) byNorm.set(l.norm_id, []);
    byNorm.get(l.norm_id).push(l);
  }
  const normOrder = norms.map((n) => n.norm_id);
  for (const [topic, byNorm] of out) {
    const sorted = new Map(
      [...byNorm.entries()]
        .sort(([a], [b]) => normOrder.indexOf(a) - normOrder.indexOf(b))
        .map(([n, ls]) => [n, ls.sort(compareDots)]),
    );
    out.set(topic, sorted);
  }
  return out;
}

/**
 * Matrix cells for norms × topic or job columns.
 * primary: links with (norm, column) at primary level; secondary: at secondary level (shown as “+n” in job mode).
 * hit: at least one link of the cell (primary or secondary) has status full or partial.
 * @returns Map<norm_id, Map<value, {primary, secondary, hit}>>
 */
export function matrixCells(links, norms, columns, mode, statusFn = null) {
  const field = mode === 'job' ? 'job' : 'topic';
  const out = new Map();
  for (const n of norms) out.set(n.norm_id, new Map(columns.map((c) => [c, { primary: 0, secondary: 0, hit: false }])));
  for (const l of links) {
    const row = out.get(l.norm_id);
    if (!row) continue;
    const isHit = statusFn ? [STATUS.FULL, STATUS.PARTIAL].includes(statusFn(l)) : false;
    const p = row.get(l[`${field}_primary`]);
    if (p) { p.primary += 1; if (isHit) p.hit = true; }
    const s = l[`${field}_secondary`] !== l[`${field}_primary`] ? row.get(l[`${field}_secondary`]) : undefined;
    if (s) { s.secondary += 1; if (isHit) s.hit = true; }
  }
  return out;
}

/** Per job: links at primary level, and at primary or secondary level (JobPicker chips). */
export function jobLensCounts(links, jobs) {
  return new Map(
    jobs.map((j) => [
      j,
      {
        primary: links.filter((l) => l.job_primary === j).length,
        withSecondary: links.filter((l) => l.job_primary === j || l.job_secondary === j).length,
      },
    ]),
  );
}

/** Same as jobLensCounts for topics. */
export function topicLensCounts(links, topics) {
  return new Map(
    topics.map((t) => [
      t,
      {
        primary: links.filter((l) => l.topic_primary === t).length,
        withSecondary: links.filter((l) => l.topic_primary === t || l.topic_secondary === t).length,
      },
    ]),
  );
}

/** Links per entity type (counted per link). */
export function linksPerType(links) {
  return countBy(links, (l) => l.entity?.type);
}

/**
 * Summary of a set of links: total, distinct norms (in norm order), links per norm.
 * Used for an item (panel) and for a search result (“22 links match NIS2 across 9 norms”).
 */
export function linkSummary(links, norms) {
  const perNorm = countBy(links, 'norm_id');
  const normIds = norms.map((n) => n.norm_id).filter((id) => perNorm.has(id));
  return { links: links.length, norms: normIds, perNorm };
}

/**
 * Panel data for one entity: links, distinct norms, and per norm the link count and distinct
 * operationalizations, ordered by link count (desc), ties by norm letter.
 */
export function entityPanel(model, entityId) {
  const links = model.linksByEntity.get(entityId) ?? [];
  const summary = model.entityNormSummary.get(entityId) ?? new Map();
  const perNorm = [...summary.entries()]
    .map(([normId, s]) => ({ normId, norm: model.normById.get(normId), count: s.count, operationalizations: s.operationalizations }))
    .sort((a, b) => b.count - a.count || a.normId.localeCompare(b.normId));
  return { entity: model.entityById.get(entityId), links: links.length, normCount: perNorm.length, perNorm };
}
