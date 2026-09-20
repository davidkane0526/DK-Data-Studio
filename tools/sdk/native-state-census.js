'use strict';
const fs=require('fs');const path=require('path');
const ROOT=path.resolve(__dirname,'../..');const PLUGINS=path.join(ROOT,'src/plugins');
const rel=file=>path.relative(ROOT,file).replace(/\\/g,'/');
const lineAt=(source,index)=>source.slice(0,index).split('\n').length;
const STATE_ATTR_MAP=Object.freeze({
  'aria-selected':'selected','aria-pressed':'pressed','aria-expanded':'expanded','aria-hidden':'visible','aria-current':'current','aria-disabled':'enabled','aria-checked':'checked','aria-busy':'busy','aria-readonly':'readonly','aria-required':'required','aria-invalid':'invalid'
});
const PROPERTY_STATE_MAP=Object.freeze({disabled:'enabled',hidden:'visible',checked:'checked',readOnly:'readonly',required:'required'});
const DATASET_STATE_MAP=Object.freeze({busy:'busy',loading:'loading'});
const CLASS_STATE_MAP=Object.freeze({selected:'selected',active:'pressed',hidden:'visible'});
const KEYBOARD_TOKENS=Object.freeze(['Escape','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter',' ','Tab','Home','End']);
function filesFor(dir){const out=[];const walk=d=>{for(const ent of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,ent.name);if(ent.isDirectory())walk(p);else if(ent.isFile()&&p.endsWith('.js'))out.push(p);}};walk(dir);return out;}
function push(rows,file,source,index,kind,raw,state,extra={}){rows.push(Object.freeze({file:rel(file),line:lineAt(source,index),kind,raw,state,...extra}));}
const UNIT_A11Y_INHERITANCE=Object.freeze({
  splitPane:Object.freeze({roles:['separator'],aria:['aria-orientation']})
});
function scanPlugin(id){
  const rows=[],roles=[],a11y=[],keyboard=[],unitUsage=new Set();const dir=path.join(PLUGINS,id);
  for(const file of filesFor(dir)){const source=fs.readFileSync(file,'utf8');let m;
    for(const unit of Object.keys(UNIT_A11Y_INHERITANCE))if(new RegExp(`(?:units|unitTemplates)\\.${unit}\\.(?:create|adopt|build|mount)`).test(source))unitUsage.add(unit);
    const attrRx=/(setAttribute|removeAttribute)\(\s*['"](aria-[a-z-]+|role|tabindex)['"](?:\s*,\s*['"]([^'"]*)['"])?/g;
    while((m=attrRx.exec(source))){const op=m[1],name=m[2],value=op==='setAttribute'?m[3]:undefined;if(name==='role'||name==='tabindex')roles.push(Object.freeze({file:rel(file),line:lineAt(source,m.index),name,...(value!==undefined?{value}:{}),kind:'dynamic-attribute'}));else if(STATE_ATTR_MAP[name])push(rows,file,source,m.index,'aria',name,STATE_ATTR_MAP[name],{attribute:name,...(value!==undefined?{value}:{})});else a11y.push(Object.freeze({file:rel(file),line:lineAt(source,m.index),name,...(value!==undefined?{value}:{}),kind:'dynamic-aria'}));}
    const staticRx=/(?<![-\w])(role|aria-[a-z-]+|tabindex)\s*=\s*["']([^"']*)["']/g;
    while((m=staticRx.exec(source))){const name=m[1],value=m[2];if(name==='role'||name==='tabindex')roles.push(Object.freeze({file:rel(file),line:lineAt(source,m.index),name,value,kind:'static-attribute'}));else if(STATE_ATTR_MAP[name])push(rows,file,source,m.index,'aria-static',`${name}=${value}`,STATE_ATTR_MAP[name],{attribute:name,value});else a11y.push(Object.freeze({file:rel(file),line:lineAt(source,m.index),name,value,kind:'static-aria'}));}
    const propRx=/\.\s*(disabled|hidden|checked|readOnly|required)\s*=\s*/g;
    while((m=propRx.exec(source)))push(rows,file,source,m.index,'property',m[1],PROPERTY_STATE_MAP[m[1]]||'',{property:m[1]});
    const dataRx=/\.dataset\.(busy|loading)\s*=\s*/g;
    while((m=dataRx.exec(source)))push(rows,file,source,m.index,'dataset',m[1],DATASET_STATE_MAP[m[1]]||'',{dataset:m[1]});
    const classRx=/classList\.(?:toggle|add|remove)\(\s*['"](selected|active|hidden)['"]/g;
    while((m=classRx.exec(source)))push(rows,file,source,m.index,'class',m[1],CLASS_STATE_MAP[m[1]]||'',{className:m[1],legacy:m[1]==='active'});
    const keyRx=/(?:event|e|ev|evt)\.key\s*={2,3}\s*['"]([^'"]+)['"]|['"](Escape|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Enter|Tab|Home|End)['"]/g;
    while((m=keyRx.exec(source))){const key=m[1]||m[2];if(KEYBOARD_TOKENS.includes(key))keyboard.push(Object.freeze({file:rel(file),line:lineAt(source,m.index),key}));}
  }
  // Once a native presentation migrates to Unit Templates, accepted explicit
  // accessibility semantics can be supplied by the Unit rather than repeated in
  // plugin source. Keep the census effective (source + inherited Unit contract)
  // so migration evidence does not falsely report a dropped role/ARIA owner.
  for(const unit of unitUsage){const inherited=UNIT_A11Y_INHERITANCE[unit];for(const value of inherited.roles||[])if(!roles.some(row=>row.name==='role'&&row.value===value))roles.push(Object.freeze({file:`unit:${unit}`,line:0,name:'role',value,kind:'unit-inherited'}));for(const name of inherited.aria||[])if(!a11y.some(row=>row.name===name))a11y.push(Object.freeze({file:`unit:${unit}`,line:0,name,kind:'unit-inherited'}));}
  const counts={states:rows.length,roles:roles.length,a11y:a11y.length,keyboard:keyboard.length,unmapped:rows.filter(row=>!row.state).length};
  return Object.freeze({states:Object.freeze(rows),roles:Object.freeze(roles),a11y:Object.freeze(a11y),keyboard:Object.freeze(keyboard),counts:Object.freeze(counts)});
}
function scanAll(){const out={};for(const ent of fs.readdirSync(PLUGINS,{withFileTypes:true}).filter(e=>e.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name)))out[ent.name]=scanPlugin(ent.name);return Object.freeze(out);}
module.exports=Object.freeze({STATE_ATTR_MAP,PROPERTY_STATE_MAP,DATASET_STATE_MAP,CLASS_STATE_MAP,KEYBOARD_TOKENS,UNIT_A11Y_INHERITANCE,scanPlugin,scanAll});
if(require.main===module)process.stdout.write(JSON.stringify({plugins:scanAll()},null,2)+'\n');
