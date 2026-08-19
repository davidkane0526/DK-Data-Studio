(() => {
  const A = window.Analysis;
  const $ = s => document.querySelector(s);

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[c]);
  }

  function csvCell(value) {
    const s = String(value ?? '');
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
  }

  function cloneSerializable(value) {
    if (value === null || value === undefined) return value;
    try { return structuredClone(value); }
    catch { return JSON.parse(JSON.stringify(value)); }
  }

  function createState() {
    return {files:[],activeId:null,dialogOpen:false,resultScope:'checked'};
  }

  function finiteValue(value) {
    return value !== null && value !== undefined && String(value).trim() !== '' && Number.isFinite(Number(value));
  }

  function nullableNumber(value) {
    if (value === null || value === undefined || String(value).trim() === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function guessColumn(ins, kind) {
    const hs = (ins?.headers || []).map(h => String(h || '').toLowerCase());
    if (kind === 'time') {
      const j = hs.findIndex(h => /time|时间/.test(h));
      return j >= 0 ? j : -1;
    }
    if (kind === 'current') {
      const j = hs.findIndex(h => /\bid\b|current|(^|[^a-z])i(?:\W|$)/.test(h));
      return j >= 0 ? j : Math.min(1, Math.max(0, hs.length - 1));
    }
    if (kind === 'voltage') {
      let j = hs.findIndex(h => /\bvd\b|\bvds\b|voltage|bias/.test(h));
      if (j < 0) j = hs.findIndex(h => /(^|[^a-z])v(?:\W|$)/.test(h) && !/vg|gate/.test(h));
      return j;
    }
    return -1;
  }

  function defaultSettings(ins, name='') {
    const inferred = A.inferPulseProtocolFromName?.(name) || {};
    const timeCol=guessColumn(ins,'time');
    const currentCol=guessColumn(ins,'current');
    const voltageCol=guessColumn(ins,'voltage');
    return {
      segmentationMode:'auto',
      timeCol,
      currentCol,
      voltageCol,
      cycleSamples:0,
      cycleOffsetSamples:0,
      writeStartSample:null,
      writeEndSample:null,
      readStartSample:null,
      readEndSample:null,
      writeDuration:nullableNumber(inferred.writeDuration),
      readDuration:nullableNumber(inferred.readDuration),
      sampleInterval:null,
      phaseOrder:'write-read',
      readVoltage:nullableNumber(inferred.readVoltage),
      pulseVoltage:nullableNumber(inferred.pulseVoltage),
      blockSamples:0,
      windowStartFraction:.25,
      windowEndFraction:.75,
      readPairMode:'after'
    };
  }

  function columnOptions(ins, selected, {optional=false, optionalLabel='未记录'}={}) {
    const options = (ins?.headers || []).map((h,i) =>
      `<option value="${i}" ${Number(selected)===i?'selected':''}>${i+1}: ${esc(h)}</option>`
    ).join('');
    return optional
      ? `<option value="-1" ${Number(selected)<0?'selected':''}>— ${esc(optionalLabel)} —</option>${options}`
      : options;
  }

  function modeName(mode) {
    return ({cycle:'按周期点数',timing:'按时间协议',waveform:'按记录电压',legacy:'旧版等点数',auto:'自动'})[mode] || '旧版等点数';
  }

  function safeName(label) {
    return String(label || 'pulse').trim()
      .replace(/[\\/:*?"<>|]+/g,'_').replace(/\s+/g,'_').slice(0,80) || 'pulse';
  }

  function currentScale(values) {
    const max = Math.max(0, ...(values || []).map(v=>Math.abs(v)).filter(Number.isFinite));
    if (max >= 1) return {factor:1,unit:'A'};
    if (max >= 1e-3) return {factor:1e3,unit:'mA'};
    if (max >= 1e-6) return {factor:1e6,unit:'µA'};
    if (max >= 1e-9) return {factor:1e9,unit:'nA'};
    return {factor:1e12,unit:'pA'};
  }

  window.DKDSPulseAnalysisService = {
    async create({host,setStatus,copyTextToClipboard,savePlotlyImage,scheduleSnapshot}) {
      let state = createState();

      const active = () => state.files.find(f=>f.id===state.activeId) || null;
      const checked = () => state.files.filter(f=>f.checked);
      const visibleResults = () => {
        const item = active();
        if (state.resultScope === 'active') return item?.result ? [item] : [];
        return state.files.filter(f=>f.checked && f.result);
      };
      const label = item => String(item?.label || item?.name || 'Pulse data').trim() || 'Pulse data';
      const resultMode = result => result?.segmentationMode || 'legacy';

      function makeItem(meta, data) {
        const inspection = A.inspectDataText({
          name:meta.name,path:meta.path,text:data.text,encoding:data.encoding
        }, A.defaultImportOptions());
        return {
          id:`pulse::${Date.now()}::${Math.random().toString(36).slice(2,8)}`,
          path:meta.path,name:meta.name,size:meta.size||data.size||0,
          label:String(meta.name||'').replace(/\.[^.]+$/,''),
          checked:true,text:data.text,encoding:data.encoding,inspection,
          settings:defaultSettings(inspection,meta.name),
          result:null,error:'',loading:false,analyzedAt:null
        };
      }

      function syncEditor() {
        const item = active();
        if (!item || !$('#pulseWindowStart')) return item;
        const start = Math.max(0,Math.min(95,Number($('#pulseWindowStart').value)||25));
        const end = Math.max(start+1,Math.min(100,Number($('#pulseWindowEnd').value)||75));
        item.label = String($('#pulseSeriesLabel').value || item.label || item.name).trim() || item.name;
        item.settings = {
          segmentationMode:$('#pulseSegmentationMode').value||'auto',
          timeCol:Number($('#pulseTimeCol').value),
          currentCol:Number($('#pulseCurrentCol').value),
          voltageCol:Number($('#pulseVoltageCol').value),
          cycleSamples:Math.max(0,Math.round(Number($('#pulseCycleSamples').value)||0)),
          cycleOffsetSamples:Math.max(0,Math.round(Number($('#pulseCycleOffsetSamples').value)||0)),
          writeStartSample:nullableNumber($('#pulseWriteStartSample').value),
          writeEndSample:nullableNumber($('#pulseWriteEndSample').value),
          readStartSample:nullableNumber($('#pulseReadStartSample').value),
          readEndSample:nullableNumber($('#pulseReadEndSample').value),
          writeDuration:nullableNumber($('#pulseWriteDuration').value),
          readDuration:nullableNumber($('#pulseReadDuration').value),
          sampleInterval:nullableNumber($('#pulseSampleInterval').value),
          phaseOrder:$('#pulsePhaseOrder').value||'write-read',
          readVoltage:nullableNumber($('#pulseReadVoltageFallback').value),
          pulseVoltage:nullableNumber($('#pulsePulseVoltageFallback').value),
          blockSamples:Math.max(0,Math.round(Number($('#pulseBlockSamples').value)||0)),
          windowStartFraction:start/100,
          windowEndFraction:end/100,
          readPairMode:$('#pulseReadPairMode').value||'after'
        };
        scheduleSnapshot();
        return item;
      }

      function analysisOptions(item) {
        const s = {...defaultSettings(item.inspection,item.name),...(item.settings||{})};
        const options={
          segmentationMode:s.segmentationMode||'auto',
          timeCol:Number(s.timeCol),
          currentCol:Number(s.currentCol),
          voltageCol:Number(s.voltageCol),
          cycleSamples:Math.max(0,Math.round(Number(s.cycleSamples)||0)),
          cycleOffsetSamples:Math.max(0,Math.round(Number(s.cycleOffsetSamples)||0)),
          writeStartSample:nullableNumber(s.writeStartSample),
          writeEndSample:nullableNumber(s.writeEndSample),
          readStartSample:nullableNumber(s.readStartSample),
          readEndSample:nullableNumber(s.readEndSample),
          writeDuration:nullableNumber(s.writeDuration),
          readDuration:nullableNumber(s.readDuration),
          sampleInterval:nullableNumber(s.sampleInterval),
          phaseOrder:s.phaseOrder||'write-read',
          readVoltage:nullableNumber(s.readVoltage),
          pulseVoltage:nullableNumber(s.pulseVoltage),
          blockSamples:Math.max(0,Math.round(Number(s.blockSamples)||0)),
          windowStartFraction:Number.isFinite(Number(s.windowStartFraction))?Number(s.windowStartFraction):.25,
          windowEndFraction:Number.isFinite(Number(s.windowEndFraction))?Number(s.windowEndFraction):.75,
          readPairMode:s.readPairMode||'after'
        };
        // The editor has always advertised “0 = automatic cycle estimate”.
        // Make that UI contract real without mutating the user's saved protocol.
        if(options.segmentationMode==='auto'&&options.cycleSamples<=1){
          const estimate=A.estimatePulseCycleSamples?.(item.inspection,{currentCol:options.currentCol,voltageCol:options.voltageCol})||0;
          if(Number(estimate)>1){options.cycleSamples=Math.round(Number(estimate));options.__autoEstimatedCycle=true;}
        }
        return options;
      }

      function analyzeItem(item) {
        const previousResult=item?.result||null,previousAnalyzedAt=item?.analyzedAt||'';
        if (!item?.text || !item.inspection) {
          item.error = '文件内容不可用。';
          if(!previousResult)item.result=null;
          return false;
        }
        const file={name:item.name,path:item.path,text:item.text,encoding:item.encoding};
        const options=analysisOptions(item);
        try {
          let nextResult;
          try{nextResult=A.analyzePulseReadData(file,options);}
          catch(firstError){
            // An automatic periodic estimate may occasionally be ambiguous. If
            // it fails, retry the mature auto path instead of turning a
            // previously usable file into a permanent error state.
            if(options.segmentationMode==='auto'&&options.__autoEstimatedCycle===true){
              const fallback={...options,cycleSamples:0};delete fallback.__autoEstimatedCycle;
              try{nextResult=A.analyzePulseReadData(file,fallback);}catch{throw firstError;}
            }else throw firstError;
          }
          if(!nextResult||!Array.isArray(nextResult.points))throw new Error('脉冲分析没有返回有效结果。');
          item.result=nextResult;
          item.error='';
          item.analyzedAt=new Date().toISOString();
          item.lastResolvedAnalysis={segmentationMode:nextResult.segmentationMode||options.segmentationMode,cycleSamples:Number(nextResult.cycleSamples||options.cycleSamples)||0};
          return true;
        } catch (err) {
          item.result=previousResult;
          item.analyzedAt=previousAnalyzedAt;
          item.error=err?.message||String(err);
          return false;
        }
      }

      function renderFileList() {
        const el = $('#pulseFileList');
        if (!el) return;
        el.innerHTML = '';
        if (!state.files.length) el.innerHTML = '<div class="pulse-file-empty">尚未添加脉冲数据文件</div>';

        for (const item of state.files) {
          const row = document.createElement('div');
          const isActive = item.id === state.activeId;
          row.className = `pulse-batch-file-item ${isActive?'active':''} ${item.error&&!item.result?'error':''} ${item.error&&item.result?'warning':''}`;
          const rv = nullableNumber(item.result?.readVoltage);
          const meta = item.result
            ? `${modeName(resultMode(item.result))} · ${rv!==null?`读取≈${rv.toFixed(4)} V`:'未记录读取电压'} · ${item.result.points.length} 组${item.error?' · 重算失败，保留上次结果':''}`
            : item.error ? item.error : item.loading ? '读取中…' : '待分析';
          row.innerHTML = `
            <div class="pulse-batch-file-main">
              <input class="pulse-file-check" type="checkbox" ${item.checked?'checked':''}>
              <div class="pulse-batch-file-text">
                <div class="pulse-batch-file-label" title="${esc(label(item))}">${esc(label(item))}</div>
                <div class="pulse-batch-file-name" title="${esc(item.name)}">${esc(item.name)}</div>
              </div>
              <span class="pulse-file-state ${item.result?'done':item.error?'bad':''}">${item.result?'已分析':item.error?'错误':'待处理'}</span>
            </div>
            <div class="pulse-batch-file-meta">${esc(meta)}</div>`;
          row.querySelector('.pulse-file-check').onclick = e => {
            e.stopPropagation();
            item.checked = e.target.checked;
            renderFileList();
            renderComparison();
            scheduleSnapshot();
          };
          row.onclick = () => {
            state.activeId = item.id;
            render();
          };
          el.appendChild(row);
        }
        const rows = checked();
        const analyzed = rows.filter(f=>f.result).length;
        const errors = rows.filter(f=>f.error).length;
        const summary = $('#pulseBatchFileSummary');
        if (summary) summary.textContent = `${state.files.length} 个文件 · ${rows.length} 个勾选 · ${analyzed} 个已分析${errors?` · ${errors} 个错误`:''}`;
        if ($('#pulseAnalyzeCheckedBtn')) $('#pulseAnalyzeCheckedBtn').disabled = !rows.length;
        if ($('#pulseRemoveFilesBtn')) $('#pulseRemoveFilesBtn').disabled = !rows.length;
      }

      function renderSummary() {
        const item = active();
        const box = $('#pulseSummary');
        if (!box) return;
        const r = item?.result;
        if (!item) { box.innerHTML='<span class="pulse-summary-placeholder">请选择文件。</span>'; return; }
        if (item.error && !r) { box.innerHTML=`<span class="pulse-summary-error">${esc(item.error)}</span>`; return; }
        if (!r) { box.innerHTML='<span class="pulse-summary-placeholder">当前文件尚未分析。</span>'; return; }
        const rows = [
          ['分段方式',modeName(resultMode(r))],
          ['读取电压',finiteValue(r.readVoltage)?`${Number(r.readVoltage).toFixed(6)} V`:'未记录 / 未指定'],
          ['脉冲/读取对',String(r.points.length)],
          ['稳态窗口',`${(r.windowStartFraction*100).toFixed(0)}–${(r.windowEndFraction*100).toFixed(0)}%`]
        ];
        if (r.protocol?.cycleSamples>1) rows.splice(1,0,['周期点数',String(r.protocol.cycleSamples)]);
        if (r.protocol?.writeDuration>0) rows.splice(1,0,['写入宽度',`${r.protocol.writeDuration} s`]);
        if (r.protocol?.readDuration>0) rows.splice(2,0,['读取宽度',`${r.protocol.readDuration} s`]);
        if (finiteValue(r.blockSamples)) rows.splice(1,0,['平台点数',String(r.blockSamples)]);
        box.innerHTML = rows.map(([k,v])=>`<span class="pulse-stat-chip"><span>${esc(k)}</span><strong>${esc(v)}</strong></span>`).join('');
      }

      function renderEditor() {
        const item = active();
        const noActive = $('#pulseNoActiveFile');
        const editor = $('#pulseActiveEditor');
        if (!noActive || !editor) return;
        noActive.classList.toggle('hidden',!!item);
        editor.classList.toggle('hidden',!item);
        $('#pulseAnalyzeCurrentBtn').disabled = !item;
        if (!item) return;

        const s = {...defaultSettings(item.inspection,item.name),...(item.settings||{})};
        item.settings = s;
        $('#pulseActiveFileName').textContent = item.name;
        $('#pulseActiveFileMeta').textContent =
          `${item.inspection?.rowCount||0} 个有效数据行 · ${item.inspection?.headers?.length||0} 列 · ${item.encoding||'auto'}`
          + (item.result?` · 最近分析 ${item.result.points.length} 个脉冲/读取对`:'');
        $('#pulseSeriesLabel').value = label(item);
        $('#pulseSegmentationMode').value = s.segmentationMode||'auto';
        $('#pulseTimeCol').innerHTML = columnOptions(item.inspection,s.timeCol,{optional:true,optionalLabel:'未记录时间'});
        $('#pulseCurrentCol').innerHTML = columnOptions(item.inspection,s.currentCol);
        $('#pulseVoltageCol').innerHTML = columnOptions(item.inspection,s.voltageCol,{optional:true,optionalLabel:'未记录电压'});
        const cycleEstimate = A.estimatePulseCycleSamples?.(item.inspection,{currentCol:Number(s.currentCol),voltageCol:Number(s.voltageCol)})||0;
        $('#pulseCycleSamples').value = Number(s.cycleSamples)||0;
        $('#pulseCycleSamples').placeholder = cycleEstimate>1?`0 = 自动（≈${cycleEstimate}）`:'0 = 自动';
        $('#pulseCycleOffsetSamples').value = Math.max(0,Math.round(Number(s.cycleOffsetSamples)||0));
        $('#pulseWriteStartSample').value = finiteValue(s.writeStartSample)?String(Math.round(Number(s.writeStartSample))):'';
        $('#pulseWriteEndSample').value = finiteValue(s.writeEndSample)?String(Math.round(Number(s.writeEndSample))):'';
        $('#pulseReadStartSample').value = finiteValue(s.readStartSample)?String(Math.round(Number(s.readStartSample))):'';
        $('#pulseReadEndSample').value = finiteValue(s.readEndSample)?String(Math.round(Number(s.readEndSample))):'';
        $('#pulseWriteDuration').value = finiteValue(s.writeDuration)?String(s.writeDuration):'';
        $('#pulseReadDuration').value = finiteValue(s.readDuration)?String(s.readDuration):'';
        $('#pulseSampleInterval').value = finiteValue(s.sampleInterval)?String(s.sampleInterval):'';
        $('#pulsePhaseOrder').value = s.phaseOrder||'write-read';
        $('#pulseReadVoltageFallback').value = finiteValue(s.readVoltage)?String(s.readVoltage):'';
        $('#pulsePulseVoltageFallback').value = finiteValue(s.pulseVoltage)?String(s.pulseVoltage):'';
        $('#pulseBlockSamples').value = Number(s.blockSamples)||0;
        $('#pulseWindowStart').value = Math.round((Number(s.windowStartFraction)||.25)*100);
        $('#pulseWindowEnd').value = Math.round((Number(s.windowEndFraction)||.75)*100);
        $('#pulseReadPairMode').value = s.readPairMode||'after';
        renderSummary();
      }

      function emptyPlot(id,message) {
        if (!document.getElementById(id)) return;
        Plotly.react(id,[],{
          margin:{l:25,r:25,t:25,b:25},
          xaxis:{visible:false},yaxis:{visible:false},
          annotations:[{text:message,x:.5,y:.5,xref:'paper',yref:'paper',showarrow:false,font:{size:13,color:'#98a2b3'}}],
          paper_bgcolor:'#fff',plot_bgcolor:'#fff'
        },{responsive:true,displaylogo:false,displayModeBar:false});
      }

      function renderRaw() {
        const item = active();
        const r = item?.result;
        const sub = $('#pulseRawSubtitle');
        if (sub) sub.textContent = item
          ? `${label(item)} · ${item.name}。${r&&!(r.raw.voltage||[]).some(Number.isFinite)?'该文件未记录电压，仅显示电流–时间波形。':'原始波形只显示当前文件。'}`
          : '原始波形只显示当前文件，避免多个瞬态文件叠加后无法判断分段质量。';
        if (!r) { emptyPlot('pulseRawPlot',item?'当前文件尚未分析':'请选择左侧文件'); return; }

        const scale = currentScale(r.raw.current);
        const hasVoltage = (r.raw.voltage||[]).some(Number.isFinite);
        const config = {responsive:true,displaylogo:false,displayModeBar:false,scrollZoom:true,doubleClick:'reset'};
        if (!hasVoltage) {
          Plotly.react('pulseRawPlot',[{
            x:r.raw.time,y:r.raw.current.map(v=>v*scale.factor),mode:'lines',name:'Id',line:{width:1.2},
            hovertemplate:`Time=%{x:.7g}<br>Id=%{y:.7g} ${scale.unit}<extra>Id</extra>`
          }],{
            margin:{l:82,r:34,t:42,b:66},
            xaxis:{title:'Time',gridcolor:'#edf0f5',automargin:true},
            yaxis:{title:`Id (${scale.unit})`,gridcolor:'#edf0f5',automargin:true},
            hovermode:'x unified',dragmode:'zoom',autosize:true,paper_bgcolor:'#fff',plot_bgcolor:'#fff'
          },config);
          return;
        }
        Plotly.react('pulseRawPlot',[
          {x:r.raw.time,y:r.raw.voltage,mode:'lines',name:'Vd',line:{width:1.25},yaxis:'y'},
          {x:r.raw.time,y:r.raw.current.map(v=>v*scale.factor),mode:'lines',name:'Id',line:{width:1.15},yaxis:'y2'}
        ],{
          margin:{l:82,r:34,t:54,b:66},
          xaxis:{title:'Time',anchor:'y2',gridcolor:'#edf0f5',automargin:true},
          yaxis:{title:'Vd (V)',domain:[0.57,1],gridcolor:'#edf0f5',automargin:true},
          yaxis2:{title:`Id (${scale.unit})`,domain:[0,0.42],gridcolor:'#edf0f5',automargin:true},
          legend:{orientation:'h',x:0,y:1.10,yanchor:'bottom'},
          hovermode:'x unified',dragmode:'zoom',autosize:true,paper_bgcolor:'#fff',plot_bgcolor:'#fff'
        },config);
      }

      function baseLayout(yTitle,showLegend=false,xTitle='脉冲电压 (V)') {
        return {
          margin:{l:78,r:24,t:showLegend?48:26,b:64},
          xaxis:{title:xTitle,gridcolor:'#edf0f5',automargin:true},
          yaxis:{title:yTitle,gridcolor:'#edf0f5',automargin:true},
          hovermode:'closest',showlegend:showLegend,
          legend:{orientation:'h',x:0,y:1.08,yanchor:'bottom'},
          dragmode:'zoom',autosize:true,paper_bgcolor:'#fff',plot_bgcolor:'#fff'
        };
      }

      function tableNumber(value,kind='number') {
        if (!finiteValue(value)) return '';
        const n = Number(value);
        return kind === 'current' ? n.toExponential(8) : n.toPrecision(9);
      }

      function renderTable() {
        const items = visibleResults();
        const rows = [];
        for (const item of items) for (const d of item.result.points) rows.push({item,d});
        if ($('#pulseResultMeta')) $('#pulseResultMeta').textContent = items.length
          ? `当前显示 ${items.length} 个文件、${rows.length} 个脉冲/读取对。未记录的电压保持为空，不会伪造数值。`
          : '没有可显示的已分析结果。';
        const table = $('#pulseResultTable');
        if (!table) return;
        table.innerHTML = `
          <thead><tr><th>标签</th><th>源文件</th><th>#</th><th>分段</th><th>Vpulse (V)</th><th>Ipulse (A)</th><th>Vread (V)</th><th>Iread (A)</th><th>Pulse time</th><th>Read time</th><th>Pulse block</th><th>Read block</th></tr></thead>
          <tbody>${rows.map(({item,d})=>`<tr>
            <td class="pulse-table-label">${esc(label(item))}</td><td class="pulse-table-source">${esc(item.name)}</td>
            <td>${d.sequence??d.index+1}</td><td>${esc(modeName(resultMode(item.result)))}</td>
            <td>${tableNumber(d.pulseVoltage)}</td><td>${tableNumber(d.pulseCurrent,'current')}</td>
            <td>${tableNumber(d.readVoltage)}</td><td>${tableNumber(d.readCurrent,'current')}</td>
            <td>${tableNumber(d.pulseTime)}</td><td>${tableNumber(d.readTime)}</td>
            <td>${d.pulseBlockIndex??''}</td><td>${d.readBlockIndex??''}</td></tr>`).join('')}</tbody>`;
      }

      function renderComparison() {
        const items = visibleResults();
        if ($('#pulseComparedSummary')) $('#pulseComparedSummary').textContent = `${items.length} 个已分析文件正在显示`;
        if (!items.length) {
          emptyPlot('pulseReadPlot','没有可显示的已分析文件');
          emptyPlot('pulsePulsePlot','没有可显示的已分析文件');
          renderTable();
          return;
        }
        const currents = [];
        for (const item of items) currents.push(...item.result.points.map(p=>p.readCurrent),...item.result.points.map(p=>p.pulseCurrent));
        const scale = currentScale(currents);
        const showLegend = items.length > 1;
        const voltageX = items.every(item=>item.result.points.every(p=>finiteValue(p.pulseVoltage)));
        const xTitle = voltageX ? '脉冲电压 (V)' : '脉冲序号';
        const xValue = p => voltageX ? Number(p.pulseVoltage) : (Number(p.sequence)||Number(p.index)+1);
        const readTraces = [], pulseTraces = [];
        for (const item of items) {
          const pts = item.result.points, name = label(item);
          readTraces.push({
            x:pts.map(xValue),y:pts.map(p=>p.readCurrent*scale.factor),
            mode:'lines+markers',name,marker:{size:6},line:{width:1.7},
            hovertemplate:`${esc(name)}<br>${voltageX?'Vpulse':'Pulse #'}=%{x}<br>Iread=%{y:.6g} ${scale.unit}<extra></extra>`
          });
          pulseTraces.push({
            x:pts.map(xValue),y:pts.map(p=>p.pulseCurrent*scale.factor),
            mode:'lines+markers',name,marker:{size:6},line:{width:1.7},
            hovertemplate:`${esc(name)}<br>${voltageX?'Vpulse':'Pulse #'}=%{x}<br>Ipulse=%{y:.6g} ${scale.unit}<extra></extra>`
          });
        }
        const config = {responsive:true,displaylogo:false,displayModeBar:false,scrollZoom:true,doubleClick:'reset'};
        Plotly.react('pulseReadPlot',readTraces,baseLayout(`读取电流 (${scale.unit})`,showLegend,xTitle),config);
        Plotly.react('pulsePulsePlot',pulseTraces,baseLayout(`脉冲电流 (${scale.unit})`,showLegend,xTitle),config);
        renderTable();
      }

      function render() {
        renderFileList();
        renderEditor();
        if ($('#pulseResultScope')) $('#pulseResultScope').value = state.resultScope||'checked';
        renderRaw();
        renderComparison();
        requestAnimationFrame(()=>{
          for (const id of ['pulseRawPlot','pulseReadPlot','pulsePulsePlot']) {
            const el=document.getElementById(id);
            if (el) try { Plotly.Plots.resize(el); } catch {}
          }
        });
      }

      async function addFiles() {
        if (state.dialogOpen) return;
        state.dialogOpen = true;
        let metas = [];
        try { metas = await window.electronAPI.openDataFiles(); }
        finally { state.dialogOpen = false; }
        if (!metas?.length) return;
        const paths = new Set(state.files.map(f=>f.path));
        let added=0;
        for (const meta of metas) {
          if (paths.has(meta.path)) continue;
          try {
            const data = await window.electronAPI.readDataText({path:meta.path,encoding:'auto'});
            const item = makeItem(meta,data);
            state.files.push(item); paths.add(meta.path); added++;
            if (!state.activeId) state.activeId=item.id;
          } catch (err) {
            state.files.push({
              id:`pulse::${Date.now()}::${Math.random().toString(36).slice(2,8)}`,
              path:meta.path,name:meta.name,size:meta.size||0,label:String(meta.name||'').replace(/\.[^.]+$/,''),
              checked:true,text:'',encoding:'',inspection:null,settings:{},result:null,error:err?.message||String(err),loading:false
            });
          }
        }
        render(); scheduleSnapshot();
        if (added) setStatus(`已加入 ${added} 个脉冲数据文件。`);
      }

      function removeChecked() {
        const ids = new Set(state.files.filter(f=>f.checked).map(f=>f.id));
        state.files = state.files.filter(f=>!ids.has(f.id));
        if (ids.has(state.activeId)) state.activeId = state.files[0]?.id || null;
        render(); scheduleSnapshot();
        setStatus(`已移除 ${ids.size} 个文件。`);
      }

      function analyzeCurrent() {
        const item = syncEditor();
        if (!item) { setStatus('请先选择一个脉冲数据文件。'); return; }
        const ok = analyzeItem(item);
        render(); scheduleSnapshot();
        setStatus(ok ? `已分析 ${label(item)}：${item.result.points.length} 个脉冲/读取对。` : `脉冲分析失败：${item.error}`);
      }

      async function analyzeChecked() {
        syncEditor();
        const items = checked();
        if (!items.length) { setStatus('没有勾选需要分析的脉冲文件。'); return; }
        let ok=0,fail=0;
        for (let i=0;i<items.length;i++) {
          const item=items[i]; item.loading=true; renderFileList();
          setStatus(`批量脉冲分析：${i+1}/${items.length} · ${label(item)}`);
          await new Promise(r=>setTimeout(r,0));
          if (analyzeItem(item)) ok++; else fail++;
          item.loading=false;
        }
        render(); scheduleSnapshot();
        setStatus(`批量脉冲分析完成：${ok} 个成功${fail?`，${fail} 个失败`:''}。`);
      }

      function applySettings() {
        const item = syncEditor();
        if (!item) return;
        const template = {...item.settings};
        let count=0;
        for (const other of checked()) {
          if (other.id===item.id) continue;
          other.settings={...template};other.result=null;other.error='';count++;
        }
        render();scheduleSnapshot();
        setStatus(`已将当前设置复制到 ${count} 个其他勾选文件。`);
      }

      function csvValue(value) { return finiteValue(value) ? String(Number(value)) : ''; }
      function rawCsv() {
        const item=active(),r=item?.result;if(!r)return '';
        const rows=['label,source_file,index,time,voltage_V,current_A'];
        const n=Math.max(r.raw.time.length,(r.raw.voltage||[]).length,r.raw.current.length);
        for(let i=0;i<n;i++)rows.push([csvCell(label(item)),csvCell(item.name),i,csvValue(r.raw.time[i]),csvValue(r.raw.voltage?.[i]),csvValue(r.raw.current[i])].join(','));
        return rows.join('\n');
      }
      function readCsv() {
        const rows=['label,source_file,index,segmentation_mode,pulse_voltage_V,read_voltage_V,read_current_A,read_time,read_block'];
        for(const item of visibleResults())for(const d of item.result.points)rows.push([
          csvCell(label(item)),csvCell(item.name),d.sequence??d.index+1,resultMode(item.result),
          csvValue(d.pulseVoltage),csvValue(d.readVoltage),csvValue(d.readCurrent),csvValue(d.readTime),d.readBlockIndex??''
        ].join(','));
        return rows.join('\n');
      }
      function pulseCsv() {
        const rows=['label,source_file,index,segmentation_mode,pulse_voltage_V,pulse_current_A,pulse_time,pulse_block'];
        for(const item of visibleResults())for(const d of item.result.points)rows.push([
          csvCell(label(item)),csvCell(item.name),d.sequence??d.index+1,resultMode(item.result),
          csvValue(d.pulseVoltage),csvValue(d.pulseCurrent),csvValue(d.pulseTime),d.pulseBlockIndex??''
        ].join(','));
        return rows.join('\n');
      }
      function resultCsv() {
        const rows=['label,source_file,index,segmentation_mode,pulse_voltage_V,pulse_current_A,read_voltage_V,read_current_A,pulse_time,read_time,pulse_block,read_block'];
        for(const item of visibleResults())for(const d of item.result.points)rows.push([
          csvCell(label(item)),csvCell(item.name),d.sequence??d.index+1,resultMode(item.result),
          csvValue(d.pulseVoltage),csvValue(d.pulseCurrent),csvValue(d.readVoltage),csvValue(d.readCurrent),
          csvValue(d.pulseTime),csvValue(d.readTime),d.pulseBlockIndex??'',d.readBlockIndex??''
        ].join(','));
        return rows.join('\n');
      }

      async function saveCsv(name,content) {
        if (!content) return false;
        return window.electronAPI.saveText({defaultName:name,content,filters:[{name:'CSV',extensions:['csv']}]});
      }

      function serialize() {
        return {
          activeId:state.activeId,resultScope:state.resultScope||'checked',
          files:state.files.map(item=>({
            id:item.id,path:item.path,name:item.name,size:item.size,label:item.label,checked:item.checked,
            text:item.text,encoding:item.encoding,settings:{...(item.settings||{})},
            analyzed:!!item.result,analyzedAt:item.analyzedAt||null,
            result:item.result ? cloneSerializable(item.result) : null
          }))
        };
      }

      function restore(saved) {
        const next=createState();
        if (saved && Array.isArray(saved.files)) {
          next.resultScope=saved.resultScope==='active'?'active':'checked';
          for (const source of saved.files) {
            try {
              const inspection=A.inspectDataText({name:source.name,path:source.path,text:source.text||'',encoding:source.encoding||'auto'},A.defaultImportOptions());
              const item={
                id:source.id||`pulse::${Date.now()}::${Math.random().toString(36).slice(2,8)}`,
                path:source.path||source.name,name:source.name||'pulse-data',size:Number(source.size)||0,
                label:source.label||String(source.name||'').replace(/\.[^.]+$/,''),
                checked:source.checked!==false,text:source.text||'',encoding:source.encoding||'auto',
                inspection,settings:{...defaultSettings(inspection,source.name),...(source.settings||{})},
                result:source.result ? cloneSerializable(source.result) : null,
                error:'',loading:false,analyzedAt:source.analyzedAt||null
              };
              // New projects persist the computed result. Re-run analysis only
              // when migrating older project files that stored analyzed=true
              // without a result payload.
              if(source.analyzed && !item.result)analyzeItem(item);
              next.files.push(item);
            } catch {}
          }
          next.activeId=next.files.some(f=>f.id===saved.activeId)?saved.activeId:(next.files[0]?.id||null);
        }
        state=next;
        if ($('#pulseFileList')) render();
      }

      const service = {
        render,
        addFiles,
        setAllChecked(value){state.files.forEach(f=>f.checked=!!value);renderFileList();renderComparison();scheduleSnapshot();},
        removeChecked,
        analyzeCurrent,
        analyzeChecked,
        applySettingsToChecked:applySettings,
        syncEditor,
        refreshFileAndComparison(){renderFileList();renderComparison();},
        setResultScope(value){state.resultScope=value==='active'?'active':'checked';renderComparison();scheduleSnapshot();},
        fitRaw(){if(!active()?.result)return false;Plotly.relayout('pulseRawPlot',{'xaxis.autorange':true,'yaxis.autorange':true,'yaxis2.autorange':true});return true;},
        copyRaw:()=>copyTextToClipboard(rawCsv(),'当前原始脉冲波形 CSV'),
        exportRawCsv:()=>saveCsv(`${safeName(label(active()))}_raw_waveform.csv`,rawCsv()),
        exportRawSvg:()=>active()?.result&&savePlotlyImage('pulseRawPlot',`${safeName(label(active()))}_raw_waveform`,'svg'),
        exportRawPng:()=>active()?.result&&savePlotlyImage('pulseRawPlot',`${safeName(label(active()))}_raw_waveform`,'png'),
        copyRead:()=>copyTextToClipboard(readCsv(),'可见脉冲电压-读取电流 CSV'),
        exportReadCsv:()=>saveCsv('pulse_voltage_read_current_visible.csv',readCsv()),
        exportReadSvg:()=>visibleResults().length&&savePlotlyImage('pulseReadPlot','pulse_voltage_read_current_visible','svg'),
        exportReadPng:()=>visibleResults().length&&savePlotlyImage('pulseReadPlot','pulse_voltage_read_current_visible','png'),
        copyPulse:()=>copyTextToClipboard(pulseCsv(),'可见脉冲电压-脉冲电流 CSV'),
        exportPulseCsv:()=>saveCsv('pulse_voltage_pulse_current_visible.csv',pulseCsv()),
        exportPulseSvg:()=>visibleResults().length&&savePlotlyImage('pulsePulsePlot','pulse_voltage_pulse_current_visible','svg'),
        exportPulsePng:()=>visibleResults().length&&savePlotlyImage('pulsePulsePlot','pulse_voltage_pulse_current_visible','png'),
        copyResults:()=>copyTextToClipboard(resultCsv(),'可见脉冲分析结果 CSV'),
        exportResults:()=>saveCsv('pulse_read_analysis_visible.csv',resultCsv()),
        serialize,
        restore,
        reset(){state=createState();if($('#pulseFileList'))render();scheduleSnapshot();},
        getState:()=>state
      };

      return {serviceName:'pulse',service,getState:()=>state,render};
    }
  };
})();
