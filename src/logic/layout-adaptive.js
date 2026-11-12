// View 2 layout (BUILD_SPEC 5.5–5.8): only matching links are laid out, grouped by the first of
// Topic → Norm → Type that no criterion pins; few links become cards. Pure: no DOM.
import { CARD_THRESHOLD, TYPES } from '../config.js';
import { createMatcher, STATUS } from './match.js';
import { compareDots } from './aggregate.js';
import { fixedLayout, topicOrder } from './layout-fixed.js';

const isSet = (v) => typeof v === 'string' && v.trim() !== '';
const RANK = { [STATUS.FULL]: 0, [STATUS.PARTIAL]: 1, [STATUS.DEFAULT]: 0 };

/**
 * Grouping dimension (5.5). A topic, a job, an item or a text search pins the topic dimension
 * (job = lens on the topic grid; an item or search is shown by norm); a norm pins norm; a type pins type.
 * @returns {'topic' | 'norm' | 'type' | 'all'}
 */
export function groupingDimension(criteria = {}) {
  const pinned = {
    topic: ['topic', 'job', 'item', 'q'].some((k) => isSet(criteria[k])),
    norm: isSet(criteria.norm),
    type: isSet(criteria.type),
  };
  return ['topic', 'norm', 'type'].find((d) => !pinned[d]) ?? 'all';
}

const keyOf = {
  topic: (l) => l.topic_primary,
  norm: (l) => l.norm_id,
  type: (l) => l.entity?.type,
  all: () => 'all',
};

/** Ordered group values for a dimension: norms by letter, topics in config order, types in config order. */
function orderValues(dim, values, { norms, links }) {
  const present = new Set(values);
  let order;
  if (dim === 'norm') order = norms.map((n) => n.norm_id);
  else if (dim === 'topic') order = topicOrder(links);
  else if (dim === 'type') order = [...TYPES];
  else order = ['all'];
  return [...order.filter((v) => present.has(v)), ...[...present].filter((v) => !order.includes(v))];
}

const sortLinks = (statusById) => (a, b) =>
  (RANK[statusById.get(a.link_id)] ?? 2) - (RANK[statusById.get(b.link_id)] ?? 2) || compareDots(a, b);

function bucket(links, dim, ctx, statusById) {
  const by = new Map();
  for (const l of links) {
    const k = keyOf[dim](l);
    if (!by.has(k)) by.set(k, []);
    by.get(k).push(l);
  }
  return orderValues(dim, [...by.keys()], ctx).map((v) => [v, by.get(v).sort(sortLinks(statusById))]);
}

/**
 * Header count text (5.6): “n of N” when an item or text search narrows the view (N = the group without
 * them); “p +s” when a topic or job is chosen and secondary matches are shown; otherwise “n”.
 */
export function countLabel(g, { ghost, split }) {
  if (ghost) return `${g.n} of ${g.N}`;
  if (split) return `${g.primary} +${g.secondary}`;
  return String(g.n);
}

/**
 * @param {object[]} links    all links (model.links)
 * @param {object} criteria   { q, item, norm, orientation, type, topic, job }
 * @param {object} options    { norms, searchMatches, includeSecondary = true, showNonMatching = false, cardThreshold }
 * @returns {{
 *   fixed: boolean, mode: 'dots' | 'cards', groupBy: 'topic' | 'norm' | 'type' | 'all',
 *   groups: { key, kind, value, links, n, N, primary, secondary, countText, subgroups? }[],
 *   total: number, visible: number, primary: number, secondary: number, ghost: boolean, split: boolean,
 *   statusById: Map<number, string>,
 * }}
 */
export function adaptiveLayout(links, criteria = {}, options = {}) {
  const {
    norms = [], searchMatches = [], includeSecondary = true, showNonMatching = false, cardThreshold = CARD_THRESHOLD,
  } = options;
  const matcher = createMatcher(criteria, { searchMatches, includeSecondary });
  const statusById = new Map(links.map((l) => [l.link_id, matcher(l)]));
  const matching = links.filter((l) => statusById.get(l.link_id) !== STATUS.NONE);
  const primary = matching.filter((l) => statusById.get(l.link_id) !== STATUS.PARTIAL).length;
  const summary = { total: links.length, visible: matching.length, primary, secondary: matching.length - primary, statusById };

  const ghost = isSet(criteria.item) || isSet(criteria.q);
  const split = !ghost && (isSet(criteria.topic) || isSet(criteria.job)) && includeSecondary;

  if (showNonMatching) {
    const f = fixedLayout(links, norms);
    for (const g of f.groups) g.countText = String(g.n);
    return { ...f, ...summary, ghost: false, split: false };
  }

  const groupBy = groupingDimension(criteria);
  const ctx = { norms, links };

  // N per group key (and per sub-group key): the same criteria without item and text search.
  let ghostCounts = null;
  if (ghost) {
    const wide = createMatcher({ ...criteria, item: '', q: '' }, { includeSecondary });
    ghostCounts = new Map();
    for (const l of links) {
      if (wide(l) === STATUS.NONE) continue;
      const k = keyOf[groupBy](l);
      ghostCounts.set(k, (ghostCounts.get(k) ?? 0) + 1);
      if (groupBy === 'topic') {
        const sk = `${k}|${l.norm_id}`;
        ghostCounts.set(sk, (ghostCounts.get(sk) ?? 0) + 1);
      }
    }
  }

  const stats = (ls, gkey) => {
    const p = ls.filter((l) => statusById.get(l.link_id) !== STATUS.PARTIAL).length;
    const g = { n: ls.length, primary: p, secondary: ls.length - p, N: ghost ? ghostCounts.get(gkey) ?? ls.length : null };
    g.countText = countLabel(g, { ghost, split });
    return g;
  };

  const groups = bucket(matching, groupBy, ctx, statusById).map(([value, ls]) => {
    const g = { key: `${groupBy}:${value}`, kind: groupBy, value, links: ls, ...stats(ls, value) };
    if (groupBy === 'topic') {
      g.subgroups = bucket(ls, 'norm', ctx, statusById).map(([normId, sl]) => ({
        key: `${g.key}|norm:${normId}`, kind: 'norm', value: normId, links: sl, ...stats(sl, `${value}|${normId}`),
      }));
      g.links = g.subgroups.flatMap((s) => s.links);
    }
    return g;
  });

  const mode = matching.length > 0 && matching.length <= cardThreshold ? 'cards' : 'dots';
  return { fixed: false, mode, groupBy, groups, ...summary, ghost, split };
}
