# DK Data Studio v3.61.2 Verification

## Regression scope

- Resonance keyboard undo uses the plugin shortcut contract and calls the same `undoLastAction()` runtime command as the UI action.
- ScientificCurveSurface caches normalized sweep ordering and marker DOM nodes during a render, removing repeated full-sweep/full-marker work from pointermove.
- FWHM/peak drag commits invalidate metric inputs without first installing an asynchronous placeholder; synchronous providers resolve before the end-of-drag authoritative redraw.
- TER declares dedicated-window prewarm through the generic plugin manifest contract.

## Automated verification

Run:

```bash
npm run check
npm test
```

The v3.61 interaction-performance regression suite includes v3.61.2 assertions for these paths.
