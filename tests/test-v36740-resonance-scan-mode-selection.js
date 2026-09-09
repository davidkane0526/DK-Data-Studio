const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg)};

const source=read('src/plugins/resonance-workbench/feature-controls-runtime.js');
const component=read('src/styles/theme/component-appearance.css');

// The shared Resonance runtime is used by Desktop and Mobile. A Mobile-focused
// patch must never convert these four mode selectors into momentary commands.
assert(source.includes("button.classList.toggle('selected',selected)"),'scan-mode runtime must apply canonical selected state to the current mode');
assert(source.includes("button.setAttribute('aria-pressed',String(selected))"),'scan-mode runtime must publish true/false pressed state for every mode button');
assert(source.includes("button.classList.remove('active')"),'scan-mode runtime must clear stale active state before applying selected state');
assert(!source.includes("button.setAttribute('aria-current','true')"),'scan-mode selection must not regress to a nonvisual aria-current-only state');
assert(component.includes('[data-dkds-component-identity="toolbarAction"]:is(.selected,[aria-selected="true"]){background:var(--dkds-ca-action-surface-selected)'),
  'canonical toolbarAction selected state must retain a visible fill');

let moduleFactory=null;
const sandbox={
  window:{
    DKDSPluginModules:{
      define(pluginId,moduleId,value){
        if(pluginId==='builtin.resonance-workbench'&&moduleId==='feature-controls-runtime')moduleFactory=value;
      }
    }
  },
  console
};
vm.runInNewContext(source,sandbox,{filename:'feature-controls-runtime.js'});
assert(moduleFactory&&typeof moduleFactory.create==='function','failed to load Resonance feature-controls module');

function fakeButton(){
  const classes=new Set();
  const attrs=new Map();
  return {
    classList:{
      add(...names){for(const n of names)classes.add(n)},
      remove(...names){for(const n of names)classes.delete(n)},
      toggle(name,force){if(force===undefined){if(classes.has(name)){classes.delete(name);return false}classes.add(name);return true}if(force)classes.add(name);else classes.delete(name);return !!force},
      contains(name){return classes.has(name)}
    },
    setAttribute(name,value){attrs.set(name,String(value))},
    removeAttribute(name){attrs.delete(name)},
    getAttribute(name){return attrs.has(name)?attrs.get(name):null}
  };
}

const selectors={
  '#reswinShowAll':fakeButton(),
  '#reswinShowForward':fakeButton(),
  '#reswinShowReverse':fakeButton(),
  '#reswinHideAll':fakeButton()
};
const live={
  datasets:[{path:'a'},{path:'b'}],
  sweeps:[],
  selectedSweepId:'',
  workspace:{scanVisibility:[],mainView:{},algorithms:{},peakDisplay:{},peaks:[],peakCategories:[]}
};
const actions={
  visibilityMap(){return new Map(live.workspace.scanVisibility||[])},
  isVisible(){return true},selectedSweep(){return null},setSelectedSweepId(){},visibleSweeps(){return []},
  ensureMainSurface(){return null},render(){},scheduleSnapshot(){},datasetEntityId(path){return path},
  colorForPeakOrder(){return '#000'},renderLinkedSelection(){},rebuild(){},refreshData(){}
};
const runtime=moduleFactory.create({
  live,
  services:{$:selector=>selectors[selector]||null,transforms:null,S:{preset:()=>({})},setStatus(){}},
  actions,
  utils:{esc:value=>String(value??''),finite:value=>Number.isFinite(Number(value)),directionName:value=>String(value)}
});

const keyToSelector={all:'#reswinShowAll',forward:'#reswinShowForward',reverse:'#reswinShowReverse',none:'#reswinHideAll'};
function assertMode(expected){
  runtime.render();
  for(const [key,selector] of Object.entries(keyToSelector)){
    const button=selectors[selector];
    const shouldSelect=key===expected;
    assert(button.classList.contains('selected')===shouldSelect,`${key} selected class mismatch for mode ${expected||'mixed'}`);
    assert(button.classList.contains('active')===false,`${key} retained stale active class`);
    assert(button.getAttribute('aria-pressed')===String(shouldSelect),`${key} aria-pressed mismatch for mode ${expected||'mixed'}`);
  }
}

assertMode('all');
for(const mode of ['forward','reverse','none','all']){
  runtime.setAllVisibility(mode);
  assertMode(mode);
}

// Mixed per-dataset visibility has no global preset selected. This is the exact
// case that prevents an old mode from keeping a stale persistent fill.
live.workspace.scanVisibility=[
  ['a',{forward:true,reverse:false}],
  ['b',{forward:false,reverse:true}]
];
assertMode('');

console.log('v3.67.40 Resonance scan-mode selection PASS: current preset has fill; every non-current preset clears fill, including mixed visibility.');
