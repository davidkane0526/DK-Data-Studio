# Pulse Sampler Tool — Live Side-by-Side Unit Acceptance v3.71.41

## Result

**Accepted for live presentation parity. Production cutover not yet performed.**

The Unit shadow and the current production UI now consume the same Pulse Sampler domain owner. The Unit path does not duplicate project state, pulse generation, waveform merge logic, extraction task execution or result computation.

## Single-owner boundary

Production remains authoritative for:

- channel state and eight pulse parameters;
- generated preview and joined segments;
- merged Vd/Vs/Vg waveform;
- scoped source discovery and selected source;
- Time/Current keys and trim settings;
- steady-state extraction;
- result rows and plot vectors;
- export/copy commands.

The Unit shadow consumes `com.dkds.tools.pulse-sampler/live` and sends all mutations back through production actions.

## Acceptance evidence

The executable side-by-side test proves:

- production -> Unit active-channel projection;
- parameter projection and round-trip mutation;
- segment projection and action mutation;
- waveform table + ScientificPlot projection;
- source/analysis control projection;
- result table + ScientificPlot projection;
- direct production notifications refresh Unit state;
- stale production results clear Unit tables/plots;
- no shadow scientific state store or algorithm path exists.

## Unit architecture

- Unit Templates: 2.5.16
- Unit catalog: 41
- Shadow CSS: none
- Pulse-specific Units: none
- productionReplaced: false

The accepted generic recipes remain sufficient for this live stage.

## Next gate

The next step is presentation-only production cutover. The cutover must preserve the same live-domain/action owner and must not move numerical or task ownership into the Unit presentation.
