# Transfer Curve Vth Lab Side-by-Side Live Presentation — v3.71.52 WIP

## Purpose

This phase follows the v3.71.51 Unit-only shadow reconstruction for **Transfer Curve Vth Lab** (`com.dkds.transfer-vth-lab`). The production Vth presentation is **not replaced** in this phase.

The acceptance question is:

> Can the Unit-only Vth shadow display and mutate the same live production state, numerical results, curve payloads and result table as the current production Vth workbench, without creating a second Vth store, algorithm, task or result owner?

## Single-owner architecture

The authoritative path remains:

```text
scoped production curve Artifacts
        ↓
production Vth state + task path
        ↓
production analysis-runtime.js / analyze-vth result cache
        ↓
services.domain capability projection
       ↙                         ↘
production presentation      Unit Vth shadow
```

The new domain seam only projects the existing production owner.

- `src/plugins/transfer-vth-lab/live-domain.js` owns detached snapshot/subscription/action wrapping only.
- `src/plugins/transfer-vth-lab/domain-adapter.js` exposes that owner as `com.dkds.transfer-vth-lab/live` through `ctx.services.domain`.
- The shadow connects through the declared production plugin dependency and Core services.
- The shadow does not instantiate a second `ctx.state.create`, Vth algorithm, `analyze-vth` task definition, controller, worker or numerical result cache.

## Production seam opened in this phase

The production entry/manifest was opened only as far as required to expose the missing public seam.

Production Vth version is now **3.2.2** and its package script order is:

1. `analysis-runtime.js`
2. `live-domain.js`
3. `domain-adapter.js`
4. `plugin.js`

The plugin now projects a serializable live snapshot and a bounded action surface for:

- refresh/demo source handling;
- selected-curve mutation;
- extraction parameter mutation;
- manual fit-window mutation/reset;
- plot-view mutation/fit;
- selected/all-curve analysis.

The snapshot projects the current production-visible state required by the Unit shadow:

- assigned curves and selected curve;
- extraction parameters;
- current analysis result(s);
- four summary metrics;
- production plot payload, fit line, manipulators and view;
- production result-table rows.

No production numerical algorithm was copied into the seam.

## Unit shadow live binding

`examples/sdk151-unit-vth-shadow/` is now **1.1.0**.

It continues to use the same public 41-Unit vocabulary from v3.71.51 and still ships no CSS. The structure and accepted geometry remain unchanged:

- fixed-titleless `data-control` PRIME;
- 300 px control rail;
- 10 px main gap;
- four-metric grid;
- ScientificPlot curve surface;
- standard result Table;
- vertical SplitPane with `180 / 140 / 300 / 920` result geometry.

The difference is that visible controls and scientific content now synchronize from the production live-domain snapshot instead of holding shadow-only placeholder state.

### Unit → production round trips

The live shadow routes visible interactions back to the production owner:

- curve selector → `setSelectedCurve`;
- target/low/high current and other fields/checks → production parameter mutation;
- ScientificPlot fit-window/range interaction → `setManualWindow`;
- target-current manipulator → production parameter mutation;
- plot viewport → `setView`;
- reset fit window → `resetManualWindow`.

After production state changes, the same production snapshot is projected back into the shadow controls/plot/table.

## Numerical parity gate

`tests/test-sdk151-vth-live-domain-numeric.js` runs the real production `analysis-runtime.js` together with the live-domain/adapter service boundary.

It verifies that:

- the domain capability is dependency-gated;
- a live-domain analysis action and snapshot return the same Vth result as the direct production analysis runtime;
- parameter changes mutate the authoritative owner;
- snapshots are detached rather than exposing mutable internal state;
- raw service lookup cannot bypass the domain adapter contract.

Current deterministic fixture result:

- `Vth = 0.09554694607113555`
- branch = `第一扫描段`
- fit sample count = `17`

## Actual production + Unit side-by-side gate

`tests/test-sdk151-vth-side-by-side-live-presentation.js` activates the **actual production Vth plugin entry** and the **actual Unit shadow plugin** in one deterministic host harness.

The test supplies two assigned curve artifacts and runs the production `analyzeAll` path. It then compares the shadow to the production live snapshot for:

- all relevant fields/checks;
- four metrics;
- result-table rows;
- ScientificPlot curves;
- fit line / manipulators;
- current y-scale and view state.

It also verifies both-direction interactions:

1. shadow target-current field → production state → shadow field;
2. shadow curve selection → production selected-curve state;
3. shadow plot range → production manual fit window;
4. shadow plot viewport → production view state.

Current fixture result:

- assigned curves: **2**;
- table rows: **2**;
- representative Vth: **0.044769445483889565**.

The shadow exposes non-empty numeric and presentation parity digests so later production cutover tests can preserve the same live evidence.

## Production files intentionally kept frozen

The following production Vth owners remain byte-identical to the v3.71.51 accepted baseline:

- `plugin.css` SHA-256 `b56cb70582da3102ee4d057349715db8707762d8702f377b660ebb3c5632d7ee`
- `analysis-runtime.js` SHA-256 `236fd11a5490ab7745585033935a428059d654c9874cd21803a04141f2713b3d`
- `vth-task.js` SHA-256 `cc2230b56d9f0fad8f040d70dd50bc27b29585e4ec47c9cde9b1e65672246cb1`

The bounded seam files are:

- `plugin.js` SHA-256 `2ec474bff4e82548f30d8df5ae625e31e48bbc4d95442bae82bd31ecf8a3d40b`
- `live-domain.js` SHA-256 `1ffa1fda16b3c4b710b325689bdb507e2b5b7155f34823d0d3949374fc4acf68`
- `domain-adapter.js` SHA-256 `bf8cb24e1180af7723fd67b31392b8c1aad8fc366813e624881c4ddcbf956cb7`

## Unit conclusion

No Unit defect or missing cross-plugin semantic responsibility was found during the live side-by-side stage.

Therefore:

- Unit Templates remain **2.5.22**;
- the catalog remains **41 Units / 73 Layout recipes**;
- no Vth-specific Unit was added;
- no private shadow CSS was introduced.

The existing public Unit composition is sufficient for production Vth cutover.

## What this phase does not claim

This phase does **not** claim production Vth Unit cutover or Windows Electron pixel acceptance.

It establishes the prerequisite live evidence: the Unit shadow and the production UI can consume/mutate one authoritative production owner with matching numerical/table/plot payloads. The next stage may replace only the production presentation/composition while preserving the frozen numerical/task/state ownership above.
