# Unit Composition Identity Audit — v3.71.35 WIP

## Scope

This audit was started after the production Data Center formula panel lost its ParameterForm controls while the formula reference chips remained visible, and after repeated Data Center Unit-cutover layout regressions exposed weaknesses not covered by the earlier geometry-owner audit.

The audit is intentionally broader than Data Center. It reviews the current public Unit composition runtime and historical v3.71.28–v3.71.34 sources for two independent failure classes:

1. **rendered-property ownership collision** — two owners write the same geometry/style property;
2. **Unit identity clobber** — a Unit that adopts/decorates an existing host overwrites that host's structural Unit identity or variant.

The first class was closed in v3.71.34. v3.71.35 closes the second class.

## User-visible failure chain

The production Data Center formula path rerenders when Artifact/domain state changes. The sequence was:

1. `dcFormulaParams` is created as a public Layout Unit (`layout-v2`, `formula-grid`).
2. `ParameterForm` is mounted with `layoutOwner:'host'` so the already accepted formula-grid geometry remains the only outer-layout owner.
3. Before v3.71.35, `mountParameterForm()` replaced the host metadata with `parameter-form-v2`.
4. On the next domain rerender, the previous ParameterForm was destroyed and the same host was reused.
5. v3.71.33/v3.71.34 correctly validated that `layoutOwner:'host'` requires a Layout Unit, but the first mount had erased that identity.
6. The second mount therefore threw `UNIT_PARAMETER_FORM_HOST_LAYOUT_REQUIRES_LAYOUT_UNIT` after the old controls were destroyed.
7. Formula reference chips from the previous render remained visible, producing the exact observed UI: header/action + `Vd / Id / Vg / sourceLine`, but no name/formula/unit/role/replace controls.

This is not a Data Center-specific styling issue. It is a generic Unit-composition metadata bug.

## Historical review

A source-level review of v3.71.28–v3.71.34 found the same destructive metadata pattern in the generic Unit runtime:

| Version | ParameterForm host identity | Layout apply/bind identity | SplitPane host identity | scientific/adoptive identity |
|---|---|---|---|---|
| 3.71.28 | overwrite present | overwrite present | overwrite present | overwrite present |
| 3.71.29 | overwrite present | overwrite present | overwrite present | overwrite present |
| 3.71.30 | overwrite present | overwrite present | overwrite present | overwrite present |
| 3.71.31 | overwrite present | overwrite present | overwrite present | overwrite present |
| 3.71.32 | overwrite present | overwrite present | overwrite present | overwrite present |
| 3.71.33 | overwrite present | overwrite present | overwrite present | overwrite present |
| 3.71.34 | overwrite present | overwrite present | overwrite present | overwrite present |
| **3.71.35** | **additive role** | **additive role** | **additive behavior** | **additive role** |

In v3.71.28–v3.71.32 much of this was latent metadata debt because the affected consumers did not validate/reuse the structural role on every remount. v3.71.33 introduced the correct mutually exclusive host-layout validation, which exposed the already-existing identity corruption in the Formula remount path.

## Generic fix

Unit Templates 2.5.15 defines an explicit rule:

> **Adoption is additive. A derived/decorator Unit may add a Unit role, but it may not erase the structural Unit identity or structural variant of an existing node.**

The Core now records adopted capabilities in namespaced metadata through `markUnitRole()` and resolves them through `hasUnitRole()`.

The following generic paths were audited and converted/verified:

- Workspace adoption;
- ComponentTree mounting;
- **Layout.apply / Layout.bind**;
- host-owned ParameterForm;
- Portable adoption;
- Meter binding;
- MovableWindow binding;
- SplitPane behavior;
- PlotView adoption;
- PlotGroup adoption;
- ScientificPlot adoption/delegation.

A node may therefore participate in more than one public Unit capability without changing which Unit owns its structural role.

### Example

A Panel that receives a Layout decorator remains structurally a Panel:

```text
primary:       panel-v2 / headed
added role:    layout-v2 / row
```

A `formula-grid` Layout that receives a host-owned ParameterForm remains structurally a Layout:

```text
primary:       layout-v2 / formula-grid
added role:    parameter-form-v2 / compact
layout owner:  host
```

Destroying and remounting the ParameterForm does not invalidate that contract.

## Ownership relation to v3.71.34

The v3.71.34 cross-layer audit and this audit address different layers and both remain required:

- **v3.71.34:** Unit runtime geometry vs authored plugin CSS must have zero same-property double owners.
- **v3.71.35:** multiple Unit capabilities on one node must not erase one another's structural identity/variant.

`layoutOwner:'core'|'host'`, `responsiveTarget`, and the existing geometry-value vocabulary remain the public extension mechanisms. No `Unit_for_DataCenter`, `Unit_for_Pulse`, or other plugin-specific Unit was introduced. The public catalog remains **41 Units**.

## Data Center corrections in this build

### Formula controls

The formula ParameterForm can now be destroyed and mounted repeatedly on the same `formula-grid` Layout host. The regression test executes two consecutive host-owned mounts and verifies that the host remains:

```text
data-dkds-unit-template = layout-v2
data-dkds-unit-variant  = formula-grid
```

while also exposing the additive ParameterForm role.

### Preview count right inset

The bounded-preview note now receives **28 px right inset** from its Unit Layout geometry:

```text
padding: 0 28px 4px 12px
```

The obsolete 18 px geometry vocabulary entry was removed. The Unit geometry source-parity gate rejected that stale entry until it was removed, so the current geometry vocabulary contains only values still derived from accepted production composition.

No Data Center CSS override was added for this correction.

## From-scratch current audit result

After the v3.71.35 changes:

- production Unit presentations audited: **4** (TER / Pulse / Resonance / Data Center);
- public Unit types: **41**;
- Unit Layout mounts inspected by ownership gate: **82**;
- SplitPane mounts: **1**;
- runtime Unit ↔ plugin CSS geometry violations: **0**;
- Style Architecture cross-file rendered-property collisions: **0**;
- `!important`: **0**;
- Native Analysis tracked ownership violations: **0**;
- known destructive adoption paths listed above: **0 remaining**.

This does not claim that future UI regressions are impossible. It does mean that the two failure classes exposed during the Data Center cutover now have explicit contracts and regression gates rather than screenshot-specific overrides.

## Validation

Final source validation for this build includes:

- Test manifest: **453 / 453 PASS**;
- Check coverage: **460 / 460 PASS** (`449` shared + `4` test-only + `11` check-only, no skipped current-contract case);
- Mobile: **103 / 103 PASS**;
- Hard Visual Invariants: **87 / 87 PASS**;
- Architecture Hygiene: **PASS**;
- Unit runtime/style ownership strict gate: **0 violations**;
- SDK suite: **PASS**;
- SDK Harness: **PASS**;
- Scientific parity: **PASS**;
- Plugin Boundary: **0**;
- Plugin manifests/packages: **17 / 17 PASS**;
- Performance suite: **PASS**.

Windows Electron visual acceptance remains a separate real-host acceptance step.
