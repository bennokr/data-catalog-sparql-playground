# Vega Lite result type plan

## Goal
Add a lightweight `VegaLite` result type that can render SPARQL binding results as declarative charts without disturbing the existing table, grid, stats, and map workflows.

## Scope
- Target `SELECT` query results serialized as `application/sparql-results+json`.
- Read chart hints from the same `#defaultView:` and `#view:` comment metadata pattern already used by the playground.
- Keep the implementation browser-only and dependency-light.

## Proposed component structure
1. **`vega-lite-plugin.js`**
   - Wrap a small YASR plugin around Vega-Lite + Vega-Embed.
   - Expose `canHandleResults`, `draw`, and `download` hooks consistent with the other result plugins.
2. **`vega-lite-transform.js`**
   - Convert SPARQL bindings into plain row objects.
   - Normalize XSD numeric, date, and boolean literals for Vega-Lite encodings.
3. **`vega-lite-config.js`**
   - Merge default chart config with inline query hints.
   - Support field aliases, mark type, dimensions, tooltip fields, and optional faceting.

## Query hint design
Example:

```sparql
#defaultView:VegaLite{"mark":"bar","x":"category","y":"count","color":"category"}
SELECT ?category (COUNT(*) AS ?count)
WHERE {
  ?thing <https://schema.org/category> ?category .
}
GROUP BY ?category
```

### Planned options
- `mark`: `bar`, `line`, `point`, `area`, `arc`
- `x`, `y`, `color`, `size`, `tooltip`
- `width`, `height`, `autosize`
- `transform`: pass-through for vetted Vega-Lite transforms
- `config`: limited theme overrides

## Delivery steps
1. Add Vega, Vega-Lite, and Vega-Embed assets in a way compatible with static hosting.
2. Build a converter from SPARQL JSON results into a typed array of row objects.
3. Register the `VegaLite` plugin beside `TableX`, `Grid`, `Stats`, and `Map`.
4. Add one example query and one Playwright smoke test for chart rendering.
5. Document supported hint options in the README.

## Risks and mitigations
- **Large result sets**: cap plotted rows and show a warning banner before rendering.
- **Unsafe specs**: validate allowed fields and reject arbitrary URLs or external data references.
- **Type coercion issues**: centralize literal parsing so charts and future components reuse the same conversion rules.
