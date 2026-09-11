# DKDS Phase C fingerprint/revision spike — 3.68.70

> This is a design measurement, not a storage-contract change. Values are same-machine trend measurements.

Captured: 2026-09-09T12:10:12.331Z  
Profile: full; 3 measured + 1 warm-up samples  
Node: v24.19.0; linux x64

## Timing

| Workload | Full JSON median / p95 | Revision-only median / p95 | Numeric stream median / p95 | Stream speedup |
| --- | ---: | ---: | ---: | ---: |
| 100k-point curve | 411.334 / 418.069 ms | 0.01 / 0.012 ms | 4.854 / 4.899 ms | 84.74× |
| 1M-point curve | 4492.566 / 4522.515 ms | 0.011 / 0.012 ms | 37.466 / 42.838 ms | 119.91× |

## Correctness boundary

| Check | 100k | 1M |
| --- | --- | --- |
| Numeric digest ignores metadata-only changes | true | true |
| Numeric digest detects data changes | true | true |
| Kind revision over-invalidates unrelated artifact | true | true |

## Recommendation

- Do not replace `fingerprintArtifact` with the numeric prototype: it intentionally misses metadata, lineage and provenance changes.
- Do not use `revision(kind)` as an artifact identity: it is global to the kind and over-invalidates unrelated artifacts.
- The next safe design is an artifact-local revision plus a payload digest that covers the complete canonical contract without materializing one giant JSON string.
- Keep the current contract unchanged until that complete digest has collision, metadata, NaN/-0, save/restore and cache-invalidation tests.
