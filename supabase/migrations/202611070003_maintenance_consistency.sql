begin;
create or replace function equip_private.save_equipment(p_id uuid,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; busy boolean;
begin
 perform equip_private.require_role(array['admin','staff']);
 if p_id is null then
 insert into public.equipment(asset_number,name,serial_number,category,location,condition,remarks,photo_path,operational_state)
 values(upper(trim(p_data->>'asset_number')),trim(p_data->>'name'),coalesce(p_data->>'serial_number',''),coalesce(p_data->>'category','Others'),coalesce(p_data->>'location',''),coalesce(p_data->>'condition','Good'),coalesce(p_data->>'remarks',''),p_data->>'photo_path',case when p_data->>'condition'='Needs Repair' then 'Maintenance' else 'Active' end) returning id into result;
 else
 perform 1 from public.equipment where id=p_id for update;
 if not found then raise exception 'Equipment not found.'; end if;
 if exists(select 1 from public.maintenance_records where equipment_id=p_id and status<>'Resolved') and p_data->>'condition'<>'Needs Repair' then raise exception 'Resolve the open maintenance records to confirm a repaired condition.'; end if;
 select exists(select 1 from public.borrow_requests where equipment_id=p_id and status in ('Approved','Released')) into busy;
 if busy and (p_data->>'condition') is distinct from (select condition from public.equipment where id=p_id) then raise exception 'Record condition during return or maintenance while this asset is reserved or on loan.'; end if;
 update public.equipment set asset_number=upper(trim(p_data->>'asset_number')),name=trim(p_data->>'name'),serial_number=coalesce(p_data->>'serial_number',''),category=coalesce(p_data->>'category','Others'),location=coalesce(p_data->>'location',''),condition=coalesce(p_data->>'condition','Good'),remarks=coalesce(p_data->>'remarks',''),photo_path=p_data->>'photo_path',operational_state=case when p_data->>'condition'='Needs Repair' then 'Maintenance' else operational_state end where id=p_id returning id into result;
 end if;
 if p_data->>'condition'='Needs Repair' and not exists(select 1 from public.maintenance_records where equipment_id=result and status<>'Resolved') then
 insert into public.maintenance_records(equipment_id,incident,reported_by) values(result,'Equipment recorded as Needs Repair. Inspect and resolve before borrowing.',auth.uid());
 end if;
 perform equip_private.audit('Saved equipment','equipment',result); return result;
end; $$;

create or replace function equip_private.resolve_maintenance(p_id uuid,p_resolution text,p_condition text,p_cost numeric) returns void language plpgsql security definer set search_path='' as $$
declare m public.maintenance_records;
begin
 perform equip_private.require_role(array['admin','staff']);
 select * into m from public.maintenance_records where id=p_id;
 if not found then raise exception 'Maintenance record not found.'; end if;
 perform 1 from public.equipment where id=m.equipment_id for update;
 select * into m from public.maintenance_records where id=p_id for update;
 if m.status='Resolved' then return; end if;
 if length(trim(coalesce(p_resolution,'')))=0 or p_condition is null or p_condition not in ('Good','Fair') then raise exception 'Provide a resolution and confirm Good or Fair condition.'; end if;
 update public.maintenance_records set status='Resolved',resolution=trim(p_resolution),cost=p_cost,completed_at=now() where id=p_id and status<>'Resolved';
 if not exists(select 1 from public.maintenance_records where equipment_id=m.equipment_id and status<>'Resolved') then
 update public.equipment set condition=p_condition,operational_state=case when operational_state='Archived' then 'Archived' else 'Active' end where id=m.equipment_id;
 end if;
 perform equip_private.audit('Resolved maintenance','maintenance',p_id);
end; $$;


create function equip_private.start_repair(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare equipment_id uuid;
begin
 perform equip_private.require_role(array['admin','staff']);
 select m.equipment_id into equipment_id from public.maintenance_records m where id=p_id;
 if not found then raise exception 'Maintenance record not found.'; end if;
 perform 1 from public.equipment where id=equipment_id for update;
 update public.maintenance_records set status='Under Repair' where id=p_id and status='Pending';
 if found then perform equip_private.audit('Started repair','maintenance',p_id); end if;
end; $$;
create function public.start_repair(p_id uuid) returns void language sql security invoker set search_path='' as $$ select equip_private.start_repair(p_id) $$;
revoke all on function equip_private.start_repair(uuid),public.start_repair(uuid) from public,anon;
grant execute on function equip_private.start_repair(uuid),public.start_repair(uuid) to authenticated;

commit;
