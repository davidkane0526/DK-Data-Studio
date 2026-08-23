'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

const index=read('src/index.html');
const charts=read('src/core/chart-runtime.js');
const d3Renderer=read('src/core/d3-chart-renderer.js');
const dedicated=read('src/plugin-window/runtime.js');
const sdkTool=read('sdk/tools/dkds-plugin.js');
const pkg=json('package.json');

assert(index.includes('../node_modules/d3/dist/d3.min.js'),'Main renderer must load D3.');
assert(index.includes('core/d3-chart-renderer.js')&&index.indexOf('core/d3-chart-renderer.js')<index.indexOf('core/chart-runtime.js'),'D3 renderer must load before the renderer facade.');
assert(charts.includes("preferredRenderer:'d3'")&&charts.includes('singleBackend:true'),'Core chart facade must enforce D3 as the single backend.');
assert(!Object.keys(pkg.optionalDependencies||{}).some(key=>/plotly/i.test(key)),'Plotly must not survive as an optional dependency.');
assert(d3Renderer.includes("const VERSION='1.2.0'")&&d3Renderer.includes("new Set(['scatter','scattergl','heatmap'])"),'D3 adapter must own all first-party trace families.');
for(const token of ['layout?.shapes','layout?.annotations','yaxis2','dkds-d3-colorbar','hovertemplate','restyle','relayout','toImage'])assert(d3Renderer.includes(token),`D3 adapter parity contract missing ${token}`);
assert(dedicated.includes("requestedScientificRenderer=requestedIds.includes('scientific-renderer')")&&dedicated.includes("preferredRenderer:'d3',host:'dedicated-top'"),'Dedicated windows must resolve scientific-renderer directly to D3.');
assert(sdkTool.includes('Renderer vendors are Core implementation details'),'SDK validation must keep renderer vendors private Core details.');
for(const rel of ['src/core/chart-runtime.js','src/core/d3-chart-renderer.js','src/core/scientific-plot-runtime.js','src/core/ui-infrastructure.js','src/app.js','src/plugin-window/runtime.js']){
  const source=read(rel);assert(!source.includes('plotly_'),`${rel} must consume only renderer-neutral chart events.`);
}
for(const id of ['data-center','pulse-analysis','resonance-workbench','ter-analysis']){
  const manifest=json(`src/plugins/${id}/plugin.json`),deps=manifest.window?.dependencies||[];
  assert(deps.includes('scientific-renderer'),`${id} must declare scientific-renderer.`);
  assert(!deps.includes('plotly')&&!deps.includes('d3'),`${id} must not declare a renderer vendor.`);
  const folder=path.join(root,'src','plugins',id);
  for(const file of fs.readdirSync(folder).filter(name=>name.endsWith('.js'))){const source=fs.readFileSync(path.join(folder,file),'utf8');assert(!/\b(?:window\.)?Plotly\s*\./.test(source),`${id}/${file} bypasses the Core D3 facade.`);}
}
const vth=json('examples/transfer-vth-lab/plugin.json');
assert(vth.window?.dependencies?.includes('scientific-renderer')&&!vth.window?.dependencies?.includes('d3'),'Vth example must use the renderer-neutral dependency.');
console.log('v3.61.38 D3 scientific renderer cutover readiness PASS');
