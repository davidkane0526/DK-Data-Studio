(() => {
  'use strict';
  // Standalone, read-only KXCI identity protocol. No DKDS runtime, UI or platform dependencies.
  const KEY='com.dkds.keithley-4200';
  const IDN_REQUEST='*IDN?\0';
  function parseIdentity(input,expectedSerial=''){
    const text=String(input||'').replace(/\0+$/g,'').trim();
    const parts=text.split(',').map(x=>x.trim());
    if(parts[0]!=='KEITHLEY INSTRUMENTS'||parts[1]!=='KI4200A')
      throw Error('仪器身份不匹配：'+(text||'空响应'));
    if(expectedSerial&&parts[2]!==String(expectedSerial))
      throw Error('序列号不匹配：预期 '+expectedSerial+'，实际 '+(parts[2]||'未知'));
    return Object.freeze({
      manufacturer:parts[0],model:parts[1],serial:parts[2]||'',version:parts[3]||'',raw:text
    });
  }
  const protocol=Object.freeze({IDN_REQUEST,parseIdentity});
  // Dual entry point: browser DKDS module and independent CommonJS host.
  // Neither path imports Electron, Android, nor DKDS runtime code.
  if(typeof window!=='undefined'&&window.DKDSPluginModules)window.DKDSPluginModules.define(KEY,'kxci-protocol',protocol);
  if(typeof module!=='undefined'&&module.exports)module.exports=protocol;
})();
