# Data Catalog SPARQL playground

A tiny, self-contained playground for browsing and querying RDF data in the browser:

- `make_catalog.py` generates a schema.org DataCatalog (JSON-LD) from your RDF files (and optional example SPARQL queries).
- `query.html` loads that catalog, builds in-browser Comunica sources from the distributions, and provides a YASGUI workspace with auto-added example-query tabs.
- `run-server.sh` serves the site over HTTPS on port 443 (handy to mimic a GitHub Pages hostname locally).
- `toggle-hosts.sh` toggles an /etc/hosts entry to map a chosen hostname (e.g., username.github.io) to localhost.

Everything runs in your browser; there’s no SPARQL endpoint. Comunica queries the RDF files directly.


## Repository layout

- `query.html` — YASGUI + Comunica UI that reads ./catalog.json
- `make_catalog.py` — CLI to build catalog.json from your data and queries
- `run-server.sh` — HTTPS static server (uses npx http-server)
- `toggle-hosts.sh` — Toggle /etc/hosts for a local GitHub Pages-like hostname
- `data/` — put your RDF files here (e.g., .ttl, .trig, .jsonld, …)
- `queries/` — put example SPARQL files here (e.g., .rq, .sparql)


## Prerequisites

- Python 3.8+ and pip
- Node.js (to run npx http-server)
- mkcert (to create a locally trusted dev certificate)
- macOS or Linux shell (scripts assume a POSIX shell)


## Installation

macOS (Homebrew):

```
brew install mkcert
brew install nss        # if you use Firefox
mkcert -install         # installs a local CA into your trust stores
```

Linux (Debian/Ubuntu):

```
sudo apt-get update
sudo apt-get install -y mkcert libnss3-tools
mkcert -install
```

### Notes
- `mkcert -install` adds a local CA to your system trust store (and to NSS for Firefox via libnss3-tools).


## Generate a local HTTPS cert

Replace USER.github.io with the hostname you want to mimic (e.g., your GitHub Pages domain). Include localhost and loopback IPs as SANs.

```
mkcert -key-file cert-key.pem -cert-file cert.pem "USER.github.io" localhost 127.0.0.1 ::1
```

This produces cert.pem and cert-key.pem in the repo root. Keep cert-key.pem private.


## Create your catalog.json

1) Install the Python dependency:

```
python3 -m venv .venv
. .venv/bin/activate
pip install defopt
```

2) Put RDF data under data/ and example queries under queries/.

3) Generate catalog.json (adjust base URL, name, license as needed):

```
python make_catalog.py data/* \
  --base-url https://USER.github.io/ \
  --name "My data catalog" \
  --queries queries/* \
  --out catalog.json
```

### Notes

- `base-url` should be the public URL where these files would be hosted (e.g., GitHub Pages root). The tool keeps your relative paths intact and prefixes them with `base-url` for contentUrl.
- Supported RDF types are auto-guessed: `.ttl`, `.trig`, `.nt`, `.nq`, `.jsonld`, `.rdf`/`.xml`, plus SPARQL queries (`.rq`/`.sparql`).
- A --license URL can be added to all datasets.
- Example queries are added as SoftwareSourceCode entries and will appear as YASGUI tabs automatically in query.html.


## Run locally over HTTPS on port 443

Map your chosen hostname to localhost (toggle on/off):

```
./toggle-hosts.sh USER.github.io
```

Start the HTTPS server (binds to 443; will prompt for sudo):

```
./run-server.sh
```

Open in your browser:

```
https://USER.github.io/query.html
```

Why mimic a Pages-like hostname?
- Your catalog.json’s contentUrl values will resolve exactly as they would on GitHub Pages.
- Avoids cross-origin quirks by keeping everything “same-origin” while developing.


## Using the playground

- `query.html` reads `./catalog.json` by default.
- Datasets with RDF distributions become Comunica sources.
- Example queries (from catalog `hasPart SoftwareSourceCode` with SPARQL media) are added as tabs.
- Click Run or press Cmd/Ctrl-Enter to execute queries in the browser.
- No network endpoint is used; a dummy endpoint is configured only to satisfy YASGUI’s UI. Comunica reads your files directly.


## Updating data and queries

- Add/modify files under data/ and queries/.
- Re-run make_catalog.py to regenerate catalog.json.
- Refresh the browser; new sources and example tabs appear.


## Troubleshooting

- Browser distrusts the cert:
  - Ensure mkcert -install was run.
  - For Firefox, ensure it uses the OS trust store (about:config → security.enterprise_roots.enabled = true) or let mkcert install into NSS (libnss3-tools).
- Port 443 already in use:
  - Stop the other service or edit run-server.sh to use a different port (you’ll also need to adjust how you access the site; same-origin assumptions may change).
- No data shows in queries:
  - Check catalog.json: distribution[].contentUrl must be reachable and point to RDF files. Media types are optional but recommended; unsupported formats are ignored.
- Example tabs don’t appear:
  - Ensure queries are listed via --queries when generating the catalog and detected as SPARQL (file extension .rq/.sparql or encodingFormat application/sparql-query).

## Deploying to GitHub Pages

- Commit catalog.json, query.html, data/, and queries/ to your Pages branch.
- Set base-url to your real Pages URL when generating the catalog.
- Then open https://USER.github.io/query.html and query away—no server needed.
