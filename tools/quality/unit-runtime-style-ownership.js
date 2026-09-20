#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const style=require('./style-ownership');
const {LAYOUT_RECIPES}=require('../../src/core/ui/modules/composition/unit-template-layout-spec');

const ROOT=path.resolve(__dirname,'../..');
const PLUGINS=path.join(ROOT,'src','plugins');
const KEY_MAP=Object.freeze({
  display:'display',flexDirection:'flex-direction',flexWrap:'flex-wrap',flex:'flex',alignItems:'align-items',alignContent:'align-content',alignSelf:'align-self',justifyContent:'justify-content',justifySelf:'justify-self',placeItems:'place-items',
  gridTemplateColumns:'grid-template-columns',gridTemplateRows:'grid-template-rows',gridTemplateAreas:'grid-template-areas',gridAutoRows:'grid-auto-rows',gridAutoFlow:'grid-auto-flow',gridArea:'grid-area',gridColumn:'grid-column',gridRow:'grid-row',
  gap:'gap',rowGap:'row-gap',columnGap:'column-gap',overflow:'overflow',overflowX:'overflow-x',overflowY:'overflow-y',position:'position',inset:'inset',top:'top',right:'right',bottom:'bottom',left:'left',
  minWidth:'min-width',minHeight:'min-height',width:'width',height:'height',maxWidth:'max-width',maxHeight:'max-height',boxSizing:'box-sizing',aspectRatio:'aspect-ratio',whiteSpace:'white-space',textOverflow:'text-overflow',resize:'resize',
  padding:'padding',paddingTop:'padding-top',paddingRight:'padding-right',paddingBottom:'padding-bottom',paddingLeft:'padding-left',margin:'margin',marginTop:'margin-top',marginRight:'margin-right',marginBottom:'margin-bottom',marginLeft:'margin-left'
});
const PX_MAP=Object.freeze({
  gapPx:'gap',rowGapPx:'row-gap',columnGapPx:'column-gap',topPx:'top',rightPx:'right',bottomPx:'bottom',leftPx:'left',paddingPx:'padding',paddingTopPx:'padding-top',paddingRightPx:'padding-right',paddingBottomPx:'padding-bottom',paddingLeftPx:'padding-left',marginPx:'margin',marginTopPx:'margin-top',marginRightPx:'margin-right',marginBottomPx:'margin-bottom',marginLeftPx:'margin-left',minWidthPx:'min-width',minHeightPx:'min-height',widthPx:'width',heightPx:'height',maxWidthPx:'max-width',maxHeightPx:'max-height'
});
const escRe=value=>String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const lineOf=(text,offset)=>1+(text.slice(0,offset).match(/\n/g)||[]).length;
const expandProperty=property=>{
  const first=style.propertySlots(property);
  const out=[];
  for(const slot of first){
    if(slot==='gap')out.push('row-gap','column-gap');
    else if(slot==='overflow')out.push('overflow-x','overflow-y');
    else out.push(slot);
  }
  return out;
};
function addProperty(out,property){for(const slot of expandProperty(property))out.add(slot);}
function geometryProperties(recipe={},out=new Set()){
  for(const [key,value] of Object.entries(recipe||{})){
    if(key==='responsive'){for(const row of value||[])geometryProperties(row,out);continue;}
    if(KEY_MAP[key])addProperty(out,KEY_MAP[key]);
    if(PX_MAP[key])addProperty(out,PX_MAP[key]);
  }
  return out;
}
function objectKeyProperties(text){
  const out=new Set();
  for(const match of String(text||'').matchAll(/\b([A-Za-z][A-Za-z0-9]*)\s*:/g)){
    const key=match[1];if(KEY_MAP[key])addProperty(out,KEY_MAP[key]);if(PX_MAP[key])addProperty(out,PX_MAP[key]);
  }
  return out;
}
function rightmostCompound(selector){
  const text=String(selector||'');let paren=0,bracket=0,quote='',last=0;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quote){if(c==='\\')i++;else if(c===quote)quote='';continue;}
    if(c==='"'||c==="'"){quote=c;continue;}
    if(c==='(')paren++;else if(c===')')paren=Math.max(0,paren-1);else if(c==='[')bracket++;else if(c===']')bracket=Math.max(0,bracket-1);
    else if(paren===0&&bracket===0&&(c==='>'||c==='+'||c==='~'||/\s/.test(c)))last=i+1;
  }
  return text.slice(last).trim();
}
function classHits(compound,className){return new RegExp(`\\.${escRe(className)}(?=[.#:[\\s>+~]|$)`).test(compound);}
function cssRules(plugin){
  const rows=[];
  for(const name of ['plugin.css','mobile.css']){
    const file=path.join(PLUGINS,plugin,name);if(!fs.existsSync(file))continue;
    const text=fs.readFileSync(file,'utf8');
    for(const block of style.ruleBlocks(text))for(const raw of style.splitSelectorList(block.selector))rows.push({file:name,selector:raw.trim(),compound:rightmostCompound(raw),declarations:block.declarations,line:block.line});
  }
  return rows;
}
function cssPropertySlots(declarations){const out=new Set();for(const [property] of declarations)for(const slot of expandProperty(property))out.add(slot);return out;}
function parseLayoutCalls(source){
  const rows=[],variables=new Map(),lines=source.split(/\n/);
  for(let i=0;i<lines.length;i++){
    const line=lines[i];let kind=null,defaultVariant='stack';
    // The local helper definition itself contains `units.layout.create(` but is
    // not a mount. Count only executable call sites so the production census is
    // an exact mount census rather than a source-token census.
    if(/\b(?:const|let|var)\s+layout\s*=/.test(line)&&line.includes('units.layout.create('))continue;
    if(line.includes('units.layout.create('))kind='direct';
    else if(line.includes('layout(units,')){kind='helper';defaultVariant='identity';}
    else continue;
    const variant=(line.match(/\bvariant\s*:\s*'([^']+)'/)||[])[1]||defaultVariant;
    const classMatch=line.match(/\bclassName\s*:\s*'([^']*)'/)||line.match(/\bclassName\s*:\s*"([^"]*)"/)||line.match(/\bclassName\s*:\s*`([^`]*)`/);
    const className=classMatch?.[1]||'',classes=className.split(/\s+/).filter(x=>x&&!x.includes('${'));
    const geometryMatch=line.match(/\bgeometry\s*:\s*\{([^}]*)\}/),responsiveMatch=line.match(/\bresponsiveGeometry\s*:\s*\[([^\]]*)\]/),props=geometryProperties(LAYOUT_RECIPES[variant]||{});
    if(geometryMatch)for(const prop of objectKeyProperties(geometryMatch[1]))props.add(prop);
    if(responsiveMatch)for(const prop of objectKeyProperties(responsiveMatch[1]))props.add(prop);
    const variable=(line.match(/\bconst\s+([A-Za-z_$][\w$]*)\s*=/)||[])[1]||'',row={line:i+1,kind,variant,className,classes,properties:props,variable,source:line.trim()};rows.push(row);if(variable)variables.set(variable,row);
  }
  return {rows,variables};
}
function parseSplitCalls(source,variables){
  const rows=[];
  const push=(match,body,container='')=>{
    const explicitContainer=(body.match(/\bcontainer\s*:\s*([A-Za-z_$][\w$]*)/)||[])[1]||'';
    const host=explicitContainer||container;
    const handle=(body.match(/\bhandle\s*:\s*([A-Za-z_$][\w$]*)/)||[])[1]||'';
    const layoutOwner=(body.match(/\blayoutOwner\s*:\s*'([^']+)'/)||[])[1]||'core';
    const reflowBelow=(body.match(/\breflowBelow\s*:\s*([0-9]+)/)||[])[1]||'';
    rows.push({line:lineOf(source,match.index),container:host,handle,layoutOwner,reflowBelow,layout:variables.get(host)||null,source:match[0]});
  };
  let match;
  const objectOnly=/units\.splitPane\.(?:adopt|create)\(\{([^;]+?)\}\);/gs;
  while((match=objectOnly.exec(source)))push(match,match[1]);
  // Public SplitPane also supports create(host,{...}). Audit that signature too so
  // a production Unit cutover cannot escape SplitPane ownership simply by using
  // the host-first overload.
  const hostFirst=/units\.splitPane\.create\(\s*([A-Za-z_$][\w$]*)\s*,\s*\{([^;]+?)\}\);/gs;
  while((match=hostFirst.exec(source)))push(match,match[2],match[1]);
  return rows.sort((a,b)=>a.line-b.line);
}
function parsePrimeInsets(source,variables){
  const rows=[],re=/units\.prime\.build\(\{([^;]+?)\}\);/gs;let match;
  while((match=re.exec(source))){const body=match[1];if(!/detailGeometry\s*:\s*\{[^}]*contentInsetPx/.test(body))continue;const existing=(body.match(/\bexistingNode\s*:\s*([A-Za-z_$][\w$]*)/)||[])[1]||'';rows.push({line:lineOf(source,match.index),existing,layout:variables.get(existing)||null});}
  return rows;
}
function matchingCss(rules,classes){return rules.filter(row=>classes.some(cls=>classHits(row.compound,cls)));}
function sameElementCssProperties(rules,classes){const out=new Set();for(const row of matchingCss(rules,classes))for(const slot of cssPropertySlots(row.declarations))out.add(slot);return out;}
function auditPlugin(plugin){
  const file=path.join(PLUGINS,plugin,'unit-presentation.js');if(!fs.existsSync(file))return null;
  const source=fs.readFileSync(file,'utf8'),rules=cssRules(plugin),parsed=parseLayoutCalls(source),violations=[];
  for(const row of parsed.rows){
    if(!row.classes.length||!row.properties.size)continue;
    for(const css of matchingCss(rules,row.classes))for(const slot of cssPropertySlots(css.declarations))if(row.properties.has(slot))violations.push(Object.freeze({type:'unit-css-geometry-conflict',plugin,file:'unit-presentation.js',line:row.line,variant:row.variant,className:row.className,slot,cssFile:css.file,cssLine:css.line,selector:css.selector}));
  }
  const splits=parseSplitCalls(source,parsed.variables);
  for(const split of splits){
    if(split.layoutOwner==='host'){
      if(split.reflowBelow)violations.push(Object.freeze({type:'host-owned-split-with-core-reflow',plugin,line:split.line,host:split.container}));
      if(!split.layout)violations.push(Object.freeze({type:'host-owned-split-unresolved-layout-host',plugin,line:split.line,host:split.container}));
      else {const props=sameElementCssProperties(rules,split.layout.classes);if(!props.has('display')||!(props.has('grid-template-rows')||props.has('grid-template-columns')))violations.push(Object.freeze({type:'host-owned-split-without-css-layout-owner',plugin,line:split.line,host:split.container,className:split.layout.className}));}
      continue;
    }
    if(!split.layout)continue;
    const runtime=new Set(['display','flex-direction','row-gap','column-gap','grid-template-rows','grid-template-columns','min-width','min-height']),classes=split.layout.classes;
    for(const css of matchingCss(rules,classes))for(const slot of cssPropertySlots(css.declarations))if(runtime.has(slot))violations.push(Object.freeze({type:'split-pane-css-geometry-conflict',plugin,line:split.line,host:split.container,className:split.layout.className,slot,cssFile:css.file,cssLine:css.line,selector:css.selector}));
  }
  for(const prime of parsePrimeInsets(source,parsed.variables)){
    if(!prime.layout)continue;const classes=prime.layout.classes;
    for(const css of matchingCss(rules,classes))for(const slot of cssPropertySlots(css.declarations))if(slot.startsWith('padding-'))violations.push(Object.freeze({type:'prime-detail-css-padding-conflict',plugin,line:prime.line,host:prime.existing,className:prime.layout.className,slot,cssFile:css.file,cssLine:css.line,selector:css.selector}));
  }
  return Object.freeze({plugin,file:path.relative(ROOT,file).replace(/\\/g,'/'),layouts:parsed.rows.length,splits:splits.length,violations:Object.freeze(violations)});
}
function audit(){
  const reports=[];if(fs.existsSync(PLUGINS))for(const entry of fs.readdirSync(PLUGINS,{withFileTypes:true}).filter(x=>x.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name))){const row=auditPlugin(entry.name);if(row)reports.push(row);}
  const violations=reports.flatMap(row=>row.violations);return Object.freeze({version:'1.1.0',plugins:reports.length,layouts:reports.reduce((n,r)=>n+r.layouts,0),splits:reports.reduce((n,r)=>n+r.splits,0),violations:Object.freeze(violations),ok:violations.length===0,reports:Object.freeze(reports)});
}
function format(report){const lines=[`Unit runtime/style ownership: ${report.plugins} production Unit presentations, ${report.layouts} Layout mounts, ${report.splits} SplitPane mounts, ${report.violations.length} violations.`];for(const row of report.violations)lines.push(`- ${row.type}: ${row.plugin}:${row.line} ${row.className||row.host||''} ${row.slot||''}${row.selector?` <- ${row.cssFile}:${row.cssLine} ${row.selector}`:''}`.trim());return lines.join('\n');}
function validate(){const report=audit();if(!report.ok){const error=new Error(format(report));error.report=report;throw error;}return report;}
if(require.main===module){const report=audit();if(process.argv.includes('--json'))console.log(JSON.stringify(report,null,2));else console.log(format(report));if(process.argv.includes('--strict')&&!report.ok)process.exit(1);}
module.exports=Object.freeze({audit,validate,format,geometryProperties,rightmostCompound,parseLayoutCalls,parseSplitCalls,expandProperty});
