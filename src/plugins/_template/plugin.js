(() => {
  GRSPlugins.define({
    id: 'example.plugin',
    name: 'Example Plugin',
    version: '0.1.0',
    apiVersion: '1.0.0',
    order: 900,
    capabilities: ['ui.page']
  }, async ctx => {
    ctx.ui.pages.add({
      id: 'example-page',
      label: '示例插件',
      title: 'Example plugin page',
      order: 900,
      html: `
        <div class="analysis-page-header">
          <div><h2>示例插件</h2><div class="analysis-subtitle">This page was mounted by a plugin.</div></div>
          <button class="analysis-page-close" onclick="document.getElementById(this.closest('.analysis-page').id).classList.add('hidden')">返回主图</button>
        </div>
        <div class="analysis-page-body">
          <div class="analysis-control-card">Replace this content with your plugin UI.</div>
        </div>`
    });

    ctx.project.registerSlice('settings', {
      serialize: () => ({ example: true }),
      restore: data => console.debug('[example.plugin] restore', data)
    });

    return {
      deactivate() {}
    };
  });
})();
