'use strict';
const assert=require('assert');const fs=require('fs');const path=require('path');const {inspectCompositionCss}=require('../sdk/composition-contract');
const plot=fs.readFileSync('src/core/ui/modules/plot-view/chart.js','utf8');
assert(plot.includes("surface==='scientific-card'")||plot.includes("surface === 'scientific-card'"));
assert(plot.includes("dataset.dkdsScientificCard='true'"),'scientific-card must remain a semantic marker');
assert(plot.includes("className='analysis-chart-card dkds-surface'"),'new ScientificCard must render the accepted analysis-chart-card visual template');
assert(plot.includes("className='analysis-chart-title'"),'new ScientificCard header must render the accepted analysis-chart-title template');
assert(plot.includes("className='analysis-chart dkds-scientific-chart-host'"),'new ScientificCard body must reuse the accepted analysis-chart template');
for(const root of ['src/styles/structure','src/styles/presentation','src/styles/theme'])for(const file of fs.readdirSync(root)){if(!file.endsWith('.css'))continue;const text=fs.readFileSync(path.join(root,file),'utf8');assert(!/\.dkds-scientific-card\b/.test(text),`${root}/${file} must not introduce a new ScientificCard visual owner`);}
const audit=inspectCompositionCss('.dkds-scientific-card{border-radius:20px;background:red}',{path:'plugin.css'});assert(audit.issues.some(x=>x.code==='PLUGIN_OWNS_CANONICAL_SURFACE_PAINT'));
console.log('ScientificCard visual-template ownership PASS');
