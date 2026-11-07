'use strict';
// Isolated UI prototype runner: no TCP, KXCI, instrument output or auto-update.
const {app,BrowserWindow}=require('electron');
const path=require('node:path');
app.setName('DK Test Studio 4200A Preview');
function create(){
  const win=new BrowserWindow({
    title:'DK Test Studio · 4200A — UI Preview',
    width:1240,height:880,minWidth:530,minHeight:520,
    backgroundColor:'#f5f7fa',
    webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}
  });
  win.loadFile(path.resolve(__dirname,'../src/4200a-fspro/index.html'));
}
app.whenReady().then(create);
app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)create();});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
