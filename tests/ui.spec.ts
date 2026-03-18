import { test, expect } from '@playwright/test';

test.describe('SPARQL playground UI', () => {
  test('loads .json JSON-LD source and returns it through Comunica', async ({ page }) => {
    await page.goto('/query.html');

    const names = await page.evaluate(async () => {
      const engine = new Comunica.QueryEngine();
      const sources = await loadComunicaSourcesFromCatalog();
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
});
