import{Input as TouchInput,defaultMapping,deadzone}from'./input.js';
export{defaultMapping,deadzone};
export class Input extends TouchInput{
 constructor(canvas,action,look,connection){super(canvas,action,look,connection);this.preferredIndex=null;this.availablePads=[];this.activeIndex=null;this.lastApiError='';this.controllerMode='auto';canvas.tabIndex=0;this.native=window.FieldPad;}
 readPads(){const svc=window.FieldPad;if(!svc)return[];const pad=svc.poll(),d=svc.snapshot();this.availablePads=svc.state.devices;this.activeIndex=d.selected;this.lastApiError=d.error;return pad?[pad]:[];}
 activate(){const d=window.FieldPad.activate(document.querySelector('#hud')?.hidden?document.querySelector('#start'):this.canvas);this.readPads();return d;}
 selectDevice(index){this.preferredIndex=index==='auto'?null:+index;window.FieldPad.select(index);this.prev={};this.pad=null;this.readPads();}
 diagnostics(){return window.FieldPad.snapshot();}
 key(e,on){const active=document.activeElement;if(['INPUT','SELECT','TEXTAREA'].includes(active?.tagName))return;const aliases={' ':'Space','Spacebar':'Space','Esc':'Escape','Up':'ArrowUp','Down':'ArrowDown','Left':'ArrowLeft','Right':'ArrowRight'},code=e.code||aliases[e.key]||(/^Arrow|^Escape$|^Tab$|^Enter$/.test(e.key)?e.key:/^[a-zA-Z]$/.test(e.key)?'Key'+e.key.toUpperCase():e.key);const proxy={code,repeat:e.repeat,preventDefault:()=>e.preventDefault()};if(code==='Enter'){if(on&&!e.repeat)this.action('interact');return;}super.key(proxy,on);}
 poll(dt){return super.poll(dt);}
}
