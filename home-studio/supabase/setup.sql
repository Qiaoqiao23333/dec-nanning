-- 栖居：仅公开一个共享布局的读写函数；不开放任意数据表访问。
-- 在 Supabase SQL Editor 一次性运行。可重复执行，不会重置已有布局。
begin;
create schema if not exists qiju_private;
revoke all on schema qiju_private from public, anon, authenticated;
create table if not exists qiju_private.layout (
 id boolean primary key default true check(id),
 revision bigint not null default 0,
 updated_at timestamptz not null default now(),
 document jsonb not null
);
create table if not exists qiju_private.history (
 revision bigint primary key, updated_at timestamptz not null, document jsonb not null
);
create table if not exists qiju_private.surfaces (id text primary key, length numeric not null);
alter table qiju_private.layout enable row level security;
alter table qiju_private.history enable row level security;
alter table qiju_private.surfaces enable row level security;
revoke all on all tables in schema qiju_private from public, anon, authenticated;
insert into qiju_private.layout(id,document) values(true,'{"version":2,"items":[{"id":"shared-default-0","pid":"kivik","x":4200,"y":5700,"r":270,"color":"#c4bfad"},{"id":"shared-default-1","pid":"lack","x":2500,"y":5700,"r":90,"color":"#615346"},{"id":"shared-default-2","pid":"lo hals","x":2550,"y":5700,"r":0,"color":"#bda984"},{"id":"shared-default-3","pid":"lisabo","x":1550,"y":2250,"r":90,"color":"#cfb389"},{"id":"shared-default-4","pid":"chair","x":900,"y":1950,"r":270,"color":"#bf9e73"},{"id":"shared-default-5","pid":"chair","x":900,"y":2600,"r":270,"color":"#bf9e73"},{"id":"shared-default-6","pid":"chair","x":2200,"y":1950,"r":90,"color":"#bf9e73"},{"id":"shared-default-7","pid":"chair","x":2200,"y":2600,"r":90,"color":"#bf9e73"}],"decorations":[]}'::jsonb) on conflict(id) do nothing;
insert into qiju_private.surfaces(id,length) values
('west_upper|north|-200',200),
('west_upper|west|-200',4360),
('west_upper|east|0',4160),
('tv_W38|west|4160',3110),
('tv_W38|east|4160',3110),
('west_lower|west|7270',310),
('west_lower|south|-200',200),
('entry_W40|north|0',703),
('entry_W40|south|0',703),
('entry_W40|east|-200',200),
('south_W36|north|0',1200),
('south_W36|south|0',1200),
('entry_W02|north|1773',1614.0000000000005),
('entry_W02|south|1773',1494.0000000000005),
('entry_W02|west|-200',200),
('entry_W02|east|-200',200),
('kitchen_left_upper|west|0',1070),
('kitchen_left_upper|east|395',675),
('kitchen_left_lower|west|2675',400),
('kitchen_left_lower|east|2675',280),
('kitchen_upper_W05|north|3387',1301.3333333333326),
('kitchen_upper_W05|south|3387',1301.3333333333326),
('kitchen_south_W12|north|3387',1840.6666666666656),
('kitchen_south_W12|south|3387',2089.9999999999995),
('kitchen_step_W06|west|395',420),
('kitchen_step_W06|east|195',420),
('south_W34|north|4745',520),
('south_W34|south|4745',520),
('kitchen_step_W07|north|4808',419.33333333333303),
('kitchen_step_W07|south|4808',419.33333333333303),
('kitchen_right|west|195',420),
('kitchen_right|west|815',2140),
('kitchen_right|east|395',2560),
('bed3_west_W26_W33|west|4185',3275),
('north_guest_bath|north|5348',1521.6260162601639),
('north_guest_bath|south|5348',1521.6260162601639),
('bed3_west_W26_W33|east|4300',3160),
('bed3_north_W25|north|5385',1810),
('bed3_north_W25|south|5385',1810),
('south_W27|north|5385',370),
('south_W27|south|5385',370),
('between_doors_W13|north|6274',595),
('between_doors_W13|south|6274',835),
('north_bed2|north|6869',2989.999999999999),
('bed2_west|west|395',2560),
('bed2_west|east|395',2560),
('north_bed2|south|6989',2869.999999999999),
('south_W29|north|7505',665),
('south_W29|south|7505',665),
('bed2_south_W17|north|7939',1919.999999999999),
('bed2_south_W17|south|7939',2039.999999999999),
('master_west_W24|west|4057',3403),
('master_west_W24|east|4057',3403),
('south_W23|north|8290',752),
('south_W23|south|8290',752),
('north_right_bath|north|9859',1917.707317073171),
('bed2_east|west|395',2560),
('bed2_east|east|395',2560),
('north_right_bath|south|9979',1597.707317073171),
('right_bath_south_W18|north|10847',730),
('right_bath_south_W18|south|10847',730),
('south_W20|north|11127',450),
('south_W20|south|11127',450),
('north_right_bath|east|195',200),
('east_outer|west|395',2560),
('east_outer|west|3110',4350),
('east_outer|east|395',7185),
('east_outer|south|11577',200)
on conflict(id) do update set length=excluded.length;

create or replace function public.qiju_read_layout() returns jsonb
language sql security definer set search_path = '' as $$
 select jsonb_build_object('revision',revision,'updatedAt',updated_at,'layout',document)
 from qiju_private.layout where id=true;
$$;

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
revoke all on function public.qiju_read_layout() from public, anon, authenticated;
revoke all on function public.qiju_write_layout(bigint,jsonb) from public, anon, authenticated;
grant execute on function public.qiju_read_layout() to anon, authenticated;
grant execute on function public.qiju_write_layout(bigint,jsonb) to anon, authenticated;
notify pgrst, 'reload schema';
commit;
