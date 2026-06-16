# Zenkai Media — Our Work

A cinematic, URL-driven portfolio showcase. Browse work like a living Google Drive:
**category → subcategory → file**, with the URL changing as you drill in
(`/work/ai/ai-commercials/realistic`) so any folder or video is shareable and
deep-linkable.

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS v4 + custom cinematic theme (film grain, gold accent)
- **Motion:** `motion` (Framer Motion)
- **Data:** Supabase (`projects` table + public `media` storage bucket)
- **Deploy:** GitHub → Vercel

---

## Is this secure?

Yes. A few facts worth internalizing:

- The **anon key is public by design** — it is meant to ship in the browser.
  Committing it (via `NEXT_PUBLIC_*` env vars) to GitHub is normal and safe.
- Security is enforced by **Row Level Security (RLS)**. The policies in
  [`supabase/schema.sql`](supabase/schema.sql) grant the anon role **read-only**
  access — no inserts, updates, or deletes are possible from the browser.
- The **`service_role` key is secret.** Never put it in this repo, in
  `.env.local`, or in any `NEXT_PUBLIC_*` variable. It bypasses RLS.

---

## Setup

### 1. Install

```bash
npm install
```

### 2. Configure Supabase

In the Supabase SQL Editor, run [`supabase/schema.sql`](supabase/schema.sql).
This creates the table, enables RLS with a read-only policy, and creates a
public `media` storage bucket. (Optionally run `supabase/seed.sql` for sample rows.)

### 3. Environment variables

```bash
cp .env.local.example .env.local
```

Fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
```

(Find both in Supabase → Project Settings → API.)

### 4. Run

```bash
npm run dev
```

Open http://localhost:3000.

---

## How folders work

The `projects` table drives everything:

| column        | role                                              |
| ------------- | ------------------------------------------------- |
| `category`    | top-level folder (e.g. `AI`, `Images`)            |
| `subcategory` | second-level folder (e.g. `AI Commercials`); null = file sits directly under the category |
| `title`       | the file name shown in the last column            |
| `type`        | `image` \| `video` \| `website` — picks the viewer |
| `media`       | public URL of the full asset                      |

Thumbnails are derived automatically — a frame grabbed from each video, the image
itself for images, and a glyph for websites. There is no `thumbnail` column.

Add a row → it appears in the right folder automatically. No code changes needed.

### Uploading media

Upload files into the **`media`** storage bucket (folders allowed, e.g.
`AI/AI Commercials/realistic.mp4`). Copy the **public URL** and paste it into the
`media` (and `thumbnail`) columns.

---

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import it in Vercel.
3. Add the two `NEXT_PUBLIC_*` env vars in **Project Settings → Environment Variables**.
4. Deploy. Every push to GitHub redeploys automatically.

---

## Using your real logo

Drop your logo into `/public` (e.g. `public/logo.svg`) and edit
[`components/Logo.tsx`](components/Logo.tsx) — there's a one-line note at the top
showing exactly what to replace.
