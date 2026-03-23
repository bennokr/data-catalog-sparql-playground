# Release checklist

Use this checklist before tagging or publishing a release.

## Functionality
- [ ] `query.html` loads and advanced result plugins are available.
- [ ] `minimal.html` loads and only standard YASR result views are available.
- [ ] Example query tabs appear from `catalog.json`.
- [ ] JSON-LD distributions still resolve correctly with inlined contexts.

## Commands
Run these from the repo root:

```bash
npm run release:check
```

If you want the red/green breakdown explicitly:

```bash
./scripts/playwright-harness.sh red
./scripts/playwright-harness.sh green
```

## Visual review
- [ ] Review `artifacts/query-ui.png`.
- [ ] Review `artifacts/minimal-ui.png`.
- [ ] Confirm any user-facing copy changes match the screenshots.

## Documentation
- [ ] `README.md` reflects any new entry page, query hint, or plugin behavior.
- [ ] `docs/runtime-contract.md` matches the current browser bootstrap behavior.
- [ ] `docs/architecture-notes.md` reflects the current module split.
