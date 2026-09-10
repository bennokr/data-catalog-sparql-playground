import { test, expect } from '@playwright/test';

async function openNamedTab(page, tabName: string) {
  const tab = page.getByRole('tab', { name: tabName });
  const panel = page.getByRole('tabpanel', { name: tabName });
  await tab.click();
  await expect(panel).toBeVisible();
  return panel;
}

async function runQueryInTab(page, tabName: string) {
  const panel = page.getByRole('tabpanel', { name: tabName });
  await panel.getByLabel('Run query').click();
  await expect(panel.locator('.yasr_response_chip')).toContainText(/seconds/);
  return panel;
}

async function switchResultView(panel, buttonName: string, index = 0) {
  const button = panel.getByRole('button', { name: buttonName }).nth(index);
  await button.click();
  await expect(button).toHaveClass(/selected/);
}

test.describe('SPARQL playground UI', () => {
  test('keeps the starter Query tab selected while example tabs are added', async ({ page }) => {
    await page.goto('/query.html');

    await expect(page.getByRole('tabpanel', { name: 'Query' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Query' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab', { name: 'Library JSON-LD' })).toBeVisible();
  });

  test('shows one query editor while switching, adding, and restoring tabs', async ({ page }) => {
    await page.goto('/query.html');
    const activePanels = page.locator('.tabPanel.active');
    const selectedTabs = page.locator('[role="tab"][aria-selected="true"]');

    await expect(activePanels).toHaveCount(1);
    await expect(selectedTabs).toHaveCount(1);

    await openNamedTab(page, 'List things');
    await expect(activePanels).toHaveCount(1);
    await expect(selectedTabs).toHaveCount(1);

    await page.getByRole('button', { name: 'Add a new tab' }).click();
    await expect(activePanels).toHaveCount(1);
    await expect(selectedTabs).toHaveCount(1);

    await page.reload();
    await expect(activePanels).toHaveCount(1);
    await expect(selectedTabs).toHaveCount(1);
  });

  test('scopes cached tabs to the deployed catalog path', async ({ page }) => {
    await page.goto('/query.html');
    await page.waitForFunction(() => {
      const playground = document.querySelector('yasgui-playground') as HTMLElement & {
        persistenceId?: string;
      };
      return Boolean(playground?.persistenceId);
    });

    const state = await page.evaluate(async () => {
      const { persistenceIdForCatalog } = await import(
        '/components/yasgui-playground.js'
      );
      const playground = document.querySelector('yasgui-playground') as HTMLElement & {
        persistenceId: string;
      };

      return {
        current: playground.persistenceId,
        standalone: persistenceIdForCatalog(
          'catalog.json',
          new URL('https://bennokr.github.io/data-catalog-sparql-playground/query.html'),
        ),
        consumer: persistenceIdForCatalog(
          'catalog.json',
          new URL('https://bennokr.github.io/kgci/'),
        ),
      };
    });

    expect(state.current).toBe('sparql-playground:/catalog.json');
    expect(state.standalone).toBe(
      'sparql-playground:/data-catalog-sparql-playground/catalog.json',
    );
    expect(state.consumer).toBe('sparql-playground:/kgci/catalog.json');
    expect(state.standalone).not.toBe(state.consumer);
  });

  test('loads .json JSON-LD source and returns it through Comunica', async ({ page }) => {
    await page.goto('/query.html');

    const names = await page.evaluate(async () => {
      const engine = new Comunica.QueryEngine();
      const sources = await window.loadComunicaSourcesFromCatalog?.() ?? [];
      const query = `
        PREFIX schema: <https://schema.org/>
        SELECT ?name WHERE {
          ?work a schema:CreativeWork ;
                schema:name ?name .
        }
      `;

      const result = await engine.query(query, { sources });
      if (result.resultType !== 'bindings') return [];
      const bindingsStream = await result.execute();

      return await new Promise<string[]>((resolve, reject) => {
        const values: string[] = [];
        bindingsStream.on('data', (binding) => {
          const name = binding.get('name')?.value;
          if (name) values.push(name);
        });
        bindingsStream.on('end', () => resolve(values));
        bindingsStream.on('error', reject);
      });
    });

    expect(names).toContain('JSON source wired through local @context');
  });

  test('minimal page runs queries with only standard result plugins and can switch result views', async ({ page }) => {
    await page.goto('/minimal.html');
    await expect(page.getByText('Minimal demo ready with standard YASR result views.')).toBeVisible();

    const pluginOrder = await page.evaluate(() => window.Yasgui.Yasr.defaults.pluginOrder);
    expect(pluginOrder).not.toContain('Grid');
    expect(pluginOrder).not.toContain('Map');
    expect(pluginOrder).not.toContain('Stats');

    const panel = await openNamedTab(page, 'Grid view');
    await runQueryInTab(page, 'Grid view');

    await expect(panel.locator('.yasr_response_chip')).toContainText('4 results');
    await expect(panel.getByRole('button', { name: 'Shows Table view' }).first()).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Shows Response view' })).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Shows Grid view' })).toHaveCount(0);
    await expect(panel.getByRole('button', { name: 'Shows Map view' })).toHaveCount(0);
    await expect(panel.getByRole('button', { name: 'Shows Stats view' })).toHaveCount(0);

    await switchResultView(panel, 'Shows Response view');
    await switchResultView(panel, 'Shows Table view');

    const minimalState = await page.evaluate(() => ({
      pluginOrder: window.Yasgui.Yasr.defaults.pluginOrder,
    }));

    expect(minimalState.pluginOrder).toEqual(['table', 'response']);
  });

  test('complex page supports tab switching and grid result view switching', async ({ page }) => {
    await page.goto('/query.html');

    await openNamedTab(page, 'List things');
    await openNamedTab(page, 'Grid view');
    const panel = await runQueryInTab(page, 'Grid view');

    await expect(panel.getByRole('button', { name: 'Shows Grid view' })).toHaveClass(/selected/);
    await expect(panel.locator('.yasr_response_chip')).toContainText('4 results');

    await switchResultView(panel, 'Shows Table view');
    await switchResultView(panel, 'Shows Grid view');
    await openNamedTab(page, 'Category stats');
    await openNamedTab(page, 'Grid view');
    await expect(panel).toBeVisible();
    await switchResultView(panel, 'Shows Grid view');

    const gridState = await page.evaluate(() => {
      const yasr = window.yasgui.getTab().getYasr();
      const plugin = yasr.plugins.Grid;
      const firstBinding = plugin?.results?.bindings?.[0] ?? null;
      return {
        pageLength: plugin?.config?.pageLength ?? null,
        bindingCount: plugin?.results?.bindings?.length ?? null,
        firstName: firstBinding?.name?.value ?? null,
        firstCategory: firstBinding?.category?.value ?? null,
      };
    });

    expect(gridState.pageLength).toBe(2);
    expect(gridState.bindingCount).toBe(4);
    expect(gridState.firstName).toBe('Example item');
    expect(gridState.firstCategory).toBe('Demo');
  });

  test('complex page supports map result view switching after tab changes', async ({ page }) => {
    await page.goto('/query.html');

    await openNamedTab(page, 'Geo points');
    const panel = await runQueryInTab(page, 'Geo points');

    await expect(panel.getByRole('button', { name: 'Shows Map view' })).toHaveClass(/selected/);
    await expect(panel.locator('.yasr_response_chip')).toContainText('4 results');

    await switchResultView(panel, 'Shows Table view');
    await switchResultView(panel, 'Shows Map view');
    await openNamedTab(page, 'Library JSON-LD');
    await openNamedTab(page, 'Geo points');
    await expect(panel.getByRole('button', { name: 'Shows Map view' })).toHaveClass(/selected/);

    const mapState = await page.evaluate(() => {
      const yasr = window.yasgui.getTab().getYasr();
      const plugin = yasr.plugins.Map;
      return {
        drawnPlugin: yasr.drawnPlugin,
        bindingCount: plugin?.results?.bindings?.length ?? null,
        hasMap: Boolean(plugin?.map),
        height: plugin?.config?.mapSize?.height ?? null,
        center: plugin?.config?.setView?.center ?? null,
        layerCount: plugin?.map ? Object.keys(plugin.map._layers || {}).length : 0,
      };
    });

    expect(mapState.drawnPlugin).toBe('Map');
    expect(mapState.bindingCount).toBe(4);
    expect(mapState.hasMap).toBe(true);
    expect(mapState.height).toBe('320px');
    expect(mapState.center).toEqual([46.20222, 6.14569]);
    expect(mapState.layerCount).toBeGreaterThanOrEqual(4);
  });
});
