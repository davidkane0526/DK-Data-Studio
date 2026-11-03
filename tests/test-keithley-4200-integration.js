#!/usr/bin/env node
'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const {TextEncoder,TextDecoder}=require('util');
const root=path.resolve(__dirname,'..');
const source=rel=>fs.readFileSync(path.join(root,rel),'utf8');
let createPlugin=null,callbacks=null,slice=null,capability=null,topWorkspace=null,activity=null,pageSpec=null;
const registry=new Map(),messages=[],requests=[],openedModes=[],closed=[];
let failOpen=false;
const controls={
  host:'169.254.111.118',port:'1225',networkMode:'auto',expectedSerial:'1498377',
  mobileHost:'',mobilePort:'45910',mobileNetworkMode:'auto',mobilePairKey:'',
  mode:'iv',direction:'roundtrip',loops:'1',points:'3',startV:'-1',stopV:'1',
  complianceA:'0.0001',delayMs:'0',speed:'fast',sourceSmU:'1',measureSmU:'2',gateSmU:'3',gateBiasV:'0'
};
const ui={
  get:id=>controls[id],set:(id,v)=>{controls[id]=String(v);},
  setConnectionState:(...x)=>messages.push(['connection',...x]),
  renderPreview:(...x)=>messages.push(['preview',...x]),
  renderProgress:(...x)=>messages.push(['progress',...x]),
  renderData:(curves,rows)=>{ui.curves=curves;ui.rows=rows;},
  setRunning:flag=>{ui.running=flag;},dispose:()=>{}
};
const sandbox={
  TextEncoder,TextDecoder,setTimeout,clearTimeout,atob,btoa,
  window:{DKDSPluginModules:{define:(_,id,part)=>registry.set(id,part)}},
  DKDSPlugins:{define:(manifest,factory)=>{createPlugin=factory;}}
};
vm.runInNewContext(source('src/plugins/keithley-4200/measurement-model.js'),sandbox);
vm.runInNewContext(source('src/plugins/keithley-4200/kxci-protocol.js'),sandbox);
registry.set('unit-presentation',{mount:(_ctx,_page,events)=>{callbacks=events;return ui;}});
vm.runInNewContext(source('src/plugins/keithley-4200/plugin.js'),sandbox);
const tcp={
  supportsRelay:true,
  open:async info=>{openedModes.push(info.networkMode);if(failOpen)throw Error('TCP connection failed after trying 4 paths: ENETUNREACH and timeouts; internal adapter diagnostics');return {sessionId:'session-1',remoteAddress:info.host,localAddress:'169.254.111.115',interfaceName:'Ethernet',routeStrategy:'local-address-bound'};},
  exchange:async payload=>{
    requests.push(Buffer.from(payload.base64,'base64'));
    return {base64:Buffer.from('KEITHLEY INSTRUMENTS,KI4200A,1498377,V1.14\0').toString('base64')};
  },
  close:async info=>{closed.push(info.sessionId);return true;}
};
let openPageCalls=0;
const ctx={
  services:{require:id=>{assert.equal(id,'tcp');return tcp;}},
  modules:{require:id=>registry.get(id)},
  status:{set:x=>messages.push(['host',x])},
  workspace:{openPage:()=>{openPageCalls++;}},
  project:{registerSlice:(id,value)=>{assert.equal(id,'keithley-4200');slice=value;},capture:()=>{}},
  ui:{dom:{timeout:(fn,ms)=>{const id=setTimeout(fn,ms);return ()=>clearTimeout(id);}},
    activities:{add:row=>{activity=row;}},
    topWorkspace:{register:row=>{topWorkspace=row;}},
    pages:{add:spec=>{pageSpec=spec;return {};}}
  },
  capabilities:{register:(id,provider)=>{assert.equal(id,'instrument.keithley-4200');capability=provider;}}
};
async function main(){
  assert(createPlugin);
  const lifecycle=await createPlugin(ctx);
  assert(callbacks&&capability&&slice&&activity&&topWorkspace&&pageSpec);
  assert.equal(topWorkspace.activity,'keithley-4200');
  assert.equal(topWorkspace.layout.primary.presentationRole,'utility-primary');
  assert.equal(topWorkspace.layout.root.selector,'#keithley4200Page .dkds-plugin-workspace');
  assert.equal(activity.label,'4200A');
  assert.equal(typeof pageSpec.onOpen,'function');
  const {PresentationModel}=require(path.join(root,'src/core/ui/modules/presentation/model.js'));
  const originalWindow=global.window;
  try {
    global.window={
      DKDSPlugins:{
        activities:{list:()=>[{...activity,pluginId:'com.dkds.keithley-4200',pluginType:'developer'}]},
        workspace:{top:()=>[{...topWorkspace,pluginId:'com.dkds.keithley-4200'}]},
        statusBar:{list:()=>[]}
      },
      DKDSUI:{workspaces:{actions:()=>[]},actions:{list:()=>[]}}
    };
    const model=new PresentationModel();
    const workspaces=model.workspaces();
    assert.equal(workspaces.length,1,'Android must show registered instrument TOP workspace.');
    assert.equal(workspaces[0].activityId,'keithley-4200');
    assert.equal(workspaces[0].label,'4200A');
    assert.equal(workspaces[0].presentationComplete,true);
  } finally {
    if(originalWindow===undefined)delete global.window;
    else global.window=originalWindow;
  }

  // Opening the activity automatically performs TCP open + *IDN? verification.
  activity.onActivate();
  pageSpec.onOpen(); // Both host callbacks may fire; they must share one pending connection.
  await new Promise(resolve=>setTimeout(resolve,30));
  assert.equal(openPageCalls,1);
  assert.equal(capability.methods.status().connected,true);
  assert.deepEqual(openedModes,['auto']);
  assert.deepEqual([...requests[0]],[42,73,68,78,63,0]);
  assert.equal(capability.methods.status().identified.serial,'1498377');

  // No connection parameters or profiles are written into the project slice.
  const serialized=slice.serialize();
  assert.deepEqual(Object.keys(serialized),['plan']);
  controls.host='192.168.1.5';controls.port='5025';controls.networkMode='wifi';
  slice.restore({connection:{host:'10.0.0.1',port:1234},plan:{loops:2}});
  assert.equal(controls.host,'192.168.1.5','Connection target must not be restored from project data.');
  assert.equal(controls.port,'5025','Connection port must not be restored from project data.');
  assert.equal(controls.loops,'2','Measurement-plan parameters may remain project-persisted.');

  // One visible toggle disconnects; the same action reconnects and verifies again.
  await callbacks.toggleConnection();
  assert.equal(capability.methods.status().connected,false);
  assert.equal(closed.length,1);
  controls.host='169.254.111.118';controls.port='1225';controls.networkMode='auto';
  await callbacks.toggleConnection();
  assert.equal(capability.methods.status().connected,true);
  assert.equal(requests.length,2);

  const response=capability.methods.simulate();
  assert.equal(response.simulated,true);
  assert.equal(response.totalPoints,10);
  await new Promise(resolve=>setTimeout(resolve,110));
  const summary=capability.methods.datasetSummary();
  assert.equal(summary.count,10);
  assert.equal(summary.source,'simulation');
  assert.equal(summary.complete,true);
  assert.equal(ui.running,false);
  assert.equal(requests.length,2,'Simulation must not send instrument commands.');
  assert(ui.curves.length>0&&ui.rows.length===10);
  await callbacks.toggleConnection(); // disconnect
  failOpen=true;
  const before=messages.filter(x=>x[0]==='progress').length;
  const fails=await callbacks.toggleConnection();
  assert.equal(fails,false,'Failed connection must be reported without an unhandled rejection.');
  const events=messages.filter(x=>x[0]==='connection'&&x[1]==='error');
  assert.equal(events.length,1,'One failed probe should produce one connection error card.');
  assert(events[0][3].length<130&&!events[0][3].includes('TCP connection failed after trying'),
    'Only an actionable short error belongs on the connection card.');
  assert(events[0][4].includes('ENETUNREACH'),'The collapsed diagnostic must retain the transport failure.');
  assert.equal(messages.filter(x=>x[0]==='progress').length,before,
    'Connection failures must never appear in the simulation chart.');
  assert(!messages.filter(x=>x[0]==='host').at(-1)[1].includes('TCP connection failed after trying'),
    'The bottom status must not duplicate raw network failures.');
  lifecycle.deactivate();
  console.log('Keithley 4200 automatic connect/identify, transient connection settings and simulation isolation PASS');
}
main().catch(err=>{console.error(err);process.exitCode=1;});
