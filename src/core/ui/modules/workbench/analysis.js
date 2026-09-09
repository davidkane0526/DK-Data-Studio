'use strict';
const {esc, resolveElement, resolveScopedElement, cleanupCall}=require('../foundation/shortcuts');
const {ActionGroup}=require('../interaction/context-actions');
const {normalizePlacement}=require('../layout/docking');
const {SplitController}=require('../layout/workspace');
const {GridController,GroupAreaController}=require('../grid/controller');

  class AnalysisWorkbench {
    constructor(scope,root,spec={}){
      this.scope=scope;this.owner=scope.owner;this.root=resolveElement(root);this.spec={...spec};
      this.primary=null;this.primes=new Map();this.subs=new Map();this.activeSub='';this.portables=new Map();this.grids=[];this.closed=false;
      this.resizeObserver=null;this.regionObserver=null;this.leftSplit=null;this.rightSplit=null;this.bottomSplit=null;
      if(!this.root)throw new Error('AnalysisWorkbench root not found.');
      this.root.classList.add('dkds-analysis-workbench-host');
      this.activityId=String(spec.activity||spec.id||'');
      this.build();
    }
    build(){
      const s=this.spec;
      this.root.innerHTML=`<section class="dkds-analysis-workbench" data-workbench-owner="${esc(this.owner)}">
        <header class="dkds-analysis-header dkds-material-role-chrome">
          <div class="dkds-analysis-heading"><h2></h2><div class="dkds-analysis-subtitle"></div></div>
          <div class="dkds-analysis-commandbar"></div>
          <button type="button" class="dkds-analysis-close">关闭窗口</button>
        </header>
        <nav class="dkds-analysis-nav" aria-label="分析工作区导航">
          <div class="dkds-analysis-nav-primary"></div><div class="dkds-analysis-nav-prime"></div><div class="dkds-analysis-nav-sub"></div>
        </nav>
        <div class="dkds-analysis-frame">
          <aside class="dkds-analysis-left dkds-material-role-sidebar" data-analysis-slot="left"></aside>
          <div class="dkds-analysis-left-resizer" role="separator" aria-orientation="vertical" data-dkds-tooltip="拖动调整左侧宽度；双击复位"></div>
          <main class="dkds-analysis-main dkds-material-role-surface" data-analysis-slot="main">
            <div class="dkds-analysis-primary-host"></div><div class="dkds-analysis-sub-host hidden"></div>
          </main>
          <div class="dkds-analysis-right-resizer" role="separator" aria-orientation="vertical" data-dkds-tooltip="拖动调整右侧宽度；双击复位"></div>
          <aside class="dkds-analysis-right dkds-material-role-sidebar" data-analysis-slot="right"></aside>
          <div class="dkds-analysis-bottom-resizer" role="separator" aria-orientation="horizontal" data-dkds-tooltip="拖动调整底部高度；双击复位"></div>
          <section class="dkds-analysis-bottom dkds-material-role-surface" data-analysis-slot="bottom"></section>
          <div class="dkds-analysis-overlay" data-analysis-slot="overlay"></div>
        </div>
        <div class="dkds-analysis-parking" aria-hidden="true"></div>
      </section>`;
      this.shell=this.root.firstElementChild;
      if(this.shell){this.shell.dataset.dkdsWorkspaceActivity=this.activityId;this.shell.dataset.dkdsWorkspaceSurfaceHost='1';}
      this.navigationElement=this.shell?.querySelector('.dkds-analysis-nav')||null;
      this.navigationHosts={
        primary:this.navigationElement?.querySelector('.dkds-analysis-nav-primary')||null,
        prime:this.navigationElement?.querySelector('.dkds-analysis-nav-prime')||null,
        sub:this.navigationElement?.querySelector('.dkds-analysis-nav-sub')||null
      };
      this.slots={
        left:this.shell.querySelector('[data-analysis-slot="left"]'),main:this.shell.querySelector('[data-analysis-slot="main"]'),
        right:this.shell.querySelector('[data-analysis-slot="right"]'),bottom:this.shell.querySelector('[data-analysis-slot="bottom"]'),
        overlay:this.shell.querySelector('[data-analysis-slot="overlay"]'),primary:this.shell.querySelector('.dkds-analysis-primary-host'),
        sub:this.shell.querySelector('.dkds-analysis-sub-host'),parking:this.shell.querySelector('.dkds-analysis-parking')
      };
      const frame=this.shell.querySelector('.dkds-analysis-frame');
      const leftHandle=this.shell.querySelector('.dkds-analysis-left-resizer');
      const rightHandle=this.shell.querySelector('.dkds-analysis-right-resizer');
      const bottomHandle=this.shell.querySelector('.dkds-analysis-bottom-resizer');
      if(s.resizableLeft===false)leftHandle?.remove();else if(frame&&leftHandle){
        this.leftSplit=new SplitController(this.scope,{id:`analysis-${String(s.activity||s.id||'main')}-left`,container:frame,handle:leftHandle,target:this.slots.left,cssVar:'--dkds-analysis-left-width',defaultSize:Number(s.leftWidth)||280,min:Number(s.leftMin)||210,reserve:Number(s.leftReserve)||520,mobileOverlay:true,mobileMaxRatio:.92});
      }
      if(s.resizableRight===false)rightHandle?.remove();else if(frame&&rightHandle){
        this.rightSplit=new SplitController(this.scope,{id:`analysis-${String(s.activity||s.id||'main')}-right`,container:frame,handle:rightHandle,target:this.slots.right,cssVar:'--dkds-analysis-right-width',defaultSize:Number(s.rightWidth)||390,min:Number(s.rightMin)||280,reserve:Number(s.rightReserve)||520,reverse:true,mobileOverlay:true,mobileMaxRatio:.92});
      }
      if(s.resizableBottom===false)bottomHandle?.remove();else if(frame&&bottomHandle){
        this.bottomSplit=new SplitController(this.scope,{id:`analysis-${String(s.activity||s.id||'main')}-bottom`,container:frame,handle:bottomHandle,target:this.slots.bottom,cssVar:'--dkds-analysis-bottom-height',axis:'y',defaultSize:Number(s.bottomHeight)||320,min:Number(s.bottomMin)||190,reserve:Number(s.bottomReserve)||260,reverse:true,mobileOverlay:true,mobileMaxRatio:.68});
      }
      const header=this.shell.querySelector('.dkds-analysis-header');
      if(s.header===false)header?.remove();else if(header){
        header.querySelector('h2').textContent=s.title||'';
        header.querySelector('.dkds-analysis-subtitle').textContent=s.subtitle||'';
        const close=header.querySelector('.dkds-analysis-close');
        if(s.closable===false)close?.remove();else if(close)close.onclick=()=>s.onClose?.();
        const commandHost=header.querySelector('.dkds-analysis-commandbar');
        if(Array.isArray(s.actions)&&s.actions.length&&commandHost)this.actions=new ActionGroup(this.owner,commandHost,{activity:s.activity,actions:s.actions});
        else commandHost?.remove();
      }
      this.syncRegions();
      if(window.MutationObserver){
        this.regionObserver=new MutationObserver(()=>this.syncRegions());
        for(const el of [this.slots.left,this.slots.right,this.slots.bottom])this.regionObserver.observe(el,{childList:true,subtree:true,attributes:true,attributeFilter:['data-dkds-mobile-active']});
      }
      if(window.ResizeObserver){this.resizeObserver=new ResizeObserver(()=>{if(document.documentElement?.classList?.contains('dkds-split-drag-active'))return;this.syncRegions();this.scope.emitResize?.({reason:'analysis-workbench-observer'});});this.resizeObserver.observe(this.shell);}
    }
    markSurfaceNode(node,row={},kind='prime'){
      if(!node?.dataset)return node;
      const id=String(row.id||row.surfaceId||'').trim();if(!id)return node;
      node.dataset.dkdsWorkspaceActivity=this.activityId;
      node.dataset.dkdsWorkspaceSurfaceId=id;
      node.dataset.dkdsWorkspaceSurfaceKind=String(kind||row.role||'');
      const purpose=String(row.presentationPurpose||'').trim();
      const presentationRole=String(row.presentationRole||'').trim();
      if(purpose)node.dataset.dkdsPresentationPurpose=purpose;else delete node.dataset.dkdsPresentationPurpose;
      if(presentationRole)node.dataset.dkdsPresentationRole=presentationRole;else delete node.dataset.dkdsPresentationRole;
      return node;
    }
    portableSlot(name,row=null){return this.slots[String(name)]||null;}
    layout(){return {slot:name=>this.portableSlot(name)};}
    setTitle(title,subtitle){const h=this.shell.querySelector('h2');if(h)h.textContent=String(title||'');const st=this.shell.querySelector('.dkds-analysis-subtitle');if(st&&subtitle!==undefined)st.textContent=String(subtitle||'');return this;}
    syncRegions(){
      if(!this.shell)return;
      const visibleChildren=el=>[...(el?.children||[])].some(node=>!node.classList?.contains('hidden')&&!node.classList?.contains('dkds-prime-hidden')&&node.dataset?.dkdsMobileActive!=='false');
      const left=visibleChildren(this.slots.left)&&!this.slots.left.classList.contains('hidden');
      const right=visibleChildren(this.slots.right);const bottom=visibleChildren(this.slots.bottom);
      this.shell.classList.toggle('has-left',left);this.shell.classList.toggle('has-right',right);this.shell.classList.toggle('has-bottom',bottom);
      this.shell.querySelector('.dkds-analysis-left-resizer')?.classList.toggle('active',left);
      this.shell.querySelector('.dkds-analysis-right-resizer')?.classList.toggle('active',right);
      this.shell.querySelector('.dkds-analysis-bottom-resizer')?.classList.toggle('active',bottom);
      return {left,right,bottom};
    }
    park(node){if(node&&this.slots.parking&&!this.slots.parking.contains(node))this.slots.parking.appendChild(node);return node;}
    mountPrimary(spec={}){
      if(spec.leftNode!==undefined||spec.leftHtml!==undefined)throw new Error('Plugin API 1.19 PRIMARY no longer accepts leftNode/leftHtml. Register a PRIME data-control/inspector surface instead.');
      cleanupCall(this.primary?.cleanup);
      this.primary={...spec,id:String(spec.id||'main')};
      this.markSurfaceNode(this.slots.primary,this.primary,'primary');
      const main=this.slots.primary;
      this.slots.left.replaceChildren();main.replaceChildren();
      if(spec.mainNode){const node=resolveElement(spec.mainNode,this.root)||spec.mainNode;if(node)main.appendChild(node);}
      else if(spec.mainHtml!==undefined)main.innerHTML=typeof spec.mainHtml==='function'?spec.mainHtml():String(spec.mainHtml||'');
      for(const node of [...main.children])node.classList?.add('dkds-analysis-primary-node');
      const ctx={workbench:this,scope:this.scope,main,root:this.shell};
      const cleanup=spec.mount?.(ctx);if(typeof cleanup==='function')this.primary.cleanup=cleanup;
      queueMicrotask(()=>this.scope.plotViews?.hydrate?.(this.slots.primary,{portableFactory:(id,node,pSpec)=>this.portable(id,node,pSpec)}));
      this.renderNav();this.syncRegions();this.resize('primary');return this;
    }
    registerSurface(spec={}){
      const role=String(spec.role||'').toLowerCase();
      if(role==='primary')return this.mountPrimary(spec);
      if(role==='prime')return this.registerPrime(spec);
      if(role==='sub')return this.registerSub(spec);
      throw new Error(`Unknown AnalysisWorkbench surface role: ${role||'(empty)'}`);
    }
    compose(spec={}){
      if(spec.primary)this.mountPrimary({...spec.primary,role:'primary'});
      for(const prime of spec.primes||[])this.registerPrime({...prime,role:'prime'});
      for(const sub of spec.subs||[])this.registerSub({...sub,role:'sub'});
      if(spec.openPrime)for(const entry of (Array.isArray(spec.openPrime)?spec.openPrime:[spec.openPrime]))this.openPrime(typeof entry==='string'?entry:entry.id,typeof entry==='string'?undefined:entry.placement);
      if(spec.openSub)this.openSub(typeof spec.openSub==='string'?spec.openSub:spec.openSub.id);
      return this;
    }
    registerPrime(spec={}){
      const id=String(spec.id||'').trim();if(!id)throw new Error('PRIME id required.');
      const row={role:'prime',placements:['inline','right','bottom','float'],defaultPlacement:'inline',...spec,id,container:null,portable:null,mounted:false,cleanup:null,actionGroup:null};
      const owned=spec.existingNode||resolveElement(spec.node,this.shell)||resolveElement(spec.node,this.root);if(owned?.dataset){owned.dataset.dkdsPrimeOwned='1';this.markSurfaceNode(owned,row,'prime');}
      this.primes.set(id,row);this.renderNav();if(spec.autoOpen===true)this.openPrime(id,spec.defaultPlacement);return row;
    }
    registerSub(spec={}){
      const id=String(spec.id||'').trim();if(!id)throw new Error('SUB id required.');
      const row={role:'sub',keepLeft:false,persistent:true,...spec,id,mounted:false,container:null,cleanup:null};this.subs.set(id,row);this.renderNav();return row;
    }
    renderNav(){
      const primaryHost=this.navigationHosts?.primary||null,primeHost=this.navigationHosts?.prime||null,subHost=this.navigationHosts?.sub||null;
      primaryHost?.replaceChildren();primeHost?.replaceChildren();subHost?.replaceChildren();
      const mode=String(this.spec.navigation||this.spec.navigationMode||'auto').toLowerCase();
      const subRows=[...this.subs.values()].sort((a,b)=>(a.order||100)-(b.order||100));
      // PRIMARY is a return route. In current-contract workspaces that only expose
      // PRIMARY + PRIME controls it must not become a useless same-name button.
      // A plugin may still request an explicit PRIMARY action with navigation='always'.
      const showPrimaryNavigation=!!this.primary&&(mode==='always'||subRows.length>0);
      if(showPrimaryNavigation&&primaryHost){const b=document.createElement('button');b.type='button';b.className='dkds-analysis-nav-btn';b.classList.toggle('active',!this.activeSub);b.textContent=this.primary.label||'主界面';b.onclick=()=>this.showPrimary();primaryHost.appendChild(b);}
      for(const row of [...this.primes.values()].filter(row=>row.embedded!==true).sort((a,b)=>(a.order||100)-(b.order||100))){const b=document.createElement('button');b.type='button';b.className='dkds-analysis-nav-btn dkds-analysis-prime-btn';b.classList.toggle('active',row.mounted);b.textContent=row.label||row.title||row.id;b.onclick=()=>this.togglePrime(row.id);primeHost?.appendChild(b);}
      for(const row of subRows){const b=document.createElement('button');b.type='button';b.className='dkds-analysis-nav-btn dkds-analysis-sub-btn';b.classList.toggle('active',this.activeSub===row.id);b.textContent=row.label||row.title||row.id;b.onclick=()=>this.openSub(row.id);subHost?.appendChild(b);}
      const nav=this.navigationElement;
      if(nav){
        const primaryCount=primaryHost?.children.length||0,primeCount=primeHost?.children.length||0,subCount=subHost?.children.length||0,total=primaryCount+primeCount+subCount;
        nav.classList.toggle('empty',mode==='hidden'||total===0);
      }
    }
    primeHome(row){
      if(row.inlineHost){const el=resolveElement(row.inlineHost,this.shell)||resolveElement(row.inlineHost,this.root);if(el)return el;}
      return this.slots.primary;
    }
    resolvePrimeNode(row){
      let container=row.existingNode||resolveElement(row.node,this.shell)||resolveElement(row.node,this.root);
      if(container){row.existingNode=container;return {container,existing:true};}
      container=document.createElement('section');container.className='dkds-analysis-prime-panel';container.dataset.primeId=row.id;
      container.innerHTML=`<div class="dkds-analysis-prime-head"><strong>${esc(row.title||row.label||row.id)}</strong><div class="dkds-analysis-prime-chrome"></div></div><div class="dkds-analysis-prime-body"></div>`;
      return {container,existing:false};
    }
    ensurePrime(row){
      if(row.mounted&&row.container)return row;
      const found=this.resolvePrimeNode(row);const container=found.container;row.existing=found.existing;
      container.classList.remove('dkds-prime-hidden');
      const home=this.primeHome(row);
      // PRIME close parks persistent existing nodes in the hidden parking slot.
      // Reopening must first return the node to its semantic home before a new
      // PortableView captures home geometry. Merely checking isConnected is not
      // enough because the parking slot is intentionally connected to the DOM.
      if(container.parentNode===this.slots.parking)home?.appendChild(container);
      else if(!container.isConnected)home?.appendChild(container);
      const body=found.existing?container:container.querySelector('.dkds-analysis-prime-body');
      const cleanup=row.mount?.({workbench:this,scope:this.scope,container:body,panel:container,slots:this.slots});row.cleanup=typeof cleanup==='function'?cleanup:null;
      row.container=container;row.mounted=true;
      const allowed=[...new Set((row.placements||['inline','right','bottom','float']).map(x=>x==='inline'?'home':normalizePlacement(x)))];
      const layout={slot:name=>name==='home'?this.primeHome(row):this.portableSlot(name,row)};
      const onPlacementChanged=info=>{
        try{row.onPlacementChanged?.(info);}catch(err){console.warn('[DKDS PRIME placement]',err);}
        this.syncRegions();for(const grid of this.grids)grid.apply?.();
        requestAnimationFrame(()=>{this.syncRegions();for(const grid of this.grids)grid.apply?.();this.resize('prime-placement');});
      };
      const lifecycle={closeSelector:row.closeSelector,onClose:()=>this.closePrime(row.id),collapseSelector:row.collapseSelector,onCollapse:info=>{try{row.onCollapse?.(info);}catch(err){console.warn('[DKDS PRIME collapse]',err);}this.resize('prime-collapse');}};
      const portableSpec=found.existing?{
        title:row.title||row.label||row.id,useTargetAsWrapper:row.useTargetAsWrapper!==false,chrome:row.chrome!==false,
        handle:row.handle||'.dkds-portable-handle,.dkds-surface-header,.analysis-chart-title,.dkds-analysis-prime-head',controlsHost:row.controlsHost,controlsPlacement:row.controlsPlacement||'start',
        placements:allowed,defaultPlacement:row.defaultPlacement==='inline'?'home':row.defaultPlacement,stateVersion:row.stateVersion,semanticKind:row.semanticKind||'panel',layout,onPlacementChanged,...lifecycle
      }:{title:row.title||row.label||row.id,useTargetAsWrapper:true,chrome:row.chrome!==false,handle:'.dkds-analysis-prime-head',controlsHost:'.dkds-analysis-prime-chrome',placements:allowed,defaultPlacement:row.defaultPlacement==='inline'?'home':row.defaultPlacement,stateVersion:row.stateVersion,semanticKind:row.semanticKind||'panel',layout,onPlacementChanged,...lifecycle};
      row.portable=this.scope.panels.create(`prime:${row.id}`,container,portableSpec);
      this.markSurfaceNode(row.portable?.wrapper||container,row,'prime');
      if(Array.isArray(row.actions)&&row.actions.length){
        const actionHost=resolveScopedElement(row.actionHost||row.actionsHost,container)||resolveScopedElement('[data-dkds-prime-actions]',container);
        if(actionHost){row.actionGroup?.dispose?.();row.actionGroup=new ActionGroup(this.owner,actionHost,{activity:this.spec.activity,actions:row.actions});}
      }
      this.scope.plotViews?.hydrate?.(container,{portableFactory:(id,node,pSpec)=>this.portable(id,node,pSpec)});
      this.syncRegions();return row;
    }
    openPrime(id,placement){const row=this.primes.get(String(id));if(!row)return false;this.ensurePrime(row);if(placement!==undefined&&placement!==null&&placement!=='')row.portable.place(placement==='inline'?'home':placement);this.renderNav();this.syncRegions();this.resize('prime-open');return true;}
    setPrimePlacement(id,placement){return this.openPrime(id,placement);}
    togglePrime(id){const row=this.primes.get(String(id));if(!row)return false;if(!row.mounted)return this.openPrime(id);this.closePrime(id);return true;}
    closePrime(id){
      const row=this.primes.get(String(id));if(!row?.mounted)return false;
      try{row.onClose?.({workbench:this,scope:this.scope,container:row.container,row});}catch(err){console.warn('[DKDS PRIME close]',err);}
      row.portable?.dispose?.();row.portable=null;row.actionGroup?.dispose?.();row.actionGroup=null;cleanupCall(row.cleanup);row.cleanup=null;
      if(row.container){row.container.classList.add('dkds-prime-hidden');this.park(row.container);}
      row.mounted=false;this.renderNav();this.syncRegions();for(const grid of this.grids)grid.apply?.();this.resize('prime-close');return true;
    }
    showPrimary(){
      const active=this.activeSub?this.subs.get(this.activeSub):null;if(active?.container)this.park(active.container);
      this.activeSub='';this.slots.primary.classList.remove('hidden');this.slots.sub.classList.add('hidden');this.slots.sub.replaceChildren();
      this.slots.left.classList.toggle('hidden',this.primary?.showLeft===false);this.renderNav();this.syncRegions();this.resize('primary-show');return true;
    }
    ensureSub(row){
      if(row.container)return row.container;
      let container=row.existingNode||resolveElement(row.node,this.shell)||resolveElement(row.node,this.root);
      if(container){row.existingNode=container;}else{container=document.createElement('section');container.className='dkds-analysis-sub-view';container.dataset.subId=row.id;if(row.html!==undefined)container.innerHTML=typeof row.html==='function'?row.html():String(row.html||'');}
      row.container=container;this.markSurfaceNode(container,row,'sub');return container;
    }
    openSub(id){
      const row=this.subs.get(String(id));if(!row)return false;
      if(this.activeSub&&this.activeSub!==row.id){const previous=this.subs.get(this.activeSub);if(previous?.container)this.park(previous.container);if(previous&&previous.persistent===false){cleanupCall(previous.cleanup);previous.cleanup=null;previous.container=null;previous.mounted=false;}}
      this.activeSub=row.id;this.slots.primary.classList.add('hidden');this.slots.sub.classList.remove('hidden');this.slots.left.classList.toggle('hidden',row.keepLeft!==true);this.slots.sub.replaceChildren();
      const container=this.ensureSub(row);this.slots.sub.appendChild(container);
      if(!row.mounted||row.remount===true){cleanupCall(row.cleanup);const cleanup=row.mount?.({workbench:this,scope:this.scope,container,slots:this.slots});row.cleanup=typeof cleanup==='function'?cleanup:null;row.mounted=true;}
      row.onShow?.({workbench:this,scope:this.scope,container,slots:this.slots});
      queueMicrotask(()=>this.scope.plotViews?.hydrate?.(container,{portableFactory:(id,node,pSpec)=>this.portable(id,node,pSpec)}));
      this.renderNav();this.syncRegions();this.resize('sub-open');return true;
    }
    portable(id,node,spec={}){
      const userPlacementChanged=spec.onPlacementChanged;
      const value=this.scope.panels.create(id,node,{...spec,layout:this.layout(),onPlacementChanged:info=>{
        try{userPlacementChanged?.(info);}catch(err){console.warn('[DKDS workbench portable placement]',err);}
        this.syncRegions();for(const grid of this.grids)grid.apply?.();
        requestAnimationFrame(()=>{this.syncRegions();for(const grid of this.grids)grid.apply?.();this.resize('portable-placement');});
      }});
      this.portables.set(String(id),value);this.syncRegions();return value;
    }
    grid(container,spec={}){const value=new GridController(this.scope,container,spec);this.grids.push(value);return value;}
    groupArea(container,spec={}){const value=new GroupAreaController(this.scope,container,spec);this.grids.push(value);return value;}
    surfaceState(){return {primary:this.primary?.id||'',activeSub:this.activeSub,primes:Object.fromEntries([...this.primes].map(([id,row])=>[id,{open:!!row.mounted,placement:row.portable?.wrapper?.dataset?.placement||''}]))};}
    resize(reason='resize'){this.syncRegions();this.scope.requestChartResize?.({reason:`analysis-workbench:${reason}`});return this;}
    dispose(){
      if(this.closed)return;this.closed=true;cleanupCall(this.primary?.cleanup);
      for(const row of this.primes.values()){row.actionGroup?.dispose?.();if(row.portable)row.portable.dispose?.();cleanupCall(row.cleanup);}
      for(const row of this.subs.values())cleanupCall(row.cleanup);
      for(const grid of this.grids)grid.dispose?.();for(const portable of this.portables.values())portable.dispose?.();
      this.actions?.dispose?.();this.regionObserver?.disconnect?.();this.resizeObserver?.disconnect?.();this.leftSplit?.dispose?.();this.rightSplit?.dispose?.();this.bottomSplit?.dispose?.();
      this.root.replaceChildren();this.root.classList.remove('dkds-analysis-workbench-host');
    }
  }

module.exports=Object.freeze({AnalysisWorkbench});
