const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const Analysis=require('../src/analysis.js');

const context={
  console,structuredClone,setTimeout,clearTimeout,crypto:global.crypto,Analysis,
  document:{querySelector:()=>null,querySelectorAll:()=>[],getElementById:()=>null},
  Plotly:{react:()=>Promise.resolve(),purge(){},Plots:{resize(){}}}
};
context.window=context;context.globalThis=context;
vm.createContext(context);
vm.runInContext(read('src/core/data-model.js'),context,{filename:'data-model.js'});
vm.runInContext(read('src/plugins/ter-analysis/analysis-service.js'),context,{filename:'ter-analysis-service.js'});

function sweepDataset(){
  const step=.05;
  const up=Array.from({length:41},(_,index)=>Number((-1+index*step).toFixed(12)));
  const down=up.slice(0,-1).reverse();
  const points=[];
  for(const [direction,voltages] of [[1,up],[-1,down]]){
    for(const v of voltages){
      const resonance=Math.exp(-Math.pow((v-(direction>0?.25:-.18))/.11,2));
      const base=1.2e-6*(1+.18*Math.abs(v));
      const i=base*(direction>0?1:1.7)*(1+1.9*resonance);
      points.push({v,i,index:points.length,sourceLine:points.length+2});
    }
  }
  return {
    path:'ter-live::Id',name:'ter-live',sourcePath:'/tmp/ter-live.csv',sourceName:'ter-live.csv',vg:0,
    importSpec:{xHeader:'Vd',yHeader:'Id',xCol:0,yCol:1},points
  };
}

(async()=>{
  const D=context.DKDSData,store=D.createStore(),dataset=sweepDataset();
  D.syncLegacyDatasetArtifacts(store,[dataset]);
  const statuses=[];
  const runtime=await context.DKDSTERAnalysisService.create({
    host:{artifacts:{list:opts=>store.list(opts)},getState:()=>({scanVisibility:new Map([[dataset.path,{forward:true,reverse:true}]])})},
    project:{datasets:[]},setStatus:value=>statuses.push(String(value)),copyTextToClipboard(){},savePlotlyImage(){},scheduleSnapshot(){}
  });
  assert(runtime.service.autoParameters(),'TER auto detection must work from the live Artifact Store');
  const result=runtime.service.calculate();
  assert(result,'TER calculation must return a result from live Artifact data');
  assert.strictEqual(result.vgs.length,1,'synthetic integration data should produce one Vg row');
  assert(result.targets.length>=30,'TER voltage grid should contain the expected sweep targets');
  assert(result.matrix.flat().some(Number.isFinite),'TER matrix must contain finite values');
  assert(statuses.some(text=>text.includes('TER 热图计算完成')),'TER service should reach the successful calculation path');
  console.log(`TER live Artifact integration passed: ${result.vgs.length} Vg x ${result.targets.length} Vd.`);
})().catch(err=>{console.error(err);process.exit(1);});
