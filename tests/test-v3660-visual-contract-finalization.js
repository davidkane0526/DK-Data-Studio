'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const {inspectPluginCss,collectCoreAliases}=require('../sdk/visual-contract');

const pkg=json('package.json');
const sdk=json('sdk/contract.json');
const uiRuntime=read('src/core/ui/component-runtime.js');
const facade=read('src/core/plugins/kernel/modules/plugin-api.js');
const dts=read('sdk/plugin-api.d.ts');
const styleValidator=read('scripts/validate-styles.js');
const sdkValidator=read('sdk/tools/dkds-plugin.js');
const pulseViews=read('src/plugins/pulse-analysis/shared-views.js');
const pulseCss=read('src/plugins/pulse-analysis/plugin.css');

const tuple=v=>String(v).split('.').slice(0,3).map(Number);
const atLeast=(a,b)=>{for(let i=0;i<3;i++){if(a[i]!==b[i])return a[i]>b[i];}return true;};
assert(atLeast(tuple(pkg.version),[3,66,0]),'Visual Contract Finalization 2 requires DK Data Studio 3.66.1+.');
assert(atLeast(tuple(sdk.sdkVersion),[1,22,0]),'Visual Contract Finalization 2 requires SDK 1.22.1+.');
assert.strictEqual(sdk.pluginApiVersion,'1.19.0','Plugin API remains 1.19.0; this is a stronger Core UI ownership contract, not a runtime facade break.');
assert.strictEqual(sdk.themeContractVersion,'3.10.0','Theme Contract remains 3.10.0; component identity/material resolution stays canonical.');

const componentRuntimeVersion=uiRuntime.match(/const VERSION='([^']+)'/)?.[1]||'0.0.0';
assert(atLeast(tuple(componentRuntimeVersion),[2,0,0]),`Core ComponentRuntime must remain on the 2.x canonical component factory contract or newer, got ${componentRuntimeVersion}.`);
assert(uiRuntime.includes('queueHydration')&&uiRuntime.includes('DKDSDOMMutationHub')&&uiRuntime.includes("hub.subscribe('core.components.hydration'"),'Core ComponentRuntime must auto-hydrate dynamic plugin DOM through the shared DOM Mutation Hub, not a private document observer.');
for(const name of ['action','actionGroup','tabs','surfaceHeader','field','hydrate']){
  assert(new RegExp(`\\b${name}\\(`).test(uiRuntime),`Core ComponentRuntime must implement ${name}().`);
  assert(facade.includes(`${name}:`),`Plugin facade must expose ctx.ui.components.${name}.`);
  assert(dts.includes(`${name}(`),`SDK types must expose ctx.ui.components.${name}().`);
}
assert(styleValidator.includes("require('../sdk/visual-contract')"),'First-party style build must consume the SDK visual ownership audit.');
assert(sdkValidator.includes("require('../visual-contract')")&&sdkValidator.includes('inspectPluginCss(row.content'),'SDK package validation must enforce the same visual ownership contract for external plugins.');

let issueCount=0;
for(const entry of fs.readdirSync(path.join(root,'src/plugins'),{withFileTypes:true})){
  if(!entry.isDirectory())continue;
  const file=path.join(root,'src/plugins',entry.name,'plugin.css');
  if(!fs.existsSync(file))continue;
  const folder=path.dirname(file);
  const sourceFiles=[];
  const walk=d=>{for(const row of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,row.name);if(row.isDirectory())walk(p);else if(row.isFile()&&/\.(?:js|html)$/.test(row.name))sourceFiles.push(p);}};
  walk(folder);
  const aliases=collectCoreAliases(sourceFiles.map(readFile=>fs.readFileSync(readFile,'utf8')).join('\n'));
  const audit=inspectPluginCss(fs.readFileSync(file,'utf8'),{path:path.relative(root,file).replace(/\\/g,'/'),aliases});
  issueCount+=audit.issues.length;
  if(audit.issues.length)console.error(audit.issues);
}
assert.strictEqual(issueCount,0,'First-party plugins may not own application paint or standard Core control/header geometry.');

const aliasProbe=collectCoreAliases('<header class="plugin-head dkds-surface-header"><button class="plugin-close dkds-icon-button">×</button></header>');
const aliasProbeAudit=inspectPluginCss('.plugin-head{padding:99px}.plugin-close{width:99px}',{path:'probe.css',aliases:aliasProbe});
assert(aliasProbeAudit.issues.some(row=>row.code==='PLUGIN_ALIASES_CORE_HEADER_GEOMETRY'),'Source-aware audit must reject custom aliases that re-own Core header geometry.');
assert(aliasProbeAudit.issues.some(row=>row.code==='PLUGIN_ALIASES_CORE_ACTION_GEOMETRY'),'Source-aware audit must reject custom aliases that re-own Core action geometry.');

assert(pulseViews.includes('dkds-surface-heading-stack'),'Pulse Analysis must express multi-line header content through the shared Core heading stack.');
assert(pulseViews.includes('pulse-current-file-actions dkds-surface-actions')&&pulseViews.includes('pulse-table-actions dkds-surface-actions'),'Pulse Analysis header actions must use Core SurfaceActions instead of a plugin-local toolbar geometry path.');
assert(!/\.pulse-card-heading:not\(\.dkds-plot-view-head\)\{[^}]*padding/s.test(pulseCss),'Pulse Analysis must not redefine standard SurfaceHeader padding.');

console.log('v3.66.1 Visual Contract Finalization 2: canonical Core components + plugin visual ownership gates passed.');
