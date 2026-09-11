'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const {inspectPluginCss}=require('../sdk/visual-contract');

const material=read('src/styles/theme/material-renderer.css');
const appearance=read('src/styles/theme/component-appearance.css');
const structure=read('src/styles/structure/sdk-semantic-surfaces.css');
const themeRuntime=read('src/core/theme/runtime.js');
const automation=read('src/diagnostics/automation-visual-cases.js');
const packageRuntime=read('src/core/plugins/kernel/modules/package-runtime.js');
const appRuntime=read('src/app/modules/dedicated-plugin-windows.js');
const sdkReadme=read('sdk/README.md');
const themeDocs=read('sdk/THEME_CONTRACT.md');

assert(material.includes('html[data-dkds-theme-header-effect="true"] body.dkds-modern-ui'),
  'Header effects must be explicitly gated by the active Theme effect state.');
assert(themeRuntime.includes("delete root.dataset.dkdsThemeHeaderEffect")&&themeRuntime.includes("root.dataset.dkdsThemeHeaderEffect="),
  'Theme runtime must clear and recompute the header-effect flag on every profile/mode transaction.');
assert(themeRuntime.includes("inspectorHeader:{surface:'#f5f8fc'")&&themeRuntime.includes("inspectorHeader:{surface:'#1d253"),
  'Default inspector header must remain neutral instead of inheriting Aurora-like teal paint.');
assert(!themeRuntime.includes("inspectorHeader:{surface:'#172a31'"),
  'Legacy teal default inspector header must not return.');

assert(structure.includes('.dkds-scientific-nav-tools')&&structure.includes('gap:0')&&structure.includes('--dkds-scientific-nav-padding-block:2px')&&structure.includes('--dkds-scientific-nav-padding-inline:2px')&&structure.includes('padding:var(--dkds-scientific-nav-padding-block) var(--dkds-scientific-nav-padding-inline)')&&structure.includes('overflow:hidden'),
  'Scientific floating navigation must expose one fused outer silhouette while platform-specific density enters only through geometry tokens.');
assert(appearance.includes('[data-dkds-component-identity="floatingChrome"].dkds-integrated-action-group')&&appearance.includes('border-radius:0')&&appearance.includes('box-shadow:none'),
  'FloatingChrome children must not render separate rounded cards/depth.');
assert(automation.includes('must not expose gaps between integrated actions')&&automation.includes('must not render an independent rounded card'),
  'Windows visual closure must verify the fused scientific floating chrome computed style.');

const violation=inspectPluginCss('.dkds-scientific-nav-tools{gap:8px}',{path:'probe.css'});
assert(!violation.ok&&violation.issues.some(row=>row.code==='PLUGIN_RESTYLES_INTEGRATED_CHROME'),
  'SDK visual contract must reject plugin attempts to split scientific floating chrome geometry.');
for(const text of [sdkReadme,themeDocs])assert(text.includes('one silhouette')||text.includes('one fused silhouette'),
  'SDK authoring docs must state the integrated floating chrome hard rule.');

assert(packageRuntime.includes('async function activateStartup()')&&packageRuntime.includes('scheduleAfterFirstPaint')&&packageRuntime.includes("eventEmit('plugins:startup-ready'"),
  'Main renderer startup must support first-paint activation staging.');
assert(packageRuntime.includes('builtinStartupCriticalIds')&&packageRuntime.includes('deferredBuiltinRows')&&packageRuntime.includes('async function loadDeferredEntries'),
  'Cold start must stage non-critical built-in entry scripts as well as activation.');
assert(appRuntime.includes('loadBuiltinEntries(undefined,{startupOnly:!visualClosure})')&&appRuntime.includes('startupRequiresExternal')&&appRuntime.includes('window.DKDSPlugins.activateStartup?.()'),
  'Normal startup must load only critical built-ins before first paint while preserving an external SUPER preference.');
assert(appRuntime.includes('visualClosure')&&appRuntime.includes('window.DKDSPlugins.activateAll()'),
  'Deterministic visual closure must keep full synchronous plugin loading/activation.');
assert(appRuntime.includes("events?.on?.('plugins:ready'")&&appRuntime.includes('void publishCapabilitySnapshot()'),
  'Deferred activation must republish the completed capability registry without blocking first paint.');

console.log('v3.67.10 R7J integrated chrome/startup contract PASS');
