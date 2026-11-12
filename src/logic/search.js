// Pure search and ranking (BUILD_SPEC 5.3).

/** Lower-case, strip diacritics, collapse whitespace. */
export function normalize(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(q) {
  const n = normalize(q);
  return n === '' ? [] : n.split(' ');
}

const WORD_CHAR = /[\p{L}\p{N}]/u;

/** True when `token` occurs in `hay` at the start of a word (both already normalized). */
export function matchesWordStart(hay, token) {
  for (let i = hay.indexOf(token); i !== -1; i = hay.indexOf(token, i + 1)) {
    if (i === 0 || !WORD_CHAR.test(hay[i - 1])) return true;
  }
  return false;
}

export function splitAliases(aliases) {
  return String(aliases ?? '')
    .split(';')
    .map((a) => a.trim())
    .filter(Boolean);
}

/** Normalized searchable fields of an entity: name, short_name, aliases. */
export function searchFields(entity) {
  return [entity.name, entity.short_name, ...splitAliases(entity.aliases)].map(normalize).filter(Boolean);
}

/** Exact keys: normalized short_name and aliases (not the full name). */
function exactKeys(entity) {
  return [entity.short_name, ...splitAliases(entity.aliases)].map(normalize).filter(Boolean);
}

/** True when the query contains the word “commission” (Commission rule, 5.3.3). */
export function mentionsCommission(q) {
  return matchesWordStart(normalize(q), 'commission');
}

const byName = (a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });

/**
 * @returns {{
 *   query: string,
 *   mode: 'idle' | 'single' | 'list' | 'empty',
 *   exact: boolean,             // single mode reached through an exact short-name/alias hit
 *   selected: string | null,    // entity_id in single mode
 *   matches: string[],          // entity_ids whose dots are highlighted
 *   others: string[],           // single mode via exact hit: other items that also mention the query
 *   commission: boolean,
 * }}
 */
export function searchEntities(entities, q) {
  const query = normalize(q);
  const commission = mentionsCommission(q);
  const tokens = tokenize(q);
  if (tokens.length === 0)
    return { query, mode: 'idle', exact: false, selected: null, matches: [], others: [], commission };

  const wordHits = entities
    .filter((e) => {
      const fields = searchFields(e);
      return tokens.every((t) => fields.some((f) => matchesWordStart(f, t)));
    })
    .sort(byName);

  const exactHits = entities.filter((e) => exactKeys(e).includes(query));
  if (exactHits.length === 1) {
    const hit = exactHits[0];
    return {
      query, mode: 'single', exact: true, selected: hit.entity_id, matches: [hit.entity_id],
      others: wordHits.filter((e) => e !== hit).map((e) => e.entity_id), commission,
    };
  }
  // Two or more exact hits are ambiguous: fall through to the word-match list.

  const ids = wordHits.map((e) => e.entity_id);
  if (ids.length === 0) return { query, mode: 'empty', exact: false, selected: null, matches: [], others: [], commission };
  if (ids.length === 1) return { query, mode: 'single', exact: false, selected: ids[0], matches: ids, others: [], commission };
  return { query, mode: 'list', exact: false, selected: null, matches: ids, others: [], commission };
}

/**
 * Search with the “show all mentions” switch: when `all` is set and an exact hit has other mentions,
 * list mode shows the exact hit and the other mentions together (all their dots highlighted).
 */
export function resolveSearch(entities, q, { all = false } = {}) {
  const r = searchEntities(entities, q);
  if (!all || r.mode !== 'single' || r.others.length === 0) return r;
  const byId = new Map(entities.map((e) => [e.entity_id, e]));
  const ids = [r.selected, ...r.others].sort((a, b) => byName(byId.get(a), byId.get(b)));
  return { ...r, mode: 'list', selected: null, matches: ids, others: [] };
}

/**
 * Combobox suggestions (BUILD_SPEC 5.9): entities matched with the word-start rule, narrowed by type,
 * grouped by type in `types` order (unknown types last), alphabetical inside a group, with a link count.
 * An empty query lists nothing unless `all` is set (ArrowDown on an empty box opens the full list).
 * @returns {{ total: number, groups: { type: string, items: { id, name, shortName, links }[] }[] }}
 */
export function suggestItems(entities, linksByEntity, q, { type = '', types = [], all = false } = {}) {
  const tokens = tokenize(q);
  if (tokens.length === 0 && !all) return { total: 0, groups: [] };
  const hits = entities
    .filter((e) => !type || e.type === type)
    .filter((e) => {
      if (tokens.length === 0) return true;
      const fields = searchFields(e);
      return tokens.every((t) => fields.some((f) => matchesWordStart(f, t)));
    })
    .sort(byName);
  const order = [...types, ...new Set(hits.map((e) => e.type).filter((t) => !types.includes(t)))];
  const groups = order
    .map((t) => ({
      type: t,
      items: hits.filter((e) => e.type === t).map((e) => ({
        id: e.entity_id, name: e.name, shortName: e.short_name, links: linksByEntity.get(e.entity_id)?.length ?? 0,
      })),
    }))
    .filter((g) => g.items.length > 0);
  return { total: hits.length, groups };
}
