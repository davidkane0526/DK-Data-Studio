import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { nativeHost } from '../host/protocol';
import type { Palette } from '../theme/palette';

type UpdateState = { status:string; version?:string; installedVersion?:string; progress?:number; error?:string };
type UiState = { status:string; version?:string; appVersion?:string; buildId?:string; tag?:string; error?:string; applied?:boolean };
type Props = { visible:boolean; version:string; palette:Palette; autoPrompt?:boolean; onClose:()=>void; onUiCss:(css:string)=>void };
const label:Record<string,string> = {
  idle:'未检查',checking:'检查中',current:'已是最新',available:'有新版本',
  downloading:'下载中',ready:'可安装',installer:'等待安装确认',permission:'需要安装权限',
  updated:'已应用',error:'检查失败',unsupported:'不支持'
};
export function UpdateDialog({ visible,version,palette,autoPrompt=false,onClose,onUiCss }:Props){
  const [native,setNative] = useState<UpdateState>({status:'idle'});
  const [ui,setUi] = useState<UiState>({status:'idle'});
  const lastUiTag = useRef('');
  const refreshNative = useCallback(async()=>{
    if(!nativeHost?.appUpdateStatus)return setNative({status:'unsupported'});
    try{setNative(JSON.parse(await nativeHost.appUpdateStatus()));}
    catch(e:any){setNative({status:'error',error:String(e?.message||e)});}
  },[]);
  const refreshUi = useCallback(async()=>{
    if(!nativeHost?.uiHotStatus)return setUi({status:'unsupported'});
    try{
      const data:UiState=JSON.parse(await nativeHost.uiHotStatus());
      setUi(data);
      if(data.applied&&data.tag&&data.tag!==lastUiTag.current&&nativeHost.uiHotCss){
        const css=await nativeHost.uiHotCss();
        if(css){lastUiTag.current=data.tag;onUiCss(css);}
      }
    }catch(e:any){setUi({status:'error',error:String(e?.message||e)});}
  },[onUiCss]);
  const checkAll = useCallback(async()=>{
    setNative({status:'checking'});setUi({status:'checking'});
    await Promise.all([
      nativeHost?.appUpdateCheck?.().catch((e:any)=>setNative({status:'error',error:String(e?.message||e)})),
      nativeHost?.uiHotCheck?.().catch((e:any)=>setUi({status:'error',error:String(e?.message||e)}))
    ]);
    await Promise.all([refreshNative(),refreshUi()]);
  },[refreshNative,refreshUi]);
  useEffect(()=>{
    if(!visible)return;
    void refreshNative();void refreshUi();
    // The startup watcher already checked. The manual entry performs a fresh check.
    if(!autoPrompt)void checkAll();
    const timer=setInterval(()=>{void refreshNative();void refreshUi();},1000);
    return()=>clearInterval(timer);
  },[visible,autoPrompt,checkAll,refreshNative,refreshUi]);
  const install=()=>Alert.alert('安装更新','下载并校验 APK 后，由 Android 系统确认安装。',[
    {text:'取消',style:'cancel'},
    {text:'继续',onPress:()=>void nativeHost?.appUpdateInstall?.().then(()=>refreshNative()).catch((e:any)=>setNative({status:'error',error:String(e?.message||e)}))}
  ]);
  const button=(title:string,action:()=>void,primary=false)=>(
    <Pressable accessibilityRole="button" onPress={action}
      style={[styles.button,{borderColor:primary?palette.accent:palette.divider,backgroundColor:primary?palette.accentSoft:palette.surfaceSoft}]}>
      <Text style={{color:palette.text,fontSize:12}}>{title}</Text>
    </Pressable>
  );
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.shade}>
      <View style={[styles.card,{backgroundColor:palette.surface,borderColor:palette.divider}]}>
        <View style={styles.row}>
          <Text style={[styles.title,{color:palette.text}]}>{autoPrompt?'发现更新':'软件更新'}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="关闭更新弹窗" onPress={onClose}>
            <Text style={{color:palette.text,fontSize:22}}>×</Text>
          </Pressable>
        </View>
        <View style={styles.columns}>
          <View style={[styles.column,{borderColor:palette.divider}]}>
            <Text style={[styles.section,{color:palette.text}]}>程序</Text>
            <Text style={[styles.detail,{color:palette.text}]} numberOfLines={2}>{label[native.status]||native.status}{native.status==='downloading'?' '+(native.progress||0)+'%':''}</Text>
            <Text style={[styles.muted,{color:palette.textSoft||palette.text}]} numberOfLines={2}>v{native.installedVersion||version}{native.version&&native.version!==native.installedVersion?' → '+native.version:''}</Text>
            {native.error?<Text style={[styles.error,{color:palette.text}]} numberOfLines={3}>{native.error}</Text>:null}
          </View>
          <View style={[styles.column,{borderColor:palette.divider}]}>
            <Text style={[styles.section,{color:palette.text}]}>界面</Text>
            <Text style={[styles.detail,{color:palette.text}]}>{label[ui.status]||ui.status}</Text>
            <Text style={[styles.muted,{color:palette.textSoft||palette.text}]} numberOfLines={2}>{ui.version?'v'+ui.version:'CSS 热更新'}</Text>
            {ui.error?<Text style={[styles.error,{color:palette.text}]} numberOfLines={3}>{ui.error}</Text>:null}
          </View>
        </View>
        <View style={[styles.row,{justifyContent:'flex-end',flexWrap:'wrap'}]}>
          {button('检查更新',()=>void checkAll())}
          {['available','ready'].includes(native.status)?button('下载并安装',install,true):null}
          {button(autoPrompt?'本次跳过':'关闭',onClose)}
        </View>
      </View>
    </View>
  </Modal>;
}
const styles=StyleSheet.create({
  shade:{flex:1,backgroundColor:'rgba(0,0,0,.42)',justifyContent:'center',paddingHorizontal:18},
  card:{width:'100%',maxWidth:490,alignSelf:'center',borderWidth:1,borderRadius:12,padding:14,gap:12},
  row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
  title:{fontWeight:'700',fontSize:15},
  columns:{flexDirection:'row',gap:9},
  column:{flex:1,minWidth:0,borderWidth:1,borderRadius:9,padding:10,gap:4},
  section:{fontWeight:'600',fontSize:12},detail:{fontSize:12},muted:{fontSize:11},
  error:{fontSize:10,lineHeight:15},button:{paddingHorizontal:12,paddingVertical:8,borderWidth:1,borderRadius:7}
});
