# SDK 1.50 Unit Composition Lab

This example deliberately **does not** reproduce the Resonance Workbench layout. It proves that SDK unit templates are independent building blocks:

- a primary result panel;
- one strict PlotView;
- a fixed data-control PRIME;
- a movable inspector PRIME;
- a movable PlotGroup PRIME with complete Core-owned header chrome.

The example ships **no plugin CSS**. All visual details come from existing approved Core component classes. The same units can be recombined into a completely different workbench layout.

Strict unit rules demonstrated here:

- `unitTemplates.plotView` always has a title/header, multiple placements, and export actions;
- `unitTemplates.plotGroup.registerPrime(..., {header:'standard'})` gives the complete group header: columns menu, placement, collapse, close;
- `header:'none'` is legal only for a fixed, non-movable PlotGroup PRIME;
- PlotGroup gap is selected by semantic density (`compact`, `regular`, `comfortable`), never raw pixels;
- `unitTemplates.scientificPlot` freezes the Core scientific mouse interaction policy and only permits non-conflicting domain extensions.
