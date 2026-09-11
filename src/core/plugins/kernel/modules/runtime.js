'use strict';
if(!window.DKDSPlugins){
  const bootstrap=require('./bootstrap');
  const top=require('./workspace/top');
  const events=require('./events/history');
  const activity=require('./activity/shell');
  const ui=require('./contributions/ui');
  const shortcuts=require('./shortcuts/menu');
  const commands=require('./commands/toolbar');
  const typed=require('./contributions/typed');
  const project=require('./project/status');
  const pages=require('./pages/panels');
  const pluginApi=require('./plugin-api');
  const lifecycle=require('./lifecycle');
  lifecycle.configure({top,pluginApi});
  require('./package-runtime');
  void bootstrap;void events;void activity;void ui;void shortcuts;void commands;void typed;void project;void pages;
}
module.exports=window.DKDSPlugins;
