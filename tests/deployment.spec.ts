import { test, expect } from '@playwright/test';

test('generated site loads its data and runs a catalog query', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('status')).toHaveText('Ready');
  await expect(page.locator('.tabPanel.active')).toHaveCount(1);
  await expect(page.locator('[role="tab"][aria-selected="true"]')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Shows Table view' })).toHaveCount(1);

  const tab = page.getByRole('tab', { name: 'list things grid' });
  await tab.click();
  const panel = page.getByRole('tabpanel', { name: 'list things grid' });
  await panel.getByLabel('Run query').click();

  await expect(panel.locator('.yasr_response_chip')).toContainText('4 results');
  await expect(panel.getByRole('button', { name: 'Shows Grid view' })).toHaveClass(/selected/);
  await expect(page.locator('.tabPanel.active')).toHaveCount(1);
});
