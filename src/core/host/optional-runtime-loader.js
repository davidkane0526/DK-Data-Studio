(() => {
  if (window.DKDSOptionalRuntime) return;
  const pending=new Map();
  function loadScript(src){
    const key=String(src||'');
    if(pending.has(key))return pending.get(key);
    const promise=new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src=key;script.async=false;
      script.onload=()=>resolve(key);script.onerror=()=>reject(new Error(`Optional runtime asset failed: ${key}`));
      document.head.appendChild(script);
    });
    pending.set(key,promise);return promise;
  }
  async function ensureThemeTooling(){
    if(window.DKDSThemeSettingsUI&&window.DKDSThemeCoverage&&window.DKDSThemeDebug&&window.DKDSThemeGallery){
      return Object.freeze({settings:window.DKDSThemeSettingsUI,coverage:window.DKDSThemeCoverage,debug:window.DKDSThemeDebug,gallery:window.DKDSThemeGallery});
    }
    await loadScript('core/theme/settings-ui.js');
    await loadScript('core/theme/coverage-runtime.js');
    await loadScript('core/theme/debug-runtime.js');
    await loadScript('core/theme/test-gallery.js');
    return Object.freeze({settings:window.DKDSThemeSettingsUI,coverage:window.DKDSThemeCoverage,debug:window.DKDSThemeDebug,gallery:window.DKDSThemeGallery});
  }
  async function ensureSdkAuthoringReference(){
    if(window.DKDSSdkAuthoringReference)return window.DKDSSdkAuthoringReference;
    await loadScript('generated/sdk-authoring-reference.js');
    if(!window.DKDSSdkAuthoringReference)throw new Error('SDK Authoring Reference is unavailable.');
    return window.DKDSSdkAuthoringReference;
  }
  async function ensureAutomationRuntime(){
    if(window.DKDSAutomationTests)return window.DKDSAutomationTests;
    await ensureThemeTooling();
    await loadScript('diagnostics/automation-smoke-cases.js');
    await loadScript('diagnostics/automation-visual-cases.js');
    await loadScript('diagnostics/automation-test-runtime.js');
    if(!window.DKDSAutomationTests)throw new Error('Automation runtime is unavailable.');
    return window.DKDSAutomationTests;
  }
  window.DKDSOptionalRuntime=Object.freeze({ensureThemeTooling,ensureSdkAuthoringReference,ensureAutomationRuntime});
})();
