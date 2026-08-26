
  class HorizontalWheelScroller {
    constructor(owner,target,spec={}){
      this.owner=String(owner||'');this.target=resolveElement(target);this.spec={hideScrollbar:true,multiplier:1,revealPadding:12,...spec};this.cleanups=[];
      if(!this.target)throw new Error('HorizontalWheelScroller target not found.');
      this.target.classList.add('dkds-horizontal-wheel-scroll');if(this.spec.hideScrollbar!==false)this.target.classList.add('dkds-scrollbar-hidden');
      const wheel=event=>{
        if(this.spec.enabled===false||this.target.scrollWidth<=this.target.clientWidth+1)return;
        const dx=Number(event.deltaX)||0,dy=Number(event.deltaY)||0;
        const delta=(Math.abs(dx)>Math.abs(dy)&&Math.abs(dx)>0?dx:dy)*Number(this.spec.multiplier||1);if(!delta)return;
        const before=this.target.scrollLeft;this.target.scrollLeft+=delta;
        if(this.target.scrollLeft!==before){event.preventDefault();event.stopPropagation();}
      };
      this.target.addEventListener('wheel',wheel,{passive:false});this.cleanups.push(()=>this.target.removeEventListener('wheel',wheel,{passive:false}));
    }
    reveal(element,{padding=this.spec.revealPadding,behavior='auto'}={}){
      const target=this.target,node=resolveElement(element);if(!target||!node||!target.contains?.(node))return false;
      const pad=Math.max(0,Number(padding)||0);
      // Prefer local geometry so revealing an item never scrolls the entire page.
      try{
        const tr=target.getBoundingClientRect?.(),er=node.getBoundingClientRect?.();
        if(tr&&er&&Number.isFinite(tr.left)&&Number.isFinite(er.left)){
          let delta=0;
          if(er.left<tr.left+pad)delta=er.left-(tr.left+pad);
          else if(er.right>tr.right-pad)delta=er.right-(tr.right-pad);
          if(Math.abs(delta)>.5){
            if(typeof target.scrollBy==='function')target.scrollBy({left:delta,top:0,behavior});
            else target.scrollLeft=(Number(target.scrollLeft)||0)+delta;
            return true;
          }
          return false;
        }
      }catch{}
      try{node.scrollIntoView({block:'nearest',inline:'nearest',behavior});return true;}catch{return false;}
    }
    dispose(){this.cleanups.splice(0).forEach(cleanupCall);this.target?.classList?.remove('dkds-horizontal-wheel-scroll','dkds-scrollbar-hidden');}
  }

  class SelectionViewBinding {
    constructor(runtime,id,target,spec={}){
      this.runtime=runtime;this.owner=runtime.owner;this.id=String(id||'selection-view');this.root=resolveElement(target);this.spec={selector:'[data-selection-key]',revealFocus:true,dimOthers:false,itemVariant:'',...spec};this.snapshot=runtime.get();this.lastFocusKey='';this.lastFocusElement=null;this.cleanups=[];this.scroller=null;
      if(!this.root)throw new Error(`Selection view target not found: ${this.id}`);
      this.root.classList.add('dkds-selection-view');this.root.dataset.dkdsSelectionView=this.id;
      if(this.spec.horizontalWheel===true)this.scroller=new HorizontalWheelScroller(this.owner,this.root,{hideScrollbar:this.spec.hideScrollbar!==false,multiplier:this.spec.wheelMultiplier||1});
      const click=event=>{
        if(typeof this.spec.onActivate!=='function')return;
        if(this.spec.ignore&&event.target?.closest?.(this.spec.ignore))return;
        const element=event.target?.closest?.(this.spec.selector);if(!element||!this.root.contains(element))return;
        try{this.spec.onActivate({event,element,key:this.itemKey(element,this.snapshot),snapshot:this.snapshot,runtime:this.runtime,view:this});}catch(err){console.warn('[DKDS selection view activate]',this.id,err);}
      };
      this.root.addEventListener('click',click);this.cleanups.push(()=>this.root.removeEventListener('click',click));
      this.off=runtime.subscribe((snapshot,meta)=>{this.snapshot=snapshot;this.apply(snapshot,meta);},{immediate:true});
      if(window.MutationObserver){this.observer=new MutationObserver(()=>this.apply(this.snapshot,{reason:'view-mutation',reveal:'if-needed'}));this.observer.observe(this.root,{childList:true,subtree:true});}
    }
    elements(){try{return [...this.root.querySelectorAll(this.spec.selector)];}catch{return [];}}
    itemKey(element,snapshot){
      try{if(typeof this.spec.itemKey==='function')return String(this.spec.itemKey(element,snapshot,this)||'');}catch(err){console.warn('[DKDS selection view itemKey]',this.id,err);}
      return String(element?.dataset?.selectionKey||element?.dataset?.selectionId||'');
    }
    focusKey(snapshot){
      try{if(typeof this.spec.focusKey==='function')return String(this.spec.focusKey(snapshot,this)||'');}catch(err){console.warn('[DKDS selection view focusKey]',this.id,err);}
      const focus=snapshot?.focus||snapshot?.items?.at?.(-1)||null;return String(focus?.id||'');
    }
    selectedKeys(snapshot){
      try{if(typeof this.spec.selectedKeys==='function')return new Set([...(this.spec.selectedKeys(snapshot,this)||[])].map(String));}catch(err){console.warn('[DKDS selection view selectedKeys]',this.id,err);}
      return new Set((snapshot?.items||[]).map(item=>String(item?.id||'')).filter(Boolean));
    }
    apply(snapshot=this.snapshot,meta={}){
      const elements=this.elements(),elementKeys=new Set(elements.map(element=>this.itemKey(element,snapshot)).filter(Boolean));
      let focusKey=this.focusKey(snapshot);const rawFocusId=String(snapshot?.focus?.id||snapshot?.items?.at?.(-1)?.id||'');
      if(this.spec.entityLinked!==false&&rawFocusId&&(!focusKey||!elementKeys.has(focusKey))){const related=window.DKDSEntities?.registry?.closestInSet?.(rawFocusId,elementKeys);if(related)focusKey=related;}
      const selected=this.selectedKeys(snapshot),hasFocus=!!focusKey,variant=String(this.spec.itemVariant||'').trim();let focusElement=null;
      for(const element of elements){
        const key=this.itemKey(element,snapshot),focused=!!key&&key===focusKey,isSelected=!!key&&(selected.has(key)||focused),dimmed=!!(this.spec.dimOthers&&hasFocus&&!focused);
        element.classList.add('dkds-selection-item');if(variant)element.classList.add(`dkds-selection-${variant}`);
        element.classList.toggle('dkds-selection-focused',focused);element.classList.toggle('dkds-selection-selected',isSelected);element.classList.toggle('dkds-selection-dimmed',dimmed);
        if(focused){element.setAttribute('aria-current','true');focusElement=element;}else element.removeAttribute('aria-current');
        element.setAttribute('aria-selected',isSelected?'true':'false');
      }
      const elementReplaced=!!focusElement&&focusElement!==this.lastFocusElement;
      const focusChanged=focusKey!==this.lastFocusKey;
      const revealMode=meta?.reveal;
      const shouldReveal=this.spec.revealFocus!==false&&focusElement&&revealMode!==false&&(focusChanged||elementReplaced||revealMode===true||revealMode==='if-needed');
      this.lastFocusKey=focusKey;this.lastFocusElement=focusElement;
      if(shouldReveal){const raf=globalThis.requestAnimationFrame||((fn)=>setTimeout(fn,0));raf(()=>{
        if(!focusElement?.isConnected&&typeof focusElement?.isConnected==='boolean')return;
        if(this.scroller){this.scroller.reveal(focusElement,{padding:this.spec.revealPadding,behavior:'auto'});return;}
        try{focusElement.scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'});}catch{}
      });}
      return focusElement;
    }
    refresh(options={}){return this.apply(this.snapshot,{reason:'refresh',...options});}
    dispose(){this.off?.();this.off=null;this.observer?.disconnect?.();this.scroller?.dispose?.();this.scroller=null;this.cleanups.splice(0).forEach(cleanupCall);for(const element of this.elements()){element.classList.remove('dkds-selection-item','dkds-selection-focused','dkds-selection-selected','dkds-selection-dimmed');element.removeAttribute('aria-current');element.removeAttribute('aria-selected');}delete this.root?.dataset?.dkdsSelectionView;if(this.runtime?.viewBindings?.get?.(this.id)===this)this.runtime.viewBindings.delete(this.id);}
  }
