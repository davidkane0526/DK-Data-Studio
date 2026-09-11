# DKDS Phase C performance baseline — 3.68.69

> This report is a same-machine trend baseline. It does not define portable pass/fail time limits.

## Environment

| Item | Value |
| --- | --- |
| Captured | 2026-09-09T11:58:31.675Z |
| Platform | linux 6.18.35 (x64) |
| Node | v24.19.0 |
| CPU | AMD EPYC 9V74 80-Core Processor |
| Logical cores | 9 |
| System memory | 16015.3 MiB |
| Samples | 5 measured + 1 warm-up per scenario |

## Results

| Rank | Scenario | Workload | Median | p95 | p95 blocking | Peak heap Δ | Peak RSS Δ | Process peak RSS | Contract copy passes |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2 | 100k-point curve | 100,000 points | 464.238 ms | 498.547 ms | 456.321 ms | 50.875 MiB | 34.75 MiB | 125.59 MiB | 6 |
| 1 | 1M-point curve | 1,000,000 points | 4619.793 ms | 4657.776 ms | 4117.673 ms | 159.192 MiB | 130.176 MiB | 478.676 MiB | 6 |
| 4 | 500×500 matrix | 500×500 | 49.252 ms | 51.338 ms | 25.398 ms | 24.53 MiB | 15.875 MiB | 121.07 MiB | 4 |
| 3 | 1000 small Artifacts | 1000 Artifacts | 66.759 ms | 78.625 ms | 63.793 ms | 32.855 MiB | 29.875 MiB | 108.859 MiB | 4 |
| 5 | 20 live plots | 20 × 2000 points | 10.693 ms | 12.92 ms | 12.07 ms | 4.369 MiB | 2.375 MiB | 52.211 MiB | 1 |

## Phase breakdown

### 100k-point curve

| Phase | Median | p95 |
| --- | ---: | ---: |
| factory | 8.69 ms | 10.201 ms |
| store-create | 0.03 ms | 0.048 ms |
| store-write | 13.707 ms | 15.966 ms |
| store-read | 18.959 ms | 21.539 ms |
| fingerprint | 421.565 ms | 456.321 ms |

### 1M-point curve

| Phase | Median | p95 |
| --- | ---: | ---: |
| factory | 81.474 ms | 85.604 ms |
| store-create | 0.042 ms | 0.048 ms |
| store-write | 131.673 ms | 137.245 ms |
| store-read | 306.131 ms | 324.869 ms |
| fingerprint | 4096.357 ms | 4117.673 ms |

### 500×500 matrix

| Phase | Median | p95 |
| --- | ---: | ---: |
| factory | 8.56 ms | 9.244 ms |
| store-create | 0.03 ms | 0.032 ms |
| store-write | 15.389 ms | 19.481 ms |
| store-read | 24.204 ms | 25.398 ms |

### 1000 small Artifacts

| Phase | Median | p95 |
| --- | ---: | ---: |
| factory | 6.977 ms | 7.722 ms |
| store-create | 0.039 ms | 0.048 ms |
| store-write | 53.472 ms | 63.793 ms |
| store-list | 6.851 ms | 7.54 ms |

### 20 live plots

| Phase | Median | p95 |
| --- | ---: | ---: |
| enqueue | 9.873 ms | 12.07 ms |
| queue-drain | 0.432 ms | 0.46 ms |
| max-frame-callback | 0.022 ms | 0.026 ms |

## Bottleneck order

1. **curve-1m**: p95 4657.776 ms; peak heap delta 159.192 MiB.
2. **curve-100k**: p95 498.547 ms; peak heap delta 50.875 MiB.
3. **artifacts-1000**: p95 78.625 ms; peak heap delta 32.855 MiB.
4. **matrix-500**: p95 51.338 ms; peak heap delta 24.53 MiB.
5. **plots-20**: p95 12.92 ms; peak heap delta 4.369 MiB.

The highest measured end-to-end cost is **curve-1m**. The current contract's largest statically traced full-payload copy count is **curve-100k** (6 passes). These are separate signals and should not be collapsed into one diagnosis.

## Decision boundary

- Keep the current serializable Artifact representation until range-read and ownership semantics are designed together.
- Use this report to choose the first Phase C implementation target; rerun on the same machine after each change.
- Do not infer Electron/D3/GPU paint performance from the deterministic 20-plot scheduler case. A renderer/device capture remains a separate acceptance step.
