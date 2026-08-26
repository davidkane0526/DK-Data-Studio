const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const source=fs.readFileSync(path.join(__dirname,'..','src','core','host','mobile-host-runtime.js'),'utf8');
const listeners={window:new Map(),document:new Map()};
const posted=[];
const activated=[];
const invoked=[];
const actionInvoked=[];
let active='resonance';

const pages=[
  {id:'resonanceDedicatedPage',classList:{contains:name=>name==='hidden'?active!=='resonance':false}},
  {id:'terMaxPage',classList:{contains:name=>name==='hidden'?active!=='ter':false}},
  {id:'pulseAnalysisPage',classList:{contains:name=>name==='hidden'?active!=='pulse':false}},
  {id:'builtin-data-center-data-center-page',classList:{contains:name=>name==='hidden'?active!=='data-center':false}}
];
const activities=[
  {id:'resonance',pluginId:'builtin.resonance',label:'共振分析',role:'top',isSuper:true},
  {id:'ter',pluginId:'builtin.ter',label:'TER 分析',role:'top'},
  {id:'pulse',pluginId:'builtin.pulse',label:'脉冲分析',role:'top'},
  {id:'data-center',pluginId:'builtin.data-center',label:'数据中心',role:'top',navigation:'system'}
];
const contracts=activities.map(row=>({
  pluginId:row.pluginId,activity:row.id,icon:'◇',
  layout:{primary:{id:'main'},prime:row.id==='resonance'?[{id:'curve-inspector'},{id:'group-analysis'}]:[],sub:row.id==='resonance'?[{id:'physics'},{id:'spacing'},{id:'gate-analysis'}]:[]}
}));
const bodyClasses=new Set();
const body={
  dataset:{},
  classList:{contains:name=>bodyClasses.has(name),add:name=>bodyClasses.add(name),remove:name=>bodyClasses.delete(name),toggle:(name,on)=>on?bodyClasses.add(name):bodyClasses.delete(name)}
};
const add=(owner,type,fn)=>{if(!listeners[owner].has(type))listeners[owner].set(type,[]);listeners[owner].get(type).push(fn);};
const document={
  body,activeElement:null,
  addEventListener:(type,fn)=>add('document',type,fn),
  querySelector:selector=>{
    if(selector==='.project-tab.active')return {classList:{contains:()=>false}};
    if(selector==='.project-tab.active .project-tab-title')return {textContent:'移动验收项目'};
    if(selector==='#statusBarMessage')return {textContent:'就绪'};
    if(selector==='#activityContextTitle')return {textContent:activities.find(row=>row.id===active)?.label};
    return null;
  },
  querySelectorAll:selector=>selector==='.analysis-page'?pages:[]
};
const window={
  ReactNativeWebView:{postMessage:value=>posted.push(JSON.parse(value))},
  addEventListener:(type,fn)=>add('window',type,fn),
  dispatchEvent:()=>true,
  DKDSTheme:{current:()=> 'light'},
  DKDSPlugins:{
    activities:{list:()=>activities,active:()=>active,activateEmbedded:async id=>{assert(activities.some(row=>row.id===id));active=id;activated.push(id);return true;}},
    workspace:{top:()=>contracts},
    events:{on:()=>{}}
  },
  DKDSUI:{workspaces:{
    actions:id=>id==='resonance'?[{id:'workspace-primary:main',label:'主界面',active:true},{id:'workspace-sub:physics',label:'物理分析',active:false}]:[{id:'workspace-primary:main',label:'主界面',active:true}],
    invoke:(activity,id)=>{invoked.push({activity,id});return true;}
  },actions:{
    list:id=>id==='ter'?[{id:'calculate',label:'计算 TER',enabled:true,items:[]}]:[],
    invoke:(activity,id,itemId)=>{actionInvoked.push({activity,id,itemId});return true;}
  }}
};
const context={window,document,location:{search:''},URLSearchParams,console,setTimeout,clearTimeout,requestAnimationFrame:fn=>{fn();return 1;},getComputedStyle:node=>({display:node.classList.contains('hidden')?'none':'block'}),Event:class{constructor(type){this.type=type;}},CustomEvent:class{},KeyboardEvent:class{}};
vm.runInNewContext(source,context,{filename:'mobile-host-runtime.js'});

async function request(id,method,payload={}){
  const event={data:JSON.stringify({channel:'dkds.mobile-host.v1',kind:'request',id,method,payload})};
  for(const fn of listeners.document.get('message')||[])await fn(event);
  await new Promise(resolve=>setTimeout(resolve,1));
  return posted.find(row=>row.kind==='response'&&row.id===id);
}

async function hostEvent(eventName,payload={}){
  const event={data:JSON.stringify({channel:'dkds.mobile-host.v1',kind:'event',event:eventName,payload})};
  for(const fn of listeners.document.get('message')||[])await fn(event);
  await new Promise(resolve=>setTimeout(resolve,1));
}

(async()=>{
  const beforeResumeReady=posted.filter(row=>row.kind==='event'&&row.event==='ready').length;
  await hostEvent('lifecycle',{state:'active'});
  const resumeReady=posted.filter(row=>row.kind==='event'&&row.event==='ready');
  assert(resumeReady.length>beforeResumeReady&&resumeReady.at(-1)?.payload?.resumed===true,'active lifecycle must re-establish the Core ready handshake without an acknowledged command');

  const bootstrap=await request('r1','bootstrap');
  assert.strictEqual(bootstrap.ok,true);
  assert.deepStrictEqual(Array.from(bootstrap.value.workspaces,row=>row.activityId),['resonance','ter','pulse','data-center']);
  assert.strictEqual(bootstrap.value.workspaces.find(row=>row.activityId==='data-center').system,true);
  assert(bootstrap.value.surfaces.some(row=>row.id==='workspace-sub:physics'));

  const ter=await request('r2','navigate',{activityId:'ter'});
  assert.strictEqual(ter.ok,true);
  assert.deepStrictEqual(activated,['ter']);
  assert.strictEqual(active,'ter');
  assert.strictEqual(ter.value.pageId,'terMaxPage');
  const terState=await request('r2-state','snapshot');
  assert(terState.value.actions.some(row=>row.id==='calculate'&&row.label==='计算 TER'));
  const calculate=await request('r2-action','action',{activityId:'ter',id:'calculate'});
  assert.strictEqual(calculate.ok,true);
  assert.deepStrictEqual(actionInvoked.at(-1),{activity:'ter',id:'calculate',itemId:''});

  const data=await request('r3','navigate',{activityId:'data-center'});
  assert.strictEqual(data.ok,true);
  assert.strictEqual(data.value.kind,'system');

  await request('r4','navigate',{activityId:'resonance'});
  const sub=await request('r5','surface',{activityId:'resonance',id:'workspace-sub:physics'});
  assert.strictEqual(sub.ok,true);
  assert.deepStrictEqual(invoked.at(-1),{activity:'resonance',id:'workspace-sub:physics'});

  const back=await request('r6','back');
  assert.strictEqual(back.value.handled,true);
  assert(invoked.some(row=>row.id==='workspace-primary:main'));
  console.log('Mobile Host runtime passed: resume handshake, TOP routes, TER actions, PluginWorkspace surfaces and Core back stack.');
})().catch(error=>{console.error(error);process.exitCode=1;});
