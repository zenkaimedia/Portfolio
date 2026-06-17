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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isFileType = type === "image" || type === "video";
  const isMulti = selectedFiles.length > 1;

  async function uploadOne(
    file: File,
    title: string,
    category: string,
    subcategory: string,
    description: string
  ) {
    const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
    const folder = [slugify(category), subcategory && slugify(subcategory)]
      .filter(Boolean)
      .join("/");
    const path = `${folder}/${Date.now()}-${slugify(title)}${ext ? "." + ext : ""}`;

    const signed = await createSignedUploadUrlAction(path);
    if ("error" in signed) throw new Error(signed.error);

    const up = await supabaseBrowser.storage
      .from(MEDIA_BUCKET)
      .uploadToSignedUrl(signed.path, signed.token, file, {
        contentType: file.type || undefined,
      });
    if (up.error) throw new Error(up.error.message);

    const media = supabaseBrowser.storage
      .from(MEDIA_BUCKET)
      .getPublicUrl(signed.path).data.publicUrl;

    const res = await createProjectAction({
      title,
      category,
      subcategory,
      type,
      media,
      description,
    });
    if ("error" in res) throw new Error(res.error);
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") ?? "").trim();
    const category = String(fd.get("category") ?? "").trim();
    const subcategory = String(fd.get("subcategory") ?? "").trim();
    const description = String(fd.get("description") ?? "").trim();
    const websiteUrl = String(fd.get("url") ?? "").trim();

    if (!category) {
      setStatus({ state: "error", msg: "Category is required." });
      return;
    }

    try {
      if (isFileType) {
        if (selectedFiles.length === 0) {
          setStatus({ state: "error", msg: "Please choose at least one file." });
          return;
        }

        // Single file needs a user-supplied title; multi-file derives from filename.
        if (!isMulti && !title) {
          setStatus({ state: "error", msg: "Title is required." });
          return;
        }

        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          const fileTitle = isMulti
            ? file.name.replace(/\.[^/.]+$/, "").trim() || file.name
            : title;

          setStatus({
            state: "busy",
            msg: isMulti
              ? `Uploading ${i + 1} / ${selectedFiles.length} — ${file.name}`
              : "Uploading file…",
          });

          await uploadOne(file, fileTitle, category, subcategory, description);
        }

        setStatus({
          state: "ok",
          msg: isMulti
            ? `${selectedFiles.length} files uploaded successfully.`
            : `"${title}" added.`,
        });
      } else {
        // website
        if (!title) {
          setStatus({ state: "error", msg: "Title is required." });
          return;
        }
        if (!websiteUrl) {
          setStatus({ state: "error", msg: "Please enter the website URL." });
          return;
        }
        setStatus({ state: "busy", msg: "Saving project…" });
        const res = await createProjectAction({
          title,
          category,
          subcategory,
          type,
          media: websiteUrl,
          description,
        });
        if ("error" in res) {
          setStatus({ state: "error", msg: res.error });
          return;
        }
        setStatus({ state: "ok", msg: `"${title}" added.` });
      }

      formRef.current?.reset();
      setSelectedFiles([]);
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
      {/* Title — hidden for multi-file batches (filename is used instead) */}
      {(!isFileType || !isMulti) && (
        <Field label="Title">
          <input name="title" className={inputCls} placeholder="Realistic" />
        </Field>
      )}

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
          onChange={(e) => {
            setType(e.target.value as typeof type);
            setSelectedFiles([]);
            if (fileRef.current) fileRef.current.value = "";
          }}
          className={inputCls}
        >
          <option value="image">Image</option>
          <option value="video">Video</option>
          <option value="website">Website</option>
        </select>
      </Field>

      {isFileType ? (
        <Field label={type === "video" ? "Video files" : "Image files"}>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept={type === "video" ? "video/*" : "image/*"}
            onChange={(e) => setSelectedFiles(Array.from(e.target.files ?? []))}
            className="block w-full text-sm text-muted file:mr-4 file:rounded-full file:border file:border-gold/40 file:bg-gold/10 file:px-4 file:py-2 file:font-mono file:text-[11px] file:uppercase file:tracking-[0.2em] file:text-gold-soft hover:file:bg-gold/20"
          />

          {/* Selected files list */}
          {selectedFiles.length > 0 && (
            <div className="mt-3 space-y-1.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                {selectedFiles.length} file{selectedFiles.length > 1 ? "s" : ""} selected
                {isMulti && <span className="ml-2 text-gold/70">— titles taken from filenames</span>}
              </p>
              <ul className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-line bg-ink/40 px-3 py-2">
                {selectedFiles.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 font-mono text-[11px] text-bone/70">
                    <span className="shrink-0 text-gold/50">
                      {type === "video" ? "▶" : "▪"}
                    </span>
                    <span className="truncate">{f.name}</span>
                    <span className="ml-auto shrink-0 text-muted/50">
                      {(f.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
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
          {busy
            ? "Working…"
            : isMulti
              ? `Upload ${selectedFiles.length} files`
              : "Add project"}
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
