'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const pkg=JSON.parse(read('package.json'));
const semantic=read('src/core/theme/semantic-registry.js');
const componentCss=read('src/styles/theme/component-appearance.css');
const aurora=read('src/plugins/aurora-pop-theme/plugin.js');
const dataCenter=read('src/plugins/data-center/shared-views.js');
const resonance=read('src/plugins/resonance-workbench/view-components.js');
const statusMonitor=read('src/plugins/status-monitor/plugin.js');
const devtools=read('src/core/plugins/devtools.js');
const projectTabs=read('src/app/modules/project-tabs-history.js');
const pluginManager=read('src/core/plugins/manager-ui.js');
const indexHtml=read('src/index.html');
const foundation=read('src/app/modules/foundation.js');
const connectivityCss=read('src/styles/presentation/connectivity.css');
const devCss=read('src/styles/presentation/plugin-devtools.css');
const visualGate=read('tools/quality/visual-invariants.js');

const tuple=v=>String(v).split('.').slice(0,3).map(Number);
const atLeast=(a,b)=>{for(let i=0;i<3;i++){if(a[i]!==b[i])return a[i]>b[i];}return true;};
assert(atLeast(tuple(pkg.version),[3,66,3]),'Component State Ownership Audit requires DK Data Studio 3.66.3+.');

// Aurora light mode deliberately uses filled semantic states with white labels.
// The green interaction axis is centralized in the Theme profile instead of
// repeating page/component-specific hex values.
for(const token of [
  "const LIGHT_EMERALD=Object.freeze({",
  "fill:'#08A77A'",
  "surfaceActive:LIGHT_EMERALD.fill,surfaceSelected:'#6F50FF'",
  "textActive:'#FFFFFF',textSelected:'#FFFFFF'",
  "primary:{surface:'#6F50FF',surfaceHover:'#5F3FF1',text:'#FFFFFF',textActive:'#FFFFFF'",
  "secondary:{surface:LIGHT_EMERALD.fill,surfaceHover:LIGHT_EMERALD.fillHover,text:'#FFFFFF',textActive:'#FFFFFF'",
  "selected:{surface:'#6F50FF',text:'#FFFFFF'",
  "active:{surface:LIGHT_EMERALD.fill,text:'#FFFFFF'"
])assert(aurora.includes(token),`Aurora light semantic state is missing ${token}`);

// The exact controls that previously diverged now enter the canonical semantic pipeline.
assert(dataCenter.includes('class="dc-tabs dkds-surface-tabs" role="tablist"')&&dataCenter.includes('data-dc-tab="formula" role="tab"'),'Data Center Formula/Workflow/Provenance controls must remain semantic Tabs.');
assert(resonance.includes('respar-scan-global dkds-mode-group')&&semantic.includes('.dkds-mode-group>button'),'Resonance scan-mode buttons must resolve as canonical toolbarAction components.');
assert(statusMonitor.includes('dkds-integrated-action-group dkds-material-role-control dkds-theme-mode-switch')&&semantic.includes('.dkds-integrated-action-group button'),'Theme light/dark segments must resolve as canonical toolbarAction components.');
assert(semantic.includes('[role="option"]')&&semantic.includes('.dkds-context-item')&&semantic.includes('.dkds-list-item'),'Selectable option/list/context rows must resolve through canonical MenuItem appearance.');
assert(semantic.includes(".secondary,[data-tone=\"secondary\"]"),'Conventional secondary actions must resolve to the canonical secondary variant.');
assert(indexHtml.includes('id="projectTabs" class="project-tabs" role="tablist"')&&projectTabs.includes("project-tab${selected?' selected':''}")&&projectTabs.includes("aria-selected',selected?'true':'false'"),'Project tabs must use selected/aria-selected Tab semantics rather than active-state baseline drift.');
assert(pluginManager.includes("tone:'success'")&&pluginManager.includes('data-status=\"${status.tone}\"'),'Plugin status badges must use canonical Chip status tones instead of private active/available/error paint.');
assert(indexHtml.includes('id="lanWebUrls" class="lan-web-urls" role="listbox"')&&foundation.includes('lan-web-url-chip dkds-list-item')&&foundation.includes("aria-selected',selected?'true':'false'"),'Selectable LAN address rows must use canonical List/MenuItem selection semantics.');
assert(!/\.lan-web-url-chip\.selected\s*\{[^}]*?(?:background|color|border-color|box-shadow)/s.test(connectivityCss),'LAN address selection must not repaint the canonical row surface in Presentation.');

// DevTools had one remaining private active-tab paint path; it now uses real Tab semantics.
assert(devtools.includes('<nav role="tablist"')&&devtools.includes('role="tab"')&&devtools.includes("btn.classList.toggle('selected',selected)")&&devtools.includes("btn.setAttribute('aria-selected'"),'Plugin DevTools navigation must use semantic Tab state.');
assert(!devCss.includes('nav button.active{'),'Plugin DevTools must not keep a private active-tab paint rule.');

// Location/context may compose material or geometry, but only Component Appearance may paint state.
assert(componentCss.includes('[data-dkds-component-identity="toolbarAction"]:is(.active,[aria-pressed="true"])'),'ToolbarAction active paint must stay canonical.');
assert(componentCss.includes('[data-dkds-component-identity="tab"]:is(.selected,[aria-selected="true"])'),'Tab selected paint must stay canonical.');
assert(visualGate.includes('repaints action state outside Component Appearance')&&visualGate.includes("src/styles/presentation")&&visualGate.includes("src/styles/theme")&&visualGate.includes('pluginRoot'),'Release gate must reject state-paint ownership regressions in Core and first-party plugin CSS.');

console.log('v3.66.3 Component State Ownership Audit PASS: Aurora state contrast and Core single-owner routing are enforced.');
