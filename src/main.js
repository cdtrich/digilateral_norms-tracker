// Boot: load data, validate, build the model, mount the app.
// The UI is not built yet; for now this proves loading and validation in the browser.
import { fetchDataset } from './data/load.js';
import { validateDataset, summarize } from './data/validate.js';
import { buildModel } from './data/model.js';

function showBanner(messages) {
  const el = document.getElementById('data-banner');
  el.hidden = false;
  el.querySelector('ul').replaceChildren(
    ...messages.map((m) => Object.assign(document.createElement('li'), { textContent: m })),
  );
}

async function boot() {
  let raw;
  try {
    raw = await fetchDataset();
  } catch (err) {
    console.error(err);
    showBanner([err.message]);
    return;
  }
  const problems = validateDataset(raw);
  console.info('Data:', summarize(raw));
  if (problems.length) {
    console.error('Data check failed:', problems);
    showBanner(problems.map((p) => p.message));
  }
  const model = buildModel(raw); // render what we can even when validation failed
  document.getElementById('app').dataset.state = 'loaded';
  document.getElementById('app').querySelector('[data-links]').textContent = String(model.links.length);
}

boot();
