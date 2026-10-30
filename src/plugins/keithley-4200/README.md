# Keithley 4200A KXCI — 4200 workbench (v0.2.0)

This plugin implements a **read-only live connection** and a **simulation-only measurement GUI**. Do not mistake simulated curves for data from a Keithley instrument.

## Connection

- Editable IP address or hostname, TCP port (default `1225`), connection timeout, response timeout and optional serial-number verification.
- Network selection: `Auto`, `Wi-Fi`, `USB Ethernet`, `Specific interface`.
- Android: bind sockets to Android `Network.socketFactory`. In Auto mode, link-local `169.254.*` destinations prefer an Ethernet network when exposed to Android; otherwise OS routing applies. Selecting a missing transport fails closed.
- Desktop: Auto follows the OS route; explicit transports select a local IPv4 address from matching OS adapters. Adapter-name classification may be ambiguous; use Specific interface when needed.
- Connection profiles persist in the **current DKDS project**, together with editable plan settings. A saved profile does not auto-connect.
- Clicking Connect establishes a fresh socket. Identify sends exactly `*IDN?\0`, verifies the `KI4200A` identity and optional serial, and does not retry a timed-out transaction. Identity is invalidated when the connection configuration changes.

Known initial bench values: `169.254.111.118:1225`, adapter `eth0`, serial `1498377`. These are user-editable defaults, not hardcoded constraints. To connect via Wi-Fi, the instrument must be reachable on the Wi-Fi LAN and its KXCI TCP service must be accessible.

## GUI and simulated acquisition

The workbench uses DKDS Unit templates, DKDS scientific plot and DKDS table:

- Tests: I–V, transfer, output, timed sampling (currently all simulation only).
- Direction: forward, reverse, roundtrip without duplicate turn-around point.
- Loop count, per-leg points, start/stop voltage, delay, speed preset, current-limit plan field.
- Source/scan SMU, read SMU (may equal source SMU) and optional Gate SMU (`0` disables Gate).
- Preview validates numerical limits and computes the expected number of points.
- Start/Stop drives only the local simulation timer; **no KXCI measurement or source commands** are sent.
- Live graph overlays at most the last 12 cycles, table shows the last 100 samples. Raw dataset retains all sampled rows.
- Export raw CSV, JSON (including plan and simulation provenance), or vector SVG graph via `ctx.io.saveText`.
- The dataset is marked `source: simulation`; incomplete/stopped runs are distinguished. Export is user-triggered.

Note: current simulated model does not represent a physically calibrated device. The displayed proposed voltage/current limits have **not** been validated against an actual installed SMU card, and are not used to energize hardware.

## Safety and limitations

1. Live instrument commands are restricted to the verified NUL-terminated `*IDN?` identity query.
2. TCP exchange is serialized and fail-closed after read errors. No blind command replay or automatic post-reconnect test restart.
3. No SMU output, sweep execution, PMU/CVU commands or real-time instrument data acquisition is implemented yet.
4. No Android APK / native Kotlin build or OPPO Pad Mini live test has been completed as of this source change.
5. Project storage currently captures connection profiles and plan fields, **not** streaming raw measurements; users must export the simulated dataset before leaving the page.

## Code and tests

- `measurement-model.js`: pure plan validation, point-sequence generation, dataset and CSV encoder.
- `unit-presentation.js`: all UI, scientific plot and live table.
- `plugin.js`: identity-only TCP control, simulation scheduler, project persistence and export handlers.
- `tests/test-keithley-4200-phase1.js`: architecture + identity-only transport contract.
- `tests/test-keithley-4200-workbench.js`: plan boundary, sweep order and raw CSV tests.
- `tests/test-keithley-4200-integration.js`: mocked identity, simulated collection, export and project profile regression.

Next: verify complete Android and Desktop builds, connect via both Wi-Fi and Ethernet, exercise disconnects, then build a KXCI command compiler against the official 4200A KXCI programming manual with hardware identification and physical protection gates.
