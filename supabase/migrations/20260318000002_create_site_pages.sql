-- Unified editable marketing pages
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_site_pages_route_path on public.site_pages(route_path);
create index if not exists idx_site_pages_status on public.site_pages(status);
create index if not exists idx_site_pages_kind on public.site_pages(page_kind);

drop trigger if exists update_site_pages_updated_at on public.site_pages;
create trigger update_site_pages_updated_at
before update on public.site_pages
for each row execute function public.update_updated_at_column();

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

-- Seed system pages
insert into public.site_pages (title, route_path, page_kind, status, is_system, sort_order)
values
  ('Home', '/', 'home', 'draft', true, 0),
  ('Explore Semarang', '/explore-semarang', 'explore', 'draft', true, 1)
on conflict (route_path) do nothing;

-- Migrate existing landing pages into unified table
insert into public.site_pages (
  title,
  route_path,
  page_kind,
  status,
  page_schema,
  meta_title,
  meta_description,
  og_image_url,
  sort_order,
  is_system,
  created_at,
  updated_at
)
select
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
  lp.created_at,
  lp.updated_at
from public.landing_pages lp
where lp.slug is not null
on conflict (route_path) do update set
  title = excluded.title,
  status = excluded.status,
  page_schema = coalesce(excluded.page_schema, public.site_pages.page_schema),
  meta_title = excluded.meta_title,
  meta_description = excluded.meta_description,
  og_image_url = excluded.og_image_url,
  updated_at = now();
