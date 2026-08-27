(() => {
  DKDSHostRecipes.register('shell-navigation', async ctx => {
    let queued=false;
    let mutationObserver=null;
    let resizeObserver=null;

    function shellElements(){
      return {
        primary:document.querySelector('#primaryActivityBar'),
        secondary:document.querySelector('#activityBar'),
        overflow:document.querySelector('#activityMoreMenu'),
        more:document.querySelector('#activityMoreBtn'),
        switcher:document.querySelector('.activity-switcher')
      };
    }

    function observeMutations(){
      const {primary,secondary,overflow}=shellElements();
      if(!mutationObserver||!primary||!secondary||!overflow)return;
      mutationObserver.observe(primary,{childList:true});
      mutationObserver.observe(secondary,{childList:true});
      mutationObserver.observe(overflow,{childList:true});
    }

    function refresh(){
      queued=false;
      const {primary,secondary,overflow,more,switcher}=shellElements();
      if(!primary||!secondary||!overflow||!more||!switcher)return;

      mutationObserver?.disconnect();
      try{
        const primaryButtons=[...primary.querySelectorAll(':scope > .activity-tab')];
        const secondaryButtons=[
          ...secondary.querySelectorAll(':scope > .activity-tab'),
          ...overflow.querySelectorAll(':scope > .activity-tab')
        ].sort((a,b)=>(Number(a.dataset.activityOrder)||100)-(Number(b.dataset.activityOrder)||100));

        for(const button of primaryButtons)button.classList.add('top-level-activity-tab');
        for(const button of secondaryButtons){
          button.classList.remove('top-level-activity-tab');
          secondary.appendChild(button);
        }

        const hasSecondary=secondaryButtons.length>0;
        switcher.classList.toggle('shell-secondary-empty',!hasSecondary);
        overflow.classList.add('hidden');
        more.classList.add('hidden');
        more.setAttribute('aria-expanded','false');
        if(!hasSecondary)return;

        const width=Math.max(0,Math.floor(switcher.getBoundingClientRect().width));
        if(!width)return;
        const widths=new Map(secondaryButtons.map(button=>[button,Math.ceil(button.getBoundingClientRect().width)+4]));
        const total=secondaryButtons.reduce((sum,button)=>sum+(widths.get(button)||0),0);
        if(total<=width)return;

        more.classList.remove('hidden');
        const moreWidth=Math.ceil(more.getBoundingClientRect().width)||86;
        const available=Math.max(0,width-moreWidth-4);
        const activeId=ctx.ui.activities.active?.()||'';
        const ranked=secondaryButtons.slice().sort((a,b)=>{
          const aa=a.dataset.activityId===activeId?1:0;
          const bb=b.dataset.activityId===activeId?1:0;
          return bb-aa||(Number(a.dataset.activityOrder)||100)-(Number(b.dataset.activityOrder)||100);
        });
        const keep=new Set();
        let used=0;
        for(const button of ranked){
          const buttonWidth=widths.get(button)||0;
          if((used+buttonWidth<=available)||keep.size===0){
            keep.add(button);
            used+=buttonWidth;
          }
        }
        for(const button of secondaryButtons)if(!keep.has(button))overflow.appendChild(button);
      }finally{
        observeMutations();
      }
    }

    function schedule(){
      if(queued)return;
      queued=true;
      requestAnimationFrame(refresh);
    }

    mutationObserver=new MutationObserver(schedule);
    observeMutations();
    if(window.ResizeObserver){
      resizeObserver=new ResizeObserver(schedule);
      for(const el of [
        document.querySelector('.topbar-primary'),
        document.querySelector('.workspace-commandbar'),
        document.querySelector('.primary-activity-cluster'),
        document.querySelector('.activity-switcher')
      ])if(el)resizeObserver.observe(el);
    }else window.addEventListener('resize',schedule,{passive:true});

    ctx.events.on('activity:changed',schedule);
    ctx.events.on('plugin:state-changed',schedule);
    ctx.events.on('plugins:ready',schedule);
    ctx.events.on('workspace:render',schedule);
    schedule();

    return {
      deactivate(){
        mutationObserver?.disconnect();
        resizeObserver?.disconnect();
        if(!window.ResizeObserver)window.removeEventListener('resize',schedule);
      }
    };
  });
})();
