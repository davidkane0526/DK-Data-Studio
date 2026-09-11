"use strict";
const assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const thin=read('src/plugins/thin-glass-theme/plugin.js');
const material=read('src/styles/theme/material-renderer.css');
const shell=read('src/styles/presentation/shell.css');
const nav=read('src/styles/structure/shell-navigation.css');
const metrics=read('src/styles/structure/metrics.css');
const split=read('src/core/ui/modules/layout/workspace.js');
const layoutState=read('src/core/ui/modules/layout/state-resolver.js');
const analysis=read('src/core/ui/modules/workbench/analysis.js');
const html=read('src/index.html');
const loader=read('src/core/host/optional-runtime-loader.js');
const startup=read('src/app/modules/startup.js');
const pkg=JSON.parse(read('package.json'));

const packageRuntime=read('src/core/plugins/kernel/modules/package-runtime.js');
for(const id of ['workspace-safeguards','shell-navigation','status-monitor']){
  const manifest=JSON.parse(read(`src/plugins/${id}/plugin.json`));
  assert.equal(manifest.systemCritical,true,`${id} must explicitly own first-paint criticality instead of relying on order.`);
}
assert(packageRuntime.includes('function preferredThemePluginId()')&&packageRuntime.includes("dkds.theme-profile.v1"),'Startup must load only the persisted Theme provider before first paint.');
assert(!packageRuntime.includes("order<=20||m.systemCritical"),'Plugin order must not accidentally promote unrelated import providers into the first-paint critical set.');
assert(packageRuntime.includes('function startupLoadOrder(rows,critical)')&&packageRuntime.includes('if(id&&id===themeId)return 10')&&packageRuntime.includes('if(id&&id===startupPreferredSuperId)return 50'),'Selected Theme loading must be explicitly phase-ordered ahead of the selected SUPER rather than inheriting folder order.');
assert(packageRuntime.includes('async function loadBuiltinRowSafe')&&packageRuntime.includes('builtinLoadErrors.push')&&packageRuntime.includes("await loadBuiltinRowSafe(row,'startup')"),'One broken built-in plugin entry must be isolated instead of aborting the remaining startup-critical Theme/Core entries.');

assert(thin.includes("inspectorHeader:{surface:'rgba(239,245,251,.58)',text:'#243247'")&&thin.includes("inspectorHeader:{surface:'rgba(26,36,54,.58)',text:'#E7EDF5'"),'Thin Glass inspector chrome must be neutral blue-gray rather than Aurora-like teal.');
assert(material.includes('.dkds-material-role-chrome{\n  --dkds-material-theme-overlay:none;')&&material.includes('html[data-dkds-theme-header-effect="true"] body.dkds-modern-ui .dkds-material-role-chrome'),'Neutral themes must compute background-image:none while explicit header-effect themes opt into gradient chrome.');
assert(shell.includes('--dkui-hover-lift:0px;'),'Default theme must not vertically lift buttons on hover.');
assert(metrics.includes('--dkds-shell-top-height:92px')&&nav.includes('var(--dkds-shell-top-height,92px)'),'Desktop workspace must subtract the real 52px topbar + 40px tabs and leave no dead strip above the status bar.');
assert(split.includes('this.previewFrame=raf(()=>{this.previewFrame=0;this.paintPreview();')&&split.includes('this.previewViewport=this.viewport(this.drag?.rect)')&&split.includes('if(Number.isFinite(raw))this.previewSize=raw')&&layoutState.includes('if(nativeMobile&&state.mobileOverlay)')&&analysis.includes("if(document.documentElement?.classList?.contains('dkds-split-drag-active'))return;this.syncRegions()"),'Split drag must remain frame-coalesced; one Core controller caches drag geometry and resolves native limits while expensive workbench/chart resize paths stay frozen until commit.');
assert(html.includes('core/host/optional-runtime-loader.js')&&!html.includes('<script src="generated/sdk-authoring-reference.js"></script>')&&!html.includes('<script src="diagnostics/automation-test-runtime.js"></script>'),'Heavy SDK authoring and automation runtimes must not block the initial HTML parser.');
assert(loader.includes('ensureSdkAuthoringReference')&&loader.includes('ensureAutomationRuntime')&&startup.includes("if(visualClosure)await window.DKDSOptionalRuntime?.ensureAutomationRuntime?.()"),'Optional runtimes must remain available on demand and deterministic in Windows visual-closure mode.');
assert(pkg.scripts.prestart==='node scripts/prepare-dev-start.js'&&pkg.scripts.start==='electron .','Normal npm start must reuse generated runtime artifacts instead of rebuilding and revalidating the entire repository before every cold launch.');
console.log('v3.67.10 R7K final UI/startup regression contract PASS.');
