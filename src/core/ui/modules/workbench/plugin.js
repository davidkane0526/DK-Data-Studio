'use strict';
const {cleanupCall}=require('../foundation/shortcuts');
const {SplitController}=require('../layout/workspace');
const {applyScrollPolicy}=require('../layout/state-resolver');
const {AnalysisWorkbench}=require('./analysis');



  class PluginWorkspace extends AnalysisWorkbench {
    constructor(scope,root,spec={}){
      super(scope,root,{...spec});
      this.shell?.classList.add('dkds-plugin-workspace');if(this.shell)globalThis.DKDSMaterialSurface?.apply?.(this.shell,'surface');
      this.shell?.setAttribute('data-plugin-workspace-owner',this.owner);
      this.hostMode=String(spec.hostMode||'embedded');
      this.shell?.setAttribute('data-host-mode',this.hostMode);
      this.navigationPresentation='inline';
      this.primaryScrollMode=['contained','auto','safe'].includes(String(spec.primaryScroll||'safe'))?String(spec.primaryScroll||'safe'):'safe';
      this.canvasSlots=null;this.canvasObserver=null;this.canvasLeftSplit=null;this.canvasRightSplit=null;this.canvasBottomSplit=null;this.layoutRisks=[];
      this.installCanvasDocking(spec);
      this.setPrimaryScrollMode(this.primaryScrollMode);
      this.plotViewObserverCleanup=this.scope.plotViews?.observe?.(this.shell,{portableFactory:(id,node,pSpec)=>this.portable(id,node,pSpec),placements:['home','left','right','bottom','global'],defaultPlacement:'home',stateVersion:'plot-view-v2'});
    }
    installCanvasDocking(spec={}){
      const main=this.slots?.main,primary=this.slots?.primary,sub=this.slots?.sub;if(!main||!primary||!sub)return;
      const frame=document.createElement('div');frame.className='dkds-plugin-canvas-frame';
      frame.innerHTML=`<aside class="dkds-plugin-canvas-left" data-plugin-canvas-slot="left"></aside><div class="dkds-plugin-canvas-left-resizer" role="separator" aria-orientation="vertical"></div><div class="dkds-plugin-canvas-center" data-plugin-canvas-slot="main"></div><div class="dkds-plugin-canvas-right-resizer" role="separator" aria-orientation="vertical"></div><aside class="dkds-plugin-canvas-right" data-plugin-canvas-slot="right"></aside><div class="dkds-plugin-canvas-bottom-resizer" role="separator" aria-orientation="horizontal"></div><section class="dkds-plugin-canvas-bottom" data-plugin-canvas-slot="bottom"></section><div class="dkds-plugin-canvas-overlay" data-plugin-canvas-slot="overlay"></div>`;
      const center=frame.querySelector('[data-plugin-canvas-slot="main"]');center.append(primary);main.replaceChildren(frame,sub);
      sub.classList.add('dkds-plugin-sub-page-host');
      this.canvasFrame=frame;this.canvasSlots={main:center,left:frame.querySelector('[data-plugin-canvas-slot="left"]'),right:frame.querySelector('[data-plugin-canvas-slot="right"]'),bottom:frame.querySelector('[data-plugin-canvas-slot="bottom"]'),overlay:frame.querySelector('[data-plugin-canvas-slot="overlay"]')};
      const id=String(spec.activity||spec.id||'main');
      this.canvasLeftSplit=new SplitController(this.scope,{id:`plugin-${id}-canvas-left`,container:frame,handle:frame.querySelector('.dkds-plugin-canvas-left-resizer'),target:this.canvasSlots.left,cssVar:'--dkds-plugin-canvas-left-width',defaultSize:Number(spec.canvasLeftWidth)||320,min:Number(spec.canvasLeftMin)||240,reserve:Number(spec.canvasLeftReserve)||520,mobileOverlay:true,mobileMaxRatio:.92,mobileStateScope:true});
      this.canvasRightSplit=new SplitController(this.scope,{id:`plugin-${id}-canvas-right`,container:frame,handle:frame.querySelector('.dkds-plugin-canvas-right-resizer'),target:this.canvasSlots.right,cssVar:'--dkds-plugin-canvas-right-width',defaultSize:Number(spec.canvasRightWidth)||390,min:Number(spec.canvasRightMin)||280,reserve:Number(spec.canvasRightReserve)||520,reverse:true,mobileOverlay:true,mobileMaxRatio:.48,mobileReserve:320,mobileStateScope:true});
      this.canvasBottomSplit=new SplitController(this.scope,{id:`plugin-${id}-canvas-bottom`,container:frame,handle:frame.querySelector('.dkds-plugin-canvas-bottom-resizer'),target:this.canvasSlots.bottom,cssVar:'--dkds-plugin-canvas-bottom-height',axis:'y',defaultSize:Number(spec.canvasBottomHeight)||320,min:Number(spec.canvasBottomMin)||190,reserve:Number(spec.canvasBottomReserve)||260,reverse:true,mobileOverlay:true,mobileMaxRatio:.58,mobileReserve:240,mobileStateScope:true});
      applyScrollPolicy(this.canvasSlots.left,'chain');applyScrollPolicy(this.canvasSlots.right,'chain');applyScrollPolicy(this.canvasSlots.bottom,'chain');applyScrollPolicy(this.canvasSlots.overlay,'contain');
      frame.__dkdsCanvasSplits={left:this.canvasLeftSplit,right:this.canvasRightSplit,bottom:this.canvasBottomSplit};
      const sync=()=>this.syncCanvasRegions();
      if(window.MutationObserver){this.canvasObserver=new MutationObserver(sync);for(const el of [this.canvasSlots.left,this.canvasSlots.right,this.canvasSlots.bottom])this.canvasObserver.observe(el,{childList:true,subtree:true,attributes:true,attributeFilter:['data-dkds-mobile-active']});}
      this.syncCanvasRegions();
    }
    setPrimaryScrollMode(mode='safe'){
      const normalized=String(mode||'safe');this.primaryScrollMode=['contained','auto','safe'].includes(normalized)?normalized:'safe';
      this.canvasFrame?.setAttribute('data-primary-scroll',this.primaryScrollMode);
      this.slots?.primary?.setAttribute('data-primary-scroll',this.primaryScrollMode);
      const policy=this.primaryScrollMode==='contained'?'contain':(this.primaryScrollMode==='auto'?'chain':'viewport');applyScrollPolicy(this.canvasSlots?.main,policy);applyScrollPolicy(this.slots?.primary,policy);return this;
    }
    mountPrimary(spec={}){const value=super.mountPrimary(spec);this.setPrimaryScrollMode(spec.scroll||spec.scrollMode||this.spec.primaryScroll||'safe');return value;}
    portableSlot(name,row=null){
      const key=String(name||'');
      if(key==='global')return super.portableSlot('overlay',row);
      if(this.canvasSlots&&['left','right','bottom','overlay','main'].includes(key))return this.canvasSlots[key]||null;
      return super.portableSlot(name,row);
    }
    layout(){return {slot:name=>this.portableSlot(name)};}
    syncCanvasRegions(){
      if(!this.canvasFrame||!this.canvasSlots)return {left:false,right:false,bottom:false,bottomCollapsedOnly:false};
      const visible=el=>[...(el?.children||[])].filter(node=>!node.classList?.contains('hidden')&&!node.classList?.contains('dkds-prime-hidden')&&node.dataset?.dkdsMobileActive!=='false');
      const leftRows=visible(this.canvasSlots.left),rightRows=visible(this.canvasSlots.right),bottomRows=visible(this.canvasSlots.bottom);
      const state={left:leftRows.length>0,right:rightRows.length>0,bottom:bottomRows.length>0,bottomCollapsedOnly:bottomRows.length>0&&bottomRows.every(node=>node.classList?.contains('is-collapsed')||node.classList?.contains('collapsed'))};
      this.canvasFrame.classList.toggle('has-canvas-left',state.left);this.canvasFrame.classList.toggle('has-canvas-right',state.right);this.canvasFrame.classList.toggle('has-canvas-bottom',state.bottom);this.canvasFrame.classList.toggle('canvas-bottom-collapsed-only',state.bottomCollapsedOnly);
      this.canvasFrame.querySelector('.dkds-plugin-canvas-left-resizer')?.classList.toggle('active',state.left);
      this.canvasFrame.querySelector('.dkds-plugin-canvas-right-resizer')?.classList.toggle('active',state.right);
      this.canvasFrame.querySelector('.dkds-plugin-canvas-bottom-resizer')?.classList.toggle('active',state.bottom&&!state.bottomCollapsedOnly);
      this.canvasLeftSplit?.setCollapsed(!state.left,{persist:false,notify:false});this.canvasRightSplit?.setCollapsed(!state.right,{persist:false,notify:false});this.canvasBottomSplit?.setCollapsed(!state.bottom||state.bottomCollapsedOnly,{persist:false,notify:false});return state;
    }
    syncRegions(){const state=super.syncRegions();this.syncCanvasRegions?.();return state;}
    presentationChanged(reason='surface',detail={}){try{window.dispatchEvent?.(new CustomEvent('dkds:workspace-presentation-changed',{detail:{owner:this.owner,activity:String(this.spec?.activity||''),reason,...detail}}));}catch{}return this;}
    showPrimary(){const value=super.showPrimary();if(this.canvasFrame)this.canvasFrame.classList.remove('hidden');if(value)this.presentationChanged('primary',{kind:'primary',surfaceId:String(this.primary?.id||'main')});return value;}
    openPrime(id,placement){const ok=super.openPrime(id,placement);if(ok)this.presentationChanged('prime-open',{kind:'prime',surfaceId:String(id||'')});return ok;}
    closePrime(id){const ok=super.closePrime(id);if(ok)this.presentationChanged('prime-close',{kind:'prime',surfaceId:String(id||'')});return ok;}
    openSub(id){const ok=super.openSub(id);if(ok&&this.canvasFrame)this.canvasFrame.classList.add('hidden');if(ok)this.presentationChanged('sub-open',{kind:'sub',surfaceId:String(id||'')});return ok;}
    setNavigationPresentation(mode='inline'){
      this.navigationPresentation=String(mode||'inline');const nav=this.navigationElement||null;if(nav)nav.classList.toggle('host-presented',this.navigationPresentation!=='inline');return this;
    }
    navigationActions({includePrimary=true,includePrimes=true,includeSubs=true}={}){
      const describe=(row,kind,id,active,onInvoke)=>({
        id:`workspace-${kind}:${id}`,surfaceId:String(id),kind,semanticKind:String(row?.semanticKind||''),presentationPurpose:String(row?.presentationPurpose||''),presentationRole:String(row?.presentationRole||row?.semanticRole||''),
        priority:Number.isFinite(Number(row?.priority))?Number(row.priority):undefined,collapsible:row?.collapsible,embedded:row?.embedded===true,label:row?.label||row?.title||(kind==='primary'?'主界面':id),active,onInvoke
      });
      const rows=[];
      if(includePrimary&&this.primary&&(String(this.spec.navigation||this.spec.navigationMode||'auto').toLowerCase()==='always'||this.subs.size>0))rows.push(describe(this.primary,'primary',this.primary.id,()=>!this.activeSub,()=>this.showPrimary()));
      if(includePrimes)for(const row of [...this.primes.values()].sort((a,b)=>(a.order||100)-(b.order||100)))rows.push(describe(row,'prime',row.id,()=>!!row.mounted,()=>this.togglePrime(row.id)));
      if(includeSubs)for(const row of [...this.subs.values()].sort((a,b)=>(a.order||100)-(b.order||100)))rows.push(describe(row,'sub',row.id,()=>this.activeSub===row.id,()=>this.openSub(row.id)));
      return rows;
    }
    setHostMode(mode='embedded'){
      this.hostMode=String(mode||'embedded');this.shell?.setAttribute('data-host-mode',this.hostMode);this.resize('host-mode');return this;
    }
    resize(reason='resize'){this.syncCanvasRegions();return super.resize(reason);}
    diagnosticRegions(){return [['primary',this.slots?.primary],['sub',this.slots?.sub],['canvas-main',this.canvasSlots?.main],['canvas-left',this.canvasSlots?.left],['canvas-right',this.canvasSlots?.right],['canvas-bottom',this.canvasSlots?.bottom],['canvas-overlay',this.canvasSlots?.overlay]].filter(([,el])=>!!el);}
    layoutDiagnostics({limit=12}={}){
      const regions=[];const risks=[];for(const [name,el] of this.diagnosticRegions().slice(0,Math.max(1,Math.min(24,Number(limit)||12)))){const style=el?.isConnected?getComputedStyle(el):null;const row=Object.freeze({name,scrollPolicy:String(el?.dataset?.dkdsScrollPolicy||''),tag:String(el?.tagName||'').toLowerCase(),id:String(el?.id||''),className:String(el?.className||''),overflowX:String(style?.overflowX||''),overflowY:String(style?.overflowY||''),clientWidth:Number(el?.clientWidth)||0,clientHeight:Number(el?.clientHeight)||0,scrollWidth:Number(el?.scrollWidth)||0,scrollHeight:Number(el?.scrollHeight)||0});regions.push(row);if(row.scrollWidth>row.clientWidth+8||row.scrollHeight>row.clientHeight+8)risks.push(row);}
      this.layoutRisks=risks;const root=this.slots?.primary;return Object.freeze({owner:this.owner,activity:String(this.spec?.activity||''),primaryScroll:this.primaryScrollMode,regions:Object.freeze(regions),risks:Object.freeze(risks),bounded:true,primary:Object.freeze({clientWidth:Number(root?.clientWidth)||0,clientHeight:Number(root?.clientHeight)||0,scrollWidth:Number(root?.scrollWidth)||0,scrollHeight:Number(root?.scrollHeight)||0})});
    }
    capabilityState(){return Object.freeze({owner:this.owner,hostMode:this.hostMode,primaryScroll:this.primaryScrollMode,layoutRiskCount:this.layoutRisks.length,...this.surfaceState()});}
    dispose(){cleanupCall(this.plotViewObserverCleanup);this.plotViewObserverCleanup=null;this.canvasObserver?.disconnect?.();this.canvasLeftSplit?.dispose?.();this.canvasRightSplit?.dispose?.();this.canvasBottomSplit?.dispose?.();super.dispose();}
  }

module.exports=Object.freeze({PluginWorkspace});
