(() => {
  function mount(ctx,page,handlers={}){
    const units=ctx.ui.unitTemplates;
    if(!units)throw new Error('Transfer Curve Vth Lab Unit presentation requires ui.unit-templates.');

    const header=units.pageHeader.create(page,{
      variant:'page-owned',activity:'transfer-vth-lab',title:'Vth 工作台',
      subtitle:'恒流邻域 Vth · 双向扫描 · 交互拟合窗口',close:true,
      onClose:()=>ctx.workspace.closePage?.('transferVthLabPage'),
      actions:[
        {id:'refresh',icon:'↻',label:'刷新数据',order:10,onInvoke:()=>handlers.refresh?.()},
        {id:'fit',icon:'⌂',label:'适应视图',order:20,onInvoke:()=>handlers.fitView?.()},
        {id:'settings',icon:'⚙',label:'默认设置',order:30,onInvoke:()=>handlers.openSettings?.()}
      ]
    });
    const pageUnit=units.page.create(page,{variant:'analysis'}),body=pageUnit.element;
    const workspaceHost=units.layout.create(body,{variant:'identity'});
    const workbench=units.workspace.create(workspaceHost,{variant:'standard',header:false,activity:'transfer-vth-lab',primaryScroll:'contained',leftWidth:300,leftMin:260,leftReserve:300,layoutStateVersion:'vth-production-unit-v1'});

    const controlsHost=units.layout.create(null,{variant:'stack-comfortable',geometry:{gap:'10px',minWidth:'0'}});

    const dataPanel=units.panel.create(controlsHost,{variant:'headed',title:'数据',sizing:'content'});
    units.layout.apply(dataPanel.body,{variant:'stack',geometry:{padding:'10px',gap:'8px',minWidth:'0'}});
    const sourceBadge=units.chip.create(dataPanel.header.actions,{variant:'quiet',text:'—'});
    const curve=units.field.create(dataPanel.body,{variant:'select',kind:'select',label:'当前曲线',value:'',options:[]});
    units.note.create(dataPanel.body,{variant:'meta',text:'数据导入由 Core 统一提供；这里只显示分配给 Vth 工作台的数据。'});
    units.toolbar.create(dataPanel.body,{variant:'ordinary',actions:[
      {id:'refresh',label:'刷新',onInvoke:()=>handlers.refresh?.()},
      {id:'demo',label:'示例',onInvoke:()=>handlers.demo?.()}
    ]});

    const extraction=units.panel.create(controlsHost,{variant:'plain',header:false,sizing:'content'});
    units.layout.apply(extraction.body,{variant:'stack',geometry:{padding:'10px',gap:'8px',minWidth:'0'}});
    units.header.create(extraction.body,{kind:'content',variant:'content',title:'阈值提取',actions:false});
    const method=units.field.create(extraction.body,{variant:'select',kind:'select',label:'方法',value:'linear-window',options:[
      {value:'linear-window',label:'恒流邻域线性回归'},{value:'interpolation',label:'恒流插值'}
    ]});
    const branch=units.field.create(extraction.body,{variant:'select',kind:'select',label:'扫描段',value:'auto',options:[
      {value:'auto',label:'自动'},{value:'first',label:'第一扫描段'},{value:'second',label:'第二扫描段'},{value:'all',label:'全部数据'}
    ]});
    const targetCurrent=units.field.create(extraction.body,{variant:'input',label:'目标电流 / A',inputType:'number',step:'any'});
    const lowCurrent=units.field.create(extraction.body,{variant:'input',label:'拟合下限 / A',inputType:'number',step:'any'});
    const highCurrent=units.field.create(extraction.body,{variant:'input',label:'拟合上限 / A',inputType:'number',step:'any'});
    const absoluteCurrent=units.check.create(extraction.body,{variant:'checkbox',label:'使用 |I|',checked:true});
    const logY=units.check.create(extraction.body,{variant:'checkbox',label:'对数显示',checked:true});
    const showAllCurves=units.check.create(extraction.body,{variant:'checkbox',label:'显示全部曲线',checked:true});
    const controls=Object.freeze({curve:curve.control,method:method.control,branch:branch.control,targetCurrent:targetCurrent.control,lowCurrent:lowCurrent.control,highCurrent:highCurrent.control,absoluteCurrent:absoluteCurrent.input,logY:logY.input,showAllCurves:showAllCurves.input});

    const dataControl=units.prime.build({id:'data-control',label:'数据',variant:'fixed-titleless',presentationRole:'data-control',presentationPurpose:'parameters',semanticKind:'panel',priority:90,collapsible:true,fixed:true,header:false,existingNode:controlsHost,sizing:'fill',autoOpen:true,defaultPlacement:'left',placements:['left'],stateVersion:'presentation-v4'});

    const main=units.layout.create(null,{variant:'fill-rows',geometry:{width:'100%',height:'100%',minWidth:'0',minHeight:'0',gap:'10px'}});
    const metricsHost=units.layout.create(main,{variant:'metric-grid'});
    const metrics={};
    for(const [key,label] of [['vth','Vth'],['branch','扫描段'],['r2','R²'],['n','拟合点数']])metrics[key]=units.metric.create(metricsHost,{variant:'standard',label,value:'—'}).value;

    const plotPanel=units.panel.detached({variant:'plot-card',header:false,sizing:'fill'});
    units.layout.apply(plotPanel.body,{variant:'plot-card-fill'});
    const plotHeader=units.header.create(plotPanel.body,{kind:'plot',variant:'plot',title:'转移曲线',meta:'未加载数据'});
    units.layout.apply(plotHeader.element,{variant:'plot-card-header'});
    const plotTarget=units.layout.create(plotPanel.body,{variant:'identity',geometry:{width:'100%',height:'100%',minWidth:'0',minHeight:'0',overflow:'hidden'}});

    const resultsHost=units.layout.create(null,{variant:'scroll-pane',geometry:{minHeight:'140px'}});
    const tableSurface=units.table.mount('vth-results',resultsHost,{variant:'standard',persistKey:'transfer-vth-results',appearance:{density:'compact',stripe:'subtle'},columns:[],rows:[]});
    const split=units.splitPane.create(main,{id:'vth-results-height-v3',variant:'resizable',axis:'y',resizeTarget:'second',defaultSize:180,min:140,reserve:300,reflowBelow:920,trackToken:'--dkds-unit-vth-results-height',first:plotPanel.element,second:resultsHost});

    workbench.compose({primary:{id:'vth-main',label:'Vth 工作台',presentationRole:'scientific-primary',scroll:'contained',titlePolicy:'host-only',mainNode:main},primes:[dataControl],subs:[]});

    let plotSurface=null;
    function createPlotSurface(spec={}){
      plotSurface?.dispose?.();
      plotSurface=units.scientificPlot.create(plotTarget,{variant:'curve',source:'transfer-vth-lab',...spec});
      return plotSurface;
    }
    function dispose(){
      try{plotSurface?.dispose?.();}catch{}
      try{tableSurface?.dispose?.();}catch{}
      try{split?.dispose?.();}catch{}
      try{workbench?.dispose?.();}catch{}
    }
    return Object.freeze({header,body,workspaceHost,workbench,controls,sourceBadge,metrics,plotHeader,plotTarget,tableSurface,split,createPlotSurface,get plotSurface(){return plotSurface;},dispose});
  }
  window.DKDSPluginModules.define('com.dkds.transfer-vth-lab','unit-presentation',Object.freeze({mount}));
})();
