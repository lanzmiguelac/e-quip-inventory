begin;
create schema if not exists equip_private;
revoke all on schema equip_private from public;
grant usage on schema equip_private to authenticated, service_role;
create table public.profiles (
 id uuid primary key references auth.users(id), full_name text not null check(length(trim(full_name)) between 1 and 120),
 email text not null, school_id text not null default '', role text not null default 'borrower' check(role in ('admin','staff','borrower')),
 is_active boolean not null default true, created_at timestamptz not null default now()
);
create function equip_private.current_role() returns text language sql stable security definer set search_path='' as $$
 select role from public.profiles where id=auth.uid() and is_active;
$$;
create function equip_private.require_role(allowed text[]) returns void language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or coalesce(equip_private.current_role()=any(allowed),false)=false then raise exception 'You do not have permission to perform this action.' using errcode='42501'; end if;
end; $$;
create function public.school_today() returns date language sql stable security invoker set search_path='' as $$ select (now() at time zone 'Asia/Manila')::date $$;
create table public.equipment (
 id uuid primary key default gen_random_uuid(), asset_number text not null unique check(length(trim(asset_number)) between 1 and 40),
 name text not null check(length(trim(name)) between 1 and 160), serial_number text not null default '', category text not null default 'Others',
 location text not null default '', condition text not null default 'Good' check(condition in ('Good','Fair','Needs Repair')),
 operational_state text not null default 'Active' check(operational_state in ('Active','Maintenance','Archived')),
 photo_path text, remarks text not null default '', archived_at timestamptz, created_at timestamptz not null default now()
);
create table public.borrow_requests (
 id uuid primary key default gen_random_uuid(), reference bigint generated always as identity unique,
 borrower_id uuid not null references public.profiles(id), equipment_id uuid not null references public.equipment(id),
 purpose text not null check(length(trim(purpose)) between 1 and 1000), requested_date date not null, due_date date not null,
 status text not null default 'Pending' check(status in ('Pending','Approved','Rejected','Cancelled','Released','Returned')),
 reviewer_id uuid references public.profiles(id), reviewed_at timestamptz, rejection_reason text, created_at timestamptz not null default now(),
 check(due_date>=requested_date)
);
create unique index one_reservation_per_asset on public.borrow_requests(equipment_id) where status in ('Approved','Released');
create index requests_borrower on public.borrow_requests(borrower_id);
create index requests_equipment on public.borrow_requests(equipment_id);
create index requests_reviewer on public.borrow_requests(reviewer_id);
create table public.loans (
 id uuid primary key default gen_random_uuid(), request_id uuid not null unique references public.borrow_requests(id),
 equipment_id uuid not null references public.equipment(id), borrower_id uuid not null references public.profiles(id),
 released_at timestamptz not null default now(), due_date date not null, released_by uuid not null references public.profiles(id),
 returned_at timestamptz, received_by uuid references public.profiles(id), release_condition text not null check(release_condition in ('Good','Fair')),
 return_condition text check(return_condition in ('Good','Fair','Needs Repair')), release_accessories text not null default '', return_accessories text not null default '',
 check((returned_at is null and received_by is null and return_condition is null) or (returned_at is not null and received_by is not null and return_condition is not null))
);
create unique index one_open_loan_per_asset on public.loans(equipment_id) where returned_at is null;
create index loans_borrower on public.loans(borrower_id);
create index loans_released_by on public.loans(released_by);
create index loans_received_by on public.loans(received_by);
create table public.maintenance_records (
 id uuid primary key default gen_random_uuid(), equipment_id uuid not null references public.equipment(id), loan_id uuid references public.loans(id),
 incident text not null check(length(trim(incident)) between 1 and 2000), status text not null default 'Pending' check(status in ('Pending','Under Repair','Resolved')),
 cost numeric(12,2) not null default 0 check(cost>=0), resolution text not null default '', reported_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(), completed_at timestamptz
);
create index maintenance_equipment on public.maintenance_records(equipment_id);
create index maintenance_loan on public.maintenance_records(loan_id);
create index maintenance_reporter on public.maintenance_records(reported_by);
create table public.notifications (
 id uuid primary key default gen_random_uuid(), recipient_id uuid not null references public.profiles(id), message text not null,
 request_id uuid references public.borrow_requests(id), created_at timestamptz not null default now(), read_at timestamptz
);
create index notifications_recipient on public.notifications(recipient_id,created_at desc);
create index notifications_request on public.notifications(request_id);
create table public.audit_logs (
 id uuid primary key default gen_random_uuid(), actor_id uuid not null references public.profiles(id), action text not null,
 entity_type text not null, entity_id uuid not null, created_at timestamptz not null default now()
);
create index audit_actor on public.audit_logs(actor_id);

alter table public.profiles enable row level security;
alter table public.equipment enable row level security;
alter table public.borrow_requests enable row level security;
alter table public.loans enable row level security;
alter table public.maintenance_records enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
revoke all on public.profiles,public.equipment,public.borrow_requests,public.loans,public.maintenance_records,public.notifications,public.audit_logs from anon,authenticated;
grant select on public.profiles,public.equipment,public.borrow_requests,public.loans,public.maintenance_records,public.notifications,public.audit_logs to authenticated;
grant all on public.profiles,public.equipment,public.borrow_requests,public.loans,public.maintenance_records,public.notifications,public.audit_logs to service_role;
grant usage,select on all sequences in schema public to service_role;
create policy profiles_read on public.profiles for select to authenticated using ((id=auth.uid()) or equip_private.current_role() in ('admin','staff'));
create policy equipment_read on public.equipment for select to authenticated using (equip_private.current_role() is not null);
create policy requests_read on public.borrow_requests for select to authenticated using (equip_private.current_role() in ('admin','staff') or (equip_private.current_role()='borrower' and borrower_id=auth.uid()));
create policy loans_read on public.loans for select to authenticated using (equip_private.current_role() in ('admin','staff') or (equip_private.current_role()='borrower' and borrower_id=auth.uid()));
create policy maintenance_read on public.maintenance_records for select to authenticated using (equip_private.current_role() in ('admin','staff'));
create policy notifications_read on public.notifications for select to authenticated using (equip_private.current_role() is not null and recipient_id=auth.uid());
create policy audit_read on public.audit_logs for select to authenticated using (equip_private.current_role() in ('admin','staff'));

create function equip_private.audit(action text,entity_type text,entity_id uuid) returns void language sql security definer set search_path='' as $$
 insert into public.audit_logs(actor_id,action,entity_type,entity_id) values(auth.uid(),action,entity_type,entity_id);
$$;
create function equip_private.notify(p_request uuid,p_message text) returns void language sql security definer set search_path='' as $$
 insert into public.notifications(recipient_id,message,request_id)
 select id,p_message,p_request from public.profiles where is_active and (role in ('admin','staff') or id=(select borrower_id from public.borrow_requests where id=p_request));
$$;
create function equip_private.catalog() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform equip_private.require_role(array['admin','staff','borrower']);
 return coalesce((select jsonb_agg(to_jsonb(e)||jsonb_build_object('availability',case
 when e.operational_state<>'Active' then e.operational_state
 when exists(select 1 from public.loans l where l.equipment_id=e.id and l.returned_at is null) then 'Borrowed'
 when exists(select 1 from public.borrow_requests r where r.equipment_id=e.id and r.status='Approved') then 'Reserved'
 else 'Available' end) order by e.asset_number) from public.equipment e),'[]'::jsonb);
end; $$;
create function public.equipment_catalog() returns jsonb language sql security invoker set search_path='' as $$ select equip_private.catalog() $$;

create function equip_private.save_equipment(p_id uuid,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; busy boolean;
begin
 perform equip_private.require_role(array['admin','staff']);
 if p_id is null then
 insert into public.equipment(asset_number,name,serial_number,category,location,condition,remarks,photo_path,operational_state)
 values(upper(trim(p_data->>'asset_number')),trim(p_data->>'name'),coalesce(p_data->>'serial_number',''),coalesce(p_data->>'category','Others'),coalesce(p_data->>'location',''),coalesce(p_data->>'condition','Good'),coalesce(p_data->>'remarks',''),p_data->>'photo_path',case when p_data->>'condition'='Needs Repair' then 'Maintenance' else 'Active' end) returning id into result;
 else
 perform 1 from public.equipment where id=p_id for update;
 if not found then raise exception 'Equipment not found.'; end if;
 select exists(select 1 from public.borrow_requests where equipment_id=p_id and status in ('Approved','Released')) into busy;
 if busy and (p_data->>'condition') is distinct from (select condition from public.equipment where id=p_id) then raise exception 'Record condition during return or maintenance while this asset is reserved or on loan.'; end if;
 update public.equipment set asset_number=upper(trim(p_data->>'asset_number')),name=trim(p_data->>'name'),serial_number=coalesce(p_data->>'serial_number',''),category=coalesce(p_data->>'category','Others'),location=coalesce(p_data->>'location',''),condition=coalesce(p_data->>'condition','Good'),remarks=coalesce(p_data->>'remarks',''),photo_path=p_data->>'photo_path',operational_state=case when p_data->>'condition'='Needs Repair' then 'Maintenance' else operational_state end where id=p_id returning id into result;
 end if;
 perform equip_private.audit('Saved equipment','equipment',result); return result;
end; $$;
create function public.save_equipment(p_id uuid,p_data jsonb) returns uuid language sql security invoker set search_path='' as $$ select equip_private.save_equipment(p_id,p_data) $$;
create function equip_private.archive_equipment(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 perform equip_private.require_role(array['admin','staff']);
 perform 1 from public.equipment where id=p_id for update;
 if not found then raise exception 'Equipment not found.'; end if;
 if exists(select 1 from public.borrow_requests where equipment_id=p_id and status in ('Approved','Released')) then raise exception 'Cancel the reservation or record the return before archiving.'; end if;
 update public.equipment set operational_state='Archived',archived_at=now() where id=p_id;
 update public.borrow_requests set status='Cancelled' where equipment_id=p_id and status='Pending';
 perform equip_private.audit('Archived equipment','equipment',p_id);
end; $$;
create function public.archive_equipment(p_id uuid) returns void language sql security invoker set search_path='' as $$ select equip_private.archive_equipment(p_id) $$;
create function equip_private.submit_request(p_equipment uuid,p_purpose text,p_start date,p_due date) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 perform equip_private.require_role(array['admin','staff','borrower']);
 perform 1 from public.equipment where id=p_equipment and operational_state='Active' and condition<>'Needs Repair' for update;
 if not found then raise exception 'This equipment is unavailable.'; end if;
 if p_start<public.school_today() or p_due<p_start then raise exception 'Use valid dates starting today or later (Philippine Time).'; end if;
 if exists(select 1 from public.borrow_requests where equipment_id=p_equipment and status in ('Approved','Released')) then raise exception 'This equipment is already reserved or borrowed.'; end if;
 if exists(select 1 from public.borrow_requests where equipment_id=p_equipment and borrower_id=auth.uid() and status='Pending') then raise exception 'You already have a pending request for this asset.'; end if;
 insert into public.borrow_requests(borrower_id,equipment_id,purpose,requested_date,due_date) values(auth.uid(),p_equipment,trim(p_purpose),p_start,p_due) returning id into result;
 perform equip_private.audit('Submitted request','request',result);
 perform equip_private.notify(result,'A new borrowing request was submitted.'); return result;
end; $$;
create function public.submit_request(p_equipment uuid,p_purpose text,p_start date,p_due date) returns uuid language sql security invoker set search_path='' as $$ select equip_private.submit_request(p_equipment,p_purpose,p_start,p_due) $$;
create function equip_private.decide_request(p_id uuid,p_decision text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare r public.borrow_requests; e public.equipment;
begin
 perform equip_private.require_role(array['admin','staff','borrower']);
 select * into r from public.borrow_requests where id=p_id;
 if not found then raise exception 'Request not found.'; end if;
 select * into e from public.equipment where id=r.equipment_id for update;
 select * into r from public.borrow_requests where id=p_id for update;
 if p_decision='Cancelled' then
 if equip_private.current_role()='borrower' and r.borrower_id<>auth.uid() then raise exception 'You can cancel only your own requests.' using errcode='42501'; end if;
 if r.status not in ('Pending','Approved') then raise exception 'This request can no longer be cancelled.'; end if;
 else
 perform equip_private.require_role(array['admin','staff']);
 if p_decision not in ('Approved','Rejected') or r.status<>'Pending' then raise exception 'Only pending requests can be approved or rejected.'; end if;
 if p_decision='Rejected' and length(trim(coalesce(p_reason,'')))=0 then raise exception 'A rejection reason is required.'; end if;
 if p_decision='Approved' then
 if not exists(select 1 from public.profiles where id=r.borrower_id and is_active) then raise exception 'The borrower account is inactive.'; end if;
 if r.due_date<public.school_today() then raise exception 'This request has expired.'; end if;
 if e.operational_state<>'Active' or e.condition='Needs Repair' or exists(select 1 from public.borrow_requests where equipment_id=e.id and status in ('Approved','Released')) then raise exception 'This equipment is already reserved, borrowed, or under maintenance.'; end if;
 end if;
 end if;
 update public.borrow_requests set status=p_decision,reviewer_id=auth.uid(),reviewed_at=now(),rejection_reason=nullif(trim(p_reason),'') where id=p_id;
 perform equip_private.audit(p_decision||' request','request',p_id);
 perform equip_private.notify(p_id,'Borrowing request '||p_decision||case when p_decision='Rejected' then ': '||p_reason else '.' end);
end; $$;
create function public.decide_request(p_id uuid,p_decision text,p_reason text default '') returns void language sql security invoker set search_path='' as $$ select equip_private.decide_request(p_id,p_decision,p_reason) $$;
create function equip_private.release_equipment(p_request uuid,p_condition text,p_accessories text) returns uuid language plpgsql security definer set search_path='' as $$
declare r public.borrow_requests; e public.equipment; result uuid;
begin
 perform equip_private.require_role(array['admin','staff']);
 select * into r from public.borrow_requests where id=p_request;
 if not found then raise exception 'Request not found.'; end if;
 select * into e from public.equipment where id=r.equipment_id for update;
 select * into r from public.borrow_requests where id=p_request for update;
 select id into result from public.loans where request_id=p_request;
 if result is not null and r.status='Released' then return result; end if;
 if r.status<>'Approved' then raise exception 'Only approved requests can be released.'; end if;
 if not exists(select 1 from public.profiles where id=r.borrower_id and is_active) then raise exception 'The borrower account is inactive.'; end if;
 if public.school_today()<r.requested_date or public.school_today()>r.due_date then raise exception 'Release must be within the approved borrowing dates (Philippine Time).'; end if;
 if e.operational_state<>'Active' or e.condition='Needs Repair' or p_condition not in ('Good','Fair') then raise exception 'Equipment is not fit for release.'; end if;
 insert into public.loans(request_id,equipment_id,borrower_id,due_date,released_by,release_condition,release_accessories) values(r.id,e.id,r.borrower_id,r.due_date,auth.uid(),p_condition,coalesce(p_accessories,'')) returning id into result;
 update public.borrow_requests set status='Released' where id=p_request;
 update public.equipment set condition=p_condition where id=e.id;
 perform equip_private.audit('Released equipment','loan',result);
 perform equip_private.notify(p_request,'Equipment released. Due '||r.due_date||' (Philippine Time).'); return result;
end; $$;
create function public.release_equipment(p_request uuid,p_condition text,p_accessories text default '') returns uuid language sql security invoker set search_path='' as $$ select equip_private.release_equipment(p_request,p_condition,p_accessories) $$;
create function equip_private.return_equipment(p_loan uuid,p_condition text,p_accessories text,p_incident text) returns void language plpgsql security definer set search_path='' as $$
declare l public.loans;
begin
 perform equip_private.require_role(array['admin','staff']);
 select * into l from public.loans where id=p_loan;
 if not found then raise exception 'Loan not found.'; end if;
 perform 1 from public.equipment where id=l.equipment_id for update;
 select * into l from public.loans where id=p_loan for update;
 if l.returned_at is not null then return; end if;
 if p_condition is null or p_condition not in ('Good','Fair','Needs Repair') then raise exception 'Choose a valid return condition.'; end if;
 if p_condition='Needs Repair' and length(trim(coalesce(p_incident,'')))=0 then raise exception 'Describe the damage before recording this return.'; end if;
 update public.loans set returned_at=now(),received_by=auth.uid(),return_condition=p_condition,return_accessories=coalesce(p_accessories,'') where id=p_loan;
 update public.borrow_requests set status='Returned' where id=l.request_id;
 update public.equipment set condition=p_condition,operational_state=case when p_condition='Needs Repair' or exists(select 1 from public.maintenance_records where equipment_id=l.equipment_id and status<>'Resolved') then 'Maintenance' else 'Active' end where id=l.equipment_id;
 if p_condition='Needs Repair' then
 insert into public.maintenance_records(equipment_id,loan_id,incident,reported_by) values(l.equipment_id,p_loan,trim(p_incident),auth.uid());
 end if;
 perform equip_private.audit('Returned equipment','loan',p_loan);
 perform equip_private.notify(l.request_id,'Equipment returned'||case when p_condition='Needs Repair' then ' and sent to maintenance.' else '.' end);
end; $$;
create function public.return_equipment(p_loan uuid,p_condition text,p_accessories text default '',p_incident text default '') returns void language sql security invoker set search_path='' as $$ select equip_private.return_equipment(p_loan,p_condition,p_accessories,p_incident) $$;
create function equip_private.record_incident(p_equipment uuid,p_incident text,p_cost numeric) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 perform equip_private.require_role(array['admin','staff']);
 perform 1 from public.equipment where id=p_equipment and operational_state<>'Archived' for update;
 if not found then raise exception 'Choose an active equipment record.'; end if;
 insert into public.maintenance_records(equipment_id,incident,cost,reported_by) values(p_equipment,trim(p_incident),p_cost,auth.uid()) returning id into result;
 update public.equipment set condition='Needs Repair',operational_state='Maintenance' where id=p_equipment;
 perform equip_private.audit('Reported incident','maintenance',result); return result;
end; $$;
create function public.record_incident(p_equipment uuid,p_incident text,p_cost numeric default 0) returns uuid language sql security invoker set search_path='' as $$ select equip_private.record_incident(p_equipment,p_incident,p_cost) $$;
create function equip_private.resolve_maintenance(p_id uuid,p_resolution text,p_condition text,p_cost numeric) returns void language plpgsql security definer set search_path='' as $$
declare m public.maintenance_records;
begin
 perform equip_private.require_role(array['admin','staff']);
 select * into m from public.maintenance_records where id=p_id;
 if not found then raise exception 'Maintenance record not found.'; end if;
 perform 1 from public.equipment where id=m.equipment_id for update;
 if length(trim(coalesce(p_resolution,'')))=0 or p_condition is null or p_condition not in ('Good','Fair') then raise exception 'Provide a resolution and confirm Good or Fair condition.'; end if;
 update public.maintenance_records set status='Resolved',resolution=trim(p_resolution),cost=p_cost,completed_at=now() where id=p_id and status<>'Resolved';
 if not exists(select 1 from public.maintenance_records where equipment_id=m.equipment_id and status<>'Resolved') then
 update public.equipment set condition=p_condition,operational_state=case when operational_state='Archived' then 'Archived' else 'Active' end where id=m.equipment_id;
 end if;
 perform equip_private.audit('Resolved maintenance','maintenance',p_id);
end; $$;
create function public.resolve_maintenance(p_id uuid,p_resolution text,p_condition text,p_cost numeric default 0) returns void language sql security invoker set search_path='' as $$ select equip_private.resolve_maintenance(p_id,p_resolution,p_condition,p_cost) $$;
create function equip_private.read_notifications(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 perform equip_private.require_role(array['admin','staff','borrower']);
 update public.notifications set read_at=coalesce(read_at,now()) where recipient_id=auth.uid() and (p_id is null or id=p_id);
end; $$;
create function public.read_notifications(p_id uuid default null) returns void language sql security invoker set search_path='' as $$ select equip_private.read_notifications(p_id) $$;

-- No direct table writes are granted to browser clients. Internal functions are outside the exposed API schema.
revoke all on all functions in schema equip_private from public,anon,authenticated;
grant execute on function equip_private.current_role() to authenticated;
grant execute on function equip_private.catalog(),equip_private.save_equipment(uuid,jsonb),equip_private.archive_equipment(uuid),equip_private.submit_request(uuid,text,date,date),equip_private.decide_request(uuid,text,text),equip_private.release_equipment(uuid,text,text),equip_private.return_equipment(uuid,text,text,text),equip_private.record_incident(uuid,text,numeric),equip_private.resolve_maintenance(uuid,text,text,numeric),equip_private.read_notifications(uuid) to authenticated;
revoke all on all functions in schema public from public,anon;
grant execute on function public.school_today(),public.equipment_catalog(),public.save_equipment(uuid,jsonb),public.archive_equipment(uuid),public.submit_request(uuid,text,date,date),public.decide_request(uuid,text,text),public.release_equipment(uuid,text,text),public.return_equipment(uuid,text,text,text),public.record_incident(uuid,text,numeric),public.resolve_maintenance(uuid,text,text,numeric),public.read_notifications(uuid) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('equipment-photos','equipment-photos',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy equipment_photos_read on storage.objects for select to authenticated using(bucket_id='equipment-photos' and equip_private.current_role() is not null);
create policy equipment_photos_upload on storage.objects for insert to authenticated with check(bucket_id='equipment-photos' and equip_private.current_role() in ('admin','staff'));
create policy equipment_photos_remove on storage.objects for delete to authenticated using(bucket_id='equipment-photos' and equip_private.current_role() in ('admin','staff'));
commit;
