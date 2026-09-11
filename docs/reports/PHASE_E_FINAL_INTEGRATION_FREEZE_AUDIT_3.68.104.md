# Phase E Final Integration / Freeze Audit — DKDS 3.68.104 WIP

## Scope

This pass is a final-integration audit of the already implemented Phase E interoperability path. It does not add another global bus, Interaction channel, public SDK capability, compatibility layer, or plugin-specific Core branch. The audit is limited to:

1. Selection / Viewport / Legend mixed-transaction isolation.
2. Project and link-group leakage.
3. Plugin unload, warm-hide and cold-release teardown/quiescence.
4. Stable artifact / series / source-row identity after sort, filter and display sampling.
5. Bounded memory/listener behavior with many linked views.

A device-reported UI defect is fixed in the same WIP before the audit: the Mobile parameter drawer must be only as wide as required to keep the Pulse Vd/Vs/Vg row and width-critical actions complete.

## Finding A — mixed transaction dedupe was too coarse

### Previous behavior

`InteractionRuntime.seenTransactions` was keyed only by `transactionId`. Selection, Viewport and Legend share the same bounded Interaction bridge but are independent channels. A reused transaction ID could therefore cause a valid event on another channel to be rejected. The same cache could also falsely suppress a transaction after the active project changed or when the same ID occurred in another link group.

### Correction

The internal dedupe identity is now:

`projectId + channel + linkGroup + transactionId`

The external transaction schema is unchanged. A true duplicate inside the same project/channel/group remains suppressed before mutation, preserving A→B→A cycle prevention. The same ID on another channel, project or link group remains independent.

### Evidence

`tests/test-v368104-phase-e-final-integration.js` applies one transaction ID through Selection, Viewport and Legend, repeats each duplicate, switches projects and switches link groups. Independent legs apply once; exact duplicates are suppressed.

## Finding B — warm-hide suspended plots/resize but not Interaction transport

### Previous behavior

A reusable Dedicated TOP window hid its resize and scientific rendering work, but live `InteractionRuntime` subscriptions could still receive linked Selection/Viewport/Legend state while the window was hidden. This was not a memory leak, but it violated the intended warm-cache contract because hidden UI could continue cross-view state work.

### Correction

`PluginScope.lifecycle('hidden')` now suspends every owned `InteractionRuntime` before suspending resize/render work. Hidden runtimes retain their ref-counted subscriptions for fast reuse but neither consume remote linked state nor rebroadcast local state. On show, scientific rendering and resize resume first, then Interaction transport resumes.

`DKDSUI.lifecycleSnapshot()` and diagnostics now expose aggregate Interaction lifecycle state. Dedicated TOP lifecycle diagnostics require Interaction runtimes to be suspended together with resize/plots.

### Unload and cold release

Plugin deactivate still executes all registered cleanup functions in reverse order, including `infrastructureScope.dispose()`, then clears lifecycle registries. Interaction runtime `dispose()` removes selection/state links, local listeners, view bindings and the bounded transaction cache.

Explicit cold release already removed a window from the reuse map synchronously before closing it. This audit corrects its result reporting: `released` now counts only windows whose close wait confirms destruction, while `requested` and `pending` preserve the requested/unfinished counts. A timed-out close is no longer reported as successfully released.

## Finding C — source-row identity could be renumbered by presentation order

### Previous behavior

Core-rendered tables attached `data-dkds-source-row-index`, but raw hydrated rows without that attribute could derive source index from current DOM order. Sorting such a table could therefore change index-derived identity. `setData()` also recreated DOM rows with current render indices, so filtering/reordering the same row objects could renumber their source indices.

### Correction

`TableSurface` now:

- assigns each hydrated DOM row an immutable first-seen source ordinal when none was supplied;
- maintains same-object row identity in a `WeakMap` across `setData()` rerenders;
- uses that stable ordinal for `data-dkds-source-row-index`.

The WeakMap does not strongly retain row data and therefore does not create a session-length object list.

For scientific display sampling, `sourceRowId()` now supports a lazy `rowIdAt(index)` resolver after explicit `rowIds`. Data Center supplies `rowIdAt:index=>D.rowId(artifact,index)` when the Artifact does not already carry a row-ID array. Sampling therefore carries exact source identity only for displayed points without allocating a duplicate full-length identity array.

Stable `artifactId + seriesId` remains the Legend identity. Display labels and trace positions remain presentation-only.

## Finding D — linked-view fan-out remains bounded

`InteractionRuntime.linkState(channel, group)` already ref-counts one global bridge listener for a channel/group pair. The final audit stress test binds 128 logical Viewport links and 128 Legend links to one runtime and verifies:

- exactly two global bridge subscriptions are added, one for each channel/group;
- each shared subscription has 128 refs rather than 128 global listeners;
- all refs and local listener sets return to zero on teardown;
- transaction dedupe history remains at or below the existing 256-entry runtime limit while mixing channels.

No permanent per-point or per-cell linked-view identity structure is introduced.

## Mobile parameter drawer correction

The first-open content-fit solver had two defects relevant to the supplied 436 px screenshot:

1. Once a control had a valid `getBoundingClientRect()`, the solver skipped its intrinsic `scrollWidth - clientWidth`, so text could be clipped inside an otherwise fitting button.
2. Automatic growth stopped at the compact `autoMax`/88vw ceiling even when a genuinely width-critical control extended beyond it.

The solver now measures both outer geometry and intrinsic content overflow. It keeps the compact starting width, grows by measured overflow plus an 8 px safety inset, and may use the bounded `min(100vw - 12px, 680px)` ceiling only when required. A 436 px regression model with the Vg row ending at 396 px resolves to 404 px, rather than greedily using the full 424 px available width.

This is a Core Presenter content-fit correction, not a Pulse-specific hard-coded device width.

## Freeze result

Automated Phase E contract audit: **PASS**.

The implementation now satisfies the planned automated acceptance points for mixed channel isolation, project/link-group isolation, teardown/quiescence, source identity and bounded linked-view state. No known automated Phase E contract failure remains.

Formal Phase E freeze is still **WIP pending device visual acceptance**. Local Chromium/Windows Electron rendering was not available in this environment, so the supplied Vg clipping fix and overall Desktop/Android presentation must still be checked on the user's actual targets. Static/runtime tests are not being presented as visual acceptance.
