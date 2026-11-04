import {Soundscape as PinesSound} from './audio-v6.js';
import {clamp} from './audio.js';
export class Soundscape extends PinesSound {
 constructor(){super();Object.assign(this.settings,{fixtures:.22,radioVolume:.5,radioOn:true});this.fixtureChannels=[];this.radioPosition={x:-486,y:1.35,z:14};this.radioLoading=null;this.radioVoice=null;this.fixtureMetrics={sources:0,radioDistance:0,sharedLevels:[]};}
 async unlock(){await super.unlock();this.initRoomAudio();this.ensureRadio();this.roomLevels();}
 initRoomAudio(){if(!this.ctx||this.buses.fixtures)return;const c=this.ctx;
  for(const k of ['fixtures','radio']){const g=c.createGain();g.gain.value=0;g.connect(this.master);this.buses[k]=g;}
  // A dedicated ducking node preserves the original music-volume/crossfade controls.
  this.musicDuck=c.createGain();this.musicDuck.gain.value=1;this.buses.music.disconnect();this.buses.music.connect(this.musicDuck);this.musicDuck.connect(this.master);
  const noise=c.createBuffer(1,c.sampleRate*2,c.sampleRate),n=noise.getChannelData(0);let s=7207;for(let i=0;i<n.length;i++){s=(s*1664525+1013904223)>>>0;n[i]=(s/4294967296*2-1)*.022;}
  for(let i=0;i<4;i++){const gain=c.createGain();gain.gain.value=0;const pan=c.createPanner();pan.panningModel='HRTF';pan.distanceModel='inverse';pan.refDistance=1.4;pan.maxDistance=18;pan.rolloffFactor=1.7;gain.connect(pan);pan.connect(this.buses.fixtures);const oscillators=[];
   for(const[hz,v]of [[100,.028],[200,.009],[50,.007]]){const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=hz+ i*.12;g.gain.value=v;o.connect(g);g.connect(gain);o.start();oscillators.push(o);}
   const source=c.createBufferSource(),filter=c.createBiquadFilter();source.buffer=noise;source.loop=true;filter.type='bandpass';filter.frequency.value=1300;filter.Q.value=1.4;source.connect(filter);filter.connect(gain);source.start();this.fixtureChannels.push({gain,pan,oscillators,noise:source,id:null,lastLevel:-1,lastFault:false});
  }
 }
 levels(force=false){super.levels(force);this.roomLevels();}
 roomLevels(){if(!this.ctx||!this.buses.fixtures)return;const enabled=this.settings.on&&!this.hidden&&!this.test;for(const[k,val]of [['fixtures',enabled?clamp(this.settings.fixtures):0],['radio',enabled&&this.settings.radioOn?clamp(this.settings.radioVolume):0]]){if(Math.abs((this._busValues[k]??-1)-val)>.005){this.ramp(this.buses[k],val,.16);this._busValues[k]=val;}}}
 configure(values){super.configure(values);this.settings.fixtures=clamp(this.settings.fixtures??.22);this.settings.radioVolume=clamp(this.settings.radioVolume??.5);this.roomLevels();}
 async ensureRadio(){if(!this.ctx||this.radioVoice||this.radioLoading)return;this.radioLoading=true;try{const b=await this.load('radio_folk',true),c=this.ctx,source=c.createBufferSource(),gain=c.createGain(),pan=c.createPanner(),filter=c.createBiquadFilter();source.buffer=b;source.loop=true;gain.gain.value=0;filter.type='lowpass';filter.frequency.value=3200;pan.panningModel='HRTF';pan.distanceModel='inverse';pan.refDistance=2;pan.maxDistance=38;pan.rolloffFactor=2;pan.positionX.value=this.radioPosition.x;pan.positionY.value=this.radioPosition.y;pan.positionZ.value=this.radioPosition.z;source.connect(filter);filter.connect(gain);gain.connect(pan);pan.connect(this.buses.radio);source.start();this.radioVoice={source,gain,pan,filter};}catch(e){this.errors.push('Radio: '+e.message);}finally{this.radioLoading=false;}}
 crackle(channel,at){const c=this.ctx,b=c.createBuffer(1,Math.floor(c.sampleRate*.032),c.sampleRate),v=b.getChannelData(0);let seed=913;for(let i=0;i<v.length;i++){seed=(seed*1664525+1013904223)>>>0;v[i]=(seed/4294967296*2-1)*Math.sin(Math.PI*i/v.length)*.014;}const s=c.createBufferSource(),f=c.createBiquadFilter();s.buffer=b;f.type='bandpass';f.frequency.value=1800;f.Q.value=.7;s.connect(f);f.connect(channel.pan);s.start(at);s.onended=()=>{s.disconnect();f.disconnect()};}
 syncFixtures(states,p,time,zone){
  if(!this.ctx||!this.buses.fixtures)return;const now=this.ctx.currentTime,near=states.slice().sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z)).slice(0,4);const occupied=new Set();
  for(const channel of this.fixtureChannels){let l=near.find(s=>s.id===channel.id&&!occupied.has(s.id));if(!l)l=near.find(s=>!occupied.has(s.id));if(l)occupied.add(l.id);const level=l?l.level*(l.ballast?1:.18):0;if(l){channel.id=l.id;channel.pan.positionX.value=l.x;channel.pan.positionY.value=l.y;channel.pan.positionZ.value=l.z;}
   if(Math.abs(channel.lastLevel-level)>.005){channel.gain.gain.cancelScheduledValues(now);channel.gain.gain.setTargetAtTime(level,now,.008);channel.lastLevel=level;}
   if(l?.fault&&!channel.lastFault&&!this.hidden&&this.settings.on)this.crackle(channel,now);channel.lastFault=!!l?.fault;
  }
  const d=Math.hypot(p.x-this.radioPosition.x,p.z-this.radioPosition.z),inBar=zone==='base'&&p.x>-497&&p.z<17;this.fixtureMetrics={sources:near.length,radioDistance:d,sharedLevels:near.map(l=>({id:l.id,visualLevel:l.level,humScale:l.ballast?1:.18,audioTarget:this.fixtureChannels.find(c=>c.id===l.id)?.lastLevel})),radioOn:this.settings.radioOn};
  if(this.radioVoice){const target=zone==='base'?.85:0;if(this.radioTarget!==target){this.ramp(this.radioVoice.gain,target,.35);this.radioTarget=target;}this.radioVoice.filter.frequency.setTargetAtTime(inBar?3200:950,now,.2);}
  const duck=this.settings.radioOn&&zone==='base'?1-.55*Math.max(0,1-d/11):1;if(this.musicDuck&&Math.abs((this.duckValue??1)-duck)>.025){this.ramp(this.musicDuck,duck,.4);this.duckValue=duck;}
  this.roomLevels();
 }
 diagnostics(){return {...super.diagnostics(),fixtures:this.fixtureMetrics,radioLoaded:!!this.radioVoice,fixtureVolume:this.settings.fixtures,radioVolume:this.settings.radioVolume};}
}
