# Norms tracker: build spec (revision 2)

Hand-off document for Claude Code. Read `CLAUDE.md` first (rules), then this file.

**Status.** The foundation (static site, data layer, `check-data`, matching logic, unit tests, deploy workflow) and the first UI (view 1, "fixed") are built. This revision adds **view 2, "adaptive"**: a second renderer mode over the same logic, where dots enter and leave and the layout follows what the user has chosen. Sections marked **[v2]** are new. Everything else is unchanged from revision 1 except where the repo already differs (static stack, `data/` path): where this file and the repo disagree about file locations or commands, the repo wins; record the difference in `DECISIONS.md` and fix this file.

**Wireframes**
- View 1 (fixed topic blocks, fading): https://claude.ai/artifact/MwbtgrVPfYj34cKESHhaEC
- View 2 (adaptive, animated): https://claude.ai/artifact/AdtMi4HqqEUPy1n3Ctm8af (6 artboards: all dots, combobox, topic chosen, item + topic chosen, one item chosen, transitions and grouping rule). Dots, counts and texts in the wireframes are real data. Treat them as the layout spec; this document overrides them where it says so.

## 1. What this is

A stand-alone static page showing how the EU puts the 11 UN norms of responsible state behavior in cyberspace into practice. One dot = one link between a norm and an EU instrument, institution or partnership. Based on the Interface study "A UN Effect? How the EU Implements the Norms of Responsible State Behavior in Cyberspace" (Pawlak, Rupp, 15 July 2026).

Audiences: (1) policy professionals who want to see where they fit, (2) readers who want to know how a specific instrument (e.g. NIS2) matters.

Branding: digilateral visual guide v1.2. Hosted on GitHub Pages (subdomain), also usable as a full-window iframe.

## 2. Sources of truth

| What | Where | Rule |
|---|---|---|
| Data | `data/norms.csv`, `entities.csv`, `links.csv` | **Read-only.** The client's dataset is the truth. Never edit, "fix", merge, reassign or add rows. Report problems; do not patch them. |
| Data provenance and downloads | `data/CLEANING_LOG.md`, `data/clean_norms_data.R`, `data/norms_tracker_data_v1.xlsx` | Shipped untouched. |
| UI copy | `src/content/copy.json` | Intro text, placeholders, explanations. Placeholders stay visibly marked. |
| UI labels (short names, ordering, colors) | `src/config.js` | Presentation only. Never written back to data. |
| Brand | `files/visual guide_v1.2.pdf` (reference only, not committed) | Colors and fonts are in `CLAUDE.md`. |

Counts in the UI are always computed from the data. Expected counts (tests only): 196 links, 11 norms, 91 items; types Legislation 64, Partnerships 46, Policies 43, Institutions 43 (per link).

## 3. Repo structure (static site, no build step)

The repo layout is as built; this is the shape to keep. Do not add a bundler.

```
index.html                  # entry; loads src/main.js as an ES module
CLAUDE.md  README.md  DECISIONS.md  OPEN-QUESTIONS.md
data/                       # READ-ONLY CSVs + downloads + meta.json
fonts/                      # self-hosted woff2 (Roboto 300, Roboto Slab 700) + licences
vendor/                     # pinned, unmodified D3 modules + licences (d3-dsv only; d3-selection was removed, see DECISIONS.md)
src/
  main.js  config.js
  content/copy.json
  data/    load.js validate.js model.js
  logic/   match.js search.js aggregate.js state.js
           view.js                # derive(): screen state from (model, state); count line
           layout-fixed.js        # view 1 layout (existing behavior)
           layout-adaptive.js     # [v2] adaptive grouping and card mode
  ui/      app, header, left-panel (opening, search), combobox [v2], job-picker,
           dot-grid (keyed renderer), dot, cards [v2], motion [v2], block-focus,
           matrix, detail-panel (item, result list, Commission note), link-table,
           methodology, legend, mobile-list, tooltip, dom
  styles/  tokens.css base.css components.css
tests/     unit (node:test) and e2e (Playwright + axe, dev only)
scripts/   check-data.js
docs/      BUILD_SPEC.md (this file)
.github/workflows/deploy.yml
```

Dev-only items (tests, scripts, `Claude/`, `wireframes/`, extra xlsx files) must not be served on the published site.

## 4. Data layer

### 4.1 Files and loading
- Fetch `data/norms.csv`, `entities.csv`, `links.csv` at runtime by relative URL; parse with the vendored `d3-dsv`. Empty string = absent value (do not turn it into something that changes counts). Loaded rows are frozen.
- `data/meta.json` (metadata only, not part of the client's dataset): `{ "version": null, "date": null, "source_report_version": null, "licence": null, "citation": null, "contact": null }`. The client fills it in. The UI shows `[DATE]`, `[CONTACT]` etc. as visible placeholders while `null`.
- No third-party requests anywhere. Fonts and libraries are self-hosted.

### 4.2 Derived model (built once, immutable)
`norms`, `entities`, `links` (with refs to norm and entity), indexes by norm, entity, primary topic, primary job; distinct topic and job values (including "Not specified"); per-entity per-norm summaries.

### 4.3 Validation (fail loudly, never fix)
Every link has a valid norm and entity; `orientation` ∈ {positive, prohibitive}; `type` ∈ the four types; every topic and job value has a label in `config.js`; `link_id` unique. Dev and CI fail on any problem; production shows a visible banner and renders what it can.

### 4.4 `config.js`
Short labels and order for topics and jobs, block order and colors. Topic short labels: Incident response · Critical infra. · Stability & security · Supply chain · Cybercrime · Vuln. disclosure · Human rights. Job short labels: Incident manager · Threat analyst · Crit. infra. actor · Diplomat · Criminal justice · Not specified. **[v2]** `CARD_THRESHOLD` (default 12) and animation durations also live here.

### 4.5 Golden values (tests)
| Query | Expected |
|---|---|
| Search `NIS2` | exact short-name hit: "NIS2 Directive (Directive 2022/2555)", 22 links, norms A B C F G H I J K; per norm A1 B3 C2 F1 G4 H1 I3 J5 K2. One other item names NIS2 (Technical Implementation Guidance on Commission Implementing Regulation 2024/2690, 2 links) |
| Search `ENISA` | one item, 18 links, norms A B C G H I J; per norm A2 B2 C1 G3 H1 I3 J6 |
| Search `Commission` | 4 items: European Commission (Institutions, Norm I, 1 link); Commission Implementing Regulation amending Implementing Regulation 2015/1998… (Legislation, G, 1); Commission Recommendation on guidelines on the export of cyber-surveillance items… (Policies, E, 1); Technical Implementation Guidance on Commission Implementing Regulation 2024/2690… (Policies, I and J, 2). Commission note shown |
| Topic blocks (primary) | Incident response 54, Critical infrastructure 37, Stability and security 30, Supply chain 22, Cybercrime 20, Vulnerability disclosure 18, Human rights 15 |
| Job lens, primary / primary + secondary | Incident manager 54/89, Threat analyst 40/40, Critical infrastructure actor 37/49, Diplomat 30/93, Criminal justice 20/26, Not specified 15/15 |
| Prohibitive norms | C, F, K (36 of 196 links) |
| **[v2]** Norm totals | A 28, B 27, C 17, D 17, E 15, F 14, G 23, H 10, I 22, J 18, K 5 (sum 196) |
| **[v2]** Topic = Stability and security, secondary included | 95 links (30 primary, 65 secondary). By norm, primary + secondary: A 24+4, B 4+5, C 2+15, D 0+4, E 0+2, F 0+12, G 0+15, H 0+8. Grouped by norm; no group for I, J, K |
| **[v2]** Same, secondary excluded | 30 links: A 24, B 4, C 2 |
| **[v2]** Item = EEAS (European External Action Service (EEAS), Institutions) | 8 links; norms A3 B2 C1 E1 F1 |
| **[v2]** EEAS + Stability and security, secondary included | 8 links (6 primary: A3 B2 C1; 2 secondary: E1 F1). Card mode (8 ≤ 12). Group headers "n of N" with N = Norm links in the topic: A 3 of 28, B 2 of 9, C 1 of 17, E 1 of 2, F 1 of 12 |
| **[v2]** EEAS + Stability, secondary excluded | 6 links: A3 B2 C1 |
| **[v2]** Item = ENISA only | 18 links, dot mode (18 > 12). Group headers: A 2 of 28, B 2 of 27, C 1 of 17, G 3 of 23, H 1 of 10, I 3 of 22, J 6 of 18 |

## 5. Matching and layout logic (pure functions, fully unit-tested)

### 5.1 Criteria
State holds optional criteria: `q` (text), `item` (a selected entity id), `norm`, `orientation`, `type`, `topic`, `job`. The job lens and the "Job category" dropdown are the same `job` criterion. Matrix cell click sets `norm` plus `topic` (topic mode) or `job` (job mode).
**[v2]** `item` (a chosen entity) and `q` (text search) are distinct: picking a suggestion in the combobox sets `item`; typing and pressing Enter with no suggestion highlighted sets `q`.

### 5.2 Per-link status
For each link compute `status`:
- `default`: no criteria active
- `full`: all active criteria satisfied, every topic/job criterion at **primary** level
- `partial`: all active criteria satisfied, at least one topic/job criterion satisfied only through the **secondary** value
- `none`: any active criterion not satisfied

**[v2]** `includeSecondary` (default true): when false, a `partial` link is treated as `none`.

### 5.3 Search
Searches entity `name`, `short_name`, `aliases` (split on `;`). Case- and diacritics-insensitive. A query token matches at the **start of a word** (`cra` must not hit "democracy"). All tokens must match.
1. If the normalized query equals an entity's `short_name` or an alias exactly → single-item mode on that entity; its dots are highlighted, other items that merely contain the word are listed as "N other item(s) mention '…'".
2. Otherwise all word-matching entities → exactly 1: single-item mode; 2 or more: list mode (all their dots highlighted); 0: empty state ("No item matches '…'. Try a short name such as NIS2 or ENISA.").
3. If the query contains the word "commission", show the Commission note above the result list. The helper line under the search box ("The European Commission is not coded per norm. Why?") is always visible.
4. Results are listed alphabetically. If two items share an exact name, list mode is used. A query matching two short names (for example "CSA") shows list mode and selects nothing.

### 5.4 Aggregations
Block count = links by `topic_primary`. Matrix cell = links for (norm, column value) at primary level; in job mode also the secondary count as a lighter "+n". Panel: links and distinct norms per entity; per-norm link counts; distinct operationalizations per norm. A cell is "hit" when at least one of its links is `full` or `partial`.

### 5.5 [v2] Adaptive grouping rule
`layout-adaptive.js` exposes `adaptiveLayout(links, criteria, options)` returning `{ mode: 'dots' | 'cards', groupBy, groups: [...] }`. Only links with status `full` or `partial` are laid out (unless `showNonMatching`, 5.8). The grouping dimension is the first of Topic → Norm → Type that is **not pinned** by a criterion:

| What is chosen | Dots are grouped by |
|---|---|
| Nothing, or only type or norm type | Topic (as view 1, all dots) |
| A topic or a job | Norm |
| A topic (or job) and a norm | Type |
| One item (alone or combined) | Norm; topic and job appear on each card or in the tooltip |

Rules:
- A "job" criterion pins the topic dimension (the grid stays topic-based; see the decision "job path = lens").
- If a norm and an item are both chosen, group by Type; if everything is pinned (topic, norm, type), a single group is shown.
- Groups with no links are not drawn. Group order: norms by letter; topics in `config.js` order; types Legislation, Policies, Institutions, Partnerships.
- Within a group dots are ordered: `full` before `partial`, then type, then entity name.

### 5.6 [v2] Ghost totals
Each group header shows `n` (the group's visible links) and, when at least one criterion is active, `n of N`, where N = the number of links that group would hold **if the item and text criteria were ignored** (other criteria such as topic still apply). Examples: EEAS in Stability, Norm A: "3 of 28"; ENISA alone, Norm J: "6 of 18". When secondary matches are visible, the header of a topic-pinned view reads `primary + secondary` ("24 +4"). A count line above the view reads "k of 196 links" (and "p primary, s secondary" when secondary matches are shown).

### 5.7 [v2] Card mode
`mode = 'cards'` when the number of visible links is ≤ `CARD_THRESHOLD` (config, default 12, tune by eye). In card mode each link is a card: status dot, label ("Primary topic match" / "Secondary topic match", only when a topic or job criterion is active), the operationalization text in full, and chips: primary topic, secondary topic (if any), primary job, secondary job (if any). Partial cards use a dashed border. Above the threshold the same links are dots; hover or focus shows a tooltip with item name, type, norm, text and topic/job. When the item panel is open it stays the place for per-item totals.

### 5.8 [v2] "Show non-matching dots"
Checkbox in the left column, default off in view 2. When on, nothing leaves: the view uses the fixed layout of view 1 (topic blocks, same positions as the unfiltered state) with `none` dots faded. It is the escape hatch for readers who want context. In view 1 this checkbox does not exist (view 1 always shows all dots).

### 5.9 [v2] Combobox
One control replaces the search box: "Find an item". Suggestions come from entities, matched with the 5.3 word-prefix rule (name, short name, aliases), grouped by type (Legislation, Policies, Institutions, Partnerships) with a link count per row, and narrowed by the Type dropdown. The last row is "Show all N matches for '…' as a list". Choosing a suggestion sets `item` and shows a chip ("Item: EEAS", using the short name if there is one). Enter with nothing highlighted applies the text as `q`. With an empty query nothing is listed (type to search) unless the user presses ArrowDown, which opens the full grouped list (91 items, scrollable). ARIA: combobox pattern with a listbox popup and `aria-activedescendant`; group labels are `role="presentation"` headings.

## 6. Visual encoding

Colors: Jet `#333333`, Electric Blue `#0033FF`, White, Sunglow `#FFCC33`; secondary Light sea green `#03A6A6`, Red `#F51B1B` (sparingly, never for data). Pale-blue "no match" is a tint of Electric Blue (about `#B8C2FF`).

| Dot state | Encoding |
|---|---|
| `default` | Electric Blue fill |
| `full` | Sunglow fill + Jet outline |
| `partial` | **Ring**: pale-blue fill, Sunglow ring (about a sixth of the diameter), thin Jet outline. Distinguishable from `full` and `none` at 12 px and in greyscale |
| `none` | pale blue, no outline (only drawn in view 1 or when "Show non-matching dots" is on) |
| hover/focus | 2 px Jet outline plus tooltip |

- Yellow means "matches current search or filter" and nothing else.
- **DO** tag: outlined. **DON'T** tag: filled Jet, plus a dark top edge on prohibitive groups. Never carried by color alone.
- Type badges: filled Electric Blue, white text. Chips in cards: tinted background, Roboto 300, no color meaning.
- Typography: Roboto Slab Bold 700 for title and H1/H2, Roboto Light 300 for body. Small UI labels may use weight 400 if 300 fails AA contrast (record in `DECISIONS.md`). Self-hosted woff2.
- Light mode only. Respect `prefers-reduced-motion`.

## 7. Layout and components

Desktop: header; left column (about 300 px); main area; right panel (about 340 px) when an item is selected.
- **Header**: "norms tracker", tabs Explore / Methodology, links "Read the report" and "Download data".
- **Left column**: intro text, "Explore by" toggle (Topic | Job), **[v2] combobox (5.9)**, dropdown filters (Norm, Norm type, Topic, Job category, Type), **[v2] checkboxes "Include secondary matches" (default on) and "Show non-matching dots" (default off, view 2 only)**, legend (entries depend on what is active: filled yellow = matches, ring = secondary match, blue = no filter, pale = non-match when shown, DO/DON'T tags), "One dot = one link between a norm and an item."
- **Opening** (S0), **JobPicker**, **Matrix**, **DetailPanel**, **ResultList**, **CommissionNote**, **Methodology tab**: as in revision 1 and the view 1 wireframes. The matrix stays as the overview in both views; **[v2]** in view 2 cells outside the current selection grey out (greyed text must still pass contrast) and cells containing matches are yellow.
- **Top bar [v2]**: active-filter chips (yellow, with remove buttons, e.g. "Item: EEAS", "Topic: Stability and security"), "Clear all", then the count line (5.6).
- **DotGrid (both views)**: one keyed renderer (key = `link_id`) with two layout strategies: `layout-fixed` (view 1) and `layout-adaptive` (view 2). Do not build two apps.
- **Cards [v2]**: 5.7. Cards sit under their group header in a wrapping grid (two columns at desktop width).
- **BlockFocus**: stays in view 1. In view 2 it is not needed: card mode replaces drill-down.

## 8. Views and states

Selected by `?view=1` (fixed) or `?view=2` (adaptive, the default since 2026-11-12). Both share the data layer, logic, panel, matrix, filters and methodology. Both are published on the same site so the client can compare.

**View 1 states** (as revision 1): S0 opening, S1 topic exploration, S2 job lens, S3 search, S4 Commission search, S5 selected item, S6 block focus, S7 mobile.

**View 2 states [v2]** (wireframe boards 1 to 6):

| # | State | What the user sees |
|---|---|---|
| V1 | All dots | 196 dots in topic blocks, new left column, no chips |
| V2 | Combobox open | suggestions grouped by type with link counts, "Show all N matches" row; dots unchanged |
| V3 | Topic chosen | non-matches leave; survivors regroup by norm (primary filled, secondary rings); count line "95 of 196 links"; matrix columns grey out except the chosen topic |
| V4 | Item + topic chosen | EEAS in Stability: 8 links as cards grouped by norm, headers "3 of 28" etc.; item panel open |
| V5 | One item chosen | ENISA: 18 dots grouped by norm, tooltip on hover, item panel open |
| V6 | Commission search | list mode with the Commission note; the four items' dots highlighted |
| V7 | "Show non-matching dots" on | v1 fixed layout with faded non-matches |
| V8 | Mobile | the drill-down list (as view 1) using the adaptive grouping, cards for small sets, no choreography beyond a 150 ms fade |

Combined criteria apply together (5.2). "Clear all" returns to V1 (or S0 on a fresh load).

## 9. Interactions and URL

- Hover or focus on a dot: tooltip (item name, type, norm label, text, topic, job). Click a dot or card: select its item. Click a group header in view 1: block focus.
- Search is debounced (150 ms); Escape closes the combobox, then clears the text, then closes the panel.
- All criteria and the selection live in one store and in the URL query string (shareable, iframe-safe, `history.replaceState`): `?view=2&by=job&job=Diplomat&q=NIS2&item=<entity_id>&norm=C&type=Legislation&topic=...&sec=0&non=1`. `sec=0` means secondary matches excluded, `non=1` means non-matching dots shown. View 2 is the default and is left out of the URL; the Methodology tab is `tab=methodology` (see `DECISIONS.md`). Unknown values are ignored and logged; invalid values never crash the page.
- No cookies, no storage, no analytics.

## 10. Accessibility

- Keyboard: tab order header → left column → grid → panel; arrow keys move within a group's dots or cards; Enter selects; Escape closes.
- Groups are labelled (`role="group"`, `aria-label="Incident response, Norm B, do, 23 links"`); each dot is a focusable button with a full label; each card is an `article` with its status in text.
- **[v2]** A visually hidden live region announces the result after every change ("8 of 196 links match: item EEAS, topic Stability and security"). If the focused dot or card leaves, focus moves to its group header; if its group leaves, to the grid's heading.
- "View as table" toggle shows the matrix as a real `<table>` and the visible links as a list (also the screen-reader path).
- Every control has a visible label; WCAG AA for text and UI components. Dots in `none` state are intentionally de-emphasised; verify and record. Color is never the only signal (tags, ring vs filled, text counts, "Primary/Secondary topic match" labels on cards).
- axe (Playwright) on every state in section 8: zero serious or critical violations.

## 11. [v2] Motion

- Every dot is keyed by `link_id`. When criteria change: dots that stay **move** to their new position; dots that leave **shrink and fade**; dots that enter **grow in**. When the mode changes from dots to cards (or back), dots expand into cards or cards collapse into dots at the same position.
- Sequence, about half a second in total: leave 0 to 200 ms, regroup and move 200 to 600 ms, cards expand or enter 500 to 800 ms (tune by eye; keep the total short). Ease-out.
- Implementation: no new dependency by default. Use FLIP (first, last, invert, play) with the Web Animations API or CSS transitions on transform and opacity. If that proves impractical, ask before vendoring `d3-transition` (it pulls in `d3-timer`, `d3-interpolate`, `d3-ease`, `d3-dispatch`, `d3-color`); record the decision either way.
- `prefers-reduced-motion: reduce` → instant swap, no animation. Very large moves (more than about 150 dots) may fall back to a 150 ms cross-fade for performance; measure before deciding.
- Never block interaction during animation: a new selection cancels the running one and animates from the current state.

## 12. Build, test, deploy

- Plain static site: ES modules, no bundler, no `dist/`, no framework. Preview with any static server (for example `npx serve .`); `fetch` does not work over `file://`.
- D3 is vendored (pinned, unmodified, with licences). Fonts are committed woff2. No npm package is served to the page; `node_modules` is for tests only.
- Tests: unit with `node:test` on the pure modules in `src/logic/` and `src/data/`; e2e with Playwright and axe (dev only); `check-data` is a plain Node script.
- CI workflow: `check-data`, unit tests, e2e against a local static server, then publish the committed files as they are. The build fails if data validation fails.
- **[v2]** Add unit tests for: the adaptive grouping table (5.5), ghost totals (5.6), the card threshold boundary (12 vs 13), `includeSecondary` on and off, "Show non-matching dots", combobox suggestion grouping and Type narrowing, URL round-trip for the new parameters, and every v2 golden value in 4.5. Add e2e checks for transitions (the DOM after the animation settles equals the layout the logic returned; with reduced motion the end state is immediate).
- Data update flow: replace the CSVs in `data/` (plus `meta.json`), run `check-data`; no code change needed. A new topic or job value fails the label check on purpose.

## 13. Decisions to record in `DECISIONS.md` (seeds)

Carried over: four types kept; Norm E job = "Not specified"; topics (7) and jobs (5 + "Not specified") are the tracker's own coding; dots, not squares; colors signal match state only; prohibitive norms C, F, K confirmed against the report text; European Commission not coded per norm; job path = lens on the topic grid, secondary = ring; data is read-only (problems are flagged, not fixed); static site, no Vite; vendored D3 and self-hosted fonts (no third-party requests).

New in this revision:
- View 2 is a second layout strategy and renderer mode, not a second app. View 1 stays available (`?view=1`) so the client can compare.
- The grouping dimension adapts to what is pinned (5.5); few links become cards (5.7); the matrix stays as the overview.
- "Item" is chosen with a combobox grouped by type; text search remains as `q`.
- Secondary matches are shown as rings and can be switched off ("Include secondary matches", default on).
- "Show non-matching dots" falls back to view 1's fixed layout with faded non-matches.
- Motion: key by `link_id`, about half a second, FLIP without new dependencies, reduced motion = instant.
- Ghost totals ("n of N") use N = group size with item and text criteria ignored.

## 14. Open items for the client (`OPEN-QUESTIONS.md`)

1. Activity count: 63 norm-specific descriptions (59 distinct wordings) vs 55 activities in the report. Four descriptions recur under different wording across norms (cyber-defence posture in A and F; international-law position in A and F; criminalization in C and D; critical infrastructure designation in F and G); merging them gives 55. Is that the rule? Can an activity ID per row be added?
2. Norm A: the report lists 7 example activities but discusses the first two together; the data has 6.
3. Topic and job coding: primary job is fully determined by primary topic on all 196 links. Who coded them and when? Were jobs derived from topics?
4. Is "Stability and security" a catch-all secondary topic (65 of 118 secondary-coded links)? It makes Diplomat relevant to 93 of 196 links.
5. Norm E has no job category (intentional or missing?); links 103 and 104 have a secondary topic but no secondary job.
6. Sign-off on the cleaning steps in CLEANING_LOG.md. Misspelled aliases (for example "EU-OSCE cooperaiton") remain in the data as supplied.
7. Four types, or merge institutions and partnerships as in the report?
8. Should the single Commission link (Norm I) stay?
9. Report version the data follows; data cut-off date.
10. Licence, citation, contact; intro text and item descriptions (placeholders). Who fills in `meta.json`?
11. Two items have short names "CSA (Solidarity)" and "CSA (Certification)": a search for "CSA" shows both in a list. Fine as is?

## 15. Out of scope
Member State measures; the report's external pathway (capacity building); implementation quality (the tracker shows alignment, not performance); dark mode; i18n; analytics; any backend.
