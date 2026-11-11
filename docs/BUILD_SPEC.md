# Norms tracker: build spec v1

Hand-off document for Claude Code. Read `CLAUDE.md` first (rules), then this file (what to build). The wireframes (5 artboards, https://claude.ai/artifact/MwbtgrVPfYj34cKESHhaEC) are the layout spec; this document overrides them wherever it says so (section 12).

## 1. What this is

A stand-alone static page showing how the EU puts the 11 UN norms of responsible state behavior in cyberspace into practice. One dot = one link between a norm and an EU instrument, institution or partnership. Based on the Interface study "A UN Effect? How the EU Implements the Norms of Responsible State Behavior in Cyberspace" (Pawlak, Rupp, 15 July 2026).

Audiences: (1) policy professionals who want to see where they fit, (2) readers who want to know how a specific instrument (e.g. NIS2) matters.

Branding: digilateral visual guide v1.2. Hosted on GitHub Pages (subdomain), also usable as a full-window iframe.

## 2. Sources of truth

| What | Where | Rule |
|---|---|---|
| Data | `data/norms.csv`, `entities.csv`, `links.csv` | **Read-only.** The client's dataset is the truth. Never edit, "fix", merge, reassign or add rows. Report problems; do not patch them. |
| Data provenance | `data/CLEANING_LOG.md` (byte-for-byte copy of `files/CLEANING_LOG.md`), `data/norms_tracker_data_v1.xlsx`, `data/clean_norms_data.R` | Shipped as downloads, untouched. |
| UI copy | `src/content/copy.json` | Intro text, placeholders, explanations. Placeholders stay visibly marked until the client replaces them. |
| UI labels (short names, ordering, colors) | `src/config.js` | Presentation only. Never written back to data. |
| Brand | `files/visual guide_v1.2.pdf` (reference only; `files/` is gitignored, the PDF is not committed) | Colors, fonts below and in `CLAUDE.md`. |

Counts in the UI are always computed from the data, never typed in. Expected counts (for tests only): 196 links, 11 norms, 91 items; types Legislation 64, Partnerships 46, Policies 43, Institutions 43 (counted per link).

## 3. Repo structure

No build step: the repo root is the site root. `index.html` loads `src/main.js` with `<script type="module">`; every import and URL is relative, so the site works at a subdomain root or under a path. The existing folders (`data/`, `files/`, `wireframes/`) stay where they are. `Claude/` is a gitignored local working folder; the committed copy of this spec is `docs/BUILD_SPEC.md`.

```
/
  CLAUDE.md
  DECISIONS.md            # seeded from section 13
  OPEN-QUESTIONS.md       # seeded from section 14
  README.md
  index.html              # entry point, served as is
  .nojekyll               # Pages serves files as they are (no Jekyll)
  .gitattributes          # export-ignore marks dev-only paths left out of the published site
  CNAME                   # filled by owner when the subdomain is known
  package.json            # dev-only: scripts, Playwright, axe (node_modules/ is gitignored)
  playwright.config.js
  docs/
    BUILD_SPEC.md         # this file (committed copy; `Claude/` is gitignored)
  data/                   # READ-ONLY client files (+ meta.json, see 4.1, + downloads, see 7)
  files/                  # gitignored reference material (brand guide, report PDF, raw files)
  wireframes/             # exported wireframe PNGs + PDF
  fonts/                  # self-hosted Roboto Slab 700, Roboto 300 (woff2) + licence files
  vendor/                 # pinned D3 modules as ESM sources + LICENSE, e.g. vendor/d3-dsv@3.0.1/
  src/
    main.js               # boot: load data, validate, mount app
    config.js             # labels, orders, colors, breakpoints
    content/copy.json
    data/
      load.js             # fetch + parse CSV (d3-dsv), no mutation
      validate.js         # integrity checks (4.3)
      model.js            # build derived indexes (4.2)
    logic/
      match.js            # pure matching functions (section 5)
      search.js           # pure search/ranking (5.3)
      aggregate.js        # counts for blocks, matrix, panel
      state.js            # single store + URL sync
    ui/
      app.js header.js left-panel.js opening.js job-picker.js
      dot-grid.js block-focus.js matrix.js detail-panel.js
      result-list.js commission-note.js methodology.js legend.js
      mobile-list.js
    styles/
      tokens.css base.css components.css
  scripts/
    check-data.js         # plain Node script running validate.js; used in CI and `npm run check-data`
  tests/
    unit/                 # node:test (Node's built-in runner)
    e2e/                  # Playwright (+ axe)
  .github/workflows/deploy.yml
```

## 4. Data layer

### 4.1 Files and loading
- Fetch `data/norms.csv`, `entities.csv`, `links.csv` at runtime with relative URLs. Parse with `d3-dsv` (`csvParse`, no auto-typing except `link_id` as integer).
- Treat empty string as "absent" (e.g. empty `topic_secondary`). Do not convert to `null` in a way that changes counts.
- `data/meta.json` (new, metadata only): `{ "version": null, "date": null, "source_report_version": null, "licence": null, "citation": null, "contact": null }`. The client fills it in. The UI renders `[DATE]`, `[CONTACT]` etc. as visible placeholders while values are `null`. Download buttons link to files in `data/`.
- No third-party requests anywhere. Fonts and every dependency are self-hosted and committed (`fonts/`, `vendor/`).

### 4.2 Derived model (built once, immutable)
```
norms[]            from norms.csv (+ index by norm_id)
entities[]         from entities.csv (+ index by entity_id)
links[]            from links.csv, each with refs: norm, entity
linksByNorm, linksByEntity, linksByTopicPrimary, linksByJobPrimary
topics[]           distinct topic_primary values ∪ topic_secondary values
jobs[]             distinct job_primary values ∪ job_secondary values (includes "Not specified")
entityNormSummary  per entity: links per norm, distinct operationalizations per norm
```
Block and group order comes from `config.js` (see 4.4), not from data order.

### 4.3 Validation (fail loudly, never fix)
`validate.js` returns a list of problems. In dev and CI any problem fails. In production the app shows a visible banner ("Data check failed: …") and still renders what it can. Checks:
- every `links.norm_id` exists in norms; every `links.entity_id` exists in entities
- `norms.orientation` ∈ {positive, prohibitive}
- `entities.type` ∈ the four types
- every topic and job value in links has a label in `config.js` (a missing label means the data changed; surface it, do not guess)
- `link_id` unique
- counts reported to console: links, norms, entities, per type

### 4.4 `config.js`
- `TOPIC_ORDER` and short labels: Incident response and management → "Incident response"; Critical infrastructure → "Critical infra."; Stability and security → "Stability & security"; Supply chain security → "Supply chain"; Cybercrime and terrorism → "Cybercrime"; Vulnerability disclosure → "Vuln. disclosure"; Human rights and privacy → "Human rights".
- `JOB_ORDER` and short labels: Incident manager; Threat analyst; Critical infrastructure actor → "Crit. infra. actor"; Diplomat; Criminal justice; Not specified.
- Block layout order in the grid follows the wireframe masonry: column 1 Incident response, Human rights; column 2 Critical infrastructure, Supply chain; column 3 Stability and security, Cybercrime, Vulnerability disclosure. Implement as responsive masonry, ordered by link count descending as the fallback.
- Colors and sizes (section 6).

### 4.5 Golden values (use as tests)
| Query | Expected |
|---|---|
| Search `NIS2` | exact short-name hit: "NIS2 Directive (Directive 2022/2555)", 22 links, norms A B C F G H I J K (9 of 11); per norm A1 B3 C2 F1 G4 H1 I3 J5 K2. One more item mentions NIS2 in its name (Technical Implementation Guidance on Commission Implementing Regulation 2024/2690, 2 links) |
| Search `ENISA` | one item, 18 links, norms A B C G H I J (7 of 11); per norm A2 B2 C1 G3 H1 I3 J6 |
| Search `Commission` | 4 items: European Commission (Institutions, Norm I, 1 link); Commission Implementing Regulation amending Implementing Regulation 2015/1998… (Legislation, Norm G, 1); Commission Recommendation on guidelines on the export of cyber-surveillance items… (Policies, Norm E, 1); Technical Implementation Guidance on Commission Implementing Regulation 2024/2690… (Policies, Norms I and J, 2 links). Commission note shown |
| Topic blocks (primary) | Incident response 54, Critical infrastructure 37, Stability and security 30, Supply chain 22, Cybercrime 20, Vulnerability disclosure 18, Human rights 15 |
| Job lens counts, primary / primary+secondary | Incident manager 54/89, Threat analyst 40/40, Critical infrastructure actor 37/49, Diplomat 30/93, Criminal justice 20/26, Not specified 15/15 |
| Prohibitive norms | C, F, K (36 of 196 links) |

## 5. Matching logic (pure functions, fully unit-tested)

### 5.1 Criteria
State holds optional criteria: `q` (search text), `norm`, `orientation`, `type`, `topic`, `job`. The job lens (5.2) and the "Job category" dropdown are the **same** `job` criterion. Matrix cell click sets `norm` plus `topic` (topic mode) or `job` (job mode).

### 5.2 Per-link result
For each link compute `status`:
- `default`: no criteria active
- `full`: all active criteria satisfied, every topic/job criterion at **primary** level
- `partial`: all active criteria satisfied, at least one topic/job criterion satisfied only via **secondary** (`topic_secondary` / `job_secondary`)
- `none`: any active criterion not satisfied

Criteria details: `norm` equals `norm_id`; `orientation` from the link's norm; `type` from the link's entity; `topic`/`job` compared against primary, then secondary; `q` per 5.3.

### 5.3 Search
Searches entity `name`, `short_name`, `aliases` (split on `;`). Case- and diacritics-insensitive. A query token matches at the **start of a word** (not anywhere in a word: `cra` must not hit "democracy"). All tokens must match.
Ranking and mode:
1. If the normalized query equals an entity's `short_name` or one of its aliases exactly → **single-item mode** on that entity (it is selected, its dots highlighted). Other word-matches are listed under the panel as "N other item(s) mention '…'" (a link switches to list mode). Reason: the wireframes show NIS2 as a single selected item even though another item names it.
2. Otherwise, all word-matching entities → if exactly 1: single-item mode; if 2 or more: **list mode** (result list in the right panel, all their dots highlighted); if 0: empty state ("No item matches '…'. Try a short name such as NIS2 or ENISA.").
3. Commission rule: if the query contains the word "commission" (any case), show the Commission note (copy in `copy.json`) above the result list, in the panel and as a small helper line under the search box at all times ("The European Commission is not coded per norm. Why?", link to methodology section).

### 5.4 Aggregations
- Block count: links by `topic_primary` (grid grouping is always by primary topic).
- Block × norm: dots per norm inside a block; dot order inside a norm: type (Legislation, Policies, Institutions, Partnerships), then entity name.
- Matrix cell: count of links for (norm, column value) at primary level. In job mode also the count at secondary level, shown as a lighter "+n". A cell is "hit" when at least one of its links has status `full` or `partial`.
- Panel: links and distinct norms for an entity; per-norm link counts; distinct operationalizations per norm.

## 6. Visual encoding

Colors (tokens): Jet `#333333`, Electric Blue `#0033FF`, White, Sunglow `#FFCC33`; secondary Light sea green `#03A6A6`, Red `#F51B1B` used sparingly (errors, warnings; not for data encoding). Pale-blue "no match" is a tint of Electric Blue (start near `#B8C2FF`, tune for the wireframe look).

| Dot state | Encoding |
|---|---|
| `default` | Electric Blue fill |
| `full` | Sunglow fill + 1.5px Jet outline |
| `partial` | **Ring**: no fill (the background shows through), a Sunglow ring (about 3px) and thin Jet outline (owner decision 2026-11-11: no pale-blue fill). Must stay distinguishable from `full` and `none` at 12 px and in greyscale (decision: ring, not hatching) |
| `none` | pale blue, no outline |
| selected item | With no search or filter active: the item’s dots stay Electric Blue and every other dot dims to the `none` look. The clicked dot gets the black ring (as on hover). With a search or filter active: dots keep their match state and the item’s other dots get a thin ring. Tooltip state line: Selected / Linked (same item) / Not linked, or the match status (owner decision 2026-11-11) |
| hovered/focused | 2px Jet outline plus tooltip |

- Yellow means "matches current search or filter" and nothing else.
- Norm tags: **DO** = outlined tag; **DON'T** = filled Jet tag. Prohibitive-norm groups also get a dark top edge. Never encoded by color alone.
- Type badges in the panel: filled Electric Blue, white text (Legislation, Policies, Institutions, Partnerships).
- Typography: Roboto Slab Bold 700 for title and H1; Roboto Light 300 for subtitles, H2 and body. Self-host woff2; `font-display: swap`; real fallback stacks (`Georgia, serif` / `system-ui, sans-serif`). Dark text on yellow. Body text must pass WCAG AA contrast (Light 300 at small sizes needs checking; if it fails, raise weight or size for UI text and record it in DECISIONS.md).
- Dot diameter: about 16 to 20 px desktop, 12 to 14 px tablet; gap about 4 px. Dot size is a token.
- Support light mode only in v1 (the brand is white-background). Respect `prefers-reduced-motion` (no animated transitions when set).

## 7. Layout and components

Desktop wireframe layout: header; left column (about 300 px); main area; right panel (about 330 px) when something is selected.

- **Header**: "norms tracker" (Roboto Slab Bold, Electric Blue), tabs Explore / Methodology, links "Read the report" and "Download data" (to the methodology download section).
- **Left column**: intro text (`copy.json`, placeholder for now), "Explore by" toggle (Topic | Job), search input with helper line, dropdown filters (Norm, Norm type = All/Do/Don't, Topic, Job category, Type), legend, "One dot = one link between a norm and an item".
- **Opening** (state S0): the two question cards ("How do the UN norms deal with specific issues?" → Start from topics; "How are the UN norms relevant for my job?" → Start from job categories), "You can switch at any time". The faded topic grid is visible behind/beside them (see wireframe 1).
- **JobPicker** (visible when Explore by = Job): six chips, each showing primary and primary+secondary counts (e.g. "Diplomat 30 · 93"). "Not specified" is shown as a lighter chip with a note: no job category in the source (Norm E). Single select; selecting sets the `job` criterion. Clearing returns to the neutral grid.
- **DotGrid**: blocks by primary topic (title, total count, norm groups). Each norm group: letter, DO/DON'T tag, short norm title (two lines max), dots. Clicking a block focuses it (**BlockFocus**, below).
- **BlockFocus** (drill-down, interpretation of "norm › type › item"): block expands to full main width; norm groups, each split by type; each type lists its items as rows (name, link count in this norm). Breadcrumb: `All topics › Incident response › Norm B › Legislation`. Clicking an item selects it (opens the panel). Escape or breadcrumb goes up one level.
- **Matrix** ("Norms by topic" / "Norms by job category" below the grid): 11 norm rows × topic or job columns, row label has DO/DON'T tag and truncated title with full title in a tooltip; clicking a cell sets `norm` plus column criterion; clicking again clears.
- **DetailPanel** (single item): close button; type badge; full name; "N links across M of the 11 norms"; strip of 11 letters A to K (highlighted yellow when the item appears; prohibitive letters carry the dark top edge always); then the first three norms ordered by link count, ties by letter: "Norm J · DO · 6 links" plus the distinct operationalization texts (first one visible, "+n more" expands); "Show all M norms" expands the rest; then the description placeholder (from `copy.json`: "[Placeholder: short description of the item and link to the full report section]").
- **ResultList** (several items): heading "N items match '…'"; one row per item (type badge, name, "n links · Norm X, Y"); click selects one. Commission note on top when relevant.
- **Methodology tab**: section list on the left (anchor links), content in `copy.json`/markup, "To confirm" boxes (styled boxes, dashed "Draft for review" banner at top, both removable by one config flag `SHOW_DRAFT_MARKERS`), downloads (xlsx, three CSVs, CLEANING_LOG.md, clean_norms_data.R), version and contact (from `meta.json`).

## 8. States

| # | State | Trigger | What the user sees |
|---|---|---|---|
| S0 | Opening | first load, no criteria | Two question cards, faded topic grid, no matrix, no panel |
| S1 | Topic exploration | card 1, or Explore by = Topic | Full-colour topic grid (all `default`), matrix by topic, filters enabled |
| S2 | Job lens | card 2, or Explore by = Job | Same topic grid and JobPicker. With a job chosen: `full` and `partial` dots (5.2), matrix by job with primary and "+secondary" counts, legend explains filled vs ring |
| S3 | Search | text in search | Matching dots by status, non-matches `none`; right panel in single-item or list mode (5.3) |
| S4 | Commission search | query contains "commission" | S3 plus the Commission note in the panel; expected 4 results (4.5) |
| S5 | Selected item | click dot, row or result | DetailPanel; that entity's dots highlighted; works with any other active criteria |
| S6 | Block focus | click a block | BlockFocus with breadcrumb; panel as S5 when an item is chosen |
| S7 | Mobile | viewport below 720 px | See below |

Combined filters apply together (5.2). A "Clear all" control resets every criterion and returns to S1 (or S0 on a fresh load); the active-filter chip(s) above the grid show what is applied and each has a remove button (wireframe: yellow "Search: ENISA ×").

**Mobile (S7)**: the dot grid is replaced by a drill-down list. Topics as cards (title, count, a small proportional bar split by norm); tap → norms (letter, DO/DON'T tag, title, count) → types → items → item detail as a full-screen sheet. Filters sit in a collapsible "Filter" sheet; search stays at the top. Matches are shown with the same encodings (yellow chip for `full`, ring chip for `partial`) plus a text label ("matches"/"secondary match"). Tablet (720 to 1100 px): two columns, panel as an overlay.

## 9. Interactions and URL

- Hover or keyboard focus on a dot: tooltip with item name, type, norm label, operationalization text (truncated), topic and job.
- Click a dot: select its item (S5). Click a block title: S6.
- Search is debounced (150 ms); Enter selects the first result in list mode; Escape clears search or closes the panel.
- All criteria and the selection live in one store and in the URL query string (shareable, iframe-safe, via `history.replaceState`): `?by=job&job=Diplomat&q=NIS2&norm=C&type=Legislation&item=<entity_id>&view=methodology`. Unknown values are ignored and logged to the console; invalid values never crash the page.
- No cookies, no storage, no analytics.

## 10. Accessibility

- Keyboard: tab order header → left column → grid → panel; arrow keys move within a norm group's dots; Enter selects; Escape closes.
- The dot grid is a labelled group per block and per norm group (`role="group"`, `aria-label="Incident response, Norm B, do, 23 links"`); each dot is a focusable button with a full label. A visually hidden live region announces result counts ("22 links match NIS2 across 9 norms").
- Text alternative for the visual: a "View as table" toggle shows the norm × topic/job matrix as a real `<table>` with headers and the item list (also the screen-reader path).
- Every control has a visible label; contrast WCAG AA for text and UI components (dots in `none` state are intentionally de-emphasised but must keep a 3:1 boundary against the white background where they carry information; verify and record).
- Color is never the only signal (tags, ring vs filled, text counts).
- Test with axe (Playwright) on every state in section 8; zero serious/critical violations.

## 11. Build, test, deploy

- No build step, no bundler, no `dist/`. Vanilla JS (ES modules, relative imports), plain CSS, no framework.
- Runtime dependencies are vendored, pinned and committed with their licence files: D3 as individual modules only, as unmodified ESM sources in `vendor/<module>@<version>/` (currently `d3-dsv@3.0.1` only). Add a library only if it clearly earns its place. Fonts are committed woff2 files in `fonts/`.
- Dev-only tooling via npm (Node 20+): `@playwright/test`, `@axe-core/playwright`. `node_modules/` is gitignored; nothing from npm is served to the page.
- Local preview: `npx serve .` (any static server works; fetch does not work over `file://`). No npm install is needed to run the site.
- Scripts: `npm run test` (node:test unit tests on the pure modules), `npm run test:e2e` (Playwright + axe), `npm run check-data` (plain Node script).
- CI (`.github/workflows/deploy.yml`): install, `check-data`, unit tests, e2e (once the UI exists), then publish the committed files as they are to GitHub Pages (Actions deploy of `git archive HEAD`, minus the dev-only paths marked `export-ignore` in `.gitattributes`). Deploy fails if data validation or tests fail.
- Relative paths everywhere so it works at a subdomain root or a path. Iframe-friendly: no frame-busting, no fixed 100vh assumptions, `<meta name="viewport">` set.
- Unit tests cover: loader, validation (with deliberately broken fixtures), matching statuses (primary/secondary/none, combined criteria), search ranking (NIS2 exact-hit rule, ENISA, Commission, "cra" not matching "democracy"), aggregates against the golden values (4.5), URL parse/serialise round-trip.
- Data update flow: replace the three CSVs in `data/` (plus meta.json), run `npm run check-data`; no code change should be needed. Any new topic or job value fails the label check on purpose.

## 12. Changes to the wireframes (decisions from the planning chat)

1. The "Group by Topic | Job" switch becomes "Explore by Topic | Job" and does **not** regroup the grid. Job path = lens on the same topic grid. Reason: primary job is fully determined by primary topic in the data, so a separate job grouping would show the same blocks.
2. Secondary values are shown as **rings** (`partial`), primary as filled yellow (`full`). Applies to topic and job criteria alike. Legend gets a ring entry.
3. Artboard 3 (explore by job) is replaced by S2: topic grid + JobPicker + job matrix.
4. Methodology text to adjust: "secondary values count as matches when filtering" becomes "secondary values are shown as rings".
5. Search: exact short-name or alias hit selects that single item (5.3); other mentions are linked below.

## 13. Decisions log seed (`DECISIONS.md`)
Four types kept (institutions and partnerships split, unlike the report). Norm E job = "Not specified". Topics (7) and jobs (5 + "Not specified") are the tracker's own coding, not the report's. Dots, not squares; gridded layout. Colors signal match state only (blue default, yellow match, pale blue no match; the blue/yellow alternation in the Flourish prototype had no meaning). Prohibitive norms C, F, K confirmed against the report text (footnotes on the do/don't split). European Commission not coded per norm, as in the report; explanation shown near search and on a Commission search. Job path = lens on the topic grid; secondary = ring. Data is read-only; problems are flagged, not fixed.

## 14. Open items for the client (`OPEN-QUESTIONS.md` seed)
1. Activity count: dataset has 63 norm-specific descriptions (59 distinct wordings); the report says 55. Four descriptions recur under different wording across norms (cyber-defence posture in A and F; international-law position in A and F; criminalization in C and D; critical infrastructure designation in F and G); merging them would give 55. Is that the rule, and can an activity ID per row be added?
2. Norm A: the report lists 7 example activities but discusses the first two together; the dataset has 6. Which count is intended?
3. Topic and job coding: primary job is fully determined by primary topic on all 196 links. Who coded them and when? Were jobs derived from topics?
4. Is "Stability and security" meant as a catch-all secondary topic (65 of 118 secondary-coded links)? It makes Diplomat relevant to 93 of 196 links.
5. Norm E has no job category (intentional or missing?); links 103 and 104 have a secondary topic but no secondary job.
6. Sign-off on the cleaning steps in CLEANING_LOG.md.
7. Four types, or merge institutions and partnerships as in the report?
8. Should the single Commission link (Norm I) stay?
9. Report version the data follows; data cut-off date.
10. Licence, citation, contact; intro text and item descriptions (placeholders in the UI).

## 15. Out of scope for v1
Member State measures; the report's external pathway (capacity building); implementation quality (the tracker shows alignment, not performance); dark mode; i18n; analytics; any backend.
