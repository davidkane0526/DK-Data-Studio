# Schema-driven Parameter Panels — v3.18

Global API:

```js
window.DKDSParameters
```

Plugin API:

```js
ctx.parameters.render(...)
ctx.parameters.validate(...)
ctx.parameters.defaults(...)
```

## Why

Plugins should declare parameters rather than manually rebuilding labels, validation, desktop layout and mobile layout for every feature.

Example:

```js
const schema = {
  fields: [
    {
      id: 'window',
      type: 'number',
      label: 'Window',
      default: 11,
      min: 3,
      max: 101,
      step: 2,
      required: true,
      description: 'Smoothing window.'
    },
    {
      id: 'method',
      type: 'select',
      label: 'Method',
      default: 'lorentzian',
      options: [
        { value:'lorentzian', label:'Lorentzian' },
        { value:'gaussian', label:'Gaussian' }
      ]
    }
  ]
};
```

## Supported types

Current generic field types:

```text
text
textarea
formula
number
integer
boolean
select
multiselect
column
columns
color
```

`column` and `columns` resolve options from:

```js
context.table.columns
```

which is why a workflow provider can remain independent from a specific page.

`multiselect` and `columns` render as a compact Core dropdown trigger. The selected values remain a normal array in the parameter contract; Core owns the themed multi-select popover, keyboard navigation and touch behavior. Plugins must not replace these fields with a permanently expanded native `<select multiple>` or a private popup.

## Validation

Fields support:

```text
required
min / max
pattern
patternMessage
custom validate(value, { values, context })
```

Use validation in the provider and UI. The Workflow Engine validates node parameters before calling the provider.

## Conditional visibility

```js
{
  id:'manualValue',
  type:'number',
  visibleWhen:{ mode:'manual' }
}
```

or a function:

```js
visibleWhen: values => values.mode === 'manual'
```

## Renderer handle

```js
const handle = ctx.parameters.render(container, schema, {
  value,
  context:{ table },
  onChange(next, validation) {}
});

handle.getValue();
handle.setValue(...);
handle.validate();
handle.destroy();
```


## Unit outer-layout ownership

`units.parameterForm.mount(...)` keeps Core ownership of canonical fields, control density, validation, accessibility, focus and Theme appearance. The default outer form grid is also Core-owned.

For accepted source-parity compositions whose **outer grid** is already owned by an enclosing Layout Unit/detail host, declare that relationship explicitly:

```js
const host = units.layout.create(panel, { variant:'identity', className:'my-form-detail' });
units.parameterForm.mount(host, schema, {
  compact:true,
  autoFit:true,
  layoutOwner:'host'
});
```

`layoutOwner:'host'` is allowed only when the mount node is a Layout Unit. Core then suppresses the default ParameterSchema outer grid on that host, preventing two `grid-template-columns` owners. It does **not** transfer field/control paint, dimensions, validation or accessibility to the plugin. Do not use specificity or `!important` to fight the Core grid.

For nested responsive Unit layouts, `units.layout.create/apply(..., { responsiveTarget })` may measure a declared semantic ancestor instead of the local already-shrunk child. This is a generic source-parity capability and must not be replaced by plugin-id branches in Core.

## Responsive behavior

The core stylesheet owns `.schema-*` controls.

On compact screens they automatically switch from two columns to one column.

On coarse-pointer devices input heights expand to the platform touch target.

A plugin should not duplicate these rules.
