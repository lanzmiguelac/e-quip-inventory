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
 if exists(select 1 from public.maintenance_records where equipment_id=p_id and status<>'Resolved') and coalesce(p_data->>'condition','Good') is distinct from 'Needs Repair' then raise exception 'Resolve the open maintenance records to confirm a repaired condition.'; end if;
 select exists(select 1 from public.borrow_requests where equipment_id=p_id and status in ('Approved','Released')) into busy;
 if busy and (p_data->>'condition') is distinct from (select condition from public.equipment where id=p_id) then raise exception 'Record condition during return or maintenance while this asset is reserved or on loan.'; end if;
 update public.equipment set asset_number=upper(trim(p_data->>'asset_number')),name=trim(p_data->>'name'),serial_number=coalesce(p_data->>'serial_number',''),category=coalesce(p_data->>'category','Others'),location=coalesce(p_data->>'location',''),condition=coalesce(p_data->>'condition','Good'),remarks=coalesce(p_data->>'remarks',''),photo_path=p_data->>'photo_path',operational_state=case when p_data->>'condition'='Needs Repair' then 'Maintenance' else operational_state end where id=p_id returning id into result;
 end if;
 if p_data->>'condition'='Needs Repair' and not exists(select 1 from public.maintenance_records where equipment_id=result and status<>'Resolved') then
 insert into public.maintenance_records(equipment_id,incident,reported_by) values(result,'Equipment recorded as Needs Repair. Inspect and resolve before borrowing.',auth.uid());
 end if;
 perform equip_private.audit('Saved equipment','equipment',result); return result;
end; $$;


alter policy profiles_read on public.profiles using ((id=(select auth.uid())) or (select equip_private.current_role()) in ('admin','staff'));
alter policy equipment_read on public.equipment using ((select equip_private.current_role()) is not null);
alter policy requests_read on public.borrow_requests using ((select equip_private.current_role()) in ('admin','staff') or ((select equip_private.current_role())='borrower' and borrower_id=(select auth.uid())));
alter policy loans_read on public.loans using ((select equip_private.current_role()) in ('admin','staff') or ((select equip_private.current_role())='borrower' and borrower_id=(select auth.uid())));
alter policy maintenance_read on public.maintenance_records using ((select equip_private.current_role()) in ('admin','staff'));
alter policy notifications_read on public.notifications using ((select equip_private.current_role()) is not null and recipient_id=(select auth.uid()));
alter policy audit_read on public.audit_logs using ((select equip_private.current_role()) in ('admin','staff'));
alter policy equipment_photos_read on storage.objects using(bucket_id='equipment-photos' and (select equip_private.current_role()) is not null);
alter policy equipment_photos_upload on storage.objects with check(bucket_id='equipment-photos' and (select equip_private.current_role()) in ('admin','staff'));
alter policy equipment_photos_remove on storage.objects using(bucket_id='equipment-photos' and (select equip_private.current_role()) in ('admin','staff'));

commit;
