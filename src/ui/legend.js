// Legend: dot states (filled vs ring), DO / DON’T tags.
import { h, normTag } from './dom.js';

export function renderLegend(copy) {
  const l = copy.legend;
  const dot = (status) => h('span', { class: 'dot dot--static', 'data-status': status, 'aria-hidden': 'true' });
  return h('div', { class: 'legend' },
    h('h2', { class: 'visually-hidden' }, 'Legend'),
    h('ul', {},
      h('li', {}, dot('default'), l.default),
      h('li', {}, dot('full'), l.full),
      h('li', {}, dot('partial'), l.partial),
      h('li', {}, dot('none'), l.none),
      h('li', {}, normTag('positive'), ` ${l.do}`),
      h('li', {}, normTag('prohibitive'), ` ${l.dont}`)),
    h('p', { class: 'small' }, l.oneDot));
}

/** View 2 legend: entries follow what is on screen (BUILD_SPEC 7). */
export function createLegendV2(copy) {
  const l = copy.legend;
  const v = copy.legendV2;
  const dot = (status) => h('span', { class: 'dot dot--static', 'data-status': status, 'aria-hidden': 'true' });
  const rows = {
    full: h('li', {}, dot('full'), v.full),
    partial: h('li', {}, dot('partial'), v.partial),
    default: h('li', {}, dot('default'), v.default),
    none: h('li', {}, dot('none'), v.none),
  };
  const el = h('div', { class: 'legend' },
    h('h2', { class: 'visually-hidden' }, 'Legend'),
    h('ul', {}, rows.full, rows.partial, rows.default, rows.none,
      h('li', {}, normTag('positive'), ` ${l.do}`),
      h('li', {}, normTag('prohibitive'), ` ${l.dont}`)),
    h('p', { class: 'small' }, l.oneDot));
  return {
    el,
    update(state, view) {
      rows.default.hidden = view.active;
      rows.none.hidden = !(state.non && view.active);
      rows.partial.hidden = !state.sec;
    },
  };
}
