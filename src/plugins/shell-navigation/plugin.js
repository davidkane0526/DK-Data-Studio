(() => {
  DKDSPlugins.define({
    id:'builtin.shell-navigation',
    name:'Shell Navigation',
    version:'1.0.0',
    apiVersion:'1.3.0',
    description:'Unified top-level workspace navigation and readable plugin-management presentation.',
    source:'builtin',
    order:6,
    capabilities:['ui.styles','ui.activity']
  }, async ctx => {
    const TOP_LEVEL=['resonance','data-center','ter','pulse'];
    let queued=false;
    let observer=null;
    let resizeObserver=null;

    ctx.ui.styles.add('shell-navigation',`
      .workspace-commandbar{min-width:0;flex:1 1 auto!important;gap:7px!important}
      .primary-activity-cluster{min-width:0;flex:1 1 auto!important;width:auto!important;max-width:none!important;overflow:hidden!important}
      .primary-activity-bar{
        display:flex!important;align-items:center;gap:3px;min-width:0;flex:0 0 auto!important;
        overflow-x:auto!important;overflow-y:hidden!important;scrollbar-width:none;
      }
      .primary-activity-bar::-webkit-scrollbar{display:none}
      .primary-activity-bar .activity-tab{flex:0 0 auto}
      .primary-activity-bar .activity-tab.top-level-activity-tab{font-weight:650}
      .primary-activity-bar .activity-tab.top-level-activity-tab.active{font-weight:760}
      .context-commandbar{
        min-width:0!important;flex:1 1 auto!important;padding-left:6px!important;
        border-left:1px solid #e4e9f1!important;overflow:hidden!important;
      }
      .plugin-context-toolbar{min-width:0!important;flex:1 1 auto!important;overflow:hidden!important}
      .activity-switcher.shell-secondary-empty{display:none!important}
      .activity-switcher{min-width:0!important;max-width:none!important;flex:0 1 auto!important}

      .plugin-manager-stat span{font-size:12px!important}
      .plugin-manager-search-wrap input{font-size:13px!important}
      .plugin-manager-toolbar-card>label{font-size:12px!important}
      .plugin-manager-toolbar-card select{font-size:12px!important}
      .plugin-manager-visible-count{font-size:11px!important}
      .plugin-manager-note{font-size:11.5px!important;line-height:1.65!important}
      .plugin-card-title-line h3{font-size:16px!important;line-height:1.35!important}
      .plugin-card-id{font-size:10px!important}
      .plugin-status-badge{font-size:10px!important;padding:3px 7px!important}
      .plugin-switch-label{font-size:11px!important}
      .plugin-card-description{font-size:12px!important;line-height:1.65!important;min-height:38px!important}
      .plugin-capability-chip{font-size:10.5px!important;padding:4px 7px!important}
      .plugin-card-meta{font-size:10px!important;gap:10px!important}
      .plugin-card-actions button{font-size:11px!important;min-height:30px!important}
      .plugin-card-details{font-size:11px!important;line-height:1.75!important}
      .plugin-manager-empty{font-size:12px!important}

      @media(max-width:1160px){
        .primary-activity-bar .activity-tab{padding-left:7px!important;padding-right:7px!important}
        .context-commandbar{padding-left:4px!important}
      }
      @media(max-width:820px){
        .primary-activity-cluster{overflow-x:auto!important;scrollbar-width:none}
        .primary-activity-cluster::-webkit-scrollbar{display:none}
        .primary-activity-bar{overflow:visible!important}
        .context-commandbar{min-width:120px!important;flex:1 0 120px!important}
      }
    `);

    function normalizeTopLevel(){
      queued=false;
      const primary=document.querySelector('#primaryActivityBar');
      const secondary=document.querySelector('#activityBar');
      const overflow=document.querySelector('#activityMoreMenu');
      const switcher=document.querySelector('.activity-switcher');
      if(!primary||!secondary||!overflow||!switcher)return;

      observer?.disconnect();
      try{
        const all=[
          ...primary.querySelectorAll(':scope > .activity-tab'),
          ...secondary.querySelectorAll(':scope > .activity-tab'),
          ...overflow.querySelectorAll(':scope > .activity-tab')
        ];
        const unique=[...new Set(all)];
        const byId=new Map(unique.map(btn=>[btn.dataset.activityId||'',btn]));

        for(const id of TOP_LEVEL){
          const btn=byId.get(id);
          if(!btn)continue;
          btn.classList.add('top-level-activity-tab');
          primary.appendChild(btn);
        }

        const rest=unique
          .filter(btn=>!TOP_LEVEL.includes(btn.dataset.activityId||''))
          .sort((a,b)=>(Number(a.dataset.activityOrder)||100)-(Number(b.dataset.activityOrder)||100));
        for(const btn of rest){
          btn.classList.remove('top-level-activity-tab');
          secondary.appendChild(btn);
        }

        const orderedPrimary=TOP_LEVEL.map(id=>byId.get(id)).filter(Boolean);
        for(const btn of orderedPrimary)primary.appendChild(btn);

        switcher.classList.toggle('shell-secondary-empty',rest.length===0);
        if(rest.length===0){
          overflow.innerHTML='';
          const more=document.querySelector('#activityMoreBtn');
          more?.classList.add('hidden');
          more?.setAttribute('aria-expanded','false');
        }
      }finally{
        if(observer){
          observer.observe(primary,{childList:true});
          observer.observe(secondary,{childList:true});
          observer.observe(overflow,{childList:true});
        }
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
