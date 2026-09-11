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
const surfaceActivated=[];
const surfaceDeactivated=[];
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
    {id:'workspace-prime:data-control',surfaceId:'data-control',kind:'prime',role:'data-control',label:'参数',active:true},
    {id:'workspace-prime:curve-inspector',surfaceId:'curve-inspector',kind:'prime',role:'inspector',label:'曲线检查',active:false},
    {id:'workspace-prime:group-analysis',surfaceId:'group-analysis',kind:'prime',role:'scientific-secondary',label:'组图',active:false},
    {id:'workspace-sub:physics',surfaceId:'physics',kind:'sub',role:'scientific-secondary',label:'物理分析',active:false}
  ],
  ter:[
    {id:'workspace-primary:main',surfaceId:'main',kind:'primary',role:'scientific-primary',label:'主界面',active:true},
    {id:'workspace-prime:resistance-inspector',surfaceId:'resistance-inspector',kind:'prime',role:'inspector',label:'R–V 联动',active:true}
  ],
  pulse:[{id:'workspace-primary:main',surfaceId:'main',kind:'primary',role:'scientific-primary',label:'主界面',active:true}],
  'data-center':[
    {id:'workspace-primary:main',surfaceId:'main',kind:'primary',role:'data-primary',label:'数据中心',active:true},
    {id:'workspace-prime:chart-preview',surfaceId:'chart-preview',kind:'prime',role:'scientific-secondary',label:'图形预览',active:true}
  ]
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
const INTENT_TYPES={NAVIGATE:'navigation.activate',BACK:'navigation.back',COMMAND:'command.execute',SURFACE:'workspace.surface.activate',ACTION:'workspace.action.execute',STATUS:'status.action.execute',KEY:'keyboard.key'};
const hostMethodTypes={navigate:INTENT_TYPES.NAVIGATE,back:INTENT_TYPES.BACK,command:INTENT_TYPES.COMMAND,surface:INTENT_TYPES.SURFACE,action:INTENT_TYPES.ACTION,status:INTENT_TYPES.STATUS};
const mobileAdapter={
  dispatcher:null,publisher:null,
  fromHostRequest:(method,payload)=>hostMethodTypes[method]?{type:hostMethodTypes[method],payload}:null,
  setDispatcher(fn){this.dispatcher=fn;return this;},setPublisher(fn){this.publisher=fn;return this;},installDocumentBindings(){return true;},
  canCloseTransient:()=>false,closeTransient:()=>false
};
const presentation={
  snapshot:({route}={})=>({workspaces:workspaces(),route:route||{kind:'workspace',activityId:active}}),
  present:(platform,{protocol,route,canGoBack,orientation,openSurfaces={}}={})=>{
    assert.strictEqual(platform,'mobile');
    const routeSurfaceId=String(route?.surfaceId||'');
    const rows=workspaces().map(row=>{
      const open=new Set((openSurfaces[row.activityId]||[]).map(String));
      const projectSurface=surface=>({...surface,active:surface.kind==='primary'?!routeSurfaceId:surface.kind==='prime'?(open.has(String(surface.surfaceId))&&surface.active!==false):(routeSurfaceId===surface.surfaceId&&surface.active!==false),presentation:{region:surface.role==='inspector'||surface.role==='data-control'?(orientation==='landscape'?'rail':'sheet'):surface.kind==='primary'?'main':'route'}});
      return {...row,surfaces:(row.surfaces||[]).map(projectSurface)};
    }),current=rows.find(row=>row.activityId===active),surfaces=current?.surfaces||[];
    return {protocol,orientation,ready:true,projectTitle:'移动验收项目',projects:[{id:'p1',title:'移动验收项目',active:true}],activityId:active,activityLabel:current?.label||'',status:'就绪',history:{canUndo:false,canRedo:false,past:[],future:[]},theme:'light',themeTokens:{},themeContractVersion:'',themeMaterial:{base:{},roles:{}},themeAppearance:{roles:{},components:{}},themeComponents:{},themeConsumption:{version:'0.0.0',components:{}},themeScientific:{seriesPalette:[],mode:'fallback-only',precedence:[]},route:route||{kind:'workspace',activityId:active},workspaces:rows,activities:rows,surfaces,actions:current?.actions||[],statusItems:[],canGoBack:!!canGoBack};
  }
};
const window={
  ReactNativeWebView:{postMessage:value=>posted.push(JSON.parse(value))},
  addEventListener:(type,fn)=>add('window',type,fn),dispatchEvent:()=>true,
  DKDSInteractionIntent:{types:INTENT_TYPES},DKDSInputAdapters:{mobile:mobileAdapter},DKDSPresentation:presentation,DKDSPlatform:{profile:{orientation:'landscape'}},
  DKDSTheme:{current:()=> 'light'},
  DKDSPlugins:{
    activities:{list:()=>activities,active:()=>active,activateEmbedded:async id=>{assert(activities.some(row=>row.id===id));active=id;activated.push(id);return true;}},
    statusBar:{invoke:()=>true},events:{on:()=>{}}
  },
  DKDSUI:{
    workspaces:{actions:id=>surfaceMap[id]||[],invoke:(activity,id)=>{invoked.push({activity,id});return true;},activate:(activity,id)=>{surfaceActivated.push({activity,id});const row=(surfaceMap[activity]||[]).find(surface=>surface.id===id||surface.surfaceId===id);if(!row)return false;if(row.kind==='primary'){for(const surface of surfaceMap[activity]||[])surface.active=surface.kind==='primary';}else if(row.kind==='sub'){for(const surface of surfaceMap[activity]||[])surface.active=surface===row||surface.kind==='primary'?surface.kind!=='primary':surface.active;}else row.active=true;return true;},deactivate:(activity,id)=>{surfaceDeactivated.push({activity,id});const row=(surfaceMap[activity]||[]).find(surface=>surface.id===id||surface.surfaceId===id);if(!row)return false;if(row.kind==='prime')row.active=false;else if(row.kind==='sub'){for(const surface of surfaceMap[activity]||[])surface.active=surface.kind==='primary';}return true;}},
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
async function workspacePresentationEvent(detail={}){
  for(const fn of listeners.window.get('dkds:workspace-presentation-changed')||[])await fn({detail});
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
  assert.strictEqual(bootstrap.value.orientation,'landscape');
  assert.strictEqual(bootstrap.value.surfaces.find(row=>row.surfaceId==='data-control').active,false,'desktop auto-open data control must not auto-open in the mobile route');
  assert.deepStrictEqual(Array.from(bootstrap.value.workspaces,row=>row.activityId),['resonance','ter','pulse','data-center']);
  assert.strictEqual(bootstrap.value.workspaces.find(row=>row.activityId==='data-center').system,true);
  assert(bootstrap.value.surfaces.some(row=>row.id==='workspace-sub:physics'&&row.role==='scientific-secondary'));

  const ter=await request('r2','navigate',{activityId:'ter'});
  assert.strictEqual(ter.ok,true);assert.deepStrictEqual(activated,['ter']);assert.strictEqual(active,'ter');assert.strictEqual(ter.value.kind,'workspace');
  const terState=await request('r2-state','snapshot');
  assert(terState.value.actions.some(row=>row.id==='calculate'&&row.label==='计算 TER'));
  const calculate=await request('r2-action','action',{activityId:'ter',id:'calculate'});
  assert.strictEqual(calculate.ok,true);assert.deepStrictEqual(actionInvoked.at(-1),{activity:'ter',id:'calculate',itemId:''});
  const resistanceRow=surfaceMap.ter.find(row=>row.surfaceId==='resistance-inspector');
  resistanceRow.active=false;
  const terClosedSnapshot=await request('r2-rv-closed-state','snapshot');
  assert.strictEqual(terClosedSnapshot.value.surfaces.find(row=>row.surfaceId==='resistance-inspector').active,false,'TER R-V close must reconcile without a presentation event');
  const terReopen=await request('r2-rv-reopen','surface',{activityId:'ter',id:'resistance-inspector'});
  assert.strictEqual(terReopen.ok,true);assert.strictEqual(terReopen.value.active,true,'TER R-V first tap after local close must reopen the PRIME');
  assert.deepStrictEqual(surfaceActivated.at(-1),{activity:'ter',id:'resistance-inspector'});

  const data=await request('r3','navigate',{activityId:'data-center'});
  assert.strictEqual(data.ok,true);assert.strictEqual(data.value.kind,'system');
  const previewRow=surfaceMap['data-center'].find(row=>row.surfaceId==='chart-preview');
  previewRow.active=false;
  const previewClosedSnapshot=await request('r3-preview-closed-state','snapshot');
  assert.strictEqual(previewClosedSnapshot.value.surfaces.find(row=>row.surfaceId==='chart-preview').active,false,'Data Center chart preview close must reconcile without a presentation event');
  const previewReopen=await request('r3-preview-reopen','surface',{activityId:'data-center',id:'chart-preview'});
  assert.strictEqual(previewReopen.ok,true);assert.strictEqual(previewReopen.value.active,true,'Data Center chart preview first tap after local close must reopen the PRIME');
  assert.deepStrictEqual(surfaceActivated.at(-1),{activity:'data-center',id:'chart-preview'});

  await request('r4','navigate',{activityId:'resonance'});
  const dataControl=await request('r4-data','surface',{activityId:'resonance',id:'data-control'});
  assert.strictEqual(dataControl.ok,true);assert.strictEqual(dataControl.value.active,true);assert.strictEqual(dataControl.value.region,'rail');assert.deepStrictEqual(surfaceActivated.at(-1),{activity:'resonance',id:'data-control'});
  const dataControlClose=await request('r4-data-close','surface',{activityId:'resonance',id:'data-control'});
  assert.strictEqual(dataControlClose.ok,true);assert.strictEqual(dataControlClose.value.active,false,'second native activation must close the actual Mobile PRIME route');assert.deepStrictEqual(surfaceDeactivated.at(-1),{activity:'resonance',id:'data-control'});

  // Closing a PRIME from its own in-panel × bypasses the native header request.
  // The workspace event must reconcile native openSurfaceState immediately so
  // the very next header tap reopens the actual PRIME instead of issuing a
  // redundant second close. This is shared by curve-inspector, R–V and chart-preview.
  const inspectorRow=surfaceMap.resonance.find(row=>row.surfaceId==='curve-inspector');inspectorRow.active=true;
  await workspacePresentationEvent({activity:'resonance',kind:'prime',surfaceId:'curve-inspector',reason:'prime-open'});
  inspectorRow.active=false;
  await workspacePresentationEvent({activity:'resonance',kind:'prime',surfaceId:'curve-inspector',reason:'prime-close'});
  const afterLocalClose=await request('r4-inspector-state','snapshot');
  assert.strictEqual(afterLocalClose.value.surfaces.find(row=>row.surfaceId==='curve-inspector').active,false,'local PRIME close must clear native tracked open state');
  const reopenInspector=await request('r4-inspector-reopen','surface',{activityId:'resonance',id:'curve-inspector'});
  assert.strictEqual(reopenInspector.ok,true);assert.strictEqual(reopenInspector.value.active,true,'first header tap after local close must reopen the inspector');
  assert.deepStrictEqual(surfaceActivated.at(-1),{activity:'resonance',id:'curve-inspector'});


  // Even if the in-panel close event is completely missed, any ordinary shell
  // snapshot must reconcile Native tracking from the live PluginWorkspace state.
  // This is the real failure mode seen for chart-preview / R-V / inspector.
  inspectorRow.active=false;
  const missedCloseSnapshot=await request('r4-inspector-missed-close-state','snapshot');
  assert.strictEqual(missedCloseSnapshot.value.surfaces.find(row=>row.surfaceId==='curve-inspector').active,false,'ordinary snapshot must clear stale PRIME tracking without relying on a presentation event');
  const reopenAfterMissedEvent=await request('r4-inspector-missed-close-reopen','surface',{activityId:'resonance',id:'curve-inspector'});
  assert.strictEqual(reopenAfterMissedEvent.ok,true);assert.strictEqual(reopenAfterMissedEvent.value.active,true,'first header tap after an unannounced in-panel close must activate the PRIME');
  assert.deepStrictEqual(surfaceActivated.at(-1),{activity:'resonance',id:'curve-inspector'});

  const sub=await request('r5','surface',{activityId:'resonance',id:'workspace-sub:physics'});
  assert.strictEqual(sub.ok,true);assert.strictEqual(sub.value.role,'scientific-secondary');assert.deepStrictEqual(surfaceActivated.at(-1),{activity:'resonance',id:'workspace-sub:physics'});

  const back=await request('r6','back');
  assert.strictEqual(back.value.handled,true);assert(surfaceActivated.some(row=>row.id==='workspace-primary:main'));
  console.log('Mobile Host runtime passed: protocol 3 Presenter state, Interaction Intent routing, TOP routes/actions/surfaces and Core back stack.');
})().catch(error=>{console.error(error);process.exitCode=1;});
