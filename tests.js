const A=require('./src/analysis.js');
function assert(c,m){if(!c)throw new Error(m);}

// 1) Scan reconstruction: 0 -> +2 -> -2 -> 0 must become ONE forward + ONE reverse sweep.
const pts=[];
for(let v=0;v<=2.0001;v+=.02)pts.push({v:+v.toFixed(2),i:v});
for(let v=2;v>=-2.0001;v-=.02)pts.push({v:+v.toFixed(2),i:v});
for(let v=-2;v<=0.0001;v+=.02)pts.push({v:+v.toFixed(2),i:v});
const ds={path:'x.csv',name:'x.csv',vg:0,points:pts};
const sweeps=A.buildSweeps(ds);
assert(sweeps.filter(s=>s.direction>0).length===1,'positive sweep should merge into one');
assert(sweeps.filter(s=>s.direction<0).length===1,'reverse sweep should be one');
const up=sweeps.find(s=>s.direction>0);
assert(up.points[0].v<-1.99&&up.points.at(-1).v>1.99,'merged positive sweep should cover -2..+2');

// 2) Algorithm identity is shape metadata, not a physical peak class/color.
assert(A.ALG_SYMBOLS.raw==='circle','raw should map to circle');
assert(A.ALG_SYMBOLS.snr==='diamond','snr should map to diamond');
assert(A.ALG_SYMBOLS.diff==='triangle','diff should map to triangle');
assert(A.ALG_SYMBOLS.detrend==='square','detrend should map to square');
assert(A.ALG_SYMBOLS.curvature==='cross','curvature should map to cross');

// 3) TER pairs forward/reverse peaks by USER PEAK LABEL, not detection algorithm.
const fakeSweeps=[
  {id:'u',datasetPath:'x',vg:10,direction:1,step:.1,points:[{v:.9,i:1.8},{v:1,i:2},{v:1.1,i:2.2}]},
  {id:'d',datasetPath:'x',vg:10,direction:-1,step:.1,points:[{v:.9,i:.9},{v:1,i:1},{v:1.1,i:1.1}]}
];
const fakePeaks=[
  {id:'p1u',sweepId:'u',accepted:true,peakLabel:'峰1',vg:10,direction:1,v:1,i:2},
  {id:'p1d',sweepId:'d',accepted:true,peakLabel:'峰1',vg:10,direction:-1,v:1,i:1},
  {id:'p2u',sweepId:'u',accepted:true,peakLabel:'峰2',vg:10,direction:1,v:1,i:5},
  {id:'p2d',sweepId:'d',accepted:true,peakLabel:'峰2',vg:10,direction:-1,v:1,i:4}
];
const ter=A.computeTerForLabel(fakePeaks,fakeSweeps,'峰1');
assert(ter.length===1,'TER should pair same peak label');
assert(Math.abs(ter[0].ter-100)<1e-9,'TER for 2/1 should be 100%');

console.log('All tests passed.', {
  sweeps:sweeps.map(s=>[s.scanLabel,s.points[0].v,s.points.at(-1).v]),
  symbols:A.ALG_SYMBOLS,
  ter:ter[0].ter
});


// 4) UI contract smoke checks for v2.5 interaction controls.
const fs=require('fs');
const appSource=fs.readFileSync('./src/app.js','utf8');
const htmlSource=fs.readFileSync('./src/index.html','utf8');
const resonancePluginSource=fs.readFileSync('./src/plugins/resonance-workbench/plugin.js','utf8');
const detectorPluginSource=fs.readFileSync('./src/plugins/resonance-detector-robust/plugin.js','utf8');
const terPluginSource=fs.readFileSync('./src/plugins/ter-analysis/plugin.js','utf8');
const pulsePluginSource=fs.readFileSync('./src/plugins/pulse-analysis/plugin.js','utf8');
assert(appSource.includes("Ctrl+框选缩放完成")&&appSource.includes("pointerdown"),'main plot should support direct Ctrl+drag box zoom');
assert(resonancePluginSource.includes("ArrowUp")&&resonancePluginSource.includes("ArrowDown"),'resonance plugin must own up/down curve switching shortcuts');
assert(resonancePluginSource.includes("moveSelectedPeakBy")&&resonancePluginSource.includes("ArrowRight"),'resonance plugin must own left/right peak movement shortcuts');
assert(appSource.includes("showlegend:false"),'small trend charts should use custom per-card legends');
assert(appSource.includes("scrollZoom:true"),'zoomed trend chart should support wheel zoom');
assert(!htmlSource.includes('mainBoxZoomBtn')&&htmlSource.includes('mainResetViewBtn'),'box zoom should no longer require a mode button; reset control must remain');
assert(htmlSource.includes('data-trend-cols="3"'),'group panel should support explicit 3-column layout');
assert(htmlSource.includes('data-trend-cols="auto"'),'group panel should support automatic layout');
assert(appSource.includes('trend-card-legend'),'each subplot should have its own horizontal legend');
assert(appSource.includes("event.ctrlKey"),'Ctrl mouse interactions should exist');
assert(appSource.includes("contextmenu"),'Ctrl+right-click deletion should exist');
assert(appSource.includes("addManualPeak(sw,d3.pointer(event,mainSvg.node())[0],x)"),'Ctrl+left click should add a snapped manual peak');
console.log('UI contract checks passed.');

// 5) v2.5 category/color contract.
assert(!appSource.includes('customColorInput'),'arbitrary color picker must be removed');
assert(appSource.includes('colorForPeakOrder'),'all peak colors should come from one category/direction mapping');
assert(resonancePluginSource.includes('peak-category-choice'),'resonance inspector plugin must classify peaks by existing category swatches');
assert(resonancePluginSource.includes('data-add-cat'),'resonance inspector plugin must allow adding a new category/color pair');
assert(appSource.includes(".on('dblclick',(event,d)=>"),'double-clicking a peak should be handled');
assert(appSource.includes('showInspectorPanel'),'peak click/double-click should open inspector');
assert(!appSource.includes('TER_COLORS'),'TER must not use a separate unrelated palette');
assert(resonancePluginSource.includes('_forwardColor')&&resonancePluginSource.includes('_reverseColor'),'resonance TER chart plugin must carry exact forward/reverse peak colors');

assert(htmlSource.includes('groupDockBtn')&&htmlSource.includes('groupMinimizeBtn'),'group panel should support dock/minimize controls');
assert(htmlSource.includes('dockedGroupSlot'),'main workspace should include bottom docking slot');
assert(appSource.includes('toggleGroupDock')&&appSource.includes('toggleGroupMinimize'),'dock/minimize logic must exist');
assert(appSource.includes('groupPanelDockHeight'),'docked group height must be tracked');
assert(appSource.includes('exportMainPng'),'main plot PNG export must exist');
assert(appSource.includes("key.toLowerCase()==='s'")&&appSource.includes("key.toLowerCase()==='o'"),'project save/open shortcuts must exist');
console.log('v2.5 category/color checks passed.');


// v2.6 layout regression checks: never fabricate fallback SVG dimensions.
const appV26 = fs.readFileSync('./src/app.js','utf8');
const cssV26 = fs.readFileSync('./src/style.css','utf8');
assert(appV26.includes('function measureMainPlot()'),'v2.6 must measure actual main plot box');
assert(appV26.includes('function scheduleMainPlotRelayout'),'v2.6 must defer relayout until CSS grid settles');
assert(!appV26.includes('Math.max(300,wrap.clientWidth),height=Math.max(300,wrap.clientHeight)'),'old fabricated 300px canvas fallback must be removed');
assert(true,'v2.8 supersedes preserveAspectRatio-based workaround by removing viewBox entirely');
assert(appV26.includes("mainObserver.observe($('.main-area'))"),'main-area layout changes must trigger redraw');
assert(appV26.includes("mainObserver.observe($('#dockedGroupSlot'))"),'dock slot layout changes must trigger redraw');
assert(cssV26.includes('#mainPlot{min-width:0;min-height:0;max-width:100%;max-height:100%;}'),'SVG must be bounded by grid cell');
console.log('v2.6 main-layout regression checks passed.');


// v2.7 multi-project / physics / locked-peak workflow contract checks
const appV27 = fs.readFileSync('./src/app.js','utf8');
const htmlV27 = fs.readFileSync('./src/index.html','utf8');
assert(htmlV27.includes('id="projectTabs"')&&htmlV27.includes('id="newProjectTabBtn"'),'v2.7 must expose project tabs');
assert(appV27.includes('function captureActiveProjectTab()')&&appV27.includes('function mountProjectTab(t)'),'project state must be explicitly isolated per tab');
assert(appV27.includes('state.projectTabs.push(tab)')&&appV27.includes('已在新标签页打开工程'),'open project should create a new tab rather than overwrite active project');
assert(resonancePluginSource.includes("elementId:'rangeActionMenu'")&&resonancePluginSource.includes("id:'resonanceLockTool'"),'resonance plugin must own direct multi-peak range menu and lock control');
assert(appV27.includes('function openRangeActionMenu')&&appV27.includes('function selectPeaksInRange'),'main plot must implement direct peak range selection');
assert(appV27.includes('const preserved=state.peaks.filter(p=>p.manual||p.locked)'),'rerun must preserve locked automatic peaks');
assert(appV27.includes('!fixed.some(q=>Math.abs(q.v-p.v)<=tol)'),'new auto peaks must not duplicate locked/manual peaks');
assert(appV27.includes('function physicalAnalysis()'),'physical mechanism analysis must exist');
const physicsCoreV27=fs.readFileSync('./src/science/physics.js','utf8');
assert(physicsCoreV27.includes("M1：零转角静态两-ridge 模型优先")&&physicsCoreV27.includes("M3：存在额外稳定 ridge"),'physical model hierarchy must be present in shared science engine');
assert(resonancePluginSource.includes("panelId:'physicsPanel'")&&resonancePluginSource.includes('id="showPhysicsLabels"'),'resonance plugin must own physics panel and main-plot-label UI');
console.log('v2.7 multi-project / physics / locking checks passed.');


// v2.8 regression / keyboard review checks
const appV28 = fs.readFileSync('./src/app.js','utf8');
const cssV28 = fs.readFileSync('./src/style.css','utf8');
const htmlV28 = fs.readFileSync('./src/index.html','utf8');

assert(appV28.includes("// v2.8: do NOT use viewBox at all."),'v2.8 must explicitly use pixel-coordinate SVG rendering');
assert(appV28.includes(".attr('viewBox',null)")&&appV28.includes(".style('left','0px')")&&appV28.includes(".style('top','0px')"),'main SVG must clear viewBox and force origin');
assert(!appV28.includes(".attr('viewBox',`0 0 ${width} ${height}`)"),'main plot must not recreate a viewBox');
assert(appV28.includes("Math.abs(svgRect.left-wrapRect.left)>2"),'geometry watchdog must detect SVG origin drift');
assert(cssV28.includes(".physics-type-label.dimmed{opacity:.08!important}"),'unselected physical labels must dim');
assert(resonancePluginSource.includes("id:'resonancePhysicsLabelsTool'"),'resonance plugin must contribute the main-plot physics-label toggle');
assert(appV28.includes('function autoSelectSinglePeakInCurrentView(sw)'),'curve keyboard switching must support unique-peak auto selection');
assert(appV28.includes('当前视野仅 1 个峰'),'status must report automatic peak selection');
assert(resonancePluginSource.includes("if(key==='p'||key==='P')")&&resonancePluginSource.includes('togglePhysicsLabels'),'P shortcut must be owned by resonance plugin and toggle physical labels');
console.log('v2.8 SVG geometry / focus / keyboard checks passed.');


// v2.9 peak-spacing / Python-equivalent TER_max checks
const appV29 = fs.readFileSync('./src/app.js','utf8');
const htmlV29 = fs.readFileSync('./src/index.html','utf8');
const analysisV29 = require('./src/analysis.js');

assert(resonancePluginSource.includes('id="spacingSeriesA"')&&resonancePluginSource.includes('id="spacingSeriesB"')&&resonancePluginSource.includes("buttonId:'openSpacingPageBtn'"),'peak spacing page/dropdowns and plugin toolbar entry must exist');
assert(terPluginSource.includes("pageId:'terMaxPage'")&&terPluginSource.includes("id:'ter'"),'dedicated TER_max page must be plugin-owned and exposed as a TER activity');
assert(typeof analysisV29.computeTerMatrix==='function','TER matrix JS implementation must be exported');

// Synthetic raw acquisition with repeated turning points:
// V=+1 has up I=2 A and down I=4 A -> R_up=.5, R_down=.25 -> TER=100%.
const synthetic={
  name:'vg=0.csv',path:'synthetic',vg:0,
  points:[
    {v:0,i:1},{v:1,i:2},{v:1,i:4},{v:0,i:1},
    {v:-1,i:-2},{v:-1,i:-4},{v:0,i:1}
  ]
};
const terRes=analysisV29.computeTerMatrix([synthetic],{vmin:-1,vmax:1,vstep:1,tolerance:0.05,currentFloor:1e-15});
const plus=terRes.records.find(r=>r.vds===1);
assert(plus&&Math.abs(plus.rUp-.5)<1e-12&&Math.abs(plus.rDown-.25)<1e-12,'TER must calculate resistance at the same Vds for up/down');
assert(Math.abs(plus.ter-100)<1e-12,'high-low TER at +1 V should be 100%');
assert(terRes.terMax.length===1&&Math.abs(terRes.terMax[0].terMax-100)<1e-12,'TER_max must be max over Vds for each Vg');
assert(!terRes.targets.includes(0),'TER voltage grid must exclude Vds=0 like ter_matrix.py');
console.log('v2.9 spacing / TER_max checks passed.');


// v3.0 toolbar / peak-TER / heatmap-display checks
const appV30 = fs.readFileSync('./src/app.js','utf8');
const htmlV30 = fs.readFileSync('./src/index.html','utf8');
const cssV30 = fs.readFileSync('./src/style.css','utf8');

assert(htmlV30.includes('id="activityBar"')&&htmlV30.includes('id="pluginToolbarAnalysis"')&&htmlV30.includes('id="contextOverflowBtn"'),'topbar must use activity/context-aware grouped controls with overflow');
assert(cssV30.includes('.toolbar-btn{height:30px'),'toolbar buttons must have normalized compact height');
assert(resonancePluginSource.includes("resonance-ter")&&resonancePluginSource.includes('共振位 TER（双向候选）'),'resonance group-chart plugin must expose same-Vd resonant TER');
assert(resonancePluginSource.includes('computeResonantTerForLabel'),'resonance TER group-chart provider must use resonant same-Vd TER');
assert(terPluginSource.includes('id=\\\"terColorMin\\\"')&&terPluginSource.includes('id=\\\"terColorMax\\\"'),'TER plugin heatmap color limits must be adjustable');
assert(terPluginSource.includes('id=\\\"terColorTick\\\"')&&terPluginSource.includes('id=\\\"terXTick\\\"')&&terPluginSource.includes('id=\\\"terYTick\\\"'),'TER plugin heatmap scale/axis ticks must be adjustable');
assert(true,'v3.2 supersedes the v3.0 rectangular heatmap requirement with a square heatmap');
assert(appV30.includes("colorscale:hd.colorscale||'Viridis'"),'heatmap color scale must use UI setting');
assert(appV30.includes("dtick:hd.colorDtick||undefined"),'colorbar tick interval must be applied');
console.log('v3.0 toolbar / peak TER / heatmap controls checks passed.');


// v3.1 packaged-only 30-day expiry contract
const mainV31 = fs.readFileSync('./main.js','utf8');
const pkgV31 = JSON.parse(fs.readFileSync('./package.json','utf8'));
const buildGeneratorV31 = fs.readFileSync('./scripts/generate-build-info.js','utf8');

assert(mainV31.includes('if (!app.isPackaged) return;'),'expiry guard must bypass development mode');
assert(mainV31.includes('const PACKAGED_TRIAL_DAYS = 30;'),'packaged trial duration must be 30 days');
assert(mainV31.includes('process.exit(0);'),'expired packaged build must terminate immediately');
assert(mainV31.includes('const scheduleNextExpiryCheck = () =>'),'running packaged app must schedule expiry checks');
assert(mainV31.includes('Math.min(remainingMs, PACKAGED_EXPIRY_MAX_TIMER_MS)'),'final packaged expiry check must converge on the exact deadline');
assert(mainV31.includes("path.join(__dirname, 'build-info.json')"),'packaged app must read build-time metadata');
assert(pkgV31.scripts.dist.includes('node scripts/prepare-build.js')&&pkgV31.scripts.dist.includes('electron-builder'),'dist must run build preparation immediately before packaging');
assert(fs.readFileSync('./scripts/prepare-build.js','utf8').includes('generate-build-info.js'),'prepare-build must regenerate packaged expiry metadata');
assert(pkgV31.build.files.includes('build-info.json'),'build-info.json must be bundled in packaged app');
assert(buildGeneratorV31.includes('durationDays = 30'),'build generator must write 30-day expiry');
assert(buildGeneratorV31.includes('builtAtMs + durationDays * 24 * 60 * 60 * 1000'),'expiry must be computed from actual build time');
console.log('v3.1 packaged-expiry checks passed.');


// v3.2 TER matrix square / Max-Vg / Max-Vd
const appV32 = fs.readFileSync('./src/app.js','utf8');
const htmlV32 = fs.readFileSync('./src/index.html','utf8');
const cssV32 = fs.readFileSync('./src/style.css','utf8');
const analysisV32 = require('./src/analysis.js');

assert(terPluginSource.includes('TER(Vd, Vg) 全组合热图'),'TER plugin page must explicitly describe full Vd-Vg matrix');
assert(cssV32.includes('aspect-ratio:1 / 1'),'TER heatmap canvas must be square');
assert(terPluginSource.includes('id=\\\"terMaxVgPlot\\\"')&&terPluginSource.includes('id=\\\"terMaxVdPlot\\\"'),'TER plugin must contain both Max-Vg and Max-Vd plots');
assert(terPluginSource.includes('id=\\\"terExportMaxVgBtn\\\"')&&terPluginSource.includes('id=\\\"terExportMaxVdBtn\\\"'),'TER plugin must expose both max-reduction exports');
assert(appV32.includes("savePlotlyImage('terMaxVgPlot','TER_Max-Vg','svg')"),'TER_Max-Vg must export SVG');
assert(appV32.includes("savePlotlyImage('terMaxVdPlot','TER_Max-Vd','png')"),'TER_Max-Vd must export PNG');

// 2 Vg × 2 Vd synthetic matrix with distinct row/column maxima.
const syntheticA={
  name:'vg=0.csv',path:'a',vg:0,
  points:[
    {v:0,i:1},{v:1,i:2},{v:2,i:4},{v:2,i:2},{v:1,i:4},{v:0,i:1},
    {v:-1,i:-2},{v:-2,i:-4},{v:-2,i:-2},{v:-1,i:-4},{v:0,i:1}
  ]
};
const syntheticB={
  name:'vg=10.csv',path:'b',vg:10,
  points:[
    {v:0,i:1},{v:1,i:4},{v:2,i:2},{v:2,i:8},{v:1,i:2},{v:0,i:1},
    {v:-1,i:-4},{v:-2,i:-2},{v:-2,i:-8},{v:-1,i:-2},{v:0,i:1}
  ]
};
const res32=analysisV32.computeTerMatrix([syntheticA,syntheticB],{vmin:-2,vmax:2,vstep:1,tolerance:.05,currentFloor:1e-15});
assert(Array.isArray(res32.terMaxByVg)&&res32.terMaxByVg.length===2,'TER_Max-Vg must return one maximum per Vg');
assert(Array.isArray(res32.terMaxByVd)&&res32.terMaxByVd.length===4,'TER_Max-Vd must return one maximum per nonzero Vd when finite');
assert(res32.terMax===res32.terMaxByVg,'legacy terMax alias must point to TER_Max-Vg');
console.log('v3.2 TER square / Max-Vg / Max-Vd checks passed.');


// v3.3 gate-voltage physical analysis dashboard
const appV33 = fs.readFileSync('./src/app.js','utf8');
const htmlV33 = fs.readFileSync('./src/index.html','utf8');

assert(resonancePluginSource.includes("pageId:'gateAnalysisPage'")&&resonancePluginSource.includes("buttonId:'openGateAnalysisPageBtn'"),'gate analysis page/plugin button must exist');
assert(resonancePluginSource.includes('id="gateSeriesA"')&&resonancePluginSource.includes('id="gateSeriesB"'),'resonance plugin gate UI must allow two ridge dropdowns');
assert(resonancePluginSource.includes('id="gateV0Plot"')&&resonancePluginSource.includes('id="gateDeltaPlot"'),'plugin gate UI must include V0 and delta plots');
assert(resonancePluginSource.includes('id="gateWidthPlot"')&&resonancePluginSource.includes('id="gateTerCorrelationPlot"'),'plugin gate UI must include width and TER correlation plots');
assert(resonancePluginSource.includes('id="gateVdStarPlot"')&&resonancePluginSource.includes('id="gateReadoutCorrelationPlot"'),'plugin gate UI must include Vd* plots');
assert(resonancePluginSource.includes('id="gateAmplitudePlot"')&&resonancePluginSource.includes('id="gateBackgroundPlot"'),'plugin gate UI must include amplitude/background plots');
assert(resonancePluginSource.includes('id="gateHysteresisPlot"'),'plugin gate UI must include scan-direction hysteresis plot');
assert(resonancePluginSource.includes('id="gateUseCarrierDensity"')&&resonancePluginSource.includes('id="gateCg"')&&resonancePluginSource.includes('id="gateCnp"'),'plugin gate UI must include optional carrier-density controls');
assert(appV33.includes('function computeGateAnalysis()'),'gate analysis calculation function must exist');
assert(fs.readFileSync('./src/science/gate.js','utf8').includes('deltaOverW:hwhmEff>0?Math.abs(delta)/hwhmEff:NaN'),'delta/w must use effective HWHM in shared gate-analysis engine');
assert(appV33.includes('η_eff=A_A/(A_A+A_B)'),'effective electrical weight must be explicitly labeled');
assert(resonancePluginSource.includes('不把它自动当作 coercive voltage')||appV33.includes('不把它自动当作 coercive voltage'),'hysteresis must not be mislabeled as coercive voltage');
assert(appV33.includes('当前工程没有独立的“switching step / jump”对象'),'report must explicitly refuse to fabricate Vc from resonance peaks');
assert(appV33.includes('Pearson r'),'automatic report must include quantitative correlation analysis');
assert(appV33.includes("defaultName:'gate_physics_analysis.csv'")&&appV33.includes("defaultName:'gate_physics_analysis_report.md'"),'gate analysis data and report exports must exist');
console.log('v3.3 gate-voltage physical analysis checks passed.');


// v3.4 transform-assisted smart detection + raw-IV projection + clipboard CSV
const appV34 = fs.readFileSync('./src/app.js','utf8');
const htmlV34 = fs.readFileSync('./src/index.html','utf8');
const mainV34 = fs.readFileSync('./main.js','utf8');
const preloadV34 = fs.readFileSync('./preload.js','utf8');
const analysisV34 = require('./src/analysis.js');

assert(typeof analysisV34.transformSweep==='function','v3.4 must expose transformSweep');
const transformSweepV34={
  id:'transform-test',datasetPath:'x',datasetName:'x',vg:0,direction:1,step:.01,
  points:Array.from({length:101},(_,k)=>{
    const v=-.5+k*.01;
    return {v,i:1e-9*(1+v)+4e-10*Math.exp(-.5*((v-.12)/.045)**2)};
  })
};
for(const type of ['raw','detrend','didv','d2idv2','dlog','dvdi','resistance']){
  const t=analysisV34.transformSweep(transformSweepV34,type);
  assert(t.points.length===transformSweepV34.points.length,`transform ${type} must preserve Vd sampling grid`);
  assert(t.points.every((p,i)=>p.v===transformSweepV34.points[i].v),`transform ${type} must preserve original Vd coordinates`);
}
const detectedV34=analysisV34.detectPeaks(transformSweepV34,analysisV34.preset('balanced'));
for(const peak of detectedV34){
  assert(transformSweepV34.points.some(p=>p.v===peak.v&&p.i===peak.i),'every auto peak must land on an original raw I-V sample');
  assert(['raw-local-maximum','raw-residual-projection'].includes(peak.projectionMethod),'auto peak must record raw-I projection method');
}
assert(appV34.includes("['dlog','d ln|I|/dV']")&&appV34.includes("['resistance','R=|V/I|']"),'dataset transform selector must include log-derivative and resistance');
assert(resonancePluginSource.includes('智能寻峰 / 补峰')&&resonancePluginSource.includes('算法参数'),'peak-finding workflow UI must be owned by the resonance plugin and keep a simple preset-first flow');
assert(mainV34.includes("ipcMain.handle('clipboard:writeText'")&&mainV34.includes('clipboard.writeText'),'Electron main process must expose system clipboard write');
assert(preloadV34.includes("copyText: text => ipcRenderer.invoke('clipboard:writeText', text)"),'preload must expose clipboard copy');
for(const id of ['copyMainCsvBtn','zoomCopyCsv']){
  assert(htmlV34.includes(`id="${id}"`),`missing core CSV clipboard button ${id}`);
}
for(const id of ['gateAnalysisCopyCsvBtn','spacingCopyCsvBtn']){
  assert(resonancePluginSource.includes(`id="${id}"`),`missing resonance-plugin CSV clipboard button ${id}`);
}
for(const id of ['terCopyLongBtn','terCopyMatrixBtn','terCopyMaxVgBtn','terCopyMaxVdBtn']){
  assert(terPluginSource.includes(`id=\\\"${id}\\\"`),`missing TER-plugin CSV clipboard button ${id}`);
}
assert(resonancePluginSource.includes("id:'copyPeakParameters'"),'resonance plugin export menu must provide peak CSV copy');
assert(appV34.includes('trend-copy-btn'),'dynamic group-plot CSV must also have copy action');
console.log('v3.4 smart detection / transform / clipboard checks passed.');


// v3.8 trusted-LAN keyless hot-update architecture
const mainV38 = fs.readFileSync('./main.js','utf8');
const preloadV38 = fs.readFileSync('./preload.js','utf8');
const updateClientV38 = fs.readFileSync('./update-client.js','utf8');
const serverV38 = fs.readFileSync('./services/update-server/server.js','utf8');
const publishV38 = fs.readFileSync('./services/update-server/publish-release.js','utf8');
const pkgV38 = JSON.parse(fs.readFileSync('./package.json','utf8'));
const htmlV38 = fs.readFileSync('./src/index.html','utf8');
const prepareV38 = fs.readFileSync('./scripts/prepare-build.js','utf8');

assert(pkgV38.dependencies['electron-updater'],'electron-updater must remain an app dependency');
assert(pkgV38.dependencies.ws,'ws must remain an app/server dependency');
assert(pkgV38.build.win.target.some(x => typeof x==='object'&&x.target==='nsis'),'Windows build must include NSIS for electron-updater');
assert(pkgV38.build.win.target.some(x => typeof x==='object'&&x.target==='portable'),'Windows build should retain portable distribution');
assert(pkgV38.build.publish?.[0]?.provider==='generic','build must generate generic-provider update metadata');
assert(!pkgV38.build.files.includes('update-public-key.pem'),'keyless trusted-LAN client must not require an update public key');
assert(!pkgV38.scripts['setup:update-key'],'key setup npm script must be removed');
assert(!fs.existsSync('./scripts/generate-update-keys.js'),'key generator must be removed');
assert(!fs.existsSync('./SETUP_UPDATE_KEYS.cmd'),'key setup CMD must be removed');
assert(mainV38.includes("new LanUpdateClient({ app, BrowserWindow })"),'main process must initialize LAN updater');
assert(preloadV38.includes('updateCheckNow')&&preloadV38.includes('onUpdateStatus'),'renderer bridge must expose updater operations/status');
assert(!updateClientV38.includes('crypto.verify')&&!updateClientV38.includes('publicKey'),'client must not depend on Ed25519/public keys');
assert(updateClientV38.includes("new NsisUpdater({"),'client must use NSIS updater');
assert(updateClientV38.includes("disableWebInstaller = true"),'NSIS web-installer updates must be disabled');
assert(updateClientV38.includes("this.canApply = !!app.isPackaged && !this.isPortable"),'development and portable builds must not perform in-place NSIS update');
assert(updateClientV38.includes("socket.addMembership(group)"),'client must support multicast LAN discovery');
assert(updateClientV38.includes("new WebSocket(url"),'client must connect to LAN push channel');
assert(updateClientV38.includes("releaseFeedUrl(baseUrl, version)"),'client must use a version-specific LAN feed');
assert(serverV38.includes("new WebSocketServer({ server, path: '/push' })"),'server must provide WebSocket push endpoint');
assert(serverV38.includes("udp.send(payload"),'server must multicast discovery announcements');
assert(serverV38.includes("'Accept-Ranges': 'bytes'"),'server must support byte ranges for updater/differential downloads');
assert(!publishV38.includes('crypto.sign')&&!publishV38.includes('privateKey'),'publisher must not require signing keys');
assert(publishV38.includes("fs.renameSync(tempPath, releasePath)"),'release publication must remain atomic');
assert(publishV38.includes("mode: 'trusted-lan'"),'current release metadata must identify trusted-LAN mode');
assert(prepareV38.includes('generate-build-info.js')&&!prepareV38.includes('generate-update-keys'),'build preparation must only generate packaged build metadata');
assert(htmlV38.includes('id="updatePanel"')&&htmlV38.includes('id="updateInstallBtn"'),'renderer must expose update status/settings/install UI');
assert(htmlV38.includes('可信局域网简化模式')&&htmlV38.includes('SHA512'),'update UI must clearly describe keyless trusted-LAN integrity model');
assert(fs.existsSync('./GRS.cmd')&&fs.existsSync('./GRS_GUI.cmd'),'consolidated CLI/GUI Windows entry points must exist');
const grsToolsV38=fs.readFileSync('./tools/windows/grs-tools.ps1','utf8');
assert(grsToolsV38.includes("'update-server'")&&grsToolsV38.includes("'publish-update'")&&grsToolsV38.includes("'build-publish-update'"),'unified Windows backend must own update-server/publish workflows');
assert(grsToolsV38.includes("'update-autostart-install'")&&grsToolsV38.includes("'update-autostart-remove'"),'unified Windows backend must own update-server autostart workflows');
console.log('v3.8 trusted-LAN keyless hot-update checks passed.');

// v3.6 one-click peak order sorting
const appV36 = fs.readFileSync('./src/app.js','utf8');
const htmlV36 = fs.readFileSync('./src/index.html','utf8');

assert(resonancePluginSource.includes("id:'resonanceSortTool'"),'resonance plugin must provide peak-order sort main tool');
assert(resonancePluginSource.includes('跨 Vg 智能整理峰序'),'resonance inspector plugin must provide intelligent one-click sort');
assert(appV36.includes('function sortPeakOrderByVd()'),'peak order sorting function must exist');
assert(appV36.includes(".filter(p=>p.sweepId===sw.id&&p.accepted)"),'only accepted peaks should count in automatic peak order');
assert(appV36.includes(".sort((a,b)=>a.v-b.v)"),'peak order must be based on ascending raw Vd');
assert(appV36.includes("snapshot('跨 Vg 智能峰序排序')"),'peak sorting must be undoable');
assert(appV36.includes('p.peakOrder=order;')&&appV36.includes('p.peakLabel=categoryLabel(order);'),'sorting must update peak category/order metadata');
assert(appV36.includes('峰位/峰宽/锁定状态未改变'),'sort operation must explicitly preserve peak geometry and lock state');
console.log('v3.6 peak-order sorting checks passed.');


// v3.7 direct boxing / local detection / robust matched filter / smart identity
const appV37 = fs.readFileSync('./src/app.js','utf8');
const htmlV37 = fs.readFileSync('./src/index.html','utf8');
const cssV37 = fs.readFileSync('./src/style.css','utf8');
const analysisV37 = require('./src/analysis.js');

assert(resonancePluginSource.includes("elementId:'rangeActionMenu'"),'direct range action menu must be contributed by the resonance plugin');
for(const id of ['rangeLocalDetectBtn','rangeDeletePeaksBtn','rangeLockPeaksBtn','rangeUnlockPeaksBtn']){
  assert(resonancePluginSource.includes(`id="${id}"`),`resonance plugin range action ${id} must exist`);
}
assert(!htmlV37.includes('id="mainPeakSelectBtn"')&&!htmlV37.includes('id="mainBoxZoomBtn"'),'range/zoom mode buttons must be removed');
assert(appV37.includes("const zoom=!!event.ctrlKey"),'Ctrl+drag must control zoom');
assert(appV37.includes('openRangeActionMenu(range,drag.clientX,drag.clientY)'),'plain drag must open range menu without zoom');
assert(appV37.includes('function runLocalDetectionInRange()'),'local range peak detection must exist');
assert(appV37.includes("detectPeaksViaProvider(sw,{range})"),'local detection must pass physical box range through the active detector plugin');
assert(appV37.includes("snapshot('框选区域局部寻峰')"),'local detection must be undoable');
assert(appV37.includes("deleteSelectedPeaks('框选删除峰')"),'box delete must exist');
assert(cssV37.includes('.width-band,.width-line{pointer-events:none!important}'),'width overlay must not swallow peak click/double-click');
assert(appV37.includes('dragThresholdPx||7'),'peak drag must use a nonzero platform-adaptive click-distance threshold');
assert(appV37.includes("if(event.ctrlKey){")&&appV37.includes("if(!event.ctrlKey)return;"),'manual add/delete mouse modifiers must use Ctrl');
assert(resonancePluginSource.includes("(e.ctrlKey||e.metaKey)&&key==='ArrowLeft'")&&resonancePluginSource.includes('selectAdjacentPeak(-1)'),'Ctrl+left must be plugin-owned and select previous peak');
assert(resonancePluginSource.includes("(e.ctrlKey||e.metaKey)&&key==='ArrowRight'")&&resonancePluginSource.includes('selectAdjacentPeak(1)'),'Ctrl+right must be plugin-owned and select next peak');
assert(appV37.includes('bindPluginGroupPointClick')&&resonancePluginSource.includes('focusPeakFromCustomData'),'plugin group-chart points must navigate back to the main plot');
assert(appV37.includes("main-legend-chip ${selected?'selected':''} ${selectedPath&&!selected?'dimmed':''}"),'main legend must follow curve highlight/dimming');
assert(appV37.includes('function smartAssignPeakOrders'),'cross-Vg smart peak identity assignment must exist');
assert(fs.readFileSync('./src/science/identity.js','utf8').includes('enumerateTrackAssignments'),'smart identity must permit missing track indices rather than compress every curve');
assert(fs.readFileSync('./src/science/identity.js','utf8').includes("cost+=30"),'smart identity must strongly discourage crossing positive/negative Vd track regions');
assert(appV37.includes('p.orderAnchor=true'),'manual order correction must create an identity anchor');
assert(appV37.includes('if(o<=previous)o=previous+1'),'manual m->n correction must cascade later peak orders forward');

assert(typeof analysisV37.detectPeaks==='function','v3.7 detector must exist');
assert(analysisV37.ALG_SYMBOLS.matched==='circle','matched-filter detector identity must be exposed');

// Local range contract: final peak V/I must be a raw sample and inside the requested box.
const syn37={
  id:'syn37',datasetPath:'syn37',datasetName:'syn37',vg:0,direction:1,step:.01,
  points:Array.from({length:201},(_,k)=>{
    const v=-1+k*.01;
    const bg=1.4e-9*Math.exp(.45*v);
    const peak=7e-10*Math.exp(-.5*((v-.22)/.045)**2);
    return {v,i:bg+peak};
  })
};
const local37=analysisV37.detectPeaks(syn37,analysisV37.preset('balanced'),{
  range:{vMin:.10,vMax:.35,iMin:-Infinity,iMax:Infinity}
});
assert(local37.length>=1,'robust detector should find the synthetic local resonance');
assert(local37.every(p=>p.v>=.10&&p.v<=.35),'local detector final raw-I point must stay inside Vd range');
assert(local37.every(p=>syn37.points.some(q=>q.v===p.v&&q.i===p.i)),'local detector must return original I-V samples');
assert(local37.some(p=>(p.supportChannels||[]).includes('matched')),'new detector should use multiscale matched-filter evidence');

// Outside-range resonance must not leak into local detection.
const none37=analysisV37.detectPeaks(syn37,analysisV37.preset('balanced'),{
  range:{vMin:-.85,vMax:-.55,iMin:-Infinity,iMax:Infinity}
});
assert(none37.every(p=>p.v>=-.85&&p.v<=-.55),'range-constrained detector must never return out-of-box Vpk');

console.log('v3.7 direct range / robust detector / smart identity checks passed.');


// v3.9 flexible import workbench + native menu removal
const mainV39 = fs.readFileSync('./main.js','utf8');
const preloadV39 = fs.readFileSync('./preload.js','utf8');
const appV39 = fs.readFileSync('./src/app.js','utf8');
const htmlV39 = fs.readFileSync('./src/index.html','utf8');
const analysisV39 = require('./src/analysis.js');

assert(mainV39.includes('Menu.setApplicationMenu(null)'),'native File/Edit application menu must be removed');
assert(mainV39.includes('autoHideMenuBar: true')&&mainV39.includes('win.setMenuBarVisibility(false)'),'BrowserWindow menu bar must remain hidden');
assert(mainV39.includes("ipcMain.handle('files:openData'")&&mainV39.includes("ipcMain.handle('files:readDataText'"),'flexible importer must expose open/read IPC');
assert(mainV39.includes("'gb18030'")&&mainV39.includes("'shift_jis'")&&mainV39.includes("'utf-16be'"),'main process decoder must support common instrument encodings');
assert(preloadV39.includes('openDataFiles')&&preloadV39.includes('readDataText'),'renderer preload must expose flexible data file operations');

assert(htmlV39.includes('id="importPanel"')&&htmlV39.includes('数据导入工作台'),'import workbench must exist');
for(const id of [
  'importEncoding','importSkipRows','importEndRow','importDelimiter','importHeaderMode',
  'importDecimal','importCommentPrefix','importLayout','importXCol','importYCol',
  'importPairStart','importVoltageUnit','importCurrentUnit','importVgMode',
  'importYColumns','importPreviewTable','importApplyAllBtn','importCommitBtn'
]){
  assert(htmlV39.includes(`id="${id}"`),`missing flexible import control ${id}`);
}

assert(typeof analysisV39.inspectDataText==='function','analysis must expose flexible text inspection');
assert(typeof analysisV39.parseFlexibleData==='function','analysis must expose flexible multi-column parser');

const shared39={
  name:'shared.csv',path:'C:/shared.csv',text:[
    'Instrument header','Operator A',
    'Vd (mV),Vg=-10 V,Vg=0 V,Vg=20 V',
    '-100,1,2,3','0,4,5,6','100,7,8,9','200,10,11,12'
  ].join('\n'),
  encoding:'utf-8'
};
const sharedOpt39={...analysisV39.defaultImportOptions(),skipRows:2,currentUnit:'nA'};
const inspectShared39=analysisV39.inspectDataText(shared39,sharedOpt39);
assert(inspectShared39.delimiter==='comma','auto delimiter should detect comma CSV');
assert(inspectShared39.suggestedLayout==='sharedX','one X + multiple gate-current columns should auto-detect shared-X layout');
assert(inspectShared39.rowCount===4,'skip rows/header detection should preserve four data rows');

const parsedShared39=analysisV39.parseFlexibleData(shared39,{
  ...sharedOpt39,
  layout:'sharedX',
  xCol:0,
  yCols:[1,2,3],
  voltageUnit:'auto'
});
assert(parsedShared39.datasets.length===3,'shared-X file must produce one dataset per selected current column');
assert(parsedShared39.datasets.map(d=>d.vg).join(',')==='-10,0,20','Vg should be parsed independently from multi-column headers');
assert(Math.abs(parsedShared39.datasets[0].points[0].v + .1)<1e-12,'mV header must auto-scale voltage to V');
assert(Math.abs(parsedShared39.datasets[0].points[0].i - 1e-9)<1e-20,'selected nA current unit must scale to A');

const paired39={
  name:'paired.dat',path:'C:/paired.dat',
  text:'Vd1\tI1\tVd2\tI2\n-1\t1e-9\t-2\t2e-9\n0\t2e-9\t0\t3e-9\n1\t3e-9\t2\t4e-9\n2\t4e-9\t4\t5e-9',
  encoding:'utf-8'
};
const inspectPaired39=analysisV39.inspectDataText(paired39,analysisV39.defaultImportOptions());
assert(inspectPaired39.delimiter==='tab','auto delimiter should detect TSV/tab');
assert(inspectPaired39.suggestedLayout==='paired','V1/I1 V2/I2 headers should auto-detect paired-column layout');
assert(analysisV39.parseFlexibleData(paired39,{...analysisV39.defaultImportOptions(),layout:'paired'}).datasets.length===2,'paired layout must produce two independent I-V datasets');

const skipped39={
  name:'skip.txt',path:'C:/skip.txt',
  text:'junk1\njunk2\n#comment\nVoltage Current\n-1 1\n0 2\n1 3\n2 4',
  encoding:'utf-8'
};
const inspectSkip39=analysisV39.inspectDataText(skipped39,{
  ...analysisV39.defaultImportOptions(),skipRows:2,delimiter:'whitespace'
});
assert(inspectSkip39.dataStartSourceLine===5&&inspectSkip39.rowCount===4,'skipRows/comment/header logic must preserve source-line mapping');

assert(appV39.includes('function openImportWorkbench')&&appV39.includes('function commitImportWorkbench'),'renderer must provide preview/commit import workflow');
assert(appV39.includes('state.datasets=state.datasets.filter(d=>!sourcePaths.has(d.sourcePath||d.path))'),'reimporting a source file must replace its previously generated virtual series');
assert(appV39.includes('importSpec:d.importSpec||null')&&appV39.includes('points:(d.points||[])'),'project files must preserve parsed points and import settings');
console.log('v3.9 flexible import / native-menu checks passed.');


// v3.10 per-series Vg / hit targets / wheel zoom / legend / inspector right dock
const appV310 = fs.readFileSync('./src/app.js','utf8');
const htmlV310 = fs.readFileSync('./src/index.html','utf8');
const cssV310 = fs.readFileSync('./src/style.css','utf8');
const analysisV310 = require('./src/analysis.js');

assert(resonancePluginSource.includes('dataset-vg-input'),'resonance data sidebar plugin must expose editable Vg field');
assert(appV310.includes('function updateDatasetVg'),'dataset-level Vg edit handler must exist');
assert(htmlV310.includes('id="importSeriesVgRows"'),'import workbench must provide per-series/per-column Vg editor');
assert(appV310.includes('function renderImportSeriesVgRows'),'import workbench must render per-generated-series Vg rows');
assert(appV310.includes('vgOverrides'),'renderer import settings must maintain per-column Vg overrides');

const shared310={
  name:'shared-vg.csv',path:'C:/shared-vg.csv',encoding:'utf-8',
  text:'Vd,I_A,I_B\n-1,1,2\n0,3,4\n1,5,6\n2,7,8'
};
const parsed310=analysisV310.parseFlexibleData(shared310,{
  ...analysisV310.defaultImportOptions(),
  layout:'sharedX',
  xCol:0,
  yCols:[1,2],
  vgOverrides:{'1':-12.5,'2':27}
});
assert(parsed310.datasets.length===2,'per-column Vg test should generate two series');
assert(parsed310.datasets[0].vg===-12.5&&parsed310.datasets[1].vg===27,'per-column Vg overrides must become dataset Vg values');

assert(cssV310.includes('.curve-hit')&&cssV310.includes('stroke-width:var(--grs-curve-hit,14px)'),'main curves must have a wider platform-adaptive invisible hit path');
assert(appV310.includes('nearestSweepAtPixel')&&appV310.includes('interaction?.nearestCurvePx||18'),'background click/add must use platform-adaptive nearest-curve pixel tolerance');
assert(cssV310.includes('.peak-hit-target'),'peak markers must have a separate enlarged interaction target');
assert(appV310.includes("peakHits.call(d3.drag().clickDistance(window.GRSPlatform?.profile?.interaction?.dragThresholdPx||7)"),'peak hit target must distinguish click from drag with a platform-adaptive threshold');
assert(appV310.includes('showInspectorPanel();')&&appV310.includes('可直接用 ←/→ 移动'),'single-clicking a peak must select it, open inspector, and enable arrow-key movement');

assert(appV310.includes("mainSvg.on('wheel.mainzoom'"),'main plot must implement mouse-wheel zoom');
assert(appV310.includes('scaleDomainAround(xDomain')&&appV310.includes('scaleDomainAround(yDomain'),'wheel zoom must scale both X and Y around pointer');
assert(htmlV310.includes('id="mainLegendBar"'),'main legend must live in a dedicated HTML legend bar');
assert(cssV310.includes('.main-plot-header')&&cssV310.includes('.main-legend-bar'),'main toolbar and legend must use separate flex layout');
assert(!appV310.includes('// Vg legend\n    let ly='),'legacy SVG legend must be removed');

assert(htmlV310.includes('id="inspectorDockSlot"')&&htmlV310.includes('id="inspectorDockBtn"'),'inspector must support right-side docking');
assert(appV310.includes('function applyInspectorPanelLayout')&&appV310.includes("inspectorPanelMode==='right'"),'inspector right-dock layout logic must exist');
assert(appV310.includes('function setupInspectorDockResizer'),'docked inspector must be horizontally resizable');
assert(appV310.includes('inspectorPanelMode:state.inspectorPanelMode')&&appV310.includes('inspectorDockWidth:state.inspectorDockWidth'),'inspector dock mode/width must persist in project files');
console.log('v3.10 Vg / hit-target / wheel / legend / inspector-dock checks passed.');


// v3.11 bidirectional resonant TER / LAN web / pulse analysis / scoped import manager
const appV311 = fs.readFileSync('./src/app.js','utf8');
const htmlV311 = fs.readFileSync('./src/index.html','utf8');
const cssV311 = fs.readFileSync('./src/style.css','utf8');
const analysisV311 = require('./src/analysis.js');
const mainV311 = fs.readFileSync('./main.js','utf8');
const preloadV311 = fs.readFileSync('./preload.js','utf8');
const pkgV311 = JSON.parse(fs.readFileSync('./package.json','utf8'));
const lanWebV311 = fs.readFileSync('./lan-web-server.js','utf8');
const webBridgeV311 = fs.readFileSync('./src/web-bridge.js','utf8');

// Resonant TER: a reverse-only resonance must still be evaluated at same Vd.
const oneSideSweeps311=[
  {id:'u311',datasetPath:'d311',vg:5,direction:1,step:.1,points:[
    {v:.8,i:4e-6},{v:.9,i:4e-6},{v:1.0,i:4e-6},{v:1.1,i:4e-6}
  ]},
  {id:'d311',datasetPath:'d311',vg:5,direction:-1,step:.1,points:[
    {v:.8,i:1e-6},{v:.9,i:1e-6},{v:1.0,i:1e-6},{v:1.1,i:1e-6}
  ]}
];
const oneSidePeaks311=[
  {id:'only-reverse',sweepId:'d311',accepted:true,peakLabel:'峰3',vg:5,direction:-1,v:1.0,i:1e-6}
];
const oneSideTer311=analysisV311.computeResonantTerForLabel(oneSidePeaks311,oneSideSweeps311,'峰3');
assert(oneSideTer311.length===1,'reverse-only resonance must not be omitted from group TER');
assert(Math.abs(oneSideTer311[0].ter-300)<1e-9,'same-Vd resistance TER should be 300% for 4:1 current ratio');
assert(oneSideTer311[0].anchorDirection===-1&&oneSideTer311[0].vdAtTer===1,'TER result must retain the reverse resonance anchor');

assert(resonancePluginSource.includes("['i','峰电流 Ipk','A']"),'resonance group chart plugin must include peak-current-vs-gate plot');
assert(resonancePluginSource.includes('共振位 TER（双向候选）'),'group TER plugin must identify bidirectional resonance candidates');
assert(resonancePluginSource.includes('computeResonantTerForLabel'),'resonance group trend plugin must call the resonant TER routine');

// Import manager must be project-scoped and prevent duplicate native picker dialogs.
assert(appV311.includes("importDraft:{files:[],activePath:null,loading:false,fileDialogOpen:false}"),'each project tab must own a blank import draft');
assert(appV311.includes('t.importDraft=importDraft')&&appV311.includes('importDraft=t.importDraft'),'import draft must persist per project tab');
assert(appV311.includes('if(importDraft.fileDialogOpen)return;'),'import manager must guard against multiple simultaneous OS file pickers');

// Box selection unified peak category/label.
assert(resonancePluginSource.includes('id="rangeApplyPeakIdentityBtn"')&&resonancePluginSource.includes('id="rangePeakLabelInput"'),'resonance plugin range overlay must expose unified peak identity controls');
assert(appV311.includes('function applyUnifiedPeakIdentityToSelection'),'range-selected peaks must support unified category/label assignment');
assert(appV311.includes("snapshot('统一框选峰序与标签')"),'unified range identity operation must be undoable');

// Default panels.
assert(appV311.includes("groupPanelMode: 'docked'")&&appV311.includes("inspectorPanelMode:'right'"),'new projects must default to bottom group panel + right inspector');

// LAN web.
assert(pkgV311.build.files.includes('lan-web-server.js'),'packaged app must include embedded LAN web server');
assert(mainV311.includes("new LanWebServer({ app, BrowserWindow })"),'main process must initialize LAN web server');
assert(preloadV311.includes('lanWebGetStatus')&&preloadV311.includes('lanWebRegenerateKey'),'desktop renderer must expose LAN web controls');
assert(lanWebV311.includes('crypto.randomInt(1000, 10000)'),'pairing key must be random four digits');
assert(lanWebV311.includes("this.settings.noKey"),'LAN web server must support no-key mode');
assert(lanWebV311.includes("Set-Cookie")&&lanWebV311.includes("grs_pair="),'key pairing must establish an authenticated browser session');
assert(lanWebV311.includes("'/app/'")&&lanWebV311.includes("node_modules"),'LAN web server must serve the full analysis UI and dependencies');
assert(htmlV311.includes('id="lanWebPanel"')&&htmlV311.includes('id="lanWebNoKey"'),'desktop app must include LAN web settings panel');
assert(webBridgeV311.includes('openDataFiles')&&webBridgeV311.includes('saveProject')&&webBridgeV311.includes('copyText'),'browser bridge must provide import/project/export/clipboard compatibility');

// Pulse/read analyzer: provided waveform pattern should support automatic alternating platform detection.
const pulseSyntheticRows=['Meta','Time(s),id(0.0),Time(s),vd(0.0)'];
let pulseT311=0;
const pulseVs311=[1.0,.5,.5,.5,-1.0,.5,-.5,.5];
for(let b=0;b<pulseVs311.length;b++){
  for(let k=0;k<20;k++){
    pulseT311+=.00005;
    const vv=pulseVs311[b];
    const ii=vv===.5?2e-6:vv*4e-6;
    pulseSyntheticRows.push(`${pulseT311},${ii},${pulseT311},${vv}`);
  }
}
const pulseSynthetic311={name:'pulse.csv',path:'pulse.csv',text:pulseSyntheticRows.join('\n')};
const pulseRes311=analysisV311.analyzePulseReadData(pulseSynthetic311,{});
assert(pulseRes311.blockSamples===20,'pulse analyzer should auto-detect 20 samples per voltage platform');
assert(Math.abs(pulseRes311.readVoltage-.5)<1e-9,'pulse analyzer should detect repeated 0.5 V read platform');
assert(pulseRes311.points.length===4,'pulse analyzer should create one result per pulse/read pair');
assert(Number.isFinite(pulseRes311.points[0].pulseCurrent)&&Number.isFinite(pulseRes311.points[0].readCurrent),'pulse analyzer must calculate both pulse and read stable-window currents');
assert(pulsePluginSource.includes('id=\\\"pulseReadPlot\\\"')&&pulsePluginSource.includes('id=\\\"pulsePulsePlot\\\"'),'pulse plugin panel must provide both requested plots');
assert(appV311.includes('function pulseResultCsvText'),'pulse analysis results must support CSV copy/export');

console.log('v3.11 TER / LAN web / scoped import / range identity / pulse-analysis checks passed.');


// v3.12 group default and pulse-analysis UI/export refinement
const appV312 = fs.readFileSync('./src/app.js','utf8');
const htmlV312 = fs.readFileSync('./src/index.html','utf8');
const cssV312 = fs.readFileSync('./src/style.css','utf8');

assert(appV312.includes("trendColumns: 3")&&appV312.includes("trendColumns:3"),
  'new app/new project defaults must use three group charts per row');
assert(htmlV312.includes('data-trend-cols="3" class="active"'),
  'group layout UI must initially highlight three charts per row');

for(const id of [
  'pulseRawFitBtn','pulseRawCopyBtn','pulseRawExportBtn','pulseRawSvgBtn','pulseRawPngBtn',
  'pulseReadCopyBtn','pulseReadExportBtn','pulseReadSvgBtn','pulseReadPngBtn',
  'pulsePulseCopyBtn','pulsePulseExportBtn','pulsePulseSvgBtn','pulsePulsePngBtn'
]){
  assert(pulsePluginSource.includes(`id=\\"${id}\\"`),`pulse plugin plot action ${id} must exist`);
}
assert(!pulsePluginSource.includes('class=\"pulse-advanced\"'),
  'pulse plugin raw diagnostics should be permanently visible rather than hidden in a collapsed details block');
assert(cssV312.includes('.pulse-raw-plot')&&cssV312.includes('height:530px!important'),
  'raw waveform diagnostics must have a substantially larger default plotting area');
assert(appV312.includes("domain:[0.57,1]")&&appV312.includes("domain:[0,0.42]"),
  'raw diagnostic Vd and Id waveforms must use separate stacked y-axis domains');
assert(appV312.includes("anchor:'y2'"),
  'raw diagnostic shared time axis must be anchored to the lower panel');
assert(appV312.includes('function pulseReadCsvText()')&&appV312.includes('function pulsePulseCsvText()')&&appV312.includes('function pulseRawCsvText()'),
  'each pulse plot must expose its own exact CSV data');
assert(appV312.includes("exportPulsePlotImage('pulseReadPlot'")&&appV312.includes("exportPulsePlotImage('pulsePulsePlot'")&&appV312.includes("exportPulsePlotImage('pulseRawPlot'"),
  'raw/read/pulse plots must provide explicit image export actions');
assert(pulsePluginSource.includes('id=\\\"pulseResultMeta\\\"')&&cssV312.includes('.pulse-table-heading'),
  'pulse plugin extracted results must use a dedicated summary/header toolbar');
assert(cssV312.includes('.pulse-result-table thead th')&&cssV312.includes('position:sticky'),
  'pulse result table header must remain visible while scrolling');
console.log('v3.12 group-default / pulse-analysis layout-export checks passed.');


// v3.13 multi-file pulse-analysis workspace
const appV313 = fs.readFileSync('./src/app.js','utf8');
const htmlV313 = fs.readFileSync('./src/index.html','utf8');
const cssV313 = fs.readFileSync('./src/style.css','utf8');

for(const id of [
  'pulseAddFilesBtn','pulseFileList','pulseCheckAllBtn','pulseUncheckAllBtn',
  'pulseRemoveFilesBtn','pulseAnalyzeCurrentBtn','pulseAnalyzeCheckedBtn',
  'pulseApplySettingsBtn','pulseSeriesLabel','pulseResultScope'
]){
  assert(pulsePluginSource.includes(`id=\\\"${id}\\\"`),`multi-file pulse plugin control ${id} must exist`);
}
assert(appV313.includes('function createPulseAnalysisState()')&&appV313.includes('files:[]')&&appV313.includes("resultScope:'checked'"),
  'pulse analysis must use a batch-oriented state object');
assert(appV313.includes('function pulseCheckedItems()')&&appV313.includes('function pulseVisibleResultItems()'),
  'pulse analysis must distinguish checked files from currently visible result files');
assert(appV313.includes('async function addPulseAnalysisFiles()'),
  'pulse analysis must support adding multiple data files in one file-picker operation');
assert(appV313.includes('for(const meta of metas)'),
  'pulse file import must iterate every selected file, not only metas[0]');
assert(appV313.includes('function analyzeCheckedPulseFiles()')&&appV313.includes('for(const item of items)'),
  'pulse analysis must support batch analysis of all checked files');
assert(appV313.includes('function applyPulseSettingsToChecked()'),
  'current pulse extraction settings must be reusable across a batch');
assert(appV313.includes('item.settings={...template}'),
  'batch setting propagation must maintain per-file settings objects');
assert(appV313.includes('pulseAnalysisState.activeId'),
  'pulse workspace must maintain an independently active file for raw diagnostics');
assert(appV313.includes("pulseAnalysisState.resultScope==='active'"),
  'result plots/table must support active-only versus checked-file comparison');
assert(appV313.includes('const readTraces=[]')&&appV313.includes('const pulseTraces=[]')&&appV313.includes('for(const item of items)'),
  'read-current and pulse-current plots must create one trace per visible analyzed file');
assert(appV313.includes("showLegend=items.length>1"),
  'multi-file result plots must expose a legend when more than one file is shown');
assert(appV313.includes("['label,source_file,index,pulse_voltage_V,read_voltage_V,read_current_A"),
  'batch read-current CSV must identify both display label and source file');
assert(appV313.includes("['label,source_file,index,pulse_voltage_V,pulse_current_A"),
  'batch pulse-current CSV must identify both display label and source file');
assert(appV313.includes('pulseAnalysisState:pulseAnalysisState')||appV313.includes('t.pulseAnalysisState=pulseAnalysisState'),
  'pulse batch state must be project-tab scoped');
assert(appV313.includes('plugins:window.GRSPlugins?.project?.serialize?.(activeProjectTab()?.pluginState||{})')&&fs.readFileSync('./src/plugins/pulse-analysis/plugin.js','utf8').includes("ctx.project.registerSlice('workspace'"),
  'multi-file pulse workspace configuration must persist through plugin project slices');
assert(appV313.includes('window.GRSPlugins.project.restore(pr.plugins||{},pr)')&&fs.readFileSync('./src/plugins/pulse-analysis/plugin.js','utf8').includes('legacyProject?.pulseAnalysis'),
  'saved multi-file pulse workspace must restore through plugin state and migrate legacy projects');
assert(cssV313.includes('.pulse-batch-workspace')&&cssV313.includes('grid-template-columns:330px minmax(0,1fr)'),
  'pulse page must have a dedicated file-manager/editor workspace');
assert(cssV313.includes('.pulse-batch-file-item.active')&&cssV313.includes('.pulse-file-state.done'),
  'pulse file manager must visually distinguish active/analyzed files');
console.log('v3.13 multi-file pulse workspace checks passed.');


// v3.14 LAN web QR sharing + responsive layout
const appV314 = fs.readFileSync('./src/app.js','utf8');
const htmlV314 = fs.readFileSync('./src/index.html','utf8');
const cssV314 = fs.readFileSync('./src/style.css','utf8');
const mainV314 = fs.readFileSync('./main.js','utf8');
const preloadV314 = fs.readFileSync('./preload.js','utf8');
const lanWebV314 = fs.readFileSync('./lan-web-server.js','utf8');
const pkgV314 = JSON.parse(fs.readFileSync('./package.json','utf8'));

assert(pkgV314.dependencies.qrcode,'desktop build must include an offline QR-code generator dependency');
assert(mainV314.includes("const QRCode = require('qrcode')"),'main process must load local qrcode package');
assert(mainV314.includes("ipcMain.handle('lanweb:makeQr'"),'main process must expose QR generation IPC');
assert(mainV314.includes("QRCode.toDataURL(text"),'QR generation must be local/offline and return a data URL');
assert(preloadV314.includes('lanWebMakeQr'),'renderer bridge must expose QR generation');

for(const id of [
  'lanWebQrImage','lanWebQrPlaceholder','lanWebSelectedUrl','lanWebQrModeBadge',
  'lanWebCopyBaseUrlBtn','lanWebCopyShareLinkBtn','lanWebRefreshQrBtn',
  'lanWebQrHint','lanWebQrSecurityText'
]){
  assert(htmlV314.includes(`id="${id}"`),`LAN web QR UI control ${id} must exist`);
}
assert(appV314.includes('function lanWebShareUrl'),'renderer must build a dedicated QR/share URL');
assert(appV314.includes("u.searchParams.set('key',String(status.key))"),
  'key-protected QR share link must carry the current four-digit pairing key');
assert(appV314.includes('async function renderLanWebQr'),
  'LAN web panel must render the QR asynchronously');
assert(appV314.includes("window.electronAPI.lanWebMakeQr({text:shareUrl})"),
  'renderer must generate the QR from the selected share URL');
assert(appV314.includes('lanWebSelectedBaseUrl'),
  'multi-NIC LAN addresses must have an explicit currently selected address');
assert(appV314.includes("b.className=`lan-web-url-chip ${url===lanWebSelectedBaseUrl?'selected':''}`"),
  'selected LAN address must be visibly identified');

assert(lanWebV314.includes("u.searchParams.get('key')"),
  'LAN server must accept a QR-carried pairing key');
assert(lanWebV314.includes("qrKey === this.pairKey"),
  'QR auto-pair must validate the exact current pairing key');
assert(lanWebV314.includes("'Set-Cookie':`grs_pair=${token}; HttpOnly; SameSite=Lax; Path=/`"),
  'valid QR pairing must establish the same HttpOnly session cookie as manual pairing');
assert(lanWebV314.includes("Location:'/app/'"),
  'valid QR pairing must redirect directly into the full web app');

assert(cssV314.includes('grid-template-columns:minmax(0,1.16fr) minmax(300px,.84fr)'),
  'LAN web panel must use a balanced two-column desktop layout');
assert(cssV314.includes('.lan-web-qr-frame')&&cssV314.includes('.lan-web-qr-image'),
  'QR must have a dedicated visual card rather than being appended to the URL list');
assert(cssV314.includes('@media(max-width:820px)')&&cssV314.includes('grid-template-columns:1fr'),
  'LAN web panel must collapse to one column on narrow windows');
console.log('v3.14 LAN web QR / responsive layout checks passed.');


// plugin branch architecture / platform contracts
const pluginKernel = fs.readFileSync('./src/core/plugin-kernel.js','utf8');
const platformCore = fs.readFileSync('./src/core/platform.js','utf8');
const pluginIndex = fs.readFileSync('./src/plugins/plugin-index.generated.js','utf8');
const pluginApp = fs.readFileSync('./src/app.js','utf8');
const pluginHtml = fs.readFileSync('./src/index.html','utf8');
const pluginCss = fs.readFileSync('./src/style.css','utf8');
const pluginPkg = JSON.parse(fs.readFileSync('./package.json','utf8'));

assert(pluginKernel.includes('window.GRSPlugins')&&pluginKernel.includes('activateAll')&&pluginKernel.includes('registerProjectSlice'),
  'plugin kernel must expose lifecycle and namespaced project state');
assert(pluginKernel.includes('createToolbarButton')&&pluginKernel.includes('addPage')&&pluginKernel.includes('addStyle'),
  'plugin kernel must support toolbar/page/style UI contributions');
assert(pluginKernel.includes("getRegistry('commands')")&&pluginKernel.includes('runCommand'),
  'plugin kernel must expose command registration/execution');
assert(pluginIndex.includes('plugins/flexible-import/plugin.js')&&
       pluginIndex.includes('plugins/resonance-workbench/plugin.js')&&
       pluginIndex.includes('plugins/ter-analysis/plugin.js')&&
       pluginIndex.includes('plugins/pulse-analysis/plugin.js'),
  'generated plugin index must list all built-in plugin entries');
assert(pluginHtml.includes('data-plugin-toolbar="analysis"')&&pluginHtml.includes('core/plugin-kernel.js')&&pluginHtml.includes('core/platform.js'),
  'renderer must provide plugin toolbar mount and load core plugin/platform runtime');
assert(!pluginHtml.includes('id="openGateAnalysisPageBtn"')&&!pluginHtml.includes('id="openPulseAnalysisPageBtn"'),
  'domain feature toolbar buttons should not be hard-coded in core HTML');
assert(pluginApp.includes('flexibleImportProvider().parse')&&pluginApp.includes('flexibleImportProvider().inspect'),
  'import workbench must resolve parser/inspector from plugin registry');
assert(pluginApp.includes('plugins:window.GRSPlugins?.project?.serialize?.(activeProjectTab()?.pluginState||{})'),
  'core project format must serialize plugin state generically');
assert(pluginApp.includes('window.GRSPlugins.project.restore(pr.plugins||{},pr)'),
  'core project loader must restore plugin state generically');
assert(pluginApp.includes('await window.GRSPlugins.loadBuiltinEntries()')&&pluginApp.includes('await window.GRSPlugins.activateAll()'),
  'plugins must load/activate before first blank project is mounted');
assert(platformCore.includes("size = 'compact'")&&platformCore.includes("pointer: coarse ? 'coarse' : 'fine'"),
  'platform core must expose responsive size and pointer profiles');
assert(platformCore.includes('curveHitPx')&&platformCore.includes('peakHitRadiusPx')&&platformCore.includes('longPressMs'),
  'platform core must expose touch interaction geometry/gesture constants');
assert(pluginCss.includes('.grs-size-compact .workspace')&&pluginCss.includes('.grs-pointer-coarse button'),
  'CSS must include compact and coarse-pointer adaptations');
assert(pluginApp.includes('window.GRSPlatform?.profile?.interaction?.nearestCurvePx')&&
       pluginApp.includes('window.GRSPlatform?.profile?.interaction?.dragThresholdPx'),
  'main plot interaction tolerances must consume platform profile');
assert(pluginPkg.scripts['plugin:index']&&pluginPkg.scripts['plugin:validate']&&pluginPkg.scripts.check,
  'package scripts must support plugin index generation, validation, and project checks');
for(const doc of [
  './AGENTS.md','./docs/ARCHITECTURE.md','./docs/PLUGIN_API.md',
  './docs/AI_PLUGIN_DEVELOPMENT_GUIDE.md','./docs/ANDROID_PORTING.md','./docs/BRANCHING.md'
]) assert(fs.existsSync(doc),`required plugin architecture documentation missing: ${doc}`);

console.log('plugin branch architecture/platform checks passed.');

// v3.16 shared science rewrite + React Native Android shell contracts
const analysisFacade316 = fs.readFileSync('./src/analysis.js','utf8');
const app316 = fs.readFileSync('./src/app.js','utf8');
const html316 = fs.readFileSync('./src/index.html','utf8');
const webBridge316 = fs.readFileSync('./src/web-bridge.js','utf8');
const identity316 = fs.readFileSync('./src/science/identity.js','utf8');
const physics316 = fs.readFileSync('./src/science/physics.js','utf8');
const gate316 = fs.readFileSync('./src/science/gate.js','utf8');
const mobilePkg316 = JSON.parse(fs.readFileSync('./mobile/package.json','utf8'));
const mobileApp316 = fs.readFileSync('./mobile/App.tsx','utf8');
const mobileAssetPlugin316 = fs.readFileSync('./mobile/plugins/withGrsWebAssets.js','utf8');
const mobileSync316 = fs.readFileSync('./mobile/scripts/sync-web-assets.js','utf8');

assert(analysisFacade316.split(/\r?\n/).length < 40,
  'analysis.js must remain a thin compatibility facade after mature science rewrite');
for(const rel of [
  './src/science/common.js','./src/science/presets.js','./src/science/import.js',
  './src/science/peaks.js','./src/science/pulse.js','./src/science/ter.js',
  './src/science/identity.js','./src/science/physics.js','./src/science/gate.js'
]) assert(fs.existsSync(rel),`shared science module missing: ${rel}`);
assert(html316.includes('science/peaks.js')&&html316.includes('science/identity.js')&&html316.includes('science/gate.js'),
  'desktop/web renderer must load rewritten shared science modules');
assert(identity316.includes('function solvePeakTracks')&&app316.includes('A.solvePeakTracks(rows'),
  'cross-Vg smart peak identity must be implemented by shared science engine');
assert(physics316.includes('function analyzePhysicalFamilies')&&app316.includes('A.analyzePhysicalFamilies({'),
  'physical family/model classification must be implemented by shared science engine');
assert(gate316.includes('function pairGateSeries')&&gate316.includes('function summarizeGateRows')&&
       app316.includes('A.pairGateSeries(Arows,Brows,terByVg,s)'),
  'gate-voltage mathematics must be implemented by shared science engine');
assert(fs.existsSync('./scripts/verify-science-parity.js'),
  'scientific rewrite must include parity verification against preserved main baseline');

assert(mobilePkg316.dependencies.expo.startsWith('~57.')&&mobilePkg316.dependencies['react-native']==='0.86.2',
  'Android shell must target Expo SDK 57 / React Native 0.86.2');
assert(mobilePkg316.dependencies['react-native-webview']==='13.16.1',
  'Android shell must use the Expo-compatible react-native-webview version');
assert(mobilePkg316.dependencies['expo-document-picker']==='~57.0.1',
  'Android shell must use native DocumentPicker for robust data/project import');
assert(mobileApp316.includes("file:///android_asset/grs/index.html?reactNative=1")&&
       mobileApp316.includes('<WebView')&&mobileApp316.includes("req.type === 'openFiles'"),
  'React Native shell must load offline app assets and expose native file picking');
assert(mobileApp316.includes('expo-clipboard')&&mobileApp316.includes('expo-sharing')&&mobileApp316.includes('expo-file-system/legacy'),
  'Android native bridge must support clipboard and file/image export sharing');
assert(webBridge316.includes('window.ReactNativeWebView?.postMessage')&&webBridge316.includes("nativeCall('openFiles'")&&
       webBridge316.includes("nativeCall('saveBase64'"),
  'shared renderer bridge must delegate Android I/O to React Native');
assert(mobileAssetPlugin316.includes("android',")&&mobileAssetPlugin316.includes("'assets', 'grs'"),
  'Expo config plugin must copy the offline renderer into Android assets');
assert(mobileSync316.includes("fs.cpSync(source, out")&&mobileSync316.includes("vendor, 'plotly.min.js'"),
  'mobile sync must package full plugin renderer and plotting libraries offline');
for(const rel of ['./GRS.cmd','./GRS_GUI.cmd','./tools/windows/grs-tools.ps1','./mobile/README_ANDROID_CN.md'])
  assert(fs.existsSync(rel),`Android/toolbox helper missing: ${rel}`);
const grsTools316=fs.readFileSync('./tools/windows/grs-tools.ps1','utf8');
assert(grsTools316.includes("'android-check'")&&grsTools316.includes("'android-build'")&&grsTools316.includes("'android-run'")&&grsTools316.includes("'android-install'"),
  'unified toolbox backend must expose Android check/build/run/install actions');
console.log('v3.16 science rewrite / React Native Android shell checks passed.');

// v3.16 rewritten mature-domain unit checks
const sci316 = require('./src/analysis.js');
const identityRows316 = [
  {sw:{id:'g0',vg:0,direction:1},peaks:[
    {v:-1.0,peakOrder:1},{v:-.4,peakOrder:2},{v:.35,peakOrder:3},{v:.9,peakOrder:4}
  ]},
  {sw:{id:'g1',vg:10,direction:1},peaks:[
    {v:-.95,peakOrder:1},{v:.4,peakOrder:3},{v:.95,peakOrder:4}
  ]}
];
const solved316=sci316.solvePeakTracks(identityRows316,{minimumK:4});
assert(solved316.assignments.get('g1').join(',')==='0,2,3',
  'rewritten smart identity must preserve the missing peak-2 slot instead of renumbering positive peaks');

const gateRows316=sci316.pairGateSeries(
  [{vg:0,v:-.2,hwhm:.05,fwhm:.1,i:1,amplitude:2,baseline:.2,peakToBg:5}],
  [{vg:0,v:.4,hwhm:.1,fwhm:.2,i:2,amplitude:3,baseline:.3,peakToBg:6}],
  [{vg:0,terMax:250,vdsAtMax:.15}],{}
);
assert(Math.abs(gateRows316[0].V0-.1)<1e-12&&Math.abs(gateRows316[0].delta-.3)<1e-12,
  'rewritten gate engine must compute V0 and signed delta correctly');
assert(Math.abs(gateRows316[0].deltaOverW-4)<1e-12,
  'rewritten gate engine must use effective HWHM for delta/w');
assert(gateRows316[0].terMax===250&&gateRows316[0].vStar===.15,
  'rewritten gate engine must join strict TER maxima by Vg');
console.log('v3.16 rewritten identity/gate numerical checks passed.');


// v3.17 plugin manager UI / lifecycle contracts
const kernelV317=fs.readFileSync('./src/core/plugin-kernel.js','utf8');
const managerUiV317=fs.readFileSync('./src/core/plugin-manager-ui.js','utf8');
const htmlV317=fs.readFileSync('./src/index.html','utf8');
const cssV317=fs.readFileSync('./src/style.css','utf8');
const appV317=fs.readFileSync('./src/app.js','utf8');
assert(htmlV317.includes('id="pluginManagerBtn"')&&htmlV317.includes('id="pluginManagerPage"'),'core toolbar/page must expose plugin manager');
assert(htmlV317.includes('id="pluginManagerSearch"')&&htmlV317.includes('id="pluginManagerFilter"'),'plugin manager must support search and status filter');
assert(managerUiV317.includes('plugin-enable-switch')&&managerUiV317.includes('GRSPlugins.manager.setEnabled'),'plugin manager UI must support live enable/disable');
assert(managerUiV317.includes('GRSPlugins.manager.reload')&&managerUiV317.includes('resetPreferences'),'plugin manager UI must support reload and restore defaults');
assert(kernelV317.includes("preferenceStorageKey = 'grs.plugin.preferences.v1'"),'plugin desired states must persist outside project files');
assert(kernelV317.includes('async function setPluginEnabled')&&kernelV317.includes('async function reloadPlugin'),'kernel must own enable/disable/reload lifecycle');
assert(kernelV317.includes('host?.captureActiveProjectTab?.()'),'plugin disable/reload must capture current project state before cleanup');
assert(kernelV317.includes('restorePluginProjectState(manifest.id'),'plugin enable/reload must restore current project plugin state');
assert(kernelV317.includes('function serializeProject(base={})'),'project serialization must preserve disabled/unknown plugin namespaces');
assert(appV317.includes('currentTab.pluginState=JSON.parse(JSON.stringify(pr.plugins||{}))'),'project load must preserve plugin blobs even when plugin is disabled');
assert(cssV317.includes('.plugin-manager-list')&&cssV317.includes('.plugin-enable-switch'),'plugin manager must have dedicated responsive management UI');
assert(cssV317.includes('.grs-pointer-coarse .plugin-switch-track'),'plugin manager toggle must have coarse-pointer adaptation');
console.log('v3.17 plugin-manager checks passed.');


// v3.18 customizable Data Center foundation
const dataModel318=fs.readFileSync('./src/core/data-model.js','utf8');
const formula318=fs.readFileSync('./src/core/formula-engine.js','utf8');
const params318=fs.readFileSync('./src/core/parameter-schema.js','utf8');
const workflow318=fs.readFileSync('./src/core/workflow-engine.js','utf8');
const kernel318=fs.readFileSync('./src/core/plugin-kernel.js','utf8');
const dataCenter318=fs.readFileSync('./src/plugins/data-center/plugin.js','utf8');
const index318=fs.readFileSync('./src/index.html','utf8');
const app318=fs.readFileSync('./src/app.js','utf8');
const pkg318=JSON.parse(fs.readFileSync('./package.json','utf8'));
assert(index318.includes('core/data-model.js')&&index318.includes('core/formula-engine.js')&&index318.includes('core/parameter-schema.js')&&index318.includes('core/workflow-engine.js'),
  'desktop/web/mobile renderer bundle must load generic Data Center core modules');
assert(dataModel318.includes("createTable")&&dataModel318.includes("provenanceStep")&&dataModel318.includes("serializeStore"),
  'standard Data Model must provide DataTable, provenance and project artifact-store serialization');
assert(dataModel318.includes("transient:true")&&app318.includes("syncLegacyArtifacts"),
  'legacy resonance datasets must map to transient standard DataTables without duplicate project persistence');
assert(app318.includes('dataModel:window.GRSData.serializeStore')&&app318.includes('window.GRSData.restoreStore(pr.dataModel'),
  'generic artifact store must persist in project files independently of plugin-specific state');
assert(formula318.includes('function tokenize')&&formula318.includes('function parse')&&formula318.includes('deriveColumn'),
  'formula engine must use a parser/AST and support provenance-aware derived columns');
assert(!formula318.includes('eval(')&&!formula318.includes('new Function'),
  'formula engine must never execute arbitrary JavaScript');
assert(params318.includes('function validate')&&params318.includes('function render')&&params318.includes("field.type==='column'"),
  'schema-driven parameter system must validate/render generic fields and DataTable column selectors');
assert(workflow318.includes('function executionOrder')&&workflow318.includes('function buildSequentialRecipe')&&workflow318.includes('workflow:completed'),
  'workflow engine must support DAG ordering, sequential recipes and lifecycle events');
assert(workflow318.includes('inputKinds')&&workflow318.includes('outputKinds')&&workflow318.includes('resolveParameterBindings'),
  'workflow providers must enforce typed artifact contracts and recipe-level parameter binding');
assert(kernel318.includes("workflow.processors")&&kernel318.includes("workflow.analyzers")&&kernel318.includes("charts.renderers")&&kernel318.includes("workflow.recipes"),
  'Plugin API must expose typed Processor / Analyzer / Chart / Recipe contribution interfaces');
assert(kernel318.includes('data: {')&&kernel318.includes('parameters: {'),
  'Plugin API must expose Data Model / Artifact Store and schema-driven parameter services');
assert(dataCenter318.includes("id:'builtin.data-center'")&&dataCenter318.includes("ctx.workflow.processors.register('formula.derived-column'")&&dataCenter318.includes("ctx.workflow.analyzers.register('table.summary'"),
  'Data Center built-in plugin must provide formula processor and generic analyzer examples');
assert(dataCenter318.includes("ctx.charts.register('xy-line'")&&dataCenter318.includes('dcWorkflowSteps')&&dataCenter318.includes('dcProvenanceList'),
  'Data Center UI must expose configurable workflow steps, generic chart provider and provenance inspection');
assert(fs.readFileSync('./src/plugins/plugin-index.generated.js','utf8').includes('plugins/data-center/plugin.js'),
  'Data Center plugin must be discoverable without hard-coded HTML script tags');
for(const doc of ['./docs/DATA_MODEL.md','./docs/WORKFLOW_RECIPES.md','./docs/PARAMETER_SCHEMA.md','./docs/FORMULA_ENGINE.md'])
  assert(fs.existsSync(doc),`v3.18 Data Center documentation missing: ${doc}`);
assert(pkg318.scripts['data-center:test'],'package scripts must include Data Center core tests');
console.log('v3.18 Data Model / Workflow / Schema / Formula / Data Center checks passed.');


// v3.19 plugin-native workspace / detector / adaptive UI shell
const appV319=fs.readFileSync('./src/app.js','utf8');
const htmlV319=fs.readFileSync('./src/index.html','utf8');
const cssV319=fs.readFileSync('./src/style.css','utf8');
const kernelV319=fs.readFileSync('./src/core/plugin-kernel.js','utf8');
const resonanceV319=fs.readFileSync('./src/plugins/resonance-workbench/plugin.js','utf8');
const detectorV319=fs.readFileSync('./src/plugins/resonance-detector-robust/plugin.js','utf8');
const dataCenterV319=fs.readFileSync('./src/plugins/data-center/plugin.js','utf8');
const terPluginV319=fs.readFileSync('./src/plugins/ter-analysis/plugin.js','utf8');
const pulsePluginV319=fs.readFileSync('./src/plugins/pulse-analysis/plugin.js','utf8');

assert(htmlV319.includes('id="activityBar"')&&htmlV319.includes('id="activityMoreMenu"'),
  'top shell must expose an activity switcher with overflow');
assert(htmlV319.includes('id="pluginToolbarAnalysis"')&&htmlV319.includes('id="contextOverflowMenu"'),
  'activity-specific tools must use a separate context row with automatic overflow');
assert(htmlV319.includes('id="exportMenuBtn"')&&htmlV319.includes('data-plugin-menu="export"'),
  'exports must be collapsed into a generic menu with plugin contribution slot');
assert(!htmlV319.includes('手动操作')&&!htmlV319.includes('拖框=操作 · Ctrl+拖框=缩放'),
  'space-consuming permanent manual-operation hints must be removed');
assert(!htmlV319.includes('智能寻峰')&&!htmlV319.includes('dataset-vg-input'),
  'resonance sidebar UI must not remain hard-coded in core HTML');
assert(!htmlV319.includes('id="rangeActionMenu"')&&!htmlV319.includes('id="physicsPanel"')&&!htmlV319.includes('id="spacingPage"')&&!htmlV319.includes('id="gateAnalysisPage"'),
  'resonance overlays/panels/pages must be dynamically contributed by the workbench plugin');
assert(!htmlV319.includes('id="pulseAnalysisPage"')&&!htmlV319.includes('id="terMaxPage"'),
  'pulse and TER domain pages must not remain hard-coded in core HTML');
assert(pulsePluginV319.includes("pageId:'pulseAnalysisPage'")&&pulsePluginV319.includes('html:pageHtml'),
  'pulse analysis page must be dynamically created by the pulse plugin');
assert(terPluginV319.includes("pageId:'terMaxPage'")&&terPluginV319.includes('html:pageHtml'),
  'TER analysis page must be dynamically created by the TER plugin');

assert(kernelV319.includes("const API_VERSION = '1.2.0'"),'workspace extension API must be v1.2');
for(const token of [
  'function registerActivity','function addSidebarSection','function addMainOverlay',
  "registerTypedContribution(pluginId,'ui.inspectors'",
  "registerTypedContribution(pluginId,'ui.groupCharts'",
  "registerTypedContribution(pluginId,'ui.groupViews'",
  "registerTypedContribution(pluginId,'ui.mainViews'"
]){
  assert(kernelV319.includes(token),`plugin kernel missing workspace extension ${token}`);
}
assert(kernelV319.includes("if(overflow)overflow.innerHTML=''"),
  'activity rerender must clear overflow storage to prevent duplicate activity buttons');
assert(kernelV319.includes("sortContributions(mount,'.plugin-sidebar-section')"),
  'sidebar contributions must be deterministically ordered across plugins');
assert(kernelV319.includes("registerContribution(pluginId,'ui.shortcuts'")&&kernelV319.includes('dispatchPluginShortcut'),
  'workspace plugins must be able to own activity-scoped keyboard shortcuts');
assert(!appV319.includes("if(e.key==='l'||e.key==='L')")&&!appV319.includes("if(e.key==='p'||e.key==='P')"),
  'resonance editing/physics shortcuts must not remain in the core key handler');
assert(resonanceV319.includes("ctx.ui.shortcuts.add")&&resonanceV319.includes("id:'resonance-editing-shortcuts'"),
  'resonance plugin must own its desktop editing shortcuts');
const resizeStartV319=appV319.indexOf("window.addEventListener('resize'");
const resizeEndV319=appV319.indexOf('if(window.ResizeObserver)',resizeStartV319);
const resizeBlockV319=resizeStartV319>=0&&resizeEndV319>resizeStartV319?appV319.slice(resizeStartV319,resizeEndV319):'';
assert(appV319.includes("events?.emit?.('layout:resize'")&&!['gateResonancePlot','spacingPlot','terHeatmapPlot','pulseRawPlot'].some(id=>resizeBlockV319.includes(id)),
  'core resize handling must emit a generic event instead of knowing domain plot ids');
assert(resonanceV319.includes("ctx.events.on('layout:resize'")&&terPluginV319.includes("ctx.events.on('layout:resize'")&&pulsePluginV319.includes("ctx.events.on('layout:resize'"),
  'domain plugins must own resize behavior for their own Plotly canvases');

assert(appV319.includes("registry?.values?.('ui.mainViews')")&&appV319.includes('function renderResonanceMainPlot()'),
  'main plot host must select a plugin main-view provider while keeping mature renderer as compatibility implementation');
assert(appV319.includes('currentMainViewCsvText')&&appV319.includes('exportCurrentMainSvg')&&appV319.includes('exportCurrentMainPng'),
  'main data/image exports must dispatch through the active main-view plugin');
assert(appV319.includes("registry?.values?.('ui.inspectors')"),
  'inspector body must be provider-driven');
assert(appV319.includes("registry?.values?.('ui.groupCharts')")&&appV319.includes("registry?.values?.('ui.groupViews')"),
  'group chart types/data/view must be provider-driven');
assert(!appV319.includes('function renderPhysicsPanel(){'),
  'resonance physics-panel renderer must no longer be core UI code');

for(const token of [
  "ctx.ui.activities.add",
  "ctx.ui.sidebar.add",
  "ctx.ui.mainViews.register",
  "ctx.ui.mainOverlays.add",
  "ctx.ui.inspectors.register",
  "ctx.ui.groupCharts.register",
  "ctx.ui.groupViews.register",
  "ctx.ui.panels.add",
  "ctx.ui.pages.add"
]){
  assert(resonanceV319.includes(token),`resonance workbench must own ${token}`);
}
assert(resonanceV319.includes("elementId:'rangeActionMenu'")&&resonanceV319.includes('统一峰序 / 峰标签'),
  'range menu and its peak-identity UI must be workbench plugin content');
assert(resonanceV319.includes('function renderPhysicsPanel()'),
  'physics panel rendering must be owned by the resonance plugin');
assert(resonanceV319.includes("panelTitle:'共振检查器'")&&resonanceV319.includes("panelTitle:'共振组图'"),
  'generic inspector/group hosts must receive plugin-specific panel titles');
assert(resonanceV319.includes('csvText:()=>R.mainCsvText()')&&resonanceV319.includes('exportPng:()=>R.exportMainPng()'),
  'resonance main-view provider must own its data/image export contract');

assert(detectorV319.includes("ctx.analysis.detectors.register('robust-ricker-v1'"),
  'mature robust finder must be an independent detector plugin');
assert(detectorV319.includes('renderSettings({container,settings,onChange})'),
  'algorithm-specific settings UI must be supplied by the detector plugin');
assert(detectorV319.includes("evidence.matched")&&detectorV319.includes("symbol:'triangle-down'"),
  'detector plugin must own evidence label/glyph/symbol metadata');
assert(appV319.includes('peak.detectors')&&appV319.includes('没有启用的寻峰算法插件'),
  'disabling all detector plugins must fail visibly instead of silently re-enabling the built-in algorithm');
assert(appV319.includes('peak.detectorId=peak.detectorId||provider.id'),
  'detected peaks must record their detector provider for reproducible rendering/provenance');

assert(dataCenterV319.includes("id:'data-center'")&&terPluginV319.includes("id:'ter'")&&pulsePluginV319.includes("id:'pulse'"),
  'top-level feature plugins must be exposed as activities rather than accumulating toolbar buttons');

assert(cssV319.includes('.activity-switcher')&&cssV319.includes('.plugin-context-toolbar')&&cssV319.includes('.context-overflow-menu'),
  'adaptive toolbar/activity/context layout styles must exist');
assert(kernelV319.includes('dataset.pluginPriority')&&kernelV319.includes('dataset.pluginSection')&&kernelV319.includes('const ranked=visible.slice().sort'),
  'context toolbar must support plugin-defined groups and priority-aware overflow');
assert(resonanceV319.includes("section:'视图'")&&resonanceV319.includes("section:'分析'"),
  'resonance workbench must declare semantic toolbar groups instead of a flat action row');
assert(cssV319.includes('.plugin-toolbar-btn.plugin-section-start'),
  'context toolbar must visually separate plugin-declared command groups');

const mainExternalV319=fs.readFileSync('./main.js','utf8');
const preloadExternalV319=fs.readFileSync('./preload.js','utf8');
const managerExternalV319=fs.readFileSync('./src/core/plugin-manager-ui.js','utf8');
const packageCoreV319=fs.readFileSync('./plugin-package.js','utf8');
assert(htmlV319.includes('id="pluginManagerInstallBtn"')&&htmlV319.includes('id="pluginManagerOpenFolderBtn"'),
  'desktop plugin manager must expose install and plugin-directory actions');
assert(mainExternalV319.includes("ipcMain.handle('plugins:installPackage'")&&mainExternalV319.includes("ipcMain.handle('plugins:restorePackage'"),
  'desktop plugin installation must support transactional package rollback');
assert(preloadExternalV319.includes('pluginInstallPackage')&&preloadExternalV319.includes('pluginRestorePackage'),
  'context-isolated preload must expose plugin installation and rollback IPC');
assert(kernelV319.includes('loadExternalPackage')&&kernelV319.includes('oldPackage=externalPackages.get(id)||pkg.previousPackage||null'),
  'plugin kernel must support dynamic external package load and failed-update rollback');
assert(managerExternalV319.includes('plugin-uninstall-btn')&&managerExternalV319.includes('GRSPlugins.external.install'),
  'plugin manager must manage external install/update/uninstall lifecycle');
assert(packageCoreV319.includes('normalizeRelativeFile')&&packageCoreV319.includes('MAX_TOTAL_CHARS'),
  'external plugin packages must be validated for safe paths and bounded size');
assert(fs.existsSync('./docs/PLUGIN_PACKAGES.md')&&fs.existsSync('./examples/external-plugins/resonance-detector-template/plugin.json'),
  'external plugin packaging and installable detector SDK example must be documented');

console.log('v3.19 plugin-native resonance workspace / adaptive shell checks passed.');


// v3.20 single-row shell / toolbox / clean project structure
const htmlV320=fs.readFileSync('./src/index.html','utf8');
const cssV320=fs.readFileSync('./src/style.css','utf8');
const kernelV320=fs.readFileSync('./src/core/plugin-kernel.js','utf8');
const pkgV320=JSON.parse(fs.readFileSync('./package.json','utf8'));
const grsTools320=fs.readFileSync('./tools/windows/grs-tools.ps1','utf8');
const grsGui320=fs.readFileSync('./tools/windows/grs-gui.ps1','utf8');
assert(/^3\.20\.0-plugin\.\d+$/.test(pkgV320.version),'v3.20 plugin package version must be set');
assert(htmlV320.includes('class="context-commandbar"')&&!htmlV320.includes('class="topbar-context"'),
  'desktop shell must use one unified command row rather than a permanent second context row');
assert(htmlV320.includes('data-menu-target="editMenu"')&&htmlV320.includes('data-menu-target="manageMenu"'),
  'low-frequency edit/manage actions must be grouped into compact menus');
assert(htmlV320.includes('id="pluginToolbarAnalysis"')&&htmlV320.includes('id="contextOverflowBtn"'),
  'plugin context actions must remain priority-overflow capable on the unified row');
assert(kernelV320.includes("document.querySelector('.context-commandbar')")&&kernelV320.includes('dataset.pluginPriority'),
  'context reflow must measure the unified command host and preserve plugin priority overflow');
assert(!kernelV320.includes('buttons.length<=3'),
  'activity overflow must react to available width even when only two or three activities exist');
assert(cssV320.includes('--ui-font-size:11px')&&cssV320.includes('--ui-control-h:28px'),
  'UI must define a shared compact semantic typography/control scale');
assert(cssV320.includes('.topbar{\n  height:42px')&&cssV320.includes('.workspace{height:calc(100% - 78px)}'),
  'single-row shell must reclaim vertical workspace');
const rootCmds320=fs.readdirSync('.').filter(n=>n.toLowerCase().endsWith('.cmd')).sort();
assert(JSON.stringify(rootCmds320)===JSON.stringify(['GRS.cmd','GRS_GUI.cmd']),
  'root must contain only the consolidated CLI and GUI CMD launchers');
for(const action of ['dev','check','test','build-windows','android-check','android-build','android-run','android-install','update-server','publish-update','build-publish-update','plugin-validate'])
  assert(grsTools320.includes(`'${action}'`),`unified GRS tool backend missing action: ${action}`);
assert(grsGui320.includes("New-Page '常用'")&&grsGui320.includes("New-Page 'Android'")&&grsGui320.includes("New-Page '局域网更新'")&&grsGui320.includes("New-Page '插件与维护'"),
  'GUI toolbox must group tasks by understandable workflow tabs');
assert(fs.existsSync('./services/update-server/server.js')&&fs.existsSync('./config/update-config.default.json'),
  'runtime service/config files must live in their organized directories');
for(const rel of ['./docs/PROJECT_STRUCTURE.md','./docs/DEVELOPMENT_GUIDE.md','./docs/HANDOFF_NEXT_SESSION.md','./docs/guides/TOOLBOX_CN.md'])
  assert(fs.existsSync(rel),`v3.20 handoff/structure documentation missing: ${rel}`);
console.log('v3.20 unified-shell / developer-toolbox / project-structure checks passed.');
