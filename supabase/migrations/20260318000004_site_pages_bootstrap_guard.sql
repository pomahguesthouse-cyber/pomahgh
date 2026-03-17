-- Hotfix bootstrap: safe to run manually when site_pages does not exist yet.
-- This migration is idempotent and can be executed multiple times.

create table if not exists public.site_pages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  route_path text not null unique,
  page_kind text not null default 'landing' check (page_kind in ('home', 'explore', 'landing')),
  status text not null default 'draft' check (status in ('draft', 'published')),
  page_schema jsonb,
  meta_title text,
  meta_description text,
  og_image_url text,
  sort_order integer not null default 0,
  is_system boolean not null default false,
  show_in_menu boolean not null default true,
  menu_label text,
  is_homepage boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_site_pages_route_path on public.site_pages(route_path);
create index if not exists idx_site_pages_status on public.site_pages(status);
create index if not exists idx_site_pages_kind on public.site_pages(page_kind);
create index if not exists idx_site_pages_show_in_menu on public.site_pages(show_in_menu);
create index if not exists idx_site_pages_is_homepage on public.site_pages(is_homepage);

do $$
begin
  if exists (
    select 1
    from pg_proc
    where proname = 'update_updated_at_column'
  ) then
    drop trigger if exists update_site_pages_updated_at on public.site_pages;
    create trigger update_site_pages_updated_at
      before update on public.site_pages
      for each row
      execute function public.update_updated_at_column();
  end if;
end $$;

alter table public.site_pages enable row level security;

drop policy if exists "Published site pages are publicly viewable" on public.site_pages;
create policy "Published site pages are publicly viewable"
on public.site_pages
for select
using (status = 'published');

drop policy if exists "Admins can manage all site pages" on public.site_pages;
create policy "Admins can manage all site pages"
on public.site_pages
for all
using (public.is_admin())
with check (public.is_admin());

-- Ensure required marketing pages exist
insert into public.site_pages (title, menu_label, route_path, page_kind, status, is_system, show_in_menu, is_homepage, sort_order, page_schema)
values
  ('Home', 'Home', '/', 'home', 'draft', true, true, true, 0, '[]'::jsonb),
  ('Explore Semarang', 'Explore Semarang', '/explore-semarang', 'explore', 'draft', true, true, false, 1, '[]'::jsonb)
on conflict (route_path) do update
set
  title = excluded.title,
  menu_label = coalesce(public.site_pages.menu_label, excluded.menu_label),
  page_kind = excluded.page_kind,
  is_system = excluded.is_system,
  show_in_menu = coalesce(public.site_pages.show_in_menu, true),
  updated_at = now();

-- Backfill menu labels
update public.site_pages
set menu_label = coalesce(menu_label, title)
where menu_label is null;

-- Ensure exactly one homepage default if none set
update public.site_pages
set is_homepage = true
where route_path = '/'
  and not exists (
    select 1 from public.site_pages sp where sp.is_homepage = true
  );

-- Migrate legacy landing pages into unified table (non-destructive)
insert into public.site_pages (
  title,
  menu_label,
  route_path,
  page_kind,
  status,
  page_schema,
  meta_title,
  meta_description,
  og_image_url,
  sort_order,
  is_system,
  show_in_menu,
  is_homepage,
  created_at,
  updated_at
)
select
  lp.page_title,
  lp.page_title,
  '/' || lp.slug,
  'landing',
  lp.status,
  lp.page_schema::jsonb,
  lp.page_title,
  lp.meta_description,
  lp.og_image_url,
  coalesce(lp.display_order, 0) + 100,
  false,
  true,
  false,
  lp.created_at,
  lp.updated_at
from public.landing_pages lp
where lp.slug is not null
on conflict (route_path) do update
set
  title = excluded.title,
  menu_label = coalesce(public.site_pages.menu_label, excluded.menu_label),
  status = excluded.status,
  page_schema = coalesce(excluded.page_schema, public.site_pages.page_schema),
  meta_title = excluded.meta_title,
  meta_description = excluded.meta_description,
  og_image_url = excluded.og_image_url,
  updated_at = now();
