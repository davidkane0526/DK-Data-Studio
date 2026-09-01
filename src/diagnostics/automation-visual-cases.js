(() => {
  if (window.DKDSAutomationVisualCases) return;

  function assert(condition,message){if(!condition)throw new Error(message||'Assertion failed.');}
  const rect=el=>el?.getBoundingClientRect?.()||{width:0,height:0};
  const visible=el=>{const r=rect(el),style=el?getComputedStyle(el):null;return !!el&&r.width>.5&&r.height>.5&&style?.display!=='none'&&style?.visibility!=='hidden';};
  const close=(actual,expected,tolerance=.75)=>Math.abs(Number(actual||0)-expected)<=tolerance;
  const transparent=value=>value==='transparent'||value==='rgba(0, 0, 0, 0)'||value==='rgba(0,0,0,0)';

  async function visualGeometryClosureSmoke(){
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));

    const dock=document.getElementById('inspectorDockSlot');
    assert(dock,'Inspector dock host is missing.');
    const dockStyle=getComputedStyle(dock);
    assert(transparent(dockStyle.backgroundColor),`Inspector dock host must remain transparent: ${dockStyle.backgroundColor}`);
    assert(dockStyle.boxShadow==='none',`Inspector dock host must not own a shadow: ${dockStyle.boxShadow}`);
    for(const side of ['Top','Right','Bottom','Left'])assert(close(parseFloat(dockStyle[`border${side}Width`]),0,.1),`Inspector dock host regained a ${side.toLowerCase()} border: ${dockStyle[`border${side}Width`]}`);

    const topbarActions=[...document.querySelectorAll('.topbar-primary .toolbar-btn')].filter(visible);
    assert(topbarActions.length>=3,'Topbar canonical actions are not available for geometry validation.');
    for(const button of topbarActions){const r=rect(button);assert(close(r.height,34),`Topbar action must be 34px high: ${String(button.textContent||'').trim()} = ${r.height.toFixed(2)}px`);}

    const shellGroups=[...document.querySelectorAll('.file-command-group,.primary-activity-cluster,.system-core-tools-group')].filter(visible);
    assert(shellGroups.length>=3,'Topbar visual groups are not available for envelope validation.');
    for(const group of shellGroups){const r=rect(group);assert(close(r.height,38),`Topbar group envelope must be 38px: ${group.className} = ${r.height.toFixed(2)}px`);}
    const fileGroup=document.querySelector('.file-command-group.dkds-segmented-command-group'),systemGroup=document.querySelector('.system-core-tools-group.dkds-segmented-command-group');
    assert(visible(fileGroup)&&visible(systemGroup),'File and system commands must both consume the canonical segmented command group.');
    const groupFingerprint=el=>{const style=getComputedStyle(el),r=rect(el);return {height:r.height,padding:[style.paddingTop,style.paddingRight,style.paddingBottom,style.paddingLeft],border:[style.borderTopWidth,style.borderTopStyle,style.borderTopColor],radius:style.borderRadius,shadow:style.boxShadow,background:style.backgroundColor};};
    const fileFingerprint=groupFingerprint(fileGroup),systemFingerprint=groupFingerprint(systemGroup);
    assert(close(fileFingerprint.height,systemFingerprint.height,.1)&&JSON.stringify(fileFingerprint.padding)===JSON.stringify(systemFingerprint.padding)&&JSON.stringify(fileFingerprint.border)===JSON.stringify(systemFingerprint.border)&&fileFingerprint.radius===systemFingerprint.radius&&fileFingerprint.shadow===systemFingerprint.shadow&&fileFingerprint.background===systemFingerprint.background,`File/System command group chrome diverged: ${JSON.stringify({file:fileFingerprint,system:systemFingerprint})}`);

    const presentationCommands=[...document.querySelectorAll('.dkds-presentation-command')].filter(visible);
    for(const button of presentationCommands){const r=rect(button),label=String(button.textContent||'').trim();assert(r.width>=47.5&&close(r.height,34),`Presenter command must be at least 48px wide and 34px high: ${label} = ${r.width.toFixed(2)}×${r.height.toFixed(2)}px`);if(label.length<=3)assert(r.width<=52,`Compact Presenter command should retain the 48px rhythm: ${label} = ${r.width.toFixed(2)}px`);else assert(r.width>=58,`Long Presenter command needs horizontal breathing room: ${label} = ${r.width.toFixed(2)}px`);}

    const Appearance=window.DKDSThemeComponentAppearance,Semantic=window.DKDSThemeSemanticRegistry;
    assert(Appearance?.version==='3.0.0','Component Appearance 3.0 contextual resolver unavailable.');
    assert(window.DKDSTheme?.contractVersion==='3.10.0','Theme Contract 3.10 contextual composition unavailable.');
    let groupedContextChecked=0,standaloneContextChecked=0,materialRoleCompositionChecked=0;
    for(const action of topbarActions){const info=Appearance.inspect?.(action);if(!info?.component)continue;
      if(info.componentContext==='grouped')groupedContextChecked++;
      if(info.componentContext==='standalone')standaloneContextChecked++;
      if(info.materialRole)materialRoleCompositionChecked++;
    }
    for(const button of presentationCommands){const info=Appearance.inspect?.(button);assert(info?.componentContext==='grouped',`Presenter command must resolve through grouped Component Context: ${String(button.textContent||'').trim()} = ${info?.componentContext||'missing'}`);assert(info?.materialRole==='chrome',`Presenter command must compose with chrome Material Role: ${String(button.textContent||'').trim()} = ${info?.materialRole||'missing'}`);}
    for(const button of presentationCommands.filter(button=>button.getAttribute('aria-pressed')==='true')){assert(button.dataset.dkdsComponentVariant==='active',`Visible Presenter surface must use active state, not selected navigation: ${String(button.textContent||'').trim()} = ${button.dataset.dkdsComponentVariant||'none'}`);}
    const importWorkbench=document.querySelector('.import-workbench');let workspaceModalChecked=false;
    if(importWorkbench){const role=window.DKDSThemeMaterialRenderer?.roleOf?.(importWorkbench)||Semantic?.materialRoleOf?.(importWorkbench)||'';const context=window.DKDSThemeMaterialRenderer?.materialContextOf?.(importWorkbench)||Semantic?.materialContextOf?.(importWorkbench)||'';assert(role==='elevated',`Import Workbench must remain elevated: ${role||'missing'}`);assert(context==='workspace-modal',`Import Workbench must resolve workspace-modal Material Context: ${context||'missing'}`);workspaceModalChecked=true;}

    const plotTools=document.getElementById('mainPlotTools'),legend=document.getElementById('mainLegendBar');
    for(const [label,el] of [['Main Plot Tools',plotTools],['Main Legend',legend]])if(visible(el)){
      const r=rect(el),style=getComputedStyle(el);assert(close(r.height,34),`${label} must be 34px high: ${r.height.toFixed(2)}px`);
      for(const side of ['Top','Right','Bottom','Left'])assert(close(parseFloat(style[`padding${side}`]),3,.1),`${label} must keep equal 3px inset: ${side}=${style[`padding${side}`]}`);
    }

    const navGeometry=el=>{const r=rect(el),style=getComputedStyle(el),buttons=[...el.querySelectorAll('button')].filter(visible),drag=el.querySelector('.dkds-scientific-nav-drag');return {width:r.width,height:r.height,padding:[style.paddingTop,style.paddingRight,style.paddingBottom,style.paddingLeft],gap:style.gap,buttons:buttons.map(button=>{const br=rect(button);return [br.width,br.height];}),drag:visible(drag)?[rect(drag).width,rect(drag).height]:null};};
    const curveNav=[...document.querySelectorAll('.dkds-scientific-surface-host > .dkds-scientific-nav-tools')].find(visible)||null;
    const chartNav=[...document.querySelectorAll('.dkds-scientific-chart-host > .dkds-scientific-nav-tools')].find(visible)||null;
    for(const [label,nav] of [['ScientificCurve',curveNav],['ChartRuntime',chartNav]])if(nav){
      const style=getComputedStyle(nav);assert(style.display==='flex',`${label} navigation must use the shared flex shell.`);assert(style.paddingTop==='1px'&&style.paddingRight==='2px'&&style.paddingBottom==='1px'&&style.paddingLeft==='2px',`${label} navigation must use the fused 1/2/1/2px inset: ${style.padding}`);assert(parseFloat(style.gap||'0')===0,`${label} navigation must not expose gaps between integrated actions: ${style.gap}`);assert(style.overflow==='hidden',`${label} navigation must clip child state paint to one outer silhouette: ${style.overflow}`);
      const buttons=[...nav.querySelectorAll('button')].filter(visible);assert(buttons.length>=3,`${label} navigation is missing canonical actions.`);for(const button of buttons){const r=rect(button),bs=getComputedStyle(button);assert(close(r.width,25)&&close(r.height,24),`${label} navigation action must be 25×24px: ${r.width.toFixed(2)}×${r.height.toFixed(2)}px`);assert(parseFloat(bs.borderRadius||'0')===0,`${label} navigation child action must not render an independent rounded card: ${bs.borderRadius}`);assert(bs.boxShadow==='none',`${label} navigation child action must not render independent depth: ${bs.boxShadow}`);}
      const drag=nav.querySelector('.dkds-scientific-nav-drag');if(visible(drag)){const r=rect(drag),ds=getComputedStyle(drag);assert(drag.tagName==='BUTTON',`${label} navigation drag handle must be a native ToolbarAction button so every Theme uses the same hover paint as sibling actions.`);assert(close(r.width,25)&&close(r.height,24),`${label} navigation drag handle must be 25×24px: ${r.width.toFixed(2)}×${r.height.toFixed(2)}px`);assert(parseFloat(ds.borderRadius||'0')===0&&ds.boxShadow==='none',`${label} navigation drag handle must remain fused with the control group.`);}
    }
    if(curveNav&&chartNav){const a=navGeometry(curveNav),b=navGeometry(chartNav);assert(JSON.stringify(a.padding)===JSON.stringify(b.padding)&&a.gap===b.gap,`ScientificCurve / ChartRuntime navigation chrome diverged: ${JSON.stringify({curve:a,chart:b})}`);}

    const portableButtons=[...document.querySelectorAll('.dkds-portable-header .dkds-portable-controls button')].filter(visible);
    for(const button of portableButtons){const r=rect(button);assert(close(r.height,26),`Portable header action must be 26px high: ${button.getAttribute('aria-label')||button.className} = ${r.height.toFixed(2)}px`);if(button.classList.contains('dkds-portable-icon-action'))assert(close(r.width,26),`Portable icon action must be 26×26px: ${r.width.toFixed(2)}×${r.height.toFixed(2)}px`);}
    const closeButtons=[...document.querySelectorAll('.dkds-panel-close-button')].filter(visible);
    for(const button of closeButtons){const r=rect(button);assert(close(r.width,26)&&close(r.height,26),`Shared close action must be 26×26px: ${button.getAttribute('aria-label')||button.className} = ${r.width.toFixed(2)}×${r.height.toFixed(2)}px`);}

    let workspaceGridChecked=false;
    if(matchMedia?.('(min-width: 1001px)')?.matches){
      const frames=[...document.querySelectorAll('.dkds-plugin-canvas-frame.has-canvas-left.has-canvas-right')].filter(visible);
      const frame=frames.find(el=>visible(el.querySelector('.dkds-plugin-canvas-bottom')))||null;
      if(frame){const left=frame.querySelector('.dkds-plugin-canvas-left'),center=frame.querySelector('.dkds-plugin-canvas-center'),right=frame.querySelector('.dkds-plugin-canvas-right'),bottom=frame.querySelector('.dkds-plugin-canvas-bottom');if([left,center,right,bottom].every(visible)){
        const l=rect(left),c=rect(center),r=rect(right),b=rect(bottom);workspaceGridChecked=true;
        assert(l.top<=c.top+1&&l.bottom>=b.bottom-1,`Persistent left data rail must span upper + bottom rows: left=${l.top.toFixed(1)}..${l.bottom.toFixed(1)} centerTop=${c.top.toFixed(1)} bottomEnd=${b.bottom.toFixed(1)}`);
        assert(r.bottom<=b.top+2,`Inspector/right rail must not continue through the bottom group row: rightBottom=${r.bottom.toFixed(1)} bottomTop=${b.top.toFixed(1)}`);
        assert(b.left>=l.right-1,`Bottom group must start after the persistent left data rail: leftRight=${l.right.toFixed(1)} bottomLeft=${b.left.toFixed(1)}`);
        assert(b.left<=c.left+1&&b.right>=r.right-1,`Bottom group must span center through the right edge: centerLeft=${c.left.toFixed(1)} bottom=${b.left.toFixed(1)}..${b.right.toFixed(1)} rightEdge=${r.right.toFixed(1)}`);
      }}
    }

    const themePanel=document.getElementById('dkdsThemePanel');
    if(themePanel)assert(!themePanel.querySelector('.dkds-portable-placement-trigger'),'Theme Picker must never expose PortableView placement chrome.');

    const statusBar=document.getElementById('statusBar'),statusItems=[...document.querySelectorAll('#statusBar .plugin-status-item')].filter(visible);
    if(visible(statusBar)){const barHeight=rect(statusBar).height;for(const item of statusItems){const h=rect(item).height;assert(h<=18.75,`Status-bar action hit region must stay inset at about 18px: ${String(item.textContent||'').trim()} = ${h.toFixed(2)}px`);assert(h<=barHeight-6,`Status-bar action must not touch the status chrome edges: item=${h.toFixed(2)} bar=${barHeight.toFixed(2)}`);}}

    let auroraHeaderGradientChecked=false;
    const headerEffect=document.documentElement.dataset.dkdsThemeHeaderEffect==='true',headers=[...document.querySelectorAll('[data-dkds-component-identity="panelHeader"],[data-dkds-component-identity="inspectorHeader"]')].filter(visible);
    for(const header of headers){const image=getComputedStyle(header).backgroundImage;if(headerEffect){assert(image&&image!=='none',`Theme semantic header lost its declared gradient: ${header.className||header.tagName}`);auroraHeaderGradientChecked=true;}else assert(!image||image==='none',`Neutral Theme semantic header retained a stale gradient: ${header.className||header.tagName} = ${image}`);}

    const trendLegends=[...document.querySelectorAll('.trend-card-legend')];
    for(const legendEl of trendLegends){const role=window.DKDSThemeMaterialRenderer?.roleOf?.(legendEl)||'';assert(role!=='surface',`Trend legend must remain child content, not a nested Material surface: ${role}`);assert(transparent(getComputedStyle(legendEl).backgroundColor),`Trend legend must remain transparent inside Trend Card: ${getComputedStyle(legendEl).backgroundColor}`);}

    let selectedProjectTabChecked=false;
    const selectedProjectTab=[...document.querySelectorAll('.project-tab[aria-selected="true"],.project-tab.selected')].find(visible)||null;
    if(selectedProjectTab){const style=getComputedStyle(selectedProjectTab);assert(style.color!==style.backgroundColor,'Selected project tab lost readable foreground contrast.');selectedProjectTabChecked=true;}
    let mainPlotEdgeChecked=false;
    const mainPlot=document.getElementById('resparMainPlotWrap');
    if(visible(mainPlot)){const style=getComputedStyle(mainPlot);assert(style.outlineStyle==='none'||parseFloat(style.outlineWidth||'0')===0,`Main scientific plot must not own a focus outline/frame: ${style.outline}`);for(const side of ['Top','Right','Bottom','Left'])assert(close(parseFloat(style[`border${side}Width`]||'0'),0,.1),`Main scientific plot must not own a decorative ${side.toLowerCase()} edge: ${style[`border${side}Width`]}`);mainPlotEdgeChecked=true;}

    return {dockTransparent:true,topbarActions:topbarActions.length,shellGroups:shellGroups.length,segmentedCommandParity:true,presentationCommands:presentationCommands.length,groupedContextChecked,standaloneContextChecked,materialRoleCompositionChecked,workspaceModalChecked,plotToolsChecked:visible(plotTools),legendChecked:visible(legend),scientificNavigation:{curve:!!curveNav,chart:!!chartNav,parityChecked:!!(curveNav&&chartNav)},portableHeaderActions:portableButtons.length,closeButtons:closeButtons.length,statusItems:statusItems.length,auroraHeaderGradientChecked,workspaceGridChecked,themePickerChecked:!!themePanel,trendLegends:trendLegends.length,selectedProjectTabChecked,mainPlotEdgeChecked};
  }

  async function themeRuntimePerformanceSmoke(){
    const material=window.DKDSThemeMaterialRenderer,appearance=window.DKDSThemeComponentAppearance,semantic=window.DKDSSemanticUI;
    assert(typeof material?.performance==='function','Material Renderer performance diagnostics unavailable.');
    assert(typeof appearance?.performance==='function','Component Appearance performance diagnostics unavailable.');
    assert(typeof semantic?.performance==='function','Semantic UI performance diagnostics unavailable.');
    const snapshot=()=>({material:material.performance(),appearance:appearance.performance(),semantic:semantic.performance()});
    const before=snapshot();
    await new Promise(resolve=>setTimeout(resolve,240));
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const after=snapshot(),delta={
      materialFlushes:after.material.flushes-before.material.flushes,
      materialAssignCalls:after.material.assignCalls-before.material.assignCalls,
      appearanceFlushes:after.appearance.flushes-before.appearance.flushes,
      appearanceAssignCalls:after.appearance.assignCalls-before.appearance.assignCalls,
      semanticFlushes:after.semantic.flushes-before.semantic.flushes,
      semanticAssignCalls:after.semantic.assignCalls-before.semantic.assignCalls
    };
    assert(after.material.pendingRoots===0&&!after.material.framePending,`Material assignment queue did not settle: ${JSON.stringify(after.material)}`);
    assert(after.appearance.pendingRoots===0&&!after.appearance.framePending,`Component Appearance queue did not settle: ${JSON.stringify(after.appearance)}`);
    assert(after.semantic.pendingRoots===0&&!after.semantic.framePending,`Semantic UI assignment queue did not settle: ${JSON.stringify(after.semantic)}`);
    assert(delta.materialFlushes<=4,`Material Renderer is churning while idle: ${JSON.stringify(delta)}`);
    assert(delta.appearanceFlushes<=4,`Component Appearance is churning while idle: ${JSON.stringify(delta)}`);
    assert(delta.semanticFlushes<=4,`Semantic UI is churning while idle: ${JSON.stringify(delta)}`);
    assert(delta.materialAssignCalls<=8,`Material Renderer rescanned too many roots while idle: ${JSON.stringify(delta)}`);
    assert(delta.appearanceAssignCalls<=8,`Component Appearance rescanned too many roots while idle: ${JSON.stringify(delta)}`);
    assert(delta.semanticAssignCalls<=8,`Semantic UI rescanned too many roots while idle: ${JSON.stringify(delta)}`);
    return {before,after,delta};
  }

  window.DKDSAutomationVisualCases=Object.freeze({visualGeometryClosureSmoke,themeRuntimePerformanceSmoke});
})();
