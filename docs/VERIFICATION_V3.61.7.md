# DK Data Studio v3.61.7 Verification

## Release identity

- Application: `3.61.7`
- Plugin API / SDK: `1.14.0`
- Branch: `refactor/v3.61.7-host-import-action`

## Contract under verification

- Every workbench receives a Core-owned standard `导入数据` action.
- `data-dkds-slot="workbench-import"` only marks placement; plugin code does not own import UI.
- No-header and embedded-SUPER workbenches fall back to the host contextual action.
- Workbench-local import locks assignment to the current plugin and hides the global target chooser.
- API 1.14 workbenches filter Importer Providers by `manifest.data.accepts` versus provider `outputTypes`.
- Global Import keeps multi-workbench assignment routing.
- Pulse no longer owns a file/add-data action.
- Legacy API 1.10–1.13 workbenches remain compatible.

## Final verification results

All release gates passed on the final worktree:

```text
npm run check
npm test
npm run performance:test
npm run reactive:test
npm run sdk:test
npm run table-surface:test
npm run host-neutralization:test
node scripts/check-plugin-boundaries.js
node scripts/validate-plugins.js
git diff --check
```

The dedicated architecture regression `scripts/test-workbench-import-action-v3617.js` passed and is included in `npm run check`, `npm test`, and `npm run sdk:test`. Expected negative-test activation errors in plugin lifecycle/SUPER tests were observed and their enclosing tests passed.
