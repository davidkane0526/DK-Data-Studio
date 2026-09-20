#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const style=require('./style-ownership');
const ownership=require('./unit-runtime-style-ownership');
const {LAYOUT_RECIPES}=require('../../src/core/ui/modules/composition/unit-template-layout-spec');

const ROOT=path.resolve(__dirname,'../..');
const PLUGINS=path.join(ROOT,'src','plugins');
const SHORTHAND_KEYS=Object.freeze({
  padding:['padding','paddingPx'],
  margin:['margin','marginPx'],
  inset:['inset'],
  overflow:['overflow'],
  gap:['gap','gapPx']
});
const BOX_GEOMETRY=new Set(['height','min-height','max-height','padding','padding-top','padding-right','padding-bottom','padding-left','padding-block','padding-inline','line-height']);
const ACTION_CONTEXT_HINT=/(?:action|toolbar|menu|header|stepper|nav|tab|footer|card-actions|range-|theme-gallery|plugin-card|scientific-nav|integrated|portable|plot-view|filter|switch|key-card|section-title|preset|scan-global|import-|layout-controls|plot-tools)/i;
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');
const lineOf=(text,offset)=>1+(text.slice(0,Math.max(0,offset)).match(/\n/g)||[]).length;
function familiesInRecipe(recipe={}){
  const out=[];
  for(const [family,keys] of Object.entries(SHORTHAND_KEYS))if(keys.some(key=>recipe[key]!==undefined))out.push(family);
  return out;
}
function sourceExplicitFamilies(source=''){
  const out=[];
  for(const family of Object.keys(SHORTHAND_KEYS))if(new RegExp(`\\b${family}\\s*:`).test(source))out.push(family);
  return out;
}
function pluginLayoutExposure(){
  const rows=[];
  for(const entry of fs.readdirSync(PLUGINS,{withFileTypes:true}).filter(row=>row.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name))){
    const file=path.join(PLUGINS,entry.name,'unit-presentation.js');if(!fs.existsSync(file))continue;
    const source=fs.readFileSync(file,'utf8'),parsed=ownership.parseLayoutCalls(source),mounts=[];
    for(const row of parsed.rows){
      const families=new Set([...familiesInRecipe(LAYOUT_RECIPES[row.variant]||{}),...sourceExplicitFamilies(row.source)]);
      if(families.size)mounts.push(Object.freeze({line:row.line,variant:row.variant,className:row.className,families:Object.freeze([...families].sort())}));
    }
    rows.push(Object.freeze({plugin:entry.name,layoutMounts:parsed.rows.length,shorthandSensitiveMounts:Object.freeze(mounts)}));
  }
  return Object.freeze(rows);
}
function proxySchemaExposure(){
  const rows=[];
  for(const entry of fs.readdirSync(PLUGINS,{withFileTypes:true}).filter(row=>row.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name))){
    let count=0;const hits=[];
    const dir=path.join(PLUGINS,entry.name);
    for(const file of fs.readdirSync(dir).filter(name=>name.endsWith('.js'))){
      const text=fs.readFileSync(path.join(dir,file),'utf8');
      for(const match of text.matchAll(/\btype\s*:\s*['"](columns|multiselect)['"]/g)){count++;hits.push(Object.freeze({file,line:lineOf(text,match.index),type:match[1]}));}
    }
    if(count)rows.push(Object.freeze({plugin:entry.name,count,hits:Object.freeze(hits)}));
  }
  return Object.freeze(rows);
}
function broadButtonGeometryViolations(){
  const violations=[];
  const files=style.collectCssFiles();
  for(const file of files){
    const rel=path.relative(ROOT,file).replace(/\\/g,'/'),text=fs.readFileSync(file,'utf8');
    for(const block of style.ruleBlocks(text))for(const selectorRaw of style.splitSelectorList(block.selector)){
      const selector=selectorRaw.trim();if(!selector||!/(?:^|[\s>,+~(])button(?=[:.#\[\s>,+~)]|$)|:where\(button\)/.test(selector))continue;
      const geometry=block.declarations.filter(([property])=>BOX_GEOMETRY.has(property));if(!geometry.length)continue;
      const normalized=selector.replace(/\s+/g,' ');
      const explicitlyExcludes=/not\([^)]*\.dkds-field-control/.test(normalized)||/not\(:where\([\s\S]*\.dkds-field-control/.test(normalized);
      const fieldUniform=/(?:input|select|textarea)/.test(normalized)&&/button/.test(normalized);
      const actionSpecific=ACTION_CONTEXT_HINT.test(normalized);
      const tagSpecific=/\bbutton(?:\.[A-Za-z_-][\w-]*|#[A-Za-z_-][\w-]*)/.test(normalized);
      // Generic tag-based geometry is unsafe for a semantic Field proxy. Rules
      // confined to a named action/chrome context, a button-specific semantic
      // class, or uniformly covering fields are not part of this failure class.
      if(!explicitlyExcludes&&!fieldUniform&&!actionSpecific&&!tagSpecific){
        violations.push(Object.freeze({file:rel,line:block.line,selector:normalized,properties:Object.freeze(geometry.map(([p])=>p))}));
      }
    }
  }
  return Object.freeze(violations);
}
function audit(){
  const layoutSource=read('src/core/ui/modules/composition/unit-template-layout.js');
  const analysisCss=read('src/styles/structure/analysis-workbench.css');
  const schemaCss=read('src/styles/structure/schema-and-plugin-ui.css');
  const mobileCss=read('src/styles/platform/native-client-shell.css');
  const parameterSchema=read('src/core/data/parameter-schema.js');
  const failures=[];
  const familyTokens=[
    "padding:Object.freeze(['padding-top','padding-right','padding-bottom','padding-left'])",
    "margin:Object.freeze(['margin-top','margin-right','margin-bottom','margin-left'])",
    "inset:Object.freeze(['top','right','bottom','left'])",
    "overflow:Object.freeze(['overflow-x','overflow-y'])",
    "gap:Object.freeze(['row-gap','column-gap'])"
  ];
  for(const token of familyTokens)if(!layoutSource.includes(token))failures.push(`missing-layout-shorthand-family:${token.split(':')[0]}`);
  if(!layoutSource.includes('for(const property of members)remove(node,property);\n      set(node,shorthand,active[shorthand]);'))failures.push('unsafe-layout-shorthand-write-order');
  if(!layoutSource.includes('remove(node,shorthand);\n      for(const property of members){if(active[property]!==undefined)set(node,property,active[property]);else remove(node,property);}'))failures.push('unsafe-layout-longhand-write-order');
  if(!/\.dkds-analysis-workbench button:not\(\s*\.dkds-field-control,/.test(analysisCss))failures.push('analysis-workbench-field-proxy-not-excluded');
  if(!/:where\(button\):not\(:where\([\s\S]*?\.dkds-field-control[\s\S]*?\)\)\s*\{/.test(schemaCss))failures.push('global-button-fallback-field-proxy-not-excluded');
  if(!/data-dkds-mobile-frame-region="drawer"\]\s+:where\(button\):not\(\.dkds-field-control\)\{padding:5px 9px\}/.test(mobileCss))failures.push('mobile-drawer-field-proxy-not-excluded');
  if(!/data-dkds-mobile-density="compact"\]\s+\.dkds-field-control\{font-size:11px;padding-block:4px;padding-inline:7px\}/.test(mobileCss))failures.push('mobile-compact-canonical-field-density-missing');
  if(!/create\('button','dkds-field-control dkds-multiselect-trigger'\)/.test(parameterSchema))failures.push('multiselect-proxy-lacks-canonical-field-identity');
  const broadViolations=broadButtonGeometryViolations();for(const row of broadViolations)failures.push(`generic-button-geometry-can-hit-field-proxy:${row.file}:${row.line}`);
  const recipeIds=Object.entries(LAYOUT_RECIPES).filter(([,recipe])=>familiesInRecipe(recipe).length).map(([id,recipe])=>Object.freeze({id,families:Object.freeze(familiesInRecipe(recipe))}));
  const pluginExposure=pluginLayoutExposure(),proxyExposure=proxySchemaExposure();
  return Object.freeze({version:'1.0.0',ok:failures.length===0,failures:Object.freeze(failures),layoutRecipes:Object.keys(LAYOUT_RECIPES).length,shorthandSensitiveRecipes:Object.freeze(recipeIds),pluginExposure,proxyExposure,broadButtonGeometryViolations:broadViolations});
}
function format(report){
  const lines=[`Unit semantic/cascade audit: ${report.layoutRecipes} Layout recipes / ${report.shorthandSensitiveRecipes.length} shorthand-sensitive; ${report.pluginExposure.length} Unit presentations; ${report.failures.length} violations.`];
  for(const row of report.pluginExposure)lines.push(`- ${row.plugin}: ${row.layoutMounts} Layout mounts / ${row.shorthandSensitiveMounts.length} shorthand-sensitive mounts`);
  for(const row of report.proxyExposure)lines.push(`- ${row.plugin}: ${row.count} popup multi-select schema fields`);
  for(const failure of report.failures)lines.push(`! ${failure}`);
  return lines.join('\n');
}
if(require.main===module){const report=audit();if(process.argv.includes('--json'))console.log(JSON.stringify(report,null,2));else console.log(format(report));if(process.argv.includes('--strict')&&!report.ok)process.exit(1);}
module.exports=Object.freeze({audit,format,familiesInRecipe,pluginLayoutExposure,proxySchemaExposure,broadButtonGeometryViolations});
