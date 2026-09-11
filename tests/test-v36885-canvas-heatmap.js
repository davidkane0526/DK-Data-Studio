'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const stat=rel=>fs.statSync(path.join(root,rel)).size;

const rasterSource=read('src/core/scientific/heatmap-canvas-runtime.js');
const renderer=read('src/core/scientific/d3-chart-renderer.js');
const index=read('src/index.html');
const dedicated=read('src/plugin-window/runtime.js');
const css=read('src/styles/structure/sdk-semantic-surfaces.css');

assert(index.includes('core/scientific/heatmap-canvas-runtime.js'),'Main host must load the dedicated Canvas heatmap owner.');
assert(index.indexOf('core/scientific/heatmap-canvas-runtime.js')<index.indexOf('core/scientific/d3-chart-renderer.js'),'Canvas heatmap owner must load before D3 composition.');
assert(dedicated.includes("'heatmap-canvas-runtime':'../core/scientific/heatmap-canvas-runtime.js'"),'Dedicated TOP must expose the same Canvas heatmap owner.');
assert(dedicated.indexOf("'heatmap-canvas-runtime'")<dedicated.indexOf("'d3-chart-renderer'"),'Dedicated TOP stable infrastructure must place Canvas before D3.');
assert(renderer.includes('HeatmapCanvas.render(state.el')&&renderer.includes('HeatmapCanvas.hitTest(state.el')&&renderer.includes('HeatmapCanvas.exportLayer(state.el)'),'D3 must compose raster draw, SVG interaction, and export through the Canvas owner.');
assert(!renderer.includes("attr('class','dkds-d3-heat-cell')"),'Heatmaps must not create per-cell SVG rect nodes.');
assert(renderer.includes("attr('class','dkds-d3-heatmap-hit')"),'SVG must retain a lightweight interaction overlay above the Canvas raster.');
assert(css.includes('.dkds-scientific-heatmap-canvas{position:absolute')&&css.includes('.dkds-d3-chart-svg{position:relative;z-index:1'),'Canvas must remain behind the SVG axis/overlay layer.');
assert(stat('src/core/scientific/heatmap-canvas-runtime.js')<=48*1024,'Canvas heatmap owner must remain below 48 KiB.');
assert(stat('src/core/scientific/d3-chart-renderer.js')<=48*1024,'D3 renderer must remain below 48 KiB after Canvas composition.');
assert(stat('src/plugin-window/runtime.js')<=48*1024,'Dedicated TOP runtime must remain below 48 KiB.');

let canvas=null,removed=false,fillRects=0,clears=0,drawImages=0,putImages=0,canvasCreates=0;
const mainCtx={fillStyle:'',imageSmoothingEnabled:true,setTransform(){},clearRect(){clears++;},fillRect(){fillRects++;},drawImage(){drawImages++;}};
const scratchCtx={createImageData(width,height){return {data:new Uint8ClampedArray(width*height*4)};},putImageData(){putImages++;}};
const fakeCanvas={className:'',width:0,height:0,setAttribute(){},getContext:type=>type==='2d'?mainCtx:null,toDataURL:()=> 'data:image/png;base64,heatmap',remove(){removed=true;canvas=null;}};
const fakeScratch={width:0,height:0,getContext:type=>type==='2d'?scratchCtx:null};
const host={appendChild(node){canvas=node;},querySelector(selector){return selector.includes('dkds-scientific-heatmap-canvas')?canvas:null;}};
const document={createElement(tag){assert.equal(tag,'canvas');canvasCreates++;return canvasCreates===1?fakeCanvas:fakeScratch;}};
const context={window:{},globalThis:null,document,console,devicePixelRatio:1};context.globalThis=context;context.window=context;
vm.createContext(context);vm.runInContext(rasterSource,context,{filename:'heatmap-canvas-runtime.js'});
const Raster=context.DKDSScientificHeatmapCanvas;
assert(Raster&&Raster.VERSION==='1.0.0');

const size=500,z=Array.from({length:size},(_,y)=>Array.from({length:size},(_,x)=>y*size+x));z[12][34]=NaN;const xBands=Array.from({length:size},(_,i)=>({lo:i,hi:i+1,index:i})),yBands=Array.from({length:size},(_,i)=>({lo:i,hi:i+1,index:i}));
const analysisA=Raster.analyzeMatrix(z),analysisB=Raster.analyzeMatrix(z);assert.strictEqual(analysisA,analysisB,'Matrix analysis must be cached by the unchanged matrix identity.');assert.equal(analysisA.totalCells,250000);assert.equal(analysisA.finiteCells,249999);
const result=Raster.render(host,{width:500,height:500,plot:{x:0,y:0,width:500,height:500},xBands,yBands,z,color:value=>`rgb(${value%255},0,0)`,colorKey:'test-colors',background:'#fff'});
assert.equal(result.canvasCount,1);assert.equal(result.svgCellCount,0);assert.equal(result.paintedCells,249999);assert.equal(result.paintMode,'imageData');assert.equal(fillRects,1,'Regular matrices should use one background fill instead of 250k Canvas fillRect draw calls.');assert.equal(putImages,1,'Regular matrix pixels should be uploaded once into the detached raster buffer.');assert.equal(drawImages,1,'Regular matrix raster should be composited with one drawImage call.');
const missing=Raster.hitTest(host,34.5,12.5);assert.equal(missing.finite,false,'Missing/NaN heatmap cells must remain missing instead of becoming numeric zero.');const hit=Raster.hitTest(host,123.5,321.5);assert.deepEqual(JSON.parse(JSON.stringify(hit)),{xi:123,yi:321,value:160623,finite:true},'Canvas hit testing must preserve the exact source matrix indices.');
const beforePaint=result.paintCount,beforeUpload=putImages,beforeDraw=drawImages;assert.equal(Raster.repaint(host,{background:'#111'}),true);const after=Raster.snapshot(host);assert.equal(after.paintCount,beforePaint+1,'Theme repaint must reuse the resident matrix/geometry instead of rebuilding a new Canvas owner.');assert.equal(after.paintMode,'imageData-reuse');assert.equal(putImages,beforeUpload,'Theme-only repaint must not rebuild the 250k-cell pixel buffer.');assert.equal(drawImages,beforeDraw+1,'Theme-only repaint should only recompose the retained raster.');assert.strictEqual(Raster.analyzeMatrix(z),analysisA,'Theme repaint must retain cached scientific matrix analysis.');
const shiftedBands=xBands.map(row=>({lo:row.lo*1.1+2,hi:row.hi*1.1+2,index:row.index})),beforeGeometryUpload=putImages;const geometry=Raster.render(host,{width:560,height:500,plot:{x:2,y:0,width:550,height:500},xBands:shiftedBands,yBands,z,color:value=>`rgb(${value%255},0,0)`,colorKey:'test-colors',background:'#111'});assert.equal(geometry.paintMode,'imageData-reuse');assert.equal(putImages,beforeGeometryUpload,'Geometry-only render with unchanged matrix/colorscale must reuse the raster pixel buffer.');
const layer=Raster.exportLayer(host);assert(layer?.href.startsWith('data:image/png;base64,'),'SVG/PNG export composition must receive the Canvas raster snapshot.');
assert.equal(Raster.purge(host),true);assert.equal(removed,true);assert.equal(Raster.snapshot(host),null);assert(clears>=2);

console.log('v3.68.85 Canvas heatmap owner PASS: 500x500 => one Canvas, zero SVG cells, exact hit identity, repaint/export retained.');
