// Run with PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {supabaseTransport} from '../dist/supabase-sync.js';
import {diffLayouts,copy} from '../dist/sync-protocol.js';
const {PGlite}=await import(process.env.PGLITE_MODULE||'@electric-sql/pglite');
const db=new PGlite();
try{
 await db.exec('create role anon; create role authenticated;');
 const sql=await fs.readFile(new URL('../supabase/setup.sql',import.meta.url),'utf8');await db.exec(sql);await db.exec(sql);
 await db.exec('set role anon');
 const read=async()=> (await db.query('select public.qiju_read_layout() as value')).rows[0].value;
 const initial=await read();assert.equal(initial.layout.items.length,8);
 await assert.rejects(db.query('select * from qiju_private.layout'));
 const next=copy(initial.layout);next.items[0].x+=100;
 const write=async(rev,layout)=>(await db.query('select public.qiju_write_layout($1,$2::jsonb) as value',[rev,JSON.stringify(layout)])).rows[0].value;
 const saved=await write(0,next);assert.equal(saved.revision,1);
 assert.equal((await write(0,initial.layout)).conflict,true);assert.deepEqual((await read()).layout,next);
 const invalid=copy(next);invalid.items[0].pid='unknown';await assert.rejects(write(1,invalid));
 const duplicate=copy(next);duplicate.items.push(duplicate.items[0]);await assert.rejects(write(1,duplicate));
 const missing=copy(next);delete missing.items[0].x;await assert.rejects(write(1,missing));
 const invalidDecor=copy(next);invalidDecor.decorations=[{id:'test',surface:'no-wall',kind:'art',w:100,h:100,u:100,v:100}];await assert.rejects(write(1,invalidDecor));
 // Exercise the browser transport against the real PostgreSQL functions.
 const transport=supabaseTransport('https://test.local','public-test',async(url,options)=>{
  assert.equal(options.headers.apikey,'public-test');const body=JSON.parse(options.body);
  return new Response(JSON.stringify(url.endsWith('qiju_read_layout')?await read():await write(body.expected_revision,body.next_layout)));
 });
 const a=copy(next),b=copy(next);a.items[0].y+=100;b.items[1].x+=100;
 const send=(before,after)=>transport('/api/layout',{method:'POST',body:JSON.stringify({ops:diffLayouts(before,after)})});
 assert.equal((await send(next,a)).status,200);assert.equal((await send(next,b)).status,200);
 const combined=await read();assert.equal(combined.layout.items[0].y,a.items[0].y);assert.equal(combined.layout.items[1].x,b.items[1].x);
 b.items[0].y+=200;assert.equal((await send(next,b)).status,409);
 for(let n=0;n<12;n++){const state=await read();state.layout.items[2].x+=10;await write(state.revision,state.layout)}
 await db.exec('reset role');assert.equal(Number((await db.query('select count(*) from qiju_private.history')).rows[0].count),10);
 console.log('Supabase SQL and transport passed: repeatable setup, anonymous RPC, private tables, CAS, validation, merge, conflict, bounded history.');
}finally{await db.close()}
