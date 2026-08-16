# Standard Data Model and Provenance — v3.18

## Purpose

The plugin branch no longer treats every feature-specific object as the primary data contract.

The generic contract is exposed as:

```js
window.GRSData
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
  GRSData.createTable()

data.series
  GRSData.createSeries()

data.sweep
  GRSData.createSweep()

data.events
  GRSData.createEventSeries()

data.image
  GRSData.createImageData()

result.peaks
  GRSData.createPeakSet()

result.fit
  GRSData.createFitResult()

result.analysis
  GRSData.createAnalysisResult()

annotation
  GRSData.createAnnotation()
```

Plugins may introduce additional `kind` values, but should first prefer these generic types.

## DataTable

A DataTable is the default tabular exchange type.

```js
const table = GRSData.createTable({
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
ctx.data.artifacts.syncLegacy()
```

The Artifact Store is project-scoped, not application-global.

### Legacy resonance data

The mature resonance workspace still uses historical `datasets / sweeps / peaks` state.

For migration, every legacy dataset is mirrored into a deterministic transient DataTable:

```text
legacy dataset
    ↓
GRSData.fromLegacyDataset()
    ↓
data.table
```

These source mirrors use stable ids derived from the legacy dataset path.

They are `transient:true`, which means they are reconstructed from the existing project dataset when a project opens and are **not duplicated in saved project JSON**.

Derived artifacts are persistent.

## Project JSON

New generic artifacts are stored under:

```json
{
  "dataModel": {
    "schema": 1,
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
