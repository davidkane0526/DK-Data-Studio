# Standard Resonance Algorithms

Built-in, versioned scientific algorithm providers for resonance analysis.

Algorithms are plugin-owned rather than hard-coded into the Resonance Workbench:

- `peak-detector / robust-ricker-v1@1.0.0`
- `peak-metrics / baseline-fwhm-v1@1.0.0`

The implementation lives in `algorithm.js`. Core only owns registration, version resolution, Pipeline/provenance, lifecycle and remote capability transport. Future algorithm versions may coexist with these providers; existing project results can retain the exact algorithm id/version used to produce them.
