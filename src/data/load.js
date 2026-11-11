// Fetch and parse the dataset. No mutation, no repair: rows are frozen exactly as parsed.
import { csvParse } from '../../vendor/d3-dsv@3.0.1/src/index.js';

export const DATA_DIR = 'data/';
export const DATA_FILES = Object.freeze({
  norms: 'norms.csv',
  entities: 'entities.csv',
  links: 'links.csv',
  meta: 'meta.json',
});

/** Columns each CSV must have (checked by validate.js). */
export const REQUIRED_COLUMNS = Object.freeze({
  norms: ['norm_id', 'title', 'label', 'orientation'],
  entities: ['entity_id', 'name', 'short_name', 'type', 'aliases'],
  links: [
    'link_id', 'norm_id', 'operationalization', 'entity_id',
    'topic_primary', 'topic_secondary', 'job_primary', 'job_secondary',
  ],
});

function freezeRows(rows) {
  const out = rows.map((r) => Object.freeze(r));
  out.columns = Object.freeze([...(rows.columns ?? [])]);
  return Object.freeze(out);
}

/**
 * Parse CSV text into frozen rows. Every field stays a string (empty string = absent),
 * except `link_id`, which becomes a number. A non-integer link_id stays visible as NaN
 * (or a non-integer) so validation can report it.
 */
export function parseDataset({ norms, entities, links }) {
  return {
    norms: freezeRows(csvParse(norms)),
    entities: freezeRows(csvParse(entities)),
    links: freezeRows(
      csvParse(links, (row) => ({ ...row, link_id: row.link_id === '' ? NaN : Number(row.link_id) })),
    ),
  };
}

/** Browser loader: relative URLs, so the site works at any subdomain or path. */
export async function fetchDataset(base = DATA_DIR) {
  const get = async (file, as) => {
    const res = await fetch(base + file);
    if (!res.ok) throw new Error(`Could not load ${base}${file} (HTTP ${res.status})`);
    return as === 'json' ? res.json() : res.text();
  };
  const [norms, entities, links, meta] = await Promise.all([
    get(DATA_FILES.norms),
    get(DATA_FILES.entities),
    get(DATA_FILES.links),
    get(DATA_FILES.meta, 'json'),
  ]);
  return { ...parseDataset({ norms, entities, links }), meta: Object.freeze(meta) };
}
