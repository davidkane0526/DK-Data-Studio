# DK Data Studio v3.67.14 — R7Q Property Ownership Audit — WIP Handoff

## Status

WIP. Code-side architecture and regression suites pass. Windows Electron visual acceptance is still required before declaring the R7 UI/performance track final.

## Baseline

R7Q continues from the clean v3.67.13 / R7P Style Ownership Closure source. No access to the user's GitHub repository was performed.

Application version advanced from **3.67.13 → 3.67.14**. Plugin versions, Plugin API, SDK and Theme Contract remain independently versioned.

- Application: 3.67.14
- Plugin API: 1.19.0
- SDK: 1.24.0
- Theme Contract: 3.10.0

## Why R7Q exists

R7P closed one specific source-order bug class for shared ToolbarAction content-box geometry. A broader audit then found the same architectural risk in other Core shell components:

1. Activity Tab geometry was distributed across `schema-and-plugin-ui.css`, `shell-navigation.css` and `super-top-contract.css`.
2. Status Bar had an early `.statusbar` height/padding owner and a later `#statusBar.statusbar` owner.
3. `button.plugin-status-item` requested `height:22px` but did not own `min-height`; the generic `button{min-height:30px}` baseline could therefore enlarge the actual hit region.
4. Project Tabs mixed an initial padding shorthand with later `padding-left` and responsive direct height/min-width writes.
5. Structure still contained `button:active{transform:translateY(.5px)}` plus local counter-rules such as dialog-close `transform:none`.

These are all property-ownership problems, not Theme-provider problems.

## R7Q implementation

### 1. Activity Tab content box now has one owner

`src/styles/structure/shell-navigation.css`

`.activity-tab` is the single final owner for:

- height / min-height;
- padding block / inline;
- line-height;
- base alignment/gap.

It consumes bounded slots:

- `--dkds-activity-height`
- `--dkds-activity-padding-block`
- `--dkds-activity-padding-inline`
- `--dkds-activity-line-height`

Top-level and responsive contexts only change slot values. The duplicate topbar Activity geometry was removed from `schema-and-plugin-ui.css` and `super-top-contract.css`.

### 2. Status Bar and status actions are property-owned

`src/styles/structure/super-top-contract.css`

The earlier generic `.statusbar{height:28px;padding:...}` Structure owner was removed. `#statusBar.statusbar` is now the Desktop shell geometry owner and consumes:

- `--dkds-statusbar-gap`
- `--dkds-statusbar-padding-left`
- `--dkds-statusbar-padding-right`

Responsive rules modify those slots rather than final properties.

`.plugin-status-item` now owns both `height` **and `min-height`** through `--dkds-status-item-height:22px`, preventing the generic 30px button minimum from silently enlarging status actions. Responsive padding/gap use `--dkds-status-item-*` slots.

### 3. Structure button-state geometry movement was removed

The generic Structure rule:

`button:active{transform:translateY(.5px)}`

was deleted. The now-obsolete `.dkds-dialog-close:hover{transform:none}` counter-rule was also removed.

Interaction states may change Theme/Appearance feedback, but Structure cannot move a Core control on hover/active/focus.

### 4. Project Tab / Project Tabs Bar moved to slots

`src/styles/structure/schema-and-plugin-ui.css`

Project Tab now has a single content-box owner and uses:

- `--dkds-project-tab-height`
- `--dkds-project-tab-min-width`
- `--dkds-project-tab-padding-left`
- `--dkds-project-tab-padding-right`

Project Tabs Bar uses:

- `--dkds-project-tabs-height`
- `--dkds-project-tabs-padding-left`
- `--dkds-project-tabs-padding-right`

The 820px responsive context now modifies slot values only. The previous shorthand + later longhand/source-order relationship is gone.

### 5. Style validator now rejects these regressions

`scripts/validate-styles.js`

New release-gate checks reject:

- Activity Tab contexts that rewrite height/padding/line-height outside the canonical owner;
- Status item contexts that rewrite height/padding/gap instead of slots;
- extra Status Bar height/padding/gap owners outside `#statusBar.statusbar`;
- Project Tab / Project Tabs Bar contexts that rewrite their content boxes;
- button hover/active/focus Structure selectors that write `transform`.

### 6. Hard Visual Invariants advanced to 66

- HARD-65 protects Activity/Status property ownership and no Structure button-state movement.
- HARD-66 protects Project Tab / Project Tabs Bar slot ownership.

`docs/STYLE_OWNERSHIP_CONTRACT.md` was expanded accordingly.

## Architectural interpretation

Theme remains the unique **visual value** owner. Core Component Appearance / Material Renderer renders those values. Core Structure owns geometry.

The target is not “CSS never cascades”. Responsive, Theme mode and interaction state changes still intentionally cascade. The forbidden pattern is two semantic owners writing the same final property and relying on source order/specificity to decide which one wins.

R7Q moves more shared components to:

`one final property owner <- bounded custom-property slots <- context/responsive semantics`

rather than:

`base property -> later context override -> later repair selector`.

## Validation

Final code-side validation:

- `npm test`: **230/230 PASS**
- `npm run check`: **237/237 PASS**
- `npm run mobile:test`: **12/12 PASS**
- `npm run sdk:harness`: PASS
- `npm run science:parity`: PASS
- `npm run renderer:test`: PASS
- `npm run plugin-manager:test`: PASS
- Hard Visual Invariants: **66/66 PASS**
- authored CSS: **44 files / 0 `!important`**
- Plugin manifests/packages: **17 PASS**
- `git diff --check`: PASS

Expected negative plugin-manager fixture errors may still print during test execution; the suite itself passes.

## What remains for the ownership audit

R7Q does not claim that every possible Core component has completed property-slot migration. The next useful audit targets are:

1. desktop header/action hit regions (`PortableView`, Surface/Header action groups, close/place controls);
2. scientific floating/navigation action geometry;
3. shared Field/control density contexts;
4. portable/floating placement-mode geometry where the same component has docked/floating/sticky contexts.

The rule for any discovered ambiguity is to migrate the component to a bounded slot/property-owner model and extend the validator, never add a later repair block.

## Next Windows acceptance

Use this v3.67.14 / R7Q package as the only baseline. Verify especially:

- primary/top Activity buttons at normal and narrower widths;
- status-bar action height/inset and responsive widths;
- Project Tab geometry around the 820px threshold;
- existing `参数 / 检查 / 组图` centering and Import focus behavior remain intact;
- run `npm run visual:closure:windows` and retain the JSON report if any computed-style failure remains.

## Repository / delivery policy

- No access to the user's GitHub repository.
- This ZIP is the source-of-truth continuation package.
- Each testable delivery increments the application patch version.
- Root keeps only the current handoff; obsolete R7P root handoff was removed.
