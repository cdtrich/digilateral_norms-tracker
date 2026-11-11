// Integrity checks (BUILD_SPEC 4.3). Reports problems; never fixes, defaults or drops anything.
import { TOPICS, JOBS, TYPES, ORIENTATIONS, META_KEYS } from '../config.js';
import { REQUIRED_COLUMNS } from './load.js';

const DEFAULT_RULES = {
  topics: TOPICS.map((t) => t.value),
  jobs: JOBS.map((j) => j.value),
  types: TYPES,
  orientations: Object.keys(ORIENTATIONS),
  metaKeys: META_KEYS,
};

/**
 * @param {{norms, entities, links, meta?}} raw parsed dataset (see load.js)
 * @returns {{code: string, message: string}[]} empty when the data is sound
 */
export function validateDataset(raw, rules = DEFAULT_RULES) {
  const problems = [];
  const report = (code, message) => problems.push({ code, message });

  // Columns
  for (const [file, cols] of Object.entries(REQUIRED_COLUMNS)) {
    const have = new Set(raw[file]?.columns ?? []);
    for (const c of cols) if (!have.has(c)) report('missing-column', `${file}.csv has no column “${c}”`);
  }

  // Norms
  const normIds = new Set();
  for (const n of raw.norms) {
    if (!n.norm_id) report('empty-id', `norms.csv: a row has an empty norm_id`);
    else if (normIds.has(n.norm_id)) report('duplicate-id', `norms.csv: norm_id “${n.norm_id}” appears more than once`);
    normIds.add(n.norm_id);
    if (!rules.orientations.includes(n.orientation))
      report('unknown-orientation', `norms.csv: norm ${n.norm_id} has orientation “${n.orientation}” (expected ${rules.orientations.join(' or ')})`);
  }

  // Entities
  const entityIds = new Set();
  for (const e of raw.entities) {
    if (!e.entity_id) report('empty-id', `entities.csv: a row has an empty entity_id (name “${e.name}”)`);
    else if (entityIds.has(e.entity_id)) report('duplicate-id', `entities.csv: entity_id “${e.entity_id}” appears more than once`);
    entityIds.add(e.entity_id);
    if (!rules.types.includes(e.type))
      report('unknown-type', `entities.csv: ${e.entity_id} has type “${e.type}” (expected one of ${rules.types.join(', ')})`);
    if (!e.name) report('empty-name', `entities.csv: ${e.entity_id} has an empty name`);
  }

  // Links
  const linkIds = new Set();
  const label = (l) => `links.csv: link ${Number.isNaN(l.link_id) ? '(no id)' : l.link_id}`;
  for (const l of raw.links) {
    if (!Number.isInteger(l.link_id)) report('bad-link-id', `${label(l)}: link_id is not an integer`);
    else if (linkIds.has(l.link_id)) report('duplicate-id', `links.csv: link_id ${l.link_id} appears more than once`);
    linkIds.add(l.link_id);
    if (!normIds.has(l.norm_id)) report('broken-norm-ref', `${label(l)}: norm_id “${l.norm_id}” is not in norms.csv`);
    if (!entityIds.has(l.entity_id)) report('broken-entity-ref', `${label(l)}: entity_id “${l.entity_id}” is not in entities.csv`);
    checkCoded(l, 'topic_primary', rules.topics, true, report, label);
    checkCoded(l, 'topic_secondary', rules.topics, false, report, label);
    checkCoded(l, 'job_primary', rules.jobs, true, report, label);
    checkCoded(l, 'job_secondary', rules.jobs, false, report, label);
  }

  // meta.json (only when supplied; check-data and the browser always supply it)
  if ('meta' in raw) {
    const m = raw.meta;
    if (m === null || typeof m !== 'object' || Array.isArray(m)) report('bad-meta', 'meta.json is not a JSON object');
    else
      for (const k of rules.metaKeys) {
        if (!(k in m)) report('bad-meta', `meta.json has no key “${k}”`);
        else if (m[k] !== null && typeof m[k] !== 'string') report('bad-meta', `meta.json: “${k}” must be a string or null`);
      }
  }

  return problems;
}

function checkCoded(link, field, allowed, required, report, label) {
  const v = link[field];
  if (v === '') {
    if (required) report(`empty-${field}`, `${label(link)}: ${field} is empty`);
    return;
  }
  if (!allowed.includes(v)) {
    const kind = field.startsWith('topic') ? 'topic' : 'job';
    report(`unknown-${kind}`, `${label(link)}: ${field} “${v}” has no label in config.js`);
  }
}

/** Counts for the console and check-data. */
export function summarize(raw) {
  const entityType = new Map(raw.entities.map((e) => [e.entity_id, e.type]));
  const perType = {};
  for (const l of raw.links) {
    const t = entityType.get(l.entity_id) ?? '(unknown)';
    perType[t] = (perType[t] ?? 0) + 1;
  }
  return {
    links: raw.links.length,
    norms: raw.norms.length,
    entities: raw.entities.length,
    linksPerType: perType,
  };
}
