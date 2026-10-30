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
assert.deepEqual(manifest.scripts,['measurement-model.js','unit-presentation.js','plugin.js']);
assert(read('scripts/generate-plugin-index.js').includes("path.join(dir, 'plugin.json')"));
const registered=new Map();
vm.runInNewContext(read('src/plugins/keithley-4200/unit-presentation.js'),{
  window:{DKDSPluginModules:{define:(owner,name,item)=>registered.set(name,item)}}
},{filename:'unit-presentation.js'});
const presentation=registered.get('unit-presentation');
assert(presentation&&typeof presentation.mount==='function');
const page={kind:'page-registration'};
const node=kind=>({kind,children:[],appendChild(item){this.children.push(item);},replaceChildren(){this.children=[];},dataset:{}});
let body=null,headerHost=null,composed=null;
const controls=new Map(),buttons=new Map();
const units={
  page:{create:(parent)=>{assert.equal(parent,page);body=node('page-body');return {element:body};}},
  pageHeader:{create:(parent)=>{headerHost=parent;assert.equal(parent,body,'page header must attach to page DOM, not page registration');return {element:node('header')};}},
  layout:{create:(parent)=>{assert(parent===null||parent?.kind,'layout parent must be an existing UI node or detached');return node('layout');}},
  workspace:{create:()=>({compose:spec=>{composed=spec;},dispose:()=>{}})},
  field:{create:(_parent,spec)=>{const control=node('control');control.value=String(spec.value??'');controls.set(spec.label,control);return {element:node('field'),control};}},
  action:{create:(_parent,spec)=>{const button=node('button');buttons.set(spec.id,button);return {button};}},
  note:{create:()=>({textContent:''})},
  panel:{create:()=>({body:node('panel-body')})},
  scientificPlot:{create:()=>({requestRender:()=>{},dispose:()=>{}})},
  table:{mount:()=>({setData:()=>{},dispose:()=>{}})}
};
const ctx={ui:{unitTemplates:units,dom:{create:kind=>node(kind)}}};
const ui=presentation.mount(ctx,page,{});
assert.equal(headerHost,body);
assert(composed?.primary?.mainNode?.kind==='layout');
assert.equal(ui.get('host'),'169.254.111.118');
assert.equal(ui.get('port'),'1225');
assert(buttons.has('connect')&&buttons.has('identify')&&buttons.has('disconnect'));
assert(buttons.has('simulate'));
assert(buttons.has('exportCsv')&&buttons.has('exportSvg'));
ui.renderData([],[]);
ui.renderStatus('已连接','KI4200A');
ui.dispose();
const plugin=read('src/plugins/keithley-4200/plugin.js');
assert(plugin.includes("ctx.ui.activities.add({id:'keithley-4200',label:'4200A'"),
  'Android analysis navigation must expose 4200A activity');
assert(plugin.includes("onActivate:()=>ctx.workspace.openPage('keithley4200Page')"),
  '4200A activity should open matching plugin page');
console.log('Keithley 4200A presenter mounts and exposes analysis activity PASS');
