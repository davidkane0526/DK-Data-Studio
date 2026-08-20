const assert=require('assert');
const path=require('path');
const root=path.resolve(__dirname,'..');
global.DKDSScience={};
require(path.join(root,'src/science/common.js'));
require(path.join(root,'src/science/peaks.js'));
require(path.join(root,'src/science/ter.js'));
const A=global.DKDSScience;

{
 const expected=.30,points=[];
 for(let n=0;n<=200;n++){
   const v=-1+n*.01,baseline=.20+.12*v;
   const resonance=Math.exp(-4*Math.log(2)*v*v/(expected*expected));
   points.push({v,i:baseline+resonance});
 }
 const sweep={id:'fwhm-test',points,step:.01};
 const legacyPeak={v:0,i:1.2,widthLeft:-.15,widthRight:.15};
 const autoWindow=A.peakAnalysisWindow(legacyPeak,sweep);
 assert(autoWindow.left<-.15&&autoWindow.right>.15,'legacy width endpoints must seed a wider baseline-analysis window');
 const metric=A.peakMetrics(legacyPeak,sweep);
 assert.equal(metric.baselineMode,'linear','tilted background should select a local linear baseline');
 assert(Math.abs(metric.fwhm-expected)<.004,`expected FWHM≈${expected}, got ${metric.fwhm}`);
 assert(Math.abs(metric.baselineSlope-.12)<.01,'local baseline slope should recover the injected tilt');
 assert(Number.isFinite(metric.fwhmLeft)&&Number.isFinite(metric.fwhmRight),'FWHM crossings must be interpolated');
 const narrow=A.peakMetrics({...legacyPeak,analysisLeft:-.50,analysisRight:.50},sweep);
 const wide=A.peakMetrics({...legacyPeak,analysisLeft:-.70,analysisRight:.70},sweep);
 assert(Math.abs(narrow.fwhm-wide.fwhm)<.003,'reasonable analysis-window changes should not redefine FWHM itself');
}
{
 const linear=[],steep=[];
 for(let k=-5;k<=5;k++){linear.push({v:k*.2,i:2*k*.2});steep.push({v:k*.2,i:5*k*.2});}
 const sweeps=[
  {id:'matrix-a-up',datasetName:'a.csv',vg:0,direction:1,step:.2,points:linear},
  {id:'matrix-b-up',datasetName:'b.csv',vg:0,direction:1,step:.2,points:steep},
  {id:'matrix-a-down',datasetName:'a.csv',vg:0,direction:-1,step:.2,points:linear.map(p=>({v:p.v,i:3*p.v}))}
 ];
 const didv=A.computeSweepTransformMatrix(sweeps,[-.4,0,.4],[0],{type:'didv',direction:1,tolerance:.011,sourceFileByVg:{'0':'a.csv'}});
 assert.equal(didv.label,'dI/dV');assert.equal(didv.unit,'A/V');
 assert.deepEqual(didv.matrix.map(r=>r.length),[3]);
 assert(didv.matrix[0].every(v=>Math.abs(v-2)<1e-9),'dI/dV matrix must match the shared derivative transform');
 const preferred=A.computeSweepTransformMatrix(sweeps,[.4],[0],{type:'raw',direction:1,tolerance:.011,sourceFileByVg:{'0':'b.csv'}});
 assert(Math.abs(preferred.matrix[0][0]-2)<1e-12&&preferred.sources[0]==='b.csv','duplicate Vg rows must follow the TER-selected source file');
 const reverse=A.computeSweepTransformMatrix(sweeps,[.4],[0],{type:'raw',direction:-1,tolerance:.011});
 assert(Math.abs(reverse.matrix[0][0]-1.2)<1e-12,'forward and reverse transformed heatmaps must remain separate');
}
console.log('Baseline-corrected FWHM + shared Vg-Vd transform-matrix checks passed.');
