# Shared Scientific Engine

The mature scientific algorithms are no longer implemented in one monolithic `analysis.js`.

`analysis.js` is now only a backward-compatible facade.

Modules:

```text
common.js    statistics, shared symbols, nearest-index utilities
presets.js   detection presets
import.js    flexible text / multi-column import
peaks.js     sweep reconstruction, transforms, peak candidate detection, peak metrics
identity.js  missing-peak-aware cross-Vg peak tracking / order assignment
physics.js   R/H/D/X/Q family classification and M0-M3 physical model hierarchy
gate.js      V0/delta/delta-over-width, carrier density, fits and correlations
pulse.js     pulse/read transient extraction
ter.js       strict same-Vd TER matrix and resonance-associated TER
```

Electron desktop, LAN web, and the React Native Android offline asset bundle execute these same modules.

The rewrite is guarded by:

```bash
npm run science:parity
```

This loads the preserved `main` branch v3.14 implementation through Git and compares representative mature workflows against the rewritten modular engine. Additional unit tests cover identity tracking and gate-analysis formulas that historically lived in the UI controller rather than `analysis.js`.
