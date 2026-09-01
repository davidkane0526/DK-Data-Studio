const fs=require('fs');
const path=require('path');
const {readCoreCss}=require('./css-source');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const html=fs.readFileSync(path.join(root,'src','index.html'),'utf8');
const pluginHtml=fs.readFileSync(path.join(root,'src','plugin-window','index.html'),'utf8');
const css=readCoreCss(root,['presentation','theme']);
const chartRuntime=fs.readFileSync(path.join(root,'src','core','scientific','chart-runtime.js'),'utf8');
const materialCss=fs.readFileSync(path.join(root,'src','styles','theme','material-renderer.css'),'utf8');
const componentCss=fs.readFileSync(path.join(root,'src','styles','theme','component-appearance.css'),'utf8');
const scientificStructure=fs.readFileSync(path.join(root,'src','styles','structure','sdk-semantic-surfaces.css'),'utf8');


assert(html.includes('core.css')&&html.includes('class="dkds-modern-ui"'),'main window must opt into the layered Core visual system');
assert(pluginHtml.includes('../core.css')&&pluginHtml.includes('dkds-modern-ui'),'plugin window must share the same layered Core visual system');
assert(!fs.existsSync(path.join(root,'src','ui-polish.css')),'superseded v3.61.23 polish layer must be removed, not stacked');
assert(!css.includes('.js-plotly-plot .plotly .modebar'),'modern CSS must never style Plotly generated modebar DOM');
assert(!/^\s*button\s*[,\{]/m.test(css),'modern CSS must not use a global button selector');
assert(!/^\s*(input|select|textarea)\s*[,\{]/m.test(css),'modern CSS must not use global form-control selectors');
assert(css.includes('body.dkds-modern-ui .plugin-manager-card'),'plugin manager must have an explicit scoped surface contract');
const resonanceManifest=JSON.parse(fs.readFileSync(path.join(root,'src','plugins','resonance-workbench','plugin.json'),'utf8'));
const dataCenterManifest=JSON.parse(fs.readFileSync(path.join(root,'src','plugins','data-center','plugin.json'),'utf8'));
const resonanceCss=fs.readFileSync(path.join(root,'src','plugins','resonance-workbench','plugin.css'),'utf8');
const dataCenterCss=fs.readFileSync(path.join(root,'src','plugins','data-center','plugin.css'),'utf8');
assert(!css.includes('#resonanceDedicatedPage')&&!css.includes('.data-center-body'),'Core modern CSS must not own domain-plugin selectors');
assert(Array.isArray(resonanceManifest.styles)&&resonanceManifest.styles.includes('plugin.css')&&resonanceCss.includes('#resonanceDedicatedPage'),'Resonance domain layout must be manifest-owned plugin CSS');
assert(Array.isArray(dataCenterManifest.styles)&&dataCenterManifest.styles.includes('plugin.css')&&dataCenterCss.includes('.data-center-body'),'Data Center domain layout must be manifest-owned plugin CSS');
assert(scientificStructure.includes('--dkds-scientific-nav-item-width:25px')&&scientificStructure.includes('--dkds-scientific-nav-item-height:24px')&&scientificStructure.includes('--dkds-header-action-height:var(--dkds-scientific-nav-item-height)'),'Core scientific navigation buttons must keep one slot-owned compact geometry contract');
assert(materialCss.includes('.dkds-scientific-nav-tools.dkds-material-role-floating')&&componentCss.includes('border-radius:var(--dkui-component-toolbar-action-radius,var(--ui-control-radius,8px))'),'Scientific navigation depth must be Material-owned while hit-region shape consumes Theme-resolved canonical ToolbarAction appearance');
assert(css.includes('@media (prefers-reduced-motion:reduce)'),'short motion must include a reduced-motion fallback');

assert(css.includes('.menu-anchor[data-menu-align="left"]>.command-menu{left:0;right:auto;min-width:190px'),'source-choice menus must use the generic left-aligned menu contract');
assert(!css.includes('.split-command-caret')&&!css.includes('.split-command-main'),'obsolete split-command caret geometry must stay removed');
assert(css.includes('--dkui-divider:rgba(166,181,202,.024)')&&css.includes('--dkui-control-border:rgba(166,181,202,.16)')&&css.includes('background:transparent;box-shadow:none')&&css.includes('--dkui-divider-hover'),'dark structural separators must use the semantic divider channel, remain invisible at idle, and stay distinct from control borders');
assert(chartRuntime.includes('PLOT_THEME_DARK')&&chartRuntime.includes("matchMedia?.('(prefers-color-scheme: dark)')"),'Chart Runtime must own light/dark scientific plot theming instead of CSS targeting Plotly internals');
console.log('v3.61.27 scoped modern UI and anti-overlay checks passed.');
