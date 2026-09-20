(() => {
  const manifest={"id":"com.example.scientific-reference","name":"Scientific Reference Studio","version":"1.0.0","apiVersion":"1.19.0","entry":"plugin.js","scripts":["plugin.js"],"platformPresentation":{"desktop":{"mode":"shared"},"mobile":{"mode":"adaptive"}},"enabled":true,"order":910,"description":"SDK 1.49 reference workbench proving accepted-scientific-v1 can reproduce the accepted scientific panel composition without domain-private CSS or DOM.","requiresCore":["status","ui.dom","ui.workspace","ui.group-area","ui.pages"],"capabilities":["ui.page","ui.plugin-workspace","ui.group-area"],"pluginType":"workbench","data":{"accepts":["science.transport.iv"]}};
  DKDSPlugins.define(manifest, async ctx => {
    const dom=ctx.ui.dom;
    const page=ctx.ui.pages.add({
      id:'scientific-reference-studio',label:'参考工作台',title:'Scientific Reference Studio',order:910,
      html:'<div class="analysis-page-body"><div class="sdk149-reference-root"></div></div>'
    });
    const root=dom.query('.sdk149-reference-root',page);
    const primaryTools=['锁定所选','解锁所选','智能排序','标记','重新居中'].map(label=>dom.create('button',{attrs:{type:'button'},text:label}));
    const primaryLegend=['数据 A','数据 B','数据 C'].map(label=>dom.create('button',{attrs:{type:'button'},text:label}));
    const primaryContent=dom.create('div',{attrs:{'data-reference-content':'main'},text:'Main scientific content'});
    const parameters=dom.create('div');
    dom.append(parameters,
      dom.create('section',{html:'<h3>数据</h3><label>数据源<select><option>示例数据</option></select></label>'}),
      dom.create('section',{html:'<h3>分析</h3><label>模式<select><option>标准</option></select></label><button type="button">运行</button>'}),
      dom.create('section',{html:'<h3>显示</h3><label><input type="checkbox" checked> 显示标记</label>'})
    );
    const inspector=dom.create('div',{html:'<section><h3>当前对象</h3><div>选择一条数据以查看详情。</div></section><section><h3>操作</h3><button type="button">锁定</button> <button type="button">解除锁定</button></section>'});
    const plots=['指标 A','指标 B','指标 C','指标 D'].map((title,index)=>({
      id:`metric-${index+1}`,title,portable:true,
      render:(host)=>dom.text(host,`${title} · SDK PlotView`)
    }));
    const wb=ctx.ui.scientificWorkbench.create(root,{
      id:'scientific-reference',activity:'scientific-reference',profile:'accepted-scientific-v1',
      primary:{id:'main',label:'主界面',template:'analysis-main',tools:primaryTools,legend:primaryLegend,content:primaryContent,status:'数据 4 · 可见 4 · 结果 4'},
      primes:[
        {id:'data-control',template:'data-control',label:'参数',presentationRole:'data-control',semanticKind:'panel',content:parameters,autoOpen:true,defaultPlacement:'left',placements:['left'],fixed:true},
        {id:'inspector',template:'inspector',label:'检查',title:'曲线检查器',presentationRole:'inspector',semanticKind:'inspector',content:inspector,autoOpen:true,defaultPlacement:'right',placements:['float','global','left','right','bottom']},
        {id:'group',template:'plot-group',label:'组图',title:'组图面板',meta:'当前可见数据：4 条扫描',presentationRole:'scientific-secondary',semanticKind:'panel',collapsible:true,autoOpen:true,defaultPlacement:'bottom',placements:['float','global','left','right','bottom'],group:{columns:3,maxColumns:6,minItemWidth:290,responsive:true},plots}
      ]
    });
    ctx.status.set('Scientific Reference Studio 已使用 SDK 1.49 公共组合层加载。');
    return {deactivate(){wb.dispose?.();}};
  });
})();
