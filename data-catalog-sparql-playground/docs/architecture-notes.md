# Playground architecture notes and design critique

## What is in the current design
The playground is split into a few clear layers:

1. **Static entry pages**
   - `query.html` loads the advanced demo.
   - `minimal.html` loads the smaller demo.
2. **Shared component layer**
   - `page-frame.js` provides the page shell.
   - `yasgui-playground.js` now acts as a thin orchestrator while `plugin-registry.js`, `example-tabs.js`, `comunica-runner.js`, and `playground-shell.js` handle the heavier feature work.
3. **Data helpers**
   - `catalog-utils.js` loads the schema.org catalog, expands JSON-LD contexts, and builds Comunica sources.
   - `query-hints.js` parses `#defaultView:` / `#view:` comments.
4. **Presentation assets**
   - `app.css` provides a consistent look across the two demos.

That split is a real improvement over the original monolithic page because it separates catalog parsing, query hint parsing, and UI bootstrapping into reusable pieces.

## What is working well
- The advanced and minimal demos now share one core implementation path.
- JSON-LD source support is handled in one place instead of being embedded directly in the page.
- Result-view hint parsing is isolated, which makes future view types easier to add.
- Playwright coverage now exercises tab switching, query execution, and result-view switching in both demos.

## Design critique
The refactor is good, but there are still a few structural weaknesses worth calling out.

### 1. The refactor is much better, but orchestration is still a little centralised
The recent split moved plugin registration, example-tab loading, Comunica execution, and shell rendering into separate modules, which is a strong improvement. The remaining issue is that `yasgui-playground.js` still coordinates all runtime wiring and global exports, so the component boundary is clearer than before but not yet fully declarative.

### 2. Plugin configuration is still fairly ad hoc
`applyPluginConfiguration` mutates plugin instances directly and temporarily overrides `canHandleResults`.
That is pragmatic, but brittle: it couples the playground to internal plugin behavior and makes upgrades of YASR or Sparnatural plugins riskier.

### 3. The app still depends on globals heavily
The component expects `window.Yasgui`, `window.Comunica`, and optionally `window.SparnaturalYasguiPlugins` to exist.
That is fine for a static demo, but it makes dependency boundaries implicit and harder to test in isolation.

### 4. Test coverage is browser-strong but unit-light
The Playwright suite now covers the most important UI flows, but many smaller behaviors are still only validated transitively through end-to-end tests.
Examples include:
- query-hint parsing edge cases,
- tab restoration rules,
- JSON-LD context inlining behavior,
- fallback behavior when a requested plugin is unavailable.

### 5. The docs explain usage better than maintenance
The README is good for users of the playground, but maintainers still need a quicker explanation of:
- which module owns what,
- how a new result plugin should be added,
- where to put a new demo page,
- what parts are expected to remain global because of the static browser environment.

## Suggested improvements

### Near-term improvements
1. **Keep the new feature-module split going**
   - add a small `yasr-view-state.js` helper if view-state logic keeps growing
   - keep `yasgui-playground.js` as a thin wiring layer only
2. **Add unit tests for helpers**
   - `parseViewHints`
   - `fetchDataCatalog`
   - JSON-LD context inlining and source normalization
3. **Replace temporary plugin monkey-patching with an adapter layer**
   - wrap plugin selection in a small, explicit compatibility helper
   - keep plugin-specific quirks out of the main component
4. **Document the runtime contract**
   - what globals must exist
   - which attributes configure `<yasgui-playground>`
   - what the minimal page intentionally disables

### Medium-term improvements
1. **Expose a stable component API**
   - attributes such as `catalog-url`, `data-special-views`, and a future `data-default-query`
   - custom events like `query-start`, `query-success`, and `query-error`
2. **Support declarative plugin presets**
   - a preset for minimal demos
   - a preset for advanced demos
   - a preset for future visualization-heavy demos such as Vega-Lite
3. **Reduce global coupling**
   - pass dependencies into the component from a bootstrap module instead of reading them directly from `window`
4. **Add maintainer docs for extending the playground**
   - how to add a result type
   - how to add a demo page
   - how to add a query hint safely

## Recommended direction
If I were continuing this refactor, I would make the next step **unit tests plus a more explicit component API**: keep the current feature modules, add tests for `catalog-utils.js` and `query-hints.js`, and reduce the remaining reliance on globals through a clearer bootstrap contract.
