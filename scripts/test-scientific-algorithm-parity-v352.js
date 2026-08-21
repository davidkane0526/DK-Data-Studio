const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const read=f=>fs.readFileSync(f,'utf8');
const context={window:{},console,structuredClone,performance:{now:()=>0},setTimeout,clearTimeout};
context.window=context;context.globalThis=context;vm.createContext(context);
for(const file of [
  'src/science/common.js',
  'src/science/presets.js',
  'src/science/peaks.js',
  'src/core/plugin-module-runtime.js',
  'src/plugins/resonance-detector-robust/algorithm.js'
]) vm.runInContext(read(file),context,{filename:file});

const legacy=context.DKDSScience;
const plugin=context.DKDSPluginModules.require('builtin.resonance-detector-robust','algorithm');
assert(legacy?.detectPeaks&&legacy?.peakMetrics,'Legacy/reference peak implementation unavailable.');
assert(plugin?.detectPeaks&&plugin?.peakMetrics,'Plugin-owned peak implementation unavailable.');

const points=[];
for(let n=0;n<=160;n++){
  const v=-0.8+n*0.01;
  const baseline=1.2e-9+0.25e-9*v;
  const peak1=6.0e-9*Math.exp(-0.5*Math.pow((v-0.12)/0.075,2));
  const peak2=2.6e-9*Math.exp(-0.5*Math.pow((v+0.34)/0.055,2));
  points.push({v,i:baseline+peak1+peak2,rawIndices:[n]});
}
const sweep={id:'algorithm-parity',datasetPath:'synthetic.csv',datasetName:'synthetic',vg:0,direction:1,scanLabel:'正扫',points,step:0.01};
const settings=legacy.preset('balanced');

function plain(value){return JSON.parse(JSON.stringify(value));}
function stablePeaks(value){return plain(value).map(({id,...rest})=>rest);}
const legacyDetected=stablePeaks(legacy.detectPeaks(sweep,settings,{}));
const pluginDetected=stablePeaks(plugin.detectPeaks(sweep,settings,{}));
assert.deepStrictEqual(pluginDetected,legacyDetected,'Plugin peak detector changed mature detection output during migration.');

const probe={v:0.12,source:'auto',analysisLeft:-0.12,analysisRight:0.36};
const legacyMetric=plain(legacy.peakMetrics(probe,sweep));
const pluginMetric=plain(plugin.peakMetrics(probe,sweep));
assert.deepStrictEqual(pluginMetric,legacyMetric,'Plugin FWHM/baseline algorithm changed mature metric output during migration.');
assert(Number.isFinite(pluginMetric.fwhm)&&pluginMetric.fwhm>0,'Parity fixture must produce a valid FWHM.');
assert(['constant','linear'].includes(pluginMetric.baselineMode),'Parity fixture must exercise a valid baseline fit.');

console.log('Scientific Algorithm migration parity v3.52 checks passed.');
