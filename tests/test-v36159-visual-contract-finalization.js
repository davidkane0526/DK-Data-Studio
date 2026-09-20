const fs=require('fs');
const path=require('path');
const {readCoreCss}=require('./css-source');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};

const pkg=JSON.parse(read('package.json'));


const coreCss=readCoreCss(root);
const modernCss=readCoreCss(root);
const kernel=read('src/generated/runtime/plugin-kernel.js');

for(const cls of [
  '.dkds-surface{','.dkds-surface-muted{','.dkds-surface-header{','.dkds-toolbar,',
  '.dkds-field{','.dkds-field-control{','.dkds-chip{','.dkds-list-item{','.dkds-metric{',
  '.dkds-table-wrap{','.dkds-dialog-shell{','.dkds-icon-button{','.dkds-status{',
  '.dkds-message{','.dkds-floating-surface{','.dkds-series-swatch-line{'
]) assert(coreCss.includes(cls),`Core semantic visual primitive missing: ${cls}`);
assert(kernel.includes('semanticVisualPrimitives:true')&&kernel.includes('themePluginReady:true'),'Plugin Kernel must advertise finalized semantic visual primitives/theme readiness.');
assert(kernel.includes("surface:'dkds-surface'")&&kernel.includes("dialog:'dkds-dialog-shell'")&&kernel.includes("table:'dkds-table'"),'Plugin Kernel designSystem.classes must expose Core visual roles.');

for(const css of [coreCss,modernCss]){
  assert(!css.includes('.dkds-analysis-workbench:not(:has(.resonance-parity-root))'),'Resonance must not opt out of the shared AnalysisWorkbench visual contract.');
  assert(!css.includes('body.plugin-window-host:not([data-plugin-id="builtin.resonance-workbench"])'),'Dedicated resonance windows must not opt out of shared host styling.');
}

const pluginIdentity=/(?:\.pulse-|\.pulse-analysis\b|\.dc-|\.data-center-body\b|\.ter-|\.ter-analysis\b|#terMaxPage\b|\.respar-|\.reswin-|\.resonance-|#resonanceDedicatedPage\b|\.dksvc-|\.dksmb-|\.dkai-|\.dkds-vth-|\.transfer-vth-lab-page\b)/;
const visualProp=/^(?:background(?:-[\w-]+)?|color|border(?:-[\w-]+)?|border-radius|box-shadow|text-shadow|font(?:-[\w-]+)?|font|outline(?:-[\w-]+)?|filter|fill|stroke|accent-color)$/i;
const controlSizeProp=/^(?:height|min-height|max-height|padding(?:-[\w-]+)?|line-height)$/i;

function scanCss(css,label,{identityOnly=false}={}){
  const failures=[];
  const ruleRe=/([^{}]+)\{([^{}]*)\}/g;
  let m;
  while((m=ruleRe.exec(css))){
    const selector=m[1].trim();
    if(selector.startsWith('@'))continue;
    if(identityOnly&&!pluginIdentity.test(selector))continue;
    const isControl=/(?:^|[\s>+~,])(button|input|select|textarea)(?=[.#:\[\s>+~,]|$)/i.test(selector);
    for(const raw of m[2].split(';')){
      const idx=raw.indexOf(':'); if(idx<0)continue;
      const prop=raw.slice(0,idx).trim(); if(!prop)continue;
      if(visualProp.test(prop)||(isControl&&controlSizeProp.test(prop)))failures.push(`${selector} -> ${prop}`);
    }
  }
  assert(!failures.length,`${label} still owns plugin visual chrome:\n${failures.slice(0,18).join('\n')}`);
}

scanCss(coreCss,'Core authored CSS',{identityOnly:true});
scanCss(modernCss,'Core authored CSS mirror',{identityOnly:true});
const pluginCssFiles=[];
(function walkPluginCss(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,ent.name);if(ent.isDirectory())walkPluginCss(p);else if(/\.css$/i.test(ent.name))pluginCssFiles.push(p);}})(path.join(root,'src','plugins'));
for(const file of pluginCssFiles)scanCss(fs.readFileSync(file,'utf8'),path.relative(root,file));
scanCss(read('examples/transfer-vth-lab/plugin.css'),'examples/transfer-vth-lab/plugin.css');

for(const [pluginDir,jsFile] of [
  ['connectivity-center','plugin.js'],
  ['data-center','feature-runtime.js'],
  ['ter-analysis','feature-runtime.js'],
  ['resonance-workbench','view-components.js']
]){
  const manifest=JSON.parse(read(`src/plugins/${pluginDir}/plugin.json`));
  const source=read(`src/plugins/${pluginDir}/${jsFile}`);
  if(pluginDir==='ter-analysis')assert(Array.isArray(manifest.styles)&&manifest.styles.length===1&&manifest.styles[0]==='plugin.css','TER source-parity production must retain exactly its accepted geometry-only stylesheet.');
  else assert(Array.isArray(manifest.styles)&&manifest.styles.length>0,`${pluginDir} static domain CSS must be manifest-owned.`);
  assert(!source.includes('ctx.ui.styles.add('),`${pluginDir} must not inject static CSS at runtime.`);
}

const pluginRoot=path.join(root,'src','plugins');
const offenders=[];
(function walk(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,ent.name);if(ent.isDirectory())walk(p);else if(/\.js$/i.test(ent.name)){const text=fs.readFileSync(p,'utf8');for(const legacy of ["gridcolor:'#edf0f5'","paper_bgcolor:'#fff'","plot_bgcolor:'#fff'","zerolinecolor:'#cbd5e1'"])if(text.includes(legacy))offenders.push(`${path.relative(root,p)}: ${legacy}`);}}})(pluginRoot);
assert(!offenders.length,`ScientificPlot presentation still contains legacy theme paint:\n${offenders.join('\n')}`);

const vth=read('src/plugins/transfer-vth-lab/plugin.js');
assert(!/style="[^"]+"/.test(vth),'Vth first-party workspace must not use static inline visual/layout styles.');
const vthExample=read('examples/transfer-vth-lab/plugin.js');
assert(!/style="[^"]+"/.test(vthExample),'Vth SDK example must not teach static inline visual/layout styles.');
for(const cls of ['dkds-surface','dkds-field','dkds-metric'])assert(vthExample.includes(cls),`Vth SDK example must consume Core semantic role ${cls}.`);

const resonanceMainPlot=read('src/plugins/resonance-workbench/feature-main-plot-runtime.js');
const resonanceInspector=read('src/plugins/resonance-workbench/feature-inspector-runtime.js');
assert(resonanceMainPlot.includes('dkds-series-swatch-line'),'Resonance legend swatches must use the Core data-swatch primitive through the main-plot runtime owner.');
assert(resonanceInspector.includes('dkds-choice-button'),'Resonance category choices must use the Core choice-button primitive through the Inspector runtime owner.');
assert(resonanceInspector.includes('dkds-series-swatch-pair'),'Resonance category swatches must use the Core pair-swatch primitive through the Inspector runtime owner.');
assert(!/\.category-pair-swatch i\{[^}]*?(?:border|box-shadow|background|color)\s*:/i.test(coreCss),'Legacy resonance category swatch chrome must not remain in Core CSS.');

for(const [file,required] of [
  ['src/plugins/pulse-analysis/unit-presentation.js',['dkds-surface','dkds-toolbar','dkds-table']],
  ['src/plugins/transfer-vth-lab/unit-presentation.js',['units.panel.create','units.field.create','units.metric.create']],
  ['src/plugins/connectivity-center/plugin.js',['dkds-dialog-shell','dkds-toolbar','dkds-message']],
]){
  const source=read(file);
  for(const cls of required)assert(source.includes(cls),`${file} must consume Core semantic role ${cls}.`);
}



const dataCenterUnits=read('src/plugins/data-center/unit-presentation.js');
const unitFoundation=read('src/core/ui/modules/composition/unit-template-foundation.js');
for(const token of ['units.panel.create','units.panel.detached','units.header.create','units.status.create','units.tabs.create','units.field.create'])assert(dataCenterUnits.includes(token),`Data Center Unit presentation must consume ${token}.`);
for(const token of ["plain:'dkds-surface'","panel:'dkds-surface-header'","control.className='dkds-field-control'"])assert(unitFoundation.includes(token),`Unit foundation must project Data Center semantic role ${token}.`);
assert(dataCenterUnits.includes('dkds-surface-heading'),'Data Center accepted heading wrapper must remain source-faithful while header paint comes from Unit Header.');

const resonanceUnits=read('src/plugins/resonance-workbench/unit-presentation.js');
for(const token of ['units.panel.create','units.header.create','units.floatingChrome.create','units.legend.create','dkds-toolbar','dkds-floating-surface'])assert(resonanceUnits.includes(token),`Resonance production Unit presentation must consume Core semantic visual owner ${token}.`);

const terUnits=read('src/plugins/ter-analysis/unit-presentation.js');
for(const token of ['ctx.ui.unitTemplates','units.panel.create','units.header.create','units.action.create','units.table.bind','units.plotGroup.create'])assert(terUnits.includes(token),`TER Unit production presentation must consume ${token}.`);
assert(!terUnits.includes('ctx.ui.styles.add(')&&!terUnits.includes('plugin.css'),'TER Unit production presentation must not recreate private visual ownership.');

console.log('v3.61.59 Visual Contract Finalization passed: first-party plugins keep domain layout only; Core owns visual chrome and scientific presentation.');
