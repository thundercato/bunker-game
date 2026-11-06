import {DATA} from './world.js';
import {campaignSurface} from './campaign-core.js';
import {previewBuilding, insidePreview, previewSurface} from './world-preview.js';
export const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
export const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
export function zoneAt(x,z){for(const [id,q]of Object.entries(DATA.zones))if(x>q.minX-1&&x<q.maxX+1&&z>q.minZ-1&&z<q.maxZ+1)return id;return 'field'}
export function segmentDistance(x,z,a,b){let dx=b[0]-a[0],dz=b[1]-a[1],u=clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1));return Math.hypot(x-a[0]-dx*u,z-a[1]-dz*u)}
function westTerrainHeight(x,z){
 if(zoneAt(x,z)!=='field')return 0;
 let f=smooth((66-x)/24),d=Math.max(Math.abs(x)-9,Math.max(-z-11,z-42));f*=smooth(d/9);
 for(const b of DATA.buildings){let q=Math.max(Math.abs(x-b.x)-b.w/2-2,Math.abs(z-b.z)-b.d/2-2);f=Math.min(f,smooth(q/9));}
 for(const route of DATA.roads)for(let i=1;i<route.length;i++)f=Math.min(f,smooth((segmentDistance(x,z,route[i-1],route[i])-4)/7));
 if(DATA.campaign){for(let i=1;i<DATA.rail.route.length;i++)f=Math.min(f,smooth((segmentDistance(x,z,DATA.rail.route[i-1],DATA.rail.route[i])-4)/7));}else if(z>DATA.rail.minZ-5&&z<DATA.rail.maxZ+5)f=Math.min(f,smooth((Math.abs(x-DATA.rail.x)-4)/7));
 for(const a of DATA.anomalies)f=Math.min(f,smooth((Math.hypot(x-a.x,z-a.z)-a.radius-1)/7));
 for(const q of [[-123,-285],[35,-276]])f=Math.min(f,smooth((Math.hypot(x-q[0],z-q[1])-5)/8));
 f=Math.min(f,smooth((Math.hypot(x+145,z+261)-16)/8));
 const h=2.0+1.2*Math.sin(x*.034)*Math.cos(z*.027)+.8*Math.sin(x*.079+z*.035)+.24*Math.sin(x*.31)*Math.cos(z*.29)+8*Math.exp(-((x+143)**2+(z+312)**2)/1800)+5*Math.exp(-((x+55)**2+(z+395)**2)/2200);
 return Math.max(0,h*f);
}

export function terrainHeight(x,z){
 if(zoneAt(x,z)!=='field')return 0;if(x>=66&&x<=132)return -1;if(z>=58)return 0;if(x<66)return westTerrainHeight(x,z);
 let f=smooth((x-132)/14);for(const b of DATA.buildings)f=Math.min(f,smooth(Math.max(Math.abs(x-b.x)-b.w/2-2,Math.abs(z-b.z)-b.d/2-2)/8));for(const route of DATA.roads)for(let i=1;i<route.length;i++)f=Math.min(f,smooth((segmentDistance(x,z,route[i-1],route[i])-4)/7));if(DATA.campaign)for(let i=1;i<DATA.rail.route.length;i++)f=Math.min(f,smooth((segmentDistance(x,z,DATA.rail.route[i-1],DATA.rail.route[i])-4)/7));if(x>178&&x<297&&z>-609&&z<-475)f=0;for(const [xx,zz]of [[154,-348],[210,-422]])f=Math.min(f,smooth((Math.hypot(x-xx,z-zz)-5)/7));return Math.max(0,(2.4+1.3*Math.sin(x*.038)*Math.cos(z*.025)+.45*Math.sin(x*.19+z*.17))*f);
}
function baseSurfaceHeight(x,z,lastY=0){
 const preview=previewBuilding(DATA);if(preview&&insidePreview(preview,x,z,2.5))return previewSurface(preview,x,z,lastY);

 const zone=zoneAt(x,z);if(zone==='base')return z<0?2.6*clamp(-z/7):z>46?2.6*clamp((z-46)/7):0;
 if(zone==='cave')return -5*clamp((z-7)/15);if(zone==='bunker'||zone==='sewer')return -4.2*clamp((z-3)/12);
 if(Math.abs(x)<1.8&&z>0&&z<8)return -3*clamp(z/7);if(Math.abs(x)<1.8&&z>9&&z<14)return -3*clamp((14-z)/7);
 const r=DATA.river;if(x>r.west-7&&x<r.east+7)for(const b of r.bridges)if(Math.abs(z-b.z)<b.halfWidth+1)return .45*Math.min(smooth((x-(r.west-7))/7),smooth(((r.east+7)-x)/7));
 for(const b of DATA.buildings)if(!b.editorScene&&b.floors===2&&Math.abs(x-b.x)<b.w/2-.15&&Math.abs(z-b.z)<b.d/2-.15){const front=b.z+b.d/2-1,back=b.z-b.d/2+1;if(x>b.x+b.w/2-2.6&&x<b.x+b.w/2-.35&&z>back-.15&&z<front+.3)return 3.2*clamp((front-z)/(front-back));return lastY>1.75?3.2:0;}return terrainHeight(x,z);
}
export function validLand(x,z){
 const zone=zoneAt(x,z);if(zone==='base')return(Math.abs(x+500)<2.83&&z>-7.7&&z<53.7)||DATA.rooms.some(r=>Math.abs(x-(-500+r.side*3))<.56&&Math.abs(z-r.doorZ)<1.08)||DATA.rooms.some(r=>Math.abs(x-r.x)<r.w/2-.16&&Math.abs(z-r.z)<r.d/2-.16);
 if(zone==='cave')return z>.15&&z<63.8&&Math.abs(x+800)<(z<21?3:17.7);if(zone==='bunker')return z>.15&&z<37.8&&Math.abs(x+650)<(z<16?2.3:12.7);
 if(zone==='sewer')return(z>.15&&z<113.7&&Math.abs(x+1100)<2.4)||(z>38&&z<54&&Math.abs(x+1100)<6.7)||(z>67.7&&z<72.3&&x>-1101&&x<-1084.2);
 const b=DATA.bounds,r=DATA.river,p=DATA.pier;return x>b.minX+.35&&x<b.maxX-.35&&z>b.minZ+.35&&z<DATA.swamp.limit-.3&&(x<r.west-.3||x>r.east+.3||r.bridges.some(q=>Math.abs(z-q.z)<q.halfWidth-.25)||(x>p.minX+.35&&x<p.maxX-.35&&z>p.minZ+.35&&z<p.maxZ-.35));
}

export function surfaceHeight(x,z,lastY=0){const base=baseSurfaceHeight(x,z,lastY);return DATA.campaign?campaignSurface(DATA,x,z,lastY,base):base;}
