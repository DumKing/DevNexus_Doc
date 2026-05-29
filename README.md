# DevNexus_Doc

Standalone product website and documentation center for [DevNexus](https://github.com/DumKing/DevNexus).

The site is intentionally separated from the desktop app repository. It reads documentation from a DevNexus source checkout and generates a static GitHub Pages artifact.

## Local Build

```powershell
npm run sync:source -- D:\rdmm
npm run build -- D:\rdmm
npm run preview
```

The build copies `src/` to `dist/`, then generates `dist/content/` from:

- `README.md`
- `README_EN.md`
- `docs/releases/cn/*.md`
- `docs/releases/en/*.md`
- `.qoder/repowiki/zh/content/**/*.md`
- `.qoder/repowiki/en/content/**/*.md`

Plugin cards on the homepage are generated from `src/data/plugin-toolbox.json`. When DevNexus adds a new plugin, append one bilingual item to that file and rebuild the site.
Release timeline and latest-version source data are generated into `src/data/release-timeline.json` and `src/data/site-metadata.json` by `npm run sync:source -- <DevNexus checkout>`.

## Release Trigger

The DevNexus release workflow dispatches `devnexus-release` to this repository. The Pages workflow checks out the matching DevNexus tag and rebuilds the website so README, release notes, and RepoWiki stay aligned with the released app.

Required secret in `DumKing/DevNexus`: `DEVNEXUS_DOCS_TOKEN`, a token allowed to create repository dispatch events for `DumKing/DevNexus_Doc`.

When this repository receives `devnexus-release` or a manual `workflow_dispatch`, the deploy workflow also updates and commits `src/data/release-timeline.json` and `src/data/site-metadata.json` back to `main` before publishing Pages. If `main` is protected by a ruleset, allow GitHub Actions or `DEVNEXUS_DOCS_TOKEN` to update `main`; otherwise the source-data commit will be blocked even though the Pages build logic is valid.

## License

Apache License 2.0. See [LICENSE](LICENSE).
