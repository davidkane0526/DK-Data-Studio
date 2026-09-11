'use strict';

const PLUGIN_TYPES=Object.freeze(['foundation','data','algorithm','workbench','task','tool','theme','extension','developer']);
const PLUGIN_TYPE_SET=new Set(PLUGIN_TYPES);

function pluginTypeOf(manifest={}){
  const declared=String(manifest?.pluginType||'').trim().toLowerCase();
  return PLUGIN_TYPE_SET.has(declared)?declared:'';
}

function requirePluginType(manifest={}){
  const declared=String(manifest?.pluginType||'').trim().toLowerCase();
  if(!declared)throw new Error(`Plugin ${manifest?.id||'(unknown)'} must declare pluginType.`);
  if(!PLUGIN_TYPE_SET.has(declared))throw new Error(`Plugin ${manifest?.id||'(unknown)'} declares invalid pluginType: ${declared}`);
  return declared;
}

module.exports=Object.freeze({PLUGIN_TYPES,pluginTypeOf,requirePluginType});
