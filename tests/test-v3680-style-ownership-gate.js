'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const ROOT=path.resolve(__dirname,'..');
const {StyleOwnershipRegistry,KINDS}=require('../src/core/contracts/style-ownership');
const GateSemantics=require('../src/core/contracts/style-ownership-semantics');
const authored=require('../tools/quality/style-ownership-gate');
const runtimeWrites=require('../tools/quality/runtime-style-write-audit');
const styleOwnership=require('../tools/quality/style-ownership');

// 1) Pure counter semantics: repeated writes by the same owner do not create a
// competing owner; a second distinct owner must turn the slot into a conflict.
{
  const registry=new StyleOwnershipRegistry({name:'test'});
  registry.expect({component:'scientific.header.action',slot:'height',kind:KINDS.FINAL_PROPERTY,platform:'desktop',scope:'semantic',expectedOwner:'Geometry'});
  registry.claim({component:'scientific.header.action',slot:'height',kind:KINDS.FINAL_PROPERTY,platform:'desktop',scope:'semantic',owner:'Geometry'});
  registry.claim({component:'scientific.header.action',slot:'height',kind:KINDS.FINAL_PROPERTY,platform:'desktop',scope:'semantic',owner:'Geometry'});
  let row=registry.status({component:'scientific.header.action',slot:'height',kind:KINDS.FINAL_PROPERTY,platform:'desktop',scope:'semantic'});
  assert.strictEqual(row.ownerCount,1);
  assert.strictEqual(row.claimCount,2);
  assert.strictEqual(row.status,'SINGLE_OWNER');
  assert.strictEqual(registry.validate().ok,true);
  registry.claim({component:'scientific.header.action',slot:'height',kind:KINDS.FINAL_PROPERTY,platform:'desktop',scope:'semantic',owner:'PluginWorkspace'});
  row=registry.status({component:'scientific.header.action',slot:'height',kind:KINDS.FINAL_PROPERTY,platform:'desktop',scope:'semantic'});
  assert.strictEqual(row.ownerCount,2);
  assert.strictEqual(row.status,'OWNER_CONFLICT');
  assert.strictEqual(registry.validate().ok,false);
}

// 1b) Context is a real key dimension. Different explicit contexts may each
// have one owner, while a duplicate owner inside the same context must conflict.
{
  const registry=new StyleOwnershipRegistry({name:'context'});
  registry.claim({component:'semantic:toolbarAction',slot:'box-shadow',state:'base',context:'component=standalone',owner:'AppearanceA'});
  registry.claim({component:'semantic:toolbarAction',slot:'box-shadow',state:'base',context:'component=grouped',owner:'AppearanceB'});
  assert.strictEqual(registry.status({component:'semantic:toolbarAction',slot:'box-shadow',state:'base',context:'component=standalone'}).status,'SINGLE_OWNER');
  assert.strictEqual(registry.status({component:'semantic:toolbarAction',slot:'box-shadow',state:'base',context:'component=grouped'}).status,'SINGLE_OWNER');
  registry.claim({component:'semantic:toolbarAction',slot:'box-shadow',state:'base',context:'component=grouped',owner:'AppearanceC'});
  assert.strictEqual(registry.status({component:'semantic:toolbarAction',slot:'box-shadow',state:'base',context:'component=grouped'}).status,'OWNER_CONFLICT');
  assert.strictEqual(GateSemantics.normalizeContext({material:'panel',component:'grouped'}),'component=grouped;material=panel');
  assert.strictEqual(GateSemantics.matchesContext('component=grouped;material=panel','component=grouped'),true);
  assert.strictEqual(GateSemantics.matchesContext('component=standalone;material=panel','component=grouped'),false);
  assert.strictEqual(GateSemantics.EXPECTATIONS.length,249);
  assert(GateSemantics.EXPECTATIONS.some(row=>row.identity==='toolbarAction'&&row.state==='base'&&row.slot==='box-shadow'&&row.context==='component=grouped'),'Grouped toolbar actions must have an explicit context-specific canonical expectation.');
  assert(GateSemantics.EXPECTATIONS.some(row=>row.identity==='field'&&row.state==='base'&&row.slot==='border-top-left-radius'&&row.context==='layout=integrated'),'Integrated fields must have an explicit layout-context final-property expectation.');
  assert(GateSemantics.EXPECTATIONS.some(row=>row.identity==='chip'&&row.state==='base'&&row.slot==='background'&&row.context==='variant=success'),'Direct-paint chip variants must have variant-context final-property expectations.');
  assert(GateSemantics.EXPECTATIONS.some(row=>row.identity==='field'&&row.state==='base'&&row.slot==='background-color'&&row.context==='recipe=thin-glass'),'Glass field paint must have recipe-context final-property expectations.');
  assert(GateSemantics.EXPECTATIONS.some(row=>row.identity==='panelHeader'&&row.state==='base'&&row.slot==='backdrop-filter'&&row.context==='recipe=thin-glass'&&row.owner==='src/styles/theme/material-renderer.css'),'Nested glass headers must record Material Renderer as the real recipe-context final-property owner.');
}

// 2) Expected but unclaimed is an ownership defect too.
{
  const registry=new StyleOwnershipRegistry({name:'unowned'});
  registry.expect({component:'x',slot:'background',expectedOwner:'Appearance'});
  const report=registry.validate();
  assert.strictEqual(report.ok,false);
  assert(report.violations.some(row=>row.reason==='unowned'));
}

// 2b) Source-location metadata must remain correct through comments and nested
// at-rules; jump metadata is only useful if line numbers survive parsing.
{
  const sample='/* header\ncomment */\n@media (min-width: 1px){\n  [data-dkds-component-identity=\"toolbarAction\"]{color:red;}\n}';
  const rows=styleOwnership.ruleBlocks(sample);
  assert.strictEqual(rows.length,1);
  assert.strictEqual(rows[0].line,4);
}

// 3) The authored CSS gate must be healthy on the shipping tree and the Core
// source must contain no direct runtime style writer outside the Gate itself.
{
  const report=authored.validate();
  assert.strictEqual(report.ok,true);
  assert(report.declarationClaims>10000,`expected broad authored coverage, got ${report.declarationClaims}`);
  assert(report.registryClaims>10000,`expected broad claim registry, got ${report.registryClaims}`);
  assert(report.expected>=251,`expected expanded context-aware managed semantic UNOWNED coverage, got ${report.expected}`);
  const groupedShadow=report.snapshot.rows.find(row=>row.component==='semantic:toolbarAction'&&row.state==='base'&&row.slot==='box-shadow'&&row.context==='component=grouped');
  assert(groupedShadow&&groupedShadow.status==='SINGLE_OWNER'&&groupedShadow.owners.includes('src/styles/theme/component-appearance.css'),'Grouped toolbarAction box-shadow must resolve to one context-specific authored owner.');
  const integratedRadius=report.snapshot.rows.find(row=>row.component==='semantic:field'&&row.state==='base'&&row.slot==='border-top-left-radius'&&row.context==='layout=integrated');
  assert(integratedRadius&&integratedRadius.status==='SINGLE_OWNER'&&integratedRadius.owners.includes('src/styles/theme/component-appearance.css'),'Integrated field radius must resolve to one layout-context owner.');
  const chipSuccess=report.snapshot.rows.find(row=>row.component==='semantic:chip'&&row.state==='base'&&row.slot==='background'&&row.context==='variant=success');
  assert(chipSuccess&&chipSuccess.status==='SINGLE_OWNER','Success chip final paint must resolve to one variant-context owner.');
  const glassField=report.snapshot.rows.find(row=>row.component==='semantic:field'&&row.state==='base'&&row.slot==='background-color'&&row.context==='recipe=thin-glass');
  assert(glassField&&glassField.status==='SINGLE_OWNER','Thin-glass field paint must resolve to one recipe-context owner.');
  const glassHeader=report.snapshot.rows.find(row=>row.component==='semantic:panelHeader'&&row.state==='base'&&row.slot==='backdrop-filter'&&row.context==='recipe=thin-glass');
  assert(glassHeader&&glassHeader.status==='SINGLE_OWNER'&&glassHeader.owners.includes('src/styles/theme/material-renderer.css'),'Thin-glass panelHeader backdrop must resolve to Material Renderer, not Component Appearance.');
  assert.deepStrictEqual(authored.semanticContextsOf(':where([data-dkds-material-recipe="thin-glass"],[data-dkds-material-recipe="soft-glass"],[data-dkds-material-recipe="liquid-glass"]) [data-dkds-component-identity="field"]'),['recipe=thin-glass','recipe=soft-glass','recipe=liquid-glass'],'Static Gate must expand one selector with recipe alternatives into live context candidates.');
  assert.strictEqual(report.version,'1.5.0');
  const focusOwner=report.snapshot.rows.find(row=>row.component==='semantic:toolbarAction'&&row.state==='focus-visible'&&row.slot==='outline');
  assert(focusOwner&&focusOwner.sources.some(source=>/component-appearance\.css:\d+ ::/.test(source)),'Authored Gate sources must carry reliable file:line jump metadata.');
  assert.strictEqual(authored.stateOf('[data-dkds-component-identity="toolbarAction"]:hover:not(:disabled)'),'hover');
  assert.strictEqual(authored.stateOf('[data-dkds-component-identity="field"]:focus-visible'),'focus-visible');
  assert(report.semanticLiveSlots>=250,`expected semantic component collapse coverage, got ${report.semanticLiveSlots}`);
  assert.strictEqual(report.semanticLiveViolations,0);
  const runtime=runtimeWrites.validate();
  assert.strictEqual(runtime.ok,true);
  assert.strictEqual(runtime.scope,'first-party-browser-src');
  assert(runtime.files>=180,`expected full first-party browser source coverage, got ${runtime.files}`);
  assert(runtime.gateWrapperNames.length>=30,`expected Style Gate wrapper binding coverage, got ${runtime.gateWrapperNames.length}`);
  assert(runtime.gateWrapperNames.includes('menuSet'),'ContextMenu Style Gate helper must be statically bound.');
  assert.strictEqual(runtime.version,'1.6.0');
  assert(runtime.gateSourceCalls>=70,`expected direct Gate source provenance coverage, got ${runtime.gateSourceCalls}`);
  assert.strictEqual(runtime.gateSourceMissing,0);
  assert.strictEqual(runtime.gateSourceExempt,0,'Component Runtime caller provenance must remove every source exemption.');
  const missingSource=runtimeWrites.auditText(`const StyleGate={set(){}}; StyleGate.set(el,'width','10px',{owner:'Geometry'});`,'synthetic-source.js');
  assert(missingSource.violations.some(row=>row.kind==='style-gate-source-missing'),'Direct Gate writes without stable source identity must fail the runtime ownership audit.');
  const ownedSource=runtimeWrites.auditText(`const StyleGate={set(){}}; StyleGate.set(el,'width','10px',{owner:'Geometry',source:'src/core/ui/example.js'});`,'synthetic-source.js');
  assert(!ownedSource.violations.some(row=>row.kind==='style-gate-source-missing'),'Direct Gate writes with source identity must pass provenance validation.');
  const packageRuntime=fs.readFileSync(path.join(ROOT,'src/core/plugins/kernel/modules/package-runtime.js'),'utf8'),pluginApi=fs.readFileSync(path.join(ROOT,'src/core/plugins/kernel/modules/plugin-api.js'),'utf8');
  assert(packageRuntime.includes('document.currentScript')&&packageRuntime.includes('dkdsPluginEntry')&&packageRuntime.includes('sourceIdentity:currentPluginSource(manifest)'),'Plugin definition must capture the actual loaded script identity instead of fabricating Component Runtime provenance.');
  assert(pluginApi.includes('source:componentSource'),'Plugin API must propagate captured plugin source identity into the Component Runtime scope.');
  assert.strictEqual(runtime.violations.length,0);
  const missing=runtimeWrites.auditGateWrapperBindings(`function open(){menuSet(el,'visibility','hidden');}`);
  assert.deepStrictEqual(missing.violations.map(row=>row.name),['menuSet'],'unbound Gate wrappers must fail static ownership validation.');
  const bound=runtimeWrites.auditGateWrapperBindings(`const menuSet=(el,p,v)=>StyleGate.set(el,p,v); function open(){menuSet(el,'visibility','hidden');}`);
  assert.strictEqual(bound.violations.length,0,'bound Gate wrapper must pass static ownership validation.');
  const rawD3Paint=runtimeWrites.auditText(`plot.attr('stroke','#f00');`,'synthetic-d3.js');
  assert(rawD3Paint.violations.some(row=>row.kind==='svg-paint-attribute'),'raw D3 scientific paint must fail the runtime ownership audit.');
  const rawMarkupPaint=runtimeWrites.auditText(`<svg><path fill="none" stroke="red"/></svg>`,'synthetic-markup.js');
  assert(rawMarkupPaint.violations.some(row=>row.kind==='svg-paint-markup'),'runtime SVG markup paint must fail the ownership audit.');
  const rawPresentation=runtimeWrites.auditText(`plot.attr('display','none'); node.setAttribute('cursor','grab');`,'synthetic-presentation.js');
  assert(rawPresentation.violations.some(row=>row.kind==='svg-presentation-attribute'),'raw D3 runtime presentation must fail the ownership audit.');
  assert(rawPresentation.violations.some(row=>row.kind==='svg-presentation-set-attribute'),'raw SVG runtime presentation setAttribute must fail the ownership audit.');
  const boundPaint=runtimeWrites.auditGateWrapperBindings(`const selectionPaint=(sel,p,v)=>StyleGate.setPaint(sel,p,v); function render(){selectionPaint(node,'stroke','#f00');}`);
  assert.strictEqual(boundPaint.violations.length,0,'bound Gate paint wrapper must pass static ownership validation.');
  const boundPresentation=runtimeWrites.auditGateWrapperBindings(`const selectionPresentation=(sel,p,v)=>StyleGate.setPresentation(sel,p,v); function render(){selectionPresentation(node,'display','none');}`);
  assert.strictEqual(boundPresentation.calls.length,1,'Gate presentation wrapper calls must be recognized by the static binding audit.');
  assert.strictEqual(boundPresentation.violations.length,0,'bound Gate presentation wrapper must pass static ownership validation.');
}

// 4) Browser runtime Gate: same owner -> count 1, second owner -> count 2; raw
// inline writes and pre-styled inserted nodes are observed as bypasses.
class FakeStyle{
  constructor(){this.map=new Map();}
  setProperty(k,v){this.map.set(String(k),String(v));}
  removeProperty(k){this.map.delete(String(k));}
  getPropertyValue(k){return this.map.get(String(k))||'';}
  getPropertyPriority(){return '';}
  get length(){return this.map.size;}
  item(i){return [...this.map.keys()][i]||'';}
  get cssText(){return [...this.map].map(([k,v])=>`${k}: ${v}`).join('; ');}
  set cssText(text){this.map.clear();for(const raw of String(text||'').split(';')){const i=raw.indexOf(':');if(i>0)this.setProperty(raw.slice(0,i).trim(),raw.slice(i+1).trim());}}
}
class FakeElement{
  constructor(tag='div'){this.nodeType=1;this.tagName=tag.toUpperCase();this.dataset={};this.id='';this.className='';this.style=new FakeStyle();this.children=[];this.attrs=new Map();}
  setAttribute(name,value){this.attrs.set(String(name),String(value));}
  removeAttribute(name){this.attrs.delete(String(name));}
  hasAttribute(name){return this.attrs.has(String(name));}
  getAttribute(name){return name==='style'?this.style.cssText:(this.attrs.get(String(name))||'');}
  querySelectorAll(selector){const names=String(selector||'').split(',').map(x=>/^\[([^\]]+)\]$/.exec(x.trim())?.[1]).filter(Boolean),out=[];const walk=node=>{for(const child of node.children||[]){if(names.some(name=>name==='style'?!!child.style?.cssText:child.hasAttribute?.(name)))out.push(child);walk(child);}};walk(this);return out;}
}
{
  let mutationCallback=null,mutationSubscriptions=0;
  const html=new FakeElement('html');html.dataset.dkdsHost='desktop';html.classList={contains:()=>false};
  const document={documentElement:html,createElement:tag=>new FakeElement(tag)};
  const context={console,Date,Map,Set,WeakMap,Object,String,Number,Array,Math,document};
  context.globalThis=context;context.window=context;
  context.DKDSDOMMutationHub={subscribe(_owner,callback){mutationSubscriptions++;mutationCallback=callback;return()=>{mutationCallback=null;};}};
  vm.runInNewContext(fs.readFileSync(path.join(ROOT,'src/core/theme/style-ownership-gate-runtime.js'),'utf8'),context,{filename:'style-ownership-gate-runtime.js'});
  const gate=context.DKDSStyleGate;assert.strictEqual(mutationSubscriptions,0,'Runtime bypass observation must stay off on the normal application hot path.');assert.strictEqual(gate.snapshot().runtimeAuditEnabled,false);const releaseAudit=gate.acquireRuntimeAudit('unit-test');assert.strictEqual(typeof releaseAudit,'function');assert.strictEqual(mutationSubscriptions,1);assert.strictEqual(gate.snapshot().runtimeAuditEnabled,true);const el=new FakeElement('button');el.dataset.dkdsComponentIdentity='toolbarAction';
  gate.set(el,'height','22px',{owner:'Geometry',component:'toolbarAction',source:'src/styles/structure/test.css:10'});
  gate.set(el,'height','24px',{owner:'Geometry',component:'toolbarAction',source:'src/styles/structure/test.css:10'});
  let row=gate.rowsForElement(el).find(x=>x.slot==='height');
  assert.strictEqual(row.ownerCount,1);
  assert.strictEqual(row.claimCount,2);
  gate.set(el,'height','26px',{owner:'OtherGeometry',component:'toolbarAction',source:'src/plugins/test/plugin.css:4'});
  row=gate.rowsForElement(el).find(x=>x.slot==='height');
  assert.strictEqual(row.ownerCount,2);
  assert.strictEqual(row.status,'OWNER_CONFLICT');
  assert(row.sources.some(source=>source.includes('test.css:10'))&&row.sources.some(source=>source.includes('plugin.css:4')),'Runtime element rows must expose all claimed sources.');
  assert(row.ownerSources.some(pair=>pair.owner==='Geometry'&&pair.sources.includes('src/styles/structure/test.css:10'))&&row.ownerSources.some(pair=>pair.owner==='OtherGeometry'&&pair.sources.includes('src/plugins/test/plugin.css:4')),'Runtime conflicts must preserve the exact owner -> source mapping.');
  const contextual=new FakeElement('button');gate.set(contextual,'opacity','1',{owner:'Appearance',component:'toolbarAction',context:'component=grouped',source:'src/core/theme/component-appearance.js'});const contextualRow=gate.rowsForElement(contextual).find(x=>x.slot==='opacity');assert.strictEqual(contextualRow.context,'component=grouped');assert.strictEqual(gate.evaluate({component:'toolbarAction',slot:'opacity',kind:gate.KINDS.RUNTIME_INLINE,state:'runtime',context:'component=grouped',platform:'desktop',scope:'runtime-inline'},['Appearance'],['src/core/theme/component-appearance.js']).context,'component=grouped');

  // Pure runtime evaluation lets Style Trace count different authored owners
  // that match the same real DOM element without mutating the Gate registry.
  const evaluated=gate.evaluate({component:'toolbarAction',slot:'height',kind:gate.KINDS.FINAL_PROPERTY,state:'computed',scope:'authored-cascade'},['Geometry','Geometry','PluginWorkspace'],['structure.css','plugin.css']);
  assert.strictEqual(evaluated.ownerCount,2);
  assert.strictEqual(evaluated.claimCount,3);
  assert.strictEqual(evaluated.status,'OWNER_CONFLICT');
  assert(Array.isArray(evaluated.ownerSources)&&evaluated.ownerSources.length===2,'Pure evaluation rows must expose owner/source provenance to Style Trace.');

  // Simulate a raw author that bypasses Gate after attachment.
  const raw=new FakeElement('div');raw.style.setProperty('width','99px');
  mutationCallback([{type:'attributes',target:raw,attributeName:'style',oldValue:''}]);
  assert(gate.snapshot().unauthorizedObserved>=1);

  // Also catch style attributes authored before a subtree is inserted.
  const inserted=new FakeElement('section'),child=new FakeElement('span');child.style.setProperty('opacity','.5');inserted.children.push(child);
  const before=gate.snapshot().unauthorizedObserved;
  mutationCallback([{type:'childList',target:html,addedNodes:[inserted]}]);
  assert(gate.snapshot().unauthorizedObserved>before);

  // A Gate permit is value-bound, not a generic future waiver. If raw code
  // overwrites the same property before MutationObserver runs, the mismatch
  // must still be reported instead of consuming a stale permit.
  const raced=new FakeElement('div');gate.set(raced,'width','10px',{owner:'Geometry',component:'raced',source:'src/core/ui/raced.js'});raced.style.setProperty('width','11px');
  const raceBefore=gate.snapshot().unauthorizedObserved;mutationCallback([{type:'attributes',target:raced,attributeName:'style',oldValue:''}]);assert(gate.snapshot().unauthorizedObserved>raceBefore);

  // Multiple detached Gate writes collapse to the latest expected value on
  // insertion and must not leave a stale permit that can authorize a later raw write.
  const detached=new FakeElement('div');gate.set(detached,'opacity','.2',{owner:'Appearance',component:'detached'});gate.set(detached,'opacity','.4',{owner:'Appearance',component:'detached'});mutationCallback([{type:'childList',target:html,addedNodes:[detached]}]);
  detached.style.setProperty('opacity','.5');const detachedBefore=gate.snapshot().unauthorizedObserved;mutationCallback([{type:'attributes',target:detached,attributeName:'style',oldValue:'opacity: .4'}]);assert(gate.snapshot().unauthorizedObserved>detachedBefore);
  const runtimeSnapshot=gate.snapshot();
  assert.strictEqual(typeof runtimeSnapshot.conflictCount,'number');
  assert.strictEqual(typeof runtimeSnapshot.conflicts,'number');
  assert(Array.isArray(runtimeSnapshot.conflictEvents));
  assert(runtimeSnapshot.conflictEvents.length>=1);
  assert(Array.isArray(runtimeSnapshot.unauthorizedEvents)&&runtimeSnapshot.unauthorizedEvents.length>=1);
  const racedEvent=runtimeSnapshot.unauthorizedEvents.find(event=>event.component==='raced'&&event.slot==='width');assert(racedEvent);assert(racedEvent.declaredOwners.includes('Geometry'));assert(racedEvent.declaredSources.includes('src/core/ui/raced.js'));assert(racedEvent.declaredOwnerSources.some(pair=>pair.owner==='Geometry'&&pair.sources.includes('src/core/ui/raced.js')),'Unauthorized events must preserve the previously declared owner -> source mapping.');assert.strictEqual(racedEvent.state,'runtime');
  assert.strictEqual(racedEvent.elementKey,gate.elementKeyFor(raced));assert.strictEqual(gate.elementKeyFor(raced),gate.elementKeyFor(raced),'Runtime element diagnostic keys must be stable without retaining a strong DOM reference.');
  assert.strictEqual(typeof runtimeSnapshot.inlineClaims,'number');
  const paint=new FakeElement('path');paint.setAttribute('class','dkds-test-trace');gate.setPaint(paint,'stroke','#123',{owner:'ScientificRenderer',component:'scientific.test',scope:'scientific-render',source:'src/core/scientific/test-renderer.js'});const paintRow=gate.rowsForElement(paint).find(x=>x.kind===gate.KINDS.RUNTIME_PAINT&&x.slot==='stroke');assert(paintRow);assert.strictEqual(paintRow.ownerCount,1);assert.strictEqual(gate.paintOwnerFor(paint,'stroke').ownerCount,1);assert(gate.paintOwnerFor(paint,'stroke').sources.includes('src/core/scientific/test-renderer.js'));
  const paintRaw=new FakeElement('path');paintRaw.setAttribute('fill','#f00');const paintBefore=gate.snapshot().unauthorizedObserved;mutationCallback([{type:'attributes',target:paintRaw,attributeName:'fill',oldValue:null}]);assert(gate.snapshot().unauthorizedObserved>paintBefore);
  const presentation=new FakeElement('path');const presentationAuthorizedBefore=gate.snapshot().unauthorizedObserved;gate.setPresentation(presentation,'display','none',{owner:'ScientificVisibility',component:'scientific.visibility',scope:'scientific-render',source:'src/core/scientific/visibility.js'});mutationCallback([{type:'attributes',target:presentation,attributeName:'display',oldValue:null}]);assert.strictEqual(gate.snapshot().unauthorizedObserved,presentationAuthorizedBefore,'Gate-authorized runtime presentation must not be reported as a bypass.');const presentationRow=gate.rowsForElement(presentation).find(x=>x.kind===gate.KINDS.RUNTIME_PRESENTATION&&x.slot==='display');assert(presentationRow);assert.strictEqual(presentationRow.ownerCount,1);assert.strictEqual(gate.presentationOwnerFor(presentation,'display').ownerCount,1);assert(gate.presentationOwnerFor(presentation,'display').sources.includes('src/core/scientific/visibility.js'));
  const presentationRaw=new FakeElement('path');presentationRaw.setAttribute('cursor','crosshair');const presentationBefore=gate.snapshot().unauthorizedObserved;mutationCallback([{type:'attributes',target:presentationRaw,attributeName:'cursor',oldValue:null}]);assert(gate.snapshot().unauthorizedObserved>presentationBefore);
  assert.strictEqual(gate.VERSION,'1.8.0');
  assert(gate.PAINT_ATTRIBUTES.includes('stroke'));
  assert(gate.PRESENTATION_ATTRIBUTES.includes('display'));
  assert(gate.snapshot().paintClaims>=1);
  assert(gate.snapshot().presentationClaims>=1);
  assert.strictEqual(releaseAudit(),true);assert.strictEqual(gate.snapshot().runtimeAuditEnabled,false);assert.strictEqual(mutationCallback,null,'Runtime bypass observer must disconnect when diagnostics releases it.');
}

// 4a.1) UI bootstrap must not silently re-enable the document-wide Gate observer.
{
  const uiRuntime=fs.readFileSync(path.join(ROOT,'src/core/ui/modules/runtime.js'),'utf8');
  assert(!uiRuntime.includes('observeUnauthorizedRuntimeStyles'),'Normal UI Runtime must keep expensive document-wide bypass observation out of the hot path.');
  const debugRuntime=fs.readFileSync(path.join(ROOT,'src/core/theme/debug-runtime.js'),'utf8');
  assert(debugRuntime.includes("acquireRuntimeAudit?.('theme-inspector')"),'Theme Inspector must explicitly enable runtime bypass diagnostics while it is active.');
}


// 4b) Component Runtime must propagate the real scope/module provenance into
// every Gate-mediated style/paint/presentation call. This is runtime evidence,
// not only an audit exemption count.
{
  const calls=[];
  class CRStyle{constructor(){this.map=new Map();}setProperty(k,v){this.map.set(String(k),String(v));}removeProperty(k){this.map.delete(String(k));}getPropertyValue(k){return this.map.get(String(k))||'';}}
  class CRElement{constructor(tag='div'){this.nodeType=1;this.tagName=String(tag).toUpperCase();this.dataset={};this.style=new CRStyle();this.attrs=new Map();this.children=[];this.classList={toggle(){},contains(){return false;}};}setAttribute(k,v){this.attrs.set(String(k),String(v));}removeAttribute(k){this.attrs.delete(String(k));}getAttribute(k){return this.attrs.get(String(k))||'';}append(...nodes){this.children.push(...nodes);}appendChild(node){this.children.push(node);return node;}querySelector(){return null;}querySelectorAll(){return [];}addEventListener(){}removeEventListener(){}replaceChildren(...nodes){this.children=[...nodes];}}
  const doc={readyState:'loading',documentElement:new CRElement('html'),body:new CRElement('body'),createElement:tag=>new CRElement(tag),createElementNS:(_ns,tag)=>new CRElement(tag),createTextNode:text=>({nodeType:3,textContent:String(text)}),querySelector(){return null;},querySelectorAll(){return [];},addEventListener(){}};
  const fakeGate={KINDS:{CONFIG_TOKEN:'configuration-token',RUNTIME_INLINE:'runtime-inline'},PAINT_ATTRIBUTES:['fill','stroke'],PRESENTATION_ATTRIBUTES:['display','cursor'],set(el,p,v,spec){calls.push(['set',p,spec]);el.style.setProperty(p,v);},remove(el,p,spec){calls.push(['remove',p,spec]);el.style.removeProperty(p);},setToken(el,p,v,spec){calls.push(['setToken',p,spec]);el.style.setProperty(p,v);},setPaint(el,p,v,spec){calls.push(['setPaint',p,spec]);el.setAttribute(p,v);},removePaint(el,p,spec){calls.push(['removePaint',p,spec]);el.removeAttribute(p);},setPresentation(el,p,v,spec){calls.push(['setPresentation',p,spec]);el.setAttribute(p,v);},removePresentation(el,p,spec){calls.push(['removePresentation',p,spec]);el.removeAttribute(p);}};
  const context={console,document:doc,DKDSStyleGate:fakeGate,queueMicrotask(){},setTimeout,clearTimeout,setInterval,clearInterval,requestAnimationFrame(){return 1;},cancelAnimationFrame(){},Map,Set,WeakMap,Object,String,Number,Array,Math};context.window=context;context.globalThis=context;
  vm.runInNewContext(fs.readFileSync(path.join(ROOT,'src/core/ui/component-runtime.js'),'utf8'),context,{filename:'component-runtime.js'});
  const scope=context.DKDSComponents.createScope('builtin.fixture',{root:doc,source:'plugins/builtin.fixture/plugin.js'}),el=scope.createNS('svg','path',{attrs:{fill:'#123',display:'none'}});scope.style(el,{width:'10px'});scope.token(el,{'--fixture':'1'});scope.attr(el,'stroke','#456');
  assert(calls.length>=5,'Component Runtime fixture must exercise style/token/paint/presentation Gate paths.');
  assert(calls.every(([, ,spec])=>spec.source==='plugins/builtin.fixture/plugin.js'),'Every default Component Runtime Gate write must preserve the plugin registration source identity.');
  scope.style(el,{height:'12px'},{source:'plugins/builtin.fixture/helper.js'});
  assert.strictEqual(calls[calls.length-1][2].source,'plugins/builtin.fixture/helper.js','Helper modules must be able to override package-level provenance with their exact module source.');
  assert.strictEqual(scope.source,'plugins/builtin.fixture/plugin.js');
}


// 4c) First-party helper-module provenance adoption: Status Monitor moves its
// theme-popover geometry into a separately loaded helper and explicitly passes
// that helper source through ctx.ui.dom.style(). This proves the override path
// is used by shipping code, not only by the Component Runtime synthetic fixture.
{
  const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'src/plugins/status-monitor/plugin.json'),'utf8'));
  assert.deepStrictEqual(manifest.scripts,['theme-layout.js','plugin.js'],'Status Monitor helper must load before the plugin entry.');
  const helperSource='src/plugins/status-monitor/theme-layout.js',helperCode=fs.readFileSync(path.join(ROOT,helperSource),'utf8'),pluginCode=fs.readFileSync(path.join(ROOT,'src/plugins/status-monitor/plugin.js'),'utf8');
  assert(helperCode.includes(`const SOURCE='${helperSource}'`)&&helperCode.includes('dom.style(element,patch,{source:SOURCE})'),'First-party helper must forward its exact module source into Component Runtime.');
  assert(pluginCode.includes('DKDSStatusMonitorThemeLayout')&&pluginCode.includes('ThemeLayout.positionThemePanel'),'Status Monitor must consume the helper instead of duplicating theme-panel geometry writes.');
  const styleCalls=[];const panel={classList:{contains(){return false;}},getBoundingClientRect(){return {width:240,height:180};}},anchorElement={getBoundingClientRect(){return {left:900,right:980,width:80,top:700,bottom:728,height:28};}};
  const helperContext={globalThis:null,window:null,Math,Number,Object,String,Array,Set,Map,console};helperContext.globalThis=helperContext;helperContext.window=helperContext;
  vm.runInNewContext(helperCode,helperContext,{filename:helperSource});
  const ok=helperContext.DKDSStatusMonitorThemeLayout.positionThemePanel({dom:{style(element,patch,meta){styleCalls.push({element,patch,meta});}},panel,anchorElement,viewport:{innerWidth:1200,innerHeight:800}});
  assert.strictEqual(ok,true);assert(styleCalls.length>=2);assert(styleCalls.every(call=>call.meta?.source===helperSource),'Every shipping helper geometry write must report theme-layout.js as the Gate source.');
}


const curveRender=fs.readFileSync(path.join(ROOT,'src/core/ui/modules/scientific-curve/render.js'),'utf8');
const curveNavigation=fs.readFileSync(path.join(ROOT,'src/core/ui/modules/scientific-curve/navigation.js'),'utf8');
const curveStructure=fs.readFileSync(path.join(ROOT,'src/styles/structure/plugin-workspace.css'),'utf8');
assert(curveRender.includes("VISIBILITY_OWNER='core.scientific-curve-visibility'")&&curveNavigation.includes("VISIBILITY_OWNER='core.scientific-curve-visibility'"),'Render and navigation must share one scientific marker visibility owner.');
assert(!/\.attr\(\s*['"](?:display|pointer-events|cursor|visibility)['"]/.test(curveRender+curveNavigation),'Scientific curve runtime must not reintroduce raw managed SVG presentation attributes.');
for(const token of ['.dkds-direct-range-handle{cursor:ns-resize;}', '.dkds-direct-axis-handle.is-x-axis{cursor:ew-resize;}', '.dkds-direct-axis-handle.is-y-axis{cursor:ns-resize;}', '.dkds-direct-point-handle{cursor:grab;}'])assert(curveStructure.includes(token),`Structure CSS must own static scientific interaction presentation: ${token}`);

const materialCss=fs.readFileSync(path.join(ROOT,'src/styles/theme/material-renderer.css'),'utf8');
const nestedHeaderGlass=/data-dkds-material-recipe[\s\S]*?>\s*:where\([^}]*panelHeader[^}]*\)\s*\{([^}]*)\}/.exec(materialCss);
assert(nestedHeaderGlass,'expected glass nested-header material rule');
assert(!/box-shadow\s*:/.test(nestedHeaderGlass[1]),'Material Renderer must not re-own panel/inspector header box-shadow; Component Appearance is the single owner.');

const debug=fs.readFileSync(path.join(ROOT,'src/core/theme/debug-runtime.js'),'utf8');
const devtools=fs.readFileSync(path.join(ROOT,'src/core/plugins/devtools.js'),'utf8');
assert(debug.includes('Runtime presentation'));
assert(debug.includes('runtimeGateGroups'));
assert(debug.includes('row.sources'));
assert(debug.includes('ownerSources')&&debug.includes('diagnosticChain'),'Style Trace must preserve owner -> source mapping and render the complete diagnostic chain.');
assert(debug.includes('ownerCount'));
assert(debug.includes('StyleGate.evaluate'));
assert(debug.includes('data-theme-debug-filter'));
assert(debug.includes('StyleSemantics.expectedFor'));
assert(debug.includes('StyleGate.elementKeyFor'));
assert(debug.includes('UNAUTHORIZED'));
assert(debug.includes('UNOWNED'));
assert(debug.includes('gateContext'));
assert(debug.includes('},ownerFiles,ownerFiles)'), 'Style Trace Gate ownerCount must use authored source files, not coarse layer labels.');
assert(devtools.includes('conflictCount'));
assert(devtools.includes('paintClaims'));
assert(devtools.includes('presentationClaims'));
assert(devtools.includes('unauthorizedEvents'));
assert(devtools.includes('declaredSources'));
assert(devtools.includes('ownerSourceChain')&&devtools.includes('Selected Style Trace')&&devtools.includes('Owner → source'),'Plugin DevTools must present selected owner -> source -> context -> state chains.');
assert(KINDS.RUNTIME_PRESENTATION==='runtime-presentation');
assert(devtools.includes('styleGate:window.DKDSStyleGate?.snapshot?.()'));
assert(devtools.includes("metric('Style Gate'"));
const mainHtml=fs.readFileSync(path.join(ROOT,'src/index.html'),'utf8'),pluginHtml=fs.readFileSync(path.join(ROOT,'src/plugin-window/index.html'),'utf8'),composition=fs.readFileSync(path.join(ROOT,'src/core/ui/composition/composition.json'),'utf8');
assert(mainHtml.indexOf('core/contracts/style-ownership-semantics.js')<mainHtml.indexOf('core/theme/style-ownership-gate-runtime.js'),'Main host must load shared Style Gate semantics before runtime Gate.');
assert(pluginHtml.indexOf('../core/contracts/style-ownership-semantics.js')<pluginHtml.indexOf('../core/theme/style-ownership-gate-runtime.js'),'Plugin host must load shared Style Gate semantics before runtime Gate.');
assert(composition.includes('contracts/style-ownership-semantics'),'Generated UI runtime must include the shared Style Gate semantics contract.');
for(const file of ['src/core/scientific/chart-runtime.js','src/core/theme/runtime.js','src/core/theme/material-renderer.js','src/core/ui/modules/layout/portable-view.js','src/core/ui/modules/table/surfaces.js'])assert(fs.readFileSync(path.join(ROOT,file),'utf8').includes(`STYLE_SOURCE='${file}'`),`Stable runtime Gate writer must expose module source: ${file}`);
console.log('v3.68.0 Style Ownership Gate PASS');
