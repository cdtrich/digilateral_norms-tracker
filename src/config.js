// Presentation choices only: labels, orders, colours, sizes. Never written back to data.
// A topic or job value in the data without an entry here fails validation on purpose (BUILD_SPEC 4.3).

/** Topics in list order (dropdowns, matrix columns), with short labels. */
export const TOPICS = Object.freeze([
  { value: 'Incident response and management', short: 'Incident response' },
  { value: 'Critical infrastructure', short: 'Critical infra.' },
  { value: 'Stability and security', short: 'Stability & security' },
  { value: 'Supply chain security', short: 'Supply chain' },
  { value: 'Cybercrime and terrorism', short: 'Cybercrime' },
  { value: 'Vulnerability disclosure', short: 'Vuln. disclosure' },
  { value: 'Human rights and privacy', short: 'Human rights' },
]);

/** Desktop masonry columns for the topic grid (wireframe). Fallback: link count descending. */
export const TOPIC_LAYOUT = Object.freeze([
  ['Incident response and management', 'Human rights and privacy'],
  ['Critical infrastructure', 'Supply chain security'],
  ['Stability and security', 'Cybercrime and terrorism', 'Vulnerability disclosure'],
]);

/** Job categories in list order, with short labels. */
export const JOBS = Object.freeze([
  { value: 'Incident manager', short: 'Incident manager' },
  { value: 'Threat analyst', short: 'Threat analyst' },
  { value: 'Critical infrastructure actor', short: 'Crit. infra. actor' },
  { value: 'Diplomat', short: 'Diplomat' },
  { value: 'Criminal justice', short: 'Criminal justice' },
  { value: 'Not specified', short: 'Not specified' },
]);

/** Job value shown as a lighter chip with an explanatory note. */
export const JOB_NOT_SPECIFIED = 'Not specified';

/** Entity types; also the dot order inside a norm group (BUILD_SPEC 5.4). */
export const TYPES = Object.freeze(['Legislation', 'Policies', 'Institutions', 'Partnerships']);

/** Norm orientation values and their tags. DO = outlined, DON’T = filled Jet + dark top edge. */
export const ORIENTATIONS = Object.freeze({
  positive: { tag: 'DO', label: 'Do' },
  prohibitive: { tag: 'DON’T', label: 'Don’t' },
});

export const COLORS = Object.freeze({
  jet: '#333333',
  electricBlue: '#0033FF',
  white: '#FFFFFF',
  sunglow: '#FFCC33',
  lightSeaGreen: '#03A6A6',
  red: '#F51B1B', // errors and warnings only, never data encoding
  paleBlue: '#B8C2FF', // `none` dot state; tune against the wireframes, verify 3:1 (BUILD_SPEC 10)
});

export const SIZES = Object.freeze({
  dotDesktop: 18,
  dotTablet: 13,
  dotGap: 4,
});

export const BREAKPOINTS = Object.freeze({ mobile: 720, tablet: 1100 });

/** “Draft for review” banner and “To confirm” boxes on the methodology tab. */
export const SHOW_DRAFT_MARKERS = true;

/** Files in data/ offered on the methodology tab. check-data verifies each exists. */
export const DOWNLOADS = Object.freeze([
  { file: 'norms_tracker_data_v1.xlsx', label: 'Full dataset (xlsx)' },
  { file: 'norms.csv', label: 'Norms (CSV)' },
  { file: 'entities.csv', label: 'Items (CSV)' },
  { file: 'links.csv', label: 'Links (CSV)' },
  { file: 'CLEANING_LOG.md', label: 'Cleaning log' },
  { file: 'clean_norms_data.R', label: 'Cleaning script (R)' },
]);

/** Keys expected in data/meta.json; null renders as a visible placeholder. */
export const META_KEYS = Object.freeze(['version', 'date', 'source_report_version', 'licence', 'citation', 'contact']);

export const SEARCH_DEBOUNCE_MS = 150;
