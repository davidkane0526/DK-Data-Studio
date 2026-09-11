# DKDS Phase C performance baseline — 3.68.82

> This report is a same-machine trend baseline. It does not define portable pass/fail time limits.

## Environment

| Item | Value |
| --- | --- |
| Captured | 2026-09-10T05:08:58.694Z |
| Platform | linux 6.18.35 (x64) |
| Node | v22.16.0 |
| CPU | INTEL(R) XEON(R) PLATINUM 8573C |
| Logical cores | 5 |
| System memory | 5948 MiB |
| Samples | 5 measured + 1 warm-up per scenario |

## Results

| Rank | Scenario | Workload | Median | p95 | p95 blocking | Peak heap Δ | Peak RSS Δ | Process peak RSS | Contract copy passes |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2 | 100k-point curve | 100,000 points | 345.473 ms | 367.452 ms | 333.28 ms | 21.131 MiB | 24.695 MiB | 82.676 MiB | 6 |
| 1 | 1M-point curve | 1,000,000 points | 3374.289 ms | 3490.527 ms | 3166.136 ms | 156.089 MiB | 158.328 MiB | 243.543 MiB | 6 |
| 4 | 500×500 matrix | 500×500 | 22.212 ms | 25.607 ms | 10.688 ms | 17.092 MiB | 13.125 MiB | 69.746 MiB | 4 |
| 3 | 1000 small Artifacts | 1000 Artifacts | 47.607 ms | 52.936 ms | 36.419 ms | 14.138 MiB | 7.906 MiB | 64.887 MiB | 4 |
| 5 | 20 live plots | 20 × 2000 points | 11.231 ms | 13.374 ms | 12.332 ms | 3.943 MiB | 2.234 MiB | 38.918 MiB | 1 |

## Phase breakdown

### 100k-point curve

| Phase | Median | p95 |
| --- | ---: | ---: |
| factory | 8.872 ms | 9.536 ms |
| store-create | 0.056 ms | 0.082 ms |
| store-write | 13.272 ms | 18.813 ms |
| store-read | 9.292 ms | 11.725 ms |
| fingerprint | 314.673 ms | 333.28 ms |

### 1M-point curve

| Phase | Median | p95 |
| --- | ---: | ---: |
| factory | 91.804 ms | 95.881 ms |
| store-create | 0.059 ms | 0.063 ms |
| store-write | 129.926 ms | 151.007 ms |
| store-read | 96.415 ms | 100.852 ms |
| fingerprint | 3063.047 ms | 3166.136 ms |

### 500×500 matrix

| Phase | Median | p95 |
| --- | ---: | ---: |
| factory | 7.352 ms | 8.162 ms |
| store-create | 0.044 ms | 0.047 ms |
| store-write | 8.619 ms | 10.688 ms |
| store-read | 6.101 ms | 6.628 ms |

### 1000 small Artifacts

| Phase | Median | p95 |
| --- | ---: | ---: |
| factory | 8.04 ms | 9.347 ms |
| store-create | 0.056 ms | 0.098 ms |
| store-write | 33.201 ms | 36.419 ms |
| store-list | 7.634 ms | 8.494 ms |

### 20 live plots

| Phase | Median | p95 |
| --- | ---: | ---: |
| enqueue | 9.561 ms | 12.332 ms |
| queue-drain | 0.379 ms | 1.496 ms |
| max-frame-callback | 0.021 ms | 0.023 ms |

## Bottleneck order

1. **curve-1m**: p95 3490.527 ms; peak heap delta 156.089 MiB.
2. **curve-100k**: p95 367.452 ms; peak heap delta 21.131 MiB.
3. **artifacts-1000**: p95 52.936 ms; peak heap delta 14.138 MiB.
4. **matrix-500**: p95 25.607 ms; peak heap delta 17.092 MiB.
5. **plots-20**: p95 13.374 ms; peak heap delta 3.943 MiB.

The highest measured end-to-end cost is **curve-1m**. The current contract's largest statically traced full-payload copy count is **curve-100k** (6 passes). These are separate signals and should not be collapsed into one diagnosis.

## Decision boundary

- Keep the current serializable Artifact representation until range-read and ownership semantics are designed together.
- Use this report to choose the first Phase C implementation target; rerun on the same machine after each change.
- Do not infer Electron/D3/GPU paint performance from the deterministic 20-plot scheduler case. A renderer/device capture remains a separate acceptance step.
