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

    const presentationCommands=[...document.querySelectorAll('.dkds-presentation-command')].filter(visible);
    for(const button of presentationCommands){const r=rect(button);assert(close(r.width,48)&&close(r.height,34),`Presenter command must be 48×34px: ${String(button.textContent||'').trim()} = ${r.width.toFixed(2)}×${r.height.toFixed(2)}px`);}

    const selected=[...document.querySelectorAll('.topbar-primary [data-dkds-component-variant="selected"],.topbar-primary [aria-selected="true"],.topbar-primary [aria-pressed="true"]')].find(visible)||null;
    if(selected){const shadow=getComputedStyle(selected).boxShadow||'';assert(/0px 0px 0px 2px/.test(shadow),`Selected topbar action must use an exact 2px spread halo: ${shadow||'none'}`);}

    const plotTools=document.getElementById('mainPlotTools'),legend=document.getElementById('mainLegendBar');
    for(const [label,el] of [['Main Plot Tools',plotTools],['Main Legend',legend]])if(visible(el)){
      const r=rect(el),style=getComputedStyle(el);assert(close(r.height,34),`${label} must be 34px high: ${r.height.toFixed(2)}px`);
      for(const side of ['Top','Right','Bottom','Left'])assert(close(parseFloat(style[`padding${side}`]),3,.1),`${label} must keep equal 3px inset: ${side}=${style[`padding${side}`]}`);
    }

    const navGeometry=el=>{const r=rect(el),style=getComputedStyle(el),buttons=[...el.querySelectorAll('button')].filter(visible),drag=el.querySelector('.dkds-scientific-nav-drag');return {width:r.width,height:r.height,padding:[style.paddingTop,style.paddingRight,style.paddingBottom,style.paddingLeft],gap:style.gap,buttons:buttons.map(button=>{const br=rect(button);return [br.width,br.height];}),drag:visible(drag)?[rect(drag).width,rect(drag).height]:null};};
    const curveNav=[...document.querySelectorAll('.dkds-scientific-surface-host > .dkds-scientific-nav-tools')].find(visible)||null;
    const chartNav=[...document.querySelectorAll('.dkds-scientific-chart-host > .dkds-scientific-nav-tools')].find(visible)||null;
    for(const [label,nav] of [['ScientificCurve',curveNav],['ChartRuntime',chartNav]])if(nav){
      const style=getComputedStyle(nav);assert(style.display==='flex',`${label} navigation must use the shared flex shell.`);assert(style.paddingTop==='1px'&&style.paddingRight==='4px'&&style.paddingBottom==='1px'&&style.paddingLeft==='2px',`${label} navigation must use the shared 1/4/1/2px inset: ${style.padding}`);
      const buttons=[...nav.querySelectorAll('button')].filter(visible);assert(buttons.length>=3,`${label} navigation is missing canonical actions.`);for(const button of buttons){const r=rect(button);assert(close(r.width,25)&&close(r.height,24),`${label} navigation action must be 25×24px: ${r.width.toFixed(2)}×${r.height.toFixed(2)}px`);}
      const drag=nav.querySelector('.dkds-scientific-nav-drag');if(visible(drag)){const r=rect(drag);assert(close(r.width,25)&&close(r.height,24),`${label} navigation drag handle must be 25×24px: ${r.width.toFixed(2)}×${r.height.toFixed(2)}px`);}
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

    const trendLegends=[...document.querySelectorAll('.trend-card-legend')];
    for(const legendEl of trendLegends){const role=window.DKDSThemeMaterialRenderer?.roleOf?.(legendEl)||'';assert(role!=='surface',`Trend legend must remain child content, not a nested Material surface: ${role}`);assert(transparent(getComputedStyle(legendEl).backgroundColor),`Trend legend must remain transparent inside Trend Card: ${getComputedStyle(legendEl).backgroundColor}`);}

    return {dockTransparent:true,topbarActions:topbarActions.length,shellGroups:shellGroups.length,presentationCommands:presentationCommands.length,selectedHaloChecked:!!selected,plotToolsChecked:visible(plotTools),legendChecked:visible(legend),scientificNavigation:{curve:!!curveNav,chart:!!chartNav,parityChecked:!!(curveNav&&chartNav)},portableHeaderActions:portableButtons.length,closeButtons:closeButtons.length,workspaceGridChecked,themePickerChecked:!!themePanel,trendLegends:trendLegends.length};
  }

  window.DKDSAutomationVisualCases=Object.freeze({visualGeometryClosureSmoke});
})();
