'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const Module=require('module');
process.env.NODE_PATH=[path.join(process.cwd(),'src/core'),process.env.NODE_PATH||''].filter(Boolean).join(path.delimiter);Module._initPaths();
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const hash=rel=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,rel))).digest('hex');
const spec=require('../src/core/ui/modules/composition/unit-template-spec');

{const parts=String(json('package.json').version||'0.0.0').split('.').map(Number);assert((parts[0]||0)>3||((parts[0]||0)===3&&((parts[1]||0)>71||((parts[1]||0)===71&&(parts[2]||0)>=50))),'v3.71.50 Panel containment contract must remain active on later patches.');}
assert.strictEqual(spec.UNIT_TEMPLATE_SPEC_VERSION,'2.5.38','Panel shell/body containment is a public Unit contract and must be versioned.');
assert(spec.UNIT_CONTRACTS.panel.extensionPoints.includes('sizing=content|fill'),'Panel contract must publish the generic sizing extension point.');
assert(spec.UNIT_CONTRACTS.panel.invariants.some(row=>row.includes('Material ownership on the shell')),'Panel contract must explicitly protect Material-shell/content-body ownership.');
assert(spec.UNIT_CONTRACTS.panel.invariants.some(row=>row.includes('continuous fill chain')),'Panel contract must guarantee sizing=fill shell/body height propagation.');

const structure=read('src/styles/structure/sdk-semantic-surfaces.css');
for(const token of [
  '[data-dkds-unit-template="panel-v2"]>[data-dkds-unit-panel-body="true"]',
  '[data-dkds-unit-template="panel-v2"][data-dkds-unit-panel-sizing="content"]',
  'flex:0 0 auto;',
  '[data-dkds-unit-template="panel-v2"][data-dkds-unit-panel-sizing="fill"]',
  'display:flex;',
  'flex-direction:column;',
  'flex:1 1 auto;'
])assert(structure.includes(token),`Core Panel sizing/containment structure missing: ${token}`);

class ClassList{constructor(){this.values=new Set();}add(...rows){for(const row of rows)for(const v of String(row||'').split(/\s+/).filter(Boolean))this.values.add(v);}remove(...rows){for(const row of rows)this.values.delete(row);}contains(v){return this.values.has(v);}}
class FakeElement{
  constructor(tag='div'){this.tagName=String(tag).toUpperCase();this.nodeType=1;this.dataset={};this.classList=new ClassList();this.children=[];this.parentNode=null;this.parentElement=null;this.className='';this.isConnected=false;}
  appendChild(node){if(node&&typeof node==='object'){node.parentNode=this;node.parentElement=this;}this.children.push(node);return node;}append(...rows){for(const row of rows)this.appendChild(row);}setAttribute(){}addEventListener(){}
}
const oldDocument=global.document,oldWindow=global.window,oldMaterial=global.DKDSMaterialSurface,oldStyleGate=global.DKDSStyleGate;
const fakeDocument={createElement:tag=>new FakeElement(tag),createTextNode:text=>({nodeType:3,textContent:String(text)}),querySelector:()=>null};
const styleGate={set(){},setToken(){},remove(){},snapshot(){return{};}};
global.document=fakeDocument;global.window={document:fakeDocument,DKDSStyleGate:styleGate,addEventListener(){},removeEventListener(){}};global.DKDSStyleGate=styleGate;
global.DKDSMaterialSurface={apply(){}};global.window.DKDSMaterialSurface=global.DKDSMaterialSurface;
try{
  delete require.cache[require.resolve('../src/core/ui/modules/composition/unit-template-foundation')];
  const {FoundationUnitRuntime}=require('../src/core/ui/modules/composition/unit-template-foundation');
  const runtime=new FoundationUnitRuntime({actions:{mount(){return null;}},track(){}}),host=new FakeElement();
  const content=runtime.createPanel(host,{variant:'plain',header:false,sizing:'content'});
  assert.notStrictEqual(content.body,content.element,'A content-sized headerless Panel must have a real body node.');
  assert.strictEqual(content.body.parentNode,content.element,'The dedicated body must be a direct child of the Material shell.');
  assert.strictEqual(content.body.dataset.dkdsUnitPanelBody,'true');
  assert.strictEqual(content.element.dataset.dkdsUnitPanelSizing,'content');
  const child=new FakeElement('div');content.body.appendChild(child);assert.strictEqual(child.parentNode,content.body,'Domain/layout children must live under the Panel body, not the Material shell.');
  const fill=runtime.createPanel(host,{variant:'plain',header:false,sizing:'fill'});assert.notStrictEqual(fill.body,fill.element);assert.strictEqual(fill.element.dataset.dkdsUnitPanelSizing,'fill');
  assert.throws(()=>runtime.createPanel(host,{variant:'plain',header:false,sizing:'plugin-private'}),/UNIT_PANEL_SIZING_FORBIDDEN/,'Plugins must not invent private Panel sizing modes.');
} finally {global.document=oldDocument;global.window=oldWindow;global.DKDSMaterialSurface=oldMaterial;global.DKDSStyleGate=oldStyleGate;}

for(const rel of ['src/plugins/pulse-sampler-tool/unit-presentation.js','examples/sdk151-unit-pulse-sampler-shadow/plugin.js']){
  const source=read(rel);
  for(const token of [
    "const wave=units.panel.create(main,{variant:'plain',header:false,sizing:'content'})",
    "units.layout.apply(wave.body,{variant:'identity'",
    "const analysis=units.panel.create(main,{variant:'plain',header:false,sizing:'content'})",
    "units.layout.apply(analysis.body,{variant:'identity'",
    "const analysisHeader=units.header.create(analysis.body",
    "const commandSurface=units.layout.create(analysis.body",
    "const resultHeader=units.header.create(analysis.body",
    "const resultGrid=units.layout.create(analysis.body"
  ])assert(source.includes(token),`${rel} must consume the public content-sized Panel body: ${token}`);
  for(const forbidden of [
    'units.layout.apply(analysis.element',
    'units.header.create(analysis.element',
    'units.layout.create(analysis.element',
    'units.layout.apply(wave.element',
    'units.header.create(wave.element',
    'units.layout.create(wave.element'
  ])assert(!source.includes(forbidden),`${rel} must not apply content geometry to the Material shell: ${forbidden}`);
}

const manifest=json('src/plugins/pulse-sampler-tool/plugin.json');
assert(Number(manifest.version.split('.').at(-1))>=27,'Pulse Sampler must retain the v1.9.27+ Panel containment baseline.');
assert.deepStrictEqual(manifest.styles,[],'Panel containment must remain Unit/Core-owned, not plugin CSS.');
const dts=read('sdk/plugin-api.d.ts');
assert(dts.includes("sizing?:'content'|'fill'"),'SDK types must expose generic Panel sizing.');
assert(dts.includes("readonly version:'2.5.38'"),'SDK types must expose the current Unit version.');
for(const [rel,expected] of Object.entries({
  'src/plugins/pulse-sampler-tool/live-domain.js':'a982b457b702b79d957f029cf2a403f9b180c5bd443f4172faf71f630f074d56',
  'src/plugins/pulse-sampler-tool/domain-adapter.js':'a7b7c038970dc10a3c530dd098167d03dc3796d1789792c7c1215bd4430e21ac',
  'src/plugins/pulse-sampler-tool/steady-state-task.js':'1132645c3509c04ec7ab11183cb6eebef9d5b678734a5b27700dcad27f5084d5'
}))assert.strictEqual(hash(rel),expected,`Panel-only repair changed protected Pulse owner: ${rel}`);

console.log('v3.71.50 Unit Panel shell/body containment PASS');
