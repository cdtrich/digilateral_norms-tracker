// States S0–S7 (BUILD_SPEC 8): behaviour, golden values in the UI, and axe (zero serious/critical).
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ready = (page) => page.waitForSelector('#app[data-state="ready"]');

async function expectNoSeriousAxe(page, label) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  const bad = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(bad.map((v) => `${label}: ${v.id} (${v.impact}) ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  const external = [];
  page.on('request', (r) => { if (!r.url().startsWith('http://localhost:8137/')) external.push(r.url()); });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.errors = errors;
  page.external = external;
});

test.afterEach(async ({ page }) => {
  expect(page.external, 'no third-party requests').toEqual([]);
  expect(page.errors, 'no page errors').toEqual([]);
});

test('S0 opening → S1 topic exploration', async ({ page }) => {
  await page.goto('./');
  await ready(page);
  await expect(page.getByRole('button', { name: /How do the UN norms deal with specific issues/ })).toBeVisible();
  await expect(page.locator('.matrix')).toHaveCount(0);
  await expect(page.locator('#panel')).toBeHidden();
  await expect(page.locator('.view-host')).toHaveAttribute('aria-hidden', '');
  await expectNoSeriousAxe(page, 'S0');

  await page.getByRole('button', { name: /Start from topics/ }).click();
  await expect(page).toHaveURL(/\?by=topic$/);
  await expect(page.getByRole('heading', { name: 'Norms by topic' })).toBeVisible();
  await expect(page.locator('button.dot[data-status="default"]')).toHaveCount(196);
  await expectNoSeriousAxe(page, 'S1');
});

test('S1 block counts are computed from the data', async ({ page }) => {
  await page.goto('./?by=topic');
  await ready(page);
  const counts = await page.locator('.block').evaluateAll((blocks) =>
    Object.fromEntries(blocks.map((b) => [b.querySelector('.block__title-btn').textContent, Number(b.querySelector('.block__count').textContent)])));
  expect(counts).toEqual({
    'Incident response and management': 54, 'Critical infrastructure': 37, 'Stability and security': 30,
    'Supply chain security': 22, 'Cybercrime and terrorism': 20, 'Vulnerability disclosure': 18, 'Human rights and privacy': 15,
  });
  // DON’T groups carry a tag with text and a dark top edge, not colour alone
  await expect(page.locator('.norm-group--dont .tag--dont').first()).toHaveText('DON’T');
});

test('S2 job lens: chips, full vs ring, matrix by job', async ({ page }) => {
  await page.goto('./');
  await ready(page);
  await page.getByRole('button', { name: /Start from job categories/ }).click();
  await expect(page.getByRole('heading', { name: 'Norms by job category' })).toBeVisible();
  const diplomat = page.locator('.job-chip', { hasText: 'Diplomat' });
  await expect(diplomat).toContainText('30 · 93');
  await diplomat.click();
  await expect(diplomat).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('button.dot[data-status="full"]')).toHaveCount(30);
  await expect(page.locator('button.dot[data-status="partial"]')).toHaveCount(63);
  await expect(page.locator('#f-job')).toHaveValue('Diplomat');
  await expect(page.locator('[aria-live]')).toContainText('93 links match');
  await expectNoSeriousAxe(page, 'S2');
});

test('S3 search NIS2: single item, 22 links across 9 norms, other mention', async ({ page }) => {
  await page.goto('./?by=topic');
  await ready(page);
  await page.getByLabel('Search items or institutions').fill('NIS2');
  await expect(page.locator('#panel-title')).toHaveText('NIS2 Directive (Directive 2022/2555)');
  await expect(page.locator('.panel__summary')).toHaveText('22 links across 9 of the 11 norms');
  await expect(page.locator('button.dot[data-status="full"]')).toHaveCount(22);
  await expect(page.locator('.norm-strip__cell.is-on')).toHaveText(['A', 'B', 'C', 'F', 'G', 'H', 'I', 'J', 'K']);
  await expect(page.locator('[aria-live]')).toHaveText('22 links match “NIS2” across 9 norms.');
  await expect(page.locator('.chip')).toContainText('Search: NIS2');
  await expect(page).toHaveURL(/q=NIS2/);
  await expectNoSeriousAxe(page, 'S3');

  await page.getByRole('button', { name: '1 other item mentions “NIS2”' }).click();
  await expect(page.locator('.result-row')).toHaveCount(2);
  await expect(page.locator('button.dot[data-status="full"]')).toHaveCount(24);
});

test('S3 search ENISA and the empty state', async ({ page }) => {
  await page.goto('./?by=topic&q=ENISA');
  await ready(page);
  await expect(page.locator('.panel__summary')).toHaveText('18 links across 7 of the 11 norms');
  await page.getByLabel('Search items or institutions').fill('zzzz');
  await expect(page.locator('#panel-title')).toHaveText('No item matches “zzzz”. Try a short name such as NIS2 or ENISA.');
  await expect(page.locator('button.dot[data-status="none"]')).toHaveCount(196);
});

test('S4 Commission search: 4 results and the note', async ({ page }) => {
  await page.goto('./?by=topic&q=Commission');
  await ready(page);
  await expect(page.locator('#panel-title')).toHaveText('4 items match “Commission”');
  await expect(page.locator('.result-row')).toHaveCount(4);
  await expect(page.locator('.panel .commission-note')).toContainText('Why so few results for the Commission?');
  await expect(page.locator('.result-row', { hasText: 'European Commission' })).toContainText('1 link · Norm I');
  await expectNoSeriousAxe(page, 'S4');
  // Enter selects the first result
  await page.getByLabel('Search items or institutions').press('Enter');
  await expect(page.locator('.panel__title')).toBeVisible();
});

test('S5 select a dot, Escape closes and returns focus', async ({ page }) => {
  await page.goto('./?by=topic');
  await ready(page);
  const dot = page.locator('button.dot').first();
  await dot.click();
  await expect(page.locator('#panel')).toBeVisible();
  await expect(page.locator('#panel-title')).toBeFocused();
  await expect(page).toHaveURL(/item=/);
  await expectNoSeriousAxe(page, 'S5');
  await page.keyboard.press('Escape');
  await expect(page.locator('#panel')).toBeHidden();
  await expect(dot).toBeFocused();
});

test('selecting with no filter dims every other dot; with a filter the item gets a ring', async ({ page }) => {
  await page.goto('./?by=topic&item=european-union-agency-for-cybersecurity-enisa');
  await ready(page);
  await expect(page.locator('button.dot[data-status="default"]')).toHaveCount(18);
  await expect(page.locator('button.dot[data-status="none"]')).toHaveCount(178);
  await expect(page.locator('button.dot.is-selected')).toHaveCount(0);
  // labels keep the real status: no “no match” without a filter
  await expect(page.locator('button.dot[data-status="none"]').first()).not.toHaveAttribute('aria-label', /No match/);
  await page.locator('#f-type').selectOption('Institutions');
  await expect(page.locator('button.dot.is-linked[data-status="full"]')).toHaveCount(18);
  await expect(page.locator('button.dot.is-selected')).toHaveCount(0); // selected from the URL: no clicked dot
});

test('clicked dot gets the black ring; tooltip last line says selected / linked / not linked', async ({ page }) => {
  await page.goto('./?by=topic');
  await ready(page);
  const tip = page.locator('.tooltip');
  const enisa = page.locator('button.dot[data-entity="european-union-agency-for-cybersecurity-enisa"]');
  const other = page.locator('button.dot:not([data-entity="european-union-agency-for-cybersecurity-enisa"])').first();

  // nothing filtered or selected: no state line, and never “null”
  await other.hover();
  await expect(tip).toBeVisible();
  await expect(tip.locator('.tooltip__status')).toHaveCount(0);
  await expect(tip).not.toContainText('null');

  await enisa.nth(3).click();
  await expect(page.locator('button.dot.is-selected')).toHaveCount(1);
  await expect(enisa.nth(3)).toHaveClass(/is-selected/);
  await expect(page.locator('button.dot.is-linked')).toHaveCount(0);
  await enisa.nth(3).hover();
  await expect(tip.locator('.tooltip__status')).toHaveText('Selected');
  await enisa.nth(0).hover();
  await expect(tip.locator('.tooltip__status')).toHaveText('Linked (same item)');
  await other.hover();
  await expect(tip.locator('.tooltip__status')).toHaveText('Not linked');
  await expect(other).toHaveAttribute('aria-label', /Not linked.$/);

  // with a filter: match status, “· selected” on the clicked dot, thin ring on the item’s other dots
  await page.locator('#f-type').selectOption('Institutions');
  await expect(enisa.nth(3)).toHaveClass(/is-selected/);
  await expect(page.locator('button.dot.is-linked')).toHaveCount(17);
  await enisa.nth(3).hover();
  await expect(tip.locator('.tooltip__status')).toHaveText('Matches · selected');
});

test('arrow keys move within a norm group', async ({ page }) => {
  await page.goto('./?by=topic');
  await ready(page);
  const group = page.locator('.norm-group').first();
  const dots = group.locator('button.dot');
  await dots.first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(dots.nth(1)).toBeFocused();
  await expect(dots.nth(1)).toHaveAttribute('tabindex', '0');
});

test('S6 block focus with breadcrumb; Escape goes up', async ({ page }) => {
  await page.goto('./?by=topic');
  await ready(page);
  await page.getByRole('button', { name: /^Incident response and management, 54 links/ }).click();
  await expect(page.locator('.block-focus__title')).toContainText('Incident response and management');
  await page.getByRole('button', { name: /^Norm B, do/ }).click();
  await page.getByRole('button', { name: /^Legislation, 9 links/ }).click();
  await expect(page.locator('.crumbs li')).toHaveText(['All topics', 'Incident response', 'Norm B', 'Legislation']);
  await expectNoSeriousAxe(page, 'S6');
  await page.locator('.item-row', { hasText: 'NIS2 Directive' }).click();
  await expect(page.locator('#panel-title')).toHaveText('NIS2 Directive (Directive 2022/2555)');
  await page.keyboard.press('Escape'); // closes panel
  await page.keyboard.press('Escape'); // up: Norm B
  await expect(page.locator('.crumbs li')).toHaveText(['All topics', 'Incident response', 'Norm B']);
});

test('matrix cell sets norm and topic, second click clears', async ({ page }) => {
  await page.goto('./?by=topic');
  await ready(page);
  const cell = page.getByRole('button', { name: /^Norm A \(do\), Stability and security: 24 links/ });
  await cell.click();
  await expect(page).toHaveURL(/norm=A&topic=Stability\+and\+security/);
  await expect(page.locator('button.dot[data-status="full"]')).toHaveCount(24);
  await page.getByRole('button', { name: /^Norm A \(do\), Stability and security: 24 links/ }).click();
  await expect(page.locator('.chip')).toHaveCount(0);
});

test('View as table is a real table with every link', async ({ page }) => {
  await page.goto('./?by=topic&table=1&q=ENISA');
  await ready(page);
  await expect(page.locator('.link-table tbody tr')).toHaveCount(196);
  await expect(page.locator('.link-table tbody tr[data-status="full"]')).toHaveCount(18);
  await expectNoSeriousAxe(page, 'table');
});

test('URL: unknown values are ignored and logged, state round-trips', async ({ page }) => {
  const warnings = [];
  page.on('console', (m) => { if (m.type() === 'warning') warnings.push(m.text()); });
  await page.goto('./?by=job&job=Astronaut&q=ENISA&bogus=1');
  await ready(page);
  await expect(page.locator('.panel__summary')).toHaveText('18 links across 7 of the 11 norms');
  expect(warnings.join('\n')).toMatch(/job="Astronaut"/);
  expect(warnings.join('\n')).toMatch(/bogus/);
  await expect(page).toHaveURL(/\?by=job&q=ENISA$/);
});

test('Clear all resets criteria and keeps the starting point', async ({ page }) => {
  await page.goto('./?by=job&job=Diplomat&q=CRA&type=Legislation');
  await ready(page);
  await page.getByRole('button', { name: 'Clear all' }).click();
  await expect(page).toHaveURL(/\?by=job$/);
  await expect(page.locator('button.dot[data-status="default"]')).toHaveCount(196);
});

test('Methodology: placeholders, computed counts, downloads', async ({ page, request }) => {
  await page.goto('./?by=topic');
  await ready(page);
  await page.getByRole('link', { name: 'Download data' }).click();
  await expect(page).toHaveURL(/view=methodology.*#download$/);
  await expect(page.locator('.meth-body')).toContainText('The tracker holds 196 links across the 11 norms and 91 items.');
  await expect(page.locator('#do-dont')).toContainText('the three prohibitive norms, C, F and K');
  await expect(page.locator('#version')).toContainText('[VERSION] · [DATE] · [CONTACT]');
  await expect(page.locator('.draft-banner')).toBeVisible();
  await expect(page.locator('body')).not.toContainText('[?]');
  for (const href of await page.locator('.downloads a').evaluateAll((as) => as.map((a) => a.getAttribute('href')))) {
    expect((await request.get(href)).status(), href).toBe(200);
  }
  await expectNoSeriousAxe(page, 'methodology');
});

test.describe('S7 mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test('drill-down list with match labels, item sheet, no horizontal scroll', async ({ page }) => {
    await page.goto('./?by=topic&job=Diplomat');
    await ready(page);
    await expect(page.locator('.dot-grid')).toHaveCount(0);
    const card = page.locator('.m-row', { hasText: 'Stability and security' });
    await expect(card).toContainText('30 matches');
    await expectNoSeriousAxe(page, 'S7 topics');
    await card.click();
    await page.locator('.m-row', { hasText: 'Interstate cooperation on security' }).click();
    await page.locator('.m-row').first().click();
    await page.locator('.m-row').first().click();
    await expect(page.locator('#panel')).toBeVisible();
    await expect(page.locator('#panel-title')).toBeFocused();
    await expectNoSeriousAxe(page, 'S7 item');
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(sw).toBeLessThanOrEqual(390);
  });
  test('filters sit behind a toggle; search stays visible', async ({ page }) => {
    await page.goto('./?by=topic');
    await ready(page);
    await expect(page.getByLabel('Search items or institutions')).toBeVisible();
    await expect(page.locator('#f-norm')).toBeHidden();
    await page.getByRole('button', { name: 'Filter' }).click();
    await expect(page.locator('#f-norm')).toBeVisible();
  });
});

test('data problems show a banner and the app still renders', async ({ page }) => {
  await page.route('**/data/links.csv', async (route) => {
    const res = await route.fetch();
    const body = (await res.text()).replace('Supply chain security', 'Quantum security');
    await route.fulfill({ response: res, body });
  });
  await page.goto('./?by=topic');
  await ready(page);
  await expect(page.locator('#data-banner')).toBeVisible();
  await expect(page.locator('#data-banner')).toContainText('Quantum security');
  await expect(page.locator('button.dot')).toHaveCount(196);
});
