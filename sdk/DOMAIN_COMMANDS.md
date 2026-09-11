# Validated domain commands

SDK 1.37 adds one validated command path for Studio UI actions, scripts, AI/MCP callers and replayable recipes. Plugins register commands through `ctx.commands.register(...)`; external callers discover and execute the same registrations through Studio Kernel `commands.*` tools. Do not create a second script-only or MCP-only executor.

## Declare the capability

Plugins using domain metadata, history or replay declare:

```json
{
  "requiresCore": ["execution.commands"]
}
```

Basic legacy `ctx.commands.register/run` remains part of the current Plugin API. Legacy UI-only commands are not listed through the external domain-command discovery surface and are not retained in domain history. `execution.commands` is required when a plugin uses `domainCommand`, `ctx.commands.list()`, `history()` or `replay()`.

## Replayable command

```js
ctx.commands.register('example.analyze', async ({artifactId, parameters}) => {
  const input = ctx.data.artifacts.get(artifactId);
  const result = await ctx.analysis.algorithms.run(
    {category:'example', id:'example.fit', version:'2.4.0'},
    input,
    {parameters}
  );
  return result;
}, {
  domainCommand: {
    domain: 'analysis.example',
    version: '1.0.0',
    title: 'Example analysis',
    replayable: true,
    inputSchema: {
      type: 'object',
      required: ['artifactId'],
      properties: {
        artifactId: {type:'string'},
        parameters: {type:'object'}
      },
      additionalProperties: false
    },
    inputs: args => [{artifactId:args.artifactId, role:'input'}],
    algorithm: () => ({
      category:'example', id:'example.fit', version:'2.4.0',
      provider:'example.plugin@1.3.0'
    }),
    parameters: args => args.parameters || {},
    outputs: result => result?.id ? [{artifactId:result.id, role:'result'}] : []
  }
});
```

A replayable algorithm-backed command must report an **exact algorithm version**. Core records the command id/version and owning plugin package version, invocation source, canonical arguments, input Artifact revision/fingerprint, algorithm/provider identity, parameters, status, duration and output Artifact revision/fingerprint.

`captureArgs(payload)` may materialize UI defaults into canonical replay arguments. Use it for controls whose omitted payload means “current selection/current settings”. It must return a serializable value; do not capture DOM/Event objects or large duplicate data arrays.

## History and replay

```js
const rows = ctx.commands.history({commandId:'example.analyze', limit:20});
const value = await ctx.commands.replay(rows[0].executionId);
```

Replay is opt-in (`replayable:true`). By default Core requires every recorded input Artifact to still have the same Store-local `artifactRevision`. If an input changed, replay fails instead of silently applying an old recipe to new data. Callers may explicitly set `requireRevisions:false` only when they intentionally want to re-run the recorded parameters against the current Artifact state.

Plugin-side history/replay is owner-scoped: a plugin reads and replays only its own domain-command records. Studio Kernel/MCP may access the global registry through the host permission boundary.

Command history is a bounded runtime execution log, not a replacement for persisted Artifact provenance. Commands that create Artifacts should still publish canonical Artifacts with normal lineage/provenance; the command record links the execution to those output Artifact references.

## Studio Kernel / MCP

The Core exposes the same registry as:

- `commands.list`
- `commands.get`
- `commands.run`
- `commands.history`
- `commands.replay`

MCP and AI callers route through Studio Kernel into this registry. Plugins must not register separate MCP handlers for the same domain action.

## Execution rules

- UI, scripts and MCP share one command handler and validation path.
- Ordinary UI-only commands may remain non-replayable.
- Keep compute-heavy work in `ctx.tasks`/algorithm providers; a domain command orchestrates validated execution and provenance, it is not a private worker pool.
- Replayable commands must not depend on hidden mutable UI state after `captureArgs` has produced canonical arguments.
- Do not store secrets, DOM objects, file handles or opaque native objects in replay arguments.
