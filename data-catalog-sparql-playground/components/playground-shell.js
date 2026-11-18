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
      <ul class="playground-errors" data-role="source-errors" hidden></ul>
      <div class="yasgui-host" data-role="app"></div>
    </section>
  `;
}

export function setPlaygroundStatus(element, message) {
  const status = element.querySelector('[data-role="status"]');
  if (status) status.textContent = message;
}

/** Says which sources were left out. The other sources still answer queries. */
export function showSourceFailures(element, failures) {
  const list = element.querySelector('[data-role="source-errors"]');
  if (list) {
    list.replaceChildren(
      ...failures.map((failure) => {
        const item = document.createElement('li');
        item.textContent = `${failure.url}: ${failure.error}`;
        return item;
      }),
    );
    list.hidden = false;
  }
  const count = failures.length;
  setPlaygroundStatus(element, `Ready, but ${count} source${count === 1 ? '' : 's'} could not be loaded`);
}
