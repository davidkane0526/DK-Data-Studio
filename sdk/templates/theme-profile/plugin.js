DKDSPlugins.define({
  "id": "example.theme-profile",
  "name": "Example Theme Profile",
  "version": "1.0.0",
  "apiVersion": "1.19.0",
  "entry": "plugin.js",
  "pluginType": "theme",
  "requiresCore": [
    "ui.theme"
  ],
  "description": "Theme Contract 3.10 contextual component/material composition, semantic states, scientific fallback palette and Core-rendered depth example"
}, async ctx => {
  const profile=ctx.ui.theme.register('default',{
    label:'Example Theme',
    recipes:{chrome:'thin-glass',sidebar:'thin-glass',surface:'clear',elevated:'thin-glass',popover:'thin-glass',control:'clear',floating:'thin-glass',contexts:{'workspace-modal':{elevated:'thin-glass'},compact:{popover:'thin-glass',floating:'thin-glass'}}},
    appearance:{
      roles:{chrome:{surface:'#F3F1FC'},sidebar:{surface:'#EEF7F5'},elevated:{surface:'#FFF5F8'},popover:{surface:'#F0F3FF'},floating:{surface:'#EEF8FA'}},
      components:{
        tab:{surfaceHover:'#F3F1FC',surfaceActive:'#EEE9FF',textActive:'#352A79',indicator:'#705CE8'},
        toolbarAction:{surfaceHover:'#F3F1FC',surfaceActive:'#E9F8F6',textActive:'#0D615D',shadow:'none',shadowHover:'0 1px 4px rgba(47,55,80,.10)',shadowSelected:'0 0 0 2px rgba(112,92,232,.16)',radius:8,contexts:{grouped:{shadow:'none',shadowHover:'none',shadowSelected:'none'},standalone:{variants:{primary:{shadow:'0 3px 10px rgba(112,92,232,.22)'}}}},roles:{floating:{contexts:{grouped:{shadowHover:'0 1px 5px rgba(47,55,80,.08)'}}}},variants:{primary:{surface:'#705CE8',text:'#FFFFFF'},secondary:{surface:'#E9F8F6',text:'#0D615D'},destructive:{surface:'#FFF0F2',text:'#C2414B'}}},
        panelHeader:{surface:'#F7F5FD'},inspectorHeader:{surface:'#EFF8F7',indicator:'#17A7A0'},
        menuItem:{surfaceHover:'#F3F1FC'},chip:{surface:'#F5F1FF',variants:{info:{surface:'#EDF4FF',text:'#2563EB'},success:{surface:'#EAF8EF',text:'#15803D'}}},field:{surface:'#FFFFFF',border:'#D8DEEA',borderActive:'#705CE8'}
      }
    },
    effects:{headerGradientStart:'transparent',headerGradientEnd:'transparent',accentGlow:'#705CE8',edgeGlow:'#17A7A0',ambientTint:'transparent',glowIntensity:.08,glowRadius:12,gradientDirection:'horizontal'},
    scientific:{mode:'fallback-only',seriesPalette:['#2563EB','#14B8A6','#8B5CF6','#EF4444','#F59E0B','#0891B2']},
    settings:[
      {id:'popoverBlur',label:'Popover blur',target:{scope:'material',role:'popover',key:'materialBlurStrong'},type:'range',min:0,max:64,step:1},
      {id:'popoverRecipe',label:'Popover material',target:{scope:'recipe',role:'popover'},type:'select',options:['clear','thin-glass','soft-glass','liquid-glass']}
    ],
    material:{
      // Historical name: materialTintOpacity is the semantic base-material fill opacity, not an accent-color tint amount.
      materialBlur:12,materialBlurStrong:18,materialSaturation:1.055,materialTintOpacity:.66,contexts:{compact:{materialBlur:16,materialBlurStrong:20,materialTintOpacity:.78},panel:{materialBlur:12,materialBlurStrong:16,materialTintOpacity:.72},dialog:{materialBlur:14,materialBlurStrong:18,materialTintOpacity:.80},'workspace-modal':{materialBlur:6,materialBlurStrong:8,materialTintOpacity:.92}},specularHighlight:'rgba(255,255,255,.18)',innerHighlight:'rgba(255,255,255,.10)',glassEdge:'rgba(148,163,184,.22)',materialNoiseOpacity:.015,roles:{chrome:{materialBlur:10,materialTintOpacity:.62},sidebar:{materialBlur:12,materialTintOpacity:.68},elevated:{materialBlur:16,materialBlurStrong:18,materialTintOpacity:.66,contexts:{'workspace-modal':{materialBlur:6,materialBlurStrong:8,materialTintOpacity:.94}}},popover:{materialBlur:18,materialBlurStrong:22,materialTintOpacity:.84},control:{materialBlur:0,materialTintOpacity:1},floating:{materialBlur:14,materialBlurStrong:18,materialTintOpacity:.64}}},
    motion:{motionFast:90,motionNormal:150,motionSlow:240,easeStandard:'cubic-bezier(.2,.8,.2,1)',easeEmphasized:'cubic-bezier(.2,.75,.25,1)',hoverLift:-1,pressScale:.98},
    modes:{
      light:{tokens:{canvas:'#F5F7FC',surface:'#FFFFFF',surfaceSoft:'#F3F1FC',surfaceSidebar:'#EEF7F5',surfaceElevated:'#FFF5F8',controlBg:'#FFFFFF',divider:'rgba(79,91,116,.12)',controlBorder:'rgba(79,91,116,.22)',text:'#1C2740',textSoft:'#59677F',muted:'#7B879B',accent:'#705CE8',accentHover:'#604BD9',accentSoft:'rgba(112,92,232,.12)',accentAlt:'#17A7A0',accentAltHover:'#128E88',accentAltSoft:'rgba(23,167,160,.12)',focus:'rgba(23,167,160,.20)',success:'#15803D',successSoft:'#EAF8EF',warning:'#B45309',warningSoft:'#FFF4E5',danger:'#C2414B',dangerSoft:'#FFF0F2',info:'#2563EB',infoSoft:'#EDF4FF',selectionSurface:'rgba(112,92,232,.14)',selectionText:'#352A79',selectionBorder:'rgba(112,92,232,.45)',activeSurface:'rgba(23,167,160,.13)',activeText:'#0D615D',disabledSurface:'#EEF1F5',disabledText:'#98A2B3'}},
      dark:{tokens:{canvas:'#101420',surface:'#171C28',surfaceSoft:'#211D37',surfaceSidebar:'#14262B',surfaceElevated:'#2A202B',controlBg:'#1B2230',divider:'rgba(186,198,218,.12)',controlBorder:'rgba(186,198,218,.20)',text:'#EEF2F8',textSoft:'#C6CFDD',muted:'#929EB0',accent:'#9887FF',accentHover:'#AA9BFF',accentSoft:'rgba(152,135,255,.16)',accentAlt:'#39C5BC',accentAltHover:'#56D4CC',accentAltSoft:'rgba(57,197,188,.14)',focus:'rgba(57,197,188,.24)',success:'#58C784',successSoft:'rgba(88,199,132,.14)',warning:'#F2B45F',warningSoft:'rgba(242,180,95,.14)',danger:'#F07B85',dangerSoft:'rgba(240,123,133,.14)',info:'#75A7FF',infoSoft:'rgba(117,167,255,.14)',selectionSurface:'rgba(152,135,255,.18)',selectionText:'#F2EFFF',selectionBorder:'rgba(152,135,255,.55)',activeSurface:'rgba(57,197,188,.16)',activeText:'#D9FFFC',disabledSurface:'#202633',disabledText:'#697589'}}
    }
  });
  return {deactivate(){profile?.dispose?.();}};
});
