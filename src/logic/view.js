// Pure derivation of everything the UI renders from (model, state). UI modules only draw this.
import { TOPICS, JOBS, ORIENTATIONS } from '../config.js';
import { createMatcher, statusOfLinks, STATUS } from './match.js';
import { resolveSearch } from './search.js';
import { isOpening, CRITERIA_KEYS } from './state.js';

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

/** Human label of one active criterion, for chips (“Search: NIS2 ×”). */
export function criterionLabel(key, value, model) {
  switch (key) {
    case 'q': return `Search: ${value}`;
    case 'norm': return `Norm ${value}`;
    case 'orientation': return `Norm type: ${ORIENTATIONS[value]?.label ?? value}`;
    case 'type': return `Type: ${value}`;
    case 'topic': return `Topic: ${shortTopic(value)}`;
    case 'job': return `Job: ${shortJob(value)}`;
    default: return `${key}: ${value}`;
  }
}

const quote = (s) => `“${s}”`;

export function derive(model, state) {
  const search = resolveSearch(model.entities, state.q, { all: state.all });
  const criteria = Object.fromEntries(CRITERIA_KEYS.map((k) => [k, state[k]]));
  const matcher = createMatcher(criteria, { searchMatches: search.matches });
  const { byId: statusById, totals } = statusOfLinks(model.links, matcher);
  const chips = CRITERIA_KEYS.filter((k) => String(state[k] ?? '').trim() !== '').map((k) => ({
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
  if (active) {
    const others = chips.filter((c) => c.key !== 'q');
    const what = state.q.trim() ? quote(state.q.trim()) + (others.length ? ' and the filters' : '') : 'the filters';
    const n = matching.length;
    const normCount = new Set(matching.map((l) => l.norm_id)).size;
    announce = n === 0
      ? `No links match ${what}.`
      : `${n} ${n === 1 ? 'link matches' : 'links match'} ${what} across ${normCount} ${normCount === 1 ? 'norm' : 'norms'}` +
        (totals.partial ? `, ${totals.partial} of them through a secondary topic or job.` : '.');
  }

  // Selection without search or filter: the item’s dots stay Electric Blue, every other dot dims to pale blue.
  // With a search or filter active, dots keep their match state (yellow means “matches” only).
  const selectedEntity = panel?.mode === 'item' ? panel.entityId : '';
  const dimmed = !active && selectedEntity !== '';
  const displayById = dimmed
    ? new Map(model.links.map((l) => [l.link_id, l.entity_id === selectedEntity ? STATUS.DEFAULT : STATUS.NONE]))
    : statusById;

  return {
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
