-- Optional sample rows so you can see the UI before adding real work.
-- Replace the media URLs with your own Supabase Storage public URLs.

insert into public.projects (title, category, subcategory, type, media, description)
values
  ('Realistic', 'AI', 'AI Commercials', 'video',
   'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4',
   'A photoreal AI-generated commercial spot.'),

  ('Street Energy', 'AI', 'AI UGC', 'video',
   'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4',
   'User-generated style AI clip with a raw, handheld feel.'),

  ('Neon Portrait', 'Images', null, 'image',
   'https://picsum.photos/seed/neon/1600/1600',
   'Generative portrait study, neon palette.'),

  ('Aurora Set', 'Images', null, 'image',
   'https://picsum.photos/seed/aurora/1600/1600',
   'A series exploring atmospheric light.'),

  ('Studio Site', 'Websites', null, 'website',
   'https://example.com',
   'A landing site built for a creative studio.');
