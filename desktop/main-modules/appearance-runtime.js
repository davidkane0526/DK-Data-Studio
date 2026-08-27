'use strict';

const fs=require('fs');
const path=require('path');

function createAppearanceRuntime({app,BrowserWindow,nativeTheme}){
  let appearanceTheme='';
  function appearanceSettingsPath(){return path.join(app.getPath('userData'),'appearance.json');}
  function readPersistedAppearanceTheme(){
    try{
      const value=String(JSON.parse(fs.readFileSync(appearanceSettingsPath(),'utf8'))?.theme||'').toLowerCase();
      return ['light','dark'].includes(value)?value:'';
    }catch{return '';}
  }
  function nativeWindowBackground(theme=appearanceTheme){
    const effective=['light','dark'].includes(theme)?theme:(nativeTheme.shouldUseDarkColors?'dark':'light');
    return effective==='dark'?'#151922':'#f5f7fb';
  }
  function applyNativeAppearance(value,{persist=false,broadcast=true}={}){
    const next=String(value||'').toLowerCase();
    if(!['light','dark'].includes(next))throw new Error('Invalid appearance theme.');
    appearanceTheme=next;
    try{nativeTheme.themeSource=next;}catch{}
    const background=nativeWindowBackground(next);
    for(const win of BrowserWindow.getAllWindows()){
      if(!win||win.isDestroyed())continue;
      try{win.setBackgroundColor(background);}catch{}
      if(broadcast)try{win.webContents.send('system:appearanceThemeChanged',next);}catch{}
    }
    if(persist){
      try{fs.mkdirSync(path.dirname(appearanceSettingsPath()),{recursive:true});fs.writeFileSync(appearanceSettingsPath(),JSON.stringify({theme:next},null,2)+'\n','utf8');}catch(err){console.warn('[DKDS appearance:persist]',err);}
    }
    return next;
  }
  function setInitialAppearance(value){appearanceTheme=String(value||'').toLowerCase();return appearanceTheme;}
  function currentAppearance(){return appearanceTheme;}
  return Object.freeze({appearanceSettingsPath,readPersistedAppearanceTheme,nativeWindowBackground,applyNativeAppearance,setInitialAppearance,currentAppearance});
}

module.exports={createAppearanceRuntime};
