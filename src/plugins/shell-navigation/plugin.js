(() => {
  DKDSPlugins.define({
    id:'builtin.shell-navigation',name:'Shell Navigation',version:'1.2.0',apiVersion:'1.8.0',requiresCore:["recipes"],
    description:'Registers the Core-owned responsive shell navigation recipe.',source:'builtin',order:6,
    capabilities:['ui.styles','ui.activity','core.recipe']
  }, async ctx => ctx.recipes.use('shell-navigation'));
})();
