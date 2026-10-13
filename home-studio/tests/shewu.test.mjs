import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as T from '../dist/vendor/three.module.js';
import {furniture} from '../dist/model3d.js';
// Canvas texture drawing is irrelevant to physical geometry bounds.
globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})};
const source=await fs.readFile(new URL('../dist/app.js',import.meta.url),'utf8');
const products=source.split('\n').filter(line=>line.startsWith('{"id": "shewu')).map(line=>JSON.parse(line.replace(/,$/,'')));
assert.equal(products.length,3);
for(const p of products){
 const box=new T.Box3().setFromObject(furniture(p,p.color)),size=box.getSize(new T.Vector3());
 for(const [axis,mm] of [['x',p.w],['y',p.h],['z',p.d]])assert.ok(Math.abs(size[axis]*1000-mm)<1,`${p.id}: ${axis} = ${size[axis]*1000}, expected ${mm}`);
 assert.ok(Math.abs(box.min.y)<.001);
}
assert.equal(products.find(p=>p.id==='shewu959-table120').w,1200);
console.log('PASS: all three models match catalog width/depth/height within 1 mm and rest on floor.');
