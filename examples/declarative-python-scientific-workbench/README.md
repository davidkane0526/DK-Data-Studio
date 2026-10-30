# Generated scientific workbench reference

This Phase F reference proves a multi-source, multi-result scientific workbench without adding a second runtime:

- two independently scoped DataTable sources are selected by the existing source catalog;
- every source column is read through bounded Artifact range reads;
- one Python-authored function is lowered completely to a JavaScript DKDSTaskDefinition;
- one Core Task Runner invocation produces three PlotGroup curves and one Unit Table result;
- the same result publishes two canonical DataTable Artifacts with both source Artifact IDs in lineage;
- PlotGroup, PlotView and ScientificPlot are existing Unit/Core owners;
- no Python runtime, private CSS, private Worker pool, alternate Store or plugin-specific Presenter path is generated.
