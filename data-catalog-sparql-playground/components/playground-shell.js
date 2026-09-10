export function renderPlaygroundShell(element) {
  element.innerHTML = `
    <section class="playground-shell">
      <header class="playground-header">
        <div>
          <h1>${element.getAttribute('title') || 'SPARQL playground'}</h1>
          <p class="playground-copy">${element.getAttribute('description') || 'Explore RDF data with SPARQL in your browser.'}</p>
        </div>
        <p class="playground-status" data-role="status" role="status" aria-live="polite">Loading…</p>
      </header>
      <div class="yasgui-host" data-role="app"></div>
    </section>
  `;
}

export function setPlaygroundStatus(element, message) {
  const status = element.querySelector('[data-role="status"]');
  if (status) status.textContent = message;
}
