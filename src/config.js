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

/** Layouts (BUILD_SPEC 8): '1' = fixed topic blocks, '2' = adaptive. The default is left out of the URL. */
export const VIEWS = Object.freeze(['1', '2']);
export const DEFAULT_VIEW = '2';

/** View 2: at or below this many visible links, each link is shown as a card (BUILD_SPEC 5.7). Tune by eye. */
export const CARD_THRESHOLD = 12;

/**
 * View 2 motion (BUILD_SPEC 11), in ms: leavers shrink and fade, stayers move, enterers and cards grow in.
 * Keep the total (enterDelay + enter) at about half a second. Reduced motion: no animation at all.
 */
export const MOTION = Object.freeze({
  leave: 160,
  moveDelay: 100,
  move: 300,
  enterDelay: 300,
  enter: 200,
  mobileFade: 150,
  easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)', // ease-out
});
