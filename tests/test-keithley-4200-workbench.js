#!/usr/bin/env node
'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const registry=new Map();
const sandbox={window:{DKDSPluginModules:{define:(pluginId,id,mod)=>{assert.equal(pluginId,'com.dkds.keithley-4200');registry.set(id,mod);}}}};
vm.runInNewContext(read('src/plugins/keithley-4200/measurement-model.js'),sandbox,{filename:'measurement-model.js'});
const model=registry.get('measurement-model');
assert(model,'Measurement model must register');
const cases=[
  {direction:'forward',points:3,expected:[-1,0,1]},
  {direction:'reverse',points:3,expected:[1,0,-1]},
  {direction:'roundtrip',points:3,expected:[-1,0,1,0,-1]}
];
for(const row of cases){
  const p=model.validatePlan({direction:row.direction,loops:2,points:3});
  assert.equal(p.totalPoints,2*row.expected.length);
  const values=Array.from({length:row.expected.length},(_,i)=>model.sample(p,i).x);
  assert.deepEqual(values,row.expected);
  assert.equal(model.sample(p,row.expected.length).cycle,2);
  assert.equal(p.executable,false);
  assert.equal(p.hardwareVerified,false);
}
for(const bad of [
  {loops:0},{loops:1001},{points:1},{points:5002},{complianceA:-0.1},
  {startV:Infinity},{delayMs:-1},{direction:'both'},{speed:'ultra'},
  {sourceSmU:3,gateSmU:3},{measureSmU:3,gateSmU:3},
  {points:5001,loops:1000,direction:'roundtrip'}
]){
  assert.throws(()=>model.validatePlan(bad));
}
const combined=model.validatePlan({sourceSmU:1,measureSmU:1,gateSmU:0});
assert.equal(combined.measureSmU,1);
assert.equal(combined.gateSmU,0);
const timed=model.validatePlan({mode:'timed',direction:'roundtrip',loops:4,points:8});
assert.equal(timed.perCycle,8);
const dataset=model.createDataset(timed);
assert.equal(dataset.source,'simulation');
assert.equal(dataset.device,null);
model.append(dataset,{cycle:1,point:1,elapsed_s:0,set_v:0,read_v:0,read_a:0.000001,status:'simulated'});
model.append(dataset,{cycle:1,point:2,elapsed_s:0.1,set_v:1,read_v:1,read_a:0.000002,status:'data,"quoted"'});
const csv=model.csv(dataset);
assert(csv.startsWith('cycle,point,elapsed_s,set_v,read_v,read_a,status\n'));
assert(csv.includes('1,2,0.1,1,1,0.000002,"data,""quoted"""'));
assert.throws(()=>model.append(dataset,{cycle:1,point:3,elapsed_s:NaN,set_v:1,read_v:1,read_a:1,status:'simulated'}));
dataset.complete=true;
assert.throws(()=>model.append(dataset,{cycle:1,point:3,elapsed_s:0,set_v:0,read_v:0,read_a:0,status:'ok'}));
const plugin=read('src/plugins/keithley-4200/plugin.js');
const ui=read('src/plugins/keithley-4200/unit-presentation.js');
assert(plugin.includes("encodeBase64('*IDN?\\0')"),'Only verified identity command is allowed for live transport');
assert(plugin.includes('Model.createDataset(p,null)'),'Simulated dataset must not carry live identity');
assert(!/forcev|forcei|measi|measv|output\s*on/i.test(plugin),'No SMU command path may be added in simulation phase');
assert(ui.includes('units.scientificPlot.create')&&ui.includes('units.table.mount'));
assert(ui.includes('仪器原生数据与图片归档'),'Native instrument artifacts must have a distinct archive area');
assert(ui.includes('原生文件获取尚未实现'),'Unimplemented instrument-file retrieval must be explicitly disclosed');
assert(ui.includes('软件生成 SVG'),'DKDS-generated SVG must be labeled as software-generated');
assert(ui.includes('仿真 CSV')&&ui.includes('仿真 JSON'),'Simulation exports must never be labeled raw device data');
assert(!/action\(exportActions,'(?:exportOriginal|saveOriginal)/.test(ui),'Do not expose nonfunctional native-file export commands');

console.log('Keithley 4200 workbench model, safety and export contract PASS');
