'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'src/core/ui/component-runtime.js'),'utf8');

class FakeClassList{toggle(){} add(){} }
class FakeElement{
  constructor(tag='div'){this.nodeType=1;this.tagName=String(tag).toUpperCase();this.dataset={};this.classList=new FakeClassList();this.className='';this.parentElement=null;this.children=[];this.listeners=new Map();this.attributes=new Map();this.style={};this.isConnected=true;}
  addEventListener(name,fn){if(!this.listeners.has(name))this.listeners.set(name,new Set());this.listeners.get(name).add(fn);}
  removeEventListener(name,fn){this.listeners.get(name)?.delete(fn);}
  setAttribute(name,value){this.attributes.set(String(name),String(value));}
  removeAttribute(name){this.attributes.delete(String(name));}
  getAttribute(name){return this.attributes.get(String(name))??null;}
  append(...rows){for(const row of rows){if(row&&typeof row==='object')row.parentElement=this;this.children.push(row);}}
  appendChild(row){this.append(row);return row;}
  querySelector(){return null;}
  querySelectorAll(){return[];}
  matches(){return false;}
  closest(){return null;}
  contains(node){if(node===this)return true;return this.children.some(child=>child?.contains?.(node));}
}
const document={readyState:'loading',querySelector(){return null;},querySelectorAll(){return[];},addEventListener(){},createElement:tag=>new FakeElement(tag),createTextNode:text=>({nodeType:3,textContent:String(text)}),createElementNS:(ns,tag)=>new FakeElement(tag)};
const raf=new Map();let rafId=0;
const window={document,ResizeObserver:null,MutationObserver:null};
const context={window,document,console,queueMicrotask:fn=>fn(),requestAnimationFrame:fn=>{const id=++rafId;raf.set(id,fn);return id;},cancelAnimationFrame:id=>raf.delete(id),setTimeout,clearTimeout,setInterval,clearInterval,globalThis:null};
context.globalThis=context;window.window=window;
context.DKDSStyleGate={KINDS:{CONFIG_TOKEN:'configuration-token',RUNTIME_INLINE:'runtime-inline'},set(el,prop,value){el.style[prop]=String(value);return value;},remove(el,prop){delete el.style[prop];return true;},setToken(el,prop,value){el.style[prop]=String(value);return value;}};
window.DKDSStyleGate=context.DKDSStyleGate;
vm.createContext(context);vm.runInContext(source,context,{filename:'component-runtime.js'});
const components=window.DKDSComponents;
assert(components&&components.VERSION==='2.3.0','Component runtime diagnostics version must initialize.');

const button=components.action({label:'Run'});
assert.equal(button.dataset.dkdsMotionRole,'control','Canonical action identity must project a semantic control motion role.');
assert.equal(button.dataset.dkdsMotionRoleOwner,'core-component','Motion role provenance must be traceable to its semantic owner.');

const host=new FakeElement('section'),child=new FakeElement('button');host.append(child);
const scope=components.createScope('test.plugin',{root:host});
const siblingScope=components.createScope('test.plugin',{root:host});
assert.equal(components.diagnostics().activeScopes,2,'Repeated render/switch cycles with the same owner must remain individually observable until disposed.');
siblingScope.dispose();
const off=scope.on(host,'click',()=>{});
assert(components.lifecycleOf(child).some(row=>row.owner==='test.plugin'&&row.kind==='event:click'&&row.depth===1),'Lifecycle trace must find delegated/ancestor event ownership.');
let diagnostics=components.diagnostics();
assert.equal(diagnostics.activeScopes,1,'Diagnostics must report live SDK DOM scopes.');
assert(diagnostics.resources.some(row=>row.owner==='test.plugin'&&row.kind==='event:click'&&row.count===1),'Diagnostics must count live listener resources by owner and kind.');
const cancelFrame=scope.frame(()=>{});
diagnostics=components.diagnostics();
assert(diagnostics.resources.some(row=>row.owner==='test.plugin'&&row.kind==='frame'&&row.count===1),'Pending SDK frame work must be visible in lifecycle diagnostics.');
cancelFrame();off();scope.dispose();
diagnostics=components.diagnostics();
assert.equal(diagnostics.activeScopes,0,'Disposed scope must disappear from lifecycle diagnostics.');
assert(!diagnostics.resources.some(row=>row.owner==='test.plugin'),'Disposed scope must leave zero tracked listener/frame/timer resources.');
console.log('v3.68.0 Component lifecycle ownership diagnostics regression passed.');
