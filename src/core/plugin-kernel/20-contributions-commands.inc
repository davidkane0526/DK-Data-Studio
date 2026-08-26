  function registerActivity(pluginId,id,spec={}) {
    const definition=definitionById(pluginId);
    const meta=workspaceMeta(definition?.manifest);
    const role=String(spec.role||((meta.role==='top'&&(!meta.activity||meta.activity===id))?'top':'')).trim().toLowerCase();
    const value={id,label:id,order:100,icon:defaultPluginIcon(definition?.manifest),...spec,id,pluginId,role};
    // TOP plugins are always first-class workspace tabs. Whether a TOP opens
    // embedded or in its independent window is decided by the SUPER state.
    if(value.primary===undefined&&(role==='top'||value.openMode==='window'))value.primary=true;
    registerTypedContribution(pluginId,'ui.activities',id,value);
    addCleanup(pluginId,()=>{
      if(activeActivityId===id){
        activeActivityId=null;
        queueMicrotask(()=>chooseFallbackActivity());
      }else{
        renderActivityBar();
        refreshActivityVisibility();
      }
    });
    renderActivityBar();
    return value;
  }

  function sidebarHost() {
    return document.querySelector('[data-plugin-sidebar]')||document.querySelector('#pluginSidebarSections');
  }

  function addSidebarSection(pluginId,spec={}) {
    const mount=sidebarHost();
    if(!mount)throw new Error('Plugin sidebar mount not found.');
    const section=document.createElement('section');
    section.id=spec.elementId||`${pluginId.replace(/[.]/g,'-')}-${spec.id}-sidebar`;
    section.className=`plugin-sidebar-section ${spec.className||''}`.trim();
    section.dataset.pluginId=pluginId;
    section.dataset.pluginActivity=spec.activity||'';
    section.dataset.pluginOrder=String(Number(spec.order)||100);
    if(spec.html!==undefined)section.innerHTML=typeof spec.html==='function'?spec.html():String(spec.html);
    else if(spec.title)section.innerHTML=`<h3>${String(spec.title)}</h3>`;
    mount.appendChild(section);
    sortContributions(mount,'.plugin-sidebar-section');
    addCleanup(pluginId,()=>section.remove());
    spec.onMount?.({section,host});
    refreshActivityVisibility();
    return section;
  }

  function addMainOverlay(pluginId,spec={}) {
    const mount=document.querySelector(spec.mountSelector||'#mainPlotWrap');
    if(!mount)throw new Error(`Plugin main overlay mount not found: ${spec.mountSelector||'#mainPlotWrap'}`);
    const element=document.createElement(spec.tagName||'div');
    element.id=spec.elementId||`${pluginId.replace(/[.]/g,'-')}-${spec.id}-overlay`;
    element.className=`plugin-main-overlay ${spec.className||''}`.trim();
    element.dataset.pluginId=pluginId;
    element.dataset.pluginActivity=spec.activity||'';
    element.dataset.pluginOrder=String(Number(spec.order)||100);
    if(spec.html!==undefined)element.innerHTML=typeof spec.html==='function'?spec.html():String(spec.html);
    mount.appendChild(element);
    registerContribution(pluginId,'ui.mainOverlays',spec.id,{id:spec.id,element,activity:spec.activity||'',pluginId});
    addCleanup(pluginId,()=>element.remove());
    spec.onMount?.({element,host});
    refreshActivityVisibility();
    return element;
  }

  function createScopedButton(pluginId,spec,mountSelector,className) {
    const mount=document.querySelector(mountSelector);
    if(!mount)throw new Error(`Plugin mount not found: ${mountSelector}`);
    const button=document.createElement('button');
    button.type='button';
    button.id=spec.id||`${pluginId}__${spec.command||spec.label}`;
    button.className=className;
    button.textContent=spec.label||spec.id||pluginId;
    button.title=spec.title||'';
    button.dataset.pluginId=pluginId;
    button.dataset.pluginOrder=String(Number(spec.order)||100);
    button.dataset.pluginActivity=spec.activity||'';
    button.addEventListener('click',async event=>{
      try{
        if(spec.onClick)await spec.onClick(event);
        else if(spec.command)await runCommand(spec.command,{event});
      }catch(err){
        console.error(`[DKDS plugin action:${pluginId}]`,err);
        host?.setStatus?.(`插件 ${pluginId} 执行失败：${err.message}`);
      }
    });
    mount.appendChild(button);
    sortButtons(mount);
    addCleanup(pluginId,()=>button.remove());
    refreshActivityVisibility();
    return button;
  }

  function addMainTool(pluginId,spec) {
    return createScopedButton(pluginId,spec,'[data-plugin-main-tools]','plugin-main-tool-btn');
  }

  function addMenuItem(pluginId,spec={}) {
    const definition=definitionById(pluginId);const defaultMenu=pluginTypeForManifest(definition?.manifest||{})==='tool'?'tools':'export';
    const menu=String(spec.menu||defaultMenu);
    const mount=document.querySelector(`[data-plugin-menu="${menu}"]`);
    if(!mount)throw new Error(`Plugin menu mount not found: ${menu}`);
    const button=createScopedButton(pluginId,{...spec,menu},`[data-plugin-menu="${menu}"]`,'plugin-menu-item');
    button.addEventListener('click',()=>closeCommandMenu(button.closest('.command-menu')));
    const refresh=()=>{refreshExportMenuPresentation();refreshToolMenuPresentation();};
    queueMicrotask(refresh);addCleanup(pluginId,()=>queueMicrotask(refresh));
    return button;
  }

  function markToolbarSections(hostEl){
    if(!hostEl)return;
    const buttons=[...hostEl.querySelectorAll(':scope > .plugin-toolbar-btn')]
      .filter(b=>!b.classList.contains('plugin-activity-hidden'));
    let lastSection=null;
    for(const button of buttons){
      const section=button.dataset.pluginSection||'';
      const isStart=!!section&&section!==lastSection;
      button.classList.toggle('plugin-section-start',isStart);
      if(section)button.title=button.title||section;
      lastSection=section||lastSection;
    }
  }

  function closeContextOverflowPopup(){
    contextOverflowPopup?.dispose?.();
    contextOverflowPopup=null;
    document.querySelector('#contextOverflowBtn')?.setAttribute('aria-expanded','false');
  }

  function contextOverflowItems(container){
    const buttons=[...container.querySelectorAll(':scope > .plugin-toolbar-btn')]
      .filter(button=>!button.classList.contains('plugin-activity-hidden'));
    const items=[];
    let lastSection='';
    for(const button of buttons){
      const section=String(button.dataset.pluginSection||'');
      if(items.length&&section&&lastSection&&section!==lastSection)items.push({type:'separator'});
      items.push({
        id:button.id||`overflow-${items.length}`,
        label:String(button.textContent||button.title||'功能').trim(),
        enabled:()=>!button.disabled,
        onInvoke:()=>button.click()
      });
      if(section)lastSection=section;
    }
    return items;
  }

  function openContextOverflowPopup(button,container){
    if(!button||!container)return;
    closeContextOverflowPopup();
    const items=contextOverflowItems(container);
    if(!items.length)return;
    closeOtherCommandMenus();
    document.querySelectorAll('[aria-expanded="true"]').forEach(node=>{if(node!==button)node.setAttribute('aria-expanded','false');});
    const Menu=window.DKDSUI?.ContextMenu;
    if(!Menu){container.classList.remove('hidden');button.setAttribute('aria-expanded','true');return;}
    const rect=button.getBoundingClientRect();
    const menu=contextOverflowPopup=new Menu('core.shell',{onClose:()=>{button.setAttribute('aria-expanded','false');if(contextOverflowPopup===menu)contextOverflowPopup=null;}});
    button.setAttribute('aria-expanded','true');
    menu.open({x:Math.max(6,rect.right-184),y:rect.bottom+4,items});
  }

  function reflowContextToolbar() {
    closeContextOverflowPopup();
    const toolbar=document.querySelector('#pluginToolbarAnalysis');
    const overflow=document.querySelector('#contextOverflowMenu');
    const overflowBtn=document.querySelector('#contextOverflowBtn');
    const row=document.querySelector('.context-commandbar');
    if(!toolbar||!overflow||!overflowBtn||!row)return;

    // Return previous overflow items before measuring. Reflow must be stable
    // after resize, plugin activation, activity switches, and font changes.
    for(const child of [...overflow.querySelectorAll('.plugin-toolbar-btn')])toolbar.appendChild(child);
    sortButtons(toolbar);
    overflow.classList.add('hidden');
    overflowBtn.classList.add('hidden');

    const visible=[...toolbar.querySelectorAll('.plugin-toolbar-btn')]
      .filter(b=>!b.classList.contains('plugin-activity-hidden'));
    if(!visible.length){markToolbarSections(toolbar);return;}

    const available=Math.max(90,row.getBoundingClientRect().width);
    const widths=new Map(visible.map(b=>[b,Math.ceil(b.getBoundingClientRect().width)+3]));
    const total=visible.reduce((sum,b)=>sum+(widths.get(b)||0),0);
    if(total<=available){markToolbarSections(toolbar);return;}

    overflowBtn.classList.remove('hidden');
    const overflowWidth=Math.ceil(overflowBtn.getBoundingClientRect().width)||52;
    const target=Math.max(54,available-overflowWidth-4);

    // Priority decides which actions survive on the single-row command bar.
    // DOM/order still decides their final left-to-right sequence.
    const ranked=visible.slice().sort((a,b)=>(Number(b.dataset.pluginPriority)||0)-(Number(a.dataset.pluginPriority)||0)
      ||(Number(a.dataset.pluginOrder)||100)-(Number(b.dataset.pluginOrder)||100));
    const keep=new Set();
    let used=0;
    for(const b of ranked){
      const w=widths.get(b)||0;
      if(used+w<=target || keep.size===0){keep.add(b);used+=w;}
    }

    for(const b of visible)if(!keep.has(b))overflow.appendChild(b);
    if(!overflow.children.length)overflowBtn.classList.add('hidden');
    markToolbarSections(toolbar);
    markToolbarSections(overflow);
  }

  function isTypingTarget(target){
    if(!target)return false;
    const tag=String(target.tagName||'').toLowerCase();
    return ['input','textarea','select'].includes(tag)||!!target.isContentEditable;
  }

  function dispatchPluginShortcut(event){
    if(!event||event.defaultPrevented)return false;
    const rows=listContributions('ui.shortcuts')
      .filter(row=>!row.value?.activity||row.value.activity===activeActivityId)
      .sort((a,b)=>(Number(b.value?.priority)||0)-(Number(a.value?.priority)||0)||(Number(a.value?.order)||100)-(Number(b.value?.order)||100));
    for(const row of rows){
      const spec=row.value||{};
      if(isTypingTarget(event.target)&&!spec.allowTyping)continue;
      let match=false;
      try{match=typeof spec.match==='function'?!!spec.match(event,{host,activityId:activeActivityId,pluginId:row.pluginId}):false;}
      catch(err){console.error(`[DKDS shortcut match:${row.pluginId}/${row.id}]`,err);continue;}
      if(!match)continue;
      try{
        const handled=spec.handler?.({event,host,activityId:activeActivityId,pluginId:row.pluginId})!==false;
        if(handled){
          event.preventDefault?.();
          event.stopImmediatePropagation?.();
          event.stopPropagation?.();
          return true;
        }
      }catch(err){
        console.error(`[DKDS shortcut:${row.pluginId}/${row.id}]`,err);
        host?.setStatus?.(`插件快捷键执行失败：${err.message}`);
        event.preventDefault?.();
        event.stopImmediatePropagation?.();
        return true;
      }
    }
    return false;
  }

  const TRANSLUCENT_COMMAND_MENU_RECIPES=new Set(['thin-glass','soft-glass','liquid-glass']);
  function commandMenuPortalEnabled(){
    const recipe=String(globalThis.DKDSTheme?.recipePolicy?.()?.popover||'').trim();
    return TRANSLUCENT_COMMAND_MENU_RECIPES.has(recipe);
  }

  function commandMenuAnchorButton(menu){
    return commandMenuPortals.get(menu)?.button||menu?.closest?.('.menu-anchor')?.querySelector?.('[aria-expanded]')||null;
  }

  function shellCommandMenus(){
    const menus=new Set(document.querySelectorAll('.menu-anchor .command-menu'));
    document.querySelectorAll('.command-menu.dkds-command-menu-portal').forEach(menu=>menus.add(menu));
    return [...menus];
  }

  function positionCommandMenuPortal(button,menu){
    if(!button||!menu||menu.classList.contains('hidden'))return;
    const rect=button.getBoundingClientRect?.();if(!rect)return;
    const margin=8,gap=5,viewportWidth=Math.max(document.documentElement?.clientWidth||0,globalThis.innerWidth||0),viewportHeight=Math.max(document.documentElement?.clientHeight||0,globalThis.innerHeight||0);
    const menuRect=menu.getBoundingClientRect?.()||{width:0,height:0};
    const width=Math.max(178,menuRect.width||menu.offsetWidth||0),height=Math.max(0,menuRect.height||menu.offsetHeight||0);
    const alignLeft=!!button.closest?.('.split-command-anchor');
    let left=alignLeft?rect.left:rect.right-width;
    left=Math.max(margin,Math.min(left,Math.max(margin,viewportWidth-width-margin)));
    let top=rect.bottom+gap;
    if(height&&top+height>viewportHeight-margin&&rect.top-height-gap>=margin)top=rect.top-height-gap;
    top=Math.max(margin,Math.min(top,Math.max(margin,viewportHeight-Math.min(height,viewportHeight-margin*2)-margin)));
    menu.style.left=`${Math.round(left)}px`;menu.style.top=`${Math.round(top)}px`;menu.style.right='auto';
  }

  function portalCommandMenu(button,menu){
    if(!button||!menu||!commandMenuPortalEnabled())return false;
    let state=commandMenuPortals.get(menu);
    if(!state){
      const placeholder=document.createComment(`dkds-command-menu:${menu.id||'anonymous'}`);
      menu.parentNode?.insertBefore?.(placeholder,menu);
      state={placeholder,button};commandMenuPortals.set(menu,state);
    }else state.button=button;
    if(menu.parentNode!==document.body)document.body.appendChild(menu);
    menu.classList.add('dkds-command-menu-portal');
    // Resolve portal geometry while hidden from paint. Removing `.hidden` before
    // setting visibility allowed a transient frame at the menu's old flow
    // position on some Chromium builds, which looked like the menu flew upward.
    menu.style.visibility='hidden';
    menu.classList.remove('hidden');
    positionCommandMenuPortal(button,menu);
    menu.style.visibility='';
    return true;
  }

  function restoreCommandMenu(menu){
    if(!menu)return false;
    const state=commandMenuPortals.get(menu);
    if(state?.placeholder?.parentNode){
      state.placeholder.parentNode.insertBefore(menu,state.placeholder.nextSibling);
      state.placeholder.remove();
    }
    menu.classList.remove('dkds-command-menu-portal');
    for(const property of ['left','top','right','visibility'])menu.style.removeProperty(property);
    commandMenuPortals.delete(menu);
    return !!state;
  }

  function closeCommandMenu(menu){
    if(!menu)return false;
    const button=commandMenuAnchorButton(menu);
    menu.classList.add('hidden');
    button?.setAttribute?.('aria-expanded','false');
    restoreCommandMenu(menu);
    return true;
  }

  function closeOtherCommandMenus(except=null){
    shellCommandMenus().forEach(menu=>{if(menu!==except)closeCommandMenu(menu);});
  }

  function repositionPortaledCommandMenus(){
    document.querySelectorAll('.command-menu.dkds-command-menu-portal:not(.hidden)').forEach(menu=>positionCommandMenuPortal(commandMenuAnchorButton(menu),menu));
  }

  function bindShellOnce() {
    if(shellBound)return;
    shellBound=true;
    const overflowBtn=document.querySelector('#contextOverflowBtn');
    const overflowMenu=document.querySelector('#contextOverflowMenu');
    const activityMoreBtn=document.querySelector('#activityMoreBtn');
    const activityMoreMenu=document.querySelector('#activityMoreMenu');
    const toggle=(button,menu)=>{
      if(!button||!menu)return;
      button.addEventListener('click',event=>{
        event.stopPropagation();
        const willOpen=menu.classList.contains('hidden');
        closeOtherCommandMenus(menu);
        document.querySelectorAll('[aria-expanded="true"]').forEach(b=>{if(b!==button)b.setAttribute('aria-expanded','false');});
        if(willOpen){
          if(commandMenuPortalEnabled())portalCommandMenu(button,menu);
          else menu.classList.remove('hidden');
          button.setAttribute('aria-expanded','true');
        }else closeCommandMenu(menu);
      });
    };

    // Ordinary shell menus declare their target in HTML, keeping the shell
    // extensible without hard-coding one JavaScript branch per menu.
    document.querySelectorAll('[data-menu-target]').forEach(button=>{
      const menu=document.getElementById(button.dataset.menuTarget||'');
      toggle(button,menu);
    });
    if(overflowBtn&&overflowMenu){
      overflowBtn.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();openContextOverflowPopup(overflowBtn,overflowMenu);});
    }
    toggle(activityMoreBtn,activityMoreMenu);

    document.querySelectorAll('.menu-anchor .command-menu').forEach(menu=>{
      menu.addEventListener('click',event=>{
        if(event.target.closest('button')&&!event.target.closest('[data-menu-target]'))closeCommandMenu(menu);
      });
    });

    window.addEventListener?.('keydown',dispatchPluginShortcut,{capture:true});
    document.addEventListener?.('click',event=>{
      if(!event.target.closest('.menu-anchor')&&!event.target.closest('.command-menu.dkds-command-menu-portal')){
        closeOtherCommandMenus();
        document.querySelectorAll('.menu-anchor [aria-expanded]').forEach(b=>b.setAttribute('aria-expanded','false'));
      }
      if(!event.target.closest('.context-overflow-anchor')&&!event.target.closest('.dkds-context-menu'))closeContextOverflowPopup();
      if(!event.target.closest('.activity-more-anchor')&&!event.target.closest('.activity-more-menu'))closeCommandMenu(activityMoreMenu);
    });
    globalThis.addEventListener?.('dkds:theme-profile-changed',()=>{
      if(commandMenuPortalEnabled())return;
      document.querySelectorAll('.command-menu.dkds-command-menu-portal').forEach(menu=>restoreCommandMenu(menu));
    });
    if(window.ResizeObserver){
      shellResizeObserver=new ResizeObserver(()=>{reflowContextToolbar();reflowActivities();repositionPortaledCommandMenus();});
      const context=document.querySelector('.context-commandbar');
      const activity=document.querySelector('.activity-switcher');
      const topbar=document.querySelector('.topbar-primary');
      if(context)shellResizeObserver.observe(context);
      if(activity)shellResizeObserver.observe(activity);
      if(topbar)shellResizeObserver.observe(topbar);
    }else{
      window.addEventListener?.('resize',()=>{reflowContextToolbar();reflowActivities();repositionPortaledCommandMenus();},{passive:true});
    }
  }

  function toolbarHost(group) {
    return document.querySelector(`[data-plugin-toolbar="${group}"]`)
      || document.querySelector('#pluginToolbarAnalysis')
      || null;
  }

  function createToolbarButton(pluginId, spec) {
    const group = spec.group || 'analysis';
    const mount = toolbarHost(group);
    if (!mount) throw new Error(`Toolbar mount not found: ${group}`);

    const button = document.createElement('button');
    button.type = 'button';
    button.id = spec.id || `${pluginId}__${spec.command || spec.label}`;
    button.className = `toolbar-btn plugin-toolbar-btn ${spec.className || ''}`.trim();
    button.textContent = spec.label || spec.id || pluginId;
    button.title = spec.title || '';
    button.dataset.pluginId = pluginId;
    button.dataset.pluginOrder = String(Number(spec.order) || 100);
    button.dataset.pluginPriority = String(Number(spec.priority) || 0);
    button.dataset.pluginSection = String(spec.section || '');
    button.dataset.pluginActivity = spec.activity || '';

    button.addEventListener('click', async event => {
      try {
        // System toolbar commands operate on the active SUPER workspace. If a
        // transient system page such as Plugin Manager is covering it, restore
        // the plugin root first; the command can then open its PRIME/SUB view.
        if(spec.activity)host?.ensurePluginWorkspaceVisible?.(spec.activity);
        if (spec.onClick) await spec.onClick(event);
        else if (spec.command) await runCommand(spec.command, { event });
      } catch (err) {
        console.error(`[DKDS plugin toolbar:${pluginId}]`, err);
        host?.setStatus?.(`插件 ${pluginId} 执行失败：${err.message}`);
      }
    });

    const siblings = [...mount.querySelectorAll('.plugin-toolbar-btn')];
    const before = siblings.find(el => Number(el.dataset.pluginOrder || 100) > Number(spec.order || 100));
    mount.insertBefore(button, before || null);
    addCleanup(pluginId, () => button.remove());
    refreshActivityVisibility();
    queueMicrotask(reflowContextToolbar);
    return button;
  }

  function registerCommand(pluginId, id, handler, meta={}) {
    assertId(id, 'command id');
    const reg = getRegistry('commands');
    if (reg.has(id)) throw new Error(`Command already registered: ${id}`);
    reg.set(id, { id, handler, meta, pluginId });
    return addCleanup(pluginId, () => reg.delete(id));
  }

  async function runCommand(id, args={}) {
    const cmd = getRegistry('commands').get(id);
    if (!cmd) throw new Error(`Command not found: ${id}`);
    return await cmd.handler(args);
  }

  function registerContribution(pluginId, kind, id, value) {
    assertId(kind, 'registry kind');
    assertId(id, 'contribution id');
    const reg = getRegistry(kind);
    const key = `${pluginId}:${id}`;
    if (reg.has(key)) throw new Error(`Contribution already registered: ${kind}/${pluginId}:${id}`);
    reg.set(key, { pluginId, id, value });
    return addCleanup(pluginId, () => reg.delete(key));
  }

  const globallyUniqueRegistryKinds = new Set([
    'workflow.processors',
    'workflow.analyzers',
    'workflow.recipes',
    'charts.renderers',
    'data.importers',
    'analysis.providers',
    'peak.detectors',
    'ui.activities',
    'ui.inspectors',
    'ui.groupCharts',
    'ui.groupViews',
    'ui.mainViews',
    'ui.topWorkspaces'
  ]);

  function registerTypedContribution(pluginId, kind, id, value) {
    if (globallyUniqueRegistryKinds.has(kind)) {
      const existing = [...getRegistry(kind).values()].find(row => row.id === id);
      if (existing) {
        throw new Error(`Contribution id must be unique in ${kind}: ${id} is already owned by ${existing.pluginId}`);
      }
    }
    return registerContribution(pluginId, kind, id, value);
  }

  function listContributions(kind) {
    return [...getRegistry(kind).values()];
  }

  function providerCapabilityKind(kind){
    return kind==='workflow.processors'?'workflow.processor':kind==='workflow.analyzers'?'workflow.analyzer':kind==='charts.renderers'?'chart.renderer':'';
  }

  function registerProviderCapability(pluginId,kind,id,value){
    const capKind=providerCapabilityKind(kind);if(!capKind||!window.DKDSCapabilities)return;
    const methods={};
    if(typeof value?.run==='function')methods.run=value.run;
    if(typeof value?.buildSpec==='function')methods.buildSpec=value.buildSpec;
    if(!Object.keys(methods).length)return;
    const capId=`${capKind}:${id}`;
    window.DKDSCapabilities.register(pluginId,capId,{
      kind:capKind,title:value.name||id,version:value.version||'1.0.0',remote:true,
      metadata:{id,name:value.name||id,description:value.description||'',inputKinds:value.inputKinds||[],outputKinds:value.outputKinds||[],parameterSchema:value.parameterSchema||{fields:[]},pluginId},
      methods
    });
    addCleanup(pluginId,()=>window.DKDSCapabilities?.unregister?.(capId));
  }

  function capabilityBackedProviders(kind){
    const capKind=providerCapabilityKind(kind);if(!capKind)return [];
    return (window.DKDSCapabilities?.list?.(capKind)||[]).map(cap=>{
      const meta=cap.metadata||{};const id=String(meta.id||cap.id.split(':').slice(1).join(':'));
      const proxy=window.DKDSCapabilities.proxy(cap.id);
      const value={id,name:meta.name||cap.title,description:meta.description||'',version:cap.version||'1.0.0',pluginId:meta.pluginId||cap.owner,inputKinds:meta.inputKinds||[],outputKinds:meta.outputKinds||[],parameterSchema:meta.parameterSchema||{fields:[]},remote:true};
      if(cap.methods?.includes?.('run'))value.run=(payload)=>proxy.run(payload);
      if(cap.methods?.includes?.('buildSpec'))value.buildSpec=(payload)=>proxy.buildSpec(payload);
      return value;
    });
  }

  function listProvidersWithCapabilities(kind){
    const local=listContributions(kind).map(row=>row.value);const seen=new Set(local.map(row=>String(row.id)));
    for(const value of capabilityBackedProviders(kind))if(!seen.has(String(value.id))){local.push(value);seen.add(String(value.id));}
    return local;
  }
