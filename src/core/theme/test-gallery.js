(() => {
  'use strict';
  const VERSION='3.0.0';
  const BASE={
    light:{canvas:'#eef4fb',surface:'#fbfcfe',surfaceSoft:'#f6f9fd',surfaceElevated:'#fff',surfaceSidebar:'#f7f9fc',controlBg:'#fbfcfe',controlHover:'#f0f5fc',controlBorder:'rgba(102,132,168,.22)',divider:'rgba(102,132,168,.085)',text:'#1c2a43',textSoft:'#60708c',muted:'#7f8ba8',accent:'#096bfa',accentSoft:'#eaf2ff'},
    dark:{canvas:'#151922',surface:'#1d232e',surfaceSoft:'#202733',surfaceElevated:'#222a36',surfaceSidebar:'#191f29',controlBg:'#232b37',controlHover:'#2a3442',controlBorder:'rgba(166,181,202,.16)',divider:'rgba(166,181,202,.024)',text:'#e4e9f2',textSoft:'#b5c0d0',muted:'#8995a8',accent:'#4d8dff',accentSoft:'#202d55'}
  };
  const kebab=value=>String(value||'').replace(/[A-Z]/g,m=>`-${m.toLowerCase()}`);
  const cssName=key=>`--dkui-${kebab(key)}`;
  const roleVar=(role,key)=>`--dkui-role-${kebab(role)}-${kebab(key)}`;
  const componentVar=(component,key)=>`--dkui-component-${kebab(component)}-${kebab(key)}`;
  const materialMap={materialBlur:'blur',materialBlurStrong:'blur-strong',materialSaturation:'saturation',materialTintOpacity:'tint-opacity',specularHighlight:'specular-highlight',innerHighlight:'inner-highlight',glassEdge:'glass-edge',materialNoiseOpacity:'noise-opacity'};
  function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
  function previewVars(profileId,mode){
    const preview=window.DKDSTheme?.preview?.(profileId,mode)||{tokens:{},appearance:{roles:{},components:{}},material:{base:{},roles:{}},scientific:{seriesPalette:[]}};
    const vars=[],tokens={...BASE[mode],...(preview.tokens||{})};
    for(const [key,value] of Object.entries(tokens))vars.push(`${cssName(key)}:${value}`);
    for(const [role,values] of Object.entries(preview.appearance?.roles||{}))for(const [key,value] of Object.entries(values||{}))vars.push(`${roleVar(role,key)}:${value}`);
    for(const [component,values] of Object.entries(preview.appearance?.components||{}))for(const [key,value] of Object.entries(values||{}))vars.push(`${componentVar(component,key)}:${value}`);
    for(const [key,value] of Object.entries(preview.material?.base||{}))if(materialMap[key])vars.push(`--dkui-material-${materialMap[key]}:${value}`);
    for(const [role,values] of Object.entries(preview.material?.roles||{}))for(const [key,value] of Object.entries(values||{}))if(materialMap[key])vars.push(`--dkui-material-${role}-${materialMap[key]}:${value}`);
    const palette=preview.scientific?.seriesPalette||[];for(let i=0;i<8;i++)vars.push(`--dkds-gallery-series-${i}:${palette[i]||['#2563eb','#0f9f94','#7c3aed','#e5484d','#d97706','#0891b2','#be185d','#65a30d'][i]}`);
    return {style:vars.join(';'),preview};
  }
  function meta(component,slot='surface',material=''){
    const path=component?`appearance.components.${component}.${slot}`:'';
    return `<small class="dkds-theme-gallery-meta" data-gallery-meta data-component="${escapeHtml(component)}" data-slot="${escapeHtml(slot)}" data-material="${escapeHtml(material)}">${component?`${escapeHtml(component)} · ${escapeHtml(slot)} · ${escapeHtml(path)}`:`material · ${escapeHtml(material)}`}</small>`;
  }
  function componentBlock(title,body,component,slot='surface',material=''){
    return `<article class="dkds-theme-gallery-demo"><div class="dkds-theme-gallery-demo-title">${escapeHtml(title)}</div>${body}${meta(component,slot,material)}</article>`;
  }
  function panel(profileId,mode){
    const {style}=previewVars(profileId,mode);
    const tabs=`<div class="dkds-theme-gallery-tabs"><button class="activity-tab">Idle</button><button class="activity-tab active">Active</button><button class="activity-tab selected" aria-selected="true">Selected</button></div>`;
    const toolbar=`<div class="toolbar-group"><button class="toolbar-btn">Default</button><button class="toolbar-btn active" aria-pressed="true">Active</button><button class="toolbar-btn" disabled>Disabled</button><button data-dkds-action-tone="secondary">Secondary</button><button class="primary">Primary</button></div>`;
    const headers=`<div class="dkds-surface-header"><strong>Panel Header</strong><button class="dkds-icon-button">⋯</button></div><div class="floating-header" data-dkds-inspector-header><strong>Inspector Header</strong><span>Vd</span></div>`;
    const fields=`<div class="dkds-theme-gallery-fields"><input value="Field" readonly><select><option>Select</option></select><textarea readonly>Textarea</textarea></div>`;
    const menus=`<div class="dkds-theme-gallery-menu dkds-material-role-popover"><button class="plugin-menu-item" role="menuitem">Menu item</button><button class="plugin-menu-item selected" role="menuitem" aria-selected="true">Selected</button></div>`;
    const chips=`<div class="dkds-theme-gallery-chips"><span class="dkds-chip">Chip</span><span class="dkds-chip selected" aria-selected="true">Selected</span><span class="dkds-theme-semantic is-info">Info</span><span class="dkds-theme-semantic is-success">Success</span><span class="dkds-theme-semantic is-warning">Warning</span><span class="dkds-theme-semantic is-danger">Danger</span></div>`;
    const floating=`<div class="dkds-floating-surface dkds-material-role-floating"><strong>Floating Chrome</strong><div><button class="dkds-icon-button">−</button><button class="dkds-icon-button">+</button><button class="dkds-icon-button">⌂</button></div></div>`;
    const status=`<div class="statusbar"><span>Ready</span><span class="dkds-summary-chip">Theme</span><span>12 MB</span></div>`;
    const plot=`<div class="dkds-theme-gallery-plot"><div class="dkds-plot-view-head dkds-material-role-chrome"><strong class="dkds-plot-view-title">ScientificPlot</strong><div class="dkds-plot-view-actions"><button class="dkds-plot-view-action">□</button><button class="dkds-plot-view-action">↧</button></div></div><svg viewBox="0 0 300 110" aria-label="scientific palette preview"><path d="M8 84 C45 68 65 20 112 52 S200 22 292 36" fill="none" stroke="var(--dkds-gallery-series-0)" stroke-width="3"/><path d="M8 72 C60 84 105 31 150 58 S235 32 292 48" fill="none" stroke="var(--dkds-gallery-series-1)" stroke-width="3"/><path d="M8 94H292M8 8V94" stroke="var(--dkui-divider)"/></svg><div class="dkds-theme-gallery-legend"><span><i style="background:var(--dkds-gallery-series-0)"></i>Series 1</span><span><i style="background:var(--dkds-gallery-series-1)"></i>Series 2</span></div></div>`;
    const table=`<div class="dkds-theme-gallery-table"><table><thead><tr><th>Vg</th><th>Vd</th><th>I</th></tr></thead><tbody><tr><td>0</td><td>.2</td><td>1.24µ</td></tr><tr><td>5</td><td>.4</td><td>2.51µ</td></tr></tbody></table></div>`;
    return `<section class="dkds-theme-gallery-mode" data-gallery-mode="${mode}" style="${style}">
      <header class="dkds-theme-gallery-chrome dkds-material-role-chrome"><strong>${mode==='light'?'亮色':'暗色'}</strong><span>Theme 3.8 Component Gallery</span></header>
      <div class="dkds-theme-gallery-body"><aside class="dkds-theme-gallery-sidebar dkds-material-role-sidebar"><strong>Surfaces</strong><span>Chrome</span><span>Sidebar</span><span>Surface</span><span>Elevated</span><span>Popover</span><span>Floating</span></aside><main class="dkds-theme-gallery-main">
        <div class="dkds-theme-gallery-component-grid">
          ${componentBlock('Tabs',tabs,'tab','surfaceActive')}
          ${componentBlock('Toolbar actions',toolbar,'toolbarAction','surfaceActive')}
          ${componentBlock('Panel / Inspector headers',headers,'panelHeader','surface','chrome')}
          ${componentBlock('Fields',fields,'field','surface')}
          ${componentBlock('Menu / Context menu',menus,'menuItem','surfaceHover','popover')}
          ${componentBlock('Chip + semantic states',chips,'chip','surface')}
          ${componentBlock('Floating chrome',floating,'floatingChrome','surface','floating')}
          ${componentBlock('Status bar',status,'statusBar','surface','chrome')}
        </div>
        <div class="dkds-theme-gallery-science-grid">${componentBlock('ScientificPlot / Legend',plot,'panelHeader','surface','chrome')}${componentBlock('Table',table,'field','surface')}</div>
        <div class="dkds-theme-gallery-tooltip dkds-material-role-popover"><strong>Tooltip / Popover</strong><span>数据信息 Vd = 0.42 V</span>${meta('', '', 'popover')}</div>
      </main></div>
    </section>`;
  }
  function annotate(root){
    for(const row of root.querySelectorAll('[data-gallery-meta][data-component]')){
      const component=row.dataset.component,slot=row.dataset.slot;if(!component)continue;
      const variable=componentVar(component,slot),value=getComputedStyle(row.closest('.dkds-theme-gallery-mode')).getPropertyValue(variable).trim();
      const material=row.dataset.material?` · material:${row.dataset.material}`:'';
      row.textContent=`${component}.${slot} · ${variable}${value?` = ${value}`:' · Core fallback'}${material}`;
    }
  }
  function open(profileId){
    document.querySelector('.dkds-theme-gallery-overlay')?.remove();
    const id=profileId||window.DKDSTheme?.profile?.()||'builtin.default',coverage=window.DKDSTheme?.coverage?.()||{summary:{}},cov=coverage.summary||{};
    const coverageText=`Material ${cov.managed||0}/${cov.areas||0} · Components ${cov.presentComponentTypes||0}/${cov.componentTypes||0} · unused ${cov.authoredUnused||0}`;
    const overlay=document.createElement('div');overlay.className='dkds-theme-gallery-overlay';
    overlay.innerHTML=`<div class="dkds-theme-gallery-dialog"><div class="dkds-theme-gallery-head"><div><strong>Theme Component Gallery</strong><span>Theme Contract ${window.DKDSTheme?.contractVersion||'?'} · ${escapeHtml(id)} · ${coverageText}</span></div><button class="dkds-theme-gallery-close" aria-label="关闭">×</button></div><div class="dkds-theme-gallery-panes">${panel(id,'light')}${panel(id,'dark')}</div></div>`;
    document.body.appendChild(overlay);annotate(overlay);window.DKDSThemeComponentAppearance?.assign?.(overlay);
    overlay.querySelector('.dkds-theme-gallery-close').onclick=()=>overlay.remove();overlay.addEventListener('click',event=>{if(event.target===overlay)overlay.remove();});
    return overlay;
  }
  window.DKDSThemeGallery=Object.freeze({version:VERSION,open});
})();
