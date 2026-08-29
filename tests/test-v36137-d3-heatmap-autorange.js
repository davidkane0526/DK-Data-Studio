'use strict';
const fs=require('fs');
const path=require('path');
const {readCoreCss}=require('./css-source');
const vm=require('vm');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));


const contract=json('sdk/contract.json');
assert.equal(contract.sdkVersion,'1.21.0');
assert.equal(contract.pluginApiVersion,'1.18.0');
assert.equal(contract.minimumAppVersion,'3.65.0');

const scientific=read('src/core/scientific/plot-runtime.js');
const renderer=read('src/core/scientific/d3-chart-renderer.js');
const ter=read('src/plugins/ter-analysis/feature-runtime.js');
const terUtils=read('src/plugins/ter-analysis/feature-utils.js');
const css=readCoreCss(root);

assert(scientific.includes("const VERSION='2.5.0'"),'ScientificPlot must advance for nullable scalar-field limits.');
assert(renderer.includes("const VERSION='1.2.0'"),'D3 renderer must advance for heatmap and autorange corrections.');
assert(renderer.includes('function paddedLinearDomain')&&renderer.includes('autorangepadding')&&renderer.includes(':.045'),'D3 Cartesian autorange must add restrained Core-owned headroom before nice ticks.');
assert(renderer.includes('function scaleForHeatmapAxis')&&renderer.includes('numericEdges(values)'),'Heatmap axes must use cell edges instead of Cartesian point padding.');
assert(renderer.includes('function normalizedColorDomain')&&renderer.includes('trace.zmin,trace.zmax'),'Heatmap color domains must recover from absent or degenerate limits.');
assert(renderer.includes('function configuredAxis')&&renderer.includes('linearTickValues')&&renderer.includes("configuredAxis(d3,'right',cbScale,cb,5)"),'D3 axes/colorbars must honor explicit tick values and linear dtick controls.');
assert(renderer.includes("key.includes('cividis')")&&renderer.includes("key.includes('jet')")&&renderer.includes("key.includes('hot')"),'D3 heatmaps must support every first-party TER palette option.');
assert(renderer.includes('const rawValue=z?.[yi]?.[xi];if(!finite(rawValue))continue;const value=Number(rawValue);'),'Missing heatmap cells must be skipped instead of rendered as zero.');
assert(renderer.includes('return manual?scale:scale.nice()'),'Explicit Cartesian ranges must remain exact while automatic ranges use nice ticks.');
assert(renderer.includes("value!==null&&value!==undefined&&!(typeof value==='string'&&!value.trim())"),'D3 missing scalar values must not silently become numeric zero.');
assert(terUtils.includes("if(v===null||v===undefined||(typeof v==='string'&&!v.trim()))return null;"),'TER optional display limits must preserve automatic heatmap scaling.');
assert(css.includes('width:11px;height:20px;flex:0 0 11px')&&css.includes('width:23px;height:20px;min-width:23px'),'Scientific floating navigation chrome must keep the reduced 20 px control height without compressing its horizontal width.');

// scalarFieldSpec is pure enough to execute without a browser. Null/blank optional
// limits must stay absent so the D3 renderer derives the real matrix extent.
const context={window:{},console,structuredClone};
context.window.window=context.window;
vm.createContext(context);
vm.runInContext(scientific,context,{filename:'scientific-plot-runtime.js'});
const spec=context.window.DKDSScientificPlot.scalarFieldSpec({x:[-1,0,1],y:[-2,2],z:[[1,2,3],[4,5,6]],valueName:'TER',valueUnit:'%'},{zmin:null,zmax:'',colorscale:'Viridis'});
assert(!Object.prototype.hasOwnProperty.call(spec.traces[0],'zmin'),'Null zmin must mean automatic color scale, not zero.');
assert(!Object.prototype.hasOwnProperty.call(spec.traces[0],'zmax'),'Blank zmax must mean automatic color scale, not zero.');
assert.deepEqual(spec.traces[0].z,[[1,2,3],[4,5,6]]);

const rendererContext={window:{},console,structuredClone,queueMicrotask};
rendererContext.globalThis=rendererContext;
vm.createContext(rendererContext);
vm.runInContext(renderer,rendererContext,{filename:'d3-chart-renderer.js'});
const geometry=rendererContext.window.DKDSD3Renderer.geometry;
assert(geometry,'D3 renderer must expose pure geometry diagnostics for regression testing.');
const padded=Array.from(geometry.paddedLinearDomain([-40,40],{}));
assert(Math.abs(padded[0]+43.6)<1e-9&&Math.abs(padded[1]-43.6)<1e-9,'Default Cartesian auto padding must add 4.5% headroom before nice ticks.');
assert.deepEqual(Array.from(geometry.paddedLinearDomain([-40,40],{autorangepadding:0})),[-40,40]);
assert.deepEqual(Array.from(geometry.numericEdges([-2,-1,0,1,2])),[-2.5,-1.5,-0.5,0.5,1.5,2.5]);
assert.deepEqual(Array.from(geometry.normalizedColorDomain([1,2,3,6],null,'')),[1,6]);
assert.deepEqual(Array.from(geometry.linearTickValues([-2,2],1)),[-2,-1,0,1,2]);

console.log('v3.61.38 D3 heatmap + autorange contract PASS');
