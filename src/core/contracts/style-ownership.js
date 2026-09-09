'use strict';

const KINDS=Object.freeze({
  FINAL_PROPERTY:'final-property',
  CONFIG_TOKEN:'configuration-token',
  RUNTIME_INLINE:'runtime-inline',
  RUNTIME_PAINT:'runtime-paint',
  RUNTIME_PRESENTATION:'runtime-presentation',
  MOTION:'motion'
});
const DEFAULTS=Object.freeze({state:'base',context:'*',platform:'all',scope:'canonical'});

function clean(value,fallback=''){
  const text=String(value??'').trim();
  return text||fallback;
}
function normalizeSpec(spec={}){
  const component=clean(spec.component||spec.componentId||spec.selector);
  const slot=clean(spec.slot||spec.property||spec.token);
  const owner=clean(spec.owner||spec.ownerId);
  const kind=clean(spec.kind,KINDS.FINAL_PROPERTY);
  const state=clean(spec.state,DEFAULTS.state);
  const context=clean(spec.context,DEFAULTS.context);
  const platform=clean(spec.platform,DEFAULTS.platform);
  const scope=clean(spec.scope,DEFAULTS.scope);
  if(!component)throw new Error('Style Ownership Gate requires component.');
  if(!slot)throw new Error('Style Ownership Gate requires slot/property/token.');
  return Object.freeze({component,slot,owner,kind,state,context,platform,scope,source:clean(spec.source),detail:clean(spec.detail),expectedOwner:clean(spec.expectedOwner)});
}
function claimKey(spec={}){
  const row=normalizeSpec(spec);
  return [row.kind,row.platform,row.scope,row.state,row.context,row.component,row.slot].join('\u0000');
}
function publicRow(key,row){
  return Object.freeze({
    key,
    component:row.spec.component,
    slot:row.spec.slot,
    kind:row.spec.kind,
    state:row.spec.state,
    context:row.spec.context,
    platform:row.spec.platform,
    scope:row.spec.scope,
    owners:Object.freeze([...row.owners.keys()].sort()),
    ownerCount:row.owners.size,
    claimCount:row.claimCount,
    expected:!!row.expected,
    expectedOwner:row.expectedOwner||'',
    sources:Object.freeze([...row.sources].sort()),
    status:row.owners.size===0?'UNOWNED':row.owners.size===1?'SINGLE_OWNER':'OWNER_CONFLICT'
  });
}
class StyleOwnershipRegistry{
  constructor(options={}){
    this.name=clean(options.name,'style-ownership-gate');
    this.strict=options.strict===true;
    this.claims=new Map();
    this.expectations=new Map();
    this.conflictEvents=[];
  }
  _row(spec){
    const normalized=normalizeSpec(spec),key=claimKey(normalized);
    if(!this.claims.has(key))this.claims.set(key,{spec:normalized,owners:new Map(),sources:new Set(),claimCount:0,expected:false,expectedOwner:''});
    return {key,row:this.claims.get(key),spec:normalized};
  }
  expect(spec={}){
    const normalized=normalizeSpec(spec),key=claimKey(normalized);
    this.expectations.set(key,Object.freeze({...normalized,expectedOwner:clean(spec.expectedOwner||normalized.expectedOwner)}));
    const {row}=this._row(normalized);row.expected=true;row.expectedOwner=clean(spec.expectedOwner||normalized.expectedOwner);
    return publicRow(key,row);
  }
  claim(spec={}){
    const {key,row,spec:normalized}=this._row(spec);
    if(!normalized.owner)throw new Error(`Style Ownership Gate claim requires owner: ${normalized.component} :: ${normalized.slot}`);
    row.claimCount++;
    row.owners.set(normalized.owner,(row.owners.get(normalized.owner)||0)+1);
    if(normalized.source)row.sources.add(normalized.source);
    if(row.owners.size>1){
      const event=Object.freeze({key,component:normalized.component,slot:normalized.slot,state:normalized.state,context:normalized.context,owners:Object.freeze([...row.owners.keys()].sort()),source:normalized.source||'',timestamp:Date.now()});
      this.conflictEvents.push(event);
      if(this.strict){
        const error=new Error(`Style Ownership Gate conflict: ${normalized.component} :: ${normalized.slot} => ${event.owners.join(' | ')}`);
        error.code='DKDS_STYLE_OWNER_CONFLICT';error.conflict=event;throw error;
      }
    }
    return publicRow(key,row);
  }
  releaseOwner(owner){
    const id=clean(owner);if(!id)return 0;let removed=0;
    for(const [key,row] of this.claims){if(!row.owners.delete(id))continue;removed++;if(!row.owners.size&&!row.expected)this.claims.delete(key);}
    return removed;
  }
  status(spec={}){const key=claimKey(spec),row=this.claims.get(key);if(row)return publicRow(key,row);const normalized=normalizeSpec(spec);return Object.freeze({key,component:normalized.component,slot:normalized.slot,kind:normalized.kind,state:normalized.state,context:normalized.context,platform:normalized.platform,scope:normalized.scope,owners:Object.freeze([]),ownerCount:0,claimCount:0,expected:this.expectations.has(key),expectedOwner:this.expectations.get(key)?.expectedOwner||'',sources:Object.freeze([]),status:'UNOWNED'});}
  validate(options={}){
    const requireExpected=options.requireExpected!==false,violations=[];
    for(const [key,row] of this.claims){if(row.owners.size>1)violations.push(Object.freeze({...publicRow(key,row),reason:'multiple-owners'}));}
    if(requireExpected)for(const [key,expectation] of this.expectations){
      const row=this.claims.get(key),ownerCount=row?.owners?.size||0;
      if(ownerCount!==1)violations.push(Object.freeze({...(row?publicRow(key,row):this.status(expectation)),reason:ownerCount===0?'unowned':'multiple-owners'}));
      else if(expectation.expectedOwner&&!row.owners.has(expectation.expectedOwner))violations.push(Object.freeze({...publicRow(key,row),reason:'unexpected-owner'}));
    }
    return Object.freeze({name:this.name,ok:violations.length===0,claims:this.claims.size,expected:this.expectations.size,violations:Object.freeze(violations)});
  }
  snapshot(){
    const rows=[...this.claims].map(([key,row])=>publicRow(key,row)).sort((a,b)=>a.component.localeCompare(b.component)||a.slot.localeCompare(b.slot)||a.state.localeCompare(b.state)||a.context.localeCompare(b.context));
    const validation=this.validate();
    return Object.freeze({name:this.name,strict:this.strict,claims:rows.length,rows:Object.freeze(rows),conflicts:Object.freeze(this.conflictEvents.slice(-100)),validation});
  }
}

module.exports=Object.freeze({KINDS,DEFAULTS,normalizeSpec,claimKey,StyleOwnershipRegistry});
