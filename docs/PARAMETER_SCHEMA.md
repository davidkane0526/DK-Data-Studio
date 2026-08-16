# Schema-driven Parameter Panels — v3.18

Global API:

```js
window.GRSParameters
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

## Responsive behavior

The core stylesheet owns `.schema-*` controls.

On compact screens they automatically switch from two columns to one column.

On coarse-pointer devices input heights expand to the platform touch target.

A plugin should not duplicate these rules.
