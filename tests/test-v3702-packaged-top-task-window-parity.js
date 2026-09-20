'use strict';
const assert=require('assert');
const fs=require('fs');
const os=require('os');
const path=require('path');
const vm=require('vm');
const cp=require('child_process');
const {normalizePluginPackage}=require('../desktop/plugin-package');
const {normalizeExternalPluginWindow}=require('../desktop/plugin-window-manager');

const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const fixtureDir=path.join(root,'tests','fixtures','external-top-task-plugin');
const fixtureId='com.dkds.fixture.top-task';
const activityId='fixture-top-task';

class ClassList{
  constructor(){this.values=new Set();}
  add(...rows){for(const row of rows)if(row)this.values.add(String(row));}
  remove(...rows){for(const row of rows)this.values.delete(String(row));}
  toggle(row,force){row=String(row);const next=force===undefined?!this.values.has(row):!!force;if(next)this.values.add(row);else this.values.delete(row);return next;}
  contains(row){return this.values.has(String(row));}
}
class Element{
  constructor(tag='div',register=null){this.tagName=String(tag).toUpperCase();this.dataset={};this.classList=new ClassList();this.children=[];this.parentNode=null;this.style={};this.attributes={};this.textContent='';this.innerHTML='';this._id='';this._register=register;}
  get id(){return this._id;}
  set id(value){this._id=String(value||'');if(this._id)this._register?.(this);}
  set className(value){this._className=String(value||'');this.classList=new ClassList();for(const row of this._className.split(/\s+/).filter(Boolean))this.classList.add(row);}
  get className(){return this._className||'';}
  appendChild(child){child.parentNode=this;this.children.push(child);if(child.id)this._register?.(child);return child;}
  insertBefore(child,before){child.parentNode=this;const index=this.children.indexOf(before);if(index<0)this.children.push(child);else this.children.splice(index,0,child);if(child.id)this._register?.(child);return child;}
  replaceChildren(...children){for(const child of this.children)child.parentNode=null;this.children=[];for(const child of children)this.appendChild(child);}
  remove(){if(this.parentNode){const i=this.parentNode.children.indexOf(this);if(i>=0)this.parentNode.children.splice(i,1);}this.parentNode=null;}
  querySelector(){return null;}
  querySelectorAll(){return [];}
  setAttribute(name,value){this.attributes[String(name)]=String(value);}
  getAttribute(name){return this.attributes[String(name)]??null;}
  addEventListener(){}
}

function createRuntimeHarness({externalPackage=null,auxiliary=false}={}){
  const blobSources=new Map(),revoked=new Set();let blobSeq=0;
  class HarnessBlob{constructor(parts=[]){this.source=parts.map(part=>String(part??'')).join('');}}
  class HarnessURL extends URL{
    static createObjectURL(blob){const id=`blob:dkds-test-${++blobSeq}`;blobSources.set(id,String(blob?.source||''));return id;}
    static revokeObjectURL(id){revoked.add(String(id));blobSources.delete(String(id));}
  }
  let context=null;
  class HarnessWorker{
    static instances=[];
    constructor(url){this.url=String(url);this.terminated=false;this.timer=null;HarnessWorker.instances.push(this);}
    postMessage(msg){
      if(this.terminated)return;
      if(msg?.type==='cancel')return;
      const delay=Math.max(0,Number(msg?.input?.__delayMs)||0);
      const run=()=>{
        if(this.terminated)return;
        const source=blobSources.get(this.url);if(typeof source!=='string'){this.onerror?.({message:`Missing worker blob: ${this.url}`});return;}
        const workerSelf={};
        const workerContext={console,Promise,Object,Array,Map,Set,Number,String,Boolean,Math,Date,JSON,Error,TypeError,setTimeout,clearTimeout};
        workerContext.self=workerSelf;workerContext.globalThis=workerContext;
        workerSelf.postMessage=data=>{if(!this.terminated)this.onmessage?.({data});};
        vm.createContext(workerContext);
        try{
          vm.runInContext(source,workerContext,{filename:'fixture-worker.js'});
          Promise.resolve(workerSelf.onmessage?.({data:msg})).catch(err=>{if(!this.terminated)this.onerror?.({message:err?.message||String(err)});});
        }catch(err){if(!this.terminated)this.onerror?.({message:err?.message||String(err)});}
      };
      if(delay)this.timer=setTimeout(run,delay);else queueMicrotask(run);
    }
    terminate(){this.terminated=true;if(this.timer)clearTimeout(this.timer);this.timer=null;}
  }

  const elements=new Map();
  const register=el=>{if(el?.id)elements.set(el.id,el);};
  const app=new Element('div',register);app.id='app';
  const toolbar=new Element('div',register);toolbar.id='pluginToolbarAnalysis';
  const head=new Element('head',register);
  const document={
    baseURI:'file:///app/src/index.html',currentScript:null,documentElement:{dataset:{dkdsHost:'desktop'}},head,
    createElement:tag=>new Element(tag,register),getElementById:id=>elements.get(String(id))||null,
    querySelector:selector=>selector==='#app'?app:selector==='#pluginToolbarAnalysis'?toolbar:null,querySelectorAll:()=>[]
  };
  const storage=new Map();
  const sandbox={
    console,setTimeout,clearTimeout,queueMicrotask,structuredClone:global.structuredClone,performance:{now:()=>Date.now()},navigator:{hardwareConcurrency:8,deviceMemory:8},
    URL:HarnessURL,Blob:HarnessBlob,Worker:HarnessWorker,document,
    localStorage:{getItem:key=>storage.has(key)?storage.get(key):null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)},
    CustomEvent:class CustomEvent{constructor(type,init={}){this.type=type;this.detail=init.detail;}},
    electronAPI:{isWebClient:false,pluginExternalList:async()=>({packages:externalPackage?[externalPackage]:[],errors:[]}),pluginUninstall:async()=>({ok:true})}
  };
  sandbox.window=sandbox;sandbox.globalThis=sandbox;sandbox.dispatchEvent=()=>{};sandbox.window.dispatchEvent=()=>{};
  context=sandbox;vm.createContext(context);
  head.appendChild=script=>{
    script.parentNode=head;head.children.push(script);const previous=document.currentScript;document.currentScript=script;
    try{if(String(script.tagName).toLowerCase()==='script'&&script.textContent)vm.runInContext(String(script.textContent),context,{filename:String(script.dataset?.dkdsExternalPlugin||script.dataset?.dkdsExternalWindow||'inline-plugin.js')});}
    finally{document.currentScript=previous;}
    return script;
  };
  const openAnalysisPage=id=>{const page=elements.get(String(id));if(page)page.classList.remove('hidden');return !!page;};
  vm.runInContext(read('sdk/platform-presentation-contract.js'),context,{filename:'platform-presentation-contract.js'});
  vm.runInContext(read('src/core/plugins/contract-runtime.js'),context,{filename:'plugin-contract-runtime.js'});
  vm.runInContext(read('src/core/execution/task-runtime.js'),context,{filename:'task-runtime.js'});
  vm.runInContext(read('src/generated/runtime/plugin-kernel.js'),context,{filename:'plugin-kernel.js'});
  context.DKDSPlugins.configure({appVersion:'3.70.2',isAuxiliaryWindow:auxiliary,isWebClient:false,getActiveProjectTab:()=>({pluginState:{}}),captureActiveProjectTab:()=>{},openAnalysisPage,setStatus:()=>{}});
  return {context,P:context.DKDSPlugins,blobSources,revoked,workers:HarnessWorker.instances,openAnalysisPage,document};
}

async function expectAbort(promise,label){
  let error=null;try{await promise;}catch(err){error=err;}
  assert(error&&error.name==='AbortError',`${label} must reject with AbortError.`);
}

(async()=>{
  // Real external package fixture: validate and package through the public SDK CLI.
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-top-task-parity-'));
  let pkg;
  try{
    const cli=path.join(root,'sdk','tools','dkds-plugin.js'),out=path.join(temp,'top-task.dkplugin');
    cp.execFileSync(process.execPath,[cli,'validate',fixtureDir],{stdio:'pipe'});
    cp.execFileSync(process.execPath,[cli,'package',fixtureDir,out],{stdio:'pipe'});
    pkg=normalizePluginPackage(JSON.parse(fs.readFileSync(out,'utf8')),{allowBuiltinId:false});
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
  assert.equal(pkg.manifest.workspace?.role,'top','Fixture must remain a real TOP package.');
  assert(pkg.manifest.requiresCore.includes('execution.tasks'),'Fixture must require Core Task Runner.');
  assert.deepStrictEqual(pkg.manifest.tasks,[{id:'fixture-task',entry:'task-entry.js',imports:['task-import.js']}]);
  assert.equal(typeof pkg.files['task-entry.js'],'string');assert.equal(typeof pkg.files['task-import.js'],'string');

  const windowSpec=normalizeExternalPluginWindow(pkg);
  assert.equal(windowSpec?.source,'external','Packaged TOP must resolve a dedicated Electron window spec.');
  assert.equal(windowSpec?.packageManifest?.id,fixtureId,'Dedicated window must carry canonical package manifest.');
  assert.equal(typeof windowSpec?.packageFiles?.['task-entry.js'],'string','Dedicated window must carry task entry bytes.');
  assert.equal(typeof windowSpec?.packageFiles?.['task-import.js'],'string','Dedicated window must carry task import bytes.');

  // Owner renderer: load the real package through the ordinary external-package path.
  const owner=createRuntimeHarness({externalPackage:pkg,auxiliary:false});
  await owner.P.loadExternalEntries();
  assert(owner.P.manager.get(fixtureId),'Owner renderer must load the external package definition.');
  await owner.P.manager.enable(fixtureId);
  assert(owner.P.manager.get(fixtureId)?.active===true,'Owner renderer must activate the TOP+Task package.');
  const ownerTasks=owner.context.__DKDS_TOP_TASK_FIXTURE__?.tasks;
  assert(ownerTasks,'Owner activation must receive ctx.tasks.');
  const ownerResult=await ownerTasks.submit('fixture-task',{value:5},{key:'result'}).promise;
  assert.deepStrictEqual(JSON.parse(JSON.stringify(ownerResult)),{value:12,imported:true,generation:1},'Owner task must execute with its declared import source available.');

  // Cancellation/latest-wins remain Core-owned after materialization.
  const stale=ownerTasks.submit('fixture-task',{value:1,__delayMs:60},{key:'latest'});stale.promise.catch(()=>{});
  const latest=ownerTasks.submit('fixture-task',{value:2},{key:'latest'});
  await expectAbort(stale.promise,'Superseded task');
  const latestResult=await latest.promise;assert.equal(latestResult.value,9,'Latest generation must execute after cancelling the stale generation.');
  const cancelled=ownerTasks.submit('fixture-task',{value:3,__delayMs:60},{key:'cancel'});cancelled.promise.catch(()=>{});cancelled.cancel('fixture-cancel');
  await expectAbort(cancelled.promise,'Explicitly cancelled task');

  // Reload and uninstall must revoke task Blob URLs through the normal plugin cleanup path.
  const firstUrls=[...owner.blobSources.keys()];assert(firstUrls.length>=1,'Initial owner activation must materialize a task Blob URL.');
  await owner.P.manager.reload(fixtureId);
  for(const url of firstUrls)assert(owner.revoked.has(url),`Reload must revoke previous task Blob URL: ${url}`);
  const reloadedUrls=[...owner.blobSources.keys()];assert(reloadedUrls.length>=1,'Reload must create a fresh task Blob URL.');
  await owner.P.external.uninstall(fixtureId);
  for(const url of reloadedUrls)assert(owner.revoked.has(url),`Uninstall must revoke active task Blob URL: ${url}`);
  assert.equal(owner.P.manager.get(fixtureId),null,'Uninstall must remove the external package definition.');

  // Dedicated renderer: reproduce plugin-window packaged activation order.
  const dedicated=createRuntimeHarness({auxiliary:true});
  for(const file of windowSpec.packageScripts||[windowSpec.entry]){
    const script=dedicated.document.createElement('script');script.dataset.dkdsExternalWindow=`${fixtureId}/${file}`;script.textContent=pkg.files[file];dedicated.document.head.appendChild(script);script.remove();
  }
  dedicated.P.packageRuntime.applyPackage(fixtureId,windowSpec.packageManifest,'external',windowSpec.packageFiles);
  await dedicated.P.activateAll();
  assert(dedicated.P.manager.get(fixtureId)?.active===true,'Dedicated Electron renderer must activate the packaged TOP+Task definition.');
  assert(dedicated.P.activities.list().some(row=>row.id===activityId&&row.pluginId===fixtureId),'Dedicated renderer must retain the TOP activity.');
  assert(dedicated.P.workspace.top().some(row=>row.activity===activityId&&row.pluginId===fixtureId),'Dedicated renderer must retain the TOP workspace contract.');
  assert.equal(await dedicated.P.activities.set(activityId,{forceEmbedded:true}),true,'Dedicated renderer must open the fixture activity after activation.');
  const dedicatedTasks=dedicated.context.__DKDS_TOP_TASK_FIXTURE__?.tasks;assert(dedicatedTasks,'Dedicated activation must receive ctx.tasks.');
  const dedicatedResult=await dedicatedTasks.submit('fixture-task',{value:8},{key:'dedicated'}).promise;
  assert.deepStrictEqual(JSON.parse(JSON.stringify(dedicatedResult)),{value:15,imported:true,generation:1},'Dedicated task must execute with its import bytes materialized before activateAll().');

  const packageRuntime=read('src/core/plugins/kernel/modules/package-runtime.js');
  const pluginWindowRuntime=read('src/plugin-window/runtime.js');
  assert(packageRuntime.includes('function materializeTaskSources(manifest={},files={})'),'Core must own one canonical task-source materializer.');
  assert(packageRuntime.includes("function applyPackage(id,manifest={},source='external',files={},options={})"),'Core must own one packaged-definition apply operation with task Core source options.');
  assert(!packageRuntime.includes('applyManifest:(id,manifest,source)=>'),'Old manifest-only dedicated path must not remain.');
  assert(packageRuntime.includes('definition.taskSources=materializeTaskSources(definition.manifest,files)'),'Canonical package apply must materialize task entry/import bytes before Plugin API creation.');
  assert(packageRuntime.includes("definition=applyPackage(id,row.manifest,String(row?.source||'builtin'),row?.taskSources||{},{taskCoreSources:row?.taskCoreSources||{}})"),'Built-in rows must use the same canonical package apply path, including generated Core task preludes.');
  const targetApply=pluginWindowRuntime.indexOf('applyRuntimePackage(spec);');
  const targetActivate=pluginWindowRuntime.indexOf("measure('plugins-activate'");
  assert(targetApply>=0&&targetActivate>targetApply,'Dedicated target must apply manifest + task sources before activateAll().');
  assert(pluginWindowRuntime.includes("const files=(source==='external'||source==='override')?(row?.packageFiles||{}):(row?.taskSources||{});"),'Dedicated package materialization must route packaged bytes for external/override and trusted task bytes for built-ins.');
  assert(pluginWindowRuntime.includes("{taskCoreSources:row?.taskCoreSources||{}}"),'Dedicated package materialization must preserve built-in Core task preludes.');

  console.log('v3.70.2 packaged TOP+Task owner/dedicated parity PASS');
})().catch(err=>{console.error(err);process.exit(1);});
