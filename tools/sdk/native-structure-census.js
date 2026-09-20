'use strict';
const fs=require('fs');
const path=require('path');
const ROOT=path.resolve(__dirname,'../..');
const PLUGINS=path.join(ROOT,'src/plugins');
const strip=text=>String(text||'').replace(/<[^>]*>/g,' ').replace(/\$\{[^}]*\}/g,'${…}').replace(/\s+/g,' ').trim().slice(0,120);
const attr=(attrs,name)=>{const m=String(attrs||'').match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`,'i'));return m?m[1]:'';};
const lineAt=(source,index)=>source.slice(0,index).split('\n').length;
const rel=file=>path.relative(ROOT,file).replace(/\\/g,'/');
const freezeRecord=row=>Object.freeze(row);
function scanTag(source,file,tag){
  const rows=[];const paired=new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)<\\/${tag}>`,'gi');let m;
  while((m=paired.exec(source)))rows.push(freezeRecord({file:rel(file),line:lineAt(source,m.index),tag,id:attr(m[1],'id'),type:attr(m[1],'type'),className:attr(m[1],'class'),label:strip(m[2])}));
  if(['input'].includes(tag)){const single=new RegExp(`<${tag}\\b([^>]*)>`,'gi');while((m=single.exec(source)))rows.push(freezeRecord({file:rel(file),line:lineAt(source,m.index),tag,id:attr(m[1],'id'),type:attr(m[1],'type'),className:attr(m[1],'class'),label:attr(m[1],'placeholder')}));}
  return rows;
}
function scanPlugin(id){
  const dir=path.join(PLUGINS,id),files=[];const walk=d=>{for(const ent of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,ent.name);if(ent.isDirectory())walk(p);else if(ent.isFile()&&p.endsWith('.js'))files.push(p);}};walk(dir);
  const rows={buttons:[],inputs:[],selects:[],textareas:[],tables:[],dynamicElements:[],markers:{}};
  const markerNames=['analysis-page-header','dkds-surface-header','analysis-chart-title','dkds-plot-view-head','dkds-portable-header','dkds-surface-actions','dkds-integrated-action-group','dkds-split-handle','dkds-summary-row','dkds-summary-strip','dkds-list','dkds-list-item','dkds-metric','dkds-note','dkds-message','empty-state'];
  for(const file of files){const source=fs.readFileSync(file,'utf8');rows.buttons.push(...scanTag(source,file,'button'));rows.inputs.push(...scanTag(source,file,'input'));rows.selects.push(...scanTag(source,file,'select'));rows.textareas.push(...scanTag(source,file,'textarea'));rows.tables.push(...scanTag(source,file,'table'));
    const dyn=/createElement\(\s*["'](button|input|select|textarea|table|header|section)["']\s*\)/g;let m;while((m=dyn.exec(source)))rows.dynamicElements.push(freezeRecord({file:rel(file),line:lineAt(source,m.index),tag:m[1]}));
    for(const name of markerNames){const count=(source.match(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))||[]).length;if(count)rows.markers[name]=(rows.markers[name]||0)+count;}
  }
  rows.inputs=rows.inputs.filter(row=>!['checkbox','radio'].includes(String(row.type||'').toLowerCase()));
  const checks=[];for(const file of files){const source=fs.readFileSync(file,'utf8');for(const row of scanTag(source,file,'input'))if(['checkbox','radio'].includes(String(row.type||'').toLowerCase()))checks.push(row);}rows.checks=checks;
  rows.counts=Object.freeze({buttons:rows.buttons.length,inputs:rows.inputs.length,selects:rows.selects.length,textareas:rows.textareas.length,checks:rows.checks.length,tables:rows.tables.length,dynamicElements:rows.dynamicElements.length});
  return Object.freeze(rows);
}
function scanAll(){const out={};for(const ent of fs.readdirSync(PLUGINS,{withFileTypes:true}).filter(e=>e.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name)))out[ent.name]=scanPlugin(ent.name);return Object.freeze(out);}
const STRUCTURE_UNIT_MAP=Object.freeze({button:'action',input:'field',select:'field',textarea:'field',checkbox:'check',radio:'check',table:'table',header:'header',section:'section'});
module.exports=Object.freeze({scanAll,scanPlugin,STRUCTURE_UNIT_MAP});
if(require.main===module)process.stdout.write(JSON.stringify({plugins:scanAll()},null,2)+'\n');
