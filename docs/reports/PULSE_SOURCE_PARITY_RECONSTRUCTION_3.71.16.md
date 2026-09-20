# Pulse Analysis production Unit source-parity reconstruction — 3.71.16 WIP

## Scope

3.71.16 replaces the **presentation/composition owner** of `builtin.pulse-analysis` with current Unit Templates. It does not replace the Pulse analysis domain owner.

Frozen production owners retained from the accepted 3.71.15 Pulse implementation:

- `analysis-service.js`
- `controller.js`
- `pulse-analysis-task.js`
- `task-core.js`
- `super-layout.js`
- `plugin.css`
- `mobile.css`

The two accepted stylesheets remain byte-identical:

- `plugin.css`: `ea733db8ed78698feb2c8c7584f599614de259d889ac590598ca4f6308644420`
- `mobile.css`: `8635d04698e00d9b1f75f7632552c9449c11c8df3fca1e580bdb7bbc1accf1c1`

## Production composition owner

`src/plugins/pulse-analysis/unit-presentation.js` now owns the Pulse presentation through Unit Templates:

- Page shell / page header: `page`, `pageHeader`
- Parameters: titleless `data-control` PRIME
- Panels / accepted headers / actions / fields: `panel`, `header`, `action`, `field`
- Result plots and raw diagnostic: `plotView` + runtime-delegated `scientificPlot`
- Result height split: `splitPane`
- Result table: `table`
- Workspace composition: `workspace`

`shared-views.js` is a thin delegation layer. `feature-runtime.js` no longer owns PlotView or PRIME composition.

## Unit contract additions

No new Unit type was added. The catalog remains **41**.

Unit Templates **2.5.8** adds only generic source-parity expression required by accepted native anatomy:

1. Header source-parity anatomy:
   - stacked title/subtitle;
   - optional omission of actions host;
   - `plot-minimal` header variant.
2. Field `controlOnly` composition for compound controls such as the accepted two-input range rows.

The hard parameter rule remains intact: parameter/data-control PRIME surfaces are titleless/headerless. The Pulse SDK shadow example was also corrected to use `fixed-titleless` so examples cannot teach a stale parameter-header pattern.

## Accepted anatomy gate

The 3.71.16 production source-parity gate now freezes two independent classes of accepted anatomy before Windows screenshots are needed:

1. **Interaction IDs** used by controller/feature-runtime, including all Pulse inputs, file controls, three plot hosts, result-scope controls and result table/actions.
2. **Private geometry hooks** consumed by the byte-frozen accepted `plugin.css`, including Pulse card/header/form/result/split/table classes.

Therefore dropping an accepted id or a private CSS geometry hook fails the automated gate rather than depending on manual visual discovery.

## Context overflow regression discovered during cutover

The Desktop `更多功能` regression was not a Pulse bug. Core had two simultaneous visible menu owners:

- `#contextOverflowMenu`, intended only as hidden membership storage;
- a transient `DKDSUI.ContextMenu`, intended as the actual visible popup.

When storage was unhidden because it contained rows, the user saw two layers. Closing the ContextMenu left storage visible, making the menu appear impossible to dismiss.

3.71.16 makes the ownership explicit:

- storage remains hidden during normal ContextMenu operation;
- one transient ContextMenu is the visible owner;
- closing the popup also collapses storage and clears `aria-expanded`;
- the no-ContextMenu fallback is a real one-layer toggle.

The regression test now executes the real open/close path, not only static source assertions.

## Validation

Final production source validation:

- Test manifest: **436 / 436 PASS**, executed in bounded ranges in original manifest order.
- Check manifest coverage: **443 / 443 PASS** = 432 shared test/check cases + 11 check-only cases; the four test-only cases are also included in the 436 test result.
- Mobile: **103 / 103 PASS**.
- Performance suite: **PASS**.
- SDK Harness: **PASS**.
- Scientific parity: **PASS**.
- Hard Visual Invariants: **87 / 87 PASS**.
- Architecture Hygiene: **PASS**.
- Native Analysis strict audit: all tracked violation counts **0**.
- Plugin manifests/packages: **17 / 17 PASS**.
- Plugin Boundary: **0**.
- UI style ownership: **0 cross-file collisions**.
- Style Ownership Gate: **0 violations**.
- Authored CSS: **0 `!important`**.

After the bounded full-suite pass, only test/example hardening changed: the Pulse shadow was made explicitly titleless and the context-overflow test gained runtime open/close execution. Those affected tests and boundary/coverage gates were rerun and pass; production runtime source did not change in that final hardening step.

## Acceptance boundary

Automated source/anatomy/ownership/runtime gates now cover the failures that should not require a user screenshot: missing ids, missing accepted private geometry hooks, duplicate menu owner, stuck popup state, stale parameter-header examples, duplicated PlotView/PRIME owners and stylesheet drift.

The remaining acceptance that cannot be proven by these source/runtime gates is Windows Electron rendering itself: font rasterization, GPU/backdrop composition and final pixel appearance with real project data.

After Pulse Windows visual acceptance, the next production reconstruction target is **Resonance Workbench**, then **Data Center**, then the remaining native plugins.
