'use strict';
const {hostState, resolveElement, cleanupCall}=require('../foundation/shortcuts');
const {ActionGroup}=require('../interaction/context-actions');
const {SplitController, WorkspaceLayout}=require('../layout/workspace');


  class ViewHost {
    constructor(scope,container,spec={}){
      this.scope=scope;this.container=resolveElement(container);this.spec={...spec};this.controller=spec.controller||null;this.cleanup=null;this.unsubscribe=null;this.ro=null;this.mounted=false;
      if(!this.container)throw new Error('ViewHost container not found.');
      this.container.classList.add('dkds-view-host');
      this.mount();
    }
    context(reason='render'){return {scope:this.scope,container:this.container,controller:this.controller,reason,host:hostState};}
    mount(){
      if(this.mounted)return this;this.mounted=true;
      try{const out=this.spec.mount?.(this.context('mount'));if(typeof out==='function')this.cleanup=out;}catch(err){console.error('[DKDS view mount]',err);}
      const source=this.controller?.subscribe?this.controller:(this.spec.store?.subscribe?this.spec.store:null);
      if(source)this.unsubscribe=source.subscribe(()=>this.render('state'));
      if(window.ResizeObserver){this.ro=new ResizeObserver(()=>this.resize('observer'));this.ro.observe(this.container);}
      this.render('mount');return this;
    }
    render(reason='render'){if(!this.mounted)return;try{this.spec.render?.(this.context(reason));}catch(err){console.error('[DKDS view render]',err);hostState.status?.(`界面渲染失败：${err.message}`);}return this;}
    resize(reason='resize'){if(!this.mounted)return;try{this.spec.resize?.(this.context(reason));}catch(err){console.warn('[DKDS view resize]',err);}return this;}
    setController(controller){cleanupCall(this.unsubscribe);this.unsubscribe=null;this.controller=controller||null;if(this.controller?.subscribe)this.unsubscribe=this.controller.subscribe(()=>this.render('state'));this.render('controller');return this;}
    move(container){const next=resolveElement(container);if(!next||next===this.container)return this;this.ro?.disconnect?.();this.container=next;this.container.classList.add('dkds-view-host');if(window.ResizeObserver){this.ro=new ResizeObserver(()=>this.resize('observer'));this.ro.observe(this.container);}this.render('move');return this;}
    dispose(){if(!this.mounted)return;this.mounted=false;cleanupCall(this.unsubscribe);cleanupCall(this.cleanup);this.ro?.disconnect?.();try{this.spec.unmount?.(this.context('unmount'));}catch(err){console.warn('[DKDS view unmount]',err);}this.container?.classList?.remove('dkds-view-host');}
  }

  class Workbench {
    constructor(scope,root,spec={}){
      this.scope=scope;this.root=resolveElement(root);this.spec=spec;this.views=new Map();this.active='';this.splitter=null;this.split=null;this.portableZones=new Map();
      if(!this.root)throw new Error('Workbench root not found.');
      this.root.classList.add('dkds-workbench');
      if(spec.existing===true){
        this.root.classList.add('dkds-workbench-existing');
        this.layout=new WorkspaceLayout(scope,this.root,{regions:spec.regions||{}});
        this.createPortableZones();
        if(spec.split&&spec.split.enabled!==false)this.mountExistingSplit(spec.split);
        return;
      }
      const showHeader=spec.header!==false,showTabs=spec.tabs!==false;
      this.root.innerHTML=`${showHeader?'<header class="dkds-workbench-header"><div class="dkds-workbench-heading"><h2></h2><div class="dkds-workbench-subtitle"></div></div><div class="dkds-workbench-actions"></div></header>':''}${showTabs?'<div class="dkds-workbench-tabs"></div>':''}<div class="dkds-workbench-grid"><aside class="dkds-workbench-left"></aside><main class="dkds-workbench-main"></main><aside class="dkds-workbench-right"></aside><section class="dkds-workbench-bottom"></section><div class="dkds-workbench-overlay"></div></div>`;
      const h=this.root.querySelector('h2');if(h)h.textContent=spec.title||'';const st=this.root.querySelector('.dkds-workbench-subtitle');if(st)st.textContent=spec.subtitle||'';
      this.layout=new WorkspaceLayout(scope,this.root.querySelector('.dkds-workbench-grid'),{regions:{left:{target:'.dkds-workbench-left'},main:{target:'.dkds-workbench-main'},right:{target:'.dkds-workbench-right'},bottom:{target:'.dkds-workbench-bottom'},overlay:{target:'.dkds-workbench-overlay'}}});
      this.portableLayout=this.layout;
      const actionHost=this.root.querySelector('.dkds-workbench-actions');if(spec.actions&&actionHost)this.actions=new ActionGroup(scope.owner,actionHost,{activity:spec.activity,actions:spec.actions});
      for(const view of spec.views||[])this.registerView(view);
      if(spec.defaultView||this.views.size)this.activate(spec.defaultView||this.views.keys().next().value);
    }
    createPortableZones(){
      const make=(name)=>{const el=document.createElement('div');el.className=`dkds-portable-zone dkds-portable-zone-${name}`;el.dataset.portableZone=name;this.root.appendChild(el);this.portableZones.set(name,el);return el;};
      for(const name of ['left','right','bottom'])make(name);
      const semanticOverlay=this.layout.slot('overlay');
      this.portableLayout={slot:(name)=>name==='overlay'?(semanticOverlay||hostState.zones.get('overlay')||this.root):(this.portableZones.get(name)||this.layout.slot(name)||hostState.zones.get(name)||null)};
      return this.portableLayout;
    }
    portable(id,node,spec={}){return this.scope.panels.create(id,node,{...spec,layout:this.portableLayout||this.layout});}
    mountExistingSplit(splitSpec={}){
      const left=this.layout.slot(splitSpec.region||'left');const main=this.layout.slot(splitSpec.mainRegion||'main');if(!left||!main)return null;
      this.root.classList.add('dkds-workbench-existing-split');
      const handle=document.createElement('div');handle.className='dkds-workbench-splitter';handle.tabIndex=0;handle.title='拖动调整侧栏宽度；双击恢复默认';
      if(left.nextSibling)this.root.insertBefore(handle,left.nextSibling);else this.root.appendChild(handle);this.splitter=handle;
      this.split=new SplitController(this.scope,{id:splitSpec.id||'workbench-left',container:this.root,handle,target:left,axis:'x',min:splitSpec.min||190,max:splitSpec.max||null,reserve:splitSpec.reserve||360,defaultSize:splitSpec.defaultSize||300});
      return this.split;
    }
    registerView(view={}){const id=String(view.id||'');if(!id)throw new Error('Workbench view id required.');this.views.set(id,{...view,id});this.renderTabs();return this;}
    renderTabs(){const host=this.root.querySelector('.dkds-workbench-tabs');if(!host)return;host.innerHTML='';for(const view of [...this.views.values()].sort((a,b)=>(a.order||100)-(b.order||100))){const b=document.createElement('button');b.type='button';b.dataset.viewId=view.id;b.className='dkds-workbench-tab';b.textContent=view.label||view.title||view.id;b.classList.toggle('active',view.id===this.active);b.onclick=()=>this.activate(view.id);host.appendChild(b);}}
    activate(id){const next=this.views.get(String(id));if(!next)return false;const main=this.layout.slot('main');if(!main)return false;const previous=this.views.get(this.active);try{previous?.unmount?.({workbench:this,scope:this.scope,container:main});}catch(err){console.warn('[DKDS workbench unmount]',err);}this.active=next.id;main.replaceChildren();if(typeof next.mount==='function')next.mount({workbench:this,scope:this.scope,container:main,layout:this.layout});else if(next.html!==undefined)main.innerHTML=typeof next.html==='function'?next.html():String(next.html);this.renderTabs();this.scope.emitResize({reason:'workbench-view',viewId:next.id});return true;}
    dispose(){try{this.views.get(this.active)?.unmount?.({workbench:this,scope:this.scope,container:this.layout.slot('main')});}catch{}this.actions?.dispose?.();this.split?.dispose?.();this.splitter?.remove?.();for(const zone of this.portableZones.values())zone.remove();this.portableZones.clear();this.layout?.dispose?.();if(this.spec.existing===true){this.root.classList.remove('dkds-workbench','dkds-workbench-existing','dkds-workbench-existing-split');}else this.root.replaceChildren();}
  }

module.exports=Object.freeze({ViewHost, Workbench});
