'use strict';
const assert=require('assert');const fs=require('fs');const path=require('path');
const {UNIT_CATALOG}=require('../src/core/ui/modules/composition/unit-template-spec');
const {NATIVE_PLUGIN_GEOMETRY_BLUEPRINTS,PRIVATE_GEOMETRY_BRIDGES}=require('../tools/sdk/native-blueprints');
const {ACCEPTED_LAYOUT_GEOMETRY_VALUES,ACCEPTED_LAYOUT_BREAKPOINTS}=require('../src/core/ui/modules/composition/unit-template-geometry-values');
const GEOMETRY=new Set(Object.keys(ACCEPTED_LAYOUT_GEOMETRY_VALUES));
const BREAKPOINTS=new Set(ACCEPTED_LAYOUT_BREAKPOINTS.map(Number));
const PRIVATE_VAR=/var\((--(?:dc-|pulse-|respar-|dkds-vth-|dkds-plot-content-)[\w-]*)/g;
function stripComments(text){return text.replace(/\/\*[\s\S]*?\*\//g,'');}
function parseRules(text,context='',out=[]){text=stripComments(text);let i=0;while(i<text.length){const m=/([^{}]+)\{/.exec(text.slice(i));if(!m)break;const selector=m[1].trim(),brace=i+m.index+m[0].length-1;let depth=1,j=brace+1;while(j<text.length&&depth){if(text[j]==='{')depth++;else if(text[j]==='}')depth--;j++;}const body=text.slice(brace+1,j-1);if(/^@(media|container|supports)/.test(selector))parseRules(body,`${context} ${selector}`.trim(),out);else if(!selector.startsWith('@')){const declarations={};for(const part of body.split(';')){const pos=part.indexOf(':');if(pos<0)continue;const key=part.slice(0,pos).trim(),value=part.slice(pos+1).trim();if(GEOMETRY.has(key)||key.startsWith('--')||key==='container-type'||key==='container-name')declarations[key]=value;}if(Object.keys(declarations).length)out.push({context,selector:selector.replace(/\s+/g,' '),declarations});}i=j;}return out;}
function privateVars(value){const out=[];for(const match of String(value||'').matchAll(PRIVATE_VAR))out.push(match[1]);return out;}
let ruleCount=0,propertyCount=0,parameterCount=0,bridgeCount=0,responsiveCount=0;const failures=[];
const cssPlugins=fs.readdirSync('src/plugins').filter(plugin=>fs.existsSync(path.join('src/plugins',plugin,'plugin.css'))).sort();
assert.deepStrictEqual(Object.keys(NATIVE_PLUGIN_GEOMETRY_BLUEPRINTS).sort(),cssPlugins,'geometry expressibility must audit exactly every native plugin that still owns private plugin.css');
for(const plugin of cssPlugins){
  const entries=NATIVE_PLUGIN_GEOMETRY_BLUEPRINTS[plugin];
  const cssFile=path.join('src/plugins',plugin,'plugin.css');
  for(const rule of parseRules(fs.readFileSync(cssFile,'utf8'))){
    ruleCount++;const row=entries.find(entry=>new RegExp(entry.match).test(rule.selector));if(!row){failures.push(`${plugin}: no geometry blueprint for ${rule.selector}`);continue;}
    if(!row.mechanism)failures.push(`${plugin}: ${rule.selector} mapping has no public mechanism`);
    for(const bp of rule.context.matchAll(/(?:min|max)-width\s*:\s*(\d+)px/g)){responsiveCount++;if(!BREAKPOINTS.has(Number(bp[1])))failures.push(`${plugin}: ${rule.context} uses unpublished breakpoint ${bp[1]}px`);}
    for(const [property,value] of Object.entries(rule.declarations)){
      propertyCount++;
      if(property==='container-type'||property==='container-name'){responsiveCount++;continue;}
      if(property.startsWith('--')){
        const bridge=PRIVATE_GEOMETRY_BRIDGES[property];if(!bridge){failures.push(`${plugin}: ${rule.selector} private geometry token ${property} has no public bridge`);continue;}bridgeCount++;if(!UNIT_CATALOG[bridge.unit])failures.push(`${plugin}: ${property} bridge uses unknown Unit ${bridge.unit}`);continue;
      }
      const refs=privateVars(value);
      if(refs.length){for(const variable of refs){const bridge=PRIVATE_GEOMETRY_BRIDGES[variable];if(!bridge)failures.push(`${plugin}: ${rule.selector} ${property}:${value} references unbridged ${variable}`);else if(!bridge.publicProperties.includes(property)&&bridge.mechanism!=='layout-recipe')failures.push(`${plugin}: ${variable} bridge does not cover ${property} in ${rule.selector}`);else bridgeCount++;}continue;}
      const accepted=ACCEPTED_LAYOUT_GEOMETRY_VALUES[property]||[];
      if(!accepted.includes(value))failures.push(`${plugin}: ${rule.selector} cannot express ${property}:${value} through accepted Unit geometry`);else parameterCount++;
    }
  }
}
assert.deepStrictEqual(failures,[],`Native plugin geometry is not property-level expressible through Unit Templates:\n${failures.join('\n')}`);
assert(ruleCount>0&&propertyCount>0,'Geometry expressibility audit found no remaining private plugin geometry to validate.');
assert(parameterCount>0&&bridgeCount>0&&responsiveCount>0,'Geometry expressibility audit did not exercise all public mechanisms.');
console.log(`SDK 1.51 native geometry expressibility PASS (${ruleCount} rules / ${propertyCount} properties; accepted=${parameterCount}, bridges=${bridgeCount}, responsive=${responsiveCount})`);
