do $$begin assert to_regprocedure('public.access_request_status()') is not null,'Access request workflow is not implemented';end$$;
begin;
insert into auth.users(id,email,email_confirmed_at) values
('10000000-0000-4000-8000-000000000001','access-admin@example.test',now()),
('10000000-0000-4000-8000-000000000002','access-staff@example.test',now()),
('10000000-0000-4000-8000-000000000003','google-requester@example.test',now()),
('10000000-0000-4000-8000-000000000004','google-declined@example.test',now()),
('10000000-0000-4000-8000-000000000005','email-only@example.test',now()),
('10000000-0000-4000-8000-000000000006','inactive-google@example.test',now());
insert into auth.identities(id,user_id,provider_id,provider,identity_data)
select gen_random_uuid(),id,id::text,'google',jsonb_build_object('sub',id::text,'email',email,'email_verified',true)
from auth.users where id in ('10000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000006');
insert into public.profiles(id,full_name,email,school_id,role,is_active) values
('10000000-0000-4000-8000-000000000001','Access Admin','access-admin@example.test','T-1','admin',true),
('10000000-0000-4000-8000-000000000002','Access Staff','access-staff@example.test','T-2','staff',true),
('10000000-0000-4000-8000-000000000006','Inactive User','inactive-google@example.test','T-6','borrower',false);
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
do $$ declare r uuid; duplicate uuid; s jsonb; begin
 s:=public.access_request_status(); assert (s->>'eligible')::boolean,'Google requester must be eligible';
 r:=public.submit_access_request('Google Requester','ICCT-001','Need equipment for class');
 duplicate:=public.submit_access_request('Changed name','DIFFERENT','Duplicate');assert duplicate=r,'Duplicate request must reuse the existing record';
 assert (select count(*)=1 from public.access_requests),'Requester sees own request only';
 assert (select email='google-requester@example.test' and status='Pending' from public.access_requests where id=r),'Identity and status must come from server';
 assert not exists(select 1 from public.profiles where id=auth.uid()),'Requesting access must not create a profile';
 begin perform public.equipment_catalog(); raise exception 'Pending account gained equipment access';exception when insufficient_privilege then null;end;
 begin perform public.review_access_request(r,'Approved','');raise exception 'Requester approved own access';exception when insufficient_privilege then null;end;
 begin update public.access_requests set status='Approved' where id=r;raise exception 'Direct request update allowed';exception when insufficient_privilege then null;end;
 begin perform public.list_access_requests();raise exception 'Requester listed all requests';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
do $$ declare r uuid;begin
 assert (select count(*)=0 from public.access_requests),'Other user request leaked';
 r:=public.submit_access_request('Second Requester','ICCT-002','');
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
do $$ begin
 begin perform public.list_access_requests();raise exception 'Inventory staff reviewed account access';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
do $$ declare r uuid;begin
 assert jsonb_array_length(public.list_access_requests())>=2,'Admin must see access requests';
 select id into r from public.access_requests where user_id='10000000-0000-4000-8000-000000000003';
 perform public.review_access_request(r,'Approved','');perform public.review_access_request(r,'Approved','Duplicate');
 assert (select role='borrower' and is_active from public.profiles where id='10000000-0000-4000-8000-000000000003'),'Approval must create only a borrower';
 assert (select status='Approved' from public.access_requests where id=r),'Approval must update request';
 select id into r from public.access_requests where user_id='10000000-0000-4000-8000-000000000004';
 begin perform public.review_access_request(r,'Declined','');raise exception 'Empty decline reason accepted';exception when check_violation then null;end;
 perform public.review_access_request(r,'Declined','School ID could not be verified');
 assert not exists(select 1 from public.profiles where id='10000000-0000-4000-8000-000000000004'),'Decline must not create a profile';
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
do $$declare s jsonb;begin
 s:=public.access_request_status();assert s->'request'->>'status'='Declined','Requester must see decline';
 assert s->'request'->>'decision_note'='School ID could not be verified','Requester must see decline reason';
 begin perform public.equipment_catalog();raise exception 'Declined account gained access';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000005',true);
do $$begin
 begin perform public.submit_access_request('Email User','ICCT-003','');raise exception 'Non-Google account requested access';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000006',true);
do $$begin
 begin perform public.submit_access_request('Inactive User','ICCT-006','');raise exception 'Inactive profile bypassed deactivation';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
do $$begin
 assert jsonb_typeof(public.equipment_catalog())='array','Approved existing session must gain borrower access';
end $$;
rollback;
select 'PASS: identity validation, duplicates, RLS, self-approval and staff denial, approval, decline/reason, no deactivation bypass, same-session access, rollback' as result;
