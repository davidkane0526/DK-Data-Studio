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
    touch.includes('html[data-dkds-host="desktop"]{\n  --dkds-shell-top-height:84px;') &&
    touch.includes('--dkds-project-tabs-height:32px;') &&
    touch.includes('--dkds-project-tab-height:27.2px;') &&
    /html\[data-dkds-host="desktop"\] \.project-tab-close\{[\s\S]*?width:16px;[\s\S]*?height:16px;/.test(touch) &&
    /html\[data-dkds-host="desktop"\] \.new-project-tab\{[\s\S]*?height:26\.4px;/.test(touch),
    'Desktop project-tab strip, tabs and integrated buttons must consume exactly 80% of the accepted vertical geometry.'
  );
  assert(
    schema.includes('--dkds-project-tabs-height:40px;') &&
    schema.includes('--dkds-project-tab-height:34px;') &&
    /\.project-tab-close\{[\s\S]*?width:20px;[\s\S]*?height:20px;/.test(shell),
    'Shared project-tab geometry must remain unchanged; the density change belongs to the Desktop host.'
  );
  assert(
    nativeShell.includes('html[data-dkds-host="mobile"].react-native-client .project-tabs-bar{display:none}'),
    'Native Mobile project-tab policy must remain independent from the Desktop density change.'
  );

  assert(
    touch.includes('--dkds-scientific-nav-item-width:20.16px;') &&
    touch.includes('--dkds-scientific-nav-item-height:25.2px;') &&
    touch.includes('--dkds-scientific-nav-padding-inline:1.6px;'),
    'Desktop scientific floating controls must reduce their complete horizontal footprint by 20% without changing accepted height.'
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
  const pulseServiceSource=read('src/plugins/pulse-analysis/analysis-service.js');
  assert.deepStrictEqual(
    pulseJson.data?.accepts,
    ['science.pulse.trace','data.table'],
    'Pulse must advertise both semantic pulse traces and generic DataTables as routable inputs.'
  );
  assert(
    pulseUnit.includes("id:'pulseAnalyzeCurrentBtn',label:'分析当前'") &&
    pulseUnit.includes("id:'pulseAnalyzeCheckedBtn',label:'批量分析勾选'") &&
    pulseFeature.includes("dom.query('#pulseAnalyzeCurrentBtn',page)") &&
    pulseFeature.includes("dom.query('#pulseAnalyzeCheckedBtn',page)") &&
    pulseServiceSource.includes('async function analyzeChecked()'),
    'Pulse parameter PRIME must expose the existing current and checked-file batch analysis capabilities.'
  );
  assert(
    pulseServiceSource.includes('return rows.filter(numericTableCandidate);') &&
    pulseServiceSource.includes('ctx.data.artifacts is already scoped by Core dataAssignments'),
    'Pulse must trust the Core assignment boundary and must not re-filter assigned numeric DataTables by Pulse-only semantic tags.'
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
  vm.runInContext(pulseServiceSource,context,{filename:'pulse-analysis-service.js'});
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
  const runtime=await serviceModule.create({
    science:Analysis,
    setStatus:()=>{},
    copyTextToClipboard:()=>true,
    saveChartImage:()=>true,
    scheduleSnapshot:()=>{},
    artifacts:{list:()=>[assignedGeneric]}
  });
  runtime.service.refreshSources();
  const state=runtime.service.getState();
  assert.strictEqual(state.files.length,1,'An assigned generic numeric DataTable must appear in the Pulse parameter-panel source list.');
  assert.strictEqual(state.files[0].artifactId,'generic-pulse-table');
  assert.deepStrictEqual(Array.from(state.files[0].inspection?.headers||[]),['Time','Current','Voltage'],'Pulse DataTable projection must omit index columns and preserve user data fields.');

  console.log('v3.71.121 Desktop density + Pulse Data Center routing/batch contract PASS');
}

main().catch(error=>{console.error(error);process.exitCode=1;});
