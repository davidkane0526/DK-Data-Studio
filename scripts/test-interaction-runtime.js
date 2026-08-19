const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(root,'src/core/ui-infrastructure.js'),'utf8');

const rafQueue=[];let rafSeq=0;
const window={addEventListener(){},removeEventListener(){},innerWidth:1200,innerHeight:800,ResizeObserver:null};
const document={querySelector(){return null;},querySelectorAll(){return[];},body:{},documentElement:{}};
const localStorage={getItem(){return null;},setItem(){}};
const context={window,document,localStorage,structuredClone,console,setTimeout,clearTimeout,
  requestAnimationFrame:fn=>{rafQueue.push(fn);return ++rafSeq;},cancelAnimationFrame(){},globalThis:null};
context.globalThis=context;window.window=window;window.document=document;window.localStorage=localStorage;
vm.createContext(context);vm.runInContext(code,context,{filename:'ui-infrastructure.js'});
const UI=window.DKDSUI;
assert(UI.version==='5.0.0','interaction/resize runtime requires UI infrastructure v5');
for(const token of ['SelectionModel','InteractionRuntime','DataTypeRegistry','ResizeScheduler'])assert(typeof UI[token]==='function',`missing ${token}`);

const emitted=[];let scope;
const events={emit(name,payload){emitted.push([name,payload]);if(name==='layout:resize'&&emitted.filter(row=>row[0]===name).length===1)scope.emitResize({reason:'recursive-listener'});}};
scope=UI.createScope('test.plugin',{events});
scope.dataTypes.register('demo.result',{title:'Derived result',parents:['result.analysis','data.point'],kind:'result',key:v=>v.id});
assert(scope.dataTypes.isA('demo.result','result.analysis'),'plugin data type must inherit analysis result');
assert(scope.dataTypes.isA('demo.result','data.point'),'data type registry must support multiple parents');
scope.dataTypes.register('demo.large',{title:'Large table-like result',parent:'result.analysis',kind:'result',key:v=>v.id,selection:v=>({id:v.id,ref:{resultId:v.id},value:{id:v.id,label:v.label,rowCount:v.rows?.length||0}}),resolve:ref=>({resolved:ref.resultId})});
const huge={id:'huge-1',label:'Huge result',rows:Array.from({length:5000},(_,i)=>({x:i,y:i*i}))};
const compact=scope.dataTypes.projectSelection('demo.large',huge);
assert(compact.value.rowCount===5000&&!('rows' in compact.value),'data type selection projection must keep huge result payloads out of interaction state');
const compactSelection=scope.selection.model('compact',{defaultType:'demo.large'});compactSelection.select({type:'demo.large',value:huge});
const compactSnap=compactSelection.get();
assert(compactSnap.focus.ref.resultId==='huge-1'&&compactSnap.focus.value.rowCount===5000&&!('rows' in compactSnap.focus.value),'typed selection must store compact ref/value projections');
assert(scope.dataTypes.resolve('demo.large',compactSnap.focus).resolved==='huge-1','data type resolver must rehydrate a selection ref through the owning type');
assert.throws(()=>UI.dataTypes.register('other.plugin','demo.large',{}),/already owned/,'plugins must not silently overwrite another owner data type');
const runtime=scope.interactionRuntime.create('analysis',{selection:{multiple:true,defaultType:'demo.result'},defaultType:'demo.result'});
let resultEvents=0;
runtime.bind('result-consumer',{types:['result.analysis'],onSelection(){resultEvents++;}});
runtime.select({id:'r1',value:42},{type:'demo.result',source:'unit-test'});
assert(runtime.get().focus.type==='demo.result'&&runtime.get().focus.id==='r1','typed interaction selection must preserve plugin type/id');
assert(resultEvents===1,'typed result consumer must receive subtype selections');
let anyResultEvents=0;runtime.bind('any-result',{types:['result.analysis'],mode:'any',onSelection(){anyResultEvents++;}});
runtime.selectMany([{type:'demo.result',id:'r2',value:{id:'r2',value:7}},{type:'data.point',id:'raw',value:{id:'raw'}}],{source:'mixed-test'});
assert(anyResultEvents===1,'interaction bindings in any mode must match heterogeneous selections even when focus has a different semantic family');
runtime.region({id:'box',min:0,max:1},[{type:'demo.result',id:'r1',value:{id:'r1'}},{type:'demo.result',id:'r2',value:{id:'r2'}}],{rangeType:'data.range',source:'range-test'});
const snap=runtime.get();
assert(snap.items.length===2&&snap.ranges.length===1,'region selection must atomically carry selected items and range');
assert(snap.ranges[0].type==='data.range','region selection must preserve registered range type');

scope.emitResize({reason:'a'});scope.emitResize({reason:'b'});
assert(emitted.length===0,'resize scheduler must coalesce until the next animation frame');
while(rafQueue.length){const fn=rafQueue.shift();fn();if(emitted.filter(row=>row[0]==='layout:resize').length>1)break;}
assert(emitted.filter(row=>row[0]==='layout:resize').length===1,'recursive layout listeners must not create a resize feedback loop');
scope.dispose();
console.log('Typed Interaction Runtime + resize scheduler checks passed.');
