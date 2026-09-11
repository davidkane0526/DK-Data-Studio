(() => {
  DKDSPlugins.define({"id":"builtin.shell-navigation","name":"Shell Navigation","version":"1.2.0","apiVersion":"1.19.0","requiresCore":["recipes"],"entry":"plugin.js","enabled":true,"order":6,"description":"Unified top-level workspace navigation, responsive child-action overflow, and plugin-manager readability polish.","capabilities":["ui.styles","ui.activity"],"pluginType":"foundation","systemCritical":true,"platformPresentation":{"desktop":{"mode":"adaptive"},"mobile":{"mode":"adaptive"}}}, async ctx => ctx.recipes.use('shell-navigation'));
})();
