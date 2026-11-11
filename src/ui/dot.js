// One dot = one link. Shared by the dot grid, block focus and item rows.
import { h, orientationWord } from './dom.js';
import { shortTopic, shortJob, statusText } from '../logic/view.js';

/** Full accessible label for a link’s dot. */
export function dotLabel(link, status, selected) {
  const e = link.entity ?? {};
  const n = link.norm ?? {};
  const parts = [
    `${e.name ?? link.entity_id} (${e.type ?? 'unknown type'})`,
    `Norm ${link.norm_id}, ${orientationWord(n.orientation)}: ${n.title ?? ''}`,
    link.operationalization,
    `Topic: ${shortTopic(link.topic_primary)}${link.topic_secondary ? `, also ${shortTopic(link.topic_secondary)}` : ''}`,
    `Job: ${shortJob(link.job_primary)}${link.job_secondary ? `, also ${shortJob(link.job_secondary)}` : ''}`,
  ];
  const st = statusText(status);
  if (st) parts.push(st.replace(/^./, (c) => c.toUpperCase()));
  if (selected) parts.push('Selected');
  return parts.join('. ') + '.';
}

/** Interactive dot (a button). */
export function dotButton(link, { onSelect } = {}) {
  const b = h('button', { type: 'button', class: 'dot', 'data-link': link.link_id, 'data-entity': link.entity_id, tabindex: -1 });
  b._link = link;
  if (onSelect) b.addEventListener('click', () => onSelect(link.entity_id, b));
  return b;
}

/**
 * Update a dot. `display` is what it looks like (may be dimmed by a selection), `status` its real match
 * status (used for the label and tooltip), `ring` draws the selection ring, `selected` adds “Selected”.
 */
export function updateDot(el, { display, status, ring, selected }) {
  if (el.dataset.status !== display) el.dataset.status = display;
  el.dataset.statusLabel = statusText(status);
  el.classList.toggle('is-selected', !!ring);
  const label = dotLabel(el._link, status, selected);
  if (el.getAttribute('aria-label') !== label) el.setAttribute('aria-label', label);
}

/** Display options for a link’s dot from the derived view. */
export function dotView(link, view) {
  const selected = link.entity_id === view.selectedEntity;
  return {
    display: view.displayById.get(link.link_id),
    status: view.statusById.get(link.link_id),
    ring: selected && !view.dimmed,
    selected,
  };
}

/** Decorative (non-interactive) dot, e.g. inside an item row whose button carries the label. */
export function staticDot(status, selected) {
  return h('span', { class: `dot dot--static${selected ? ' is-selected' : ''}`, 'data-status': status, 'aria-hidden': 'true' });
}

/**
 * Roving tabindex + arrow keys inside a container of dots (BUILD_SPEC 10).
 * Left/Right ±1, Up/Down ±rowLength, Home/End.
 */
export function enableRoving(container, rowLength = 6) {
  container.addEventListener('keydown', (ev) => {
    const dots = [...container.querySelectorAll('button.dot')];
    const i = dots.indexOf(document.activeElement);
    if (i === -1) return;
    const delta = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: rowLength, ArrowUp: -rowLength }[ev.key];
    let j = null;
    if (delta !== undefined) j = Math.min(dots.length - 1, Math.max(0, i + delta));
    if (ev.key === 'Home') j = 0;
    if (ev.key === 'End') j = dots.length - 1;
    if (j === null) return;
    ev.preventDefault();
    dots[i].tabIndex = -1;
    dots[j].tabIndex = 0;
    dots[j].focus();
  });
  const first = container.querySelector('button.dot');
  if (first) first.tabIndex = 0;
}
