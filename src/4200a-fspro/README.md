# FS-Pro / 4200A rebuild preview — current implementation

**Branch:** `feat/4200a-fspro-rebuild` on DKDS `4200` baseline. **Status: standalone UI prototype; NOT released, NOT instrument-enabled.**

## Launch the Windows UI preview

From the repository checkout with the normal DKDS Electron dependencies installed:

```powershell
npx electron desktop/4200a-fspro-main.cjs
```

This opens the dedicated `src/4200a-fspro/index.html` without loading DKDS's unrelated analytical plugins. A browser may also open this HTML file directly; append `?open=edit` to view Edit Page immediately.

**Implementation:** This isolated screen loads DKDS `core.css`, theme contract, semantic registry, component runtime and style-ownership gate from the same repository. FS-Pro-specific geometry lives in one `editor.css` owner and parameter/state composition in `editor.js`. It does not import the legacy DKTS UI or old plugin application. `window.DK4200FSPro` exposes only read-only model access, local validation, and a preview-only module inventory injection method. There is **no KXCI output bridge** in this prototype.

## Completed in the prototype

- Main menu (File/Instruments/Measurement/Tools/Window/Help) with trigger-anchored menus and an initially empty Visual Area 2x2 Frame grid.
- Nested Project > Device > Routine > Page/Spec navigation; main Measure and Repeat disabled.
- Edit Page Info row; Lock/Unlock, Reset, Set Connection, AutoScale and UnScale **in original order**. AutoScale and UnScale disabled until supported source/range semantics are defined.
- Sweep > Target > Strategy tabs, with independent draft editing, Cancel rollback and Save.
- Sweep rows for four template terminals, Xsweep/Psweep exclusivity, per-terminal source mode, relative references and segment +/- controls; Limits/Page Var/Associate Spec bottom triptych.
- Target formula text draft (not executed) and Plot X/Y/H/P; Strategy global/local, integration and delay, and editable per-terminal auto/fixed range fields.
- Separate Connection editor; resource list defaults to None until injected with an instrument-discovered inventory; no fabricated installed SMU options.
- JSON import/export with offline model validation. No imitation measurement curves or native-data claims.
- DKDS component semantic hydration, desktop and responsive narrow-width CSS.

## Automated checks

- `node tests/test-4200a-page-plan-guard.cjs`: offline typed PagePlan safety/role/reference assertions.
- `node tests/test-4200a-release-contract.cjs`: single manifest validation and hot/full selection; **signature verification itself is not implemented** and must be supplied by a pinned-key verifier before any downloads are applied.
- `tests/test-4200a-ui-visual.cjs`: headless Chromium route, assertions and six screenshot files. CI workflow `.github/workflows/4200a-fspro-contract.yml` is set to generate uploadable screenshots. **Do not claim this visual acceptance has passed until the CI artifact was inspected.**

## Screenshot evidence target

- `01-main-workspace.png`
- `02-edit-page-sweep.png`
- `03-edit-page-target.png`
- `04-edit-page-strategy.png`
- `05-set-connection.png`
- `06-edit-page-narrow.png`

Compare them side by side against the **user-supplied** V6 manual screenshots at a matched viewport. Source screenshots intentionally are not checked into Git to avoid redistributing manual extracts.

## Acceptance tracking (V6 IDs)

| Item | Current state | Remaining gate |
|---|---|---|
| UI-001–004 | Implemented structurally | Screenshot and plot-host check |
| UI-005–006 | Nested device/routine/page/spec visible; Quick/Wafer omitted under personal-lab scope | Context menu + Quick Project entry not done |
| UI-007–011 | Implemented structurally | Visual geometry inspection and input accessibility |
| UI-012 | Offline role validator implemented | Check multi-page/sweep plan lifecycle |
| UI-013–015 | Segment controls; Limits/Page Var/Spec; compliance label mapping | Native mode-specific range/limit interpretation |
| UI-016–018 | Target and Strategy controls | Target expression evaluation and measurement strategy compiler |
| UI-019–020 | Independent Connection dialog and warning | Native module discovery and shared-preset persistence |
| UI-021–022 | Buttons/Frames visibly present; hardware actions disabled | Native data ingestion and DKDS plot binding |
| UI-023 | Not implemented | DKDS scientific plot widget and native data viewer |
| UI-024–029 | Not implemented | IVT, PMU, pulse, waveform, stress UI and hardware backends |
| UI-030 | Responsive CSS implemented | Android WebView screenshot and interaction testing |
| UI-031–032 | Unknown modules hidden from selectable resources; unsupported controls disabled | Real module lookup and comprehensive capability reasons |
| UI-033–035 | CI browser capture/tests authored | Verify actual CI screenshots and complete control-to-TestPlan mapping |

## Update architecture status

`src/4200a-fspro/update/release-contract.js` defines a **single manifest schema** and offline `decideUpdate` policy:
- same nativeVersion and nativeAbi, newer UI -> hot-update resource;
- changed native version/ABI -> platform installer;
- older release/unsupported platform/unverified signature -> blocked or no-op.

This is **NOT** a deployed stable manifest URL, updater, signed release, hash-checked download, rollback mechanism or Android installer. Those require an actual host integration, stable endpoint, fixed signing keys and production CI. Do not describe the current module as a working in-app updater.

## Next implementation boundary

1. Inspect generated CI screenshot artifacts and correct geometry against the V6 references.
2. Build real DKDS ScientificPlot Frame host and original raw-data viewer (empty until instrument data).
3. Connect trusted module inventory and source-limit capability database to these forms.
4. Implement KXCI compiler, stop and raw-data acquisition behind an instrument-exclusive safety broker; separately verify on a real 4200A before enabling Measure.
5. Package distinct native shells and deploy a single published update-feed endpoint and signed/verified release pipeline.
