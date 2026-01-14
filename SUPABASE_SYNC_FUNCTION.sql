-- ===============================================================
-- FUNCTION: Sync User Registry
-- description: Syncs auth.users to public.users to fix missing profiles
-- ===============================================================

create or replace function sync_users()
returns void
language plpgsql
security definer -- Run as superuser to access auth.users
as $$
begin
  -- Insert missing users
  insert into public.users (id, email, role, verification_status, created_at, updated_at)
  select 
    au.id,
    au.email,
    coalesce((au.raw_user_meta_data->>'role'), 'DOCTOR'),
    'VERIFIED',
    au.created_at,
    now()
  from auth.users au
  where not exists (select 1 from public.users pu where pu.id = au.id);

  -- Fix empty data columns
  update public.users
  set data = jsonb_build_object(
      'name', coalesce(data->>'name', 'Restored User'),
      'role', role,
      'email', email
  )
  where data is null or data = '{}'::jsonb;
end;
$$;
