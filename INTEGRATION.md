# Manager Page Builder integration

This package is additive. It contains:

- `manager.html`
- `manager.js`
- `functions/api/manager.js`

The page works with the existing `app.js`, `styles.css`, `functions/api/me.js`, OAuth functions, and CHPP version registry.

For full homepage/version integration in the live project:

1. Change the existing **Manager Page Builder** card in `index.html` from Coming soon to Available, add `<div class="tool-version" data-htwb-version="manager"></div>`, and point its action to `/manager.html`.
2. Add `manager: "0.1.0"` to `HTWB_VERSIONS` in `versions.js`.
3. Optionally add `achievements: "1.2"` to `HTWB_CHPP_VERSIONS` in `chpp-versions.js`. The manager endpoint has a `1.2` fallback, so this is not required for functionality.

Do not replace unrelated tool files when applying this package.

## Safe automatic integration

`apply_manager_builder.py` can patch a current project folder or ZIP in place while preserving unrelated files. For a ZIP, it writes a new archive with `-manager-builder` appended to the filename.
