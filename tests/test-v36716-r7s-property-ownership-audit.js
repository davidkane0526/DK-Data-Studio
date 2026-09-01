const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};

const schema=read('src/styles/structure/schema-and-plugin-ui.css');
const workbench=read('src/styles/structure/workbench-components.css');
const semantic=read('src/styles/structure/sdk-semantic-surfaces.css');
const superTop=read('src/styles/structure/super-top-contract.css');
const analysis=read('src/styles/structure/analysis-workbench.css');
const pluginWorkspace=read('src/styles/structure/plugin-workspace.css');
const validator=read('scripts/validate-styles.js');

// Specialized settings/dialog fields must not be touched by the generic field baseline.
assert(schema.includes(':not(.dkds-settings-field *):not(.dkds-dialog-field *)'), 'Generic field baseline must exclude Settings/Dialog semantic fields.');
assert(workbench.includes('--dkds-settings-field-height:32px')&&workbench.includes('--dkds-dialog-field-height:34px'), 'Settings/Dialog fields must publish dedicated density slots.');
assert(workbench.includes('height:var(--dkds-settings-field-height);min-height:var(--dkds-settings-field-height)'), 'Settings fields must consume their dedicated height slot.');

// Managed table density must change variables, not later cell padding declarations.
assert(workbench.includes('--dkds-table-cell-padding-block:6px')&&workbench.includes('--dkds-table-cell-padding-block:4px'), 'Managed table normal/compact density slots must exist.');
assert(workbench.includes('padding-block:var(--dkds-table-cell-padding-block)'), 'Managed table cells must have one final padding owner.');
assert(!/data-dkds-table-density="compact"[^{}]*\{[^}]*(?:^|;)\s*padding(?:-|\s*:)/sm.test(workbench), 'Compact table density must not directly rewrite cell padding.');

// Scientific legend density is inherited through bounded slots.
assert(workbench.includes('--dkds-legend-padding-block:3px')&&semantic.includes('--dkds-legend-padding-block:2px'), 'Scientific legend base/specialized density slots must exist.');
assert(semantic.includes('--dkds-legend-gap:1px'), 'Top/bottom scientific legends must feed the shared gap slot.');
assert(!/\.dkds-plot-legend\.dkds-scientific-auto-legend\{[^}]*\bpadding\s*:/s.test(semantic), 'Plot legend specialization must not directly re-own padding.');

// Collapsed PortableView state changes parent slots rather than child header geometry.
assert(superTop.includes('--dkds-portable-header-height:32px')&&superTop.includes('--dkds-portable-header-height:36px'), 'PortableView base/collapsed header-height slots must exist.');
assert(!/\.dkds-portable-view\.is-collapsed>\.dkds-portable-header[^{}]*\{[^}]*(?:height|min-height)\s*:/s.test(workbench), 'Collapsed PortableView context must not directly rewrite header height.');

// Splitter hit geometry is stable through hover/drag.
assert(analysis.includes('--dkds-analysis-resizer-track-size:7px')&&pluginWorkspace.includes('--dkds-canvas-resizer-hit-size:7px'), 'Analysis/PluginWorkspace splitter geometry slots must exist.');
assert(!/resizer:hover::before\{[^}]*(?:left|top|width|height)\s*:/s.test(analysis), 'Analysis splitter hover must not move or resize its seam.');
assert(!/resizer:is\(:hover,:focus-visible,\.is-dragging\)::before\{[^}]*(?:top|height|left|width)\s*:/s.test(workbench), 'Workbench splitter states must not move or shrink hit geometry.');

// Component Runtime paint stays in the Core renderers.
assert(validator.includes('R7S paint ownership')&&validator.includes("['component-appearance.css','material-renderer.css']"), 'Style validator must enforce Core component paint ownership.');
assert(validator.includes('Settings/Dialog field density belongs to workbench-components.css'), 'Style validator must reject specialized-field density re-ownership.');
assert(validator.includes('Density variants must set --dkds-table-* slots only'), 'Style validator must reject table density re-ownership.');
assert(validator.includes('Legend density must flow through --dkds-legend-* slots'), 'Style validator must reject legend density re-ownership.');
assert(validator.includes('Resize hit geometry must be state-invariant and slot-owned'), 'Style validator must reject state-dependent splitter geometry.');

console.log('v3.67.16 R7S property ownership audit regression passed.');
