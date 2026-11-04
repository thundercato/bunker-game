export class Simulation{
 constructor(){this.worker=new Worker('./sim-worker.js');this.seq=0;this.pending=new Map();this.worker.onmessage=({data})=>{const p=this.pending.get(data.id);if(!p)return;this.pending.delete(data.id);data.error?p.reject(Error(data.error)):p.resolve(data)};this.worker.onerror=e=>{for(const p of this.pending.values())p.reject(Error(e.message||'Python worker stopped.'));this.pending.clear()};}
 call(action){return new Promise((resolve,reject)=>{const id=++this.seq;const timer=setTimeout(()=>{this.pending.delete(id);reject(Error('The Python engine did not respond. Check your connection and reload.'));},60000);this.pending.set(id,{resolve:v=>{clearTimeout(timer);resolve(v)},reject:e=>{clearTimeout(timer);reject(e)}});this.worker.postMessage({id,action});});}
}
