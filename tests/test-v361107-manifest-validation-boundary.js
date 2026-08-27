'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const manifestRuntime=read('src/core/plugins/kernel/modules/manifest.js');
const bootstrap=read('src/core/plugins/kernel/modules/bootstrap.js');
const shell=read('src/core/plugins/kernel/modules/activity/shell.js');
const panels=read('src/core/plugins/kernel/modules/pages/panels.js');
const contract=read('src/core/plugins/contract-runtime.js');
assert(manifestRuntime.includes('function pluginTypeOf')&&manifestRuntime.includes('function requirePluginType'),'Kernel must separate non-throwing type consumption from strict manifest validation.');
assert(bootstrap.includes("DEFAULT_PLUGIN_ICONS[pluginTypeOf(manifest)]||'⬡'"),'Icon/workspace presentation must not revalidate a manifest while rendering.');
assert(!bootstrap.includes('pluginTypeForManifest(')&&!shell.includes('pluginTypeForManifest(')&&!panels.includes('pluginTypeForManifest('),'UI/workspace consumers must never invoke strict manifest validation.');
assert(contract.includes('must declare pluginType')&&contract.includes('declares invalid pluginType'),'Plugin contract validation must reject missing/invalid pluginType at ingestion.');

const store=new Map();
const sandbox={console,setTimeout,clearTimeout,queueMicrotask,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},CustomEvent:class{constructor(type,init={}){this.type=type;this.detail=init.detail;}}};
sandbox.window=sandbox;sandbox.globalThis=sandbox;
const page={id:'testWorkbenchPage',dataset:{},classList:{add(){},remove(){},toggle(){}},querySelector:()=>null,querySelectorAll:()=>[]};
const toolbar={querySelectorAll:()=>[],insertBefore(){},appendChild(){}};
sandbox.document={querySelector:selector=>selector==='#pluginToolbarAnalysis'?toolbar:null,querySelectorAll:()=>[],getElementById:id=>id==='testWorkbenchPage'?page:null,createElement:()=>({dataset:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},addEventListener(){},appendChild(){},remove(){},querySelector:()=>null,querySelectorAll:()=>[]}),head:{appendChild(){}}};
sandbox.window.dispatchEvent=()=>{};
vm.runInNewContext(read('src/generated/runtime/plugin-kernel.js'),sandbox,{filename:'plugin-kernel.js'});
const P=sandbox.DKDSPlugins;
let missing='';
try{P.define({id:'test.missing-type',name:'Missing Type',version:'1.0.0',apiVersion:'1.17.0'},async()=>({}));}catch(err){missing=String(err.message||err);}
assert(missing.includes('test.missing-type')&&missing.includes('must declare pluginType'),'Missing pluginType must fail immediately with the real plugin id, never as Plugin (unknown).');
P.define({id:'test.valid-workbench',pluginType:'workbench',name:'Valid Workbench',version:'1.0.0',apiVersion:'1.17.0',enabled:true,workspace:{role:'top',activity:'test-workbench',icon:'T',title:'Valid Workbench'},data:{accepts:['data.table']}},async ctx=>{ctx.ui.pages.add({id:'main',pageId:'testWorkbenchPage',activity:'test-workbench',toolbar:false});ctx.ui.activities.add({id:'test-workbench',label:'Valid Workbench',openMode:'window'});ctx.ui.topWorkspace.register({id:'test-workbench',activity:'test-workbench',layout:{root:{selector:'#root'},left:{selector:'#left'},main:{selector:'#main'}}});return {};});
P.configure({setStatus:()=>{}});
(async()=>{
  await P.activateAll();
  const row=P.manager.get('test.valid-workbench');
  assert(row?.active===true&&row?.pluginType==='workbench'&&row?.topContractReady===true,'A valid workbench must activate through Page + Activity + TOP workspace registration and remain classified after boundary validation.');
  console.log('v3.61.107 manifest validation boundary PASS: strict validation happens at ingestion; runtime UI only consumes validated types.');
})().catch(err=>{console.error(err);process.exit(1);});
