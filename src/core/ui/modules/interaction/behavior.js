'use strict';
const {resolveElement, cleanupCall, eventChord, normalizeChord, shortcutHub}=require('../foundation/shortcuts');
const {ContextMenu}=require('./context-actions');


  const INPUT_GESTURES=Object.freeze(['click','double-click','context','drag','box','wheel','key']);
  const CORE_INTERACTION_INTENTS=Object.freeze(['select','activate','clear-selection','manipulate','select-region','zoom-box','zoom-wheel','pan','context-menu','command','reset-view']);
  function eventModifiers(event){return Object.freeze({ctrl:!!(event?.ctrlKey||event?.metaKey),shift:!!event?.shiftKey,alt:!!event?.altKey});}
  function normalizeModifiers(value=[]){
    const rows=Array.isArray(value)?value:(value?String(value).split('+'):[]),out=[];
    for(const raw of rows){const key=String(raw||'').trim().toLowerCase();if(['ctrl','control','cmd','command','meta'].includes(key)){if(!out.includes('ctrl'))out.push('ctrl');}else if(key==='shift'){if(!out.includes('shift'))out.push('shift');}else if(['alt','option'].includes(key)){if(!out.includes('alt'))out.push('alt');}}
    return out;
  }
  function buttonName(event,explicit=''){
    if(explicit)return String(explicit);
    const value=Number(event?.button);return value===2?'secondary':value===1?'middle':'primary';
  }

  class InteractionBehaviorProfile {
    constructor(scope,id,spec={}){
      this.scope=scope;this.owner=scope.owner;this.id=String(id||'interaction-behavior');this.spec={...spec};this.bindings=[];this.cleanups=[];this.sequence=0;this.menu=null;this.setBindings(spec.bindings||[]);
    }
    normalizeBinding(spec={}){
      const gesture=String(spec.gesture||'').trim();if(!INPUT_GESTURES.includes(gesture))throw new Error(`Unsupported interaction gesture: ${gesture||'(empty)'}`);
      const target=Array.isArray(spec.target)?spec.target.map(String):(spec.target?[String(spec.target)]:['*']);
      const intent=String(spec.intent||(spec.command?'command':gesture)).trim(),chord=normalizeChord(spec.chord||'');return {...spec,id:String(spec.id||`${this.id}:${gesture}:${++this.sequence}`),gesture,target,modifiers:normalizeModifiers(spec.modifiers),matchModifiers:spec.modifiers!==undefined,priority:Number(spec.priority)||0,button:spec.button?String(spec.button):'',chord,intent,command:spec.command?String(spec.command):''};
    }
    setBindings(rows=[]){this.cleanups.splice(0).forEach(cleanupCall);this.bindings=[];for(const row of Array.isArray(rows)?rows:[])this.add(row);return this;}
    add(spec={}){
      const row=this.normalizeBinding(spec);this.bindings.push(row);let shortcutOff=null;
      if(row.gesture==='key'&&row.chord){shortcutOff=shortcutHub.register(this.owner,`behavior:${row.id}`,{chord:row.chord,activity:row.activity||this.spec.activity,priority:row.priority,allowTyping:row.allowTyping,when:row.whenKey,handler:({event,activity})=>{const result=this.route({gesture:'key',target:'keyboard',event,chord:row.chord,payload:{activity}});return result.handled;}});this.cleanups.push(shortcutOff);}
      return ()=>{const i=this.bindings.indexOf(row);if(i>=0)this.bindings.splice(i,1);if(shortcutOff){const c=this.cleanups.indexOf(shortcutOff);if(c>=0)this.cleanups.splice(c,1);cleanupCall(shortcutOff);shortcutOff=null;}};
    }
    matches(row,input){
      if(row.gesture!==input.gesture)return false;
      const target=String(input.target||'');if(!row.target.includes('*')&&!row.target.includes(target))return false;
      if(row.targetId&&String(row.targetId)!==String(input.targetId||''))return false;
      if(row.button&&row.button!==buttonName(input.event,input.button))return false;
      if(row.gesture==='key'&&row.chord&&normalizeChord(input.chord||eventChord(input.event))!==row.chord)return false;
      const mods=eventModifiers(input.event),wanted=new Set(row.modifiers||[]);
      if(row.matchModifiers&&(wanted.has('ctrl')!==mods.ctrl||wanted.has('shift')!==mods.shift||wanted.has('alt')!==mods.alt))return false;
      if(typeof row.when==='function'){try{if(!row.when({...input,mods,profile:this}))return false;}catch(err){console.warn('[DKDS interaction behavior when]',row.id,err);return false;}}
      return true;
    }
    resolve(input={}){
      const normalized={...input,gesture:String(input.gesture||''),target:String(input.target||'*')};
      const rows=this.bindings.filter(row=>this.matches(row,normalized)).sort((a,b)=>b.priority-a.priority||this.bindings.indexOf(a)-this.bindings.indexOf(b));
      const binding=rows[0]||null;if(!binding)return Object.freeze({handled:false,intent:'',binding:null,input:normalized});
      return {handled:false,intent:String(binding.intent||''),binding,input:normalized};
    }
    commandContext(decision){const input=decision.input||{};return {...(input.payload||{}),gesture:input.gesture,targetKind:input.target,targetId:input.targetId||'',event:input.event,mods:eventModifiers(input.event),intent:decision.intent,bindingId:decision.binding?.id||'',behaviorId:this.id};}
    openContextActions(decision){
      const binding=decision.binding,input=decision.input||{},ctx=this.commandContext(decision);let rows=binding?.contextActions;
      if(typeof rows==='function')rows=rows(ctx);if(!Array.isArray(rows)||!rows.length)return false;
      const items=rows.map(item=>({...item,onInvoke:payload=>{const actionCtx={...ctx,...payload,actionId:item.id};if(item.command)return this.scope.options.commands?.run?.(String(item.command),actionCtx);return item.onInvoke?.(actionCtx);}}));
      const event=input.event,x=Number(event?.clientX)||0,y=Number(event?.clientY)||0;this.menu?.dispose?.();this.menu=new ContextMenu(this.owner);this.menu.open({x,y,items,context:ctx});return true;
    }
    route(input={}){
      const decision=this.resolve(input);if(!decision.binding)return decision;
      const binding=decision.binding,ctx=this.commandContext(decision);let handled=false;
      if(input.gesture==='context'&&binding.contextActions)handled=this.openContextActions(decision)||handled;
      if(binding.command){handled=true;Promise.resolve(this.scope.options.commands?.run?.(binding.command,ctx)).catch(err=>{console.error('[DKDS interaction behavior command]',binding.command,err);this.scope.options.host?.setStatus?.(`交互命令执行失败：${err.message}`);});}
      if(typeof binding.onInvoke==='function'){try{handled=binding.onInvoke(ctx)!==false||handled;}catch(err){console.error('[DKDS interaction behavior]',binding.id,err);}}
      if(typeof this.spec.onIntent==='function'){try{handled=this.spec.onIntent({...ctx,binding,intent:decision.intent})!==false||handled;}catch(err){console.error('[DKDS interaction behavior intent]',this.id,err);}}
      return {...decision,handled};
    }
    bind(target,spec={}){
      const root=resolveElement(target);if(!root)throw new Error(`Interaction behavior target not found: ${this.id}`);
      const requested=Array.isArray(spec.gestures)&&spec.gestures.length?spec.gestures:['click','double-click','context'];
      const eventNames={click:'click','double-click':'dblclick',context:'contextmenu',wheel:'wheel',key:'keydown'};
      const selector=String(spec.selector||'').trim(),cleanups=[];
      const subjectFor=event=>{
        if(!selector)return root;
        const subject=event?.target?.closest?.(selector);return subject&&root.contains(subject)?subject:null;
      };
      const valueFor=(value,context,fallback='')=>typeof value==='function'?value(context):(value??fallback);
      for(const gesture of requested){
        const eventName=eventNames[String(gesture||'')];if(!eventName)continue;
        const listener=event=>{
          const element=subjectFor(event);if(!element)return;
          const base={event,element,root,profile:this};
          const targetKind=String(valueFor(spec.target,base,element.dataset?.interactionTarget||'*')||'*');
          const targetId=String(valueFor(spec.targetId,base,element.dataset?.interactionId||element.dataset?.selectionKey||'')||'');
          const extraPayload=valueFor(spec.payload,base,{})||{};
          const input={gesture:String(gesture),target:targetKind,targetId,event,button:valueFor(spec.button,base,''),payload:{...extraPayload,element,root}};
          try{spec.beforeRoute?.({...base,input});}catch(err){console.warn('[DKDS interaction behavior beforeRoute]',this.id,err);}
          const decision=this.route(input),matched=!!decision.binding;
          const shouldPrevent=spec.preventDefault===true||(String(gesture)==='context'&&(matched||decision.handled));
          if(shouldPrevent)event.preventDefault?.();
          if((decision.handled||spec.stopPropagation===true)&&spec.stopPropagation!==false)event.stopPropagation?.();
          try{spec.onDecision?.({...base,input,decision});}catch(err){console.warn('[DKDS interaction behavior onDecision]',this.id,err);}
        };
        root.addEventListener(eventName,listener,spec.capture===true);cleanups.push(()=>root.removeEventListener(eventName,listener,spec.capture===true));
      }
      const cleanup=()=>cleanups.splice(0).reverse().forEach(cleanupCall);this.cleanups.push(cleanup);return cleanup;
    }
    snapshot(){return Object.freeze({id:this.id,bindings:Object.freeze(this.bindings.map(row=>Object.freeze({id:row.id,gesture:row.gesture,target:Object.freeze(row.target.slice()),modifiers:Object.freeze(row.modifiers.slice()),button:row.button,intent:row.intent,command:row.command,priority:row.priority})))});}
    dispose(){this.menu?.dispose?.();this.menu=null;this.cleanups.splice(0).forEach(cleanupCall);this.bindings=[];}
  }

module.exports=Object.freeze({INPUT_GESTURES, CORE_INTERACTION_INTENTS, eventModifiers, normalizeModifiers, buttonName, InteractionBehaviorProfile});
