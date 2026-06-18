-- ============================================================================
-- ZENKAI MEDIA — Supabase schema + security (run in Supabase SQL Editor)
-- ============================================================================
-- Security model:
--   • The anon (public) key is exposed in the browser BY DESIGN.
--   • Real security comes from Row Level Security (RLS): the anon role may
--     ONLY read (SELECT) rows. It can never insert/update/delete.
--   • Writes happen through the dashboard or the service_role key, which is
--     SECRET and must never be committed or shipped to the browser.
-- ============================================================================

-- 1. Table -------------------------------------------------------------------
-- Thumbnails are derived at runtime (a frame from each video; the image itself
-- for images), so there is NO thumbnail column.
create table if not exists public.projects (
  id uuid not null default gen_random_uuid(),
  title text not null,
  category text not null,
  subcategory text null,
  type text not null,
  media text not null,
  description text null,
  created_at timestamp without time zone null default now(),
  updated_at timestamp without time zone null default now(),
  constraint projects_pkey primary key (id),
  constraint projects_type_check check (
    type = any (array['image'::text, 'video'::text, 'website'::text, 'pdf'::text])
  )
);

-- Migration: if your table already has a thumbnail column, drop it.
alter table public.projects drop column if exists thumbnail;

-- Manual ordering of items within a folder (lower = first). Defaults to 0 so
-- existing rows keep their current (alphabetical) order until you drag them.
alter table public.projects add column if not exists sort_order integer not null default 0;

create index if not exists idx_projects_category on public.projects using btree (category);
create index if not exists idx_projects_subcategory on public.projects using btree (subcategory);

-- 2. Row Level Security ------------------------------------------------------
alter table public.projects enable row level security;

-- Drop any prior policy with this name so re-running is safe.
drop policy if exists "Public read access" on public.projects;

-- Allow ONLY read access to anon + authenticated. No write policies = no writes.
create policy "Public read access"
  on public.projects
  for select
  to anon, authenticated
  using (true);

-- 2b. Folder ordering --------------------------------------------------------
-- Stores the manual position of each folder. path is the folder's full name:
-- a top-level category ("AI") or "Category/Subcategory" ("AI/AI Commercials").
create table if not exists public.folder_order (
  path text primary key,
  position integer not null default 0
);

alter table public.folder_order enable row level security;
drop policy if exists "Public read folder order" on public.folder_order;
create policy "Public read folder order"
  on public.folder_order
  for select
  to anon, authenticated
  using (true);

-- 3. Storage bucket (public read) -------------------------------------------
-- The app uses a PUBLIC bucket named "portfolio" (see lib/constants.ts).
insert into storage.buckets (id, name, public)
values ('portfolio', 'portfolio', true)
on conflict (id) do update set public = true;

-- Public read on objects in the "portfolio" bucket (uploads happen via the
-- /admin page using the service_role key + signed upload URLs).
drop policy if exists "Public read portfolio" on storage.objects;
create policy "Public read portfolio"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'portfolio');

-- 4. Message templates (admin-only, no public read policy) ------------------
create table if not exists public.message_templates (
  id uuid not null default gen_random_uuid(),
  title text not null,
  message text not null,
  created_at timestamp without time zone null default now(),
  constraint message_templates_pkey primary key (id)
);

alter table public.message_templates enable row level security;
-- No anon read policy — only service_role (admin) can access this table.

-- ============================================================================
-- After running this, your "media" column should hold the public URL of each
-- file, e.g.:
--   https://<project-ref>.supabase.co/storage/v1/object/public/portfolio/AI/realistic.mp4
-- (No thumbnail column needed — video frames are captured in the browser.)
-- ============================================================================
