export function renderPlaygroundShell(element) {
  element.innerHTML = `
    <section class="playground-shell">
      <header class="playground-header">
        <div>
          <p class="eyebrow">${element.getAttribute('eyebrow') || 'SPARQL demo'}</p>
          <h1>${element.getAttribute('title') || 'Data Catalog SPARQL playground'}</h1>
          <p class="playground-copy">${element.getAttribute('description') || 'Run in-browser SPARQL queries against catalog-managed RDF files.'}</p>
        </div>
        <p class="playground-status" data-role="status">Loading catalog and queries…</p>
      </header>
      <div class="yasgui-host" data-role="app"></div>
    </section>
  `;
}

export function setPlaygroundStatus(element, message) {
  const status = element.querySelector('[data-role="status"]');
  if (status) status.textContent = message;
}
