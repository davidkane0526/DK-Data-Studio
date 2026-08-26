(() => {
  'use strict';
  const BASE={
    light:{canvas:'#eef4fb',surface:'#fbfcfe',surfaceSoft:'#f6f9fd',surfaceElevated:'#fff',surfaceSidebar:'#f7f9fc',controlBg:'#fbfcfe',controlHover:'#f0f5fc',controlBorder:'rgba(102,132,168,.22)',divider:'rgba(102,132,168,.085)',text:'#1c2a43',textSoft:'#60708c',muted:'#7f8ba8',accent:'#096bfa',accentSoft:'#eaf2ff'},
    dark:{canvas:'#151922',surface:'#1d232e',surfaceSoft:'#202733',surfaceElevated:'#222a36',surfaceSidebar:'#191f29',controlBg:'#232b37',controlHover:'#2a3442',controlBorder:'rgba(166,181,202,.16)',divider:'rgba(166,181,202,.024)',text:'#e4e9f2',textSoft:'#b5c0d0',muted:'#8995a8',accent:'#4d8dff',accentSoft:'#202d55'}
  };
  const cssName=key=>'--dkui-'+key.replace(/[A-Z]/g,m=>'-'+m.toLowerCase()).replace(/^surface-soft$/,'surface-soft');
  function panel(profileId,mode){
    const preview=window.DKDSTheme?.preview?.(profileId,mode)||{tokens:{},material:{base:{},roles:{}},motion:{}};
    const tokens={...BASE[mode],...(preview.tokens||{})};
    const vars=[];for(const [key,value] of Object.entries(tokens))vars.push(`${cssName(key)}:${value}`);
    const material=preview.material?.base||{};const map={materialBlur:'blur',materialBlurStrong:'blur-strong',materialSaturation:'saturation',materialTintOpacity:'tint-opacity',specularHighlight:'specular-highlight',innerHighlight:'inner-highlight',glassEdge:'glass-edge',materialNoiseOpacity:'noise-opacity'};for(const [key,value] of Object.entries(material)){if(map[key])vars.push(`--dkui-material-${map[key]}:${value}`);}for(const [role,values] of Object.entries(preview.material?.roles||{}))for(const [key,value] of Object.entries(values||{})){if(map[key])vars.push(`--dkui-material-${role}-${map[key]}:${value}`);}
    return `<section class="dkds-theme-gallery-mode" data-gallery-mode="${mode}" style="${vars.join(';')}">
      <header class="dkds-theme-gallery-chrome dkds-material-role-chrome"><strong>${mode==='light'?'亮色':'暗色'}</strong><span>Chrome</span><button>按钮</button></header>
      <div class="dkds-theme-gallery-body">
        <aside class="dkds-theme-gallery-sidebar dkds-material-role-sidebar"><strong>Sidebar</strong><span>导航项目</span><span class="is-active">选中项目</span><span>参数与数据</span></aside>
        <main class="dkds-theme-gallery-main">
          <div class="dkds-theme-gallery-surface dkds-material-role-surface"><strong>Surface</strong><div class="dkds-theme-gallery-fields"><input value="输入框" readonly><select><option>选择框</option></select><button class="primary">主要操作</button></div></div>
          <div class="dkds-theme-gallery-grid"><div class="dkds-theme-gallery-elevated dkds-material-role-elevated"><strong>Elevated</strong><table class="dkds-table"><tr><th>参数</th><th>值</th></tr><tr><td>Vg</td><td>15 V</td></tr><tr><td>Vd</td><td>0.42 V</td></tr></table></div><div class="dkds-theme-gallery-plot dkds-material-role-surface"><strong>ScientificPlot</strong><svg viewBox="0 0 240 90" aria-label="theme plot preview"><path d="M8 72 C 45 68, 60 20, 104 48 S 170 18, 232 32" fill="none" stroke="var(--dkui-accent)" stroke-width="3"/><path d="M8 78H232M8 8V78" stroke="var(--dkui-divider)"/></svg></div></div>
          <div class="dkds-theme-gallery-dialog-card dkds-material-role-elevated"><strong>Dialog</strong><span>Modal / Settings / Confirm</span><button>确认</button></div>
          <div class="dkds-theme-gallery-popover dkds-material-role-popover"><strong>Popover</strong><span>菜单、Tooltip、Dropdown</span></div>
          <div class="dkds-theme-gallery-floating dkds-material-role-floating"><strong>Floating</strong><span>悬浮工具条 / ScientificPlot Chrome</span><div class="mini-tools"><button>−</button><button>+</button><button>⌂</button></div></div>
          <div class="dkds-theme-gallery-optical"><div class="dkds-theme-gallery-optical-pattern"><b>Vd 0.42 V</b><span>FINE GRID · 0123456789 · DATA</span><svg viewBox="0 0 300 72"><path d="M0 55 C35 15 70 65 105 18 S175 65 210 20 S270 55 300 10" fill="none" stroke="#ff4778" stroke-width="3"/><path d="M0 15H300M0 35H300M0 55H300" stroke="rgba(40,90,190,.65)" stroke-width="1"/></svg></div><div class="dkds-theme-gallery-optical-glass dkds-material-role-popover"><strong>Liquid Glass Optical Probe</strong><span data-material-diagnostic>checking edge refraction…</span></div></div>
          <div class="dkds-theme-gallery-controls"><button>普通</button><button class="primary">Primary</button><button disabled>Disabled</button><span class="chip">Chip</span></div>
        </main>
      </div>
    </section>`;
  }
  function open(profileId){
    document.querySelector('.dkds-theme-gallery-overlay')?.remove();
    const id=profileId||window.DKDSTheme?.profile?.()||'builtin.default';
    const coverage=window.DKDSTheme?.coverage?.()||{summary:{areas:0,managed:0,pluginIssues:0,ok:false},plugins:{issues:[]}};
    const cov=coverage.summary||{},coverageText=`Coverage ${cov.managed||0}/${cov.areas||0}${cov.pluginIssues?` · plugin warnings ${cov.pluginIssues}`:' · no plugin visual warnings'}`;
    const issueRows=(coverage.plugins?.issues||[]).slice(0,8).map(row=>`<li><strong>${row.pluginId||'plugin'}</strong> · ${row.source||''} · ${row.property}: ${String(row.value||'').replace(/[<>&]/g,'')}</li>`).join('');
    const overlay=document.createElement('div');overlay.className='dkds-theme-gallery-overlay';
    overlay.innerHTML=`<div class="dkds-theme-gallery-dialog"><div class="dkds-theme-gallery-head"><div><strong>Theme Test Gallery</strong><span>Theme Contract ${window.DKDSTheme?.contractVersion||window.DKDSTheme?.version||'?'} · ${id} · ${coverageText}</span></div><button class="dkds-theme-gallery-close" aria-label="关闭">×</button></div><div class="dkds-theme-gallery-panes">${panel(id,'light')}${panel(id,'dark')}</div>${issueRows?`<div class="dkds-theme-gallery-coverage-warnings"><strong>Legacy / unmanaged plugin visuals</strong><ul>${issueRows}</ul></div>`:''}</div>`;
    document.body.appendChild(overlay);
    for(const glass of overlay.querySelectorAll('.dkds-theme-gallery-optical-glass')){const row=window.DKDSThemeMaterialRenderer?.inspect?.(glass,'popover');const label=glass.querySelector('[data-material-diagnostic]');if(label)label.textContent=`${row?.status||'UNKNOWN'} · ${row?.recipe||'?'} · center ${row?.backdropFilter||'none'} · edge ${row?.edgeBackdropFilter||'none'}`;glass.dataset.materialStatus=row?.status||'UNKNOWN';}
    overlay.querySelector('.dkds-theme-gallery-close').onclick=()=>overlay.remove();overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove();});
    return overlay;
  }
  window.DKDSThemeGallery=Object.freeze({version:'2.1.0',open});
})();
