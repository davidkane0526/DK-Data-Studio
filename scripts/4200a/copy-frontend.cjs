'use strict';
/* Explicit dependency allowlist for dedicated Windows/Android FS-Pro preview shells.
 * Do not package DKDS plugins, analysis projects or legacy DKTS UI.
 */
const fs=require('node:fs'),path=require('node:path');
const UI_FILES=Object.freeze([
 'src/4200a-fspro',
 'src/core.css',
 'src/styles',
 'sdk/theme-contract.js',
 'src/core/ui/frame-scheduler.js',
 'src/core/ui/dom-mutation-hub.js',
 'src/core/contracts/style-ownership-semantics.js',
 'src/core/theme/style-ownership-gate-runtime.js',
 'src/core/theme/semantic-registry.js',
 'src/core/ui/component-runtime.js',
 'src/core/theme/runtime.js',
 'src/core/theme/component-appearance.js',
 'src/core/scientific/plot-presentation-runtime.js',
 'src/core/scientific/display-runtime.js',
 'src/core/scientific/heatmap-canvas-runtime.js',
 'src/core/scientific/heatmap-selection-overlay-runtime.js',
 'src/core/scientific/d3-chart-renderer.js',
 'src/core/scientific/chart-export-runtime.js',
 'src/core/scientific/chart-runtime.js',
 'src/core/scientific/plot-runtime.js',
 'node_modules/d3/dist/d3.min.js'
]);
function copyFrontend(root,dest){
 const written=[];
 for(const file of UI_FILES){
  const source=path.resolve(root,file),target=path.resolve(dest,file);
  if(!fs.existsSync(source))throw new Error('Missing allowlisted UI dependency: '+file);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.cpSync(source,target,{recursive:true});
  written.push(file);
 }
 return Object.freeze(written);
}
module.exports={UI_FILES,copyFrontend};
