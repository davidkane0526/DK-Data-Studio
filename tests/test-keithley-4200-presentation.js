#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const manifest=JSON.parse(read('src/plugins/keithley-4200/plugin.json'));
assert.equal(manifest.enabled,true);
assert.equal(manifest.id,'com.dkds.keithley-4200');
assert.deepEqual(manifest.scripts,['measurement-model.js','kxci-protocol.js','unit-presentation.js','plugin.js']);
assert.deepEqual(manifest.styles,['plugin.css']);
const registered=new Map();
vm.runInNewContext(read('src/plugins/keithley-4200/unit-presentation.js'),{
  window:{DKDSPluginModules:{define:(owner,name,item)=>registered.set(name,item)}}
},{filename:'unit-presentation.js'});
const presentation=registered.get('unit-presentation');
assert(presentation&&typeof presentation.mount==='function');
const node=kind=>({
  kind,children:[],dataset:{},classList:{add(){}},hidden:false,value:'',textContent:'',
  appendChild(item){this.children.push(item);},
  replaceChildren(){this.children=[];},
  addEventListener(name,fn){this['on'+name]=fn;},
  querySelector(){return null;}
});
const page={kind:'page-registration'};
let body=null,headerHost=null,composed=null;
const controls=new Map(),buttons=new Map();
const units={
  page:{create:(parent)=>{assert.equal(parent,page);body=node('page-body');return {element:body};}},
  pageHeader:{create:(parent)=>{headerHost=parent;assert.equal(parent,body);return {element:node('header')};}},
  layout:{create:(parent)=>{const n=node('layout');if(parent?.appendChild)parent.appendChild(n);return n;}},
  workspace:{create:()=>({compose:spec=>{composed=spec;},dispose:()=>{}})},
  header:{create:(parent)=>{const n=node('header');parent?.appendChild?.(n);return {element:n};}},
  field:{create:(parent,spec)=>{const element=node('field'),control=node('control');control.value=String(spec.value??'');element.appendChild(control);parent?.appendChild?.(element);controls.set(spec.label,control);return {element,control};}},
  action:{create:(parent,spec)=>{const button=node('button');button.textContent=spec.label;button.disabled=false;parent?.appendChild?.(button);buttons.set(spec.id,button);return {button};}},
  note:{create:(parent,spec)=>{const n=node('note');n.textContent=spec.text||'';parent?.appendChild?.(n);return n;}},
  panel:{create:(parent)=>{const element=node('panel');parent?.appendChild?.(element);return {element,body:element};}},
  scientificPlot:{create:()=>({requestRender:()=>{},dispose:()=>{}})},
  table:{mount:()=>({setData:()=>{},dispose:()=>{}})}
};
const ctx={ui:{unitTemplates:units,dom:{create:kind=>node(kind)}}};
const ui=presentation.mount(ctx,page,{desktopHost:true});
assert.equal(headerHost,body);
assert(composed?.primary?.mainNode?.kind==='layout');
assert.equal(ui.get('host'),'169.254.111.118');
assert.equal(ui.get('port'),'1225');
assert(composed?.primary?.mainNode?.children?.some(n=>n.kind==='layout'),'Instrument and test cards should share a responsive two-card layout.');
assert.equal(ui.get('expectedSerial'),'1498377');
assert(buttons.has('toggleConnection'));
assert(!buttons.has('connect')&&!buttons.has('identify')&&!buttons.has('disconnect'));
assert(!buttons.has('saveProfile')&&!buttons.has('loadProfile'));
assert(buttons.has('simulate')&&buttons.has('stop'));
assert(!buttons.has('preview'));
assert(!buttons.has('exportCsv')&&!buttons.has('exportJson')&&!buttons.has('exportSvg'));
ui.setConnectionState('connected','已连接','KI4200A · S/N 1498377');
assert.equal(buttons.get('toggleConnection').textContent,'断开');
ui.setConnectionState('idle','未连接','');
assert.equal(buttons.get('toggleConnection').textContent,'连接');
ui.renderData([],[]);
ui.dispose();
const plugin=read('src/plugins/keithley-4200/plugin.js');
assert(plugin.includes("ctx.ui.activities.add({id:'keithley-4200',label:'4200A'"));
assert(plugin.includes("onOpen:()=>{void safeConnection(connect)();}"),'Opening the page must auto-connect and identify.');
assert(plugin.includes("serialize:()=>({plan:form(planKeys)})"),'Only test plan settings may be persisted.');
assert(!plugin.includes('saveProfile')&&!plugin.includes('loadProfile')&&!plugin.includes('profiles='));
assert(!plugin.includes('connection:form(connectionKeys)'),'Connection parameters must never be written into project data.');
assert(plugin.includes("['auto']")&&plugin.includes('connectPending'),'Auto mode must enumerate routes once and deduplicate activation.');
console.log('Keithley 4200 compact card UI, one connection toggle and transient connection settings PASS');
