# Runtime contract for the playground

This document is the shortest path to understanding what the browser runtime expects.

## Browser globals expected at startup
The static HTML entry pages currently provide these globals before `components/bootstrap.js` runs:

- `window.Comunica`
- `window.Yasgui`
- `window.Yasr` (directly or via `window.Yasgui.Yasr`)
- `window.SparnaturalYasguiPlugins` on the advanced page only

## Custom element contract
`<yasgui-playground>` currently supports:

- `catalog-url` — optional catalog path, defaults to `catalog.json`
- `persistence-id` — optional YASGUI browser-storage key; by default, the resolved catalog path keeps cached tabs separate between deployments
- `data-special-views="false"` — disables the Sparnatural result plugins and keeps standard YASR views only
- `data-merge-sources="false"` — query the catalog's sources as a federation instead of as one merged graph (see below)
- `title`, `description` — page title and tagline rendered in the shell header

## Expected side effects
The current implementation intentionally exposes a small amount of runtime state on `window` for browser-driven debugging and tests:

- `window.yasgui`
- `window.loadComunicaSourcesFromCatalog`
- `window.fetchDataCatalog`
- `window.prepareSources` — `(engine, catalogUrl, {merge}) → {sources, failures, merged, triples}`
- `window.playgroundSources` — the result of that call for the page's catalog

The custom element also exposes its resolved `persistenceId` after initialization.

## Behavioral guarantees
- The advanced page registers `TableX`, `Grid`, `Stats`, and `Map` if the Sparnatural bundle is present.
- The minimal page ignores special result-view hints and stays on built-in YASR result views.
- Example SPARQL queries from the catalog are auto-added as tabs.
- The originally active tab is restored after auto-adding example-query tabs.
- Only the selected tab's query editor and results are visible.
- The advanced page presents one control for each result view.
- Cached tabs are scoped to the resolved catalog path, so separate GitHub Pages projects on the same origin do not share them.

## If you change this contract
Please update:

1. `README.md`
2. `docs/architecture-notes.md`
3. `tests/ui.spec.ts`

## Sources: merging and failures
- By default the page reads every RDF distribution of the catalog on its own and queries the union as **one** in-memory N-Quads source. Comunica otherwise federates the sources and does not remove a triple that two files both state, so every join through such a triple returns duplicate rows. Named graphs are kept; blank nodes are renamed per source so that two files never share one. The merge costs one pass over all data at page load and holds it in memory: set `data-merge-sources="false"` for large sources.
- A source that cannot be loaded (404, invalid JSON-LD, unreachable `@context`, a parse error in the merge pass) is left out. The page lists it under the header, the status reads "Ready, but N sources could not be loaded", and the other sources still answer. When nothing fails the status stays exactly `Ready`.
- `loadComunicaSourcesFromCatalog` still returns a plain array (failures are logged with `console.warn`); use `loadComunicaSources` from `catalog-utils.js` to get the failures too.
- With `data-merge-sources="false"`, only JSON-LD sources are checked at load time; other formats fail when a query runs.
