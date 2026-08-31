'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const renderer=read('src/core/theme/material-renderer.js');
const coverage=read('src/core/theme/coverage-runtime.js');
const automation=read('src/diagnostics/automation-test-runtime.js');
const automationVisual=read('src/diagnostics/automation-visual-cases.js');
const automationSmoke=read('src/diagnostics/automation-smoke-cases.js');
const semanticRegistry=read('src/core/theme/semantic-registry.js');
const ownershipTest=read('tests/test-v361105-core-plugin-ownership.js');
const debug=read('src/core/theme/debug-runtime.js');
const shell=read('src/styles/presentation/shell.css');
const materialCss=read('src/styles/theme/material-renderer.css');
const visualGate=read('tools/quality/visual-invariants.js');
const closureVerifier=read('tools/quality/verify-visual-closure-report.js');
const packageJson=JSON.parse(read('package.json'));
assert(packageJson.version==='3.67.10','v3.67.10 Visual Closure final gate requires the released app version.');

// v3.67.10 Visual Closure: a Theme coverage PASS must mean the renderer is
// optically valid, not merely that semantic role assignment succeeded.
for(const token of ['occludedMaterial','rendererOk','appearanceOk','lowContrastControls']){
  assert(automation.includes(token),`Automation Theme Coverage must fail on ${token}.`);
}
assert(automation.includes("runCase('ui.visual-geometry-closure'"),
  'Windows/Electron automation must include the computed Desktop Visual Closure geometry case.');
for(const token of ['getBoundingClientRect','getComputedStyle','48×34px','34px high','38px','0px 0px 0px 2px','inspectorDockSlot','ScientificCurve / ChartRuntime','Portable header action','Shared close action','workspaceGridChecked']){
  assert(automationVisual.includes(token),`Computed visual-geometry closure must retain ${token}.`);
}
assert(automation.includes('visualGeometryClosureSmoke'),'Automation runner must dispatch the dedicated visual geometry smoke module.');
assert(coverage.includes('occludedMaterial===0')||coverage.includes('occludedMaterial===0&&'),
  'Theme Coverage summary must include zero optical occlusions in its ok condition.');
assert(coverage.includes('rendererOk:brokenMaterial===0&&occludedMaterial===0'),
  'rendererOk must reflect broken or genuinely occluded Material rendering.');

// Opaque ancestors are diagnostic context, not proof that backdrop-filter is
// ineffective. Scientific/floating Material can blur sibling content inside an
// opaque plot/workspace ancestor. Real failure is self repaint or a large opaque
// unmanaged descendant covering the Material owner.
assert(renderer.includes("occlusionSource='self'"),'Renderer must identify an opaque repaint of the Material itself.');
assert(renderer.includes("occlusionSource='child'"),'Renderer must identify an opaque descendant sheet.');
assert(renderer.includes('coverage>=.72')&&renderer.includes('alpha>=.985'),
  'Opaque descendant detection must require large coverage and near-full opacity.');
assert(!renderer.includes("&&opaqueParent)status='OPAQUE_PARENT_OCCLUSION'"),
  'An opaque ancestor alone must never fail a glass Material.');
assert(renderer.includes('color\\(srgb'),
  'Alpha inspection must understand Chromium color(srgb ... / alpha) computed output.');
assert(debug.includes('Opaque ancestor (diagnostic only)')&&debug.includes('Occlusion source:'),
  'Theme Inspector must distinguish diagnostic ancestry from actual occlusion source.');

// Root canvas ownership: body owns the application canvas; #app is a neutral
// host so floating app-level glass is never forced onto a duplicate opaque sheet.
assert(/body\{color:var\(--text-primary\);background:var\(--app-bg\)/.test(shell),
  'body must retain the application canvas.');
assert(/#app\{color:var\(--text-primary\);background:transparent/.test(shell),
  '#app must remain a transparent host rather than duplicate the canvas.');

// Nested headers are content chrome of their owning semantic Material surface.
assert(renderer.includes("status:'MATERIAL_PARENT_OWNED'")&&renderer.includes('nestedParentOwnsChrome'),
  'Nested panel headers must be explicitly parent-owned rather than rendered as a second Material layer.');
assert(materialCss.includes('[data-dkds-material-recipe="thin-glass"]')&&materialCss.includes('> :where(.dkds-surface-header,.floating-header'),
  'Translucent Material owners must flatten their direct header/content descendants.');

assert(packageJson.scripts?.['visual:closure:verify']==='node tools/quality/verify-visual-closure-report.js',
  'package.json must expose the deterministic Visual Closure report release gate.');
for(const token of ['ui.visual-geometry-closure','ui.theme-coverage','occludedMaterial','rendererOk','contrastModes',"runtime!=='desktop'"]){
  assert(closureVerifier.includes(token),`Visual Closure report verifier must fail closed on ${token}.`);
}

assert(automation.includes("ownership?.(header,'chrome')")&&automation.includes("MATERIAL_PARENT_OWNED"),
  'Automation chart-header acceptance must use parent-owned Material ownership rather than inherited roleOf().');
const componentAppearance=read('src/styles/theme/component-appearance.css');
assert(/id:'floatingChrome'[^\n]*priority:30[^\n]*dkds-scientific-nav-tools/.test(semanticRegistry)&&!/floatingChrome[^\n]+dkds-floating-surface/.test(semanticRegistry),
  'FloatingChrome identity must stay narrow and must not be assigned to an entire floating surface.');
assert(componentAppearance.includes('[data-dkds-component-identity="toolbarGroup"]:not(:is(')&&componentAppearance.includes('.dkds-floating-surface'),
  'ToolbarGroup direct paint must exclude semantic Material owners such as Main Plot Tools.');
assert(materialCss.includes('[data-dkds-component-identity="toolbarGroup"]:is(.dkds-material-role-surface,.dkds-material-role-floating)'),
  'Material Renderer must own edge geometry when ToolbarGroup is also a Material surface.');
assert(automationSmoke.includes('fallbackWarnings')&&automationSmoke.includes("String(item?.source||'')==='builtin'"),
  'Automation must downgrade an incompatible built-in override to a warning only when the bundled fallback is healthy.');
assert(ownershipTest.includes("path.resolve(file)!==path.resolve(root,'src/core/project/format.js')"),
  'Core/plugin ownership gate must compare the Project Format path platform-neutrally on Windows and POSIX.');
assert(visualGate.includes('HARD-25')&&visualGate.includes('HARD-26')&&visualGate.includes('HARD-27')&&visualGate.includes('HARD-28')&&visualGate.includes('HARD-29')&&visualGate.includes('HARD-30')&&visualGate.includes('HARD-31')&&visualGate.includes('HARD-32')&&visualGate.includes('HARD-33')&&visualGate.includes('HARD-34')&&visualGate.includes('HARD-35')&&visualGate.includes('HARD-36')&&visualGate.includes('HARD-37')&&visualGate.includes('HARD-38')&&visualGate.includes('invariants:38'),
  'Hard visual gate must protect corrected optical ownership through canonical nested chrome, runtime parent-owned header semantics, and floating-toolbar Material composition.');

console.log('v3.67.10 Visual Closure final checks passed: strict Theme coverage, Windows-safe ownership, parent-owned nested chrome, floating toolbar Material composition, and override fallback diagnostics are guarded.');
