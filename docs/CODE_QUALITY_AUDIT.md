# Code quality audit — v3.61.84

## Release decision

The repository is usable, but historical UI work accumulated selector overrides and version-era regression assumptions. v3.61.84 is a structural cleanup checkpoint: no new product capability is added. The goal is to make ownership explicit before further visual work.

## Changes completed

- Electron host files live under `desktop/`; root host shims are removed.
- All executable regression tests live under `tests/` and use one manifest/runner.
- App, Plugin Kernel, UI Infrastructure and CSS bundles are generated from authored modules.
- Theme runtime is isolated under `src/core/theme/`; CSS filenames describe layer ownership rather than release chronology.
- Generated runtime bundles, indexes and derived PNG icons are ignored by Git and removed by `npm run clean:generated`.
- Historical per-version verification notes were removed; `CHANGELOG.md` is the single release-history source.
- Built-in plugin styles use the same manifest stylesheet lifecycle as packaged plugins.
- Generic Theme/Material code is prohibited from naming domain plugins.
- Status-bar and header actions follow one chrome-ownership model rather than late override blocks.
- Scientific parity tests use a checked-in v3.61.58 fixture rather than reading a moving Git branch, so clean source packages can validate without `.git`.

## Remaining debt

1. Authored CSS currently contains **1597** `!important` declarations (**663** in `src/styles/modern/`). This is still high because the modern layer must override older base styles. v3.61.84 freezes those counts as upper bounds in repository-hygiene tests: new work must reduce or hold the debt, never increase it. Future cleanup should migrate geometry/paint ownership out of legacy base selectors instead of adding another modern override.
2. `src/styles/base/` still contains historical domain-specific selectors. They are not Theme/Material authority, but should gradually move into the owning plugin or a semantic Core component as those workspaces are touched.
3. Some older regression tests verify implementation strings rather than runtime semantics. New tests must prefer public state, semantic selectors and observable behavior. Existing brittle tests should be corrected when they obstruct ownership cleanup.
4. Windows Electron/GPU visual validation remains a separate release gate for backdrop-filter, typography and layout. Automated source tests do not replace it.

## Non-negotiable repository rules

- Do not create `v3.61.xx`-named source/CSS files or append release-numbered hotfix sections.
- Do not add domain plugin names to `src/core/theme/` or Material composition CSS.
- Do not track generated runtime bundles or derived PNG copies.
- Do not add executable tests under `scripts/`.
- When several components need the same behavior, define a semantic Core/SDK contract and migrate callers to it; do not add a selector list for every known component.

Run `npm run check` before a release checkpoint and `npm run clean:generated` before producing a clean source handoff. The cleaned authored tree is about **6.5 MB** at this checkpoint; generated bundles and duplicate derived PNGs are not part of the handoff.
