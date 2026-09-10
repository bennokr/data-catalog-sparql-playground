# Data Catalog SPARQL playground

This project turns RDF files and example SPARQL queries into a static browser
playground. Comunica runs every query in the browser, so the deployed site does
not need a SPARQL endpoint or application server.

[Open the live playground](https://bennokr.github.io/data-catalog-sparql-playground/)

## Use it from another repository

The reusable workflow builds and deploys a complete GitHub Pages site. The
consumer repository keeps only its RDF data, SPARQL queries, and this workflow
call:

```yaml
name: SPARQL playground

on:
  push:
    branches:
      - main

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  pages:
    uses: bennokr/data-catalog-sparql-playground/.github/workflows/pages.yml@WORKFLOW_COMMIT
    with:
      data: demo/*.trig
      queries: demo/*.rq
      title: My SPARQL playground
      tagline: Explore this project's RDF data in your browser.
      playground-ref: WORKFLOW_COMMIT
```

In the consumer repository's Pages settings, select **GitHub Actions** as the
deployment source. The workflow accepts newline-separated glob patterns and
defaults to the minimal interface. Minimal builds omit the advanced page and
result-plugin bundle. Set `variant: advanced` to include the Grid, Stats, and Map
result views. Set `title` and `tagline` to give each deployed site its own copy.

`WORKFLOW_COMMIT` should be the same release tag or commit SHA in both places.
This pins the reusable workflow and the playground assets it deploys.

## Build locally

The builder uses only the Python standard library:

```bash
python make_catalog.py build \
  --data "data-catalog-sparql-playground/data/**/*" \
  --queries "data-catalog-sparql-playground/queries/**/*" \
  --name "Data Catalog SPARQL playground" \
  --tagline "Explore catalog-managed RDF data with SPARQL in your browser." \
  --variant advanced \
  --output _site

python -m http.server --directory _site 8000
```

Open <http://localhost:8000/>.

To generate only a schema.org DataCatalog:

```bash
python make_catalog.py catalog data/*.ttl \
  --queries queries/*.rq \
  --name "My data catalog" \
  --out catalog.json
```

## Development

The browser runtime lives in `data-catalog-sparql-playground/`. Production
JavaScript dependencies are kept there so consumers do not need Node or frontend
build tooling. Node is used only for the project's Playwright tests.

```bash
python -m unittest tests/test_make_catalog.py
npm ci
npx playwright install chromium
npm run release:check
```

The Pages workflow runs these checks, builds the site through the same reusable
interface offered to consumers, and deploys the resulting artifact after a
successful build.

## Runtime

- `minimal.html` uses standard YASR result views.
- `query.html` adds Grid, Stats, and Map result views.
- `catalog.json` describes RDF distributions and example queries.
- `components/` contains the browser components.
- `vendor/` contains the production browser bundles used by the generated site.

The generated site uses relative URLs, so it works at a GitHub Pages project path
without repository-specific configuration. Input paths are preserved below
`data/` and `queries/`, allowing JSON-LD files to keep relative context links.
Generated asset URLs include a content version so browsers do not mix files from
different deployments.
