from pathlib import Path
import numpy as np, wave, subprocess, json, base64
from scipy.signal import butter, sosfilt
R=Path(__file__).resolve().parents[1]/'site';(R/'research-v9').mkdir(exist_ok=True);(R/'assets/audio').mkdir(parents=True,exist_ok=True);sr=32000;duration=128;n=sr*duration;rng=np.random.default_rng(90711)
mix=np.zeros((n,2),np.float32)
def hz(m):return 440*2**((m-69)/12)
def add(start,signal,pan=0):
 idx=(int(start*sr)+np.arange(len(signal)))%n
 for ch,g in enumerate([np.sqrt((1-pan)/2),np.sqrt((1+pan)/2)]):np.add.at(mix[:,ch],idx,signal*g)
# A deliberately calm refuge: no percussion, scare effects, detuned bass or minor-second drones.
chords=[[52,59,62,67],[48,55,59,64],[43,55,59,66],[50,57,62,64],[52,59,64,67],[45,57,60,64],[48,55,59,64],[52,59,64,67]]
for bar,notes in enumerate(chords):
 t=np.arange(sr*21)/sr;env=np.minimum(1,t/3.8)*np.minimum(1,(21-t)/5.2);env=np.clip(env,0,1)**1.7
 for j,midi in enumerate(notes):
  f=hz(midi);tone=(np.sin(2*np.pi*f*t)+.18*np.sin(2*np.pi*f*2*t)+.04*np.sin(2*np.pi*f*3*t))*env*.022
  add(bar*16,tone,(-.45,.35,-.15,.5)[j])
 # Sparse electric-piano notes, slowly decaying and leaving space between phrases.
 for k,off in enumerate([2.1,6.5,11.4]):
  midi=notes[(k+bar)%len(notes)]+12;t=np.arange(sr*8)/sr;f=hz(midi);env=(1-np.exp(-t*32))*np.exp(-t/.95)
  tine=(np.sin(2*np.pi*f*t+.10*np.sin(2*np.pi*f*2*t)*np.exp(-t*.9))+.12*np.sin(2*np.pi*f*2*t))*env*.035
  add(bar*16+off,tine,[-.25,.3,0][k])
# A short room-like tail, wrapped into the beginning for a continuous musical loop.
original=mix.copy()
for delay,gain in [(.19,.14),(.37,.10),(.71,.065),(1.13,.035)]:mix+=np.roll(original,int(delay*sr),axis=0)[:,::-1]*gain
mix=sosfilt(butter(2,[80,5500],fs=sr,btype='band',output='sos'),mix,axis=0)
peak=float(np.max(np.abs(mix)));mix*=.40/max(peak,1e-5)
# Remove the filter's startup discontinuity by a short matched boundary blend.
k=1600
ramp=np.linspace(0,1,k)[:,None];tail=mix[-k:].copy();head=mix[:k].copy();bridge=tail*(1-ramp)+head*ramp;mix[:k]=bridge
wav=R/'research-v9/refuge-warm.wav'
with wave.open(str(wav),'wb')as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(sr);w.writeframes((np.clip(mix,-1,1)*32767).astype('<i2').tobytes())
old=R/'assets/audio/base.mp3';backup=R/'research-v9/base-eerie-original.mp3'
if old.exists()and not backup.exists():backup.write_bytes(old.read_bytes())
subprocess.run(['ffmpeg','-y','-v','error','-i',str(wav),'-codec:a','libmp3lame','-b:a','80k','-metadata','title=Relay Lanterns','-metadata','artist=Field Signal original procedural score',str(old)],check=True)
bank=json.loads((R/'audio-bank.json').read_text());bank['base']=base64.b64encode(old.read_bytes()).decode();(R/'audio-bank.json').write_text(json.dumps(bank,separators=(',',':')))
(R/'assets/v9/REFUGE_MUSIC.md').write_text('''# Relay Lanterns
Original procedural composition and synthesis for Field Signal v9. 128 seconds, gentle sustained harmonies and sparse electric-piano notes, no drums. Created for the calmer base soundtrack request. No third-party samples or copied melody. The field soundtrack and radio recordings are separate and retain their existing credits.\n''')
print('CALM BASE TRACK',old.stat().st_size,'bytes',duration,'seconds','peak',float(np.max(np.abs(mix))),'RMS',float(np.sqrt(np.mean(mix**2))))
