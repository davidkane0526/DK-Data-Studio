# TER Empty Unit Page Shell Fix — v3.71.8

## Symptom

After the v3.71.7 formal production Unit cutover, activating TER could fail immediately with:

```text
Plugin page not found: terMaxPage
```

The failure happened before Unit composition had a chance to build the production TER workspace.

## Root cause

The production Unit presentation correctly requested an intentionally empty host page:

```js
ctx.ui.pages.add({
  id:'ter-max',
  pageId:'terMaxPage',
  activity:'ter',
  toolbar:false,
  html:''
});
```

Core `addPage()` previously used:

```js
if (!page && spec.html) {
  // create page
}
```

Because `''` is falsy, Core treated “explicitly create an empty page shell” as “no HTML was provided”. The legacy TER static/private page had already been removed during the Unit cutover, so no existing `terMaxPage` could be adopted and Core threw `Plugin page not found`.

## Fix

Core now tests property presence rather than truthiness:

```js
const ownsHtml = Object.prototype.hasOwnProperty.call(spec,'html');
if (!page && ownsHtml) {
  // create page, including a genuinely empty shell
}
```

The resulting public contract is precise:

- `html:''` — create an empty page shell for programmatic/Unit composition.
- non-empty `html` — create and populate the page as before.
- omitted `html` — adopt an already existing page; still throw if it does not exist.

No whitespace placeholder, TER id branch, legacy shim, fallback page, or compatibility path was added.

## Runtime coverage

The change lives in the Core Plugin Kernel source module, so `runtime:build` propagates the exact same behavior into:

- the main application Plugin Kernel;
- dedicated plugin windows that consume the generated Plugin Kernel.

The generated runtime was inspected and contains the same `ownsHtml` contract.

## Regression gate

`tests/test-v3718-empty-plugin-page-shell.js` executes the real `addPage()` implementation and verifies both sides of the contract:

1. explicit `html:''` creates `terMaxPage` under `#app`;
2. the page remains truly empty for Unit composition;
3. omitted `html` still throws when no existing page is present.

The gate is included in both `test` and `check` manifests.

## TER architecture impact

None beyond allowing its already-approved Unit presentation to mount:

- production TER remains Unit-only;
- legacy `plugin.css` and `shared-views.js` remain absent;
- `analysis-service.js`, controller, domain adapter, selection-link runtime and scientific feature runtime remain unique owners;
- 7 PlotViews, live side-by-side parity and real TER numeric parity remain unchanged;
- Unit Templates remain **2.5.4 / 41 Units**.

## Validation

Final v3.71.8 baseline:

- test manifest: **429/429 PASS**
- check coverage: **436/436 PASS** (425 shared + 11 check-only; 4 test-only are included in test)
- Mobile: **103/103 PASS**
- SDK Harness: **PASS**
- Scientific parity: **PASS**
- Plugin Boundary: **0**
- Hard Visual Invariants: **87/87 PASS**
- Architecture Hygiene: **PASS**
- Native Analysis strict audit: **all zero**
- Plugin manifests/packages: **17/17 PASS**
- authored CSS: **44 files / 0 `!important`**

This patch fixes the reported startup failure without changing TER presentation semantics, numerical behavior, interaction ownership or Unit catalog size.
