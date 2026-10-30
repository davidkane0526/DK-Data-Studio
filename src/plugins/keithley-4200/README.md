# Keithley 4200A KXCI plugin

Phase 1 implements only read-only connection verification:

- generic TCP Host service;
- `Connect`;
- `Identify` using exactly `*IDN?\0`;
- model and optional serial-number validation;
- `Disconnect`;
- a single serialized command queue;
- no automatic command retry.

The current defaults match the verified bench setup: `169.254.111.118:1225`, Android interface `eth0`, expected serial `1498377`.

## Safety boundary

This version intentionally contains no SMU/PMU voltage, current, sweep, pulse, output-enable, or measurement commands. A TCP read timeout without any response invalidates the session so a late KXCI response cannot be mistaken for the response to a later command.

Android requests an explicit native network interface. The native Host resolves that interface through `ConnectivityManager` and creates the socket from the selected Android `Network.socketFactory`, so Wi-Fi can remain connected while instrument traffic is bound to Ethernet without a Root routing command when Android exposes the Ethernet network normally.

Desktop uses the same plugin-facing `tcp` service through Electron IPC and Node's `net.Socket`.
