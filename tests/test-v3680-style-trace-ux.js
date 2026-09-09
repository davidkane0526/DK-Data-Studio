'use strict';
const fs=require('fs');
const path=require('path');
const assert=require('assert');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const debug=read('src/core/theme/debug-runtime.js');
const components=read('src/core/ui/component-runtime.js');
const devtools=read('src/core/plugins/devtools.js');
const css=read('src/styles/presentation/plugin-devtools.css');

assert(debug.includes("const VERSION='2.10.0'"),'Theme Debug 2.10 source-copy + recipe-context Trace runtime must be active.');
for(const group of ['Geometry','Paint','Motion'])assert(debug.includes(`${group}:Object.freeze`),`Style Trace must define a ${group} authored property group.`);
for(const group of ['RuntimeInline','RuntimePaint','RuntimePresentation'])assert(debug.includes(`${group}:Object.freeze`),`Style Trace must define a ${group} Gate group.`);
assert(debug.includes("const value=`/${raw.replace(/\\\\/g,'/').replace(/^\\/+/, '')}`"),'Style Trace source classification must normalize the shortened CSS source path before mapping owner modules.');
assert(debug.includes('ruleContextActive(rule)')&&debug.includes('matchMedia(rule.media.mediaText).matches'),'Style Trace must ignore inactive media-query declarations when resolving runtime ownership.');
assert(debug.includes('globalThis.DKDSComponents?.lifecycleOf?.(target,{ancestors:true})'),'Style Trace must resolve interaction/lifecycle ownership from Core Component Runtime.');
assert(debug.includes('identityOwner')&&debug.includes('motionRoleOwner'),'Style Trace must expose semantic and Motion role provenance.');
assert(debug.includes('const trace=traceOwnership(node,properties,{configuration:false})'),'Bulk ownership audit must trace each element once and skip expensive token provenance.');
assert(!/for\(const node of nodes\)for\(const property of properties\)\{const row=traceStyleOwner/.test(debug),'Bulk ownership audit must not rescan every stylesheet once per property.');
assert(debug.includes('currentTrace:()=>lastTrace'),'Theme Debug must expose the pinned Style Trace to DevTools.');
assert(components.includes('function lifecycleOf(target,{ancestors=true}={})'),'Component Runtime must expose lifecycle ownership lookup.');
assert(devtools.includes("metric('Style Trace'"),'Plugin DevTools Theme page must summarize the currently pinned Style Trace.');
assert(devtools.includes('Runtime inline / paint / presentation'),'Theme DevTools guidance must separate authored and runtime ownership classes.');
assert(debug.includes('runtimeGateGroups')&&debug.includes('row.sources')&&debug.includes('ownerSources'),'Pinned Style Trace must keep runtime ownership grouped and expose owner -> source provenance.');
assert(devtools.includes('gateDiagnostics(gate)')&&devtools.includes('caller unavailable'),'DevTools must surface reliable Gate event provenance without inventing caller locations.');
assert(devtools.includes('selectedTraceDiagnostics(trace)')&&devtools.includes('Owner → source'),'DevTools Theme page must expose the pinned owner -> source -> context -> state chain.');
assert(debug.includes('data-theme-debug-filter')&&debug.includes("['all','conflict','unowned','unauthorized']"),'Pinned Style Trace must expose selected-element Conflict / Unowned / Unauthorized filters.');
assert(debug.includes('StyleSemantics.expectedFor')&&debug.includes('StyleGate.elementKeyFor'),'Selected-element diagnostics must join semantic expectations with element-scoped runtime Gate events.');
assert(debug.includes('diagnosticSources')&&debug.includes('copyDiagnosticSource')&&debug.includes('data-theme-debug-copy-source'),'Theme Inspector must expose copyable source provenance without a new runtime style writer.');
assert(devtools.includes('style-source-copy')&&devtools.includes('data-style-source'),'Plugin DevTools must expose a direct source-copy affordance for selected Style Trace diagnostics.');
for(const cls of ['.dkds-theme-style-trace','.dkds-theme-trace-group','.dkds-theme-trace-props'])assert(css.includes(cls),`Theme Inspector presentation is missing ${cls}.`);


// Runtime evidence: execute the real Theme Debug + Style Gate runtimes against
// a tiny CSSOM/DOM harness. One canonical stylesheet must resolve a grouped
// toolbar action as singly owned; adding a second matching stylesheet must
// produce a selected-element conflict. The filter control must also update the
// live trace filter through the real overlay click handler.
{
  class Decl{
    constructor(values={}){this.values={...values};}
    getPropertyValue(name){return String(this.values[name]||'');}
    getPropertyPriority(){return '';}
  }
  class FakeStyle extends Decl{
    constructor(values={}){super(values);this.order=Object.keys(values);}
    setProperty(k,v){this.values[String(k)]=String(v);if(!this.order.includes(String(k)))this.order.push(String(k));}
    removeProperty(k){delete this.values[String(k)];this.order=this.order.filter(x=>x!==String(k));}
    get length(){return this.order.length;}
    item(i){return this.order[i]||'';}
    get cssText(){return this.order.map(k=>`${k}:${this.values[k]}`).join(';');}
    set cssText(_){this.values={};this.order=[];}
  }
  class FakeElement{
    constructor(tag='div',identity=''){this.nodeType=1;this.tagName=tag.toUpperCase();this.dataset={};if(identity)this.dataset.dkdsComponentIdentity=identity;this.id='';this.className='';this.style=new FakeStyle();this.parentElement=null;this.children=[];this.listeners={};this.hidden=false;this.offsetWidth=280;this.offsetHeight=180;this.isConnected=true;this.classList={contains:()=>false,add(){},remove(){}};}
    matches(selector){const s=String(selector||'');if(s.includes(':hover')||s.includes(':focus')||s.includes(':disabled')||s.includes('[aria-disabled')||s.includes('.disabled')||s.includes('[aria-pressed')||s.includes('.active')||s.includes('.selected')||s.includes('[aria-selected')||s.includes('[aria-checked'))return false;const identities=[...s.matchAll(/data-dkds-component-identity=\"([^\"]+)\"/g)].map(row=>row[1]);if(identities.length&&!identities.includes(this.dataset.dkdsComponentIdentity||''))return false;if(s.includes('data-dkds-material-recipe=')){const recipe=this.closest('[data-dkds-material-recipe]')?.dataset?.dkdsMaterialRecipe||'';const recipes=[...s.matchAll(/data-dkds-material-recipe=\"([^\"]+)\"/g)].map(row=>row[1]);if(recipes.length&&!recipes.includes(recipe))return false;}return identities.length>0;}
    closest(selector){const s=String(selector||'');if(s.includes('dkds-segmented-command-group'))return this.parentElement?.className==='dkds-segmented-command-group'?this.parentElement:null;if(s.includes('data-dkds-material-recipe')){let node=this;while(node){if(node.dataset?.dkdsMaterialRecipe)return node;node=node.parentElement;}return null;}return null;}
    getAttribute(name){if(name==='style')return this.style.cssText;return '';}
    setAttribute(name,value){if(name==='id')this.id=String(value);}
    querySelectorAll(){return [];}
    addEventListener(type,fn){this.listeners[type]=fn;}
    removeEventListener(type){delete this.listeners[type];}
    appendChild(child){child.parentElement=this;this.children.push(child);return child;}
    remove(){this.isConnected=false;}
    getBoundingClientRect(){return {left:0,top:0,right:280,bottom:180,width:280,height:180};}
  }
  const canonicalRule={selectorText:'body.dkds-modern-ui [data-dkds-component-identity="toolbarAction"]',style:new Decl({background:'transparent',color:'black',border:'1px solid transparent','border-radius':'7px','box-shadow':'none'})};
  const canonicalSheet={href:'file:///app/src/styles/theme/component-appearance.css',cssRules:[canonicalRule]};
  const glassHeaderRule={selectorText:'body.dkds-modern-ui :where([data-dkds-material-recipe="thin-glass"],[data-dkds-material-recipe="soft-glass"],[data-dkds-material-recipe="liquid-glass"]) > :where([data-dkds-component-identity="panelHeader"],[data-dkds-component-identity="inspectorHeader"])',style:new Decl({'backdrop-filter':'none','-webkit-backdrop-filter':'none'})};
  const materialSheet={href:'file:///app/src/styles/theme/material-renderer.css',cssRules:[glassHeaderRule]};
  const body=new FakeElement('body'),group=new FakeElement('div');group.className='dkds-segmented-command-group';body.appendChild(group);const target=new FakeElement('button','toolbarAction');group.appendChild(target);const glass=new FakeElement('section');glass.dataset.dkdsMaterialRecipe='thin-glass';body.appendChild(glass);const header=new FakeElement('header','panelHeader');glass.appendChild(header);
  const created=[];
  const document={documentElement:new FakeElement('html'),body,styleSheets:[canonicalSheet,materialSheet],createElement(tag){const el=new FakeElement(tag);created.push(el);return el;},addEventListener(){},removeEventListener(){},querySelectorAll(){return [];}};
  document.documentElement.dataset.dkdsHost='desktop';
  const copied=[];
  const context={console,Date,Map,Set,WeakMap,Object,String,Number,Array,Math,URL,document,location:{href:'file:///app/src/index.html'},innerWidth:1200,innerHeight:800,sessionStorage:{getItem(){return null;},setItem(){}},requestAnimationFrame(fn){fn();return 1;},getComputedStyle(el){const values=el===target?{background:'transparent',color:'black','border-top':'1px solid transparent','border-right':'1px solid transparent','border-bottom':'1px solid transparent','border-left':'1px solid transparent','border-top-left-radius':'7px','border-top-right-radius':'7px','border-bottom-right-radius':'7px','border-bottom-left-radius':'7px','box-shadow':'none'}:el===header?{'backdrop-filter':'none','-webkit-backdrop-filter':'none'}:{};const decl=new Decl(values);return Object.assign(decl,{backgroundColor:'transparent',color:'black',borderColor:'transparent',backdropFilter:'none',webkitBackdropFilter:'none'});},addEventListener(){},removeEventListener(){}};
  context.DKDSIO={clipboard:{writeText(text){copied.push(String(text));return true;}}};
  context.globalThis=context;context.window=context;
  context.DKDSDOMMutationHub={subscribe(){return()=>{};}};
  context.DKDSSemanticUI={componentContextOf(el){return el===target?'grouped':'';},nearestMaterialContext(){return '';},nearestMaterialRole(){return '';},resolveComponent(el){return {id:el?.dataset?.dkdsComponentIdentity||'',target:el};},expectedRole(){return '';}};
  context.DKDSThemeComponentAppearance={inspect(el){const id=el?.dataset?.dkdsComponentIdentity||'';return {componentIdentity:id,component:id,managed:!!id,status:id?'MANAGED':'UNMANAGED_COMPONENT_APPEARANCE',resolved:{},variant:'',expectedRole:''};},variantOf(){return '';},authoredUsage(){return [];}};
  context.DKDSComponents={lifecycleOf(){return [];}};context.DKDSTheme={preview(){return {id:'fixture'};},profile(){return 'fixture';},recipePolicy(){return {};},contractVersion:'fixture'};
  vm.runInNewContext(read('src/core/contracts/style-ownership-semantics.js'),context,{filename:'style-ownership-semantics.js'});
  vm.runInNewContext(read('src/core/theme/style-ownership-gate-runtime.js'),context,{filename:'style-ownership-gate-runtime.js'});
  vm.runInNewContext(debug,context,{filename:'debug-runtime.js'});
  const first=context.DKDSThemeDebug.traceElementOwnership(target);
  assert.strictEqual(first.gateContext,'component=grouped');
  assert.strictEqual(first.diagnostics.unowned,0,'Canonical grouped toolbar action must not become falsely UNOWNED after adding context to the Gate key.');
  assert.strictEqual(first.diagnostics.conflicts,0,'Single canonical stylesheet must remain singly owned.');
  const glassTrace=context.DKDSThemeDebug.traceElementOwnership(header);
  assert.strictEqual(glassTrace.gateContext,'recipe=thin-glass','Runtime semantic context must resolve the real glass recipe ancestor.');
  const backdropRow=glassTrace.expectedRows.find(row=>row.slot==='backdrop-filter'&&row.context==='recipe=thin-glass');
  assert(backdropRow&&backdropRow.status==='SINGLE_OWNER'&&backdropRow.expectedOwner==='src/styles/theme/material-renderer.css','Runtime CSSOM must resolve nested glass header backdrop ownership to Material Renderer.');
  assert(backdropRow.sources.includes('src/styles/theme/material-renderer.css'),'Runtime CSSOM provenance must preserve the repository-relative Material Renderer source path.');
  const duplicateSheet={href:'file:///app/plugins/fake/plugin.css',cssRules:[{selectorText:canonicalRule.selectorText,style:new Decl({background:'red'})}]};document.styleSheets.push(duplicateSheet);
  const second=context.DKDSThemeDebug.traceElementOwnership(target);
  assert(second.diagnostics.conflicts>=1,'A second live stylesheet matching the selected element must become a Style Trace conflict.');
  context.DKDSThemeDebug.enable();
  const overlay=created.find(el=>el.id==='dkdsThemeDebugOverlay')||created[0];
  assert(overlay?.listeners?.click,'Theme Debug overlay must install a live diagnostic-filter click handler.');
  overlay.listeners.click({target:{closest(selector){return String(selector).includes('data-theme-debug-filter')?{dataset:{themeDebugFilter:'conflict'}}:null;}},preventDefault(){},stopPropagation(){}});
  assert.strictEqual(context.DKDSThemeDebug.traceFilter(),'conflict','Selected-element diagnostic filter must update through the runtime click path.');
  overlay.listeners.click({target:{closest(selector){return String(selector).includes('data-theme-debug-copy-source')?{dataset:{themeDebugCopySource:'src/styles/theme/material-renderer.css'}}:null;}},preventDefault(){},stopPropagation(){}});
  assert(copied.includes('src/styles/theme/material-renderer.css'),'Theme Inspector source-copy action must use the shared clipboard service with the real source identity.');
  context.DKDSThemeDebug.disable();
}

console.log('v3.68.0 Style Trace owner UX regression passed.');
