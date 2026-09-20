const fs=require('fs');
const path=require('path');
const {readCoreCss}=require('./css-source');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'src','generated','runtime','plugin-kernel.js'),'utf8');
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

function defineTop(P,id,activity,{complete=true,prime=false,defaultEnabled=true,failActivate=false}={}){
  P.define({
    id,pluginType:'workbench',name:id,version:'1.0.0',enabled:defaultEnabled,apiVersion:'1.19.0',entry:'plugin.js',
    workspace:{role:'top',activity,icon:'T',title:id}
  },async ctx=>{
    ctx.ui.activities.add({id:activity,label:activity,openMode:'window',onActivate:failActivate?async()=>{throw new Error(`activate failed: ${id}`);}:undefined});
    if(complete){
      ctx.ui.topWorkspace.register({
        id:activity,activity,label:activity,
        layout:{mode:'native',root:{selector:'#root'},primary:{id:'main',presentationRole:'scientific-primary'},...(prime?{prime:[{id:'inspector',presentationRole:'inspector',priority:80,collapsible:true}]}:{})}
      });
    }
    return {};
  });
}

(async()=>{
  {
    const {P,store}=makeSandbox();
    const opened=[];
    const transitions=[];
    defineTop(P,'builtin.resonance-workbench','resonance',{prime:true});
    defineTop(P,'test.top-b','top-b');
    defineTop(P,'test.incomplete','broken',{complete:false});
    defineTop(P,'test.fail-top','fail-top',{failActivate:true});
    P.define({id:'test.support',pluginType:'extension',name:'Support',version:'1.0.0',enabled:true,apiVersion:'1.19.0',entry:'plugin.js'},async()=>({}));
    P.configure({
      openActivityWindow:async id=>opened.push(id),
      prepareSuperTransition:async change=>{transitions.push({...change});return {snapshots:[],closed:0};},
      applySuperWorkspace:()=>{},showNoSuperWorkspace:()=>{},setStatus:()=>{},
      getActiveProjectTab:()=>({pluginState:{}}),captureActiveProjectTab:()=>{}
    });
    await P.activateAll();

    assert(P.workspace.super().pluginId==='builtin.resonance-workbench','first-run initialization must select the declared default TOP when no SUPER preference exists.');
    assert(P.workspace.super().available===true,'initialized SUPER must be available.');
    assert(store.get(P.manager.superStorageKey)==='builtin.resonance-workbench','SUPER selection must persist locally.');
    assert(P.activities.active()==='resonance','current SUPER activity must be embedded as active workspace.');

    const rows=P.activities.list();
    assert(rows.find(x=>x.pluginId==='builtin.resonance-workbench')?.isSuper===true,'activity list must identify the current SUPER.');
    assert(rows.find(x=>x.pluginId==='test.top-b')?.role==='top','TOP activity role must survive registration.');

    await P.activities.set('top-b');
    assert(opened.at(-1)==='top-b','non-SUPER TOP must open an independent window rather than replacing the main workspace.');
    assert(P.activities.active()==='resonance','opening a non-SUPER TOP must not replace the embedded SUPER activity.');

    await P.manager.setSuper('test.top-b');
    assert(P.workspace.super().pluginId==='test.top-b'&&P.activities.active()==='top-b','explicit SUPER switch must replace the embedded main workspace.');
    assert(transitions.at(-1)?.pluginId==='test.top-b'&&transitions.at(-1)?.activityId==='top-b','SUPER promotion must ask the host to retire/synchronize the target TOP renderer before embedding it.');
    assert(store.get(P.manager.superStorageKey)==='test.top-b','explicit SUPER switch must persist.');

    let activationRolledBack=false;
    try{await P.manager.setSuper('test.fail-top');}catch(err){activationRolledBack=/SUPER 工作区启动失败/.test(err.message);}
    assert(activationRolledBack,'a TOP whose embedded activation fails must reject SUPER promotion.');
    assert(P.workspace.super().pluginId==='test.top-b'&&P.activities.active()==='top-b','failed SUPER promotion must restore the previous embedded SUPER workspace.');
    assert(store.get(P.manager.superStorageKey)==='test.top-b','failed SUPER promotion must not corrupt the persisted SUPER preference.');

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


    // Restore defaults must preserve the SUPER invariant even if a selected
    // TOP plugin declares enabled:false in its manifest.
    defineTop(P,'test.default-off-top','off-top',{defaultEnabled:false});
    await P.manager.enable('test.default-off-top');
    await P.manager.setSuper('test.default-off-top');
    await P.manager.resetPreferences();
    assert(P.manager.get('test.default-off-top').active&&P.manager.get('test.default-off-top').enabled,'reset preferences must preserve both enabled and active state for the current SUPER.');
  }

  {
    // A saved SUPER identity is deterministic. If it is missing or broken, the
    // host must present the neutral no-SUPER page and preserve the preference;
    // another healthy TOP must never be promoted silently for this session.
    const {P,store}=makeSandbox({'dkds.workspace.super.v1':'missing.plugin'});
    let neutralShown=0;
    defineTop(P,'builtin.resonance-workbench','resonance');
    defineTop(P,'test.top-b','top-b');
    P.configure({applySuperWorkspace:()=>{},showNoSuperWorkspace:()=>{neutralShown++;},setStatus:()=>{}});
    await P.activateAll();
    assert(P.workspace.super().pluginId==='missing.plugin'&&P.workspace.super().available===false,'missing saved SUPER must remain the selected unavailable identity instead of migrating to another TOP.');
    assert(P.activities.active()==null,'missing saved SUPER must not activate a random healthy TOP.');
    assert(neutralShown>0,'missing saved SUPER must render the neutral no-SUPER host.');
    assert(store.get(P.manager.superStorageKey)==='missing.plugin','neutral fallback must preserve the saved SUPER preference for a later retry.');
  }

  {
    const {P,store}=makeSandbox({'dkds.workspace.super.v1':'test.incomplete'});
    let neutralShown=0;
    defineTop(P,'builtin.resonance-workbench','resonance');
    defineTop(P,'test.incomplete','broken',{complete:false});
    P.configure({applySuperWorkspace:()=>{},showNoSuperWorkspace:()=>{neutralShown++;},setStatus:()=>{}});
    await P.activateAll();
    assert(P.workspace.super().pluginId==='test.incomplete'&&P.workspace.super().available===false,'known but incomplete saved SUPER must stay selected and unavailable.');
    assert(P.activities.active()==null&&neutralShown>0,'broken saved SUPER must show the neutral host without a session fallback TOP.');
    assert(store.get(P.manager.superStorageKey)==='test.incomplete','broken saved SUPER preference must survive unchanged.');
  }

  // Source-level invariants for the main shell and manager UI.
  const app=read('src/generated/runtime/app.js');
  const css=readCoreCss(root);
  const managerUi=read('src/core/plugins/manager-ui.js');
  const windowManager=read('desktop/plugin-window-manager.js');
  const resonanceManifest=JSON.parse(read('src/plugins/resonance-workbench/plugin.json'));
  const terFeature=read('src/plugins/ter-analysis/feature-runtime.js');

  assert(app.includes("activity?.openMode==='window'&&activity?.isSuper!==true"),'prewarming must exclude the currently embedded SUPER.');
  assert(app.includes("page?.classList.contains('super-workspace-root-page')"),'only the actual SUPER root page must be non-dismissible; plugin-owned SUB pages must remain closable.');
  assert(!app.includes('superWorkspaceDivider')&&!css.includes('--dkds-super-left-width'),'SUPER must not retain the retired split-layout divider or width token.');
  assert(!css.includes('.dkds-super-composed-root')&&!css.includes('.dkds-super-slot-left')&&!css.includes('.dkds-super-slot-main'),'SUPER must not retain split-composition compatibility slots.');
  assert(!css.includes('#pulseAnalysisPage.super-workspace-page')&&!css.includes('#terMaxPage.super-workspace-page')&&!css.includes('#builtin-data-center-data-center-page.super-workspace-page'),'core SUPER CSS must not hard-code built-in TOP plugin names.');
  assert(app.includes('function superWorkspaceRootPageId(contract={})')&&app.includes('contract?.layout?.root?.selector'),'main renderer must consume the canonical native TOP root contract directly.');
  assert(css.includes('box-shadow:none'),'selected top-level buttons must not retain the blue bottom underline.');
  assert(css.includes('height:34px'),'top command buttons must share a single height.');
  assert(managerUi.includes('plugin-super-selector')&&managerUi.includes('setSuper'),'plugin manager must expose an explicit SUPER selector for TOP plugins.');
  assert(managerUi.includes('topContractReady'),'plugin manager must expose whether a TOP contract is valid.');
  assert(!windowManager.includes('normalizeWindowMode')&&!windowManager.includes("mode:'compatibility'")&&!windowManager.includes("mode:'embedded'"),'TOP lifecycle must expose only the plugin-owned dedicated renderer model.');
  assert((resonanceManifest.window?.mode||'dedicated')==='dedicated'&&resonanceManifest.window?.runtime==='window-runtime.js','resonance TOP must use a dedicated plugin renderer instead of the full compatibility renderer.');
  assert(read('src/plugins/resonance-workbench/feature-runtime.js').includes("serviceName:'builtin.resonance-workbench.runtime'"),'resonance feature runtime must provide the plugin-owned resonance service while the TOP adapter stays thin.');
  assert(!app.includes('auxiliary-compatibility-window'),'main host must not retain legacy full-renderer TOP branches.');
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
  assert(source.includes('const opened=await state.host?.openActivityWindow?.(id)')&&source.includes('opened===false')&&source.includes('未能打开'),'non-SUPER TOP navigation must await the generic window host and surface failures from the shared activity lifecycle instead of shell-specific button code.');
  assert(source.includes('await state.host?.prepareSuperTransition?.({previous,pluginId:id,activityId})'),'SUPER promotion must execute the host transition barrier before changing role ownership.');
  assert(source.includes('state.superPluginId=previous')&&source.includes('SUPER 工作区启动失败'),'SUPER switching must roll back the role when embedded activation fails.');

  assert(!app.includes('placePrimeContribution')&&!source.includes('primePlacementStorageKey'),'Retired low-level PRIME placement compatibility must stay out of the host/kernel; current placement belongs to PluginWorkspace/PortableView.');
  const resonancePresentation=read('src/plugins/resonance-workbench/unit-presentation.js');
  assert(resonancePresentation.includes("placements:['float','global','left','right','bottom']")&&resonancePresentation.includes("const inspectDefault=")&&resonancePresentation.includes("groupDefault=allowed.has")&&resonancePresentation.includes(":'bottom'"),'resonance production Unit composition must preserve canvas/global float and local docks while allowing settings-driven default placement.');

  console.log('SUPER/TOP/PRIME/SUB workspace contract checks passed.');
})().catch(err=>{console.error(err);process.exit(1);});
