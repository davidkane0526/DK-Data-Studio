const fs = require('fs');
const vm = require('vm');
const path = require('path');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const store = new Map();
const localStorage = {
  getItem:key => store.has(key) ? store.get(key) : null,
  setItem:(key,value) => store.set(key,String(value)),
  removeItem:key => store.delete(key),
};

const sandbox = {
  console,
  localStorage,
  setTimeout,
  clearTimeout,
  CustomEvent: class CustomEvent { constructor(type, init={}) { this.type=type; this.detail=init.detail; } },
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.document = {
  querySelector:()=>null,
  querySelectorAll:()=>[],
  createElement:()=>{ throw new Error('DOM should not be needed in kernel lifecycle test'); },
  head:{ appendChild(){} }
};
sandbox.window.dispatchEvent=()=>{};

const source = fs.readFileSync(path.join(__dirname,'..','src','core','plugin-kernel.js'),'utf8');
vm.runInNewContext(source,sandbox,{filename:'plugin-kernel.js'});
const P=sandbox.DKDSPlugins;

let value=7;
let activations=0;
const tab={pluginState:{}};

P.define({
  id:'test.stateful',name:'Stateful',version:'1.0.0',enabled:true,apiVersion:'1.0.0'
},async ctx=>{
  activations++;
  ctx.project.registerSlice('settings',{
    serialize:()=>({schema:1,value}),
    restore:data=>{if(data&&Number.isFinite(data.value))value=data.value;},
    reset:()=>{value=-1;}
  });
  ctx.registry.add('analysis.providers','stateful',{id:'stateful'});
  return {};
});


let migrationMarker='stale';
P.define({
  id:'test.project-root-migration',name:'Project root migration',version:'1.0.0',enabled:true,apiVersion:'1.0.0'
},async ctx=>{
  ctx.project.registerSlice('workspace',{
    serialize:()=>({marker:migrationMarker}),
    restore:(data,{legacyProject}={})=>{migrationMarker=data?.marker||legacyProject?.marker||'empty-root';},
    reset:()=>{migrationMarker='reset';}
  });
  return {};
});

P.define({
  id:'test.default-off',name:'Default Off',version:'1.0.0',enabled:false,apiVersion:'1.0.0'
},async ctx=>{
  ctx.registry.add('analysis.providers','default-off',{id:'default-off'});
  return {};
});

P.define({
  id:'test.error',name:'Broken',version:'1.0.0',enabled:false,apiVersion:'1.0.0'
},async ctx=>{
  ctx.registry.add('analysis.providers','broken-partial',{id:'broken-partial'});
  throw new Error('expected activation failure');
});


P.define({
  id:'test.windowed',name:'Windowed',version:'1.0.0',enabled:true,apiVersion:'1.0.0',
  window:{activity:'windowed',prewarm:false,reuse:true,persistence:'project'}
},async()=>({}));

P.define({
  id:'test.duplicate',name:'Duplicate provider',version:'1.0.0',enabled:false,apiVersion:'1.1.0'
},async ctx=>{
  ctx.registry.add('analysis.providers','stateful',{id:'stateful'});
  return {};
});

P.configure({
  getActiveProjectTab:()=>tab,
  captureActiveProjectTab:()=>{tab.pluginState=P.project.serialize(tab.pluginState||{});},
  setStatus:()=>{}
});

(async()=>{
  await P.activateAll();
  assert(P.manager.get('test.stateful').active,'default-enabled plugin should activate');
  assert(!P.manager.get('test.default-off').active,'default-disabled plugin should stay inactive');
  P.project.restore({}, null);
  assert(migrationMarker==='reset','activating into a brand-new tab with no slice must reset plugin memory instead of inheriting stale state.');
  P.project.restore({}, {marker:'fresh-project-root'});
  assert(migrationMarker==='fresh-project-root','missing plugin slices may migrate from the explicitly supplied current project root.');
  migrationMarker='stale-again';
  P.project.restore({}, null);
  assert(migrationMarker==='reset','restoring a truly blank project with no legacy root must reset all missing plugin slices.');

  value=23;
  await P.manager.disable('test.stateful');
  assert(!P.manager.get('test.stateful').enabled,'disable should persist desired state');
  assert(!P.manager.get('test.stateful').active,'disable should deactivate immediately');
  assert(tab.pluginState['test.stateful'].settings.value===23,'disable must capture plugin project state before cleanup');

  value=0;
  await P.manager.enable('test.stateful');
  assert(P.manager.get('test.stateful').active,'enable should reactivate immediately');
  assert(value===23,'enable should restore current project plugin state');
  assert(activations===2,'stateful plugin should have activated twice');

  await P.manager.reload('test.stateful');
  assert(P.manager.get('test.stateful').active,'reload should leave plugin active');
  assert(activations===3,'reload should reactivate plugin');

  await P.manager.enable('test.default-off');
  assert(P.manager.get('test.default-off').active,'user should be able to enable default-off plugin');

  let failed=false;
  try { await P.manager.enable('test.error'); } catch { failed=true; }
  assert(failed,'activation error should reject manager enable');
  assert(P.manager.get('test.error').status==='error','failed plugin should show error status');
  assert(P.manager.get('test.error').enabled,'failed enable remains desired enabled state for retry');
  const leaked=(P.diagnostics().registries['analysis.providers']||[]).some(row=>row.pluginId==='test.error');
  assert(!leaked,'failed activation must roll back partial contributions before retry');

  let duplicateFailed=false;
  try { await P.manager.enable('test.duplicate'); } catch (err) { duplicateFailed=/already owned by test\.stateful/.test(err.message); }
  assert(duplicateFailed,'globally addressed provider ids must be unique across plugins');
  const statefulProviders=(P.diagnostics().registries['analysis.providers']||[]).filter(row=>row.id==='stateful');
  assert(statefulProviders.length===1&&statefulProviders[0].pluginId==='test.stateful','duplicate provider activation must not replace the original owner');

  const windowed=P.manager.get('test.windowed');
  assert(windowed.hasWindow,'windowed plugin should expose an independent-window state row');
  assert(windowed.prewarmDefault===false&&windowed.prewarmEnabled===false,'built-in/default prewarm=false should remain off until user opts in');
  P.manager.setPrewarm('test.windowed',true);
  assert(P.manager.get('test.windowed').prewarmEnabled===true,'user must be able to enable prewarm from plugin manager');
  assert(JSON.parse(store.get(P.manager.prewarmStorageKey))['test.windowed']===true,'prewarm preference should persist separately from enable/disable');
  P.manager.setPrewarm('test.windowed',false);
  assert(P.manager.get('test.windowed').prewarmEnabled===false,'user must be able to disable prewarm again');

  const saved=JSON.parse(store.get(P.manager.storageKey));
  assert(saved['test.stateful']===true,'enabled preference should persist to localStorage');
  assert(saved['test.default-off']===true,'default-off override should persist');

  await P.manager.resetPreferences();
  assert(P.manager.get('test.stateful').active,'reset should restore manifest default enabled state');
  assert(!P.manager.get('test.default-off').active,'reset should restore manifest default disabled state');
  assert(P.manager.get('test.windowed').prewarmEnabled===false,'reset should restore manifest default prewarm state');

  console.log('Plugin manager lifecycle/state-preservation tests passed.');
})().catch(err=>{console.error(err);process.exit(1);});
