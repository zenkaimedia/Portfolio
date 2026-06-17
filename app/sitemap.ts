import type { MetadataRoute } from "next";
import { fetchProjects, fetchFolderOrder } from "@/lib/supabase";
import { buildTree } from "@/lib/tree";
import type { FolderNode } from "@/lib/types";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE.url;
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/work`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
  ];

  try {
    const [projects, folderOrder] = await Promise.all([
      fetchProjects(),
      fetchFolderOrder(),
    ]);
    const tree = buildTree(projects, folderOrder);

    const walk = (node: FolderNode, prefix: string[]) => {
      for (const child of node.children) {
        const path = [...prefix, child.slug];
        const url = `${base}/work/${path.join("/")}`;
        if (child.kind === "folder") {
          entries.push({
            url,
            lastModified: now,
            changeFrequency: "weekly",
            priority: 0.6,
          });
          walk(child, path);
        } else {
          entries.push({
            url,
            lastModified: child.project.updated_at
              ? new Date(child.project.updated_at)
              : now,
            changeFrequency: "monthly",
            priority: 0.5,
          });
        }
      }
    };
    walk(tree, []);
  } catch {
    /* fall back to the static entries above if data isn't available */
  }

  return entries;
}
