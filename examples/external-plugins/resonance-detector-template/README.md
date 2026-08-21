# Raw Prominence Detector Example

This is an SDK example, not a recommended scientific replacement for the built-in robust detector.

It demonstrates that a resonance peak algorithm can be installed as an external `.dkplugin` and discovered by the existing Resonance Workbench without changing core source.

With the standalone SDK, validate and package it without the DK Data Studio source tree:

```bash
node sdk/tools/dkds-plugin.js validate resonance-detector-template
node sdk/tools/dkds-plugin.js package resonance-detector-template raw-prominence.dkplugin
```

Inside the application repository, `npm run plugin:package -- ...` remains available for maintainers.

Then install it from **Plugins → Install Plugin**.

The example deliberately returns only raw sampled `(V, I)` coordinates. A production detector may use fitting, derivatives, wavelets or ML internally, but final physical `Vpk` should still be projected to the raw measured coordinate according to the resonance-workbench contract.
