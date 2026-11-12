// “Find an item” (BUILD_SPEC 5.9): ARIA combobox with a grouped listbox popup and aria-activedescendant.
// Picking a suggestion sets `item`; Enter with nothing highlighted applies the text as `q`;
// the last row shows every match as a list (`q` + `all`). Suggestions are narrowed by the Type dropdown.
import { TYPES } from '../config.js';
import { h, fmt, plural } from './dom.js';
import { suggestItems } from '../logic/search.js';

export function createCombobox(ctx) {
  const { model, copy, store } = ctx;
  const c = copy.controls;
  const id = 'find';
  const listId = 'find-list';
  const input = h('input', {
    type: 'text', id, class: 'input', autocomplete: 'off', spellcheck: 'false', placeholder: c.findPlaceholder,
    role: 'combobox', 'aria-autocomplete': 'list', 'aria-expanded': 'false', 'aria-controls': listId,
    'aria-describedby': 'find-hint',
  });
  const list = h('ul', { class: 'combo__list', id: listId, role: 'listbox', 'aria-label': c.findListLabel, hidden: true });
  let options = []; // [{ el, kind: 'item' | 'all', id? }]
  let active = -1;
  let openAll = false; // opened with ArrowDown on an empty box

  const isOpen = () => !list.hidden;

  function close() {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    active = -1;
    openAll = false;
  }

  function setActive(i) {
    if (options[active]) options[active].el.setAttribute('aria-selected', 'false');
    active = i;
    const o = options[i];
    if (!o) { input.removeAttribute('aria-activedescendant'); return; }
    o.el.setAttribute('aria-selected', 'true');
    input.setAttribute('aria-activedescendant', o.el.id);
    o.el.scrollIntoView({ block: 'nearest' });
  }

  function open() {
    const q = input.value;
    const s = suggestItems(model.entities, model.linksByEntity, q, { type: store.get().type, types: TYPES, all: openAll });
    options = [];
    let n = 0;
    const rows = [];
    for (const g of s.groups) {
      rows.push(h('li', { class: 'combo__group', role: 'presentation' }, g.type));
      for (const it of g.items) {
        const el = h('li', { class: 'combo__option', role: 'option', id: `find-opt-${n++}`, 'aria-selected': 'false', 'data-entity': it.id },
          h('span', { class: 'combo__name' }, it.name),
          h('span', { class: 'combo__count' }, `${it.links} ${plural(it.links, 'link', 'links')}`));
        options.push({ el, kind: 'item', id: it.id });
        rows.push(el);
      }
    }
    const text = q.trim();
    if (text && s.total > 0) {
      const el = h('li', { class: 'combo__option combo__all', role: 'option', id: `find-opt-${n++}`, 'aria-selected': 'false' },
        fmt(c.findShowAll, { n: s.total, q: text }));
      options.push({ el, kind: 'all' });
      rows.push(el);
    }
    if (text && s.total === 0) rows.push(h('li', { class: 'combo__empty', role: 'presentation' }, fmt(c.findNoMatch, { q: text })));
    if (rows.length === 0) { close(); return; }
    list.replaceChildren(...rows);
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    active = -1;
    input.removeAttribute('aria-activedescendant');
  }

  function choose(o) {
    if (!o) return;
    if (o.kind === 'item') {
      input.value = model.entityById.get(o.id)?.name ?? '';
      close();
      store.set({ item: o.id, q: '', all: false });
    } else {
      const q = input.value.trim();
      close();
      store.set({ q, all: true, item: '' });
    }
  }

  function applyText() {
    const q = input.value.trim();
    close();
    store.set({ q, item: '' });
  }

  input.addEventListener('input', () => { openAll = false; open(); });
  input.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen()) { openAll = input.value.trim() === ''; open(); if (isOpen()) setActive(0); return; }
        setActive(Math.min(options.length - 1, active + 1));
        return;
      case 'ArrowUp':
        if (!isOpen()) return;
        e.preventDefault();
        setActive(Math.max(-1, active - 1));
        return;
      case 'Home': case 'End':
        if (!isOpen() || !options.length) return;
        e.preventDefault();
        setActive(e.key === 'Home' ? 0 : options.length - 1);
        return;
      case 'Enter':
        e.preventDefault();
        if (isOpen() && active >= 0) choose(options[active]);
        else applyText();
        return;
      case 'Escape':
        // Escape closes the list, then clears the text, then (app) closes the panel.
        if (isOpen()) { e.preventDefault(); e.stopPropagation(); close(); return; }
        if (input.value) {
          e.preventDefault(); e.stopPropagation();
          input.value = '';
          if (store.get().q) store.set({ q: '' });
        }
        return;
      case 'Tab':
        close();
        return;
      default:
    }
  });
  list.addEventListener('mousedown', (e) => e.preventDefault()); // keep focus in the input
  list.addEventListener('click', (e) => {
    const li = e.target.closest('[role="option"]');
    if (li) choose(options.find((o) => o.el === li));
  });
  input.addEventListener('blur', () => close());

  const el = h('div', { class: 'field field--search combo' },
    h('label', { class: 'field__label', for: id }, c.findLabel),
    h('div', { class: 'combo__box' }, input, list),
    h('p', { class: 'visually-hidden', id: 'find-hint' }, c.findHint));

  let lastSync = null;
  return {
    el,
    input,
    /** Show the chosen item’s name or the search text; keep what the user is typing. */
    update(state) {
      const key = `${state.item}|${state.q}`;
      if (key === lastSync) return;
      lastSync = key;
      if (document.activeElement === input && isOpen()) return;
      input.value = state.item ? model.entityById.get(state.item)?.name ?? '' : state.q;
    },
  };
}
