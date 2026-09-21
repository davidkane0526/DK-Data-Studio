'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const Module=require('module');
process.env.NODE_PATH=[path.join(process.cwd(),'src/core'),process.env.NODE_PATH||''].filter(Boolean).join(path.delimiter);Module._initPaths();
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const pkg=require('../package.json');
const spec=require('../src/core/ui/modules/composition/unit-template-spec');
const sdk=require('../sdk/contract.json');
const atLeast=(actual,minimum)=>{const a=String(actual).split('.').map(Number),b=String(minimum).split('.').map(Number);for(let i=0;i<3;i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false;}return true;};
assert(atLeast(pkg.version,'3.71.105'));
assert.strictEqual(spec.UNIT_TEMPLATE_SPEC_VERSION,'2.5.38');
assert(atLeast(sdk.sdkVersion,'1.51.43'),'SDK must remain at or above the Data Center retained-list contract version.');

const presentation=read('src/plugins/data-center/unit-presentation.js');
const runtimeSource=read('src/plugins/data-center/feature-runtime.js');
const foundationSource=read('src/core/ui/modules/composition/unit-template-foundation.js');
assert(presentation.includes('artifactListUnit:artifactList'),'Data Center presentation must retain the concrete Unit List handle.');
assert(runtimeSource.includes("artifactListUnit=presentation.artifactListUnit||null,artifactListEl=artifactListUnit?.element"),'Data Center runtime must retain the Unit-created list instance across Presenter reparenting.');
assert(runtimeSource.includes('if(artifactListUnit?.setItems)artifactListUnit.setItems(specs)'),'Data Center dynamic catalog must update through Unit List.setItems().');
assert(!runtimeSource.includes("const list=$('#dcArtifactList');if(!list)return"),'Data Center must not rediscover the reparented catalog through the old page selector.');
assert(foundationSource.includes('setItems:(items=[])=>'),'List Unit must own atomic dynamic collection updates.');
assert(foundationSource.includes("'dkds-list-item-leading'"),'ListItem must own its leading slot.');
assert(foundationSource.includes("'dkds-list-item-title'"),'ListItem must own its title slot.');
assert(foundationSource.includes("'dkds-list-item-meta dkds-meta'"),'ListItem must own canonical meta anatomy.');

class ClassList{constructor(){this.values=new Set();}add(...rows){for(const row of rows)for(const v of String(row||'').split(/\s+/).filter(Boolean))this.values.add(v);}remove(...rows){for(const row of rows)this.values.delete(row);}contains(v){return this.values.has(v);}}
class FakeElement{
  constructor(tag='div'){this.tagName=String(tag).toUpperCase();this.nodeType=1;this.dataset={};this.classList=new ClassList();this.children=[];this.parentNode=null;this.parentElement=null;this.attributes={};this.listeners={};this.textContent='';this.className='';this.disabled=false;this.type='';}
  appendChild(node){if(node?.parentNode){const i=node.parentNode.children.indexOf(node);if(i>=0)node.parentNode.children.splice(i,1);}if(node&&typeof node==='object'){node.parentNode=this;node.parentElement=this;}this.children.push(node);return node;}
  append(...rows){for(const row of rows){if(typeof row==='string'){const t=new FakeElement('#text');t.nodeType=3;t.textContent=row;this.appendChild(t);}else this.appendChild(row);}}
  replaceChildren(...rows){for(const child of this.children){child.parentNode=null;child.parentElement=null;}this.children=[];for(const row of rows)this.appendChild(row);}
  setAttribute(k,v){this.attributes[k]=String(v);} getAttribute(k){return this.attributes[k];}
  addEventListener(k,fn){(this.listeners[k]||(this.listeners[k]=[])).push(fn);}
}
const oldDocument=global.document,oldWindow=global.window,oldStyleGate=global.DKDSStyleGate;
const fakeDocument={createElement:tag=>new FakeElement(tag),createTextNode:text=>({nodeType:3,textContent:String(text),parentNode:null,parentElement:null}),querySelector:()=>null,documentElement:{dataset:{},classList:new ClassList()}};
global.document=fakeDocument;global.window={document:fakeDocument,addEventListener(){},removeEventListener(){}};
const styleGate={set(){},setToken(){},remove(){},snapshot(){return{};}};global.DKDSStyleGate=styleGate;global.window.DKDSStyleGate=styleGate;
try{
  delete require.cache[require.resolve('../src/core/ui/modules/composition/unit-template-foundation')];
  const {FoundationUnitRuntime}=require('../src/core/ui/modules/composition/unit-template-foundation');
  const units=new FoundationUnitRuntime({track(){},actions:{mount(){return null;}}});
  const original=new FakeElement('div'),drawer=new FakeElement('div');
  const list=units.createList(original,{className:'dc-artifact-list'});
  assert.strictEqual(list.element.parentNode,original);
  drawer.appendChild(list.element); // Presenter-style reparent.
  assert.strictEqual(list.element.parentNode,drawer);
  const check=new FakeElement('input');
  const rows=list.setItems([{tagName:'div',selectable:true,role:'option',dataset:{artifactId:'a1'},ariaLabel:'vg=0 V.csv',leading:check,contentClassName:'dc-artifact-copy',title:'vg=0 V.csv',titleClassName:'dc-artifact-name',meta:'data.table · 403 行 · 4 列',metaClassName:'dc-artifact-meta'}]);
  assert.strictEqual(rows.length,1);assert.strictEqual(list.items().length,1);assert.strictEqual(list.element.parentNode,drawer,'setItems must update the retained reparented list instance.');
  const row=rows[0];assert.strictEqual(row.dataset.artifactId,'a1');assert.strictEqual(row.attributes['aria-label'],'vg=0 V.csv');
  const leading=row.children[0],body=row.children[1],title=body.children[0],meta=body.children[1];
  assert.strictEqual(leading,check);assert(leading.classList.contains('dkds-list-item-leading'));assert.strictEqual(title.textContent,'vg=0 V.csv');assert.strictEqual(meta.textContent,'data.table · 403 行 · 4 列');assert(String(meta.className).includes('dkds-meta'));
  list.setItems([{title:'vg=5 V.csv',meta:'data.table · 403 行 · 4 列'}]);
  assert.strictEqual(list.items().length,1);assert.strictEqual(list.items()[0].children[0].children[0].textContent,'vg=5 V.csv','Atomic refresh must replace the old catalog in the same retained list.');
} finally {
  global.document=oldDocument;global.window=oldWindow;global.DKDSStyleGate=oldStyleGate;
}

console.log('v3.71.105 retained Unit List + Data Center reparent closure PASS');
