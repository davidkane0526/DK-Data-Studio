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

const activities=[
  {id:'resonance',pluginId:'builtin.resonance',label:'共振分析',role:'top',isSuper:true},
  {id:'ter',pluginId:'builtin.ter',label:'TER 分析',role:'top'},
  {id:'pulse',pluginId:'builtin.pulse',label:'脉冲分析',role:'top'},
  {id:'data-center',pluginId:'builtin.data-center',label:'数据中心',role:'top',navigation:'system'}
];
const surfaceMap={
  resonance:[
    {id:'workspace-primary:main',surfaceId:'main',kind:'primary',role:'scientific-primary',label:'主界面',active:true},
    {id:'workspace-prime:curve-inspector',surfaceId:'curve-inspector',kind:'prime',role:'inspector',label:'曲线检查',active:false},
    {id:'workspace-prime:group-analysis',surfaceId:'group-analysis',kind:'prime',role:'data-control',label:'组图',active:false},
    {id:'workspace-sub:physics',surfaceId:'physics',kind:'sub',role:'scientific-secondary',label:'物理分析',active:false}
  ],
  ter:[{id:'workspace-primary:main',surfaceId:'main',kind:'primary',role:'scientific-primary',label:'主界面',active:true}],
  pulse:[{id:'workspace-primary:main',surfaceId:'main',kind:'primary',role:'scientific-primary',label:'主界面',active:true}],
  'data-center':[]
};
const actionMap={ter:[{id:'calculate',label:'计算 TER',enabled:true,items:[]}]};
const workspaces=()=>activities.map(row=>({
  id:row.id,activityId:row.id,pluginId:row.pluginId,label:row.label,icon:'◇',role:row.navigation==='system'?'system':'top',system:row.navigation==='system',isSuper:!!row.isSuper,
  primary:surfaceMap[row.id]?.find(surface=>surface.kind==='primary')||{id:'workspace-primary:main',surfaceId:'main',kind:'primary',role:'scientific-primary',label:row.label},
  primes:(surfaceMap[row.id]||[]).filter(surface=>surface.kind==='prime'),subs:(surfaceMap[row.id]||[]).filter(surface=>surface.kind==='sub'),
  surfaces:surfaceMap[row.id]||[],actions:actionMap[row.id]||[]
}));

const add=(owner,type,fn)=>{if(!listeners[owner].has(type))listeners[owner].set(type,[]);listeners[owner].get(type).push(fn);};
const body={dataset:{},classList:{add(){},remove(){},toggle(){}}};
const document={
  body,activeElement:null,
  addEventListener:(type,fn)=>add('document',type,fn)
};
const INTENT_TYPES={NAVIGATE:'navigation.activate',BACK:'navigation.back',COMMAND:'command.execute',PANEL:'workspace.panel.toggle',SURFACE:'workspace.surface.activate',ACTION:'workspace.action.execute',STATUS:'status.action.execute',KEY:'keyboard.key'};
const hostMethodTypes={navigate:INTENT_TYPES.NAVIGATE,back:INTENT_TYPES.BACK,command:INTENT_TYPES.COMMAND,panel:INTENT_TYPES.PANEL,surface:INTENT_TYPES.SURFACE,action:INTENT_TYPES.ACTION,status:INTENT_TYPES.STATUS};
const mobileAdapter={
  dispatcher:null,publisher:null,
  fromHostRequest:(method,payload)=>hostMethodTypes[method]?{type:hostMethodTypes[method],payload}:null,
  setDispatcher(fn){this.dispatcher=fn;return this;},setPublisher(fn){this.publisher=fn;return this;},installDocumentBindings(){return true;},
  canCloseTransient:()=>false,closeTransient:()=>false,togglePanel:name=>({open:true,name})
};
const presentation={
  snapshot:({route}={})=>({workspaces:workspaces(),route:route||{kind:'workspace',activityId:active}}),
  present:(platform,{protocol,route,canGoBack}={})=>{
    assert.strictEqual(platform,'mobile');
    const rows=workspaces(),current=rows.find(row=>row.activityId===active);
    return {protocol,ready:true,projectTitle:'移动验收项目',projects:[{id:'p1',title:'移动验收项目',active:true}],activityId:active,activityLabel:current?.label||'',status:'就绪',history:{canUndo:false,canRedo:false,past:[],future:[]},theme:'light',themeTokens:{},themeContractVersion:'',themeMaterial:{base:{},roles:{}},themeAppearance:{roles:{},components:{}},themeComponents:{},themeConsumption:{version:'0.0.0',components:{}},themeScientific:{seriesPalette:[],mode:'fallback-only',precedence:[]},route:route||{kind:'workspace',activityId:active},workspaces:rows,activities:rows,surfaces:current?.surfaces||[],actions:current?.actions||[],statusItems:[],canGoBack:!!canGoBack};
  }
};
const window={
  ReactNativeWebView:{postMessage:value=>posted.push(JSON.parse(value))},
  addEventListener:(type,fn)=>add('window',type,fn),dispatchEvent:()=>true,
  DKDSInteractionIntent:{types:INTENT_TYPES},DKDSInputAdapters:{mobile:mobileAdapter},DKDSPresentation:presentation,
  DKDSTheme:{current:()=> 'light'},
  DKDSPlugins:{
    activities:{list:()=>activities,active:()=>active,activateEmbedded:async id=>{assert(activities.some(row=>row.id===id));active=id;activated.push(id);return true;}},
    statusBar:{invoke:()=>true},events:{on:()=>{}}
  },
  DKDSUI:{
    workspaces:{actions:id=>surfaceMap[id]||[],invoke:(activity,id)=>{invoked.push({activity,id});return true;}},
    actions:{list:id=>actionMap[id]||[],invoke:(activity,id,itemId)=>{actionInvoked.push({activity,id,itemId});return true;}}
  }
};
const context={window,document,location:{search:''},URLSearchParams,console,setTimeout,clearTimeout,requestAnimationFrame:fn=>{fn();return 1;},Event:class{constructor(type){this.type=type;}},CustomEvent:class{},KeyboardEvent:class{}};
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
  assert.strictEqual(bootstrap.value.protocol,3);
  assert.deepStrictEqual(Array.from(bootstrap.value.workspaces,row=>row.activityId),['resonance','ter','pulse','data-center']);
  assert.strictEqual(bootstrap.value.workspaces.find(row=>row.activityId==='data-center').system,true);
  assert(bootstrap.value.surfaces.some(row=>row.id==='workspace-sub:physics'&&row.role==='scientific-secondary'));

  const ter=await request('r2','navigate',{activityId:'ter'});
  assert.strictEqual(ter.ok,true);assert.deepStrictEqual(activated,['ter']);assert.strictEqual(active,'ter');assert.strictEqual(ter.value.kind,'workspace');
  const terState=await request('r2-state','snapshot');
  assert(terState.value.actions.some(row=>row.id==='calculate'&&row.label==='计算 TER'));
  const calculate=await request('r2-action','action',{activityId:'ter',id:'calculate'});
  assert.strictEqual(calculate.ok,true);assert.deepStrictEqual(actionInvoked.at(-1),{activity:'ter',id:'calculate',itemId:''});

  const data=await request('r3','navigate',{activityId:'data-center'});
  assert.strictEqual(data.ok,true);assert.strictEqual(data.value.kind,'system');

  await request('r4','navigate',{activityId:'resonance'});
  const sub=await request('r5','surface',{activityId:'resonance',id:'workspace-sub:physics'});
  assert.strictEqual(sub.ok,true);assert.strictEqual(sub.value.role,'scientific-secondary');assert.deepStrictEqual(invoked.at(-1),{activity:'resonance',id:'workspace-sub:physics'});

  const back=await request('r6','back');
  assert.strictEqual(back.value.handled,true);assert(invoked.some(row=>row.id==='workspace-primary:main'));
  console.log('Mobile Host runtime passed: protocol 3 Presenter state, Interaction Intent routing, TOP routes/actions/surfaces and Core back stack.');
})().catch(error=>{console.error(error);process.exitCode=1;});
