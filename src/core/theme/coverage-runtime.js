(() => {
  'use strict';
  const Contract=window.DKDSThemeCoverageContract;
  if(!Contract)throw new Error('DKDSThemeCoverageContract is required before ThemeCoverageRuntime.');
  const ROLE_AREAS=Object.freeze([
    {id:'app-chrome',label:'App Shell / Chrome',role:'chrome',selector:'.topbar,.project-tabs-bar,#statusBar.statusbar'},
    {id:'page-chrome',label:'Page / Workspace Headers',role:'chrome',selector:'.analysis-page-header,.dkds-analysis-header,.plugin-manager-header,.dkds-surface-header,.floating-header,.trend-card-header,.dkds-plot-view-head,.dkds-group-plot-head'},
    {id:'sidebar',label:'Sidebar / Inspector Rail',role:'sidebar',selector:'.left-panel,.plugin-sidebar-sections,.dkds-plugin-canvas-left,.dkds-plugin-canvas-right,.dkds-analysis-left,.dkds-analysis-right,.dkds-material-role-sidebar'},
    {id:'workspace',label:'Workspace / Plugin Workspace',role:'surface',selector:'.dkds-ui-workspace,.dkds-plugin-workspace,.dkds-analysis-workbench,.super-workspace-page,.main-workspace,.dkds-plugin-canvas-center,.dkds-analysis-primary-host,.dkds-plugin-sub-page-host,.dkds-material-role-surface'},
    {id:'core-content',label:'Core Scientific/Data Content',role:'surface',selector:'.analysis-page:not(#pluginManagerPage):not(#automationTestPage),.dkds-chart-surface,.dkds-table-surface-host,.dkds-scientific-surface-host'},
    {id:'elevated-pages',label:'Settings / Plugin Manager / Automation / Dedicated Panels',role:'elevated',selector:'#pluginManagerPage,#automationTestPage,.dkds-settings-dialog,.dkds-dialog-shell,.lan-web-panel,.import-workbench,.project-save-choice-card,.dkds-theme-settings-dialog,.dkds-material-role-elevated'},
    {id:'portable',label:'Docked Tool / Portable Panels',role:'surface',selector:'.dkds-portable-view:not(.is-floating):not(.is-global-floating),.dkds-plugin-canvas-bottom'},
    {id:'popover',label:'Context Menu / Dropdown / Tooltip / Popover',role:'popover',selector:'.command-menu,.dkds-context-menu,.dkds-tooltip,.dkds-core-tooltip,.dkds-d3-chart-tooltip,.activity-more-menu,.context-overflow-menu,.range-action-menu,[role="menu"],[data-dkds-popover],.dkds-material-role-popover'},
    {id:'control',label:'Button / Input / Select',role:'control',selector:'button,input,select,textarea,.dkds-field-control,.dkds-icon-button,.dkds-action-button,.toolbar-btn,.plugin-toolbar-btn,.dkds-material-role-control'},
    {id:'scientific-floating',label:'ScientificPlot Floating Chrome',role:'floating',selector:'.dkds-scientific-nav-tools'},
    {id:'floating',label:'Floating Surfaces / Tool Panels',role:'floating',selector:'.dkds-floating-surface:not(.dkds-portable-view),.floating-panel:not(.lan-web-panel):not(.dkds-portable-view),.dkds-prime-floating,.dkds-memory-panel,.zoom-panel,.dkds-portable-view.is-floating,.dkds-portable-view.is-global-floating,.dkds-material-role-floating:not(.dkds-portable-view)'}
  ]);
  const roleOf=el=>String(getComputedStyle(el).getPropertyValue('--dkds-material-role')||'').trim().replace(/["']/g,'');
  const OK_RENDER=new Set(['REAL_MATERIAL','MATERIAL_DISABLED','MATERIAL_SEMANTIC_OVERRIDE','MATERIAL_CHROME_OWNED','MATERIAL_PARENT_OWNED']);
  function areaCoverage(){
    const Renderer=window.DKDSThemeMaterialRenderer;
    return ROLE_AREAS.map(area=>{
      const nodes=[...document.querySelectorAll(area.selector)];
      const ownershipRows=nodes.map(el=>Renderer?.ownership?.(el,area.role)||{managed:roleOf(el)===area.role,status:roleOf(el)===area.role?'MATERIAL_ROLE_OWNED':'ROLE_MISSING',role:roleOf(el),expectedRole:area.role});
      const managed=ownershipRows.filter(row=>row?.managed===true).length;
      const renderRows=nodes.map((el,index)=>{const owner=ownershipRows[index];if(owner?.managed&&owner.status!=='MATERIAL_ROLE_OWNED')return owner;return Renderer?.inspect?.(el,area.role)||{status:'BROKEN_MATERIAL_RENDERER',role:roleOf(el),expectedRole:area.role};});
      const broken=renderRows.filter(row=>['BROKEN_MATERIAL_RENDERER','BROKEN_OPTICAL_RENDERER','ROLE_MISSING','RECIPE_MISSING','BACKDROP_FILTER_NONE','ENGINE_UNSUPPORTED','LOW_CONTRAST_MATERIAL'].includes(row.status)).length;
      const occluded=renderRows.filter(row=>row.status==='OPAQUE_PARENT_OCCLUSION').length;
      const real=renderRows.filter(row=>OK_RENDER.has(row.status)).length;
      const status=!nodes.length?'not-present':managed===nodes.length?'managed':managed?'partial':'unmanaged';
      const renderStatus=!nodes.length?'not-present':broken?'broken':occluded&&real?'partial':occluded?'occluded':'real';
      return Object.freeze({...area,count:nodes.length,managed,status,renderStatus,realMaterial:real,occludedMaterial:occluded,brokenMaterial:broken,render:Object.freeze(renderRows.slice(0,24))});
    });
  }
  function pluginStyleIssues(){
    const issues=[];
    for(const style of document.querySelectorAll('style[data-plugin-id]')){const pluginId=String(style.dataset.pluginId||'');issues.push(...Contract.auditCss(style.textContent||'',{pluginId,source:`style:${style.dataset.pluginStyle||'inline'}`}));}
    for(const root of document.querySelectorAll('[data-plugin-id]')){
      const pluginId=String(root.dataset.pluginId||''),nodes=[root,...root.querySelectorAll('[style]')];
      for(const el of nodes){const text=el.getAttribute?.('style')||'';if(!text)continue;if(el.closest?.('svg,.dkds-scientific-surface-host,.dkds-scientific-auto-legend,[data-series-id],[data-trace-id],[data-legend-id]'))continue;issues.push(...Contract.auditInlineStyle(text,{pluginId,source:'inline-style',selector:el.tagName?.toLowerCase?.()||'[style]'}));}
    }
    const key=new Set();return issues.filter(row=>{const id=[row.pluginId,row.source,row.selector,row.property,row.value].join('|');if(key.has(id))return false;key.add(id);return true;});
  }

  const CONTRAST_SELECTOR='#pluginManagerPage button,#pluginManagerPage select,#pluginManagerPage input,.dkds-mode-group button,.activity-tab.active';
  const parseColor=value=>{const text=String(value||'').trim();let m=text.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+)%?)?\s*\)/i);if(m){let a=m[4]==null?1:Number(m[4]);if(String(m[4]||'').includes('%'))a/=100;return {r:Number(m[1]),g:Number(m[2]),b:Number(m[3]),a:Number.isFinite(a)?a:1};}m=text.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/i);if(m)return {r:Number(m[1])*255,g:Number(m[2])*255,b:Number(m[3])*255,a:m[4]==null?1:Number(m[4])};return null;};
  const composite=(front,back)=>{const fa=Math.max(0,Math.min(1,front?.a??0)),ba=Math.max(0,Math.min(1,back?.a??1)),a=fa+ba*(1-fa);if(a<=0)return {r:0,g:0,b:0,a:0};return {r:(front.r*fa+back.r*ba*(1-fa))/a,g:(front.g*fa+back.g*ba*(1-fa))/a,b:(front.b*fa+back.b*ba*(1-fa))/a,a};};
  const luminance=c=>{const f=v=>{v=Math.max(0,Math.min(255,v))/255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4;};return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b);};
  const contrastRatio=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
  function effectiveBackground(el){let out={r:0,g:0,b:0,a:0},node=el,depth=0;while(node&&depth<12){const bg=parseColor(getComputedStyle(node).backgroundColor);if(bg&&bg.a>0)out=composite(out,bg);if(out.a>=.985)break;node=node.parentElement;depth++;}if(out.a<.985){const fallback=parseColor(getComputedStyle(document.body).backgroundColor)||((window.DKDSTheme?.current?.()||'light')==='dark'?{r:10,g:16,b:32,a:1}:{r:238,g:244,b:251,a:1});out=composite(out,fallback);}return out;}
  function controlContrast(){const rows=[];for(const el of document.querySelectorAll(CONTRAST_SELECTOR)){const style=getComputedStyle(el);if(style.display==='none'||style.visibility==='hidden')continue;const fg=parseColor(style.color),bg=effectiveBackground(el);if(!fg||!bg)continue;const resolvedFg=fg.a<.999?composite(fg,bg):fg,ratio=contrastRatio(resolvedFg,bg),disabled=el.matches?.(':disabled,[aria-disabled="true"]'),minimum=disabled?3:4.5;if(ratio+1e-6<minimum)rows.push(Object.freeze({tag:String(el.tagName||'').toLowerCase(),id:String(el.id||''),className:String(el.className||''),text:String(el.textContent||el.getAttribute?.('aria-label')||'').trim().slice(0,80),foreground:String(style.color||''),background:String(style.backgroundColor||''),effectiveBackground:bg,ratio:Number(ratio.toFixed(2)),minimum,disabled:!!disabled}));}return Object.freeze({checked:document.querySelectorAll(CONTRAST_SELECTOR).length,issues:Object.freeze(rows),ok:rows.length===0});}

  function appearanceCoverage(){
    const runtime=window.DKDSThemeComponentAppearance;
    const report=runtime?.scan?.()||{version:'0.0.0',rows:[],authored:[],summary:{components:0,present:0,managed:0,authoredUnused:0,ok:false}};
    const consumption=runtime?.consumption?.()||{components:{},semantic:{},scientific:{mode:'fallback-only',precedence:[]}};
    return Object.freeze({
      ...report,
      consumption,
      semantic:Object.freeze(Object.entries(consumption.semantic||{}).map(([name,token])=>Object.freeze({name,token,status:token?'CONSUMED':'UNMANAGED'}))),
      interaction:Object.freeze(['idle','hover','active','selected','disabled'].map(state=>Object.freeze({state,status:'CONSUMED_BY_COMPONENT_CONTRACT'})))
    });
  }
  function scan(){
    const core=areaCoverage(),issues=pluginStyleIssues(),controlReadability=controlContrast(),appearance=appearanceCoverage(),present=core.filter(x=>x.status!=='not-present');
    const managed=present.filter(x=>x.status==='managed').length,partial=present.filter(x=>x.status==='partial').length,unmanaged=present.filter(x=>x.status==='unmanaged').length;
    const brokenMaterial=present.reduce((n,x)=>n+x.brokenMaterial,0),occludedMaterial=present.reduce((n,x)=>n+x.occludedMaterial,0),realMaterial=present.reduce((n,x)=>n+x.realMaterial,0);
    const rendererCapabilities=window.DKDSTheme?.rendererCapabilities?.()||null,appearanceOk=appearance.summary?.ok===true,authoredUnused=Number(appearance.summary?.authoredUnused||0);
    return Object.freeze({version:'3.0.0',contractVersion:window.DKDSTheme?.contractVersion||'0.0.0',profile:window.DKDSTheme?.profile?.()||'builtin.default',mode:window.DKDSTheme?.current?.()||'light',rendererCapabilities,core:Object.freeze(core),appearance,contrast:controlReadability,plugins:Object.freeze({issues:Object.freeze(issues),summary:Contract.summarize(issues)}),summary:Object.freeze({areas:present.length,managed,partial,unmanaged,realMaterial,brokenMaterial,occludedMaterial,componentTypes:Number(appearance.summary?.components||0),presentComponentTypes:Number(appearance.summary?.present||0),managedComponents:Number(appearance.summary?.managed||0),authoredUnused,appearanceOk,lowContrastControls:controlReadability.issues.length,pluginIssues:issues.length,rendererOk:brokenMaterial===0&&occludedMaterial===0,ok:partial===0&&unmanaged===0&&brokenMaterial===0&&occludedMaterial===0&&appearanceOk&&authoredUnused===0&&controlReadability.issues.length===0&&issues.length===0})});
  }
  window.DKDSThemeCoverage=Object.freeze({version:'3.0.0',areas:()=>ROLE_AREAS.map(x=>({...x})),scan,contrast:controlContrast,appearance:appearanceCoverage,auditPluginStyles:pluginStyleIssues});
})();
