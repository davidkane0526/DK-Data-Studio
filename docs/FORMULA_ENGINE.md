# Formula / Derived Column Engine — v3.18

Global API:

```js
window.GRSFormula
```

The formula engine is intentionally **not** implemented with `eval()` or `new Function()`.

It tokenizes and parses a limited mathematical language into an AST, then evaluates it against DataTable rows.

## Basic examples

```text
abs(Vd / Id)
log10(abs(Id))
sqrt(X^2 + Y^2)
clamp(Value, 0, 1)
ifelse(Vd > 0, Id, -Id)
```

Column keys can be used directly:

```text
Vd / Id
```

Column names with spaces/symbols use brackets:

```text
[Gate Voltage] / [Drain Current]
```

## Operators

```text
+ - * / % ^
< <= > >= == !=
&& ||
unary + - !
```

## Functions

Current whitelist:

```text
abs
sqrt
exp
ln / log
log10
sin cos tan
asin acos atan
floor ceil round sign
min max pow
clamp
ifelse
isfinite
```

Constants:

```text
PI
E
NaN
```

## Compile

```js
const compiled = GRSFormula.compile('abs(Vd / Id)', table);

compiled.references;
compiled.evaluate(rowIndex);
```

## Derived column

```js
const { table:newTable, column } = GRSFormula.deriveColumn(table, {
  name:'Resistance',
  formula:'abs(Vd / Id)',
  unit:'Ω',
  role:'derived'
});
```

This returns a new DataTable, not a mutation of the source table.

The new artifact records formula text, source artifact id, provider/plugin version and input/output ids in provenance.

## Non-finite values

Division by zero and invalid mathematical domains are preserved as non-finite values in memory.

Project JSON converts non-finite numbers to `null`; `GRSData.restoreStore()` rehydrates table numeric `null` values to `NaN`.

A later finite-row Processor can explicitly filter such rows. The formula engine does not silently discard them.
