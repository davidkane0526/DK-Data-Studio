# DK Data Studio v3.44.0 Verification

## Scope

v3.44.0 closes the remaining SUPER/TOP host-role transition gap. Promotion of a TOP plugin is now treated as a transaction rather than an eventual side effect of later prewarm synchronization.

## Host-role transition contract

- Before a TOP is embedded as SUPER, the owner renderer asks the main process to prepare the role change.
- Every live auxiliary renderer for the promoted activity is asked for one final role-transition snapshot.
- The owner merges returned project/plugin/artifact state before the dedicated renderer is retired.
- A role-transition snapshot suppresses duplicate close-time snapshots, preventing a late compatibility-window unload from rolling back freshly embedded state.
- The new SUPER preference is persisted only after embedded activation succeeds.
- If embedded activation fails, the previous SUPER and active activity are restored.
- A crashed auxiliary renderer is removed from the reusable-window cache and is rebuilt on the next open.

## Regression coverage

- Existing SUPER -> TOP -> SUPER architecture tests.
- Explicit host transition barrier before promotion.
- Failed SUPER activation rollback and preference preservation.
- TOP role-transition snapshot request/response bridge.
- Dedicated and compatibility auxiliary snapshot support.
- Renderer crash invalidation / reopen contract.
- Existing v3.43.0 dependency-derived TOP bootstrap checks remain active.

## Version

Application / project format producer / Resonance built-in plugin: `3.44.0`
