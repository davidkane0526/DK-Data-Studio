# Branching Model

## Current repository history

The repository was initialized from the complete v3.14 source tree.

- `main`
  - commit: the untouched v3.14 baseline;
  - tag: `v3.14.0-main-baseline`;
  - purpose: stable historical baseline requested by the user.

- `plugin`
  - created from `main`;
  - purpose: plugin architecture, future scientific workflows, responsive/touch groundwork.

The repository is delivered with `plugin` checked out.

## Rules

Do not treat `plugin` as a rename of `main`. They are intentionally different lines of development.

Recommended future flow:

```text
main (preserved v3.14 baseline)
 \
  plugin
    ├─ feature/plugin-foo
    ├─ feature/plugin-bar
    └─ fix/plugin-host-...
```

For a new plugin:

```bash
git switch plugin
git switch -c feature/<plugin-name>
# implement plugin
npm test
git commit
git switch plugin
git merge --no-ff feature/<plugin-name>
```

Only merge into `main` when explicitly requested.

## Current delivery checkpoint

The current plugin-branch delivery is `v3.22.1` (shared Windows toolchain/cache + compact DK application identity, built on the v3.21 plugin-window shell). `main` remains unchanged at `v3.14.0-main-baseline`.
