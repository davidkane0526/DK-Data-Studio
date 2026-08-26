# Project structure policy

## Authored source

- `desktop/`: Electron and Windows host integration.
- `src/app/`: application composition source.
- `src/core/plugin-kernel/`: plugin lifecycle/package composition source.
- `src/core/ui-infrastructure/`: domain-neutral UI infrastructure.
- `src/core/theme/`: Theme runtime, Material renderer, coverage/debug utilities.
- `src/styles/base/`: base layout and compatibility layer.
- `src/styles/modern/`: modern semantic visual layer; filenames are ordered by responsibility.
- `src/plugins/`: built-in plugins. Plugin-specific layout and domain CSS stay here or are expressed through semantic Core classes.
- `src/science/`: UI-independent scientific code.
- `sdk/`: public plugin authoring contract.
- `tests/`: all executable regression/contract tests.

## Generated files

Generated runtime bundles and derived assets are intentionally ignored by Git. Build/test/start commands recreate them. Use `npm run clean:generated` before creating a source handoff.

## Dependency locks

Desktop and mobile are separate npm projects and should have separate lockfiles. A lockfile should be created/updated only by a successful dependency-resolution run, not synthesized by hand.

## Code placement test

Before adding a new file or rule, ask which layer owns it. If the answer contains a plugin name, it generally does not belong in Core. If several plugins need the same behavior, add a semantic Core/SDK contract first and make plugins opt into that contract.
