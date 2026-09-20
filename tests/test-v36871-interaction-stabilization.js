'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const assert=(cond,msg)=>{if(!cond)throw new Error(msg);};
const atLeast=(actual,required)=>{const a=String(actual).split('.').map(Number),b=String(required).split('.').map(Number);for(let i=0;i<Math.max(a.length,b.length);i++){const d=(a[i]||0)-(b[i]||0);if(d)return d>0;}return true;};

const pkg=json('package.json');
assert(atLeast(pkg.version,'3.68.71'),'App version must remain at or above 3.68.71.');
assert(json('mobile/app.json').expo.android.versionCode>=93,'Android versionCode must advance for the interaction stabilization build.');
assert(atLeast(json('src/plugins/data-center/plugin.json').version,'1.15.16'),'Data Center runtime version must remain at or above 1.15.16.');

// 1) Global floating PlotViews must never be draggable under the page header.
const portable=read('src/core/ui/modules/layout/portable-view.js');
for(const token of [
  "const homePage=this.node.closest?.('.analysis-page')||null",
  "homePage?.querySelector?.(':scope > .analysis-page-header')",
  'floatingZoneMetrics(mode=',
  'Math.ceil(relativeBottom+4)',
  'const safeTop=Math.max(mobileHost?6:0,this.floatingZoneMetrics(placement).minTop)',
  'minTop=Math.max(0,Number(metrics.minTop)||0)',
  'clientY-state.dy-state.zoneTop'
])assert(portable.includes(token),`PortableView protected-top geometry missing: ${token}`);
assert(!/data-center|resonance|\bter\b|pulse/i.test(portable),'Core PortableView fix must remain plugin/domain blind.');

// 2) Data Center context actions must preserve a multi-selection and execute batch-capable actions on it.
const dc=read('src/plugins/data-center/feature-runtime.js');
const selection=read('src/plugins/data-center/artifact-selection.js');
for(const token of [
  'const selectedArtifacts=()=>',
  'const contextArtifacts=target=>',
  'if(selected.has(String(target.id))){const rows=selectedArtifacts();if(rows.length)return rows;}'
])assert(selection.includes(token),`Data Center selection runtime contract missing: ${token}`);
for(const token of [
  'contextActions:context=>dataActionItems(contextArtifacts(context.artifact))',
  'selectionRuntime.focusContext(a)',
  'async function setArtifactsExcluded(rows,value)',
  'async function deleteArtifacts(rows,{confirm=true}={})',
  'async function setArtifactAssignments(rows,ids)',
  'async function toggleAssignmentForArtifacts(rows,targetId)',
  '删除选中（${count}）',
  '排除选中（${count}）'
])assert(dc.includes(token),`Data Center batch context contract missing: ${token}`);
assert(selection.includes("controller.selection?.select?.(selectionItem(a),{additive:true,source:'data-center-context-focus'})"),'Right-clicking an already-selected row must preserve the multi-selection.');
assert(!dc.includes("contextActions:context=>dataActionItems(context.artifact)"),'Right-click must not collapse batch actions back to the single context artifact.');

// 3) Ctrl/Cmd+A belongs to the Data Object pane while the pointer/focus is there; long-press must not select row text.
for(const token of [
  'let pointerInside=false',
  "dom.on(pane,'pointerenter'",
  "dom.on(pane,'selectstart'",
  'pointerInside||pane.contains?.(event.target)',
  "if(mod&&key==='a'){event.preventDefault();event.stopPropagation();onSelectAll?.()",
  "dom.on(page,'keydown',event=>"
])assert(selection.includes(token),`Data Center selection shortcut contract missing: ${token}`);
assert(dc.includes('selectionRuntime.bindPaneShortcuts({dom,page,pane:artifactPane,list:artifactListEl'), 'Data Center must bind the extracted pane-scoped shortcut owner.');
const dcCss=read('src/plugins/data-center/plugin.css');
assert(dcCss.includes('.dc-artifact-list')&&dcCss.includes('user-select:none')&&dcCss.includes('-webkit-touch-callout:none'),'Data-object rows must suppress browser/WebView text selection on long press.');

// 4) Mobile drawer outside-dismiss is frame-owned; controls inside the drawer must never toggle the drawer closed.
const adapters=read('src/core/ui/modules/interaction/adapters.js');
for(const token of [
  'data-dkds-mobile-frame-region="drawer"',
  'data-dkds-mobile-active="true"',
  "const eventPath=typeof event.composedPath==='function'?event.composedPath():[]",
  'activeDrawerFrames.find(frame=>eventPath.includes(frame)||frame.contains?.(event.target))',
  'if(activeDrawerFrames.length&&!targetDrawerFrame)',
  "const interactive=event.target?.closest?.('input,textarea,select,option,button,a,label,[contenteditable=\"true\"]",
  'if(targetDrawerFrame){',
  'if(interactive)return;'
])assert(adapters.includes(token),`Mobile drawer interaction containment missing: ${token}`);
assert(!adapters.includes('> [data-dkds-mobile-region="drawer"][data-dkds-mobile-active="true"]'),'Drawer dismissal must not depend on the old direct-child projected-node shape.');

// 5) Viewport-anchored menus/dropdowns close when their owning page scrolls.
const context=read('src/core/ui/modules/interaction/context-actions.js');
for(const token of [
  'this.boundScroll=this.handleScroll.bind(this)',
  'handleScroll(event)',
  'if(this.element?.contains?.(event?.target))return;',
  "document.addEventListener('scroll',this.boundScroll,true)",
  "document.removeEventListener('scroll',this.boundScroll,true)",
  "if(active?.tagName==='SELECT'&&!active.contains?.(target))"
])assert(context.includes(token),`Context/select scroll-dismiss contract missing: ${token}`);
const commandMenu=read('src/core/plugins/kernel/modules/shortcuts/menu.js');
assert(commandMenu.includes("document.addEventListener?.('scroll',event=>"),'Shell command menus must observe page scrolling.');
assert(commandMenu.includes("if(event.target?.closest?.('.command-menu,.dkds-context-menu'))return;"),'Internal menu scrolling must remain usable.');
assert(commandMenu.includes('closeOtherCommandMenus();')&&commandMenu.includes('closeContextOverflowPopup();'),'Page scroll must close shell/overflow command menus through their owning APIs.');


// Runtime/data-flow reproductions. These complement the ownership/source checks
// above so this stabilization patch cannot pass by keeping token-shaped source
// text while breaking the actual interaction behavior.
{
  const vm=require('vm');
  const modules=new Map();
  const sandbox={window:{DKDSPluginModules:{define:(id,name,obj)=>modules.set(`${id}:${name}`,obj),get:(id,name)=>modules.get(`${id}:${name}`)||null}}};
  sandbox.globalThis=sandbox.window;vm.createContext(sandbox);
  vm.runInContext(selection,sandbox,{filename:'data-center/artifact-selection.js'});
  const rows=[{id:'a',kind:'data.table',name:'A'},{id:'b',kind:'data.table',name:'B'},{id:'c',kind:'data.table',name:'C'}];
  let items=[];
  const controller={
    getSelection:()=>({items}),
    selection:{
      selectMany(next){items=next.map(row=>({...row}));},
      select(item,options={}){
        const id=String(item.id||'');
        if(options.toggle){const index=items.findIndex(row=>String(row.id)===id);if(index>=0)items.splice(index,1);else items.push({...item});return;}
        if(options.additive){if(!items.some(row=>String(row.id)===id))items.push({...item});return;}
        items=[{...item}];
      }
    },
    select(value){items=[{type:'data-center.artifact',id:String(value.id||''),value:{...value}}];},
    clearSelection(){items=[];}
  };
  const runtime=modules.get('builtin.data-center:artifact-selection').create({ctx:{data:{artifacts:{listMetadata:()=>rows}}},controller,visibleArtifacts:()=>rows.slice(0,2)});
  runtime.selectAll();
  assert(items.length===2&&items.map(row=>row.id).join(',')==='a,b','Runtime select-all must select every currently visible Data Center artifact.');
  runtime.focusContext(rows[0]);
  assert(runtime.contextArtifacts(rows[0]).length===2,'Right-clicking one member of a multi-selection must preserve and return the whole selection.');
  runtime.focusContext(rows[2]);
  assert(items.length===1&&items[0].id==='c'&&runtime.contextArtifacts(rows[2]).length===1,'Right-clicking outside the selection must intentionally retarget to that one artifact.');

  const events=[],dom={on:(target,type,fn)=>events.push({target,type,fn})},pane={contains:target=>target===pane},list={focus(){list.focused=true;}};
  let selectedAll=0,prevented=false,stopped=false;
  runtime.bindPaneShortcuts({dom,page:{},pane,list,onSelectAll:()=>selectedAll++,onInvert:()=>{},onClear:()=>{}});
  events.find(row=>row.type==='pointerenter')?.fn({});
  events.find(row=>row.type==='keydown')?.fn({key:'a',ctrlKey:true,metaKey:false,target:{closest:()=>null},preventDefault(){prevented=true;},stopPropagation(){stopped=true;}});
  assert(selectedAll===1&&prevented&&stopped&&list.focused===true,'Ctrl/Cmd+A must be consumed by the Data Object pane while the pointer is inside it.');
}
{
  const fs=require('fs'),vm=require('vm');
  const source=fs.readFileSync(path.join(root,'src/core/ui/modules/layout/portable-view.js'),'utf8');
  const moduleBox={exports:{}};
  const fakeGate={set(){},setToken(){},remove(){}};
  const context={module:moduleBox,exports:moduleBox.exports,console,window:{innerWidth:1000,innerHeight:700},document:{body:{}},require:id=>{
    if(id==='../foundation/shortcuts')return {hostState:{root:null},esc:v=>String(v),resolveElement:v=>v,resolveScopedElement:()=>null,cleanupCall(){},readJson:()=>({}),writeJson(){}};
    if(id==='../interaction/context-actions')return {ContextMenu:class {}};
    if(id==='./docking')return {normalizePlacement:v=>String(v||'home'),refreshDockZoneState(){}};
if(id==='../../../host/native-touch-drag')return {bind:()=>()=>{}};
    if(id==='ui/style-ownership-gate')return fakeGate;
    throw new Error(id);
  }};context.globalThis=context;vm.createContext(context);vm.runInContext(source,context,{filename:'portable-view.js'});
  const {PortableView}=moduleBox.exports,view=Object.create(PortableView.prototype),zone={getBoundingClientRect:()=>({left:0,top:0,width:1000,height:700,right:1000,bottom:700})};
  view.wrapper={classList:{contains:()=>true}};view.zone=()=>zone;view.original={page:{classList:{contains:()=>false}},header:{isConnected:true,getBoundingClientRect:()=>({top:8,bottom:58,height:50})}};
  const metrics=view.floatingZoneMetrics('global');
  assert(metrics.minTop===62,'A global floating PlotView must reserve the source page header plus the four-pixel safety gap.');
}
{
  const vm=require('vm'),fs=require('fs');
  const source=fs.readFileSync(path.join(root,'src/core/ui/modules/interaction/context-actions.js'),'utf8');
  const moduleBox={exports:{}},documentStub={addEventListener(){},removeEventListener(){},activeElement:null};
  const context={module:moduleBox,exports:moduleBox.exports,console,window:{},document:documentStub,require:id=>{
    if(id==='../foundation/shortcuts')return {esc:v=>String(v),resolveElement:v=>v,cleanupCall(){},shortcutHub:{}};
    if(id==='ui/style-ownership-gate')return {KINDS:{},set(){},remove(){}};
    if(id==='./transient-registry')return {registerContextMenu(){},unregisterContextMenu(){},dismissAllContextMenus(){}};
    throw new Error(id);
  },Object};context.globalThis=context;vm.createContext(context);vm.runInContext(source,context,{filename:'context-actions.js'});
  const menu=new moduleBox.exports.ContextMenu('test');let closes=0;menu.element={contains:target=>target==='menu-scroll'};menu.close=()=>{closes++;};
  menu.handleScroll({target:'menu-scroll'});assert(closes===0,'Scrolling inside a long context menu must remain usable.');
  menu.handleScroll({target:'page-scroll'});assert(closes===1,'Scrolling the owning page must dismiss the viewport-anchored context menu.');
}
{
  const prior={window:global.window,document:global.document,performance:global.performance};
  const listeners={};let button=null;
  const frame={dataset:{dkdsMobileSurfaceId:'parameters'},contains:target=>target===button};
  button={closest(selector){if(selector.includes('data-dkds-mobile-frame-region="drawer"'))return frame;if(selector.includes('button'))return button;return null;}};
  const outside={closest:()=>null};
  global.window={DKDSPlugins:{activities:{active:()=> 'resonance'}}};
  global.document={addEventListener(type,fn){listeners[type]=fn;},querySelectorAll(selector){return selector.includes('dkds-mobile-frame-region="drawer"')?[frame]:[];}};
  global.performance={now:()=>1000};
  delete require.cache[require.resolve('../src/core/ui/modules/interaction/adapters')];
  const {MobileGestureAdapter}=require('../src/core/ui/modules/interaction/adapters');let dispatched=0;
  new MobileGestureAdapter({dispatch:()=>{dispatched++;return true;}}).installDocumentBindings();
  listeners.pointerdown({isPrimary:true,pointerType:'touch',pointerId:1,clientX:120,clientY:120,target:button,composedPath:()=>[button,frame],cancelable:true,preventDefault(){},stopPropagation(){}});
  assert(dispatched===0,'Tapping an interactive control inside an active Mobile parameter drawer must not dismiss it.');
  listeners.pointerdown({isPrimary:true,pointerType:'touch',pointerId:2,clientX:500,clientY:120,target:outside,composedPath:()=>[outside],cancelable:true,preventDefault(){},stopPropagation(){}});
  assert(dispatched===1,'A genuine outside tap must still dismiss the active Mobile parameter drawer exactly once.');
  if(prior.window===undefined)delete global.window;else global.window=prior.window;
  if(prior.document===undefined)delete global.document;else global.document=prior.document;
  if(prior.performance===undefined)delete global.performance;else global.performance=prior.performance;
}

console.log('v3.68.71 interaction stabilization: protected floats / batch context / selection gestures / drawer containment / scroll-dismiss PASS.');
