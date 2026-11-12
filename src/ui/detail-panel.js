// Right panel: item detail (S5), result list and empty state (S3/S4). Re-rendered when its inputs change.
import { h, fmt, plural, normTag, typeBadge, orientationWord } from './dom.js';
import { entityPanel, linkSummary } from '../logic/aggregate.js';

const FIRST_NORMS = 3;

export function createPanel(ctx) {
  const { model, copy, store, actions } = ctx;
  const el = h('aside', { class: 'panel', id: 'panel', 'aria-labelledby': 'panel-title', hidden: true });
  const expanded = { norms: new Set(), ops: new Set() }; // per-entity UI memory
  let lastKey = '';

  const closeBtn = () => h('button', { type: 'button', class: 'icon-btn panel__close', 'aria-label': copy.panel.close, onClick: () => actions.closePanel() }, '×');

  function commissionNote() {
    return h('div', { class: 'commission-note', role: 'note' },
      h('h3', {}, copy.commissionNote.heading),
      h('p', {}, fmt(copy.commissionNote.body, ctx.facts)),
      h('a', { href: '?tab=methodology#commission', onClick: (e) => { e.preventDefault(); actions.goMethodology('commission'); } }, copy.commissionNote.link));
  }

  function itemView(entityId, others, view, state) {
    const p = entityPanel(model, entityId);
    const e = p.entity;
    const appears = new Set(p.perNorm.map((n) => n.normId));
    const showAll = expanded.norms.has(entityId);
    const visible = showAll ? p.perNorm : p.perNorm.slice(0, FIRST_NORMS);
    const q = state.q.trim();
    return [
      view.search.commission && !state.item ? commissionNote() : null,
      h('div', { class: 'panel__top' }, typeBadge(e.type), closeBtn()),
      h('h2', { class: 'panel__title', id: 'panel-title', tabindex: '-1' }, e.name),
      h('p', { class: 'panel__summary' }, fmt(copy.panel.linksAcross, {
        links: p.links, linksNoun: plural(p.links, 'link', 'links'), norms: p.normCount, total: model.norms.length })),
      h('ul', { class: 'norm-strip', 'aria-label': copy.panel.stripLabel },
        model.norms.map((n) => h('li', {
          class: `norm-strip__cell${appears.has(n.norm_id) ? ' is-on' : ''}${n.orientation === 'prohibitive' ? ' is-dont' : ''}`,
          'aria-label': `Norm ${n.norm_id} (${orientationWord(n.orientation)}): ${appears.has(n.norm_id) ? copy.panel.stripOn : copy.panel.stripOff}`,
        }, n.norm_id))),
      h('p', { class: 'small' }, copy.panel.stripNote),
      h('ul', { class: 'panel__norms' },
        visible.map((n) => {
          const key = `${entityId}|${n.normId}`;
          const opsOpen = expanded.ops.has(key);
          const ops = opsOpen ? n.operationalizations : n.operationalizations.slice(0, 1);
          const more = n.operationalizations.length - 1;
          return h('li', { class: 'panel__norm' },
            h('h3', { class: 'panel__norm-head' }, `Norm ${n.normId} `, normTag(n.norm?.orientation), ` · ${n.count} ${plural(n.count, 'link', 'links')}`,
              h('span', { class: 'visually-hidden' }, `: ${n.norm?.title ?? ''}`)),
            ops.map((o) => h('p', { class: 'panel__ops' }, o)),
            more > 0 ? h('button', { type: 'button', class: 'linklike', 'aria-expanded': String(opsOpen),
              onClick: () => { opsOpen ? expanded.ops.delete(key) : expanded.ops.add(key); rerender(); } },
              opsOpen ? copy.panel.showLess : fmt(copy.panel.moreOps, { n: more })) : null);
        })),
      p.perNorm.length > FIRST_NORMS ? h('button', { type: 'button', class: 'linklike', 'aria-expanded': String(showAll),
        onClick: () => { showAll ? expanded.norms.delete(entityId) : expanded.norms.add(entityId); rerender(); } },
        showAll ? copy.panel.showFewerNorms : fmt(copy.panel.showAllNorms, { n: p.normCount })) : null,
      others?.length ? h('p', { class: 'panel__others' },
        h('button', { type: 'button', class: 'linklike', onClick: () => store.set({ all: true }) },
          fmt(copy.panel.othersMention, { n: others.length, itemNoun: plural(others.length, 'item', 'items'), verb: plural(others.length, 'mentions', 'mention'), q }))) : null,
      h('p', { class: 'placeholder small' }, copy.panel.description),
    ];
  }

  function listView(ids, view, state) {
    const q = state.q.trim();
    return [
      h('div', { class: 'panel__top' }, h('h2', { class: 'panel__list-title', id: 'panel-title', tabindex: '-1' }, fmt(copy.panel.resultsHeading, { n: ids.length, q })), closeBtn()),
      view.search.commission ? commissionNote() : null,
      h('ul', { class: 'result-list' },
        ids.map((id) => {
          const e = model.entityById.get(id);
          const s = linkSummary(model.linksByEntity.get(id) ?? [], model.norms);
          return h('li', {},
            h('button', { type: 'button', class: 'result-row', 'data-entity': id, onClick: (ev) => actions.select(id, ev.currentTarget) },
              h('span', { class: 'result-row__meta' }, typeBadge(e.type), ` ${s.links} ${plural(s.links, 'link', 'links')} · ${plural(s.norms.length, 'Norm', 'Norms')} ${s.norms.join(', ')}`),
              h('span', { class: 'result-row__name' }, e.name)));
        })),
    ];
  }

  function emptyView(view, state) {
    return [
      h('div', { class: 'panel__top' }, h('h2', { class: 'panel__list-title', id: 'panel-title', tabindex: '-1' }, fmt(copy.panel.empty, { q: state.q.trim() })), closeBtn()),
      view.search.commission ? commissionNote() : null,
    ];
  }

  let last = null;
  function rerender() { if (last) render(...last, true); }

  function render(state, view, force = false) {
    last = [state, view];
    const p = view.opening || state.tab !== 'explore' ? null : view.panel;
    const key = JSON.stringify([p, state.q, state.all, view.search.commission]);
    if (!force && key === lastKey) return;
    lastKey = key;
    el.hidden = !p;
    if (!p) { el.replaceChildren(); return; }
    const content = p.mode === 'item' ? itemView(p.entityId, p.others, view, state)
      : p.mode === 'list' ? listView(p.ids, view, state)
      : emptyView(view, state);
    el.replaceChildren(h('div', { class: 'panel__inner' }, content));
  }

  return { el, update: render, focusTitle: () => el.querySelector('#panel-title')?.focus() };
}
