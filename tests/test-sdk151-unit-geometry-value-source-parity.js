'use strict';
const assert=require('assert');const fs=require('fs');const path=require('path');
const {LAYOUT_RECIPES}=require('../src/core/ui/modules/composition/unit-template-layout-spec');
const {ACCEPTED_LAYOUT_GEOMETRY_VALUES,ACCEPTED_LAYOUT_BREAKPOINTS}=require('../src/core/ui/modules/composition/unit-template-geometry-values');
const {PRIVATE_GEOMETRY_BRIDGES}=require('../tools/sdk/native-blueprints');
const plugins=fs.readdirSync('src/plugins').filter(plugin=>fs.existsSync(path.join('src/plugins',plugin,'plugin.css'))).sort();
const sourceValues=new Map(Object.keys(ACCEPTED_LAYOUT_GEOMETRY_VALUES).map(key=>[key,new Set()]));const breakpoints=new Set();
const PRIVATE=/var\(--(?:dc-|pulse-|respar-|dkds-vth-|dkds-plot-content-)/;
function scanCss(text){text=text.replace(/\/\*[\s\S]*?\*\//g,'');for(const match of text.matchAll(/(?:min|max)-width\s*:\s*(\d+)px/g))breakpoints.add(Number(match[1]));for(const match of text.matchAll(/([\w-]+)\s*:\s*([^;{}]+)[;}]/g)){const property=match[1],value=match[2].trim();if(sourceValues.has(property)&&!PRIVATE.test(value))sourceValues.get(property).add(value);}}
for(const plugin of plugins)scanCss(fs.readFileSync(path.join('src/plugins',plugin,'plugin.css'),'utf8'));
function walkFiles(root,extension,out=[]){for(const name of fs.readdirSync(root)){const file=path.join(root,name),stat=fs.statSync(file);if(stat.isDirectory()){if(name==='generated'||name==='node_modules')continue;walkFiles(file,extension,out);}else if(file.endsWith(extension))out.push(file);}return out;}
// Once a native plugin is cut over, accepted geometry provenance moves from its
// deleted private plugin.css into canonical Core styles and Unit-owned geometry.
// Keep the whitelist source-derived from the current production owners instead
// of retaining a dead CSS file merely for census provenance.
for(const file of walkFiles('src/styles','.css'))scanCss(fs.readFileSync(file,'utf8'));
const KEY={display:'display',flexDirection:'flex-direction',flexWrap:'flex-wrap',flex:'flex',alignItems:'align-items',alignContent:'align-content',alignSelf:'align-self',justifyContent:'justify-content',justifySelf:'justify-self',placeItems:'place-items',gridTemplateColumns:'grid-template-columns',gridTemplateRows:'grid-template-rows',gridTemplateAreas:'grid-template-areas',gridAutoRows:'grid-auto-rows',gridAutoFlow:'grid-auto-flow',gridArea:'grid-area',gridColumn:'grid-column',gridRow:'grid-row',gap:'gap',rowGap:'row-gap',columnGap:'column-gap',overflow:'overflow',overflowX:'overflow-x',overflowY:'overflow-y',position:'position',inset:'inset',top:'top',right:'right',bottom:'bottom',left:'left',minWidth:'min-width',minHeight:'min-height',width:'width',height:'height',maxWidth:'max-width',maxHeight:'max-height',boxSizing:'box-sizing',aspectRatio:'aspect-ratio',whiteSpace:'white-space',textOverflow:'text-overflow',resize:'resize',padding:'padding',paddingTop:'padding-top',paddingRight:'padding-right',paddingBottom:'padding-bottom',paddingLeft:'padding-left',margin:'margin',marginTop:'margin-top',marginRight:'margin-right',marginBottom:'margin-bottom',marginLeft:'margin-left'};
function scanUnitGeometrySource(text){
  for(const match of text.matchAll(/\b([A-Za-z][A-Za-z0-9]*)\s*:\s*(['"])(.*?)\2/g)){
    const property=KEY[match[1]];if(property&&sourceValues.has(property)&&!PRIVATE.test(match[3]))sourceValues.get(property).add(match[3]);
  }
  for(const match of text.matchAll(/\b(?:maxWidth|minWidth)\s*:\s*(\d+(?:\.\d+)?)/g))breakpoints.add(Number(match[1]));
}
for(const file of walkFiles('src/plugins','.js'))scanUnitGeometrySource(fs.readFileSync(file,'utf8'));
function visitRecipe(recipe){for(const [key,value] of Object.entries(recipe||{})){if(key==='responsive'){for(const row of value||[]){if(row.maxWidth!==undefined)breakpoints.add(Number(row.maxWidth));if(row.minWidth!==undefined)breakpoints.add(Number(row.minWidth));visitRecipe(row);}continue;}let property=KEY[key],text=value;if(!property&&key.endsWith('Px')){property=KEY[key.slice(0,-2)];text=`${value}px`;}if(property&&sourceValues.has(property)&&!PRIVATE.test(String(text)))sourceValues.get(property).add(String(text));}}
for(const recipe of Object.values(LAYOUT_RECIPES))visitRecipe(recipe);
for(const bridge of Object.values(PRIVATE_GEOMETRY_BRIDGES)){for(const property of bridge.publicProperties||[]){const values=bridge.resolvedByProperty?.[property]||bridge.resolvedValues||[];for(const value of values)if(sourceValues.has(property))sourceValues.get(property).add(String(value));}}
const missing=[];for(const [property,values] of Object.entries(ACCEPTED_LAYOUT_GEOMETRY_VALUES))for(const value of values){assert(!PRIVATE.test(value),`Public Unit geometry leaks plugin-private CSS variable: ${property}:${value}`);if(!sourceValues.get(property)?.has(value))missing.push(`${property}:${value}`);}
assert.deepStrictEqual(missing,[],`Unit geometry value catalog contains values not derived from accepted native geometry/recipes/bridges:\n${missing.join('\n')}`);
const missingBreakpoints=ACCEPTED_LAYOUT_BREAKPOINTS.filter(value=>!breakpoints.has(Number(value)));assert.deepStrictEqual(missingBreakpoints,[],`Unit layout breakpoints are not source-derived: ${missingBreakpoints.join(', ')}`);
console.log(`SDK 1.51 Unit geometry source parity PASS (${Object.values(ACCEPTED_LAYOUT_GEOMETRY_VALUES).reduce((n,rows)=>n+rows.length,0)} values / ${ACCEPTED_LAYOUT_BREAKPOINTS.length} breakpoints)`);
