# DK Data Studio v3.67.21 — Pre-Mobile Repository Hygiene Audit

## Scope

This checkpoint keeps the v3.67.20 Desktop/Core architecture frozen and cleans the **source-delivery boundary** before the next Mobile UI development phase. The goal is to reduce repository/archive weight without deleting live source, regression coverage, Git history, or valid runtime/build dependencies.

## What was actually removable

The largest removable files in the delivered source ZIP were deterministic products that were already declared generated/ignored:

- `src/generated/runtime/app.js`
- `src/generated/runtime/ui-infrastructure.js`
- `src/generated/runtime/plugin-kernel.js`
- `src/generated/plugin-index.js`
- `src/generated/sdk-authoring-reference.js`
- `assets/dkds-icon.png`
- `mobile/assets/icon.png`
- `mobile/assets/adaptive-icon.png`
- `mobile/assets/web/` when present

These are not canonical source. They are recreated from the maintained source graph by `npm start`, `npm test`, `npm run check`, build commands, and Mobile synchronization.

### Packaging correction

`tools/windows/package-clean-project.ps1` now excludes those reproducible products from a clean development ZIP instead of copying ignored build products merely because they happen to exist in a working directory.

### Fresh-checkout Mobile correction

`mobile/scripts/sync-web-assets.js` now runs `generate-runtime-compositions.js` before copying `src/` into the Android WebView bundle. A fresh clone therefore no longer depends on ignored renderer bundles left behind by a previous Desktop test/start session.

## Brand asset cleanup

`assets/dkds-icon-source.png` was losslessly recompressed at identical dimensions and pixels. Pixel comparison is exact; only PNG encoding changed.

- Previous source PNG: approximately **840 KiB**
- Recompressed source PNG: approximately **624 KiB**
- Visual/alpha content: **unchanged**

Generated desktop/mobile PNG copies remain reproducible and are not shipped in the clean source ZIP.

## Direct dependency audit

No live direct dependency was deleted merely to make the ZIP smaller. Static ownership/use review shows that every declared direct dependency still has a real runtime/build responsibility.

### Desktop/root

| Dependency | Ownership / use |
| --- | --- |
| `d3` | sole scientific renderer backend; loaded by renderer and Mobile web bundle tooling |
| `electron-updater` | Desktop update client |
| `ws` | Desktop update-client transport and LAN update server |
| `qrcode` | Desktop LAN/service QR generation |
| `electron` | Desktop runtime / preload / visual closure |
| `electron-builder` | Windows packaging |

### Mobile

The current direct set is also all consumed: Expo base, Clipboard, FileSystem, NavigationBar, Sharing, StatusBar, DocumentPicker fallback, Blur, React/React Native, SafeArea, WebView and D3 bundling; TypeScript and React types are required development dependencies.

**Conclusion:** dependency count is already lean. Removing any current direct dependency would remove an active capability or build path. Future Mobile dependencies should be added only for an explicit capability and the v3.67.21 hygiene gate will force that change to be deliberate.

## What was deliberately kept

- full `.git` history and refs;
- all tests/regression gates;
- scientific parity fixtures;
- Core/Plugin/Presentation architecture docs still referenced by current tests/contracts;
- SDK templates/tools and external validation examples;
- current Desktop/Core archive audit;
- source brand icon and generated-asset generator;
- Windows shared dependency/cache tooling.

The project is therefore smaller because **reproducible products are no longer delivered**, not because validation or historical source was discarded.

## Regeneration contract

A clean source archive is expected to omit generated products. Supported entry points recreate them:

- `npm start` → `prestart` → `scripts/prepare-dev-start.js`
- `npm test` / `npm run check` → runtime/theme/plugin generation before test execution
- `npm run dist` → build generation
- `npm run mobile:sync` / Mobile prebuild → Mobile sync now regenerates Core runtime compositions before copying source

A clean-start simulation was executed by deleting all generated runtime/icon products and running `node scripts/prepare-dev-start.js`; all required generated groups were recreated successfully.

## Validation

Completed after source changes:

- `npm test`: **237/237 PASS**
- `npm run check`: **245/245 PASS**
- Mobile: **12/12 PASS**
- SDK Harness: **PASS**
- Scientific parity: **PASS**
- Renderer tests: **PASS**
- Plugin Manager tests: **PASS**
- Hard Visual Invariants: **81/81 PASS**
- authored CSS: **44 files / 0 `!important`**
- plugin packages: **17 PASS**

A new `test-v36721-pre-mobile-repository-hygiene.js` gate protects the minimal direct dependency sets and clean-source generation contract.

## Architecture status

No Core/Plugin/Presenter boundary was reopened. SDK remains:

- SDK **1.24.0**
- Plugin API **1.19.0**
- Theme Contract **3.10.0**

This checkpoint is intended to become the **clean pre-Mobile development baseline** after final validation and packaging.
