(() => {
  const manifest={"id":"com.example.unit-composition","name":"Unit Composition Lab","version":"1.0.0","apiVersion":"1.19.0","entry":"plugin.js","scripts":["plugin.js"],"enabled":true,"order":920,"description":"SDK 1.50 unit-template example: free workbench composition from canonical DKDS units without private CSS.","requiresCore":["status","ui.dom","ui.workspace","ui.group-area","ui.unit-templates","ui.pages"],"capabilities":["ui.page","ui.plugin-workspace","ui.group-area"],"pluginType":"workbench","platformPresentation":{"desktop":{"mode":"shared"},"mobile":{"mode":"adaptive"}},"data":{"accepts":["science.transport.iv"]}};
  DKDSPlugins.define(manifest, async ctx => {
    const dom=ctx.ui.dom,units=ctx.ui.unitTemplates;
    const page=ctx.ui.pages.add({id:'unit-composition-lab',label:'单元组合',title:'Unit Composition Lab',order:920,html:'<div class="analysis-page-body"><div class="sdk150-unit-root"></div></div>'});
    const root=dom.query('.sdk150-unit-root',page);
    const wb=ctx.ui.workspaceSurface.create(root,{id:'unit-composition',activity:'unit-composition',header:false,primaryScroll:'safe'});

    const primary=dom.create('div');
    const summary=units.panel.create(primary,{title:'结果摘要'});
    dom.text(summary.body,'这里故意采用不同于共振分析的主页面结构。');
    const plotHost=dom.create('div');primary.appendChild(plotHost);
    const mainPlot=units.plotView.create('unit-main-plot',plotHost,{title:'主数据图',render:host=>dom.text(host,'Scientific plot content')});
    wb.mountPrimary({id:'main',label:'主界面',mainNode:primary,titlePolicy:'preserve'});

    units.prime.register(wb,{id:'parameters',label:'参数',title:'参数',role:'data-control',presentationRole:'data-control',fixed:true,placements:['left'],defaultPlacement:'left',autoOpen:true,mount:({container})=>dom.text(container,'自由组合的数据控制单元')});
    units.prime.register(wb,{id:'inspector',label:'检查',title:'检查器',role:'inspector',presentationRole:'inspector',placements:['right','bottom','float','global','left'],defaultPlacement:'right',autoOpen:true,mount:({container})=>dom.text(container,'自由组合的检查器单元')});
    units.plotGroup.registerPrime(wb,{id:'results',label:'结果组图',title:'结果组图',header:'standard',presentationRole:'scientific-secondary',density:'regular',autoOpen:true,defaultPlacement:'bottom',group:{columns:2,maxColumns:4,minItemWidth:280,responsive:true},plots:[
      {id:'plot-a',title:'结果 A',render:host=>dom.text(host,'A')},
      {id:'plot-b',title:'结果 B',render:host=>dom.text(host,'B')}
    ]});

    ctx.status.set('Unit Composition Lab 已使用 SDK 1.50 单元模板加载。');
    return {deactivate(){mainPlot.dispose?.();wb.dispose?.();}};
  });
})();
