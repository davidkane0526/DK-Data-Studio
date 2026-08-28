'use strict';
const $=selector=>document.querySelector(selector);
const mainSvg=d3.select('#mainPlot');
const status=$('#statusBarMessage')||$('#statusBar');
const primePortableState=new Map();
const TREND_COLUMNS_PREFERENCE_KEY='dkds.ui.trendColumns.v1';

function loadTrendColumnsPreference(){
  try{
    const raw=localStorage.getItem(TREND_COLUMNS_PREFERENCE_KEY);
    if(raw==='auto')return 'auto';
    const n=Number(raw);
    if(Number.isFinite(n)&&n>=1&&n<=6)return Math.round(n);
  }catch{}
  return 3;
}
function saveTrendColumnsPreference(value){
  try{localStorage.setItem(TREND_COLUMNS_PREFERENCE_KEY,String(value));}catch{}
}

const state={
  artifactStore:window.DKDSData.createStore(),
  projectPath:null,
  trendColumns:loadTrendColumnsPreference(),
  zoomChart:null,
  groupPanelMode:'docked',
  groupPanelCollapsed:false,
  groupPanelDockHeight:360,
  groupPanelFloatRect:null,
  inspectorPanelMode:'right',
  inspectorDockWidth:390,
  inspectorFloatRect:null,
  mainLayout:{raf:null,lastWidth:0,lastHeight:0,renderToken:0},
  mainView:{xDomain:null,yDomain:null,mode:'select'},
  projectTabs:[],
  activeProjectTabId:null,
  projectTabSeq:0,
  importDraft:{files:[],activePath:null,loading:false,fileDialogOpen:false,targets:null,scope:null,selectionAnchorPath:null,columnFieldFilter:''},
  lanWebStatusState:null,
  lanWebSelectedBaseUrl:''
};

module.exports=Object.freeze({$,mainSvg,status,primePortableState,state,loadTrendColumnsPreference,saveTrendColumnsPreference});
