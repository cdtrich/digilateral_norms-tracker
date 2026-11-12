// Pure derivation of everything the UI renders from (model, state). UI modules only draw this.
import { TOPICS, JOBS, ORIENTATIONS, CARD_THRESHOLD } from '../config.js';
import { createMatcher, statusOfLinks, STATUS } from './match.js';
import { resolveSearch } from './search.js';
import { isOpening, isAdaptive, criteriaOf, CRITERIA_KEYS } from './state.js';
import { fixedLayout } from './layout-fixed.js';
import { adaptiveLayout } from './layout-adaptive.js';

const topicShort = new Map(TOPICS.map((t) => [t.value, t.short]));
const jobShort = new Map(JOBS.map((j) => [j.value, j.short]));
export const shortTopic = (v) => topicShort.get(v) ?? v;
export const shortJob = (v) => jobShort.get(v) ?? v;

/** Ordered column values for the matrix and dropdowns (config order, then any value only the data has). */
export function orderedTopics(model) {
  const conf = TOPICS.map((t) => t.value);
  return [...conf.filter((t) => model.topics.includes(t)), ...model.topics.filter((t) => !conf.includes(t))];
}
export function orderedJobs(model) {
  const conf = JOBS.map((j) => j.value);
  return [...conf.filter((j) => model.jobs.includes(j)), ...model.jobs.filter((j) => !conf.includes(j))];
}

/** Short name of an entity if it has one, else its name. */
export function itemName(model, id) {
  const e = model.entityById.get(id);
  return e ? e.short_name || e.name : id;
}

/** Human label of one active criterion, for chips (“Search: NIS2 ×”). */
export function criterionLabel(key, value, model) {
  switch (key) {
    case 'q': return `Search: ${value}`;
    case 'item': return `Item: ${itemName(model, value)}`;
    case 'norm': return `Norm ${value}`;
    case 'orientation': return `Norm type: ${ORIENTATIONS[value]?.label ?? value}`;
    case 'type': return `Type: ${value}`;
    case 'topic': return `Topic: ${shortTopic(value)}`;
    case 'job': return `Job: ${shortJob(value)}`;
    default: return `${key}: ${value}`;
  }
}

const quote = (s) => `“${s}”`;

/** Lower-case phrase for one criterion in the view 2 announcement (“item EEAS”, “topic Stability and security”). */
export function criterionPhrase(key, value, model) {
  switch (key) {
    case 'q': return `search ${quote(value)}`;
    case 'item': return `item ${itemName(model, value)}`;
    case 'norm': return `norm ${value}`;
    case 'orientation': return `${(ORIENTATIONS[value]?.label ?? value).toLowerCase()} norms`;
    default: return `${key} ${value}`;
  }
}

/** Chip order: view 2 puts the item first (wireframe), then the shared criteria. */
const chipKeys = (adaptive) => (adaptive ? ['item', ...CRITERIA_KEYS] : CRITERIA_KEYS);

export function derive(model, state) {
  const adaptive = isAdaptive(state);
  const search = resolveSearch(model.entities, state.q, { all: state.all });
  const criteria = criteriaOf(state);
  const matcherOpts = { searchMatches: search.matches, includeSecondary: state.sec };
  const matcher = createMatcher(criteria, matcherOpts);
  const { byId: statusById, totals } = statusOfLinks(model.links, matcher);
  const layout = adaptive
    ? adaptiveLayout(model.links, criteria, { ...matcherOpts, norms: model.norms, showNonMatching: state.non, cardThreshold: CARD_THRESHOLD })
    : fixedLayout(model.links, model.norms);
  const chips = chipKeys(adaptive).filter((k) => String(state[k] ?? '').trim() !== '').map((k) => ({
    key: k, value: state[k], label: criterionLabel(k, state[k].trim?.() ?? state[k], model),
  }));
  const active = chips.length > 0;

  // Right panel (BUILD_SPEC 5.3, 7)
  let panel = null;
  if (state.item && model.entityById.has(state.item)) {
    panel = { mode: 'item', entityId: state.item, others: [], fromSearch: false };
  } else if (search.mode === 'single') {
    panel = { mode: 'item', entityId: search.selected, others: search.others, fromSearch: true };
  } else if (search.mode === 'list') {
    panel = { mode: 'list', ids: search.matches };
  } else if (search.mode === 'empty') {
    panel = { mode: 'empty' };
  }

  // Live-region sentence
  const matching = model.links.filter((l) => {
    const s = statusById.get(l.link_id);
    return s === STATUS.FULL || s === STATUS.PARTIAL;
  });
  let announce = '';
  if (active && adaptive) {
    const what = chips.map((c) => criterionPhrase(c.key, String(c.value).trim(), model)).join(', ');
    const n = matching.length;
    announce = n === 0
      ? `No links match: ${what}.`
      : `${n} of ${model.links.length} ${n === 1 ? 'link matches' : 'links match'}: ${what}.`;
  } else if (active) {
    const others = chips.filter((c) => c.key !== 'q');
    const what = state.q.trim() ? quote(state.q.trim()) + (others.length ? ' and the filters' : '') : 'the filters';
    const n = matching.length;
    const normCount = new Set(matching.map((l) => l.norm_id)).size;
    announce = n === 0
      ? `No links match ${what}.`
      : `${n} ${n === 1 ? 'link matches' : 'links match'} ${what} across ${normCount} ${normCount === 1 ? 'norm' : 'norms'}` +
        (totals.partial ? `, ${totals.partial} of them through a secondary topic or job.` : '.');
  }

  // View 1, selection without search or filter: the item’s dots stay Electric Blue, every other dot dims
  // to pale blue. With a search or filter active, dots keep their match state (yellow means “matches” only).
  // View 2: the item is a criterion, so dots always show their match state.
  const selectedEntity = panel?.mode === 'item' ? panel.entityId : '';
  const dimmed = !adaptive && !active && selectedEntity !== '';
  const displayById = dimmed
    ? new Map(model.links.map((l) => [l.link_id, l.entity_id === selectedEntity ? STATUS.DEFAULT : STATUS.NONE]))
    : statusById;

  return {
    adaptive,
    criteria,
    layout,
    includeSecondary: state.sec,
    opening: isOpening(state),
    displayById,
    dimmed,
    search,
    matcher,
    statusById,
    totals,
    chips,
    active,
    panel,
    announce,
    matchingCount: matching.length,
    selectedEntity,
  };
}

/** Plain-language status for labels (“matches” / “secondary match” / “no match”). */
export function statusText(status) {
  return { full: 'matches', partial: 'secondary match', none: 'no match', default: '' }[status] ?? '';
}

const NUMBER_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];

/**
 * View 2 count line above the dots (5.6): heading “k of N links” and a sentence saying what is shown,
 * why it is grouped this way and how to read the headers. Every number comes from the layout.
 * @returns {{ heading: string, text: string }}
 */
export function countLine(view, copy) {
  const L = view.layout;
  const t = copy.countLine;
  const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  const vars = {
    k: L.visible, total: L.total, p: L.primary, s: L.secondary,
    threshold: NUMBER_WORDS[CARD_THRESHOLD] ?? String(CARD_THRESHOLD),
  };
  if (!view.active) return { heading: fill(t.headingAll, vars), text: t.allShown };
  const heading = fill(t.heading, vars);
  if (L.visible === 0) return { heading, text: t.empty };
  if (L.fixed) return { heading, text: fill(t.nonMatching, vars) };
  const c = view.criteria;
  const parts = [];
  if ((c.topic || c.job) && view.includeSecondary) parts.push(fill(c.topic ? t.splitTopic : t.splitJob, vars));
  const why = c.item ? 'item' : c.q ? 'search' : c.topic ? 'topic' : c.job ? 'job' : 'default';
  const reasons = t.grouped[L.groupBy] ?? {};
  const reason = reasons[why] ?? reasons.default;
  if (reason) parts.push(reason);
  if (L.mode === 'cards') parts.push(fill(t.cards, vars));
  if (L.ghost) parts.push(t.ghost[why] ?? t.ghost.default);
  return { heading, text: parts.join(' ') };
}
