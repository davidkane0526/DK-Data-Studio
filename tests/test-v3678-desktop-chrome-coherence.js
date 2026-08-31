'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

const pkg=json('package.json');
{const [major,minor,patch]=pkg.version.split('.').map(Number);assert(major>3||(major===3&&(minor>67||(minor===67&&patch>=8))),'Desktop chrome coherence requires v3.67.8+.');}

const status=read('src/plugins/status-monitor/plugin.js');
const portable=read('src/core/ui/modules/layout/portable-view.js');
const semanticCss=read('src/styles/structure/sdk-semantic-surfaces.css');
assert(status.includes("className:'dkds-theme-panel dkds-fixed-popover")&&status.includes("'data-dkds-portable-chrome':'false'")&&status.includes("'data-dkds-portable':'false'"),'Theme picker must declare fixed-popover/no-portable semantics.');
assert(portable.includes('[data-dkds-portable-chrome="false"],[data-dkds-portable="false"]'),'PortableView must honor the explicit no-portable chrome contract.');
assert(semanticCss.includes('[data-dkds-portable="false"] .dkds-portable-controls'),'fixed/non-portable popovers must never expose placement controls.');

const grid=read('src/styles/structure/plugin-workspace.css');
assert(grid.includes('"cleft clsplit cbsplit cbsplit cbsplit"')&&grid.includes('"cleft clsplit cbottom cbottom cbottom"'),'bottom scientific secondary surface must start after the persistent left data rail and extend through center/right.');

const integrated=read('src/styles/theme/integrated-command-chrome.css');
const desktopChrome=read('src/styles/structure/desktop-chrome-geometry.css');
const appearance=read('src/styles/theme/component-appearance.css');
assert(desktopChrome.includes('min-height:26px;height:26px;min-width:26px;padding:0 8px')&&appearance.includes('border-radius:var(--dkui-component-toolbar-action-radius,var(--ui-control-radius,8px))'),'header actions must use canonical Structure spacing plus Theme 3.10 resolved ToolbarAction radius.');
assert(appearance.includes('background:color-mix(in srgb,var(--dkui-danger) 8%,transparent)')&&appearance.includes('color:var(--dkui-danger)'),'all shared close buttons must use one restrained canonical close hover treatment.');
assert(!integrated.includes('border-radius:8px;padding-left:9px;padding-right:9px'),'Integrated command Theme CSS must not own generic header geometry.');

const resonance=read('src/plugins/resonance-workbench/view-components.js');
assert(portable.includes("closeButton.classList.add('dkds-panel-close-button'"),'Portable PRIME close actions must consume the shared close-button contract.');
assert(resonance.includes('closeSelector:\'[data-respar-close="inspect"]\'')&&resonance.includes('closeSelector:\'[data-respar-close="group"]\''),'Resonance inspector/group close controls must remain PortableView-owned actions.');

const index=read('src/index.html');
const connectivity=read('src/plugins/connectivity-center/plugin.js');
const themeSettings=read('src/core/theme/settings-ui.js');
for(const target of ['updatePanel','inspectorPanel','groupPanel','zoomPanel'])assert(index.includes(`class="panel-close dkds-panel-close-button" data-target="${target}"`),`Legacy shell panel ${target} must consume the shared close-button contract.`);
assert(connectivity.includes('id="dksmbClose" class="dksvc-close dkds-icon-button dkds-panel-close-button"')&&connectivity.includes('id="dkaiSettingsClose" class="dksvc-close dkds-icon-button dkds-panel-close-button"'),'Connectivity dialogs must consume the shared close-button contract.');
assert(themeSettings.includes('class="dkds-icon-button dkds-panel-close-button" data-close'),'Theme settings dialog must consume the shared close-button contract.');

const schema=read('src/styles/structure/schema-and-plugin-ui.css');
const workbench=read('src/styles/structure/workbench-components.css');
const superTop=read('src/styles/structure/super-top-contract.css');
assert(schema.includes('--dkds-shell-action-height:34px')&&schema.includes('--dkds-shell-group-height:38px'),'Desktop shell must define one canonical 34/38 action-to-visual-envelope rhythm.');
assert(workbench.includes('height:var(--dkds-shell-group-height,38px)'),'System command group must consume the canonical outer height.');
assert(superTop.includes('.global-commandbar .file-command-group{')&&superTop.includes('height:var(--dkds-shell-group-height,38px)'),'File command outline must consume the canonical outer height contract.');
assert(!superTop.includes('height:42px'),'the old 42 px file-only outline exception must not return.');

console.log('v3.67.8 desktop chrome coherence PASS: fixed theme popover, persistent-left workspace geometry, softened header chrome, unified close controls, and one shell vertical rhythm.');
