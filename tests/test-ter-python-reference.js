const assert=require('assert');
const ter=require('../src/science/ter.js');

function pyRoundInt(x){
  const lo=Math.floor(x), frac=x-lo;
  if(frac===.5)return (Math.abs(lo)%2===0)?lo:lo+1;
  return Math.round(x);
}
function pyVoltageGrid(vmin,vmax,step){
  if(!(vmin<0&&vmax>0))throw new Error('range');
  if(!(step>0))throw new Error('step');
  const nNegative=pyRoundInt(Math.abs(vmin)/step);
  const nPositive=pyRoundInt(vmax/step);
  const negative=Array.from({length:nNegative},(_,index)=>Number((vmin+index*step).toFixed(12)));
  const positive=Array.from({length:nPositive},(_,index)=>Number(((index+1)*step).toFixed(12)));
  return negative.concat(positive);
}
function pySweepDirections(points,tolerance){
  const dirs=new Array(points.length).fill(0);
  for(let index=0;index<points.length;index++){
    const voltage=points[index].v;
    if(index>0&&Math.abs(voltage-points[index-1].v)>tolerance){
      dirs[index]=voltage>points[index-1].v?1:-1;
    }else if(index+1<points.length&&Math.abs(points[index+1].v-voltage)>tolerance){
      dirs[index]=points[index+1].v>voltage?1:-1;
    }
  }
  return dirs;
}
function pyProcess(dataset,targets,tolerance,currentFloor){
  const points=dataset.points;
  const dirs=pySweepDirections(points,tolerance);
  const rows=[];
  for(const target of targets){
    let iUp=NaN,iDown=NaN;
    for(let index=0;index<points.length;index++){
      const measured=points[index].v;
      if(Math.abs(measured-target)<=tolerance){
        if(dirs[index]>0&&!Number.isFinite(iUp))iUp=points[index].i;
        else if(dirs[index]<0&&!Number.isFinite(iDown))iDown=points[index].i;
        if(Number.isFinite(iUp)&&Number.isFinite(iDown))break;
      }
    }
    let rUp=NaN,rDown=NaN,value=NaN;
    if(Number.isFinite(iUp)&&Number.isFinite(iDown)&&Math.abs(iUp)>currentFloor&&Math.abs(iDown)>currentFloor){
      rUp=Math.abs(target/iUp);rDown=Math.abs(target/iDown);
      const low=Math.min(rUp,rDown),high=Math.max(rUp,rDown);
      if(low>0)value=(high-low)/low*100;
    }
    rows.push({vg:dataset.vg,vds:target,iUp,iDown,rUp,rDown,ter:value,sourceFile:dataset.name});
  }
  return rows;
}
function pyGroupMax(records,index){
  const maxima=new Map();
  for(const row of records){
    const group=index===0?row.vds:row.vg;
    if(!Number.isFinite(row.ter))continue;
    const prev=maxima.get(group);
    if(prev===undefined||row.ter>prev)maxima.set(group,row.ter);
  }
  return [...maxima.entries()].sort((a,b)=>a[0]-b[0]);
}
function close(a,b,eps=1e-10){
  if(Number.isNaN(a)&&Number.isNaN(b))return true;
  return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=eps*Math.max(1,Math.abs(a),Math.abs(b));
}
function assertRowsEqual(actual,expected){
  assert.strictEqual(actual.length,expected.length);
  for(let i=0;i<actual.length;i++){
    for(const key of ['vg','vds','iUp','iDown','rUp','rDown','ter']){
      assert(close(actual[i][key],expected[i][key]),`row ${i} ${key}: ${actual[i][key]} != ${expected[i][key]}`);
    }
  }
}

for(const args of [[-1,1,.1],[-1.05,1.05,.1],[-.95,.95,.1],[-2,2,.3],[-1.2,1.1,.2]]){
  assert.deepStrictEqual(ter.terVoltageGrid(...args),pyVoltageGrid(...args),`grid mismatch ${args}`);
}

function makeDataset(vg,scale,offset=0){
  const volts=[-1,-.5,.5,1,1,.5,-.5,-1];
  const points=volts.map((v,index)=>({v,i:(index<4?1:2)*scale*(1+Math.abs(v)+offset)}));
  return {name:`vg=${vg}V.csv`,vg,points};
}
const datasets=[makeDataset(-1,1e-6,0),makeDataset(1,1.4e-6,.2)];
const options={vmin:-1,vmax:1,vstep:.5,tolerance:.025,currentFloor:1e-15};
const result=ter.computeTerMatrix(datasets,options);
let expectedRecords=[];
for(const ds of datasets)expectedRecords.push(...pyProcess(ds,pyVoltageGrid(options.vmin,options.vmax,options.vstep),options.tolerance,options.currentFloor));
expectedRecords.sort((a,b)=>(a.vg-b.vg)||(a.vds-b.vds));
assertRowsEqual(result.records,expectedRecords);

const pyMaxVg=pyGroupMax(expectedRecords,1);
const jsMaxVg=result.terMaxByVg.map(r=>[r.vg,r.terMax]);
assert.strictEqual(jsMaxVg.length,pyMaxVg.length);
jsMaxVg.forEach((row,i)=>{assert(close(row[0],pyMaxVg[i][0]));assert(close(row[1],pyMaxVg[i][1]));});
const pyMaxVd=pyGroupMax(expectedRecords,0);
const jsMaxVd=result.terMaxByVd.map(r=>[r.vds,r.terMax]);
assert.strictEqual(jsMaxVd.length,pyMaxVd.length);
jsMaxVd.forEach((row,i)=>{assert(close(row[0],pyMaxVd[i][0]));assert(close(row[1],pyMaxVd[i][1]));});

// Blank/null UI settings must mean Python-style auto detection, not Number(null) === 0.
const auto=ter.computeTerMatrix(datasets,{vmin:null,vmax:null,vstep:null,tolerance:null,currentFloor:null});
assert.strictEqual(auto.used.vmin,-1);
assert.strictEqual(auto.used.vmax,1);
assert.strictEqual(auto.used.vstep,.5);
assert.strictEqual(auto.used.tolerance,.025);
assert.strictEqual(auto.used.currentFloor,1e-15);

// Equal maxima keep the first row in sorted Vg/Vds order, matching ter_gui.py's strict ">" update.
const tieRecords=[
  {vg:-1,vds:-.5,ter:100},{vg:-1,vds:.5,ter:100},
  {vg:1,vds:-.5,ter:100},{vg:1,vds:.5,ter:100}
];
const refTieVg=pyGroupMax(tieRecords,1);
assert.deepStrictEqual(refTieVg,[[-1,100],[1,100]]);

console.log('Python TER reference parity checks passed.');
