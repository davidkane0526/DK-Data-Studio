const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const fail=msg=>{console.error(`PLUGIN BOUNDARY ERROR: ${msg}`);process.exitCode=2;};
const html=read('src/index.html');
const app=read('src/app.js');
const kernel=read('src/core/plugin-kernel.js');
const ui=read('src/core/ui-infrastructure.js');
const detector=read('src/plugins/resonance-detector-robust/plugin.js');
const allPluginFiles=[];
for(const dirent of fs.readdirSync(path.join(root,'src/plugins'),{withFileTypes:true})){
  if(!dirent.isDirectory())continue;
  const dir=path.join(root,'src/plugins',dirent.name);
  for(const file of fs.readdirSync(dir))if(file.endsWith('.js'))allPluginFiles.push(path.join(dir,file));
}
function stripComments(source){return source.replace(/\/\*[\s\S]*?\*\//g,'').replace(/(^|[^:])\/\/.*$/gm,'$1');}
for(const file of allPluginFiles){
  const rel=path.relative(root,file).replace(/\\/g,'/');
  const src=stripComments(fs.readFileSync(file,'utf8'));
  const forbidden=[
    [/window\.electronAPI|\belectronAPI\./,'Electron bridge'],
    [/window\.Plotly|\bPlotly\./,'raw Plotly'],
    [/\bdocument\.(?:getElementById|querySelector|querySelectorAll|createElement|createElementNS)/,'raw DOM access'],
    [/new\s+(?:ResizeObserver|MutationObserver)\s*\(/,'private observer lifecycle'],
    [/\b(?:requestAnimationFrame|cancelAnimationFrame|setInterval|clearInterval|setTimeout|clearTimeout|queueMicrotask)\s*\(/,'raw scheduler lifecycle'],
    [/ctx\.registry\.add\s*\(/,'untyped generic registry'],
    [/\bctx\.host\b/,'raw host bridge'],
    [/\bproject\.(?:scanVisibility|peaks|peakCategories|algorithms|peakDisplay|activeDetector|activeMetricAlgorithm|detectorSettings|physicsShowLabels|spacingSettings|gateAnalysisSettings|transformPreviewByDataset|terMaxSettings|terHeatmapDisplay|terTransformSettings|terAlgorithmRef|terMaxResult|pulseAnalysis)\b/,'legacy project-root domain state'],
    [/window\.DKDS(?!PluginModules\b)[A-Za-z0-9_]+\s*=/,'private global module export'],
    [/\bDKDSHostRecipes\./,'raw host recipe registry'],
    [/\.on\??\(['"']plotly_click['"']/,'private Plotly click lifecycle'],
    [/\.(?:removeListener|removeAllListeners)\??\(['"']plotly_click['"']/,'private Plotly listener cleanup'],
    [/\.scrollIntoView\s*\(/,'private focus reveal/scroll lifecycle'],
    [/ctx\.ui\.charts\b/,'legacy chart surface bypass; use ui.scientificPlot']
  ];
  for(const [pattern,label] of forbidden)if(pattern.test(src))fail(`${rel}: ${label} must go through Core API v1.8.`);
}
for(const token of ['core/io-runtime.js','core/entity-runtime.js','core/chart-runtime.js','core/scientific-plot-runtime.js','core/component-runtime.js','core/data-flow-runtime.js','core/scientific-pipeline-runtime.js','core/service-runtime.js','core/plugin-module-runtime.js','core/plugin-contract-runtime.js','core/host-recipe-runtime.js']){
  if(!html.includes(token))fail(`main renderer must load ${token}`);
}
for(const token of ['io: ioScope','science: window.DKDSScience','services: serviceScope','modules: moduleScope','flow: dataFlowScope','pipeline: scientificPipelineScope','dom: componentScope','components: Object.freeze','providers: Object.freeze','workspace: Object.freeze','status: Object.freeze']){
  if(!kernel.includes(token))fail(`Plugin API v1.8 missing ${token}`);
}
const configureStart=app.indexOf('window.DKDSPlugins.configure({');
const configureEnd=configureStart>=0?app.indexOf('\n    });',configureStart):-1;
const hostConfigure=configureStart>=0&&configureEnd>configureStart?app.slice(configureStart,configureEnd):'';
for(const token of ['resonance:resonanceHostApi()','pulse:pulseHostApi()','ter:terHostApi()'])if(hostConfigure.includes(token))fail(`Core host must not expose legacy domain service ${token}`);
for(const token of ['applyResonanceWorkspace:','renderSpacingPage,','renderGateAnalysis,','renderTerMaxPage,','renderPulseAnalysis:','togglePhysicsPanel:'])if(hostConfigure.includes(token))fail(`Core host configure block must not expose domain field ${token}`);
if(!detector.includes('parameterSchema')||detector.includes('renderSettings('))fail('detectors must declare parameterSchema; Core renders settings UI.');
if(!read('src/plugins/shell-navigation/plugin.js').includes("ctx.recipes.use('shell-navigation'"))fail('shell-navigation plugin must consume the Core recipe API.');
if(!read('src/plugins/workspace-safeguards/plugin.js').includes("ctx.recipes.use('workspace-safeguards'"))fail('workspace-safeguards plugin must consume the Core recipe API.');
if(!ui.includes('class ScientificCurveSurface'))fail('Core must own D3 scientific plot interaction surface.');
if(!read('src/core/scientific-plot-runtime.js').includes('class ScientificPlotView'))fail('Core must own Plotly scientific interaction lifecycle.');
if(!read('src/core/entity-runtime.js').includes('class EntityRegistry'))fail('Core must own canonical entity identity/relationship state.');
if(!kernel.includes("const API_VERSION = '1.8.0'"))fail('Plugin API must be 1.8.0.');
if(process.exitCode)process.exit(process.exitCode);
console.log('Plugin boundary check OK: all first-party plugin infrastructure is routed through Core API v1.8.');
