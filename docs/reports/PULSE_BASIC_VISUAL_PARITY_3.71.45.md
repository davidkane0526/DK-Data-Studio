# Pulse Sampler Basic Visual Parity — v3.71.45

## Scope

This patch closes four basic visual regressions exposed after the Pulse Sampler production Unit cutover while preserving the architectural rule that Pulse owns no private presentation CSS and no Pulse-specific Unit.

The fixes are public Unit behavior. Pulse only composes Units and supplies allowed Unit parameters.

## Accepted-source comparison

The pre-cutover accepted Pulse presentation used four important contracts:

1. Vd/Vs/Vg used the normal toolbar-action silhouette inside a compact three-item selector.
2. The four designer actions stayed in one row at the normal parameter-panel width.
3. `已加入片段 / 删除最后片段` used an ordinary toolbar row with vertically centered content.
4. Scientific/analysis surfaces consumed normal Core surface material including shadow.

v3.71.44 violated each of these in presentation/composition despite keeping scientific/domain owners correct.

## Fixes

### Compact channel selector

Compact Tabs remain semantic Tabs but now consume the accepted toolbar-action geometry and selected visual tokens. The generic Unit contract defines 3 px group gap/padding, 42 px minimum tab width and 30 px height. Radius and selected appearance remain Theme/Core-owned.

### Four-action density

`action-grid-4` retains four columns until the actual Unit region reaches the last-resort 280 px breakpoint. This removes the generic Unit's premature 4→2 collapse without adding a Pulse breakpoint.

### Segment toolbar

The segment header is again an ordinary Toolbar Unit with a `segment-bar` Layout recipe. The Unit recipe owns centered cross-axis alignment and space-between distribution.

### Panel/Surface material

Panel/Surface Unit creation now explicitly requests its Core Material Role. Material recipe assignment is therefore deterministic and no longer depends on a later semantic scan. Pulse wave/analysis panels and the Sampling command surface consume this public behavior.

## Computed-style smoke

A headless Chromium CSS/geometry harness using the current authored styles produced:

| Check | Result |
|---|---|
| compact Vd tab | 42 × 30 px |
| compact tab computed radius | 8 px |
| 4 actions at 420 px region | 1 row |
| each action cell | ~99.75 × 31 px |
| segment bar | 420 × 41 px |
| segment bar alignment | center |
| title/action center delta | 0 px |
| Core surface recipe shadow | non-`none` |

The smoke harness is intentionally narrower than a full Electron acceptance test. Its purpose is to ensure basic layout/component/material regressions are caught before delivery rather than delegated to manual inspection.

## Ownership proof

The production scientific/domain owners remain byte-identical to v3.71.41:

- `live-domain.js`: `a982b457b702b79d957f029cf2a403f9b180c5bd443f4172faf71f630f074d56`
- `domain-adapter.js`: `a7b7c038970dc10a3c530dd098167d03dc3796d1789792c7c1215bd4430e21ac`
- `steady-state-task.js`: `1132645c3509c04ec7ab11183cb6eebef9d5b678734a5b27700dcad27f5084d5`

No Pulse `plugin.css` or `mobile.css` was reintroduced.

## Permanent gates

`tests/test-v37145-pulse-basic-visual-parity.js` rejects regressions in:

- four-action base density / last-resort threshold;
- compact Tab geometry;
- compact Tab toolbar-action selected appearance;
- ordinary Toolbar anatomy;
- segment-bar geometry/alignment;
- deterministic public Panel material ownership;
- Pulse Unit composition usage;
- Pulse private presentation CSS.

The existing `unit:density` audit continues to enforce `compact-first-single-last-v1` for all 41 Units / 73 Layout recipes.

## Validation

- Test: **462/462 PASS**
- Check: **469/469 PASS**
- Mobile: **103/103 PASS**
- clean-source Mobile: **103/103 PASS**
- Hard Visual Invariants: **87/87 PASS**
- 41-Unit density audit: **PASS**
- Unit runtime/style ownership: **0 violations**
- Unit semantic/cascade: **0 violations**
- Architecture Hygiene: **PASS**
- Native Analysis strict audit: **PASS**
- SDK Harness: **PASS**
- Scientific parity: **PASS**
- Plugin Boundary: **0**
- Plugin manifests/packages: **17/17 PASS**
- authored CSS: **0 `!important`**

## Acceptance state

The basic source-parity failures above are now closed and machine-gated. Pulse remains WIP only for final environment-specific Windows Electron/Mobile rendering and interaction acceptance; that final platform acceptance is not intended to rediscover basic row count, button silhouette, alignment or surface shadow.
