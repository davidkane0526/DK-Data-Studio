# Data Center

`builtin.data-center` is the generic customization workspace for the plugin branch.

It demonstrates and exposes the five platform layers introduced in 3.18:

1. standard `GRSData` artifacts and provenance;
2. Processor / Analyzer / Chart provider interfaces;
3. `GRSWorkflow` recipe execution;
4. schema-driven parameter panels through `GRSParameters`;
5. safe formula-derived DataTable columns through `GRSFormula`.

The plugin is intentionally domain-neutral. Graphene resonance, TER and pulse analysis remain separate plugins/workflows.
