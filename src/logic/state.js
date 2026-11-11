// Single store, mirrored in the URL query string (BUILD_SPEC 9). Pure: no DOM, no history access here.
import { TOPICS, JOBS, TYPES, ORIENTATIONS } from '../config.js';

export const DEFAULT_STATE = Object.freeze({
  view: 'explore', // explore | methodology
  by: '', // '' (opening, S0) | topic | job
  q: '',
  norm: '',
  orientation: '', // positive | prohibitive
  type: '',
  topic: '',
  job: '',
  item: '', // selected entity_id (S5)
  block: '', // focused topic block (S6)
  bnorm: '', // drill-down inside the focused block
  btype: '',
  all: false, // search: show every item that mentions the query (list mode)
  table: false, // “View as table”
});

/** URL keys in serialisation order. */
export const URL_KEYS = Object.freeze(Object.keys(DEFAULT_STATE));
export const CRITERIA_KEYS = Object.freeze(['q', 'norm', 'orientation', 'type', 'topic', 'job']);
const BOOLEAN_KEYS = new Set(['all', 'table']);
const MAX_QUERY = 200;

/** Allowed values per key, from the model and config. `null` = free text. */
function allowedValues(model) {
  return {
    view: ['explore', 'methodology'],
    by: ['topic', 'job'],
    q: null,
    norm: model.norms.map((n) => n.norm_id),
    orientation: Object.keys(ORIENTATIONS),
    type: [...TYPES],
    topic: [...new Set([...TOPICS.map((t) => t.value), ...model.topics])],
    job: [...new Set([...JOBS.map((j) => j.value), ...model.jobs])],
    item: model.entities.map((e) => e.entity_id),
    block: [...new Set([...TOPICS.map((t) => t.value), ...model.topics])],
    bnorm: model.norms.map((n) => n.norm_id),
    btype: [...TYPES],
  };
}

/**
 * Parse a query string. Unknown keys and invalid values are ignored and reported, never fatal.
 * @returns {{ state: object, ignored: {key: string, value: string, reason: string}[] }}
 */
export function parseQuery(search, model) {
  const params = new URLSearchParams(search);
  const allowed = allowedValues(model);
  const state = { ...DEFAULT_STATE };
  const ignored = [];
  for (const [key, raw] of params) {
    if (!(key in DEFAULT_STATE)) { ignored.push({ key, value: raw, reason: 'unknown parameter' }); continue; }
    if (BOOLEAN_KEYS.has(key)) {
      if (raw === '1' || raw === 'true') state[key] = true;
      else if (raw !== '0' && raw !== 'false') ignored.push({ key, value: raw, reason: 'expected 1 or 0' });
      continue;
    }
    if (key === 'q') { state.q = raw.slice(0, MAX_QUERY); continue; }
    if (allowed[key].includes(raw)) state[key] = raw;
    else ignored.push({ key, value: raw, reason: 'unknown value' });
  }
  return { state: normalizeState(state), ignored };
}

/** Query string for a state (defaults omitted, fixed key order). Returns '' or '?…'. */
export function serializeQuery(state) {
  const params = new URLSearchParams();
  for (const key of URL_KEYS) {
    const v = state[key];
    if (v === DEFAULT_STATE[key] || v === '' || v == null) continue;
    params.set(key, BOOLEAN_KEYS.has(key) ? '1' : String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

export function hasCriteria(state) {
  return CRITERIA_KEYS.some((k) => String(state[k] ?? '').trim() !== '');
}

/** S0: nothing chosen yet. */
export function isOpening(state) {
  return state.view === 'explore' && state.by === '' && !hasCriteria(state) && !state.item && !state.block;
}

/** Keep the state coherent: drill-down needs its parent; anything chosen leaves the opening. */
export function normalizeState(s) {
  const out = { ...s };
  if (!out.block) { out.bnorm = ''; out.btype = ''; }
  if (!out.bnorm) out.btype = '';
  if (out.q.trim() === '') { out.q = ''; out.all = false; }
  if (out.by === '' && (hasCriteria(out) || out.item || out.block || out.table)) out.by = 'topic';
  return out;
}

/** “Clear all”: reset every criterion and the selection; keep the view and the starting point. */
export function clearAll(state) {
  return normalizeState({ ...DEFAULT_STATE, view: state.view, by: state.by || 'topic', table: state.table });
}

/** One step up in the block drill-down (Escape / breadcrumb). */
export function drillUp(state) {
  if (state.btype) return { ...state, btype: '' };
  if (state.bnorm) return { ...state, bnorm: '' };
  if (state.block) return { ...state, block: '' };
  return state;
}

/** Minimal store. `set` merges a patch (or applies a function), normalizes and notifies. */
export function createStore(initial) {
  let state = normalizeState({ ...DEFAULT_STATE, ...initial });
  const subs = new Set();
  return {
    get: () => state,
    set(patch) {
      const next = typeof patch === 'function' ? patch(state) : { ...state, ...patch };
      if (patch && typeof patch === 'object' && 'q' in patch && !('all' in patch) && patch.q !== state.q) next.all = false;
      const prev = state;
      state = normalizeState(next);
      if (URL_KEYS.some((k) => prev[k] !== state[k])) for (const fn of subs) fn(state, prev);
    },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
  };
}
