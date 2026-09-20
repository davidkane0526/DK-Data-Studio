'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const Module=require('module');
const {spawnSync}=require('child_process');
process.env.NODE_PATH=[path.join(process.cwd(),'src/core'),process.env.NODE_PATH||''].filter(Boolean).join(path.delimiter);Module._initPaths();
global.window=global.window||{};global.window.addEventListener=global.window.addEventListener||(()=>{});global.window.removeEventListener=global.window.removeEventListener||(()=>{});global.DKDSStyleGate=global.DKDSStyleGate||{set(){},setToken(){},remove(){},snapshot(){return{};}};global.window.DKDSStyleGate=global.DKDSStyleGate;
const {UNIT_CATALOG,UNIT_TEMPLATE_SPEC_VERSION,UNIT_CONTRACTS}=require('../src/core/ui/modules/composition/unit-template-spec');
const {NATIVE_PLUGIN_BLUEPRINTS,NATIVE_PLUGIN_GEOMETRY_BLUEPRINTS,VISUAL_PARITY}=require('../tools/sdk/native-blueprints');

const example='examples/sdk151-unit-data-center-shadow';
const source=fs.readFileSync(path.join(example,'plugin.js'),'utf8');
const parity=JSON.parse(fs.readFileSync(path.join(example,'parity.json'),'utf8'));
const nativeViews=fs.readFileSync('src/plugins/data-center/unit-presentation.js','utf8');
const nativeAdapter=fs.readFileSync('src/plugins/data-center/shared-views.js','utf8');
const nativeRuntime=fs.readFileSync('src/plugins/data-center/feature-runtime.js','utf8');
const nativeCss=fs.readFileSync('src/plugins/data-center/plugin.css','utf8');
const blueprint=NATIVE_PLUGIN_BLUEPRINTS['data-center'];

assert.strictEqual(UNIT_TEMPLATE_SPEC_VERSION,'2.5.38');
assert.strictEqual(Object.keys(UNIT_CATALOG).length,41,'Data Center reconstruction must refine the existing 41-Unit contract, not add a data-workbench-specific Unit.');
assert(UNIT_CONTRACTS.chip.extensionPoints.includes('optional invocation'),'Chip must expose generic optional invocation without changing chip geometry.');
assert(UNIT_CONTRACTS.chip.accessibility.some(row=>row.includes('native button')),'Interactive Chip keyboard semantics must be Core-owned.');
assert.deepStrictEqual(blueprint.parity,VISUAL_PARITY);
assert.strictEqual(parity.productionReplaced,true,'Data Center production presentation must be Unit-owned after the formal cutover.');
assert(nativeAdapter.includes("ctx.modules.require('unit-presentation')")||nativeAdapter.includes("DKDSPluginModules.get('builtin.data-center','unit-presentation')"),'shared-views must be a thin adapter into the production Unit presentation.');
assert.deepStrictEqual(Object.keys(parity.layers),VISUAL_PARITY);
for(const [layer,row] of Object.entries(parity.layers))assert(/^pass/.test(row.status),`Data Center shadow ${layer} parity is not closed: ${row.status}`);
assert.deepStrictEqual(parity.unitContract.missingUnitTypes,[]);
assert.deepStrictEqual(parity.unitContract.filledVariants,['chip:interactive']);

assert(!fs.readdirSync(example).some(name=>name.endsWith('.css')),'Data Center Unit shadow must not ship CSS.');
assert(source.includes('ctx.ui.unitTemplates'));
assert(!/scientificWorkbench|accepted-scientific-v1/.test(source),'Data Center shadow must prove free Unit composition.');
assert(!/\.className\s*=|\.style\.|ctx\.ui\.styles\.|dom\.style\(|dom\.token\(/.test(source),'Data Center shadow must not establish a private visual/style owner.');
for(const token of ['data-center-body','dc-card','dc-artifact-pane','dc-ref-chip','dc-step-card','dc-chart-pane','dc-tool-pane'])assert(!source.includes(token),`Data Center shadow copied native private visual token: ${token}`);

for(const call of ['units.page.create','units.pageHeader.create','units.workspace.create','units.layout.create','units.layout.apply','units.panel.create','units.header.create','units.toolbar.create','units.action.create','units.field.create','units.check.create','units.chip.create','units.note.create','units.status.create','units.list.create','units.list.item','units.parameterForm.mount','units.table.bind','units.prime.build','units.plotView.adopt','units.scientificPlot.create','units.dialog.prompt','units.dialog.confirm','units.menu.open','units.menu.contribute'])assert(source.includes(call),`Data Center shadow missing real Unit composition call: ${call}`);

assert(source.includes("presentationRole:'data-control'")&&source.includes("presentationRole:'data-primary'")&&source.includes("presentationRole:'scientific-secondary'"));
assert(source.includes("variant:'prime-contained'")&&source.includes("positionOwner:'prime'"),'Data Center chart PlotView must delegate movement to the chart-preview PRIME.');
assert(!/isNativeClient|isMobile|matchMedia|window\.innerWidth/.test(source),'Data Center shadow must not branch executable UI by platform.');
assert(source.includes("Array.from({length:18}"),'Data Center shadow must keep the table preview bounded to 18 rows.');
assert.strictEqual(parity.boundedPreview.rows,18);
assert(source.includes("variant:'formula-grid'")&&source.includes("variant:'workflow-step-head'")&&source.includes("variant:'provenance-row'"));
assert(source.includes("interactive:true")&&source.includes("command('formula-ref','renderFormula'"),'Formula-reference chips must use the generic interactive Chip contract.');
assert(source.includes("geom(ref,{padding:'3px 6px'})"),'Formula-reference chips must preserve the native 3px 6px geometry through accepted Unit Layout geometry.');
assert(nativeViews.includes("units.chip.create")&&nativeViews.includes("className:'dc-ref-chip'")&&nativeViews.includes("interactive:true"),'Interactive Chip requirement must be grounded in the production Unit presentation.');

for(const [action,nativeMethod] of Object.entries(parity.functionMap)){assert(source.includes(nativeMethod),`shadow action ${action} is not mapped to native boundary ${nativeMethod}`);assert(nativeRuntime.includes(nativeMethod),`native Data Center no longer exposes ${nativeMethod}`);}
for(const title of ['数据对象','公式 / 派生列','Workflow / Recipe','Provenance','通用图形预览']){assert(source.includes(title),`Data Center shadow missing production surface ${title}`);assert(nativeViews.includes(title)||nativeRuntime.includes(title),`surface is not grounded in production Data Center: ${title}`);}

const chartRegion=blueprint.regions.find(row=>row.id==='chart');
assert(chartRegion&&chartRegion.unit==='plotView'&&chartRegion.variant==='prime-contained','Data Center authoring blueprint must encode PRIME-owned chart position.');
assert(NATIVE_PLUGIN_GEOMETRY_BLUEPRINTS['data-center'].some(row=>row.match==='dc-chart-pane'&&row.unit==='plotView'&&row.variant==='prime-contained'),'Data Center geometry blueprint must agree that chart-preview PRIME owns movement.');
assert(nativeViews.includes("variant:'prime-contained'")&&nativeViews.includes("positionOwner:'prime'"),'production Data Center chart must ground delegated PlotView position ownership through the production Unit presentation.');
assert(nativeCss.includes('.dc-ref-chip')&&nativeViews.includes('chip.dataset.ref=key'),'production Data Center must ground interactive formula reference chips.');

const foundationSource=fs.readFileSync('src/core/ui/modules/composition/unit-template-foundation.js','utf8');
assert(foundationSource.includes("interactive=typeof spec.onInvoke==='function'||spec.interactive===true"),'Chip Runtime must infer native-button semantics from invocation.');
assert(foundationSource.includes("interactive?'button':'span'"));
assert(foundationSource.includes("node.addEventListener('click',event=>spec.onInvoke({event,chip:node,spec}))"));
const dts=fs.readFileSync('sdk/plugin-api.d.ts','utf8');
assert(dts.includes('interactive?:boolean')&&dts.includes('onInvoke?:(detail:{event:any;chip:HTMLElement;spec:DKDSUnitChipSpec})=>void'),'SDK types must publish the interactive Chip contract.');

// Execute the generic interactive Chip contract with a minimal DOM harness.
class ClassList{constructor(){this.values=new Set();}add(...v){for(const x of v)this.values.add(x);}remove(...v){for(const x of v)this.values.delete(x);}contains(v){return this.values.has(v);}}
class FakeElement{
  constructor(tag='div'){this.tagName=String(tag).toUpperCase();this.nodeType=1;this.dataset={};this.classList=new ClassList();this.children=[];this.listeners={};this.attributes={};this.disabled=false;this.type='';this.textContent='';}
  appendChild(node){this.children.push(node);node.parentNode=this;node.parentElement=this;return node;}append(...rows){for(const row of rows)this.appendChild(row);}setAttribute(k,v){this.attributes[k]=String(v);}getAttribute(k){return this.attributes[k];}addEventListener(k,fn){(this.listeners[k]||(this.listeners[k]=[])).push(fn);}dispatch(k){for(const fn of this.listeners[k]||[])fn({type:k,target:this});}querySelector(){return null;}
}
const previousDocument=global.document;
global.document={createElement:tag=>new FakeElement(tag),querySelector:()=>null};
try{
  const {FoundationUnitRuntime}=require('../src/core/ui/modules/composition/unit-template-foundation');
  const host=new FakeElement('div');let invoked=0;
  const chip=new FoundationUnitRuntime({}).createChip(host,{text:'Vd',variant:'quiet',onInvoke:()=>invoked++});
  assert.strictEqual(chip.tagName,'BUTTON');assert.strictEqual(chip.type,'button');assert.strictEqual(chip.dataset.dkdsUnitInteractive,'true');assert(String(chip.className||'').includes('dkds-chip'));
  chip.dispatch('click');assert.strictEqual(invoked,1,'interactive Chip must bind native click invocation.');
  const passive=new FoundationUnitRuntime({}).createChip(host,{text:'status'});assert.strictEqual(passive.tagName,'SPAN','display-only Chip must stay non-interactive.');
} finally {global.document=previousDocument;}

for(const command of ['validate','test-runtime','test-layout']){
  const result=spawnSync(process.execPath,['sdk/tools/dkds-plugin.js',command,example],{encoding:'utf8',timeout:120000});
  assert.strictEqual(result.status,0,`${command} failed\n${result.stdout||''}\n${result.stderr||''}`);
}
console.log('SDK 1.51 Data Center Unit shadow evidence + production cutover parity PASS');
