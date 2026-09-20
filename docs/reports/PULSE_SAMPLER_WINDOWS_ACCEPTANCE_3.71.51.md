# Pulse Sampler Windows acceptance closure — 3.71.51

## Acceptance source

The real Windows Electron confirmation after v3.71.50 accepted the Pulse Sampler production Unit presentation, including the corrected **测量数据提取** Panel shell/body containment. The user explicitly confirmed that Pulse Sampler is now acceptable and requested moving to the next native-plugin Unit reconstruction.

## Closed baseline

The accepted Pulse Sampler baseline is therefore:

- production Unit presentation: `src/plugins/pulse-sampler-tool/unit-presentation.js`;
- Unit Templates: **2.5.22 / 41 Units**;
- SDK: **1.51.26**;
- Pulse Sampler Tool: **1.9.27**;
- production domain/task owners remain byte-frozen:
  - `live-domain.js` — `a982b457b702b79d957f029cf2a403f9b180c5bd443f4172faf71f630f074d56`
  - `domain-adapter.js` — `a7b7c038970dc10a3c530dd098167d03dc3796d1789792c7c1215bd4430e21ac`
  - `steady-state-task.js` — `1132645c3509c04ec7ab11183cb6eebef9d5b678734a5b27700dcad27f5084d5`

The accepted presentation keeps the parameter/data-control PRIME titleless, uses the public Panel `sizing:'content'` shell/body contract, and keeps Sampling/RESULT/Plot/Table inside one real Material Panel body.

## Freeze rule

Pulse Sampler is no longer the active Unit migration target. Future changes to it are maintenance-only and must preserve the accepted presentation/domain/task ownership unless a new user-visible defect is demonstrated.
