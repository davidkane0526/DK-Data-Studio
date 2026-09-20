'use strict';
const sdkAtLeast=(value,floor)=>{const a=String(value||'0.0.0').split('.').map(Number),b=String(floor||'0.0.0').split('.').map(Number);for(let i=0;i<3;i++){const x=a[i]||0,y=b[i]||0;if(x!==y)return x>y;}return true;};
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const approx=(actual,expected,tolerance=1e-12)=>assert(Math.abs(actual-expected)<=tolerance*Math.max(1,Math.abs(expected)),`${actual} != ${expected}`);

const units=require('../src/core/scientific/unit-runtime.js');
assert.strictEqual(units.version,'1.0.0');
assert.deepStrictEqual([...units.bases],['L','M','T','I','Th','N','J'],'Scientific dimensions must use the seven SI base dimensions; plane angle remains dimensionless in SI.');
assert(units.unit('A/cm²').vector.every(Number.isFinite),'Unit dimension vectors must not contain non-finite phantom components.');
assert.strictEqual(units.normalizeUnit('μA'),'µA');
assert.strictEqual(units.normalizeDimension('current'),'electric-current');

let decision=units.compatibility({name:'Gate voltage',unit:'mV'},{name:'Drain bias',unit:'V'});
assert.strictEqual(decision.compatible,true,'Different labels must not block physically compatible axes.');
approx(decision.conversion.scale,1e-3);
approx(units.convertAxisValue(1250,{unit:'mV'},{unit:'V'}),1.25);
assert.deepStrictEqual([...units.convertAxisRange([-500,1500],{unit:'mV'},{unit:'V'})],[-0.5,1.5]);

decision=units.compatibility({name:'Signal',unit:'V'},{name:'Signal',unit:'A'});
assert.strictEqual(decision.compatible,false,'Equal labels must never prove scientific compatibility.');
assert.strictEqual(decision.reason,'dimension-mismatch');

for(const unknown of ['a.u.','arb.','dB']){
  const row=units.compatibility({unit:unknown},{unit:unknown});
  assert.strictEqual(row.compatible,false,`${unknown} must fail closed.`);
  assert.strictEqual(row.reason,'unknown-unit');
}
assert.strictEqual(units.axis({dimension:'voltage',unit:'A'}).reason,'dimension-unit-conflict');
assert.strictEqual(units.compatibility({dimension:'voltage'},{dimension:'voltage'}).compatible,false,'Physical dimension without a known numeric unit must fail closed.');
assert.strictEqual(units.compatibility({dimension:'dimensionless'},{unit:'1'}).compatible,true);
approx(units.convert(50,'%','1'),0.5);
approx(units.convert(25,'°C','K'),298.15);
approx(units.convert(1,'A/cm²','A/m^2'),10000);
approx(units.convert(1,'V/µm','V/m'),1e6);
approx(units.convert(1,'Ω cm','Ω*m'),0.01);
approx(units.convert(1,'S/cm','S/m'),100);

const artifact={xName:'Gate voltage',xUnit:'mV',xDimension:'voltage',xQuantity:'gate-voltage',yName:'Current',yUnit:'µA',yDimension:'electric-current'};
assert.strictEqual(units.artifactAxis(artifact,'x').dimension,'voltage');
assert.strictEqual(units.artifactAxis(artifact,'y').unit,'µA');
assert.strictEqual(units.column({name:'Id',unit:'A/cm²',dimension:'current-density',quantity:'current-density'}).known,true);

const unitSource=read('src/core/scientific/unit-runtime.js');
assert(!/dispatchEvent|addEventListener|dkds:selection-changed/.test(unitSource),'Scientific Units must not create an event channel.');
const interactionSource=read('src/core/ui/modules/selection/data-interaction.js');
assert(interactionSource.includes('globalThis.DKDSScientificUnits'),'Interaction Runtime must delegate scientific compatibility to the single Core unit owner.');
assert(!interactionSource.includes('PREFIXES=')&&!interactionSource.includes("addUnit('V'"),'Interaction Runtime must not duplicate scientific conversion tables.');

const previousWindow=global.window;
global.window=global;
try{
  global.DKDSScientificUnits=units;
  delete require.cache[require.resolve('../src/core/ui/modules/selection/data-interaction.js')];
  const {SelectionModel,InteractionRuntime}=require('../src/core/ui/modules/selection/data-interaction.js');
  const scope={owner:'phase-e-test',scopeId:'phase-e-test#1',selection:{model:(id,spec)=>new SelectionModel('phase-e-test',id,spec)},entities:null};
  const runtime=new InteractionRuntime(scope,'axes');
  assert.strictEqual(runtime.canLinkAxes({unit:'mV'},{unit:'V'}),true);
  assert.strictEqual(runtime.canLinkAxes({unit:'V'},{unit:'A'}),false);
  approx(runtime.convertAxisValue(2500,{unit:'mV'},{unit:'V'}),2.5);
  runtime.dispose();
}finally{
  if(previousWindow===undefined)delete global.window;else global.window=previousWindow;
}

const dataContext={console,structuredClone};dataContext.window=dataContext;dataContext.globalThis=dataContext;vm.createContext(dataContext);
vm.runInContext(read('src/core/data/model.js'),dataContext,{filename:'model.js'});
const table=dataContext.DKDSData.createTable({id:'table:units',columns:[{key:'Vg',unit:'mV',dimension:'voltage',quantity:'gate-voltage',values:[0,1]}]});
const series=dataContext.DKDSData.createSeries({id:'series:units',x:[0,1],y:[2,3],xUnit:'mV',yUnit:'µA',xDimension:'voltage',yDimension:'electric-current',xQuantity:'gate-voltage'});
const matrix=dataContext.DKDSData.createMatrix({id:'matrix:units',x:[0],y:[0],z:[[1]],xUnit:'V',yUnit:'V',valueUnit:'%',xDimension:'voltage',yDimension:'voltage',valueDimension:'dimensionless'});
assert.strictEqual(table.columns[0].dimension,'voltage');
assert.strictEqual(series.xDimension,'voltage');
assert.strictEqual(matrix.valueDimension,'dimensionless');
const store=dataContext.DKDSData.createStore([table,series,matrix]);
assert.strictEqual(store.columnMetadata('table:units')[0].dimension,'voltage');
assert.strictEqual(store.listMetadata({id:'series:units'})[0].xDimension,'voltage');
assert.strictEqual(store.listMetadata({id:'matrix:units'})[0].valueUnit,'%');

const index=read('src/index.html'),dedicated=read('src/plugin-window/runtime.js'),pluginApi=read('src/core/plugins/kernel/modules/plugin-api.js');
assert(index.includes('core/scientific/unit-runtime.js')&&index.indexOf('core/scientific/unit-runtime.js')<index.indexOf('generated/runtime/ui-infrastructure.js'),'Main host must load Scientific Units before Interaction Runtime composition.');
assert(dedicated.includes("'scientific-unit-runtime':'../core/scientific/unit-runtime.js'")&&dedicated.indexOf("'scientific-unit-runtime'")<dedicated.indexOf("'entity-runtime'"),'Dedicated TOP must load the same unit owner before UI infrastructure.');
assert(pluginApi.includes('science: window.DKDSScience || null'),'Plugin API must expose the Core unit owner through the existing ctx.science facade.');

const dts=read('sdk/plugin-api.d.ts'),sdkDoc=read('sdk/SCIENTIFIC_UNITS.md'),contract=JSON.parse(read('sdk/contract.json'));
assert(dts.includes('DKDSScientificUnitRuntime')&&dts.includes('axisCompatibility(sourceAxis:'),'SDK types must expose unit compatibility and Interaction delegation.');
assert(sdkDoc.includes('label')&&sdkDoc.includes('fail')&&sdkDoc.includes('ctx.science.units'),'SDK documentation must prohibit label-based compatibility and document fail-closed units.');
assert(sdkAtLeast(contract.sdkVersion,'1.49.0'));
assert(sdkAtLeast(contract.minimumAppVersion,'3.70.6'));

console.log('v3.68.91 Phase E scientific dimension/unit compatibility contract retained');
