// One dot = one link. Shared by the dot grid, block focus and item rows.
import { h, orientationWord } from './dom.js';
import { shortTopic, shortJob, statusText } from '../logic/view.js';

/** Full accessible label for a link’s dot; `note` is the state line (also the tooltip’s last line). */
export function dotLabel(link, note) {
  const e = link.entity ?? {};
  const n = link.norm ?? {};
  const parts = [
    `${e.name ?? link.entity_id} (${e.type ?? 'unknown type'})`,
    `Norm ${link.norm_id}, ${orientationWord(n.orientation)}: ${n.title ?? ''}`,
    link.operationalization,
    `Topic: ${shortTopic(link.topic_primary)}${link.topic_secondary ? `, also ${shortTopic(link.topic_secondary)}` : ''}`,
    `Job: ${shortJob(link.job_primary)}${link.job_secondary ? `, also ${shortJob(link.job_secondary)}` : ''}`,
  ];
  if (note) parts.push(note);
  return parts.join('. ') + '.';
}

const cap = (s) => s.replace(/^./, (c) => c.toUpperCase());

/** Interactive dot (a button). */
export function dotButton(link, { onSelect } = {}) {
  const b = h('button', { type: 'button', class: 'dot', 'data-link': link.link_id, 'data-entity': link.entity_id, tabindex: -1 });
  b._link = link;
  if (onSelect) b.addEventListener('click', () => onSelect(link.entity_id, b));
  return b;
}

/**
 * Update a dot. `display` is what it looks like (may be dimmed by a selection); `ring` is 'selected'
 * (the clicked dot: black ring as on hover), 'linked' (other links of the item while a filter is on) or null;
 * `note` is the state line for the label and tooltip ('' when there is nothing to say).
 */
export function updateDot(el, { display, ring, note }) {
  if (el.dataset.status !== display) el.dataset.status = display;
  el.dataset.note = note;
  el.classList.toggle('is-selected', ring === 'selected');
  el.classList.toggle('is-linked', ring === 'linked');
  const label = dotLabel(el._link, note);
  if (el.getAttribute('aria-label') !== label) el.setAttribute('aria-label', label);
}

/**
 * Display options for a link’s dot. `selectedLink` is the link_id of the clicked dot (UI-only, not in the URL).
 * No filter + item selected: “Selected” / “Linked (same item)” / “Not linked”.
 * Filter on: the match status, plus “· selected” on the clicked dot. Nothing active: no note.
 */
export function dotView(link, view, selectedLink, copy) {
  const sameItem = link.entity_id === view.selectedEntity;
  const clicked = sameItem && link.link_id === selectedLink;
  const t = copy.dot;
  let note;
  if (view.dimmed) note = clicked ? t.selected : sameItem ? t.linked : t.notLinked;
  else {
    const st = statusText(view.statusById.get(link.link_id));
    note = [st && cap(st), clicked ? t.selectedSuffix : ''].filter(Boolean).join(' · ');
    if (!st && clicked) note = t.selected;
  }
  return {
    display: view.displayById.get(link.link_id),
    // View 2: the item is a filter, so every visible dot is the item’s; only the clicked dot gets a ring.
    ring: clicked ? 'selected' : sameItem && !view.dimmed && !view.adaptive ? 'linked' : null,
    note,
  };
}

/** Decorative (non-interactive) dot, e.g. inside an item row whose button carries the label. */
export function staticDot(status, selected) {
  return h('span', { class: `dot dot--static${selected ? ' is-linked' : ''}`, 'data-status': status, 'aria-hidden': 'true' });
}

/**
 * Roving tabindex + arrow keys inside a container of dots (BUILD_SPEC 10).
 * Left/Right ±1, Up/Down ±rowLength, Home/End. `selector` picks the items (dots, or cards in view 2).
 */
export function enableRoving(container, rowLength = 6, selector = 'button.dot') {
  container.addEventListener('keydown', (ev) => {
    const dots = [...container.querySelectorAll(selector)];
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
  const items = [...container.querySelectorAll(selector)];
  for (const it of items) it.tabIndex = -1;
  if (items[0]) items[0].tabIndex = 0;
}
