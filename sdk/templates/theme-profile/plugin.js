DKDSPlugins.define({
  id:'example.theme-profile',
  name:'Example Theme Profile',
  version:'1.0.0',
  apiVersion:'1.17.0',
  requiresCore:['ui.theme']
}, async ctx => {
  const profile=ctx.ui.theme.register('default',{
    label:'Example Theme',
    modes:{
      light:{
        canvas:'#eef4fb', surface:'#fbfcfe', surfaceSoft:'#f6f9fd', surfaceSidebar:'#f7f9fc',
        controlBg:'#fbfcfe', divider:'rgba(102,132,168,.085)', controlBorder:'rgba(102,132,168,.22)',
        text:'#1c2a43', textSoft:'#60708c', muted:'#7f8ba8', accent:'#096bfa', accentSoft:'#eaf2ff'
      },
      dark:{
        canvas:'#151922', surface:'#1d232e', surfaceSoft:'#202733', surfaceSidebar:'#191f29',
        controlBg:'#232b37', divider:'rgba(166,181,202,.024)', controlBorder:'rgba(166,181,202,.16)',
        text:'#e4e9f2', textSoft:'#b5c0d0', muted:'#8995a8', accent:'#4d8dff', accentSoft:'#202d55'
      }
    }
  });

  // A theme plugin may activate its own profile, or expose a settings control
  // that calls ctx.ui.theme.activate('default') when the user selects it.
  ctx.ui.theme.activate('default');
  return { deactivate(){ profile?.dispose?.(); } };
});
