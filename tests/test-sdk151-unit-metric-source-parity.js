'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const {BASE_METRICS,METRIC_PROVENANCE,UNIT_CATALOG}=require('../src/core/ui/modules/composition/unit-template-spec');

const read=file=>fs.readFileSync(file,'utf8').replace(/\s+/g,' ');
const has=(file,fragment,label)=>assert(read(file).includes(fragment.replace(/\s+/g,' ')),`${label}: accepted source fragment drifted in ${file}`);

assert.deepStrictEqual(Object.keys(METRIC_PROVENANCE).sort(),Object.keys(BASE_METRICS).sort(),'Every frozen metric group must name its accepted source provenance.');
for(const [group,row] of Object.entries(METRIC_PROVENANCE)){
  assert(row.files?.length,`${group}: provenance files missing`);
  assert(row.selectors?.length,`${group}: provenance selectors missing`);
  for(const file of row.files)assert(fs.existsSync(path.resolve(file)),`${group}: provenance source missing: ${file}`);
}
for(const [unit,row] of Object.entries(UNIT_CATALOG)){
  const refs=[...(row.metricsRef?[row.metricsRef]:[]),...(row.metricsRefs||[])];
  for(const ref of refs){assert(BASE_METRICS[ref],`${unit}: unknown metric group ${ref}`);assert(METRIC_PROVENANCE[ref],`${unit}: metric group ${ref} has no accepted-source provenance`);}
  if(row.kind!=='nonvisual')assert(refs.length||row.geometryContract,`${unit}: visual/composition Unit must declare metric refs or an explicit geometry contract`);
}

// Page/header geometry: ordinary page + dense SUPER host.
has('src/styles/structure/analysis-shell.css','.analysis-page-header{min-height:64px;padding:13px 20px;gap:20px;}','page header geometry');
has('src/styles/structure/analysis-shell.css','.analysis-page-header>.dkds-plugin-header-actions.dkds-action-group{--dkds-header-action-height:30px;flex-wrap:nowrap;gap:8px;}','page header action geometry');
has('src/styles/structure/plugin-workspace.css','.super-workspace-root-page>.analysis-page-header{min-height:42px;padding:6px 12px;gap:10px;}','SUPER page header geometry');
assert.deepStrictEqual({min:BASE_METRICS.pageHeader.pageMinHeightPx,pb:BASE_METRICS.pageHeader.pagePadBlockPx,pi:BASE_METRICS.pageHeader.pagePadInlinePx,gap:BASE_METRICS.pageHeader.pageGapPx,superMin:BASE_METRICS.pageHeader.superMinHeightPx}, {min:64,pb:13,pi:20,gap:20,superMin:42});

// Canonical header/action/field geometry.
has('src/styles/structure/sdk-semantic-surfaces.css','.dkds-surface-header{ box-sizing:border-box; min-width:0; display:flex; align-items:center; gap:var(--dkds-visual-gap); padding:7px var(--dkds-visual-pad-x); }','surface header');
has('src/styles/structure/metrics.css','--dkds-visual-gap:8px;','visual gap token');
has('src/styles/structure/metrics.css','--dkds-visual-pad-x:10px;','visual horizontal inset token');
has('src/styles/structure/super-top-contract.css','.dkds-action-button{min-width:30px;padding:0 10px;display:inline-flex;align-items:center;justify-content:center;gap:6px;white-space:nowrap;}','action geometry');
has('src/styles/structure/desktop-chrome-geometry.css','.dkds-portable-icon-action{ box-sizing:border-box;width:26px;min-width:26px;max-width:26px;','header icon geometry');
has('src/styles/structure/sdk-semantic-surfaces.css','.dkds-check{display:flex;align-items:center;gap:7px;font-size:var(--plugin-font-label,12px)}','check gap');

// Display-unit geometry.
has('src/styles/structure/sdk-semantic-surfaces.css','.dkds-note{box-sizing:border-box;padding:7px 9px;font-size:var(--plugin-font-meta,11px);line-height:1.5}','note geometry');
has('src/styles/presentation/shell.css','.dkds-note{border:0;border-radius:var(--dkds-visual-radius-sm);','note radius');
has('src/styles/structure/sdk-semantic-surfaces.css','.dkds-message{max-width:90%;padding:8px 10px;font-size:var(--plugin-font-body,12.5px);line-height:1.55;','message geometry');
has('src/styles/presentation/shell.css','.dkds-message{border:0;border-radius:11px;','message radius');
has('src/styles/structure/sdk-semantic-surfaces.css','.dkds-summary-row{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 12px;}','summary row geometry');
has('src/styles/structure/sdk-semantic-surfaces.css','.dkds-summary-strip{display:flex;align-items:center;gap:6px;min-width:0;overflow-x:auto;overflow-y:hidden;white-space:nowrap;margin:6px 0 10px;padding:1px 0;}','summary strip geometry');
has('src/styles/structure/analysis-shell.css','.empty-state{padding:18px;text-align:center;','empty state geometry');
has('src/styles/structure/sdk-semantic-surfaces.css','.dkds-metric{box-sizing:border-box;min-width:0;padding:8px 10px}','metric geometry');
has('src/styles/presentation/shell.css','.dkds-list-item{border-radius:var(--dkds-visual-radius-sm);','list item radius');

// Split, portable and popup geometry.
has('src/styles/structure/super-top-contract.css','.dkds-split-handle[data-axis="y"]{height:8px;cursor:row-resize;}','split horizontal hit region');
has('src/styles/structure/super-top-contract.css','.dkds-split-handle[data-axis="y"]::after{left:50%;top:3px;width:44px;height:2px;','split horizontal visual');
has('src/styles/structure/super-top-contract.css','--dkds-portable-header-height:32px;','portable header height');
has('src/styles/structure/super-top-contract.css','.dkds-portable-header{ --dkds-header-action-height:22px; height:var(--dkds-portable-header-height);','portable header actions');
has('src/styles/structure/sdk-semantic-surfaces.css','.dkds-fixed-popover-header{box-sizing:border-box;min-width:0;min-height:42px;padding:7px 8px 7px 11px;display:flex;align-items:center;justify-content:space-between;gap:8px}','popover header geometry');

// Dialog: all accepted regions are part of the Unit contract, not plugin-owned detail.
has('src/styles/structure/workbench-components.css','.dkds-dialog-overlay{position:fixed;inset:0;z-index:2650;display:grid;place-items:center;padding:22px;}','dialog overlay');
has('src/styles/structure/workbench-components.css','.dkds-dialog{width:min(540px,calc(100vw - 36px));max-height:min(720px,calc(100vh - 44px));','dialog viewport bounds');
has('src/styles/structure/workbench-components.css','.dkds-dialog-header{display:grid;grid-template-columns:34px minmax(0,1fr) 30px;align-items:start;gap:10px;padding:16px 17px 13px;}','dialog header');
has('src/styles/structure/workbench-components.css','.dkds-dialog-footer{--dkds-dialog-action-height:32px;--dkds-dialog-action-padding-block:6px;--dkds-dialog-action-padding-inline:13px;display:flex;justify-content:flex-end;align-items:center;gap:8px;padding:11px 16px;}','dialog footer');
assert.strictEqual(BASE_METRICS.dialog.fieldHeightPx,34);
assert.strictEqual(BASE_METRICS.dialog.metaRadiusPx,10);
assert.strictEqual(BASE_METRICS.dialog.detailsRadiusPx,9);


// Menu geometry is part of the Unit contract on desktop and Mobile.
has('src/styles/structure/workbench-components.css','.dkds-context-menu{position:fixed;z-index:3900;min-width:180px;max-width:min(320px,calc(100vw - 12px));padding:5px;display:grid;gap:2px;}','context menu geometry');
has('src/styles/structure/schema-and-plugin-ui.css','.command-menu{ position:absolute; max-width:min(360px,90vw); }','command menu bounds');
has('src/styles/platform/native-client-shell.css','html[data-dkds-host="mobile"].react-native-client .command-menu{position:fixed;z-index:2400;left:6px;right:6px;top:auto;bottom:6px;width:auto;max-height:72vh;overflow:auto;border-radius:16px;padding:8px}','mobile menu geometry');
assert.strictEqual(BASE_METRICS.menu.contextMinWidthPx,180);assert.strictEqual(BASE_METRICS.menu.mobileItemMinHeightPx,46);

// Status/statusbar geometry.
has('src/styles/structure/sdk-semantic-surfaces.css','.dkds-status{box-sizing:border-box;padding:7px 9px;font-size:var(--plugin-font-meta,11px);line-height:1.45}','status geometry');
has('src/styles/presentation/control-status.css','--dkds-statusbar-gap:8px;','statusbar gap');
has('src/styles/presentation/control-status.css','--dkds-status-item-height:18px;','status item height');

assert.deepStrictEqual(BASE_METRICS.splitHandle,{hitPx:8,lineLongPx:44,lineThicknessPx:2,lineInsetPx:3});
assert.deepStrictEqual({note:BASE_METRICS.note.radiusPx,message:BASE_METRICS.message.radiusPx,status:BASE_METRICS.status.radiusPx,empty:BASE_METRICS.emptyState.padPx}, {note:7,message:11,status:7,empty:18});
console.log(`SDK 1.51 Unit metric/source parity PASS (${Object.keys(BASE_METRICS).length} metric groups / ${Object.keys(UNIT_CATALOG).length} units)`);
