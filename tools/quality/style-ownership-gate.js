#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const {StyleOwnershipRegistry,KINDS}=require('../../src/core/contracts/style-ownership');
const style=require('./style-ownership');
const semantic=require('./semantic-style-ownership');
const gateSemantics=require('../../src/core/contracts/style-ownership-semantics');
const ROOT=path.resolve(__dirname,'../..');
const rel=file=>path.relative(ROOT,file).replace(/\\/g,'/');
const sourceAt=(fileRel,block,selector,property,value)=>`${fileRel}:${Number(block?.line)||1} :: ${String(selector||'').trim()} :: ${property}:${value}`;

function stateOf(selector){
  const states=[],raw=String(selector||''),text=raw.replace(/:not\([^)]*\)/g,'');
  if(/:hover\b/.test(text))states.push('hover');
  if(/:active\b/.test(text))states.push('active');
  if(/:focus-visible\b/.test(text))states.push('focus-visible');else if(/:focus\b/.test(text))states.push('focus');
  if(/:disabled\b|\[disabled\]|\[aria-disabled=['"]?true/.test(text))states.push('disabled');
  if(/\[aria-selected=['"]?true|\.selected\b|\.is-selected\b/.test(text))states.push('selected');
  if(/\[aria-pressed=['"]?true|\.active\b|\.is-active\b/.test(text))states.push('pressed');
  return states.length?[...new Set(states)].sort().join('+'):'base';
}
function kindOf(property){
  const p=String(property||'').toLowerCase();
  if(p.startsWith('--'))return KINDS.CONFIG_TOKEN;
  if(/^transition(?:-|$)|^animation(?:-|$)/.test(p))return KINDS.MOTION;
  return KINDS.FINAL_PROPERTY;
}

function platformOf(selector){
  const text=String(selector||'');
  if(/data-dkds-host\s*=\s*["']mobile["']|\.react-native-client\b/.test(text))return'mobile';
  if(/data-dkds-host\s*=\s*["']desktop["']/.test(text))return'desktop';
  return'all';
}
function rightmostCompound(selector){
  const text=String(selector||'');let paren=0,bracket=0,quote='',last=-1;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quote){if(c==='\\')i++;else if(c===quote)quote='';continue;}
    if(c==='"'||c==="'"){quote=c;continue;}
    if(c==='(')paren++;else if(c===')')paren=Math.max(0,paren-1);else if(c==='[')bracket++;else if(c===']')bracket=Math.max(0,bracket-1);
    else if(paren===0&&bracket===0&&(c==='>'||c==='+'||c==='~'||/\s/.test(c)))last=i;
  }
  return text.slice(last+1).trim();
}
function targetIdentities(selector){
  const tail=rightmostCompound(selector),out=[];
  for(const match of tail.matchAll(/data-dkds-component-identity\s*=\s*["']([^"']+)["']/g))out.push(match[1]);
  return [...new Set(out)];
}
function materialContextOf(selector){
  const tail=rightmostCompound(selector);
  if(/:not\s*\(\s*:is\([\s\S]*?(?:data-dkds-material-role|\.dkds-material-role-)/.test(tail))return'unmanaged';
  if(/(?:data-dkds-material-role|\.dkds-material-role-)/.test(tail))return'managed';
  return'any';
}
function semanticContextsOf(selector){
  const text=String(selector||'');
  const values=pattern=>[...new Set([...text.matchAll(pattern)].map(match=>String(match[1]||'').trim()).filter(Boolean))];
  const rows={
    component:values(/data-dkds-component-context\s*=\s*["']([^"']+)["']/g),
    material:values(/data-dkds-material-context\s*=\s*["']([^"']+)["']/g),
    role:[...new Set([...values(/data-dkds-material-role\s*=\s*["']([^"']+)["']/g),...values(/\.dkds-material-role-([a-z-]+)/g)])],
    recipe:values(/data-dkds-material-recipe\s*=\s*["']([^"']+)["']/g),
    variant:values(/data-dkds-component-variant\s*=\s*["']([^"']+)["']/g),
    layout:values(/data-dkds-(?:field|action)-layout\s*=\s*["']([^"']+)["']/g)
  };
  if(!rows.component.length&&/(?:\.dkds-segmented-command-group|\.dkds-integrated-action-group|\.panel-header-actions|\.trend-header-actions|\.dkds-plot-view-actions|\.dkds-chart-actions|\.statusbar-command-cluster|\.toolbar-group|\.primary-activity-cluster|\.system-core-tools-group|\.dkds-mode-group|\.dkds-scientific-nav-tools|data-dkds-material-integrated\s*=\s*["']true["'])/.test(text))rows.component=['grouped'];
  let contexts=[{}];
  for(const axis of gateSemantics.CONTEXT_AXES){
    const axisValues=rows[axis]||[];if(!axisValues.length)continue;
    const next=[];for(const base of contexts)for(const value of axisValues){next.push({...base,[axis]:value});if(next.length>64)throw new Error(`Style Ownership Audit context expansion exceeded 64 candidates: ${text}`);}contexts=next;
  }
  return Object.freeze((contexts.length?contexts:[{}]).map(row=>gateSemantics.normalizeContext(row)));
}
function semanticContextOf(selector){return semanticContextsOf(selector)[0]||gateSemantics.ANY_CONTEXT;}
function contextsOverlap(a,b){
  if(a.platform!=='all'&&b.platform!=='all'&&a.platform!==b.platform)return false;
  if((a.material==='managed'&&b.material==='unmanaged')||(a.material==='unmanaged'&&b.material==='managed'))return false;
  const left=gateSemantics.contextObject(a.semantic),right=gateSemantics.contextObject(b.semantic);
  for(const key of gateSemantics.CONTEXT_AXES){if(left[key]&&right[key]&&left[key]!==right[key])return false;}
  return true;
}
function auditExplicitSemanticIdentities(){
  const groups=new Map();let claims=0;
  for(const file of style.collectCssFiles()){
    const fileRel=rel(file),text=fs.readFileSync(file,'utf8');
    for(const block of style.ruleBlocks(text))for(const raw of style.splitSelectorList(block.selector)){
      if(/::(?:before|after)\b/.test(raw))continue;
      const identities=targetIdentities(raw);if(!identities.length)continue;
      const contexts=semanticContextsOf(raw).map(semantic=>Object.freeze({platform:platformOf(raw),material:materialContextOf(raw),semantic})),state=stateOf(raw);
      for(const identity of identities)for(const [property,value] of block.declarations){
        const kind=kindOf(property),slots=kind===KINDS.FINAL_PROPERTY?style.propertySlots(property):[property];
        for(const slot of slots)for(const context of contexts){claims++;const key=[identity,state,kind,slot].join('\u0000');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(Object.freeze({identity,state,kind,slot,file:fileRel,line:Number(block.line)||1,selector:raw.trim(),property,value,context}));}
      }
    }
  }
  const violations=[];
  for(const rows of groups.values())for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
    const a=rows[i],b=rows[j];if(a.file===b.file||!contextsOverlap(a.context,b.context))continue;
    violations.push(Object.freeze({type:'semantic-live-overlap',component:`semantic:${a.identity}`,slot:a.slot,kind:a.kind,state:a.state,owners:Object.freeze([a.file,b.file].sort()),ownerCount:2,reason:'different-selectors-can-own-same-live-component-slot',source:`${a.file}:${a.line} ${a.selector} <> ${b.file}:${b.line} ${b.selector}`}));
  }
  const dedup=new Map();for(const row of violations){const key=[row.component,row.slot,row.kind,row.state,...row.owners].join('\u0000');if(!dedup.has(key))dedup.set(key,row);}
  return Object.freeze({claims,slots:groups.size,violations:Object.freeze([...dedup.values()]),ok:dedup.size===0});
}

const SEMANTIC_EXPECTATIONS=gateSemantics.EXPECTATIONS;

function claimManagedSemanticSlots(registry){
  const wanted=new Map();
  for(const row of SEMANTIC_EXPECTATIONS){const key=[row.identity,row.state,row.slot].join('\u0000');if(!wanted.has(key))wanted.set(key,[]);wanted.get(key).push(row);registry.expect({component:`semantic:${row.identity}`,slot:row.slot,kind:KINDS.FINAL_PROPERTY,state:row.state,context:row.context||gateSemantics.ANY_CONTEXT,platform:'all',scope:'semantic-managed',expectedOwner:row.owner});}
  for(const file of style.collectCssFiles()){
    const fileRel=rel(file),text=fs.readFileSync(file,'utf8');
    for(const block of style.ruleBlocks(text))for(const raw of style.splitSelectorList(block.selector)){
      if(/::(?:before|after)\b/.test(raw))continue;
      const identities=targetIdentities(raw);if(!identities.length)continue;const state=stateOf(raw),selectorContexts=semanticContextsOf(raw);
      for(const identity of identities)for(const [property,value] of block.declarations){if(property.startsWith('--'))continue;for(const slot of style.propertySlots(property)){
        const specs=wanted.get([identity,state,slot].join('\u0000'))||[];
        for(const spec of specs){if(!selectorContexts.some(context=>gateSemantics.matchesContext(context,spec.context)))continue;registry.claim({component:`semantic:${identity}`,slot,kind:KINDS.FINAL_PROPERTY,state,context:spec.context||gateSemantics.ANY_CONTEXT,platform:'all',scope:'semantic-managed',owner:fileRel,source:sourceAt(fileRel,block,raw,property,value)});}
      }}
    }
  }
}


function audit(){
  const registry=new StyleOwnershipRegistry({name:'authored-style-gate',strict:false});
  let declarationClaims=0;
  for(const file of style.collectCssFiles()){
    const fileRel=rel(file),layer=style.ownerLayer(file),text=fs.readFileSync(file,'utf8');
    for(const block of style.ruleBlocks(text))for(const raw of style.splitSelectorList(block.selector)){
      const selector=style.canonicalSelector(raw);if(!selector||selector==='from'||selector==='to'||/^\d+(?:\.\d+)?%$/.test(selector))continue;
      for(const [property,value] of block.declarations){
        const kind=kindOf(property),slots=kind===KINDS.FINAL_PROPERTY?style.propertySlots(property):[property];
        for(const slot of slots)for(const context of semanticContextsOf(raw)){declarationClaims++;registry.claim({component:`selector:${selector}`,slot,kind,state:stateOf(raw),context,platform:'all',scope:layer,owner:fileRel,source:sourceAt(fileRel,block,raw,property,value)});}
      }
    }
  }

  claimManagedSemanticSlots(registry);

  // Managed semantic slots collapse different selectors that target the same live
  // component into one counter. This is the critical layer selector-string
  // ownership alone cannot prove.
  const headerContract=semantic.CONTRACTS.find(row=>row.id==='desktop-header-action-height');
  if(headerContract){
    for(const property of headerContract.finalProperties)registry.expect({component:'semantic:desktop-header-action',slot:property,kind:KINDS.FINAL_PROPERTY,state:'base',context:gateSemantics.ANY_CONTEXT,platform:'desktop',scope:'semantic',expectedOwner:headerContract.finalOwner});
    for(const file of style.collectCssFiles()){
      const fileRel=rel(file),text=fs.readFileSync(file,'utf8');
      for(const block of style.ruleBlocks(text))for(const raw of style.splitSelectorList(block.selector)){
        const selector=style.canonicalSelector(raw);if(!selector)continue;
        if(/::(?:before|after)\b/.test(selector))continue;
        const directContainer=/(?:\.dkds-(?:integrated-action-group|separated-action-group|portable-controls|plot-view-actions)\b|\.panel-header-actions\b)[^,{]*>\s*button\b/.test(selector);
        const leadingLeaf=/^\.dkds-(?:portable-icon-action|panel-close-button|portable-placement-trigger|plot-view-action|portable-history-action|action-button)\b/.test(selector);
        if(!directContainer&&!leadingLeaf)continue;
        for(const [property,value] of block.declarations){if(!headerContract.finalProperties.has(property))continue;const generic=selector.startsWith(':where(button):not(:where(')||selector.startsWith('button:not(:is(');if(generic)continue;registry.claim({component:'semantic:desktop-header-action',slot:property,kind:KINDS.FINAL_PROPERTY,state:'base',context:gateSemantics.ANY_CONTEXT,platform:'desktop',scope:'semantic',owner:fileRel,source:sourceAt(fileRel,block,selector,property,value)});}
      }
    }
  }

  const exact=style.audit();
  const semanticReport=semantic.audit();
  const semanticLive=auditExplicitSemanticIdentities();
  const validation=registry.validate();
  const violations=[];
  for(const row of validation.violations)violations.push(Object.freeze({type:'gate',...row}));
  for(const row of exact.collisions)violations.push(Object.freeze({type:'legacy-rendered-collision',component:`selector:${row.selector}`,slot:row.property,owners:Object.freeze(row.owners.map(x=>x.file)),ownerCount:row.owners.length,reason:'multiple-owners'}));
  for(const row of semanticReport.violations)violations.push(Object.freeze({type:'semantic-contract',component:row.contract,slot:row.property,owners:Object.freeze([row.file]),ownerCount:1,reason:row.reason,source:`${row.file} :: ${row.selector}`}));
  for(const row of semanticLive.violations)violations.push(row);
  return Object.freeze({version:'1.5.0',files:exact.files,declarationClaims,registryClaims:registry.claims.size,expected:registry.expectations.size,ownerConflicts:registry.conflictEvents.length,legacyCollisions:exact.collisions.length,semanticViolations:semanticReport.violations.length,semanticLiveClaims:semanticLive.claims,semanticLiveSlots:semanticLive.slots,semanticLiveViolations:semanticLive.violations.length,violations:Object.freeze(violations),ok:violations.length===0,snapshot:registry.snapshot()});
}
function format(report){
  const lines=[`Style Ownership Audit: ${report.files} files, ${report.declarationClaims} claims, ${report.registryClaims} selector slots, ${report.semanticLiveSlots||0} semantic-live slots, ${report.expected} expected, ${report.violations.length} violations.`];
  for(const row of report.violations.slice(0,80))lines.push(`- ${row.type}: ${row.component} :: ${row.slot} ownerCount=${row.ownerCount??'?'} ${row.reason||''} ${(row.owners||[]).join(' | ')} ${row.source||''}`.trim());
  return lines.join('\n');
}
function validate(){const report=audit();if(!report.ok){const error=new Error(format(report));error.report=report;throw error;}return report;}
if(require.main===module){const report=audit();if(process.argv.includes('--json'))console.log(JSON.stringify(report,null,2));else console.log(format(report));if(process.argv.includes('--strict')&&!report.ok)process.exit(1);}
module.exports=Object.freeze({audit,validate,format,stateOf,kindOf,platformOf,rightmostCompound,targetIdentities,materialContextOf,semanticContextOf,semanticContextsOf,contextsOverlap,auditExplicitSemanticIdentities,SEMANTIC_EXPECTATIONS,claimManagedSemanticSlots});
