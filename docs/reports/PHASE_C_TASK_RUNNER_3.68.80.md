# Phase C Bounded Core Task Runner — 3.68.80 WIP

## Scope

3.68.80 adds one Core-owned execution surface for CPU-heavy plugin work. Plugins declare Worker entry files in `plugin.json` and submit through `ctx.tasks`; they do not create private Worker pools. Core owns queuing, concurrency, Worker lifetime, cancellation and latest-generation publication safety.

The first production consumer is Pulse Sampler steady-state-current extraction. Its previous synchronous main-thread implementation was removed rather than retained as a compatibility/fallback path.

## Concurrency policy

- Native Mobile: exactly **1** Worker.
- Desktop: **2–4** Workers, bounded by both `navigator.hardwareConcurrency` and `navigator.deviceMemory`.
- CPU cap: `clamp(floor(hardwareConcurrency / 2), 2, 4)`.
- Memory cap: 2 at <=4 GiB, 3 below 12 GiB, 4 at >=12 GiB; if browser memory information is unavailable, cap at 3.
- Effective Desktop limit is the minimum CPU/memory cap. Installed plugin count never increases the limit.

This is deliberately conservative because task inputs/results may coexist with canonical Artifact payloads and chart state. The scheduler is a UI-responsiveness budget, not a maximum-throughput worker farm.

## Same-host concurrency checkpoint

The development host exposed 5 logical CPUs and about 5.8 GiB system RAM. A two-repeat Node `worker_threads` checkpoint used one fixed CPU workload plus a 24 MiB local typed-array allocation per job. Values are trend evidence only; Node RSS sampling and browser Workers are not identical runtimes.

| Concurrent jobs | Median batch time | Throughput | Sampled peak RSS delta |
|---:|---:|---:|---:|
| 1 | 142.08 ms | 7.04 jobs/s | 30.38 MiB |
| 2 | 134.84 ms | 14.83 jobs/s | 30.86 MiB |
| 3 | 207.43 ms | 14.46 jobs/s | 48.55 MiB |
| 4 | 230.06 ms | 17.39 jobs/s | 48.62 MiB |

On this relatively small host, moving from one to two jobs nearly doubles throughput while three jobs increase completion latency without improving throughput. The runtime CPU rule resolves 5 logical CPUs to a Desktop cap of 2, which matches this checkpoint. Larger-memory/high-core systems may reach 3 or 4, while Mobile remains fixed at 1.

## Cancellation and stale publication

A latest-wins task key is generation-scoped inside the plugin owner. Submitting newer work with the same key cancels the queued predecessor or terminates its running Worker. Even if a completion races with supersession, the scheduler checks the current task id before invoking the guarded `publish` callback. Cancellation rejects with `AbortError`.

Plugin unload/dispose cancels owned tasks and revokes Blob URLs created for packaged external task sources.

## Packaging/SDK boundary

SDK 1.35.0 adds:

- `execution.tasks` Core requirement;
- `manifest.tasks: [{ id, entry }]`;
- `ctx.tasks.submit(...)`, cancellation, snapshots and scope disposal;
- author documentation in `sdk/TASK_RUNNER.md`.

Built-in and external `.dkplugin` packages pass declared task entries through the same package validator. Task entries are package assets but are not loaded as ordinary main-thread plugin scripts. Plugin authoring validation rejects direct `new Worker()` / `new SharedWorker()` usage in plugin source.

## Acceptance

The dedicated regression covers Desktop/Mobile concurrency limits, bounded queuing, running-worker termination, same-key supersession, stale publication prevention, worker algorithm parity and SDK/manifest contracts. The full release suites remain responsible for package, Mobile, scientific and architecture regression coverage.
