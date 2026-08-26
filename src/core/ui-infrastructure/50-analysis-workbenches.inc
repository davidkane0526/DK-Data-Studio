  class AnalysisWorkbench {
    constructor(scope,root,spec={}){
      this.scope=scope;this.owner=scope.owner;this.root=resolveElement(root);this.spec={...spec};
      this.primary=null;this.primes=new Map();this.subs=new Map();this.activeSub='';this.portables=new Map();this.grids=[];this.closed=false;
      this.resizeObserver=null;this.regionObserver=null;this.leftSplit=null;this.rightSplit=null;this.bottomSplit=null;
      if(!this.root)throw new Error('AnalysisWorkbench root not found.');
      this.root.classList.add('dkds-analysis-workbench-host');
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
          <div class="dkds-analysis-left-resizer" role="separator" aria-orientation="vertical" title="拖动调整左侧宽度；双击复位"></div>
          <main class="dkds-analysis-main dkds-material-role-surface" data-analysis-slot="main">
            <div class="dkds-analysis-primary-host"></div><div class="dkds-analysis-sub-host hidden"></div>
          </main>
          <div class="dkds-analysis-right-resizer" role="separator" aria-orientation="vertical" title="拖动调整右侧宽度；双击复位"></div>
          <aside class="dkds-analysis-right dkds-material-role-sidebar" data-analysis-slot="right"></aside>
          <div class="dkds-analysis-bottom-resizer" role="separator" aria-orientation="horizontal" title="拖动调整底部高度；双击复位"></div>
          <section class="dkds-analysis-bottom dkds-material-role-surface" data-analysis-slot="bottom"></section>
          <div class="dkds-analysis-overlay" data-analysis-slot="overlay"></div>
        </div>
        <div class="dkds-analysis-parking" aria-hidden="true"></div>
      </section>`;
      this.shell=this.root.firstElementChild;
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
        for(const el of [this.slots.left,this.slots.right,this.slots.bottom])this.regionObserver.observe(el,{childList:true,subtree:false});
      }
      if(window.ResizeObserver){this.resizeObserver=new ResizeObserver(()=>{this.syncRegions();this.scope.emitResize?.({reason:'analysis-workbench-observer'});});this.resizeObserver.observe(this.shell);}
    }
    portableSlot(name,row=null){return this.slots[String(name)]||null;}
    layout(){return {slot:name=>this.portableSlot(name)};}
    setTitle(title,subtitle){const h=this.shell.querySelector('h2');if(h)h.textContent=String(title||'');const st=this.shell.querySelector('.dkds-analysis-subtitle');if(st&&subtitle!==undefined)st.textContent=String(subtitle||'');return this;}
    syncRegions(){
      if(!this.shell)return;
      const visibleChildren=el=>[...(el?.children||[])].some(node=>!node.classList?.contains('hidden')&&!node.classList?.contains('dkds-prime-hidden'));
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
      cleanupCall(this.primary?.cleanup);
      this.primary={...spec,id:String(spec.id||'main')};
      const left=this.slots.left,main=this.slots.primary;
      left.replaceChildren();main.replaceChildren();
      if(spec.leftNode){const node=resolveElement(spec.leftNode,this.root)||spec.leftNode;if(node)left.appendChild(node);}
      else if(spec.leftHtml!==undefined)left.innerHTML=typeof spec.leftHtml==='function'?spec.leftHtml():String(spec.leftHtml||'');
      if(spec.mainNode){const node=resolveElement(spec.mainNode,this.root)||spec.mainNode;if(node)main.appendChild(node);}
      else if(spec.mainHtml!==undefined)main.innerHTML=typeof spec.mainHtml==='function'?spec.mainHtml():String(spec.mainHtml||'');
      for(const node of [...left.children])node.classList?.add('dkds-analysis-left-node');
      for(const node of [...main.children])node.classList?.add('dkds-analysis-primary-node');
      const ctx={workbench:this,scope:this.scope,slots:this.slots,left,main,root:this.shell};
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
      const owned=spec.existingNode||resolveElement(spec.node,this.shell)||resolveElement(spec.node,this.root);if(owned?.dataset)owned.dataset.dkdsPrimeOwned='1';
      this.primes.set(id,row);this.renderNav();if(spec.autoOpen===true)this.openPrime(id,spec.defaultPlacement);return row;
    }
    registerSub(spec={}){
      const id=String(spec.id||'').trim();if(!id)throw new Error('SUB id required.');
      const row={role:'sub',keepLeft:false,persistent:true,...spec,id,mounted:false,container:null,cleanup:null};this.subs.set(id,row);this.renderNav();return row;
    }
    renderNav(){
      const primaryHost=this.shell.querySelector('.dkds-analysis-nav-primary'),primeHost=this.shell.querySelector('.dkds-analysis-nav-prime'),subHost=this.shell.querySelector('.dkds-analysis-nav-sub');
      primaryHost?.replaceChildren();primeHost?.replaceChildren();subHost?.replaceChildren();
      if(this.primary&&primaryHost){const b=document.createElement('button');b.type='button';b.className='dkds-analysis-nav-btn';b.classList.toggle('active',!this.activeSub);b.textContent=this.primary.label||'主界面';b.onclick=()=>this.showPrimary();primaryHost.appendChild(b);}
      for(const row of [...this.primes.values()].sort((a,b)=>(a.order||100)-(b.order||100))){const b=document.createElement('button');b.type='button';b.className='dkds-analysis-nav-btn dkds-analysis-prime-btn';b.classList.toggle('active',row.mounted);b.textContent=row.label||row.title||row.id;b.title='PRIME：可嵌入、固定或悬浮';b.onclick=()=>this.togglePrime(row.id);primeHost?.appendChild(b);}
      for(const row of [...this.subs.values()].sort((a,b)=>(a.order||100)-(b.order||100))){const b=document.createElement('button');b.type='button';b.className='dkds-analysis-nav-btn dkds-analysis-sub-btn';b.classList.toggle('active',this.activeSub===row.id);b.textContent=row.label||row.title||row.id;b.onclick=()=>this.openSub(row.id);subHost?.appendChild(b);}
      const nav=this.shell.querySelector('.dkds-analysis-nav');
      if(nav){
        const primaryCount=primaryHost?.children.length||0,primeCount=primeHost?.children.length||0,subCount=subHost?.children.length||0,total=primaryCount+primeCount+subCount;
        const mode=String(this.spec.navigation||this.spec.navigationMode||'auto').toLowerCase();
        const redundantSinglePrimary=total===1&&primaryCount===1;
        nav.classList.toggle('empty',mode==='hidden'||total===0||(mode!=='always'&&redundantSinglePrimary));
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
      if(!container.isConnected)this.primeHome(row)?.appendChild(container);
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
        title:row.title||row.label||row.id,useTargetAsWrapper:row.useTargetAsWrapper!==false,
        handle:row.handle||'.dkds-portable-handle,.dkds-surface-header,.analysis-chart-title,.dkds-analysis-prime-head',controlsHost:row.controlsHost,controlsPlacement:row.controlsPlacement||'start',
        placements:allowed,defaultPlacement:row.defaultPlacement==='inline'?'home':row.defaultPlacement,stateVersion:row.stateVersion,layout,onPlacementChanged,...lifecycle
      }:{title:row.title||row.label||row.id,useTargetAsWrapper:true,handle:'.dkds-analysis-prime-head',controlsHost:'.dkds-analysis-prime-chrome',placements:allowed,defaultPlacement:row.defaultPlacement==='inline'?'home':row.defaultPlacement,stateVersion:row.stateVersion,layout,onPlacementChanged,...lifecycle};
      row.portable=this.scope.panels.create(`prime:${row.id}`,container,portableSpec);
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
      row.mounted=false;this.renderNav();this.syncRegions();this.resize('prime-close');return true;
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
      row.container=container;return container;
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


  class PluginWorkspace extends AnalysisWorkbench {
    constructor(scope,root,spec={}){
      super(scope,root,{...spec});
      this.shell?.classList.add('dkds-plugin-workspace');if(this.shell)globalThis.DKDSMaterialSurface?.apply?.(this.shell,'surface');
      this.shell?.setAttribute('data-plugin-workspace-owner',this.owner);
      this.hostMode=String(spec.hostMode||'embedded');
      this.shell?.setAttribute('data-host-mode',this.hostMode);
      this.navigationPresentation='inline';
      this.primaryScrollMode=['contained','auto','safe'].includes(String(spec.primaryScroll||'safe'))?String(spec.primaryScroll||'safe'):'safe';
      this.canvasSlots=null;this.canvasObserver=null;this.canvasLeftSplit=null;this.canvasRightSplit=null;this.canvasBottomSplit=null;this.layoutGuardFrame=0;this.layoutGuardObserver=null;this.layoutGuardResizeObserver=null;this.layoutGuarded=new Map();this.layoutRisks=[];
      this.installCanvasDocking(spec);
      this.setPrimaryScrollMode(this.primaryScrollMode);
      this.installLayoutGuard();
      this.plotViewObserverCleanup=this.scope.plotViews?.observe?.(this.shell,{portableFactory:(id,node,pSpec)=>this.portable(id,node,pSpec),placements:['home','left','right','bottom','global'],defaultPlacement:'home',stateVersion:'plot-view-v2'});
    }
    installCanvasDocking(spec={}){
      const main=this.slots?.main,primary=this.slots?.primary,sub=this.slots?.sub;if(!main||!primary||!sub)return;
      const frame=document.createElement('div');frame.className='dkds-plugin-canvas-frame';
      frame.innerHTML=`<aside class="dkds-plugin-canvas-left dkds-material-role-sidebar" data-plugin-canvas-slot="left"></aside><div class="dkds-plugin-canvas-left-resizer" role="separator" aria-orientation="vertical"></div><div class="dkds-plugin-canvas-center dkds-material-role-surface" data-plugin-canvas-slot="main"></div><div class="dkds-plugin-canvas-right-resizer" role="separator" aria-orientation="vertical"></div><aside class="dkds-plugin-canvas-right dkds-material-role-sidebar" data-plugin-canvas-slot="right"></aside><div class="dkds-plugin-canvas-bottom-resizer" role="separator" aria-orientation="horizontal"></div><section class="dkds-plugin-canvas-bottom dkds-material-role-surface" data-plugin-canvas-slot="bottom"></section><div class="dkds-plugin-canvas-overlay" data-plugin-canvas-slot="overlay"></div>`;
      const center=frame.querySelector('[data-plugin-canvas-slot="main"]');center.append(primary);main.replaceChildren(frame,sub);
      sub.classList.add('dkds-plugin-sub-page-host');
      this.canvasFrame=frame;this.canvasSlots={main:center,left:frame.querySelector('[data-plugin-canvas-slot="left"]'),right:frame.querySelector('[data-plugin-canvas-slot="right"]'),bottom:frame.querySelector('[data-plugin-canvas-slot="bottom"]'),overlay:frame.querySelector('[data-plugin-canvas-slot="overlay"]')};
      const id=String(spec.activity||spec.id||'main');
      this.canvasLeftSplit=new SplitController(this.scope,{id:`plugin-${id}-canvas-left`,container:frame,handle:frame.querySelector('.dkds-plugin-canvas-left-resizer'),target:this.canvasSlots.left,cssVar:'--dkds-plugin-canvas-left-width',defaultSize:Number(spec.canvasLeftWidth)||320,min:Number(spec.canvasLeftMin)||240,reserve:Number(spec.canvasLeftReserve)||520,mobileOverlay:true,mobileMaxRatio:.92});
      this.canvasRightSplit=new SplitController(this.scope,{id:`plugin-${id}-canvas-right`,container:frame,handle:frame.querySelector('.dkds-plugin-canvas-right-resizer'),target:this.canvasSlots.right,cssVar:'--dkds-plugin-canvas-right-width',defaultSize:Number(spec.canvasRightWidth)||390,min:Number(spec.canvasRightMin)||280,reserve:Number(spec.canvasRightReserve)||520,reverse:true,mobileOverlay:true,mobileMaxRatio:.92});
      this.canvasBottomSplit=new SplitController(this.scope,{id:`plugin-${id}-canvas-bottom`,container:frame,handle:frame.querySelector('.dkds-plugin-canvas-bottom-resizer'),target:this.canvasSlots.bottom,cssVar:'--dkds-plugin-canvas-bottom-height',axis:'y',defaultSize:Number(spec.canvasBottomHeight)||320,min:Number(spec.canvasBottomMin)||190,reserve:Number(spec.canvasBottomReserve)||260,reverse:true,mobileOverlay:true,mobileMaxRatio:.68});
      frame.__dkdsCanvasSplits={left:this.canvasLeftSplit,right:this.canvasRightSplit,bottom:this.canvasBottomSplit};
      const sync=()=>this.syncCanvasRegions();
      if(window.MutationObserver){this.canvasObserver=new MutationObserver(sync);for(const el of [this.canvasSlots.left,this.canvasSlots.right,this.canvasSlots.bottom])this.canvasObserver.observe(el,{childList:true,subtree:false});}
      this.syncCanvasRegions();
    }
    installLayoutGuard(){
      const root=this.slots?.primary;if(!root)return;
      const schedule=()=>{if(this.layoutGuardFrame)return;const raf=globalThis.requestAnimationFrame||((fn)=>setTimeout(fn,16));this.layoutGuardFrame=raf(()=>{this.layoutGuardFrame=0;this.applyLayoutSafety();});};
      if(window.MutationObserver){this.layoutGuardObserver=new MutationObserver(schedule);this.layoutGuardObserver.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});}
      if(window.ResizeObserver){this.layoutGuardResizeObserver=new ResizeObserver(schedule);this.layoutGuardResizeObserver.observe(root);}
      this.scheduleLayoutSafety=schedule;schedule();
    }
    restoreGuardedElement(el){
      const saved=this.layoutGuarded.get(el);if(!saved)return;
      for(const axis of ['overflow-x','overflow-y']){const row=saved[axis];if(row?.value)el.style.setProperty(axis,row.value,row.priority||'');else el.style.removeProperty(axis);}
      el.classList.remove('dkds-layout-overflow-fallback','dkds-layout-containment-fallback');el.style.removeProperty('overscroll-behavior');this.layoutGuarded.delete(el);
    }
    applyLayoutSafety(){
      const root=this.slots?.primary;if(!root||!root.isConnected)return {recovered:0,guarded:0,risks:0};
      const rows=[root,...root.querySelectorAll('*')],isVisual=el=>el.matches?.('svg,canvas,img,video')||el.classList?.contains('dkds-scientific-surface-host')||!!el.closest?.('[data-dkds-chart-renderer],.dkds-scientific-chart-host,.dkds-scientific-curve-canvas,.dkds-plot-view-canvas');let recovered=0;const risks=[];
      const rectOverflow=el=>{const rect=el.getBoundingClientRect?.();if(!rect||rect.width<=0||rect.height<=0)return {x:0,y:0};let x=0,y=0;for(const child of el.children||[]){const style=getComputedStyle(child);if(style.position==='fixed'||style.display==='none'||style.visibility==='hidden')continue;const cr=child.getBoundingClientRect?.();if(!cr||cr.width<=0||cr.height<=0)continue;x=Math.max(x,cr.right-rect.right,rect.left-cr.left);y=Math.max(y,cr.bottom-rect.bottom,rect.top-cr.top);}return {x:Math.max(0,x),y:Math.max(0,y)};};
      const hasOverflow=el=>{if(!el?.isConnected)return false;const visual=rectOverflow(el);return el.scrollHeight>el.clientHeight+8||el.scrollWidth>el.clientWidth+8||visual.y>8||visual.x>8;};
      for(const el of [...this.layoutGuarded.keys()])if(!hasOverflow(el))this.restoreGuardedElement(el);
      for(const el of rows){
        if(!el?.getBoundingClientRect||isVisual(el))continue;
        const cls=String(el.className||''),nearRoot=el.parentElement===root||el.parentElement?.parentElement===root,semantic=el===root||nearRoot||/(?:^|[-_])(root|main|content|card|panel|workbench|page|body|section|grid|results?|controls?|shell|layout|view)(?:$|[-_])/i.test(cls);if(!semantic)continue;
        const style=getComputedStyle(el),visual=rectOverflow(el),verticalOverflow=el.scrollHeight>el.clientHeight+8||visual.y>8,horizontalOverflow=el.scrollWidth>el.clientWidth+8||visual.x>8;if(!verticalOverflow&&!horizontalOverflow)continue;
        const unsafeY=verticalOverflow&&['hidden','clip','visible'].includes(style.overflowY),unsafeX=horizontalOverflow&&['hidden','clip','visible'].includes(style.overflowX);
        const risk={element:el.id||String(el.className||el.tagName||'').slice(0,120),tag:String(el.tagName||'').toLowerCase(),overflowX:style.overflowX,overflowY:style.overflowY,clientWidth:Number(el.clientWidth)||0,clientHeight:Number(el.clientHeight)||0,scrollWidth:Number(el.scrollWidth)||0,scrollHeight:Number(el.scrollHeight)||0,containmentX:Math.ceil(visual.x),containmentY:Math.ceil(visual.y),unsafeX,unsafeY,recovered:false};risks.push(risk);
        if(!unsafeY&&!unsafeX)continue;
        if(!this.layoutGuarded.has(el)){
          this.layoutGuarded.set(el,{
            'overflow-x':{value:el.style.getPropertyValue('overflow-x'),priority:el.style.getPropertyPriority('overflow-x')},
            'overflow-y':{value:el.style.getPropertyValue('overflow-y'),priority:el.style.getPropertyPriority('overflow-y')}
          });
          console.warn('[DKDS PluginWorkspace layout recovery]',{owner:this.owner,activity:this.spec?.activity||'',...risk});
        }
        // Containment is a Core guarantee: plugin content may be imperfect, but
        // it may never paint through its semantic card/panel or become unreachable.
        // We prefer a local scroll container because growing an inner grid can
        // recursively enlarge the window and destabilize resize observers.
        if(unsafeY)el.style.setProperty('overflow-y','auto','important');if(unsafeX)el.style.setProperty('overflow-x','auto','important');el.style.setProperty('overscroll-behavior','contain','important');el.classList.add('dkds-layout-overflow-fallback','dkds-layout-containment-fallback');risk.recovered=true;recovered++;
      }
      this.layoutRisks=risks;this.shell?.setAttribute('data-layout-guarded',String(this.layoutGuarded.size));this.shell?.setAttribute('data-layout-risks',String(risks.length));return {recovered,guarded:this.layoutGuarded.size,risks:risks.length};
    }
    setPrimaryScrollMode(mode='safe'){
      const normalized=String(mode||'safe');this.primaryScrollMode=['contained','auto','safe'].includes(normalized)?normalized:'safe';
      this.canvasFrame?.setAttribute('data-primary-scroll',this.primaryScrollMode);
      this.slots?.primary?.setAttribute('data-primary-scroll',this.primaryScrollMode);
      this.scheduleLayoutSafety?.();return this;
    }
    mountPrimary(spec={}){const value=super.mountPrimary(spec);this.setPrimaryScrollMode(spec.scroll||spec.scrollMode||this.spec.primaryScroll||'safe');this.scheduleLayoutSafety?.();return value;}
    portableSlot(name,row=null){
      const key=String(name||'');
      if(key==='global')return super.portableSlot('overlay',row);
      if(this.canvasSlots&&['left','right','bottom','overlay','main'].includes(key))return this.canvasSlots[key]||null;
      return super.portableSlot(name,row);
    }
    layout(){return {slot:name=>this.portableSlot(name)};}
    syncCanvasRegions(){
      if(!this.canvasFrame||!this.canvasSlots)return {left:false,right:false,bottom:false,bottomCollapsedOnly:false};
      const visible=el=>[...(el?.children||[])].filter(node=>!node.classList?.contains('hidden')&&!node.classList?.contains('dkds-prime-hidden'));
      const leftRows=visible(this.canvasSlots.left),rightRows=visible(this.canvasSlots.right),bottomRows=visible(this.canvasSlots.bottom);
      const state={left:leftRows.length>0,right:rightRows.length>0,bottom:bottomRows.length>0,bottomCollapsedOnly:bottomRows.length>0&&bottomRows.every(node=>node.classList?.contains('is-collapsed')||node.classList?.contains('collapsed'))};
      this.canvasFrame.classList.toggle('has-canvas-left',state.left);this.canvasFrame.classList.toggle('has-canvas-right',state.right);this.canvasFrame.classList.toggle('has-canvas-bottom',state.bottom);this.canvasFrame.classList.toggle('canvas-bottom-collapsed-only',state.bottomCollapsedOnly);
      this.canvasFrame.querySelector('.dkds-plugin-canvas-left-resizer')?.classList.toggle('active',state.left);
      this.canvasFrame.querySelector('.dkds-plugin-canvas-right-resizer')?.classList.toggle('active',state.right);
      this.canvasFrame.querySelector('.dkds-plugin-canvas-bottom-resizer')?.classList.toggle('active',state.bottom&&!state.bottomCollapsedOnly);return state;
    }
    syncRegions(){const state=super.syncRegions();this.syncCanvasRegions?.();return state;}
    showPrimary(){const value=super.showPrimary();if(this.canvasFrame)this.canvasFrame.classList.remove('hidden');return value;}
    openSub(id){const ok=super.openSub(id);if(ok&&this.canvasFrame)this.canvasFrame.classList.add('hidden');return ok;}
    setNavigationPresentation(mode='inline'){
      this.navigationPresentation=String(mode||'inline');const nav=this.shell?.querySelector('.dkds-analysis-nav');if(nav)nav.classList.toggle('host-presented',this.navigationPresentation!=='inline');return this;
    }
    navigationActions({includePrimary=true,includePrimes=true,includeSubs=true}={}){
      const rows=[];if(includePrimary&&this.primary)rows.push({id:`workspace-primary:${this.primary.id}`,label:this.primary.label||'主界面',active:()=>!this.activeSub,onInvoke:()=>this.showPrimary()});
      if(includePrimes)for(const row of [...this.primes.values()].sort((a,b)=>(a.order||100)-(b.order||100)))rows.push({id:`workspace-prime:${row.id}`,label:row.label||row.title||row.id,active:()=>!!row.mounted,onInvoke:()=>this.togglePrime(row.id)});
      if(includeSubs)for(const row of [...this.subs.values()].sort((a,b)=>(a.order||100)-(b.order||100)))rows.push({id:`workspace-sub:${row.id}`,label:row.label||row.title||row.id,active:()=>this.activeSub===row.id,onInvoke:()=>this.openSub(row.id)});return rows;
    }
    setHostMode(mode='embedded'){
      this.hostMode=String(mode||'embedded');this.shell?.setAttribute('data-host-mode',this.hostMode);this.resize('host-mode');return this;
    }
    resize(reason='resize'){this.syncCanvasRegions();return super.resize(reason);}
    layoutDiagnostics(){
      const root=this.slots?.primary,guarded=[...this.layoutGuarded.keys()].map(el=>{const style=el?.isConnected?getComputedStyle(el):null;return {tag:String(el?.tagName||'').toLowerCase(),id:String(el?.id||''),className:String(el?.className||''),overflowX:String(style?.overflowX||''),overflowY:String(style?.overflowY||''),clientWidth:Number(el?.clientWidth)||0,clientHeight:Number(el?.clientHeight)||0,scrollWidth:Number(el?.scrollWidth)||0,scrollHeight:Number(el?.scrollHeight)||0};});
      const risks=(this.layoutRisks||[]).map(row=>Object.freeze({...row}));
      return Object.freeze({owner:this.owner,activity:String(this.spec?.activity||''),primaryScroll:this.primaryScrollMode,guarded:Object.freeze(guarded),risks:Object.freeze(risks),primary:Object.freeze({clientWidth:Number(root?.clientWidth)||0,clientHeight:Number(root?.clientHeight)||0,scrollWidth:Number(root?.scrollWidth)||0,scrollHeight:Number(root?.scrollHeight)||0})});
    }
    capabilityState(){return Object.freeze({owner:this.owner,hostMode:this.hostMode,primaryScroll:this.primaryScrollMode,layoutGuarded:this.layoutGuarded?.size||0,...this.surfaceState()});}
    dispose(){cleanupCall(this.plotViewObserverCleanup);this.plotViewObserverCleanup=null;this.canvasObserver?.disconnect?.();this.layoutGuardObserver?.disconnect?.();this.layoutGuardResizeObserver?.disconnect?.();if(this.layoutGuardFrame){const cancel=globalThis.cancelAnimationFrame||clearTimeout;try{cancel(this.layoutGuardFrame);}catch{}this.layoutGuardFrame=0;}for(const el of [...this.layoutGuarded.keys()])this.restoreGuardedElement(el);this.canvasLeftSplit?.dispose?.();this.canvasRightSplit?.dispose?.();this.canvasBottomSplit?.dispose?.();super.dispose();}
  }
