# Repository Guidelines

## Project Structure & Module Organization
- `index.html`: Single-page app hosting the editor UI.
- `css/styles.css`: Styles for layout, wizard, and status pills.
- `js/`: Vanilla JS modules
  - `app.js`: App bootstrap and high-level actions (refresh, load, sync, prune, download).
  - `wizard.js`: Multi-step feature wizard (create/edit, validation, save).
  - `ui.js`: UI controller (status, summaries, stats, editor binding).
  - `features.js`: Feature browser (lists, edit/delete hooks).
  - `intl.js`: Internationalization status panel per locale.
  - `state.js`: In-memory app state and wizard state.
  - `utils.js`: Helpers (JSON parsing, id collection, slugging).
- `map-layers.json`: Example data file used by the editor.

## Build, Test, and Development Commands
- Static app, no build step. Open locally or serve a folder.
  - Quick serve: `python3 -m http.server 8000` then visit `http://localhost:8000/`.
  - Or open `index.html` directly in a browser.
- Manual validation in-app:
  - Use buttons: “Validate JSON”, “Format JSON”, “Fix Missing Translations”, “Remove Unused”.

## Coding Style & Naming Conventions
- Language: Vanilla JavaScript (ES2015+), no framework.
- Indentation: 2 spaces; include semicolons; single quotes for strings.
- Naming: `PascalCase` for classes, `camelCase` for variables/functions.
- Files: lowercase, concise (e.g., `utils.js`, `wizard.js`).
- Keep DOM operations simple and contained; avoid global leakage beyond defined classes.

## Testing Guidelines
- No automated tests yet; rely on manual flows:
  - Load `map-layers.json` via drag-and-drop or file picker.
  - Create/edit a feature in the wizard; associate layers; review validation.
  - Check i18n tab per locale and run “Fix Missing Translations”.
  - Download JSON and re-import to verify round-trip.
- Aim for clear error/status messages and zero console errors.

## Commit & Pull Request Guidelines
- Commits: small, scoped changes with imperative subject lines (e.g., "Add layer validation to wizard").
- PRs: include
  - Summary of changes and rationale
  - Screenshots/GIFs for UI changes
  - Steps to reproduce/test (manual)
  - Linked issue(s), if applicable

## Security & Configuration Tips
- The editor runs locally and manipulates provided JSON only; avoid adding code that fetches remote resources by default.
- Be mindful of CORS if introducing remote previews; keep them optional and configurable.
