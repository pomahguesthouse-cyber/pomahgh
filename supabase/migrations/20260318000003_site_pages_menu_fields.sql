-- Menu management fields for site pages

alter table if exists public.site_pages
  add column if not exists show_in_menu boolean not null default true,
  add column if not exists menu_label text,
  add column if not exists is_homepage boolean not null default false;

-- Ensure one default homepage exists
update public.site_pages
set is_homepage = true
where route_path = '/'
  and not exists (
    select 1 from public.site_pages sp where sp.is_homepage = true
  );

-- Keep menu label in sync for existing rows
update public.site_pages
set menu_label = coalesce(menu_label, title)
where menu_label is null;

create index if not exists idx_site_pages_show_in_menu on public.site_pages(show_in_menu);
create index if not exists idx_site_pages_is_homepage on public.site_pages(is_homepage);
