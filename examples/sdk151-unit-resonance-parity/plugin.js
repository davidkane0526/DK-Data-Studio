(() => {
  const manifest={"id":"com.example.unit-resonance-parity","name":"Unit Resonance Layout Parity Lab","version":"1.0.0","apiVersion":"1.19.0","entry":"plugin.js","scripts":["plugin.js"],"enabled":true,"order":921,"description":"SDK 1.51 manual Unit Template composition that reproduces the accepted scientific workbench without using the whole-workbench preset.","requiresCore":["status","ui.dom","ui.workspace","ui.group-area","ui.unit-templates","ui.pages"],"capabilities":["ui.page","ui.plugin-workspace","ui.group-area"],"pluginType":"workbench","platformPresentation":{"desktop":{"mode":"shared"},"mobile":{"mode":"adaptive"}},"data":{"accepts":["science.transport.iv"]}};
  DKDSPlugins.define(manifest, async ctx => {
    const dom=ctx.ui.dom,units=ctx.ui.unitTemplates,g=units.metrics.acceptedScientific;
    const page=ctx.ui.pages.add({id:'unit-resonance-parity',label:'Unit Parity',title:'Unit Resonance Layout Parity Lab',order:921,html:'<div class="analysis-page-body"><div class="sdk151-unit-parity-root"></div></div>'});
    const root=dom.query('.sdk151-unit-parity-root',page);
    const wb=ctx.ui.workspaceSurface.create(root,{id:'unit-resonance-parity',activity:'unit-resonance-parity',header:false,primaryScroll:'contained',leftWidth:g.leftWidthPx,leftMin:g.leftMinPx,canvasLeftWidth:g.canvasLeftWidthPx,canvasRightWidth:g.canvasRightWidthPx,canvasBottomHeight:g.canvasBottomHeightPx});

    const main=units.layout.create(null,{variant:'accepted-main-area'});
    const workspace=units.layout.create(main,{variant:'accepted-main-workspace'});
    const plotWrap=units.layout.create(workspace,{variant:'accepted-plot-wrap'});
    const mainHeader=units.layout.create(plotWrap,{variant:'accepted-main-header'});
    units.floatingChrome.create(mainHeader,{variant:'accepted-main',content:dom.create('button',{textContent:'领域工具'})});
    units.legend.create(mainHeader,{variant:'accepted-main',content:dom.create('span',{textContent:'领域图例'})});
    units.layout.create(plotWrap,{variant:'accepted-main-plot',content:dom.create('div',{textContent:'主图内容'})});
    const status=units.status.create(main,{variant:'accepted-summary'});
    units.layout.create(status,{variant:'accepted-summary',content:dom.create('span',{textContent:'状态摘要'})});

    const parameters=units.prime.build({id:'parameters',label:'参数',title:'参数',variant:'accepted-scientific-data-control',presentationRole:'data-control',autoOpen:true,content:dom.create('div',{textContent:'领域参数'})});
    const inspector=units.prime.build({id:'inspector',label:'检查',title:'曲线检查器',variant:'accepted-scientific-inspector',presentationRole:'inspector',autoOpen:true,content:dom.create('div',{textContent:'领域检查器'})});
    const group=units.plotGroup.buildPrime({id:'group-analysis',label:'组图',title:'组图面板',variant:'accepted-scientific',presentationRole:'scientific-secondary',autoOpen:true,meta:'领域上下文',density:'regular',group:{columns:3,maxColumns:6,minItemWidth:290,responsive:true},plots:[
      {id:'unit-a',title:'数据 A',render:host=>dom.text(host,'A')},
      {id:'unit-b',title:'数据 B',render:host=>dom.text(host,'B')}
    ]});
    wb.compose({primary:{id:'main',label:'主界面',scroll:'contained',titlePolicy:'host-only',mainNode:main},primes:[parameters,inspector,group],subs:[]});
    ctx.status.set('Unit-only accepted scientific composition 已加载。');
    return {deactivate(){wb.dispose?.();}};
  });
})();
