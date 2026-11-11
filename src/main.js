// Boot: load copy and data, validate, build the model, mount the app.
// Validation problems never stop the page: a visible banner lists them and the app renders what it can.
import { fetchDataset } from './data/load.js';
import { validateDataset, summarize } from './data/validate.js';
import { buildModel } from './data/model.js';
import { mountApp } from './ui/app.js';

function showBanner(title, messages) {
  const el = document.getElementById('data-banner');
  el.querySelector('strong').textContent = title;
  el.querySelector('ul').replaceChildren(...messages.map((m) => Object.assign(document.createElement('li'), { textContent: m })));
  el.hidden = false;
}

async function boot() {
  let copy;
  let raw;
  try {
    [copy, raw] = await Promise.all([
      fetch('src/content/copy.json').then((r) => { if (!r.ok) throw new Error(`Could not load src/content/copy.json (HTTP ${r.status})`); return r.json(); }),
      fetchDataset(),
    ]);
  } catch (err) {
    console.error(err);
    showBanner('The tracker could not load:', [err.message]);
    document.getElementById('app').dataset.state = 'error';
    return;
  }
  const problems = validateDataset(raw);
  console.info('Data:', summarize(raw));
  if (problems.length) {
    console.error('Data check failed:', problems);
    showBanner(copy.dataBanner, problems.map((p) => p.message));
  }
  const model = buildModel(raw);
  const root = document.getElementById('app');
  mountApp({ root, model, copy });
  root.dataset.state = 'ready';
}

boot();
