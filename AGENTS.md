# Repository Guidelines

## Project Structure & Module Organization
- Vite + Preact + TypeScript app.
- `src/`: application code
  - `components/`: UI (e.g., `Toolbar.tsx`, `Editor.tsx`, `LayerBuilder.tsx`, modals).
  - `lib/`: data/types, parsing, utils, state (signals).
  - `styles/`: Tailwind entry (`globals.css`).
  - Entrypoints: `main.tsx`, `App.tsx`.
- `public/`: static assets and sample data (e.g., `map-layers.json`, `favicon.svg`).
- `index.html`: Vite HTML template. `dist/`: build output.
- Config: `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `tsconfig*.json`.

## Build, Test, and Development Commands
- `npm run dev`: start Vite dev server with HMR.
- `npm run build`: production build to `dist/`.
- `npm run preview`: preview the built app locally.
- `npm run deploy`: build and publish `dist/` to GitHub Pages (`gh-pages`).

## Coding Style & Naming Conventions
- Language: TypeScript + JSX (Preact). Prefer functional components and hooks/signals.
- Indentation: 2 spaces; include semicolons; prefer single quotes.
- Naming: `PascalCase` for components/types; `camelCase` for variables/functions; files in `components/` use `PascalCase.tsx`, utilities in `lib/` use `camelCase.ts`.
- Keep side effects and DOM access inside components or `lib` helpers; avoid global state outside signals in `lib/jsonStore`.

## Testing Guidelines
- No automated tests yet. Manual flow:
  - Load JSON via “Open JSON…” or use `public/map-layers.json`.
  - Use toolbar: Validate, Format, Fix Missing Translations, Remove Unused, Download JSON.
  - Re-import the downloaded JSON to verify round-trip.
  - Monitor the status bar and browser console for errors/warnings.

## Commit & Pull Request Guidelines
- Commits: small, focused; imperative subject (e.g., "Add layer validation").
- PRs: description + rationale, screenshots/GIFs for UI changes, manual test steps, and linked issues if applicable.

## Security & Configuration Tips
- Runs locally; edits provided JSON only. Do not fetch remote resources by default.
- If adding remote previews/APIs, make them opt‑in and document CORS settings.
