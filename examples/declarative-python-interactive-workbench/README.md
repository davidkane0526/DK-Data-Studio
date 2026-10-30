# Generated interactive workbench reference

This Phase F reference proves that generated scientific plugins reuse the existing interaction and validated-command infrastructure rather than inventing a second path.

- one Core InteractionRuntime owns reference-only Selection and the shared project-scoped transaction path;
- two source-backed curves expose stable `artifactId + seriesId` identities;
- ScientificPlot viewport linkage uses explicit unit/quantity semantics and the existing viewport channel;
- ScientificPlot legend isolate/restore linkage uses the existing bounded legend channel;
- the UI action invokes the same `ctx.commands.run` registration used by scripts and Studio Kernel/MCP;
- command capture freezes concrete scoped Artifact IDs and parameter values before execution, so replay does not reinterpret source-list indexes;
- command history can capture source revisions/fingerprints, exact algorithm identity, parameters and output Artifact references;
- computation still runs through the generated JavaScript DKDSTaskDefinition and Core Task Runner;
- no global interaction listener, Python runtime, private Worker, alternate Store, private plot renderer or Presenter branch is generated.
