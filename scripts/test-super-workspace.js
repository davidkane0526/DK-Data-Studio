const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'src','core','plugin-kernel.js'),'utf8');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};

function makeSandbox(initial={}){
  const store=new Map(Object.entries(initial));
  const classList={toggle(){},add(){},remove(){},contains(){return false;}};
  const body={dataset:{},classList};
  const localStorage={
    getItem:key=>store.has(key)?store.get(key):null,
    setItem:(key,value)=>store.set(key,String(value)),
    removeItem:key=>store.delete(key)
  };
  const sandbox={
    console,localStorage,setTimeout,clearTimeout,queueMicrotask,
    ResizeObserver:class ResizeObserver{observe(){} disconnect(){}},
    CustomEvent:class CustomEvent{constructor(type,init={}){this.type=type;this.detail=init.detail;}}
  };
  sandbox.window=sandbox;
  sandbox.globalThis=sandbox;
  sandbox.document={
    body,
    querySelector:()=>null,
    querySelectorAll:()=>[],
    getElementById:()=>null,
    createElement:()=>({
      dataset:{},classList:{toggle(){},add(){},remove(){}},
      appendChild(){},remove(){},addEventListener(){},matches(){return false;},
      getBoundingClientRect(){return {width:0,height:0};}
    }),
    head:{appendChild(){}}
  };
  sandbox.window.addEventListener=()=>{};
  sandbox.window.removeEventListener=()=>{};
  sandbox.window.dispatchEvent=()=>{};
  vm.runInNewContext(source,sandbox,{filename:'plugin-kernel.js'});
  return {sandbox,P:sandbox.DKDSPlugins,store};
}

function defineTop(P,id,activity,{complete=true,prime=false,defaultEnabled=true}={}){
  P.define({
    id,name:id,version:'1.0.0',enabled:defaultEnabled,apiVersion:'1.3.0',
    workspace:{role:'top',activity,icon:'T',title:id}
  },async ctx=>{
    ctx.ui.activities.add({id:activity,label:activity,openMode:'window'});
    if(complete){
      ctx.ui.topWorkspace.register({
        id:activity,activity,label:activity,
        layout:{root:{selector:'#root'},left:{role:'data-display',selector:'#left'},main:{role:'primary-data',selector:'#main'}}
      });
    }
    if(prime)ctx.ui.prime.register('inspector',{activity,placements:['float','right','bottom']});
    return {};
  });
}

(async()=>{
  {
    const {P,store}=makeSandbox();
    const opened=[];
    const placed=[];
    defineTop(P,'builtin.resonance-workbench','resonance',{prime:true});
    defineTop(P,'test.top-b','top-b');
    defineTop(P,'test.incomplete','broken',{complete:false});
    P.define({id:'test.support',name:'Support',version:'1.0.0',enabled:true,apiVersion:'1.3.0'},async()=>({}));
    P.configure({
      openActivityWindow:async id=>opened.push(id),
      placePrime:(value,placement)=>{placed.push(`${value.pluginId}:${value.id}:${placement}`);return true;},
      applySuperWorkspace:()=>{},showNoSuperWorkspace:()=>{},setStatus:()=>{},
      getActiveProjectTab:()=>({pluginState:{}}),captureActiveProjectTab:()=>{}
    });
    await P.activateAll();

    assert(P.workspace.super().pluginId==='builtin.resonance-workbench','first migration must select resonance only when no SUPER preference exists.');
    assert(P.workspace.super().available===true,'migrated SUPER must be available.');
    assert(store.get(P.manager.superStorageKey)==='builtin.resonance-workbench','SUPER selection must persist locally.');
    assert(P.activities.active()==='resonance','current SUPER activity must be embedded as active workspace.');
    assert(placed.includes('builtin.resonance-workbench:inspector:float'),'SUPER activation must apply PRIME default placement through the generic host adapter.');
    await P.workspace.placePrime('builtin.resonance-workbench','inspector','right');
    assert(P.workspace.primePlacement('builtin.resonance-workbench','inspector')==='right','generic PRIME placement API must report the selected placement.');
    const savedPrime=JSON.parse(store.get(P.manager.primePlacementStorageKey)||'{}');
    assert(savedPrime['builtin.resonance-workbench:inspector']==='right','generic PRIME placement must persist locally by default.');

    const rows=P.activities.list();
    assert(rows.find(x=>x.pluginId==='builtin.resonance-workbench')?.isSuper===true,'activity list must identify the current SUPER.');
    assert(rows.find(x=>x.pluginId==='test.top-b')?.role==='top','TOP activity role must survive registration.');

    await P.activities.set('top-b');
    assert(opened.at(-1)==='top-b','non-SUPER TOP must open an independent window rather than replacing the main workspace.');
    assert(P.activities.active()==='resonance','opening a non-SUPER TOP must not replace the embedded SUPER activity.');

    await P.manager.setSuper('test.top-b');
    assert(P.workspace.super().pluginId==='test.top-b'&&P.activities.active()==='top-b','explicit SUPER switch must replace the embedded main workspace.');
    let foreignPrimeBlocked=false;
    try{await P.workspace.placePrime('builtin.resonance-workbench','inspector','float');}catch(err){foreignPrimeBlocked=/当前 SUPER/.test(err.message);}
    assert(foreignPrimeBlocked,'main-window PRIME placement must be scoped to the current SUPER.');
    assert(store.get(P.manager.superStorageKey)==='test.top-b','explicit SUPER switch must persist.');

    let blocked=false;
    try{await P.manager.disable('test.top-b');}catch(err){blocked=/SUPER/.test(err.message);}
    assert(blocked,'current SUPER must not be directly disabled.');

    let incomplete=false;
    try{await P.manager.setSuper('test.incomplete');}catch(err){incomplete=/TOP 工作区契约/.test(err.message);}
    assert(incomplete,'TOP without a complete workspace contract must not be promotable to SUPER.');

    let support=false;
    try{await P.manager.setSuper('test.support');}catch(err){support=/不是 TOP/.test(err.message);}
    assert(support,'support plugins must never be promotable to SUPER.');

    await P.manager.setSuper('builtin.resonance-workbench');
    await P.manager.disable('test.top-b');
    assert(!P.manager.get('test.top-b').active,'former SUPER must become a normal TOP and may be disabled after another TOP is selected.');

    const prime=P.workspace.prime().find(x=>x.pluginId==='builtin.resonance-workbench');
    assert(prime&&Array.isArray(prime.placements)&&prime.placements.join(',')==='float,right,bottom','PRIME must expose normalized allowed placements.');

    // Restore defaults must preserve the SUPER invariant even if a selected
    // TOP plugin declares enabled:false in its manifest.
    defineTop(P,'test.default-off-top','off-top',{defaultEnabled:false});
    await P.manager.enable('test.default-off-top');
    await P.manager.setSuper('test.default-off-top');
    await P.manager.resetPreferences();
    assert(P.manager.get('test.default-off-top').active&&P.manager.get('test.default-off-top').enabled,'reset preferences must preserve both enabled and active state for the current SUPER.');
  }

  {
    // A saved but unavailable SUPER is intentional state: do not silently
    // choose the next TOP and surprise the user.
    const {P}=makeSandbox({'dkds.workspace.super.v1':'missing.plugin'});
    defineTop(P,'builtin.resonance-workbench','resonance');
    defineTop(P,'test.top-b','top-b');
    P.configure({applySuperWorkspace:()=>{},showNoSuperWorkspace:()=>{},setStatus:()=>{}});
    await P.activateAll();
    assert(P.workspace.super().configured===false&&P.workspace.super().available===false,'invalid saved SUPER must enter explicit unconfigured state.');
    assert(P.activities.active()===null,'invalid saved SUPER must not fall back to another TOP.');
  }

  // Source-level invariants for the main shell and manager UI.
  const app=read('src/app.js');
  const css=read('src/style.css');
  const managerUi=read('src/core/plugin-manager-ui.js');
  const windowManager=read('plugin-window-manager.js');
  const resonanceManifest=JSON.parse(read('src/plugins/resonance-workbench/plugin.json'));
  const terFeature=read('src/plugins/ter-analysis/feature-runtime.js');

  assert(app.includes("activity?.openMode==='window'&&activity?.isSuper!==true"),'prewarming must exclude the currently embedded SUPER.');
  assert(app.includes("page?.classList.contains('super-workspace-root-page')"),'only the actual SUPER root page must be non-dismissible; plugin-owned SUB pages must remain closable.');
  assert(app.includes('superWorkspaceDivider'),'main renderer must own the adjustable SUPER left/main divider.');
  assert(css.includes('--dkds-super-left-width'),'SUPER layout must use a shared adjustable left-region width token.');
  assert(css.includes('.dkds-super-composed-root')&&css.includes('.dkds-super-slot-left')&&css.includes('.dkds-super-slot-main'),'core SUPER layout must be driven by semantic TOP slots.');
  assert(!css.includes('#pulseAnalysisPage.super-workspace-page')&&!css.includes('#terMaxPage.super-workspace-page')&&!css.includes('#builtin-data-center-data-center-page.super-workspace-page'),'core SUPER CSS must not hard-code built-in TOP plugin names.');
  assert(app.includes('applySuperWorkspaceComposition')&&app.includes('querySuperContractSelectors'),'main renderer must compose TOP contracts generically at runtime.');
  assert(css.includes('box-shadow:none!important'),'selected top-level buttons must not retain the blue bottom underline.');
  assert(css.includes('height:34px!important'),'top command buttons must share a single height.');
  assert(managerUi.includes('plugin-super-selector')&&managerUi.includes('setSuper'),'plugin manager must expose an explicit SUPER selector for TOP plugins.');
  assert(managerUi.includes('topContractReady'),'plugin manager must expose whether a TOP contract is valid.');
  assert(windowManager.includes("WINDOW_MODES = new Set(['dedicated','compatibility'])"),'independent TOP lifecycle must support compatibility windows without special activity whitelists.');
  assert((resonanceManifest.window?.mode||'dedicated')==='dedicated'&&resonanceManifest.window?.runtime==='window-runtime.js','resonance TOP must use a dedicated plugin renderer instead of the full compatibility renderer.');
  assert(read('src/plugins/resonance-workbench/feature-runtime.js').includes("serviceName:'resonance'"),'resonance feature runtime must provide the plugin-owned resonance service while the TOP adapter stays thin.');
  assert(app.includes("auxiliary-compatibility-window")&&css.includes("body.auxiliary-window:not(.auxiliary-compatibility-window) .workspace"),'generic compatibility-window support must remain for older third-party plugins even though built-in resonance no longer needs it.');
  assert(terFeature.includes("mode:'native'")&&terFeature.includes('dkds-plugin-workbench-root'),'TER SUPER/TOP layout must delegate composition to the unified native Analysis Workbench.');
  assert(!terFeature.includes("selectors:['.ter-controls','.analysis-note','.heatmap-display-controls']"),'TER must not register three independent left grid items in SUPER mode.');

  assert(app.includes('function superWorkspaceRootPageId('),'core must derive the one true SUPER root from any TOP workspace contract.');
  assert(app.includes("page.classList.toggle('super-workspace-root-page',isRoot)"),'SUPER root identity must be contract-driven rather than resonance-specific.');
  assert(css.includes('.analysis-page.super-workspace-root-page .analysis-page-close'),'only the SUPER root close control may be hidden; derived resonance pages must keep Return-to-main behavior.');
  assert(!css.includes('.analysis-page.super-workspace-page .analysis-page-close{display:none'),'non-root pages owned by the SUPER must not lose their close/return control.');
  const topFolders=['resonance-workbench','ter-analysis','pulse-analysis','data-center'];
  for(const folder of topFolders){
    const manifest=JSON.parse(read(`src/plugins/${folder}/plugin.json`));
    const combined=(manifest.scripts||[manifest.entry||'plugin.js']).map(file=>read(`src/plugins/${folder}/${file}`)).join('\n');
    assert(manifest.workspace?.role==='top',`${folder} must declare the generic TOP role.`);
    assert(combined.includes('ctx.ui.topWorkspace.register'),`${folder} must register a complete generic TOP contract before it can become SUPER.`);
  }
  assert(source.includes('const opened=await host?.openActivityWindow?.(spec.id)'),'non-SUPER TOP navigation must await the generic window host and surface failures instead of silently doing nothing.');

  assert(app.includes('placePrimeContribution')&&app.includes('primeRightDockSlot')&&app.includes('primeBottomDockSlot'),'main renderer must expose generic PRIME right/bottom/float placement hosts.');
  assert(source.includes('placePrimeContribution')&&source.includes('primePlacementStorageKey'),'plugin kernel must own generic PRIME placement and local persistence.');
  const resonanceViews=read('src/plugins/resonance-workbench/view-components.js');
  assert(resonanceViews.includes("placements:['float','left','right','bottom']")&&resonanceViews.includes("defaultPlacement:'bottom'"),'resonance shared View composition must expose canvas-local left/right/bottom/float PRIME placement through PluginWorkspace.');

  console.log('SUPER/TOP/PRIME/SUB workspace contract checks passed.');
})().catch(err=>{console.error(err);process.exit(1);});
