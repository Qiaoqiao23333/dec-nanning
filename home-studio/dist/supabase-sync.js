import {mergePatch,equal} from './sync-protocol.js';
// Public browser key: access is limited to the two layout RPCs by setup.sql.
export function supabaseTransport(url,key,fetcher=fetch){
 const rpc=async(name,body,signal)=>{const r=await fetcher(url+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',credentials:'omit',signal});const data=await r.json();if(!r.ok)throw Error(r.status===404?'共享数据库尚未初始化':data.message||'共享服务暂不可用');return data};
 const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
 return async(_url,options={})=>{
  let current=await rpc('qiju_read_layout',{},options.signal);
  if(options.method!=='POST')return response(current);
  const {ops}=JSON.parse(options.body);
  for(let i=0;i<5;i++){
   const merged=mergePatch(current.layout,ops);
   if(merged.conflicts.length)return response({...current,error:'conflict'},409);
   if(equal(merged.layout,current.layout))return response(current);
   const saved=await rpc('qiju_write_layout',{expected_revision:current.revision,next_layout:merged.layout},options.signal);
   if(!saved.conflict)return response(saved);
   current=saved;
  }
  throw Error('多人正在修改，请稍后重试');
 };
}
