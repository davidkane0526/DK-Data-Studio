(() => {
  'use strict';
  const VERSION='1.0.0';
  const ThemeContract=globalThis.DKDSThemeContract;
  const COMPONENTS=Object.freeze({
    inspectorHeader:Object.freeze({selector:'[data-dkds-inspector-header],.inspector-panel .floating-header,[data-generic-panel="inspector"] .floating-header',label:'Inspector Header'}),
    panelHeader:Object.freeze({selector:'.dkds-surface-header,.dkds-plot-view-head,.dkds-group-plot-head,.floating-header,.trend-card-header',label:'Panel Header'}),
    tab:Object.freeze({selector:'.activity-tab,.project-tab,[role="tab"],.dkds-analysis-nav-btn',label:'Tab'}),
    toolbarAction:Object.freeze({selector:'.toolbar-btn,.plugin-toolbar-btn,.dkds-action-button,.dkds-icon-button,.dkds-plot-view-action,.dkds-portable-placement-trigger,.dkds-toolbar>button,.dkds-action-row>button,.panel-header-actions>button,.trend-header-actions>button,.statusbar-command-cluster button',label:'Toolbar Action'}),
    toolbarGroup:Object.freeze({selector:'.toolbar-group,.system-core-tools-group,.dkds-toolbar,.dkds-action-row,.dkds-integrated-action-group,.statusbar-command-cluster',label:'Toolbar Group'}),
    menuItem:Object.freeze({selector:'.plugin-menu-item,[role="menuitem"],.menu-item,.command-menu>button',label:'Menu Item'}),
    chip:Object.freeze({selector:'.dkds-chip,.plugin-capability-chip,.plugin-status-badge,.plugin-type-badge,.dkds-summary-chip',label:'Chip / Tag'}),
    statusBar:Object.freeze({selector:'#statusBar.statusbar,.statusbar',label:'Status Bar'}),
    floatingChrome:Object.freeze({selector:'.dkds-scientific-nav-tools,.dkds-portable-header,.dkds-floating-surface',label:'Floating Chrome'}),
    field:Object.freeze({selector:'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),select,textarea,.dkds-field-control',label:'Field'})
  });
  const SLOT_KEYS=Object.freeze(ThemeContract?.componentAppearanceKeys?.()||[]);
  const FALLBACKS=Object.freeze({
    tab:{surface:'transparent',surfaceHover:'surfaceHover',surfaceActive:'activeSurface',surfaceSelected:'selectionSurface',text:'textSoft',textSoft:'muted',textActive:'activeText',textSelected:'selectionText',border:'transparent',borderHover:'controlBorder',borderActive:'selectionBorder',indicator:'accent'},
    toolbarAction:{surface:'transparent',surfaceHover:'controlHover',surfaceActive:'activeSurface',surfaceSelected:'selectionSurface',text:'text',textSoft:'textSoft',textActive:'activeText',textSelected:'selectionText',border:'transparent',borderHover:'controlBorder',borderActive:'selectionBorder',indicator:'accent'},
    toolbarGroup:{surface:'surfaceSoft',surfaceHover:'surfaceHover',surfaceActive:'activeSurface',surfaceSelected:'selectionSurface',text:'text',textSoft:'textSoft',textActive:'activeText',textSelected:'selectionText',border:'divider',borderHover:'controlBorder',borderActive:'selectionBorder',indicator:'accent'},
    panelHeader:{surface:'role.chrome.surface',surfaceHover:'surfaceHover',surfaceActive:'activeSurface',surfaceSelected:'selectionSurface',text:'role.chrome.text',textSoft:'muted',textActive:'activeText',textSelected:'selectionText',border:'role.chrome.border',borderHover:'controlBorder',borderActive:'selectionBorder',indicator:'accent'},
    inspectorHeader:{surface:'role.elevated.surface',surfaceHover:'surfaceHover',surfaceActive:'activeSurface',surfaceSelected:'selectionSurface',text:'role.elevated.text',textSoft:'muted',textActive:'activeText',textSelected:'selectionText',border:'role.elevated.border',borderHover:'controlBorder',borderActive:'selectionBorder',indicator:'accentAlt'},
    menuItem:{surface:'transparent',surfaceHover:'controlHover',surfaceActive:'activeSurface',surfaceSelected:'selectionSurface',text:'text',textSoft:'textSoft',textActive:'activeText',textSelected:'selectionText',border:'transparent',borderHover:'transparent',borderActive:'selectionBorder',indicator:'accent'},
    chip:{surface:'surfaceSoft',surfaceHover:'surfaceHover',surfaceActive:'activeSurface',surfaceSelected:'selectionSurface',text:'textSoft',textSoft:'muted',textActive:'activeText',textSelected:'selectionText',border:'transparent',borderHover:'controlBorder',borderActive:'selectionBorder',indicator:'accentAlt'},
    statusBar:{surface:'role.chrome.surface',surfaceHover:'surfaceHover',surfaceActive:'activeSurface',surfaceSelected:'selectionSurface',text:'role.chrome.text',textSoft:'muted',textActive:'activeText',textSelected:'selectionText',border:'role.chrome.border',borderHover:'controlBorder',borderActive:'selectionBorder',indicator:'accent'},
    floatingChrome:{surface:'role.floating.surface',surfaceHover:'surfaceHover',surfaceActive:'activeSurface',surfaceSelected:'selectionSurface',text:'role.floating.text',textSoft:'muted',textActive:'activeText',textSelected:'selectionText',border:'role.floating.border',borderHover:'controlBorder',borderActive:'selectionBorder',indicator:'accentAlt'},
    field:{surface:'controlBg',surfaceHover:'controlHover',surfaceActive:'controlBg',surfaceSelected:'controlBg',text:'text',textSoft:'muted',textActive:'text',textSelected:'text',border:'controlBorder',borderHover:'controlBorderHover',borderActive:'accent',indicator:'focus'}
  });
  const kebab=value=>String(value||'').replace(/[A-Z]/g,m=>`-${m.toLowerCase()}`);
  const cssVar=(component,slot)=>`--dkui-component-${kebab(component)}-${kebab(slot)}`;
  const tokenCssVar=token=>`--dkui-${kebab(token)}`;
  function componentOf(el){
    if(!el?.closest)return null;
    for(const [id,row] of Object.entries(COMPONENTS)){const target=el.closest(row.selector);if(target)return {id,target,row};}
    return null;
  }
  function stateOf(el){
    if(!el)return 'idle';
    if(el.matches?.(':disabled,[aria-disabled="true"],.disabled'))return 'disabled';
    if(el.matches?.('.selected,[aria-selected="true"],[aria-checked="true"]'))return 'selected';
    if(el.matches?.('.active,[aria-pressed="true"]'))return 'active';
    try{if(el.matches?.(':hover'))return 'hover';}catch{}
    return 'idle';
  }
  function stateSlots(state){
    if(state==='selected')return {surface:'surfaceSelected',text:'textSelected',border:'borderActive'};
    if(state==='active')return {surface:'surfaceActive',text:'textActive',border:'borderActive'};
    if(state==='hover')return {surface:'surfaceHover',text:'text',border:'borderHover'};
    if(state==='disabled')return {surface:'surface',text:'textSoft',border:'border'};
    return {surface:'surface',text:'text',border:'border'};
  }
  function consumption(){
    const components={};
    for(const [id,row] of Object.entries(COMPONENTS)){
      const slots={};for(const key of SLOT_KEYS)slots[key]=Object.freeze({path:`appearance.components.${id}.${key}`,fallback:FALLBACKS[id]?.[key]||''});
      components[id]=Object.freeze({label:row.label,selector:row.selector,slots:Object.freeze(slots)});
    }
    return Object.freeze({version:VERSION,contractVersion:globalThis.DKDSTheme?.contractVersion||ThemeContract?.version||'',components:Object.freeze(components),semantic:Object.freeze({primary:'accent',secondary:'accentAlt',info:'info',success:'success',warning:'warning',danger:'danger'}),scientific:Object.freeze({mode:'fallback-only',precedence:Object.freeze(['user-explicit','plugin-domain-explicit','project-saved','theme-fallback','core-default'])})});
  }
  function inspect(el){
    const match=componentOf(el);if(!match)return Object.freeze({component:'',state:'',managed:false,status:'UNMANAGED_COMPONENT_APPEARANCE'});
    const {id,target,row}=match,state=stateOf(target),slots=stateSlots(state),style=getComputedStyle(target),profile=globalThis.DKDSTheme?.preview?.()||{},authored=profile.appearance?.components?.[id]||{};
    const resolved={};
    for(const [kind,slot] of Object.entries(slots)){
      const variable=cssVar(id,slot),value=style.getPropertyValue(variable).trim(),source=Object.prototype.hasOwnProperty.call(authored,slot)?'theme':'core-fallback';
      resolved[kind]=Object.freeze({slot,path:`appearance.components.${id}.${slot}`,cssVar:variable,value,source,fallback:FALLBACKS[id]?.[slot]||''});
    }
    const indicatorVar=cssVar(id,'indicator');
    return Object.freeze({component:id,label:row.label,element:target,state,managed:true,status:'MANAGED',resolved:Object.freeze(resolved),indicator:Object.freeze({slot:'indicator',path:`appearance.components.${id}.indicator`,cssVar:indicatorVar,value:style.getPropertyValue(indicatorVar).trim(),source:Object.prototype.hasOwnProperty.call(authored,'indicator')?'theme':'core-fallback',fallback:FALLBACKS[id]?.indicator||''})});
  }
  function assign(root=document){
    let assigned=0;const scope=root?.querySelectorAll?root:document;
    for(const [id,row] of Object.entries(COMPONENTS))for(const el of scope.querySelectorAll?.(row.selector)||[]){if(el.dataset.dkdsComponentAppearance)continue;el.dataset.dkdsComponentAppearance=id;assigned++;}
    if(root?.matches)for(const [id,row] of Object.entries(COMPONENTS))if(!root.dataset.dkdsComponentAppearance&&root.matches(row.selector)){root.dataset.dkdsComponentAppearance=id;assigned++;break;}
    return Object.freeze({assigned});
  }
  function authoredUsage(){
    const preview=globalThis.DKDSTheme?.preview?.()||{},authored=preview.appearance?.components||{},contract=consumption(),rows=[];
    for(const [component,values] of Object.entries(authored))for(const slot of Object.keys(values||{})){const consumer=contract.components?.[component]?.slots?.[slot];rows.push(Object.freeze({component,slot,path:`appearance.components.${component}.${slot}`,status:consumer?'CONSUMED':'AUTHORED_BUT_UNUSED'}));}
    return Object.freeze(rows);
  }
  function scan(){
    const rows=[];for(const [id,row] of Object.entries(COMPONENTS)){const nodes=[...(document.querySelectorAll?.(row.selector)||[])],authored=globalThis.DKDSTheme?.preview?.()?.appearance?.components?.[id]||{};rows.push(Object.freeze({component:id,label:row.label,count:nodes.length,managed:nodes.length,authoredSlots:Object.keys(authored),status:nodes.length?'managed':'not-present'}));}
    const authored=authoredUsage(),authoredUnused=authored.filter(row=>row.status==='AUTHORED_BUT_UNUSED');
    return Object.freeze({version:VERSION,rows:Object.freeze(rows),authored,summary:Object.freeze({components:rows.length,present:rows.filter(r=>r.count).length,managed:rows.reduce((n,r)=>n+r.managed,0),authoredUnused:authoredUnused.length,ok:authoredUnused.length===0})});
  }
  let queued=false;const schedule=root=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;assign(root||document);});};
  function boot(){assign(document);try{const observer=new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes||[])if(node?.nodeType===1)schedule(node);});observer.observe(document.body,{subtree:true,childList:true});globalThis.addEventListener?.('beforeunload',()=>observer.disconnect(),{once:true});}catch{}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.DKDSThemeComponentAppearance=Object.freeze({version:VERSION,components:()=>Object.keys(COMPONENTS),componentOf:el=>componentOf(el)?.id||'',inspect,consumption,scan,assign,cssVar,authoredUsage});
})();
