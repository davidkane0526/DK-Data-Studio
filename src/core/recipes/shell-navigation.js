(() => {
  DKDSHostRecipes.register('shell-navigation', async ctx => {
    let queued=false;
    let observer=null;
    let resizeObserver=null;

    function normalizeTopLevel(){
      queued=false;
      const primary=document.querySelector('#primaryActivityBar');
      const secondary=document.querySelector('#activityBar');
      const overflow=document.querySelector('#activityMoreMenu');
      const switcher=document.querySelector('.activity-switcher');
      if(!primary||!secondary||!overflow||!switcher)return;

      const primaryButtons=[...primary.querySelectorAll(':scope > .activity-tab')];
      const secondaryButtons=[
        ...secondary.querySelectorAll(':scope > .activity-tab'),
        ...overflow.querySelectorAll(':scope > .activity-tab')
      ];
      for(const btn of primaryButtons)btn.classList.add('top-level-activity-tab');
      for(const btn of secondaryButtons)btn.classList.remove('top-level-activity-tab');

      const hasSecondary=secondaryButtons.length>0;
      switcher.classList.toggle('shell-secondary-empty',!hasSecondary);
      if(!hasSecondary){
        overflow.innerHTML='';
        const more=document.querySelector('#activityMoreBtn');
        more?.classList.add('hidden');
        more?.setAttribute('aria-expanded','false');
      }
    }

    function schedule(){
      if(queued)return;
      queued=true;
      requestAnimationFrame(normalizeTopLevel);
    }

    const primary=document.querySelector('#primaryActivityBar');
    const secondary=document.querySelector('#activityBar');
    const overflow=document.querySelector('#activityMoreMenu');
    if(primary&&secondary&&overflow){
      observer=new MutationObserver(schedule);
      observer.observe(primary,{childList:true});
      observer.observe(secondary,{childList:true});
      observer.observe(overflow,{childList:true});
    }
    if(window.ResizeObserver){
      resizeObserver=new ResizeObserver(schedule);
      for(const el of [document.querySelector('.workspace-commandbar'),document.querySelector('.primary-activity-cluster')]){
        if(el)resizeObserver.observe(el);
      }
    }else window.addEventListener('resize',schedule,{passive:true});

    ctx.events.on('activity:changed',schedule);
    ctx.events.on('plugin:state-changed',schedule);
    ctx.events.on('plugins:ready',schedule);
    schedule();

    return {
      deactivate(){
        observer?.disconnect();
        resizeObserver?.disconnect();
        if(!window.ResizeObserver)window.removeEventListener('resize',schedule);
      }
    };
    });
})();
