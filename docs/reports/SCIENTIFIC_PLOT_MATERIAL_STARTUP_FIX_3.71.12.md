# Scientific Plot Material / TER Startup Ownership Fix — v3.71.12 WIP

## Scope

This round addresses two Windows Electron observations after the TER Unit production cutover:

1. plot cards still appear to have two visual layers / two shadows depending on the plot arrangement;
2. initial TER UI presentation is visibly slower than before.

No TER algorithm, numeric definition, state owner, accepted plugin geometry or public SDK contract is changed.

## Finding A — nested Material ownership caused the second shadow

### Reasoning pass 1: inspect the accepted card/plot ownership

The Unit reconstruction creates one outer PlotView/analysis card and then delegates actual chart drawing to the existing production `ctx.ui.scientificPlot` runtime through `renderOwner:'runtime'`.

The outer card is already a canonical Material `surface` through `.dkds-plot-view` / `.analysis-chart-card` / accepted surface anatomy. The delegated inner plot target therefore has to be transparent content owned by that card.

However, `ScientificUnitRuntime.createScientificPlot()` was adding:

```text
.dkds-scientific-surface-host
```

to every runtime-delegated target. Semantic Registry intentionally maps that class to Material role `surface`. Every Material surface recipe (`clear`, `thin-glass`, `soft-glass`) owns its own background and shadow; glass recipes additionally own backdrop filtering. TER has seven delegated plots, so the cutover created seven extra nested Material-surface candidates inside seven cards.

### Reasoning pass 2: rule out chart geometry and renderer paint as the shadow owner

The accepted TER PlotGroup gap remains 14 px and the cards do not geometrically occupy the same grid cell. The renderer-neutral `.analysis-chart` / `.dkds-scientific-chart-host` geometry does not itself define a box-shadow.

The scientific renderer does use an opaque plot/paper background (`#fff` in light mode and the dark scientific paper token in dark mode). That can make the inner drawing rectangle visually obvious, but it does not create the second drop shadow. The second drop shadow comes from the erroneous Material `surface` classification.

### Fix

Runtime-delegated Unit ScientificPlot targets now receive only:

```text
.dkds-scientific-chart-host
```

They no longer receive `.dkds-scientific-surface-host`. Standalone Unit-owned ScientificCurve surfaces retain the real surface identity and Material contract; the fix is therefore not a global removal of scientific Material support.

The scientific plot paper remains unchanged for source parity and chart contrast. If the Windows client still shows an unwanted flat opaque rectangle after this fix, that should be evaluated separately against the accepted source rather than solved by making every scientific renderer transparent.

## Finding B — TER startup had redundant presentation/layout work

### Reasoning pass 1: presentation lifecycle

The Unit page already owns `T.render()` through its `onOpen` callback, but TER Activity activation also called `T.render()` immediately after `openPage()`. This duplicated control/table synchronization during each activation.

`renderLinkedUi()` also reapplied the unchanged PlotGroup layout on every data refresh. `applyLayoutSettings()` itself schedules a seven-plot resize pass, while the reactive result effect scheduled another resize pass after `renderLinkedUi()`.

The R–V base is frame-priority. `renderLinkedUi()` nevertheless called `applyResistanceSelection()` immediately after scheduling the base render. On a real scheduled renderer, the base data may not yet exist, causing selection logic to request the base again.

### Reasoning pass 2: first-paint scheduling

The four TER reduction plots already use `idle`; transform heatmap uses `idle`; R–V uses `frame`. The primary TER heatmap was the only heavy first-row scalar field left at the default immediate priority. Restored projects serialize the TER result, so initial presentation can immediately redraw that scalar field while the page is still settling.

The accidental seven nested Material surfaces also forced extra semantic Material assignment and, under glass profiles, extra backdrop/shadow compositing after first paint. This connects the visual double-layer defect and the perceived startup slowdown through the same wrong surface boundary.

### Fix

- Activity `onActivate` only opens the page; page `onOpen` remains the single `T.render()` owner.
- `renderLinkedUi()` no longer reapplies unchanged layout geometry.
- The reactive result effect remains the single post-render seven-plot resize owner.
- R–V selection styling waits for the frame-priority base render promise instead of immediately attempting selection paint after scheduling it.
- The primary TER heatmap now uses `renderPriority:'frame'` so the page shell can paint before scalar-field drawing.

## Validation

Two materially different evidence classes were used.

### Source / contract evidence

- `test-v37112-scientific-plot-material-startup.js` proves delegated Unit plots use chart-host identity, not Material-surface identity.
- The same gate proves Semantic Registry still recognizes true standalone scientific surfaces, while renderer-neutral chart hosts do not claim a Material role.
- Material recipe source proves an accidental nested surface necessarily owns a shadow.
- TER source checks prove the duplicate activation render/layout paths are absent and primary heatmap scheduling is frame-priority.

### Runtime / data-flow evidence

`test-v36895-ter-feature-runtime-end-to-end.js` now exercises the real TER feature runtime with delayed frame-like R–V rendering and counts lifecycle work:

- initial PlotGroup layout application: **1**;
- initial resize pass: **7 plots once**;
- Activity activation: opens page once, **0 extra feature-runtime `T.render()` calls**;
- explicit data refresh: exactly **1 `T.render()`**;
- refresh layout reapplication: **0**;
- refresh resize: **7 plots once**;
- R–V base schedule: **1**;
- primary heatmap priority: **frame**.

Additional final-source validation:

- TER-focused `test`: **59/59 PASS**;
- TER-focused `check`: **59/59 PASS**;
- Mobile TER subset: **16/16 PASS**;
- Mobile ScientificPlot invalidation subset: **1/1 PASS**;
- Performance suite: **PASS**;
- Hard Visual Invariants: **87/87 PASS**;
- Architecture Hygiene: **PASS**;
- Native Analysis strict audit: all tracked counts **0**;
- Plugin manifests/packages: **17/17 PASS**;
- Style Ownership Gate strict: **0 violations**;
- Style ownership strict: **0 cross-file collisions**.

Full Windows Electron pixel/GPU acceptance cannot be performed in this Linux environment, so the visual item remains WIP until the same Windows client is rechecked.
