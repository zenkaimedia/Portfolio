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
    type = any (array['image'::text, 'video'::text, 'website'::text])
  )
);

-- Migration: if your table already has a thumbnail column, drop it.
alter table public.projects drop column if exists thumbnail;

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

-- 3. Storage bucket (public read) -------------------------------------------
-- Create a PUBLIC bucket named "media" for thumbnails + videos/images.
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

-- Public read on objects in the "media" bucket (uploads stay restricted to
-- the dashboard / service_role).
drop policy if exists "Public read media" on storage.objects;
create policy "Public read media"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'media');

-- ============================================================================
-- After running this, your "media" column should hold the public URL of each
-- file, e.g.:
--   https://<project-ref>.supabase.co/storage/v1/object/public/media/AI/AI%20Commercials/realistic.mp4
-- (No thumbnail column needed — video frames are captured in the browser.)
-- ============================================================================
