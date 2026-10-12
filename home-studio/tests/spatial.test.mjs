import assert from 'node:assert/strict';
import fs from 'node:fs';
import {unionWalls,wallSurfaces,fitDecoration,WALL_HEIGHT,surfaceRoom} from '../dist/spatial.js';
const d=JSON.parse(fs.readFileSync(new URL('../dist/geometry.js',import.meta.url),'utf8').split('=').slice(1).join('=').replace(/;$/,''));
const walls=d.model_solids.filter(w=>w.z0_mm===0&&!w.kind.includes('floor'));
const f=unionWalls(walls,()=>WALL_HEIGHT);
// Every vertical face must separate occupied and empty space. Internal faces cause the old overlaid-wall defect.
const occupied=(x,y)=>walls.some(w=>x>w.rect_mm[0]&&x<w.rect_mm[2]&&y>w.rect_mm[1]&&y<w.rect_mm[3]);
for(const p of f.filter(p=>p.side!=='top')){let x=(p.a[0]+p.b[0])/2,y=(p.a[1]+p.b[1])/2;const dx=['west','east'].includes(p.side)?.1:0,dy=['north','south'].includes(p.side)?.1:0;assert.notEqual(occupied(x-dx,y-dy),occupied(x+dx,y+dy),'internal junction face '+p.wall)}
const surfaces=wallSurfaces(walls);
for(const [wall,side,room] of [['kitchen_right','east','客卫'],['right_bath_south_W18','south','卧1']]){const surface=surfaces.find(f=>f.wall===wall&&f.side===side);assert.ok(surface);assert.ok(surfaceRoom(surface,room));assert.equal(fitDecoration({w:600,h:800,u:-500,v:4000},surface).v,1960)}
assert.equal(WALL_HEIGHT,2360);assert.ok(d.model_solids.filter(w=>w.z0_mm===0&&w.kind==='wall').every(w=>w.height_mm===2360));assert.ok(d.model_solids.filter(w=>w.z0_mm===2100).every(w=>w.height_mm===260));
const tee=[{id:'a',rect_mm:[0,0,1000,100]},{id:'b',rect_mm:[450,0,550,1000]}];const teeFaces=unionWalls(tee,()=>2360);assert.equal(teeFaces.filter(f=>f.side==='top').reduce((sum,f)=>sum+Math.abs((f.b[0]-f.a[0])*(f.d[1]-f.a[1])),0),190000);
console.log(`PASS: ${f.length} union faces; no internal walls; both junctions selectable; 236 cm wall/header heights; decoration bounds; T-junction area`);
