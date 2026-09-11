'use strict';

// SDK 1.22 visual ownership audit. Plugins own domain layout/content; Core owns
// application chrome paint and the geometry of standard controls/header actions.
const PAINT_PROPS=/^(?:background(?:-.+)?|border(?:-.+)?|border-radius|box-shadow|color|fill|stroke|text-shadow|filter|backdrop-filter|-webkit-backdrop-filter|outline(?:-.+)?|accent-color)$/i;
const CONTROL_GEOMETRY_PROPS=/^(?:height|min-height|max-height|padding(?:-.+)?|border-radius|font(?:-.+)?|line-height|box-shadow|transform)$/i;
const SHARED_COMPONENT_SELECTOR=/(?:\.dkds-(?:surface-header|surface-actions|surface-tabs|toolbar|action-row|action-button|icon-button|field-control|plot-view-head|plot-view-actions|integrated-action-group|portable-controls)|\[data-dkds-component-identity=)/i;
const RAW_CONTROL_SELECTOR=/(?:^|[\s>+~,:])(?:button|input|select|textarea)(?=[\s>+~,:.#[:]|$)/i;
const HEADER_CONTROL_SELECTOR=/(?:header|head|heading|toolbar|actions?|tabs?)[^,{]*\b(?:button|input|select|textarea)\b|\b(?:button|input|select|textarea)\b[^,{]*(?:header|head|heading|toolbar|actions?|tabs?)/i;
const HEADER_GEOMETRY_PROPS=/^(?:height|min-height|max-height|padding(?:-.+)?|border-radius|font(?:-.+)?|line-height|box-shadow|transform)$/i;
const BUTTON_GEOMETRY_PROPS=/^(?:width|min-width|max-width|height|min-height|max-height|padding(?:-.+)?|border-radius|font(?:-.+)?|line-height|box-shadow|transform)$/i;
const FIELD_GEOMETRY_PROPS=CONTROL_GEOMETRY_PROPS;
const INTEGRATED_CHROME_SELECTOR=/(?:\.dkds-scientific-nav-tools|\.dkds-integrated-action-group)/i;
const INTEGRATED_CHROME_GEOMETRY_PROPS=/^(?:gap|row-gap|column-gap|padding(?:-.+)?|margin(?:-.+)?|overflow|border-radius|box-shadow|height|min-height|max-height)$/i;
const CORE_ALIAS_CLASSES=Object.freeze({
  header:new Set(['dkds-surface-header','dkds-portable-header','dkds-plot-view-head','dkds-group-plot-head']),
  action:new Set(['dkds-action-button','dkds-icon-button','dkds-choice-button']),
  field:new Set(['dkds-field-control']),
});

function splitSelectorList(text){
  const out=[];let start=0,paren=0,bracket=0,quote='';
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quote){if(c==='\\'){i++;continue;}if(c===quote)quote='';continue;}
    if(c==='"'||c==="'"){quote=c;continue;}
    if(c==='(')paren++;else if(c===')')paren=Math.max(0,paren-1);else if(c==='[')bracket++;else if(c===']')bracket=Math.max(0,bracket-1);
    else if(c===','&&paren===0&&bracket===0){out.push(text.slice(start,i));start=i+1;}
  }
  out.push(text.slice(start));return out.map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean);
}
function matchingBrace(text,open){
  let depth=0,quote='',comment=false;
  for(let i=open;i<text.length;i++){
    const c=text[i],n=text[i+1];
    if(comment){if(c==='*'&&n==='/'){comment=false;i++;}continue;}
    if(!quote&&c==='/'&&n==='*'){comment=true;i++;continue;}
    if(quote){if(c==='\\'){i++;continue;}if(c===quote)quote='';continue;}
    if(c==='"'||c==="'"){quote=c;continue;}
    if(c==='{')depth++;else if(c==='}'&&--depth===0)return i;
  }
  return -1;
}
function declarations(body){
  const out=[];const clean=String(body||'').replace(/\/\*[\s\S]*?\*\//g,'');
  for(const m of clean.matchAll(/(?:^|;)\s*([\w-]+)\s*:\s*([^;}]*)/g))out.push({prop:m[1].toLowerCase(),value:m[2].trim()});
  return out;
}
function ruleBlocks(css){
  const clean=String(css||'').replace(/\/\*[\s\S]*?\*\//g,'');const out=[];let cursor=0;
  while(cursor<clean.length){
    const open=clean.indexOf('{',cursor);if(open<0)break;const pre=clean.slice(cursor,open).trim(),close=matchingBrace(clean,open);if(close<0)break;const body=clean.slice(open+1,close);
    if(pre.startsWith('@')){if(!/^@(?:keyframes|-webkit-keyframes)\b/i.test(pre))out.push(...ruleBlocks(body));}
    else if(pre)for(const selector of splitSelectorList(pre))out.push({selector,declarations:declarations(body)});
    cursor=close+1;
  }
  return out;
}

function collectCoreAliases(source){
  const aliases={header:new Set(),action:new Set(),field:new Set()};
  const text=String(source||'');
  const rows=[...text.matchAll(/<(button|input|select|textarea|div|header|section|span|label)\b[^>]*\bclass=["']([^"']+)["'][^>]*>/gi)];
  for(const row of rows){
    const tag=String(row[1]||'').toLowerCase();
    const classes=String(row[2]||'').split(/\s+/).map(v=>v.trim()).filter(Boolean);
    const custom=classes.filter(name=>!name.startsWith('dkds-')&&!['primary','secondary','selected','active','quiet','danger','danger-soft','hidden'].includes(name));
    const kinds=new Set();
    if(classes.some(name=>CORE_ALIAS_CLASSES.header.has(name)))kinds.add('header');
    if(classes.some(name=>CORE_ALIAS_CLASSES.action.has(name)))kinds.add('action');
    if(classes.some(name=>CORE_ALIAS_CLASSES.field.has(name)))kinds.add('field');
    for(const kind of kinds)for(const name of custom)aliases[kind].add(name);
  }
  return aliases;
}
function selectorUsesAlias(selector,set){
  if(!set?.size)return false;
  for(const name of set){
    const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    if(new RegExp(`\\.${escaped}(?![\\w-])`).test(selector))return true;
  }
  return false;
}

function inspectPluginCss(css,{path='plugin.css',aliases=null}={}){
  const issues=[];
  for(const block of ruleBlocks(css)){
    const selector=block.selector;
    for(const row of block.declarations){
      if(PAINT_PROPS.test(row.prop))issues.push({code:'PLUGIN_OWNS_CHROME_PAINT',path,selector,property:row.prop,value:row.value,message:`${path}: ${selector} may not define ${row.prop}; Core/Theme owns application paint.`});
      if(SHARED_COMPONENT_SELECTOR.test(selector)&&CONTROL_GEOMETRY_PROPS.test(row.prop))issues.push({code:'PLUGIN_STYLES_CORE_COMPONENT',path,selector,property:row.prop,value:row.value,message:`${path}: ${selector} may not redefine Core component geometry (${row.prop}).`});
      if(RAW_CONTROL_SELECTOR.test(selector)&&CONTROL_GEOMETRY_PROPS.test(row.prop))issues.push({code:'PLUGIN_OWNS_CONTROL_GEOMETRY',path,selector,property:row.prop,value:row.value,message:`${path}: standard control geometry (${row.prop}) is Core-owned; size the surrounding domain layout instead.`});
      if(HEADER_CONTROL_SELECTOR.test(selector)&&CONTROL_GEOMETRY_PROPS.test(row.prop))issues.push({code:'PLUGIN_OWNS_HEADER_ACTION_GEOMETRY',path,selector,property:row.prop,value:row.value,message:`${path}: header/toolbar action geometry (${row.prop}) is Core-owned.`});
      if(selectorUsesAlias(selector,aliases?.header)&&HEADER_GEOMETRY_PROPS.test(row.prop))issues.push({code:'PLUGIN_ALIASES_CORE_HEADER_GEOMETRY',path,selector,property:row.prop,value:row.value,message:`${path}: ${selector} aliases a Core header and may not redefine ${row.prop}.`});
      if(selectorUsesAlias(selector,aliases?.action)&&BUTTON_GEOMETRY_PROPS.test(row.prop))issues.push({code:'PLUGIN_ALIASES_CORE_ACTION_GEOMETRY',path,selector,property:row.prop,value:row.value,message:`${path}: ${selector} aliases a Core action and may not redefine ${row.prop}.`});
      if(selectorUsesAlias(selector,aliases?.field)&&FIELD_GEOMETRY_PROPS.test(row.prop))issues.push({code:'PLUGIN_ALIASES_CORE_FIELD_GEOMETRY',path,selector,property:row.prop,value:row.value,message:`${path}: ${selector} aliases a Core field and may not redefine ${row.prop}.`});
      if(INTEGRATED_CHROME_SELECTOR.test(selector)&&INTEGRATED_CHROME_GEOMETRY_PROPS.test(row.prop))issues.push({code:'PLUGIN_RESTYLES_INTEGRATED_CHROME',path,selector,property:row.prop,value:row.value,message:`${path}: integrated/scientific floating chrome is one Core-owned silhouette; plugins may not redefine ${row.prop}.`});
    }
  }
  return {ok:issues.length===0,issues};
}
module.exports=Object.freeze({inspectPluginCss,ruleBlocks,collectCoreAliases});
