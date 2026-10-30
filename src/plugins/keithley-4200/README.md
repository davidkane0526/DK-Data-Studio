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

## Definition of ORIGINAL data and ORIGINAL graph (user requirement)

**Original means created by the 4200A itself, not reconstructed by DKDS.** This distinction is mandatory:

| Class | Producer | Permitted archive representation |
|---|---|---|
| Instrument-native measurement file | 4200A / Clarius native export | Byte-for-byte original XLS/XLSX/CSV/TXT or other actually generated file, with originating test/run, device and file metadata; do not rewrite values, reorder records, change units or regenerate spreadsheet. |
| Instrument-native graph/image | 4200A / Clarius graph export, or validated KXCI UI capture | Exact exported PNG/JPEG/BMP/GIF bytes, or original screen capture bytes with capture provenance. DKDS-generated SVG is **not** instrument-native. |
| KXCI original reading stream | 4200A KXCI response bytes | Preserve raw bytes/messages as acquired, alongside parsed copies used only for live display. These readings are instrument-generated but are **not necessarily** Clarius-native files. |
| DKDS live graph | DKDS scientific plot using device-sourced readings | Display-only visualization; may be exported separately but **must not** be labeled instrument-original image. |
| Simulation / derived export | DKDS software | Developer/test artifact only; always labeled SIMULATION or software-generated. |

**Important operating mode constraint:** Official Tektronix documentation says Clarius and KXCI cannot run at the same time. Clarius Save Data can export both test sheet and graph in their native exported formats; KXCI can return original instrument measurement readings and draw graphs in its own UI. The KXCI manual does not establish a tested generic image-file retrieval command. Retrieving a KXCI UI graph as an original screenshot or collecting the native Clarius-exported files requires an independently verified instrument-side file transfer or capture path; do not simulate or synthesize such an API.

**Acceptance criteria:** An 'Export original data' or 'Export original graph' control must remain absent/disabled until actual instrument-origin content has been acquired and provenance verified. When enabled in a later phase, output must preserve the received original file bytes. If a file transfer/capture is unavailable, report that explicitly instead of substituting a DKDS-rendered plot or reserialized CSV. Software previews and native original artifacts must stay separate in UI, filenames, storage, project schema and exports.

Refs: Tektronix *4200A-SCS Clarius User's Manual*, "Save results and graphs"; Tektronix *4200A-SCS KXCI Remote Control Programming*, Rev. E (2025), "Using KXCI / Output data formats / Graphing the test results".

## GUI and simulated acquisition

The workbench uses DKDS Unit templates, DKDS scientific plot and DKDS table:

- Tests: I–V, transfer, output, timed sampling (currently all simulation only).
- Direction: forward, reverse, roundtrip without duplicate turn-around point.
- Loop count, per-leg points, start/stop voltage, delay, speed preset, current-limit plan field.
- Source/scan SMU, read SMU (may equal source SMU) and optional Gate SMU (`0` disables Gate).
- Preview validates numerical limits and computes the expected number of points.
- Start/Stop drives only the local simulation timer; **no KXCI measurement or source commands** are sent.
- Live graph overlays at most the last 12 cycles, table shows the last 100 samples. Raw dataset retains all sampled rows.
- Export **simulation-derived** CSV, JSON (including plan and simulation provenance), or **DKDS-rendered** vector SVG graph via `ctx.io.saveText`.
- The dataset is marked `source: simulation`; incomplete/stopped runs are distinguished. Export is user-triggered.

Note: current simulated model does not represent a physically calibrated device. The displayed proposed voltage/current limits have **not** been validated against an actual installed SMU card, and are not used to energize hardware.

## Safety and limitations

1. Live instrument commands are restricted to the verified NUL-terminated `*IDN?` identity query.
2. TCP exchange is serialized and fail-closed after read errors. No blind command replay or automatic post-reconnect test restart.
3. No SMU output, sweep execution, PMU/CVU commands or real-time instrument data acquisition is implemented yet.
4. Android CI release APK build passed for commit ec0086e401ee1884b907c0f630dfa4d44ecf73f5, but the app has not been installed/tested on the OPPO Pad Mini; later commits require a fresh CI result.
5. Project storage currently captures connection profiles and plan fields, **not** streaming raw measurements; users must export the simulated dataset before leaving the page.

## Code and tests

- `measurement-model.js`: pure plan validation, point-sequence generation, dataset and CSV encoder.
- `unit-presentation.js`: all UI, scientific plot and live table.
- `plugin.js`: identity-only TCP control, simulation scheduler, project persistence and export handlers.
- `tests/test-keithley-4200-phase1.js`: architecture + identity-only transport contract.
- `tests/test-keithley-4200-workbench.js`: plan boundary, sweep order and raw CSV tests.
- `tests/test-keithley-4200-integration.js`: mocked identity, simulated collection, export and project profile regression.

Next: verify complete Android and Desktop builds, connect via both Wi-Fi and Ethernet, exercise disconnects, then build a KXCI command compiler against the official 4200A KXCI programming manual with hardware identification and physical protection gates.
