'use strict';
const assert=require('node:assert');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const pkg=json('package.json');
const atLeast=(actual,minimum)=>{const a=String(actual).split('.').map(Number),b=String(minimum).split('.').map(Number);for(let i=0;i<3;i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false;}return true;};
assert(atLeast(pkg.version,'3.67.54'),'v3.67.54+ source required.');

// 1/6/9: every Desktop host, including dedicated TOP/plugin windows, must enter
// the same platform geometry + Component Appearance path before Core CSS loads.
const pluginWindow=read('src/plugin-window/index.html');
assert(pluginWindow.includes('<html lang="zh-CN" data-dkds-host="desktop">'),'Dedicated plugin window must declare Desktop host identity in markup.');
assert(pluginWindow.indexOf("root.dataset.dkdsHost='desktop'")>=0&&pluginWindow.indexOf("root.dataset.dkdsHost='desktop'")<pluginWindow.indexOf('../core.css'),'Desktop host identity must be frozen before Core CSS is parsed.');
assert(pluginWindow.includes("Object.defineProperty(window,'__DKDS_HOST_KIND__',{value:'desktop'"),'Dedicated plugin window must expose the same frozen platform boundary used by the main shell.');

const touch=read('src/styles/platform/touch.css');
assert(touch.includes('--dkds-scientific-nav-item-width:28px;'),'Desktop scientific action width must retain the restored readable contract.');
assert(touch.includes('--dkds-scientific-nav-item-height:28px;'),'Desktop scientific action height must retain the restored readable contract.');
assert(touch.includes('--dkds-scientific-nav-padding-inline:2px;'),'Desktop floating navigation must keep bounded inner padding with the restored target size.');
{const native=read('src/styles/platform/native-client-shell.css');assert(native.includes('html[data-dkds-host="mobile"].react-native-client .dkds-scientific-nav-tools')&&native.includes('--dkds-scientific-nav-item-width:')&&native.includes('--dkds-scientific-nav-item-height:'),'Mobile must retain its independently owned scientific-control geometry.');}
for(const rel of ['src/plugins/resonance-workbench/plugin.css','src/plugins/ter-analysis/plugin.css','src/plugins/transfer-vth-lab/plugin.css']){
  const text=read(rel);assert(!text.includes('--dkds-scientific-nav-item-width')&&!text.includes('--dkds-scientific-nav-item-height'),`${rel} must not specialize shared scientific floating-tool geometry.`);
}

// Patch audit: platform presenters must consume semantic annotations instead of
// hard-coding first-party plugin class names. Plugins may declare generic width/
// scroll intent on their own DOM, but Core must remain domain blind.
const mobilePresenter=read('src/core/ui/modules/presentation/mobile-web-surface.js');
for(const token of ['respar-','dc-','pulse-table-scroll'])assert(!mobilePresenter.includes(token),`Core Mobile presenter still contains plugin-specific patch selector: ${token}`);
assert(mobilePresenter.includes('[data-dkds-mobile-width-critical]')&&mobilePresenter.includes('[data-dkds-horizontal-scroll]'));
assert(read('src/plugins/resonance-workbench/view-components.js').includes('respar-scan-global dkds-mode-group" data-dkds-mobile-width-critical'));
assert(read('src/plugins/resonance-workbench/feature-controls-runtime.js').includes('data-dkds-mobile-width-critical><input class="reswin-master"'));
const dataCenterViews=read('src/plugins/data-center/shared-views.js');
assert(dataCenterViews.includes('dc-filter-row" data-dkds-mobile-width-critical')&&dataCenterViews.includes('dc-selection-tools" data-dkds-mobile-width-critical'));
assert(dataCenterViews.includes('dc-table-preview" data-dkds-horizontal-scroll'));

const appearance=read('src/styles/theme/component-appearance.css');
assert(appearance.includes('[data-dkds-component-identity="panelHeader"]')&&appearance.includes('[data-dkds-component-identity="inspectorHeader"]'),'Titlebar hover must be keyed by semantic header identity.');
assert(!appearance.includes(':where(.dkds-group-plot-head,.dkds-plot-view-head,.trend-card-header,.dkds-portable-header)'),'Do not restore the old class whitelist that made one chart family visually special.');

// 2: plugin overrides are current-contract-only. A stale API 1.18 package is
// invalid and must fail visibly; Core must not quarantine it and silently fall
// back to the bundled package. Invalid current-API overrides fail the same way.
const {createPluginPackageRuntime}=require(path.join(root,'desktop','main-modules','plugin-package-runtime'));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-v36754-override-'));
try{
  const userData=path.join(temp,'user-data');
  const fakeApp={getPath:key=>key==='userData'?userData:temp,getAppPath:()=>root,getVersion:()=>pkg.version};
  const runtime=createPluginPackageRuntime({app:fakeApp,BrowserWindow:{getAllWindows:()=>[]}});
  const bundled=runtime.readBuiltinPluginPackage('com.dkds.tools.pulse-sampler');
  assert.strictEqual(bundled.manifest.apiVersion,'1.19.0');
  const dir=runtime.ensurePluginOverrideDirectory(),file=path.join(dir,'com.dkds.tools.pulse-sampler.dkplugin');
  const stale=JSON.parse(JSON.stringify(bundled));stale.manifest.apiVersion='1.18.0';stale.manifest.version='99.0.0';
  fs.writeFileSync(file,JSON.stringify(stale,null,2));
  const scan=runtime.readInstalledPluginOverrides();
  assert.strictEqual(scan.packages.length,0);assert.strictEqual(scan.errors.length,0,'Retired Plugin API overrides must not remain as active installation errors.');
  assert(scan.removed.some(row=>row.id==='com.dkds.tools.pulse-sampler'&&row.reason==='non-current-contract'),'Retired overrides must be deleted from current installation state.');
  assert(!Object.prototype.hasOwnProperty.call(scan,'quarantined'),'Current-only override scanning must not expose a compatibility quarantine lane.');
  assert(!fs.existsSync(file),'A non-current override must be removed instead of shadowing the current bundled package.');
  assert.strictEqual(runtime.currentPluginPackage('com.dkds.tools.pulse-sampler').manifest.apiVersion,'1.19.0','After obsolete installation state is removed, the canonical bundled current package must be the only package for that ID.');
  const invalid=JSON.parse(JSON.stringify(bundled));invalid.manifest.version='99.0.1';invalid.files['plugin.js']=invalid.files['plugin.js'].replace('ctx.ui.workspaceSurface.create','ctx.ui.pluginWorkspace.create');
  fs.writeFileSync(file,JSON.stringify(invalid,null,2));
  const invalidScan=runtime.readInstalledPluginOverrides();
  assert.strictEqual(invalidScan.errors.length,1,'A genuinely invalid current-API override must remain actionable.');
  assert.match(invalidScan.errors[0].error,/ctx\.ui\.pluginWorkspace/);
}finally{fs.rmSync(temp,{recursive:true,force:true});}

// 3: the previous CSS-only scroll gate was insufficient. Runtime overflow
// recovery must preserve vertical chaining and cannot write a shorthand
// "contain" that wins over platform CSS. Mobile now follows the same vertical
// chaining rule so a continuing touch gesture can hand off to its ancestor.
const workbench=read('src/core/ui/modules/workbench/plugin.js');
assert(workbench.includes("safetySet(el,'overscroll-behavior-y','auto')"),'Layout recovery must preserve vertical chaining on Desktop and Mobile.');
assert(!workbench.includes("mobileHost?'contain':'auto'"),'Mobile-only vertical containment must stay retired.');
assert(workbench.includes("safetySet(el,'overscroll-behavior-x','contain')"),'Horizontal overflow remains locally contained.');
assert(!workbench.includes("safetySet(el,'overscroll-behavior','contain')"),'Runtime must not restore blanket vertical containment.');
const components=read('src/styles/structure/workbench-components.css');
assert(components.includes('.dkds-layout-overflow-fallback{overscroll-behavior-x:contain;scrollbar-gutter:stable;}'),'Generic recovery CSS must not reintroduce vertical containment behind the runtime.');
assert(touch.includes('.dkds-layout-overflow-fallback')===false,'Desktop behavior must not depend on a selector race with an inline recovery style.');

// 4: Pulse Sampling controls are one semantic multi-row command surface. The
// plugin owns grouping/layout, while Core Surface paint remains separate from
// Toolbar row geometry. A multi-row form must not impersonate dkds-toolbar.
const pulse=read('src/plugins/pulse-sampler-tool/plugin.js'),pulseCss=read('src/plugins/pulse-sampler-tool/plugin.css');
assert(pulse.includes('ps-analysis-command-surface dkds-surface')&&pulse.includes('data-dkds-command-surface="sampling"'),'Pulse extraction must use a neutral Core Surface identity so Desktop toolbar flex/nowrap cannot collapse the multi-row form.');
assert(!pulse.includes('ps-analysis-command-surface dkds-toolbar'),'Pulse extraction outer command surface must not consume Toolbar row geometry.');
assert(pulse.includes('<div class="ps-analysis-controls">')&&pulse.includes('<div class="ps-result-controls">'));
assert(!pulse.includes('ps-analysis-controls dkds-toolbar')&&!pulse.includes('ps-result-controls dkds-toolbar'),'Pulse extraction rows must not paint two independent nested toolbar surfaces.');
assert(/\.ps-analysis-command-surface\{[^}]*display:grid;[^}]*gap:8px;[^}]*padding:10px;[^}]*\}/.test(pulseCss),'One outer inset keeps X/Y and fields away from the surface edge without prescribing clipping behavior.');

// 5: Vth plot owns no scrollbar around a responsive ResizeObserver surface. The
// result table is the scroll owner, preventing scrollbar appearance/disappearance
// from feeding back into chart width and triggering repeated re-render.
const vthCss=read('src/plugins/transfer-vth-lab/plugin.css');
assert(vthCss.includes('.dkds-vth-plot-card{min-width:0;min-height:220px;height:100%;overflow:hidden;'));
assert(vthCss.includes('.dkds-vth-plot-target{width:100%;height:100%;min-width:0;min-height:0;overflow:hidden}'));
assert(vthCss.includes('.dkds-vth-results-host{min-width:0;min-height:140px;overflow:auto}'));

// 7/8: PlotView must reuse a canonical authored surface header/action host. A
// second injected header breaks PortableView dragging and creates the split-row
// chrome. Floating PlotViews consume remaining vertical space after resize.
const plotView=read('src/core/ui/modules/plot-view/chart.js');
assert(plotView.includes('.dkds-chart-head,.dkds-surface-header'));
assert(plotView.includes('.dkds-chart-actions,.dkds-surface-actions'));
const terViews=read('src/plugins/ter-analysis/shared-views.js');
assert(terViews.includes('ter-chart-actions dkds-surface-actions dkds-integrated-action-group'));
assert(!terViews.includes('ter-chart-actions dkds-toolbar'),'TER header actions must not create a nested toolbar material surface.');
const portableCss=read('src/styles/structure/super-top-contract.css');
assert(portableCss.includes('.dkds-plot-view.dkds-portable-view.is-floating'));
assert(portableCss.includes('--dkds-plot-content-flex:1 1 0;')&&portableCss.includes('--dkds-plot-content-min-height:0;')&&portableCss.includes('--dkds-plot-content-height:auto;'));
const pluginWorkspaceCss=read('src/styles/structure/plugin-workspace.css');assert(pluginWorkspaceCss.includes('flex:var(--dkds-plot-content-flex);')&&pluginWorkspaceCss.includes('height:var(--dkds-plot-content-height);'),'PlotView content geometry must consume floating geometry slots from its canonical owner.');
assert(portableCss.includes(':is(.dkds-portable-header,.dkds-portable-inline-header){cursor:move;}'),'Authored inline PortableView headers must advertise the same drag affordance as injected headers.');

// 9: the page viewport itself is not a visual card. Both legacy analysis pages
// and the Unified AnalysisWorkbench must be flush on all four edges; plugins own
// any intentional inner content inset. Compact Desktop must not silently restore
// a perimeter gutter. The legacy scroll root also participates in vertical wheel
// chaining instead of imposing shorthand containment.
const analysisShell=read('src/styles/structure/analysis-shell.css'),analysisWorkbench=read('src/styles/structure/analysis-workbench.css'),pluginWindowStyle=read('src/plugin-window/style.css');
assert(/\.analysis-page-body\{[\s\S]*?overscroll-behavior-x:contain;[\s\S]*?overscroll-behavior-y:auto;[\s\S]*?padding:0;/.test(analysisShell),'Legacy analysis viewport must be edge-to-edge and vertically chainable.');
assert(/\.dkds-analysis-frame\{[\s\S]*?gap:0;[\s\S]*?padding:0;[\s\S]*?overflow:hidden;/.test(analysisWorkbench),'Unified AnalysisWorkbench frame must be edge-to-edge on all four sides.');
assert(/\.dkds-analysis-main\{[^}]*padding:0;/.test(analysisWorkbench),'Main dock slot must not reintroduce a horizontal page gutter.');
assert(/\.dkds-analysis-right\{[^}]*padding:0;/.test(analysisWorkbench),'Right dock slot must not reintroduce a perimeter gutter.');
assert(/\.dkds-analysis-bottom\{[^}]*padding:0;/.test(analysisWorkbench),'Bottom dock slot must not reintroduce a perimeter gutter.');
assert(/@media\(max-width:1000px\)\{[\s\S]*?grid-template-areas:"left" "main" "right" "bottom";\s*gap:0;/.test(analysisWorkbench),'Compact AnalysisWorkbench must not create phantom grid gaps around hidden dock rows.');
assert(/\.dkds-size-compact \.analysis-page-body\{\s*padding:0;\s*\}/.test(touch),'Compact Desktop must not restore the removed page perimeter gutter.');
assert(!pluginWindowStyle.includes('analysis-page-body{background:var(--app-bg,#f6f8fb);padding-bottom'),'Plugin-window host must not carry a separate bottom-gap patch.');

// The real visual closure diagnostic must follow the computed shared variables,
// not hard-code the old 25x24 Desktop geometry and call that a gate.
const visual=read('src/diagnostics/automation-visual-cases.js');
assert(visual.includes("style.getPropertyValue('--dkds-scientific-nav-item-width')"));
assert(visual.includes('first action no longer fills the left interior edge'));
assert(visual.includes('last action no longer fills the right interior edge'));

// A global file-hash visual freeze is historical evidence, not an active release
// gate: it cannot distinguish an intentional owner refactor from a regression and
// does not validate computed/runtime geometry. The platform firewall remains
// semantic/host-scoped and is verified by the v3.67.43 runtime assertions.
const isolationGate=read('tests/test-v36743-desktop-mobile-projection-isolation.js');
assert(!isolationGate.includes('Desktop Visual Closure owner changed during Mobile work'),'Brittle global SHA visual freeze must not be restored as an active gate.');

for(const rel of ['src/styles/platform/touch.css','src/styles/theme/component-appearance.css','src/styles/structure/super-top-contract.css','src/styles/structure/analysis-workbench.css','src/styles/structure/analysis-shell.css','src/plugins/pulse-sampler-tool/plugin.css','src/plugins/transfer-vth-lab/plugin.css'])assert(!read(rel).includes('!important'),`${rel} must remain free of !important.`);
console.log('v3.67.54 Desktop regression root-cause contracts PASS.');
