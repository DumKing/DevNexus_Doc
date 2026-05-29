# Repository Guidelines

## Project Structure & Module Organization

This repository is the standalone documentation and product website for DevNexus. Source files live in `src/`: `index.html` is the static entry point, `main.js` drives localization and page behavior, `styles.css` contains site styling, `assets/` stores icons, and `data/plugin-toolbox.json` defines homepage plugin cards. Build and preview helpers live in `scripts/`. Generated output is written to `dist/` and must not be committed. GitHub Pages deployment is configured in `.github/workflows/deploy.yml`.

## Build, Test, and Development Commands

- `npm run build -- D:\rdmm`: builds `dist/` from a local DevNexus checkout. The source checkout must contain `README.md`, `docs/releases/*.md`, and optional `.qoder/repowiki/...` content.
- `npm run build`: builds from `DEVNEXUS_SOURCE_DIR` or the default `D:\rdmm`.
- `npm run preview`: serves `dist/` at `http://localhost:58710/`.

Use Node.js 20 or newer. There are no runtime dependencies currently, so `npm install` is only needed if dependencies are added later.

## Coding Style & Naming Conventions

Use CommonJS for scripts in `scripts/*.cjs` and browser JavaScript in `src/main.js`. Keep indentation at two spaces in HTML, CSS, JSON, and JavaScript. Prefer descriptive camelCase function and variable names, matching existing helpers such as `buildReleaseIndex` and `markdownToHtml`. Keep generated assets under `dist/`; edit the source files in `src/` or `scripts/` instead.

## Testing Guidelines

No formal test framework is configured. Validate changes by running `npm run build -- <DevNexus-source-path>` and checking for a successful build summary. For UI or content changes, run `npm run preview` and inspect the homepage, docs center, release pages, language switcher, and plugin cards. When editing `src/data/plugin-toolbox.json`, confirm the JSON parses by rebuilding.

## Commit & Pull Request Guidelines

The current history only contains `Initial commit`, so no strict convention is established. Use concise, imperative commit subjects such as `Update release timeline layout` or `Add MQ plugin card`. Pull requests should describe the website or build change, list the DevNexus source ref used for validation, link related DevNexus issues or releases when relevant, and include screenshots for visible UI changes.

## Security & Configuration Tips

Do not commit tokens or local checkout paths. The release dispatch flow depends on `DEVNEXUS_DOCS_TOKEN` in the DevNexus repository, not in this repo.
