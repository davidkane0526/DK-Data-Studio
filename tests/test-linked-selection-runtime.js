const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(root,'src/core/ui-infrastructure.js'),'utf8');

class FakeClassList{
  constructor(){this.values=new Set();}
  add(...rows){for(const row of rows)this.values.add(String(row));}
  remove(...rows){for(const row of rows)this.values.delete(String(row));}
  toggle(row,force){const key=String(row);if(force===undefined){if(this.values.has(key)){this.values.delete(key);return false;}this.values.add(key);return true;}if(force)this.values.add(key);else this.values.delete(key);return !!force;}
  contains(row){return this.values.has(String(row));}
}
class FakeElement{
  constructor({classes=[],dataset={}}={}){this.nodeType=1;this.classList=new FakeClassList();this.classList.add(...classes);this.dataset={...dataset};this.attributes=new Map();this.children=[];this.parentElement=null;this.listeners=new Map();this.scrollWidth=0;this.clientWidth=0;this.scrollLeft=0;this.revealed=false;}
  append(...rows){for(const row of rows){row.parentElement=this;this.children.push(row);}}
  querySelectorAll(selector){const out=[];const visit=node=>{for(const child of node.children){if(selector.startsWith('.')&&child.classList.contains(selector.slice(1)))out.push(child);visit(child);}};visit(this);return out;}
  closest(selector){if(selector.startsWith('.')&&this.classList.contains(selector.slice(1)))return this;return this.parentElement?.closest?.(selector)||null;}
  contains(node){if(node===this)return true;return this.children.some(child=>child.contains(node));}
  addEventListener(name,fn){if(!this.listeners.has(name))this.listeners.set(name,new Set());this.listeners.get(name).add(fn);}
  removeEventListener(name,fn){this.listeners.get(name)?.delete(fn);}
  dispatch(name,event={}){for(const fn of [...(this.listeners.get(name)||[])])fn({target:this,...event});}
  setAttribute(name,value){this.attributes.set(String(name),String(value));}
  removeAttribute(name){this.attributes.delete(String(name));}
  getAttribute(name){return this.attributes.get(String(name))??null;}
  scrollIntoView(){this.revealed=true;}
}

const raf=[];
const window={addEventListener(){},removeEventListener(){},innerWidth:1200,innerHeight:800,ResizeObserver:null,MutationObserver:null};
const document={querySelector(){return null;},querySelectorAll(){return[];},body:new FakeElement(),documentElement:new FakeElement()};
const localStorage={getItem(){return null;},setItem(){}};
const context={window,document,localStorage,structuredClone,console,setTimeout,clearTimeout,
  requestAnimationFrame:fn=>{raf.push(fn);return raf.length;},cancelAnimationFrame(){},globalThis:null};
context.globalThis=context;window.window=window;window.document=document;window.localStorage=localStorage;
vm.createContext(context);vm.runInContext(code,context,{filename:'ui-infrastructure.js'});

const scope=window.DKDSUI.createScope('linked-selection-test');
const runtime=scope.interactionRuntime.create('analysis',{selection:{defaultType:'core.entity'}});
const focusKey=snapshot=>String(snapshot?.focus?.ref?.datasetPath||'');
const makeItems=()=>['a','b','c'].map(key=>new FakeElement({classes:['item'],dataset:{key}}));
const legend=new FakeElement();legend.scrollWidth=320;legend.clientWidth=100;const legendItems=makeItems();legend.append(...legendItems);
const list=new FakeElement();const listItems=makeItems();list.append(...listItems);

runtime.bindView('legend',legend,{selector:'.item',itemKey:el=>el.dataset.key,focusKey,dimOthers:true,horizontalWheel:true,onActivate:({element})=>runtime.selection.select({type:'core.entity',id:`s-${element.dataset.key}`,ref:{datasetPath:element.dataset.key},value:{datasetPath:element.dataset.key}},{source:'legend'})});
runtime.bindView('list',list,{selector:'.item',itemKey:el=>el.dataset.key,focusKey,itemVariant:'row',revealFocus:true});
runtime.selection.select({type:'core.entity',id:'s-b',ref:{datasetPath:'b'},value:{datasetPath:'b'}},{source:'curve'});
while(raf.length)raf.shift()();
assert(legendItems[1].classList.contains('dkds-selection-focused'),'focused legend projection must follow Core selection focus');
assert(legendItems[0].classList.contains('dkds-selection-dimmed'),'non-focused visible legend projections must dim when requested');
assert(listItems[1].classList.contains('dkds-selection-focused'),'data-list projection must follow the same Core focus');
assert(listItems[1].revealed,'focused list row must be revealed automatically');
assert(legend.classList.contains('dkds-scrollbar-hidden'),'horizontal linked view must hide scrollbar chrome when requested');
let prevented=false,stopped=false;legend.dispatch('wheel',{deltaX:0,deltaY:60,preventDefault(){prevented=true;},stopPropagation(){stopped=true;}});
assert.equal(legend.scrollLeft,60,'ordinary vertical wheel input must advance an overflowing horizontal strip');
assert(prevented&&stopped,'handled horizontal wheel input must not also scroll the outer page');
legend.children=[];const rebuiltLegendItems=makeItems();legend.append(...rebuiltLegendItems);
runtime.view('legend').refresh({reveal:'if-needed'});while(raf.length)raf.shift()();
assert(rebuiltLegendItems[1].revealed,'rebuilt horizontal legend must reveal the still-focused entity');
legend.dispatch('click',{target:rebuiltLegendItems[2]});
assert.equal(runtime.get().focus.ref.datasetPath,'c','activating a linked view item must publish back to the shared interaction focus');
assert(rebuiltLegendItems[2].classList.contains('dkds-selection-focused')&&listItems[2].classList.contains('dkds-selection-focused'),'all linked projections must update after activation from any linked view');
scope.dispose();
console.log('Core linked-selection views + wheel-driven horizontal strip checks passed.');
