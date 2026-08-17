# Workflow / Recipe Engine — v3.18

Global API:

```js
window.DKDSWorkflow
```

## Concepts

A workflow combines registered providers without modifying the application host.

```text
input Artifact
   ↓
Processor
   ↓
Processor
   ↓
Analyzer
   ↓
Result Artifact
```

Charts are registered separately but can also appear as chart nodes that produce chart specifications without requiring DOM side effects.

## Provider registries

Plugins should use typed APIs:

```js
ctx.workflow.processors.register(id, spec)
ctx.workflow.analyzers.register(id, spec)
ctx.charts.register(id, spec)
ctx.workflow.recipes.register(id, recipe)
```

Do not manually write to generic registries when a typed API exists.

## Processor

A Processor transforms data.

```js
ctx.workflow.processors.register('table.normalize', {
  name: 'Normalize',
  inputKinds: ['data.table'],
  outputKinds: ['data.table'],
  parameterSchema: {...},
  async run({ inputs, parameters, context, signal, execution }) {
    const table = inputs.input;
    return newTable;
  }
});
```

Processors should return new artifacts rather than silently editing source artifacts.

## Analyzer

An Analyzer extracts a result.

```js
ctx.workflow.analyzers.register('fit.linear', {
  inputKinds: ['data.table'],
  outputKinds: ['result.fit'],
  parameterSchema: {...},
  run({ inputs, parameters }) {
    return DKDSData.createFitResult(...);
  }
});
```

## Chart Provider

A Chart Provider controls workflow-specific visualization.

```js
ctx.charts.register('spectrum.fit', {
  inputKinds: ['data.table'],
  parameterSchema: {...},
  render({ container, artifact, parameters }) {
    Plotly.react(container, ...);
  }
});
```

Optional:

```js
buildSpec(...)
```

allows the chart to participate in a recipe without immediately rendering to a DOM element.

## Recipe format

```json
{
  "schema": 1,
  "id": "my.recipe",
  "name": "My Recipe",
  "version": "1.0.0",
  "inputs": [
    { "id": "main", "kind": "data.table" }
  ],
  "nodes": [
    {
      "id": "derive",
      "type": "processor",
      "provider": "formula.derived-column",
      "inputs": {
        "table": "input:main"
      },
      "parameters": {
        "name": "Resistance",
        "formula": "abs(Vd / Id)",
        "unit": "Ω"
      }
    },
    {
      "id": "summary",
      "type": "analyzer",
      "provider": "table.summary",
      "inputs": {
        "input": "node:derive"
      },
      "parameters": {}
    }
  ],
  "outputs": {
    "table": "node:derive",
    "summary": "node:summary"
  }
}
```

References:

```text
input:<input-id>
node:<node-id>
node:<node-id>:<object-key>
```

The engine topologically sorts nodes, detects cycles and resolves node references.

## Recipe-level parameters

A Recipe may have its own `parameterSchema`.

Node parameters can reference recipe parameters:

```json
{
  "formula": { "$param": "formula" }
}
```

or:

```text
"param:formula"
```

Execution:

```js
await DKDSWorkflow.run(recipe, {
  inputs: { main: table },
  parameters: { formula: 'Vd / Id' }
});
```

## Execution result

```text
id                 workflow execution id
recipeId
recipeVersion
parameters
startedAt
completedAt
outputs
nodeResults
```

Artifact outputs receive workflow provenance with execution and node ids.

## Sequential builder

For UI-driven workflows where every step consumes the previous step:

```js
const recipe = ctx.workflow.buildSequentialRecipe({
  id: 'user.workflow',
  name: 'User workflow',
  steps: [
    { type:'processor', provider:'formula.derived-column', parameters:{...} },
    { type:'analyzer', provider:'table.summary', parameters:{...} }
  ]
});
```

The Data Center UI uses this form. A future visual node editor can emit the full DAG recipe format without changing the engine.
