'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const Module=require('module');
const root=path.resolve(__dirname,'..');
process.env.NODE_PATH=[path.join(root,'src/core'),process.env.NODE_PATH||''].filter(Boolean).join(path.delimiter);Module._initPaths();
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

assert(Number(json('package.json').version.split('.').at(-1))>=59,'App must retain the v3.71.59+ baseline.');
assert(Number(json('mobile/app.json').expo.android.versionCode)>=200,'Android versionCode must retain the v3.71.59+ baseline.');
const sdkAtLeast=(value,floor)=>{const a=String(value||'0.0.0').split('.').map(Number),b=String(floor||'0.0.0').split('.').map(Number);for(let i=0;i<3;i++){const x=a[i]||0,y=b[i]||0;if(x!==y)return x>y;}return true;};
assert(sdkAtLeast(json('sdk/contract.json').sdkVersion,'1.51.43'),'SDK must retain the 1.51.43+ workspace inset contract.');
const spec=require('../src/core/ui/modules/composition/unit-template-spec');
assert.strictEqual(spec.UNIT_TEMPLATE_SPEC_VERSION,'2.5.38');
assert.strictEqual(Object.keys(spec.UNIT_CATALOG).length,41,'PRIMARY edge inset must not add a new Unit type.');
assert(spec.UNIT_CONTRACTS.workspace.invariants.some(row=>row.includes('inline-end breathing-room owner')),'Workspace Unit contract must require one PRIMARY inline-end breathing-room owner.');

class StyleDecl{constructor(){this.map=new Map();}setProperty(k,v){this.map.set(String(k),String(v));}removeProperty(k){this.map.delete(String(k));}getPropertyValue(k){return this.map.get(String(k))||'';}}
const gate={set(el,k,v){el.style.setProperty(k,String(v));return v;},setToken(el,k,v){el.style.setProperty(k,String(v));return v;},remove(el,k){el.style.removeProperty(k);},snapshot(){return{};}};
global.DKDSStyleGate=gate;global.window={DKDSStyleGate:gate,addEventListener(){},removeEventListener(){}};global.document={querySelector(){return null;},documentElement:{dataset:{},classList:{contains(){return false;}}}};
const {FoundationUnitRuntime}=require('../src/core/ui/modules/composition/unit-template-foundation');
function element(){return {nodeType:1,dataset:{},style:new StyleDecl(),classList:{add(){}},setAttribute(){}};}
function makeRuntime(){
  const primary=element(),shell=element(),rootNode=element();
  const wb={slots:{primary},shell};
  const scope={pluginWorkspace:{create(){return wb;}},track(){}};
  return {runtime:new FoundationUnitRuntime(scope),primary,rootNode};
}
{
  const {runtime,primary,rootNode}=makeRuntime();runtime.createWorkspace(rootNode,{variant:'standard'});
  assert.strictEqual(primary.dataset.dkdsUnitPrimaryEndInsetOwner,'unit');
  assert.strictEqual(primary.dataset.dkdsUnitPrimaryEndInsetPx,'12');
  assert.strictEqual(primary.style.getPropertyValue('padding-right'),'12px','Unit Workspace must provide the default 12 px right/end breathing room.');
}
{
  const {runtime,primary,rootNode}=makeRuntime();runtime.createWorkspace(rootNode,{variant:'standard',primaryEndInset:{mode:'unit',px:16}});
  assert.strictEqual(primary.style.getPropertyValue('padding-right'),'16px');
}
{
  const {runtime,primary,rootNode}=makeRuntime();runtime.createWorkspace(rootNode,{variant:'standard',primaryEndInset:{mode:'content'}});
  assert.strictEqual(primary.dataset.dkdsUnitPrimaryEndInsetOwner,'content');
  assert.strictEqual(primary.style.getPropertyValue('padding-right'),'','content-owned mode must not add a second Unit host inset.');
}
{
  const {runtime,rootNode}=makeRuntime();
  assert.throws(()=>runtime.createWorkspace(rootNode,{variant:'standard',primaryEndInset:{mode:'unit',px:0}}),/UNIT_WORKSPACE_PRIMARY_END_INSET_INVALID/);
  assert.throws(()=>runtime.createWorkspace(rootNode,{variant:'standard',primaryEndInset:{mode:'mystery'}}),/UNIT_WORKSPACE_PRIMARY_END_INSET_MODE_INVALID/);
}

// Existing source-faithful plugins that already own a visible right inset declare content ownership,
// while Vth/Resonance consume the new safe Unit default so a production cutover cannot silently go edge-to-edge.
for(const rel of ['src/plugins/data-center/unit-presentation.js','src/plugins/ter-analysis/unit-presentation.js','src/plugins/pulse-sampler-tool/unit-presentation.js','src/plugins/pulse-analysis/unit-presentation.js']){
  assert(read(rel).includes("primaryEndInset:{mode:'content'}"),`${rel} must explicitly retain its already accepted content-owned end inset instead of receiving a second 12 px host inset.`);
}
for(const rel of ['src/plugins/transfer-vth-lab/unit-presentation.js','src/plugins/resonance-workbench/unit-presentation.js']){
  assert(!read(rel).includes('primaryEndInset:'),`${rel} must consume the Unit Workspace default 12 px end inset.`);
}
const workbenchCss=read('src/styles/structure/plugin-workspace.css');
assert(workbenchCss.includes('.dkds-plugin-workspace .dkds-analysis-main{padding:0'),'Generic Core dock/main padding must remain zero; the breathing room belongs to Unit Workspace, not global Core dock CSS.');
const dts=read('sdk/plugin-api.d.ts');
for(const token of ['DKDSUnitWorkspacePrimaryEndInsetSpec',"mode?:'unit'|'content'",'primaryEndInset?:DKDSUnitWorkspacePrimaryEndInsetSpec',"readonly version:'2.5.38'"])
  assert(dts.includes(token),`SDK type contract missing ${token}`);
console.log('v3.71.59 Unit Workspace PRIMARY end-inset contract PASS');
