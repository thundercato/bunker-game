/* Native browser input service. Loaded before the renderer or Python.
   The service never fabricates devices and retains the browser's real error state. */
(function(){'use strict';
 if(window.FieldPad)return;
 const state={devices:[],selected:null,error:'',reads:0,events:[],changes:0,lastChange:0,lastGesture:0,keyEvents:[],mode:'auto'},listeners=new Set(),eventPads=new Map();let lastSignature='',lastPoll=0,preferred=null;
 function emit(){for(const fn of listeners)try{fn(snapshot())}catch(e){console.warn('Input subscriber',e)}}
 function log(type,detail){state.events.push({time:new Date().toISOString(),type,detail});if(state.events.length>15)state.events.shift();}
 function normalise(p){return{id:String(p.id||'Unnamed controller'),index:Number(p.index)||0,connected:p.connected!==false,mapping:p.mapping||'',timestamp:Number(p.timestamp)||0,axes:Array.from(p.axes||[],v=>Number.isFinite(+v)?Math.max(-1,Math.min(1,+v)):0),buttons:Array.from(p.buttons||[],v=>{const value=typeof v==='number'?v:Number(v?.value)||0;return{value,pressed:!!v?.pressed||value>.35,touched:!!v?.touched}})};}
 function poll(){
  state.reads++;let raw=[];try{const fn=navigator.getGamepads||navigator.webkitGetGamepads;if(typeof fn!=='function')throw Error('This browser has not exposed the Gamepad API.');raw=Array.from(fn.call(navigator)||[]).filter(p=>p&&p.connected!==false);state.error='';}catch(e){state.error=(e.name||'Error')+': '+e.message;}
  // A live event reference is a short fallback only, never a permanent stale device.
  if(!raw.length&&!state.error)for(const v of eventPads.values())if(performance.now()-v.at<1000&&v.pad.connected!==false)raw.push(v.pad);
  const devices=raw.map(normalise);const signature=JSON.stringify(devices.map(p=>[p.index,p.axes,p.buttons.map(b=>b.value),p.buttons.map(b=>b.pressed)]));
  if(signature!==lastSignature){if(devices.some(p=>p.axes.some(v=>Math.abs(v)>.15)||p.buttons.some(b=>b.pressed))){state.changes++;state.lastChange=Date.now();}lastSignature=signature;}
  const score=p=>p.axes.reduce((a,v)=>a+(Math.abs(v)>.18?Math.abs(v):0),0)+p.buttons.filter(b=>b.pressed).length;
  const active=[...devices].sort((a,b)=>score(b)-score(a));let selected=devices.find(p=>p.index===preferred)||(active[0]&&score(active[0])>.1?active[0]:devices.find(p=>p.index===state.selected)||devices[0]);
  if((selected?.index??null)!==state.selected){log(selected?'device-selected':'device-unavailable',selected?.id||'No controller exposed');state.selected=selected?.index??null;}
  state.devices=devices;return selected||null;
 }
 function snapshot(){let policy='unknown';try{const p=document.permissionsPolicy||document.featurePolicy;if(p?.allowsFeature)policy=p.allowsFeature('gamepad')}catch{}return {build:'Field Signal · Fieldcraft v10',api:typeof navigator.getGamepads==='function',secureContext:!!isSecureContext,topLevel:window===window.top,focused:document.hasFocus(),visibility:document.visibilityState,standalone:!!navigator.standalone||matchMedia('(display-mode: standalone)').matches,fullscreen:!!document.fullscreenElement,permissionsPolicy:policy,activation:state.lastGesture?new Date(state.lastGesture).toISOString():'not tapped yet',error:state.error,selected:state.selected,reads:state.reads,changes:state.changes,lastChange:state.lastChange,pads:state.devices.map(p=>({...p,axes:p.axes.map(v=>+v.toFixed(3)),pressed:p.buttons.map((b,i)=>b.pressed?i:null).filter(v=>v!==null)})),events:state.events.slice(),keyEvents:state.keyEvents.slice(),userAgent:navigator.userAgent,lastReason:state.events.at(-1)?.type||'waiting'};}
 function activate(target){state.lastGesture=Date.now();log('trusted-screen-activation','Focused visible game surface');try{window.focus()}catch{}if(target?.getClientRects().length){try{target.focus({preventScroll:true})}catch{target.focus?.()}}poll();emit();return snapshot();}
 for(const type of ['gamepadconnected','gamepaddisconnected'])window.addEventListener(type,e=>{if(type==='gamepadconnected')eventPads.set(e.gamepad.index,{pad:e.gamepad,at:performance.now()});else eventPads.delete(e.gamepad.index);log(type,e.gamepad.id);poll();emit()});
 for(const type of ['focus','pageshow'])window.addEventListener(type,()=>{log(type,'');poll();emit()});
 document.addEventListener('visibilitychange',()=>{log('visibility',document.visibilityState);poll();emit()});
 document.addEventListener('pointerdown',e=>{if(e.isTrusted){state.lastGesture=Date.now();poll()}},{capture:true,passive:true});
 document.addEventListener('keydown',e=>{state.keyEvents.push({key:e.key,code:e.code,time:Date.now()});if(state.keyEvents.length>8)state.keyEvents.shift()},{capture:true});
 function loop(t){requestAnimationFrame(loop);if(document.hidden)return;if(t-lastPoll>=16){lastPoll=t;poll();}if(t-(loop.notify||0)>180){loop.notify=t;emit();}}requestAnimationFrame(loop);
 window.FieldPad={state,poll,snapshot,activate,select(index){preferred=index==='auto'||index==null?null:Number(index);poll();emit()},subscribe(fn){listeners.add(fn);fn(snapshot());return()=>listeners.delete(fn)},download(){const blob=new Blob([JSON.stringify(snapshot(),null,2)],{type:'application/json'}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='Field-Signal-v8-controller-report.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),8000)},async share(){const text=JSON.stringify(snapshot(),null,2);if(navigator.share){const file=new File([text],'Field-Signal-controller-report.json',{type:'application/json'});if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'Field Signal controller report'});return}}this.download()}};
})();
