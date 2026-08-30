const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const Theme=require('../sdk/theme-contract');

const sdk=json('sdk/contract.json');
assert.equal(sdk.sdkVersion,'1.22.1');
assert.equal(sdk.pluginApiVersion,'1.18.0');
assert.equal(sdk.themeContractVersion,'3.9.0');
assert.equal(sdk.minimumAppVersion,'3.66.1');
assert.equal(Theme.version,'3.9.0');
assert(Theme.supports('contract:3.6.0')&&Theme.supports('contract:3.7.0')&&Theme.supports('contract:3.8.0')&&Theme.supports('contract:3.9.0'),'Theme 3.9 must preserve additive 3.x contract capability IDs from the supported baseline.');
assert(!Theme.supports('contract:4.0.0')&&!Theme.supports('contract:2.9.0'),'Theme runtime must not advertise future-major or different-major contract capabilities.');
assert(Theme.supports('contract.appearance.components')&&Theme.supports('contract.appearance.components.tab'));
assert(Theme.supports('contract.scientific.precedence'));
assert.deepEqual(Theme.componentAppearanceComponents(),['tab','toolbarAction','toolbarGroup','panelHeader','inspectorHeader','menuItem','chip','statusBar','floatingChrome','field']);
assert(Theme.componentAppearanceKeys().includes('surfaceSelected')&&Theme.componentAppearanceKeys().includes('indicator'));

const sample=Theme.validateProfile({
  modes:{
    light:{tokens:{surface:'#fff'},appearance:{components:{tab:{surfaceActive:'#eee9ff',indicator:'#705ce8'},toolbarAction:{surfaceHover:'#f3f1fc'}}},scientific:{mode:'fallback-only',seriesPalette:['#705ce8','#17a7a0']}},
    dark:{tokens:{surface:'#111827'},appearance:{components:{tab:{surfaceActive:'#2a2448',indicator:'#9887ff'}}}}
  },
  appearance:{roles:{sidebar:{surface:'#eef7f5'}},components:{panelHeader:{surface:'#f7f5fd'}}},
  scientific:{mode:'fallback-only',seriesPalette:['#2563eb','#14b8a6']}
});
const light=Theme.resolveProfile(sample,'light');
assert.equal(light.appearance.components.tab.surfaceActive,'#eee9ff');
assert.equal(light.appearance.components.panelHeader.surface,'#f7f5fd');
assert.equal(light.scientific.mode,'fallback-only');
assert.throws(()=>Theme.validateProfile({modes:{light:{appearance:{components:{unknownThing:{surface:'#fff'}}}},dark:{}}}),/unknown|Unknown|component/i);
assert.throws(()=>Theme.validateProfile({modes:{light:{appearance:{components:{tab:{padding:'#fff'}}}},dark:{}}}),/unknown|Unknown|padding/i);
assert.throws(()=>Theme.validateProfile({modes:{light:{scientific:{mode:'decorate-all'}},dark:{}}}),/fallback-only/i);

const runtime=read('src/core/theme/runtime.js');
for(const token of ["contractVersion:'3.9.0'",'--dkui-component-','appearanceComponents','consumption','fallback-only','user-explicit','plugin-domain-explicit','project-saved','theme-fallback','core-default']) assert(runtime.includes(token),`Theme runtime missing ${token}`);
const components=read('src/core/theme/component-appearance.js');
for(const token of ['toolbarAction','panelHeader','inspectorHeader','floatingChrome','AUTHORED_BUT_UNUSED','UNMANAGED_COMPONENT_APPEARANCE','appearance.components.']) assert(components.includes(token),`Component Appearance runtime missing ${token}`);
const semantic=read('src/core/theme/semantic-registry.js');assert(semantic.includes('top-level-activity-tab'),'Top-level toolbar identity must live in the canonical semantic registry.');
const componentCss=read('src/styles/theme/component-appearance.css');
for(const token of ['--dkui-component-tab-surface-active','--dkui-component-toolbar-action-surface-hover','--dkui-component-toolbar-group-surface','--dkui-component-panel-header-surface','--dkui-component-field-border-active','data-dkds-component-variant="secondary"']) assert(componentCss.includes(token),`Component Appearance CSS missing ${token}`);
const legacyThemeCss=read('src/styles/theme/contract.css');
for(const forbidden of ['.project-tab{background:var(--dkui-surface-soft)', '.activity-tab.active,.primary-activity-bar', '.toolbar-group,.system-core-tools-group){background:var(--dkui-surface-soft)']) assert(!legacyThemeCss.includes(forbidden),`Old component paint owner remains: ${forbidden}`);

const coverage=read('src/core/theme/coverage-runtime.js');
for(const token of ["VERSION='4.0.0'",'appearanceCoverage','authoredUnused','appearanceOk','consumption']) assert(coverage.includes(token),`Theme Coverage missing ${token}`);
const debug=read('src/core/theme/debug-runtime.js');
for(const token of ['componentIdentity','appearanceSlot','resolvedTokenSource','sourceTheme']) assert(debug.includes(token),`Theme Debug missing ${token}`);
const gallery=read('src/core/theme/test-gallery.js');
for(const token of ["VERSION='4.0.0'",'Theme Component Gallery','Toolbar Action','Panel Header','Inspector Header','Menu Item','ScientificPlot / neutral data surface','Tooltip / Popover','data-gallery-meta']) assert(gallery.includes(token),`Theme Gallery missing ${token}`);

const api=read('src/core/plugins/kernel/modules/plugin-api.js');
assert(api.includes('appearanceComponents:')&&api.includes('consumption:')&&api.includes("mode:'fallback-only'"));
const dts=read('sdk/plugin-api.d.ts');
for(const token of ["contractVersion:'3.9.0'",'DKDSThemeAppearanceComponent','DKDSThemeComponentAppearanceValues','appearanceComponents()','consumption():DKDSThemeConsumptionReport',"mode:'fallback-only'"]) assert(dts.includes(token),`SDK type missing ${token}`);
const presentationModel=read('src/core/ui/modules/presentation/model.js'),mobile=read('src/core/ui/modules/presentation/presenters.js');
assert(presentationModel.includes('components:window.DKDSTheme?.appearanceComponents?.()')&&presentationModel.includes('consumption:window.DKDSTheme?.consumption?.()')&&presentationModel.includes('scientific:window.DKDSTheme?.scientific?.()'));
assert(mobile.includes('themeComponents:core.theme.components')&&mobile.includes('themeConsumption:core.theme.consumption')&&mobile.includes('themeScientific:core.theme.scientific'));

const model=read('src/core/ui/modules/scientific-curve/model.js');
assert(model.includes('curve?.color||scaled||initial?.color||this.categoricalColor(index)'),'Explicit/scaled/project series color must precede Theme fallback palette.');
const series=read('src/core/ui/modules/series/primitives.js');
assert(series.includes('DKDSTheme?.scientific?.()?.seriesPalette'),'Series Registry must consume Theme palette only as fallback source.');

const pulseViews=read('src/plugins/pulse-analysis/shared-views.js');
for(const title of ['当前文件 · 原始波形诊断','脉冲条件 → 读取电流','脉冲条件 → 脉冲电流']) assert(pulseViews.includes(`<h3 class="dkds-plot-view-title">${title}</h3>`));
const plotHeaderBlocks=[...pulseViews.matchAll(/<div class="pulse-card-heading pulse-plot-heading" data-dkds-plot-header>([\s\S]*?)<\/div>/g)].map(m=>m[1]);
assert.equal(plotHeaderBlocks.length,3,'Pulse Analysis must expose exactly three Core PlotView headers.');
for(const block of plotHeaderBlocks){assert(!/<p\b/.test(block),'PlotView header must keep only the main title.');assert(/pulse-plot-actions/.test(block),'PlotView header must reserve a Core action host at the far edge.');assert(!/dkds-toolbar/.test(block),'Pulse must not create an independent toolbar inside PlotView header.');}
const pulseCss=read('src/plugins/pulse-analysis/plugin.css');
assert(!pulseCss.includes('.pulse-plot-actions{')&&!pulseCss.includes('.pulse-plot-heading{padding:'),'Pulse plugin must not own PlotView action/header geometry.');
assert(pulseViews.includes('dkds-surface-heading-stack')&&!pulseCss.includes('.pulse-card-heading:not(.dkds-plot-view-head) h3'),'Non-plot card heading typography must be Core-owned through the shared SurfaceHeader heading stack.');
const plotCore=read('src/styles/structure/plugin-workspace.css');
assert(/\.dkds-plot-view-head\{[^}]*grid-template-columns:minmax\(0,1fr\) auto/s.test(plotCore));
assert(/\.dkds-plot-view-actions\{[^}]*height:100%[^}]*display:flex/s.test(plotCore));

const coreIdentity=[read('src/core/theme/runtime.js'),read('src/core/theme/component-appearance.js'),read('src/styles/theme/component-appearance.css')].join('\n').toLowerCase();
assert(!coreIdentity.includes('aurora-pop')&&!coreIdentity.includes('aurora pop'),'Theme 3.8 Core must remain profile-identity neutral.');
console.log('v3.64.0 Theme Contract 3.8 component appearance / consumption / gallery and Pulse PlotView ownership PASS');
