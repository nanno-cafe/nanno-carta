-- Primero crear el usuario en Authentication > Users > Add user.
-- Reemplazar SOLO el email de abajo. No poner la contraseña en este SQL.
do $$
declare
  admin_email text := 'REEMPLAZAR_POR_TU_EMAIL';
  admin_id uuid;
begin
  select id into admin_id from auth.users where lower(email)=lower(trim(admin_email));
  if admin_id is null then raise exception 'Primero creá este usuario en Authentication > Users.'; end if;
  insert into public.menu_admins(user_id,active) values(admin_id,true)
  on conflict(user_id) do update set active=true;
end $$;
select u.email,a.active from public.menu_admins a join auth.users u on u.id=a.user_id;
