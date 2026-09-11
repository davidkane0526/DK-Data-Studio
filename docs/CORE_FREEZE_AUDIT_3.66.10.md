# Core Final Ownership Audit — v3.66.10

## Decision

v3.66.10 is a freeze-audit release. It does not add a new product feature. It closes the ownership regression introduced while refining the SMB dialog and turns the relevant architecture rules into early release gates.

## Ownership correction

The Core no longer paints `.dksmb-*` / `.dksvc-*` domain selectors. The Connectivity plugin keeps SMB geometry and business structure, while its regions declare generic Core semantic material roles:

- dialog → `elevated`
- navigation / connection strip → `sidebar`
- file browser / file list → `surface`
- path strip / footer → `chrome`

This preserves the flat, clearly zoned SMB layout without creating nested rounded cards and without teaching Core what an SMB window is.

`tools/quality/visual-invariants.js` now contains a domain-blind Core visual gate. Authored Core CSS may not paint first-party plugin identity selectors. The gate runs before start, test, check, dist and style generation.

## Typography closure

The shared Core typography floor is 10 px (`--ui-font-tiny`). Remaining authored Core literals below that floor were normalized to the shared token. The release gate rejects any future `font-size` literal below 10 px in authored Core styles.

## Large Core module review

The seven largest/most relevant authored Core modules were reviewed against the existing 48 KiB boundary:

| Module | Responsibility | Decision |
| --- | --- | --- |
| `src/core/plugins/kernel/modules/plugin-api.js` | assembles the public Plugin API facade | keep; one facade-construction owner |
| `src/core/scientific/chart-runtime.js` | canonical scientific chart runtime and presentation orchestration | keep; renderer-neutral chart contract remains one runtime owner |
| `src/core/scientific/plot-runtime.js` | ScientificPlot public/runtime bridge | keep; cohesive plotting contract |
| `src/core/ui/modules/scientific-curve/render.js` | ScientificCurve rendering | keep; rendering-only responsibility |
| `src/core/host/studio-kernel-runtime.js` | Studio Kernel tool registry | keep; registry/dispatch owner |
| `src/core/plugins/manager-ui.js` | Plugin Manager UI coordinator | keep; one feature coordinator |
| `src/core/scientific/d3-chart-renderer.js` | single D3 renderer backend | keep; backend-only responsibility |

All remain below 48 KiB. No file was split merely to reduce line count; there is no new compatibility bridge or forwarding layer.

## Freeze gates

The freeze baseline now requires:

1. zero authored `!important`;
2. no domain-plugin visual paint in Core styles;
3. first-party plugins may own domain geometry but not Core component paint;
4. no authored Core font literal below 10 px;
5. authored JavaScript modules remain below 48 KiB;
6. generated runtimes remain reproducible rather than authored;
7. every case registered in the `test` and `check` manifests must pass before a release handoff; CI may execute the same manifest in slices when a single process exceeds the host wall-clock limit.

Do not fix future screenshots by adding `.resonance-*`, `.ter-*`, `.pulse-*`, `.dksmb-*`, `.dkai-*`, `.data-center-*` or equivalent plugin-specific paint to Core. If a visual need is reusable, add/extend a semantic Core component or role; otherwise keep only domain geometry in the plugin.


## Validation

The v3.66.10 freeze audit completed all **217/217 `check` manifest cases** successfully. The `check` suite is a strict superset of the **209 `test` cases** (0 test cases missing from check). It also passed Mobile **5/5**, SDK Harness, scientific parity, Plugin Boundary **0**, style architecture (**41 authored CSS files, 0 `!important`**), plugin validation (**17/17**), Hard Visual Invariants **9/9**, and `git diff --check`. The local execution host has a per-call wall-clock limit, so the manifest was executed in ordered slices after one canonical build; this changes batching only, not the test cases or their arguments.
