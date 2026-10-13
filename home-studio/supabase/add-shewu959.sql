-- 仅更新家具白名单，不覆盖当前布局或历史。
BEGIN;
create or replace function public.qiju_write_layout(expected_revision bigint,next_layout jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
 row_data qiju_private.layout%rowtype;
 entity jsonb;
 wall_length numeric;
 collection text;
 allowed text[];
begin
 if next_layout is null or octet_length(next_layout::text)>450000
    or jsonb_typeof(next_layout) is distinct from 'object'
    or next_layout->'version' is distinct from '2'::jsonb
    or jsonb_typeof(next_layout->'items') is distinct from 'array'
    or jsonb_typeof(next_layout->'decorations') is distinct from 'array' then
   raise exception 'Invalid layout';
 end if;
 if exists(select 1 from jsonb_object_keys(next_layout) k where k not in ('version','items','decorations'))
    or jsonb_array_length(next_layout->'items')>300 or jsonb_array_length(next_layout->'decorations')>150 then
   raise exception 'Layout capacity or fields invalid';
 end if;
 foreach collection in array array['items','decorations'] loop
  if exists(select 1 from jsonb_array_elements(next_layout->collection) e group by e->>'id' having count(*)>1) then
   raise exception 'Duplicate entity ID';
  end if;
  for entity in select value from jsonb_array_elements(next_layout->collection) loop
   if jsonb_typeof(entity) is distinct from 'object' or coalesce(entity->>'id','') !~ '^[a-zA-Z0-9_-]{1,100}$' then raise exception 'Invalid entity'; end if;
   if collection='items' then
    allowed:=array['id','pid','x','y','r','color'];
    if not (entity ?& allowed) or coalesce(entity->>'pid','') not in ('kivik','lack','lisabo','chair','kallax','poang','lo hals','hektar','malm','shewu959-cabinet','shewu959-table','shewu959-table120')
      or jsonb_typeof(entity->'x') is distinct from 'number' or jsonb_typeof(entity->'y') is distinct from 'number'
      or entity->'r' not in ('0'::jsonb,'90'::jsonb,'180'::jsonb,'270'::jsonb)
      or coalesce(entity->>'color','') !~ '^#[0-9a-fA-F]{6}$' then raise exception 'Invalid furniture'; end if;
    if abs((entity->>'x')::numeric)>20000 or abs((entity->>'y')::numeric)>20000 then raise exception 'Invalid position'; end if;
   else
    allowed:=array['id','surface','kind','w','h','u','v'];
    if not (entity ?& allowed) or coalesce(entity->>'kind','') not in ('art','mirror','shelf','lamp')
      or jsonb_typeof(entity->'w') is distinct from 'number' or jsonb_typeof(entity->'h') is distinct from 'number'
      or jsonb_typeof(entity->'u') is distinct from 'number' or jsonb_typeof(entity->'v') is distinct from 'number' then raise exception 'Invalid decoration'; end if;
    select length into wall_length from qiju_private.surfaces where id=entity->>'surface';
    if wall_length is null or (entity->>'w')::numeric<50 or (entity->>'w')::numeric>wall_length
      or (entity->>'h')::numeric<50 or (entity->>'h')::numeric>2360
      or (entity->>'u')::numeric < (entity->>'w')::numeric/2-0.1
      or (entity->>'u')::numeric > wall_length-(entity->>'w')::numeric/2+0.1
      or (entity->>'v')::numeric < (entity->>'h')::numeric/2-0.1
      or (entity->>'v')::numeric > 2360-(entity->>'h')::numeric/2+0.1 then raise exception 'Decoration outside wall'; end if;
   end if;
   if exists(select 1 from jsonb_object_keys(entity) k where not(k=any(allowed))) then raise exception 'Unexpected entity fields'; end if;
  end loop;
 end loop;
 select * into row_data from qiju_private.layout where id=true for update;
 if expected_revision is distinct from row_data.revision then
  return public.qiju_read_layout() || '{"conflict":true}'::jsonb;
 end if;
 if next_layout is not distinct from row_data.document then return public.qiju_read_layout(); end if;
 insert into qiju_private.history values(row_data.revision,row_data.updated_at,row_data.document);
 delete from qiju_private.history where revision < row_data.revision-9;
 update qiju_private.layout set document=next_layout,revision=revision+1,updated_at=now() where id=true;
 return public.qiju_read_layout();
end;
$$;
COMMIT;
