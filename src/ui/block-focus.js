// BlockFocus (S6): one topic expanded to norm › type › item rows. Re-rendered on each state change (small).
import { h, normTag, typeBadge, orientationWord, plural } from './dom.js';
import { blockTree } from '../logic/aggregate.js';
import { STATUS } from '../logic/match.js';
import { staticDot } from './dot.js';
import { statusText } from '../logic/view.js';

/** Best status across links: full > partial > none > default. */
export function bestStatus(links, statusById) {
  const s = new Set(links.map((l) => statusById.get(l.link_id)));
  for (const k of [STATUS.FULL, STATUS.PARTIAL, STATUS.NONE]) if (s.has(k)) return k;
  return STATUS.DEFAULT;
}

export function renderBlockFocus(ctx, state, view) {
  const { model, actions, copy } = ctx;
  const tree = blockTree(model.links, model.norms, state.block);
  const norms = state.bnorm ? tree.filter((n) => n.normId === state.bnorm) : tree;
  const total = tree.reduce((a, n) => a + n.count, 0);

  return h('div', { class: 'block-focus' },
    h('h2', { class: 'block-focus__title', tabindex: '-1' }, state.block, h('span', { class: 'block__count' }, ` ${total}`)),
    norms.length === 0 ? h('p', {}, copy.grid.focusEmpty) : null,
    norms.map((n) => {
      const types = state.btype ? n.types.filter((t) => t.type === state.btype) : n.types;
      return h('section', { class: `focus-norm${n.norm.orientation === 'prohibitive' ? ' norm-group--dont' : ''}`, 'aria-labelledby': `fn-${n.normId}` },
        h('h3', { class: 'focus-norm__head', id: `fn-${n.normId}` },
          state.bnorm
            ? h('span', { class: 'focus-norm__label' }, h('span', { class: 'norm-letter' }, n.normId), normTag(n.norm.orientation), ` ${n.norm.title}`)
            : h('button', { type: 'button', class: 'linklike focus-norm__label', onClick: () => actions.drill({ bnorm: n.normId }),
              'aria-label': `Norm ${n.normId}, ${orientationWord(n.norm.orientation)}: ${n.norm.title}, ${n.count} ${plural(n.count, 'link', 'links')}. Show only this norm` },
              h('span', { class: 'norm-letter' }, n.normId), normTag(n.norm.orientation), ` ${n.norm.title}`),
          h('span', { class: 'focus-count' }, ` · ${n.count} ${plural(n.count, 'link', 'links')}`)),
        types.map((t) =>
          h('div', { class: 'focus-type' },
            h('h4', { class: 'focus-type__head' },
              state.btype
                ? typeBadge(t.type)
                : h('button', { type: 'button', class: 'linklike', onClick: () => actions.drill({ bnorm: n.normId, btype: t.type }),
                  'aria-label': `${t.type}, ${t.count} ${plural(t.count, 'link', 'links')}. Show only this type` }, typeBadge(t.type)),
              h('span', { class: 'focus-count' }, ` ${t.count} ${plural(t.count, 'link', 'links')}`)),
            h('ul', { class: 'item-rows' },
              t.items.map((it) => {
                const status = bestStatus(it.links, view.statusById);
                const selected = it.entityId === view.selectedEntity;
                const st = statusText(status);
                return h('li', {},
                  h('button', { type: 'button', class: `item-row${selected ? ' is-selected' : ''}`, 'data-entity': it.entityId,
                    'aria-current': selected ? 'true' : null, onClick: (e) => actions.select(it.entityId, e.currentTarget) },
                    h('span', { class: 'item-row__dots' }, it.links.map((l) => staticDot(view.displayById.get(l.link_id), selected && !view.dimmed))),
                    h('span', { class: 'item-row__name' }, it.entity?.name ?? it.entityId),
                    h('span', { class: 'item-row__count' }, `${it.links.length} ${plural(it.links.length, 'link', 'links')}${st ? ` · ${st}` : ''}`)));
              })),
          )),
      );
    }),
    h('p', { class: 'hint' }, copy.grid.escapeHint),
  );
}
