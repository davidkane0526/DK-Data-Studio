# Standard Data Model and Provenance — v3.62

## Purpose

The plugin branch no longer treats every feature-specific object as the primary data contract.

The generic contract is exposed as:

```js
window.DKDSData
```

The model is deliberately JSON-serializable so the same artifacts can be consumed by Electron, LAN Web and the React Native Android shell.

## Artifact envelope

Every standard object has:

```text
artifactVersion
id
kind
name
createdAt / updatedAt
metadata
source
provenance[]
tags[]
transient
```

`kind` is the primary type discriminator.

Current factories:

```text
data.table
  DKDSData.createTable()

data.series
  DKDSData.createSeries()

data.sweep
  DKDSData.createSweep()

data.events
  DKDSData.createEventSeries()

data.image
  DKDSData.createImageData()

result.peaks
  DKDSData.createPeakSet()

result.fit
  DKDSData.createFitResult()

result.analysis
  DKDSData.createAnalysisResult()

annotation
  DKDSData.createAnnotation()
```

Plugins may introduce additional `kind` values, but should first prefer these generic types.

## DataTable

A DataTable is the default tabular exchange type.

```js
const table = DKDSData.createTable({
  name: 'Device A',
  columns: [
    { key:'Vd', name:'Drain voltage', unit:'V', role:'x', values:[...] },
    { key:'Id', name:'Drain current', unit:'A', role:'y', values:[...] },
    { key:'Vg', name:'Gate voltage', unit:'V', role:'group', values:[...] }
  ]
});
```

Column fields:

```text
id
key        machine-facing stable identifier inside a table
name       human-facing label
unit
dtype
role       x / y / group / index / derived / ...
values[]
metadata
```

Use `key` in recipes/formulas when possible. `name` may be localized or edited by users.

## Artifact Store

Every project tab owns a generic Artifact Store.

Core host API exposed to plugins:

```js
ctx.data.artifacts.list()
ctx.data.artifacts.get(id)
ctx.data.artifacts.add(artifact)
ctx.data.artifacts.upsert(artifact)
ctx.data.artifacts.remove(id)
ctx.data.artifacts.lineage(id)
```

The Artifact Store is project-scoped, not application-global.

### Canonical scientific source data

Studio 3.62 does not maintain a second `datasets` store. Imported transport data is persisted as `data.table` Artifacts, normally with `semanticType: "science.transport.iv"`, source metadata and `metadata.dataAssignments`.

Scientific algorithms that still operate most naturally on `{path, vg, points}` transport series receive an **ephemeral projection** from the canonical table rather than a mirrored persistent object:

```text
canonical data.table Artifact
    ↓
DKDSData.transportDatasetFromTable()
    ↓
ephemeral scientific transport view
```

`DKDSData.transportDatasetsFromArtifacts()` applies assignment scoping and produces these views for consumers such as Resonance and TER. The projection is never saved as a second project data source.

Historical project files are handled before runtime restore by `src/project-importers/compatibility-gateway.js`. That gateway materializes historical dataset arrays once into persistent canonical DataTable Artifacts and then removes the old fields.

## Project JSON

Schema v3 projects persist generic artifacts under `dataModel` and plugin/host state in separate namespaces:

```json
{
  "dataModel": {
    "schema": 2,
    "artifacts": []
  }
}
```

Feature-specific state must still use plugin namespaces under `plugins`.

Do not put feature-specific fields inside `dataModel`.

## Provenance

Every transformation should preserve how a result was produced.

A provenance step contains:

```text
id
timestamp
type
label
providerId
pluginId
version
parameters
inputs[]
outputs[]
manual
note
source
environment
```

Example:

```json
{
  "type": "formula",
  "label": "Derived column: Resistance",
  "providerId": "formula.derived-column",
  "pluginId": "builtin.data-center",
  "version": "1.0.0",
  "parameters": {
    "formula": "abs(Vd / Id)",
    "unit": "Ω"
  },
  "inputs": ["legacy-table:abc123"],
  "outputs": ["data-table:..."],
  "manual": false
}
```

The Workflow Engine also stamps:

```text
environment.executionId
environment.nodeId
```

so a result can be traced to one concrete workflow execution.

## Scientific rule

Never mutate the source artifact merely to make a chart convenient.

Preferred pattern:

```text
source artifact
    ↓
derive()
    ↓
new artifact + provenance step
```

This makes project reconstruction and manuscript result auditing possible.
