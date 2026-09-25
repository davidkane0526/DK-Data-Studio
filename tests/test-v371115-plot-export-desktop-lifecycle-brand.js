'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const {traceCsv}=require('../src/core/ui/modules/plot-view/data-export');

assert.strictEqual(
  traceCsv([{name:'curve',x:[0,1,2,3],y:[10,null,30]}]),
  'series,x,y\ncurve,0,10\ncurve,2,30',
  'curve export must skip renderer gap sentinels and unmatched trailing x values without blank-looking rows'
);
assert.strictEqual(
  traceCsv([{name:'indexed',y:new Float64Array([1,2,3])}]),
  'series,x,y\nindexed,0,1\nindexed,1,2\nindexed,2,3',
  'typed-array/y-only traces must export with deterministic index x values'
);
assert.strictEqual(
  traceCsv([{name:'heat',x:[0,1],y:[5,6],z:[[1,null],[3,4]]}]),
  'series,x,y,z\nheat,0,5,1\nheat,0,6,3\nheat,1,6,4',
  'heatmap export must omit missing cells instead of emitting empty CSV fields'
);

const chart=read('src/core/ui/modules/plot-view/chart.js');
const chartRuntime=read('src/core/scientific/chart-runtime.js');
const chartExportRuntime=read('src/core/scientific/chart-export-runtime.js');
const mainIndex=read('src/index.html');
const pluginWindowRuntime=read('src/plugin-window/runtime.js');
const io=read('src/core/host/io-runtime.js');
assert(chart.includes("require('./data-export')"),'PlotView must use the shared data-export serializer.');
assert(chart.includes("window.DKDSCharts?.sourceData"),'PlotView must read logical Scientific Chart source data rather than renderer DOM state.');
assert(chart.includes("window.DKDSIO?.clipboard?.writeText")&&chart.includes("window.DKDSIO?.saveText"),'PlotView copy/export must route through shared Host I/O.');
assert(chartExportRuntime.includes('const snapshots=new WeakMap()')&&chartExportRuntime.includes('function sourceData(target)'),'Scientific Chart Export Runtime must own logical source snapshots.');
assert(chartRuntime.includes('ChartExport.adopt(el,rows)')&&chartRuntime.includes('const sourceData=target=>ChartExport.sourceData'),'Scientific Chart Runtime must delegate export snapshots instead of growing another owner.');
assert(chartRuntime.includes('window.DKDSCharts=Object.freeze')&&chartRuntime.includes('bind,toImage,saveImage,sourceData,themeLayout'),'The public Scientific Chart facade must retain sourceData/image export APIs.');
assert(mainIndex.indexOf('core/scientific/chart-export-runtime.js')<mainIndex.indexOf('core/scientific/chart-runtime.js'),'Main renderer must load Chart Export Runtime before Chart Runtime.');
assert(pluginWindowRuntime.includes("'chart-export-runtime':'../core/scientific/chart-export-runtime.js'")&&pluginWindowRuntime.indexOf("'chart-export-runtime'")<pluginWindowRuntime.indexOf("'chart-runtime'",pluginWindowRuntime.indexOf("for(const id of")),'Dedicated TOP must load the same shared Chart Export Runtime before Chart Runtime.');
assert(Buffer.byteLength(chartRuntime,'utf8')<48*1024,'Chart Runtime must stay below the repository 48 KiB module boundary.');
assert(io.includes("const nativeCopy=bridge()?.copyText"),'Host I/O clipboard must use the desktop/Android bridge before plain-web clipboard fallback.');

const main=read('desktop/main.js');
const auxiliary=read('desktop/main-modules/auxiliary-window-runtime.js');
assert(main.includes('process.title = APP_NAME'),'Desktop main process must publish the DK Data Studio process title.');
assert(main.includes("win.on('close',event=>")&&main.includes('event.preventDefault();')&&main.includes('queueMicrotask(()=>app.quit())'),'Primary-window close must transition into a real application quit.');
assert(main.includes('closeAuxiliaryWindowsForOwner(win.webContents.id)'),'Primary-window shutdown must retire all owned TOP windows.');
assert(main.includes('closeAllAuxiliaryWindows();'),'before-quit must enforce final auxiliary-window teardown.');
assert(auxiliary.includes('function closeAuxiliaryWindowsForOwner(ownerWebContentsId)')&&auxiliary.includes('function closeAllAuxiliaryWindows()'),'Auxiliary runtime must own generic owner/all-window teardown.');

const pkg=JSON.parse(read('package.json'));
assert.strictEqual(pkg.build.productName,'DK Data Studio');
assert.strictEqual(pkg.build.win.executableName,'DK Data Studio');
assert.strictEqual(pkg.build.win.icon,'assets/dkds-icon.ico');

const expo=JSON.parse(read('mobile/app.json')).expo;
assert.strictEqual(expo.name,'DK Data Studio');
assert.strictEqual(expo.icon,'./assets/icon.png');
assert.strictEqual(expo.android.adaptiveIcon.foregroundImage,'./assets/adaptive-icon.png');
assert.strictEqual(expo.android.adaptiveIcon.backgroundColor,'#F7FAFF');
const brand=read('scripts/generate-brand-assets.js');
assert(brand.includes('const canonicalIcon = encodePng(1024, renderIcon(1024))'),'all launcher/window PNGs must share one canonical renderer.');
assert(brand.includes("[path.join(root, 'assets', 'dkds-icon.png'), canonicalIcon]"));
assert(brand.includes("[path.join(mobileAssetRoot, 'assets', 'icon.png'), canonicalIcon]"));
assert(brand.includes("[path.join(mobileAssetRoot, 'assets', 'adaptive-icon.png'), canonicalIcon]"));

console.log('v3.71.115 plot export, Desktop lifetime, process identity and cross-platform branding regression checks passed.');
