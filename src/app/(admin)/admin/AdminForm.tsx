"use client";

import { useRef, useState } from "react";
import { slugify } from "@/lib/tree";
import { supabaseBrowser, MEDIA_BUCKET } from "@/lib/supabase/client";
import { createSignedUploadUrlAction, createProjectAction } from "./actions";

type Status =
  | { state: "idle" }
  | { state: "busy"; msg: string }
  | { state: "ok"; msg: string }
  | { state: "error"; msg: string };

export default function AdminForm({
  categories,
  subcategories,
}: {
  categories: string[];
  subcategories: string[];
}) {
  const [type, setType] = useState<"image" | "video" | "website">("image");
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isFileType = type === "image" || type === "video";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") ?? "").trim();
    const category = String(fd.get("category") ?? "").trim();
    const subcategory = String(fd.get("subcategory") ?? "").trim();
    const description = String(fd.get("description") ?? "").trim();
    const websiteUrl = String(fd.get("url") ?? "").trim();
    const file = fileRef.current?.files?.[0];

    if (!title || !category) {
      setStatus({ state: "error", msg: "Title and category are required." });
      return;
    }

    try {
      let media = "";

      if (isFileType) {
        if (!file) {
          setStatus({ state: "error", msg: "Please choose a file." });
          return;
        }
        // 1. build a storage path
        const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
        const folder = [slugify(category), subcategory && slugify(subcategory)]
          .filter(Boolean)
          .join("/");
        const path = `${folder}/${Date.now()}-${slugify(title)}${ext ? "." + ext : ""}`;

        // 2. get a one-time signed upload URL from the server
        setStatus({ state: "busy", msg: "Preparing upload…" });
        const signed = await createSignedUploadUrlAction(path);
        if ("error" in signed) {
          setStatus({ state: "error", msg: signed.error });
          return;
        }

        // 3. upload the file DIRECTLY to Supabase Storage
        setStatus({ state: "busy", msg: "Uploading file…" });
        const up = await supabaseBrowser.storage
          .from(MEDIA_BUCKET)
          .uploadToSignedUrl(signed.path, signed.token, file, {
            contentType: file.type || undefined,
          });
        if (up.error) {
          setStatus({ state: "error", msg: up.error.message });
          return;
        }

        media = supabaseBrowser.storage
          .from(MEDIA_BUCKET)
          .getPublicUrl(signed.path).data.publicUrl;
      } else {
        // website
        if (!websiteUrl) {
          setStatus({ state: "error", msg: "Please enter the website URL." });
          return;
        }
        media = websiteUrl;
      }

      // 4. insert the row (server-side, service role)
      setStatus({ state: "busy", msg: "Saving project…" });
      const res = await createProjectAction({
        title,
        category,
        subcategory,
        type,
        media,
        description,
      });
      if ("error" in res) {
        setStatus({ state: "error", msg: res.error });
        return;
      }

      setStatus({ state: "ok", msg: `"${title}" added.` });
      // reset title / file / description; keep category + subcategory for batches
      formRef.current?.reset();
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setStatus({
        state: "error",
        msg: err instanceof Error ? err.message : "Something went wrong.",
      });
    }
  }

  const busy = status.state === "busy";

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      <Field label="Title">
        <input name="title" required className={inputCls} placeholder="Realistic" />
      </Field>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Category (top folder)">
          <input
            name="category"
            required
            list="cats"
            className={inputCls}
            placeholder="AI"
          />
          <datalist id="cats">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>

        <Field label="Subcategory (optional)">
          <input
            name="subcategory"
            list="subs"
            className={inputCls}
            placeholder="AI Commercials"
          />
          <datalist id="subs">
            {subcategories.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </Field>
      </div>

      <Field label="Type">
        <select
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
          className={inputCls}
        >
          <option value="image">Image</option>
          <option value="video">Video</option>
          <option value="website">Website</option>
        </select>
      </Field>

      {isFileType ? (
        <Field label={type === "video" ? "Video file" : "Image file"}>
          <input
            ref={fileRef}
            type="file"
            accept={type === "video" ? "video/*" : "image/*"}
            className="block w-full text-sm text-muted file:mr-4 file:rounded-full file:border file:border-gold/40 file:bg-gold/10 file:px-4 file:py-2 file:font-mono file:text-[11px] file:uppercase file:tracking-[0.2em] file:text-gold-soft hover:file:bg-gold/20"
          />
        </Field>
      ) : (
        <Field label="Website URL">
          <input
            name="url"
            type="url"
            className={inputCls}
            placeholder="https://example.com"
          />
        </Field>
      )}

      <Field label="Description (optional)">
        <textarea name="description" rows={3} className={inputCls} />
      </Field>

      <div className="flex items-center gap-4 pt-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-full border border-gold/40 bg-gold/10 px-7 py-3 font-mono text-xs uppercase tracking-[0.25em] text-gold-soft transition-all hover:border-gold hover:bg-gold/20 disabled:opacity-50"
        >
          {busy ? "Working…" : "Add project"}
        </button>

        {status.state !== "idle" && (
          <span
            className={`font-mono text-xs ${
              status.state === "error"
                ? "text-ember"
                : status.state === "ok"
                  ? "text-gold-soft"
                  : "text-muted"
            }`}
          >
            {status.msg}
          </span>
        )}
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-lg border border-line bg-ink px-4 py-3 text-bone outline-none transition-colors focus:border-gold placeholder:text-muted/50";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
