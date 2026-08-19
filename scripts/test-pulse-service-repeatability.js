const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const Analysis=require(path.join(root,'src','analysis.js'));

function periodicCsv(){
  const rows=['Time,Current,Voltage'];
  for(let cycle=0;cycle<4;cycle++)for(let j=0;j<300;j++){
    const write=j<100;
    rows.push(`${cycle*300+j},${write?10+cycle:100+cycle},${write?1+cycle*.1:.5}`);
  }
  return rows.join('\n');
}

const document={querySelector:()=>null,getElementById:()=>null};
const Plotly={Plots:{resize:()=>{}},react:()=>Promise.resolve(),relayout:()=>Promise.resolve()};
const context={
  window:{Analysis,Plotly,electronAPI:{}},Plotly,
  document,console,structuredClone,JSON,Date,Math,Number,String,Array,Set,Map,Promise,
  requestAnimationFrame:fn=>{fn();return 1;},cancelAnimationFrame:()=>{},setTimeout,clearTimeout
};
context.window.window=context.window;context.window.document=document;context.window.requestAnimationFrame=context.requestAnimationFrame;context.globalThis=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'src/plugins/pulse-analysis/analysis-service.js'),'utf8'),context,{filename:'analysis-service.js'});

(async()=>{
  const statuses=[];
  const runtime=await context.window.DKDSPulseAnalysisService.create({
    host:{},setStatus:s=>statuses.push(String(s)),copyTextToClipboard:()=>true,savePlotlyImage:()=>true,scheduleSnapshot:()=>{}
  });
  const file={
    id:'pulse-test',path:'periodic.csv',name:'periodic.csv',size:0,label:'periodic',checked:true,
    text:periodicCsv(),encoding:'utf-8',analyzed:true,analyzedAt:null,result:null,
    settings:{segmentationMode:'auto',timeCol:0,currentCol:1,voltageCol:2,cycleSamples:0,cycleOffsetSamples:0,windowStartFraction:.25,windowEndFraction:.75,phaseOrder:'write-read',readPairMode:'after'}
  };
  runtime.service.restore({activeId:'pulse-test',resultScope:'checked',files:[file]});
  let item=runtime.service.getState().files[0];
  assert(item.result,'Legacy saved item with analyzed=true must be re-analyzed during restore.');
  assert.strictEqual(item.result.points.length,4,'Automatic periodic cycle estimate must recover four cycles.');
  assert.strictEqual(item.error,'');

  const goodResult=item.result;
  item.settings={...item.settings,segmentationMode:'cycle',cycleSamples:999999};
  await runtime.service.analyzeChecked();
  item=runtime.service.getState().files[0];
  assert.strictEqual(item.result,goodResult,'A failed re-analysis must preserve the previous valid result object.');
  assert(item.error,'A failed re-analysis must still report the new error.');

  item.settings={...item.settings,segmentationMode:'auto',cycleSamples:0};
  await runtime.service.analyzeChecked();
  item=runtime.service.getState().files[0];
  assert(item.result&&item.result.points.length===4,'The same file must be repeatably analyzable after a failed attempt.');
  assert.strictEqual(item.error,'','Successful re-analysis must clear the stale error.');
  console.log('Pulse plugin repeatability passed: auto-cycle restore, failed rerun preservation, successful rerun recovery.');
})().catch(err=>{console.error(err);process.exit(1);});
