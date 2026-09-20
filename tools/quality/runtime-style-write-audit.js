#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const ROOT=path.resolve(__dirname,'../..');
const SRC=path.join(ROOT,'src');
const GATE='src/core/theme/style-ownership-gate-runtime.js';

const PAINT_ATTR='(?:fill|fill-opacity|stroke|stroke-opacity|stroke-width|stroke-dasharray|stroke-linecap|stroke-linejoin|opacity|color|stop-color|flood-color|lighting-color)';
const PRESENTATION_ATTR='(?:display|visibility|pointer-events|cursor)';
function walk(dir,out=[]){if(!fs.existsSync(dir))return out;for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory()){if(entry.name==='generated')continue;walk(p,out);}else if(entry.isFile()&&/\.js$/.test(entry.name))out.push(p);}return out;}
const rel=file=>path.relative(ROOT,file).replace(/\\/g,'/');
const patterns=Object.freeze([
  {id:'style-property-assignment',re:/\.style\s*\.\s*[A-Za-z_$][\w$-]*\s*=(?!=)/g},
  {id:'style-index-assignment',re:/\.style\s*\[[^\]]+\]\s*=(?!=)/g},
  {id:'style-set-property',re:/\.style\s*\.\s*setProperty\s*\(/g},
  {id:'style-remove-property',re:/\.style\s*\.\s*removeProperty\s*\(/g},
  {id:'style-css-text',re:/\.style\s*\.\s*cssText\s*=(?!=)/g},
  {id:'style-attribute',re:/\.setAttribute\s*\(\s*['"]style['"]\s*,/g},
  {id:'style-object-assign',re:/Object\.assign\s*\(\s*[^,;]+\.style\s*,/g},
  // Literal style="..." in runtime markup bypasses the Gate before the node
  // is attached. data-*-style is deliberately excluded by the left boundary.
  {id:'inline-style-markup',re:/(?<![-\w])style\s*=\s*['"]/g},
  // D3 selection.style() writes Element.style. The only legal .style() calls
  // outside the Gate are Plugin API ctx.ui.dom.style()/dom.style() facades,
  // which themselves route through Component Runtime -> Style Gate.
  {id:'style-method-call',re:/\.style\s*\(/g,allow:(text,index)=>{const base=text.slice(Math.max(0,index-32),index);return /(?:ctx\.ui\.)?dom\s*$/.test(base);}},
  {id:'svg-paint-attribute',re:new RegExp(`\\.attr\\(\\s*['"]${PAINT_ATTR}['"]\\s*,`,'g')},
  {id:'svg-paint-set-attribute',re:new RegExp(`\\.setAttribute\\(\\s*['"]${PAINT_ATTR}['"]\\s*,`,'g')},
  {id:'svg-paint-markup',re:new RegExp(`<(?:svg|path|circle|rect|line|polyline|polygon|text|g)\\b[^>]*\\s${PAINT_ATTR}\\s*=`, 'gi')},
  {id:'svg-presentation-attribute',re:new RegExp(`\\.attr\\(\\s*['"]${PRESENTATION_ATTR}['"]\\s*,`,'g')},
  {id:'svg-presentation-set-attribute',re:new RegExp(`\\.setAttribute\\(\\s*['"]${PRESENTATION_ATTR}['"]\\s*,`,'g')},
  {id:'svg-presentation-markup',re:new RegExp(`<(?:svg|path|circle|rect|line|polyline|polygon|text|g)\\b[^>]*\\s${PRESENTATION_ATTR}\\s*=`, 'gi')}
]);
function lineOf(text,index){return text.slice(0,index).split('\n').length;}
const gateWrapperCallRe=/(?<![\w$.])([A-Za-z_$][\w$]*(?:Set|Remove|Token|Style|Property|Paint|Presentation))\s*\(\s*[^,\n]+\s*,\s*['"](?:--)?[A-Za-z][A-Za-z0-9-]*['"]/g;
const knownRuntimeGlobals=new Set(['getComputedStyle','defineProperty']);
function wrapperBound(text,name){
  const esc=String(name).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return new RegExp(`\\b(?:const|let|var)\\s+${esc}\\b`).test(text)
    ||new RegExp(`\\bfunction\\s+${esc}\\b`).test(text)
    ||new RegExp(`\\{[^}]*\\b${esc}\\b[^}]*\\}\\s*=\\s*require`).test(text);
}
function auditGateWrapperBindings(text=''){
  const calls=[],names=new Set(),violations=[];gateWrapperCallRe.lastIndex=0;let m;
  while((m=gateWrapperCallRe.exec(String(text)))){const name=m[1];if(knownRuntimeGlobals.has(name))continue;calls.push(Object.freeze({name,index:m.index}));names.add(name);if(!wrapperBound(String(text),name))violations.push(Object.freeze({name,index:m.index}));if(m.index===gateWrapperCallRe.lastIndex)gateWrapperCallRe.lastIndex++;}
  return Object.freeze({calls:Object.freeze(calls),names:Object.freeze([...names].sort()),violations:Object.freeze(violations)});
}

const SOURCE_IDENTITY_EXEMPT=new Set();
function findCallEnd(text,start){
  let depth=0,quote='',escaped=false,lineComment=false,blockComment=false;
  for(let i=start;i<text.length;i++){
    const ch=text[i],next=text[i+1]||'';
    if(lineComment){if(ch==='\n')lineComment=false;continue;}
    if(blockComment){if(ch==='*'&&next==='/'){blockComment=false;i++;}continue;}
    if(quote){if(escaped){escaped=false;continue;}if(ch==='\\'){escaped=true;continue;}if(ch===quote){quote='';continue;}if(quote==='`'&&ch==='$'&&next==='{'){/* keep template contents opaque */}continue;}
    if(ch==='/'&&next==='/'){lineComment=true;i++;continue;}
    if(ch==='/'&&next==='*'){blockComment=true;i++;continue;}
    if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue;}
    if(ch==='(')depth++;
    else if(ch===')'){depth--;if(depth===0)return i;}
  }
  return -1;
}
function auditGateSourceIdentity(text='',file='<memory>'){
  const source=String(text),calls=[],violations=[],re=/\bStyleGate\.(set|remove|setToken|setPaint|removePaint|setPresentation|removePresentation)\s*\(/g;let m;
  while((m=re.exec(source))){const open=source.indexOf('(',m.index),end=findCallEnd(source,open),snippet=end>=0?source.slice(m.index,end+1):source.slice(m.index,m.index+500),hasSource=/\bsource\s*:/.test(snippet),exempt=SOURCE_IDENTITY_EXEMPT.has(String(file));const row=Object.freeze({method:m[1],index:m.index,hasSource,exempt});calls.push(row);if(!hasSource&&!exempt)violations.push(Object.freeze({file,line:lineOf(source,m.index),kind:'style-gate-source-missing',snippet:source.slice(m.index,m.index+180).split('\n')[0]}));if(m.index===re.lastIndex)re.lastIndex++;}
  return Object.freeze({calls:Object.freeze(calls),violations:Object.freeze(violations),exempt:SOURCE_IDENTITY_EXEMPT.has(String(file))});
}

function auditText(text='',file='<memory>'){
  const source=String(text),violations=[];
  for(const pattern of patterns){pattern.re.lastIndex=0;let m;while((m=pattern.re.exec(source))){if(pattern.allow?.(source,m.index))continue;violations.push(Object.freeze({file,line:lineOf(source,m.index),kind:pattern.id,snippet:source.slice(m.index,m.index+140).split('\n')[0]}));if(m.index===pattern.re.lastIndex)pattern.re.lastIndex++;}}
  const wrapperAudit=auditGateWrapperBindings(source);for(const row of wrapperAudit.violations)violations.push(Object.freeze({file,line:lineOf(source,row.index),kind:'unbound-style-gate-wrapper',snippet:source.slice(row.index,row.index+140).split('\n')[0]}));
  const sourceAudit=auditGateSourceIdentity(source,file);violations.push(...sourceAudit.violations);
  return Object.freeze({violations:Object.freeze(violations),gateWrapperCalls:wrapperAudit.calls.length,gateWrapperNames:wrapperAudit.names,gateSourceCalls:sourceAudit.calls.length,gateSourceMissing:sourceAudit.violations.length,gateSourceExempt:sourceAudit.exempt?sourceAudit.calls.length:0});
}
function audit(){
  const violations=[];let files=0,gateWrapperCalls=0,gateSourceCalls=0,gateSourceMissing=0,gateSourceExempt=0;const gateWrapperNames=new Set();
  for(const file of walk(SRC)){
    const fileRel=rel(file);if(fileRel===GATE)continue;files++;
    const result=auditText(fs.readFileSync(file,'utf8'),fileRel);violations.push(...result.violations);gateWrapperCalls+=result.gateWrapperCalls;gateSourceCalls+=result.gateSourceCalls||0;gateSourceMissing+=result.gateSourceMissing||0;gateSourceExempt+=result.gateSourceExempt||0;for(const name of result.gateWrapperNames)gateWrapperNames.add(name);
  }
  return Object.freeze({version:'1.6.0',files,scope:'first-party-browser-src',gateWrapperCalls,gateWrapperNames:Object.freeze([...gateWrapperNames].sort()),gateSourceCalls,gateSourceMissing,gateSourceExempt,violations:Object.freeze(violations),ok:violations.length===0});
}
function format(report){return [`Runtime Style Write Gate: ${report.files} first-party browser JS files, ${report.violations.length} bypasses, ${report.gateWrapperNames?.length||0} bound style-wrapper names, ${report.gateSourceCalls||0} direct Gate calls, ${report.gateSourceMissing||0} missing source identities (${report.gateSourceExempt||0} source exemptions).`,...report.violations.slice(0,100).map(v=>`- ${v.file}:${v.line} ${v.kind} ${v.snippet}`)].join('\n');}
function validate(){const report=audit();if(!report.ok){const error=new Error(format(report));error.report=report;throw error;}return report;}
if(require.main===module){const report=audit();console.log(process.argv.includes('--json')?JSON.stringify(report,null,2):format(report));if(process.argv.includes('--strict')&&!report.ok)process.exit(1);}
module.exports=Object.freeze({audit,validate,format,auditText,auditGateWrapperBindings,auditGateSourceIdentity});
