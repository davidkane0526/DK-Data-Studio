'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const touch=read('src/styles/platform/touch.css');
const schema=read('src/styles/structure/schema-and-plugin-ui.css');
const dialogs=read('src/styles/presentation/dialogs.css');
assert(!touch.includes('.plugin-manager-stat{')&&!touch.includes('.plugin-manager-toolbar-card{'),'Plugin Manager desktop layout must not return to platform/touch.css.');
assert(touch.includes('.dkds-pointer-coarse .plugin-switch-track'),'Platform layer must retain only coarse-pointer Plugin Manager deltas.');
assert(schema.includes('Core Plugin Manager layout')&&schema.includes('.plugin-manager-stat{')&&schema.includes('.plugin-manager-toolbar-card{'),'Plugin Manager common layout must belong to the structure owner.');
assert(dialogs.includes('.command-menu>button:not(.primary):not(.strong):not(.danger-soft)'), 'Generic command-menu paint must not erase semantic primary/danger buttons.');

const split=read('src/core/ui/modules/layout/workspace.js');
for(const token of ['dkds-split-drag-active','notify:false','reason:\'split-end\''])assert(split.includes(token),`Split drag coalescing missing ${token}`);
const plotView=read('src/core/ui/modules/plot-view/chart.js');
const curve=read('src/core/ui/modules/scientific-curve/model.js');
const analysis=read('src/core/ui/modules/workbench/analysis.js');
const portable=read('src/core/ui/modules/layout/portable-view.js');
for(const [name,text] of [['PlotView',plotView],['ScientificCurve',curve],['AnalysisWorkbench',analysis],['PortableView',portable]])assert(text.includes('dkds-split-drag-active'),`${name} ResizeObserver must stay quiet during split drag.`);
assert(portable.includes('DKDSThemeMaterialRenderer?.assignSemanticRoles?.(this.wrapper)'),'Portable placement must resync material role after docking/floating class changes.');

const group=read('src/plugins/resonance-workbench/feature-group-runtime.js');
const groupCss=read('src/plugins/resonance-workbench/plugin.css');
assert(group.includes('Math.max(190,Math.min(265,Math.round(cardWidth*.50)))'),'Resonance group charts must use the compact height envelope.');
assert(groupCss.includes('minmax(190px,var(--reswin-group-height,205px))'),'Resonance group card default height must remain compact.');
assert(group.includes('focusPolicy:{inactiveOpacity:.28,pointInactiveOpacity:.34,pointSizeBoost:5,pointMinSize:12,activeLineWidth:2.8}'),'Resonance group plots must keep selection linkage explicit without erasing dark-mode context.');

const theme=read('src/core/theme/runtime.js');
const thinTheme=read('src/plugins/thin-glass-theme/plugin.js');
assert(!theme.includes("profiles.set('builtin.thin-glass'"),'Core Theme Runtime must not own the Thin Glass profile.');
for(const token of ["surfaceSidebar:","surfaceElevated:","controlBorder:","glassEdge:","text:'#172033'"])assert(thinTheme.includes(token),`Thin Glass Theme hierarchy contract missing ${token}`);
console.log('v3.61.108 visual/layout ownership regression passed.');
