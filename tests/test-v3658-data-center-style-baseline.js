'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

const pkg=json('package.json');
const shell=read('src/styles/presentation/shell.css');
const chrome=read('src/styles/theme/integrated-command-chrome.css');
const components=read('src/styles/theme/component-appearance.css');
const projectTabs=read('src/app/modules/project-tabs-history.js');
const workbench=read('src/core/ui/modules/workbench/analysis.js');
const plotView=read('src/core/ui/modules/plot-view/chart.js');
const parameterSchema=read('src/core/data/parameter-schema.js');
const selectPopup=read('src/core/ui/modules/controls/select-popup.js');
const menu=read('src/core/ui/modules/interaction/context-actions.js');
const semantic=read('src/core/theme/semantic-registry.js');
const semanticStructure=read('src/styles/structure/sdk-semantic-surfaces.css');
const schemaStructure=read('src/styles/structure/schema-and-plugin-ui.css');
const designSystem=read('src/core/plugins/kernel/modules/plugin-api.js');
const dcViews=read('src/plugins/data-center/shared-views.js');
const dcFeature=read('src/plugins/data-center/feature-runtime.js');
const dcMobilePresentation=read('src/plugins/data-center/mobile-presentation.js');
const dcCss=read('src/plugins/data-center/plugin.css');
const pulseFeature=read('src/plugins/pulse-analysis/feature-runtime.js');
const aurora=read('src/plugins/aurora-pop-theme/plugin.js');
const auroraManifest=JSON.parse(read('src/plugins/aurora-pop-theme/plugin.json'));

assert(Number(pkg.version.split('.')[0])>3||(Number(pkg.version.split('.')[0])===3&&Number(pkg.version.split('.')[1])>65)||(Number(pkg.version.split('.')[0])===3&&Number(pkg.version.split('.')[1])===65&&Number(pkg.version.split('.')[2])>=8),'v3.65.8 baseline gate requires 3.65.8+');

// Accepted global appearance stays on the v3.65.3 line.
assert(projectTabs.includes("project-tab${selected?' selected':''}")&&projectTabs.includes("aria-selected',selected?'true':'false'"),'Project tabs must use canonical selected-tab semantics rather than the historical active-state shortcut.');
assert(!/\.project-tab\.active\s*\{[^}]*?(?:background|color|border-color|box-shadow)/s.test(shell),'Project-tab active paint must not return to Shell; canonical Tab Component Appearance owns it.');
assert(workbench.includes("b.classList.toggle('active',row.mounted)"),'Analysis PRIME navigation must retain the accepted v3.65.3 visual state.');
assert(!plotView.includes('dkds-header-command-strip'),'Generic PlotView chrome must not inherit the rejected v3.65.6 command-strip experiment.');
assert(!chrome.includes('dkds-header-command-strip'),'Global integrated-command chrome must stay on the v3.65.3 geometry baseline.');
assert(components.includes('--dkui-component-tab-variant-active-indicator')&&components.includes('--dkui-component-toolbar-action-variant-active-surface'),'Core component paint must consume Theme-authored active/selected variants instead of reporting tokens that are not rendered.');
assert(auroraManifest.version==='2.3.2'&&aurora.includes("active:{surface:LIGHT_EMERALD.softSurface,text:LIGHT_EMERALD.text")&&aurora.includes("selected:{surface:'#6F50FF',text:'#FFFFFF'")&&aurora.includes("active:{surface:'#07515B',text:'#E7FEFF'"),'Aurora must keep the accepted bright mint/teal light active state, expressive solid violet selected state and high-contrast dark active state.');

// Generic Core fixes: no Data Center-only visual infrastructure.
assert(semanticStructure.includes('.dkds-surface-heading')&&semanticStructure.includes('.dkds-surface-actions')&&semanticStructure.includes('.dkds-surface-tabs'),'Core must own reusable surface-header composition geometry.');
assert(semantic.includes('.dkds-surface-actions>button'),'Surface-header actions must participate in the canonical toolbarAction identity resolver.');
assert(designSystem.includes("surfaceHeading:'dkds-surface-heading'")&&designSystem.includes("surfaceActions:'dkds-surface-actions'")&&designSystem.includes("surfaceTabs:'dkds-surface-tabs'"),'Core Design System must expose the shared surface-header composition classes.');
assert(parameterSchema.includes("field.presentation||field.ui||'popup'")&&!parameterSchema.includes('multiSelectPresentation'),'multiselect/columns must use the Core popup presentation by default rather than a Data Center opt-in.');
assert(parameterSchema.includes('dkds-multiselect-trigger')&&selectPopup.includes('aria-multiselectable')&&menu.includes('item.closeOnInvoke===false'),'Core must own the themed persistent multi-select popup end to end.');
assert(schemaStructure.includes('.dkds-multiselect-trigger'),'Core Structure must own multiselect trigger geometry.');

// Data Center consumes generic Core contracts; its stylesheet owns domain layout only.
assert(dcViews.includes('dkds-surface-actions')&&dcViews.includes('dkds-surface-heading')&&dcViews.includes('dkds-surface-tabs'),'Data Center headers must consume the generic Core surface-header composition.');
assert(!dcViews.includes('dkds-header-hit-action')&&!dcViews.includes('dkds-header-action-row'),'Data Center must not depend on a private header-action geometry layer.');
assert(dcViews.includes('data-dkds-tooltip="图形由可替换的 Chart Provider 提供；只有存在多个兼容 Provider 时才显示图形类型选择。"'),'Chart explanatory copy must remain in the Core tooltip contract.');
assert(dcViews.includes('id="dcChartProvider"')&&!dcViews.includes('id="dcRenderChart"'),'Chart Provider choice may exist, but redundant manual draw must stay removed.');
assert(dcFeature.includes('select.hidden=providers.length<=1'),'Provider selection must disappear when there is no real choice.');
assert(!dcFeature.includes('multiSelectPresentation'),'Data Center must not request a special ParameterSchema presentation.');
assert(dcFeature.includes("b.classList.toggle('selected',selected)")&&dcFeature.includes("aria-selected',selected?'true':'false'"),'Data Center internal modes must use standard tab selected semantics.');
assert(!/(^|\n)\.schema-parameter-panel\s*\{/.test(dcCss)&&!/(^|\n)\.schema-param-field\b/.test(dcCss),'Data Center must not duplicate Core ParameterSchema geometry.');
assert(!dcCss.includes('dkds-multiselect-trigger')&&!dcCss.includes('dc-header-action'),'Data Center must not privately style Core multiselect/header controls.');
assert(!dcCss.includes('--dc-artifact-width:336px')&&dcCss.includes('.dc-selection-tools{display:grid')&&!dcViews.includes('ctx.ui.workspaceSurface.create(')&&dcMobilePresentation.includes("id:'data-control'")&&dcMobilePresentation.includes("presentationRole:'data-control'"),'Data Center keeps domain filters; Desktop retains its accepted static composition while the Mobile platform presentation publishes the semantic data-control Surface.');

// Explicit user exception: filled page actions use the existing Core primary style (white label) without changing global geometry.
assert(dcFeature.includes("buttonClass:'primary'"),'Data Center page action must use the Core primary white-label style.');
assert(pulseFeature.includes("buttonClass:'primary'"),'Pulse Analysis page action must use the same Core primary white-label style.');

console.log('v3.65.8 v3.65.3 global visual baseline + generic Core Data Center contracts passed.');
