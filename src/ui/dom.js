// Tiny DOM helpers shared by the UI modules.
import { ORIENTATIONS } from '../config.js';

/** h('button', { class: 'x', onClick: fn, 'aria-label': '…' }, child, 'text', [more]) */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  append(el, children);
  return el;
}

export function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : String(c));
  }
  return el;
}

/** Replace all children. */
export function setChildren(el, ...children) {
  el.replaceChildren();
  return append(el, children);
}

/** Fill {name} placeholders. Unknown names stay visible. */
export const fmt = (s, vars = {}) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));

export const plural = (n, one, many) => (n === 1 ? one : many);

/** DO / DON’T tag: outlined vs filled Jet, never colour alone (text differs too). */
export function normTag(orientation) {
  const o = ORIENTATIONS[orientation];
  return h('span', { class: `tag tag--${orientation === 'prohibitive' ? 'dont' : 'do'}` }, o ? o.tag : '?');
}

export function typeBadge(type) {
  return h('span', { class: 'type-badge' }, type ?? '?');
}

export const visuallyHidden = (text) => h('span', { class: 'visually-hidden' }, text);

/** Plain-language orientation for labels. */
export const orientationWord = (orientation) => (orientation === 'prohibitive' ? 'don’t' : 'do');
