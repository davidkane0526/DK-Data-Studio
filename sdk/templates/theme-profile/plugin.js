DKDSPlugins.define({
  id:'example.theme-profile',
  name:'Example Theme Profile',
  version:'1.0.0',
  apiVersion:'1.17.0',
  pluginType:'theme',
  requiresCore:['ui.theme'],
  compatibility:{app:'>=3.61.81 <4.0.0',pluginApi:'^1.17.0',themeContract:'^3.5.0'}
}, async ctx => {
  if(!ctx.ui.theme.supports('contract.material.recipes')||!ctx.ui.theme.supports('contract.theme.settings'))throw new Error(`Theme Contract 3.5 Thin Glass recipes/settings required; host provides ${ctx.ui.theme.contractVersion}`);
  const profile=ctx.ui.theme.register('default',{
    label:'Example Theme',
    recipes:{chrome:'thin-glass',sidebar:'thin-glass',surface:'clear',elevated:'thin-glass',popover:'thin-glass',control:'clear',floating:'thin-glass'},
    settings:[
      {id:'popoverBlur',label:'Popover blur',target:{scope:'material',role:'popover',key:'materialBlurStrong'},type:'range',min:0,max:64,step:1},
      {id:'popoverRecipe',label:'Popover material',target:{scope:'recipe',role:'popover'},type:'select',options:['clear','thin-glass','soft-glass','liquid-glass']}
    ],
    material:{
      // Canonical 3.2 values are platform-neutral numbers: logical length units,
      // opacity 0..1, and saturation multipliers. px/% strings remain 3.1-compatible.
      materialBlur:12, materialBlurStrong:18, materialSaturation:1.055,
      // Historical token name: materialTintOpacity is the semantic base-material
      // fill opacity used by Core glass recipes, not an accent-color tint amount.
      // Values near .03 mean almost fully transparent; use readable glass values.
      materialTintOpacity:.66, specularHighlight:'rgba(255,255,255,.18)',
      innerHighlight:'rgba(255,255,255,.10)', glassEdge:'rgba(148,163,184,.22)',
      materialNoiseOpacity:.015,
      roles:{
        chrome:{materialBlur:10,materialTintOpacity:.62},
        sidebar:{materialBlur:12,materialTintOpacity:.68},
        elevated:{materialBlur:16,materialBlurStrong:18,materialTintOpacity:.66},
        popover:{materialBlur:18,materialBlurStrong:22,materialTintOpacity:.84},
        control:{materialBlur:0,materialTintOpacity:1},
        floating:{materialBlur:14,materialBlurStrong:18,materialTintOpacity:.64}
      }
    },
    motion:{
      motionFast:90, motionNormal:150, motionSlow:240,
      easeStandard:'cubic-bezier(.2,.8,.2,1)',
      easeEmphasized:'cubic-bezier(.2,.75,.25,1)',
      hoverLift:-1, pressScale:.98
    },
    modes:{
      light:{
        tokens:{
          canvas:'#eef4fb', surface:'#fbfcfe', surfaceSoft:'#f6f9fd', surfaceSidebar:'#f7f9fc',
          controlBg:'#fbfcfe', divider:'rgba(102,132,168,.085)', controlBorder:'rgba(102,132,168,.22)',
          text:'#1c2a43', textSoft:'#60708c', muted:'#7f8ba8', accent:'#096bfa', accentSoft:'#eaf2ff'
        },
        material:{roles:{chrome:{materialTintOpacity:.64},sidebar:{materialBlur:12,materialTintOpacity:.70},elevated:{materialTintOpacity:.68},popover:{materialTintOpacity:.86},floating:{materialTintOpacity:.66}}}
      },
      dark:{
        tokens:{
          canvas:'#151922', surface:'#1d232e', surfaceSoft:'#202733', surfaceSidebar:'#191f29',
          controlBg:'#232b37', divider:'rgba(166,181,202,.024)', controlBorder:'rgba(166,181,202,.16)',
          text:'#e4e9f2', textSoft:'#b5c0d0', muted:'#8995a8', accent:'#4d8dff', accentSoft:'#202d55'
        },
        material:{materialBlur:12,roles:{chrome:{materialTintOpacity:.60},sidebar:{materialTintOpacity:.68},elevated:{materialTintOpacity:.64},popover:{materialBlurStrong:22,materialTintOpacity:.82},floating:{materialTintOpacity:.62}}}
      }
    }
  });

  // Registration does not force activation. Plugin Manager owns user selection;
  // a theme may still call ctx.ui.theme.activate(...) from an explicit user action.
  return { deactivate(){ profile?.dispose?.(); } };
});
