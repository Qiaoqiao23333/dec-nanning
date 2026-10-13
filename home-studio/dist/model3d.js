import * as T from './vendor/three.module.js';
const materials=new Map(),textures=new Map(),geometries=new Map();
function texture(type){if(textures.has(type))return textures.get(type);const c=document.createElement('canvas');c.width=c.height=256;let g=c.getContext('2d');g.fillStyle=type==='wood'?'#c9ae86':type==='fabric'?'#e0ddcf':'#b8b7b2';g.fillRect(0,0,256,256);let seed=23;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};for(let i=0;i<1800;i++){g.strokeStyle=`rgba(${type==='wood'?'102,70,32':'80,80,73'},${rnd()*.11})`;g.lineWidth=.3+rnd();g.beginPath();let x=rnd()*256,y=rnd()*256;g.moveTo(x,y);g.lineTo(x+(type==='wood'?rnd()*140:rnd()*6),y+(type==='wood'?rnd()*2:rnd()*6));g.stroke()}if(type==='tile'){g.strokeStyle='#dedbd3';g.lineWidth=2;g.strokeRect(1,1,254,254);for(let n=0;n<7;n++){g.strokeStyle='#efede530';g.beginPath();g.moveTo(rnd()*256,0);g.bezierCurveTo(rnd()*256,80,rnd()*256,160,rnd()*256,256);g.stroke()}}let t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=T.SRGBColorSpace;textures.set(type,t);return t}
export function mat(color,type='plain'){let k=color+type;if(!materials.has(k))materials.set(k,new T.MeshStandardMaterial({color,roughness:type==='metal'?.32:type==='tile'?.24:.82,metalness:type==='metal'?.55:0,map:['wood','fabric','tile'].includes(type)?texture(type):null}));return materials.get(k)}
function rounded(w,h,d,r){let key=[w,h,d,r].join();if(geometries.has(key))return geometries.get(key);r=Math.min(r,w/3,h/3,d/3);let geo=new T.BoxGeometry(w,h,d,4,4,4),pos=geo.attributes.position,v=new T.Vector3(),inner=new T.Vector3(w/2-r,h/2-r,d/2-r);for(let j=0;j<pos.count;j++){v.fromBufferAttribute(pos,j);let q=v.clone().clamp(inner.clone().negate(),inner),n=v.clone().sub(q).normalize();v.copy(q).addScaledVector(n,r);pos.setXYZ(j,v.x,v.y,v.z)}geo.computeVertexNormals();geometries.set(key,geo);return geo}
export function block(g,w,h,d,x,y,z,color,rad=.012,type='plain'){const mesh=new T.Mesh(rounded(w,h,d,rad),mat(color,type));mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;g.add(mesh);return mesh}
function cylinder(g,r1,r2,h,x,y,z,color,type='plain'){let mesh=new T.Mesh(new T.CylinderGeometry(r1,r2,h,32),mat(color,type));mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;g.add(mesh);return mesh}
function rod(g,pts,r,color,type='wood'){let curve=new T.CatmullRomCurve3(pts.map(p=>new T.Vector3(...p)));let m=new T.Mesh(new T.TubeGeometry(curve,32,r,8,false),mat(color,type));g.add(m);m.castShadow=true;return m}
function seam(g,w,h,d,x,y,z,color){const edges=new T.EdgesGeometry(rounded(w,h,d,.02),30);const line=new T.LineSegments(edges,new T.LineBasicMaterial({color,transparent:true,opacity:.23}));line.position.set(x,y,z);g.add(line)}
export function furniture(p,color){const g=new T.Group(),w=p.w/1000,d=p.d/1000,h=p.h/1000,wood='#cbb18a',dark='#4a453c',fabric=color;const b=(W,H,D,X,Y,Z,C=color,R=.016,M='plain')=>block(g,W,H,D,X,Y,Z,C,R,M);const leg=(x,z,hh=.34)=>cylinder(g,.023,.017,hh,x,hh/2,z,wood,'wood');
if(p.kind==='sideboard'){
 // The merchant diagram splits the 160 cm facade into 40 / 85 / 35 cm bays.
 const z=d/2, darkWood='#3f2b20',glass='#514c36',brass='#bd9554';
 const panel=(W,H,D,X,Y,Z,C=color)=>b(W,H,D,X,Y,Z,C,.004,'wood');
 panel(w,.025,d,0,.0125,0);panel(w,.025,d,0,h-.0125,0);
 panel(.025,h,d,-w/2+.0125,h/2,0);panel(.025,h,d,w/2-.0125,h/2,0);
 panel(w-.05,h-.05,.018,0,h/2,-d/2+.009,darkWood);
 for(const y of [.90,1.45])panel(w-.025,.025,d-.015,0,y,0);
 for(const x of [-.4,.45])panel(.018,.875,d-.025,x,.45,0);
 panel(.38,.018,d-.025,-.6,.38,0);
 for(const y of [.525,.745]){panel(.376,.206,.024,-.6,y,z-.02);cylinder(g,.012,.012,.018,-.6,y,z-.010,brass,'metal').rotation.x=Math.PI/2;}
 // Folded table slides into the central bay, with its leaves vertical.
 panel(.82,.68,.035,.025,.365,z-.04);panel(.82,.09,.027,.025,.837,z-.023);
 for(const x of [-.25,.3]){let knob=cylinder(g,.010,.010,.018,x,.837,z-.010,brass,'metal');knob.rotation.x=Math.PI/2;}
 const glazedDoor=(x,y,W,H)=>{
 panel(W,H,.025,x,y,z-.026);
 b(W-.045,H-.055,.008,x,y,z-.009,glass,.035,'metal');
 for(let xx=x-W/2+.03;xx<x+W/2-.025;xx+=.014)b(.003,H-.08,.005,xx,y,z-.003,'#998671',.001,'metal');
 let knob=cylinder(g,.009,.009,.014,x+W/2-.025,y,z-.008,brass,'metal');knob.rotation.x=Math.PI/2;
 };
 glazedDoor(.625,.45,.32,.84);
 for(const x of [-.525,.005])glazedDoor(x,1.65,.52,.36);
 panel(.018,.375,d-.03,.285,1.65,0);panel(.49,.018,d-.035,.535,1.635,0);
 // Open counter recess and subtle warm task light under the upper cabinet.
 b(1.47,.008,.035,0,1.431,z-.07,'#e6c88f',.002);
 panel(.50,.09,.016,-.06,1.28,-d/2+.02);
 for(let i=0;i<5;i++)b(.012,.16,.015,-.25+i*.095,1.18,-d/2+.035,brass,.003,'metal');
 for(let j=0;j<6;j++)panel(.027,.19+(j%3)*.025,.16,.35+j*.055,1.56,-.04,['#8a7353','#6d7660','#bba17a'][j%3]);
}
else if(p.kind==='foldingTable'){
 const mid=.32,leaf=(w-mid)/2;
 b(mid,.035,d,0,h-.0175,0,color,.012,'wood');
 for(const side of [-1,1]){
 b(leaf,.035,d,side*(mid/2+leaf/2),h-.0175,0,color,.022,'wood');
 b(.022,h-.055,d-.06,side*.14,(h-.055)/2+.02,0,color,.004,'wood');
 for(const zz of [-d/2+.055,d/2-.055]){
 const xx=side*(w/2-.075);
 b(.037,h-.075,.037,xx,(h-.075)/2+.035,zz,color,.005,'wood');
 b(w/2-.18,.035,.027,side*(w/4+.045),.19,zz,color,.004,'wood');
 let wheel=cylinder(g,.018,.018,.024,xx,.018,zz,'#333431','metal');wheel.rotation.x=Math.PI/2;
 }
 }
}
else 
if(p.kind==='sofa'){for(let x of [-w/2+.12,w/2-.12])for(let z of [-d/2+.12,d/2-.12])leg(x,z,.12);b(w-.04,.22,d-.05,0,.22,0,fabric,.065,'fabric');b(w-.1,.46,.19,0,.58,-d/2+.1,fabric,.067,'fabric');for(let x of [-w/2+.13,w/2-.13])b(.26,.40,d,x,.42,0,fabric,.065,'fabric');for(let i=0;i<3;i++){let cw=(w-.56)/3,x=-w/2+.28+cw*(i+.5);b(cw-.012,.17,d-.25,x,.405,.08,fabric,.05,'fabric');let cushion=b(cw-.025,.35,.18,x,.63,-d/2+.24,fabric,.065,'fabric');cushion.rotation.x=-.12;seam(g,cw-.03,.155,d-.27,x,.405,.08,'#6d7062')}for(const [x,c] of [[-.75,'#79866c'],[.70,'#d1a780']]){let pillow=b(.31,.30,.13,x,.61,-.02,c,.062,'fabric');pillow.rotation.z=x>0?-.20:.22}}
else if(p.id==='poang'){for(let x of [-.285,.285]){rod(g,[[x,.08,.34],[x,.07,-.28],[x,.30,-.30],[x,.43,.25]],.027,wood);rod(g,[[x,.47,.30],[x,.48,-.08],[x,.71,-.29],[x,.98,-.32]],.025,wood);rod(g,[[x,.55,.30],[x,.55,-.23]],.025,wood)}let seat=b(.54,.11,.48,0,.40,.05,fabric,.045,'fabric');seat.rotation.x=-.12;let back=b(.54,.58,.11,0,.72,-.23,fabric,.043,'fabric');back.rotation.x=-.20;b(.5,.15,.12,0,.90,-.19,fabric,.035,'fabric');for(let x of [-.25,.25])seam(g,.015,.53,.12,x,.71,-.22,dark)}
else if(p.kind==='chair'){for(let x of [-w/2+.06,w/2-.06])for(let z of [-d/2+.06,d/2-.06])leg(x,z,.43);b(w,.04,d-.07,0,.43,0,wood,.024,'wood');for(let x of [-w/2+.04,w/2-.04])b(.04,.42,.04,x,.59,-d/2+.045,wood,.012,'wood');let back=b(w-.025,.22,.045,0,h-.13,-d/2+.035,wood,.022,'wood');back.rotation.x=-.08}
else if(p.kind==='table'){b(w,.045,d,0,h-.0225,0,color,p.id==='lisabo'?.075:.008,'wood');for(let x of [-w/2+.085,w/2-.085])for(let z of [-d/2+.085,d/2-.085]){if(p.id==='lisabo')leg(x,z,h-.045);else b(.045,h-.05,.045,x,(h-.05)/2,z,color,.003,'wood')}if(p.id==='lack'){b(w-.06,.025,d-.06,0,.15,0,color,.005,'wood');b(.21,.025,.15,-.13,h+.013,0,'#728270');b(.18,.018,.14,-.10,h+.034,0,'#ede2c9')}else{let vase=cylinder(g,.035,.06,.17,.3,h+.085,0,'#d6c8ad');for(let n=0;n<3;n++)rod(g,[[.3,h+.15,0],[.31+n*.025,h+.32,-.02],[.35+n*.035,h+.43,.03]],.005,'#6c8062','plain')}}
else if(p.kind==='shelf'){b(w,.04,d,0,.02,0,color,.006,'wood');b(w,.04,d,0,h-.02,0,color,.006,'wood');b(w,.027,d,0,h/2,0,color,.004,'wood');for(let j=0;j<5;j++)b(.035,h,d,-w/2+.018+(w-.036)*j/4,h/2,0,color,.004,'wood');for(let j=0;j<4;j++){let x=-w/2+(j+.5)*w/4;if(j%2===0)b(w/4-.06,.25,d-.06,x,.17,.015,'#9ba38a',.012,'fabric');else for(let t=0;t<4;t++)b(.035,.20+t*.012,.19,x-.07+t*.043,h/2+.13,.045,['#af9d7f','#708675','#e5d5b9','#70777b'][t],.003,'plain')}}
else if(p.kind==='bed'){for(let x of [-w/2+.09,w/2-.09])for(let z of [-d/2+.10,d/2-.10])leg(x,z,.12);b(w,.24,d,0,.25,0,color,.014,'wood');b(w,h,.065,0,h/2,-d/2+.035,color,.012,'wood');b(w-.08,.22,d-.12,0,.45,0,'#efeadc',.08,'fabric');b(w-.05,.08,d*.61,0,.59,d*.18,'#94a088',.033,'fabric');b(w-.04,.09,.19,0,.64,-d*.095,'#b6bfaa',.028,'fabric');for(let x of [-w*.24,w*.24])b(w*.40,.14,.40,x,.62,-d*.32,'#f8f4e7',.09,'fabric');for(let j=0;j<12;j++)b(w-.09,.004,.008,0,.635,d*.05+j*.08,'#9da991',.001,'plain')}
else if(p.kind==='rug'){b(w,.012,d,0,.01,0,color,.025,'fabric');for(let edge of [-1,1])for(let j=0;j<35;j++)rod(g,[[-w/2+j*w/35,.013,edge*d/2],[-w/2+j*w/35,.01,edge*(d/2+.035)]],.003,'#c6b695','plain');for(let j=0;j<15;j++)b(w-.04,.002,.007,0,.018,-d/2+.08+j*(d-.16)/14,'#aa9879',.001)}
else if(p.kind==='lamp'){cylinder(g,.22,.24,.035,0,.018,0,color,'metal');cylinder(g,.018,.018,h-.3,0,(h-.3)/2,0,color,'metal');let hood=cylinder(g,.16,.245,.30,0,h-.15,0,color,'metal');cylinder(g,.22,.22,.01,0,h-.305,0,'#fff0ca');let bulb=new T.Mesh(new T.SphereGeometry(.045,16,12),new T.MeshStandardMaterial({color:'#fff6d4',emissive:'#ffd898',emissiveIntensity:1}));bulb.position.set(0,h-.29,0);g.add(bulb)}
g.userData.product=p.id;return g}
export function decoration(kind,w,h){let g=new T.Group();if(kind==='art'){block(g,w,h,.045,0,0,0,'#b99a71',.008,'wood');block(g,w-.045,h-.045,.012,0,0,.025,'#efe8d6',.002);let disk=new T.Mesh(new T.CircleGeometry(Math.min(w,h)*.21,48),mat('#b7815e'));disk.position.set(w*.12,h*.13,.033);g.add(disk);let hill=new T.Mesh(new T.CircleGeometry(w*.35,48,0,Math.PI),mat('#7f8d71'));hill.position.set(-w*.08,-h*.25,.035);g.add(hill)}else if(kind==='mirror'){let frame=new T.Mesh(new T.CylinderGeometry(w/2,w/2,.045,64),mat('#aa8c5e','metal'));frame.rotation.x=Math.PI/2;g.add(frame);let disk=new T.Mesh(new T.CircleGeometry(w/2-.025,64),new T.MeshStandardMaterial({color:'#bed2ce',metalness:.82,roughness:.10}));disk.position.z=.024;g.add(disk)}else if(kind==='shelf'){block(g,w,.04,.22,0,0,.09,'#c6a77d',.008,'wood');for(let x of [-w*.30,w*.3])block(g,.035,.14,.15,x,-.07,.08,'#4f584c',.005);for(let j=0;j<4;j++)block(g,.04,.16,.12,-w*.3+j*.045,.10,.08,['#a79172','#7e8e7b','#dbccb3','#8a7160'][j],.002)}else if(kind==='lamp'){block(g,.07,.18,.04,0,0,0,'#99815a',.014,'metal');let light=new T.Mesh(new T.SphereGeometry(Math.min(w,h)/2,32,24),new T.MeshStandardMaterial({color:'#fff0cf',emissive:'#ffdba0',emissiveIntensity:.5,roughness:.5}));light.position.set(0,.025,.12);g.add(light)}g.updateMatrixWorld(true);const bb=new T.Box3().setFromObject(g),sz=bb.getSize(new T.Vector3()),center=bb.getCenter(new T.Vector3());for(const child of g.children){child.position.x-=center.x;child.position.y-=center.y}g.scale.set(w/sz.x,h/sz.y,1);return g}
