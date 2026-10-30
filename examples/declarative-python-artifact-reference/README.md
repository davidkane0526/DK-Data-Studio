# Declarative Artifact pipeline reference

This reference proves the next Phase F boundary:

- input comes only from the plugin-scoped Core source catalog;
- DataTable columns are resolved from lightweight column metadata;
- column payloads are read only through explicit bounded readColumnRange calls;
- Python is lowered at build time to an ordinary JavaScript DKDSTaskDefinition;
- runtime execution uses the existing Core Task Runner;
- results update a Unit ScientificPlot and Unit TableSurface;
- a derived canonical DataTable Artifact is published with source lineage;
- no Python runtime/backend is added.
