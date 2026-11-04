export const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
export class MapCamera{
 constructor(bounds,width=800,height=500){this.bounds={...bounds};this.width=width;this.height=height;this.zoom=1;this.cx=(bounds.minX+bounds.maxX)/2;this.cz=(bounds.minZ+bounds.maxZ)/2;}
 get baseScale(){const b=this.bounds;return Math.min(this.width*.88/(b.maxX-b.minX),this.height*.88/(b.maxZ-b.minZ));}
 get scale(){return this.baseScale*this.zoom;}
 project(x,z){return[this.width/2+(x-this.cx)*this.scale,this.height/2+(z-this.cz)*this.scale]}
 unproject(x,y){return[this.cx+(x-this.width/2)/this.scale,this.cz+(y-this.height/2)/this.scale]}
 resize(w,h){this.width=Math.max(1,w);this.height=Math.max(1,h);this.constrain();}
 fit(){this.zoom=1;this.cx=(this.bounds.minX+this.bounds.maxX)/2;this.cz=(this.bounds.minZ+this.bounds.maxZ)/2;}
 zoomAt(factor,x=this.width/2,y=this.height/2){if(!Number.isFinite(factor)||factor<=0)return;const[a,b]=this.unproject(x,y);this.zoom=clamp(this.zoom*factor,1,18);this.cx=a-(x-this.width/2)/this.scale;this.cz=b-(y-this.height/2)/this.scale;this.constrain();}
 pan(dx,dy){this.cx-=dx/this.scale;this.cz-=dy/this.scale;this.constrain();}
 centre(x,z,zoom=this.zoom){this.cx=x;this.cz=z;this.zoom=clamp(zoom,1,18);this.constrain();}
 constrain(){const b=this.bounds,px=this.width/this.scale*.32,pz=this.height/this.scale*.32;this.cx=clamp(this.cx,b.minX-px,b.maxX+px);this.cz=clamp(this.cz,b.minZ-pz,b.maxZ+pz);}
}
export function activeMission(data,state,id=state.pinned){return data.missions.find(m=>m.id===id&&state.missions[m.id]==='active')||data.missions.find(m=>state.missions[m.id]==='active')||null;}
export function objective(data,state,id=state.pinned){const m=activeMission(data,state,id);if(!m)return null;const recovered=(state.bag[m.item]||0)>=(m.count||1);if(recovered){const owner=data.missionSources[m.source||'radio'],p=data.stations[owner.station];return{id:m.id,mission:m,zone:'base',x:p[0],z:p[1],name:'Return to '+owner.name,recovered:true};}return{id:m.id,mission:m,zone:'field',x:m.x,z:m.z,name:m.target||m.title,recovered:false,underground:!!m.zone&&m.zone!=='field'};}
export function scaleBar(scale){const target=110/scale,power=Math.pow(10,Math.floor(Math.log10(Math.max(.01,target))));let metres=[1,2,5,10].map(n=>n*power).filter(n=>n<=target).at(-1)||power;return{metres,pixels:metres*scale};}
