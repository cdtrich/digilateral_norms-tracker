// View 2 (default, adaptive) states V1–V8 (BUILD_SPEC 8): behaviour, golden values in the UI, axe,
// combobox keyboard pattern, and transitions (DOM after the animation = the layout the logic returns).
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ready = (page) => page.waitForSelector('#app[data-state="ready"]');
const settled = (page) => page.waitForSelector('.dot-grid[data-animating="false"]');
const EEAS = 'european-external-action-service-eeas';
const ENISA = 'european-union-agency-for-cybersecurity-enisa';
const STAB = 'topic=Stability+and+security';
const gridDots = (page, status) => page.locator(`.dot-grid button.dot${status ? `[data-status="${status}"]` : ''}`);

async function expectNoSeriousAxe(page, label) {
  const { violations } = await new AxeBuilder({ page }).exclude('.motion-ghost').analyze();
  const bad = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(bad.map((v) => `${label}: ${v.id} (${v.impact}) ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
}

/** Header count texts of the visible groups, keyed by norm letter or type. */
const groupHeaders = (page) => page.locator('.dot-grid .group-panel > [data-gkey], .dot-grid .card-group').evaluateAll((els) =>
  Object.fromEntries(els.map((e) => [e.dataset.gkey.split(':').at(-1), e.querySelector('.group-count').textContent])));

test.use({ reducedMotion: 'reduce' });

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

test('view 2 is the default; V1 all dots in topic blocks, count line, no chips', async ({ page }) => {
  await page.goto('./');
  await ready(page);
  await expect(page.locator('body')).toHaveAttribute('data-layout', 'adaptive');
  await page.getByRole('button', { name: /Start from topics/ }).click();
  await expect(page).toHaveURL(/\?by=topic$/);
  await expect(gridDots(page, 'default')).toHaveCount(196);
  await expect(page.locator('#count-heading')).toHaveText('196 links');
  await expect(page.locator('.chip')).toHaveCount(0);
  await expect(page.getByLabel('Find an item')).toBeVisible();
  await expect(page.getByLabel('Show non-matching dots')).not.toBeChecked();
  await expect(page.getByLabel('Include secondary matches')).toBeChecked();
  await expectNoSeriousAxe(page, 'V1');
});

test('V2 combobox: grouped suggestions with counts, “show all” row, keyboard pattern', async ({ page }) => {
  await page.goto('./?by=topic');
  await ready(page);
  const box = page.getByRole('combobox', { name: 'Find an item' });
  await box.fill('commission');
  const list = page.getByRole('listbox');
  await expect(list).toBeVisible();
  await expect(box).toHaveAttribute('aria-expanded', 'true');
  await expect(list.locator('.combo__group')).toHaveText(['Legislation', 'Policies', 'Institutions']);
  await expect(list.locator('.combo__option:not(.combo__all)')).toHaveCount(4);
  await expect(list.locator('.combo__all')).toHaveText('Show all 4 matches for “commission” as a list');
  await expect(list.getByRole('option', { name: /Technical Implementation Guidance/ })).toContainText('2 links');
  await expect(gridDots(page, 'default')).toHaveCount(196); // dots unchanged while typing
  await expectNoSeriousAxe(page, 'V2');

  await box.press('ArrowDown');
  const first = await box.getAttribute('aria-activedescendant');
  await expect(page.locator(`#${first}`)).toHaveAttribute('aria-selected', 'true');
  await box.press('Escape');
  await expect(list).toBeHidden();
  await box.press('Escape');
  await expect(box).toHaveValue('');

  // Type narrowing
  await page.locator('#f-type').selectOption('Policies');
  await box.fill('commission');
  await expect(list.locator('.combo__group')).toHaveText(['Policies']);
  await box.press('Escape');

  // ArrowDown on an empty box lists all 91 items
  await box.fill('');
  await page.locator('#f-type').selectOption('');
  await box.press('ArrowDown');
  await expect(list.locator('.combo__option')).toHaveCount(91);
});

test('combobox: picking sets the item chip; Enter without a highlight searches; “show all” lists', async ({ page }) => {
  await page.goto('./?by=topic');
  await ready(page);
  const box = page.getByRole('combobox', { name: 'Find an item' });
  await box.fill('EEAS');
  await page.getByRole('option', { name: /^European External Action Service \(EEAS\)/ }).click();
  await expect(page).toHaveURL(new RegExp(`item=${EEAS}`));
  await expect(page.locator('.chip')).toHaveText(['Item: EEAS×']);
  await expect(box).toHaveValue('European External Action Service (EEAS)');
  await expect(page.locator('#panel-title')).toHaveText('European External Action Service (EEAS)');

  await box.fill('commission');
  await box.press('Enter');
  await expect(page).toHaveURL(/q=commission/);
  await expect(page).not.toHaveURL(/item=/);
  await expect(page.locator('#panel-title')).toHaveText('4 items match “commission”');

  await box.fill('NIS2');
  await page.locator('.combo__all').click();
  await expect(page).toHaveURL(/q=NIS2&all=1/);
  await expect(page.locator('.result-row')).toHaveCount(2);
});

test('V3 topic chosen: 95 of 196, regrouped by norm with “p +s” headers; secondary switch', async ({ page }) => {
  await page.goto(`./?by=topic&${STAB}`);
  await ready(page);
  await expect(page.locator('#count-heading')).toHaveText('95 of 196 links');
  await expect(page.locator('.count-line__text')).toContainText('30 with this primary topic, 65 through a secondary topic');
  await expect(gridDots(page, 'full')).toHaveCount(30);
  await expect(gridDots(page, 'partial')).toHaveCount(65);
  await expect(gridDots(page, 'none')).toHaveCount(0);
  expect(await groupHeaders(page)).toEqual({ A: '24 +4', B: '4 +5', C: '2 +15', D: '0 +4', E: '0 +2', F: '0 +12', G: '0 +15', H: '0 +8' });
  await expect(page.locator('.matrix--adaptive .matrix__btn[data-hit="full"]')).toHaveCount(3);
  await expect(page.locator('[aria-live]')).toHaveText('95 of 196 links match: topic Stability and security.');
  await expectNoSeriousAxe(page, 'V3');

  await page.getByLabel('Include secondary matches').uncheck();
  await expect(page).toHaveURL(/sec=0/);
  await expect(gridDots(page)).toHaveCount(30);
  expect(await groupHeaders(page)).toEqual({ A: '24', B: '4', C: '2' });
});

test('V4 item + topic: EEAS in Stability, 8 cards with “n of N” headers, panel open', async ({ page }) => {
  await page.goto(`./?by=topic&item=${EEAS}&${STAB}`);
  await ready(page);
  await expect(page.locator('#count-heading')).toHaveText('8 of 196 links');
  await expect(page.locator('.chip')).toHaveText(['Item: EEAS×', 'Topic: Stability & security×']);
  await expect(page.locator('article.card')).toHaveCount(8);
  await expect(page.locator('article.card--partial')).toHaveCount(2);
  await expect(page.locator('article.card', { hasText: 'Secondary topic match' })).toHaveCount(2);
  expect(await groupHeaders(page)).toEqual({ A: '3 of 28', B: '2 of 9', C: '1 of 17', E: '1 of 2', F: '1 of 12' });
  await expect(page.locator('#panel-title')).toHaveText('European External Action Service (EEAS)');
  await expectNoSeriousAxe(page, 'V4');

  await page.getByLabel('Include secondary matches').uncheck();
  await expect(page.locator('article.card')).toHaveCount(6);
  expect(await groupHeaders(page)).toEqual({ A: '3 of 24', B: '2 of 4', C: '1 of 2' });
});

test('V5 one item: ENISA, 18 dots by norm, tooltip on hover', async ({ page }) => {
  await page.goto(`./?item=${ENISA}`);
  await ready(page);
  await expect(page.locator('#count-heading')).toHaveText('18 of 196 links');
  await expect(gridDots(page, 'full')).toHaveCount(18);
  await expect(page.locator('article.card')).toHaveCount(0);
  expect(await groupHeaders(page)).toEqual({ A: '2 of 28', B: '2 of 27', C: '1 of 17', G: '3 of 23', H: '1 of 10', I: '3 of 22', J: '6 of 18' });
  await gridDots(page).first().hover();
  await expect(page.locator('.tooltip')).toContainText('European Union Agency for Cybersecurity (ENISA)');
  await expect(page.locator('.panel__summary')).toHaveText('18 links across 7 of the 11 norms');
  await expectNoSeriousAxe(page, 'V5');
});

test('V6 Commission search: list mode with the note, the four items’ links shown', async ({ page }) => {
  await page.goto('./?by=topic&q=Commission');
  await ready(page);
  await expect(page.locator('#panel-title')).toHaveText('4 items match “Commission”');
  await expect(page.locator('.panel .commission-note')).toBeVisible();
  await expect(page.locator('#count-heading')).toHaveText('5 of 196 links');
  await expect(page.locator('article.card')).toHaveCount(5);
  await expect(page.locator('article.card .card__item')).toHaveCount(5); // item names on cards when no item is chosen
  await expectNoSeriousAxe(page, 'V6');
  await page.locator('article.card', { hasText: 'European Commission' }).first().click();
  await expect(page).toHaveURL(/item=european-commission/);
  await expect(page.locator('article.card')).toHaveCount(1);
});

test('V7 show non-matching dots: fixed blocks, all 196 dots, non-matches pale', async ({ page }) => {
  await page.goto(`./?by=topic&${STAB}`);
  await ready(page);
  await page.getByLabel('Show non-matching dots').check();
  await expect(page).toHaveURL(/non=1/);
  await expect(gridDots(page)).toHaveCount(196);
  await expect(gridDots(page, 'none')).toHaveCount(101);
  await expect(page.locator('.dot-grid .block')).toHaveCount(7);
  await expect(page.locator('.legend:visible')).toContainText('No match (shown because “Show non-matching dots” is on)');
  await expectNoSeriousAxe(page, 'V7');
});

test('Clear all returns to all dots and keeps the display options', async ({ page }) => {
  await page.goto(`./?by=topic&item=${EEAS}&${STAB}&sec=0`);
  await ready(page);
  await page.getByRole('button', { name: 'Clear all' }).click();
  await expect(page).toHaveURL(/\?by=topic&sec=0$/);
  await expect(gridDots(page, 'default')).toHaveCount(196);
  await expect(page.getByLabel('Find an item')).toHaveValue('');
});

test('a dot click chooses its item; Escape closes the panel and clears the item', async ({ page }) => {
  await page.goto(`./?by=topic&${STAB}`);
  await ready(page);
  const dot = page.locator(`.dot-grid button.dot[data-entity="${EEAS}"]`).first();
  await dot.click();
  await expect(page).toHaveURL(new RegExp(`item=${EEAS}`));
  await expect(page.locator('#panel-title')).toBeFocused();
  await expect(page.locator('article.card')).toHaveCount(8);
  await page.keyboard.press('Escape');
  await expect(page).not.toHaveURL(/item=/);
  await expect(gridDots(page)).toHaveCount(95);
});

test('view 1 stays available and ignores view 2 options', async ({ page }) => {
  await page.goto(`./?view=1&by=topic&${STAB}&non=1`);
  await ready(page);
  await expect(page.locator('body')).toHaveAttribute('data-layout', 'fixed');
  await expect(page.locator('button.dot')).toHaveCount(196);
  await expect(page.getByLabel('Show non-matching dots')).toBeHidden();
  await expect(page.getByLabel('Search items or institutions')).toBeVisible();
});

test.describe('V8 mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test('adaptive groups as a list, rows open into cards, cards for small sets', async ({ page }) => {
    await page.goto(`./?by=topic&${STAB}`);
    await ready(page);
    await expect(page.locator('.dot-grid')).toHaveCount(0);
    const rowA = page.locator('.m-row', { hasText: 'Interstate cooperation on security' });
    await expect(rowA).toContainText('24 +4');
    await expect(rowA).toContainText('24 matches');
    await rowA.click();
    await expect(rowA).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.cards--mobile article.card')).toHaveCount(28);
    await expectNoSeriousAxe(page, 'V8 list');

    await page.goto(`./?by=topic&item=${EEAS}&${STAB}`);
    await ready(page);
    await expect(page.locator('.m-cards article.card')).toHaveCount(8);
    await expectNoSeriousAxe(page, 'V8 cards');
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(sw).toBeLessThanOrEqual(390);
  });
});

test.describe('motion', () => {
  /** The layout the logic returns for the current URL, as [groupKey, [link ids]] (computed in the page). */
  const logicOrder = (page) => page.evaluate(async () => {
    const [{ fetchDataset }, { buildModel }, { parseQuery }, { derive }] = await Promise.all([
      import('./src/data/load.js'), import('./src/data/model.js'), import('./src/logic/state.js'), import('./src/logic/view.js')]);
    const model = buildModel(await fetchDataset());
    const v = derive(model, parseQuery(location.search, model).state);
    const groups = v.layout.mode === 'cards' && v.layout.groupBy === 'topic' ? v.layout.groups.flatMap((g) => g.subgroups) : v.layout.groups;
    return groups.flatMap((g) => g.links.map((l) => l.link_id));
  });
  const domOrder = (page) => page.locator('.dot-grid [data-link]').evaluateAll((els) => els.map((e) => Number(e.dataset.link)));

  test.use({ reducedMotion: 'no-preference' });
  test('after the animation settles the DOM equals the layout from the logic', async ({ page }) => {
    await page.goto(`./?by=topic&${STAB}`);
    await ready(page);
    await settled(page);
    expect(await domOrder(page)).toEqual(await logicOrder(page));

    const box = page.getByRole('combobox', { name: 'Find an item' });
    await box.fill('EEAS');
    await page.getByRole('option', { name: /^European External Action Service \(EEAS\)/ }).click();
    await expect(page.locator('.dot-grid')).toHaveAttribute('data-animating', 'true');
    await settled(page);
    await expect(page.locator('.motion-ghost')).toHaveCount(0);
    expect(await domOrder(page)).toEqual(await logicOrder(page));
    await expect(page.locator('article.card')).toHaveCount(8);

    // Interrupt: a new choice during the animation starts from the current state and still lands right.
    await page.getByRole('button', { name: 'Remove Item: EEAS' }).click();
    await page.getByLabel('Include secondary matches').uncheck();
    await settled(page);
    await expect(page.locator('.motion-ghost')).toHaveCount(0);
    expect(await domOrder(page)).toEqual(await logicOrder(page));
    await expect(gridDots(page)).toHaveCount(30);
  });

  test('reduced motion: the end state is immediate', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`./?by=topic&${STAB}`);
    await ready(page);
    await page.locator('#f-norm').selectOption('A');
    // no waiting: the grid is already in its end state
    await expect(page.locator('.dot-grid')).toHaveAttribute('data-animating', 'false');
    expect(await page.locator('.motion-ghost').count()).toBe(0);
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    expect(await domOrder(page)).toEqual(await logicOrder(page));
  });
});
