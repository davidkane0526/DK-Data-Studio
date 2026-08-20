const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(root,'src/core/ui-infrastructure.js'),'utf8');

const events=new Map();
const window={
  addEventListener(name,fn){if(!events.has(name))events.set(name,new Set());events.get(name).add(fn);},
  removeEventListener(name,fn){events.get(name)?.delete(fn);},
  dispatchEvent(event){for(const fn of [...(events.get(event.type)||[])])fn(event);return true;},
  innerWidth:1200,innerHeight:800,ResizeObserver:null,MutationObserver:null
};
class CustomEvent{constructor(type,init={}){this.type=type;this.detail=init.detail;}}
const fakeElement={nodeType:1,classList:{add(){},remove(){},toggle(){},contains(){return false;}},querySelector(){return null;},querySelectorAll(){return[];},addEventListener(){},removeEventListener(){}};
const document={querySelector(){return null;},querySelectorAll(){return[];},body:fakeElement,documentElement:fakeElement,createElement(){return {...fakeElement};}};
const localStorage={getItem(){return null;},setItem(){}};
const context={window,document,localStorage,structuredClone,CustomEvent,console,setTimeout,clearTimeout,requestAnimationFrame:fn=>{fn();return 1;},cancelAnimationFrame(){},globalThis:null};
context.globalThis=context;window.window=window;window.document=document;window.localStorage=localStorage;window.CustomEvent=CustomEvent;
vm.createContext(context);vm.runInContext(code,context,{filename:'ui-infrastructure.js'});
const T=window.DKDSUI.dataTypes;
for(const id of ['data.table','science.iv.raw','science.iv.background-removed','science.transport.didv','science.transport.d2idv2','science.transport.dlnabsidv','science.transport.dvdi','science.transport.resistance','science.resonance.peak','science.resonance.fwhm','science.ter.value','science.ter.matrix'])assert(T.get(id),`missing canonical type ${id}`);
assert(T.isA('science.transport.didv','science.iv.derivative'));
assert(T.isA('science.transport.didv','science.curve'));
assert(T.accepts('science.transport.didv',['science.curve']));
assert(T.compatible('science.resonance.peak','data.point'));
assert.equal(T.list({tag:'transport'}).some(row=>row.id==='science.transport.resistance'),true);
assert.equal(T.validate().ok,true,T.validate().errors.join('; '));

const cycleScope=window.DKDSUI.createScope('test.cycle');
cycleScope.dataTypes.register('test.cycle-a',{parent:'test.cycle-b'});
cycleScope.dataTypes.register('test.cycle-b',{parent:'test.cycle-a'});
const invalid=T.validate();
assert.equal(invalid.ok,false,'registry validation must reject inheritance cycles');
assert(invalid.errors.some(error=>error.includes('inheritance cycle detected')),'cycle validation error missing');
cycleScope.dispose();
assert.equal(T.validate().ok,true,'registry must recover after cycle owner is disposed');

const producer=window.DKDSUI.createScope('test.producer');
const consumer=window.DKDSUI.createScope('test.consumer');
producer.dataTypes.register('test.resonance-peak',{parent:'science.resonance.peak',key:v=>v.id});
const source=producer.interactionRuntime.create('source',{selection:{defaultType:'test.resonance-peak'}});
const sink=consumer.interactionRuntime.create('sink',{selection:{defaultType:'core.entity'},acceptTypes:['science.resonance.peak']});
let observed=null;consumer.selection.observe((snapshot,meta,detail)=>{observed={snapshot,meta,detail};},{types:['science.resonance.peak']});
source.select({id:'peak-1',v:0.4},{type:'test.resonance-peak',source:'producer'});
assert(observed?.snapshot?.focus?.id==='peak-1','cross-plugin selection event not observed through canonical parent type');
assert(sink.accepts(observed.snapshot.focus),'consumer must accept producer subtype via canonical parent');
sink.importSelection(observed.snapshot,{acceptTypes:['science.resonance.peak']});
assert.equal(sink.get().focus.id,'peak-1');
producer.dispose();consumer.dispose();
console.log('v3.45 canonical scientific data types + cross-plugin Selection Contract checks passed.');
