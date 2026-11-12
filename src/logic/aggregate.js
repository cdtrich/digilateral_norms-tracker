// Pure aggregations for blocks, matrix and panel (BUILD_SPEC 5.4). Every count is computed here.
import { TYPES } from '../config.js';
import { STATUS } from './match.js';
import { searchEntities } from './search.js';

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
 * hitLevel: 'full' when any of those links is full, else 'partial' when any is partial, else null.
 * secondaryHits (default true): when false, only the links a cell counts at primary level can make it a hit
 * (view 2, topic mode: the cell shows the primary count only, so its colour follows that number).
 * @returns Map<norm_id, Map<value, {primary, secondary, hit, hitLevel}>>
 */
export function matrixCells(links, norms, columns, mode, statusFn = null, { secondaryHits = true } = {}) {
  const field = mode === 'job' ? 'job' : 'topic';
  const out = new Map();
  for (const n of norms)
    out.set(n.norm_id, new Map(columns.map((c) => [c, { primary: 0, secondary: 0, hit: false, hitLevel: null }])));
  const mark = (cell, status) => {
    if (status === STATUS.FULL) { cell.hit = true; cell.hitLevel = 'full'; }
    else if (status === STATUS.PARTIAL) { cell.hit = true; if (!cell.hitLevel) cell.hitLevel = 'partial'; }
  };
  for (const l of links) {
    const row = out.get(l.norm_id);
    if (!row) continue;
    const status = statusFn ? statusFn(l) : null;
    const p = row.get(l[`${field}_primary`]);
    if (p) { p.primary += 1; mark(p, status); }
    const s = l[`${field}_secondary`] !== l[`${field}_primary`] ? row.get(l[`${field}_secondary`]) : undefined;
    if (s) { s.secondary += 1; if (secondaryHits) mark(s, status); }
  }
  return out;
}

/**
 * Drill-down tree for one topic block (BlockFocus, mobile list): norm › type › item.
 * Norms in `norms` order, types in config order, items by name. Counts are links within the block.
 */
export function blockTree(links, norms, topic) {
  const inBlock = links.filter((l) => l.topic_primary === topic);
  return norms
    .map((norm) => {
      const ls = inBlock.filter((l) => l.norm_id === norm.norm_id);
      const types = [...TYPES, ...new Set(ls.map((l) => l.entity?.type).filter((t) => !TYPES.includes(t)))]
        .map((type) => {
          const tl = ls.filter((l) => l.entity?.type === type);
          const byEntity = new Map();
          for (const l of tl) {
            if (!byEntity.has(l.entity_id)) byEntity.set(l.entity_id, []);
            byEntity.get(l.entity_id).push(l);
          }
          const items = [...byEntity.entries()]
            .map(([entityId, el]) => ({ entityId, entity: el[0].entity, links: el.sort(compareDots) }))
            .sort((a, b) => (a.entity?.name ?? '').localeCompare(b.entity?.name ?? '', 'en', { sensitivity: 'base' }));
          return { type, count: tl.length, items };
        })
        .filter((t) => t.count > 0);
      return { normId: norm.norm_id, norm, count: ls.length, links: ls.sort(compareDots), types };
    })
    .filter((n) => n.count > 0);
}

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const word = (n) => NUMBER_WORDS[n] ?? String(n);
const listLetters = (ids) => (ids.length <= 1 ? ids.join('') : `${ids.slice(0, -1).join(', ')} and ${ids.at(-1)}`);

/**
 * Values for {tokens} in the methodology copy, all computed from the data and config.
 * A missing value becomes a visible “[?]” so a data change cannot silently produce a wrong sentence.
 */
export function methodologyFacts(model, { jobNotSpecified, types, topicsConfigured, jobsConfigured }) {
  const prohibitive = model.norms.filter((n) => n.orientation === 'prohibitive').map((n) => n.norm_id);
  const positive = model.norms.filter((n) => n.orientation === 'positive').map((n) => n.norm_id);
  const commission = model.entities.find((e) => e.name === 'European Commission');
  const commissionLinks = commission ? model.linksByEntity.get(commission.entity_id) ?? [] : [];
  const commissionNorms = [...new Set(commissionLinks.map((l) => l.norm_id))];
  const notSpecifiedNorms = [...new Set(model.links.filter((l) => l.job_primary === jobNotSpecified).map((l) => l.norm_id))];
  const jobsSpecified = model.jobs.filter((j) => j !== jobNotSpecified && jobsConfigured.includes(j));
  return {
    links: String(model.links.length),
    norms: String(model.norms.length),
    entities: String(model.entities.length),
    normRange: model.norms.length ? `${model.norms[0].norm_id}–${model.norms.at(-1).norm_id}` : '[?]',
    prohibitiveWord: word(prohibitive.length),
    prohibitiveList: listLetters(prohibitive) || '[?]',
    positiveWord: word(positive.length),
    topicsWord: word(model.topics.filter((t) => topicsConfigured.includes(t)).length),
    topics: String(model.topics.filter((t) => topicsConfigured.includes(t)).length),
    jobsWord: word(jobsSpecified.length),
    jobsSpecified: String(jobsSpecified.length),
    typesWord: word(types.length),
    distinctOperationalizations: String(new Set(model.links.map((l) => l.operationalization)).size),
    normOperationalizations: String(new Set(model.links.map((l) => `${l.norm_id}\u0000${l.operationalization}`)).size),
    commissionLinksWord: commission ? word(commissionLinks.length) : '[?]',
    commissionLinksWordCap: commission ? word(commissionLinks.length).replace(/^./, (c) => c.toUpperCase()) : '[?]',
    commissionLinkNoun: commissionLinks.length === 1 ? 'link' : 'links',
    commissionNamesVerb: commissionLinks.length === 1 ? 'names' : 'name',
    commissionNorms: commissionNorms.length ? commissionNorms.map((n) => `Norm ${n}`).join(', ') : '[?]',
    commissionOthersWord: word(searchEntities(model.entities, 'Commission').matches.filter((id) => id !== commission?.entity_id).length),
    notSpecifiedNorms: notSpecifiedNorms.length ? notSpecifiedNorms.map((n) => `Norm ${n}`).join(', ') : '[?]',
  };
}

/** Replace {token} in a string; unknown tokens become a visible “[?]”. */
export function fillTokens(text, facts) {
  return text.replace(/\{(\w+)\}/g, (_, k) => (k in facts ? facts[k] : '[?]'));
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
