import {DATA} from './world.js';
export const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
export const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
export function zoneAt(x,z){for(const [id,q]of Object.entries(DATA.zones))if(x>q.minX-1&&x<q.maxX+1&&z>q.minZ-1&&z<q.maxZ+1)return id;return 'field'}
export function segmentDistance(x,z,a,b){let dx=b[0]-a[0],dz=b[1]-a[1],u=clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1));return Math.hypot(x-a[0]-dx*u,z-a[1]-dz*u)}
export function terrainHeight(x,z){
 if(zoneAt(x,z)!=='field')return 0;
 let f=smooth((66-x)/24),d=Math.max(Math.abs(x)-9,Math.max(-z-11,z-42));f*=smooth(d/9);
 for(const b of DATA.buildings){let q=Math.max(Math.abs(x-b.x)-b.w/2-2,Math.abs(z-b.z)-b.d/2-2);f=Math.min(f,smooth(q/9));}
 for(const route of DATA.roads)for(let i=1;i<route.length;i++)f=Math.min(f,smooth((segmentDistance(x,z,route[i-1],route[i])-4)/7));
 if(z>DATA.rail.minZ-5&&z<DATA.rail.maxZ+5)f=Math.min(f,smooth((Math.abs(x-DATA.rail.x)-4)/7));
 for(const a of DATA.anomalies)f=Math.min(f,smooth((Math.hypot(x-a.x,z-a.z)-a.radius-1)/7));
 for(const q of [[-123,-285],[35,-276]])f=Math.min(f,smooth((Math.hypot(x-q[0],z-q[1])-5)/8));
 f=Math.min(f,smooth((Math.hypot(x+145,z+261)-16)/8));
 const h=2.0+1.2*Math.sin(x*.034)*Math.cos(z*.027)+.8*Math.sin(x*.079+z*.035)+.24*Math.sin(x*.31)*Math.cos(z*.29)+8*Math.exp(-((x+143)**2+(z+312)**2)/1800)+5*Math.exp(-((x+55)**2+(z+395)**2)/2200);
 return Math.max(0,h*f);
}
export function surfaceHeight(x,z,lastY=0){
 const zone=zoneAt(x,z);
 if(zone==='base')return 0;
 if(zone==='cave')return -5*clamp((z-7)/15);
 if(zone==='bunker')return -4.2*clamp((z-3)/12);
 for(const b of DATA.buildings)if(b.floors===2&&Math.abs(x-b.x)<b.w/2-.15&&Math.abs(z-b.z)<b.d/2-.15){
  const lo=b.x+b.w/2-2.6,hi=b.x+b.w/2-.35,front=b.z+b.d/2-1,back=b.z-b.d/2+1;
  if(x>lo&&x<hi&&z>back-.15&&z<front+.3)return 3.2*clamp((front-z)/(front-back));
  return lastY>1.75?3.2:0;
 }
 return terrainHeight(x,z);
}
export function validLand(x,z){
 const zone=zoneAt(x,z),q=DATA.zones[zone];
 if(zone==='base'&&DATA.rooms.some(r=>Math.abs(x-(-500+r.side*3))<.55&&Math.abs(z-r.doorZ)<1.08))return true;
 if(zone==='base')return (Math.abs(x+500)<2.83&&z>.15&&z<45.85)||DATA.rooms.some(b=>Math.abs(x-b.x)<b.w/2-.16&&Math.abs(z-b.z)<b.d/2-.16);
 if(zone==='cave')return z>.15&&z<63.8&&Math.abs(x+800)<(z<21?3.0:17.7);
 if(zone==='bunker')return z>.15&&z<37.8&&Math.abs(x+650)<(z<16?2.3:12.7);
 const b=DATA.bounds,p=DATA.pier;return x>b.minX+.35&&x<b.maxX-.35&&z>b.minZ+.35&&z<b.maxZ-.35&&(x<DATA.shore-.35||(x>p.minX+.35&&x<p.maxX-.35&&z>p.minZ+.35&&z<p.maxZ-.35));
}
