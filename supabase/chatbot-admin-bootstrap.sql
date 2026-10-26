-- Run ONLY in the Supabase SQL Editor after creating the admin Auth user.
-- No password or service-role key belongs in this file.
do $$
declare admin_id uuid;
begin
  select id into admin_id from auth.users where lower(email)='admin@admin.com';
  if admin_id is null then
    raise exception 'Create and confirm the admin@admin.com user in Authentication > Users first';
  end if;
  insert into public.chatbot_admins(user_id) values(admin_id) on conflict do nothing;
end;
$$;
