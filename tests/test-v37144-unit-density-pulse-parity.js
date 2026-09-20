'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const Module=require('module');
process.env.NODE_PATH=[path.join(process.cwd(),'src/core'),process.env.NODE_PATH||''].filter(Boolean).join(path.delimiter);Module._initPaths();
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const hash=rel=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,rel))).digest('hex');
const spec=require('../src/core/ui/modules/composition/unit-template-spec');
const {LAYOUT_RECIPES}=require('../src/core/ui/modules/composition/unit-template-layout-spec');

assert(Number(spec.UNIT_TEMPLATE_SPEC_VERSION.split('.').at(-1))>=21,'Unit Templates must retain the v2.5.23 minimum-width/alignment baseline or later.');
assert.strictEqual(Object.keys(spec.UNIT_CATALOG).length,41);
assert.strictEqual(Object.keys(spec.UNIT_RESPONSIVE_DENSITY_AUDIT).length,41,'Every Unit must be explicitly audited.');
assert.strictEqual(spec.UNIT_RESPONSIVE_DENSITY_PRINCIPLE.id,'compact-first-single-last-v1');
assert.strictEqual(spec.UNIT_RESPONSIVE_DENSITY_PRINCIPLE.unknownWidth,'preserve-base');
assert.strictEqual(spec.UNIT_RESPONSIVE_DENSITY_PRINCIPLE.maxColumnDropPerBreakpoint,2);
assert(spec.UNIT_RESPONSIVE_DENSITY_PRINCIPLE.pluginMayTune.includes('accepted breakpoint/geometry'));
assert(spec.UNIT_RESPONSIVE_DENSITY_PRINCIPLE.coreLocked.includes('minimum hit geometry'));

// High-risk responsive recipes must progressively reduce density instead of collapsing greedily.
assert.deepStrictEqual(LAYOUT_RECIPES['analysis-control-grid'].responsive,[
  {maxWidth:1120,gridTemplateColumns:'repeat(4,minmax(0,1fr))'},
  {maxWidth:840,gridTemplateColumns:'repeat(3,minmax(0,1fr))'},
  {maxWidth:620,gridTemplateColumns:'repeat(2,minmax(0,1fr))'}
]);
assert.deepStrictEqual(LAYOUT_RECIPES['action-grid-4'].responsive,[{maxWidth:280,gridTemplateColumns:'repeat(2,minmax(0,1fr))'}]);
assert.strictEqual(LAYOUT_RECIPES['form-grid-2'].gridTemplateColumns,'repeat(2,minmax(128px,1fr))');
assert.strictEqual(LAYOUT_RECIPES['connection-grid'].gridTemplateColumns,'repeat(6,minmax(80px,1fr))');
assert.deepStrictEqual(LAYOUT_RECIPES['connection-grid'].responsive.map(row=>[row.maxWidth,row.gridTemplateColumns]),[
  [620,'repeat(4,minmax(0,1fr))'],[460,'repeat(3,minmax(0,1fr))'],[310,'repeat(2,minmax(0,1fr))']
]);

// Execute the generic Layout Unit against unknown and measured widths.
class ClassList{constructor(){this.values=new Set();}add(...rows){for(const row of rows)for(const v of String(row||'').split(/\s+/).filter(Boolean))this.values.add(v);}remove(...rows){for(const row of rows)this.values.delete(row);}contains(v){return this.values.has(v);}}
class FakeElement{
  constructor(tag='div'){this.tagName=String(tag).toUpperCase();this.nodeType=1;this.dataset={};this.classList=new ClassList();this.children=[];this.parentNode=null;this.parentElement=null;this.clientWidth=0;this._style={};this.attributes={};this.listeners={};this.textContent='';this.id='';this.value='';}
  appendChild(node){if(node&&typeof node==='object'){node.parentNode=this;node.parentElement=this;}this.children.push(node);return node;}
  append(...rows){for(const row of rows)this.appendChild(row);}
  setAttribute(k,v){this.attributes[k]=String(v);if(k==='id')this.id=String(v);}getAttribute(k){return this.attributes[k];}
  addEventListener(k,fn){(this.listeners[k]||(this.listeners[k]=[])).push(fn);}
}
const oldDocument=global.document,oldWindow=global.window,oldResizeObserver=global.ResizeObserver,oldStyleGate=global.DKDSStyleGate;
const fakeDocument={createElement:tag=>new FakeElement(tag),createTextNode:text=>({nodeType:3,textContent:String(text),parentNode:null}),querySelector:()=>null,documentElement:{dataset:{},classList:new ClassList()}};
global.document=fakeDocument;global.window={document:fakeDocument,addEventListener(){},removeEventListener(){}};
const styleGate={set(node,property,value){node._style[property]=String(value);},setToken(node,property,value){node._style[property]=String(value);},remove(node,property){delete node._style[property];},snapshot(){return{};}};
global.DKDSStyleGate=styleGate;global.window.DKDSStyleGate=styleGate;
const observers=[];global.ResizeObserver=class{constructor(cb){this.cb=cb;observers.push(this);}observe(){}disconnect(){}};
try{
  delete require.cache[require.resolve('../src/core/ui/modules/composition/unit-template-layout')];
  delete require.cache[require.resolve('../src/core/ui/modules/composition/unit-template-foundation')];
  const {LayoutUnitRuntime}=require('../src/core/ui/modules/composition/unit-template-layout');
  const scope={track(){},actions:{mount(){return null;}}};
  const runtime=new LayoutUnitRuntime(scope),parent=new FakeElement('div');
  parent.clientWidth=0;
  const grid=runtime.createLayout(parent,{variant:'analysis-control-grid'});
  assert.strictEqual(grid._style['grid-template-columns'],LAYOUT_RECIPES['analysis-control-grid'].gridTemplateColumns,'Unknown width must preserve the compact base layout.');
  parent.clientWidth=1100;observers.at(-1).cb();assert.strictEqual(grid._style['grid-template-columns'],'repeat(4,minmax(0,1fr))');
  parent.clientWidth=800;observers.at(-1).cb();assert.strictEqual(grid._style['grid-template-columns'],'repeat(3,minmax(0,1fr))');
  parent.clientWidth=600;observers.at(-1).cb();assert.strictEqual(grid._style['grid-template-columns'],'repeat(2,minmax(0,1fr))');

  const {FoundationUnitRuntime}=require('../src/core/ui/modules/composition/unit-template-foundation');
  const foundation=new FoundationUnitRuntime(scope),host=new FakeElement('div');
  const header=foundation.createHeader(host,{kind:'panel',variant:'content',eyebrow:'PULSE DESIGNER',title:'Vd',titleEmphasis:'prominent',meta:'0 个已加入片段',metaPlacement:'title-inline',actions:false});
  assert(String(header.element.className).includes('dkds-content-header'));
  assert.strictEqual(header.eyebrow.textContent,'PULSE DESIGNER');
  assert.strictEqual(header.title.parentNode,header.titleRow);assert.strictEqual(header.meta.parentNode,header.titleRow,'Title-inline meta must share the title row.');
  const field=foundation.createField(host,{id:'pulse-v',label:'脉冲电压上限',unit:'V',kind:'input',value:'4'});
  assert(field.labelRow&&field.unit,'Canonical Field must own label/unit composition.');
  assert.strictEqual(field.unit.textContent,'V');assert.strictEqual(field.label.htmlFor,'pulse-v');
} finally {
  global.document=oldDocument;global.window=oldWindow;global.ResizeObserver=oldResizeObserver;global.DKDSStyleGate=oldStyleGate;
}

const pulse=read('src/plugins/pulse-sampler-tool/unit-presentation.js');
for(const token of [
  "variant:'content',eyebrow:'PULSE DESIGNER'",
  "metaPlacement:'title-inline'",
  "parameterField('voltageMax','脉冲电压上限','4',{unit:'V'",
  "parameterField('pulseTime','脉冲时间','0.05',{unit:'s'",
  "variant:'form-grid-2'",
  "responsiveTarget:responsiveTarget||host,responsiveGeometry:[{maxWidth:1120,geometry:{gridColumn:'1 / -1'}}]",
  "variant:'action-grid-4'",
  "variant:'segment-bar'",
  "sizing:'fill'",
  "stateVersion:'presentation-v3'",
  "variant:'content',eyebrow:'MERGED WAVEFORM'",
  "variant:'content',eyebrow:'SAMPLING'",
  "variant:'content',eyebrow:'RESULT'"
])assert(pulse.includes(token),`Pulse parity composition missing ${token}`);
assert.strictEqual((pulse.match(/variant:'control-card',header:false/g)||[]).length,0,'Pulse parity must not substitute the accepted toolbar/section surfaces with a generic analysis control-card.');
assert(pulse.includes("units.toolbar.create(designerTop,{variant:'ordinary'})"),'Segment bar must use the canonical ordinary Toolbar Unit.');
assert(pulse.includes("const commandSurface=units.layout.create(analysis.body,{variant:'identity'"),'Sampling command area must remain one geometry block inside the owning Sampling Panel.');
assert(!pulse.includes("const commandSurface=units.panel.create"),'Sampling command area must not create a second Material Panel/shadow inside the Sampling Panel.');
assert(!pulse.includes("variant:'control-label-row'"),'Pulse must use canonical Field label/unit composition rather than private label rows.');
assert(pulse.includes("dom.create('strong',{text:'已加入片段'}"),'Segment title must use the public ui.dom text option.');
assert(!pulse.includes("dom.create('strong',{textContent:"),'Ignored ui.dom textContent options are forbidden in Pulse Unit presentation.');

const manifest=JSON.parse(read('src/plugins/pulse-sampler-tool/plugin.json'));
assert(Number(manifest.version.split('.').at(-1))>=25,'Pulse must retain v1.9.25 local-containment/single-material baseline or later.');assert.deepStrictEqual(manifest.styles,[]);
assert(!fs.existsSync(path.join(root,'src/plugins/pulse-sampler-tool/plugin.css')));assert(!fs.existsSync(path.join(root,'src/plugins/pulse-sampler-tool/mobile.css')));
assert.strictEqual(hash('src/plugins/pulse-sampler-tool/live-domain.js'),'a982b457b702b79d957f029cf2a403f9b180c5bd443f4172faf71f630f074d56');
assert.strictEqual(hash('src/plugins/pulse-sampler-tool/domain-adapter.js'),'a7b7c038970dc10a3c530dd098167d03dc3796d1789792c7c1215bd4430e21ac');
assert.strictEqual(hash('src/plugins/pulse-sampler-tool/steady-state-task.js'),'1132645c3509c04ec7ab11183cb6eebef9d5b678734a5b27700dcad27f5084d5');

const terManifest=JSON.parse(read('src/plugins/ter-analysis/plugin.json'));assert(Number(terManifest.version.split('.').at(-1))>=2,'TER must retain v3.14.2 aligned Unit controls/cold-start baseline or later.');
const terUnit=read('src/plugins/ter-analysis/unit-presentation.js');assert(!terUnit.includes("dom.create('strong',{textContent:"),'TER Unit presentation must use the public ui.dom text option rather than an ignored textContent option.');

const dts=read('sdk/plugin-api.d.ts');
for(const token of ["'content'","metaPlacement?:'inline'|'title-inline'|'trailing'",'unit?:string','responsiveDensityPrinciple','responsiveDensityAudit',"readonly version:'2.5.38'"])assert(dts.includes(token),`SDK contract missing ${token}`);
const schemaCss=read('src/styles/structure/schema-and-plugin-ui.css');
assert(schemaCss.includes('grid-template-columns:repeat(2,minmax(128px,1fr))'),'Standard ParameterForm default must remain compact two-column.');
assert(schemaCss.includes('grid-template-columns:repeat(2,minmax(0,1fr))'),'Compact host buckets must preserve two columns instead of greedily stacking.');
assert(schemaCss.includes('@media(max-width:310px)'),'ParameterForm single-column fallback must be last-resort only.');
const structure=read('src/styles/structure/sdk-semantic-surfaces.css');
assert(structure.includes('.dkds-content-header'),'Content Header structure rule must exist.');
assert(/\.dkds-content-header\s*\{[\s\S]*?align-items:flex-start[\s\S]*?justify-content:space-between[\s\S]*?padding:0[\s\S]*?\}/.test(structure),'Content Header must keep start alignment, spaced actions and zero strip padding.');
assert(structure.includes('.dkds-field-label-row{display:flex;align-items:baseline;justify-content:space-between;gap:6px;min-width:0}'));
const portableCss=read('src/styles/structure/super-top-contract.css');
assert(portableCss.includes('[data-dkds-portable-sizing="fill"]'),'PRIME fill sizing must have a Core structure owner.');

console.log('v3.71.44 41-Unit density audit + Pulse parameter/main presentation parity PASS');
