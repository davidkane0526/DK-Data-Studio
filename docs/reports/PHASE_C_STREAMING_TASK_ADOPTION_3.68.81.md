# Phase C — Analysis Task Adoption + Streaming Native Import (3.68.81 WIP)

## Scope

3.68.81 finishes the first-party heavy-analysis migration onto the bounded Core Task Runner introduced in 3.68.80, then implements Phase C step 8: tokenized/chunked native file reads with bounded in-flight chunks, cancellation, backpressure, and the first streaming importers.

## Analysis execution

The following first-party packages now declare `execution.tasks` and at least one manifest-owned task worker:

- Pulse Analysis: pulse read analysis and batch/provider execution.
- Pulse Sampler Tool: steady-state extraction.
- Resonance Detector Robust: peak detection and peak metrics.
- Resonance Workbench: resonant TER used by grouped scientific views.
- Standard Transport Algorithms: TER high/low resistance matrix computation.
- TER Analysis: resonant TER helper; its main TER algorithm resolves through the task-backed Standard Transport provider.
- Transfer Vth Lab: Vth extraction.

Task dependencies are declared through `manifest.tasks[].imports`; built-in export, CLI packaging, package validation and external `.dkplugin` execution use one shared referenced-asset contract. Plugins do not create private `Worker` / `SharedWorker` pools. Plugin scheduler lifecycle also remains Core-owned.

The existing synchronous ScientificTransforms curve/scalar projection contract is intentionally not replaced by a second asynchronous transform API in this patch. The expensive analysis paths above are task-backed; lightweight display transforms continue to satisfy the current synchronous transform contract.

## Native file-read pipeline

Core policy:

- chunk size: 256 KiB;
- Desktop maximum in-flight reads: 2;
- React Native Mobile maximum in-flight reads: 1;
- host maximum is also respected;
- `AbortSignal` stops delivery and closes the read token;
- `await onChunk` / `await onLines` is the backpressure boundary;
- decoding uses streaming `TextDecoder`;
- line framing carries incomplete trailing text to the next chunk.

Import Workbench uses at most 384 KiB for initial text inspection. A provider that implements `createStreamParser()` receives line batches during the final import instead of requiring one complete source string.

Android SAF no longer opens a new `InputStream` and skips from byte zero for every chunk. A native read-session token retains one sequential stream for the import lifetime. Folder selection registers document URIs into the same tokenized file store instead of materializing every selected file as a full Base64 payload in the WebView.

## Streaming importers

- Flexible Text Import 1.3.0: text formats use a columnar streaming parser. JSON remains full-materialized because generic JSON streaming would require a separate format-correct contract.
- Pulse Text Import: line-batch parser uses the same Core streaming importer contract.

No Artifact is published until a file parser has finished successfully. Cancelling a stream therefore cannot leave a partially imported canonical Artifact set.

## Large-file measurement

Development-session measurement on a synthetic 250,000-row (~7.6 MB) transport text file, comparing the previous full-text/object-heavy parse with the 3.68.81 streaming columnar parser:

| Path | Elapsed | Peak heap | Peak RSS |
| --- | ---: | ---: | ---: |
| Full-text parse | ~1545.6 ms | ~225.1 MiB | ~258.4 MiB |
| Streaming columnar | ~1247.6 ms | ~48.9 MiB | ~79.6 MiB |

Observed reduction: about 4.6x lower peak heap and 3.25x lower peak RSS, while preserving dataset count, point count, and first/last numeric values. These figures are environment-specific trend evidence, not cross-device performance guarantees.

During this work the old full parser also exposed a scale bug: spread-based `Math.max(...largeArray)` / `Math.min(...largeArray)` could overflow the argument stack around this workload. The affected aggregation was changed to linear accumulation without changing numeric semantics.

## Regressions caught during integration

- Pulse Analysis asynchronous restore originally queued analysis before source hydration; results could resolve into detached item objects. Restore now hydrates current state first and schedules missing legacy results against current items.
- Resonance `feature-runtime.js` exceeded the 48 KiB authored-module limit after task integration. Resonant TER scheduling/cache ownership was extracted into `feature-ter-runtime.js`; the coordinator is again below the limit.
- Transfer Vth Lab initially used raw `queueMicrotask()` after asynchronous result resolution. It now uses Core-owned `ctx.ui.dom.microtask()`.
- CLI plugin packaging initially omitted `tasks[].entry/imports`; all packaging/validation paths now share `referencedPluginAssets()`.
- Several historical tests encoded synchronous provider assumptions or hand-built module/asset lists. They were updated to execute the current async/task contract rather than reintroducing runtime fallbacks.

## Validation

Final source state:

- `npm test`: 347/347 PASS
- `npm run check`: 354/354 PASS
- `npm run mobile:test`: 73/73 PASS
- clean-source `npm run mobile:test` after deleting generated artifacts: 73/73 PASS
- SDK Test: PASS
- SDK Harness: PASS
- Performance suite: PASS
- Scientific parity: PASS
- Hard Visual Invariants: 87/87 PASS
- Architecture Hygiene: PASS
- Native Analysis strict audit: PASS, orphan=0
- Plugin Boundary: 0
- Plugin manifests/packages: 17/17 PASS
- authored CSS: 45 files, 0 `!important`

## Remaining Phase C boundary

This step does not yet replace canonical in-memory Artifact arrays with a physical chunk/typed-buffer store. Full-resolution export, undo/save/restore and current canonical precision remain unchanged. JSON and any importer without `createStreamParser()` continue to use a full-text parse path by design.
