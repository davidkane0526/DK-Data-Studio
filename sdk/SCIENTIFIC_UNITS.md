# Scientific dimension and unit compatibility — SDK 1.40.0

Phase E step 5 adds one Core-owned scientific unit contract for future linked scientific state. It does not add linked viewport behavior by itself and it does not add another event channel.

Use `ctx.science.units` whenever a plugin or link adapter needs to decide whether numeric scientific axes are compatible.

## Axis compatibility is semantic, not textual

Do not use axis labels, titles, column names, or display strings as proof that two axes can be linked.

```js
const units=ctx.science.units;

units.compatibility(
  {name:'Gate voltage',unit:'mV'},
  {name:'Drain bias',unit:'V'}
);
// compatible: true, conversion.scale = 0.001
```

Different labels may still describe physically compatible axes. Conversely, identical labels do not make incompatible quantities safe:

```js
units.compatibility(
  {name:'Signal',unit:'V'},
  {name:'Signal',unit:'A'}
);
// compatible: false, reason: 'dimension-mismatch'
```

The compatibility decision uses the normalized physical dimension and a known numeric conversion. Label equality is deliberately ignored.

## Fail-closed behavior

Unknown or non-convertible units are not guessed.

```js
units.compatibility({unit:'a.u.'},{unit:'a.u.'});
// compatible: false, reason: 'unknown-unit'

units.compatibility({unit:'dB'},{unit:'1'});
// compatible: false, reason: 'unknown-unit'
```

An explicit dimension may disambiguate an axis, but it must agree with the unit. A physical dimension without a known unit is still insufficient for numeric viewport conversion.

```js
units.axis({dimension:'voltage',unit:'A'});
// known: false, reason: 'dimension-unit-conflict'
```

For a truly dimensionless axis, declare `dimension:'dimensionless'` or use unit `1`. `%` is a known dimensionless unit and converts to/from ratio values.

## Supported conversion model

The current contract supports affine conversion:

```text
target = source * scale + offset
```

This covers ordinary SI-prefix conversion and offset temperature conversion such as `°C <-> K`. It also supports SI-derived compound units that can be reduced to a known physical dimension, including common electronics/materials forms such as:

```text
A/cm^2 <-> A/m^2
V/um   <-> V/m
Ohm cm <-> Ohm m
S/cm   <-> S/m
C/m^2
```

Unicode `μ` / `µ`, `Ω` / `Ω`, and superscript exponents such as `cm²` are normalized. Unknown expressions fail closed. Angles follow SI dimensional treatment (radian is dimensionless); `angle` is retained only as semantic axis metadata, not as an eighth SI base dimension.


The Core unit owner is the only conversion table. Plugins must not duplicate SI-prefix tables or implement private axis conversion rules.

## API

Normalize a unit or dimension:

```js
units.normalizeUnit('μA');          // 'µA'
units.normalizeDimension('current'); // 'electric-current'
```

Inspect metadata:

```js
const unit=units.unit('kΩ');
const dimension=units.dimension('resistance');
const axis=units.axis({unit:'mV',dimension:'voltage',quantity:'gate-voltage'});
```

Use artifact/column helpers instead of rebuilding metadata extraction in each plugin:

```js
const xAxis=units.artifactAxis(seriesArtifact,'x');
const yAxis=units.artifactAxis(seriesArtifact,'y');
const columnAxis=units.column(columnMetadata);
```

Check and convert:

```js
const decision=units.compatibility(sourceAxis,targetAxis);
if(!decision.compatible)return;

const x=units.convertAxisValue(sourceX,sourceAxis,targetAxis);
const range=units.convertAxisRange([x0,x1],sourceAxis,targetAxis);
```

`InteractionRuntime` exposes the same Core decision without owning a second conversion implementation:

```js
const interaction=ctx.ui.interaction.create('linked-view');
if(interaction.canLinkAxes(sourceAxis,targetAxis)){
  const converted=interaction.convertAxisRange(sourceRange,sourceAxis,targetAxis);
}
```

`InteractionRuntime.axisCompatibility(...)` delegates to `ctx.science.units`. If the Scientific Units owner is unavailable, it returns `compatible:false` rather than guessing.

## Artifact metadata

DataTable columns may carry optional `dimension` and `quantity` fields in addition to `unit`.

Series/transform/sweep Artifacts may carry:

```text
xDimension / yDimension
xQuantity  / yQuantity
```

Matrix Artifacts may additionally carry:

```text
valueDimension
valueQuantity
```

These fields are semantic metadata. They do not replace units and they do not make an unknown unit numerically convertible. Core metadata-only Artifact/column reads preserve them.

## Phase E viewport linking

SDK 1.43.0+ viewport linking consumes this Scientific Units contract directly. A plot opts in with `viewportPolicy` and declares scientific axis semantics with `axisSemantics` (or scalar-field `x/y` unit, dimension and quantity metadata). Core never treats matching axis labels as proof of compatibility.

A linked numeric range is applied only after the source and target axes pass the same `compatibility(...)` gate and, when required, `convertAxisRange(...)` converts it into the target unit. Explicit quantity mismatches fail closed even when dimensions and units are otherwise compatible. Unknown units also fail closed.

Viewport state remains separate from Selection schema 2 and travels through the existing project-scoped Interaction transaction bridge. See [`VIEWPORT_LINKING.md`](VIEWPORT_LINKING.md). Legend visibility linking remains a later Phase E step and should reuse the same bounded generic Interaction linked-state transport rather than create another global event channel.
