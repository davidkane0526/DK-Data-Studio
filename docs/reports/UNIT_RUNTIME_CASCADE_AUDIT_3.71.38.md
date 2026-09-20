# Unit Runtime Cascade Audit — v3.71.38

## Scope

This audit re-checks the Unit migration from the bottom up for the two failure classes exposed by the Data Center Windows screenshots:

1. a semantic Field proxy implemented with a physical `<button>` being re-sized by generic button geometry; and
2. Unit Layout shorthand geometry (`gap`, `padding`, `margin`, `inset`, `overflow`) being written and then partially erased by later longhand cleanup through real browser CSSOM semantics.

This is separate from the v3.71.34 cross-layer ownership audit. A page can have **one declared owner** and still be wrong if that owner's own runtime destroys its shorthand, or if a tag-based fallback reclassifies a semantic component.

## Historical source re-check

The following rows were measured directly from archived clean source ZIPs available in this workspace. `Sensitive mounts` means a production Unit Layout mount that used a shorthand-bearing public recipe or explicit shorthand geometry and therefore passed through the unsafe pre-v3.71.37 CSSOM loop.

| Archived version | Unsafe CSSOM loop | AnalysisWorkbench excludes Field-proxy buttons | Data Center sensitive mounts | Pulse sensitive mounts | Resonance sensitive mounts | TER sensitive mounts |
|---|---:|---:|---:|---:|---:|---:|
| 3.71.28 | yes | no | 11 | 4 | 0 | 0 |
| 3.71.29 | yes | no | 11 | 4 | 0 | 0 |
| 3.71.30 | yes | no | 11 | 4 | 0 | 0 |
| 3.71.31 | yes | no | 11 | 4 | 0 | 0 |
| 3.71.32 | yes | no | 12 | 4 | 0 | 0 |
| 3.71.34 | yes | no | 2 | 4 | 0 | 0 |
| 3.71.35 | yes | no | 2 | 4 | 0 | 0 |
| 3.71.36 | yes | no | 1 | 4 | 0 | 0 |
| 3.71.37 | **no** | **yes** | safe on Desktop path | safe on Desktop path | safe on Desktop path | safe on Desktop path |
| 3.71.38 | **no** | **yes** | **safe** | **safe** | **safe** | **safe** |

A complete v3.71.33 source ZIP is not present in the current audit workspace, so no exact mount count is claimed for that version.

### What this means

- **Data Center was not the only plugin exposed to the shorthand bug.**
- **Pulse Analysis was also exposed**, through four production Unit layout mounts: `inline-range`, `file-toolbar`, `active-file-head`, and the control-form host with accepted padding.
- Resonance and TER had no production Layout mount using this shorthand path in the audited snapshots, so this exact CSSOM failure did not alter their current Unit layout geometry.
- The risk was broader than the four plugins: **58 of 73 published Layout recipes** use at least one shorthand family. Any current or future SDK plugin selecting those recipes would have been vulnerable under the old runtime.

The Pulse finding is especially important after v3.71.34. Earlier duplicate plugin CSS could accidentally mask a Unit gap/padding that the runtime had erased. Once duplicate owners were correctly removed, the latent Unit-runtime bug could become visually obvious. Removing a bad second owner therefore exposed a bug in the remaining legitimate owner; it did not mean the ownership cleanup itself was wrong.

## Field-proxy blast radius

Among the four production Unit presentations, current first-party source declares popup multi-select (`columns` / `multiselect`) ParameterSchema fields only in Data Center:

- chart `Y 列`;
- Workflow `保留列`;
- Workflow `检查列`;
- column-statistics `统计列`.

Pulse, Resonance and TER do not currently declare this proxy field type in their production Unit presentation path. Therefore the Windows `Y 列` height mismatch was directly visible in Data Center, not in those three plugins.

The bug was still a **Core semantic bug**, not a Data Center bug: any future or third-party AnalysisWorkbench using a popup multi-select would have inherited generic button geometry.

## Additional same-class issue found during the re-check

The Desktop rule was not the only tag-based path. The v3.71.37 Desktop repair still left two Mobile tag-based paths that could split a native select and a button-backed Field proxy:

1. Drawer button padding targeted every `button`, including `.dkds-field-control` proxies.
2. Compact-density font/padding targeted `input/select/textarea` by physical tag and therefore skipped button-backed canonical Fields.

v3.71.38 closes both at the generic platform owner, so **3.71.38 is the first audited baseline where the semantic Field-proxy rule is closed on both Desktop and Mobile**:

- mobile drawer action padding explicitly excludes `.dkds-field-control`;
- compact Field density targets `.dkds-field-control` directly, while non-canonical native inputs retain their generic fallback.

No plugin selector or `Unit_for_xxx` was introduced.

## Current v3.71.38 production census

The corrected source census is:

| Plugin | Layout mounts | Shorthand-sensitive mounts | Popup multi-select schemas |
|---|---:|---:|---:|
| Data Center | 15 | 1 | 4 |
| Pulse Analysis | 18 | 4 | 0 |
| Resonance Workbench | 43 | 0 | 0 |
| TER Analysis | 5 | 0 | 0 |
| **Total** | **81** | **5** | **4** |

The previous audit reported 82 Layout mounts because its source scanner incorrectly counted the local Resonance `layout(...)` helper **definition** as a runtime mount. v3.71.38 fixes that census bug; no production layout was removed.

## Permanent gates added

`tools/quality/unit-semantic-cascade-audit.js` now runs from `architecture:hygiene` and rejects:

- an incomplete shorthand-family contract;
- unsafe shorthand/longhand write order;
- generic AnalysisWorkbench button geometry that can re-own a canonical Field proxy;
- generic global button fallback that can re-own a canonical Field proxy;
- Mobile drawer button geometry leaking into a canonical Field proxy;
- Mobile compact density that omits canonical Field identity;
- a popup multi-select proxy that does not carry canonical Field identity;
- broad tag-based button geometry rules that can reach a semantic Field proxy;
- unexpected changes in the current production Unit exposure census without review.

The Unit catalog remains **41**. No plugin-specific Unit was added.
