(() => {
  DKDSPlugins.define({
    id:'builtin.workspace-safeguards',name:'Workspace Safeguards',version:'1.1.0',apiVersion:'1.9.0',requiresCore:["recipes"],
    description:'Registers Core-owned workspace/import integrity safeguards.',source:'builtin',order:5,
    capabilities:['ui.styles','workspace.integrity','data.import','core.recipe']
  }, async ctx => ctx.recipes.use('workspace-safeguards'));
})();
