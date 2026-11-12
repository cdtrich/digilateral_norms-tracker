// View 2 motion (BUILD_SPEC 11): FLIP with the Web Animations API, keyed by link_id. No dependency.
// Leavers shrink and fade (as ghosts outside the grid), stayers move from where they were, enterers grow in,
// and a dot that becomes a card (or back) grows out of / into its old place.
// A new update cancels the running animations and starts from what is on screen now.
// Reduced motion: nothing animates; the DOM is already in its end state.
import { MOTION } from '../config.js';

const reduceQuery = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
export const prefersReducedMotion = () => Boolean(reduceQuery?.matches);

export function createMotion(host) {
  let running = [];
  let ghosts = [];
  let token = 0;

  /** Where every keyed element is on screen now (including any transform still running). */
  function snapshot(keyed) {
    const out = new Map();
    for (const [key, el] of keyed) {
      if (!el.isConnected) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      out.set(key, { el, rect: r });
    }
    return out;
  }

  function cancel() {
    for (const a of running) a.cancel();
    running = [];
    for (const g of ghosts) g.remove();
    ghosts = [];
  }

  function ghostOf(el, rect) {
    const g = el.cloneNode(true);
    g.removeAttribute('id');
    g.classList.add('motion-ghost');
    g.setAttribute('aria-hidden', 'true');
    g.inert = true;
    g.tabIndex = -1;
    Object.assign(g.style, {
      position: 'absolute', margin: '0', pointerEvents: 'none', zIndex: '5',
      left: `${rect.left + window.scrollX}px`, top: `${rect.top + window.scrollY}px`,
      width: `${rect.width}px`, height: `${rect.height}px`,
    });
    document.body.append(g);
    ghosts.push(g);
    return g;
  }

  /**
   * @param {Map} before  snapshot() taken before the DOM changed
   * @param {Map} after   key → element now in the DOM
   */
  function play(before, after) {
    if (prefersReducedMotion()) { host.dataset.animating = 'false'; return; }
    const ease = MOTION.easing;
    const anims = [];
    const opts = (delay, duration) => ({ delay, duration, easing: ease, fill: 'backwards' });

    for (const [key, b] of before) {
      if (after.has(key)) continue;
      const g = ghostOf(b.el, b.rect);
      const a = g.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(0.3)' }],
        { duration: MOTION.leave, easing: ease, fill: 'forwards' });
      a.finished.then(() => g.remove(), () => {});
      anims.push(a);
    }

    for (const [key, el] of after) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      const b = before.get(key);
      if (b && b.el === el) {
        const dx = b.rect.left - r.left;
        const dy = b.rect.top - r.top;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
        anims.push(el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], opts(MOTION.moveDelay, MOTION.move)));
      } else if (b) {
        // Dot ↔ card: grow out of (or shrink into) the old element’s place.
        const sx = b.rect.width / r.width;
        const sy = b.rect.height / r.height;
        const dx = b.rect.left - r.left;
        const dy = b.rect.top - r.top;
        anims.push(el.animate([
          { transformOrigin: '0 0', opacity: 0, transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
          { transformOrigin: '0 0', opacity: 1, transform: 'none' },
        ], opts(MOTION.moveDelay, MOTION.enterDelay + MOTION.enter - MOTION.moveDelay)));
      } else {
        anims.push(el.animate([{ opacity: 0, transform: 'scale(0.3)' }, { opacity: 1, transform: 'none' }], opts(MOTION.enterDelay, MOTION.enter)));
      }
    }

    running = anims;
    if (anims.length === 0) { host.dataset.animating = 'false'; return; }
    const mine = ++token;
    host.dataset.animating = 'true';
    Promise.allSettled(anims.map((a) => a.finished)).then(() => {
      if (mine !== token) return;
      running = [];
      host.dataset.animating = 'false';
    });
  }

  /** Mobile: a short cross-fade only (BUILD_SPEC 8, V8). */
  function fade(el) {
    if (prefersReducedMotion()) return;
    el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: MOTION.mobileFade, easing: 'ease-out' });
  }

  return { snapshot, cancel, play, fade };
}
