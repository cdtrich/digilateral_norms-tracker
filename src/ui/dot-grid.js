// Topic blocks with norm groups and dots (BUILD_SPEC 7 DotGrid). Built once; updates only change dot state.
import { TOPIC_LAYOUT } from '../config.js';
import { h, normTag, orientationWord, plural } from './dom.js';
import { blockNormDots, blockCounts } from '../logic/aggregate.js';
import { shortTopic } from '../logic/view.js';
import { dotButton, updateDot, dotView, enableRoving } from './dot.js';

const BLOCK_MIN_WIDTH = 190;
const GAP = 16;

export function createDotGrid(ctx) {
  const { model, actions, copy } = ctx;
  const el = h('div', { class: 'dot-grid' });
  const counts = blockCounts(model.links);
  const tree = blockNormDots(model.links, model.norms);
  const dots = [];

  // Every primary topic in the data gets a block; layout order from config, unknown topics last.
  const layoutTopics = TOPIC_LAYOUT.flat();
  const topics = [...layoutTopics.filter((t) => counts.has(t)), ...[...counts.keys()].filter((t) => !layoutTopics.includes(t))];

  const blockEls = new Map(topics.map((topic) => [topic, buildBlock(topic)]));

  function buildBlock(topic) {
    const n = counts.get(topic);
    const titleId = `block-${slug(topic)}`;
    const groups = [...tree.get(topic).entries()].map(([normId, links]) => {
      const norm = model.normById.get(normId);
      const dotsEl = h('div', { class: 'dots' });
      for (const link of links) {
        const d = dotButton(link, { onSelect: (id, trigger) => actions.select(id, trigger) });
        dots.push(d);
        dotsEl.append(d);
      }
      enableRoving(dotsEl);
      return h('div', {
        class: `norm-group${norm?.orientation === 'prohibitive' ? ' norm-group--dont' : ''}`,
        role: 'group',
        'aria-label': `${shortTopic(topic)}, Norm ${normId}, ${orientationWord(norm?.orientation)}, ${links.length} ${plural(links.length, 'link', 'links')}`,
      },
        h('div', { class: 'norm-group__head', 'aria-hidden': 'true' }, h('span', { class: 'norm-letter' }, normId), normTag(norm?.orientation)),
        h('p', { class: 'norm-group__title', 'aria-hidden': 'true', title: norm?.title }, norm?.title ?? ''),
        dotsEl,
      );
    });
    return h('section', { class: 'block', role: 'group', 'aria-labelledby': titleId },
      h('header', { class: 'block__head' },
        h('h3', { class: 'block__title' },
          h('button', { type: 'button', id: titleId, class: 'block__title-btn', onClick: () => actions.focusBlock(topic),
            'aria-label': `${topic}, ${n} ${copy.grid.linksWord}. Open this topic` }, topic)),
        h('span', { class: 'block__count', 'aria-hidden': 'true' }, String(n))),
      h('div', { class: 'block__norms' }, groups),
    );
  }

  // Masonry: 3 columns follow the wireframe layout; fewer columns fill greedily by link count.
  let cols = 0;
  function layout(width) {
    const next = Math.max(1, Math.min(3, Math.floor((width + GAP) / (BLOCK_MIN_WIDTH + GAP))));
    if (next === cols) return;
    cols = next;
    const columns = Array.from({ length: cols }, () => ({ topics: [], weight: 0 }));
    const place = (topic, col) => { col.topics.push(topic); col.weight += counts.get(topic) + 12; };
    const shortest = () => columns.reduce((a, b) => (b.weight < a.weight ? b : a));
    if (cols === 3) {
      TOPIC_LAYOUT.forEach((colTopics, i) => colTopics.filter((t) => counts.has(t)).forEach((t) => place(t, columns[i])));
      topics.filter((t) => !layoutTopics.includes(t)).forEach((t) => place(t, shortest()));
    } else {
      [...topics].sort((a, b) => counts.get(b) - counts.get(a)).forEach((t) => place(t, shortest()));
    }
    // Moving blocks between columns drops focus; keep it on the same element.
    const focused = el.contains(document.activeElement) ? document.activeElement : null;
    el.replaceChildren(...columns.map((c) => h('div', { class: 'dot-grid__col' }, c.topics.map((t) => blockEls.get(t)))));
    focused?.focus({ preventScroll: true });
  }

  const ro = new ResizeObserver((entries) => {
    const w = entries[0].contentRect.width;
    if (w > 0) layout(w);
  });
  ro.observe(el);
  layout(960);

  return {
    el,
    update(state, view) {
      for (const d of dots) updateDot(d, dotView(d._link, view));
    },
    focusDotOf(entityId) {
      const d = dots.find((x) => x._link.entity_id === entityId);
      d?.focus();
    },
  };
}

export const slug = (s) => String(s).toLowerCase().normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');
