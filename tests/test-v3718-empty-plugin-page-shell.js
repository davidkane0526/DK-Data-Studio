'use strict';
const assert=require('assert');
const path=require('path');
const root=path.resolve(__dirname,'..');
const abs=rel=>path.join(root,rel);
function stub(rel,exports){const id=require.resolve(abs(rel));require.cache[id]={id,filename:id,loaded:true,exports};}

class Element{
  constructor(tag='div'){this.tagName=String(tag).toUpperCase();this.id='';this.dataset={};this.className='';this.innerHTML='';this.children=[];this.parentNode=null;this.classList={add(){},remove(){},toggle(){},contains(){return false;}};}
  appendChild(node){node.parentNode=this;this.children.push(node);return node;}
  remove(){if(!this.parentNode)return;this.parentNode.children=this.parentNode.children.filter(x=>x!==this);this.parentNode=null;}
  querySelector(){return null;}
  querySelectorAll(){return [];}
  setAttribute(){}
  addEventListener(){}
}
const app=new Element('main');app.id='app';
const byId=new Map([['app',app]]);
const document={
  head:new Element('head'),
  createElement:tag=>new Element(tag),
  getElementById:id=>byId.get(String(id))||null,
  querySelector:sel=>sel==='#app'?app:null
};
global.document=document;

const state={host:{isAuxiliaryWindow:false},superPluginId:null};
stub('src/core/plugins/kernel/modules/context.js',{state});
stub('src/core/plugins/kernel/modules/bootstrap.js',{
  definitionById:()=>({manifest:{id:'builtin.ter-analysis',pluginType:'workbench',name:'TER Analysis',workspace:{role:'top',title:'TER 分析'}}}),
  defaultPluginIcon:()=>'',workspaceMeta:m=>m.workspace||{},isTopDefinition:()=>false
});
stub('src/core/plugins/kernel/modules/registry.js',{addCleanup:()=>()=>{}});
stub('src/core/plugins/kernel/modules/activity/shell.js',{refreshActivityVisibility:()=>{}});
stub('src/core/plugins/kernel/modules/contributions/ui.js',{registerActivity:()=>{}});
stub('src/core/plugins/kernel/modules/commands/toolbar.js',{createToolbarButton:()=>null,registerCommand:()=>{},runCommand:()=>{},registerContribution:()=>{}});
stub('src/core/plugins/kernel/modules/manifest.js',{pluginTypeOf:m=>m?.pluginType||''});
stub('src/core/plugins/kernel/modules/host-facade.js',{pluginHostView:()=>({})});

const {addPage}=require(abs('src/core/plugins/kernel/modules/pages/panels.js'));
const page=addPage('builtin.ter-analysis',{id:'ter-max',pageId:'terMaxPage',activity:'ter',toolbar:false,html:''});
byId.set(page.id,page);
assert.strictEqual(page.id,'terMaxPage','An explicit empty-html page registration must create the requested page shell.');
assert.strictEqual(page.innerHTML,'','The empty page shell must stay genuinely empty for Unit composition; Core must not inject fake placeholder markup.');
assert.strictEqual(app.children.includes(page),true,'The created empty page shell must mount under #app.');

let missing='';
try{addPage('builtin.ter-analysis',{id:'missing',pageId:'missingPage',activity:'ter',toolbar:false});}catch(err){missing=String(err?.message||err);}
assert(missing.includes('Plugin page not found: missingPage'),'Omitting html entirely must preserve the existing contract: Core only adopts an already-existing page.');

console.log('v3.71.8 empty plugin page shell PASS: explicit html:"" creates a real page for Unit-only composition while omitted html still requires an existing page.');
