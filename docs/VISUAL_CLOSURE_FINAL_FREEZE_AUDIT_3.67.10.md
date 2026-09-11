# DK Data Studio v3.67.10 · Desktop Visual Closure Final Freeze Audit

> **STATUS: REOPENED / SUPERSEDED FOR RELEASE APPROVAL (2026-08-31)**
>
> The R2 Windows Automation report below remains valid evidence that the Core ownership/renderer pipeline was machine-green, but subsequent Windows screenshots exposed a real Theme Provider visual regression: Thin Glass 1.10 and Aurora 2.2.3 over-emphasized ToolbarGroup/ToolbarAction composition and near-fullscreen elevated glass. Therefore this document is historical evidence only and no longer authorizes a v3.67.10 final release. See `docs/VISUAL_THEME_RECOVERY_WIP_3.67.10.md`.

## Scope

v3.67.10 closes Desktop visual ownership below the already frozen v3.67 Platform Presentation Architecture. It does **not** reopen the platform-neutral Presentation Model, add desktop/mobile Plugin APIs, or introduce new domain functionality.

The release target is a single visual ownership chain:

```text
Structure              -> geometry / layout
Component Appearance   -> canonical controls / component state
Material Renderer      -> semantic Surface / Chrome paint
Presentation           -> domain composition only
```

## Final ownership state

- authored CSS: 44 files, 0 `!important`;
- Presentation empty historical selectors: 0;
- ordinary Presentation literal UI paint is prohibited except bounded scientific interaction marks, modal scrim and QR-paper content semantics;
- `dkds-floating-surface` and `dkds-surface-elevated` resolve through canonical Material roles;
- nested chart/page headers use parent-owned Material chrome rather than a second nested Material sheet;
- Dialog, Settings, Portable, Import, LAN, Plugin DevTools, Plugin Manager, Scientific cards and Shell chrome no longer maintain duplicate outer-surface paint;
- canonical Chip and ToolbarAction appearance is single-owned by Component Appearance;
- a ToolbarGroup that is itself a Material owner does not directly repaint its Material background/border/shadow;
- Trend Legend is an internal transparent content region, not a nested Material Surface.

## Visual hard gate

`tools/quality/visual-invariants.js` now contains **38** hard visual invariants. They protect, among other things:

- 34 px topbar action height and 38 px group envelope;
- 48 × 34 px Presenter commands;
- exact centered 2 px selected halo;
- transparent Inspector dock host;
- Main Plot Tools / Legend 34 px outer geometry with equal 3 px inset;
- shared Portable/header/close geometry;
- non-portable Theme picker;
- parent-owned nested headers;
- no duplicate toolbar-group paint on Material owners;
- canonical Material/Component ownership rather than Presentation fallback paint.

## Automation 1.29.0

Windows diagnostics include `ui.visual-geometry-closure` and strict Theme Coverage. The release path is:

```text
npm run visual:closure:windows
  -> npm run check
  -> Electron --visual-closure
  -> Automation Runner 1.29.0
  -> dkds-automation-*.json
  -> tools/quality/verify-visual-closure-report.js
  -> deterministic exit 0 / 1
```

The report verifier fails closed on:

- old Automation runner;
- non-Windows/non-Desktop runtime;
- any report failure;
- Hard Visual Gate failure;
- visual geometry failure;
- Theme Coverage failure;
- `brokenMaterial > 0`;
- `occludedMaterial > 0`;
- `rendererOk !== true`;
- `appearanceOk !== true`;
- light/dark contrast issues.

## Windows Electron R2 acceptance

Acceptance report:

`dkds-automation-3.67.9-2026-08-31T06-19-15-074Z.json`

SHA-256: `0a9c4085f46252d0abc25ff5e2ff8e57de69b92a01e4228ae3040f79c0ae94fe`

Environment:

- Windows x64 / `win32`;
- Electron 43.4.0;
- Chrome 150.0.7871.224;
- Node 24.18.1;
- Automation Runner 1.29.0;
- source/development Electron (`isPackaged=false`).

Result:

- **47 PASS**;
- **0 FAIL**;
- **1 SKIP**;
- `ui.hard-visual-invariants` PASS;
- `ui.visual-geometry-closure` PASS;
- `ui.theme-material-renderer` PASS;
- `ui.theme-coverage` PASS;
- `plugins.external-packages` PASS;
- Theme Coverage `summary.ok=true`;
- `brokenMaterial=0`;
- `occludedMaterial=0`;
- `rendererOk=true`;
- `appearanceOk=true`;
- `lowContrastControls=0`;
- light contrast PASS;
- dark contrast PASS.

The single SKIP is `runtime.package-mode`: the validation ran from source/development Electron, so NSIS/portable resource layout is **not** claimed as covered by this Visual Closure audit. This is not a Desktop visual-contract failure and is explicitly preserved as a release note rather than silently converted to PASS.

Two conditional geometry branches were not exercised in that exact report because the required elements were not simultaneously visible: the full four-region Workspace grid and simultaneous ScientificCurve/ChartRuntime navigation parity. Their static architecture gates and source regression tests remain mandatory and passed; this audit does not misrepresent them as runtime-exercised states.

## Windows R1 findings closed by R2

R1 correctly failed and exposed issues that Linux/source tests had not caught:

1. chart/header hard-gate logic still expected a direct `chrome` role instead of parent-owned Material chrome;
2. Resonance Main Plot Tools combined `toolbarGroup` and `floating` Material semantics, allowing theme component paint to overwrite the Thin Glass surface;
3. one Core/plugin ownership test compared a POSIX-style relative path and therefore failed only on Windows separators;
4. a user-installed Pulse Sampler Plugin API 1.18 override conflicted with the bundled Plugin API 1.19 version.

R2 resolves all four without weakening Plugin API 1.19 or restoring duplicate Presentation paint.

## Final freeze constraints

After v3.67.10:

- do not reopen the v3.67 Presentation Contract for ordinary Desktop visual bugs;
- do not add domain selectors to Core Material/Component paint;
- do not add page-specific `!important` fixes;
- do not reintroduce private button/card/dialog palettes where a canonical Component or Material role exists;
- do not create separate desktop/mobile Plugin APIs;
- only extend Core when a genuinely missing cross-platform semantic/component capability is demonstrated.

## Final source validation

After the formal 3.67.10 version cutover and WIP cleanup, the release tree was rebuilt and validated from source:

- `npm test`: **223 / 223 PASS**;
- `npm run check`: **231 / 231 PASS**;
- Mobile suite: **12 / 12 PASS**;
- Hard Visual Invariants: **38 / 38 PASS**;
- SDK Harness: **PASS**;
- Scientific parity: **PASS**;
- D3 single-backend renderer: **PASS**;
- Plugin Manager lifecycle: **PASS**;
- Plugin manifests/packages: **17 / 17 PASS**;
- authored CSS: **44 files / 0 `!important`**;
- `git diff --check`: **PASS**.

The R2 Windows report also passes the repository's fail-closed `verify-visual-closure-report.js` gate.

## Release conclusion

The Desktop Visual Closure gate is satisfied for the source/development Electron release path. v3.67.10 is therefore the final visual-ownership freeze following v3.67.9 Desktop Visual Acceptance, subject to the explicit limitation that packaged NSIS/portable resource layout was not exercised by the R2 automation report.
