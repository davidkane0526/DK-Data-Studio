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
assert(status.includes("className:'dkds-theme-panel dkds-fixed-popover")&&status.includes("'data-dkds-portable-chrome':'false'"),'Theme picker must declare fixed-popover/no-portable-chrome semantics.');
assert(portable.includes("this.node?.dataset?.dkdsPortableChrome!=='false'"),'PortableView must honor the explicit no-chrome contract.');
assert(semanticCss.includes('.dkds-fixed-popover [data-dkds-portable-controls]'),'fixed popovers must never expose placement controls.');

const grid=read('src/styles/structure/plugin-workspace.css');
assert(grid.includes('"cbsplit cbsplit cbsplit cbsplit cbsplit"')&&grid.includes('"cbottom cbottom cbottom cbottom cbottom"'),'bottom scientific secondary surface must span the full canvas width below left/right rails.');

const integrated=read('src/styles/theme/integrated-command-chrome.css');
assert(integrated.includes('border-radius:6px;padding-left:7px;padding-right:7px'),'header action hover geometry must use rounded hit regions with real horizontal breathing room.');
assert(integrated.includes('background:color-mix(in srgb,var(--dkui-danger) 8%,transparent)')&&integrated.includes('color:var(--dkui-danger)'),'all shared close buttons must use one restrained close hover treatment.');

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
assert(schema.includes('--dkds-shell-action-height:34px')&&schema.includes('--dkds-shell-group-height:40px'),'Desktop shell must define one canonical action/group vertical rhythm.');
assert(workbench.includes('height:var(--dkds-shell-group-height,40px)'),'System command group must consume the canonical outer height.');
assert(superTop.includes('.global-commandbar .file-command-group{')&&superTop.includes('height:var(--dkds-shell-group-height,40px)'),'File command outline must consume the canonical outer height contract.');
assert(workbench.includes('height:var(--dkds-shell-group-height,40px)'),'System command outline must consume the same canonical outer height contract from its own structure owner.');
assert(!superTop.includes('height:42px'),'the old 42 px file-only outline exception must not return.');

console.log('v3.67.8 desktop chrome coherence PASS: fixed theme popover, full-width bottom group surface, rounded header hover, unified close controls, and one shell vertical rhythm.');
