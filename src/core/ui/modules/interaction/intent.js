'use strict';

const VERSION='1.0.0';
const SCHEMA='dkds.interaction-intent.v1';
const TYPES=Object.freeze({
  NAVIGATE:'navigation.activate',
  BACK:'navigation.back',
  COMMAND:'command.execute',
  PANEL:'workspace.panel.toggle',
  SURFACE:'workspace.surface.activate',
  ACTION:'workspace.action.execute',
  STATUS:'status.action.execute',
  KEY:'keyboard.key'
});
const TYPE_SET=new Set(Object.values(TYPES));

function text(value){return String(value??'');}
function freezePayload(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return Object.freeze({});
  return Object.freeze({...value});
}
function create(type,payload={},meta={}){
  const normalized=text(type).trim();
  if(!TYPE_SET.has(normalized))throw new Error(`Unsupported interaction intent: ${normalized||'(empty)'}`);
  return Object.freeze({
    schema:SCHEMA,
    version:VERSION,
    type:normalized,
    payload:freezePayload(payload),
    source:text(meta.source||'core').trim()||'core',
    modality:text(meta.modality||'programmatic').trim()||'programmatic',
    timestamp:Number(meta.timestamp)||Date.now()
  });
}
function isIntent(value){return !!value&&value.schema===SCHEMA&&TYPE_SET.has(text(value.type));}
function normalize(value,meta={}){
  if(isIntent(value))return value;
  if(!value||typeof value!=='object')throw new Error('Interaction intent object required.');
  return create(value.type,value.payload,{...value,...meta});
}

const api=Object.freeze({version:VERSION,schema:SCHEMA,types:TYPES,create,isIntent,normalize});
if(typeof window!=='undefined')window.DKDSInteractionIntent=api;
module.exports=api;
