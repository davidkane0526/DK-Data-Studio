(() => {
  'use strict';
  const VERSION='1.0.0';
  const ThemeContract=globalThis.DKDSThemeContract;
  if(!ThemeContract)throw new Error('DKDSThemeContract is required before DKDSSemanticUI.');
  const COMPONENT_VARIANTS=new Set(ThemeContract.componentVariants());
  const COMPONENT_VARIANT_MAP=ThemeContract.componentVariantMap();
  const COMPONENTS=Object.freeze([
    Object.freeze({id:'inspectorHeader',label:'Inspector Header',expectedRole:'chrome',priority:100,selector:'[data-dkds-inspector-header],[data-dkds-surface-kind="inspector"] .dkds-surface-header,[data-dkds-surface-kind="inspector"] .dkds-portable-header,[data-generic-panel="inspector"] .floating-header,[data-generic-panel="inspector"] .dkds-portable-header,.inspector-panel .floating-header'}),
    Object.freeze({id:'panelHeader',label:'Panel Header',expectedRole:'chrome',priority:90,selector:'.dkds-surface-header,.dkds-plot-view-head,.dkds-group-plot-head,.analysis-chart-title,.trend-card-header,.floating-header,.dkds-portable-header'}),
    Object.freeze({id:'tab',label:'Tab',expectedRole:'',priority:80,selector:'.activity-tab:not(.top-level-activity-tab),.project-tab,[role="tab"]'}),
    Object.freeze({id:'toolbarAction',label:'Toolbar Action',expectedRole:'',priority:70,selector:'.toolbar-btn,.plugin-toolbar-btn,.primary-activity-bar .activity-tab.top-level-activity-tab,.dkds-analysis-nav-btn,.dkds-action-button,.dkds-icon-button,.dkds-plot-view-action,.dkds-portable-placement-trigger,.dkds-toolbar>button,.dkds-action-row>button,.dkds-segmented-control>button,.dkds-section-header-actions>button,.panel-header-actions>button,.trend-header-actions>button'}),
    Object.freeze({id:'toolbarGroup',label:'Toolbar Group',expectedRole:'',priority:60,selector:'.toolbar-group,.system-core-tools-group,.dkds-toolbar,.dkds-action-row,.dkds-segmented-control'}),
    Object.freeze({id:'menuItem',label:'Menu Item',expectedRole:'',priority:50,selector:'.plugin-menu-item,[role="menuitem"],.menu-item,.command-menu>button'}),
    Object.freeze({id:'chip',label:'Chip / Tag',expectedRole:'',priority:40,selector:'.dkds-chip,.plugin-capability-chip,.plugin-status-badge,.plugin-type-badge,.dkds-summary-chip'}),
    Object.freeze({id:'statusBar',label:'Status Bar',expectedRole:'chrome',priority:100,selector:'#statusBar.statusbar,.statusbar'}),
    Object.freeze({id:'floatingChrome',label:'Floating Chrome',expectedRole:'floating',priority:30,selector:'.dkds-scientific-nav-tools,[data-dkds-floating-chrome]'}),
    Object.freeze({id:'field',label:'Field',expectedRole:'control',priority:20,selector:'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),select,textarea,.dkds-field-control'})
  ].sort((a,b)=>b.priority-a.priority));

  const MATERIAL_AREAS=Object.freeze([
    Object.freeze({id:'app-chrome',label:'App Shell / Chrome',role:'chrome',selector:'.topbar,.project-tabs-bar,#statusBar.statusbar'}),
    Object.freeze({id:'page-chrome',label:'Page / Workspace Headers',role:'chrome',selector:'.analysis-page-header,.dkds-analysis-header,.plugin-manager-header,.dkds-surface-header,.floating-header,.trend-card-header,.analysis-chart-title,.dkds-plot-view-head,.dkds-group-plot-head'}),
    Object.freeze({id:'sidebar',label:'Sidebar / Inspector Rail',role:'sidebar',selector:'.left-panel,.plugin-sidebar-sections,.dkds-plugin-canvas-left,.dkds-plugin-canvas-right,.dkds-analysis-left,.dkds-analysis-right,[data-dkds-surface-kind="inspector"].dkds-portable-view:not(.is-floating):not(.is-global-floating),[data-generic-panel="inspector"].dkds-portable-view:not(.is-floating):not(.is-global-floating),.dkds-material-role-sidebar'}),
    Object.freeze({id:'workspace',label:'Workspace / Persistent Pages',role:'surface',selector:'.analysis-page,.dkds-ui-workspace,.dkds-plugin-workspace,.dkds-analysis-workbench,.super-workspace-page,.main-workspace,.dkds-plugin-canvas-center,.dkds-analysis-primary-host,.dkds-plugin-sub-page-host,.dkds-material-role-surface'}),
    Object.freeze({id:'scientific-content',label:'Scientific / Data Content',role:'surface',selector:'.dkds-chart-surface,.dkds-table-surface-host,.dkds-scientific-surface-host,.dkds-group-plot,.dkds-group-plot-card,.dkds-plot-view'}),
    Object.freeze({id:'elevated',label:'Dialog / Settings / Elevated Panel',role:'elevated',selector:'.dkds-dialog,.dkds-dialog-shell,.dkds-settings-dialog,.update-panel,.lan-web-panel,.import-workbench,.project-save-choice-card,.dkds-theme-settings-dialog,.dkds-material-role-elevated'}),
    Object.freeze({id:'portable',label:'Docked Tool / Portable Panel',role:'surface',selector:'.dkds-portable-view:not(.is-floating):not(.is-global-floating):not([data-dkds-surface-kind="inspector"]):not([data-generic-panel="inspector"]),[data-dkds-surface-kind="panel"].dkds-portable-view:not(.is-floating):not(.is-global-floating),[data-generic-panel="group"].dkds-portable-view:not(.is-floating):not(.is-global-floating),.dkds-plugin-canvas-bottom'}),
    Object.freeze({id:'popover',label:'Context Menu / Dropdown / Tooltip / Popover',role:'popover',selector:'.command-menu,.dkds-context-menu,.dkds-tooltip,.dkds-core-tooltip,.dkds-d3-chart-tooltip,.hover-tip,.activity-more-menu,.context-overflow-menu,.range-action-menu,[role="menu"],[data-dkds-popover],.dkds-material-role-popover'}),
    Object.freeze({id:'control',label:'Independent Controls',role:'control',selector:'button,input,select,textarea,.dkds-field-control,.dkds-icon-button,.dkds-action-button,.toolbar-btn,.plugin-toolbar-btn,.dkds-material-role-control'}),
    Object.freeze({id:'scientific-floating',label:'ScientificPlot Floating Chrome',role:'floating',selector:'.dkds-scientific-nav-tools'}),
    Object.freeze({id:'floating',label:'Temporary Floating Surfaces',role:'floating',selector:'.dkds-prime-floating,.dkds-memory-panel,.zoom-panel,.dkds-portable-view.is-floating,.dkds-portable-view.is-global-floating,.floating-panel:not(.lan-web-panel):not(.update-panel):not([data-generic-panel]),.dkds-material-role-floating:not(.dkds-portable-view)'})
  ]);

  const POPOVER_SELECTOR=MATERIAL_AREAS.find(row=>row.role==='popover')?.selector||'';
  const INTEGRATED_CONTAINER_SELECTOR='.dkds-integrated-action-group,.panel-header-actions,.trend-header-actions,.dkds-plot-view-actions,.statusbar-command-cluster,.toolbar-group,.primary-activity-cluster,.system-core-tools-group,[data-dkds-material-integrated="true"]';
  const SEMANTIC_CONTROL_PAINT_SELECTOR='.dkds-control-hit-region,.toolbar-btn,.activity-tab,.plugin-toolbar-btn,.primary,.strong,.danger-soft,.accent-soft,.selected,.active,[aria-pressed="true"],[aria-selected="true"],[aria-checked="true"],[data-state="active"],[data-selected="true"]';
  const CHROME_SELECTOR='.topbar,.project-tabs-bar,#statusBar.statusbar,.analysis-page-header,.dkds-analysis-header,.plugin-manager-header,.dkds-surface-header,.floating-header,.trend-card-header,.analysis-chart-title,.dkds-plot-view-head,.dkds-group-plot-head';

  const matches=(el,selector)=>{try{return !!el?.matches?.(selector);}catch{return false;}};
  const closest=(el,selector)=>{try{return el?.closest?.(selector)||null;}catch{return null;}};
  function componentDefinition(id){return COMPONENTS.find(row=>row.id===String(id||''))||null;}
  function resolveComponent(el){
    if(!el?.closest)return null;
    const explicit=closest(el,'[data-dkds-component-identity]');
    if(explicit){const id=String(explicit.dataset.dkdsComponentIdentity||'');const definition=componentDefinition(id);if(definition)return Object.freeze({id,target:explicit,definition,source:'assigned'});}
    for(const definition of COMPONENTS){const target=closest(el,definition.selector);if(target)return Object.freeze({id:definition.id,target,definition,source:'selector'});}
    return null;
  }
  function stateOf(el){
    if(!el)return 'idle';
    if(matches(el,':disabled,[aria-disabled="true"],.disabled'))return 'disabled';
    if(matches(el,'.selected,[aria-selected="true"],[aria-checked="true"]'))return 'selected';
    if(matches(el,'.active,[aria-pressed="true"],[data-state="active"],[data-selected="true"]'))return 'active';
    try{if(el.matches(':hover'))return 'hover';}catch{}
    return 'idle';
  }
  function variantOf(el,component=''){
    if(!el)return '';
    const allowed=new Set(COMPONENT_VARIANT_MAP[component]||[]),accept=value=>COMPONENT_VARIANTS.has(value)&&allowed.has(value)?value:'';
    const authoredVariant=el.dataset?.dkdsComponentVariantOwner==='core-runtime'?'':el.dataset?.dkdsComponentVariant;const explicit=String(authoredVariant||el.dataset?.dkdsActionTone||'').trim(),accepted=accept(explicit);if(accepted)return accepted;
    const state=stateOf(el);if(state==='selected'||state==='active'){const value=accept(state);if(value)return value;}
    if(matches(el,'.primary,.strong')){const value=accept('primary');if(value)return value;}
    if(matches(el,'.danger,.danger-soft,[data-tone="danger"],[data-status="error"]')){const value=accept(component==='chip'?'danger':'destructive');if(value)return value;}
    if(matches(el,'.quiet,[data-tone="quiet"]')){const value=accept('quiet');if(value)return value;}
    if(matches(el,'[data-tone="secondary"]')){const value=accept('secondary');if(value)return value;}
    if(component==='chip'){
      for(const value of ['success','warning','danger','info'])if(matches(el,`.${value},[data-status="${value}"]`)){const acceptedValue=accept(value);if(acceptedValue)return acceptedValue;}
      if(matches(el,'[data-status="error"]'))return accept('danger');
    }
    return '';
  }
  const semanticControlOwnsPaint=el=>matches(el,SEMANTIC_CONTROL_PAINT_SELECTOR);
  function chromeOwnedIntegrated(el){
    if(matches(el,POPOVER_SELECTOR))return false;
    if(!closest(el,CHROME_SELECTOR))return false;
    return matches(el,INTEGRATED_CONTAINER_SELECTOR)||!!closest(el,INTEGRATED_CONTAINER_SELECTOR);
  }
  function roleForPortable(el){
    if(!matches(el,'.dkds-portable-view'))return '';
    if(matches(el,'.is-floating,.is-global-floating'))return 'floating';
    if(matches(el,'[data-dkds-surface-kind="inspector"],[data-generic-panel="inspector"]'))return 'sidebar';
    return 'surface';
  }
  function resolveMaterialRole(el){
    if(!el?.matches)return '';
    const portable=roleForPortable(el);if(portable)return portable;
    if(chromeOwnedIntegrated(el))return '';
    if(matches(el,POPOVER_SELECTOR))return 'popover';
    if(matches(el,'.dkds-prime-floating,.dkds-memory-panel,.dkds-scientific-nav-tools,.zoom-panel,.floating-panel:not(.lan-web-panel):not(.update-panel):not([data-generic-panel])'))return 'floating';
    if(matches(el,'.dkds-dialog,.dkds-dialog-shell,.dkds-settings-dialog,.update-panel,.lan-web-panel,.import-workbench,.project-save-choice-card,.dkds-theme-settings-dialog'))return 'elevated';
    if(matches(el,CHROME_SELECTOR))return 'chrome';
    if(matches(el,'[data-dkds-surface-kind="inspector"],[data-generic-panel="inspector"],.left-panel,.plugin-sidebar-sections,.dkds-plugin-canvas-left,.dkds-plugin-canvas-right,.dkds-analysis-left,.dkds-analysis-right'))return 'sidebar';
    if(matches(el,'.analysis-page,[data-dkds-surface-kind="panel"],[data-generic-panel="group"],.dkds-group-plot,.dkds-group-plot-card,.dkds-plot-view,.dkds-ui-workspace,.dkds-plugin-workspace,.dkds-analysis-workbench,.super-workspace-page,.main-workspace,.dkds-plugin-canvas-center,.dkds-plugin-canvas-bottom,.dkds-analysis-primary-host,.dkds-plugin-sub-page-host,.dkds-surface,.dkds-chart-surface,.dkds-table-surface-host,.dkds-scientific-surface-host'))return 'surface';
    if(matches(el,'button,input,select,textarea,.dkds-field-control,.dkds-icon-button,.dkds-action-button,.toolbar-btn,.plugin-toolbar-btn'))return semanticControlOwnsPaint(el)?'':'control';
    return '';
  }
  function expectedRole(el){
    const component=resolveComponent(el);if(component?.definition?.expectedRole)return component.definition.expectedRole;
    return resolveMaterialRole(component?.target||el);
  }
  function assignElement(el){
    if(!el?.dataset)return false;
    let changed=false;
    let match=null;
    for(const definition of COMPONENTS){if(matches(el,definition.selector)){match={id:definition.id,definition,target:el};break;}}
    if(!match){if(el.dataset.dkdsComponentIdentityOwner==='core-runtime'){delete el.dataset.dkdsComponentIdentity;delete el.dataset.dkdsComponentIdentityOwner;delete el.dataset.dkdsComponentVariant;delete el.dataset.dkdsComponentVariantOwner;changed=true;}return changed;}
    if(match){
      if(el.dataset.dkdsComponentIdentity!==match.id){el.dataset.dkdsComponentIdentity=match.id;changed=true;}
      const variant=variantOf(el,match.id);
      if(variant){if(el.dataset.dkdsComponentVariant!==variant){el.dataset.dkdsComponentVariant=variant;changed=true;}}
      else if(el.dataset.dkdsComponentVariant&&el.dataset.dkdsComponentVariantOwner==='core-runtime'){delete el.dataset.dkdsComponentVariant;delete el.dataset.dkdsComponentVariantOwner;changed=true;}
      if(variant)el.dataset.dkdsComponentVariantOwner='core-runtime';
      el.dataset.dkdsComponentIdentityOwner='core-runtime';
    }
    return changed;
  }
  function assign(root=document){
    const scope=root?.querySelectorAll?root:document;let assigned=0;
    const nodes=[];if(root?.matches)nodes.push(root);for(const definition of COMPONENTS)for(const el of scope.querySelectorAll?.(definition.selector)||[])nodes.push(el);
    for(const el of new Set(nodes))if(assignElement(el))assigned++;
    return Object.freeze({assigned});
  }
  let observer=null;
  function start(){
    assign(document);
    if(observer||typeof MutationObserver!=='function')return;
    observer=new MutationObserver(records=>{for(const record of records){if(record.type==='attributes'){assignElement(record.target);continue;}for(const node of record.addedNodes||[])if(node?.nodeType===1)assign(node);}});
    observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','aria-selected','aria-pressed','aria-checked','data-state','data-selected','data-dkds-action-tone','data-dkds-surface-kind']});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.DKDSSemanticUI=Object.freeze({version:VERSION,components:()=>COMPONENTS.map(row=>({...row})),componentDefinition,resolveComponent,stateOf,variantOf,materialAreas:()=>MATERIAL_AREAS.map(row=>({...row})),resolveMaterialRole,expectedRole,semanticControlOwnsPaint,chromeOwnedIntegrated,assign,start,componentVariants:()=>[...COMPONENT_VARIANTS]});
})();
