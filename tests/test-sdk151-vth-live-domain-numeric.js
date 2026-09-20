'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const modules=new Map();
const context={console,structuredClone,setTimeout,clearTimeout,Promise};
context.window=context;context.globalThis=context;context.DKDSPluginModules={define:(owner,id,value)=>modules.set(`${owner}:${id}`,value),require:(owner,id)=>modules.get(`${owner}:${id}`)};
vm.createContext(context);
for(const rel of ['src/core/services/service-runtime.js','src/plugins/transfer-vth-lab/analysis-runtime.js','src/plugins/transfer-vth-lab/live-domain.js','src/plugins/transfer-vth-lab/domain-adapter.js'])vm.runInContext(read(rel),context,{filename:rel});
const Analysis=modules.get('com.dkds.transfer-vth-lab:analysis-runtime');
const LiveDomain=modules.get('com.dkds.transfer-vth-lab:live-domain');
const Adapter=modules.get('com.dkds.transfer-vth-lab:domain-adapter');
assert(Analysis?.analyzeCurve&&LiveDomain?.create&&Adapter?.provide,'Vth live-domain modules must load.');

function demoCurve(){const points=[];for(const [a,b,shift] of [[-2,2,0],[2,-2,.14]])for(let i=0;i<100;i++){const x=a+(b-a)*i/99,center=.42+shift,current=2e-12+1.3e-9*Math.exp((x-center)*3.4);points.push({x,y:Math.min(current,8e-8),index:points.length});}return{id:'demo-transfer',name:'示例 · 双向转移曲线',points};}

(async()=>{
  const curve=demoCurve();let parameters=Analysis.defaults(),result=null,selectedCurveId=curve.id;
  const domain=LiveDomain.create({
    snapshot:()=>({schema:1,state:{parameters:{...parameters},selectedCurveId,manualWindows:{},view:null},curves:[{id:curve.id,name:curve.name,points:curve.points,result}],selectedCurveId,result}),
    actions:{
      setParameter:payload=>{parameters={...parameters,[payload.key]:payload.value};return parameters[payload.key];},
      analyzeSelected:()=>{result=Analysis.analyzeCurve(curve,parameters,null);return result;}
    }
  });
  const owner=context.DKDSServices.createScope('com.dkds.transfer-vth-lab');Adapter.provide({services:owner},domain);
  const denied=context.DKDSServices.createScope('com.example.denied');assert.throws(()=>denied.domain.connect('com.dkds.transfer-vth-lab/live'),/dependency not declared/i,'Vth live-domain must remain dependency-gated.');
  const shadow=context.DKDSServices.createScope('com.example.unit-vth-shadow',{dependencies:['com.dkds.transfer-vth-lab']}),live=shadow.domain.connect('com.dkds.transfer-vth-lab/live');
  await live.invoke('setParameter',{key:'targetCurrent',value:5e-10});
  const viaAdapter=await live.invoke('analyzeSelected'),direct=Analysis.analyzeCurve(curve,{...Analysis.defaults(),targetCurrent:5e-10},null),snapshot=live.snapshot().state;
  assert(viaAdapter?.ok&&direct?.ok&&snapshot?.result?.ok,'Vth live-domain must expose a finite production analysis result.');
  assert.strictEqual(viaAdapter.vth,direct.vth,'domain action must return the authoritative Vth result without a shadow recomputation path.');
  assert.strictEqual(viaAdapter.branch,direct.branch);assert.strictEqual(viaAdapter.n,direct.n);assert.strictEqual(viaAdapter.r2,direct.r2);
  assert.strictEqual(snapshot.result.vth,direct.vth,'domain snapshot must project the same authoritative numerical result.');
  assert.strictEqual(snapshot.state.parameters.targetCurrent,5e-10,'shadow parameter action must mutate the single owner state projected by the adapter.');
  const detached=live.snapshot();detached.state.state.parameters.targetCurrent=999;assert.strictEqual(live.snapshot().state.state.parameters.targetCurrent,5e-10,'domain snapshots must be detached from the owner.');
  assert.strictEqual(context.DKDSServices.get('@domain:com.dkds.transfer-vth-lab/live'),null,'raw service access must not bypass the domain facade.');
  shadow.dispose();denied.dispose();owner.dispose();
  console.log(`SDK 1.51 Vth live-domain numeric parity PASS: Vth=${direct.vth}, branch=${direct.branch}, N=${direct.n}.`);
})().catch(error=>{console.error(error);process.exit(1);});
