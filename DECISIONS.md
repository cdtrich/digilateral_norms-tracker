# Decisions

## From the planning chat (BUILD_SPEC section 13)

- Four types kept (institutions and partnerships split, unlike the report).
- Norm E job = “Not specified”.
- Topics (7) and jobs (5 + “Not specified”) are the tracker’s own coding, not the report’s.
- Dots, not squares; gridded layout.
- Colors signal match state only (blue default, yellow match, pale blue no match; the blue/yellow alternation in the Flourish prototype had no meaning).
- Prohibitive norms C, F, K confirmed against the report text (footnotes on the do/don’t split).
- European Commission not coded per norm, as in the report; explanation shown near search and on a Commission search.
- Job path = lens on the topic grid; secondary = ring.
- Data is read-only; problems are flagged, not fixed.

## Setup (2026-11-11)

- **No build step.** Plain static site: `index.html`, ES modules with relative imports, plain CSS. The repo root is the site root. Replaces the Vite/Vitest stack in the original spec (owner’s decision).
- **Folder layout kept as is.** Data stays in `data/`; `CLAUDE.md` moved to the repo root. `Claude/` stays gitignored, so the spec is committed as a copy in `docs/BUILD_SPEC.md`, which is the one to edit.
- **Downloads.** `data/CLEANING_LOG.md` is a byte-for-byte copy of `files/CLEANING_LOG.md`. `clean_norms_data.R` and `norms_tracker_data_v1.xlsx` were already in `data/`. `digilateral_norms_v0.xlsx`, `files/data.csv`, `files/data.r` and `files/digilateral_norms.xlsx` are not offered as downloads.
- **D3, vendored as individual ESM modules.** `vendor/d3-dsv@3.0.1/` holds the unmodified `src/` folder from the npm package, plus its LICENSE (ISC). It has no dependencies and import only relative files, so the same code runs in the browser and in Node (unit tests, check-data) with no import map. `d3-scale` and `d3-array` are not vendored: grouping and counting are plain JS, and the dot grid needs no scales. Add them later only if they earn their place.
- **Fonts.** From `@fontsource/roboto@5.3.0` (OFL-1.1) and `@fontsource/roboto-slab@5.3.0` (Apache-2.0): Roboto 300 and Roboto Slab 700, Latin and Latin Extended subsets only, with `unicode-range`. Licences are in `fonts/`.
- **Local preview** is `npx serve .` (also used by Playwright). No custom server script. The site needs no `npm install` to run.
- **No tool or dependency is added without the owner’s approval.** The project is a hand-written static site with no framework, bundler or generated output.
- **Unit tests** use `node --test` (Node’s default file discovery, `*.test.js`), which works the same on Node 20 and 22.
- **Deploy.** Actions workflow: `check-data` and the unit tests, then publish `git archive HEAD` to Pages. Dev-only paths (`tests/`, `scripts/`, `docs/`, `Claude/`, `wireframes/`, the Markdown docs, package and config files) and `data/digilateral_norms_v0.xlsx` (not a download) are marked `export-ignore` in `.gitattributes`, so they are not published. `.nojekyll` is committed so branch-root Pages would also serve `CLEANING_LOG.md` as is.
- **check-data** also checks that `data/meta.json` has all six keys (string or null) and that every file in `DOWNLOADS` (`src/config.js`) exists, so a broken download link fails CI.
- **Validation is stricter than the spec’s minimum** but adds no repair: duplicate `norm_id` or `entity_id`, empty ids or names, missing CSV columns, and empty `topic_primary` or `job_primary` are reported as problems. Empty `topic_secondary` or `job_secondary` is valid (absent).
- **Loaded rows are frozen** (`Object.freeze`), so no code can mutate the data by accident.

## Search details not fixed by the spec (5.3)

- List mode orders items alphabetically by full name. Enter selects the first one.
- “Exact” compares the whole normalized query to `short_name` and to each alias, not to the full name. If two or more items share an exact key, search falls back to the word-match list (no silent pick).
- The Commission rule fires when any word in the query starts with “commission” (“Commission”, “commissions”), not on “subcommission”.
- Word start means the character before the match is not a letter or digit, so “2690” matches “2024/2690” and “enisa” matches “(ENISA)”.
- Links whose primary and secondary values are the same would count once at primary level (none in the current data).

## UI (2026-11-11)

- **Selection dims, never yellows** (owner, 2026-11-11). With no search or filter, selecting an item keeps its dots Electric Blue and dims every other dot to pale blue: blue = in focus, pale = not in focus, the same reading as a search without the yellow. The clicked dot gets the black ring (as on hover). With a search or filter active, dots keep their match state, the clicked dot keeps the black ring and the item’s other dots get a thin one. The tooltip’s last line (and the dot’s label) says “Selected” / “Linked (same item)” / “Not linked” while an item is selected without filters, the match status when a filter is on (“· selected” on the clicked dot), and nothing when neither applies. Which dot was clicked is UI-only, not in the URL. The panel’s A–K letter strip highlights the item’s norms in yellow as the spec asks, with a dark border and text labels.
- **Secondary match = ring only** (owner, 2026-11-11): no pale-blue fill inside the ring; the background shows through. Same in the matrix (white cell with the ring).
- **`none` dots** keep the pale-blue fill (`#B8C2FF`, 1.7:1 on white) plus a 1px `#6A7EFF` edge (3.5:1 on white, 3.2:1 on the block background) to meet the 3:1 boundary in BUILD_SPEC 10. The spec table says “no outline”; this hairline is the smallest change that passes. Tokens in `tokens.css`.
- **Matrix cells:** pale blue = has links; yellow = at least one full match; ring (pale + yellow inset) = only secondary matches. Columns follow `TOPICS` / `JOBS` order in `config.js` (the wireframe used the masonry order).
- **Active controls are Electric Blue, not yellow** (Explore-by toggle, selected job chip). Active-filter chips above the grid are yellow, as in the wireframe.
- **Panel close:** an item opened from a result list returns to the list; closing a single search result clears the search. Escape order: dismiss a tooltip on a focused dot › clear the search box (when focused) › close the panel › go up one drill-down level › clear the search.
- **URL keys** beyond the spec’s example: `orientation`, `topic`, `block`, `bnorm`, `btype` (block drill-down), `all` (show every item that mentions the query) and `table` (View as table).
- **Typography:** only Roboto 300 and Roboto Slab 700 are shipped. Jet on white is 12.6:1, so Light 300 passes AA; small text is at least 13px. DO/DON’T tags use Roboto Slab 700.
- **Methodology copy** is transcribed from wireframe 5 into `copy.json`. Every count from the data is a `{token}` computed in `methodologyFacts` (unknown tokens render as a visible “[?]”). Counts that come from the report or the cleaning log (55 activities, 100 name variants, two re-typed links) stay as written. The only wording change is BUILD_SPEC 12.4 (“secondary values are shown as rings”).
- **Report link:** `copy.header.reportUrl` is https://www.interface-eu.org/publications/how-the-eu-implements-the-un-cyber-norms (owner, 2026-11-13). It opens in a new tab (`rel="noopener"`), so it also works when the tracker is embedded in an iframe. While the URL is null, “Read the report [link to the report]” shows as a placeholder.
- **Mobile (S7):** the topic list is ordered by link count; the matrix stays available in a horizontal scroll box.
- **Text alternative:** the matrix is always a real `<table>`; “View as table” replaces the dots with a table of all links and their match status.
- **Playwright artefacts** go to the system temp folder (`playwright.config.js`), because OneDrive locks `test-results/`.
- **`d3-selection` removed** (owner, 2026-11-11): the UI uses plain DOM code, so the vendored module was unused. `d3-dsv` is the only runtime dependency.

## View 2, adaptive (2026-11-12, BUILD_SPEC revision 2)

- **View 2 is the default** (owner, 2026-11-12). `?view=1` opens the fixed layout; `view=2` is left out of the URL. Both views share one app, one store and one keyed renderer (`src/ui/dot-grid.js`) with two layout strategies (`src/logic/layout-fixed.js`, `src/logic/layout-adaptive.js`).
- **URL keys.** `view` is now the layout (`1` | `2`). The Explore / Methodology tab moved to `tab` (`?tab=methodology`); the old `?view=methodology` is an unknown value and is ignored. New: `sec=0` (secondary matches excluded), `non=1` (show non-matching dots). Booleans are written only when they differ from the default.
- **`item` is a criterion in view 2 only.** In view 1 it stays a selection (dims the other dots, no chip), as decided on 2026-11-11. In view 2 it filters, shows a yellow “Item: …” chip (short name if there is one, as the spec says; wireframe 5 shows the full name) and drives the layout. Clicking a dot or card in view 2 chooses its item, so the view narrows to it.
- **Combobox in view 2 only.** View 1 keeps its live search box. In view 2 typing only filters the suggestions (local, so not debounced); the text becomes `q` on Enter with nothing highlighted, or through “Show all N matches … as a list” (`q` plus `all`). Suggestion groups follow the `TYPES` order in `config.js` (the spec’s order; wireframe 2 showed Institutions first). Group labels are `role="presentation"` rows inside the listbox. Escape closes the list, then clears the text (and `q`), then the app closes the panel (which clears the item in view 2).
- **A text search pins the topic dimension, like an item** (the spec’s table does not cover `q`): search results are grouped by norm and get “n of N” headers.
- **Header counts.** “n of N” appears only when an item or a text search is active, because N (the group without item and search) equals n otherwise. With a topic or job and secondary matches shown (and no item or search) the header reads “p +s”. Otherwise just n. The function is `countLabel` in `layout-adaptive.js`.
- **Card mode with topic grouping** (only norm, norm type or type chosen, 12 links or fewer): one card group per topic › norm, with the topic name above the norm header.
- **Cards name the item when no single item is chosen** (search results, filters only). The spec lists status, label, text and chips; without the item name such cards cannot be read. The card label for a job criterion reads “Primary / Secondary job match”.
- **Matrix in view 2, topic mode:** a cell is coloured only by the links its number counts (primary topic). In view 1 a cell is also lit by links whose secondary topic is that column; that stays. Cells whose links match only through a secondary topic show the ring, as in view 1 (wireframe 3 shows them grey; see OPEN-QUESTIONS 18). Cells without a match are grey (`#EDEFF4`, number in `--muted`, 6:1).
- **“Include secondary matches” applies to both views** (`sec`); “Show non-matching dots” exists in view 2 only and has no effect in view 1. “Clear all” keeps both settings, the layout, the tab and the starting point.
- **The opening question (S0) stays on a fresh load in view 2**, as BUILD_SPEC 8 says (“or S0 on a fresh load”); wireframe board 1 starts from all dots (OPEN-QUESTIONS 17).
- **Legend in view 2 follows the screen:** “No filter applied” only without criteria, the pale “No match” entry only with “Show non-matching dots” and an active filter, the ring only while secondary matches are included.
- **Motion** (BUILD_SPEC 11): FLIP with the Web Animations API, no new dependency (`d3-transition` not vendored). Durations in `config.js` `MOTION`: leave 0–160 ms, move 100–400 ms, enter 300–500 ms. Leaving elements are animated as inert, `aria-hidden` clones outside the grid, so the real DOM is already in its end state. A new change measures what is on screen, cancels the running animations and starts from there. Reduced motion means no animation. The grid exposes `data-animating` for tests. Measured in headless Chromium, the largest change (95 dots move or leave) settles in about 0.7 s, slightly over the target; the 150 ms cross-fade fallback for large moves is not implemented yet and can be added if it feels slow on real devices.
- **Focus** (BUILD_SPEC 10): group elements (`[data-gkey]`, `tabindex="-1"`) are the focus target when the focused dot or card leaves; if the group leaves too, focus goes to the count heading. A resize only rebuilds the grid when the topic-block masonry needs a different column count, so opening the panel no longer cancels an animation.
- **Mobile (V8):** the adaptive groups become rows that open in place (topic › norm › cards); small sets are cards straight away; a 150 ms fade on change. Which rows are open is UI-only (not in the URL).
- **“View as table” in view 2** lists the visible links only (all links with “Show non-matching dots”).
- **Repo vs spec (section 3):** `src/logic/view.js` holds `derive` (the screen state) and the count line; the opening, result list and Commission note live in `left-panel.js` and `detail-panel.js` as before; new UI modules are `combobox.js`, `cards.js`, `motion.js`. `vendor/` holds `d3-dsv` only.

## Title and metadata (2026-11-13)

- **Title** (owner): “Cyber norms tracker: European Union”, in `copy.title` (header, page heading for screen readers) and the `<title>` in `index.html`. The header fits on one line at desktop width and wraps cleanly on mobile.
- **`data/meta.json`** (owner): version `1.0` (first published release; the data file is `norms_tracker_data_v1.xlsx`), date `16 Nov 2026`, contact `patryk@digilateral.eu`, shown on the methodology tab as “Version 1.0 · 16 Nov 2026 · patryk@digilateral.eu”. The contact is a mailto link. `source_report_version`, `licence` and `citation` stay null (visible placeholders).
