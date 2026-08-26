
  class ChartSurface {
    constructor(scope,container,spec={}){
      this.scope=scope;this.container=resolveElement(container);this.spec={...spec};this.plot=null;this.toolbar=null;this.ro=null;this.boundPlotEvents=[];this.disposed=false;
      if(!this.container)throw new Error('Chart container not found.');
      this.container.classList.add('dkds-chart-surface');
      if(spec.title||spec.actions?.length)this.buildChrome();
      else this.plot=this.container;
      if(window.ResizeObserver){this.ro=new ResizeObserver(()=>this.scope.requestChartResize?.({reason:'chart-surface-observer'}));this.ro.observe(this.container);}
      if(spec.data||spec.layout)this.set(spec);
    }
    buildChrome(){
      const head=document.createElement('div');head.className='dkds-chart-head';const title=document.createElement('strong');title.className='dkds-chart-title';title.textContent=this.spec.title||'';const actions=document.createElement('div');actions.className='dkds-chart-actions';head.append(title,actions);
      const plot=document.createElement('div');plot.className='dkds-chart-plot';this.container.append(head,plot);this.plot=plot;
      if(this.spec.actions?.length)this.toolbar=new ActionGroup(this.scope.owner,actions,{activity:this.spec.activity,actions:this.spec.actions});
    }
    async set(spec={}){
      this.spec={...this.spec,...spec};if(!this.plot||!window.DKDSCharts?.react)return false;
      const config={responsive:true,displaylogo:false,...(this.spec.config||{})};
      const layout={autosize:true,...(this.spec.layout||{})};
      await window.DKDSCharts.react(this.plot,this.spec.data||this.spec.traces||[],layout,config);
      this.bindPlotEvents();return true;
    }
    bindPlotEvents(){
      for(const off of this.boundPlotEvents)try{off?.();}catch{}
      this.boundPlotEvents=[];
      const events={dkds_chart_click:'onClick',dkds_chart_doubleclick:'onDoubleClick',dkds_chart_hover:'onHover',dkds_chart_unhover:'onUnhover',dkds_chart_selected:'onSelected',dkds_chart_relayout:'onRelayout'};
      for(const [eventName,key] of Object.entries(events)){const fn=this.spec[key];if(typeof fn!=='function')continue;const off=window.DKDSCharts?.bind?.(this.scope.owner,this.plot,eventName,payload=>fn(payload,this));if(typeof off==='function')this.boundPlotEvents.push(off);}
    }
    resize(){try{window.DKDSCharts?.resize?.(this.plot);}catch{}}
    portable(id,spec={}){return this.scope.panels.create(id,this.container,{title:this.spec.title||spec.title,...spec});}
    dispose(){if(this.disposed)return;this.disposed=true;this.ro?.disconnect?.();this.toolbar?.dispose?.();for(const off of this.boundPlotEvents.splice(0))try{off?.();}catch{}try{window.DKDSCharts?.purge?.(this.plot);}catch{}const i=this.scope?.charts?.indexOf?.(this);if(Number.isInteger(i)&&i>=0)this.scope.charts.splice(i,1);}
  }

  class PlotView {
    constructor(scope,id,card,spec={}){
      this.scope=scope;this.owner=scope.owner;this.id=String(id||'plot');this.card=resolveElement(card);this.spec={copy:true,images:true,csv:true,portable:true,...spec};this.cleanups=[];this.portable=null;this.disposed=false;
      if(!this.card)throw new Error(`PlotView card not found: ${this.id}`);
      this.card.classList.add('dkds-plot-view');
      this.plot=resolveScopedElement(this.spec.plot||'.analysis-chart,.dkds-chart-plot,.dkds-scientific-chart-host',this.card)||this.card.querySelector('.analysis-chart')||this.card;
      this.header=resolveScopedElement(this.spec.header||'[data-dkds-plot-header],.analysis-chart-title,.dkds-chart-head',this.card);
      if(!this.header){this.header=document.createElement('div');this.header.className='dkds-plot-view-head';this.card.prepend(this.header);}
      this.header.classList.add('dkds-plot-view-head');
      this.ensureTitle();this.ensureActions();this.bindStandardActions();this.bindPortable();
      if(window.ResizeObserver){this.ro=new ResizeObserver(()=>this.resize('observer'));this.ro.observe(this.card);}
    }
    configure(spec={}){
      this.spec={...this.spec,...spec};
      if(spec.plot!==undefined){const next=resolveScopedElement(spec.plot,this.card)||resolveElement(spec.plot);if(next)this.plot=next;}
      if(spec.fileStem!==undefined||spec.csv!==undefined||spec.copyText!==undefined||spec.exportImage!==undefined||spec.actions!==undefined){
        this.exportMenu?.dispose?.();this.exportMenu=null;
        this.actions?.querySelectorAll?.('.dkds-plot-view-action')?.forEach(el=>el.remove());
        this.bindStandardActions();
      }
      return this;
    }
    ensureTitle(){
      let title=this.header.querySelector('.dkds-plot-view-title');
      if(title){this.title=title;return;}
      const actionsExisting=this.header.querySelector('[data-dkds-plot-actions],.dkds-plot-view-actions,.dkds-chart-actions');
      const wrap=document.createElement('span');wrap.className='dkds-plot-view-title';
      if(this.spec.titleHtml!==undefined)wrap.innerHTML=String(this.spec.titleHtml||'');
      else if(this.spec.title!==undefined)wrap.textContent=String(this.spec.title||'');
      else{
        const nodes=[...this.header.childNodes].filter(node=>node!==actionsExisting);
        for(const node of nodes)wrap.appendChild(node);
      }
      this.header.insertBefore(wrap,this.header.firstChild||null);this.title=wrap;
    }
    ensureActions(){
      this.actions=resolveScopedElement(this.spec.actionsHost||'[data-dkds-plot-actions],.dkds-plot-view-actions,.dkds-chart-actions',this.header);
      if(!this.actions){this.actions=document.createElement('span');this.actions.className='dkds-plot-view-actions';this.header.appendChild(this.actions);}
      this.actions.classList.add('dkds-plot-view-actions','dkds-integrated-action-group');
    }
    invokeAction(handler,event){return Promise.resolve(handler?.(event)).catch(err=>{console.error('[DKDS PlotView]',err);hostState.status?.(`图表操作失败：${err.message}`);});}
    button(label,title,handler){const b=document.createElement('button');b.type='button';b.textContent=label;b.title=title||label;b.className='dkds-plot-view-action';const fn=e=>{e.preventDefault();e.stopPropagation();this.invokeAction(handler,e);};b.addEventListener('click',fn);this.cleanups.push(()=>b.removeEventListener('click',fn));this.actions.appendChild(b);return b;}
    menuButton({icon='⋯',title='图表操作',items=[]}={}){
      if(!Array.isArray(items)||!items.length)return null;
      const b=document.createElement('button');b.type='button';b.className='dkds-plot-view-action dkds-plot-view-menu-trigger dkds-portable-placement-trigger';b.title=title;b.setAttribute('aria-label',title);b.setAttribute('aria-haspopup','menu');b.setAttribute('aria-expanded','false');
      const iconMarkup=icon==='file'?'<svg class="dkds-plot-view-file-svg" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 1.75h5l3 3v9.5H4z"></path><path d="M9 1.75v3h3"></path></svg>':esc(icon);
      b.innerHTML=`<span class="dkds-portable-location-icon dkds-plot-view-menu-icon">${iconMarkup}</span><span class="dkds-portable-caret">▾</span>`;
      const fn=e=>{
        e.preventDefault();e.stopPropagation();
        this.exportMenu?.dispose?.();
        const rect=b.getBoundingClientRect();
        const menu=this.exportMenu=new ContextMenu(this.owner,{onClose:()=>b.setAttribute('aria-expanded','false')});
        b.setAttribute('aria-expanded','true');
        menu.open({x:rect.left,y:rect.bottom+4,items});
      };
      b.addEventListener('click',fn);this.cleanups.push(()=>b.removeEventListener('click',fn));this.actions.appendChild(b);return b;
    }
    plotNode(){return this.spec.getPlot?.()||this.plot;}
    fileStem(){return String(typeof this.spec.fileStem==='function'?this.spec.fileStem(this):this.spec.fileStem||this.title?.textContent||this.id).trim().replace(/[\\/:*?\"<>|]+/g,'_')||this.id;}
    traceCsv(){
      if(typeof this.spec.csv==='function')return String(this.spec.csv(this)||'');
      const plot=this.plotNode(),traces=Array.from(plot?.data||[]),lines=[];
      const quote=v=>{const s=String(v??'');return /[\",\r\n]/.test(s)?`\"${s.replace(/\"/g,'\"\"')}\"`:s;};
      let hasHeatmap=false;
      for(const tr of traces){if(Array.isArray(tr?.z)&&Array.isArray(tr.z[0])){hasHeatmap=true;break;}}
      if(hasHeatmap){lines.push('series,x,y,z');for(const tr of traces){if(!Array.isArray(tr?.z)||!Array.isArray(tr.z[0]))continue;const xs=Array.isArray(tr.x)?tr.x:tr.z[0].map((_,i)=>i),ys=Array.isArray(tr.y)?tr.y:tr.z.map((_,i)=>i);for(let r=0;r<tr.z.length;r++)for(let c=0;c<(tr.z[r]||[]).length;c++)lines.push([tr.name||this.title?.textContent||this.id,xs[c],ys[r],tr.z[r][c]].map(quote).join(','));}return lines.join('\n');}
      lines.push('series,x,y');for(const tr of traces){const xs=Array.from(tr?.x||[]),ys=Array.from(tr?.y||[]),n=Math.max(xs.length,ys.length);for(let i=0;i<n;i++)lines.push([tr?.name||this.title?.textContent||this.id,xs[i]??i,ys[i]??''].map(quote).join(','));}return lines.join('\n');
    }
    async saveText(text,name,ext='csv'){
      if(typeof this.spec.saveText==='function')return this.spec.saveText({content:text,defaultName:name,extension:ext,view:this});
      if(window.electronAPI?.saveText)return window.electronAPI.saveText({defaultName:name,content:text,filters:[{name:ext.toUpperCase(),extensions:[ext]}]});
      const blob=new Blob([text],{type:ext==='csv'?'text/csv;charset=utf-8':'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);return true;
    }
    async exportCsv(){const csv=this.traceCsv();if(!csv.trim())throw new Error('当前图没有可导出的数据。');return this.saveText(csv,`${this.fileStem()}.csv`,'csv');}
    async copyCsv(){const csv=this.traceCsv();if(!csv.trim())throw new Error('当前图没有可复制的数据。');if(typeof this.spec.copyText==='function')return this.spec.copyText(csv,`${this.title?.textContent||this.id} 数据`);if(window.electronAPI?.copyText)return window.electronAPI.copyText(csv);if(navigator.clipboard?.writeText)return navigator.clipboard.writeText(csv);throw new Error('当前环境不支持复制。');}
    async exportImage(format){
      const plot=this.plotNode();if(!plot)throw new Error('图表尚未渲染。');
      if(typeof this.spec.exportImage==='function')return this.spec.exportImage({format,plot,fileStem:this.fileStem(),view:this});
      const data=await window.DKDSCharts.toImage(plot,{format,width:1500,height:950,scale:format==='png'?2:1});
      if(format==='svg'){const raw=data.split(',')[1]||'',content=decodeURIComponent(raw);return this.saveText(content,`${this.fileStem()}.svg`,'svg');}
      const base64=data.split(',')[1]||'';
      if(window.electronAPI?.saveBase64)return window.electronAPI.saveBase64({defaultName:`${this.fileStem()}.png`,base64,filters:[{name:'PNG',extensions:['png']}]});
      const a=document.createElement('a');a.href=data;a.download=`${this.fileStem()}.png`;document.body.appendChild(a);a.click();a.remove();return true;
    }
    bindStandardActions(){
      const exportItems=[];
      if(this.spec.csv!==false)exportItems.push({id:'csv',label:'数据 CSV',onInvoke:e=>this.invokeAction(()=>this.exportCsv(),e)});
      if(this.spec.copy!==false)exportItems.push({id:'copy',label:'复制数据',onInvoke:e=>this.invokeAction(()=>this.copyCsv(),e)});
      if(this.spec.images!==false){exportItems.push({id:'svg',label:'图形 SVG',onInvoke:e=>this.invokeAction(()=>this.exportImage('svg'),e)},{id:'png',label:'图形 PNG',onInvoke:e=>this.invokeAction(()=>this.exportImage('png'),e)});}
      this.menuButton({icon:'file',title:'图表数据与图像',items:exportItems});
      for(const action of this.spec.actions||[])this.button(action.label||action.id,action.title,()=>action.onInvoke?.({view:this,plot:this.plotNode()}));
    }
    bindPortable(){
      if(this.spec.portable===false)return;
      const placements=Array.isArray(this.spec.placements)?this.spec.placements:['home','global'];
      const portableSpec={title:this.spec.portableTitle||this.title?.textContent||this.id,useTargetAsWrapper:true,handle:this.header,controlsHost:this.actions,controlsPlacement:'start',placements,defaultPlacement:this.spec.defaultPlacement||'home',stateVersion:this.spec.stateVersion||'plot-view-v1',snap:this.spec.snap,...(this.spec.portableSpec||{})};
      const factory=this.spec.portableFactory;
      this.portable=typeof factory==='function'?factory(this.id,this.card,portableSpec):this.scope.panels.create(this.id,this.card,portableSpec);
    }
    resize(reason='resize'){this.scope.requestChartResize?.({id:this.id,reason:`plot-view-${reason}`});const plot=this.plotNode();if(plot){try{window.DKDSCharts?.resize?.(plot);}catch{}}return this;}
    dispose(){if(this.disposed)return;this.disposed=true;this.ro?.disconnect?.();this.exportMenu?.dispose?.();this.exportMenu=null;this.cleanups.splice(0).forEach(cleanupCall);this.portable?.dispose?.();this.portable=null;this.actions?.querySelectorAll?.('.dkds-plot-view-action')?.forEach(el=>el.remove());this.card?.classList?.remove('dkds-plot-view');this.header?.classList?.remove('dkds-plot-view-head');}
  }

  class PlotViewRegistry {
    constructor(scope){this.scope=scope;this.byId=new Map();this.byCard=new WeakMap();this.observers=[];}
    bind(id,card,spec={}){
      const node=resolveElement(card);if(!node)throw new Error(`PlotView card not found: ${id}`);
      const key=String(id||node.dataset?.plotViewId||'plot');let view=this.byCard.get(node)||this.byId.get(key)||null;
      if(view&&(view.disposed||view.card!==node))view=null;
      if(view){view.configure?.(spec);this.byId.set(key,view);return view;}
      view=this.scope.trackObject(new PlotView(this.scope,key,node,spec));this.byCard.set(node,view);this.byId.set(key,view);node.dataset.dkdsPlotViewBound='1';return view;
    }
    cards(root){
      const node=resolveElement(root);if(!node)return[];const selector='[data-dkds-plot-card],.analysis-chart-card,.dkds-chart-surface';const rows=[];
      if(node.matches?.(selector))rows.push(node);for(const el of node.querySelectorAll?.(selector)||[])rows.push(el);return [...new Set(rows)];
    }
    hydrate(root,spec={}){
      const rows=[];for(const card of this.cards(root)){
        const bound=this.byCard.get(card);if(bound&&!bound.disposed){rows.push(bound);continue;}
        const plot=resolveScopedElement(spec.plotSelector||'[data-dkds-plot],.analysis-chart,.dkds-chart-plot,.dkds-scientific-chart-host',card);if(!plot)continue;
        const header=resolveScopedElement(spec.headerSelector||'[data-dkds-plot-header],.analysis-chart-title,.dkds-chart-head',card);
        const plotId=String(plot.id||card.dataset?.plotId||card.dataset?.groupMetric||`plot-${this.byId.size+1}`);const alreadyPrime=card.dataset.dkdsPrimeOwned==='1'||card.classList.contains('dkds-portable-view');
        const base={plot,header,portable:alreadyPrime?false:spec.portable!==false,placements:spec.placements||['home','left','right','bottom','global'],defaultPlacement:spec.defaultPlacement||'home',stateVersion:spec.stateVersion||'plot-view-v2',portableFactory:spec.portableFactory};
        try{rows.push(this.bind(`auto:${plotId}`,card,base));}catch(err){console.warn('[DKDS PlotView hydrate]',plotId,err);}
      }return rows;
    }
    observe(root,spec={}){
      const node=resolveElement(root);if(!node)return()=>{};let queued=false;const run=()=>{queued=false;this.hydrate(node,spec);};const schedule=()=>{if(queued)return;queued=true;queueMicrotask(run);};schedule();
      if(!window.MutationObserver)return()=>{};const observer=new MutationObserver(schedule);observer.observe(node,{childList:true,subtree:true});this.observers.push(observer);return()=>{observer.disconnect();const i=this.observers.indexOf(observer);if(i>=0)this.observers.splice(i,1);};
    }
    get(id){return this.byId.get(String(id||''))||null;}
    dispose(){for(const observer of this.observers)observer.disconnect();this.observers=[];this.byId.clear();this.byCard=new WeakMap();}
  }
