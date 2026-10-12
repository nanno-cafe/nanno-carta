-- Ejecutar completo en el proyecto NUEVO destinado a APP-2.
-- No toca tablas ni funciones de la app de fidelidad.
begin;
create table if not exists public.menu_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active boolean not null default true
);
alter table public.menu_admins enable row level security;
create or replace function public.menu_is_admin() returns boolean
language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.menu_admins where user_id=auth.uid() and active); $$;
revoke all on function public.menu_is_admin() from public;
grant execute on function public.menu_is_admin() to anon,authenticated;
revoke all on public.menu_admins from anon,authenticated;

create table if not exists public.menu_settings (
  id boolean primary key default true check(id),
  theme text not null default 'classic' check(theme in ('classic','halloween','christmas')),
  animations_enabled boolean not null default true,
  intro text not null default 'Elegí algo rico, armá tu pedido y pasá a buscarlo. Nosotros ponemos el café.' check(length(trim(intro)) between 1 and 220),
  whatsapp text not null default '' check(whatsapp='' or whatsapp ~ '^[1-9][0-9]{7,14}$'),
  address text not null default '' check(length(address)<=180),
  hours text not null default '' check(length(hours)<=180),
  accepting_orders boolean not null default false,
  check(not accepting_orders or (whatsapp<>'' and length(trim(address))>0))
);
insert into public.menu_settings(id) values(true) on conflict(id) do nothing;
create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(trim(name)) between 1 and 60),
  position integer not null default 0 check(position between 0 and 9999),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists menu_categories_name on public.menu_categories(lower(trim(name)));
create table if not exists public.menu_products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.menu_categories(id) on delete restrict,
  name text not null check(length(trim(name)) between 1 and 100),
  description text not null default '' check(length(description)<=500),
  price_cents integer not null check(price_cents between 1 and 100000000),
  image_url text check(image_url is null or (length(image_url)<=2048 and image_url ~ '^https://')),
  active boolean not null default true,
  available boolean not null default true,
  featured boolean not null default false,
  position integer not null default 0 check(position between 0 and 9999),
  created_at timestamptz not null default now()
);
create index if not exists menu_products_category on public.menu_products(category_id,position);
alter table public.menu_settings enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_products enable row level security;
revoke all on public.menu_settings,public.menu_categories,public.menu_products from anon,authenticated;
grant select on public.menu_settings,public.menu_categories,public.menu_products to anon,authenticated;
grant insert,update on public.menu_categories,public.menu_products to authenticated;
grant update(theme,animations_enabled,intro,whatsapp,address,hours,accepting_orders) on public.menu_settings to authenticated;

drop policy if exists menu_settings_read on public.menu_settings;
create policy menu_settings_read on public.menu_settings for select to anon,authenticated using(true);
drop policy if exists menu_settings_write on public.menu_settings;
create policy menu_settings_write on public.menu_settings for update to authenticated using(public.menu_is_admin()) with check(public.menu_is_admin());
drop policy if exists menu_categories_read on public.menu_categories;
create policy menu_categories_read on public.menu_categories for select to anon,authenticated using(active or public.menu_is_admin());
drop policy if exists menu_categories_insert on public.menu_categories;
create policy menu_categories_insert on public.menu_categories for insert to authenticated with check(public.menu_is_admin());
drop policy if exists menu_categories_update on public.menu_categories;
create policy menu_categories_update on public.menu_categories for update to authenticated using(public.menu_is_admin()) with check(public.menu_is_admin());
drop policy if exists menu_products_read on public.menu_products;
create policy menu_products_read on public.menu_products for select to anon,authenticated using(public.menu_is_admin() or (active and exists(select 1 from public.menu_categories c where c.id=category_id and c.active)));
drop policy if exists menu_products_insert on public.menu_products;
create policy menu_products_insert on public.menu_products for insert to authenticated with check(public.menu_is_admin());
drop policy if exists menu_products_update on public.menu_products;
create policy menu_products_update on public.menu_products for update to authenticated using(public.menu_is_admin()) with check(public.menu_is_admin());

-- Imágenes públicas de catálogo; solo administradores pueden subir/borrar archivos.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('menu-images','menu-images',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists menu_images_read on storage.objects;
create policy menu_images_read on storage.objects for select to anon,authenticated using(bucket_id='menu-images');
drop policy if exists menu_images_insert on storage.objects;
create policy menu_images_insert on storage.objects for insert to authenticated with check(bucket_id='menu-images' and public.menu_is_admin());
drop policy if exists menu_images_delete on storage.objects;
create policy menu_images_delete on storage.objects for delete to authenticated using(bucket_id='menu-images' and public.menu_is_admin());
commit;
