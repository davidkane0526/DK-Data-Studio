# Unit Responsive / Density Contract — 2.5.38
## Mobile Surface allocation ownership
SDK 1.51.43 keeps responsive density inside Unit ownership while making Mobile outer geometry strictly Workspace-owned. Every semantic right/bottom companion consumes the final track resolved by the Workspace SplitController from the actual Workspace geometry; shared Mobile CSS does not apply a second viewport-size bound. Unit minima, preferred block sizes, internal scroll extent and responsive density stay inside the allocated Surface and never resize its parent track. Parameter Drawers remain independent overlay Surfaces and may still consume generic Unit inline constraints for their own minimum reasonable width.

## Geometry ownership / Surface negotiation

Responsive density remains Unit-owned. Each Layout evaluates its accepted responsive state against its **real allocated content width** and remains the only writer of its internal grid/flex geometry. PRIME, PlotGroup and other Units may publish intrinsic/detail constraints for internal composition and for explicitly defined overlay contracts such as parameter-Drawer inline fitting.

Scientific companion outer allocation is not a Unit negotiation surface. Mobile Presenter does not read recipe names, plugin breakpoints, `scrollHeight`, Unit block minima or descendant overflow to resize right/bottom tracks. Workspace `SplitController` is the sole default/user-preference and final-bound resolver against the actual Workspace frame; shared Mobile CSS only consumes the resulting track token. A Unit that receives less comfortable space must adapt or scroll internally rather than resize its parent Surface.

For parameter/data-control Drawers, responsive density and Surface allocation remain separate owners. A Layout Unit may publish the minimum local inline width required to preserve accepted controls, and Presenter resolves that generic deficit into the overlay Drawer width. This Drawer-only path must not reserve or alter scientific companion tracks. Saved Drawer width is a preference clamped to its live minimum.

One Core-owned Mobile split-state schema isolates Mobile from Desktop. Plugins/profiles cannot introduce private split generations.

All **41 public Units** are covered by `units.responsiveDensityAudit`. The default design principle is `compact-first-single-last-v1`.

- Unknown / zero measured width preserves the base recipe. It never means “smallest viewport”.
- Form, action, metric, connection and ordinary two-column layouts retain useful horizontal density while controls remain usable.
- Multi-column reductions are staged where useful; a six-column connection grid is 6 → 4 → 3 → 2 rather than 6 → 2.
- One-column fallback is a last resort for density-oriented ordinary UI. Scientific plot/table split compositions may stack earlier when their own minimum scientific geometry requires it.
- Plugins may tune only public Unit parameters: semantic variant, column preference, min item width, accepted gap/density, accepted responsive geometry/breakpoints, content inset, PRIME fill sizing, and Header hierarchy/meta placement.
- Desktop parameter/`data-control` PRIME regions may declare a restrained Workspace minimum width (`leftMin`) together with a nearby preferred width (`leftWidth`) and a main-workspace reserve (`leftReserve`). Core must honor that minimum as a true lower bound; responsive recipes must not be used as a substitute for letting the parameter rail collapse below its declared usable width.
- Mobile/overlay Presenters derive a **density floor** from descendant Unit recipes before accepting a saved or dragged drawer width. If a width would force a density-oriented Unit into its last-resort single-column fallback while more viewport width is available, Presenter grows the drawer only enough to remain above that floor. This is a lower bound, not a greedy target.
- Plugins may not override Core paint, typography scale, minimum hit geometry, state/accessibility semantics, lifecycle or ownership boundaries.

The release gate `npm run unit:density` enforces complete 41-Unit audit coverage, unknown-width base preservation, compact single-column ceilings for density recipes, and the current staged high-risk recipes.
