// Methodology tab: section nav, copy with computed {tokens}, “To confirm” boxes, downloads, version.
import { DOWNLOADS, SHOW_DRAFT_MARKERS } from '../config.js';
import { h, fmt } from './dom.js';

const META_PLACEHOLDER = { version: '[VERSION]', date: '[DATE]', contact: '[CONTACT]' };

export function createMethodology(ctx) {
  const { copy, facts, model } = ctx;
  const m = copy.methodology;

  // {reportLink} becomes a real link when copy.header.reportUrl is set, else a visible placeholder.
  const reportLink = () => copy.header.reportUrl
    ? h('a', { href: copy.header.reportUrl }, copy.header.readReport)
    : h('span', { class: 'placeholder' }, `${copy.header.readReport} ${copy.header.reportUrlPlaceholder}`);
  const para = (text) => {
    const parts = fmt(text, facts).split('{reportLink}');
    return h('p', {}, parts.flatMap((p, i) => (i ? [reportLink(), p] : [p])));
  };
  const confirmBox = (text) => SHOW_DRAFT_MARKERS && text
    ? h('div', { class: 'to-confirm' }, h('strong', {}, m.toConfirm), ` ${fmt(text, facts)}`) : null;

  const meta = model.meta ?? {};
  const metaLine = ['version', 'date', 'contact']
    .map((k) => (meta[k] == null ? h('span', { class: 'placeholder' }, META_PLACEHOLDER[k]) : (k === 'version' ? `Version ${meta[k]}` : meta[k])));

  const sections = m.sections.map((s) =>
    h('section', { class: 'meth-section', id: s.id, 'aria-labelledby': `${s.id}-h` },
      h('h2', { id: `${s.id}-h` }, s.heading),
      (s.paragraphs ?? []).map(para),
      s.fields ? h('table', { class: 'fields' }, h('tbody', {}, s.fields.map(([f, d]) => h('tr', {}, h('th', { scope: 'row' }, f), h('td', {}, fmt(d, facts)))))) : null,
      s.bullets ? h('ul', {}, s.bullets.map((b) => h('li', {}, fmt(b, facts)))) : null,
      confirmBox(s.confirm),
      s.downloads ? h('ul', { class: 'downloads' }, DOWNLOADS.map((d) =>
        h('li', {}, h('a', { class: 'btn btn--outline', href: `data/${d.file}`, download: d.file, title: d.label }, d.file)))) : null,
      s.meta ? h('p', {}, metaLine.flatMap((x, i) => (i ? [' · ', x] : [x]))) : null,
    ));

  const el = h('div', { class: 'methodology', hidden: true },
    h('nav', { class: 'meth-nav', 'aria-label': 'Methodology sections' },
      h('ul', {}, m.sections.map((s) => h('li', {}, h('a', { href: `#${s.id}` }, s.nav))))),
    h('article', { class: 'meth-body' },
      h('h1', { class: 'meth-title', tabindex: '-1' }, m.title),
      SHOW_DRAFT_MARKERS ? h('p', { class: 'draft-banner' }, m.draftBanner) : null,
      sections));

  return {
    el,
    update(state) { el.hidden = state.view !== 'methodology'; },
    scrollTo(id) {
      const target = id ? el.querySelector(`#${CSS.escape(id)}`) : el.querySelector('.meth-title');
      if (!target) return;
      target.scrollIntoView({ block: 'start' });
      const focusable = id ? target.querySelector('h2') : target;
      if (focusable) { focusable.setAttribute('tabindex', '-1'); focusable.focus({ preventScroll: true }); }
    },
  };
}
