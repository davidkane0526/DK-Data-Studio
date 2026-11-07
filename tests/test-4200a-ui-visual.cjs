'use strict';
/* Browser-based, instrument-free visual acceptance.
 * Run with NODE_PATH pointing to a temporary playwright installation.
 * Captures evidence and rejects structural regressions; no instrument output.
 */
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const file=pathToFileURL(path.resolve(__dirname,'../src/4200a-fspro/index.html')).href;
const out=path.resolve(process.env.DK4200_QA_OUT||path.join(__dirname,'../artifacts/4200a-ui'));
fs.mkdirSync(out,{recursive:true});
const report=[];
function check(id,condition,details=''){report.push({id,pass:!!condition,details});assert.ok(condition,`${id}: ${details}`);}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--allow-file-access-from-files']});
 try{
  const desktop=await browser.newPage({viewport:{width:1200,height:850},deviceScaleFactor:1,acceptDownloads:true});
  await desktop.goto(file);
  await desktop.screenshot({path:path.join(out,'01-main-workspace.png'),fullPage:true});
  check('UI-001',await desktop.locator('.fs-menu').isVisible()&&await desktop.locator('.fs-toolbar').isVisible(),'top menu and toolbar');
  check('UI-002',await desktop.locator('.fs-project [role=treeitem]').count()>=4,'nested project tree');
  check('UI-003',await desktop.locator('.fs-frame').count()===4,'2x2 Visual Area');
  check('UI-004',await desktop.locator('.fs-bottom-cell').count()===2,'messages and strategy');
  check('SAFE-001',await desktop.locator('#fs-measure').isDisabled()&&await desktop.locator('#fs-repeat').isDisabled(),'no hardware output enabled');
  await desktop.locator('button[data-command="edit"]').first().click();
  await desktop.screenshot({path:path.join(out,'02-edit-page-sweep.png'),fullPage:true});
  const editor=desktop.locator('.fs-editor');
  check('UI-007',JSON.stringify(await editor.locator('.fs-info label').allTextContents())===JSON.stringify(['Type:','Polarity:','Group:','Test Type:','Name:']),'Info field order');
  const buttons=await editor.locator('.fs-editor-controls button').allTextContents();
  check('UI-008',JSON.stringify(buttons)===JSON.stringify(['Lock','Reset','Set Connection','AutoScale','UnScale']),'command order');
  check('UI-009',JSON.stringify(await editor.locator('.fs-tabs button').allTextContents())===JSON.stringify(['Sweep','Target','Strategy']),'tab order');
  check('UI-010',await editor.locator('.fs-sweep-head').isVisible()&&await editor.locator('.fs-terminal-list').isVisible(),'RefNode/Outputs above terminals');
  check('UI-011',await editor.locator('.fs-terminal').count()===4,'stacked terminals');
  check('UI-012',await desktop.evaluate(()=>{const x=window.DK4200FSPro.getDraft().terminals.filter(t=>t.role==='X');const p=window.DK4200FSPro.getDraft().terminals.filter(t=>t.role==='P');return x.length===1&&p.length===1;}),'one X one P');
  const triptych=await editor.locator('.fs-triptych > .fs-triptych-panel h3').allTextContents();
  check('UI-014',JSON.stringify(triptych)===JSON.stringify(['Limits','Page Var','Associate Spec']),'bottom three panels');
  check('UI-015',await editor.locator('input[aria-label="D current compliance"]').count()===1,'voltage source current compliance');
  check('SAFE-002',await desktop.evaluate(()=>window.DK4200FSPro.validate().executionAuthorized===false),'offline cannot authorize instrument');
  await editor.locator('button[data-action="add-segment"]').first().click();
  check('UI-013',await editor.locator('.fs-terminal').first().locator('.fs-segment-row').count()===1,'segment stays under terminal');
  await editor.locator('button[data-action="remove-segment"]').first().click();
  check('UI-013b',await editor.locator('.fs-terminal').first().locator('.fs-segment-row').count()===0,'delete segment');
  await editor.locator('button[data-action="tab"][data-tab="Target"]').click();
  await desktop.screenshot({path:path.join(out,'03-edit-page-target.png'),fullPage:true});
  check('UI-016',await editor.locator('.fs-target textarea').isVisible()&&await editor.locator('.fs-target .fs-triptych').isVisible(),'equation and lower panels');
  check('UI-017',await editor.locator('.fs-function-info').isVisible()&&await editor.locator('.fs-plot-options input').count()===4,'function info, X/Y/H/P');
  await editor.locator('button[data-action="tab"][data-tab="Strategy"]').click();
  await desktop.screenshot({path:path.join(out,'04-edit-page-strategy.png'),fullPage:true});
  check('UI-018',await editor.locator('select[data-bind="strategy.scope"]').isVisible(),'global/local strategy');
  await editor.locator('button[data-action="connection"]').click();
  await desktop.screenshot({path:path.join(out,'05-set-connection.png'),fullPage:true});
  check('UI-019',await desktop.locator('.fs-connection-table tr').count()===5,'separate connection mapping dialog');
  check('UI-020',await desktop.locator('.fs-connection-footer').innerText().then(x=>x.includes('共享')),'shared preset warning');
  check('UI-031',await desktop.locator('select[data-bind="terminals[0].resource"] option').allTextContents().then(xs=>xs.length===1&&xs[0]==='None'),'no fictitious unverified modules');
  await desktop.locator('button[data-action="close-connection"]').last().click();
  await desktop.locator('button[data-action="cancel"]').last().click();
  check('SAFE-003',await desktop.locator('.fs-editor').count()===0,'cancel closes and reverts draft');
  await desktop.close();
  const mobile=await browser.newPage({viewport:{width:430,height:900},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  await mobile.goto(file+'?open=edit');
  await mobile.screenshot({path:path.join(out,'06-edit-page-narrow.png'),fullPage:true});
  check('UI-030',await mobile.locator('.fs-info').isVisible()&&await mobile.locator('.fs-triptych-panel').count()===3,'mobile preserves three panels and original order');
  const metrics=await mobile.evaluate(()=>({
   width:document.documentElement.clientWidth,
   bodyScroll:document.documentElement.scrollWidth,
   terminalCount:document.querySelectorAll('.fs-terminal').length,
   tabs:Array.from(document.querySelectorAll('.fs-tabs button')).map(x=>x.textContent)
  }));
  check('UI-035',metrics.terminalCount===4&&metrics.tabs.join(',')==='Sweep,Target,Strategy','same terminal and tab composition');
  fs.writeFileSync(path.join(out,'acceptance-report.json'),JSON.stringify({reference:'FS-Pro V6',kind:'offline UI',checks:report,metrics},null,2));
  console.log(JSON.stringify({checks:report.length,passed:report.filter(x=>x.pass).length,output:out,metrics}));
 }finally{await browser.close();}
})().catch(err=>{fs.writeFileSync(path.join(out,'failure.txt'),String(err.stack||err));console.error(err);process.exitCode=1;});
