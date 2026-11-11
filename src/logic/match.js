// Pure per-link matching (BUILD_SPEC 5.1, 5.2).

export const STATUS = Object.freeze({ DEFAULT: 'default', FULL: 'full', PARTIAL: 'partial', NONE: 'none' });

export const CRITERIA = Object.freeze(['q', 'norm', 'orientation', 'type', 'topic', 'job']);

const isSet = (v) => typeof v === 'string' && v.trim() !== '';

/** Names of the criteria that are active. */
export function activeCriteria(criteria = {}) {
  return CRITERIA.filter((k) => isSet(criteria[k]));
}

/**
 * Build a status function for the given criteria.
 * @param {object} criteria  { q, norm, orientation, type, topic, job } (any subset)
 * @param {{ searchMatches?: Iterable<string> }} ctx  entity_ids matched by the search (search.js `matches`)
 * @returns {(link) => 'default' | 'full' | 'partial' | 'none'}
 */
export function createMatcher(criteria = {}, { searchMatches = [] } = {}) {
  const active = activeCriteria(criteria);
  if (active.length === 0) return () => STATUS.DEFAULT;
  const searchSet = new Set(searchMatches);
  const c = criteria;

  return (link) => {
    if (isSet(c.norm) && link.norm_id !== c.norm) return STATUS.NONE;
    if (isSet(c.orientation) && link.norm?.orientation !== c.orientation) return STATUS.NONE;
    if (isSet(c.type) && link.entity?.type !== c.type) return STATUS.NONE;
    if (isSet(c.q) && !searchSet.has(link.entity_id)) return STATUS.NONE;

    let secondary = false;
    for (const [key, field] of [['topic', 'topic'], ['job', 'job']]) {
      if (!isSet(c[key])) continue;
      if (link[`${field}_primary`] === c[key]) continue;
      if (link[`${field}_secondary`] === c[key]) secondary = true;
      else return STATUS.NONE;
    }
    return secondary ? STATUS.PARTIAL : STATUS.FULL;
  };
}

/** Status per link_id plus totals. */
export function statusOfLinks(links, matcher) {
  const byId = new Map();
  const totals = { default: 0, full: 0, partial: 0, none: 0 };
  for (const l of links) {
    const s = matcher(l);
    byId.set(l.link_id, s);
    totals[s] += 1;
  }
  return { byId, totals };
}
