# Raw Prominence Detector Example

This is an SDK example, not a recommended scientific replacement for the built-in robust detector.

It demonstrates that a resonance peak algorithm can be installed as an external `.grsplugin` and discovered by the existing Resonance Workbench without changing core source.

Package it from the repository root:

```bash
npm run plugin:package -- examples/external-plugins/resonance-detector-template raw-prominence.grsplugin
```

Then install it from **Plugins → Install Plugin**.

The example deliberately returns only raw sampled `(V, I)` coordinates. A production detector may use fitting, derivatives, wavelets or ML internally, but final physical `Vpk` should still be projected to the raw measured coordinate according to the resonance-workbench contract.
