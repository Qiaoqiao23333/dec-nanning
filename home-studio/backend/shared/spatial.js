export const WALL_HEIGHT=2360;
export const ROOM_AREAS={
'客餐厅':[[0,0,3267,7460],[3267,3110,5265,7460],[5265,3110,8290,4057]],
'厨房':[[3387,395,4688.333333,2955],[4688.333333,815,5227.666667,2955]],
'客卫':[[5347.666667,395,6869.292683,2955]],'卧2':[[6989.292683,395,9859.292683,2955]],
'主卫':[[9979.292683,395,11577,2955]],'卧1':[[8290,3110,11577,7460],[9042,7460,11127,8270]],
'卧3':[[5385,4300,8170,7460]],'阳台':[[1200,7580,8130,9540]]};
export function intersects(a,b){return a[0]<b[2]-.01&&a[2]>b[0]+.01&&a[1]<b[3]-.01&&a[3]>b[1]+.01}
export function inRoom(x,y,room){return room==='全屋'||(ROOM_AREAS[room]||[]).some(r=>x>=r[0]&&x<=r[2]&&y>=r[1]&&y<=r[3])}
export function roomBounds(room){let a=ROOM_AREAS[room];return a?[Math.min(...a.map(r=>r[0])),Math.min(...a.map(r=>r[1])),Math.max(...a.map(r=>r[2])),Math.max(...a.map(r=>r[3]))]:[-200,-200,11777,9660]}
// A rectangular union removes internal and coincident faces at T/L junctions.
// Each exterior face retains its source wall and inward/outward side for decoration.
export function unionWalls(walls,heightFn){let xs=[...new Set(walls.flatMap(w=>[w.rect_mm[0],w.rect_mm[2]]))].sort((a,b)=>a-b),ys=[...new Set(walls.flatMap(w=>[w.rect_mm[1],w.rect_mm[3]]))].sort((a,b)=>a-b),cells=new Map();
for(let i=0;i<xs.length-1;i++)for(let j=0;j<ys.length-1;j++){const x=(xs[i]+xs[i+1])/2,y=(ys[j]+ys[j+1])/2,w=walls.find(w=>x>w.rect_mm[0]-.001&&x<w.rect_mm[2]&&y>w.rect_mm[1]-.001&&y<w.rect_mm[3]);if(w){const h=heightFn(w);if(h>0)cells.set(i+','+j,{i,j,w,h})}}
let faces=[];for(let {i,j,w,h} of cells.values()){let x=xs[i],x1=xs[i+1],y=ys[j],y1=ys[j+1];faces.push({wall:w.id,side:'top',a:[x,y,h],b:[x1,y,h],c:[x1,y1,h],d:[x,y1,h]});for(let [side,ni,nj,a,b] of [['north',i,j-1,[x1,y],[x,y]],['south',i,j+1,[x,y1],[x1,y1]],['west',i-1,j,[x,y],[x,y1]],['east',i+1,j,[x1,y1],[x1,y]]]){let low=cells.get(ni+','+nj)?.h||0;if(low<h)faces.push({wall:w.id,side,a:[...a,low],b:[...b,low],c:[...b,h],d:[...a,h]})}}return faces}
export function wallSurfaces(walls){const faces=unionWalls(walls,()=>WALL_HEIGHT).filter(f=>f.side!=='top'),groups=new Map();for(let f of faces){const horizontal=['north','south'].includes(f.side),axis=horizontal?0:1,line=horizontal?f.a[1]:f.a[0],start=Math.min(f.a[axis],f.b[axis]),end=Math.max(f.a[axis],f.b[axis]),key=[f.wall,f.side,line].join(':');if(!groups.has(key))groups.set(key,[]);groups.get(key).push({wall:f.wall,side:f.side,line,start,end,horizontal})}let out=[];for(let segs of groups.values()){segs.sort((a,b)=>a.start-b.start);let cur;for(let s of segs){if(cur&&Math.abs(cur.end-s.start)<.1)cur.end=s.end;else{cur={...s};out.push(cur)}}}return out.filter(s=>s.end-s.start>=200).map(s=>({...s,id:`${s.wall}|${s.side}|${Math.round(s.start)}`,length:s.end-s.start}))}
export function surfaceRoom(s,room){let mid=(s.start+s.end)/2,offset=60;let x=s.horizontal?mid:s.line+(s.side==='east'?offset:-offset),y=s.horizontal?s.line+(s.side==='south'?offset:-offset):mid;return inRoom(x,y,room)}
export function fitDecoration(d,s){const half=d.w/2;return {...d,u:Math.max(half,Math.min(s.length-half,d.u)),v:Math.max(d.h/2,Math.min(WALL_HEIGHT-d.h/2,d.v))}}
