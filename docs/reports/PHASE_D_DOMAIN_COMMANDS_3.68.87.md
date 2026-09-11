# Phase D Validated Domain Commands — 3.68.87

## Goal

Phase D step 5 gives Studio one validated execution path for domain operations invoked from plugin/UI actions, scripts and MCP. It does not add a second automation executor. The existing plugin command registry remains the owner, with a Core Domain Command Runtime responsible for validation, provenance and replay policy.

## Execution ownership

```text
UI / plugin interaction
       │
Studio Kernel script ───┐
       │                 │
MCP → Studio Kernel ─────┤
                         ↓
                Plugin Command Registry
                         ↓
                Domain Command Runtime
              ├─ validate/canonicalize args
              ├─ snapshot input Artifact identity
              ├─ resolve exact algorithm/provider
              ├─ execute the registered handler
              └─ record status/output identity
```

Legacy UI-only commands still use the same registry but are not externally discoverable and are not retained in domain history unless they explicitly declare `domainCommand`. Non-UI callers are rejected when a command has no validated domain metadata.

## Provenance record

A completed or failed domain execution records:

- execution id and invocation source (`ui`, `script`, `mcp`, `recipe`);
- command id, command contract version, owning plugin id and exact plugin package version;
- canonical replay arguments;
- input Artifact ids/roles plus Store-local `artifactRevision` and persistence-stable fingerprint;
- exact algorithm category/id/version and provider identity when applicable;
- normalized parameters;
- started/completed timestamps, duration and status;
- output Artifact ids/roles plus revision/fingerprint;
- `replayOf` linkage for replay executions.

The bounded command history is a runtime execution log, not a replacement for canonical Artifact lineage/provenance. Commands that create Artifacts still publish normal Artifacts and lineage.

## Replay rules

Replay is explicit (`replayable:true`) and fail-closed by default. Core requires:

1. the command still exists and still permits replay;
2. the command contract version still matches the recorded execution;
3. replayable algorithm-backed commands expose an exact algorithm version;
4. each recorded input Artifact is still visible to the owning plugin;
5. each input `artifactRevision` still matches unless the caller explicitly requests execution against current input state.

Plugin-side history/replay is owner-scoped. Studio Kernel/MCP access the global command surface through the host boundary.

`captureArgs()` materializes mutable UI defaults/current selection into canonical arguments before execution. Replay uses those recorded arguments and does not re-read mutable UI controls.

## First-party adoption

### Data Center

`builtin.data-center.derive-column` executes the formula-derived-column workflow as a replayable `data-processing` command. It records the input DataTable, formula parameters, plugin/provider version and the resulting Artifact reference.

### Transfer Vth Lab

`com.dkds.transfer-vth-lab.analyze-artifact` executes the task-backed constant-current-neighborhood Vth analysis as `analysis.threshold-voltage`. The command canonicalizes the selected Artifact, current parameter set and manual fit window, and records algorithm `transfer.vth-constant-current@2.0.0` with the exact plugin provider identity.

## SDK 1.37.0

SDK 1.37.0 exposes the current command contract through `ctx.commands`:

- `register(...)` with `domainCommand` metadata;
- `get()` / `list()` discovery;
- bounded `history()`;
- revision-checked `replay()`.

Plugins using domain metadata/history/replay declare `execution.commands`. The Studio Kernel exposes `commands.list/get/run/history/replay`; MCP routes through those Kernel tools instead of registering a parallel domain executor.

## Contract boundary

- App: 3.68.87 WIP
- SDK: 1.37.0
- minimum app: 3.68.87
- Plugin API: 1.19.0
- Theme Contract: 3.10.0

This phase changes command validation/provenance orchestration, not algorithm math, Theme paint or presentation geometry. Heavy computation remains in `ctx.tasks` / Algorithm Providers.

## Verification

The dedicated 3.68.87 regression executes the Domain Command Runtime, verifies validation and immutable recorded provenance, verifies owner visibility, verifies revision-checked replay and verifies that legacy UI-only payloads are neither cloned nor retained. It also runs the Studio Kernel command route with a synthetic MCP source to prove external callers enter the same plugin command registry.

Release-gate results are recorded in `HANDOFF_3.68.87_WIP.md`.
