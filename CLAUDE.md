# CLAUDE.md: norms tracker

Stand-alone interactive page showing how the EU puts the 11 UN cyber norms into practice. One dot = one link between a norm and an EU instrument, institution or partnership. Plain static site (hand-written `index.html`, ES modules, vanilla JS, vendored D3 modules), published on GitHub Pages on a subdomain and embeddable as a full-window iframe. Branding: digilateral.

Read `docs/BUILD_SPEC.md` before building anything. It holds the structure, states, matching and layout logic, motion rules and golden test values. Wireframes: view 1 https://claude.ai/artifact/MwbtgrVPfYj34cKESHhaEC, view 2 https://claude.ai/artifact/AdtMi4HqqEUPy1n3Ctm8af (the spec overrides them where it says so).

There are two views over the same data and logic: **view 1** (`?view=1`, fixed topic blocks, non-matching dots fade) and **view 2** (`?view=2`, adaptive: dots enter and leave, grouping follows what is chosen, small sets become cards). Both stay available so the client can compare. Do not build two apps: one keyed renderer, two layout strategies.

## Hard rules

1. **Data is read-only.** `data/norms.csv`, `entities.csv`, `links.csv` are the client's dataset and the source of truth. Never edit, merge, "fix", reassign or add rows, and never write to them from scripts. If something looks wrong, record it in `OPEN-QUESTIONS.md` and keep the data as it is. No code that silently repairs data. Misspelled aliases and the like stay as supplied.
2. **No invented data.** Counts, labels and mappings come from the data, `src/config.js` or `src/content/copy.json`. Never type a count into the UI. Flag uncertainty instead of guessing.
3. **Validation fails loudly.** An unknown topic, job, type or broken reference must fail `check-data` and CI and show a visible banner in production. Do not default it away.
4. **Keep it a plain static site.** No bundler, framework, build step or generated output. Do not add any tool, library or dependency (runtime or dev) without asking me first; if you think one is needed, say why and wait. `node_modules` is for tests only; the site must work with no `npm install`.
5. **No third-party requests.** Fonts and D3 are self-hosted (`fonts/`, `vendor/`, pinned and unmodified, with licences). No CDN, analytics, cookies or storage.
6. **Do/don't is never carried by color alone.** DO = outlined tag; DON'T = filled Jet tag plus a dark top edge on the group. Prohibitive norms: C, F, K.
7. **Yellow means "matches the current search or filter", nothing else.** Primary match = filled yellow dot, secondary match = ring, default = Electric Blue, non-match = pale blue (shown only in view 1 or with "Show non-matching dots").
8. **Placeholders stay visible.** Text in [brackets] and "To confirm" boxes are for the client to replace; do not invent copy to fill them. `data/meta.json` keeps its null placeholders until the client fills it in.
9. **Motion respects the user.** `prefers-reduced-motion` means an instant swap. Animations never block interaction and never carry meaning that is not also in text. Keep the total under about half a second.

## Brand

Jet `#333333`, Electric Blue `#0033FF`, White, Sunglow `#FFCC33`; secondary Light sea green `#03A6A6`, Red `#F51B1B` (sparingly, never for data encoding). Roboto Slab Bold 700 for title and headings, Roboto Light 300 for body. Dark text on yellow. WCAG AA contrast, keyboard navigable, text alternative for the dot grid. Typographic apostrophes and quotation marks in visible text (’ “ ”).

## Commands

```
npx serve .          # preview locally (fetch does not work over file://)
npm test             # unit tests (node:test)
npm run test:e2e     # Playwright + axe (dev only)
npm run check-data   # validate data/ (also run in CI)
```

If a command here differs from `package.json`, `package.json` wins; fix this section.

## Conventions

- Vanilla JS, ES modules. D3 only as the vendored modules.
- Matching, search, grouping and totals are pure functions in `src/logic/`; UI code only renders state. Every rule in the spec's section 5 has a unit test, and the golden values (spec 4.5) are tested against the real data.
- One store (`src/logic/state.js`), mirrored in the URL query string (`view`, `item`, `q`, `topic`, `job`, `norm`, `type`, `sec`, `non`, ...). Unknown values are ignored and logged.
- Presentation choices (short labels, order, colors, card threshold, durations) go in `src/config.js`; copy goes in `src/content/copy.json`. Neither is written back to data.
- Relative paths everywhere, so the site works at any subdomain or path.
- Data updates need no code change: replace the CSVs, run `check-data`.

## Definition of done for any change

Unit tests pass, `check-data` passes, golden values still hold, axe shows no serious or critical issues on the states in spec section 8 (both views), and `DECISIONS.md` / `OPEN-QUESTIONS.md` are updated if a decision was made or a question arose. When your repo differs from the spec (paths, commands, structure), record it in `DECISIONS.md`.

## Working split

Claude chat: concept, data model, interaction design, copy, wireframes, review. Claude Code: repo, build, tests, deployment. Report back before starting a new large piece of work.
