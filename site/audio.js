/* First Light mixer: same v3 source music, sample-continuous loop splices,
   smooth parameter changes, and an independently audible drone on small speakers. */
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number(x)||0));
export function envelopeValue(e,t){if(!e)return 0;const u=e.end===e.start?1:clamp((t-e.start)/(e.end-e.start));return e.from+(e.to-e.from)*u;}
export function spliceLoop(input,ctx,seconds=1.4){
 const n=input.length,sr=input.sampleRate,k=Math.min(Math.floor(sr*seconds),Math.floor(n/5));
 if(k<2)return input;
 const output=ctx.createBuffer(input.numberOfChannels,n-k,sr);
 for(let c=0;c<input.numberOfChannels;c++){
  const a=input.getChannelData(c),b=output.getChannelData(c);b.set(a.subarray(k,n-k),0);
  const start=n-2*k;
  for(let i=0;i<k;i++){let u=i/(k-1);u=u*u*(3-2*u);b[start+i]=a[n-k+i]*(1-u)+a[i]*u;}
  // The end approaches input[k-1], the start is input[k]: no artificial discontinuity.
 }
 return output;
}
export class Soundscape{
 constructor(){this.ctx=null;this.buffers=new Map();this.pending=new Map();this.voices=new Map();this.region=null;this.token=0;this.hidden=false;this.test=false;this.errors=[];this.settings={on:true,music:.42,effects:.55,drone:.40,water:.45,footsteps:.20,voices:.48,droneOn:true,crossfade:true};this.env={area:'base',indoor:true,river:0};this._busValues={};}
 async unlock(){
  if(!this.ctx){
   const A=window.AudioContext||window.webkitAudioContext;if(!A)throw Error('This browser has no Web Audio support.');
   this.ctx=new A();const c=this.ctx;this.master=c.createGain();this.master.gain.value=.65;
   this.limiter=c.createDynamicsCompressor();this.limiter.threshold.value=-9;this.limiter.knee.value=6;this.limiter.ratio.value=8;this.limiter.attack.value=.006;this.limiter.release.value=.15;this.master.connect(this.limiter);this.limiter.connect(c.destination);
   this.buses={};for(const k of ['music','effects','drone','water','footsteps','voices']){let g=c.createGain();g.gain.value=0;g.connect(this.master);this.buses[k]=g;}
   // Extra quiet upper harmonics make the existing bass drone audible on phone speakers.
   this.droneHarmonics=c.createGain();this.droneHarmonics.gain.value=.18;this.droneHarmonics.connect(this.buses.drone);
   this.osc=[];for(const [hz,level] of [[110,.44],[165.3,.24],[220.1,.12],[331,.045]]){
    const o=c.createOscillator(),g=c.createGain();o.frequency.value=hz;g.gain.value=level;o.connect(g);g.connect(this.droneHarmonics);o.start();this.osc.push(o);
   }
  }
  await this.ctx.resume();this.hidden=false;this.ramp(this.master,.65,.06);this.levels(true);await this.update(this.env,true);
 }
 async load(name,loop=false){
  const key=name+(loop?':loop':'');if(this.buffers.has(key))return this.buffers.get(key);
  if(this.pending.has(key))return this.pending.get(key);
  const task=(async()=>{if(!this.audioBank)this.audioBank=fetch('./audio-bank.json').then(r=>{if(!r.ok)throw Error('Audio bank unavailable');return r.json();});const bank=await this.audioBank;if(!bank[name])throw Error('Cannot load '+name);const raw=atob(bank[name]),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);let b=await this.ctx.decodeAudioData(bytes.buffer);if(loop)b=spliceLoop(b,this.ctx);this.buffers.set(key,b);return b;})();
  this.pending.set(key,task);try{return await task}finally{this.pending.delete(key)}
 }
 ramp(node,to,seconds=.12){
  const c=this.ctx,t=c.currentTime,from=node._env?envelopeValue(node._env,t):node.gain.value;
  node.gain.cancelScheduledValues(t);node.gain.setValueAtTime(from,t);node.gain.linearRampToValueAtTime(to,t+Math.max(.008,seconds));node._env={from,to,start:t,end:t+Math.max(.008,seconds)};
 }
 levels(force=false){
  if(!this.ctx)return;const s=this.settings,e=this.env,indoor=e.indoor,rv=clamp(e.river),enabled=s.on&&!this.hidden;
  const target={music:enabled&&!this.test?s.music*(indoor?.63:1-rv*.15):0,effects:enabled?s.effects:0,footsteps:enabled?s.footsteps:0,voices:enabled?s.voices:0,drone:enabled&&s.droneOn?s.drone*(this.test?1:indoor?.09:1-rv*.55):0,water:enabled&&!indoor&&!this.test?s.water*rv:0};
  for(const k of Object.keys(target))if(force||Math.abs((this._busValues[k]??-1)-target[k])>.005){this.ramp(this.buses[k],target[k],k==='effects'?.04:.24);this._busValues[k]=target[k];}
 }
 createVoice(name,buffer,bus){
  let v=this.voices.get(name);if(v)return v;
  let source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=buffer;source.loop=true;gain.gain.value=0;source.connect(gain);gain.connect(bus);source.start(this.ctx.currentTime+.02);v={source,gain};this.voices.set(name,v);return v;
 }
 async update(env,force=false){
  const changed=this.env.area!==env.area;this.env={...env};this.levels();if(!this.ctx||!this.settings.on||this.hidden)return;
  if(!changed&&!force&&this.region===env.area)return;
  const token=++this.token;
  try{
   const [music,drone,water]=await Promise.all([this.load(env.area,true),this.load('drone',true),this.load('river',true)]);
   if(token!==this.token||this.hidden||!this.settings.on)return;
   for(const [name,b,bus] of [['drone',drone,this.buses.drone],['river',water,this.buses.water]]){let v=this.createVoice(name,b,bus);if(!v.gain._env)this.ramp(v.gain,1,.6);}
   if(this.region!==env.area){
    const duration=this.settings.crossfade?3:.025;
    for(const [name,v] of this.voices)if(!['drone','river'].includes(name))this.ramp(v.gain,name===env.area?1:0,duration);
    let v=this.createVoice(env.area,music,this.buses.music);this.ramp(v.gain,1,duration);this.region=env.area;
   }
   this.collect();this.levels();
  }catch(e){this.errors.push(e.message);console.warn('Soundscape:',e.message)}
 }
 collect(){if(!this.ctx)return;const now=this.ctx.currentTime;for(const [name,v] of this.voices){const e=v.gain._env;if(!['drone','river',this.region].includes(name)&&e?.to===0&&now>e.end+.1){v.source.stop();v.source.disconnect();v.gain.disconnect();this.voices.delete(name);}}}
 configure(values){Object.assign(this.settings,values);for(const k of ['music','effects','drone','water','footsteps','voices'])this.settings[k]=clamp(this.settings[k]);this.levels(true);if(this.ctx&&this.settings.on&&!this.hidden)this.update(this.env,true);}
 testDrone(on){this.test=on;this.levels(true);}
 async effect(name,options={}){
  if(!this.ctx||!this.settings.on||this.hidden)return;
  try{
   const b=await this.load(name);if(this.hidden)return;const c=this.ctx,source=c.createBufferSource(),gain=c.createGain();source.buffer=b;source.playbackRate.value=options.rate||1;const bus=this.buses[options.bus||'effects']||this.buses.effects;source.connect(gain);
   let panner=null;if(options.position){panner=c.createPanner();panner.panningModel='HRTF';panner.distanceModel='inverse';panner.refDistance=3;panner.maxDistance=38;panner.rolloffFactor=1.5;panner.positionX.value=options.position.x;panner.positionY.value=(options.position.y||0)+.9;panner.positionZ.value=options.position.z;gain.connect(panner);panner.connect(bus);}else gain.connect(bus);
   const now=c.currentTime,duration=b.duration/source.playbackRate.value,end=now+duration,v=options.volume??1;gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(v,now+.006);gain.gain.setValueAtTime(v,Math.max(now+.007,end-.018));gain.gain.linearRampToValueAtTime(0,end);source.start(now);
   source.onended=()=>{source.disconnect();gain.disconnect();panner?.disconnect();};
  }catch(e){if(this.errors.length<20)this.errors.push(e.message);}
 }
 listener(p){if(!this.ctx)return;const l=this.ctx.listener,c=this.ctx,t=c.currentTime;const forward=[-Math.sin(p.yaw),0,-Math.cos(p.yaw)];if(l.positionX){for(const [k,v]of [['positionX',p.x],['positionY',(p.y||0)+1.6],['positionZ',p.z],['forwardX',forward[0]],['forwardY',0],['forwardZ',forward[2]],['upX',0],['upY',1],['upZ',0]])l[k].setValueAtTime(v,t);}else{l.setPosition(p.x,(p.y||0)+1.6,p.z);l.setOrientation(...forward,0,1,0);}}
 async suspend(){this.hidden=true;if(this.ctx){this.ramp(this.master,0,.03);await new Promise(r=>setTimeout(r,40));if(this.hidden)await this.ctx.suspend();}}
 async resume(){if(this.ctx&&this.settings.on){this.hidden=false;await this.ctx.resume();this.ramp(this.master,.65,.06);this.levels(true);await this.update(this.env,true)}}
 diagnostics(){let now=this.ctx?.currentTime||0;return {context:this.ctx?.state||'not started',region:this.region,indoor:this.env.indoor,droneScale:this.test?1:this.env.indoor?.09:1-clamp(this.env.river)*.55,droneGain:this.ctx?envelopeValue(this.buses.drone._env,now):0,voices:Object.fromEntries([...this.voices].map(([k,v])=>[k,envelopeValue(v.gain._env,now)])),errors:this.errors.slice(-3)}}
}
