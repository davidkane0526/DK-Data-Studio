# DK Data Studio v3.41.5 Verification

## Scope

This patch fixes the selection-link regression at the Core layer instead of adding another Resonance-only UI patch. Canonical data visibility and interaction focus are explicitly separate: visibility controls which sweeps participate in plots/analysis; the Interaction Runtime owns the current semantic focus and selected items; linked views only project that state.

## Core changes

- UI Infrastructure `6.4.0` adds `SelectionViewBinding` through `InteractionRuntime.bindView(...)`.
- Linked views receive Core-managed `focused / selected / dimmed` classes, DOM-mutation refresh and focused-item reveal via `scrollIntoView({block:'nearest', inline:'nearest'})`.
- UI Infrastructure adds `HorizontalWheelScroller`. A horizontal legend/tab strip may hide scrollbar chrome and translate normal mouse-wheel delta into horizontal `scrollLeft` movement.
- GRS Plugin Workspace design-system contract advances to `1.5` and advertises `linkedSelectionViews` and `horizontalWheelStrips`.

## Resonance projection

- Main-plot curve/peak selection continues to publish the canonical `resonance.sweep` / `resonance.peak` selection document.
- Main legend registers each Vg entry as a dataset projection of the same selection document. The focused dataset remains full strength; other visible legend entries dim without becoming hidden.
- Data-list rows register the same dataset projection. When focus changes from the plot or legend, the corresponding row receives Core accent-blue focus chrome and is automatically revealed inside the vertical list.
- Clicking a legend chip or a non-control area of a dataset row is delegated through the Core linked-view binding and publishes back to the same Interaction Runtime.
- Forward/reverse visibility remains independent of focus, so focusing one sweep cannot remove the other visible scan direction from group/trend analysis.

## Horizontal legend behavior

- The Resonance legend no longer shows a horizontal scrollbar.
- While the pointer is over an overflowing legend, a normal vertical mouse-wheel motion scrolls the legend horizontally.
- Focusing an off-screen legend item automatically reveals it.

## Verification

- `npm run check`: PASS.
- Targeted Interaction Runtime / UI polish / plugin visual-contract / AnalysisWorkbench tests: PASS.
- Scientific engine parity, TER Python parity and first-party plugin boundary checks: PASS as part of `npm run check`.
- Chromium under Xvfb + CDP executed the real Core `SelectionViewBinding` and `HorizontalWheelScroller`: selecting dataset `b` focused the `b` legend/list representations and dimmed `a`; an 80-pixel wheel delta produced `scrollLeft = 80`; clicking legend `c` moved Core focus to `c`; computed `scrollbar-width` was `none`.
- Chromium screenshot was visually inspected: focused legend/list items use the shared blue focus treatment and the horizontal scrollbar is absent.
- `git diff --check`: PASS before commit.

## Version

Application/runtime/resonance release version: `3.41.5`. Plugin API remains `1.8.0` because the new linked-view methods are backward-compatible additions to `ui.interaction`.
