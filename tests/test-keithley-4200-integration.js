#!/usr/bin/env node
'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const {TextEncoder,TextDecoder}=require('util');
const root=path.resolve(__dirname,'..');
const source=rel=>fs.readFileSync(path.join(root,rel),'utf8');
let createPlugin=null,callbacks=null,slice=null,capability=null,topWorkspace=null,activity=null;
const registry=new Map(),messages=[],saved=[],requests=[];
const controls={
  host:'169.254.111.118',port:'1225',networkMode:'ethernet',interfaceName:'eth0',
  connectTimeoutMs:'5000',readTimeoutMs:'5000',expectedSerial:'1498377',profileName:'lab',profiles:'',
  mode:'iv',direction:'roundtrip',loops:'1',points:'3',startV:'-1',stopV:'1',
  complianceA:'0.0001',delayMs:'0',speed:'fast',sourceSmU:'1',measureSmU:'2',gateSmU:'3',gateBiasV:'0'
};
const ui={
  get:id=>controls[id],set:(id,v)=>{controls[id]=String(v);},
  setOptions:(id,rows)=>{ui.options=rows;},
  renderStatus:(...x)=>messages.push(['status',...x]),
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
registry.set('unit-presentation',{mount:(_ctx,_page,events)=>{callbacks=events;return ui;}});
vm.runInNewContext(source('src/plugins/keithley-4200/plugin.js'),sandbox);
const tcp={
  open:async info=>({sessionId:'session-1',remoteAddress:info.host}),
  exchange:async payload=>{
    requests.push(Buffer.from(payload.base64,'base64'));
    return {base64:Buffer.from('KEITHLEY INSTRUMENTS,KI4200A,1498377,V1.14').toString('base64')};
  },
  close:async()=>true
};
const ctx={
  services:{require:id=>{assert.equal(id,'tcp');return tcp;}},
  modules:{require:id=>registry.get(id)},
  status:{set:x=>messages.push(['host',x])},
  workspace:{openPage:()=>{}},
  project:{registerSlice:(id,value)=>{assert.equal(id,'keithley-4200');slice=value;},capture:()=>{}},
  io:{saveText:async info=>{saved.push(info);return true;}},
  ui:{activities:{add:row=>{activity=row;}},topWorkspace:{register:row=>{topWorkspace=row;}},pages:{add:()=>({})}},
  capabilities:{register:(id,provider)=>{assert.equal(id,'instrument.keithley-4200');capability=provider;}}
};
async function main(){
  assert(createPlugin);
  const lifecycle=await createPlugin(ctx);
  assert(callbacks&&capability&&slice&&activity&&topWorkspace);
  assert.equal(topWorkspace.activity,'keithley-4200');
  assert.equal(topWorkspace.layout.primary.presentationRole,'utility-primary');
  assert.equal(topWorkspace.layout.root.selector,'#keithley4200Page .dkds-plugin-workspace');
  assert.equal(activity.label,'4200A');
  // Execute the REAL Android presentation filter instead of checking only
  // the presence of an activity; absent topWorkspace previously hid 4200A.
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
    assert.equal(workspaces[0].presentationComplete,true,'4200A must declare primary presentation role.');
  } finally {
    if(originalWindow===undefined)delete global.window;
    else global.window=originalWindow;
  }
  assert.equal(capability.methods.status().connected,false);
  const connected=await capability.methods.connect();
  assert.equal(connected.sessionId,'session-1');
  const identity=await capability.methods.identify();
  assert.equal(identity.serial,'1498377');
  assert.deepEqual([...requests[0]],[42,73,68,78,63,0]);
  const response=capability.methods.simulate();
  assert.equal(response.simulated,true);
  assert.equal(response.totalPoints,5);
  await new Promise(resolve=>setTimeout(resolve,110));
  const summary=capability.methods.datasetSummary();
  assert.equal(summary.count,5);
  assert.equal(summary.source,'simulation');
  assert.equal(summary.complete,true);
  assert.equal(ui.running,false);
  assert.equal(requests.length,1,'simulation must not send instrument commands');
  assert(ui.curves.length>0&&ui.rows.length===5);
  await callbacks.exportCsv();
  await callbacks.exportJson();
  await callbacks.exportSvg();
  assert.deepEqual(saved.map(x=>x.defaultName),['4200-simulation.csv','4200-simulation.json','4200-simulation-curve.svg']);
  assert(saved[0].content.includes('simulated'));
  assert(JSON.parse(saved[1].content).source==='simulation');
  assert(saved[2].content.includes('SIMULATION ONLY'));
  controls.profileName='saved-ethernet';
  await callbacks.saveProfile();
  assert.equal(slice.serialize().profiles[0].name,'saved-ethernet');
  controls.host='192.168.1.5';controls.networkMode='wifi';controls.profiles='saved-ethernet';
  await callbacks.loadProfile();
  assert.equal(controls.host,'169.254.111.118');
  assert.equal(controls.networkMode,'ethernet');
  lifecycle.deactivate();
  console.log('Keithley 4200 simulated integration and identity isolation PASS');
}
main().catch(err=>{console.error(err);process.exitCode=1;});
