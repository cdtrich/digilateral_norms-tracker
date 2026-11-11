// Left column: intro, opening cards (S0) or controls (S1+), legend.
import { TYPES, ORIENTATIONS, SEARCH_DEBOUNCE_MS } from '../config.js';
import { h } from './dom.js';
import { orderedTopics, orderedJobs } from '../logic/view.js';
import { renderLegend } from './legend.js';

export function createLeftPanel(ctx) {
  const { model, copy, store, actions } = ctx;
  const c = copy.controls;

  // Opening (S0)
  const opening = h('div', { class: 'opening' },
    h('h2', { class: 'opening__heading' }, copy.opening.heading),
    copy.opening.cards.map((card) =>
      h('button', { type: 'button', class: 'question-card', onClick: () => store.set({ by: card.by }) },
        h('span', { class: 'question-card__q' }, card.question),
        h('span', { class: 'question-card__a' }, card.action))),
    h('p', { class: 'small' }, copy.opening.switchNote),
  );

  // Explore by
  const byBtns = ['topic', 'job'].map((by) =>
    h('button', { type: 'button', class: 'seg__btn', 'aria-pressed': 'false', onClick: () => store.set({ by }) }, by === 'topic' ? c.topic : c.job));
  const exploreBy = h('div', { class: 'field' },
    h('span', { class: 'field__label', id: 'explore-by-label' }, c.exploreBy),
    h('div', { class: 'seg', role: 'group', 'aria-labelledby': 'explore-by-label' }, byBtns));

  // Search
  const input = h('input', { type: 'search', id: 'search', class: 'input', autocomplete: 'off', spellcheck: 'false', placeholder: c.searchPlaceholder });
  let timer = null;
  const flush = () => { clearTimeout(timer); timer = null; store.set({ q: input.value }); };
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(flush, SEARCH_DEBOUNCE_MS); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); flush(); actions.searchEnter(); }
    if (e.key === 'Escape' && input.value) { e.preventDefault(); e.stopPropagation(); input.value = ''; flush(); }
  });
  const search = h('div', { class: 'field field--search' },
    h('label', { class: 'field__label', for: 'search' }, c.searchLabel),
    input,
    h('p', { class: 'small helper' }, `${c.commissionHelper} `,
      h('a', { href: '?view=methodology#commission', onClick: (e) => { e.preventDefault(); actions.goMethodology('commission'); } }, c.commissionHelperLink)));

  // Dropdowns
  const select = (key, label, allLabel, options) => {
    const id = `f-${key}`;
    const s = h('select', { id, class: 'input select' },
      h('option', { value: '' }, allLabel),
      options.map(([value, text]) => h('option', { value }, text)));
    s.addEventListener('change', () => store.set({ [key]: s.value }));
    return { key, el: h('div', { class: 'field' }, h('label', { class: 'field__label', for: id }, label), s), input: s };
  };
  const selects = [
    select('norm', c.norm, c.allNorms, model.norms.map((n) => [n.norm_id, `${n.norm_id} · ${n.title}`])),
    select('orientation', c.normType, c.allNormTypes, Object.keys(ORIENTATIONS).map((o) => [o, c.normTypeOptions[o] ?? o])),
    select('topic', c.topicLabel, c.allTopics, orderedTopics(model).map((t) => [t, t])),
    select('job', c.jobLabel, c.allJobs, orderedJobs(model).map((j) => [j, j])),
    select('type', c.typeLabel, c.allTypes, TYPES.map((t) => [t, t])),
  ];

  // Mobile: filters collapse behind a toggle; search stays visible.
  const filtersId = 'filters';
  const filterToggle = h('button', { type: 'button', class: 'btn filter-toggle', 'aria-expanded': 'false', 'aria-controls': filtersId }, c.filterToggle);
  const filters = h('div', { class: 'filters', id: filtersId }, exploreBy, selects.map((s) => s.el), renderLegend(copy));
  filterToggle.addEventListener('click', () => {
    const open = filterToggle.getAttribute('aria-expanded') !== 'true';
    filterToggle.setAttribute('aria-expanded', String(open));
    filters.classList.toggle('is-open', open);
  });

  const controls = h('div', { class: 'controls' }, search, filterToggle, filters);
  const el = h('aside', { class: 'left', 'aria-label': 'Explore controls' },
    h('p', { class: 'intro placeholder' }, copy.intro),
    opening,
    controls);

  return {
    el,
    input,
    update(state, view) {
      opening.hidden = !view.opening;
      controls.hidden = view.opening;
      byBtns[0].setAttribute('aria-pressed', String(state.by === 'topic'));
      byBtns[1].setAttribute('aria-pressed', String(state.by === 'job'));
      if (document.activeElement !== input && timer === null && input.value !== state.q) input.value = state.q;
      for (const s of selects) if (s.input.value !== state[s.key]) s.input.value = state[s.key];
    },
  };
}
