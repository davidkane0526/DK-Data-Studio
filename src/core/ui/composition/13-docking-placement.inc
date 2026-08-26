
  function normalizePlacement(value){const p=String(value||'').toLowerCase();return ['home','sticky','left','right','bottom','main','float','global'].includes(p)?p:'home';}
  function refreshDockZoneState(){
    const zones=new Set();
    for(const name of ['left','right','bottom']){const zone=hostState.zones.get(name);if(zone)zones.add(zone);}
    for(const zone of document.querySelectorAll('.dkds-portable-zone'))zones.add(zone);
    for(const zone of zones){
      zone.classList.toggle('active',[...zone.children].some(child=>child.classList?.contains('dkds-portable-view')||child.classList?.contains('dkds-prime-portable')));
    }
  }
