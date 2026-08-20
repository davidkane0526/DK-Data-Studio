# DK Data Studio v3.52.1 Verification

v3.52.1 is a TOP startup-performance and diagnostics patch. It does not change scientific algorithms.

## Runtime loading contract

Dedicated TOP windows must load Scientific Pipeline / Transform / Algorithm runtimes only when the resolved plugin contract requests them. Expected built-ins:

- Data Center: none of the three domain runtimes.
- Pulse: none of the three domain runtimes.
- TER: `scientific-pipeline-runtime`, `scientific-transform-runtime`.
- Resonance: `scientific-pipeline-runtime`, `scientific-transform-runtime`, `scientific-algorithm-runtime`.

`requiresCore` remains canonical; plugins must not duplicate these Core runtimes in `window.dependencies`.

## Startup profile

Automation Runner 1.7.1 records for every real TOP renderer:

- main-process plugin-window resolution and BrowserWindow creation,
- navigation time and create-to-ready time,
- each dependency script load duration,
- plugin support scripts, window runtime and entry script,
- plugin activation, project restore and activity open,
- five slowest dependency loads.

A successful development-mode run should contain 24 cases: 23 pass, 0 fail, 1 skip (`Packaged build identity`). Packaged installer/portable should target 24 pass, 0 fail, 0 skip.

TOP coverage remains 4 discovered / 4 tested / 4 passed / 0 failed, including hide -> reuse -> show lifecycle validation.
