const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};

const chrome=read('src/styles/structure/desktop-chrome-geometry.css');
const semantic=read('src/styles/structure/sdk-semantic-surfaces.css');
const workbench=read('src/styles/structure/workbench-components.css');
const analysis=read('src/styles/structure/analysis-workbench.css');
const schema=read('src/styles/structure/schema-and-plugin-ui.css');
const superTop=read('src/styles/structure/super-top-contract.css');
const pluginWorkspace=read('src/styles/structure/plugin-workspace.css');
const validator=read('scripts/validate-styles.js');
const platform=read('src/styles/platform/touch.css');

assert(chrome.includes('height:var(--dkds-header-action-height,26px)')&&chrome.includes('min-height:var(--dkds-header-action-height,26px)'), 'Header actions must have one slot-driven hit-height owner.');
assert(!/\.dkds-panel-close-button\{[^}]*(?:^|;)\s*(?:height|min-height)\s*:/sm.test(chrome), 'Panel close subtype must not re-own hit height.');
assert(semantic.includes('--dkds-scientific-nav-item-height:28px')&&semantic.includes('--dkds-header-action-height:var(--dkds-scientific-nav-item-height)'), 'Scientific navigation must keep one shared header-action height slot.');
assert(platform.includes('html[data-dkds-host="desktop"] .dkds-scientific-nav-tools')&&platform.includes('--dkds-scientific-nav-item-height:'), 'Desktop host geometry must feed a compact host-specific value into the shared scientific height slot.');
assert(!/\.dkds-scientific-nav-tools\s+button\{[^}]*(?:height|min-height)\s*:/s.test(workbench), 'Workbench Components must not own a second scientific-nav hit box.');

assert(semantic.includes('--dkds-field-control-min-height')&&schema.includes('--dkds-schema-field-min-height')&&analysis.includes('--dkds-workbench-field-height'), 'Field density owners must expose bounded semantic slots.');
assert(schema.includes(':not(.dkds-field-control):not(.dkds-analysis-workbench *):not(.schema-param-field *)'), 'Generic field baseline must exclude specialized semantic owners.');
assert(analysis.includes(':not(.dkds-field-control):not(.schema-param-field *)'), 'Analysis generic field owner must exclude Core/schema fields.');

for(const mode of ['is-floating','is-docked','is-sticky'])assert(superTop.includes(`.dkds-portable-view.${mode}{`), `Portable ${mode} must have a canonical placement owner.`);
assert(superTop.includes('position:var(--dkds-portable-floating-position,fixed)')&&superTop.includes('overflow:var(--dkds-portable-docked-overflow,hidden)'), 'Portable placement final properties must consume --dkds-portable-* slots.');
assert(!/\.dkds-analysis-workbench \.dkds-portable-view\.is-floating\{[^}]*(?:^|;)\s*(?:position|max-width|max-height|overflow|z-index)\s*:/sm.test(analysis), 'Analysis floating context must be slot-only.');
assert(!/\.dkds-plugin-workspace \.dkds-portable-view\.is-floating\{[^}]*(?:^|;)\s*z-index\s*:/sm.test(workbench), 'PluginWorkspace floating context must be slot-only.');
assert(pluginWorkspace.includes('--dkds-portable-docked-min-height:180px')&&workbench.includes('--dkds-portable-docked-min-height:0px'), 'Dock/collapsed contexts must feed PortableView slots.');
assert(validator.includes('R7R extends property ownership')&&validator.includes('portablePlacementGeometry'), 'Style validator must reject extended property-owner regressions.');

console.log('v3.67.15 R7R extended property ownership regression passed.');
