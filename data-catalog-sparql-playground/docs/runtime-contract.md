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
- `title`, `eyebrow`, `description` — page copy rendered in the shell header

## Expected side effects
The current implementation intentionally exposes a small amount of runtime state on `window` for browser-driven debugging and tests:

- `window.yasgui`
- `window.loadComunicaSourcesFromCatalog`
- `window.fetchDataCatalog`

The custom element also exposes its resolved `persistenceId` after initialization.

## Behavioral guarantees
- The advanced page registers `TableX`, `Grid`, `Stats`, and `Map` if the Sparnatural bundle is present.
- The minimal page ignores special result-view hints and stays on built-in YASR result views.
- Example SPARQL queries from the catalog are auto-added as tabs.
- The originally active tab is restored after auto-adding example-query tabs.
- Only the selected tab's query editor and results are visible.
- Cached tabs are scoped to the resolved catalog path, so separate GitHub Pages projects on the same origin do not share them.

## If you change this contract
Please update:

1. `README.md`
2. `docs/architecture-notes.md`
3. `tests/ui.spec.ts`
