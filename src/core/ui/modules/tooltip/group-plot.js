'use strict';
const {hostState, resolveElement}=require('../foundation/shortcuts');
const {ActiveLayoutSolver}=require('../series/layout');



  class TooltipService {
    constructor(scope=null){this.scope=scope;this.node=null;this.owner=scope?.owner||'core';}
    ensure(){if(this.node?.isConnected)return this.node;const node=document.createElement('div');node.className='dkds-tooltip dkds-core-tooltip hidden';node.dataset.dkdsCoreSurface='tooltip';node.setAttribute('role','tooltip');(hostState.zones.get('overlay')||document.body).appendChild(node);this.node=node;return node;}
    show(spec={}){const node=this.ensure(),anchor=resolveElement(spec.anchor),point=spec.point||null;node.replaceChildren();if(spec.title){const strong=document.createElement('strong');strong.textContent=String(spec.title);node.appendChild(strong);}const rows=Array.isArray(spec.rows)?spec.rows:[];for(const row of rows){const line=document.createElement('div');line.className='dkds-tooltip-row';const key=document.createElement('span');key.className='dkds-tooltip-key';key.textContent=String(row?.label??row?.key??'');const value=document.createElement('span');value.className='dkds-tooltip-value';value.textContent=String(row?.value??'');line.append(key,value);node.appendChild(line);}if(spec.text&&!rows.length){const line=document.createElement('div');line.textContent=String(spec.text);node.appendChild(line);}node.classList.remove('hidden');const rect=anchor?.getBoundingClientRect?.(),x=Number(point?.x??point?.clientX??(rect?rect.right+8:12)),y=Number(point?.y??point?.clientY??(rect?rect.top:12));node.style.left=`${Math.max(8,x+10)}px`;node.style.top=`${Math.max(8,y+10)}px`;return node;}
    move(point={}){if(this.node&&!this.node.classList.contains('hidden')){this.node.style.left=`${Math.max(8,Number(point.clientX??point.x??0)+10)}px`;this.node.style.top=`${Math.max(8,Number(point.clientY??point.y??0)+10)}px`;}return this.node;}
    hide(){this.node?.classList.add('hidden');}
    bind(target,spec={}){const el=resolveElement(target);if(!el)return()=>{};const enter=event=>this.show(typeof spec==='function'?spec(event):{...spec,point:event});const move=event=>this.move(event);const leave=()=>this.hide();el.addEventListener('mouseenter',enter);el.addEventListener('mousemove',move);el.addEventListener('mouseleave',leave);return()=>{el.removeEventListener('mouseenter',enter);el.removeEventListener('mousemove',move);el.removeEventListener('mouseleave',leave);};}
    dispose(){this.node?.remove?.();this.node=null;}
  }

  class DeclarativeTooltipRuntime {
    constructor(){this.service=new TooltipService(null);this.active=null;this.bound=false;this.bind();}
    target(event){return event?.target?.closest?.('[data-dkds-tooltip]')||null;}
    text(target){return String(target?.dataset?.dkdsTooltip||'').trim();}
    show(target,event=null){const text=this.text(target);if(!text)return;this.active=target;this.service.show(event?{text,point:event}:{text,anchor:target});}
    bind(){if(this.bound)return;if(typeof document==='undefined'||typeof document.addEventListener!=='function')return;this.bound=true;
      this.onOver=event=>{const target=this.target(event);if(!target||target.contains?.(event.relatedTarget))return;this.show(target,event);};
      this.onMove=event=>{if(this.active&&this.active.contains?.(event.target))this.service.move(event);};
      this.onOut=event=>{if(!this.active)return;const target=this.target(event);if(target!==this.active||this.active.contains?.(event.relatedTarget))return;this.active=null;this.service.hide();};
      this.onFocus=event=>{const target=this.target(event);if(target)this.show(target);};
      this.onBlur=event=>{if(this.active&&this.active===this.target(event)){this.active=null;this.service.hide();}};
      document.addEventListener('mouseover',this.onOver);document.addEventListener('mousemove',this.onMove);document.addEventListener('mouseout',this.onOut);document.addEventListener('focusin',this.onFocus);document.addEventListener('focusout',this.onBlur);
    }
    dispose(){if(!this.bound){this.service.dispose();this.active=null;return;}this.bound=false;if(typeof document!=='undefined'&&typeof document.removeEventListener==='function'){document.removeEventListener('mouseover',this.onOver);document.removeEventListener('mousemove',this.onMove);document.removeEventListener('mouseout',this.onOut);document.removeEventListener('focusin',this.onFocus);document.removeEventListener('focusout',this.onBlur);}this.service.dispose();this.active=null;}
  }

  class GroupPlot {
    constructor(scope,container,spec={}){this.scope=scope;this.owner=scope?.owner||'core';this.container=resolveElement(container);this.spec={minItemWidth:300,minItemHeight:220,gap:12,columns:'auto',...spec};this.cards=new Map();this.solver=scope?.layoutSolver||new ActiveLayoutSolver(scope);if(!this.container)throw new Error('GroupPlot container not found.');this.container.classList.add('dkds-group-plot');this.resizeObserver=window.ResizeObserver?new ResizeObserver(()=>this.layout()):null;this.resizeObserver?.observe(this.container);}
    setItems(items=[]){const rows=Array.isArray(items)?items:[],active=new Set();for(const [index,item] of rows.entries()){const id=String(item?.id||`item-${index+1}`);active.add(id);let row=this.cards.get(id);if(!row){const card=document.createElement('section');card.className='dkds-group-plot-card';card.dataset.groupPlotId=id;const head=document.createElement('header');head.className='dkds-group-plot-head';const title=document.createElement('span');title.className='dkds-group-plot-title';head.appendChild(title);const body=document.createElement('div');body.className='dkds-group-plot-body';card.append(head,body);this.container.appendChild(card);row={id,card,head,title,body,surface:null};this.cards.set(id,row);}row.title.textContent=String(item?.title||id);row.item=item;if(typeof this.spec.renderItem==='function')row.surface=this.spec.renderItem({id,index,item,card:row.card,header:row.head,container:row.body,previous:row.surface,scope:this.scope,group:this})??row.surface;}for(const [id,row] of [...this.cards])if(!active.has(id)){try{row.surface?.dispose?.();}catch{}row.card.remove();this.cards.delete(id);}this.layout();return this;}
    layout(){const solved=this.solver.solve({container:this.container,count:this.cards.size,columns:this.spec.columns,minItemWidth:this.spec.minItemWidth,minItemHeight:this.spec.minItemHeight,maxColumns:this.spec.maxColumns||6,gap:this.spec.gap,aspectRatio:this.spec.aspectRatio||1.62,maxItemHeight:this.spec.maxItemHeight||420});this.container.style.setProperty('--dkds-group-cols',String(solved.columns));this.container.style.setProperty('--dkds-group-gap',`${solved.gap}px`);this.container.style.setProperty('--dkds-group-item-height',`${solved.itemHeight}px`);this.container.classList.toggle('is-overflowing',solved.overflowY);this.lastLayout=solved;for(const row of this.cards.values())try{row.surface?.resize?.();}catch{}return solved;}
    setColumns(value='auto'){this.spec.columns=value;return this.layout();}
    diagnostics(){return Object.freeze({owner:this.owner,count:this.cards.size,layout:this.lastLayout||this.layout()});}
    dispose(){this.resizeObserver?.disconnect?.();for(const row of this.cards.values())try{row.surface?.dispose?.();}catch{}this.cards.clear();this.container?.classList?.remove('dkds-group-plot');}
  }


  const DEFAULT_SCIENTIFIC_INTERACTION_BINDINGS=Object.freeze([
    Object.freeze({id:'core.manipulate',gesture:'drag',target:'manipulator',intent:'manipulate',priority:100}),
    Object.freeze({id:'core.marker.select-additive',gesture:'click',target:'marker',modifiers:['ctrl'],intent:'select',selectionMode:'additive',priority:10}),
    Object.freeze({id:'core.marker.select',gesture:'click',target:'marker',intent:'select'}),
    Object.freeze({id:'core.marker.activate',gesture:'double-click',target:'marker',intent:'activate'}),
    Object.freeze({id:'core.marker.context',gesture:'context',target:'marker',intent:'context-menu'}),
    Object.freeze({id:'core.curve.select-additive',gesture:'click',target:'curve',modifiers:['ctrl'],intent:'select',selectionMode:'additive',priority:10}),
    Object.freeze({id:'core.curve.select',gesture:'click',target:'curve',intent:'select'}),
    Object.freeze({id:'core.curve.activate',gesture:'double-click',target:'curve',intent:'activate'}),
    Object.freeze({id:'core.background.clear',gesture:'click',target:'background',intent:'clear-selection'}),
    Object.freeze({id:'core.background.reset',gesture:'double-click',target:'background',intent:'reset-view'}),
    Object.freeze({id:'core.background.zoom-box',gesture:'box',target:'background',modifiers:['ctrl'],intent:'zoom-box',priority:20}),
    Object.freeze({id:'core.background.select-region',gesture:'box',target:'background',intent:'select-region'}),
    Object.freeze({id:'core.plot.wheel-zoom',gesture:'wheel',target:'plot',intent:'zoom-wheel'})
  ]);

module.exports=Object.freeze({TooltipService, DeclarativeTooltipRuntime, GroupPlot, DEFAULT_SCIENTIFIC_INTERACTION_BINDINGS});
