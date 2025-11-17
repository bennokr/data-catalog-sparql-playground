import { test, expect, Page, Locator } from '@playwright/test';

const LIST_THINGS_TAB = 'List things';

async function runQuery(page: Page, panel: Locator) {
  const editor = panel.locator('.CodeMirror').first();
  await editor.waitFor();
  await editor.click();
  await page.keyboard.press('Control+Enter');
}

test.describe('SPARQL playground UI', () => {
  test('loads example query tab from catalog and executes it via Comunica', async ({ page }) => {
    await page.goto('/query.html');

    const exampleTab = page.getByRole('tab', { name: LIST_THINGS_TAB });
    await exampleTab.waitFor({ state: 'visible', timeout: 20_000 });
    await exampleTab.click();
    await expect(exampleTab).toHaveAttribute('aria-selected', 'true');

    const panelId = await exampleTab.getAttribute('aria-controls');
    if (!panelId) throw new Error('Example tab did not expose its panel id.');
    const queryPanel = page.locator(`[id="${panelId}"]`);
    const queryEditor = queryPanel.locator('.CodeMirror').first();
    await expect(queryEditor).toContainText('schema:Thing');
    await expect(queryPanel.locator('.yasr')).not.toContainText('schema:Thing');

    const runButton = queryPanel.locator('.yasqe_queryButton').first();
    await runButton.waitFor();
    await runQuery(page, queryPanel);

    const resultsTable = page.locator('.yasr table');
    await expect(resultsTable).toBeVisible();
    await expect(resultsTable.locator('tbody tr')).toHaveCount(2);
    await expect(resultsTable.locator('tbody tr').first()).toContainText('Example item');

    await expect(runButton).not.toHaveClass(/busy/);
    await expect(queryPanel.locator('.yasr_response_chip')).toHaveText(/in [0-9]+\.[0-9]{2} seconds/);
  });
});
