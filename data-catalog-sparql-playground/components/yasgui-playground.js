import { loadComunicaSourcesFromCatalog, fetchDataCatalog } from './catalog-utils.js';
import { addExampleQueriesFromCatalog } from './example-tabs.js';
import { registerYasrPlugins } from './plugin-registry.js';
import { wireTabForComunica } from './comunica-runner.js';
import { renderPlaygroundShell, setPlaygroundStatus } from './playground-shell.js';

window.loadComunicaSourcesFromCatalog = loadComunicaSourcesFromCatalog;
window.fetchDataCatalog = fetchDataCatalog;

export class YasguiPlayground extends HTMLElement {
  connectedCallback() {
    if (this._connected) return;
    this._connected = true;
    renderPlaygroundShell(this);
    this.initialize().catch((error) => {
      setPlaygroundStatus(this, `Failed to load playground: ${error}`);
      throw error;
    });
  }

  async initialize() {
    registerYasrPlugins({ includeSparnaturalPlugins: this.dataset.specialViews !== 'false' });

    const catalogUrl = this.getAttribute('catalog-url') || 'catalog.json';
    const app = this.querySelector('[data-role="app"]');
    const engine = new window.Comunica.QueryEngine();
    const sourcesPromise = loadComunicaSourcesFromCatalog(catalogUrl);
    const yasgui = new window.Yasgui(app, {
      requestConfig: { endpoint: `${window.location.origin}/__noop__` },
      copyEndpointOnNewTab: false,
    });

    window.yasgui = yasgui;

    const originalAddTab = yasgui.addTab.bind(yasgui);
    yasgui.addTab = (...args) => {
      const tab = originalAddTab(...args);
      wireTabForComunica(tab, engine, sourcesPromise);
      return tab;
    };

    yasgui.on('tabChange', (_tabId, tab) => wireTabForComunica(tab, engine, sourcesPromise));
    wireTabForComunica(yasgui.getTab(), engine, sourcesPromise);
    await addExampleQueriesFromCatalog(yasgui, catalogUrl);

    setPlaygroundStatus(
      this,
      this.dataset.specialViews === 'false'
        ? 'Minimal demo ready with standard YASR result views.'
        : 'Complex demo ready with table, grid, stats, and map result views.',
    );

    this.yasgui = yasgui;
  }
}

customElements.define('yasgui-playground', YasguiPlayground);
