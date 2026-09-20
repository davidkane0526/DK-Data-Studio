# Data Center

`builtin.data-center` is the generic customization workspace for the plugin branch.

It demonstrates and exposes the five platform layers introduced in 3.18:

1. standard `DKDSData` artifacts and provenance;
2. Processor / Analyzer / Chart provider interfaces;
3. `DKDSWorkflow` recipe execution;
4. schema-driven parameter panels through `DKDSParameters`;
5. safe formula-derived DataTable columns through `DKDSFormula`.

The plugin is intentionally domain-neutral. Resonance, TER and pulse analysis remain separate plugins/workflows.


## Unit migration runtime seams

During the Unit migration, `domain-runtime.js` owns the bounded serializable live snapshot/action surface, `chart-runtime.js` owns Chart Provider lifecycle, and `live-domain-bridge.js` binds those generic seams to the existing production Data Center state and callbacks. This keeps `feature-runtime.js` focused on production page orchestration and below the repository module-size ceiling.


## Production Unit presentation

As of v3.71.30, `unit-presentation.js` is the sole production presentation/composition owner. It builds the accepted Data Center page, titleless data-control PRIME, bounded preview table, Formula/Workflow/Provenance tools, and scientific-secondary chart PRIME through the public Unit Templates contract. `shared-views.js` is only a thin behavior-to-presentation adapter; the former Mobile-specific presentation module has been removed. Domain, selection, workflow and Chart Provider ownership remain in the existing production runtimes.
