'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const Module=require('module');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
process.env.NODE_PATH=[path.join(root,'src/core'),process.env.NODE_PATH||''].filter(Boolean).join(path.delimiter);Module._initPaths();

const units=read('src/plugins/resonance-workbench/unit-presentation.js');
const group=read('src/plugins/resonance-workbench/feature-group-runtime.js');
const docks=read('src/app/modules/floating-docks.js');
const scientificUnit=read('src/core/ui/modules/composition/unit-template-scientific.js');
const scientific=read('src/core/ui/modules/composition/scientific.js');
const dts=read('sdk/plugin-api.d.ts');

// Source-parity text nodes: ctx.ui.dom.create accepts `text`, not `textContent`.
assert(units.includes("dom.create(tag,{text:String(value??'')})"),'Resonance Unit text helper must use the public DOM `text` field.');
assert(!units.includes("dom.create(tag,{textContent:String(value??'')})"),'Resonance Unit text helper must not use the unsupported `textContent` option.');
for(const text of ['统一峰序 / 峰标签','峰位始终落在原始 I–V 采样点','数据列表','智能寻峰','手动操作']){
  assert(units.includes(text),`accepted Resonance text must remain authored: ${text}`);
}

// Group column commits must reach the live PlotGroup and reflow immediately.
assert(group.includes('grid?.setColumns?.(requested);'),'Group layout commit must call PlotGroup.setColumns immediately.');
assert(group.includes('syncGroupLayout({apply:true});'),'Group render/history restore must reapply the persisted column preference immediately.');
assert(scientificUnit.includes('getOrientation:()=>raw.getOrientation()'),'Unit PlotGroup facade must expose the physical orientation.');
assert(scientific.includes('getOrientation(){return this.area.getOrientation();}'),'Core PlotGroup runtime must expose GroupArea orientation.');
assert(dts.includes('getOrientation():DKDSGridOrientation'),'SDK types must publish PlotGroup orientation.');

// Global shortcut routing must not throw before Ctrl/Cmd+Z reaches system history.
const helperIndex=docks.indexOf('const isTypingTarget=target=>');
const listenerIndex=docks.indexOf("window.addEventListener('keydown',e=>{");
assert(helperIndex>=0&&listenerIndex>helperIndex,'global shortcut typing-target guard must be defined before the keydown router.');
assert(docks.includes("if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();if(e.shiftKey)void systemRedo();else void systemUndo();return;}"),'global Ctrl/Cmd+Z must route to unified system undo.');

// Runtime facade forwarding: this specifically prevents the previous false fix
// where the plugin called a method that the Unit PlotGroup facade did not expose.
global.window={addEventListener(){},removeEventListener(){}};global.document={querySelector(){return null;}};
global.DKDSStyleGate={
  setToken(el,name,value){el.style.setProperty(name,String(value));return value;},
  remove(el,name){el.style.removeProperty(name);},
  set(el,name,value){el.style.setProperty(name,String(value));return value;}
};
const {ScientificUnitRuntime}=require('../src/core/ui/modules/composition/unit-template-scientific');
const calls=[];
const raw={
  views:new Map(),
  addPlot(){},adoptPlot(){},removePlot(){return true;},
  setColumns(value){calls.push(['setColumns',String(value)]);return Number(value)||3;},
  getColumns(){return 3;},getAppliedColumns(){return 3;},getOrientation(){return 'landscape';},getColumnPreference(){return 'auto';},
  validate(){return[];},dispose(){calls.push(['dispose']);}
};
const host={nodeType:1,dataset:{},classList:{add(){},remove(){}},style:{setProperty(){},removeProperty(){}}};
const scope={track(){}};
const runtime=new ScientificUnitRuntime(scope,{plotGroups:{create(node){assert.strictEqual(node,host);return raw;}}});
const facade=runtime.createPlotGroup(host,{columns:3,density:'regular'});
assert.strictEqual(facade.getOrientation(),'landscape','Unit PlotGroup must forward getOrientation to the live runtime controller.');
facade.setColumns(2);
assert.deepStrictEqual(calls[0],['setColumns','2'],'Unit PlotGroup setColumns must synchronously forward to the live GroupArea owner.');

console.log('v3.71.25 Resonance columns/range/global-history closure: PASS');
