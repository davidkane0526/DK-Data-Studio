const assert=require('assert');
const fs=require('fs');
const path=require('path');
const {readCoreCss}=require('./css-source');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const {normalizePluginPackage}=require('../desktop/plugin-package');

assert.equal(json('package.json').version,'3.61.90','theme/lifecycle/tool contract release must be v3.61.27');

const ui=readCoreCss(root);
for(const token of ['--surface-primary:','--surface-secondary:','--surface-hover:','--border-subtle:','--text-primary:','--text-secondary:','--accent-primary:','--accent-contrast:','--app-bg:']){
  assert(ui.includes(token),`Core modern UI must publish semantic plugin token ${token}`);
}
assert(ui.includes('--panel:var(--surface-primary)')&&ui.includes('--bg:var(--app-bg)'),'Legacy plugin variables must bridge to the same Core theme token source.');
assert(ui.includes('.dkds-plugin-workspace')&&ui.includes('.analysis-page-header'),'Core must own PluginWorkspace and plugin-window chrome rather than leaving every plugin to restyle shared controls.');
assert(ui.includes('background:var(--surface-primary);\n  border-color:var(--border-subtle);\n  color:var(--text-primary);'),'Core-owned scientific/plugin panels must resolve their surfaces from semantic theme tokens.');
assert(!ui.includes('body.dkds-modern-ui #resonanceDedicatedPage .respar-left-panel,\nbody.dkds-modern-ui #resonanceDedicatedPage .respar-inspector-panel,\nbody.dkds-modern-ui #resonanceDedicatedPage .respar-floating-panel{\n  background:#fff'),'Modern UI must not force resonance/plugin panels back to a light-only surface.');

const resonance=read('src/plugins/resonance-workbench/view-components.js');
assert(resonance.includes('dkds-surface')&&resonance.includes('dkds-floating-surface'),'Resonance must consume Core semantic surfaces instead of painting runtime chrome.');
assert(!resonance.includes('background:rgba(255,255,255,.94)'),'Resonance floating tool chrome must not hard-code a light-only white overlay.');
const dataCenter=read('src/plugins/data-center/shared-views.js');
assert(dataCenter.includes('dkds-surface')&&dataCenter.includes('dkds-surface-header')&&dataCenter.includes('dkds-field-control'),'Data Center must consume Core surface/header/control roles.');
const ter=read('src/plugins/ter-analysis/shared-views.js');
assert(ter.includes('dkds-surface')&&ter.includes('dkds-toolbar'),'TER must consume Core semantic surfaces and toolbars.');
const vthCss=read('examples/transfer-vth-lab/plugin.css');
const vthExample=read('examples/transfer-vth-lab/plugin.js');
assert(vthExample.includes('dkds-surface')&&vthExample.includes('dkds-field')&&vthExample.includes('dkds-metric'),'First-party Tool/TOP examples must demonstrate Core semantic visual primitives.');
assert(!/(?:background|color|border|box-shadow|font(?:-size)?)\s*:/.test(vthCss),'Vth example CSS must contain domain layout only, not private application chrome.');

const pluginWindowStyle=read('src/plugin-window/style.css');
assert(pluginWindowStyle.includes('background:var(--surface-primary)')&&pluginWindowStyle.includes('color:var(--text-tertiary)'),'Dedicated plugin-window status chrome must inherit the shared theme contract.');

const main=read('desktop/main.js');
assert(main.includes("reuse !== false ? '__reusable__'"),'Reusable TOP/Tool renderers must be keyed by owner+activity, not duplicated per project tab.');
assert(main.includes('payload.prewarm === true && cachedBootstrap?.prewarm !== true')&&main.includes('prewarmSkipped:true'),'Prewarm must never downgrade a hydrated hidden reusable renderer back to an empty prewarm lifecycle.');
assert(main.includes("bootstrap.prewarm===true?'预热':(win.isVisible()?'已打开':'已隐藏')"),'Memory inspection must expose reusable plugin renderer lifecycle instead of presenting duplicate-looking anonymous rows.');

const pulseImport=json('src/plugins/pulse-import/plugin.json');
assert.equal(pulseImport.pluginType,'data','Pulse Text Import is intentionally a Data plugin and must not be relabeled as the user Tool plugin.');

const validTool={
  schema:1,
  manifest:{
    id:'com.example.tool-contract',name:'Tool Contract',version:'1.0.0',apiVersion:'1.15.0',pluginType:'tool',entry:'plugin.js',
    workspace:{role:'top',activity:'tool-contract',title:'Tool Contract'},
    window:{activity:'tool-contract',runtime:'runtime.js',scripts:['runtime.js'],reuse:true,prewarm:false,persistence:'project'}
  },
  files:{
    'plugin.js':"DKDSPlugins.define({id:'com.example.tool-contract',name:'Tool Contract',version:'1.0.0'},async()=>({}));",
    'runtime.js':'(() => {})();'
  }
};
const normalized=normalizePluginPackage(validTool);
assert.equal(normalized.manifest.pluginType,'tool','Explicit Tool plugin type must survive package normalization.');
assert.equal(normalized.manifest.workspace.role,'top','Tool workspace role must remain TOP.');
let rejected=false;
try{normalizePluginPackage({...validTool,manifest:{...validTool.manifest,workspace:{role:'top',activity:'other-tool'}}});}catch{rejected=true;}
assert(rejected,'Tool packages with a workspace/window activity mismatch must be rejected rather than silently classified/hosted incorrectly.');

const manager=read('src/core/plugins/manager-ui.js');
assert(manager.includes('state.typeFilter=type')&&manager.includes('window.DKDSPlugins?.activities?.refresh?.()'),'Installing a package must reveal its actual normalized type and rebuild the top Tool menu immediately.');

console.log('v3.61.27 shared plugin theme, reusable TOP lifecycle and Tool classification contracts passed.');
