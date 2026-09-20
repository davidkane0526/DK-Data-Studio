'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const Module=require('module');
const {spawnSync}=require('child_process');
process.env.NODE_PATH=[path.join(process.cwd(),'src/core'),process.env.NODE_PATH||''].filter(Boolean).join(path.delimiter);Module._initPaths();
const {UNIT_CATALOG,UNIT_TEMPLATE_SPEC_VERSION,UNIT_CONTRACTS}=require('../src/core/ui/modules/composition/unit-template-spec');
const {PRESET_DEFINITIONS}=require('../src/core/ui/modules/composition/unit-template-presets');
const {NATIVE_PLUGIN_BLUEPRINTS,NATIVE_PLUGIN_GEOMETRY_BLUEPRINTS,VISUAL_PARITY}=require('../tools/sdk/native-blueprints');

const example='examples/sdk151-unit-resonance-shadow';
const source=fs.readFileSync(path.join(example,'plugin.js'),'utf8');
const parity=JSON.parse(fs.readFileSync(path.join(example,'parity.json'),'utf8'));
const nativeFiles=fs.readdirSync('src/plugins/resonance-workbench').filter(name=>name.endsWith('.js')).map(name=>fs.readFileSync(path.join('src/plugins/resonance-workbench',name),'utf8'));
const nativeAll=nativeFiles.join('\n');
const blueprint=NATIVE_PLUGIN_BLUEPRINTS['resonance-workbench'];

assert.strictEqual(UNIT_TEMPLATE_SPEC_VERSION,'2.5.38');
assert.strictEqual(Object.keys(UNIT_CATALOG).length,41,'Resonance reconstruction must refine the existing 41-Unit contract, not add a native-plugin-specific Unit.');
assert(UNIT_CATALOG.section.variants.includes('disclosure'),'Section must expose the generic disclosure variant discovered by Resonance.');
assert(UNIT_CONTRACTS.section.accessibility.some(row=>row.includes('details/summary')),'Disclosure accessibility must be Core-owned.');
assert(UNIT_CONTRACTS.popover.invariants.some(row=>row.includes('viewport-clamped')),'Popover final coordinates must be Core-owned.');
assert.deepStrictEqual(blueprint.parity,VISUAL_PARITY);
assert.strictEqual(parity.productionReplaced,false);
assert.deepStrictEqual(Object.keys(parity.layers),VISUAL_PARITY);
for(const [layer,row] of Object.entries(parity.layers))assert(/^pass/.test(row.status),`Resonance shadow ${layer} parity is not closed: ${row.status}`);
assert.deepStrictEqual(parity.unitContract.missingUnitTypes,[]);
assert.deepStrictEqual(parity.unitContract.filledVariants,['section:disclosure','popover:anchored-positioning','popover:picker-dialog-semantics']);

assert(!fs.readdirSync(example).some(name=>name.endsWith('.css')),'Resonance Unit shadow must not ship CSS.');
assert(source.includes('ctx.ui.unitTemplates'));
assert(!/ctx\.ui\.scientificWorkbench|units\.compositions\.acceptedScientificV1|accepted-scientific-v1/.test(source),'Resonance shadow must manually prove the same public Unit composition rather than call the whole-workbench preset.');
assert(!/\.className\s*=|\.style\.|ctx\.ui\.styles\.|dom\.style\(|dom\.token\(/.test(source),'Resonance shadow must not establish a private visual/style owner.');
for(const token of ['respar-','reswin-','resonance-dedicated-body','resonance-parity-root'])assert(!source.includes(token),`Resonance shadow copied native private visual token: ${token}`);

for(const call of ['units.page.create','units.pageHeader.create','units.workspace.create','units.layout.create','units.layout.apply','units.section.create','units.panel.create','units.header.create','units.floatingChrome.create','units.action.create','units.field.create','units.check.create','units.note.create','units.metric.create','units.summary.create','units.list.create','units.list.item','units.parameterForm.mount','units.table.mount','units.prime.build','units.plotGroup.buildPrime','units.scientificPlot.create','units.legend.create','units.dialog.confirm','units.menu.contribute','units.popover.create','units.status.contribute'])assert(source.includes(call),`Resonance shadow missing real Unit composition call: ${call}`);

for(const step of PRESET_DEFINITIONS['accepted-scientific-v1'].primary){assert(source.includes(`units.${step.unit}.${step.method}`),`manual Resonance PRIMARY does not consume preset step through the public Unit facade: ${step.unit}.${step.method}`);}
for(const variant of ['accepted-main-area','accepted-main-workspace','accepted-plot-wrap','accepted-main-header','accepted-main-plot','accepted-summary'])assert(source.includes(`variant:'${variant}'`),`Resonance shadow missing accepted scientific PRIMARY variant ${variant}`);
assert(source.includes("variant:'accepted-scientific-data-control'"));
assert(source.includes("variant:'accepted-scientific-inspector'"));
assert(source.includes("variant:'accepted-scientific'"));
assert(source.includes("presentationRole:'data-control'")&&source.includes("presentationRole:'inspector'")&&source.includes("presentationRole:'scientific-secondary'"));
assert(!/isNativeClient|isMobile|matchMedia|window\.innerWidth/.test(source),'Resonance shadow must not branch executable UI by platform.');

assert(source.includes("variant:'disclosure'"),'advanced detector settings must be reconstructed as the generic disclosure Unit.');
assert(source.includes("placement:'point'")&&source.includes('point,placement'), 'range action surface must use Core point-positioned Popover.');
assert(source.includes("variant:'picker'"),'range action surface must use picker popover semantics.');
for(const chord of ["chord:'L'","chord:'Shift+L'","chord:'ArrowUp'","chord:'ArrowDown'","chord:'ArrowLeft'","chord:'ArrowRight'"])assert(source.includes(chord),`Resonance shadow missing domain keyboard extension ${chord}`);
assert(source.includes("gesture:'drag',target:'marker'"));
assert(source.includes("gesture:'context',target:'marker',modifiers:['ctrl']"));
assert(source.includes("gesture:'context',target:'marker',modifiers:['shift']"));

for(const title of parity.groupPlotTitles){assert(source.includes(title),`Resonance shadow missing group plot ${title}`);assert(nativeAll.includes(title),`group plot title is not grounded in production Resonance: ${title}`);}
for(const title of parity.derivedTitles){assert(source.includes(title),`Resonance shadow missing derived surface ${title}`);assert(nativeAll.includes(title),`derived title is not grounded in production Resonance: ${title}`);}
assert.strictEqual((source.match(/source:`resonance-unit-shadow:group-/g)||[]).length,1,'group scientific plot construction must remain data-driven, not hand-copied six times.');
assert(source.includes('const gateTitles=')&&source.includes("'跨曲线特征场'"),'all gate-analysis chart families must be expressed from one Unit composition loop.');

for(const [action,nativeMethod] of Object.entries(parity.functionMap)){assert(source.includes(nativeMethod),`shadow action ${action} is not mapped to native boundary ${nativeMethod}`);assert(nativeAll.includes(nativeMethod),`native Resonance no longer exposes ${nativeMethod}`);}

const advancedRegion=blueprint.regions.find(row=>row.id==='advanced-settings');
assert(advancedRegion&&advancedRegion.unit==='section'&&advancedRegion.variant==='disclosure','Resonance authoring blueprint must encode the real inline disclosure.');
assert(NATIVE_PLUGIN_GEOMETRY_BLUEPRINTS['resonance-workbench'].some(row=>row.match==='respar-advanced'&&row.unit==='section'&&row.variant==='disclosure'),'Resonance geometry blueprint must agree on section:disclosure.');

const presetSource=fs.readFileSync('src/core/ui/modules/composition/unit-template-presets.js','utf8');
assert(presetSource.includes('Presets are data-only compositions of public Unit Templates'));
assert(!/document\.createElement|StyleGate|className\s*=/.test(presetSource),'accepted-scientific-v1 preset must not own a parallel renderer or visual DOM.');
const foundationSource=fs.readFileSync('src/core/ui/modules/composition/unit-template-foundation.js','utf8');
assert(foundationSource.includes("variant==='disclosure'?'details'"),'Section Runtime must build disclosure with native details/summary semantics.');
assert(foundationSource.includes("POPOVER_POSITION_OWNER='core.unit-template.popover-position'"),'Popover coordinates must have a Core style owner.');
assert(foundationSource.includes("node.dataset.dkdsUnitPopoverPosition='core'"));
assert(foundationSource.includes("String(spec.role||(String(spec.variant||'status')==='picker'?'dialog':''))"),'picker Popover must receive Core-owned interactive semantics.');
const dts=fs.readFileSync('sdk/plugin-api.d.ts','utf8');
assert(dts.includes("DKDSUnitSectionVariant='workflow'|'controls'|'primary-plot'|'plot-group'|'result'|'warning'|'disclosure'"));
assert(dts.includes('anchor?:Element|string')&&dts.includes('point?:DKDSUnitPopoverPoint')&&dts.includes('reposition:(patch?:Partial<DKDSUnitPopoverSpec>)'));

// Execute the two newly discovered generic contracts without a browser dependency.
class ClassList{constructor(){this.values=new Set();}add(...v){for(const x of v)this.values.add(x);}remove(...v){for(const x of v)this.values.delete(x);}contains(v){return this.values.has(v);}}
class FakeElement{
  constructor(tag='div'){this.tagName=String(tag).toUpperCase();this.nodeType=1;this.dataset={};this.classList=new ClassList();this.children=[];this.parentNode=null;this.parentElement=null;this.attributes={};this.listeners={};this._style={};this.open=false;this.offsetWidth=220;this.offsetHeight=140;this.clientWidth=220;this.clientHeight=140;}
  appendChild(node){node.parentNode=this;node.parentElement=this;this.children.push(node);return node;}append(...rows){for(const row of rows)this.appendChild(row);}remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(x=>x!==this);this.parentNode=null;this.parentElement=null;}
  setAttribute(k,v){this.attributes[k]=String(v);}getAttribute(k){return this.attributes[k];}removeAttribute(k){delete this.attributes[k];}addEventListener(k,fn){(this.listeners[k]||(this.listeners[k]=[])).push(fn);}removeEventListener(){}contains(node){return node===this||this.children.includes(node);}querySelector(){return null;}getBoundingClientRect(){return {left:100,top:100,right:320,bottom:240,width:220,height:140};}
}
const fakeBody=new FakeElement('body');
global.document={createElement:t=>new FakeElement(t),body:fakeBody,documentElement:{clientWidth:1200,clientHeight:800,dataset:{},classList:new ClassList()},querySelector:()=>null,addEventListener(){},removeEventListener(){}};
global.window={document:global.document,innerWidth:1200,innerHeight:800,addEventListener(){},removeEventListener(){}};
global.innerWidth=1200;global.innerHeight=800;
const styleGate={set(node,p,v){node._style[p]=String(v);},setToken(node,p,v){node._style[p]=String(v);},remove(node,p){delete node._style[p];}};global.DKDSStyleGate=styleGate;window.DKDSStyleGate=styleGate;
const tracked=[];const scope={track(fn){tracked.push(fn);return fn;},actions:{mount(){return{};}}};
const {FoundationUnitRuntime}=require('../src/core/ui/modules/composition/unit-template-foundation');
const rt=new FoundationUnitRuntime(scope),host=new FakeElement('main');
const disclosure=rt.createSection(host,{variant:'disclosure',title:'高级设置',open:true});
assert.strictEqual(disclosure.element.tagName,'DETAILS');assert.strictEqual(disclosure.element.open,true);assert.strictEqual(disclosure.header.tagName,'SUMMARY');assert.strictEqual(disclosure.element.dataset.dkdsUnitVariant,'disclosure');
const pop=rt.createPopover(host,{variant:'picker',title:'已框选区域',header:false,point:{x:1190,y:790},placement:'point',dismissOnOutside:false});
assert.strictEqual(pop.element.getAttribute('role'),'dialog');assert.strictEqual(pop.element.getAttribute('aria-label'),'已框选区域');assert.strictEqual(pop.element.dataset.dkdsUnitPopoverPosition,'core');assert.strictEqual(pop.element._style.left,'972px');assert.strictEqual(pop.element._style.top,'652px');assert.strictEqual(typeof pop.reposition,'function');
pop.reposition({point:{x:20,y:30}});assert.strictEqual(pop.element._style.left,'20px');assert.strictEqual(pop.element._style.top,'30px');pop.close();
for(const fn of tracked.reverse())try{fn();}catch{}

for(const command of ['validate','test-runtime','test-layout']){
  const result=spawnSync(process.execPath,['sdk/tools/dkds-plugin.js',command,example],{encoding:'utf8',timeout:120000});
  assert.strictEqual(result.status,0,`${command} failed\n${result.stdout||''}\n${result.stderr||''}`);
}
console.log('SDK 1.51.4 Resonance Unit-only shadow reconstruction seven-layer parity PASS');
