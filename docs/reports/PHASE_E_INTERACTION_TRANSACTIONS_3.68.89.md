# Phase E — Project-scoped Interaction transactions (3.68.89 WIP)

## Scope

This patch implements Phase E step 4 on top of the 3.68.88 stable reference/reference-only Selection baseline. It extends the existing `InteractionRuntime -> dkds:selection-changed -> PluginScope.selection.observe(...)` path. No second global event name, dispatcher, link registry or event bus is introduced.

## Transaction envelope

Every Interaction Runtime Selection change is assigned one `dkds.interaction-transaction.v1` envelope in callback/event metadata. The envelope contains:

- `transactionId` — ephemeral transaction identity within the current renderer session;
- `projectId` — current project identity resolved when the state is emitted/applied;
- `linkGroup` — explicit cross-view group, empty for ordinary unlinked Interaction state;
- `originOwner / originScopeId / originRuntimeId` — immutable transaction origin;
- `sourceOwner / sourceScopeId / sourceRuntimeId` — Runtime currently applying the transaction;
- `remote` — whether the current application came from another linked Runtime.

Transaction metadata is transport metadata only. It is not written into Selection schema 2 and therefore does not weaken the reference-only Selection contract.

## Cycle suppression

`InteractionRuntime.link(group, options)` subscribes through the existing Selection observer bridge. Matching remote state is applied with `applyRemoteSelection(...)`.

The remote boundary preserves the incoming `transactionId`, verifies current-project and link-group compatibility, checks a bounded recent-transaction set before mutation, then restores the reference-only Selection locally with `remote:true` and `rebroadcast:false`.

Therefore a transaction published by A may be applied by B and C, while B/C do not republish it. If the same transaction is explicitly presented to B again, or returns to A, it is rejected before a second state mutation. The recent transaction cache is bounded to 256 ids per Interaction Runtime.

## Project and scope ownership

Each `PluginScope` has an explicit ephemeral `scopeId`. Link-group matching is project-scoped by default whenever Core transaction project metadata exists. Current project identity is resolved dynamically from the plugin host/current project tab rather than captured at plugin activation, so a project switch cannot leave a stale link group attached to the previous project.

`ctx.ui.selection.scope()` exposes `{owner, scopeId, projectId}` for diagnostics. Runtime `dispose()` unlinks its observers; normal PluginScope disposal also removes all tracked Selection observers, so plugin unload does not leave link subscriptions behind.

## Public SDK additions

SDK 1.39.0 adds typings/documentation for:

- `ctx.ui.selection.transactions`
- `ctx.ui.selection.scope()`
- project/link-group filters on `ctx.ui.selection.observe(...)`
- `InteractionRuntime.link(...) / unlinkAll()`
- `InteractionRuntime.applyRemoteSelection(...)`
- transaction metadata available to normal Interaction subscribers/bindings

Plugin API remains 1.19.0 and Theme Contract remains 3.10.0.

## Non-goals

This patch does not implement linked-axis unit/dimension compatibility and does not yet add the concrete Phase E table↔curve, heatmap↔source-scan, viewport or legend adapters. Those remain steps 5–6.
