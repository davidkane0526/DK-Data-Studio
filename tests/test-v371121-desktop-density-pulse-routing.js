'use strict';

const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

async function main(){
  const touch=read('src/styles/platform/touch.css');
  const schema=read('src/styles/structure/schema-and-plugin-ui.css');
  const shell=read('src/styles/structure/shell-navigation.css');
  const nativeShell=read('src/styles/platform/native-client-shell.css');
  const semantic=read('src/styles/structure/sdk-semantic-surfaces.css');

  assert(
    shell.includes('html[data-dkds-host="desktop"]{\n  --dkds-shell-top-height:84px;') &&
    schema.includes('html[data-dkds-host="desktop"] .project-tabs-bar{') &&
    schema.includes('--dkds-project-tabs-height:32px;') &&
    schema.includes('--dkds-project-tab-height:27.2px;') &&
    schema.includes('--dkds-new-project-tab-height:26.4px;') &&
    shell.includes('--dkds-project-tab-close-size:16px;'),
    'Desktop project-tab strip, tabs and integrated buttons must consume exactly 80% of the accepted vertical geometry through Structure-owned slots.'
  );
  assert(
    schema.includes('--dkds-project-tabs-height:40px;') &&
    schema.includes('--dkds-project-tab-height:34px;') &&
    schema.includes('--dkds-new-project-tab-height:33px;') &&
    shell.includes('--dkds-project-tab-close-size:20px;'),
    'Shared project-tab geometry must remain unchanged while Desktop only overrides bounded geometry slots.'
  );
  assert(
    nativeShell.includes('html[data-dkds-host="mobile"].react-native-client .project-tabs-bar{display:none}'),
    'Native Mobile project-tab policy must remain independent from the Desktop density change.'
  );

  assert(
    touch.includes('--dkds-scientific-nav-item-width:22.176px;') &&
    touch.includes('--dkds-scientific-nav-item-height:25.2px;') &&
    touch.includes('--dkds-scientific-nav-padding-inline:1.76px;'),
    'Desktop scientific floating controls must increase their complete horizontal footprint by 10% from the v3.71.121 compact baseline without changing accepted height.'
  );
  assert(
    semantic.includes('--dkds-scientific-nav-item-width:28px;') &&
    semantic.includes('--dkds-scientific-nav-item-height:28px;') &&
    nativeShell.includes('--dkds-scientific-nav-item-width:22.5px;') &&
    nativeShell.includes('--dkds-scientific-nav-item-height:20.4px;'),
    'Shared and Native Mobile scientific-control geometry must remain unchanged.'
  );

  const pulseJson=JSON.parse(read('src/plugins/pulse-analysis/plugin.json'));
  const pulseUnit=read('src/plugins/pulse-analysis/unit-presentation.js');
  const pulseFeature=read('src/plugins/pulse-analysis/feature-runtime.js');
  const pulseAdapterSource=read('src/plugins/pulse-analysis/data-adapter.js');
  const pulseServiceSource=read('src/plugins/pulse-analysis/analysis-service.js');
  const pluginWindowRuntime=read('src/plugin-window/runtime.js');
  const pluginWindowArtifactInputs=read('src/plugin-window/artifact-input-runtime.js');
  const pluginWindowIndex=read('src/plugin-window/index.html');
  assert.deepStrictEqual(
    pulseJson.data?.accepts,
    ['science.pulse.trace','data.table'],
    'Pulse must advertise both semantic pulse traces and generic DataTables as routable inputs.'
  );
  assert.strictEqual(
    pulseJson.data?.adapter,
    'data-adapter',
    'Pulse must declare one host-consumable data adapter so main and dedicated hosts share the same input projection.'
  );
  assert(
    pluginWindowIndex.includes('<script src="./artifact-input-runtime.js"></script>') &&
    pluginWindowRuntime.includes('DKDSPluginWindowArtifactInputs?.resolve?.') &&
    pluginWindowArtifactInputs.includes("const adapterId=String(manifest?.data?.adapter||'').trim();") &&
    pluginWindowArtifactInputs.includes("visibility==='project'") &&
    pluginWindowArtifactInputs.includes("rows.includes('*')||rows.includes(String(pluginId||''))"),
    'Dedicated plugin windows must apply generic assignment scoping before the manifest-declared data adapter without bloating the lifecycle runtime.'
  );
  assert(
    pulseUnit.includes("label:'分析勾选',className:'primary',variant:'primary'") &&
    pulseUnit.includes("onInvoke:()=>P.analyzeChecked()") &&
    !pulseUnit.includes('pulseAnalyzeCurrentBtn') &&
    !pulseUnit.includes('pulseAnalyzeCheckedBtn') &&
    !pulseFeature.includes('pulseAnalyzeCurrentBtn') &&
    !pulseFeature.includes('pulseAnalyzeCheckedBtn') &&
    pulseServiceSource.includes('async function analyzeChecked()'),
    'Pulse checked-file batch analysis must remain the existing single Header-owned primary action backed by analyzeChecked(), without a duplicate parameter-panel action surface.'
  );
  assert(
    pulseAdapterSource.includes("semanticType:'science.pulse.trace'") &&
    pulseAdapterSource.includes("kind:'assigned-data-table'") &&
    pulseAdapterSource.includes('return rows.map(projectArtifact).filter(Boolean);'),
    'Pulse must adapt Core-scoped assigned numeric DataTables through a read-only domain projection instead of mutating canonical Artifacts or changing the frozen analysis service.'
  );
  assert(
    pulseServiceSource.includes("String(a?.semanticType||'')==='science.pulse.trace'") &&
    !pulseServiceSource.includes('numericTableCandidate'),
    'The frozen Pulse analysis service must retain its original semantic contract; generic DataTable compatibility belongs to the plugin data adapter.'
  );

  const Analysis=require(path.join(root,'src','science','index.js'));
  const document={querySelector:()=>null,getElementById:()=>null};
  const context={
    window:{DKDSScience:Analysis,electronAPI:{}},
    document,console,structuredClone,JSON,Date,Math,Number,String,Array,Set,Map,Promise,
    requestAnimationFrame:fn=>{fn();return 1;},cancelAnimationFrame:()=>{},setTimeout,clearTimeout
  };
  context.window.window=context.window;
  context.window.document=document;
  context.window.requestAnimationFrame=context.requestAnimationFrame;
  context.globalThis=context;
  context.self=context.window;
  vm.createContext(context);
  vm.runInContext(read('src/core/plugins/module-runtime.js'),context,{filename:'plugin-module-runtime.js'});
  vm.runInContext(pulseAdapterSource,context,{filename:'pulse-data-adapter.js'});
  vm.runInContext(pulseServiceSource,context,{filename:'pulse-analysis-service.js'});
  const adapterModule=context.window.DKDSPluginModules.require('builtin.pulse-analysis','data-adapter');
  const serviceModule=context.window.DKDSPluginModules.require('builtin.pulse-analysis','analysis-service');
  const assignedGeneric={
    id:'generic-pulse-table',
    kind:'data.table',
    semanticType:'data.table',
    name:'generic pulse data',
    rowCount:6,
    metadata:{importedSource:true,dataAssignments:['builtin.pulse-analysis']},
    source:{path:'generic.tsv',name:'generic.tsv',encoding:'utf-8'},
    columns:[
      {key:'time',name:'Time',role:'x',values:[0,1,2,3,4,5]},
      {key:'current',name:'Current',role:'y',values:[1,2,3,4,5,6]},
      {key:'voltage',name:'Voltage',role:'aux',values:[0,1,0,1,0,1]},
      {key:'sourceLine',name:'Source line',role:'index',values:[1,2,3,4,5,6]}
    ]
  };
  const canonicalArtifacts={
    list:()=>[assignedGeneric],
    get:id=>String(id)===assignedGeneric.id?assignedGeneric:null
  };
  const pulseArtifacts=adapterModule.create(canonicalArtifacts);
  const projected=pulseArtifacts.list({kind:'data.table',includeTransient:true});
  assert.strictEqual(projected.length,1);
  assert.strictEqual(projected[0].semanticType,'science.pulse.trace');
  assert.strictEqual(assignedGeneric.semanticType,'data.table','Pulse projection must never mutate the canonical Artifact.');
  const runtime=await serviceModule.create({
    science:Analysis,
    setStatus:()=>{},
    copyTextToClipboard:()=>true,
    saveChartImage:()=>true,
    scheduleSnapshot:()=>{},
    artifacts:pulseArtifacts
  });
  runtime.service.refreshSources();
  const state=runtime.service.getState();
  assert.strictEqual(state.files.length,1,'An assigned generic numeric DataTable must appear in the Pulse parameter-panel source list.');
  assert.strictEqual(state.files[0].artifactId,'generic-pulse-table');
  assert.deepStrictEqual(Array.from(state.files[0].inspection?.headers||[]),['Time','Current','Voltage'],'Pulse DataTable projection must omit index columns and preserve user data fields.');

  console.log('v3.71.122 Desktop scientific width + Pulse dedicated data routing contract PASS');
}

main().catch(error=>{console.error(error);process.exitCode=1;});
