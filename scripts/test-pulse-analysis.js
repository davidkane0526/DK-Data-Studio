const assert = require('assert');
const path = require('path');
const A = require(path.join(__dirname, '..', 'src', 'analysis.js'));

function makeTimingCsv({cycles=3,writeDuration=.2,readDuration=.4,dt=.02,voltage=false}){
  const rows=[voltage?'Time,Current,Voltage':'Time,Current'];
  const period=writeDuration+readDuration;
  const total=cycles*period;
  for(let k=0;k<=Math.round(total/dt);k++){
    const t=Math.min(total,k*dt);
    const cycle=Math.min(cycles-1,Math.floor(Math.max(0,t-1e-12)/period));
    const local=t-cycle*period;
    const write=local<writeDuration-1e-10;
    const current=write?10+cycle:1+cycle;
    if(voltage)rows.push(`${t.toFixed(8)},${current},${write?2:.1}`);
    else rows.push(`${t.toFixed(8)},${current}`);
  }
  return rows.join('\n');
}

const inferred=A.inferPulseProtocolFromName('t=0.1s read=0.1 1s.csv');
assert.strictEqual(inferred.writeDuration,.1);
assert.strictEqual(inferred.readDuration,1);
assert.strictEqual(inferred.readVoltage,.1);

const currentOnly={
  name:'current-only.csv',path:'current-only.csv',
  text:makeTimingCsv({cycles:3,writeDuration:.2,readDuration:.4,dt:.02,voltage:false})
};
const timing=A.analyzePulseReadData(currentOnly,{
  segmentationMode:'timing',timeCol:0,currentCol:1,voltageCol:-1,
  writeDuration:.2,readDuration:.4,readVoltage:.1,phaseOrder:'write-read'
});
assert.strictEqual(timing.segmentationMode,'timing');
assert.strictEqual(timing.hasRecordedVoltage,false);
assert.strictEqual(timing.points.length,3);
assert.strictEqual(timing.readVoltage,.1);
assert.ok(timing.points.every(p=>p.pulseVoltage===null));
assert.ok(timing.points.every(p=>p.readVoltage===.1));
assert.ok(timing.points.every(p=>p.pulseDuration===.2&&p.readDuration===.4));

const withVoltage={
  name:'different-widths.csv',path:'different-widths.csv',
  text:makeTimingCsv({cycles:3,writeDuration:.1,readDuration:.5,dt:.02,voltage:true})
};
const unequal=A.analyzePulseReadData(withVoltage,{
  segmentationMode:'timing',timeCol:0,currentCol:1,voltageCol:2,
  writeDuration:.1,readDuration:.5,phaseOrder:'write-read'
});
assert.strictEqual(unequal.points.length,3);
assert.ok(unequal.points.every(p=>Math.abs(p.pulseVoltage-2)<1e-9));
assert.ok(unequal.points.every(p=>Math.abs(p.readVoltage-.1)<1e-9));

const inferredFile={
  name:'t=0.1s read=0.1 1s.csv',path:'t=0.1s read=0.1 1s.csv',
  text:makeTimingCsv({cycles:2,writeDuration:.1,readDuration:1,dt:.05,voltage:false})
};
const automatic=A.analyzePulseReadData(inferredFile,{
  segmentationMode:'auto',timeCol:0,currentCol:1,voltageCol:-1
});
assert.strictEqual(automatic.segmentationMode,'timing');
assert.strictEqual(automatic.points.length,2);
assert.strictEqual(automatic.readVoltage,.1);


const periodicRows=['Time,Current,Voltage'];
for(let cycle=0;cycle<4;cycle++){
  for(let j=0;j<300;j++){
    const write=j<100;
    periodicRows.push(`${cycle*300+j},${write?10+cycle:100+cycle},${write?1+cycle*.1:.5}`);
  }
}
const periodicFile={name:'periodic-300.csv',path:'periodic-300.csv',text:periodicRows.join('\n')};
const periodicInspection=A.inspectDataText(periodicFile,A.defaultImportOptions());
assert.strictEqual(A.estimatePulseCycleSamples(periodicInspection,{currentCol:1,voltageCol:2}),300);
const periodic=A.analyzePulseReadData(periodicFile,{
  segmentationMode:'cycle',timeCol:0,currentCol:1,voltageCol:2,
  cycleSamples:300,writeStartSample:5,writeEndSample:15,readStartSample:105,readEndSample:115
});
assert.strictEqual(periodic.segmentationMode,'cycle');
assert.strictEqual(periodic.cycleSamples,300);
assert.strictEqual(periodic.points.length,4);
const periodicAutoWithNullRanges=A.analyzePulseReadData(periodicFile,{
  segmentationMode:'auto',timeCol:0,currentCol:1,voltageCol:2,cycleSamples:300,
  writeStartSample:null,writeEndSample:null,readStartSample:null,readEndSample:null
});
assert.strictEqual(periodicAutoWithNullRanges.segmentationMode,'cycle');
assert.strictEqual(periodicAutoWithNullRanges.points.length,4,'Null optional cycle ranges must remain unspecified rather than becoming an invalid 0→0 explicit range.');
assert.strictEqual(periodic.points[2].pulseCurrent,12);
assert.strictEqual(periodic.points[2].readCurrent,102);

const legacyRows=['Meta','Time(s),id(0.0),Time(s),vd(0.0)'];
let t=0;
const blocks=[1,.5,.5,.5,-1,.5,-.5,.5];
for(const v of blocks){
  for(let k=0;k<20;k++){
    t+=.00005;
    legacyRows.push(`${t},${v===.5?2e-6:v*4e-6},${t},${v}`);
  }
}
const legacy=A.analyzePulseReadData({name:'pulse.csv',path:'pulse.csv',text:legacyRows.join('\n')},{});
assert.strictEqual(legacy.segmentationMode,undefined);
assert.strictEqual(legacy.blockSamples,20);
assert.ok(legacy.points.length>=3);

console.log('Pulse analysis supports periodic point-count cycles, unequal write/read widths, current-only files, filename protocol inference, and legacy data.');
