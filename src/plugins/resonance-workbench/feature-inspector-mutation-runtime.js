(() => {
  function create({actions={},services={}}={}){
    const {selectedPeak,assignPeakCategory,createPeakCategoryForPeak,renamePeakCategory,updatePeak,deletePeak,sweepById,publishSweepSelection,commitPeakMetricEdit,scheduleSnapshot}=actions;
    const {setStatus}=services;
    function peak(){return selectedPeak?.()||null;}
    function assignSelectedPeakCategory(order){const p=peak();if(!p)return false;assignPeakCategory?.(p,order);return true;}
    function createCategoryForSelectedPeak(){const p=peak();if(!p)return false;return !!createPeakCategoryForPeak?.(p);}
    function renameSelectedPeakCategory(label){const p=peak();if(!p)return false;renamePeakCategory?.(p,label);return true;}
    function toggleSelectedPeakAccepted(){const p=peak();if(!p)return false;updatePeak?.(p.id,{accepted:p.accepted===false});return true;}
    function toggleSelectedPeakLocked(){const p=peak();if(!p)return false;updatePeak?.(p.id,{locked:!p.locked});return true;}
    function resetSelectedPeakFwhmWindow(){
      const p=peak();if(!p)return false;
      delete p.analysisLeft;delete p.analysisRight;delete p.analysisManual;
      commitPeakMetricEdit?.(p,{reason:'fwhm-window-reset'});scheduleSnapshot?.();setStatus?.('已恢复自动 FWHM 分析窗口。');return true;
    }
    function deleteSelectedPeak(){const p=peak();if(!p)return false;deletePeak?.(p.id);return true;}
    function selectSelectedPeakSweep(){const p=peak();if(!p)return false;const sw=sweepById?.(p.sweepId);return sw?!!publishSweepSelection?.(sw,'resonance-inspector'):false;}
    return Object.freeze({assignSelectedPeakCategory,createCategoryForSelectedPeak,renameSelectedPeakCategory,toggleSelectedPeakAccepted,toggleSelectedPeakLocked,resetSelectedPeakFwhmWindow,deleteSelectedPeak,selectSelectedPeakSweep});
  }
  window.DKDSPluginModules.define('builtin.resonance-workbench','feature-inspector-mutation-runtime',Object.freeze({create}));
})();
