import { fetchDataCatalog, asArray, absUrl } from './catalog-utils.js';

export async function addExampleQueriesFromCatalog(yasgui, catalogUrl = 'catalog.json') {
  const activeTab = yasgui.getTab?.() || null;
  const { parts } = await fetchDataCatalog(catalogUrl);

  for (const part of asArray(parts)) {
    const media = (part?.encodingFormat || part?.programmingLanguage || '').toString().toLowerCase();
    const url = part?.contentUrl || part?.url;
    if (!url || (!media.includes('application/sparql-query') && !media.includes('sparql'))) continue;

    const name = (part.name || new URL(url, window.location.href).pathname.split('/').pop()).trim();
    if (yasgui.tabNameTaken(name)) continue;

    const tab = yasgui.addTab(false);
    tab.setName(name);
    tab.select();
    tab.getYasqe?.().setValue(await fetch(absUrl(url)).then((response) => response.text()));
  }

  activeTab?.select?.();
}
