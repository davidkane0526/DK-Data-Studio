# Project structure policy — v3.61.108

## Authored source

- `desktop/`: Electron and Windows host integration.
- `src/app/`: application composition source.
- `src/core/data/`: canonical data/entity/flow/formula/state contracts.
- `src/core/project/`: project format and history.
- `src/core/scientific/`: renderer-neutral scientific plot/pipeline/transform/algorithm runtimes.
- `src/core/plugins/`: plugin contract/module/manager/devtools plus the importable Plugin Kernel module graph under `kernel/modules/`; its runtime entry is declared in `kernel/composition.json`.
- `src/core/ui/`: semantic UI infrastructure plus the importable UI module graph under `modules/`; its runtime entry is declared in `composition/composition.json`.
- `src/core/theme/`: Theme runtime, Material renderer, coverage/debug utilities.
- `src/core/host/`, `services/`, `performance/`, `workflow/`, `recipes/`: cross-plugin Core responsibilities.
- `src/diagnostics/`: integration diagnostics across Core and plugins; diagnostics may know domain plugins, so they are explicitly outside Core.
- `src/migrations/`: isolated one-way compatibility adapters for old project/data formats; migration code must not flow back into the current Core model.
- `src/styles/foundation/`: reset/foundation rules.
- `src/styles/structure/`: geometry and structural contracts.
- `src/styles/presentation/`: shared visual component presentation.
- `src/styles/theme/`: Theme/Material ownership.
- `src/styles/platform/`: platform-specific adaptation.
- `src/plugins/`: built-in domain plugins and their manifest-owned `plugin.css` geometry.
- `src/science/`: UI-independent scientific code.
- `sdk/`: public plugin authoring contract.
- `tests/`: regression, architecture, boundary and performance tests.

`src/core/` itself must contain directories only. Do not add another generic runtime file at the Core root.

## CSS policy

The canonical cascade is declared in `src/core.css`:

```text
foundation < plugin < structure < presentation < theme < platform < window
```

Do not recreate `src/styles/base/` or `src/styles/modern/`. Do not use `!important`. Domain-plugin selectors do not belong in Core styles or mobile Core styles.

## Generated files

Runtime compositions, Plugin Index, SDK Authoring Reference and derived PNG assets are generated and ignored by Git. Build/test/start commands recreate them. Use `npm run clean:generated` before a source handoff.

Plugin Kernel, UI Infrastructure and the Application shell use independently addressable CommonJS modules. Their `composition.json` manifests declare module IDs/paths and one entry module, and the generator emits deterministic classic-script compatibility bundles under `src/generated/runtime/`. The 48 KiB authored-module limit remains enforced. Authored `.inc` runtime implementations are no longer used in these three graphs; Application cross-module imports are checked for both path resolution and exported-symbol compatibility.

## Dependency locks

Desktop and mobile are separate npm projects and should have separate lockfiles. A lockfile should be created or updated only by a successful dependency-resolution run, not synthesized by hand.

## Placement rule

Before adding a new file or selector, identify its owner. If the answer contains a domain plugin name, it generally does not belong in Core. If several plugins need the same behavior, add a semantic Core/SDK contract first and make plugins opt into that contract.
