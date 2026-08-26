'use strict';
if(!window.DKDSPlugins){
  require('./bootstrap');
  require('./workspace/top');
  require('./events/history');
  require('./activity/shell');
  require('./contributions/ui');
  require('./shortcuts/menu');
  require('./commands/toolbar');
  require('./contributions/typed');
  require('./project/status');
  require('./pages/panels');
  require('./plugin-api');
  require('./lifecycle');
  require('./package-runtime');
}
module.exports=window.DKDSPlugins;
