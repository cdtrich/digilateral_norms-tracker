// “View as table”: every link as a row with its match status (text alternative for the dot grid).
import { h } from './dom.js';
import { compareDots } from '../logic/aggregate.js';
import { orderedTopics, shortJob, statusText } from '../logic/view.js';

export function renderLinkTable(ctx, state, view) {
  const { model, copy, actions } = ctx;
  const topics = orderedTopics(model);
  const normOrder = model.norms.map((n) => n.norm_id);
  const rows = [...model.links].sort((a, b) =>
    topics.indexOf(a.topic_primary) - topics.indexOf(b.topic_primary) ||
    normOrder.indexOf(a.norm_id) - normOrder.indexOf(b.norm_id) ||
    compareDots(a, b));
  const [hItem, hType, hNorm, hTopic, hJob, hMatch] = copy.grid.tableHeaders;
  return h('div', { class: 'link-table__scroll' },
    h('table', { class: 'link-table' },
      h('caption', {}, copy.grid.tableCaption),
      h('thead', {}, h('tr', {}, [hItem, hType, hNorm, hTopic, hJob, hMatch].map((t) => h('th', { scope: 'col' }, t)))),
      h('tbody', {}, rows.map((l) => {
        const st = view.statusById.get(l.link_id);
        return h('tr', { 'data-status': st },
          h('th', { scope: 'row' },
            h('button', { type: 'button', class: 'linklike', onClick: (e) => actions.select(l.entity_id, e.currentTarget) }, l.entity?.name ?? l.entity_id)),
          h('td', {}, l.entity?.type ?? ''),
          h('td', {}, `${l.norm_id} (${l.norm?.orientation === 'prohibitive' ? 'don’t' : 'do'})`),
          h('td', {}, l.topic_primary, l.topic_secondary ? h('span', { class: 'muted' }, ` (also ${l.topic_secondary})`) : null),
          h('td', {}, shortJob(l.job_primary), l.job_secondary ? h('span', { class: 'muted' }, ` (also ${shortJob(l.job_secondary)})`) : null),
          h('td', {}, st === 'default' ? '—' : statusText(st)));
      }))));
}
