import { test, expect, Page, Locator } from '@playwright/test';

const LIST_THINGS_TAB = 'List things';
const GRID_TAB = 'Grid view';
const STATS_TAB = 'Category stats';
const MAP_TAB = 'Geo points';

async function openTab(page: Page, tabName: string) {
  const tab = page.getByRole('tab', { name: tabName });
  await tab.waitFor({ state: 'visible', timeout: 20_000 });
  await tab.click();
  const panelId = await tab.getAttribute('aria-controls');
  if (!panelId) throw new Error(`Tab ${tabName} did not expose its panel id.`);
  return { tab, panel: page.locator(`[id="${panelId}"]`) };
}

async function runQuery(page: Page, panel: Locator) {
  const editor = panel.locator('.CodeMirror').first();
  await editor.waitFor();
  await editor.click();
  await page.keyboard.press('Control+Enter');
  await expect(panel.locator('.yasqe_queryButton')).not.toHaveClass(/busy/, { timeout: 20_000 });
  await expect(panel.locator('.yasr_response_chip')).toHaveText(/seconds/, { timeout: 20_000 });
}

async function getDrawnPlugin(page: Page) {
  return page.evaluate(() => window.yasgui.getTab().getYasr()?.drawnPlugin);
}

test.describe('SPARQL playground UI', () => {
  test('uses TableX default view hint with merged options', async ({ page }) => {
    await page.goto('/query.html');

    const { tab, panel } = await openTab(page, LIST_THINGS_TAB);
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await expect(panel.locator('.CodeMirror').first()).toContainText('schema:Thing');

    await runQuery(page, panel);

    const info = await page.evaluate(() => {
      const yasr = window.yasgui.getTab().getYasr();
      const pluginName = yasr.drawnPlugin;
      const plugin = yasr.plugins?.[pluginName];
      return {
        pluginName,
        pageLength: plugin?.config?.pageLength,
        bindings: plugin?.results?.bindings?.length,
      };
    });

    expect(info).toEqual({ pluginName: 'TableX', pageLength: 1, bindings: 2 });
  });

  test('applies Grid plugin from defaultView comment', async ({ page }) => {
    await page.goto('/query.html');

    const { panel } = await openTab(page, GRID_TAB);
    await runQuery(page, panel);

    await expect.poll(() => getDrawnPlugin(page)).toEqual('Grid');
  });

  test('applies Stats plugin from defaultView comment', async ({ page }) => {
    await page.goto('/query.html');

    const { panel } = await openTab(page, STATS_TAB);
    await runQuery(page, panel);

    await expect.poll(() => getDrawnPlugin(page)).toEqual('Stats');
  });

  test('renders Map plugin with WKT results and custom options', async ({ page }) => {
    await page.goto('/query.html');

    const { panel } = await openTab(page, MAP_TAB);
    await runQuery(page, panel);

    await expect.poll(() => getDrawnPlugin(page)).toEqual('Map');

    const mapConfig = await page.evaluate(() => {
      const yasr = window.yasgui.getTab().getYasr();
      return yasr.plugins?.Map?.config;
    });
    expect(mapConfig?.mapSize?.height).toBe('320px');
    const mapInfo = await page.evaluate(() => {
      const yasr = window.yasgui.getTab().getYasr();
      const mapPlugin = yasr.plugins?.Map;
      return { drawn: yasr.drawnPlugin, missing: mapPlugin?.haveResultWithoutGeo };
    });
    expect(mapInfo).toEqual({ drawn: 'Map', missing: 0 });
  });
});
