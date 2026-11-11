// App shell: builds the layout, wires the store, URL, keyboard and focus. Components only render state.
import { BREAKPOINTS, TOPICS, JOBS, TYPES, JOB_NOT_SPECIFIED } from '../config.js';
import { createStore, parseQuery, serializeQuery, clearAll, drillUp } from '../logic/state.js';
import { derive, shortTopic } from '../logic/view.js';
import { methodologyFacts } from '../logic/aggregate.js';
import { h, setChildren } from './dom.js';
import { createHeader } from './header.js';
import { createLeftPanel } from './left-panel.js';
import { createDotGrid } from './dot-grid.js';
import { renderBlockFocus } from './block-focus.js';
import { createJobPicker } from './job-picker.js';
import { renderMatrix } from './matrix.js';
import { createPanel } from './detail-panel.js';
import { renderMobileList } from './mobile-list.js';
import { renderLinkTable } from './link-table.js';
import { createMethodology } from './methodology.js';
import { createTooltip } from './tooltip.js';

export function mountApp({ root, model, copy }) {
  const { state: initial, ignored } = parseQuery(location.search, model);
  for (const i of ignored) console.warn(`Ignored URL parameter ${i.key}=${JSON.stringify(i.value)} (${i.reason})`);

  const store = createStore(initial);
  const facts = methodologyFacts(model, {
    jobNotSpecified: JOB_NOT_SPECIFIED, types: TYPES,
    topicsConfigured: TOPICS.map((t) => t.value), jobsConfigured: JOBS.map((j) => j.value),
  });
  const mobileQuery = window.matchMedia(`(max-width: ${BREAKPOINTS.mobile - 0.02}px)`);

  let lastTrigger = null;
  // The clicked dot (link_id). UI-only: the URL holds the selected item, not which of its dots was clicked.
  const ui = { selectedLink: null };
  let pendingFocus = null; // 'panel' | 'trigger' | 'block' | {methodology: id}

  const actions = {
    select(entityId, trigger) {
      lastTrigger = trigger ?? document.activeElement;
      ui.selectedLink = trigger?.matches?.('button.dot') ? Number(trigger.dataset.link) : null;
      pendingFocus = 'panel';
      store.set({ item: entityId });
    },
    closePanel() {
      const s = store.get();
      pendingFocus = 'trigger';
      if (s.item) store.set({ item: '' });
      else store.set({ q: '' });
    },
    focusBlock(topic) {
      pendingFocus = 'block';
      store.set({ block: topic, bnorm: '', btype: '' });
    },
    drill(patch) {
      pendingFocus = 'block';
      store.set(patch);
    },
    goMethodology(sectionId = '') {
      pendingFocus = { methodology: sectionId };
      store.set({ view: 'methodology' });
      if (store.get().view === 'methodology' && pendingFocus) applyFocus(); // already on the tab: no re-render
    },
    searchEnter() {
      const v = derive(model, store.get());
      if (v.panel?.mode === 'list' && v.panel.ids.length) actions.select(v.panel.ids[0], document.getElementById('search'));
    },
  };

  const ctx = { model, copy, store, actions, facts, ui };
  const tooltip = createTooltip();
  const header = createHeader(ctx);
  const left = createLeftPanel(ctx);
  const grid = createDotGrid(ctx);
  const jobPicker = createJobPicker(ctx);
  const panel = createPanel(ctx);
  const methodology = createMethodology(ctx);

  // Main column
  const hint = h('p', { class: 'opening-hint' }, h('span', { class: 'dot dot--static', 'data-status': 'default', 'aria-hidden': 'true' }), ` ${copy.opening.hint}`);
  const crumbs = h('nav', { class: 'crumbs', 'aria-label': 'Breadcrumb' });
  const chipsEl = h('div', { class: 'chips', 'aria-label': 'Active filters', role: 'group' });
  const tableToggle = h('button', { type: 'button', class: 'btn btn--small', 'aria-pressed': 'false', onClick: () => store.set({ table: !store.get().table }) });
  const topbar = h('div', { class: 'topbar' }, crumbs, h('div', { class: 'topbar__right' }, chipsEl, tableToggle));
  const viewHost = h('div', { class: 'view-host' });
  const matrixHost = h('div', { class: 'matrix-host' });
  const main = h('main', { class: 'main', id: 'main' },
    h('h1', { class: 'visually-hidden' }, `${copy.title}: ${copy.tabs.explore}`),
    hint, topbar, jobPicker.el, viewHost, matrixHost);
  const live = h('div', { class: 'visually-hidden', 'aria-live': 'polite', role: 'status' });
  const explore = h('div', { class: 'layout' }, left.el, main, panel.el);

  root.replaceChildren(header.el, explore, methodology.el, live);

  function renderCrumbs(s) {
    if (!s.block) { setChildren(crumbs, h('p', { class: 'crumbs__caption' }, copy.grid.caption)); return; }
    const levels = [
      { label: copy.grid.allTopics, patch: { block: '', bnorm: '', btype: '' } },
      { label: shortTopic(s.block), patch: { bnorm: '', btype: '' } },
      s.bnorm ? { label: `Norm ${s.bnorm}`, patch: { btype: '' } } : null,
      s.btype ? { label: s.btype, patch: {} } : null,
    ].filter(Boolean);
    setChildren(crumbs, h('ol', {}, levels.map((l, i) => h('li', {},
      i === levels.length - 1
        ? h('span', { 'aria-current': 'location' }, l.label)
        : h('button', { type: 'button', class: 'linklike', onClick: () => actions.drill(l.patch) }, l.label)))));
  }

  function renderChips(s, v) {
    const items = v.chips.map((c) => h('span', { class: 'chip' }, c.label,
      h('button', { type: 'button', class: 'chip__x', 'aria-label': `Remove ${c.label}`, onClick: () => store.set({ [c.key]: '' }) }, '×')));
    if (v.chips.length || s.item || s.block) items.push(h('button', { type: 'button', class: 'linklike clear-all', onClick: () => { pendingFocus = null; store.set(clearAll); } }, copy.controls.clearAll));
    setChildren(chipsEl, items);
  }

  let lastLive = '';
  function render() {
    const s = store.get();
    const v = derive(model, s);
    if (ui.selectedLink !== null && model.links.find((l) => l.link_id === ui.selectedLink)?.entity_id !== v.selectedEntity) ui.selectedLink = null;
    const mobile = mobileQuery.matches;
    const exploring = s.view === 'explore';

    document.body.dataset.view = s.view;
    explore.hidden = !exploring;
    header.update(s);
    methodology.update(s);
    left.update(s, v);
    panel.update(s, v);
    explore.classList.toggle('has-panel', !panel.el.hidden);
    explore.classList.toggle('is-opening', v.opening);

    hint.hidden = !v.opening;
    topbar.hidden = v.opening;
    jobPicker.el.hidden = v.opening || s.by !== 'job';
    jobPicker.update(s);
    renderCrumbs(s);
    renderChips(s, v);
    tableToggle.textContent = s.table ? copy.grid.viewAsGrid : copy.grid.viewAsTable;
    tableToggle.setAttribute('aria-pressed', String(s.table));

    // Main view: opening grid (faded, inert) · table · mobile list · block focus · dot grid
    grid.update(s, v);
    let content;
    if (v.opening) content = grid.el;
    else if (s.table) content = renderLinkTable(ctx, s, v);
    else if (mobile) content = renderMobileList(ctx, s, v);
    else if (s.block) content = renderBlockFocus(ctx, s, v);
    else content = grid.el;
    if (viewHost.firstChild !== content || content !== grid.el) viewHost.replaceChildren(content);
    viewHost.classList.toggle('is-faded', v.opening);
    viewHost.inert = v.opening;
    viewHost.toggleAttribute('aria-hidden', v.opening);

    matrixHost.hidden = v.opening;
    if (!v.opening) setChildren(matrixHost, renderMatrix(ctx, s, v));

    if (v.announce !== lastLive) { live.textContent = v.announce; lastLive = v.announce; }
    syncUrl(s);
    applyFocus();
  }

  function applyFocus() {
    const f = pendingFocus;
    pendingFocus = null;
    if (!f) return;
    if (f === 'panel') { if (!panel.el.hidden) panel.focusTitle(); return; }
    if (f === 'block') { (viewHost.querySelector('.block-focus__title') ?? viewHost.querySelector('.m-row') ?? crumbs.querySelector('button'))?.focus(); return; }
    if (f === 'trigger') {
      if (lastTrigger?.isConnected && !lastTrigger.closest('[hidden]')) { lastTrigger.focus(); return; }
      const id = lastTrigger?.dataset?.entity;
      const again = id && document.querySelector(`.panel [data-entity="${CSS.escape(id)}"], .main [data-entity="${CSS.escape(id)}"]`);
      (again || left.input).focus();
      return;
    }
    if (f.methodology !== undefined) { history.replaceState(null, '', `${serializeQuery(store.get())}${f.methodology ? `#${f.methodology}` : ''}`); methodology.scrollTo(f.methodology); }
  }

  function syncUrl(s) {
    const qs = serializeQuery(s);
    const hash = s.view === 'methodology' ? location.hash : '';
    const url = `${qs || location.pathname}${hash}`;
    if (url !== `${location.search || location.pathname}${location.hash}`) history.replaceState(null, '', url);
  }

  // Escape: close tooltip › clear search (handled in the input) › close panel › go up one level › clear search
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    if (tooltip.isVisible()) {
      tooltip.hide();
      if (document.activeElement?.matches('button.dot')) return; // dismiss the tooltip first (WCAG 1.4.13)
    }
    const s = store.get();
    if (s.view !== 'explore') return;
    const v = derive(model, s);
    if (v.panel && !v.opening) { actions.closePanel(); return; }
    if (s.block) { pendingFocus = 'block'; store.set(drillUp(s)); return; }
    if (s.q) store.set({ q: '' });
  });

  store.subscribe(render);
  mobileQuery.addEventListener('change', render);
  render();
  if (store.get().view === 'methodology' && location.hash) methodology.scrollTo(location.hash.slice(1));
  return { store };
}
