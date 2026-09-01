# DK Data Studio Style Ownership Contract

## Property ownership, not load-order ownership

DK Data Studio does not treat “the stylesheet loaded last” as an owner. The
cascade is only a delivery mechanism. Every class of CSS property has one
semantic owner, and modifiers feed that owner through bounded variables instead
of rewriting the same property later with a more specific selector.

### Theme Provider: values only

A Theme Provider owns visual **values**: surfaces, text colors, borders, depth,
radii, material recipes, motion parameters and bounded component appearance
slots. A Theme plugin does not own application selectors, DOM shape, padding,
alignment or workspace layout and does not ship arbitrary Core-targeting CSS.

### Core Theme Renderer: paint selectors only

Core `Component Appearance` / `Material Renderer` owns the final selectors that
turn Theme values into paint. Theme profiles select values; Core renders them.
This is why a Theme can change how a button looks without being allowed to move
that button or create a second selector-specific visual implementation.

### Core Structure: geometry only

Core Structure owns layout and component geometry: display, grid/flex placement,
size, padding, gap, alignment, overflow and interaction hit boxes. Shared Core
components use property slots such as `--dkds-command-padding-inline`,
`--dkds-activity-padding-inline`, `--dkds-status-item-padding-inline`, and
`--dkds-project-tab-height`, `--dkds-header-action-height`,
`--dkds-field-control-min-height`, and `--dkds-portable-*` placement slots.
Contexts or semantic modifiers may set slot values, but they may not later
rewrite the same `padding`/`height`/`line-height`/placement property.

For example, `plugin-section-start` owns the gap and separator before a command.
It does **not** own the command's internal padding. A compact Presenter command
owns its compact slot values. Therefore the two semantics compose without
specificity or source-order dependence.

### Presentation: semantic composition, not Theme values

Presentation may map application semantics to the shared Core component roles
and use canonical Theme variables for non-component content. It may not create a
second private paint implementation for standard Actions, Tabs, Headers, Fields,
FloatingChrome or other Component Runtime identities.

### Plugin CSS: domain layout only

A normal plugin may own domain-specific scientific/data layout and scientific
marks where those styles carry domain meaning. It may not repaint or resize Core
application chrome. Theme plugins provide Theme Contract values instead of CSS.

## Release gates

`npm run styles:build` rejects:

- `!important` and legacy specificity layers;
- paint properties in Structure;
- duplicate exact/semantic owners across Structure or Presentation files;
- plugin-owned Core chrome paint/geometry;
- shared command state/section modifiers that rewrite content-box geometry
  instead of using `--dkds-command-*` slots;
- Activity Tab contexts/responsive rules that rewrite its content box instead
  of using `--dkds-activity-*` slots;
- Status Bar/status-item responsive rules that re-own final geometry instead of
  their bounded `--dkds-statusbar-*` / `--dkds-status-item-*` slots;
- Project Tab / Project Tabs Bar contexts that rewrite the content box instead
  of their `--dkds-project-tab-*` / `--dkds-project-tabs-*` slots;
- generic button interaction states that move Core controls geometrically;
- Portable/header action subtypes that re-own their hit height instead of
  feeding `--dkds-header-action-height`;
- Scientific floating navigation geometry outside its canonical semantic
  surface owner;
- `dkds-field-control`/Schema/AnalysisWorkbench density rules that overlap the
  same field element instead of using mutually exclusive owners and bounded
  density slots;
- PortableView floating/docked/sticky host contexts that rewrite final
  position/size/overflow/z-index instead of `--dkds-portable-*` slots.

The goal is stronger than “no late override block”: changing CSS file order must
not be required to fix a Core component. If a visual or geometry result depends
on which competing owner loads later, the ownership contract is violated.
