'use strict';
const assert=require('assert');
const fs=require('fs');
const read=file=>fs.readFileSync(file,'utf8');
const pkg=require('../package.json');
const dcManifest=require('../src/plugins/data-center/plugin.json');
const presentation=read('src/plugins/data-center/unit-presentation.js');
const unitSpec=read('src/core/ui/modules/composition/unit-template-spec.js');
const unitFoundation=read('src/core/ui/modules/composition/unit-template-foundation.js');
const plotView=read('src/core/ui/modules/plot-view/chart.js');
const feature=read('src/plugins/data-center/feature-runtime.js');
const mobile=read('src/plugins/data-center/mobile.css');
const atLeast=(actual,minimum)=>{const a=String(actual).split('.').map(Number),b=String(minimum).split('.').map(Number);for(let i=0;i<3;i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false;}return true;};
assert(atLeast(pkg.version,'3.71.30'),'v3.71.30+ source required.');
assert(atLeast(dcManifest.version,'1.15.25'),'Data Center 1.15.25+ required.');

// Formula refs are interactive behavior on a valid public Chip variant. 3.71.29
// used the nonexistent "interactive" visual variant, which throws while
// renderAllUi() is still inside renderFormula(), preventing chart controls and
// chart rendering from running at all.
assert(unitSpec.includes("variants:['quiet','selected','danger','info']"),'Public Chip variants must remain explicit.');
assert(!presentation.includes("variant:'interactive',className:'dc-ref-chip'"),'Formula refs must never request the nonexistent interactive Chip variant.');
assert(presentation.includes("variant:'quiet',className:'dc-ref-chip',text:key,interactive:true"),'Formula refs must use a valid quiet Chip plus independent interactive semantics.');
assert(feature.includes("function renderAllUi(){renderArtifacts();renderPreview();renderFormula();refreshProviderSelect();renderSteps();renderSavedRecipes();renderProvenance();renderChartControls();scheduleChartPreview('auto')"),'Regression chain must remain guarded: formula rendering precedes chart control/render scheduling.');

// A Plot Unit header must expose the canonical title class so PlotView adopts
// the existing title instead of inserting a second copy.
assert(presentation.includes("kind:'plot',variant:'plot',className:'dc-tool-title',titleTag:'strong',titleWrapperClassName:'dkds-surface-heading',title:'通用图形预览'"),'Chart header must use the canonical Plot Unit title contract.');
assert(!/chartHeader=units\.header\.create\([^\n]*titleClassName:false/.test(presentation),'Chart header must not suppress the canonical PlotView title class.');
assert(unitFoundation.includes("kind==='plot'?'dkds-plot-view-title':'dkds-surface-title'"),'Plot Unit headers must publish dkds-plot-view-title.');
assert(plotView.includes("this.header.querySelector('.dkds-plot-view-title')")&&plotView.includes("wrap.className='dkds-plot-view-title'"),'PlotView duplicate-title fallback must remain detectable by the canonical title class.');

// The rail is authored detached. Unit identity hosts preserve the accepted
// plugin detail geometry instead of measuring zero-width detached nodes and
// installing a competing responsive grid owner.
assert(presentation.includes("variant:'identity',className:'dc-filter-row'"),'Desktop artifact filters must use the accepted-detail identity host.');
assert(!/className:'dc-filter-row'[^\n]*(?:geometry|responsiveGeometry)/.test(presentation),'Detached artifact filters must not carry a second Unit grid/breakpoint owner.');
assert(mobile.includes('@container data-center-artifacts-mobile (max-width:339px)')&&mobile.includes('.dc-filter-row{grid-template-columns:minmax(0,1fr)}'),'Mobile must retain the mounted-container one-column fallback.');

// The chart still belongs to the authored Data Center main grid, is visible on
// first open, and keeps its full PRIME placement contract.
assert(presentation.includes("id:'chart-preview',label:'图形预览'")&&presentation.includes("inlineHost:main,autoOpen:true")&&presentation.includes("defaultPlacement:'inline',placements:['inline','right','bottom','float','global']"),'Chart PRIME must remain open inline with dock/float/global placement support.');

console.log('v3.71.30 Data Center real-host parity closure PASS');
