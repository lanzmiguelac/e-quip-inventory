begin;
create table public.access_requests (
 id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users(id),
 email text not null, full_name text not null check(length(trim(full_name)) between 1 and 120),
 school_id text not null check(length(trim(school_id)) between 1 and 80), reason text not null default '' check(length(reason)<=1000),
 status text not null default 'Pending' check(status in ('Pending','Approved','Declined')),
 requested_at timestamptz not null default now(), reviewed_at timestamptz, reviewer_id uuid references public.profiles(id),
 decision_note text not null default '' check(length(decision_note)<=1000),
 check((status='Pending' and reviewed_at is null) or (status<>'Pending' and reviewed_at is not null))
);
create index access_requests_status_time on public.access_requests(status,requested_at);
create index access_requests_reviewer on public.access_requests(reviewer_id);
alter table public.access_requests enable row level security;
revoke all on public.access_requests from public,anon,authenticated;
grant select on public.access_requests to authenticated;
grant all on public.access_requests to service_role;
create policy access_requests_read on public.access_requests for select to authenticated using (user_id=(select auth.uid()) or (select equip_private.current_role())='admin');

create function equip_private.access_request_status() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare eligible boolean;
begin
 if auth.uid() is null then raise exception 'Sign in with Google first.' using errcode='42501';end if;
 select exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null and u.email is not null
 and exists(select 1 from auth.identities i where i.user_id=u.id and i.provider='google')
 and not exists(select 1 from public.profiles p where p.id=u.id)) into eligible;
 return jsonb_build_object('eligible',eligible,'request',(select to_jsonb(r) from public.access_requests r where r.user_id=auth.uid()));
end;$$;
create function public.access_request_status() returns jsonb language sql security invoker set search_path='' as $$select equip_private.access_request_status()$$;

create function equip_private.submit_access_request(p_full_name text,p_school_id text,p_reason text) returns uuid language plpgsql security definer set search_path='' as $$
declare email_address text; result uuid;
begin
 if auth.uid() is null then raise exception 'Sign in with Google first.' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,73491325));
 if exists(select 1 from public.profiles where id=auth.uid()) then raise exception 'This account already exists. Contact your administrator about its access status.' using errcode='42501';end if;
 select u.email into email_address from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null
 and exists(select 1 from auth.identities i where i.user_id=u.id and i.provider='google');
 if email_address is null then raise exception 'Use a verified Google account to request access.' using errcode='42501';end if;
 if p_full_name is null or length(trim(p_full_name)) not between 1 and 120 or p_school_id is null or length(trim(p_school_id)) not between 1 and 80 or length(coalesce(p_reason,''))>1000 then
 raise exception 'Provide your full name and school ID. Keep the request message under 1,000 characters.' using errcode='23514';end if;
 select id into result from public.access_requests where user_id=auth.uid();if found then return result;end if;
 insert into public.access_requests(user_id,email,full_name,school_id,reason) values(auth.uid(),lower(email_address),trim(p_full_name),trim(p_school_id),trim(coalesce(p_reason,''))) returning id into result;
 insert into public.notifications(recipient_id,message) select id,'Access request: '||trim(p_full_name)||' ('||lower(email_address)||')' from public.profiles where role='admin' and is_active;
 return result;
end;$$;
create function public.submit_access_request(p_full_name text,p_school_id text,p_reason text default '') returns uuid language sql security invoker set search_path='' as $$select equip_private.submit_access_request(p_full_name,p_school_id,p_reason)$$;

create function equip_private.list_access_requests() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform equip_private.require_role(array['admin']);
 return coalesce((select jsonb_agg(to_jsonb(r) order by r.requested_at desc) from public.access_requests r),'[]'::jsonb);
end;$$;
create function public.list_access_requests() returns jsonb language sql security invoker set search_path='' as $$select equip_private.list_access_requests()$$;

create function equip_private.review_access_request(p_id uuid,p_decision text,p_note text) returns void language plpgsql security definer set search_path='' as $$
declare r public.access_requests;
begin
 perform equip_private.require_role(array['admin']);
 if p_decision is null or p_decision not in ('Approved','Declined') or length(coalesce(p_note,''))>1000 then raise exception 'Choose Approve or Decline and use a note under 1,000 characters.' using errcode='23514';end if;
 if p_decision='Declined' and length(trim(coalesce(p_note,'')))=0 then raise exception 'Give a reason for declining the request.' using errcode='23514';end if;
 select * into r from public.access_requests where id=p_id;
 if not found then raise exception 'Access request not found.';end if;
 perform pg_advisory_xact_lock(hashtextextended(r.user_id::text,73491325));
 select * into r from public.access_requests where id=p_id for update;
 if r.status=p_decision then return;end if;
 if r.status<>'Pending' then raise exception 'This access request has already been reviewed.';end if;
 if exists(select 1 from public.profiles where id=r.user_id) then raise exception 'This account already exists. Manage its access in User Management.';end if;
 if p_decision='Approved' then
 if not exists(select 1 from auth.users u where u.id=r.user_id and u.email_confirmed_at is not null and lower(u.email)=r.email and exists(select 1 from auth.identities i where i.user_id=u.id and i.provider='google')) then raise exception 'The Google identity changed. Ask the user to sign in again and contact an administrator.' using errcode='23514';end if;
 insert into public.profiles(id,email,full_name,school_id,role,is_active) values(r.user_id,r.email,r.full_name,r.school_id,'borrower',true);
 insert into public.notifications(recipient_id,message) values(r.user_id,'Your E-QUIP access request was approved.');
 end if;
 update public.access_requests set status=p_decision,reviewed_at=now(),reviewer_id=auth.uid(),decision_note=trim(coalesce(p_note,'')) where id=p_id;
 perform equip_private.audit(p_decision||' access request','access_request',p_id);
end;$$;
create function public.review_access_request(p_id uuid,p_decision text,p_note text default '') returns void language sql security invoker set search_path='' as $$select equip_private.review_access_request(p_id,p_decision,p_note)$$;

-- Keep the queue accurate when an administrator approves an account through existing account tools.
create function equip_private.sync_profile_access_request() returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.access_requests set status='Approved',reviewed_at=now(),reviewer_id=auth.uid(),decision_note='Account approved by administrator.' where user_id=new.id and status<>'Approved';
 return new;
end;$$;
create trigger sync_profile_access_request after insert on public.profiles for each row execute function equip_private.sync_profile_access_request();

revoke all on function equip_private.access_request_status(),equip_private.submit_access_request(text,text,text),equip_private.list_access_requests(),equip_private.review_access_request(uuid,text,text),equip_private.sync_profile_access_request() from public,anon,authenticated;
grant execute on function equip_private.access_request_status(),equip_private.submit_access_request(text,text,text),equip_private.list_access_requests(),equip_private.review_access_request(uuid,text,text) to authenticated;
revoke all on function public.access_request_status(),public.submit_access_request(text,text,text),public.list_access_requests(),public.review_access_request(uuid,text,text) from public,anon;
grant execute on function public.access_request_status(),public.submit_access_request(text,text,text),public.list_access_requests(),public.review_access_request(uuid,text,text) to authenticated;
commit;
