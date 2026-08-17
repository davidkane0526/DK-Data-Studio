# Data Center

`builtin.data-center` is the generic customization workspace for the plugin branch.

It demonstrates and exposes the five platform layers introduced in 3.18:

1. standard `DKDSData` artifacts and provenance;
2. Processor / Analyzer / Chart provider interfaces;
3. `DKDSWorkflow` recipe execution;
4. schema-driven parameter panels through `DKDSParameters`;
5. safe formula-derived DataTable columns through `DKDSFormula`.

The plugin is intentionally domain-neutral. Resonance, TER and pulse analysis remain separate plugins/workflows.
