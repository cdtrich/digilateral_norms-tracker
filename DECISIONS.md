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
- **D3, vendored as individual ESM modules.** `vendor/d3-dsv@3.0.1/` and `vendor/d3-selection@3.0.0/` hold the unmodified `src/` folders from the npm packages, plus their LICENSE (ISC). Both have no dependencies and import only relative files, so the same code runs in the browser and in Node (unit tests, check-data) with no import map. `d3-scale` and `d3-array` are not vendored: grouping and counting are plain JS, and the dot grid needs no scales. Add them later only if they earn their place.
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
