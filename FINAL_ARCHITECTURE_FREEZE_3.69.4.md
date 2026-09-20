# DK Data Studio 3.69.4 — Final Architecture Freeze / Archive Audit

## Decision

DKDS **3.69.4** is the long-term source archive baseline for the completed **Phase A–E** architecture sequence.

The formal Phase E interoperability contract remains frozen at **3.69.0**. Releases 3.69.1–3.69.4 are bounded post-freeze maintenance repairs only. They do not add another Interaction channel, broaden Selection payloads, weaken project/link-group transaction isolation, add a compatibility bridge, create a plugin-specific Core interoperability path, or move heavy scientific computation back to the main thread.

On 2026-09-11 the project owner confirmed on the real Android device that the previously blank Resonance **FWHM / peak-height A / peak-area S** GroupArea cards populate correctly in 3.69.4. This closes the final real-device acceptance boundary for the archive.

## Phase closure

### Phase A — data and cache correctness

Complete. Canonical Artifact mutation remains versioned, Pipeline cache identity includes owner/stage/version/input/parameters, in-flight work is shared safely, failures are evicted for retry, and typed scientific inputs are normalized at the data-model boundary.

### Phase B — deterministic layout ownership

Complete. Layout intent and effective geometry are separated, SplitController owns native split behavior, hidden/zero-size surfaces do not overwrite user preference, scroll policy is explicit, and normal operation does not depend on whole-subtree recovery scans.

### Phase C — scalable Artifact storage and execution

Complete. The archive includes stable Artifact fingerprint/revision semantics, Store-owned column buffers and transactions, metadata-only enumeration, bounded range reads, incremental lineage/buffer revisions, bounded Core Task Runner execution, streaming native reads/importers, and typed physical backing for dense scientific payloads while preserving the public serializable Artifact contract.

### Phase D — rendering, data and automation capability

Complete. ScientificPlot invalidation is split by data/geometry/theme/selection, large SVG displays use stable bounded display sampling, large scalar fields use an independent raster owner, Theme revision is selective, and domain commands follow one validated Core route for UI/script/MCP execution.

### Phase E — cross-view interoperability

Complete and formally frozen. Selection / Viewport / Legend use the existing project-scoped Interaction transport with explicit channel/link-group/transaction isolation; table/curve and heatmap/source-scan reference selection preserve stable identity; scientific axis linking requires explicit dimension/unit compatibility; viewport and legend linking are bounded and opt-in; plugin warm-hide/unload/cold-release have deterministic teardown semantics; sorting/filtering/sampling preserve source identity; linked-view bridge fan-out and transaction history are bounded.

## Post-freeze maintenance closure

3.69.1–3.69.4 repair device-reported regressions without reopening Phase E:

- 3.69.1: Mobile GroupArea settled-wave reprojection, Data Center four-command row, native compositor floating drag.
- 3.69.2: bounded Resonance peak-metric batching under the Core Task Runner.
- 3.69.3: stable peak metric identity/epoch isolation and Core Blob Worker transport hardening.
- 3.69.4: one self-contained Core-owned scientific Worker blob, eliminating nested Blob/file `importScripts()` on the Android WebView path while retaining canonical science-source ownership.

The scientific `baseline-fwhm-v1@1.0.0` definition is not changed by these maintenance releases.

## Architecture / cleanliness invariants

The archive is accepted only while the following remain true:

- Core is domain-neutral; first-party plugins do not receive private host privileges.
- Historical project compatibility is isolated to `src/project-importers/compatibility-gateway.js`.
- Plugin API runtime facades are singular and current; no deprecated alias/shim/fallback runtime path is retained.
- Generated runtime/index/authoring outputs are reproducible and are not source of truth.
- Authored renderer CSS has one semantic owner and **0 `!important`**.
- Core-managed layout geometry remains Core-owned; plugins express semantic/configuration intent through current contracts.
- Theme/Material ownership remains Role → Recipe → Tokens; plugin/domain styles do not override Core generic paint ownership.
- Heavy scientific tasks use the bounded Core Task Runner; first-party plugins do not own a second Worker pool.
- Phase E has one existing cross-scope bridge, multiplexed by explicit channel; there is no second global Interaction bus.
- Resource/listener teardown is lifecycle-owned and bounded.

## Archive boundary

This is a **clean source archive**. It must not contain:

- `.git` history;
- `node_modules`;
- generated `mobile/android` or `mobile/ios` projects;
- `mobile/assets/web` build output;
- disposable `src/generated/runtime/*`, plugin index or generated SDK authoring output.

Supported build/test entry points regenerate required disposable outputs from authored source.

## Version contracts

- App: **3.69.4**
- Android `versionCode`: **130**
- Core Task Runtime: **1.1.0**
- SDK: **1.47.0**
- Plugin API: **1.19.0**
- Theme Contract: **3.10.0**
- Formal Phase E freeze: **3.69.0**

## Future development rule

Treat 3.69.4 as the archive branch point. Demonstrated maintenance fixes may be applied carefully without broadening frozen contracts. New capability work, especially new cross-view channels, new public Core/SDK abstractions, or reopened architecture boundaries, should begin under an explicit **3.70.x** plan rather than silently extending the archived 3.69.x phase.

## Final validation

The final archive source passes:

- `npm test`: **374 / 374**;
- `npm run check`: **381 / 381**;
- Mobile: **100 / 100**;
- clean-source Mobile bootstrap: **100 / 100**;
- Performance / SDK / SDK Harness / Scientific parity: **PASS**;
- Hard Visual Invariants: **87 PASS**;
- Architecture Hygiene / Native Analysis strict: **PASS**;
- Plugin manifests/packages: **17 / 17**;
- authored CSS: **45 files / 0 `!important`**.

After those gates, generated products were removed again. The archived 3.69.4 baseline remains the historical freeze point. Current post-archive continuation is documented by the single current root handoff for the active 3.70.x line; the historical freeze claims above are intentionally unchanged.
