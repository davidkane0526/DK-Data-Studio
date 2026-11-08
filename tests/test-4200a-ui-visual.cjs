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
const file=pathToFileURL(path.resolve(process.env.DK4200_UI_ENTRY_FILE||path.join(__dirname,'../src/4200a-fspro/index.html'))).href;
const out=path.resolve(process.env.DK4200_QA_OUT||path.join(__dirname,'../artifacts/4200a-ui'));
fs.mkdirSync(out,{recursive:true});
const report=[];
function check(id,condition,details=''){report.push({id,pass:!!condition,details});assert.ok(condition,`${id}: ${details}`);}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--allow-file-access-from-files']});
 try{
  const desktop=await browser.newPage({viewport:{width:1200,height:850},deviceScaleFactor:1,acceptDownloads:true});
  await desktop.goto(file);
  check('SHELL-DEFAULT-ZH',await desktop.evaluate(()=>
    window.DKTSLocale?.getLanguage()==='zh'&&document.documentElement.lang==='zh-CN'&&
    document.querySelector('[data-menu="File"]')?.textContent==='文件'&&
    document.querySelector('#fs-version-badge')?.textContent==='V0.3.13'),
    'default Chinese and original V0.3.13 identity');
  check('SHELL-BRAND',await desktop.locator('.fs-brand-mark').textContent().then(x=>x==='DK'),
    'original DK brand mark exists');
  check('SHELL-TITLEBAR',await desktop.evaluate(()=>{
    const title=document.querySelector('.fs-titlebar'),menu=document.querySelector('.fs-menu');
    const a=title.getBoundingClientRect(),b=menu.getBoundingClientRect();
    return b.top>=a.top&&b.bottom<=a.bottom&&a.height<=46;
  }),'File and other menus occupy single titlebar, not an extra row');
  const pageErrors=[];
  desktop.on('pageerror',err=>pageErrors.push(String(err.message||err)));
  await desktop.screenshot({path:path.join(out,'01-main-workspace.png'),fullPage:true});
  await desktop.locator('#fs-language-switch').click();
  check('SHELL-SWITCH-EN',await desktop.evaluate(()=>
    window.DKTSLocale?.getLanguage()==='en'&&
    document.querySelector('[data-menu="File"]')?.textContent==='File'&&
    document.querySelector('#fs-language-switch')?.textContent==='中文'),
    'language changes without a page reload');
  await desktop.locator('.fs-menu [data-menu="File"]').click();
  const menuGeometry=await desktop.evaluate(()=>{
   const trigger=document.querySelector('.fs-menu [data-menu="File"]').getBoundingClientRect();
   const popup=document.querySelector('.fs-menu-item .fs-menu-popup').getBoundingClientRect();
   return {triggerBottom:trigger.bottom,popupTop:popup.top,popupLeft:popup.left,triggerLeft:trigger.left};
  });
  check('UI-MENU-ANCHOR',Math.abs(menuGeometry.popupTop-menuGeometry.triggerBottom)<3&&Math.abs(menuGeometry.popupLeft-menuGeometry.triggerLeft)<3,JSON.stringify(menuGeometry));
  await desktop.locator('.fs-menu [data-menu="File"]').click();
  await desktop.locator('.fs-menu [data-menu="Instruments"]').click();
  await desktop.locator('.fs-menu-popup [data-native-action="settings"]').click();
  check('UI-CONNECTION-SETTINGS',await desktop.locator('#fs-instrument-host .fs-device-dialog').isVisible(),'Instrument connection settings');
  check('SAFE-CONNECTION-OFFLINE',await desktop.evaluate(()=>window.DK4200ConnectionStatus?.snapshot?.().executionAuthorized===false),'no native output privilege');
  await desktop.screenshot({path:path.join(out,'08-instrument-settings.png'),fullPage:true});
  await desktop.locator('#fs-instrument-host [data-fs-device-action="close"]').first().click();

  check('UI-001',await desktop.locator('.fs-menu').isVisible()&&await desktop.locator('.fs-toolbar').isVisible(),'top menu and toolbar');
  check('UI-002',await desktop.locator('.fs-project [role=treeitem]').count()>=4,'nested project tree');
  check('UI-003',await desktop.locator('.fs-frame').count()===4,'2x2 Visual Area');
  check('UI-004',await desktop.locator('.fs-bottom-cell').count()===2,'messages and strategy');
  check('UI-HEADER-CONNECT',await desktop.locator('.fs-titlebar #fs-instrument-link').count()===1&&
    await desktop.locator('.fs-toolbar #fs-instrument-link').count()===0,'Connect pinned in titlebar, not scrolled toolbar');
  check('SAFE-001',await desktop.locator('#fs-measure').isDisabled()&&await desktop.locator('#fs-repeat').isDisabled(),'no hardware output enabled');
  await desktop.locator('.fs-toolbar button[data-command="edit"]').click();
  await desktop.screenshot({path:path.join(out,'02-edit-page-sweep.png'),fullPage:true});
  const editor=desktop.locator('.fs-editor');
  check('UI-007',JSON.stringify(await editor.locator('.fs-info label').allTextContents())===JSON.stringify(['Type:','Polarity:','Group:','Test Type:','Name:']),'Info field order');
  const buttons=await editor.locator('.fs-editor-controls button').allTextContents();
  check('UI-008',JSON.stringify(buttons)===JSON.stringify(['Unlock','Reset','Set Connection','AutoScale','UnScale']),'command order');
  check('UI-009',JSON.stringify(await editor.locator('.fs-tabs button').allTextContents())===JSON.stringify(['Sweep','Target','Strategy']),'tab order');
  check('UI-010',await editor.locator('.fs-sweep-head').isVisible()&&await editor.locator('.fs-terminal-list').isVisible(),'RefNode/Outputs above terminals');
  const fieldTrace=await desktop.evaluate(()=>({
    total:document.querySelectorAll('.fs-editor [data-bind]').length,
    missing:[...document.querySelectorAll('.fs-editor [data-bind]')].filter(el=>!/^(18|19|20|21)$/.test(el.dataset.fsProManualPage||'')).map(el=>el.dataset.bind)
  }));
  check('UI-034-TRACE',fieldTrace.total>=35&&fieldTrace.missing.length===0,'field traceability: '+JSON.stringify(fieldTrace));
  check('UI-011',await editor.locator('.fs-terminal').count()===4,'stacked terminals');
  const sweepGeometry=await desktop.evaluate(()=>{
   const list=document.querySelector('.fs-terminal-list');
   const last=list?.querySelector('.fs-terminal:last-child');
   const ref=document.querySelector('.fs-sweep-head select[data-bind="refNode"]');
   const triptych=document.querySelector('.fs-triptych');
   const listRect=list?.getBoundingClientRect(),lastRect=last?.getBoundingClientRect(),bottom=triptych?.getBoundingClientRect();
   return {listClient:list?.clientHeight,listScroll:list?.scrollHeight,
     listBottom:listRect?.bottom,lastBottom:lastRect?.bottom,triptychTop:bottom?.top,refWidth:ref?.getBoundingClientRect().width};
  });
  check('UI-011-VISIBLE',sweepGeometry.lastBottom<=sweepGeometry.listBottom+2&&sweepGeometry.lastBottom<=sweepGeometry.triptychTop-2,'4 terminals visible: '+JSON.stringify(sweepGeometry));
  check('UI-010-REFNODE',sweepGeometry.refWidth>=68,'RefNode selection not collapsed: '+JSON.stringify(sweepGeometry));
  check('UI-012',await desktop.evaluate(()=>{const x=window.DK4200FSPro.getDraft().terminals.filter(t=>t.role==='X');const p=window.DK4200FSPro.getDraft().terminals.filter(t=>t.role==='P');return x.length===1&&p.length===1;}),'one X one P');
  const triptych=await editor.locator('.fs-triptych > .fs-triptych-panel h3').allTextContents();
  check('UI-014',JSON.stringify(triptych)===JSON.stringify(['Limits','Page Var','Associate Spec']),'bottom three panels');
  check('UI-015',await editor.locator('input[aria-label="D current compliance"]').count()===1,'voltage source current compliance');
  check('SAFE-002',await desktop.evaluate(()=>window.DK4200FSPro.validate().executionAuthorized===false),'offline cannot authorize instrument');
  await editor.locator('button[data-action="lock"]').click();
  check('UI-008-UNLOCK',await editor.locator('button[data-action="lock"]').innerText().then(x=>x==='Lock'),'Unlock activates editing');
  await editor.locator('button[data-action="add-segment"]').first().click();
  check('UI-013',await editor.locator('.fs-terminal').first().locator('.fs-segment-row').count()===1,'segment stays under terminal');
  await editor.locator('button[data-action="remove-segment"]').first().click();
  check('UI-013b',await editor.locator('.fs-terminal').first().locator('.fs-segment-row').count()===0,'delete segment');
  await editor.locator('button[data-action="tab"][data-tab="Target"]').click();
  await desktop.screenshot({path:path.join(out,'03-edit-page-target.png'),fullPage:true});
  const targetGeometry=await desktop.evaluate(()=>{
   const area=document.querySelector('.fs-tab-content')?.getBoundingClientRect();
   const triptych=document.querySelector('.fs-target .fs-triptych')?.getBoundingClientRect();
   return {areaBottom:area?.bottom,triptychBottom:triptych?.bottom};
  });
  check('UI-016-BOTTOM',Math.abs(targetGeometry.areaBottom-targetGeometry.triptychBottom)<17,'Target lower panels align to bottom: '+JSON.stringify(targetGeometry));
  check('UI-016',await editor.locator('.fs-target textarea').isVisible()&&await editor.locator('.fs-target .fs-triptych').isVisible(),'equation and lower panels');
  check('UI-017',await editor.locator('.fs-function-info').isVisible()&&await editor.locator('.fs-plot-options input').count()===4,'function info, X/Y/H/P');
  await editor.locator('button[data-action="tab"][data-tab="Strategy"]').click();
  await desktop.screenshot({path:path.join(out,'04-edit-page-strategy.png'),fullPage:true});
  check('UI-018',await editor.locator('select[data-bind="strategy.scope"]').isVisible(),'global/local strategy');
  await editor.locator('button[data-action="connection"]').click();
  await desktop.screenshot({path:path.join(out,'05-set-connection.png'),fullPage:true});
  check('UI-019',await desktop.locator('.fs-connection-table tr').count()===5,'separate connection mapping dialog');
  check('UI-020',await desktop.locator('.fs-connection-footer').innerText().then(x=>/共享|shared/i.test(x)),'shared preset warning preserved in either locale');
  check('UI-031',await desktop.locator('select[data-bind="terminals[0].resource"] option').allTextContents().then(xs=>xs.length===1&&xs[0]==='None'),'no fictitious unverified modules');
  await desktop.locator('button[data-action="close-connection"]').last().click();
  await desktop.locator('button[data-action="cancel"]').last().click();
  check('SAFE-003',await desktop.locator('.fs-editor').count()===0,'cancel closes and reverts draft');
  await desktop.close();
  const manual=await browser.newPage({viewport:{width:1080,height:770},deviceScaleFactor:1});
  await manual.goto(file+'?open=edit');
  await manual.screenshot({path:path.join(out,'07-edit-page-manual-1080x770.png'),fullPage:true});
  const manualGeometry=await manual.evaluate(()=>{
   const list=document.querySelector('.fs-terminal-list');
   const last=list?.querySelector('.fs-terminal:last-child');
   const lower=document.querySelector('.fs-triptych');
   return {listBottom:list?.getBoundingClientRect().bottom,lastBottom:last?.getBoundingClientRect().bottom,
    lowerTop:lower?.getBoundingClientRect().top,scrollHeight:list?.scrollHeight,clientHeight:list?.clientHeight};
  });
  check('UI-033-REFERENCE-VIEWPORT',manualGeometry.lastBottom<=manualGeometry.listBottom+2&&manualGeometry.lastBottom<manualGeometry.lowerTop,
    'At 1080x770 terminal B must remain visible: '+JSON.stringify(manualGeometry));
  await manual.close();
  const rawPreview=await browser.newPage({viewport:{width:1200,height:850},deviceScaleFactor:1});
  const rawPageErrors=[];
  rawPreview.on('pageerror',err=>rawPageErrors.push(String(err.message||err)));
  await rawPreview.goto(file);
  const fixture={
   schema:'dkts.4200a.native.raw.v1',source:'keithley-4200a-kxci',
   instrumentId:'KEITHLEY INSTRUMENTS,KI4200A,OFFLINE-TEST,V0',
   captureId:'OFFLINE-IMPORT-QA',planHash:'b'.repeat(64),
   startedAt:'2026-11-08T00:00:00.000Z',status:'fault',
   columns:[{id:'voltage',label:'Voltage',unit:'V'},{id:'current',label:'Current',unit:'A'},
      {id:'time',label:'Instrument Time',unit:'s'}],
   samples:[
    {index:0,sweepId:'P0',voltage:'0.000000',current:'1.234567890123e-9',time:'0.0000000'},
    {index:1,sweepId:'P0',status:0,voltage:'0.100000',current:'1.240000000000e-9',time:'0.0100000',
     channelStatuses:{current:'N'},instrumentStatuses:{current:'0'}},
    {index:2,sweepId:'P0',status:1,voltage:'0.200000',current:'2.500000000000e-7',time:'0.0200000',
     channelStatuses:{current:'C'},instrumentStatuses:{current:'1'}}
   ],
   rawFrames:[{command:"DO 'I1'",readOrder:0,payloadBase64:Buffer.from('1,2,3').toString('base64')}]
  };
  await rawPreview.locator('#fs-raw-input').setInputFiles({
    name:'offline-4200a-capture-fixture.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(fixture))
  });
  await rawPreview.waitForFunction(()=>document.getElementById('fs-messages').textContent.includes('OFFLINE-IMPORT-QA'),{timeout:10000});
  await rawPreview.locator('.fs-menu [data-menu="Tools"]').click();
  await rawPreview.locator('.fs-menu-popup [data-command="data-viewer"]').click();
  const viewer=rawPreview.locator('#fs-data-host');
  check('RAW-UI-OPEN',await viewer.locator('.fs-data-dialog').isVisible(),
    'offline imported native raw capture renders in Data Viewer');
  const cells=await viewer.locator('tbody tr').allTextContents();
  check('RAW-UI-STATUS-UNKNOWN',cells[0].includes('未知')&&!cells[0].includes('null'),
    'unprovided native status remains explicitly unknown');
  check('RAW-UI-STATUS-COMPLIANCE',cells[2].includes('限流 (C)'),'actual C compliance shown');
  check('RAW-UI-STATUS-COLUMNS',await viewer.locator('thead').textContent().then(x=>x.includes('N/C')&&x.includes('仪器状态')),
    'raw channel statuses visible');
  const dialogBounds=await rawPreview.evaluate(()=>{
    const d=document.querySelector('#fs-data-host .fs-data-dialog').getBoundingClientRect();
    const last=document.querySelector('#fs-data-host .fs-data-table tbody tr:last-child').getBoundingClientRect();
    const pane=document.querySelector('#fs-data-host .fs-data-table-wrap').getBoundingClientRect();
    return {height:d.height,rowBottom:last.bottom,paneBottom:pane.bottom};
  });
  check('RAW-UI-COMPACT',dialogBounds.height>=225&&dialogBounds.height<=360&&
    dialogBounds.rowBottom<=dialogBounds.paneBottom+2,'3 rows should not create giant empty modal: '+JSON.stringify(dialogBounds));
  check('RAW-UI-PRECISION',cells[0].includes('1.234567890123e-9'),'original instrument numeric text preserved');
  check('RAW-UI-NO-ERRORS',rawPageErrors.length===0,'raw import page errors: '+rawPageErrors.join('; '));
  await rawPreview.screenshot({path:path.join(out,'11-raw-data-viewer-offline-fixture.png'),fullPage:true});
  await rawPreview.close();
  const mobile=await browser.newPage({viewport:{width:430,height:900},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  await mobile.goto(file);
  check('MOBILE-DEFAULT-ZH',await mobile.evaluate(()=>
    document.documentElement.lang==='zh-CN'&&document.querySelector('#fs-mobile-menu-toggle')?.textContent==='菜单'),
    'mobile interface launches in Chinese');
  check('MOBILE-COMPACT-MENU',await mobile.locator('.fs-mobile-menu-toggle').isVisible()&&
    await mobile.locator('.fs-menu').isHidden(),'compact File and other menu groups');
  await mobile.locator('#fs-mobile-menu-toggle').click();
  check('MOBILE-MENU-OPEN',await mobile.locator('.fs-menu').isVisible()&&
    await mobile.locator('.fs-menu [data-menu="File"]').textContent().then(x=>x==='文件'),
    'mobile category menu accessible in titlebar');
  await mobile.locator('.fs-menu [data-menu="File"]').click();
  check('MOBILE-FILE-SUBMENU',await mobile.locator('.fs-menu [data-menu="File"] + .fs-menu-popup').isVisible(),
    'File submenu remains reachable');
  await mobile.screenshot({path:path.join(out,'12-mobile-menu-zh.png'),fullPage:true});
  await mobile.locator('#fs-mobile-menu-toggle').click();
  await mobile.goto(file+'?open=edit');
  check('MOBILE-MODAL-ZH',await mobile.locator('.fs-editor-title').textContent().then(x=>x.includes('编辑页面')),
    'editor title localized by default');
  check('MOBILE-MODAL-LANGUAGE',await mobile.locator('.fs-editor [data-fs-locale-switch]').isVisible(),
    'switch remains reachable while editor is modal');
  await mobile.screenshot({path:path.join(out,'06-edit-page-narrow.png'),fullPage:true});
  await mobile.locator('.fs-editor [data-fs-locale-switch]').click();
  check('MOBILE-EN',await mobile.evaluate(()=>
    window.DKTSLocale.getLanguage()==='en'&&
    document.querySelector('.fs-tabs button')?.textContent==='Sweep'),
    'translate full form without changing data-bind values');
  check('UI-030',await mobile.locator('.fs-info').isVisible()&&await mobile.locator('.fs-triptych-panel').count()===3,'mobile preserves three panels and original order');
  const connectPin=await mobile.evaluate(()=>{
    const button=document.querySelector('.fs-titlebar #fs-instrument-link'),title=document.querySelector('.fs-titlebar');
    const b=button?.getBoundingClientRect(),t=title?.getBoundingClientRect();
    return {visible:!!b&&b.width>=50&&b.right<=t.right+1,bottom:b?.bottom,titleBottom:t?.bottom};
  });
  check('UI-MOBILE-CONNECT-PIN',connectPin.visible&&connectPin.bottom<=connectPin.titleBottom+1,
    'Connect control must stay visible without toolbar scrolling: '+JSON.stringify(connectPin));
  const metrics=await mobile.evaluate(()=>({
   width:document.documentElement.clientWidth,
   bodyScroll:document.documentElement.scrollWidth,
   terminalCount:document.querySelectorAll('.fs-terminal').length,
   tabs:Array.from(document.querySelectorAll('.fs-tabs button')).map(x=>x.textContent)
  }));
  check('UI-035',metrics.terminalCount===4&&metrics.tabs.join(',')==='Sweep,Target,Strategy','same terminal and tab composition');
  const mobileShape=await mobile.evaluate(()=>{
    const viewport=document.documentElement.clientWidth;
    const list=document.querySelector('.fs-terminal-list');
    const fields=[...document.querySelectorAll('.fs-terminal .fs-generator-values input,.fs-sweep-head input,.fs-sweep-head select')];
    const box=list.getBoundingClientRect();
    return {
      viewport,
      pageWidth:document.documentElement.scrollWidth,
      listWidth:box.width,
      overflowFields:fields.map(el=>({name:el.getAttribute('data-bind'),right:Math.round(el.getBoundingClientRect().right)}))
        .filter(el=>el.right>viewport+2),
      panelScroll:document.querySelector('.fs-triptych').scrollWidth-document.querySelector('.fs-triptych').clientWidth
    };
  });
  const sweepHead=await mobile.evaluate(()=>{
    const kids=[...document.querySelector('.fs-sweep-head').children];
    return kids.map(el=>{const r=el.getBoundingClientRect();return {text:el.textContent?.slice(0,30),left:r.left,right:r.right,top:r.top,bottom:r.bottom};});
  });
  check('UI-MOBILE-OUTPUT-LAYOUT',sweepHead.length===4&&
    sweepHead[2].top>=sweepHead[0].bottom-1&&
    sweepHead.every(el=>el.right<=mobileShape.viewport+2),
    'Outputs must appear in a readable second row: '+JSON.stringify(sweepHead));
  check('UI-MOBILE-FIELD-FIT',mobileShape.overflowFields.length===0,
    'No mobile Sweep inputs may be cut off: '+JSON.stringify(mobileShape));
  check('UI-MOBILE-TRIPTYCH-SCROLL',mobileShape.panelScroll>50,
    'All 3 lower panes must be horizontally scrollable: '+JSON.stringify(mobileShape));
  await mobile.locator('.fs-terminal').last().scrollIntoViewIfNeeded();
  const bVisible=await mobile.evaluate(()=>{
    const last=document.querySelector('.fs-terminal:last-child').getBoundingClientRect();
    const list=document.querySelector('.fs-terminal-list').getBoundingClientRect();
    return {top:last.top,bottom:last.bottom,listTop:list.top,listBottom:list.bottom,left:last.left,right:last.right,
      viewport:document.documentElement.clientWidth};
  });
  check('UI-MOBILE-LAST-TERMINAL',
    bVisible.top>=bVisible.listTop-3&&bVisible.bottom<=bVisible.listBottom+3&&
    bVisible.left>=-2&&bVisible.right<=bVisible.viewport+2,
    'Final B terminal must be visible and within viewport after scroll: '+JSON.stringify(bVisible));
  await mobile.screenshot({path:path.join(out,'09-mobile-last-terminal.png'),fullPage:true});
  await mobile.evaluate(()=>{
    const strip=document.querySelector('.fs-triptych');
    strip.scrollLeft=strip.scrollWidth;
    strip.dispatchEvent(new Event('scroll',{bubbles:true}));
  });
  await mobile.waitForTimeout(220);
  const lastPanel=await mobile.evaluate(()=>{
    const strip=document.querySelector('.fs-triptych').getBoundingClientRect();
    const last=document.querySelector('.fs-triptych-panel:last-child').getBoundingClientRect();
    return {stripLeft:strip.left,stripRight:strip.right,lastLeft:last.left,lastRight:last.right};
  });
  check('UI-MOBILE-SPEC-REACHABLE',
    lastPanel.lastLeft>=lastPanel.stripLeft-5&&lastPanel.lastRight<=lastPanel.stripRight+6,
    'Associate Spec panel must be reachable by swipe: '+JSON.stringify(lastPanel));
  await mobile.screenshot({path:path.join(out,'10-mobile-associate-spec.png'),fullPage:true});
  check('UI-NO-PAGEERROR',pageErrors.length===0,'Page errors: '+pageErrors.join('; '));
  fs.writeFileSync(path.join(out,'acceptance-report.json'),JSON.stringify({reference:'FS-Pro V6',kind:'offline UI',checks:report,metrics,pageErrors},null,2));
  console.log(JSON.stringify({checks:report.length,passed:report.filter(x=>x.pass).length,output:out,metrics}));
 }finally{await browser.close();}
})().catch(err=>{fs.writeFileSync(path.join(out,'failure.txt'),String(err.stack||err));console.error(err);process.exitCode=1;});
