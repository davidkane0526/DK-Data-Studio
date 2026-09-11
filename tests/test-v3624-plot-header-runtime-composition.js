'use strict';
const fs=require('fs');
const path=require('path');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const plotView=read('src/core/ui/modules/plot-view/chart.js');
const portable=read('src/core/ui/modules/layout/portable-view.js');
const resonance=read('src/plugins/resonance-workbench/feature-group-runtime.js');
const semanticCss=read('src/styles/structure/sdk-semantic-surfaces.css');
const plotCss=read('src/styles/structure/plugin-workspace.css');
const material=read('src/core/theme/material-renderer.js');
const semantic=read('src/core/theme/semantic-registry.js');

// Generic SurfaceHeader carries ordinary panel padding. PlotView is a more
// specialized 28 px chrome contract and must never compose that geometry.
assert(semanticCss.includes('.dkds-surface-header{')&&semanticCss.includes('padding:7px var(--dkds-visual-pad-x);'),'The generic SurfaceHeader padding is intentionally distinct from PlotView chrome.');
assert(plotCss.includes('.dkds-plot-view-head{')&&plotCss.includes('height:28px;')&&plotCss.includes('padding:0 8px;'),'PlotView must own its compact zero-vertical-padding geometry.');
assert(plotView.includes("this.header.classList.remove('dkds-surface-header')"),'PlotView must normalize pre-existing plugin headers away from generic SurfaceHeader geometry.');
assert(portable.includes("const specializedHeader=header.classList.contains('dkds-plot-view-head')||header.classList.contains('dkds-group-plot-head')")&&portable.includes("if(specializedHeader)header.classList.remove('dkds-surface-header')"),'PortableView must preserve specialized plot-header geometry instead of re-applying SurfaceHeader padding.');
assert(resonance.includes('reswin-group-head dkds-plot-view-head')&&!resonance.includes('reswin-group-head dkds-surface-header dkds-plot-view-head'),'Resonance must not pre-compose SurfaceHeader and PlotView header classes.');
assert(semantic.includes('.dkds-plot-view-head,.dkds-group-plot-head'),'Plot headers remain first-class Theme Material chrome through the canonical semantic registry without the generic SurfaceHeader class.');
assert(material.includes('Semantic.resolveMaterialRole(el)'),'Material Renderer must consume the semantic owner for plot-header chrome.');

console.log('v3.62.4 plot-header runtime composition PASS');
