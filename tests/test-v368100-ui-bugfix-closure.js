
'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

// Data Center multi-select must truly accumulate, not replace the previous row.
{
  const modules=new Map();
  const context={console,Map,Set,Object,Array,String,Number};
  context.window=context;context.globalThis=context;
  context.DKDSPluginModules={define:(plugin,id,value)=>modules.set(`${plugin}:${id}`,value),get:(plugin,id)=>modules.get(`${plugin}:${id}`)};
  vm.createContext(context);
  vm.runInContext(read('src/plugins/data-center/artifact-selection.js'),context,{filename:'artifact-selection.js'});
  let items=[];
  const selection={
    selectMany(rows){items=rows.map(r=>({type:r.type,id:String(r.id)}));},
    select(row,options={}){
      const item={type:row.type,id:String(row.id)},idx=items.findIndex(x=>x.type===item.type&&x.id===item.id);
      if(options.toggle&&idx>=0)items.splice(idx,1);
      else if(options.additive){if(idx<0)items.push(item);else items[idx]=item;}
      else items=[item];
    }
  };
  const controller={selection,getSelection:()=>({items}),select:value=>{items=[{type:'data-center.artifact',id:String(value.id)}];},clearSelection:()=>{items=[];}};
  const rows=[{id:'a',kind:'data.table',name:'A'},{id:'b',kind:'data.table',name:'B'},{id:'c',kind:'data.table',name:'C'}];
  const runtime=modules.get('builtin.data-center:artifact-selection').create({ctx:{data:{artifacts:{listMetadata:()=>rows}}},controller,visibleArtifacts:()=>rows});
  runtime.activate(rows[0],rows,{ctrlKey:true});
  runtime.activate(rows[1],rows,{ctrlKey:true});
  assert.deepStrictEqual([...runtime.selectedIds()].sort(),['a','b'],'multi-select taps must accumulate selected artifacts');
  runtime.activate(rows[0],rows,{ctrlKey:true});
  assert.deepStrictEqual([...runtime.selectedIds()],['b'],'tapping an already selected artifact must only toggle that artifact off');
}

const dcSelection=read('src/plugins/data-center/artifact-selection.js');
assert(dcSelection.includes('{toggle:true,additive:true,source:\'data-center-toggle\'}'),'Data Center touch multi-select must explicitly preserve the existing canonical selection set');

const status=read('src/plugins/status-monitor/plugin.js');
const chrome=read('src/styles/presentation/plugin-chrome.css');
assert(!status.includes('dkdsMemoryPanelNote')&&!status.includes('dkds-memory-panel-note'),'Memory panel must not reserve a top explanatory paragraph');
assert(status.includes('dkds-memory-component-bytes')&&status.includes('data-release-activity'),'Memory rows must keep aligned byte values and an explicit release action for releasable hidden plugins');
assert(chrome.includes('font-variant-numeric:tabular-nums'),'Memory values must retain aligned tabular numerals independent of release-action presentation');

const pulse=read('src/plugins/pulse-sampler-tool/plugin.js');
const pulseCss=read('src/plugins/pulse-sampler-tool/plugin.css');
assert(pulse.includes("designerPanel.classList.add('dkds-prime-hidden')")&&pulse.includes('workbench.park?.(designerPanel)'),'Pulse Designer parameters must be parked by default instead of remaining in PRIMARY');
assert(pulse.includes("defaultPlacement:'left'")&&pulse.includes("stateVersion:'presentation-v3'"),'Pulse parameter PRIME must still reopen through the left parameter surface');
assert(pulseCss.includes('grid-template-rows:auto auto auto auto minmax(120px,1fr)')&&pulse.includes("semanticKind:'panel',sizing:'fill'"),'Pulse parameter table must consume available panel height instead of collapsing to a header-only strip');

const importCss=read('src/styles/presentation/import-workbench.css');
assert(importCss.includes('background:rgba(15,23,42,.28)')&&importCss.includes('--dkds-material-fill-floor:94%'),'Import workbench must use a lighter overlay and a more opaque modal material');
assert(importCss.includes('.import-empty{background:transparent;background-image:none;}'),'Import workbench empty state must not add the previous grey radial haze');

console.log('v3.68.100 UI bugfix closure PASS');
