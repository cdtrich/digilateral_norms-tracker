// View 2 card mode (BUILD_SPEC 5.7): one card per link when few links are visible.
import { h, fmt, typeBadge, setChildren } from './dom.js';
import { matchLevel, STATUS } from '../logic/match.js';

/** Card label for a link’s status: “Primary topic match” etc.; '' when no topic or job is chosen. */
export function cardLabel(link, criteria, copy) {
  const m = matchLevel(link, criteria);
  if (!m) return '';
  const t = copy.cards;
  if (m.via === 'topic') return m.level === 'secondary' ? t.secondaryTopic : t.primaryTopic;
  return m.level === 'secondary' ? t.secondaryJob : t.primaryJob;
}

/** Create the (reused) card element for a link. Clicking or Enter selects its item. */
export function cardElement(link, { onSelect }) {
  const el = h('article', { class: 'card', 'data-link': link.link_id, 'data-entity': link.entity_id, tabindex: -1 });
  el._link = link;
  el.addEventListener('click', (e) => {
    if (e.target.closest('a')) return;
    onSelect(link.entity_id, el);
  });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(link.entity_id, el); }
  });
  return el;
}

/**
 * Fill a card for the current state. `status` is full or partial; `showItem` adds the item name and type
 * (when no single item is chosen, the card must say which item it is).
 */
export function updateCard(el, { status, criteria, showItem, selected }, copy) {
  const link = el._link;
  const label = cardLabel(link, criteria, copy);
  const statusWord = label || copy.cards.match;
  const t = copy.cards;
  const chip = (text, muted) => h('li', { class: `card-chip${muted ? ' card-chip--also' : ''}` }, text);
  el.dataset.status = status;
  el.classList.toggle('card--partial', status === STATUS.PARTIAL);
  el.classList.toggle('is-selected', Boolean(selected));
  const e = link.entity ?? {};
  el.setAttribute('aria-label', `${statusWord}. ${showItem ? `${e.name ?? link.entity_id} (${e.type ?? ''}). ` : ''}${link.operationalization}`);
  setChildren(el,
    h('p', { class: 'card__status' },
      h('span', { class: 'dot dot--static', 'data-status': status, 'aria-hidden': 'true' }),
      label ? h('span', {}, label) : h('span', { class: 'visually-hidden' }, statusWord)),
    showItem ? h('p', { class: 'card__item' }, typeBadge(e.type), ' ', h('strong', {}, e.name ?? link.entity_id)) : null,
    h('p', { class: 'card__text' }, link.operationalization),
    h('ul', { class: 'card__chips', 'aria-label': 'Topic and job' },
      chip(fmt(t.topic, { v: link.topic_primary })),
      link.topic_secondary ? chip(fmt(t.also, { v: link.topic_secondary }), true) : null,
      chip(fmt(t.job, { v: link.job_primary })),
      link.job_secondary ? chip(fmt(t.also, { v: link.job_secondary }), true) : null),
  );
}
