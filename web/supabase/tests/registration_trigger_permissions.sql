-- Run via the project SQL connection. All synthetic records are rolled back.
begin;
select set_config('glide.registration_probe_id', gen_random_uuid()::text, true);
insert into auth.users (id, email, raw_user_meta_data, aud, role)
values (current_setting('glide.registration_probe_id')::uuid,
        'glide-security-check-' || current_setting('glide.registration_probe_id') || '@example.invalid',
        '{"full_name":"Glide registration verification"}'::jsonb, 'authenticated', 'authenticated');
do $$ begin
  if not exists (select 1 from public.profiles where id = current_setting('glide.registration_probe_id')::uuid and preferred_name = 'Glide registration verification') then
    raise exception 'Registration trigger did not create a profile';
  end if;
  if has_function_privilege('anon', 'public.handle_new_user()', 'execute') or has_function_privilege('authenticated', 'public.handle_new_user()', 'execute') then
    raise exception 'Public API role can still execute registration trigger function';
  end if;
end $$;
rollback;
