import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {copy,diffLayouts,mergePatch} from '../dist/sync-protocol.js';
import {SharedSync} from '../dist/shared-sync.js';
import worker from '../backend/dist/server/index.js';
class Bucket {
  value=null; revision=0;
  async get(){if(!this.value)return null;const value=this.value,etag=String(this.revision);return {etag,json:async()=>JSON.parse(value)}}
  async put(key,value,{onlyIf}){if(onlyIf.get('If-None-Match')==='*'&&this.value)return null;if(onlyIf.has('If-Match')&&onlyIf.get('If-Match')!=='"'+this.revision+'"')return null;this.value=value;this.revision++;return {etag:String(this.revision)}}
}
const bucket=new Bucket();
const request=(path,options)=>worker.fetch(new Request('https://test.local'+path,options),{BUCKET:bucket});
const get=async()=> (await request('/api/layout')).json();
const post=ops=>request('/api/layout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId:randomUUID(),ops})});
const initial=await get(),a=copy(initial.layout),b=copy(initial.layout);
a.items[0].x+=100;b.items[1].y+=200;
const writes=await Promise.all([post(diffLayouts(initial.layout,a)),post(diffLayouts(initial.layout,b))]);
assert.deepEqual(writes.map(r=>r.status),[200,200]);
let saved=await get();assert.equal(saved.revision,2);assert.equal(saved.layout.items[0].x,a.items[0].x);assert.equal(saved.layout.items[1].y,b.items[1].y);
a.items[0].x+=100;
assert.equal((await post(diffLayouts(initial.layout,a))).status,409,'stale same-item writes must conflict');
assert.equal((await get()).revision,2);
assert.equal((await post(diffLayouts(initial.layout,b))).status,200,'identical retry is idempotent');
assert.equal((await get()).revision,2);
const invalid=copy(saved.layout);invalid.items[0].pid='unknown';assert.equal((await post(diffLayouts(saved.layout,invalid))).status,400);
const h=await (await request('/api/history/0')).json();assert.deepEqual(h.layout,initial.layout);
assert.equal((await request('/api/layout',{method:'OPTIONS'})).headers.get('access-control-allow-origin'),'*');
const memory=()=>{const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}};
function client(){let value={version:2,items:[],decorations:[]},conflicts=[];const storage=memory();const sync=new SharedSync({url:'https://test.local',read:()=>copy(value),apply:x=>{value=copy(x)},status:()=>{},conflict:x=>conflicts.push(x),storage,fetcher:(url,options)=>worker.fetch(new Request(url,options),{BUCKET:bucket})});return {sync,storage,conflicts,read:()=>value,edit:fn=>fn(value)}}
const c=client(),d=client();
try{
 await Promise.all([c.sync.start(),d.sync.start()]);
 c.edit(x=>x.items[0].y+=100);d.edit(x=>x.items[1].x+=100);
 await Promise.all([c.sync.tick(),d.sync.tick()]);await Promise.all([c.sync.tick(),d.sync.tick()]);
 assert.deepEqual(c.read(),d.read(),'two clients converge after independent edits');
 c.edit(x=>x.items[0].y+=100);d.edit(x=>x.items[0].y+=200);
 await c.sync.tick();await d.sync.tick();assert.equal(d.conflicts.length,1);assert.deepEqual(c.read(),d.read());
 const normal=c.sync.fetcher;c.sync.fetcher=async()=>{throw Error('offline')};c.edit(x=>x.items[2].x+=100);await c.sync.tick();assert.ok(c.storage.getItem(c.sync.draftKey));c.sync.fetcher=normal;await c.sync.tick();assert.equal(c.storage.getItem(c.sync.draftKey),null);
 // Preserve a new edit made while the first request is awaiting its response.
 let release;const responseReady=new Promise(resolve=>{release=resolve});let reached;const inFlight=new Promise(resolve=>{reached=resolve});
 c.sync.fetcher=async(...args)=>{const result=await normal(...args);reached();await responseReady;return result};
 c.edit(x=>x.items[3].x+=100);const flight=c.sync.tick();await inFlight;c.edit(x=>x.items[3].y+=100);const expected=copy(c.read());release();await flight;c.sync.fetcher=normal;await c.sync.tick();assert.deepEqual((await get()).layout,expected);
 const rebased=mergePatch(initial.layout,diffLayouts(initial.layout,initial.layout));assert.deepEqual(rebased.conflicts,[]);
 console.log('Shared layout tests passed: concurrent writes, conflicts, retries, validation, history, offline recovery, edits during requests.');
}finally{c.sync.stop();d.sync.stop()}
