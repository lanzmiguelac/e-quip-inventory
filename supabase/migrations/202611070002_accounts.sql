begin;
create function equip_private.manage_profile(p_id uuid,p_role text,p_active boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(73491324);
 perform equip_private.require_role(array['admin']);
 if p_role is null or p_role not in ('admin','staff','borrower') or p_active is null then raise exception 'Choose a valid role and account status.'; end if;
 if not exists(select 1 from public.profiles where id=p_id) then raise exception 'Account not found.'; end if;
 if exists(select 1 from public.profiles where id=p_id and role='admin' and is_active) and (p_role<>'admin' or not p_active)
 and (select count(*) from public.profiles where role='admin' and is_active)<=1 then raise exception 'The final active administrator cannot be demoted or deactivated.'; end if;
 update public.profiles set role=p_role,is_active=p_active where id=p_id;
 perform equip_private.audit('Updated account access','profile',p_id);
end; $$;
create function public.manage_profile(p_id uuid,p_role text,p_active boolean) returns void language sql security invoker set search_path='' as $$ select equip_private.manage_profile(p_id,p_role,p_active) $$;
revoke all on function equip_private.manage_profile(uuid,text,boolean),public.manage_profile(uuid,text,boolean) from public,anon;
grant execute on function equip_private.manage_profile(uuid,text,boolean),public.manage_profile(uuid,text,boolean) to authenticated;
commit;
