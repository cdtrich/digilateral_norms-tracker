// View 1 layout (and view 2 with “Show non-matching dots”): every link, in fixed topic blocks with
// norm groups inside. Positions never depend on the criteria; only the dot state does (BUILD_SPEC 5.8, 7).
import { TOPICS } from '../config.js';
import { blockNormDots } from './aggregate.js';

/** Topic values in config order, then any value only the data has (data order). */
export function topicOrder(links, configured = TOPICS.map((t) => t.value)) {
  const present = new Set(links.map((l) => l.topic_primary));
  return [...configured.filter((t) => present.has(t)), ...[...present].filter((t) => !configured.includes(t))];
}

/**
 * @returns {{ fixed: true, mode: 'dots', groupBy: 'topic', groups: object[] }}
 *   groups: { key, kind: 'topic', value, n, links, subgroups: { key, kind: 'norm', value, n, links }[] }
 */
export function fixedLayout(links, norms) {
  const tree = blockNormDots(links, norms);
  const groups = topicOrder(links).map((topic) => {
    const subgroups = [...tree.get(topic).entries()].map(([normId, ls]) => ({
      key: `topic:${topic}|norm:${normId}`, kind: 'norm', value: normId, n: ls.length, links: ls,
    }));
    const all = subgroups.flatMap((s) => s.links);
    return { key: `topic:${topic}`, kind: 'topic', value: topic, n: all.length, links: all, subgroups };
  });
  return { fixed: true, mode: 'dots', groupBy: 'topic', groups };
}
