// Mobile (S7): drill-down list topics › norms › types › items, using the same block/bnorm/btype state as BlockFocus.
import { TOPIC_LAYOUT } from '../config.js';
import { h, normTag, typeBadge, plural } from './dom.js';
import { blockCounts, blockTree } from '../logic/aggregate.js';
import { STATUS } from '../logic/match.js';

/** “3 matches” (filled) and “2 secondary matches” (ring) chips, always with text. */
export function matchChips(links, view, copy) {
  if (!view.active) return null;
  let full = 0, partial = 0;
  for (const l of links) {
    const s = view.statusById.get(l.link_id);
    if (s === STATUS.FULL) full += 1;
    else if (s === STATUS.PARTIAL) partial += 1;
  }
  return h('span', { class: 'mchips' },
    full ? h('span', { class: 'mchip' }, h('span', { class: 'dot dot--static', 'data-status': 'full', 'aria-hidden': 'true' }), ` ${full} ${full === 1 ? copy.mobile.matchOne : copy.mobile.matchMany}`) : null,
    partial ? h('span', { class: 'mchip' }, h('span', { class: 'dot dot--static', 'data-status': 'partial', 'aria-hidden': 'true' }), ` ${partial} ${partial === 1 ? copy.mobile.secondaryOne : copy.mobile.secondaryMany}`) : null);
}

export function renderMobileList(ctx, state, view) {
  const { model, copy, actions } = ctx;
  const row = (props, ...children) => h('li', {}, h('button', { type: 'button', class: 'm-row', ...props }, ...children));

  if (!state.block) {
    const counts = blockCounts(model.links);
    const order = [...TOPIC_LAYOUT.flat().filter((t) => counts.has(t)), ...[...counts.keys()].filter((t) => !TOPIC_LAYOUT.flat().includes(t))]
      .sort((a, b) => counts.get(b) - counts.get(a));
    return h('ul', { class: 'm-list' }, order.map((topic) => {
      const tree = blockTree(model.links, model.norms, topic);
      const links = tree.flatMap((n) => n.links);
      return row({ onClick: () => actions.focusBlock(topic), 'aria-label': `${topic}, ${counts.get(topic)} links` },
        h('span', { class: 'm-row__title' }, topic),
        h('span', { class: 'm-row__count' }, String(counts.get(topic))),
        h('span', { class: 'm-bar', 'aria-hidden': 'true' },
          tree.map((n) => h('span', { class: `m-bar__seg${n.norm.orientation === 'prohibitive' ? ' is-dont' : ''}`, style: `flex-grow:${n.count}`, title: `Norm ${n.normId}: ${n.count}` }, n.normId))),
        matchChips(links, view, copy));
    }));
  }

  const tree = blockTree(model.links, model.norms, state.block);
  if (!state.bnorm) {
    return h('ul', { class: 'm-list' }, tree.map((n) => row({ onClick: () => actions.drill({ bnorm: n.normId }) },
      h('span', { class: 'm-row__title' }, h('span', { class: 'norm-letter' }, n.normId), normTag(n.norm.orientation), ` ${n.norm.title}`),
      h('span', { class: 'm-row__count' }, String(n.count)),
      matchChips(n.links, view, copy))));
  }
  const norm = tree.find((n) => n.normId === state.bnorm);
  if (!norm) return h('p', {}, '—');
  if (!state.btype) {
    return h('ul', { class: 'm-list' }, norm.types.map((t) => row({ onClick: () => actions.drill({ btype: t.type }) },
      h('span', { class: 'm-row__title' }, typeBadge(t.type)),
      h('span', { class: 'm-row__count' }, String(t.count)),
      matchChips(t.items.flatMap((i) => i.links), view, copy))));
  }
  const type = norm.types.find((t) => t.type === state.btype);
  return h('ul', { class: 'm-list' }, (type?.items ?? []).map((it) => row({
    'data-entity': it.entityId, onClick: (e) => actions.select(it.entityId, e.currentTarget) },
    h('span', { class: 'm-row__title' }, it.entity?.name ?? it.entityId),
    h('span', { class: 'm-row__count' }, `${it.links.length} ${plural(it.links.length, 'link', 'links')}`),
    matchChips(it.links, view, copy))));
}
