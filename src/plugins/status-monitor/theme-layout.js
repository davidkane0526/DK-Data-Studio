(() => {
  'use strict';
  const SOURCE='src/plugins/status-monitor/theme-layout.js';
  const VERSION='1.1.0';

  const write=(dom,element,patch)=>dom.style(element,patch,{source:SOURCE});

  function positionThemePanel({dom,panel,anchor=null,anchorElement=null,viewport=globalThis}={}){
    if(!dom?.style||!panel||panel.classList?.contains?.('hidden'))return false;
    const box=panel.getBoundingClientRect?.();if(!box)return false;
    const innerWidth=Number(viewport?.innerWidth)||0,innerHeight=Number(viewport?.innerHeight)||0,margin=8;
    const doc=viewport?.document||globalThis.document;
    const tokenSource=viewport?.getComputedStyle?.(doc?.documentElement)?.getPropertyValue?.('--dkds-status-popover-gap');
    const statusGap=Math.max(0,Number.parseFloat(tokenSource)||8);
    const fallbackBottom='calc(var(--dkds-statusbar-height,28px) + var(--dkds-status-popover-gap,8px))';
    if(Number.isFinite(Number(anchor?.x))){
      const center=Number(anchor.x),left=Math.max(margin,Math.min(innerWidth-box.width-margin,center-box.width/2));
      const anchorTop=Number(anchor?.top),anchorBottom=Number(anchor?.bottom);
      write(dom,panel,{left:`${Math.round(left)}px`,right:'auto'});
      if(Number.isFinite(anchorTop)){
        const bottom=Math.max(margin,innerHeight-anchorTop+statusGap);
        write(dom,panel,{bottom:`${Math.round(bottom)}px`});
      }else if(Number.isFinite(anchorBottom)){
        const bottom=Math.max(margin,innerHeight-anchorBottom+Math.max(statusGap,Number(anchor?.height)||0));
        write(dom,panel,{bottom:`${Math.round(bottom)}px`});
      }else write(dom,panel,{bottom:fallbackBottom});
      return true;
    }
    if(!anchorElement?.getBoundingClientRect)return false;
    const a=anchorElement.getBoundingClientRect(),edgeAligned=(a.left+a.width/2)>innerWidth/2?a.right-box.width:a.left;
    const left=Math.max(margin,Math.min(innerWidth-box.width-margin,edgeAligned));
    write(dom,panel,{left:`${Math.round(left)}px`,right:'auto'});
    write(dom,panel,{bottom:fallbackBottom});
    return true;
  }

  globalThis.DKDSStatusMonitorThemeLayout=Object.freeze({VERSION,SOURCE,positionThemePanel});
})();
