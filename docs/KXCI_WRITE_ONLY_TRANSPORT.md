# KXCI write-only transport contract

## Command semantics

The 4200A KXCI TCP stream is NUL-terminated. The read-only discovery sequence uses two different command classes:

- Query/response: `*IDN?`, `*OPT?`, `EX SystemUtil instrumentinfo(,4096,)`, `GN result`, `EX SystemUtil remotemoduleinfo(,4096,)`, and the following `GN result`.
- Write-only mode switches: `UL` enters User Library mode and `DE` returns to normal KXCI mode. These commands do not produce a query response.

Do not use a request/response helper for `UL` or `DE`. Waiting for bytes that the instrument does not send causes a false timeout and can close the TCP session before the next metadata query.

## Transport behavior

- A write-only exchange writes the complete NUL-terminated command, flushes it, and resolves without waiting for response bytes.
- The TCP session remains open so the next `EX` or `GN` query uses the same connection.
- The normal query path retains its first-byte timeout, idle timeout, response-size bound, and stale-response protection.
- TCP is a byte stream, not a packet protocol. Multiple NUL-delimited commands may arrive in one packet; parsers must split the stream at every NUL delimiter.
- The Android DKTS bridge permits `noReply` only for the fixed `UL` and `DE` requests. It does not expose a general raw-command interface.

## Host compatibility

The DKTS external plugin uses the DKDS TCP service. Write-only exchange support is included in DKDS V3.72.2 for desktop, Android native TCP, and the LAN TCP gateway. Install DKDS V3.72.2 or later before using plugin-based physical-module inventory. The DKTS standalone Windows and Android transports implement the same contract directly.

## Safety boundary

This sequence only reads instrument identity, installed-option information, physical module/accessory metadata, and calibration metadata. It does not enable SMU, PMU, or PGU outputs, execute a scan, or acquire a measurement.