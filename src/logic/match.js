// Pure per-link matching (BUILD_SPEC 5.1, 5.2).

export const STATUS = Object.freeze({ DEFAULT: 'default', FULL: 'full', PARTIAL: 'partial', NONE: 'none' });

/** All criteria. `item` (a chosen entity) is a criterion in view 2; view 1 treats it as a selection only. */
export const CRITERIA = Object.freeze(['q', 'item', 'norm', 'orientation', 'type', 'topic', 'job']);

const isSet = (v) => typeof v === 'string' && v.trim() !== '';

/** Names of the criteria that are active. */
export function activeCriteria(criteria = {}) {
  return CRITERIA.filter((k) => isSet(criteria[k]));
}

/**
 * Build a status function for the given criteria.
 * @param {object} criteria  { q, item, norm, orientation, type, topic, job } (any subset)
 * @param {{ searchMatches?: Iterable<string>, includeSecondary?: boolean }} ctx
 *   searchMatches: entity_ids matched by the search (search.js `matches`).
 *   includeSecondary (default true): when false, a link that would be `partial` is `none` (5.2).
 * @returns {(link) => 'default' | 'full' | 'partial' | 'none'}
 */
export function createMatcher(criteria = {}, { searchMatches = [], includeSecondary = true } = {}) {
  const active = activeCriteria(criteria);
  if (active.length === 0) return () => STATUS.DEFAULT;
  const searchSet = new Set(searchMatches);
  const c = criteria;

  return (link) => {
    if (isSet(c.item) && link.entity_id !== c.item) return STATUS.NONE;
    if (isSet(c.norm) && link.norm_id !== c.norm) return STATUS.NONE;
    if (isSet(c.orientation) && link.norm?.orientation !== c.orientation) return STATUS.NONE;
    if (isSet(c.type) && link.entity?.type !== c.type) return STATUS.NONE;
    if (isSet(c.q) && !searchSet.has(link.entity_id)) return STATUS.NONE;

    let secondary = false;
    for (const key of ['topic', 'job']) {
      if (!isSet(c[key])) continue;
      if (link[`${key}_primary`] === c[key]) continue;
      if (link[`${key}_secondary`] === c[key]) secondary = true;
      else return STATUS.NONE;
    }
    if (secondary) return includeSecondary ? STATUS.PARTIAL : STATUS.NONE;
    return STATUS.FULL;
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

/**
 * Why a matching link matches, for card labels (5.7): through the primary or the secondary value of
 * the topic or job criterion. null when neither topic nor job is active.
 * @returns {{ level: 'primary' | 'secondary', via: 'topic' | 'job' } | null}
 */
export function matchLevel(link, criteria = {}) {
  for (const key of ['topic', 'job']) {
    if (isSet(criteria[key]) && link[`${key}_primary`] !== criteria[key] && link[`${key}_secondary`] === criteria[key])
      return { level: 'secondary', via: key };
  }
  if (isSet(criteria.topic)) return { level: 'primary', via: 'topic' };
  if (isSet(criteria.job)) return { level: 'primary', via: 'job' };
  return null;
}
