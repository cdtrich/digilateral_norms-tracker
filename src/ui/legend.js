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
