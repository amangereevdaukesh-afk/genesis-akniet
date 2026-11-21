create or replace function public.store_day(day jsonb, pictures jsonb, music jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare mid uuid := (day->>'id')::uuid; owner uuid := auth.uid();
begin
if jsonb_array_length(pictures)<1 then raise exception 'A photograph is required'; end if;
insert into public.memories(id,user_id,memory_date,title,diary_text,emotional_room,slot,visual_settings,visibility) values(mid,owner,(day->>'date')::date,day->>'title',day->>'diary',day->>'room',(day->>'slot')::int,day->'visual',day->>'visibility')
on conflict(id) do update set memory_date=excluded.memory_date,title=excluded.title,diary_text=excluded.diary_text,emotional_room=excluded.emotional_room,slot=excluded.slot,visual_settings=excluded.visual_settings,visibility=excluded.visibility,updated_at=now();
delete from public.memory_photos where memory_id=mid;
insert into public.memory_photos(memory_id,storage_path,display_order,content_type,file_size)
select mid,p->>'path',(n-1)::int,p->>'type',(p->>'size')::bigint from jsonb_array_elements(pictures) with ordinality a(p,n);
insert into public.memory_music(memory_id,external_url,storage_path) values(mid,nullif(music->>'url',''),music->>'path') on conflict(memory_id) do update set external_url=excluded.external_url,storage_path=excluded.storage_path;
update public.memory_music set track_title=music->>'title',artist=music->>'artist',provider_track_id=music->>'track_id',provider=case when music->>'track_id' is not null then 'apple_music' end where memory_id=mid;
end $$;
revoke all on function public.store_day(jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.store_day(jsonb,jsonb,jsonb) to authenticated;
