# Scientific Transform Registry

DK Data Studio v3.51 introduces a Core registry for reusable scientific transforms and transform-driven scalar fields.

## Contract

A transform definition describes its stable ID, curve output semantic type, optional scalar-field semantic type, quantity/unit metadata, color-divergence policy, tags, and calculation function. The Core registry does not redefine numerical algorithms; algorithms remain in shared science/domain modules.

Built-in transport transforms are:

| ID | Curve semantic type | Scalar-field semantic type | Unit |
| --- | --- | --- | --- |
| `raw` | `science.iv.raw` | `science.transport.current-field` | A |
| `detrend` | `science.iv.background-removed` | `science.transport.background-removed-current-field` | A |
| `didv` | `science.transport.didv` | `science.transport.conductance-field` | A/V |
| `d2idv2` | `science.transport.d2idv2` | `science.transport.second-derivative-current-field` | A/V² |
| `dlog` | `science.transport.dlnabsidv` | `science.transport.log-current-slope-field` | 1/V |
| `dvdi` | `science.transport.dvdi` | `science.transport.differential-resistance-field` | V/A |
| `resistance` | `science.transport.resistance` | `science.transport.resistance-field` | Ω |

## Pipeline bridge

For every public transform the registry installs `transform.<id>`. If scalar-field projection is supported it also installs `scalar-field.<id>`. These stages inherit the Scientific Data Pipeline contract for cache identity, provenance, lineage, typed Artifact publication, Selection and ViewModel projection.

## Plugin rule

Plugins query the registry for available transforms and may register new transforms through `ctx.data.transforms`. They must not duplicate the canonical transform catalog or add new reusable transforms by editing TER/Resonance conditionals. Plugins using the registry declare `data.transforms`; generated Pipeline stages also require `data.pipeline`.
