# Playwright UI testing

## Setup process
- `npm init -y`
- `npm install --save-dev @playwright/test http-server`
- `npx playwright install --with-deps chromium`
- Created `catalog.json`, `data/example.ttl`, and `queries/list-things.sparql` so the UI has local RDF sources and example tabs to exercise.
- Added `playwright.config.ts` with a local `http-server` webServer hook and `ignoreHTTPSErrors: true` so CDN assets can load despite custom certs in this environment.

## Running the tests
- `npx playwright test`

## Troubleshooting notes
- Remote assets from unpkg and Comunica originally failed to load because Chromium distrusted the man-in-the-middle cert in this environment. Setting `ignoreHTTPSErrors: true` in the Playwright config fixed that.
- Playwright normally spins up a headed Chromium that expects an X11/Wayland display, but this CI-style environment doesn't provide one. Keeping the browser in its default headless mode (what `npx playwright test` already does) after installing Chromium via `npx playwright install --with-deps chromium` avoids the need for any virtual display server.
- YASGUI renders multiple CodeMirror instances (one per tab), so the test drills into the `aria-controls` relationship to focus the correct editor before sending Ctrl/Cmd-Enter to run the query.
- The UI hides YASGUI's toolbar, so triggering queries relies on the keyboard shortcut. The helper in `tests/ui.spec.ts` clicks inside the CodeMirror area first to ensure the shortcut is captured.
