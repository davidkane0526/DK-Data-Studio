'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const Module=require('module');
process.env.NODE_PATH=[path.join(process.cwd(),'src/core'),process.env.NODE_PATH||''].filter(Boolean).join(path.delimiter);Module._initPaths();
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const {LAYOUT_RECIPES}=require('../src/core/ui/modules/composition/unit-template-layout-spec');
const bootstrapStyleGate={set(){},setToken(){},remove(){},snapshot(){return{};}};global.DKDSStyleGate=bootstrapStyleGate;global.window={DKDSStyleGate:bootstrapStyleGate,innerWidth:900,addEventListener(){},removeEventListener(){}};global.innerWidth=900;
const {MobileWebSurfacePresenter}=require('../src/core/ui/modules/presentation/mobile-web-surface');

(async()=>{
  // 1) Unit default: paired fields align their controls, not their label baselines.
  assert.strictEqual(LAYOUT_RECIPES['form-grid-2'].alignItems,'end','Two-column Unit forms must align by control bottom by default.');
  assert.strictEqual(LAYOUT_RECIPES['form-grid-4'].alignItems,'end','Four-column Unit forms must align by control bottom by default.');

  // 2) A native parameter Drawer may be compact, but its minimum must still
  // preserve two usable canonical parameter tracks. The Unit runtime keeps the
  // native Drawer in the two-column recipe instead of applying the desktop-only
  // last-resort single-column breakpoint.
  const presenter=new MobileWebSurfacePresenter();
  const layoutRuntime=read('src/core/ui/modules/composition/unit-template-layout.js');
  assert.strictEqual(typeof presenter.twoColumnParameterContentFloorPx,'undefined','Presenter must not own Unit two-column geometry.');
  assert(layoutRuntime.includes('dkdsUnitInlinePreferredMin'),'Layout Unit must publish its own intrinsic density constraint.');
  assert(!layoutRuntime.includes('singleFloor+1'),'Native Drawer must not feed a fabricated width into Unit responsive geometry.');

  // 3) Direct Unit actions are field-height peers. They must not grow to
  // label+control height when placed as a grid item beside fields.
  const structure=read('src/styles/structure/sdk-semantic-surfaces.css');
  assert(structure.includes('[data-dkds-unit-template="action-v2"][data-dkds-unit-control-height="field"]'),'Direct Action Unit must expose the field-height contract.');
  assert(structure.includes('height:var(--dkds-field-control-min-height,var(--plugin-control-height,32px))'),'Direct Action height must consume the same canonical control-height token as fields.');

  // 4) Pulse outer Panels own plot/table containment and width. The Sampling
  // panel must content-size its final result row, not clip an internally stacked
  // result grid behind the parent shadow.
  const pulse=read('src/plugins/pulse-sampler-tool/unit-presentation.js');
  for(const token of [
    "units.layout.apply(analysis.body,{variant:'identity'",
    "const commandSurface=units.layout.create(analysis.body,{variant:'identity'",
    "width:'100%',maxWidth:'100%'",
    "variant:'result-grid-asymmetric',geometry:{width:'100%',maxWidth:'100%',minWidth:'0'}",
    "leftWidth:540,leftMin:520,leftReserve:520"
  ])assert(pulse.includes(token),`Pulse containment/minimum-width contract missing: ${token}`);
  assert(!pulse.includes("const commandSurface=units.panel.create"),'Pulse Sampling content must have one Material Panel owner, not a nested shadow surface.');
  assert(!pulse.includes("responsiveTarget:workspaceHost"),'Pulse nested Sampling/Result Units must measure local allocated width so actions cannot overflow.');

  // 5) TER heatmap-display controls use the same public two-column Field Unit
  // anatomy as other compact cards, so labels/control rows align without plugin CSS.
  const ter=read('src/plugins/ter-analysis/unit-presentation.js');
  assert(ter.includes("units.layout.apply(displayPanel.element,{variant:'form-grid-2',geometry:{padding:'10px 12px'}})"),'TER heatmap display card must use public Unit two-column geometry.');
  assert(!/units\.field\.create\(displayPanel\.element,\{variant:'analysis-control'/.test(ter),'TER heatmap display must not fall back to legacy analysis-control anatomy.');

  // 6) Plot-heavy Unit composition must not synchronously execute full material
  // semantic assignment while panels are still detached. This is the cold-start
  // regression that repeatedly hit TER after shadow ownership was made explicit.
  class ClassList{constructor(){this.values=new Set();}add(...rows){for(const row of rows)for(const v of String(row||'').split(/\s+/).filter(Boolean))this.values.add(v);}remove(...rows){for(const row of rows)this.values.delete(row);}contains(v){return this.values.has(v);}}
  class FakeElement{
    constructor(tag='div'){this.tagName=String(tag).toUpperCase();this.nodeType=1;this.dataset={};this.classList=new ClassList();this.children=[];this.parentNode=null;this.parentElement=null;this.className='';this.isConnected=false;}
    appendChild(node){if(node&&typeof node==='object'){node.parentNode=this;node.parentElement=this;}this.children.push(node);return node;} append(...rows){for(const row of rows)this.appendChild(row);} setAttribute(){} addEventListener(){}
  }
  const oldDocument=global.document,oldWindow=global.window,oldMaterial=global.DKDSMaterialSurface,oldStyleGate=global.DKDSStyleGate;
  const fakeDocument={createElement:tag=>new FakeElement(tag),createTextNode:text=>({nodeType:3,textContent:String(text)}),querySelector:()=>null};
  global.document=fakeDocument;global.window={document:fakeDocument,addEventListener(){},removeEventListener(){}};const styleGate={set(){},setToken(){},remove(){},snapshot(){return{};}};global.DKDSStyleGate=styleGate;global.window.DKDSStyleGate=styleGate;
  const material=[];global.DKDSMaterialSurface={apply(node,role){material.push([node,role]);node.dataset.dkdsMaterialAssignedRole=role;}};global.window.DKDSMaterialSurface=global.DKDSMaterialSurface;
  try{
    delete require.cache[require.resolve('../src/core/ui/modules/composition/unit-template-foundation')];
    const {FoundationUnitRuntime}=require('../src/core/ui/modules/composition/unit-template-foundation');
    const runtime=new FoundationUnitRuntime({actions:{mount(){return null;}},track(){}}),host=new FakeElement();
    const panelHandle=runtime.createPanel(host,{variant:'plain',header:false,sizing:'content'}),panel=panelHandle.element;
    assert.strictEqual(material.length,0,'Detached Unit Panel must not synchronously run full Material assignment.');
    assert(panel.classList.contains('dkds-material-role-surface'),'Detached Unit Panel must still declare the Core surface role immediately.');
    assert.notStrictEqual(panelHandle.body,panel,'Content-sized headerless Panel must expose a dedicated body instead of conflating Material shell and content layout.');
    assert.strictEqual(panel.dataset.dkdsUnitPanelSizing,'content');
    panel.isConnected=true;await Promise.resolve();
    assert.strictEqual(material.length,1,'Material assignment must complete once composition has connected the Unit panel.');
  } finally {global.document=oldDocument;global.window=oldWindow;global.DKDSMaterialSurface=oldMaterial;global.DKDSStyleGate=oldStyleGate;}

  console.log('v3.71.47 Unit minimum-width / containment / TER cold-start contract PASS');
})().catch(error=>{console.error(error);process.exitCode=1;});
