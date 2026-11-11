// Tooltip for dots (hover and keyboard focus). Decorative: the dot’s aria-label carries the same text.
import { h } from './dom.js';
import { shortTopic, shortJob } from '../logic/view.js';

const MAX_OPS = 160;

export function createTooltip() {
  const el = h('div', { class: 'tooltip', 'aria-hidden': 'true', hidden: true });
  document.body.append(el);
  let current = null;

  function show(target) {
    const link = target._link;
    if (!link) return;
    current = target;
    const ops = link.operationalization.length > MAX_OPS ? `${link.operationalization.slice(0, MAX_OPS - 1)}…` : link.operationalization;
    const st = target.dataset.statusLabel;
    el.replaceChildren(
      h('strong', { class: 'tooltip__name' }, link.entity?.name ?? link.entity_id),
      h('span', { class: 'tooltip__meta' }, `${link.entity?.type ?? ''} · ${link.norm?.label ?? `Norm ${link.norm_id}`}`),
      h('span', { class: 'tooltip__ops' }, ops),
      h('span', { class: 'tooltip__meta' }, `Topic: ${shortTopic(link.topic_primary)}${link.topic_secondary ? ` (also ${shortTopic(link.topic_secondary)})` : ''}`),
      h('span', { class: 'tooltip__meta' }, `Job: ${shortJob(link.job_primary)}${link.job_secondary ? ` (also ${shortJob(link.job_secondary)})` : ''}`),
      st ? h('span', { class: `tooltip__status tooltip__status--${target.dataset.status}` }, st) : null,
    );
    el.hidden = false;
    const r = target.getBoundingClientRect();
    const tw = el.offsetWidth;
    const th = el.offsetHeight;
    let left = r.left + r.width / 2 - tw / 2;
    left = Math.max(8, Math.min(left, document.documentElement.clientWidth - tw - 8));
    let top = r.top - th - 8;
    if (top < 8) top = r.bottom + 8;
    el.style.left = `${left + window.scrollX}px`;
    el.style.top = `${top + window.scrollY}px`;
  }

  function hide() {
    el.hidden = true;
    current = null;
  }

  const isDot = (t) => t instanceof Element && t.matches('button.dot');
  document.addEventListener('mouseover', (e) => { if (isDot(e.target)) show(e.target); });
  document.addEventListener('mouseout', (e) => { if (isDot(e.target) && e.target === current) hide(); });
  document.addEventListener('focusin', (e) => { if (isDot(e.target)) show(e.target); else if (current) hide(); });
  document.addEventListener('focusout', (e) => { if (e.target === current) hide(); });
  window.addEventListener('scroll', hide, { passive: true });

  return { show, hide, isVisible: () => !el.hidden, refresh: () => current && show(current) };
}
