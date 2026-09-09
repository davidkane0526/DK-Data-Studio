#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');

const ROOT=path.resolve(__dirname,'../..');

function collectCssFiles(){
  const files=[];
  const walk=dir=>{if(!fs.existsSync(dir))return;for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(e.isFile()&&e.name.endsWith('.css'))files.push(p);}};
  walk(path.join(ROOT,'src','styles'));
  for(const rel of ['src/mobile.css','src/plugin-window/style.css']){const p=path.join(ROOT,rel);if(fs.existsSync(p))files.push(p);}
  const plugins=path.join(ROOT,'src','plugins');
  if(fs.existsSync(plugins))for(const e of fs.readdirSync(plugins,{withFileTypes:true}))if(e.isDirectory())for(const name of ['plugin.css','mobile.css']){const p=path.join(plugins,e.name,name);if(fs.existsSync(p))files.push(p);}
  return files.sort();
}

function splitSelectorList(text){
  const out=[];let start=0,paren=0,bracket=0,quote='';
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quote){if(c==='\\')i++;else if(c===quote)quote='';continue;}
    if(c==='"'||c==="'"){quote=c;continue;}
    if(c==='(')paren++;else if(c===')')paren=Math.max(0,paren-1);else if(c==='[')bracket++;else if(c===']')bracket=Math.max(0,bracket-1);
    else if(c===','&&paren===0&&bracket===0){out.push(text.slice(start,i));start=i+1;}
  }
  out.push(text.slice(start));return out;
}
function stripComments(text){return String(text||'').replace(/\/\*[\s\S]*?\*\//g,match=>match.replace(/[^\r\n]/g,' '));}
function lineAt(text,offset){return 1+((String(text||'').slice(0,Math.max(0,Number(offset)||0)).match(/\n/g)||[]).length);}
function findClosingBrace(text,open){let depth=1,quote='';for(let i=open+1;i<text.length;i++){const c=text[i];if(quote){if(c==='\\')i++;else if(c===quote)quote='';continue;}if(c==='"'||c==="'"){quote=c;continue;}if(c==='{')depth++;else if(c==='}'&&!--depth)return i;}return -1;}
function parseDeclarations(body){
  const rows=[];let start=0,paren=0,quote='';
  const flush=end=>{const seg=body.slice(start,end).trim();start=end+1;if(!seg)return;let colon=-1,p=0,q='';for(let i=0;i<seg.length;i++){const c=seg[i];if(q){if(c==='\\')i++;else if(c===q)q='';continue;}if(c==='"'||c==="'"){q=c;continue;}if(c==='(')p++;else if(c===')')p=Math.max(0,p-1);else if(c===':'&&!p){colon=i;break;}}if(colon>0)rows.push([seg.slice(0,colon).trim().toLowerCase(),seg.slice(colon+1).trim()]);};
  for(let i=0;i<body.length;i++){const c=body[i];if(quote){if(c==='\\')i++;else if(c===quote)quote='';continue;}if(c==='"'||c==="'"){quote=c;continue;}if(c==='(')paren++;else if(c===')')paren=Math.max(0,paren-1);else if(c===';'&&!paren)flush(i);}flush(body.length);return rows;
}
function ruleBlocks(text,out=[],baseOffset=0,rootText=null){
  const source=String(text||''),root=rootText===null?source:String(rootText),css=stripComments(source);let pos=0;
  while(pos<css.length){
    const open=css.indexOf('{',pos);if(open<0)break;
    const rawPrelude=css.slice(pos,open),lead=rawPrelude.search(/\S/),prelude=rawPrelude.trim(),close=findClosingBrace(css,open);if(close<0)break;
    const body=css.slice(open+1,close),selectorOffset=baseOffset+pos+(lead<0?0:lead),line=lineAt(root,selectorOffset);pos=close+1;
    if(!prelude)continue;
    if(prelude.startsWith('@')){if(/^@(media|supports|container|layer|scope)\b/i.test(prelude))ruleBlocks(body,out,baseOffset+open+1,root);continue;}
    out.push({selector:prelude,declarations:parseDeclarations(body),line,offset:selectorOffset});
  }
  return out;
}
function canonicalSelector(selector){
  let value=String(selector||'').replace(/\s+/g,' ').trim(),previous='';
  const prefixes=[
    /^html\[data-dkds-host=(?:"[^"]+"|'[^']+'|[^\]]+)\]\s*/i,
    /^html\.react-native-client\s*/i,
    /^html\[data-dkds-theme=(?:"[^"]+"|'[^']+'|[^\]]+)\]\s*/i,
    /^html\[data-dkds-theme-profile=(?:"[^"]+"|'[^']+'|[^\]]+)\]\s*/i,
    /^body\.dkds-modern-ui(?:\.plugin-window-host)?\s*/i,
    /^\.plugin-window-host\s*/i,
    /^\.dkds-plugin-window\s*/i
  ];
  while(value&&value!==previous){previous=value;for(const prefix of prefixes)value=value.replace(prefix,'');}
  return value.trim();
}
const SHORTHANDS=Object.freeze({
  padding:['padding-top','padding-right','padding-bottom','padding-left'],
  'padding-block':['padding-top','padding-bottom'],'padding-inline':['padding-left','padding-right'],
  margin:['margin-top','margin-right','margin-bottom','margin-left'],
  'margin-block':['margin-top','margin-bottom'],'margin-inline':['margin-left','margin-right'],
  inset:['top','right','bottom','left'],'inset-block':['top','bottom'],'inset-inline':['left','right'],
  border:['border-top','border-right','border-bottom','border-left'],
  'border-color':['border-top-color','border-right-color','border-bottom-color','border-left-color'],
  'border-width':['border-top-width','border-right-width','border-bottom-width','border-left-width'],
  'border-radius':['border-top-left-radius','border-top-right-radius','border-bottom-right-radius','border-bottom-left-radius'],
  flex:['flex-grow','flex-shrink','flex-basis']
});
const propertySlots=property=>SHORTHANDS[property]||[property];
function ownerLayer(file){const rel=path.relative(ROOT,file).replace(/\\/g,'/');if(rel.includes('/styles/foundation/'))return'foundation';if(rel.includes('/styles/structure/'))return'structure';if(rel.includes('/styles/presentation/'))return'presentation';if(rel.includes('/styles/theme/'))return'theme';if(rel.includes('/styles/motion/'))return'motion';if(rel.includes('/styles/platform/')||rel==='src/mobile.css'||/\/mobile\.css$/.test(rel))return'platform';if(rel==='src/plugin-window/style.css')return'window';if(rel.includes('/plugins/'))return'plugin';return'other';}
function audit(){
  const files=collectCssFiles(),owners=new Map();let slots=0,declarations=0;
  for(const file of files){const rel=path.relative(ROOT,file).replace(/\\/g,'/'),layer=ownerLayer(file);for(const block of ruleBlocks(fs.readFileSync(file,'utf8'))){for(const raw of splitSelectorList(block.selector)){const selector=canonicalSelector(raw);if(!selector||selector==='from'||selector==='to'||/^\d+(?:\.\d+)?%$/.test(selector))continue;for(const [property,value] of block.declarations){declarations++;if(property.startsWith('--'))continue;for(const slot of propertySlots(property)){slots++;const key=`${selector}\u0000${slot}`;if(!owners.has(key))owners.set(key,new Map());const byFile=owners.get(key);if(!byFile.has(rel))byFile.set(rel,{file:rel,layer,entries:[]});byFile.get(rel).entries.push({selector:raw.trim(),property,value});}}}}}
  const collisions=[];for(const [key,byFile] of owners)if(byFile.size>1){const [selector,property]=key.split('\u0000');collisions.push({selector,property,owners:[...byFile.values()]});}
  collisions.sort((a,b)=>a.selector.localeCompare(b.selector)||a.property.localeCompare(b.property));
  return Object.freeze({files:files.length,declarations,propertySlots:slots,collisions:Object.freeze(collisions),ok:collisions.length===0});
}
function format(report){const lines=[`UI style ownership: ${report.files} files, ${report.declarations} declarations, ${report.propertySlots} rendered-property slots, ${report.collisions.length} cross-file collisions.`];for(const row of report.collisions)lines.push(`- ${row.selector} :: ${row.property} => ${row.owners.map(x=>`${x.file} [${x.layer}]`).join(' | ')}`);return lines.join('\n');}
function validate(){const report=audit();if(!report.ok){const error=new Error(format(report));error.report=report;throw error;}return report;}
if(require.main===module){const report=audit();if(process.argv.includes('--json'))console.log(JSON.stringify(report,null,2));else console.log(format(report));if(process.argv.includes('--strict')&&!report.ok)process.exit(1);}
module.exports=Object.freeze({audit,validate,format,canonicalSelector,propertySlots,collectCssFiles,ruleBlocks,splitSelectorList,ownerLayer,parseDeclarations});
