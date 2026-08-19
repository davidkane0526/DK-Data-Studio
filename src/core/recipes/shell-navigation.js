(() => {
  DKDSHostRecipes.register('shell-navigation', async ctx => {
    let queued=false;
    let observer=null;
    let resizeObserver=null;

    ctx.ui.styles.add('shell-navigation',`
      .workspace-commandbar{min-width:0;flex:1 1 auto!important;gap:8px!important}
      .primary-activity-cluster{
        min-width:0;flex:1 1 auto!important;width:auto!important;max-width:none!important;
        display:flex!important;align-items:center!important;gap:8px!important;
        padding:3px!important;border:1px solid #e0e6ef!important;border-radius:10px!important;
        background:#fbfcfe!important;overflow:hidden!important;
      }
      .primary-activity-bar{
        display:flex!important;align-items:center;gap:4px;min-width:0;flex:0 0 auto!important;
        overflow-x:auto!important;overflow-y:hidden!important;scrollbar-width:none;
      }
      .primary-activity-bar::-webkit-scrollbar{display:none}
      .primary-activity-bar .activity-tab{flex:0 0 auto}
      .primary-activity-bar .activity-tab.top-level-activity-tab{
        min-height:34px!important;height:34px!important;padding:5px 11px!important;
        border:1px solid transparent!important;border-radius:8px!important;
        background:transparent!important;color:#566176!important;font-weight:680!important;
        box-shadow:none!important;
      }
      .primary-activity-bar .activity-tab.top-level-activity-tab:hover{
        border-color:#dce4f1!important;background:#fff!important;color:#273244!important;
      }
      .primary-activity-bar .activity-tab.top-level-activity-tab.active{
        border-color:#cbd8f7!important;background:#eef3ff!important;color:#244fc9!important;
        font-weight:760!important;box-shadow:none!important;
      }
      .context-commandbar{
        min-width:0!important;flex:1 1 auto!important;gap:4px!important;padding-left:9px!important;
        border-left:1px solid #dfe5ee!important;overflow:hidden!important;
      }
      .plugin-context-toolbar{min-width:0!important;flex:1 1 auto!important;gap:3px!important;overflow:hidden!important}
      .plugin-context-toolbar .plugin-toolbar-btn{
        min-height:34px!important;height:34px!important;padding:6px 9px!important;
        border:1px solid transparent!important;border-radius:7px!important;
        background:transparent!important;color:#667085!important;font-weight:560!important;
      }
      .plugin-context-toolbar .plugin-toolbar-btn:hover{
        border-color:#e1e6ee!important;background:#fff!important;color:#344054!important;
      }
      .plugin-context-toolbar .plugin-toolbar-btn.active,
      .plugin-context-toolbar .plugin-toolbar-btn[aria-pressed="true"]{
        border-color:#d5def3!important;background:#f2f5fb!important;color:#315efb!important;
      }
      .context-overflow-anchor>#contextOverflowBtn{
        min-height:34px!important;height:34px!important;border-color:transparent!important;
        background:#f4f6f9!important;color:#667085!important;
      }
      .activity-switcher.shell-secondary-empty{display:none!important}
      .activity-switcher{min-width:0!important;max-width:none!important;flex:0 1 auto!important}

      /* Width-density modes keep the hierarchy readable instead of squeezing every item equally. */
      .workspace-commandbar[data-nav-density="roomy"] .primary-activity-bar{gap:5px}
      .workspace-commandbar[data-nav-density="roomy"] .top-level-activity-tab{padding-left:13px!important;padding-right:13px!important}
      .workspace-commandbar[data-nav-density="roomy"] .context-commandbar{padding-left:11px!important}
      .workspace-commandbar[data-nav-density="balanced"] .top-level-activity-tab{padding-left:9px!important;padding-right:9px!important}
      .workspace-commandbar[data-nav-density="balanced"] .plugin-toolbar-btn{padding-left:8px!important;padding-right:8px!important}
      .workspace-commandbar[data-nav-density="compact"]{gap:5px!important}
      .workspace-commandbar[data-nav-density="compact"] .primary-activity-cluster{gap:5px!important}
      .workspace-commandbar[data-nav-density="compact"] .top-level-activity-tab{padding-left:7px!important;padding-right:7px!important}
      .workspace-commandbar[data-nav-density="compact"] .activity-icon{display:none!important}
      .workspace-commandbar[data-nav-density="compact"] .context-commandbar{padding-left:5px!important}
      .workspace-commandbar[data-nav-density="compact"] .plugin-toolbar-btn{padding-left:7px!important;padding-right:7px!important}

      /* Plugin manager uses the same text scale as the rest of the application. */
      .plugin-manager-stat span{font-size:var(--plugin-font-meta,11px)!important}
      .plugin-manager-search-wrap input{font-size:var(--plugin-font-body,12.5px)!important}
      .plugin-manager-toolbar-card>label{font-size:var(--plugin-font-meta,11px)!important}
      .plugin-manager-toolbar-card select{font-size:var(--plugin-font-body,12.5px)!important}
      .plugin-manager-visible-count{font-size:var(--plugin-font-meta,11px)!important}
      .plugin-manager-note{font-size:var(--plugin-font-meta,11px)!important;line-height:1.6!important}
      .plugin-card-title-line h3{font-size:var(--plugin-font-section,14px)!important;line-height:1.35!important}
      .plugin-card-id{font-size:var(--plugin-font-meta,11px)!important}
      .plugin-status-badge{font-size:var(--plugin-font-meta,11px)!important;padding:3px 7px!important}
      .plugin-switch-label{font-size:var(--plugin-font-meta,11px)!important}
      .plugin-card-description{font-size:var(--plugin-font-label,12px)!important;line-height:1.6!important;min-height:36px!important}
      .plugin-capability-chip{font-size:var(--plugin-font-meta,11px)!important;padding:4px 7px!important}
      .plugin-card-meta{font-size:var(--plugin-font-meta,11px)!important;gap:10px!important}
      .plugin-card-actions button{font-size:var(--plugin-font-meta,11px)!important;min-height:var(--plugin-control-height,32px)!important}
      .plugin-card-details{font-size:var(--plugin-font-meta,11px)!important;line-height:1.7!important}
      .plugin-manager-empty{font-size:var(--plugin-font-body,12.5px)!important}

      @media(max-width:820px){
        .primary-activity-cluster{overflow-x:auto!important;scrollbar-width:none}
        .primary-activity-cluster::-webkit-scrollbar{display:none}
        .primary-activity-bar{overflow:visible!important}
        .context-commandbar{min-width:120px!important;flex:1 0 120px!important}
      }
    `);

    function applyDensity(){
      const commandbar=document.querySelector('.workspace-commandbar');
      if(!commandbar)return;
      const width=commandbar.getBoundingClientRect().width;
      const density=width>=980?'roomy':width>=720?'balanced':'compact';
      commandbar.dataset.navDensity=density;
    }

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
