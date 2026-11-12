// DotGrid (BUILD_SPEC 7): one keyed renderer (key = link_id) for both layout strategies.
// View 1 always draws layout-fixed (topic blocks, every link); view 2 draws layout-adaptive
// (topic blocks, norm or type groups, or cards). Dot and card elements are created once per link and
// reused, so view 2 can animate them (motion.js). Updates that keep the structure only change dot states.
import { TOPIC_LAYOUT } from '../config.js';
import { h, normTag, orientationWord, plural, typeBadge } from './dom.js';
import { shortTopic } from '../logic/view.js';
import { dotButton, updateDot, dotView, enableRoving } from './dot.js';
import { cardElement, updateCard } from './cards.js';
import { createMotion } from './motion.js';

const BLOCK_MIN_WIDTH = 190;
const GAP = 16;

export function createDotGrid(ctx) {
  const { model, actions, copy } = ctx;
  const el = h('div', { class: 'dot-grid', 'data-animating': 'false' });
  const dots = new Map(); // link_id → button.dot
  const cards = new Map(); // link_id → article.card
  const motion = createMotion(el);
  let cols = 0;
  let lastSig = '';
  let last = null; // [state, view]
  let shown = new Map(); // link_id → element currently in the grid (dot or card)

  const select = (id, trigger) => actions.select(id, trigger);
  const dotFor = (link) => {
    if (!dots.has(link.link_id)) dots.set(link.link_id, dotButton(link, { onSelect: select }));
    return dots.get(link.link_id);
  };
  const cardFor = (link) => {
    if (!cards.has(link.link_id)) cards.set(link.link_id, cardElement(link, { onSelect: select }));
    return cards.get(link.link_id);
  };

  // ── Group pieces ──────────────────────────────────────────────────────────────────────────────
  const linksWord = (n) => plural(n, 'link', 'links');
  const countA11y = (g, L) => (L.ghost ? `${g.n} of ${g.N} ${linksWord(g.N)}`
    : L.split ? `${g.primary} ${linksWord(g.primary)} at primary level, ${g.secondary} secondary`
    : `${g.n} ${linksWord(g.n)}`);

  function dotsBox(links, next) {
    const box = h('div', { class: 'dots' }, links.map((l) => { const d = dotFor(l); next.set(l.link_id, d); return d; }));
    enableRoving(box);
    return box;
  }

  /** Norm group: letter, DO/DON’T tag, norm title, dots. Used inside topic blocks and as a view 2 group. */
  function normGroup(g, { topic, count, L, next }) {
    const norm = model.normById.get(g.value);
    const label = topic !== undefined && !L
      ? `${shortTopic(topic)}, Norm ${g.value}, ${orientationWord(norm?.orientation)}, ${g.n} ${linksWord(g.n)}`
      : `${topic !== undefined ? `${shortTopic(topic)}, ` : ''}Norm ${g.value}, ${orientationWord(norm?.orientation)}: ${norm?.title ?? ''}, ${countA11y(g, L)}`;
    return h('div', {
      class: `norm-group${norm?.orientation === 'prohibitive' ? ' norm-group--dont' : ''}`,
      role: 'group', 'aria-label': label, 'data-gkey': g.key, tabindex: L ? -1 : null,
    },
      h('div', { class: 'norm-group__head', 'aria-hidden': 'true' },
        h('span', { class: 'norm-letter' }, g.value), normTag(norm?.orientation),
        count ? h('span', { class: 'group-count' }, count) : null),
      h('p', { class: 'norm-group__title', 'aria-hidden': 'true', title: norm?.title }, norm?.title ?? ''),
      dotsBox(g.links, next));
  }

  function typeGroup(g, L, next) {
    return h('div', { class: 'norm-group type-group', role: 'group', 'aria-label': `${g.value}, ${countA11y(g, L)}`, 'data-gkey': g.key, tabindex: -1 },
      h('div', { class: 'norm-group__head', 'aria-hidden': 'true' }, typeBadge(g.value), h('span', { class: 'group-count' }, g.countText)),
      dotsBox(g.links, next));
  }

  function allGroup(g, L, next) {
    return h('div', { class: 'norm-group type-group', role: 'group', 'aria-label': `${copy.cards.groupAll}, ${countA11y(g, L)}`, 'data-gkey': g.key, tabindex: -1 },
      h('div', { class: 'norm-group__head', 'aria-hidden': 'true' }, h('span', { class: 'group-title' }, copy.cards.groupAll), h('span', { class: 'group-count' }, g.countText)),
      dotsBox(g.links, next));
  }

  /** Topic block. View 1: the title opens block focus. View 2: a plain heading. */
  function topicBlock(g, L, next) {
    const titleId = `block-${slug(g.value)}`;
    const v2 = !L.fixed || L.v2;
    return h('section', { class: 'block', role: 'group', 'aria-labelledby': titleId, 'data-gkey': g.key, tabindex: v2 ? -1 : null },
      h('header', { class: 'block__head' },
        h('h3', { class: 'block__title' },
          v2
            ? h('span', { id: titleId }, g.value)
            : h('button', { type: 'button', id: titleId, class: 'block__title-btn', onClick: () => actions.focusBlock(g.value),
              'aria-label': `${g.value}, ${g.n} ${copy.grid.linksWord}. Open this topic` }, g.value)),
        h('span', { class: 'block__count', 'aria-hidden': 'true' }, v2 ? g.countText ?? String(g.n) : String(g.n))),
      h('div', { class: 'block__norms' },
        g.subgroups.map((s) => normGroup(s, { topic: g.value, count: v2 ? s.countText ?? String(s.n) : null, L: v2 ? L : null, next }))));
  }

  /** Masonry columns for topic blocks: 3 columns follow the wireframe layout; fewer fill greedily by size. */
  function masonry(groups, L, next) {
    const byTopic = new Map(groups.map((g) => [g.value, g]));
    const layoutTopics = TOPIC_LAYOUT.flat();
    const columns = Array.from({ length: cols }, () => ({ items: [], weight: 0 }));
    const place = (g, col) => { col.items.push(g); col.weight += g.n + 12; };
    const shortest = () => columns.reduce((a, b) => (b.weight < a.weight ? b : a));
    if (cols === 3) {
      TOPIC_LAYOUT.forEach((colTopics, i) => colTopics.filter((t) => byTopic.has(t)).forEach((t) => place(byTopic.get(t), columns[i])));
      groups.filter((g) => !layoutTopics.includes(g.value)).forEach((g) => place(g, shortest()));
    } else {
      [...groups].sort((a, b) => b.n - a.n).forEach((g) => place(g, shortest()));
    }
    return columns.filter((c) => c.items.length).map((c) => h('div', { class: 'dot-grid__col' }, c.items.map((g) => topicBlock(g, L, next))));
  }

  /** Card group. `topic` is set when topic grouping is shown as cards (one card group per topic › norm). */
  function cardGroup(g, L, view, next, topic) {
    const isNorm = g.kind === 'norm';
    const norm = isNorm ? model.normById.get(g.value) : null;
    const showItem = !view.criteria.item;
    const box = h('div', { class: 'cards' }, g.links.map((l) => {
      const c = cardFor(l);
      updateCard(c, { status: view.statusById.get(l.link_id), criteria: view.criteria, showItem, selected: l.link_id === ctx.ui.selectedLink }, copy);
      next.set(l.link_id, c);
      return c;
    }));
    enableRoving(box, 1, 'article.card');
    const title = (topic ? `${topic}, ` : '') +
      (isNorm ? `Norm ${g.value}, ${orientationWord(norm?.orientation)}: ${norm?.title ?? ''}` : g.kind === 'all' ? copy.cards.groupAll : g.value);
    return h('section', {
      class: `card-group${norm?.orientation === 'prohibitive' ? ' norm-group--dont' : ''}`,
      role: 'group', 'aria-label': `${title}, ${countA11y(g, L)}`, 'data-gkey': g.key, tabindex: -1,
    },
      topic ? h('p', { class: 'card-group__topic', 'aria-hidden': 'true' }, topic) : null,
      h('div', { class: 'card-group__head', 'aria-hidden': 'true' },
        isNorm ? [h('span', { class: 'norm-letter' }, g.value), normTag(norm?.orientation), h('span', { class: 'card-group__title' }, norm?.title ?? '')]
          : g.kind === 'type' ? typeBadge(g.value) : h('span', { class: 'card-group__title' }, copy.cards.groupAll),
        h('span', { class: 'group-count' }, g.countText)),
      box);
  }

  function build(view) {
    const L = view.layout;
    const next = new Map();
    let nodes;
    if (L.mode === 'cards') {
      // Topic grouping has topic › norm sub-groups; in card mode each sub-group is a card group.
      const groups = L.groupBy === 'topic' ? L.groups.flatMap((g) => g.subgroups.map((s) => [s, g.value])) : L.groups.map((g) => [g]);
      nodes = groups.map(([g, topic]) => cardGroup(g, L, view, next, topic));
      el.className = 'dot-grid dot-grid--cards';
    } else if (L.groupBy === 'topic') {
      nodes = masonry(L.groups, { ...L, v2: view.adaptive }, next);
      el.className = 'dot-grid dot-grid--blocks';
    } else {
      nodes = [h('div', { class: 'group-panel' }, L.groups.map((g) =>
        g.kind === 'norm' ? normGroup(g, { count: g.countText, L, next }) : g.kind === 'type' ? typeGroup(g, L, next) : allGroup(g, L, next)))];
      el.className = 'dot-grid dot-grid--groups';
    }
    if (L.groups.length === 0) nodes = [h('p', { class: 'grid-empty' }, copy.countLine.empty)];
    return { nodes, next };
  }

  // The column count only shapes the topic-block masonry; leaving it out elsewhere keeps a resize
  // (e.g. the panel opening) from rebuilding the grid and cancelling a running animation.
  const masonryCols = (view) => (view.layout.groupBy === 'topic' && view.layout.mode === 'dots' ? cols : 0);
  const signature = (view) => JSON.stringify([masonryCols(view), view.adaptive, view.layout.mode, view.layout.groupBy,
    view.layout.groups.map((g) => [g.key, g.countText, (g.subgroups ?? [g]).map((s) => [s.key, s.countText, s.links.map((l) => l.link_id)])])]);

  function render(state, view, { animate = true } = {}) {
    last = [state, view];
    const sig = signature(view);
    if (sig !== lastSig) {
      lastSig = sig;
      const active = document.activeElement;
      const hadFocus = el.contains(active);
      const focusLink = hadFocus && active.dataset.link ? Number(active.dataset.link) : null;
      const focusGroup = hadFocus ? active.closest('[data-gkey]')?.dataset.gkey : null;
      const before = animate && view.adaptive ? motion.snapshot(shown) : new Map();
      motion.cancel();
      const { nodes, next } = build(view);
      el.replaceChildren(...nodes);
      shown = next;
      if (animate && view.adaptive) motion.play(before, next);
      if (hadFocus) restoreFocus(focusLink, focusGroup);
    } else if (view.layout.mode === 'cards') {
      for (const [id, c] of shown) if (cards.get(id) === c) updateCard(c, { status: view.statusById.get(id), criteria: view.criteria, showItem: !view.criteria.item, selected: id === ctx.ui.selectedLink }, copy);
    }
    for (const [id, d] of shown) if (dots.get(id) === d) updateDot(d, dotView(d._link, view, ctx.ui.selectedLink, copy));
  }

  /** BUILD_SPEC 10: keep focus on the same dot or card; if it left, its group; if that left, the grid heading. */
  function restoreFocus(linkId, groupKey) {
    const same = linkId !== null ? shown.get(linkId) : null;
    if (same) {
      const box = same.parentElement;
      for (const x of box.children) x.tabIndex = -1;
      same.tabIndex = 0;
      same.focus({ preventScroll: true });
      return;
    }
    const group = groupKey ? el.querySelector(`[data-gkey="${CSS.escape(groupKey)}"]`) : null;
    if (group) {
      if (!group.hasAttribute('tabindex')) group.tabIndex = -1;
      group.focus({ preventScroll: true });
      return;
    }
    ctx.ui.focusGridHeading?.();
  }

  const ro = new ResizeObserver((entries) => {
    const w = entries[0].contentRect.width;
    if (w <= 0) return;
    const nextCols = Math.max(1, Math.min(3, Math.floor((w + GAP) / (BLOCK_MIN_WIDTH + GAP))));
    if (nextCols === cols) return;
    cols = nextCols;
    if (last) render(...last, { animate: false });
  });
  ro.observe(el);
  cols = 3;

  return { el, update: render, fade: (node) => motion.fade(node) };
}

export const slug = (s) => String(s).toLowerCase().normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');
