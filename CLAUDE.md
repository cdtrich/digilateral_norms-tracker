# CLAUDE.md: norms tracker

Stand-alone interactive page showing how the EU puts the 11 UN cyber norms into practice. One dot = one link between a norm and an EU instrument, institution or partnership. Plain static site with no build step (`index.html`, ES modules loaded with `<script type="module">` and relative imports, plain CSS, vanilla JS, vendored D3 modules), deployed to GitHub Pages on a subdomain, also embeddable as a full-window iframe. Branding: digilateral.

Read `docs/BUILD_SPEC.md` before building anything. It holds the structure, states, matching logic and golden test values. Wireframes: https://claude.ai/artifact/MwbtgrVPfYj34cKESHhaEC (the spec overrides them where it says so).

## Hard rules

1. **Data is read-only.** `data/norms.csv`, `entities.csv`, `links.csv` are the client's dataset and the source of truth. Never edit, merge, "fix", reassign or add rows, and never write to them from scripts. If something looks wrong, record it in `OPEN-QUESTIONS.md` and keep the data as it is. Do not add code that silently repairs data.
2. **No invented data.** Counts, labels and mappings come from the data or from `src/config.js` / `src/content/copy.json`. Never type a count into the UI. Flag uncertainty instead of guessing.
3. **Validation fails loudly.** An unknown topic, job, type or broken reference must fail `npm run check-data` and CI, and show a visible banner in production. Do not default it away.
4. **No third-party requests.** Fonts (`fonts/`) and dependencies (`vendor/`, pinned, with licence files) are self-hosted and committed. Nothing from npm is served to the page. No CDN, analytics, cookies or storage.
5. **Do/don't is never carried by color alone.** DO = outlined tag, DON'T = filled Jet tag plus a dark top edge on the group. Prohibitive norms: C, F, K.
6. **Yellow means "matches the current search or filter", nothing else.** Primary match = filled yellow dot, secondary match = ring, no match = pale blue, default = Electric Blue.
7. **Placeholders stay visible.** Text in [brackets] and "To confirm" boxes are for the client to replace; do not invent copy to fill them.

## Brand

Jet `#333333`, Electric Blue `#0033FF`, White, Sunglow `#FFCC33`; secondary Light sea green `#03A6A6`, Red `#F51B1B` (sparingly, never for data encoding). Roboto Slab Bold 700 for title and first-level headings, Roboto Light 300 for subtitles, second-level headings and body. Dark text on yellow. WCAG AA contrast, keyboard navigable, text alternative for the dot grid. Typographic apostrophes and quotation marks in visible text (’ “ ”).

## Commands

```
npx serve .          # local preview (any static server works; fetch fails over file://)
npm run test         # unit tests (node:test) on the pure modules
npm run test:e2e     # Playwright + axe (dev-only; first run: npx playwright install chromium)
npm run check-data   # validate data/ (also run in CI)
```

There is no build step and no `dist/`: the repo root is the site root.

## Conventions

- Vanilla JS, ES modules, no framework, no bundler. D3 as individual modules only, vendored as pinned ESM sources in `vendor/<module>@<version>/` (currently `d3-dsv`, `d3-selection`) and imported by relative path. Add a library only if it clearly earns its place, and vendor it the same way.
- Matching and search logic is pure and lives in `src/logic/`; UI code only renders state. Every rule in BUILD_SPEC section 5 has a unit test.
- One store (`src/logic/state.js`), mirrored in the URL query string. Unknown URL values are ignored and logged.
- Presentation choices (short labels, order, colors) go in `src/config.js`; copy goes in `src/content/copy.json`. Neither is written back to data.
- Relative paths everywhere (no leading `/`), so the site works at any subdomain or path.
- Data updates must need no code change: replace the CSVs, run `check-data`.

## Definition of done for any change

Tests pass, `check-data` passes, axe shows no serious/critical issues on the states listed in BUILD_SPEC section 8, golden values in section 4.5 still hold, and `DECISIONS.md` / `OPEN-QUESTIONS.md` are updated if a decision was made or a question arose.

## Working split

Claude chat: concept, data model, interaction design, copy, review. Claude Code: repo setup, build, tests, deployment. Keep `DECISIONS.md` and `OPEN-QUESTIONS.md` in the repo.
