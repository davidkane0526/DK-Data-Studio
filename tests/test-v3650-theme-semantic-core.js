'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

const pkg=json('package.json');
const sdk=json('sdk/contract.json');
const Theme=require('../sdk/theme-contract.js');
const index=read('src/index.html');
const semantic=read('src/core/theme/semantic-registry.js');
const material=read('src/core/theme/material-renderer.js');
const appearance=read('src/core/theme/component-appearance.js');
const appearanceCss=read('src/styles/theme/component-appearance.css');
const shellCss=read('src/styles/presentation/shell.css');
const coverage=read('src/core/theme/coverage-runtime.js');
const debug=read('src/core/theme/debug-runtime.js');
const gallery=read('src/core/theme/test-gallery.js');
const group=read('src/core/ui/modules/tooltip/group-plot.js');
const resonanceGroup=read('src/plugins/resonance-workbench/feature-group-runtime.js');
const resonanceCss=read('src/plugins/resonance-workbench/plugin.css');
const dts=read('sdk/plugin-api.d.ts');

assert(/^3\.(?:6[5-9]|[7-9]\d)\./.test(pkg.version)||Number(pkg.version.split('.')[0])>3,'Theme semantic-core regression requires app 3.65.0 or newer');
assert.equal(sdk.sdkVersion,'1.24.0');
assert.equal(sdk.pluginApiVersion,'1.19.0');
assert.equal(sdk.themeContractVersion,'3.10.0');
assert.equal(Theme.version,'3.10.0');
assert(Theme.supports('contract:3.8.0')&&Theme.supports('contract:3.9.0'),'Theme 3.9 must remain additive across the supported 3.x range');

const semanticPos=index.indexOf('core/theme/semantic-registry.js');
assert(semanticPos>index.indexOf('../sdk/theme-contract.js')&&semanticPos<index.indexOf('core/theme/runtime.js'),'canonical semantic registry must load after Theme Contract and before Theme runtime');

for(const id of ['tab','toolbarAction','toolbarGroup','panelHeader','inspectorHeader','menuItem','chip','floatingChrome','field','statusBar'])assert(semantic.includes(`id:'${id}'`),`missing canonical Component Identity ${id}`);
assert(index.includes('id=\"pluginManagerPage\" class=\"analysis-page hidden core-analysis-page dkds-material-role-surface\"')&&index.includes('id=\"automationTestPage\" class=\"analysis-page hidden core-analysis-page dkds-material-role-surface\"'),'persistent Plugin Manager / Automation pages must be explicitly surface-owned');
assert(semantic.includes('[data-dkds-surface-kind=\"inspector\"]')&&semantic.includes("return 'sidebar'"),'docked inspectors must resolve through the Core semantic surface kind, not plugin selectors');
assert(semantic.includes('[data-dkds-surface-kind=\"panel\"]')&&semantic.includes('.dkds-group-plot,.dkds-group-plot-card'),'Group Workspace and plot cards must be surface-owned through generic Core semantics');
assert(!/respar|reswin|resonance-workbench/i.test(semantic),'Core semantic registry must not know resonance/plugin-specific selectors');
assert(semantic.includes('.floating-panel:not(.lan-web-panel):not(.update-panel)'),'floating semantic area must exclude elevated LAN and Software Update panels');
assert(semantic.includes('.update-panel,.lan-web-panel')&&/id:'elevated'[^\n]*\.import-workbench/.test(semantic)&&semantic.includes("if(matches(el,'.import-workbench'))return 'workspace-modal'"),'Update/LAN remain elevated while the near-fullscreen Import Workbench uses the Theme 3.10 workspace-modal context.');
assert(index.includes('class="import-workbench dkds-material-role-elevated" data-dkds-material-context="workspace-modal"'),'Import Workbench modal must use elevated + workspace-modal composition inside its scrim.');
assert(!/floatingChrome[^\n]+dkds-floating-surface/.test(semantic),'floatingChrome identity must never be assigned to an entire floating/persistent surface');
assert(!/floatingChrome[^\n]+dkds-portable-header/.test(semantic),'portable panel headers are Panel/Inspector Header components, not Floating Chrome');
assert(semantic.includes('[data-generic-panel="inspector"] .dkds-portable-header')&&semantic.includes("id:'panelHeader'")&&semantic.includes('.dkds-portable-header'),'portable headers must resolve through Inspector/Panel Header identity');

assert(!material.includes('ROLE_BINDINGS'),'Material Renderer must not keep a second page/role selector registry');
assert(material.includes('Semantic.resolveMaterialRole(el)')&&material.includes('Semantic.materialAreas()'),'Material rendering and coverage must consume the canonical semantic registry');
assert(appearance.includes('Semantic.resolveComponent(el)')&&appearance.includes('Semantic.assign(root)'),'Component Appearance must consume the same canonical identity resolver as real UI');
assert(appearanceCss.includes('[data-dkds-component-identity="inspectorHeader"]')&&appearanceCss.includes('[data-dkds-component-identity="panelHeader"]'),'Panel and Inspector Header paint must be identity-driven');
assert(!appearanceCss.includes('.curve-inspector')&&!appearanceCss.includes('#resonanceDedicatedPage'),'Theme component paint must not contain page/plugin patches');
assert(!shellCss.includes('.analysis-page{\n  background:#f5f7fb;'),'persistent pages must not retain the historical light-only hard-coded background');

for(const status of ['NOT_PRESENT','MANAGED','PARTIAL','UNMANAGED','ROLE_MISMATCH','RECIPE_MISSING','OPAQUE_PARENT_OCCLUSION'])assert(coverage.includes(status),`Theme Coverage must expose ${status}`);
for(const key of ['material:materialSummary','appearance:componentSummary','components:componentSummary','state:stateSummary','semanticColor:semanticColorSummary'])assert(coverage.includes(key),`Theme Coverage missing ${key}`);
for(const status of ['UNMANAGED_COMPONENT_APPEARANCE','WRONG_COMPONENT_IDENTITY','ROLE_MISMATCH','RECIPE_MISMATCH','TOKEN_NOT_CONSUMED','AUTHORED_BUT_UNUSED','OPAQUE_PARENT_OCCLUSION','HARDCODED_APPEARANCE','ENGINE_UNSUPPORTED'])assert(debug.includes(status),`Real Theme Inspector missing ${status}`);
assert(gallery.includes('parityReport')&&gallery.includes("'WRONG_COMPONENT_IDENTITY'")&&gallery.includes('DKDSThemeComponentAppearance.inspect'),'Theme Gallery must compare real UI through the canonical appearance resolver');

assert.deepEqual(Theme.componentVariants(),['primary','secondary','selected','active','quiet','destructive','info','success','warning','danger']);
for(const key of ['headerGradientStart','headerGradientEnd','accentGlow','edgeGlow','ambientTint','glowIntensity','glowRadius','gradientDirection'])assert(Theme.effectKeys().includes(key),`controlled effect missing ${key}`);
const normalized=Theme.validateProfile({modes:{light:{},dark:{}},appearance:{components:{toolbarAction:{variants:{primary:{surface:'#705CE8'}}}}},effects:{accentGlow:'#705CE8',glowIntensity:.1,glowRadius:12,gradientDirection:'horizontal'}});
assert.equal(normalized.appearance.components.toolbarAction.variants.primary.surface,'#705CE8');
assert.throws(()=>Theme.validateProfile({modes:{light:{},dark:{}},appearance:{components:{toolbarAction:{variants:{rainbow:{surface:'#fff'}}}}}}),/unknown property "rainbow"/);
assert.throws(()=>Theme.validateProfile({modes:{light:{},dark:{}},effects:{boxShadow:'0 0 20px red'}}),/unknown property "boxShadow"/);
assert(dts.includes("export type DKDSThemeComponentVariant")&&dts.includes('DKDSThemeEffectSpec')&&dts.includes("readonly contractVersion:'3.10.0'"),'SDK types must expose Theme 3.9 variants/effects');

assert(group.includes("comfortable:Object.freeze({minItemHeight:220")&&group.includes("compact:Object.freeze({minItemHeight:168")&&group.includes('setDensity(value=\'comfortable\')'),'Core GroupPlot must expose a bounded compact/comfortable density policy');
assert(dts.includes("export type DKDSGroupPlotDensity = 'comfortable'|'compact'")&&dts.includes('setDensity(value:DKDSGroupPlotDensity)'),'SDK must expose GroupPlot density');
assert(dts.includes("export type DKDSSemanticSurfaceKind='panel'|'inspector'")&&dts.includes('semanticKind?:DKDSSemanticSurfaceKind'),'SDK must expose bounded Core-owned portable semantic kinds');
assert(group.includes("comfortable:Object.freeze({minItemHeight:220")&&group.includes("compact:Object.freeze({minItemHeight:168"),'Core GroupPlot compact density baseline must remain available');

const scientific=appearance.includes("['user-explicit','plugin-domain-explicit','project-saved','theme-fallback','core-default']");
assert(scientific,'scientific color precedence must remain user > plugin > project > Theme fallback > Core');
for(const rel of ['src/core/theme/semantic-registry.js','src/core/theme/material-renderer.js','src/core/theme/component-appearance.js','src/styles/theme/component-appearance.css'])assert(!read(rel).toLowerCase().includes('aurora-pop')&&!read(rel).toLowerCase().includes('aurora pop'),`${rel} must not special-case Aurora Pop`);

console.log('v3.65.0 canonical Theme semantic mapping, real-page diagnostics, Theme 3.10 contextual capabilities and compact GroupPlot contracts passed.');
