// Matrix: 11 norms × topic or job columns, as a real <table> (also the screen-reader path, BUILD_SPEC 10).
import { h, normTag, orientationWord, plural } from './dom.js';
import { matrixCells } from '../logic/aggregate.js';
import { orderedTopics, orderedJobs, shortTopic, shortJob } from '../logic/view.js';

export function renderMatrix(ctx, state, view) {
  const { model, copy, store } = ctx;
  const mode = state.by === 'job' ? 'job' : 'topic';
  const columns = mode === 'job' ? orderedJobs(model) : orderedTopics(model);
  const short = mode === 'job' ? shortJob : shortTopic;
  const cells = matrixCells(model.links, model.norms, columns, mode, view.active ? view.matcher : null,
    { secondaryHits: !(view.adaptive && mode === 'topic') });
  const heading = mode === 'job' ? copy.matrix.headingJob : copy.matrix.headingTopic;

  const toggle = (normId, value) => {
    const s = store.get();
    const on = s.norm === normId && s[mode] === value;
    store.set({ norm: on ? '' : normId, [mode]: on ? '' : value });
  };

  return h('section', { class: `matrix${view.adaptive ? ' matrix--adaptive' : ''}`, 'aria-labelledby': 'matrix-h' },
    h('h2', { id: 'matrix-h' }, heading),
    h('p', { class: 'small' }, copy.matrix.explain, mode === 'job' ? ` ${copy.matrix.explainJob}` : ''),
    h('div', { class: 'matrix__scroll' },
      h('table', { class: `matrix__table matrix__table--${mode}` },
        h('caption', { class: 'visually-hidden' }, `${heading}. ${copy.matrix.explain}`),
        h('thead', {}, h('tr', {},
          h('td', { class: 'matrix__corner' }),
          columns.map((c) => h('th', { scope: 'col', title: c }, short(c))))),
        h('tbody', {},
          model.norms.map((norm) => h('tr', { class: norm.orientation === 'prohibitive' ? 'is-dont' : '' },
            h('th', { scope: 'row', class: 'matrix__rowhead' },
              h('span', { class: 'norm-letter' }, norm.norm_id), normTag(norm.orientation),
              h('span', { class: 'matrix__title', title: norm.title }, norm.title)),
            columns.map((c) => {
              const cell = cells.get(norm.norm_id).get(c);
              const n = cell.primary + (mode === 'job' ? cell.secondary : 0);
              if (n === 0) return h('td', { class: 'matrix__cell is-empty' }, h('span', { class: 'visually-hidden' }, 'none'));
              const pressed = state.norm === norm.norm_id && state[mode] === c;
              const statusWord = !view.active ? '' : cell.hitLevel === 'full' ? ', matches' : cell.hitLevel === 'partial' ? ', secondary match' : ', no match';
              return h('td', { class: 'matrix__cell' },
                h('button', {
                  type: 'button',
                  class: 'matrix__btn',
                  'data-hit': view.active ? (cell.hitLevel ?? 'none') : 'default',
                  'aria-pressed': String(pressed),
                  'aria-label': `Norm ${norm.norm_id} (${orientationWord(norm.orientation)}), ${c}: ${cell.primary} ${plural(cell.primary, 'link', 'links')}` +
                    (mode === 'job' && cell.secondary ? `, plus ${cell.secondary} as secondary job category` : '') + statusWord,
                  onClick: () => toggle(norm.norm_id, c),
                },
                  cell.primary ? String(cell.primary) : '',
                  mode === 'job' && cell.secondary ? h('span', { class: 'matrix__secondary' }, ` +${cell.secondary}`) : null));
            }))))),
    ),
  );
}
