# Cyber norms tracker: European Union

How the EU puts the 11 UN norms of responsible state behaviour in cyberspace into practice. One dot = one link between a norm and an EU instrument, institution or partnership.

A hand-written static site: one `index.html`, ES modules and plain CSS. No framework, no bundler, no build step. The repo root is the site root.

## What’s what

- **Published, the page:** `index.html` is the page. `src/` holds its JavaScript and CSS. `fonts/` and `vendor/` hold the self-hosted fonts and D3 modules, with their licences. `.nojekyll` tells GitHub Pages to serve files unchanged.
- **Published, the data:** `data/` holds the client’s read-only dataset, `meta.json` and the download files. `data/digilateral_norms_v0.xlsx`, the raw source file, is not published.
- **Dev-only, in git:**
  - `tests/`: unit tests, and later browser and accessibility tests. `scripts/check-data.js` validates `data/`.
  - `package.json`, `package-lock.json` and `playwright.config.js` set up the test tools.
  - `.github/` checks and deploys on every push to `main`. `.gitattributes` lists what stays off the site; `.gitignore` lists what stays out of git.
  - `CLAUDE.md` (working rules), `docs/BUILD_SPEC.md` (the spec), `DECISIONS.md`, `OPEN-QUESTIONS.md` and this README.
  - `wireframes/`: the layout reference.
- **Local only, not in git:** `files/` (brand guide, report PDF, raw files), `Claude/` (working copies), `node_modules/` (test tools).

The site needs no `npm install` to run. `node_modules/` exists only for the tests.

## Run locally

```
npx serve .                 # then open the URL it prints
```

Any static server works. Opening `index.html` straight from disk does not work, because browsers block `fetch` over `file://`.

## Check and test

```
npm install                 # once; test tools only
npm run check-data          # validate data/; exits 1 on any problem
npm test                    # unit tests (node:test)
npm run test:e2e            # Playwright + axe (first run: npx playwright install chromium)
```

## Update the data

Replace `data/norms.csv`, `entities.csv`, `links.csv` (and `meta.json`), then run `npm run check-data`. No code change should be needed. A new topic, job or type value fails the check on purpose; add its label in `src/config.js`.

## Deploy

GitHub Pages via `.github/workflows/deploy.yml` (Settings → Pages → Source: **GitHub Actions**). On every push to `main` it runs the data check and the tests, then publishes the committed files minus the dev-only paths. For a custom subdomain, add a `CNAME` file at the root.
