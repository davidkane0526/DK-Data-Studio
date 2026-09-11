# DKDS Phase C Artifact identity — 3.68.76

> Same-machine trend measurement; canonical parity and invalidation behavior are release gates, timing is not.

Captured: 2026-09-09T17:05:18.644Z  
Profile: full; 3 measured + 1 warm-up samples  
Node: v24.19.0; linux x64

## Timing

| Workload | Legacy JSON median / p95 | Canonical stream median / p95 | Artifact revision median / p95 | Stream speedup |
| --- | ---: | ---: | ---: | ---: |
| 100k-point curve | 383.929 / 388.885 ms | 381.762 / 382.235 ms | 0.014 / 0.016 ms | 1.01× |
| 1M-point curve | 3781.176 / 3862.115 ms | 3773.405 / 3852.521 ms | 0.02 / 0.02 ms | 1× |

## Peak allocation trend

| Workload | Legacy heap / RSS delta | Canonical stream heap / RSS delta |
| --- | ---: | ---: |
| 100k-point curve | 6.806 / 7.125 MiB | 5.666 / 4.5 MiB |
| 1M-point curve | 52.424 / 76.34 MiB | 12.493 / 8.148 MiB |

## Correctness

| Workload | Canonical parity | Unrelated stable | Source change | Save/restore | Revision excluded from persistence |
| --- | --- | --- | --- | --- | --- |
| 100k-point curve | true | true | true | true | true |
| 1M-point curve | true | true | true | true | true |

## Boundary

- The stream digest is the complete canonical identity; metadata, lineage, provenance and numeric payload remain covered.
- Artifact revision is a Store-local invalidation stamp, not persistent identity.
- Buffer/Column storage, range reads and worker execution remain later Phase C work.
