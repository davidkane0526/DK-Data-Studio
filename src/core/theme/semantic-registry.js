(() => {
  'use strict';
  const VERSION='2.0.0';
  const ThemeContract=globalThis.DKDSThemeContract;
  if(!ThemeContract)throw new Error('DKDSThemeContract is required before DKDSSemanticUI.');
  const COMPONENT_VARIANTS=new Set(ThemeContract.componentVariants());
  const COMPONENT_CONTEXTS=new Set(ThemeContract.componentContexts?.()||['standalone','grouped']);
  const MATERIAL_CONTEXTS=new Set(ThemeContract.materialContexts?.()||['compact','panel','dialog','workspace-modal']);
  const COMPONENT_VARIANT_MAP=ThemeContract.componentVariantMap();
  const COMPONENTS=Object.freeze([
    Object.freeze({id:'inspectorHeader',label:'Inspector Header',expectedRole:'chrome',priority:100,selector:'[data-dkds-inspector-header],[data-dkds-surface-kind="inspector"] .dkds-surface-header,[data-dkds-surface-kind="inspector"] .dkds-portable-header,[data-generic-panel="inspector"] .floating-header,[data-generic-panel="inspector"] .dkds-portable-header,.inspector-panel .floating-header'}),
    Object.freeze({id:'panelHeader',label:'Panel Header',expectedRole:'chrome',priority:90,selector:'.dkds-surface-header,.dkds-plot-view-head,.dkds-group-plot-head,.analysis-chart-title,.dkds-chart-head,.trend-card-header,.floating-header,.dkds-portable-header,.dkds-analysis-prime-head'}),
    Object.freeze({id:'tab',label:'Tab',expectedRole:'',priority:80,selector:'.activity-tab:not(.top-level-activity-tab),.project-tab,[role="tab"]'}),
    Object.freeze({id:'toolbarAction',label:'Toolbar Action',expectedRole:'',priority:70,selector:'button,.toolbar-btn,.plugin-toolbar-btn,.primary-activity-bar .activity-tab.top-level-activity-tab,.dkds-analysis-nav-btn,.dkds-action-button,.dkds-icon-button,.dkds-plot-view-action,.dkds-portable-placement-trigger,.dkds-toolbar>button,.dkds-action-row>button,.dkds-surface-actions>button,.dkds-surface-header>button,.panel-header-actions>button,.trend-header-actions>button,.dkds-mode-group>button,.dkds-integrated-action-group button,.trend-layout-controls>button,.plugin-card-icon.plugin-super-selector'}),
    Object.freeze({id:'toolbarGroup',label:'Toolbar Group',expectedRole:'',priority:60,selector:'.toolbar-group,.system-core-tools-group,.dkds-toolbar,.dkds-action-row'}),
    Object.freeze({id:'menuItem',label:'Menu Item',expectedRole:'',priority:75,selector:'.plugin-menu-item,[role="menuitem"],[role="option"],.menu-item,.command-menu>button,.dkds-context-item,.dkds-list-item,.dkds-plot-legend-item,.dkds-legend-item,.main-legend-chip,.trend-legend-chip'}),
    Object.freeze({id:'chip',label:'Chip / Tag',expectedRole:'',priority:40,selector:'.dkds-chip,.plugin-capability-chip,.plugin-status-badge,.plugin-type-badge,.plugin-role-badge,.plugin-owned-badge,.dkds-summary-chip'}),
    Object.freeze({id:'statusBar',label:'Status Bar',expectedRole:'chrome',priority:100,selector:'#statusBar.statusbar,.statusbar'}),
    Object.freeze({id:'floatingChrome',label:'Floating Chrome',expectedRole:'floating',priority:30,selector:'.dkds-scientific-nav-tools,[data-dkds-floating-chrome]'}),
    Object.freeze({id:'field',label:'Field',expectedRole:'control',priority:20,selector:'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),select,textarea,.dkds-field-control'})
  ].sort((a,b)=>b.priority-a.priority));

  const MATERIAL_AREAS=Object.freeze([
    Object.freeze({id:'app-chrome',label:'App Shell / Chrome',role:'chrome',selector:'.topbar,.project-tabs-bar,#statusBar.statusbar'}),
    Object.freeze({id:'page-chrome',label:'Page / Workspace Headers',role:'chrome',selector:'.analysis-page-header,.dkds-analysis-header,.plugin-manager-header,.dkds-surface-header,.floating-header,.trend-card-header,.analysis-chart-title,.dkds-chart-head,.dkds-plot-view-head,.dkds-group-plot-head,.dkds-analysis-prime-head'}),
    Object.freeze({id:'sidebar',label:'Sidebar / Inspector Rail',role:'sidebar',selector:'.left-panel,.plugin-sidebar-sections,.dkds-analysis-left,.dkds-analysis-right,[data-dkds-surface-kind="inspector"].dkds-portable-view:not(.is-floating):not(.is-global-floating),[data-generic-panel="inspector"].dkds-portable-view:not(.is-floating):not(.is-global-floating),.dkds-material-role-sidebar'}),
    Object.freeze({id:'workspace',label:'Workspace / Persistent Pages',role:'surface',selector:'.analysis-page,.dkds-ui-workspace,.dkds-plugin-workspace,.dkds-analysis-workbench,.super-workspace-page,.main-workspace,.dkds-analysis-primary-host,.dkds-plugin-sub-page-host,.dkds-material-role-surface,.plugin-manager-card,.plugin-manager-stat,.plugin-manager-toolbar-card'}),
    Object.freeze({id:'scientific-content',label:'Scientific / Data Content',role:'surface',selector:'.dkds-chart-surface,.dkds-table-surface-host,.dkds-scientific-surface-host,.dkds-group-plot,.dkds-group-plot-card,.dkds-plot-view,.trend-card,.analysis-chart-card,.analysis-control-card,.analysis-large-plot,.analysis-table-wrap,.dkds-analysis-prime-panel'}),
    Object.freeze({id:'elevated',label:'Dialog / Settings / Elevated Panel',role:'elevated',selector:'.dkds-dialog,.dkds-dialog-shell,.dkds-settings-dialog,.update-panel,.lan-web-panel,.import-workbench,.project-save-choice-card,.dkds-theme-settings-dialog,.dkds-surface-elevated,.dkds-material-role-elevated'}),
    Object.freeze({id:'portable',label:'Docked Tool / Portable Panel',role:'surface',selector:'.dkds-portable-view:not(.is-floating):not(.is-global-floating):not([data-dkds-surface-kind="inspector"]):not([data-generic-panel="inspector"]),[data-dkds-surface-kind="panel"].dkds-portable-view:not(.is-floating):not(.is-global-floating),[data-generic-panel="group"].dkds-portable-view:not(.is-floating):not(.is-global-floating)'}),
    Object.freeze({id:'popover',label:'Context Menu / Dropdown / Tooltip / Popover',role:'popover',selector:'.command-menu,.dkds-context-menu,.dkds-tooltip,.dkds-core-tooltip,.dkds-d3-chart-tooltip,.hover-tip,.activity-more-menu,.context-overflow-menu,.range-action-menu,[role="menu"],[data-dkds-popover],.dkds-material-role-popover'}),
    Object.freeze({id:'control',label:'Independent Controls',role:'control',selector:'button,input,select,textarea,.dkds-field-control,.dkds-icon-button,.dkds-action-button,.toolbar-btn,.plugin-toolbar-btn,.dkds-material-role-control'}),
    Object.freeze({id:'scientific-floating',label:'ScientificPlot Floating Chrome',role:'floating',selector:'.dkds-scientific-nav-tools'}),
    Object.freeze({id:'floating',label:'Temporary Floating Surfaces',role:'floating',selector:'.dkds-prime-floating,.dkds-memory-panel,.zoom-panel,.dkds-portable-view.is-floating,.dkds-portable-view.is-global-floating,.floating-panel:not(.lan-web-panel):not(.update-panel):not([data-generic-panel]),.dkds-floating-surface,.dkds-material-role-floating:not(.dkds-portable-view)'})
  ]);

  const POPOVER_SELECTOR=MATERIAL_AREAS.find(row=>row.role==='popover')?.selector||'';
  const INTEGRATED_CONTAINER_SELECTOR='.dkds-integrated-action-group,.panel-header-actions,.trend-header-actions,.dkds-plot-view-actions,.dkds-chart-actions,.statusbar-command-cluster,.toolbar-group,.primary-activity-cluster,.system-core-tools-group,.dkds-mode-group,.dkds-scientific-nav-tools,[data-dkds-material-integrated="true"]';
  const SEMANTIC_CONTROL_PAINT_SELECTOR='.dkds-control-hit-region,.toolbar-btn,.activity-tab,.plugin-toolbar-btn,.primary,.strong,.danger-soft,.accent-soft,.selected,.active,[aria-pressed="true"],[aria-selected="true"],[aria-checked="true"],[data-state="active"],[data-selected="true"]';
  const CHROME_SELECTOR='.topbar,.project-tabs-bar,#statusBar.statusbar,.analysis-page-header,.dkds-analysis-header,.plugin-manager-header,.dkds-surface-header,.floating-header,.trend-card-header,.analysis-chart-title,.dkds-chart-head,.dkds-plot-view-head,.dkds-group-plot-head,.dkds-analysis-prime-head';

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
    if(component==='toolbarAction'&&matches(el,'.dkds-panel-close-button,.window-control-btn,.dkds-portable-icon-action,#lanWebMinimizeBtn,.dkds-theme-settings-inline')){const value=accept('quiet');if(value)return value;}
    const state=stateOf(el);if(state==='selected'||state==='active'){const value=accept(state);if(value)return value;}
    if(matches(el,'.primary,.strong')){const value=accept('primary');if(value)return value;}
    if(matches(el,'.danger,.danger-soft,.error,.is-error,[data-tone="danger"],[data-status="error"]')){const value=accept(component==='chip'?'danger':'destructive');if(value)return value;}
    if(matches(el,'.quiet,.is-excluded,.excluded,[data-tone="quiet"]')){const value=accept('quiet');if(value)return value;}
    if(matches(el,'.secondary,[data-tone="secondary"]')){const value=accept('secondary');if(value)return value;}
    if(component==='chip'){
      for(const value of ['success','warning','danger','info'])if(matches(el,`.${value},[data-status="${value}"]`)){const acceptedValue=accept(value);if(acceptedValue)return acceptedValue;}
      if(matches(el,'[data-status="error"]'))return accept('danger');
    }
    return '';
  }
  const CANONICAL_CONTROL_COMPONENTS=new Set(['toolbarAction','tab','menuItem','chip','field']);
  const semanticControlOwnsPaint=el=>{const component=resolveComponent(el);return !!component&&CANONICAL_CONTROL_COMPONENTS.has(component.id);};
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
    if(matches(el,'.dkds-prime-floating,.dkds-memory-panel,.dkds-scientific-nav-tools,.zoom-panel,.dkds-floating-surface,.floating-panel:not(.lan-web-panel):not(.update-panel):not([data-generic-panel])'))return 'floating';
    if(matches(el,'.dkds-dialog,.dkds-dialog-shell,.dkds-settings-dialog,.update-panel,.lan-web-panel,.import-workbench,.project-save-choice-card,.dkds-theme-settings-dialog,.dkds-surface-elevated'))return 'elevated';
    if(matches(el,CHROME_SELECTOR))return 'chrome';
    if(matches(el,'[data-dkds-surface-kind="inspector"],[data-generic-panel="inspector"],.left-panel,.plugin-sidebar-sections,.dkds-analysis-left,.dkds-analysis-right'))return 'sidebar';
    if(matches(el,'.analysis-page,[data-dkds-surface-kind="panel"],[data-generic-panel="group"],.dkds-group-plot,.dkds-group-plot-card,.dkds-plot-view,.dkds-ui-workspace,.dkds-plugin-workspace,.dkds-analysis-workbench,.super-workspace-page,.main-workspace,.dkds-analysis-primary-host,.dkds-plugin-sub-page-host,.dkds-surface,.dkds-chart-surface,.dkds-table-surface-host,.dkds-scientific-surface-host,.plugin-manager-card,.plugin-manager-stat,.plugin-manager-toolbar-card,.analysis-control-card,.analysis-large-plot,.analysis-table-wrap,.dkds-analysis-prime-panel'))return 'surface';
    if(matches(el,'button,input,select,textarea,.dkds-field-control,.dkds-icon-button,.dkds-action-button,.toolbar-btn,.plugin-toolbar-btn'))return semanticControlOwnsPaint(el)?'':'control';
    return '';
  }
  function componentContextOf(el){
    const target=resolveComponent(el)?.target||el;if(!target)return 'standalone';
    const explicit=String(target.dataset?.dkdsComponentContext||'').trim();if(COMPONENT_CONTEXTS.has(explicit))return explicit;
    const group=closest(target,INTEGRATED_CONTAINER_SELECTOR);return group&&group!==target?'grouped':'standalone';
  }
  function materialContextOf(el){
    if(!el)return '';
    const explicit=String(el.dataset?.dkdsMaterialContext||'').trim();if(MATERIAL_CONTEXTS.has(explicit))return explicit;
    if(matches(el,'.import-workbench'))return 'workspace-modal';
    if(matches(el,'.dkds-dialog,.dkds-dialog-shell,.dkds-settings-dialog,.dkds-theme-settings-dialog,.project-save-choice-card'))return 'dialog';
    if(matches(el,'.command-menu,.dkds-context-menu,.dkds-tooltip,.dkds-core-tooltip,.dkds-d3-chart-tooltip,.hover-tip,.activity-more-menu,.context-overflow-menu,.range-action-menu,.dkds-scientific-nav-tools,.dkds-theme-panel'))return 'compact';
    if(matches(el,'.floating-panel,.dkds-portable-view,.dkds-memory-panel,.lan-web-panel,.update-panel,.plugin-manager-card,.plugin-manager-toolbar-card'))return 'panel';
    return '';
  }
  function materialRoleFromMarker(el){
    const explicit=String(el?.dataset?.dkdsMaterialRole||el?.dataset?.dkdsMaterialAssignedRole||'').trim();if(explicit)return explicit;
    for(const role of ThemeContract.materialRoles())if(matches(el,`.dkds-material-role-${role}`))return role;
    return '';
  }
  function nearestMaterialRole(el){
    let node=resolveComponent(el)?.target||el,depth=0;
    while(node&&node!==document.documentElement&&depth<12){const marked=materialRoleFromMarker(node);if(marked)return marked;const inferred=resolveMaterialRole(node);if(inferred&&inferred!=='control')return inferred;node=node.parentElement;depth++;}
    return '';
  }
  function nearestMaterialContext(el){
    let node=resolveComponent(el)?.target||el,depth=0;
    while(node&&node!==document.documentElement&&depth<12){const context=materialContextOf(node);if(context)return context;node=node.parentElement;depth++;}
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
    if(!match){
      if(el.dataset.dkdsComponentIdentityOwner==='core-runtime'){delete el.dataset.dkdsComponentIdentity;delete el.dataset.dkdsComponentIdentityOwner;delete el.dataset.dkdsComponentVariant;delete el.dataset.dkdsComponentVariantOwner;delete el.dataset.dkdsComponentContext;delete el.dataset.dkdsComponentContextOwner;changed=true;}
      return changed;
    }
    const explicitIdentity=el.dataset.dkdsComponentIdentityOwner==='core-component'&&componentDefinition(el.dataset.dkdsComponentIdentity);
    const componentId=explicitIdentity?el.dataset.dkdsComponentIdentity:match.id;
    if(!explicitIdentity){
      if(el.dataset.dkdsComponentIdentity!==componentId){el.dataset.dkdsComponentIdentity=componentId;changed=true;}
      if(el.dataset.dkdsComponentIdentityOwner!=='core-runtime'){el.dataset.dkdsComponentIdentityOwner='core-runtime';changed=true;}
    }
    const context=componentContextOf(el);if(context){if(el.dataset.dkdsComponentContext!==context){el.dataset.dkdsComponentContext=context;changed=true;}if(el.dataset.dkdsComponentContextOwner!=='core-runtime'){el.dataset.dkdsComponentContextOwner='core-runtime';changed=true;}}
    const explicitVariant=el.dataset.dkdsComponentVariantOwner==='core-component'&&String(el.dataset.dkdsComponentVariant||'').trim();
    if(!explicitVariant){
      const variant=variantOf(el,componentId);
      if(variant){
        if(el.dataset.dkdsComponentVariant!==variant){el.dataset.dkdsComponentVariant=variant;changed=true;}
        if(el.dataset.dkdsComponentVariantOwner!=='core-runtime'){el.dataset.dkdsComponentVariantOwner='core-runtime';changed=true;}
      }else if(el.dataset.dkdsComponentVariant&&el.dataset.dkdsComponentVariantOwner==='core-runtime'){
        delete el.dataset.dkdsComponentVariant;delete el.dataset.dkdsComponentVariantOwner;changed=true;
      }
    }
    return changed;
  }
  const COMPONENT_SELECTOR=COMPONENTS.map(row=>row.selector).join(',');
  const PERF={assignCalls:0,documentAssignments:0,subtreeBatches:0,subtreeElements:0,flushes:0,scheduleCalls:0,mutationRecords:0,ignoredNonHtml:0};
  function assignSubtree(root=document){
    const scope=root?.querySelectorAll?root:document,nodes=[];if(root?.matches)nodes.push(root);for(const el of scope.querySelectorAll?.(COMPONENT_SELECTOR)||[])nodes.push(el);
    let assigned=0;for(const el of new Set(nodes)){PERF.subtreeElements++;if(assignElement(el))assigned++;}return assigned;
  }
  function assign(root=document){PERF.assignCalls++;if(root===document)PERF.documentAssignments++;return Object.freeze({assigned:assignSubtree(root)});}
  const htmlElement=el=>typeof HTMLElement==='undefined'||el instanceof HTMLElement;
  const pendingSemanticRoots=new Set();
  let semanticFrame=0;
  const requestFrame=fn=>(globalThis.requestAnimationFrame||((cb)=>setTimeout(cb,0)))(fn);
  function flushSemanticAssignments(){
    semanticFrame=0;PERF.flushes++;
    if(!pendingSemanticRoots.size)return;
    const roots=[...pendingSemanticRoots];pendingSemanticRoots.clear();
    for(const root of roots)assign(root);
  }
  function scheduleSemanticAssignment(root=document){
    PERF.scheduleCalls++;
    if(!root?.querySelectorAll)return;
    if(root===document){pendingSemanticRoots.clear();pendingSemanticRoots.add(document);}
    else if(!pendingSemanticRoots.has(document)){
      let candidate=root,covered=false;
      for(const existing of [...pendingSemanticRoots]){
        if(existing===candidate||existing?.contains?.(candidate)){covered=true;break;}
        if(candidate?.contains?.(existing)){pendingSemanticRoots.delete(existing);continue;}
        if(existing?.parentElement&&existing.parentElement===candidate?.parentElement){pendingSemanticRoots.delete(existing);candidate=candidate.parentElement;}
      }
      if(!covered)pendingSemanticRoots.add(candidate);
    }
    if(semanticFrame)return;
    semanticFrame=requestFrame(flushSemanticAssignments);
  }
  let observer=null;
  function start(){
    assign(document);
    if(observer||typeof MutationObserver!=='function')return;
    observer=new MutationObserver(records=>{
      PERF.mutationRecords+=records.length;const added=[];
      for(const record of records){if(record.type==='attributes'){if(htmlElement(record.target))assignElement(record.target);else PERF.ignoredNonHtml++;continue;}for(const node of record.addedNodes||[])if(node?.nodeType===1&&htmlElement(node))added.push(node);else if(node?.nodeType===1)PERF.ignoredNonHtml++;}
      if(added.length){const roots=[];for(const node of added){if(roots.some(root=>root===node||root.contains?.(node)))continue;for(let i=roots.length-1;i>=0;i--)if(node.contains?.(roots[i]))roots.splice(i,1);roots.push(node);}PERF.subtreeBatches++;for(const root of roots)assignSubtree(root);}
    });
    observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','aria-selected','aria-pressed','aria-checked','data-state','data-selected','data-dkds-action-tone','data-dkds-surface-kind','data-dkds-material-context','data-dkds-component-context']});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  const performanceSnapshot=()=>Object.freeze({...PERF,pendingRoots:pendingSemanticRoots.size,framePending:!!semanticFrame});
  window.DKDSSemanticUI=Object.freeze({version:VERSION,performance:performanceSnapshot,components:()=>COMPONENTS.map(row=>({...row})),componentDefinition,resolveComponent,stateOf,variantOf,materialAreas:()=>MATERIAL_AREAS.map(row=>({...row})),resolveMaterialRole,materialContextOf,nearestMaterialRole,nearestMaterialContext,componentContextOf,expectedRole,semanticControlOwnsPaint,chromeOwnedIntegrated,assign,schedule:scheduleSemanticAssignment,start,componentVariants:()=>[...COMPONENT_VARIANTS]});
})();
