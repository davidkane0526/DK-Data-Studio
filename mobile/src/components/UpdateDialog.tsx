import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { nativeHost } from '../host/protocol';
import type { Palette } from '../theme/palette';

type UpdateState={status:string;version?:string;progress?:number;error?:string};
type Props={visible:boolean;version:string;palette:Palette;onClose:()=>void;onUiCss:(css:string)=>void};
const statusLabel:Record<string,string>={idle:'等待检查',checking:'检查中',current:'当前已是最新版本',available:'发现新版',
  downloading:'下载中',ready:'下载与校验完成',installer:'等待 Android 安装器确认',permission:'需要允许安装此应用来源',
  error:'更新失败',unsupported:'当前版本不支持更新'};
export function UpdateDialog({visible,version,palette,onClose,onUiCss}:Props){
  const [state,setState]=useState<UpdateState>({status:'idle'});
  const [uiState,setUiState]=useState<{status:string;version?:string;tag?:string;error?:string;applied?:boolean}>({status:'idle'});
  const lastUiTag=useRef('');
  const refreshUi=useCallback(async()=>{
    if(!nativeHost?.uiHotStatus)return setUiState({status:'unsupported'});
    try{
      const result=JSON.parse(await nativeHost.uiHotStatus());
      setUiState(result);
      if(result.applied&&result.tag&&result.tag!==lastUiTag.current&&nativeHost.uiHotCss){
        const css=await nativeHost.uiHotCss();
        if(css){lastUiTag.current=result.tag;onUiCss(css);}
      }
    }catch(error:any){setUiState({status:'error',error:String(error?.message||error)});}
  },[onUiCss]);
  const checkUi=useCallback(async()=>{
    if(!nativeHost?.uiHotCheck)return setUiState({status:'unsupported'});
    setUiState({status:'checking'});
    try{await nativeHost.uiHotCheck();void refreshUi();}
    catch(error:any){setUiState({status:'error',error:String(error?.message||error)});}
  },[refreshUi]);
  const refresh=useCallback(async()=>{
    if(!nativeHost?.appUpdateStatus)return setState({status:'unsupported'});
    try{const result=await nativeHost.appUpdateStatus();setState(JSON.parse(result));}
    catch(error:any){setState({status:'error',error:String(error?.message||error)});}
  },[]);
  const check=useCallback(async()=>{
    if(!nativeHost?.appUpdateCheck)return setState({status:'unsupported'});
    setState({status:'checking'});
    try{await nativeHost.appUpdateCheck();void refresh();}
    catch(error:any){setState({status:'error',error:String(error?.message||error)});}
  },[refresh]);
  useEffect(()=>{
    if(!visible)return;
    void check();void checkUi();
    const interval=setInterval(()=>{void refresh();void refreshUi();},900);
    return ()=>clearInterval(interval);
  },[visible,check,refresh,checkUi,refreshUi]);
  const confirmInstall=()=>Alert.alert('下载并安装更新',
    '将从 DKDS 官方 GitHub Releases 下载并校验 APK，签名与当前版本不一致时拒绝安装。安装必须经过 Android 系统确认。',[
      {text:'取消',style:'cancel'},
      {text:'继续',onPress:()=>void nativeHost?.appUpdateInstall?.().then(()=>refresh()).catch((error:any)=>setState({status:'error',error:String(error?.message||error)}))}
    ]);
  const button=(label:string,action:()=>void,primary=false)=>(<Pressable accessibilityRole="button"
    onPress={action} style={[styles.button,{borderColor:primary?palette.accent:palette.divider,backgroundColor:primary?palette.accentSoft:palette.surfaceSoft}]}>
    <Text style={{color:palette.text}}>{label}</Text></Pressable>);
  return <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
    <View style={styles.shade}><View style={[styles.card,{backgroundColor:palette.surface,borderColor:palette.divider}]}>
      <View style={styles.row}><Text style={[styles.heading,{color:palette.text}]}>DK Data Studio · 更新</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="关闭" onPress={onClose}><Text style={[styles.close,{color:palette.text}]}>×</Text></Pressable></View>
      <Text style={[styles.body,{color:palette.text}]}>当前版本：v{version}</Text>
      <Text style={[styles.body,{color:palette.text}]}>程序更新：{statusLabel[state.status]||state.status}</Text>
      {state.version?<Text style={[styles.body,{color:palette.text}]}>可用版本：v{state.version}</Text>:null}
      {state.status==='downloading'?<Text style={[styles.body,{color:palette.text}]}>下载进度：{state.progress||0}%</Text>:null}
      {state.error?<Text style={[styles.body,{color:palette.text}]}>错误：{state.error}</Text>:null}
      <Text style={[styles.body,{color:palette.text}]}>界面热更新：{({idle:'等待检查',checking:'检查中',updated:'已热更新，无需重启',
        current:'当前界面已是最新',error:'更新失败',unsupported:'当前版本不支持'} as Record<string,string>)[uiState.status]||uiState.status}</Text>
      {uiState.error?<Text style={[styles.body,{color:palette.text}]}>{uiState.error}</Text>:null}
      <View style={styles.row}>{button('检查界面更新',()=>void checkUi())}</View>
      <View style={styles.row}>{button('检查程序更新',()=>void check())}
        {['available','ready'].includes(state.status)?button('下载并安装',confirmInstall,true):null}
      </View>
      <Text style={[styles.note,{color:palette.text}]}>来源：DKDS GitHub Releases。完整性及 APK 签名校验由 Android 本地更新模块完成。</Text>
    </View></View></Modal>;
}
const styles=StyleSheet.create({
  shade:{flex:1,backgroundColor:'rgba(0,0,0,.45)',justifyContent:'center',paddingHorizontal:20},
  card:{width:'100%',maxWidth:470,alignSelf:'center',borderWidth:1,borderRadius:13,padding:16,gap:11},
  row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},
  heading:{fontWeight:'700',fontSize:15},close:{fontSize:25,paddingHorizontal:5},
  body:{fontSize:12,lineHeight:19},note:{fontSize:11,lineHeight:17},
  button:{paddingHorizontal:12,paddingVertical:9,borderWidth:1,borderRadius:7,alignItems:'center'}
});
