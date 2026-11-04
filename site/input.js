export function deadzone(x,y,d=.17){const m=Math.hypot(x||0,y||0);if(m<=d)return [0,0];const a=Math.min(1,(m-d)/(1-d));return [(x/m)*a,(y/m)*a];}
export const defaultMapping={moveX:0,moveY:1,lookX:2,lookY:3,interact:0,crouch:1,magazine:2,pack:3,probe:4,rack:5,aim:6,fire:7,map:8,pause:9,sprint:10,jump:11,safe:14,torch:15,detector:12,heal:13};
export class Input{
 constructor(canvas,onAction,onLook,onConnection){
  this.canvas=canvas;this.action=onAction;this.look=onLook;this.connection=onConnection;this.keys=new Set();this.prev={};this.pad=null;this.device='touch';this.map={...defaultMapping};this.dead=.17;this.sensitivity=1;this.invert=false;this.touchMove=[0,0];this.touchLook=[0,0];this.aim=false;this.sprint=false;this.capture=null;this.lookPointer=null;this.paused=true;
  window.addEventListener('keydown',e=>this.key(e,true));window.addEventListener('keyup',e=>this.key(e,false));
  window.addEventListener('blur',()=>this.clear());
  window.addEventListener('gamepadconnected',()=>this.poll(0));window.addEventListener('gamepaddisconnected',()=>{this.clear();this.connection(null,true)});
  canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('dblclick',()=>{if(!this.paused&&this.device==='mouse')canvas.requestPointerLock?.()?.catch?.(()=>{})});
  canvas.addEventListener('pointerdown',e=>this.down(e));canvas.addEventListener('pointermove',e=>this.move(e));canvas.addEventListener('pointerup',e=>this.up(e));canvas.addEventListener('pointercancel',()=>{this.lookPointer=null});
  document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement)this.device='mouse'});
  document.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas&&!this.paused)this.look(-e.movementX*.0022*this.sensitivity,-e.movementY*.0022*this.sensitivity*(this.invert?-1:1))});
  this.stick=document.querySelector('#move-stick');this.knob=this.stick.querySelector('i');
  this.stick.addEventListener('pointerdown',e=>{e.preventDefault();if(this.stickId!=null)return;this.device='touch';this.stickId=e.pointerId;this.stick.setPointerCapture(e.pointerId);this.stickUpdate(e)});
  this.stick.addEventListener('pointermove',e=>{if(e.pointerId===this.stickId)this.stickUpdate(e)});
  const reset=e=>{if(e.pointerId===this.stickId){this.stickId=null;this.touchMove=[0,0];this.knob.style.transform='translate(-50%,-50%)'}};
  this.stick.addEventListener('pointerup',reset);this.stick.addEventListener('pointercancel',reset);this.stick.addEventListener('lostpointercapture',reset);
  this.lookStick=document.querySelector('#look-stick');this.lookKnob=this.lookStick.querySelector('i');
  const updateLook=e=>{const r=this.lookStick.getBoundingClientRect(),max=r.width*.32;let x=(e.clientX-r.left-r.width/2)/max,y=(e.clientY-r.top-r.height/2)/max;let m=Math.max(1,Math.hypot(x,y));this.touchLook=[x/m,y/m];this.lookKnob.style.transform=`translate(calc(-50% + ${x/m*max}px),calc(-50% + ${y/m*max}px))`;};
  this.lookStick.addEventListener('pointerdown',e=>{e.preventDefault();if(this.lookStickId!=null)return;this.device='touch';this.lookStickId=e.pointerId;this.lookStick.setPointerCapture(e.pointerId);updateLook(e)});
  this.lookStick.addEventListener('pointermove',e=>{if(e.pointerId===this.lookStickId)updateLook(e)});
  const resetLook=e=>{if(e.pointerId===this.lookStickId){this.lookStickId=null;this.touchLook=[0,0];this.lookKnob.style.transform='translate(-50%,-50%)'}};
  for(const evt of ['pointerup','pointercancel','lostpointercapture'])this.lookStick.addEventListener(evt,resetLook);

 }
 stickUpdate(e){const r=this.stick.getBoundingClientRect(),max=r.width*.32;let x=(e.clientX-r.left-r.width/2)/max,y=(e.clientY-r.top-r.height/2)/max;const m=Math.max(1,Math.hypot(x,y));x/=m;y/=m;this.touchMove=[x,y];this.knob.style.transform=`translate(calc(-50% + ${x*max}px),calc(-50% + ${y*max}px))`;}
 down(e){if(this.paused)return;this.device=e.pointerType==='mouse'?'mouse':'touch';if(e.pointerType==='mouse'&&e.button===2){this.aim=true;return;}if(e.pointerType==='mouse'&&document.pointerLockElement===this.canvas){this.action('fire');return;}this.lookPointer={id:e.pointerId,x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,drag:false};this.canvas.setPointerCapture(e.pointerId);}
 move(e){let p=this.lookPointer;if(!p||p.id!==e.pointerId||this.paused)return;let dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;if(Math.hypot(e.clientX-p.sx,e.clientY-p.sy)>7)p.drag=true;this.look(-dx*.004*this.sensitivity,-dy*.004*this.sensitivity*(this.invert?-1:1));}
 up(e){if(e.button===2){this.aim=false;return;}let p=this.lookPointer;if(p?.id!==e.pointerId)return;this.lookPointer=null;if(!p.drag&&!this.paused)this.action('tap',{x:e.clientX,y:e.clientY});}
 key(e,on){if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;const codes={KeyX:'fire',KeyE:'interact',KeyF:'interact',Space:'jump',KeyB:'pack',Tab:'pack',KeyM:'map',KeyQ:'probe',KeyR:'magazine',KeyC:'rack',KeyV:'safe',KeyH:'heal',KeyT:'torch',Digit1:'equip-gun',Digit2:'equip-knife',Digit3:'equip-torch',KeyG:'detector',Escape:'pause',KeyZ:'crouch'};
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Tab'].includes(e.code))e.preventDefault();if(on){this.keys.add(e.code);if(!e.repeat&&codes[e.code])this.action(codes[e.code]);}else this.keys.delete(e.code);if(on)this.device='keyboard';}
 clear(){this.keys.clear();this.touchMove=[0,0];this.touchLook=[0,0];this.lookStickId=null;if(this.lookKnob)this.lookKnob.style.transform='translate(-50%,-50%)';this.aim=false;this.sprint=false;this.lookPointer=null;this.prev={};this.stickId=null;if(this.knob)this.knob.style.transform='translate(-50%,-50%)';}
 readPads(){try{return Array.from(navigator.getGamepads?.()||[]).filter(p=>p&&p.connected!==false)}catch{return []}}
 poll(dt){
  const pads=this.readPads();let p=pads.find(p=>p.index===this.pad?.index)||pads[0]||null;
  if(p?.id!==this.pad?.id){const lost=!!this.pad&&!p;this.pad=p;this.prev={};this.connection(p,lost);}else this.pad=p;
  let move=[...this.touchMove],look=[...this.touchLook],aim=this.aim,sprint=this.keys.has('ShiftLeft')||this.sprint;
  if(this.keys.has('KeyW')||this.keys.has('ArrowUp'))move[1]-=1;if(this.keys.has('KeyS')||this.keys.has('ArrowDown'))move[1]+=1;if(this.keys.has('KeyA')||this.keys.has('ArrowLeft'))move[0]-=1;if(this.keys.has('KeyD')||this.keys.has('ArrowRight'))move[0]+=1;
  if(p){
   if(this.capture){for(let i=0;i<p.buttons.length;i++)if(p.buttons[i].pressed&&!this.prev['raw'+i]){const fn=this.capture;this.capture=null;fn(i);break;}}
   else {
    let mv=deadzone(p.axes[this.map.moveX],p.axes[this.map.moveY],this.dead),lk=deadzone(p.axes[this.map.lookX],p.axes[this.map.lookY],this.dead);if(Math.hypot(...mv)>.01)move=mv;if(Math.hypot(...lk)>.01)look=lk;
    const pressed=k=>!!p.buttons[this.map[k]]?.pressed;
    aim=aim||pressed('aim');sprint=sprint||pressed('sprint');
    for(const key of ['jump','interact','crouch','magazine','pack','probe','rack','fire','map','pause','safe','torch','detector','heal']){const is=pressed(key);if(is&&!this.prev[key])this.action(key,{gamepad:true});this.prev[key]=is;}
    if(Math.hypot(...mv,...lk)>.02||p.buttons.some(b=>b.pressed))this.device='gamepad';
   }
   for(let i=0;i<p.buttons.length;i++)this.prev['raw'+i]=p.buttons[i].pressed;
  }
  let m=Math.max(1,Math.hypot(...move));move=move.map(x=>x/m);
  if(!this.paused&&look.some(x=>x))this.look(-look[0]*dt*2.3*this.sensitivity,-look[1]*dt*1.8*this.sensitivity*(this.invert?-1:1));
  return {move:this.paused?[0,0]:move,aim,sprint,pad:p};
 }
}
